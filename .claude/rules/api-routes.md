---
paths: ["src/app/api/**", "src/app/(admin)/**", "src/app/(public)/**/route.ts"]
---

# API route rules

## Input validation — always Zod first

Every API route validates its input with a Zod schema before touching any service. No exceptions.

```ts
const body = await req.json()
const parsed = schema.safeParse(body)
if (!parsed.success) {
  return Response.json({ error: "Invalid input", code: "VALIDATION_ERROR" }, { status: 400 })
}
```

## Error shape — consistent across all routes

```ts
// success
Response.json({ data: ... }, { status: 200 })

// error
Response.json({ error: string, code: string }, { status: 4xx | 5xx })
```

Never expose: stack traces, internal error messages, file paths, DB error strings. Log them server-side, return a safe message.

Error codes are `SCREAMING_SNAKE_CASE` strings: `VALIDATION_ERROR`, `RATE_LIMITED`, `BLOCKED_DOMAIN`, `AUDIT_NOT_FOUND`, `UNAUTHORIZED`, `INTERNAL_ERROR`.

## Rate limiting — required on every public route

Every route reachable without admin auth must run the rate limiter before doing any work:

```ts
import { rateLimit } from "@/lib/security/rate-limit"

const limit = await rateLimit(req, { key: "domain", window: "30d", max: 5 })
if (!limit.success) {
  return Response.json({ error: "Too many requests", code: "RATE_LIMITED" }, { status: 429 })
}
```

**Limits (from PRD §10):**
- Per email domain: 5 audits per 30 days
- Per IP: 10 submissions per day
- Per audit: 30 upload-complete requests (prevents stuck clients)

Check block list before consuming a rate-limit slot (blocked domains don't count toward the limit, they just get rejected).

## Auth — admin routes

Every route under `/api/admin/**` must verify the Supabase session and assert `role = 'admin'` before any DB access:

```ts
import { requireAdmin } from "@/lib/admin/auth"

const { user, error } = await requireAdmin(req)
if (error) return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
```

Never trust client-supplied `user_id` or `role` params. Always read from the verified session.

## Upload token route (`/api/upload-token`)

- Only issues a JWT if `audit_id` exists in `audits` table with status `pending_upload`
- JWT scoped to path `raw/{audit_id}/{report_type}/{uuid}.csv` — no wildcards
- JWT expires in 30 minutes
- Log issuance in `audit_events`

## Upload complete route (`/api/upload-complete`)

- Validates `audit_id`, `report_type`, `storage_key`, `client_row_count`
- Verifies the Storage object exists at the claimed path (don't trust the client)
- Inserts `raw_uploads` row
- Checks if all required reports for this audit are now uploaded; if yes, marks audit ready-to-run
- Enforces per-audit upload limit (max 30 calls)

## Audit run route (`/api/audit/run`)

- Validates all required reports are uploaded and validated
- Checks domain is not blocked
- Enqueues `audit.run` Trigger.dev task with idempotency key `audit:{audit_id}`
- Updates audit status to `processing`
- Returns `{ runId }` for the processing page to subscribe to

## Deletion route (`/api/deletion`)

- Accepts just an email address
- Inserts a `deletion_requests` row (manual processing in Phase 1)
- Returns 200 regardless (don't reveal whether email exists)

## What NOT to do

- Never `console.log` request bodies or CSV-derived data
- Never return raw Supabase errors
- Never expose `service_role` key usage in responses
- Never accept `audit_id` from a public-facing form without verifying it belongs to the right email
- No long-polling or WebSocket in API routes — use Trigger.dev realtime for progress
