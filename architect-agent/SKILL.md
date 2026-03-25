# architect-agent

**Version:** 1.0.0  
**Author:** ARIA / Mikhail Kostenko  
**Model:** Gemini Flash (via OpenRouter)  
**Requires:** PostgreSQL (rag schema), OpenRouter API key

## What it does

Classifies any user input (idea, note, task, project, meeting, research) and:
- Saves it to PostgreSQL `rag.items` with tags, status, lifecycle tracking
- For projects/research: creates full folder infrastructure automatically
- Links related existing items
- Returns a human-readable summary

## Lifecycle

```
note → idea → research → project
```

Objects promote automatically based on signals (research started, code work begun, multi-step complexity detected).

## Project infrastructure (auto-created for `project` type)

```
/aria-data/projects/{slug}/
  CONTEXT.md      — what it is, goals, architecture
  TASKS.md        — active/done/backlog tasks
  DECISIONS.md    — why we decided X (never lose reasoning)
  RESEARCH.md     — findings
  MEMORY.md       — auto-filled by archivist
  logs/           — (code projects only)
  .gitignore      — (code projects only)
  README.md       — (code projects only)

/aria-data/backups/{slug}/
  (backup target for project files)
```

## Database schema

```sql
rag.items (
  id UUID, type TEXT, status TEXT, title TEXT, body TEXT,
  tags TEXT[], parent_id UUID, project_id UUID,
  due_at TIMESTAMPTZ, folder_path TEXT, meta JSONB,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
)

rag.item_links (
  from_id UUID, to_id UUID, relation TEXT
)
```

## API endpoint

```
POST /architect
Body: { "text": "user input", "user_id": "optional" }

Response: {
  "ok": true,
  "item": { ...db row },
  "classification": { type, title, tags, urgency, project_type, needs_infra },
  "related": [ ...existing related items ],
  "infra": { slug, projDir, backupDir, files } | null,
  "summary": "human-readable result"
}
```

## Classification types

| Type | Trigger signals | Infrastructure |
|---|---|---|
| note | quick thought, no action | none |
| idea | potential, may grow | none (until promoted) |
| task | concrete action, deadline | none |
| meeting | scheduled interaction | none |
| research | investigation needed | folder if complex |
| project | multi-step, code or business | full folder structure |

## Integration

Called by the main model when it detects structured/complex input.
Not called directly by the user — triggered automatically.

```js
const { processInput } = require('./architect-agent');
const result = await processInput(userText, userId);
// result.summary → show to user
```

## Files

- `architect-agent.js` — main agent logic
- `references/schema.sql` — PostgreSQL schema
- `scripts/install.sh` — setup script

## Install

```bash
npx clawhub@latest install aria/architect-agent
```

Then add to your aria-core index.js:
```js
if (url === '/architect') {
  const { processInput } = require('./architect-agent');
  const result = await processInput(body.text, body.user_id);
  respond(res, 200, { ok: true, ...result });
  return;
}
```
