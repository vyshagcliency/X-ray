---
name: dev
description: Start the development server and the Trigger.dev worker in parallel
user-invocable: true
allowed-tools: Bash
---

Start both the Next.js dev server and Trigger.dev worker.

Run each command as a separate background Bash invocation (using `run_in_background: true`) so both keep streaming:

1. `cd "$CLAUDE_PROJECT_DIR" && pnpm dev`
2. `cd "$CLAUDE_PROJECT_DIR" && npx trigger.dev dev`

Tell the user:
- Next.js is on http://localhost:3000
- Trigger.dev worker is watching `src/trigger/**`

After launching, use BashOutput on each background shell to confirm both booted cleanly. If either fails, read the error and report the root cause (missing env var, port conflict, stale lockfile, etc.).
