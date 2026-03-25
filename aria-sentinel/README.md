# aria-sentinel

**Human-in-the-loop safety gate for OpenClaw exec tool.**

Before any destructive shell command runs, Sentinel pauses and asks for explicit confirmation. Works over Telegram (reply "да" or "yes"), web, or any OpenClaw channel.

---

## What it does

- Intercepts `exec` tool calls via `before_tool_call` hook
- Classifies risk: `rm -rf`, `dd`, `mkfs`, `truncate`, `systemctl stop/restart` on protected services
- Safe commands (`git`, `curl`, `cat`, `ls`, `grep`, etc.) pass through instantly
- Risky commands → blocked + asks user to confirm
- User replies "да" / "yes" / "ok" → command executes
- No confirmation within timeout → denied

## Architecture

```
OpenClaw agent
     │
     ▼ before_tool_call
aria-sentinel (plugin)
     │
     ▼ POST /sentinel/gate
sentinel.js (gate logic — your backend)
     │
     ├── TRUSTED → execute
     ├── RISKY + pending → block, ask user
     └── confirmed → execute
```

## Installation

1. Copy `src/index.js` to `~/.openclaw/extensions/aria-sentinel/index.js`
2. Add to your `openclaw.json`:

```json
{
  "plugins": {
    "allow": ["aria-sentinel"],
    "aria-sentinel": {
      "gateUrl": "http://127.0.0.1:YOUR_PORT/sentinel/gate",
      "approvePeerUrl": "http://127.0.0.1:YOUR_PORT/sentinel/approve-peer"
    }
  }
}
```

3. Implement the gate API (see `gate-api-spec.md`)

## Gate API

### POST `/sentinel/gate`
```json
{
  "cmd": "rm -rf /tmp/test",
  "session_id": "telegram:12345",
  "channel": "telegram",
  "pending_id": null,
  "confirm": false
}
```

Response:
```json
{ "action": "execute" }            // safe, run it
{ "action": "pending", "pending_id": "abc", "message": "Confirm?" }
{ "action": "deny", "reason": "denied" }
```

### POST `/sentinel/approve-peer`
```json
{ "peer": "12345" }
```

Called when user sends "да"/"yes" on Telegram.

## Confirmation words

Telegram: `да`, `yes`, `y`, `ok`, `confirm`, `подтверждаю`

## License

MIT
