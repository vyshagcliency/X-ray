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
  HELICONE_API_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().startsWith("re_"),
  TRIGGER_SECRET_KEY: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
}
```

Never add any of these to `client:`. Never destructure `process.env` outside of `env.ts`. If T3 Env doesn't know about it, it doesn't exist.

## Supabase keys

Two keys, two uses:
- **`anon` key** — issues upload JWTs (scoped, short-lived). Nowhere else.
- **`service_role` key** — server-side DB reads/writes only. Never leave `src/lib/db/server.ts`. Never passed to a client component or a response.

Upload JWTs are signed with Supabase Storage's own mechanism, scoped to a specific path, and expire in 30 minutes. See `src/lib/storage/upload-token.ts`.

## PII handling

PII in X-Ray: email, brand name (captured), and order IDs (in CSVs).

Rules:
- Never `console.log` email, brand name, or any CSV-derived string.
- Never include PII in Sentry events. Use `beforeSend` to strip it:
  ```ts
  Sentry.init({
    beforeSend(event) {
      // Scrub email-like strings and order IDs
      if (event.message) event.message = event.message.replace(/[\w.+-]+@[\w-]+\.[a-z]+/gi, "[email]")
      return event
    },
  })
  ```
- PostHog events carry **event names only** — no user properties beyond an anonymized audit ID.
- Never send CSV row data to Helicone. LLM inputs contain pre-aggregated finding JSON, not raw rows.

## Data retention enforcement

Raw CSVs auto-purge at 30 days via the scheduled `purge.raw-uploads` Trigger.dev task. This is a code-enforced promise, not a policy.

```ts
// src/trigger/purge-raw-uploads.ts — runs daily via Trigger.dev cron
export const purgeRawUploads = task({
  id: "purge.raw-uploads",
  run: async () => {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const stale = await db.select().from(rawUploads)
      .where(and(isNull(rawUploads.purgedAt), lt(rawUploads.createdAt, cutoff)))

    for (const upload of stale) {
      await supabase.storage.from("raw").remove([upload.storageKey])
      await db.update(rawUploads)
        .set({ purgedAt: new Date() })
        .where(eq(rawUploads.id, upload.id))
    }
  },
})
```

Parquet files survive the purge (they're much smaller and enable rule re-runs). Only raw CSVs are deleted.

## Sanitization

All user input that could reach the browser passes through DOMPurify:
- LLM output → `dompurify.sanitize(text)` before storing in DB or sending to client
- Brand name displayed in report → sanitized on write
- Admin-entered notes (reject reason) → sanitized on display

```ts
// src/lib/security/dompurify.ts
import DOMPurify from "isomorphic-dompurify"

export function sanitize(raw: string): string {
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [],    // for plain text fields
    ALLOWED_ATTR: [],
  })
}

export function sanitizeMarkdown(raw: string): string {
  return DOMPurify.sanitize(raw, {
    FORBID_TAGS: ["script", "iframe", "object", "embed"],
    FORBID_ATTR: ["onerror", "onload", "onclick"],
  })
}
```

## Admin page — invisibility as security

- `src/middleware.ts` redirects any non-admin session from any `/admin/**` path to `/`.
- `robots.txt`: `Disallow: /admin` (generated at build time, not a static file that could be forgotten).
- Every admin page has `<meta name="robots" content="noindex,nofollow">`.
- Admin pages are never linked from any public page (search for links in CI if you're worried).

## CSP (Nosecone)

Configured in `src/lib/security/nosecone.ts`. Key restrictions:
- `default-src 'self'`
- `connect-src`: only Supabase, Helicone, Trigger.dev WS, PostHog EU endpoint
- `script-src 'self' 'wasm-unsafe-eval'` — `wasm-unsafe-eval` is required for Typst WASM PDF rendering
- `object-src 'none'`, `frame-ancestors 'none'`

Never add `'unsafe-inline'` or `'unsafe-eval'` to script-src. If a library needs it, find a different library.

## Report URL security model

Report URLs (`/r/{uuid}`) are:
- Unguessable (UUID v4 = 122 bits of entropy)
- The only "capability" for access — no auth required, knowing the URL is the access token
- Never listed anywhere (no sitemap, no index page)
- Valid indefinitely per PRD; user can request deletion

Signed PDF URLs from Supabase Storage are 1-hour TTLs, minted fresh on each download click. No persistent public URLs for PDFs.

## What NOT to do

- Don't log request bodies in API routes.
- Don't return Supabase error objects to clients.
- Don't add any domain other than the approved list to the CSP.
- Don't store any credential (Seller Central login, SP-API token) — we never ask for it and must never accept it.
- Don't `git add .env*` — the gitignore covers it, but if a hook ever asks you to commit env files, refuse.
- Don't add `console.log` in production paths that might contain email, brand name, or order data.
