'use strict';
const https = require('https');
const fs = require('fs');

const TEMPLATE_PATH = process.env.RESEARCH_TEMPLATE_PATH || './research-agent-prompt.md';
const PERPLEXITY_HOST = 'api.perplexity.ai';
const PERPLEXITY_PATH = '/chat/completions';
const PERPLEXITY_MODEL = 'sonar-pro';
const CLAUDE_MODEL = 'claude-sonnet-4-6';
const PERPLEXITY_TIMEOUT_MS = 45000;
const CLAUDE_TIMEOUT_MS = 120000;

function stripFrontmatter(md) {
  return md.replace(/^---[\s\S]*?---\n/, '').trim();
}

function loadPrompt(vars) {
  let t = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  t = stripFrontmatter(t);
  return t
    .replace(/\{\{query\}\}/g, vars.query || '')
    .replace(/\{\{intent\}\}/g, vars.intent || 'search')
    .replace(/\{\{project\}\}/g, vars.project || 'none');
}

function httpsJson(hostname, path, method, headers, body, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname, path, method, headers },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, body: d ? JSON.parse(d) : {} });
          } catch (e) {
            resolve({ statusCode: res.statusCode, body: null, raw: d });
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error('request timeout'));
    });
    if (body) req.write(body);
    req.end();
  });
}

async function callPerplexity(fullPrompt) {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key || !String(key).trim()) {
    throw new Error('PERPLEXITY_API_KEY missing');
  }
  const payload = JSON.stringify({
    model: PERPLEXITY_MODEL,
    messages: [{ role: 'user', content: fullPrompt }]
  });
  const { statusCode, body, raw } = await httpsJson(
    PERPLEXITY_HOST,
    PERPLEXITY_PATH,
    'POST',
    {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    },
    payload,
    PERPLEXITY_TIMEOUT_MS
  );
  if (statusCode < 200 || statusCode >= 300) {
    const errMsg = body && body.error ? JSON.stringify(body.error) : raw || statusCode;
    throw new Error(`perplexity http ${statusCode}: ${errMsg}`);
  }
  const text =
    body &&
    body.choices &&
    body.choices[0] &&
    body.choices[0].message &&
    body.choices[0].message.content;
  if (!text || !String(text).trim()) {
    throw new Error('perplexity empty response');
  }
  return String(text).trim();
}

async function callClaude(fullPrompt) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || !String(key).trim()) {
    throw new Error('ANTHROPIC_API_KEY missing');
  }
  const payload = JSON.stringify({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: fullPrompt }]
  });
  const { statusCode, body } = await httpsJson(
    'api.anthropic.com',
    '/v1/messages',
    'POST',
    {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(payload)
    },
    payload,
    CLAUDE_TIMEOUT_MS
  );
  if (statusCode < 200 || statusCode >= 300) {
    const err = body && body.error ? body.error.message : statusCode;
    throw new Error(`claude http ${statusCode}: ${err}`);
  }
  const text = body && body.content && body.content[0] && body.content[0].text;
  if (!text || !String(text).trim()) {
    throw new Error('claude empty response');
  }
  return String(text).trim();
}

/**
 * @param {{ message?: string, intent?: string, project?: string|null, query?: string }} opts
 * @returns {Promise<{ text: string, provider: 'perplexity'|'claude', fallback: boolean }>}
 */
async function runResearch(opts) {
  const userQuery = (opts.query || opts.message || '').trim();
  if (!userQuery) {
    throw new Error('message required');
  }
  const intent = ['search', 'analysis'].includes((opts.intent || '').toLowerCase())
    ? opts.intent.toLowerCase()
    : 'search';
  const project = opts.project || 'none';

  const fullPrompt = loadPrompt({
    query: userQuery,
    intent,
    project
  });

  try {
    const text = await callPerplexity(fullPrompt);
    return { text, provider: 'perplexity', fallback: false };
  } catch (e) {
    console.error('[research-agent] perplexity failed:', e.message);
  }

  try {
    const text = await callClaude(fullPrompt);
    return { text, provider: 'claude', fallback: true };
  } catch (e) {
    console.error('[research-agent] claude failed:', e.message);
    throw e;
  }
}

module.exports = { runResearch, loadPrompt };
