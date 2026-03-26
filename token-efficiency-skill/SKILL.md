# token-efficiency Skill

## Description
Audit, diagnose, and optimize token usage in LLM systems. Use when: analyzing prompt bloat, fixing RAG similarity bugs, implementing tiered memory architecture, configuring prompt caching, or reducing embedding costs. Covers system prompts, RAG pipelines, chunking strategies, and memory management.

## Triggers
- "промпт слишком большой", "токены дорого", "context window заполняется"
- "RAG similarity = 0", "embeddings дорого", "оптимизировать контекст"
- "prompt caching", "system prompt bloat", "token cost reduction"
- "memory architecture", "hot/warm/cold memory"

---

## Workflow

### Step 1: Audit (диагностика)

Перед оптимизацией — измерь что есть:

```bash
# Размер системного промпта (примерная оценка токенов: символы / 4)
wc -c system_prompt.md
# Если > 4000 символов (~1K токенов) — уже стоит оптимизировать
# Если > 16000 символов (~4K токенов) — критично

# Проверить RAG similarity (должен быть 0.3-0.8, не 0.000)
# Если все значения = 0 — баг distance→similarity
```

**Ключевые вопросы:**
1. Какой размер системного промпта? (KB, токены)
2. RAG similarity scores — в каком диапазоне?
3. Используются ли локальные embeddings?
4. Есть ли разделение памяти на уровни?
5. Включён ли prompt caching у провайдера?

---

### Step 2: RAG Similarity Bug Fix

**Симптом**: RAG работает, чанки находятся, но similarity = 0.000 или NaN.

**Причина**: pgvector (и другие vector DBs) возвращает `distance`, а не `similarity`.

**Формула**: `similarity = 1 - distance` (для cosine distance, диапазон [0, 2])

```javascript
// ❌ Неправильно — distance передаётся как similarity
const messages = await db.query('SELECT * FROM memories ORDER BY embedding <=> $1', [vec]);
respond(res, 200, { messages }); // similarity undefined/0

// ✅ Правильно — конвертируем distance в similarity
const result = await db.query(
  'SELECT *, embedding <=> $1 as distance FROM memories ORDER BY distance ASC LIMIT 3',
  [queryEmbedding]
);
const messages = result.rows.map(m => ({
  ...m,
  similarity: m.distance != null ? Math.max(0, 1 - m.distance) : 0
}));
respond(res, 200, { messages }); // similarity = 0.45-0.56
```

```python
# Python / SQLAlchemy вариант
rows = db.execute(
    "SELECT *, embedding <=> :vec AS distance FROM memories ORDER BY distance LIMIT 3",
    {"vec": query_embedding}
).fetchall()

messages = [
    {**dict(row), "similarity": max(0, 1 - row["distance"])}
    for row in rows
]
```

**Threshold**: фильтровать чанки с similarity < 0.3 (обычно нерелевантны).

---

### Step 3: Tiered Memory Architecture

Внедри трёхуровневую память вместо монолитного промпта:

```
❄️ COLD (archive/) ──── только RAG, не в промпт
🌡️ WARM (daily_summary) ── сжатый контекст, ~800 символов
🔥 HOT (rag-context.md) ── топ-3 семантических чанка
```

**Холодная память** — всё историческое. Архив разговоров, файлы, документация. Попадает в промпт ТОЛЬКО если RAG-запрос возвращает similarity > 0.3.

**Тёплая память** — сжатое резюме текущего дня/сессии. Генерируется локальной моделью (qwen3:8b или аналог):

```javascript
// Генерация daily summary
async function generateWarmMemory(messages) {
  const summary = await ollama.chat({
    model: 'qwen3:8b',  // или другая локальная модель
    messages: [{
      role: 'user',
      content: `Compress to 800 chars, keep key facts:\n${messages.join('\n')}`
    }]
  });
  await fs.writeFile('warm/daily_summary.md', summary.message.content);
}
```

**Горячая память** — топ-3 чанка из RAG по текущему запросу. Обновляется каждый запрос.

**Итоговый системный промпт:**
```
[STATIC_CORE]     — личность, правила, режимы (~2KB)
[WARM_SUMMARY]    — daily summary (~800 символов)  
[HOT_RAG]         — топ-3 релевантных чанка (~1.5KB)
```
Итого: ~4KB vs прежних 49KB.

---

### Step 4: Namespace Tagging для RAG

Без тегов RAG вытаскивает чанки из всех проектов. Решение — short-code теги:

```sql
-- Создать реестр тегов
CREATE TABLE rag.tag_registry (
  code        VARCHAR(4) PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT
);

-- Добавить теги для проектов
INSERT INTO rag.tag_registry VALUES
  ('a1', 'aria',   'ARIA project context'),
  ('z1', 'zakat',  'Zakat fintech project'),
  ('s1', 'system', 'System knowledge'),
  ('m1', 'memory', 'Long-term memory');

-- Поле tags в таблице memories
ALTER TABLE rag.memories ADD COLUMN tags TEXT[] DEFAULT '{}';

-- Индекс для быстрой фильтрации
CREATE INDEX idx_memories_tags ON rag.memories USING GIN(tags);

-- Пример запроса: только ARIA контекст
SELECT content, embedding <=> $1 as distance
FROM rag.memories
WHERE tags @> ARRAY['a1']
ORDER BY distance ASC LIMIT 3;
```

```javascript
// При сохранении чанка — указать теги
await db.query(
  'INSERT INTO rag.memories (content, embedding, tags) VALUES ($1, $2, $3)',
  [content, embedding, ['a1', 'm1']]  // aria + memory namespace
);
```

---

### Step 5: Local Embeddings (Ollama)

Заменить OpenAI embeddings на локальные:

```bash
# Установить модель
ollama pull nomic-embed-text
# Также хорошие варианты: mxbai-embed-large, all-minilm
```

```javascript
// Node.js
const { Ollama } = require('ollama');
const ollama = new Ollama({ host: 'http://localhost:11434' });

async function embed(text) {
  const response = await ollama.embeddings({
    model: 'nomic-embed-text',
    prompt: text
  });
  return response.embedding; // Float64Array, 768 dims
}
```

```python
# Python
import ollama

def embed(text: str) -> list[float]:
    response = ollama.embeddings(model='nomic-embed-text', prompt=text)
    return response['embedding']
```

**Сравнение**:
| | OpenAI ada-002 | nomic-embed-text |
|--|--|--|
| Стоимость | $0.10/1M токенов | **$0** |
| Latency | 200-800ms | **15-50ms** |
| MTEB | 93.1% | **95.2%** |
| Privacy | Данные в облако | **Локально** |

---

### Step 6: Intent Routing (быстрый классификатор)

Вместо жирного промпта для всех случаев — роутинг к нужной секции:

```javascript
// Tier 1: Regex (0ms) — покрывает ~90% запросов
const PATTERNS = {
  programmer: /код|скрипт|баг|дебаг|python|javascript|sql|api|функци|реализ|архитектур кода/i,
  analyst:    /анализ|стратеги|метрик|kpi|финанс|рынок|сравни|план|roadmap/i,
  search:     /что сейчас|погода|курс|новост|последн|цена/i,
  reminder:   /напомни|remind|через \d+|в \d+:\d+/i
};

function fastRoute(message) {
  for (const [role, pattern] of Object.entries(PATTERNS)) {
    if (pattern.test(message)) return role;
  }
  return null;
}

// Tier 2: Local LLM fallback (~150ms)
async function llmRoute(message) {
  const result = await ollama.chat({
    model: 'phi3:mini',
    messages: [{ role: 'user', content: `One word: programmer/analyst/search/assistant\n"${message}"` }],
    options: { num_predict: 5, temperature: 0 }
  });
  return result.message.content.trim().toLowerCase();
}

// Главный роутер
async function route(message) {
  return fastRoute(message) ?? await llmRoute(message);
}
```

---

### Step 7: Prompt Caching Configuration

**Anthropic Claude:**
```python
import anthropic

client = anthropic.Anthropic()

# Статичный контент — кэшировать
# Динамичный — НЕ кэшировать
response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    system=[
        {
            "type": "text",
            "text": STATIC_SYSTEM_PROMPT,  # правила, личность
            "cache_control": {"type": "ephemeral"}  # ← кэшируем
        }
        # НЕ добавлять: timestamps, user_id, session data
    ],
    messages=[
        {"role": "user", "content": f"{warm_context}\n\n{user_message}"}
    ]
)

# Мониторинг cache hits
print(f"Cache read: {response.usage.cache_read_input_tokens}")
print(f"Cache write: {response.usage.cache_creation_input_tokens}")
```

**OpenAI (автоматически):**
```python
# Нет code changes, но соблюдать правила:
# 1. Системный промпт > 1024 токенов
# 2. Статичный контент ВСЕГДА первым
# 3. НЕ менять system prompt между запросами
# 4. НЕ добавлять timestamps в system prompt

response = openai.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": STATIC_PROMPT},  # идентичный между запросами
        {"role": "user", "content": user_message}
    ]
)
print(f"Cached: {response.usage.prompt_tokens_details.cached_tokens}")
```

**Ожидаемая экономия**: 45-80% стоимости при правильной реализации.

---

### Step 8: LLMLingua (если нужно сжать few-shot / ICL)

Когда промпт содержит много примеров или chain-of-thought:

```bash
pip install llmlingua
```

```python
from llmlingua import PromptCompressor

compressor = PromptCompressor(
    model_name="microsoft/llmlingua-2-xlm-roberta-large-meetingbank",
    use_llmlingua2=True  # быстрее в 3-6x
)

compressed = compressor.compress_prompt(
    context=[long_few_shot_examples],
    instruction=system_instruction,
    question=user_question,
    rate=0.33,   # 3x сжатие
    force_tokens=['\n', '.', '?']  # сохранить структуру
)

# Использовать compressed['compressed_prompt'] вместо оригинала
# Экономия: ~66% токенов, потеря точности < 2% на reasoning tasks
```

---

## Диагностические вопросы

Если пользователь описывает проблему, уточни:

1. Какой размер системного промпта? (попроси `wc -c` или размер в KB)
2. Что включает системный промпт? (есть ли там история, timestamps, user data?)
3. Какие similarity scores возвращает RAG? (0.000 = баг)
4. Какую модель используют для embeddings? (OpenAI? локальная?)
5. Есть ли prompt caching у провайдера? Включён?
6. Есть ли теги/namespace для RAG chunks?

---

## Ожидаемые результаты

| Оптимизация | Ожидаемый эффект |
|-------------|-----------------|
| Tiered memory | -50-70% размера промпта |
| RAG similarity fix | Precision 0 → 0.45-0.56 |
| Local embeddings | -100% embedding costs |
| Namespace tags | +2x precision в RAG |
| Prompt caching | -45-80% API costs |
| Intent routing | -90% routing latency |
| LLMLingua (x3) | -66% tokens в few-shot |

---

## References

- [LLMLingua](https://llmlingua.com/) — prompt compression, up to 20x
- [Mem0](https://github.com/mem0ai/mem0) — structured memory for agents
- [nomic-embed-text](https://ollama.com/library/nomic-embed-text) — local embeddings
- [Prompt Caching Eval (arxiv 2601.06007)](https://arxiv.org/abs/2601.06007)
- [Chunking Strategies 2025](https://www.firecrawl.dev/blog/best-chunking-strategies-rag-2025)
