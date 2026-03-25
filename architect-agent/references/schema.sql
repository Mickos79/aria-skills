-- ARIA Architect Agent — PostgreSQL Schema
-- Run in your 'aria' database, 'rag' schema must exist

CREATE TABLE IF NOT EXISTS rag.items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL CHECK (type IN ('note','idea','task','project','meeting','research')),
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','research','in_progress','blocked','done','archived')),
  title       TEXT NOT NULL,
  body        TEXT,
  tags        TEXT[],
  parent_id   UUID REFERENCES rag.items(id) ON DELETE SET NULL,
  project_id  UUID REFERENCES rag.items(id) ON DELETE SET NULL,
  due_at      TIMESTAMPTZ,
  folder_path TEXT,
  meta        JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rag.item_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id     UUID NOT NULL REFERENCES rag.items(id) ON DELETE CASCADE,
  to_id       UUID NOT NULL REFERENCES rag.items(id) ON DELETE CASCADE,
  relation    TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_id, to_id, relation)
);

CREATE INDEX IF NOT EXISTS items_type_idx    ON rag.items(type);
CREATE INDEX IF NOT EXISTS items_status_idx  ON rag.items(status);
CREATE INDEX IF NOT EXISTS items_project_idx ON rag.items(project_id);
CREATE INDEX IF NOT EXISTS items_tags_idx    ON rag.items USING gin(tags);
