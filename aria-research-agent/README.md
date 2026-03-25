# aria-research-agent

**Perplexity-first research agent with Claude fallback for OpenClaw.**

Give it a query — it searches the web via Perplexity Sonar Pro, returns structured results with sources. If Perplexity is unavailable, automatically falls back to Claude.

---

## What it does

- Takes a natural language query + intent (`search` or `analysis`)
- Calls **Perplexity Sonar Pro** first (real-time web search + citations)
- Falls back to **Claude** if Perplexity fails or is unavailable
- Returns: answer text + provider used + fallback flag
- Prompt loaded from a `.md` template file (no hardcoded prompts)

## Usage

```js
const { runResearch } = require('./research-agent');

const result = await runResearch({
  query: "latest LLM benchmarks 2025",
  intent: "search",   // or "analysis"
  project: "aria"     // optional context
});

console.log(result.text);      // answer
console.log(result.provider);  // "perplexity" or "claude"
console.log(result.fallback);  // true if fell back to Claude
```

## Setup

1. Copy `src/research-agent.js` to your project
2. Set environment variables:
```bash
PERPLEXITY_API_KEY=pplx-...
ANTHROPIC_API_KEY=sk-ant-...
```
3. Create a prompt template at the path defined in `TEMPLATE_PATH`:
```
/your/path/research-agent-v1.0.md
```

Template variables: `{{query}}`, `{{intent}}`, `{{project}}`

## Prompt template example

```markdown
You are a research assistant. Answer the following query with sources.

Query: {{query}}
Intent: {{intent}}
Project context: {{project}}

Be concise, cite sources, return structured markdown.
```

## OpenClaw integration

Wire it into your aria-core HTTP server as a `/research` endpoint:

```js
app.post('/research', async (req, res) => {
  const { query, intent, project } = req.body;
  const result = await runResearch({ query, intent, project });
  res.json({ ok: true, ...result });
});
```

Then use it from any OpenClaw agent via `fetch`.

## Models

| Provider | Model | Used for |
|---|---|---|
| Perplexity | `sonar-pro` | Primary (web search + citations) |
| Anthropic | `claude-sonnet-4-6` | Fallback (no web access) |

## License

MIT
