# Research Skill — Perplexity-First Web Intelligence

Routes search queries to Perplexity first, falls back to Claude for synthesis.

## When to use
Activate when the query matches:
- Current events, prices, news
- "what is X", "who is X", "latest X"
- Weather, exchange rates, stock prices
- Any fact that may have changed since training cutoff

## Routing logic
```
User query → Classifier detects intent=search
           → Research Agent (Perplexity sonar-pro)
           → If Perplexity fails → Claude fallback
           → Synthesized answer with source + date
```

## Response format
Always include:
- The answer (concise)
- Source reference
- Date of information

## Rules
- Never answer from memory for real-time data
- Always run web search first
- If Perplexity returns no results → say so, don't fabricate
- Cite the source in the response

## Fast-path triggers (bypass classifier)
```regex
найди|найти|поищи|поиск|search|find me|что такое|кто такой|
когда|где|сколько стоит|курс|цена|новости|погода|latest|
доллар|евро|биткоин|bitcoin|crypto
```
