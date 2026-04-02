import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { Tool, ToolResult } from './types.js';

export const WriteTool: Tool = {
  name: 'write_file',
  description:
    'Create or overwrite a file with the given content. Parent directories are created automatically.',
  parameters: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'Absolute or relative path to the file',
      },
      content: {
        type: 'string',
        description: 'The full content to write',
      },
    },
    required: ['file_path', 'content'],
  },
  isReadOnly: false,
  isDestructive: true,

  async call(input, cwd): Promise<ToolResult> {
    try {
      const filePath = resolve(cwd, input.file_path as string);
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, input.content as string, 'utf-8');
      const lines = (input.content as string).split('\n').length;
      return { output: `Wrote ${lines} lines to ${filePath}`, isError: false };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { output: `Error writing file: ${msg}`, isError: true };
    }
  },
};
