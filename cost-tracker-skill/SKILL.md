# Cost Tracker Skill — API Spend Monitoring

Monitors OpenRouter API usage and sends alerts when daily spend exceeds threshold.

## How it works
1. Hourly cron calls OpenRouter `/auth/key` endpoint
2. Compares current usage vs last logged value
3. If delta > daily limit → sends Telegram alert

## Setup
```bash
# Add to crontab (runs every hour)
0 * * * * node /path/to/cost-tracker.js
```

## Configuration
```js
const DAILY_LIMIT = 20;  // USD — alert threshold
const CHAT_ID = 'YOUR_TELEGRAM_USER_ID';
```

## Alert format
```
⚠️ ARIA Cost Alert
Расход за сегодня: $23.40
Лимит: $20/день
Итого: $234.50
```

## Endpoints used
- `GET https://openrouter.ai/api/v1/auth/key` — returns `usage` field (cumulative USD)

## Log format
```
2026-03-25T09:00:00Z used: 197.71 today_delta: 4.23
```

## Why cumulative, not daily
OpenRouter only exposes total usage. Daily delta = current - previous reading.
First run logs baseline; subsequent runs calculate delta.
