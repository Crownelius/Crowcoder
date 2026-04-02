/**
 * Dynamic modes — dev/review/TDD/research/plan mode switching.
 * Each mode injects specialized system prompt additions and behavior.
 */

export type Mode = 'dev' | 'review' | 'tdd' | 'research' | 'plan' | 'debug' | 'architect';

export interface ModeConfig {
  name: Mode;
  label: string;
  description: string;
  systemPromptAddition: string;
  suggestedTools: string[];
  temperature?: number;
}

export const MODES: Record<Mode, ModeConfig> = {
  dev: {
    name: 'dev',
    label: 'Development',
    description: 'General coding — write features, fix bugs, refactor',
    systemPromptAddition: `
# Mode: Development
You are in development mode. Focus on:
- Writing clean, correct, secure code
- Following existing patterns in the codebase
- Making minimal changes to achieve the goal
- Testing your changes work before considering them done
- Reading files before editing them`,
    suggestedTools: ['bash', 'read_file', 'edit_file', 'write_file', 'grep', 'glob'],
  },

  review: {
    name: 'review',
    label: 'Code Review',
    description: 'Review code for quality, security, and correctness',
    systemPromptAddition: `
# Mode: Code Review
You are in code review mode. For every piece of code you examine:
1. **Correctness**: Does it do what it claims? Edge cases? Off-by-one errors?
2. **Security**: SQL injection, XSS, command injection, path traversal, secrets in code?
3. **Performance**: N+1 queries, unbounded loops, memory leaks, missing indexes?
4. **Maintainability**: Clear naming, reasonable complexity, no dead code?
5. **Testing**: Are tests adequate? What's untested?

Rate each file: PASS / WARN / FAIL with specific line-level feedback.
Output a structured review with severity levels: critical / high / medium / low / nit.`,
    suggestedTools: ['read_file', 'grep', 'glob', 'bash'],
  },

  tdd: {
    name: 'tdd',
    label: 'Test-Driven Development',
    description: 'Write tests first, then make them pass',
    systemPromptAddition: `
# Mode: Test-Driven Development
Follow the strict TDD cycle:
1. **RED**: Write a failing test that defines the desired behavior
2. **GREEN**: Write the minimal code to make the test pass
3. **REFACTOR**: Clean up without changing behavior, ensure tests still pass

Rules:
- NEVER write implementation before a failing test
- Each test should test ONE behavior
- Run tests after every change
- Keep the feedback loop tight: write test → run → fail → implement → run → pass → refactor`,
    suggestedTools: ['bash', 'write_file', 'edit_file', 'read_file'],
    temperature: 0.2,
  },

  research: {
    name: 'research',
    label: 'Research',
    description: 'Explore codebases, read docs, understand systems',
    systemPromptAddition: `
# Mode: Research
You are in research/exploration mode. Focus on:
- Reading and understanding code thoroughly before suggesting changes
- Tracing execution paths and data flow
- Mapping dependencies and architecture
- Summarizing findings clearly
- DO NOT modify files unless explicitly asked — read only
- Use grep and glob extensively to find relevant code
- Build a mental map and share it with the user`,
    suggestedTools: ['read_file', 'grep', 'glob', 'list_dir', 'web_fetch'],
    temperature: 0.4,
  },

  plan: {
    name: 'plan',
    label: 'Planning',
    description: 'Design implementation plans before coding',
    systemPromptAddition: `
# Mode: Planning
You are in planning mode. Help the user design before building:
1. **Understand**: Read relevant code, understand the current state
2. **Options**: Present 2-3 implementation approaches with trade-offs
3. **Plan**: Write a step-by-step implementation plan
4. **Files**: List every file that needs to change and what changes
5. **Risks**: Identify risks, edge cases, and migration concerns

DO NOT write code in this mode. Only produce plans.
Format plans as numbered steps with file paths and descriptions.`,
    suggestedTools: ['read_file', 'grep', 'glob', 'list_dir'],
    temperature: 0.5,
  },

  debug: {
    name: 'debug',
    label: 'Debug',
    description: 'Systematic debugging of issues',
    systemPromptAddition: `
# Mode: Debug
You are in debugging mode. Follow a systematic approach:
1. **Reproduce**: Understand and reproduce the bug
2. **Hypothesize**: Form hypotheses about root cause
3. **Test**: Check each hypothesis with targeted reads/searches
4. **Isolate**: Narrow down to the exact line/function
5. **Fix**: Apply minimal fix
6. **Verify**: Confirm the fix works and doesn't break other things

Use logs, error messages, and stack traces. Check git blame for recent changes.
Never guess — always verify with evidence.`,
    suggestedTools: ['bash', 'read_file', 'grep', 'glob', 'edit_file'],
    temperature: 0.2,
  },

  architect: {
    name: 'architect',
    label: 'Architect',
    description: 'System design and architecture decisions',
    systemPromptAddition: `
# Mode: Architect
You are in architecture mode. Help with system-level decisions:
- Component boundaries and interfaces
- Data flow and state management
- Technology choices and trade-offs
- Scalability and performance considerations
- Security architecture
- API design (REST, GraphQL, gRPC)
- Database schema design
- Infrastructure and deployment

Think at the system level. Draw diagrams using ASCII art or Mermaid syntax.
Consider both current needs and reasonable future growth.`,
    suggestedTools: ['read_file', 'grep', 'glob', 'list_dir', 'web_fetch'],
    temperature: 0.5,
  },
};

export function getMode(name: string): ModeConfig | undefined {
  return MODES[name as Mode];
}

export function getModePromptAddition(mode: Mode): string {
  return MODES[mode]?.systemPromptAddition || '';
}

export function listModes(): ModeConfig[] {
  return Object.values(MODES);
}
