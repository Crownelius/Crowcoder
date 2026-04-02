# AnyCode CLI

Universal AI coding assistant for the terminal. Works with OpenRouter, GLM, Ollama, OpenAI, DeepSeek, LM Studio, or any OpenAI-compatible API.

```
anycode
```

---

## Features

Each feature is labeled with its data scope:

| Label | Meaning |
|-------|---------|
| **LOCAL** | All data stays on your machine in `~/.anycode/` |
| **API** | Sends data to your chosen AI provider only (required for the feature to work) |
| **NONE** | No data stored or sent |

### Core — API

| Feature | Data Scope | Description |
|---------|------------|-------------|
| Streaming chat | **API** | Send messages to your configured AI provider, stream responses |
| Tool execution | **API** | AI calls tools (bash, read, write, edit, grep, glob, list_dir, web_fetch) |
| Context compaction | **API** | Summarizes old messages via your AI provider when context grows large |
| AI code review | **API** | `/review` — sends diff to your AI for quality/security analysis |
| AI TDD mode | **API** | `/tdd` — AI writes tests first, then implementation |
| AI security review | **API** | `/security-review` — AI audits project for vulnerabilities |
| AI commit/PR | **API** | `/commit`, `/pr` — AI generates commit messages and PR descriptions |
| Multi-agent orchestration | **API** | Spawn parallel sub-tasks using your AI provider |

### Session & History — LOCAL

| Feature | Data Scope | Storage Location |
|---------|------------|------------------|
| Session persistence | **LOCAL** | `~/.anycode/sessions/*.json` |
| Auto-save | **LOCAL** | Saves after every turn to `~/.anycode/sessions/` |
| Session resume | **LOCAL** | `/resume <id>` loads from local files |

### Cost & Usage Tracking — LOCAL

| Feature | Data Scope | Storage Location |
|---------|------------|------------------|
| Token counting | **LOCAL** | `~/.anycode/usage.json` |
| Cost estimation | **LOCAL** | Estimated from local model cost table, never sent anywhere |
| Budget alerts | **LOCAL** | `/budget` sets local daily/monthly limits |
| Usage summary | **LOCAL** | `/usage` reads from local file only |

### Learning System — LOCAL

| Feature | Data Scope | Storage Location |
|---------|------------|------------------|
| Pattern extraction | **LOCAL** | `~/.anycode/instincts/*.json` |
| Instinct confidence | **LOCAL** | Scores stored and decayed locally |
| Import/export | **LOCAL** | `/learn`, `/instincts`, `/prune` — all local files |

### Security — NONE / LOCAL

| Feature | Data Scope | Description |
|---------|------------|-------------|
| Dangerous command detection | **NONE** | Regex-based, runs in-process, no data stored |
| Secret scanning | **NONE** | Regex-based, runs in-process, blocks secrets from being written |
| Security threat levels | **NONE** | Critical commands (rm -rf, DROP TABLE, force push) auto-blocked |

### Hooks — LOCAL

| Feature | Data Scope | Storage Location |
|---------|------------|------------------|
| Hook configuration | **LOCAL** | `~/.anycode/hooks.json` |
| PreToolUse / PostToolUse | **LOCAL** | User-defined scripts, run locally |
| SessionStart / SessionStop | **LOCAL** | User-defined scripts, run locally |

### Modes — NONE

| Feature | Data Scope | Description |
|---------|------------|-------------|
| Mode switching | **NONE** | `/mode dev\|review\|tdd\|research\|plan\|debug\|architect` — changes system prompt only, no data stored |

### Model Routing — LOCAL

| Feature | Data Scope | Description |
|---------|------------|-------------|
| Cost-aware routing | **LOCAL** | `/route` classifies task complexity locally, switches model |
| Model switching | **LOCAL** | `/model`, `/models` — updates `~/.anycode/config.json` |

### Rules Engine — LOCAL

| Feature | Data Scope | Storage Location |
|---------|------------|------------------|
| Built-in rules | **NONE** | Hardcoded for TS, Python, Go, Rust, Java, Kotlin, C++, PHP |
| Custom rules | **LOCAL** | `~/.anycode/rules/<language>.md` |
| Auto-detection | **NONE** | Scans cwd file extensions in-process |

### Project Audit — NONE

| Feature | Data Scope | Description |
|---------|------------|-------------|
| Harness audit | **NONE** | `/audit` checks local project files (git, tests, linter, secrets) — no data leaves your machine |

### Configuration — LOCAL

| Feature | Data Scope | Storage Location |
|---------|------------|------------------|
| API key storage | **LOCAL** | `~/.anycode/config.json` (plaintext — protect this file) |
| Provider config | **LOCAL** | `~/.anycode/config.json` |
| Permission mode | **LOCAL** | `~/.anycode/config.json` |

---

## Privacy

**AnyCode has zero telemetry, zero analytics, and zero phone-home.**

- No data is sent to AnyCode developers or any third party
- No tracking headers, no analytics SDKs, no crash reporting
- The only external network calls are to **your chosen AI provider** (OpenRouter, OpenAI, etc.) when you send a message
- The `web_fetch` tool only fetches URLs **you explicitly ask for**
- All local data lives in `~/.anycode/` — delete that folder to remove everything

### What goes where

```
~/.anycode/
  config.json          — API key, provider, model, permissions
  usage.json           — token counts, cost estimates (local only)
  hooks.json           — hook definitions
  sessions/            — saved conversations
  instincts/           — learned patterns
  rules/               — custom coding rules
  hooks/               — user hook scripts
```

**Your API key** is stored in plaintext in `config.json`. Keep `~/.anycode/` private.

---

## Supported Providers

| Provider | Base URL | Default Model |
|----------|----------|---------------|
| OpenRouter | `openrouter.ai/api/v1` | claude-sonnet-4 |
| GLM (ZhipuAI) | `open.bigmodel.cn/api/paas/v4` | glm-4-plus |
| Ollama | `localhost:11434/v1` | qwen2.5-coder |
| LM Studio | `localhost:1234/v1` | loaded-model |
| OpenAI | `api.openai.com/v1` | gpt-4o |
| DeepSeek | `api.deepseek.com/v1` | deepseek-chat |
| Custom | you provide | you provide |

---

## Slash Commands

```
General             Model & Provider        Modes
/help               /model [name]           /mode [name]
/config             /models                 /modes
/clear              /provider
/history            /route
/exit

Session             Git                     Code Quality
/sessions           /commit                 /review [target]
/save [name]        /pr                     /tdd <desc>
/resume <id>        /diff                   /security-review
/delete <id>        /log                    /audit

Tools & Config      Learning & Cost
/tools              /usage
/rules              /budget <d> <m>
/perm <mode>        /learn
/cd <path>          /instincts
/hooks              /prune
```

---

## Install

```bash
cd "C:\Users\rsfit\OneDrive\Desktop\Crowcoder"
npm install
npx tsc
npm install -g .
```

Then open any terminal and type `anycode`.

## Rebuild after edits

```bash
cd "C:\Users\rsfit\OneDrive\Desktop\Crowcoder" && npx tsc && npm install -g .
```

---

## License

MIT
