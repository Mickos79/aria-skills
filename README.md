# ARIA Skills

Open-source AI assistant skills built from production experience with [OpenClaw](https://github.com/openclaw/openclaw).

These skills were extracted from a real personal AI OS (ARIA) running on Hetzner + Claude + PostgreSQL.

## Skills

### 🧠 memory-skill
Teaches your AI to use RAG memory correctly — recall by date, query expansion, honest responses when memory is missing.

### 🛡️ sentinel-skill
Safe command confirmation — blocks destructive operations until user explicitly confirms. Timeout after 60s.

### 📦 retention-skill
Layered memory archival: hot (7d) → daily summaries → monthly summaries. Never loses data, never bloats.

### 💰 cost-tracker-skill
Hourly OpenRouter spend monitoring with Telegram alerts when daily threshold exceeded.

### 🔍 research-skill
Perplexity-first web search with Claude synthesis fallback. Includes fast-path trigger patterns.

### 🌿 git-workflow-skill
Safe git branching for multi-agent repos. Cursor writes to `cursor` branch, orchestrator merges to `main`.

## Usage

Each skill is a single `SKILL.md` file. Drop it into your agent's context or OpenClaw skills directory.

## Philosophy

Skills should be:
- **Generic** — no secrets, no hardcoded IDs
- **Single-file** — one `SKILL.md` per skill
- **Actionable** — concrete rules, not vague advice

## License
MIT

## Related
- [OpenClaw](https://github.com/openclaw/openclaw) — the runtime these skills were built for
