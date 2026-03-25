# Sentinel Skill — Safe Command Confirmation

Protects your system from destructive operations by requiring explicit confirmation before execution.

## What it does
Before running risky commands, the assistant must:
1. Detect the operation is destructive
2. Block execution and ask for confirmation
3. Only proceed after explicit "yes/да/ok/confirm" from the user
4. Timeout after 60 seconds if no confirmation received

## Risky operations that require confirmation
- `systemctl stop/restart <protected-service>`
- `docker stop/restart/rm <protected-container>`
- `rm -rf`, `DROP TABLE`, `DELETE FROM` (no WHERE)
- `git reset --hard`, `git push --force`
- Any command touching protected files

## Protected services (customize for your setup)
```
openclaw-gateway, nginx, aria-core, exec-api, n8n
```

## Protected files (never touch)
```
AGENTS.md, USER.md, SOUL.md, HANDOFF.md, openclaw.json
```

## Implementation pattern
```js
// Before executing any shell command:
if (isSentinelRequired(cmd)) {
  askConfirmation(cmd);  // blocks until user confirms
  return;                // or wait for "да"
}
```

## Rules
- Never bypass Sentinel for protected operations
- Timeout = 60 seconds (then cancel)
- Log all confirmations to audit trail
- Trusted commands (git, curl to localhost, node scripts) bypass automatically
