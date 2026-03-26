# Token Efficiency Skill

Optimize your LLM system prompt from 12K tokens → 4K tokens (-70%) without losing quality.

## What it does
- Audits your current prompt size
- Implements 3-tier memory (hot/warm/cold)
- Sets up local embeddings via Ollama (free)
- Adds intent classifier to load only relevant context
- Configures project tags for RAG isolation

## Results from production (ARIA)
- System prompt: 49KB → 15KB (-70%)
- RAG similarity: 0.000 (broken) → 0.45-0.56 (fixed)
- Embedding cost: $0.002/day → $0 (Ollama)

## Requirements
- Node.js / Python
- PostgreSQL + pgvector
- Ollama (optional, for free embeddings)

## Part of ARIA AI OS
https://github.com/Mickos79/aria
