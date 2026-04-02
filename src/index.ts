#!/usr/bin/env node
import * as readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { readFileSync as fsReadFileSync, writeFileSync as fsWriteFileSync } from 'node:fs';
import chalk from 'chalk';
import { loadConfig, saveConfig, configExists, getConfigDir } from './config.js';
import { resetClient } from './api.js';
import { runQuery } from './query.js';
import { ALL_TOOLS } from './tools/index.js';
import type { CrowcoderConfig, Message } from './types.js';
import { PROVIDERS } from './types.js';
// New systems
import { createSession, autoSave, listSessions, loadSession, deleteSession, type Session } from './sessions.js';
import { initHooksDir, runHooks, listHooks } from './hooks.js';
import { printUsageSummary, setBudget } from './cost-tracker.js';
import { printSecurityWarning, scanCommand } from './security.js';
import { getCompactionStats } from './compaction.js';
import { extractPatterns, printInstinctStatus, pruneExpired, listInstincts, exportInstincts, importInstincts } from './learning.js';
import { MODES, type Mode, listModes } from './modes.js';
import { printModelOptions, switchModel, classifyComplexity, routeModel } from './model-router.js';
import { buildCommitPrompt, buildPRPrompt, printDiff, printLog, isGitRepo } from './git-workflow.js';
import { buildReviewPrompt, buildTDDPrompt, buildSecurityReviewPrompt, runAudit, printAuditReport, buildPlanPrompt, buildE2EPrompt, buildBuildFixPrompt, buildEvalPrompt, buildUpdateDocsPrompt } from './evaluation.js';
import { printRules } from './rules.js';
import { buildOrchestrationPrompt, runParallel, mergeResults, printOrchestrationStatus, type SubAgent } from './orchestration.js';
import { printBanner as printThemedBanner, printSplash, theme } from './theme.js';
import { saveExport, type ExportFormat } from './export.js';
// New feature modules
import { buildVerifyPrompt, saveCheckpoint, listCheckpoints, restoreCheckpoint } from './verification.js';
import { detectPackageManager, detectTestRunner, detectBuildTool } from './package-detect.js';
import { buildCoveragePrompt, printCoverageSummary } from './coverage.js';
import { buildRefactorPrompt, buildCleanupPrompt } from './refactor.js';
import { buildDocsUpdatePrompt, detectDocFiles } from './docs-sync.js';
import { listSkills, findSkill, applySkill, printSkillList, evolveInstinctsToSkills } from './skills.js';
import { onSessionStart, onSessionEnd, printMemoryStatus, searchMemory } from './memory.js';
import { shouldSuggestCompaction } from './strategic-compaction.js';

// ── Setup Wizard ──────────────────────────────────────────
async function setupWizard(rl: readline.Interface): Promise<CrowcoderConfig> {
  console.log(chalk.bold.cyan('\n  Crowcoder — First-time Setup\n'));
  console.log(chalk.white('  Choose a provider:\n'));

  const providerKeys = Object.keys(PROVIDERS);
  providerKeys.forEach((key, i) => {
    const p = PROVIDERS[key];
    console.log(chalk.white(`  ${i + 1}. ${p.name}`) + chalk.dim(` (${p.baseURL || 'you provide'})`));
  });

  const choice = await rl.question(chalk.yellow('\n  Provider [1]: '));
  const idx = parseInt(choice || '1', 10) - 1;
  const providerKey = providerKeys[Math.max(0, Math.min(idx, providerKeys.length - 1))];
  const provider = PROVIDERS[providerKey];

  let baseURL = provider.baseURL;
  if (providerKey === 'custom') {
    baseURL = await rl.question(chalk.yellow('  Base URL: '));
  }

  let apiKey = '';
  if (provider.requiresKey) {
    apiKey = await rl.question(chalk.yellow(`  API Key for ${provider.name}: `));
  }

  let model = provider.defaultModel;
  const modelInput = await rl.question(chalk.yellow(`  Model [${provider.defaultModel}]: `));
  if (modelInput.trim()) model = modelInput.trim();

  console.log(chalk.white('\n  Permission modes:'));
  console.log(chalk.dim('  1. ask   — prompt before writes/commands (safest)'));
  console.log(chalk.dim('  2. auto  — auto-approve reads, ask for destructive'));
  console.log(chalk.dim('  3. yolo  — approve everything (fastest)\n'));
  const permChoice = await rl.question(chalk.yellow('  Permission mode [1]: '));
  const permMode = (['ask', 'auto', 'yolo'] as const)[parseInt(permChoice || '1', 10) - 1] || 'ask';

  const config: CrowcoderConfig = {
    apiKey,
    baseURL,
    model,
    provider: provider.name,
    maxTokens: 8192,
    temperature: 0.3,
    permissionMode: permMode,
  };

  saveConfig(config);
  console.log(chalk.green(`\n  Config saved to ${getConfigDir()}/config.json\n`));
  return config;
}

/**
 * Parse slash command respecting quoted strings
 */
function parseSlashCommand(input: string): { cmd: string; args: string } {
  const trimmed = input.trim();
  const spaceIdx = trimmed.indexOf(' ');

  if (spaceIdx === -1) {
    return { cmd: trimmed.toLowerCase(), args: '' };
  }

  const cmd = trimmed.slice(0, spaceIdx).toLowerCase();
  const argsRaw = trimmed.slice(spaceIdx + 1);

  // Keep quoted strings intact
  return { cmd, args: argsRaw };
}

// ── Slash Commands ────────────────────────────────────────
function handleSlashCommand(
  input: string,
  config: CrowcoderConfig,
  messages: Message[],
  session: Session,
  mode: { current: Mode },
): { handled: boolean; shouldExit?: boolean; newMessages?: Message[]; injectPrompt?: string } {
  const { cmd, args } = parseSlashCommand(input);

  switch (cmd) {
    // ── Help ──────────────────────────────────────────
    case '/help': {
      const h = theme.header;
      const d = theme.dim;
      const c = theme.command;
      console.log(h('\n  ── General ──'));
      console.log(d('  ') + c('/help') + d('             — this help'));
      console.log(d('  ') + c('/config') + d('           — reconfigure provider/model/key'));
      console.log(d('  ') + c('/theme [mode]') + d('     — toggle display mode (full/compact/minimal)'));
      console.log(d('  ') + c('/clear') + d('            — clear conversation'));
      console.log(d('  ') + c('/history') + d('          — message count & token estimate'));
      console.log(d('  ') + c('/export [fmt]') + d('     — export conversation (md/json/txt)'));
      console.log(d('  ') + c('/exit') + d('             — quit'));
      console.log(d('  ') + c('!<cmd>') + d('            — run shell command directly'));
      console.log(h('\n  ── Model & Provider ──'));
      console.log(d('  ') + c('/model [name]') + d('     — switch or show model'));
      console.log(d('  ') + c('/models') + d('           — list available models for provider'));
      console.log(d('  ') + c('/provider') + d('         — show provider info'));
      console.log(d('  ') + c('/route') + d('            — auto-route model based on next message'));
      console.log(h('\n  ── Modes ──'));
      console.log(d('  ') + c('/mode [name]') + d('      — switch mode (dev/review/tdd/research/plan/debug/architect)'));
      console.log(d('  ') + c('/modes') + d('            — list all modes'));
      console.log(h('\n  ── Session ──'));
      console.log(d('  ') + c('/sessions') + d('         — list saved sessions'));
      console.log(d('  ') + c('/save [name]') + d('      — save current session'));
      console.log(d('  ') + c('/resume <id>') + d('      — resume a saved session'));
      console.log(d('  ') + c('/delete <id>') + d('      — delete a session'));
      console.log(h('\n  ── Git ──'));
      console.log(d('  ') + c('/commit') + d('           — AI-generated commit'));
      console.log(d('  ') + c('/pr') + d('               — AI-generated pull request'));
      console.log(d('  ') + c('/diff') + d('             — show git diff'));
      console.log(d('  ') + c('/log') + d('              — show git log'));
      console.log(h('\n  ── Code Quality ──'));
      console.log(d('  ') + c('/review [target]') + d('  — AI code review'));
      console.log(d('  ') + c('/tdd <desc>') + d('       — test-driven development'));
      console.log(d('  ') + c('/security-review') + d('  — security audit'));
      console.log(d('  ') + c('/audit') + d('            — harness audit (score project health)'));
      console.log(d('  ') + c('/verify [cmd]') + d('     — run tests, fix failures, repeat until green'));
      console.log(d('  ') + c('/build-fix') + d('        — auto-detect and fix build errors'));
      console.log(d('  ') + c('/test-coverage') + d('    — analyze test coverage, suggest tests'));
      console.log(d('  ') + c('/refactor [target]') + d(' — dead code detection & cleanup'));
      console.log(d('  ') + c('/e2e <feature>') + d('    — generate E2E tests'));
      console.log(d('  ') + c('/eval <criteria>') + d('  — evaluate project against criteria'));
      console.log(h('\n  ── Tools & Config ──'));
      console.log(d('  ') + c('/tools') + d('            — list tools'));
      console.log(d('  ') + c('/rules') + d('            — show coding rules'));
      console.log(d('  ') + c('/perm <mode>') + d('      — set permission mode'));
      console.log(d('  ') + c('/dry-run') + d('          — toggle dry-run mode'));
      console.log(d('  ') + c('/cd <path>') + d('        — change directory'));
      console.log(d('  ') + c('/hooks') + d('            — list configured hooks'));
      console.log(h('\n  ── Planning & Docs ──'));
      console.log(d('  ') + c('/plan <task>') + d('      — structured implementation planning'));
      console.log(d('  ') + c('/update-docs') + d('      — sync documentation with code'));
      console.log(d('  ') + c('/checkpoint [label]') + d(' — save git state checkpoint'));
      console.log(d('  ') + c('/checkpoints') + d('      — list saved checkpoints'));
      console.log(h('\n  ── Orchestration ──'));
      console.log(d('  ') + c('/orchestrate <task>') + d(' — decompose task into parallel sub-agents'));
      console.log(h('\n  ── Learning & Cost ──'));
      console.log(d('  ') + c('/usage') + d('            — token/cost summary'));
      console.log(d('  ') + c('/budget <d> <m>') + d('   — set daily/monthly budget (USD)'));
      console.log(d('  ') + c('/learn') + d('            — extract patterns from this session'));
      console.log(d('  ') + c('/instincts') + d('        — show learned instincts'));
      console.log(d('  ') + c('/instinct-export') + d('  — export instincts to JSON file'));
      console.log(d('  ') + c('/instinct-import') + d('  — import instincts from JSON file'));
      console.log(d('  ') + c('/evolve') + d('           — cluster instincts into reusable skills'));
      console.log(d('  ') + c('/prune') + d('            — delete expired instincts'));
      console.log(d('  ') + c('/skills') + d('           — list learned skills'));
      console.log(d('  ') + c('/memory') + d('           — show memory status'));
      console.log(d('  ') + c('/detect') + d('           — detect package manager, test runner, build tool'));
      console.log();
      return { handled: true };
    }

    // ── Theme ─────────────────────────────────────────
    case '/theme':
      if (args) {
        const validThemes = ['full', 'compact', 'minimal'] as const;
        if (validThemes.includes(args as any)) {
          config.theme = args as 'full' | 'compact' | 'minimal';
          saveConfig(config);
          console.log(chalk.green(`  Theme: ${config.theme}`));
        } else {
          console.log(chalk.yellow(`  Invalid theme: ${args}. Use: full, compact, or minimal`));
        }
      } else {
        const current = config.theme || 'full';
        console.log(chalk.dim(`  Current theme: ${current}`));
      }
      return { handled: true };

    // ── Clear ─────────────────────────────────────────
    case '/clear':
      console.log(chalk.dim('  Conversation cleared.'));
      return { handled: true, newMessages: [] };

    // ── History ───────────────────────────────────────
    case '/history': {
      const stats = getCompactionStats(messages);
      const userMsgs = messages.filter((m) => m.role === 'user').length;
      const assistMsgs = messages.filter((m) => m.role === 'assistant').length;
      const toolMsgs = messages.filter((m) => m.role === 'tool').length;
      console.log(chalk.dim(`  Messages: ${messages.length} (${userMsgs} user, ${assistMsgs} assistant, ${toolMsgs} tool)`));
      console.log(chalk.dim(`  Est. tokens: ~${stats.estimatedTokens.toLocaleString()}${stats.needsCompaction ? ' (compaction recommended)' : ''}`));
      return { handled: true };
    }

    // ── Model ─────────────────────────────────────────
    case '/model':
      if (args) {
        const newModel = switchModel(config, args);
        if (newModel) {
          config.model = newModel;
          saveConfig(config);
          resetClient();
          console.log(chalk.green(`  Model: ${config.model}`));
        } else {
          config.model = args;
          saveConfig(config);
          resetClient();
          console.log(chalk.green(`  Model: ${config.model} (custom)`));
        }
      } else {
        console.log(chalk.dim(`  Current: ${config.model}`));
      }
      return { handled: true };

    case '/models':
      printModelOptions(config);
      return { handled: true };

    case '/route': {
      console.log(chalk.dim('  Auto-routing enabled for next message.'));
      return { handled: true };
    }

    case '/provider':
      console.log(chalk.dim(`  Provider: ${config.provider}`));
      console.log(chalk.dim(`  Base URL: ${config.baseURL}`));
      console.log(chalk.dim(`  Model: ${config.model}`));
      console.log(chalk.dim(`  API Key: ${config.apiKey ? '***' + config.apiKey.slice(-4) : '(none)'}`));
      return { handled: true };

    // ── Mode ──────────────────────────────────────────
    case '/mode':
      if (args && MODES[args as Mode]) {
        mode.current = args as Mode;
        const m = MODES[mode.current];
        console.log(chalk.green(`  Mode: ${m.label} — ${m.description}`));
      } else if (args) {
        console.log(chalk.yellow(`  Unknown mode: ${args}`));
        console.log(chalk.dim(`  Available: ${Object.keys(MODES).join(', ')}`));
      } else {
        console.log(chalk.dim(`  Current: ${mode.current} (${MODES[mode.current].description})`));
      }
      return { handled: true };

    case '/modes':
      console.log(chalk.cyan('\n  Modes:'));
      for (const m of listModes()) {
        const marker = m.name === mode.current ? chalk.green(' ◀') : '';
        console.log(chalk.white(`  ${m.name.padEnd(12)}`) + chalk.dim(m.description) + marker);
      }
      console.log();
      return { handled: true };

    // ── Session ───────────────────────────────────────
    case '/sessions': {
      const sessions = listSessions();
      if (sessions.length === 0) {
        console.log(chalk.dim('  No saved sessions.'));
      } else {
        console.log(chalk.cyan(`\n  Saved Sessions (${sessions.length}):`));
        for (const s of sessions.slice(0, 20)) {
          console.log(
            chalk.white(`  ${s.id.slice(0, 12).padEnd(14)}`) +
            chalk.dim(`${s.name.padEnd(30)} ${s.turnCount} turns  ${s.model}  ${s.updatedAt.slice(0, 10)}`),
          );
        }
        console.log();
      }
      return { handled: true };
    }

    case '/save':
      session.name = args || session.name;
      autoSave(session, messages);
      console.log(chalk.green(`  Session saved: ${session.id} "${session.name}"`));
      return { handled: true };

    case '/resume': {
      if (!args) {
        console.log(chalk.yellow('  Usage: /resume <session-id>'));
        return { handled: true };
      }
      const loaded = loadSession(args);
      if (!loaded) {
        console.log(chalk.red(`  Session not found: ${args}`));
        return { handled: true };
      }
      console.log(chalk.green(`  Resumed: ${loaded.name} (${loaded.messages.length} messages)`));
      return { handled: true, newMessages: loaded.messages };
    }

    case '/delete':
      if (args && deleteSession(args)) {
        console.log(chalk.green(`  Deleted session: ${args}`));
      } else {
        console.log(chalk.yellow(`  Session not found: ${args}`));
      }
      return { handled: true };

    // ── Git ───────────────────────────────────────────
    case '/commit': {
      const prompt = buildCommitPrompt(process.cwd());
      if (!prompt) {
        console.log(chalk.yellow('  No git changes to commit.'));
        return { handled: true };
      }
      return { handled: false, injectPrompt: prompt };
    }

    case '/pr': {
      const prompt = buildPRPrompt(process.cwd());
      if (!prompt) {
        console.log(chalk.yellow('  Not a git repo or no commits to PR.'));
        return { handled: true };
      }
      return { handled: false, injectPrompt: prompt };
    }

    case '/diff':
      printDiff(process.cwd());
      return { handled: true };

    case '/log':
      printLog(process.cwd(), parseInt(args) || 15);
      return { handled: true };

    // ── Code Quality ──────────────────────────────────
    case '/review': {
      const prompt = buildReviewPrompt(process.cwd(), args || undefined);
      if (!prompt) {
        console.log(chalk.yellow('  No changes to review. Specify a target: /review HEAD~3'));
        return { handled: true };
      }
      mode.current = 'review';
      return { handled: false, injectPrompt: prompt };
    }

    case '/tdd':
      if (!args) {
        console.log(chalk.yellow('  Usage: /tdd <feature description>'));
        return { handled: true };
      }
      mode.current = 'tdd';
      return { handled: false, injectPrompt: buildTDDPrompt(args) };

    case '/security-review':
      mode.current = 'review';
      return { handled: false, injectPrompt: buildSecurityReviewPrompt(process.cwd()) };

    case '/audit': {
      const report = runAudit(process.cwd());
      printAuditReport(report);
      return { handled: true };
    }

    // ── Tools & Config ────────────────────────────────
    case '/tools':
      console.log(chalk.cyan('\n  Tools:'));
      ALL_TOOLS.forEach((t) => {
        const flags = [t.isReadOnly ? 'R' : 'RW', t.isDestructive ? '!' : ''].filter(Boolean).join('');
        console.log(chalk.white(`  ${t.name.padEnd(14)}`) + chalk.dim(`[${flags.padEnd(3)}] ${t.description.slice(0, 65)}`));
      });
      console.log();
      return { handled: true };

    case '/rules':
      printRules();
      return { handled: true };

    case '/perm':
      if (args && ['ask', 'auto', 'yolo'].includes(args)) {
        config.permissionMode = args as CrowcoderConfig['permissionMode'];
        saveConfig(config);
        console.log(chalk.green(`  Permissions: ${config.permissionMode}`));
      } else {
        console.log(chalk.dim(`  Current: ${config.permissionMode} (options: ask, auto, yolo)`));
      }
      return { handled: true };

    case '/dry-run':
      config.dryRun = !config.dryRun;
      saveConfig(config);
      const dryRunStatus = config.dryRun ? chalk.yellow('ON') : chalk.green('OFF');
      console.log(chalk.green(`  Dry-run mode: ${dryRunStatus}`));
      if (config.dryRun) {
        console.log(chalk.dim('  Tools will show what they would execute without actually running.'));
      }
      return { handled: true };

    case '/cd':
      if (args) {
        try {
          process.chdir(args);
          console.log(chalk.green(`  cwd: ${process.cwd()}`));
        } catch (e: unknown) {
          console.log(chalk.red(`  ${e instanceof Error ? e.message : e}`));
        }
      } else {
        console.log(chalk.dim(`  cwd: ${process.cwd()}`));
      }
      return { handled: true };

    case '/hooks': {
      const hooks = listHooks();
      if (hooks.length === 0) {
        console.log(chalk.dim('  No hooks configured. Edit ~/.crowcoder/hooks.json'));
      } else {
        console.log(chalk.cyan(`\n  Hooks (${hooks.length}):`));
        hooks.forEach((h, i) => {
          const status = h.enabled === false ? chalk.red('OFF') : chalk.green('ON');
          console.log(chalk.dim(`  ${i}. [${status}] ${h.event} → ${h.match} → ${h.command.slice(0, 50)}`));
        });
      }
      console.log();
      return { handled: true };
    }

    // ── Learning & Cost ───────────────────────────────
    case '/usage':
      printUsageSummary();
      return { handled: true };

    case '/budget': {
      const [daily, monthly] = args.split(/\s+/).map(Number);
      if (!daily || isNaN(daily)) {
        console.log(chalk.yellow('  Usage: /budget <daily-usd> [monthly-usd]'));
        return { handled: true };
      }
      setBudget(daily, monthly || daily * 30);
      console.log(chalk.green(`  Budget set: $${daily}/day, $${monthly || daily * 30}/month`));
      return { handled: true };
    }

    case '/learn': {
      const patterns = extractPatterns(messages, session.id);
      if (patterns.length === 0) {
        console.log(chalk.dim('  No patterns extracted from this session.'));
      } else {
        console.log(chalk.green(`  Extracted ${patterns.length} patterns:`));
        for (const p of patterns) {
          console.log(chalk.dim(`    [${p.category}] ${p.pattern.slice(0, 80)}`));
        }
      }
      return { handled: true };
    }

    case '/instincts':
      printInstinctStatus();
      return { handled: true };

    case '/prune': {
      const count = pruneExpired();
      console.log(chalk.dim(`  Pruned ${count} expired instincts.`));
      return { handled: true };
    }

    // ── Orchestration ─────────────────────────────────
    case '/orchestrate':
      if (!args) {
        console.log(chalk.yellow('  Usage: /orchestrate <task description>'));
        return { handled: true };
      }
      mode.current = 'architect';
      const orchPrompt = buildOrchestrationPrompt(args);
      return { handled: false, injectPrompt: orchPrompt };

    // ── Verification & Build ─────────────────────────
    case '/verify': {
      const prompt = buildVerifyPrompt(process.cwd(), args || undefined);
      return { handled: false, injectPrompt: prompt };
    }

    case '/build-fix': {
      const prompt = buildBuildFixPrompt(process.cwd(), args || undefined);
      return { handled: false, injectPrompt: prompt };
    }

    case '/test-coverage': {
      const prompt = buildCoveragePrompt(process.cwd());
      return { handled: false, injectPrompt: prompt };
    }

    case '/refactor':
    case '/refactor-clean': {
      const prompt = args ? buildRefactorPrompt(process.cwd(), args) : buildCleanupPrompt(process.cwd());
      return { handled: false, injectPrompt: prompt };
    }

    case '/e2e': {
      if (!args) {
        console.log(chalk.yellow('  Usage: /e2e <feature description>'));
        return { handled: true };
      }
      return { handled: false, injectPrompt: buildE2EPrompt(args, process.cwd()) };
    }

    case '/eval': {
      if (!args) {
        console.log(chalk.yellow('  Usage: /eval <criteria> [target]'));
        return { handled: true };
      }
      return { handled: false, injectPrompt: buildEvalPrompt(args) };
    }

    case '/plan': {
      if (!args) {
        console.log(chalk.yellow('  Usage: /plan <task description>'));
        return { handled: true };
      }
      mode.current = 'plan';
      return { handled: false, injectPrompt: buildPlanPrompt(args, process.cwd()) };
    }

    case '/update-docs': {
      return { handled: false, injectPrompt: buildDocsUpdatePrompt(process.cwd()) };
    }

    // ── Checkpoints ──────────────────────────────────
    case '/checkpoint': {
      const cp = saveCheckpoint(session.id, process.cwd(), args || undefined);
      console.log(chalk.green(`  Checkpoint saved: ${cp.id} ${cp.label ? `"${cp.label}"` : ''}`));
      console.log(chalk.dim(`  Git SHA: ${cp.headSha?.slice(0, 8) || 'N/A'}`));
      return { handled: true };
    }

    case '/checkpoints': {
      const cps = listCheckpoints(session.id);
      if (cps.length === 0) {
        console.log(chalk.dim('  No checkpoints for this session.'));
      } else {
        console.log(chalk.cyan(`\n  Checkpoints (${cps.length}):`));
        for (const cp of cps) {
          console.log(chalk.white(`  ${cp.id.slice(0, 12).padEnd(14)}`) +
            chalk.dim(`${(cp.label || 'unnamed').padEnd(20)} ${cp.headSha?.slice(0, 8) || 'N/A'}  ${cp.timestamp.slice(0, 19)}`));
        }
      }
      console.log();
      return { handled: true };
    }

    // ── Instinct Management ──────────────────────────
    case '/instinct-export': {
      const json = exportInstincts();
      const exportPath = `${process.cwd()}/instincts-export-${Date.now()}.json`;
      fsWriteFileSync(exportPath, json, 'utf-8');
      console.log(chalk.green(`  Instincts exported to: ${exportPath}`));
      return { handled: true };
    }

    case '/instinct-import': {
      if (!args) {
        console.log(chalk.yellow('  Usage: /instinct-import <path-to-json>'));
        return { handled: true };
      }
      try {
        const json = fsReadFileSync(args.trim(), 'utf-8');
        const count = importInstincts(json);
        console.log(chalk.green(`  Imported ${count} instincts.`));
      } catch (e: unknown) {
        console.log(chalk.red(`  Error: ${e instanceof Error ? e.message : e}`));
      }
      return { handled: true };
    }

    case '/evolve': {
      const instincts = listInstincts();
      if (instincts.length < 3) {
        console.log(chalk.yellow('  Need at least 3 instincts to evolve into skills.'));
        return { handled: true };
      }
      const skills = evolveInstinctsToSkills(instincts);
      if (skills.length === 0) {
        console.log(chalk.dim('  No skill clusters found. Keep learning!'));
      } else {
        console.log(chalk.green(`  Evolved ${skills.length} skills from ${instincts.length} instincts:`));
        for (const s of skills) {
          console.log(chalk.dim(`    [${s.category}] ${s.name}: ${s.description.slice(0, 60)}`));
        }
      }
      return { handled: true };
    }

    case '/skills':
      printSkillList();
      return { handled: true };

    case '/memory':
      printMemoryStatus();
      return { handled: true };

    // ── Detection ────────────────────────────────────
    case '/detect': {
      const pm = detectPackageManager(process.cwd());
      const tr = detectTestRunner(process.cwd());
      const bt = detectBuildTool(process.cwd());
      console.log(chalk.cyan('\n  Project Detection:'));
      console.log(chalk.dim(`  Package Manager: ${pm.name} (${pm.command})`));
      console.log(chalk.dim(`  Test Runner:     ${tr.name} (${tr.command})`));
      console.log(chalk.dim(`  Build Tool:      ${bt.name} (${bt.command})`));
      console.log();
      return { handled: true };
    }

    // ── Export ────────────────────────────────────────
    case '/export': {
      if (!messages.length) {
        console.log(chalk.yellow('  No conversation to export.'));
        return { handled: true };
      }

      const format: ExportFormat = (args.trim() as ExportFormat) || 'md';
      if (!['md', 'json', 'txt'].includes(format)) {
        console.log(chalk.yellow(`  Unknown format: ${format}. Use: md, json, or txt`));
        return { handled: true };
      }

      const filepath = saveExport(messages, format);
      console.log(chalk.green(`  Exported to: ${filepath}`));
      return { handled: true };
    }

    // ── Config (trigger wizard) ───────────────────────
    case '/config':
      return { handled: true, shouldExit: false };

    case '/exit':
    case '/quit':
      return { handled: true, shouldExit: true };

    default:
      console.log(chalk.dim(`  Unknown command: ${cmd}. Type /help`));
      return { handled: true };
  }
}

// ── Main ──────────────────────────────────────────────────
async function main(): Promise<void> {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  // Initialize subsystems
  initHooksDir();

  // Load or create config
  let config: CrowcoderConfig;
  if (!configExists()) {
    config = await setupWizard(rl);
  } else {
    config = loadConfig();
  }

  // Create session
  const mode = { current: 'dev' as Mode };
  const session = createSession(process.cwd(), config.model, config.provider, mode.current);
  const messages: Message[] = [];

  // Session start hook + memory persistence
  await runHooks({ event: 'SessionStart', sessionId: session.id, cwd: process.cwd() });
  const memoryContext = onSessionStart(session.id, process.cwd());
  if (memoryContext) {
    messages.push({ role: 'system', content: memoryContext });
  }

  // Show startup display based on theme setting
  const themeMode = config.theme || 'full';
  if (themeMode === 'full') {
    // Full mode: splash + banner
    printSplash();
    printThemedBanner(
      config.provider,
      config.model,
      mode.current,
      config.permissionMode,
      session.id,
      ALL_TOOLS.map((t) => t.name),
    );
  } else if (themeMode === 'compact') {
    // Compact mode: just banner
    printThemedBanner(
      config.provider,
      config.model,
      mode.current,
      config.permissionMode,
      session.id,
      ALL_TOOLS.map((t) => t.name),
    );
  } else {
    // Minimal mode: just a one-liner
    console.log(theme.brandBold('Crowcoder v1.0') + theme.dim(' — AI Coding Assistant'));
    console.log('');
  }

  let autoRoute = false;

  // Main REPL loop
  while (true) {
    let input: string;
    try {
      const modeTag = mode.current !== 'dev' ? theme.dim(`[${mode.current}] `) : '';
      input = await rl.question(modeTag + theme.prompt('you → '));
    } catch {
      break;
    }

    const trimmed = input.trim();
    if (!trimmed) continue;

    // Shell escape
    if (trimmed.startsWith('!')) {
      const { exec } = await import('node:child_process');
      const cmd = trimmed.slice(1).trim();
      if (cmd) {
        exec(cmd, { cwd: process.cwd(), maxBuffer: 5 * 1024 * 1024 }, (_err, out, err) => {
          if (out) console.log(out);
          if (err) console.error(chalk.yellow(err));
          if (_err && !out && !err) console.error(chalk.red(_err.message));
        });
      }
      continue;
    }

    // Slash commands
    if (trimmed.startsWith('/')) {
      const result = handleSlashCommand(trimmed, config, messages, session, mode);
      if (result.shouldExit) break;
      if (result.newMessages !== undefined) {
        messages.length = 0;
        messages.push(...result.newMessages);
      }
      if (trimmed.startsWith('/config') && !result?.shouldExit) {
        config = await setupWizard(rl);
        resetClient();
        printThemedBanner(
          config.provider,
          config.model,
          mode.current,
          config.permissionMode,
          session.id,
          ALL_TOOLS.map((t) => t.name),
        );
        continue;
      }
      if (trimmed === '/route') {
        autoRoute = true;
        continue;
      }
      // Some commands inject a prompt into the conversation (e.g. /commit, /review, /tdd)
      if (result.injectPrompt) {
        messages.push({ role: 'user', content: result.injectPrompt });
        await runQuery({ config, messages, cwd: process.cwd(), rl, sessionId: session.id, mode: mode.current });
        await autoSave(session, messages);
        continue;
      }
      if (result.handled) continue;
    }

    // Auto-route model if enabled
    if (autoRoute) {
      const complexity = classifyComplexity(trimmed);
      const route = routeModel(config, complexity);
      if (route.model !== config.model) {
        console.log(chalk.dim(`  [routing: ${route.reason}]`));
        config.model = route.model;
        resetClient();
      }
      autoRoute = false;
    }

    // Add user message and run query
    messages.push({ role: 'user', content: trimmed });

    await runQuery({
      config,
      messages,
      cwd: process.cwd(),
      rl,
      sessionId: session.id,
      mode: mode.current,
    });

    // Auto-save session
    await autoSave(session, messages);

    // Strategic compaction check
    const compactionHint = shouldSuggestCompaction(messages, 0);
    if (compactionHint) {
      console.log(chalk.yellow(`  ⚡ ${compactionHint.reason} (strategy: ${compactionHint.strategy}, ~${compactionHint.estimatedSavings.toLocaleString()} tokens saveable)`));
    }
  }

  // Session stop hook + memory persistence
  onSessionEnd(session.id, messages, process.cwd());
  await runHooks({ event: 'SessionStop', sessionId: session.id, cwd: process.cwd() });

  // Final save
  await autoSave(session, messages);
  console.log(chalk.dim(`\nSession saved: ${session.id}`));
  console.log(chalk.dim('Goodbye!\n'));
  rl.close();
  process.exit(0);
}

main().catch((err) => {
  console.error(chalk.red(`Fatal: ${err.message || err}`));
  process.exit(1);
});
