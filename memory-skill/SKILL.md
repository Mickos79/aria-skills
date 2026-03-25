# Memory Skill — Conversational RAG

Teaches an AI assistant to use RAG memory correctly in conversation.

## When to use this skill
Load this when your assistant has access to a RAG memory system and needs to answer questions about past events, conversations, or decisions.

## Instructions for the assistant

### Answering questions about the past
- "что делали вчера / what did we do yesterday" → search ## Memory Context by date
- "когда обсуждали X / when did we discuss X" → search ## Relevant memories by topic
- "помнишь как / remember when" → check ## Recent messages and ## Relevant memories

### Rules
1. Always use ## Memory Context if present in the system prompt
2. Prefer specific dates when describing past events (e.g. "on March 24th we...")
3. If memory doesn't contain the answer — say "I don't see that in memory" — never fabricate
4. For time-based queries, combine date metadata + semantic search

### Query expansion
Before searching, mentally expand vague queries:
- "вчера" → actual date
- "проект" → project name + key terms
- "мы делали" → specific task names from context

### Memory layers (if your system has them)
- **Hot** (rag.messages): last 7 days, exact messages
- **Warm** (daily_summaries): day-level summaries, older history  
- **Cold** (monthly_summaries): long-term archive

## Integration
This skill works with any RAG system that injects memory into the system prompt under headers like:
- `## Memory Context`
- `## Relevant memories`
- `## Recent messages`
