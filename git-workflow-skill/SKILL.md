# Git Workflow Skill — AI Agent Branching Rules

Safe git branching strategy when multiple AI agents (Cursor, ARIA, etc.) work on the same repo.

## The problem
Multiple AI agents pushing to `main` = merge conflicts and lost work.

## Solution: Branch by agent
```
main        ← production, only ARIA merges here
cursor      ← Cursor AI writes here
feature/*   ← other agents/humans
```

## Rules for Cursor (coding agent)
- ALWAYS commit and push to branch `cursor`
- NEVER push directly to `main`
- Command: `git push origin cursor`

## Rules for ARIA (orchestrator)
- Reviews changes: `git diff cursor main`
- Merges only when safe: `git merge cursor --no-ff`
- Pushes to main: `git push origin main`

## Rules for humans
- Review ARIA's merge before it goes to main
- Can push feature branches freely

## Workflow
```
1. Cursor: task → commit → git push origin cursor
2. ARIA: git diff cursor main → review → merge → push main
3. No conflicts, full audit trail
```

## Why not branch protection?
GitHub branch protection requires Pro for private repos.
This workflow achieves the same result through convention.
