export interface Tool {
  name: string;
  description: string;
  parameters: JsonSchema;
  isReadOnly: boolean;
  isDestructive: boolean;
  call(input: Record<string, unknown>, cwd: string): Promise<ToolResult>;
}

export interface ToolResult {
  output: string;
  isError: boolean;
}

export interface JsonSchema {
  type: string;
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}
