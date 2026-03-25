# ARIA Skills

> Production AI agent skills extracted from a real personal AI OS.
> Built on [OpenClaw](https://github.com/openclaw/openclaw) + Anthropic Claude + PostgreSQL.

**Stack:** Hetzner VPS · Claude Sonnet/Haiku · PostgreSQL + pgvector · n8n · Telegram

---

## Skills

### 🏗️ architect-agent
**Gemini 2.5 Pro · PostgreSQL**

Classifies any user input (idea, note, task, project, meeting, research) and automatically creates the right infrastructure. Projects get full folder structure: CONTEXT.md, TASKS.md, DECISIONS.md, RESEARCH.md, MEMORY.md, backups. Lifecycle: `note → idea → research → project`.

[→ View skill](./architect-agent/SKILL.md)

---

### 🧠 memory-skill
**RAG · pgvector · Layered memory**

Teaches your AI to use RAG memory correctly — semantic search, recall by date, honest responses when memory is missing. Hot (7d) → daily summaries → monthly summaries.

[→ View skill](./memory-skill/SKILL.md)

---

### 🛡️ sentinel-skill
**Safety · Command protection**

Blocks destructive shell commands (rm -rf, git reset --hard, DROP TABLE etc.) until user explicitly confirms. 60s timeout. Works as OpenClaw plugin hook.

[→ View skill](./sentinel-skill/SKILL.md)

---

### 📦 retention-skill
**PostgreSQL · Cron**

Layered memory archival: hot messages (7d) → daily summaries → monthly summaries. Never loses data, never bloats DB. Runs nightly via cron.

[→ View skill](./retention-skill/SKILL.md)

---

### 💰 cost-tracker-skill
**OpenRouter · Telegram alerts**

Hourly spend monitoring. Fetches OpenRouter usage, logs to PostgreSQL, sends Telegram alert when daily threshold exceeded ($20 default).

[→ View skill](./cost-tracker-skill/SKILL.md)

---

### 🔬 research-skill
**Perplexity sonar-pro · Claude fallback**

Multi-source research agent. Tries Perplexity sonar-pro first, falls back to Claude with web context. Returns structured findings with sources.

[→ View skill](./research-skill/SKILL.md)

---

### 💬 informal-chat
**Style modifier · Russian folk expressions**

Switches assistant tone from formal to casual/bro/human mode. Includes a curated collection of Russian folk expressions for natural-sounding informal replies. Auto-resets on task requests.

[→ View skill](./informal-chat/SKILL.md)

---

### 🔄 git-workflow-skill
**Git · Branch protection**

Enforces safe git workflow: feature branches, no force pushes, protected files, commit conventions. Designed for AI coding agents (Cursor, Claude Code).

[→ View skill](./git-workflow-skill/SKILL.md)

---

## Architecture

These skills are designed for the ARIA stack but work with any OpenClaw setup:

```
User message
    ↓
OpenClaw gateway (Telegram / Web / Mobile)
    ↓
Plugins: aria-memory · aria-sentinel
    ↓
aria-core API (Node.js)
    ↓
Skills: architect · research · cost-tracker · retention
    ↓
PostgreSQL (pgvector) + OpenRouter API
```

## Install

Each skill is a folder with a `SKILL.md` describing integration.
Copy the relevant `.js` files to your `aria-core/` and follow the SKILL.md instructions.

```bash
# Install via clawhub (coming soon)
npx clawhub@latest install aria/architect-agent
```

## About ARIA

ARIA is a personal AI OS built by [Mikhail Kostenko](https://github.com/Mickos79).
These skills are extracted from production and open-sourced for the community.

- Private repo (full system): [Mickos79/aria](https://github.com/Mickos79/aria)
- Skills (public): [Mickos79/aria-skills](https://github.com/Mickos79/aria-skills)
- Platform: [OpenClaw](https://github.com/openclaw/openclaw)
- Skills hub: [clawhub.ai](https://clawhub.ai)

---

*Built in production. Used daily. PRs welcome.*
