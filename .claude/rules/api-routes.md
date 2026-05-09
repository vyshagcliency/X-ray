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
// or
Response.json({ success: true })

// error
Response.json({ error: string }, { status: 4xx | 5xx })
```

Never expose: stack traces, internal error messages, file paths, DB error strings. Log them server-side, return a safe message.

## Rate limiting — required on every public route

Every route reachable without admin auth must run the rate limiter before doing any work:

```ts
import { uploadRateLimit } from "@/lib/security/rate-limit"

const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
const { success: withinLimit } = await uploadRateLimit.limit(ip)
if (!withinLimit) {
  return NextResponse.json({ error: "Too many uploads. Please try again later." }, { status: 429 })
}
```

**Limits:**
- Per email domain: 5 audits per 30 days (in start server action)
- Per IP: 10 uploads per day (in upload route)
- Per IP: 30 API requests per minute (available for general routes)

## Auth — admin routes

Admin routes rely on the middleware cookie check. The middleware in `src/middleware.ts` redirects any unauthenticated request to `/admin/login`. API routes under `/api/admin/**` can additionally verify the cookie:

```ts
const adminSession = request.cookies.get("admin-session")
if (!adminSession?.value) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
```

## Actual API routes (Phase 1)

### Public routes
- `POST /api/audit/upload?auditId=...` — receives FormData with 3 CSVs (returns, reimbursements, inventory_ledger), uploads to Supabase Storage, creates `raw_uploads` rows, enqueues `audit.run` Trigger.dev task. Rate limited by IP.
- `GET /api/audit/status?id=...` — returns audit status for processing page polling.
- `GET /api/audit/pdf?id=...` — serves signed PDF URL or on-demand React-PDF render.
- `POST /api/deletion` — writes `deletion_requests` row. Returns 200 regardless (don't reveal whether audit exists).
- `GET /api/health` — touches each external service once.

### Admin routes
- `POST /api/admin/login` — Supabase Auth + admin role check + httpOnly cookie.
- `POST /api/admin/logout` — clears cookie.
- `POST /api/admin/approve` — flips audit to `completed`, triggers `notify.email`.
- `POST /api/admin/reject` — sets audit to `failed`, persists reason note.
- `POST /api/admin/delete-audit` — cascade wipes storage, findings, cost_events, zeros PII, marks deletion processed.

### Server actions
- `src/app/(public)/start/actions.ts` — `startAudit()` validates email + brand name, checks block list + disposable domains + domain rate limit, creates audit row, redirects to upload page.

## What NOT to do

- Never `console.log` request bodies or CSV-derived data
- Never return raw Supabase errors
- Never expose `service_role` key usage in responses
- Never accept `audit_id` from a public-facing form without verifying it belongs to the right status
- No long-polling or WebSocket in API routes — use polling via `/api/audit/status` for progress
