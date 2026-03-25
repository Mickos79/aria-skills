# Retention Skill — Layered Memory Archival

Automatically archives conversation history to prevent unbounded growth while preserving all knowledge.

## Memory layers
```
Hot     → rag.messages          → last 7 days, exact messages
Warm    → rag.daily_summaries   → day-level summaries (7-30 days)
Cold    → rag.monthly_summaries → month-level summaries (30+ days)
Archive → never deleted
```

## Archival rules
1. Messages older than **7 days** → create daily_summary → delete messages
2. Daily summaries older than **30 days** → create monthly_summary → delete daily
3. Monthly summaries → **never delete**

## When to run
Daily cron at 02:00 UTC:
```bash
0 2 * * * node /path/to/retention.js
```

## Key principle
**Never lose information** — always summarize before deleting.
Each layer trades granularity for longevity.

## SQL schema (PostgreSQL + pgvector)
```sql
-- Hot layer
CREATE TABLE rag.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  channel text,
  role text NOT NULL,  -- 'user' | 'assistant'
  content text NOT NULL,
  embedding vector(1536),
  created_at timestamptz DEFAULT now()
);

-- Warm layer
CREATE TABLE rag.daily_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  summary_date date NOT NULL,
  content text NOT NULL,
  embedding vector(1536),
  UNIQUE(user_id, summary_date)
);

-- Cold layer
CREATE TABLE rag.monthly_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  summary_date date NOT NULL,
  content text NOT NULL,
  embedding vector(1536)
);
```
