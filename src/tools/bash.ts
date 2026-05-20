import { exec } from 'node:child_process';
import type { Tool, ToolResult } from './types.js';

/**
 * Shell tool. Kept named `bash` for tool-call API compatibility, but on
 * Windows we route through cmd.exe by default — the platform-native shell.
 *
 * Previously this tool forced `shell: 'bash'` on Windows, which picked
 * up whichever bash was on PATH (Git Bash or WSL). WSL bash has its own
 * /home/<user> namespace that doesn't contain the user's actual files,
 * and neither variant inherits the Windows env vars the model typically
 * wants to use. Result: every `echo "..." > "$USERPROFILE/Downloads/x"`
 * failed with "No such file or directory" because $USERPROFILE was empty.
 *
 * On non-Windows platforms we keep /bin/bash since that's what shell
 * conventions assume there.
 *
 * Override either platform's choice with the COMPACT_AGENT_SHELL env
 * variable (e.g. COMPACT_AGENT_SHELL=pwsh, COMPACT_AGENT_SHELL=/bin/zsh).
 */
function pickShell(): string {
  const override = process.env.COMPACT_AGENT_SHELL;
  if (override && override.trim()) return override.trim();
  return process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
}

function shellLabel(): string {
  const s = pickShell();
  const base = s.replace(/\\/g, '/').split('/').pop() || s;
  return base.replace(/\.exe$/i, '');
}

export const BashTool: Tool = {
  name: 'bash',
  description:
    `Execute a shell command and return stdout/stderr. ` +
    `Active shell on this machine: ${shellLabel()} ` +
    `(override via COMPACT_AGENT_SHELL). ` +
    `Use for: running builds/tests, git commands, package installs, ` +
    `process management, system inspection. ` +
    `DO NOT use for creating or writing files — use write_file instead. ` +
    `Piping multi-line content through echo > path is fragile across ` +
    `platforms and shells; write_file handles content, paths, and ` +
    `quoting uniformly on Windows/macOS/Linux.`,
  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The shell command to execute',
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds (default 120000)',
      },
    },
    required: ['command'],
  },
  isReadOnly: false,
  isDestructive: true,

  async call(input, cwd): Promise<ToolResult> {
    const command = input.command as string;
    const timeout = (input.timeout as number) || 120_000;
    const shell = pickShell();

    return new Promise((resolve) => {
      exec(
        command,
        {
          cwd,
          timeout,
          maxBuffer: 10 * 1024 * 1024, // 10MB
          shell,
        },
        (error, stdout, stderr) => {
          if (error && !stdout && !stderr) {
            resolve({ output: `Error: ${error.message}`, isError: true });
            return;
          }
          const out = [stdout, stderr].filter(Boolean).join('\n');
          const MAX_OUTPUT = 100_000;
          const truncated = out.length > MAX_OUTPUT;
          const finalOutput = out.slice(0, MAX_OUTPUT) || '(no output)';

          resolve({
            output: truncated
              ? finalOutput + '\n... (output truncated, over 100KB)'
              : finalOutput,
            isError: !!error,
          });
        },
      );
    });
  },
};
