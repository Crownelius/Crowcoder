import type { Tool } from './types.js';
import { BashTool } from './bash.js';
import { ReadTool } from './read.js';
import { WriteTool } from './write.js';
import { EditTool } from './edit.js';
import { GrepTool } from './grep.js';
import { GlobTool } from './glob.js';
import { WebFetchTool } from './web-fetch.js';
import { WebSearchTool } from './web-search.js';
import { ListDirTool } from './list-dir.js';

export const ALL_TOOLS: Tool[] = [
  BashTool,
  ReadTool,
  WriteTool,
  EditTool,
  GrepTool,
  GlobTool,
  ListDirTool,
  WebFetchTool,
  WebSearchTool,
];

export function getToolNames(): string[] {
  return ALL_TOOLS.map((t) => t.name);
}

export function getToolByName(name: string): Tool | undefined {
  return ALL_TOOLS.find((t) => t.name === name);
}

export type { Tool, ToolResult } from './types.js';
