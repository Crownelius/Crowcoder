import { exec } from 'node:child_process';
import type { Tool, ToolResult } from './types.js';

export const BashTool: Tool = {
  name: 'bash',
  description:
    'Execute a shell command and return its stdout/stderr. Use for running builds, tests, git commands, installs, and any terminal operation.',
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

    return new Promise((resolve) => {
      exec(
        command,
        {
          cwd,
          timeout,
          maxBuffer: 10 * 1024 * 1024, // 10MB
          shell: process.platform === 'win32' ? 'bash' : '/bin/bash',
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
