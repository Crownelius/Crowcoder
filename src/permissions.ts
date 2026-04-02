import * as readline from 'node:readline/promises';
import chalk from 'chalk';
import type { Tool } from './tools/types.js';
import type { CrowcoderConfig } from './types.js';
import { saveConfig } from './config.js';

/**
 * Check if a tool call is allowed under the current permission mode.
 * Returns true if allowed, false if denied.
 */
export async function checkPermission(
  tool: Tool,
  input: Record<string, unknown>,
  config: CrowcoderConfig,
  rl: readline.Interface,
): Promise<boolean> {
  // yolo mode = everything allowed
  if (config.permissionMode === 'yolo') return true;

  // Read-only tools always allowed
  if (tool.isReadOnly) return true;

  // auto mode = allow non-destructive, ask for destructive
  if (config.permissionMode === 'auto' && !tool.isDestructive) return true;

  // ask mode or destructive in auto mode → prompt user
  const desc = formatToolCall(tool, input);
  console.log(chalk.yellow(`\n⚡ Tool: ${tool.name}`));
  console.log(chalk.dim(desc));

  const answer = await rl.question(chalk.yellow('Allow? [Y/n/always] '));
  const a = answer.trim().toLowerCase();

  if (a === 'always') {
    // Upgrade to auto for rest of session and save to disk
    config.permissionMode = 'auto';
    saveConfig(config);
    console.log(chalk.dim('  (auto-approving safe operations for this session and future sessions)'));
    return true;
  }

  return a === '' || a === 'y' || a === 'yes';
}

function formatToolCall(tool: Tool, input: Record<string, unknown>): string {
  switch (tool.name) {
    case 'bash':
      return `  $ ${input.command}`;
    case 'write_file':
      return `  Write to: ${input.file_path} (${((input.content as string) || '').split('\n').length} lines)`;
    case 'edit_file':
      return `  Edit: ${input.file_path}`;
    default:
      return `  ${JSON.stringify(input).slice(0, 200)}`;
  }
}
