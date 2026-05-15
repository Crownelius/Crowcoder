#!/usr/bin/env node
/**
 * Smoke test for every Crowcoder slash command.
 *
 * Imports handleSlashCommand directly from dist and dispatches each command
 * with sensible default args. Zero LLM calls — for LLM-driven commands we
 * just verify the injectPrompt was generated. For local commands we verify
 * { handled: true } and capture stdout.
 *
 * Run with:
 *   cd <crowcoder>; npx tsc; node tests/smoke-commands.js
 *
 * Exit code: 0 = all pass, 1 = any failed.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use a temp config dir so commands like /dry-run that call saveConfig() can't
// clobber the user's real ~/.crowcoder/config.json. MUST be set BEFORE dist
// is imported so config.ts picks it up.
const TMP_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'crowcoder-smoke-'));
process.env.CROWCODER_HOME = TMP_HOME;

async function main() {
  const dist = path.join(__dirname, '..', 'dist', 'index.js');
  if (!fs.existsSync(dist)) {
    console.error('dist/index.js missing. Run: npx tsc');
    process.exit(2);
  }
  const mod = await import(pathToFileURL(dist).href);
  const { handleSlashCommand } = mod;
  if (typeof handleSlashCommand !== 'function') {
    console.error('handleSlashCommand not exported from dist/index.js');
    process.exit(2);
  }

  // Minimal stubs sufficient for command dispatch
  const config = {
    apiKey: '',
    baseURL: 'http://localhost:8080/v1',
    model: 'test-model',
    provider: 'OpenRouter',
    maxTokens: 8192,
    temperature: 0.3,
    permissionMode: 'yolo',
    dryRun: false,
    theme: 'full',
    showThinking: false,
  };
  const messages = [];
  const session = { id: 'smoke-session', cwd: process.cwd(), model: 'test-model', provider: 'OpenRouter', mode: 'dev', startedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const mode = { current: 'dev' };

  // Categorize: which commands need args, which don't. Pure-local commands
  // (handled: true) vs LLM-driven (handled: false, injectPrompt: string).
  // Commands are listed in roughly the order they appear in /help.
  const tests = [
    // General
    { cmd: '/help', kind: 'local' },
    { cmd: '/clear', kind: 'local' },
    { cmd: '/history', kind: 'local' },
    { cmd: '/export md', kind: 'local' },

    // Model & Provider
    { cmd: '/model', kind: 'local' },
    { cmd: '/models', kind: 'local' },
    { cmd: '/provider', kind: 'local' },

    // Modes (list-only after the unification)
    { cmd: '/mode dev', kind: 'local' },
    { cmd: '/mode hermes', kind: 'local' },
    { cmd: '/mode dev', kind: 'local' },
    { cmd: '/modes', kind: 'local' },
    { cmd: '/hermes', kind: 'local' },
    { cmd: '/mode dev', kind: 'local' },

    // Session
    { cmd: '/sessions', kind: 'local' },

    // Git (these print local output even with no git changes)
    { cmd: '/diff', kind: 'local' },
    { cmd: '/log 5', kind: 'local' },

    // Code quality — LLM-driven, expect injectPrompt
    { cmd: '/tdd add login button', kind: 'llm' },
    { cmd: '/security-review', kind: 'llm' },
    { cmd: '/build-fix', kind: 'llm' },
    { cmd: '/refactor', kind: 'llm' },
    { cmd: '/e2e checkout flow', kind: 'llm' },
    { cmd: '/eval correctness', kind: 'llm' },
    { cmd: '/plan add user profiles', kind: 'llm' },
    { cmd: '/verify', kind: 'llm' },
    { cmd: '/test-coverage', kind: 'llm' },
    { cmd: '/update-docs', kind: 'llm' },

    // Tools & config
    { cmd: '/tools', kind: 'local' },
    { cmd: '/rules', kind: 'local' },
    { cmd: '/perm', kind: 'local' },
    { cmd: '/dry-run', kind: 'local' }, // toggles, run twice to restore
    { cmd: '/dry-run', kind: 'local' },
    { cmd: '/hooks', kind: 'local' },
    { cmd: '/hook-profile', kind: 'local' },

    // Audit + detection
    { cmd: '/audit', kind: 'local' },
    { cmd: '/detect', kind: 'local' },

    // Planning & docs
    { cmd: '/checkpoints', kind: 'local' },
    { cmd: '/search-first refactor parser', kind: 'llm' },
    { cmd: '/docs-lookup fetch API', kind: 'llm' },

    // Language reviews
    { cmd: '/auto-review', kind: 'llm' },
    { cmd: '/ts-review', kind: 'llm' },
    { cmd: '/py-review', kind: 'llm' },
    { cmd: '/go-review', kind: 'llm' },
    { cmd: '/rust-review', kind: 'llm' },
    { cmd: '/java-review', kind: 'llm' },
    { cmd: '/cpp-review', kind: 'llm' },
    { cmd: '/kotlin-review', kind: 'llm' },
    { cmd: '/php-review', kind: 'llm' },
    { cmd: '/db-review', kind: 'llm' },

    // Language build fixes
    { cmd: '/ts-build-fix', kind: 'llm' },
    { cmd: '/go-build-fix', kind: 'llm' },
    { cmd: '/rust-build-fix', kind: 'llm' },
    { cmd: '/java-build-fix', kind: 'llm' },
    { cmd: '/cpp-build-fix', kind: 'llm' },
    { cmd: '/pytorch-fix', kind: 'llm' },

    // Orchestration
    { cmd: '/orchestrate refactor billing', kind: 'llm' },
    { cmd: '/pr-loop', kind: 'llm' },
    { cmd: '/multi-plan refactor billing', kind: 'llm' },
    { cmd: '/multi-execute step 1', kind: 'llm' },
    { cmd: '/multi-backend users,billing', kind: 'llm' },
    { cmd: '/multi-frontend header,footer', kind: 'llm' },

    // Codemaps
    { cmd: '/codemap', kind: 'local' },

    // Skills & patterns
    { cmd: '/skills', kind: 'local' },
    { cmd: '/skill-create', kind: 'llm' },
    { cmd: '/git-patterns', kind: 'local' },
    { cmd: '/git-workflow', kind: 'local' },

    // Learning & cost
    { cmd: '/usage', kind: 'local' },
    { cmd: '/instincts', kind: 'local' },
    { cmd: '/prune', kind: 'local' },
    { cmd: '/memory', kind: 'local' },

    // Content engine — LLM-driven
    { cmd: '/article 5 productivity hacks', kind: 'llm' },
    { cmd: '/slides intro to TDD 10', kind: 'llm' },
    { cmd: '/repurpose AI safety primer', kind: 'llm' },
    { cmd: '/market-research dev tools', kind: 'llm' },
    { cmd: '/investor-deck a TDD coach SaaS', kind: 'llm' },
    { cmd: '/code-quality', kind: 'llm' },
    { cmd: '/skill-stocktake', kind: 'llm' },

    // Walkthrough
    { cmd: '/walkthrough', kind: 'llm' },
    { cmd: '/tour', kind: 'llm' },
    { cmd: '/guide', kind: 'llm' },

    // ECC
    { cmd: '/ecc', kind: 'local' },
    { cmd: '/ecc-skills', kind: 'local' },
    { cmd: '/ecc-agents', kind: 'local' },
    { cmd: '/ecc-commands', kind: 'local' },
    { cmd: '/ecc-tdd add login', kind: 'llm' },
    { cmd: '/ecc-feature-development add auth', kind: 'llm' },
    { cmd: '/ecc-database-migration add users table', kind: 'llm' },
    { cmd: '/ecc-add-language-rules typescript', kind: 'llm' },
    { cmd: '/ecc-bogus-name', kind: 'local-error' }, // dynamic dispatch should print "Unknown ECC command"
  ];

  const results = { pass: 0, fail: 0, skipped: 0 };
  const failures = [];

  // Silence dispatcher stdout during the loop; we capture lines per-test.
  const origWrite = process.stdout.write.bind(process.stdout);
  let buffer = '';
  process.stdout.write = (s) => { buffer += String(s); return true; };

  function flushBuffer() {
    const text = buffer;
    buffer = '';
    return text;
  }

  for (const t of tests) {
    buffer = '';
    let res;
    let threw = null;
    try {
      res = handleSlashCommand(t.cmd, config, messages, session, mode);
    } catch (e) {
      threw = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    }
    const output = flushBuffer();

    const checks = [];
    if (threw) {
      checks.push(`THREW: ${threw}`);
    } else if (!res || typeof res !== 'object') {
      checks.push(`return value not an object (got ${typeof res})`);
    } else if (t.kind === 'local' || t.kind === 'local-error') {
      if (res.handled !== true) checks.push(`expected handled:true, got ${res.handled}`);
    } else if (t.kind === 'llm') {
      if (res.handled !== false) checks.push(`expected handled:false, got ${res.handled}`);
      if (!res.injectPrompt || typeof res.injectPrompt !== 'string') {
        checks.push(`expected injectPrompt:string, got ${typeof res.injectPrompt}`);
      } else if (res.injectPrompt.length < 50) {
        checks.push(`injectPrompt too short (${res.injectPrompt.length} chars)`);
      }
    }

    // Restore stdout briefly for the per-line report
    process.stdout.write = origWrite;
    const tag = checks.length === 0 ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
    const sizeNote = res?.injectPrompt
      ? ` (prompt ${res.injectPrompt.length}c)`
      : output ? ` (out ${output.split('\n').length}L)` : '';
    console.log(`  [${tag}] ${t.cmd.padEnd(40)} ${sizeNote}`);
    if (checks.length === 0) results.pass++;
    else {
      results.fail++;
      failures.push({ cmd: t.cmd, checks, output: output.slice(0, 500) });
    }
    process.stdout.write = (s) => { buffer += String(s); return true; };
  }

  process.stdout.write = origWrite;

  console.log('\n────────────────────────────────────────');
  console.log(`  Total: ${tests.length}   Pass: \x1b[32m${results.pass}\x1b[0m   Fail: \x1b[31m${results.fail}\x1b[0m`);
  console.log(`  Temp config dir: ${TMP_HOME} (cleaned)`);
  console.log('────────────────────────────────────────');

  // Always clean up the temp config dir so we don't leave junk in tmpdir.
  try { fs.rmSync(TMP_HOME, { recursive: true, force: true }); } catch {}

  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) {
      console.log(`\n  ${f.cmd}`);
      for (const c of f.checks) console.log(`    - ${c}`);
      if (f.output) console.log(`    output: ${JSON.stringify(f.output.slice(0, 200))}`);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Smoke test crashed:', e);
  process.exit(2);
});
