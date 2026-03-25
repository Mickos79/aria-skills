'use strict';

/**
 * ARIA Architect Agent
 * 
 * Called by the main model when it detects a complex/structured request.
 * Uses Gemini Flash to classify, plan structure, and create infrastructure.
 * 
 * Lifecycle: note → idea → research → project
 * For projects: creates folders, CONTEXT.md, TASKS.md, DECISIONS.md, backups config
 */

const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DB_URL   = process.env.DATABASE_URL;
const OR_KEY   = process.env.OPENROUTER_API_KEY;
const PROJECTS = '/root/aria-data/projects';
const BACKUPS  = '/root/aria-data/backups';

const pool = new Pool({ connectionString: DB_URL });

async function query(sql, params) {
  const c = await pool.connect();
  try { return (await c.query(sql, params)).rows; }
  finally { c.release(); }
}

// ─── Gemini Flash via OpenRouter ─────────────────────────────────────────────
async function gemini(prompt, systemPrompt) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OR_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: prompt }
      ],
      max_tokens: 1024,
      temperature: 0.2
    })
  });
  const d = await res.json();
  return d.choices?.[0]?.message?.content || '';
}

// ─── Classify input ────────────────────────────────────────────────────────
const CLASSIFY_PROMPT = `You are a classifier for a personal AI OS. 
Given a user message, determine:
1. type: one of [note, idea, task, project, meeting, research]
2. promote: should an existing idea/note be promoted? (true/false)
3. needs_infra: does this need folder/file infrastructure? (true/false — only true for project/research with code)
4. title: short title (5 words max)
5. tags: array of relevant tags (max 5)
6. project_type: if project, one of [code, business, research, personal, other]
7. urgency: low/medium/high

Rules:
- note: quick thought, no action needed
- idea: has potential, may grow
- task: concrete action, possibly with deadline
- meeting: scheduled interaction
- research: investigation needed
- project: complex, multi-step, code or business

Respond ONLY with valid JSON. No markdown, no explanation.
Example: {"type":"idea","promote":false,"needs_infra":false,"title":"Mobile app for reminders","tags":["mobile","product"],"project_type":null,"urgency":"low"}`;

async function classify(text) {
  const raw = await gemini(text, CLASSIFY_PROMPT);
  try {
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch(e) {
    return { type: 'note', promote: false, needs_infra: false, title: text.slice(0, 50), tags: [], project_type: null, urgency: 'low' };
  }
}

// ─── Create project infrastructure ────────────────────────────────────────
async function createProjectInfra(item, classification) {
  const slug = item.title
    .toLowerCase()
    .replace(/[^a-z0-9а-яё\s]/gi, '')
    .replace(/\s+/g, '-')
    .slice(0, 40);

  const projDir = path.join(PROJECTS, slug);
  const backupDir = path.join(BACKUPS, slug);

  // Create dirs
  fs.mkdirSync(projDir, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });

  const isCode = classification.project_type === 'code';
  const now = new Date().toISOString().slice(0, 10);

  // CONTEXT.md
  fs.writeFileSync(path.join(projDir, 'CONTEXT.md'), `# ${item.title}

## Описание
${item.body || '(добавить описание)'}

## Цели
- [ ] (добавить)

## Архитектура
(описать когда станет понятно)

## Стек / Технологии
${isCode ? '- (добавить)' : 'n/a'}

## Статус
- Создан: ${now}
- Тип: ${classification.project_type || 'general'}
- Теги: ${(item.tags || []).join(', ') || '—'}

## Ссылки
- Папка: ${projDir}
`);

  // TASKS.md
  fs.writeFileSync(path.join(projDir, 'TASKS.md'), `# Tasks — ${item.title}

## Active
- [ ] (первая задача)

## Done
(пусто)

## Backlog
(пусто)
`);

  // DECISIONS.md
  fs.writeFileSync(path.join(projDir, 'DECISIONS.md'), `# Decisions — ${item.title}

## ${now}
- Проект создан через Architect Agent
- Тип: ${classification.project_type || 'general'}
`);

  // RESEARCH.md (always)
  fs.writeFileSync(path.join(projDir, 'RESEARCH.md'), `# Research — ${item.title}

(добавить по мере исследования)
`);

  // MEMORY.md (for archivist)
  fs.writeFileSync(path.join(projDir, 'MEMORY.md'), `# Memory — ${item.title}

(заполняется автоматически через archivist)
`);

  if (isCode) {
    // logs dir
    fs.mkdirSync(path.join(projDir, 'logs'), { recursive: true });
    // .gitignore
    fs.writeFileSync(path.join(projDir, '.gitignore'), `node_modules/
.env
*.log
backups/
`);
    // README.md
    fs.writeFileSync(path.join(projDir, 'README.md'), `# ${item.title}

${item.body || ''}

## Setup
(добавить)

## Run
(добавить)
`);
  }

  // Update DB with folder_path
  await query(
    `UPDATE rag.items SET folder_path = $1, meta = meta || $2 WHERE id = $3`,
    [projDir, JSON.stringify({ backup_dir: backupDir, infra_created: now }), item.id]
  );

  return { slug, projDir, backupDir, files: fs.readdirSync(projDir) };
}

// ─── Save item to DB ────────────────────────────────────────────────────────
async function saveItem(classification, text, userId) {
  const rows = await query(
    `INSERT INTO rag.items (type, status, title, body, tags, meta)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      classification.type,
      classification.type === 'project' ? 'active' : 'draft',
      classification.title,
      text,
      classification.tags || [],
      JSON.stringify({ user_id: userId, urgency: classification.urgency, project_type: classification.project_type })
    ]
  );
  return rows[0];
}

// ─── Find related existing items ────────────────────────────────────────────
async function findRelated(title, tags) {
  const tagFilter = tags && tags.length > 0 ? tags : [''];
  return await query(
    `SELECT id, type, status, title, tags FROM rag.items
     WHERE status NOT IN ('done','archived')
       AND (title ILIKE $1 OR tags && $2)
     ORDER BY created_at DESC LIMIT 5`,
    [`%${title.split(' ')[0]}%`, tagFilter]
  );
}

// ─── Main handler ────────────────────────────────────────────────────────────
async function processInput(text, userId = '734811201') {
  const c = await classify(text);
  console.log('[architect] classified:', JSON.stringify(c));

  // Check for related items
  const related = await findRelated(c.title, c.tags);

  // Save to DB
  const item = await saveItem(c, text, userId);
  console.log('[architect] saved item:', item.id, item.type, item.title);

  let infra = null;
  if ((c.type === 'project' || c.type === 'research') && c.needs_infra) {
    infra = await createProjectInfra(item, c);
    console.log('[architect] created infra:', infra.projDir, infra.files);
  }

  return {
    item,
    classification: c,
    related,
    infra,
    summary: buildSummary(c, item, related, infra)
  };
}

function buildSummary(c, item, related, infra) {
  const typeEmoji = { note:'📝', idea:'💡', task:'✅', project:'🚀', meeting:'📅', research:'🔬' };
  let s = `${typeEmoji[c.type] || '📌'} **${c.type.toUpperCase()}** записан: _${item.title}_`;
  if (c.tags?.length) s += `\nТеги: ${c.tags.map(t => `#${t}`).join(' ')}`;
  if (c.urgency === 'high') s += `\n⚡ Высокий приоритет`;
  if (related.length > 0) {
    s += `\n\nСвязанные объекты:`;
    related.forEach(r => { s += `\n• [${r.type}] ${r.title} (${r.status})`; });
  }
  if (infra) {
    s += `\n\n📁 Инфраструктура создана: \`${infra.projDir}\``;
    s += `\nФайлы: ${infra.files.join(', ')}`;
    s += `\n💾 Бэкап: \`${infra.backupDir}\``;
  }
  return s;
}

module.exports = { processInput, classify, createProjectInfra };
