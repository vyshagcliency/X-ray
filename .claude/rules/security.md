---
paths: ["src/env.ts", "src/**/*auth*", "src/app/api/**", "src/middleware.ts", "src/lib/security/**", "src/lib/db/**", "src/lib/storage/**"]
---

# Security rules

## The single biggest trust lever

A US Controller's willingness to upload Seller Central reports depends entirely on whether they believe the data stays safe. Security here is not a compliance checkbox — it is the conversion-rate lever on the upload page.

## Secrets — never on the client

T3 Env (`src/env.ts`) is the enforcer. Any variable without `NEXT_PUBLIC_` prefix is server-only. If you need a value in the browser, it has no business being a secret.

```ts
// src/env.ts — server-only block (examples)
server: {
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().startsWith("sk-ant-"),
  RESEND_API_KEY: z.string().startsWith("re_"),
  TRIGGER_SECRET_KEY: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
}
```

Never add any of these to `client:`. Never destructure `process.env` outside of `env.ts`. If T3 Env doesn't know about it, it doesn't exist.

## Supabase keys

Two keys, two uses:
- **`anon` key** — used for client-side auth (admin login). Not currently used for storage uploads.
- **`service_role` key** — server-side DB reads/writes + Storage uploads. Lives in `src/lib/db/supabase.ts` via `supabaseAdmin()`. Never passed to a client component or a response.

## Rate limiting

Three Upstash rate limiters in `src/lib/security/rate-limit.ts`:
- `startRateLimit` — 5 audits per email domain per 30 days (sliding window). Used in `src/app/(public)/start/actions.ts`.
- `uploadRateLimit` — 10 uploads per IP per day. Used in `src/app/api/audit/upload/route.ts`.
- `apiRateLimit` — 30 requests per IP per minute. Available for general API routes.

## PII handling

PII in X-Ray: email, brand name (captured), and order IDs (in CSVs).

Rules:
- Never `console.log` email, brand name, or any CSV-derived string.
- Never include PII in error tracking events.
- PostHog events carry **event names only** — no user properties beyond an anonymized audit ID.
- Never send CSV row data to LLM. LLM inputs contain pre-aggregated finding JSON, not raw rows.

## Data retention enforcement

Raw CSVs auto-purge at 30 days via the scheduled `purge.raw-uploads` Trigger.dev task. This is a code-enforced promise, not a policy.

Parquet files (when introduced in Phase 2) survive the purge — they're much smaller and enable rule re-runs. Only raw CSVs are deleted.

## Sanitization

`src/lib/security/dompurify.ts` provides `sanitizeHtml()`:
- Allows only safe tags: `p`, `strong`, `em`, `ul`, `ol`, `li`, `a`, `code`, `pre`, `br`, `span`
- Allows only safe attributes: `href`, `target`, `rel`, `class`
- Strips scripts, iframes, event handlers

Use for:
- LLM output → `sanitizeHtml(text)` before storing in DB or sending to client
- Any user-generated content displayed in HTML context

## Admin auth

Supabase Auth password flow:
1. `/admin/login` page authenticates via `supabase.auth.signInWithPassword`
2. `/api/admin/login` verifies `app_metadata.role = 'admin'`, sets httpOnly session cookie (8h TTL)
3. `src/middleware.ts` checks cookie on all `/admin/*` routes (except `/admin/login`), redirects to login if missing
4. `/api/admin/logout` clears the cookie

Admin user seeded: `vyshag@baslix.com` with `app_metadata.role = 'admin'`.

## Admin page — invisibility as security

- `src/middleware.ts` redirects any non-admin session from any `/admin/**` path to `/admin/login`.
- `robots.txt`: `Disallow: /admin`
- Every admin page has `robots: "noindex, nofollow"` metadata.
- Admin pages are never linked from any public page.

## CSP (inline in middleware)

Configured directly in `src/middleware.ts` (nosecone rejected as unnecessary dependency):

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
connect-src 'self' https://*.supabase.co;
font-src 'self';
frame-ancestors 'none'
```

Additional security headers set in middleware:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`

## Report URL security model

Report URLs (`/r/{uuid}`) are:
- Unguessable (UUID v4 = 122 bits of entropy)
- The only "capability" for access — no auth required, knowing the URL is the access token
- Never listed anywhere (no sitemap, no index page)
- Valid indefinitely per PRD; user can request deletion

Signed PDF URLs from Supabase Storage are 1-hour TTLs, minted fresh on each download click.

## What NOT to do

- Don't log request bodies in API routes.
- Don't return Supabase error objects to clients.
- Don't add any domain other than the approved list to the CSP.
- Don't store any credential (Seller Central login, SP-API token) — we never ask for it and must never accept it.
- Don't `git add .env*` — the gitignore covers it, but if a hook ever asks you to commit env files, refuse.
- Don't add `console.log` in production paths that might contain email, brand name, or order data.
