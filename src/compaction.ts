/**
 * Context compaction — auto-summarize old messages when context grows large.
 * Keeps recent messages intact, summarizes older ones to free token space.
 */
import chalk from 'chalk';
import type { Message, CrowcoderConfig } from './types.js';
import { streamChat } from './api.js';
import { ALL_TOOLS } from './tools/index.js';

/**
 * Estimate tokens accounting for content type and message overhead.
 * - English prose: ~3.5 chars per token
 * - Code: ~3 chars per token (more special chars)
 * - Message overhead: ~4 tokens per message for role/structure
 */
export function estimateTokens(messages: Message[]): number {
  let tokens = 0;

  for (const m of messages) {
    // Add message overhead (role, message structure, etc)
    tokens += 4;

    if (typeof m.content === 'string' && m.content) {
      // Detect if content is code (common code indicators)
      const isCode = /^(```|  |  \t|function|class|def|const|let|var|import|export|fn |pub |async|await)/m.test(m.content);
      const charsPerToken = isCode ? 3 : 3.5;
      tokens += Math.ceil(m.content.length / charsPerToken);
    }

    if (m.tool_calls) {
      const toolJson = JSON.stringify(m.tool_calls);
      // Tool calls are structured data (mostly code), use 3 chars per token
      tokens += Math.ceil(toolJson.length / 3);
    }
  }

  return tokens;
}

export interface CompactionConfig {
  enabled: boolean;
  triggerTokens: number;      // compact when estimated tokens exceed this
  keepRecentMessages: number;  // always keep this many recent messages
  targetTokens: number;        // target token count after compaction
}

export const DEFAULT_COMPACTION: CompactionConfig = {
  enabled: true,
  triggerTokens: 80_000,    // ~80k tokens triggers compaction
  keepRecentMessages: 10,   // keep last 10 messages verbatim
  targetTokens: 20_000,     // aim to reduce to ~20k tokens
};

export function shouldCompact(messages: Message[], config: CompactionConfig): boolean {
  if (!config.enabled) return false;
  return estimateTokens(messages) > config.triggerTokens;
}

export function getCompactionStats(messages: Message[]): {
  messageCount: number;
  estimatedTokens: number;
  needsCompaction: boolean;
} {
  const tokens = estimateTokens(messages);
  return {
    messageCount: messages.length,
    estimatedTokens: tokens,
    needsCompaction: tokens > DEFAULT_COMPACTION.triggerTokens,
  };
}

/**
 * Compact messages by summarizing older ones with the AI model.
 * Returns a new messages array with a summary + recent messages.
 */
export async function compactMessages(
  messages: Message[],
  config: CrowcoderConfig,
  compactionConfig: CompactionConfig = DEFAULT_COMPACTION,
): Promise<Message[]> {
  if (messages.length <= compactionConfig.keepRecentMessages) {
    return messages;
  }

  const keepCount = compactionConfig.keepRecentMessages;
  const oldMessages = messages.slice(0, -keepCount);
  const recentMessages = messages.slice(-keepCount);

  console.log(chalk.dim(`  [compaction] Summarizing ${oldMessages.length} old messages...`));

  // Build a summary request
  const summaryPrompt: Message[] = [
    {
      role: 'system',
      content: `You are a conversation summarizer. Summarize the following conversation between a user and an AI coding assistant.
Focus on:
- What files were read, created, or modified
- Key decisions made
- Current state of the work
- Important context the assistant needs to continue

Be concise but thorough. Output a structured summary.`,
    },
    {
      role: 'user',
      content: oldMessages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => `[${m.role}]: ${typeof m.content === 'string' ? m.content?.slice(0, 2000) : '(tool call)'}`)
        .join('\n\n'),
    },
  ];

  try {
    let summary = '';
    for await (const event of streamChat(config, summaryPrompt, [])) {
      if (event.type === 'text' && event.content) {
        summary += event.content;
      }
    }

    if (!summary) {
      console.log(chalk.yellow('  [compaction] Summary generation failed, keeping messages'));
      return messages;
    }

    // Build compacted message array
    // Use 'assistant' role instead of 'system' since some providers ignore system messages mid-conversation
    const compactedMessages: Message[] = [
      {
        role: 'assistant',
        content: `<<CONVERSATION SUMMARY - ${oldMessages.length} messages compacted>>\n${summary}`,
      },
      ...recentMessages,
    ];

    const oldTokens = estimateTokens(messages);
    const newTokens = estimateTokens(compactedMessages);
    console.log(
      chalk.green(
        `  [compaction] Reduced: ~${oldTokens.toLocaleString()} → ~${newTokens.toLocaleString()} tokens (${Math.round((1 - newTokens / oldTokens) * 100)}% reduction)`,
      ),
    );

    return compactedMessages;
  } catch (err: unknown) {
    console.log(chalk.yellow(`  [compaction] Error: ${err instanceof Error ? err.message : err}`));
    return messages;
  }
}

/**
 * Quick local compaction without API call — just truncates tool results.
 */
export function quickCompact(messages: Message[]): Message[] {
  return messages.map((m) => {
    if (m.role === 'tool' && typeof m.content === 'string' && m.content.length > 5000) {
      return { ...m, content: m.content.slice(0, 2000) + '\n... (truncated)' };
    }
    return m;
  });
}
