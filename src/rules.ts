/**
 * Rules engine — per-language coding standards.
 * Loads rules from ~/.crowcoder/rules/ and injects into system prompt.
 * Ships with built-in presets for common languages.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { getConfigDir } from './config.js';

const RULES_DIR = join(getConfigDir(), 'rules');

export interface RuleSet {
  language: string;
  rules: string;
}

// ── Built-in rule presets ─────────────────────────────────
const BUILTIN_RULES: Record<string, string> = {
  typescript: `# TypeScript Rules
- Use strict mode; enable all strict compiler options
- Prefer const over let; never use var
- Use explicit return types on exported functions
- Use interfaces for object shapes, types for unions/intersections
- Prefer readonly arrays and properties where possible
- Use nullish coalescing (??) over OR (||) for defaults
- Use optional chaining (?.) for deep property access
- Handle all Promise rejections — no floating promises
- Use template literals over string concatenation
- Use ESM imports (import/export), not CommonJS (require)
- File naming: kebab-case for files, PascalCase for components/classes
- Max file length: 300 lines — split if larger
- Prefer early returns over deeply nested conditionals`,

  python: `# Python Rules
- Follow PEP 8 style guidelines
- Use type hints on all function signatures
- Use dataclasses or Pydantic for structured data
- Prefer f-strings over .format() or % formatting
- Use pathlib.Path instead of os.path for file operations
- Use context managers (with) for resource management
- Use list/dict/set comprehensions where readable
- Prefer enumerate() over range(len())
- Never use mutable default arguments (use None + factory)
- Use logging module, not print(), for non-user-facing output
- Max function length: 30 lines — extract if larger
- Write docstrings for all public functions (Google style)`,

  go: `# Go Rules
- Follow Effective Go and Go Proverbs
- Use gofmt/goimports for formatting
- Handle every error — no _ for errors unless explicitly justified
- Use short variable declarations (:=) inside functions
- Keep interfaces small — 1-3 methods, defined where used
- Use context.Context as the first parameter for long-running ops
- Use table-driven tests
- Prefer returning errors over panicking
- Use defer for cleanup
- Package naming: short, lowercase, no underscores
- Avoid init() functions — prefer explicit initialization
- Use struct embedding for composition, not inheritance`,

  rust: `# Rust Rules
- Follow Rust API Guidelines (RFC 430)
- Use clippy lints: #![warn(clippy::all)]
- Prefer &str over String for function parameters
- Use Result<T, E> for fallible operations, not panics
- Implement Display for error types
- Use iterators and combinators over manual loops where clear
- Prefer owned types in struct fields, borrows in function params
- Use derive macros for Debug, Clone, PartialEq where appropriate
- Keep unsafe blocks minimal and well-documented
- Use cargo fmt for formatting
- Prefer match over if-let chains for >2 variants`,

  java: `# Java Rules
- Follow Google Java Style Guide
- Use records for value objects (Java 16+)
- Use var for local variables with clear initialization
- Prefer List.of(), Map.of() over mutable collections
- Use Optional instead of null for potentially absent values
- Use try-with-resources for all Closeable resources
- Prefer streams over explicit loops for collection transforms
- Use @Override annotation always
- Final fields by default; minimize mutability
- One class per file; class name matches filename
- Use SLF4J for logging`,

  kotlin: `# Kotlin Rules
- Follow Kotlin Coding Conventions
- Use data classes for value objects
- Prefer val over var — immutability by default
- Use sealed classes for restricted hierarchies
- Use when instead of if-else chains (>2 branches)
- Use scope functions (let, run, apply, also) appropriately
- Use coroutines for async — avoid callbacks
- Prefer extension functions for utility operations
- Use string templates over concatenation
- Use named arguments for functions with >3 parameters`,

  cpp: `# C++ Rules
- Follow C++ Core Guidelines
- Use smart pointers (unique_ptr, shared_ptr) — no raw owning pointers
- Use RAII for resource management
- Prefer references over pointers where nullability is not needed
- Use const correctly and consistently
- Use auto for complex types where the type is obvious from context
- Prefer range-based for loops
- Use std::string_view for non-owning string parameters
- Use [[nodiscard]] for functions where ignoring return is an error
- Use std::optional for values that may not exist
- Keep headers minimal — forward-declare where possible
- Use namespaces to avoid name collisions`,

  php: `# PHP Rules
- Use PHP 8.1+ features: enums, fibers, readonly properties
- Use strict types: declare(strict_types=1) in every file
- Use type declarations for all parameters, return types, and properties
- Follow PSR-12 coding style
- Use constructor promotion for simple classes
- Use match() over switch for value mapping
- Use null coalescing (??) and nullsafe (?->) operators
- Use named arguments for clarity
- Prefer arrays + array functions over manual loops
- Use Composer autoloading (PSR-4)`,
};

function ensureDir(): void {
  mkdirSync(RULES_DIR, { recursive: true });
}

/**
 * Load rules for a specific language.
 * Checks user rules first, falls back to built-in.
 */
export function loadRules(language: string): string | null {
  ensureDir();
  const userFile = join(RULES_DIR, `${language}.md`);
  if (existsSync(userFile)) {
    return readFileSync(userFile, 'utf-8');
  }
  return BUILTIN_RULES[language] || null;
}

/**
 * Save custom rules for a language.
 */
export function saveRules(language: string, rules: string): void {
  ensureDir();
  writeFileSync(join(RULES_DIR, `${language}.md`), rules, 'utf-8');
}

/**
 * List all available rule sets (built-in + custom).
 */
export function listRuleSets(): { language: string; source: 'builtin' | 'custom' }[] {
  ensureDir();
  const result: { language: string; source: 'builtin' | 'custom' }[] = [];

  // Custom rules
  const customFiles = readdirSync(RULES_DIR).filter((f) => f.endsWith('.md'));
  for (const f of customFiles) {
    result.push({ language: f.replace('.md', ''), source: 'custom' });
  }

  // Built-in (not overridden)
  for (const lang of Object.keys(BUILTIN_RULES)) {
    if (!result.find((r) => r.language === lang)) {
      result.push({ language: lang, source: 'builtin' });
    }
  }

  return result.sort((a, b) => a.language.localeCompare(b.language));
}

/**
 * Auto-detect languages in the project by file extensions.
 */
export function detectLanguages(cwd: string): string[] {
  const extMap: Record<string, string> = {
    '.ts': 'typescript', '.tsx': 'typescript', '.js': 'typescript', '.jsx': 'typescript',
    '.py': 'python', '.pyw': 'python',
    '.go': 'go',
    '.rs': 'rust',
    '.java': 'java',
    '.kt': 'kotlin', '.kts': 'kotlin',
    '.cpp': 'cpp', '.cc': 'cpp', '.cxx': 'cpp', '.h': 'cpp', '.hpp': 'cpp',
    '.php': 'php',
  };

  const detected = new Set<string>();
  try {
    const files = readdirSync(cwd, { recursive: true, withFileTypes: true });
    for (const f of files as any[]) {
      if (!f.isFile()) continue;
      const name: string = f.name;
      const ext = name.slice(name.lastIndexOf('.'));
      if (extMap[ext]) detected.add(extMap[ext]);
      if (detected.size >= 5) break; // enough
    }
  } catch {
    // can't read dir
  }
  return Array.from(detected);
}

/**
 * Build rules section for system prompt based on detected languages.
 */
export function buildRulesPrompt(cwd: string): string {
  const languages = detectLanguages(cwd);
  if (languages.length === 0) return '';

  const sections: string[] = [];
  for (const lang of languages) {
    const rules = loadRules(lang);
    if (rules) sections.push(rules);
  }

  if (sections.length === 0) return '';
  return `\n# Coding Standards\n${sections.join('\n\n')}`;
}

export function printRules(): void {
  const sets = listRuleSets();
  console.log(chalk.cyan(`\n  Rule Sets (${sets.length}):`));
  for (const s of sets) {
    console.log(chalk.dim(`  ${s.language.padEnd(15)} [${s.source}]`));
  }
  console.log(chalk.dim('  \n  Custom rules: ~/.crowcoder/rules/<language>.md'));
  console.log();
}
