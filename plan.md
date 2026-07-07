# Baslix Leakage X-Ray — Build Plan

**Version:** 1.0
**Companion to:** prd.md, userstories.md, architecture.md, decisions.md
**Status:** Active
**Last updated:** 2026-07-05

> [!important] Active in-flight rework (2026-07-05): **Report Killer**. After the first realistic synthetic run (Halcyon Audio) the payout-integrity repoint was confirmed shipped but the report's *credibility engineering + information hierarchy* were found lacking (numbers not reconciling, `[object Object]` render bugs, softest bucket heroed, estimates above the traceability promise). The report-quality rework — plus a curated bucket expansion, a richer visual system, and funnel consistency — is planned in **`report-killer-plan.md`** (with research builds `report-killer-referral-guard.md` + `report-killer-new-buckets.md`, and session prompts `report-killer-prompts.md`). It supersedes the report-surface parts of Phase 1.5/§4 here and continues the alignment `feex-rework.md` began (2026-06-13). Check items off in `report-killer-plan.md` during that work; fold shipped changes back here per its §7.

---

## How this document works

This is the ordered, checkboxed build plan. It is the single source of truth for **what has been shipped, what's in flight, and what's next.**

- Phases and sub-phases are **ordered** — ship sequentially unless a sub-phase is explicitly marked parallel-safe.
- Each sub-phase has an **exit gate** — a concrete, verifiable condition. Do not close a sub-phase until every gate condition is met.
- Every sub-phase lists **relevant PRD / user-story / architecture references** so you can pull the authoritative detail without re-reading everything.
- **Research checkpoints** at the top of each phase call out moving pieces that must be verified against current documentation before implementation begins. APIs drift. Amazon report columns drift. Verify first.
- **Do not start the next phase without explicit user confirmation.**

### Rules for updating this file

1. **Check off items the moment they're done** — never batch.
2. **Do not silently re-scope.** If a sub-phase needs to change, update it in-place with a note, and if the change is architectural, update `architecture.md`; if it changes a locked choice, update the `decisions.md` change log.
3. **Never delete completed items** — they're the shipped record. Only add a strikethrough or a `(descoped: reason)` annotation if a completed item is reversed later.
4. **Phase transitions are gated by the user.** When a phase's exit gate is met, post a summary and wait for sign-off before opening the next phase.

### Legend

- `[ ]` not started · `[~]` in progress · `[x]` done · `[-]` descoped (with reason)
- **P0/P1/P2/P3** — priority from `userstories.md`
- 🔬 **Research** — a task that requires reading current external docs before coding
- 🔒 **Gate** — exit condition for a sub-phase

---

## Phase overview

| Phase | Name | Target duration | Goal |
|---|---|---|---|
| **0** | Foundation & scaffolding | 3–5 days | Clean Next.js app, all external services provisioned, migrations run, env validated, CI passing |
| **1** | MVP ship | 4–6 weeks | First 50 brands can self-serve an audit; Vyshag manually reviews; 3 detection rules live |
| **1.5** | The Wedge Correction — payout-integrity lead | ~1 week | Re-point the audit from FBA reimbursement (the dying bucket) to contract-free **payout-integrity** checks ("Settlement Truth Audit"); reframe messaging to "your settlement report is lying to you." Driven by `Baslix-brain/synthesis/the-wedge-correction-2026.md` |
| **2** | Full Bucket 3 *(demoted — see Phase 1.5)* | 6 weeks | All core Bucket-3 detection rules, self-serve delivery, admin funnel, block list, user-initiated deletion automation. **Bucket 3 is now a table-stakes add-on, not the lead.** |
| **3** | Bucket 2 depth + growth | 3–6 months | Contract-dependent payout-integrity checks (co-op, freight, Walmart cash-discount), fee anomaly rule, SP-API continuous monitoring, whitelabel partnerships, Contract-vs-Reality v2 |

---

## Phase 0 — Foundation & scaffolding

**Goal:** A repo that builds, lints, tests, deploys, and connects to every external service. No product code yet. Nothing user-facing.

**Exit gate:** `pnpm build && pnpm lint && pnpm test` all pass on a clean clone. `pnpm dev` boots. `npx trigger.dev dev` connects. Vercel preview deploy succeeds. Supabase migrations applied. Sentry + PostHog + Helicone wired and receiving events from a hello-world route.

### 🔬 Research checkpoint (before starting)

- [x] Confirm **Next.js 15** is the current stable line (if Next 16 has shipped stably, flag to user — `architecture.md §9.1` locks us to 15, but `decisions.md` 2026-04-18 entry anticipates this). **Result:** Next 16.2.4 is latest stable; Next 15.5.15 is latest 15.x. Staying on 15 per locked decision. Flagged to user, confirmed.
- [x] Confirm **DuckDB `@duckdb/node-api`** latest API — verify the `COPY ... TO 'file.parquet'` + `read_parquet` patterns still work as documented in `architecture.md §5.4`. **Result:** v1.5.2-r.1 confirmed. Package name and SQL patterns valid.
- [x] Confirm **Trigger.dev v4** `triggerAndWait` / `batchTriggerAndWait` + `metadata.set` / `@trigger.dev/react-hooks` `useRealtimeRun()` APIs are stable. **Result:** v4.4.4 confirmed. All APIs stable.
- [x] Confirm **Supabase Storage TUS resumable** endpoint path (`/storage/v1/upload/resumable`) and chunk size (6MB) against current Supabase docs. **Result:** Supabase JS v2.103.3. TUS endpoint and 6MB chunks confirmed.
- [x] Confirm **`@myriaddreamin/typst.ts`** bundle size and WASM compatibility with Trigger.dev workers. **Result:** v0.7.0-rc2 (~8MB WASM). Still RC but acceptable — React-PDF fallback covers risk.
- [x] Confirm **Anthropic model IDs** (`claude-sonnet-4-5-20250929`, `claude-haiku-4-5-20251001`) are still current — these were locked 2026-04-18. **Result:** `claude-sonnet-4-6` does not exist; corrected to `claude-sonnet-4-5-20250929`. Haiku confirmed. Fixed in decisions.md + architecture.md.

### 0.1 Repo scaffold

- [x] Initialize Next.js 15 App Router app: `pnpm create next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"`
- [x] Configure `tsconfig.json` with strict mode, `@/` alias
- [x] Install core deps: `zod`, `@t3-oss/env-nextjs`, `next-safe-action`, `react-hook-form`, `@hookform/resolvers`, `motion`, `p-limit`
- [x] ESLint v9 flat config + Prettier, matching coding conventions in CLAUDE.md
- [x] `vitest.config.ts` with path alias, test file discovery under `tests/`
- [x] `package.json` scripts: `dev`, `build`, `lint`, `format`, `test`, `test:watch`, `db:migrate`, `db:types`
- [x] `.gitignore` — include `.gitignore-additions.txt` contents
- [x] Commit and push initial scaffold

### 0.2 External service provisioning

*Manual step — Vyshag provisions these before first real deploy.*

- [x] Create Supabase project (Pro tier or Free to start) *(project `jeryjldcznkwlfwtpayh` provisioned)*
- [x] Create Trigger.dev v4 project *(project `proj_hzajkiesibincfyzmdll` provisioned)*
- [x] Create Vercel project, link to repo *(deployed at x-ray.baslix.com)*
- [x] Create Resend account + verify sending domain
- [x] Create Upstash Redis database (free tier)
- [x] Create Anthropic API key
- [ ] Create Helicone project, grab proxy URL + key *(deferred: not using Helicone proxy yet — direct Anthropic calls)*
- [-] Create Sentry project (descoped: MVP focus on CX, add post-launch)
- [-] Create PostHog Cloud EU project (descoped: MVP focus on CX, add post-launch)
- [x] Purchase / confirm `xray.baslix.com` DNS *(live)*
- [x] Add all secrets to Vercel + Trigger.dev env (never `NEXT_PUBLIC_*`)

### 0.3 Env + validation

- [x] `src/env.ts` — T3 Env schema covering every secret listed in `architecture.md §10.2`
- [x] Schema explicitly rejects `NEXT_PUBLIC_*` prefixed secrets (decisions §3 hard rule)
- [x] Add a `/api/health` route that touches each external service once on request (Supabase select, Trigger.dev ping, Anthropic models list, Resend ping)

### 0.4 Database migrations

**Reference:** `architecture.md §4`

*Deviation: all tables shipped in a single migration file (`001_initial_schema.sql`) instead of one-per-table. Simpler for MVP; no functional difference.*

- [x] Migration: `audits` table (arch §4.1)
- [x] Migration: `raw_uploads` table (arch §4.2)
- [x] Migration: `case_source_rows` table (arch §4.3b)
- [x] Migration: `findings` table + indexes (arch §4.4)
- [x] Migration: `audit_events` table (arch §4.5)
- [x] Migration: `cost_events` table (arch §4.5)
- [x] Migration: `rule_versions` table (arch §4.5)
- [x] Migration: `block_list` table (arch §4.5)
- [x] Migration: `deletion_requests` table (arch §4.5)
- [x] Migration: RLS policies — `deny all` to anon + authenticated on every server-only table (arch §4.6)
- [x] Migration: `002_add_report_data.sql` — adds `report_data jsonb` to audits + `row_ref text` to findings (unplanned; needed for report page rendering)
- [x] Migration: seed Vyshag's admin user with `role: 'admin'` app_metadata claim *(seeded via Supabase Admin API: `vyshag@baslix.com` with `app_metadata.role = 'admin'`)*
- [ ] `pnpm db:types` regenerates TypeScript types into `src/types/supabase.ts`

### 0.5 Security baseline (deferred — add before public launch)

**Reference:** `.claude/rules/security.md`

*Descoped from Phase 0 per user direction ("don't overdo, just care about CX"). Will add before first real users.*

- [x] CSP header added inline in `src/middleware.ts` (simpler than nosecone; `default-src 'self'`, `script-src 'self' 'unsafe-inline'`, `style-src 'self' 'unsafe-inline'`, `img-src 'self' data: https:`, `connect-src 'self' https://*.supabase.co`, `frame-ancestors 'none'`)
- [x] `src/lib/security/rate-limit.ts` — Upstash wrappers: `startRateLimit` (5/domain/30d), `uploadRateLimit` (10/IP/day), `apiRateLimit` (30/IP/min)
- [x] `src/lib/security/dompurify.ts` — isomorphic DOMPurify config with safe tag allowlist
- [x] `src/middleware.ts` — admin route guard (Supabase Auth session cookie set by `/api/admin/login`) + security headers (X-Frame-Options, HSTS, nosniff, referrer-policy, permissions-policy)
- [x] `robots.txt` + `sitemap.xml` — disallow `/admin`, `/r/`, `/run/`, `/upload/`, `/start`, `/deletion/`, `/api/` (only landing + legal pages are indexable)

### 0.6 Observability wiring (descoped for MVP)

*Descoped per user direction. Sentry + PostHog + Helicone will be wired post-launch when CX is validated.*

- [-] `src/instrumentation.ts` (descoped: MVP focus on CX)
- [-] `src/lib/observability/sentry.ts` (descoped: MVP focus on CX)
- [-] `src/lib/analytics/posthog.ts` (descoped: MVP focus on CX)
- [-] Helicone base URL (descoped: MVP focus on CX)

### 0.7 CI/CD baseline (descoped for MVP)

*Descoped per user direction. Manual deploys sufficient for MVP.*

- [-] GitHub Actions workflow (descoped: MVP focus on CX)
- [-] Vercel preview deploys (descoped: MVP focus on CX)
- [-] Trigger.dev deploy on push (descoped: MVP focus on CX)

### 🔒 Phase 0 exit gate

- [x] All `pnpm` scripts pass cleanly on a fresh clone. *(build, lint, test all pass as of 2026-04-21)*
- [x] Preview deploy URL boots, `/api/health` returns green for all services. *(x-ray.baslix.com live, all services connected)*
- [x] Migrations applied, DB types generated, RLS verified. *(9 tables confirmed in Supabase; DB types not yet regenerated but schema is live)*
- [-] Sentry + PostHog + Helicone each received at least one event. *(descoped for MVP)*
- [x] **User confirmed skipping Phase 0 ceremony and jumping to Phase 1 CX.** *(2026-04-18)*

---

## Phase 1 — MVP ship

**Goal:** 50 brands can upload 3 CSVs, wait 3–8 minutes, and get a PDF report. Vyshag reviews each one manually via `/admin/review/:id` before the user receives the email. Three detection rules live: returns gap, inventory lost/damaged, refund/reimbursement mismatch.

**Exit gate:** End-to-end test with 3 real brand datasets produces defensible PDFs. All P0-Phase-1 user stories pass their acceptance criteria. Per-audit cost stays under $30. Vyshag has approved and sent ≥3 real reports through the manual review queue.

### 🔬 Research checkpoint (before starting)

*Partially deferred — jumped to building CX-facing code per user direction. Headers need verification against real Amazon data before launch.*

- [x] Pull **current Amazon Seller Central report formats** — headers verified against real Amazon docs. "FBA Inventory Adjustments" deprecated Jan 2023; replaced with "Inventory Ledger - Detailed View" (new columns, Event Type filter). Renamed internal key `adjustments` → `inventory_ledger`. Moved `status` to optional on returns. Added optional headers to reimbursements. All rules, fixtures, and tests updated. (2026-05-08)
- [ ] Confirm **Anthropic prompt caching** API shape (deferred: template-based narrative for now)
- [ ] Confirm **Vercel AI SDK v5+** shape (deferred: template-based narrative for now)
- [x] Confirm **Typst syntax + `@myriaddreamin/typst.ts`** embed API — confirmed working. `CompileFormatEnum` not re-exported; use `format: 1 as const` for PDF output. WASM runs in Trigger.dev workers with `additionalPackages` config. (2026-04-25)
- [-] Confirm **Uppy Dashboard** + `@uppy/tus` plugin (descoped: using simpler FormData upload for MVP — see decisions.md)
- [ ] Confirm **Supabase signed upload URLs** (using service-role direct upload for now)

### 1.1 Public intake — landing + start form

**User stories:** US-1.1, US-1.2, US-2.1, US-2.2 · **PRD:** §4.1, §4.2

- [x] `src/app/(public)/page.tsx` — landing page
  - [x] Hero with headline, subhead, trust line (PRD §4.1)
  - [x] 60-second screen recording embed (placeholder video section with play button icon + "See how it works in 60 seconds" text)
  - [x] Three anonymized sample finding cards
  - [x] "About Baslix" block (US-1.2)
  - [x] Footer with privacy policy + terms links
- [x] `src/app/(public)/start/page.tsx` — email + brand form
  - [x] Zod-validated form (email, brand_name, legal_checkbox) via server action *(deviation: useActionState instead of React Hook Form — simpler for this form)*
  - [x] Disposable email domain rejection (US-2.2)
  - [x] Block-list check against `block_list` table (US-2.2)
  - [x] Rate limit: 5/domain/30d integrated via `startRateLimit` in server action
  - [x] Insert `audits` row with `status = 'pending_upload'`
  - [x] Redirect to `/upload/[id]`
- [x] `src/app/(public)/privacy/page.tsx` — real privacy policy (data retention, security, deletion)
- [x] `src/app/(public)/terms/page.tsx` — terms of service
- [-] PostHog events (descoped for MVP)

### 1.2 Upload — client-side validation + FormData upload

**User stories:** US-3.1, US-3.2, US-3.3, US-3.5 · **PRD:** §4.3 · **Arch:** §6

*Deviation: replaced Uppy + TUS with simpler FormData upload via single `/api/audit/upload` route. Uppy adds complexity and a dependency; FormData is sufficient for MVP file sizes. TUS resumable upload can be added later if users hit reliability issues on large files.*

- [x] `src/lib/csv/headers.ts` — header signatures for 3 Phase-1 reports (placeholder headers; need real Amazon verification)
- [x] `src/lib/csv/validate-client.ts` — client-side header sniffer (reads first 10KB, not PapaParse — lighter weight)
- [x] `src/components/upload/ReportTile.tsx` — drag-drop zone per report type with validation states (valid/error/empty)
- [-] `src/components/upload/UppyDashboard.tsx` (descoped: using FormData upload instead — see decisions.md)
- [-] `src/app/api/upload-token/route.ts` (descoped: using service-role direct upload)
- [-] `src/app/api/upload-complete/route.ts` (descoped: combined into single upload route)
- [x] `src/app/(public)/upload/[id]/page.tsx` — page with 3 tiles for Returns, Inventory Ledger, Reimbursements
  - [x] Privacy bullets above tiles
  - [x] "Run audit" button disabled until all three validated
- [x] `src/app/api/audit/upload/route.ts` — receives FormData with 3 CSVs, uploads to Supabase Storage, creates `raw_uploads` rows, enqueues `audit.run` Trigger.dev task *(replaces planned upload-token + upload-complete + audit/run three-route flow)*
- [-] PostHog events (descoped for MVP)

### 1.3 Core pipeline — monolithic parent task

**User stories:** US-4.4, US-4.5 · **PRD:** §7.2 · **Arch:** §5

*Deviation: all pipeline stages run inside a single `audit-run.ts` parent task instead of separate child tasks with `batchTriggerAndWait`. Simpler for MVP with 3 rules. Child tasks can be extracted later if per-stage retry granularity is needed.*

*Deviation: DuckDB reads CSVs directly via `read_csv()` instead of converting to Parquet first. Eliminates the `parse-to-parquet.ts` step. Parquet conversion can be added later for performance on larger datasets.*

- [x] `src/trigger/audit-run.ts` — monolithic parent task (detect + narrate + draft disputes + store report data)
- [-] `src/trigger/validate-csv.ts` (descoped: validation done client-side only for MVP)
- [-] `src/trigger/parse-csv.ts` (descoped: DuckDB reads CSVs directly, no Parquet conversion)
- [x] `src/lib/duckdb/client.ts` — per-task DuckDB connection factory with httpfs extension
- [-] `src/lib/duckdb/parse-to-parquet.ts` (descoped: reading CSVs directly)
- [-] `src/lib/db/audit-events.ts` helper (inline in audit-run.ts for now)
- [-] Idempotency keys (descoped: add when extracting child tasks)
- [x] Retries: `maxAttempts: 3` on parent task

### 1.4 Detection rules (Phase 1) + cost ledger

**User stories:** US-5.1, US-5.2, US-5.3, US-9.7 · **PRD:** §5.1–5.3

- [x] `src/lib/rules/index.ts` — rule registry with `{ id, version, sql, requiredReports, confidenceFn }` shape
- [x] `src/lib/duckdb/run-rule.ts` — generic rule executor that reads CSVs via signed URL, runs rule SQL, maps rows → findings *(deviation: uses `read_csv()` not `read_parquet()`)*
- [x] `src/lib/rules/returns-gap.ts` — PRD §5.1 (pure SQL)
- [x] `src/lib/rules/inventory-lost.ts` — PRD §5.2 (pure SQL)
- [x] `src/lib/rules/refund-reimbursement-mismatch.ts` — PRD §5.3 (pure SQL)
- [-] `src/trigger/detect-rule.ts` (descoped: rules run inline in audit-run.ts)
- [x] `tests/rules/returns-gap.test.ts` — fixture CSV tests (7 tests, all passing)
- [x] `tests/rules/inventory-lost.test.ts` — fixture CSV tests (7 tests, all passing)
- [x] `tests/rules/refund-reimbursement-mismatch.test.ts` — fixture CSV tests (6 tests, all passing)
- [-] `src/trigger/materialize-cases.ts` (descoped: report page reads findings directly)
- [x] `src/lib/cost/record.ts` — writes `cost_events` rows
- [x] `src/lib/cost/circuit-breaker.ts` — checks running total vs. `MAX_COST_PER_AUDIT_CENTS`

### 1.5 LLM — narrative + dispute drafts (template-based for MVP)

**User stories:** US-4.5, US-6.3 · **PRD:** §5, §6.3 · **Arch:** §8

*Deviation: template-based narrative and dispute drafts for MVP. No Anthropic API calls yet. LLM enhancement will be added when template quality is validated against real data.*

- [x] `src/lib/llm/narrate.ts` — template-based narrative generator (takes pre-aggregated findings JSON) *(deviation: templates, not LLM — "source: template" flag in output)*
- [x] `src/lib/llm/draft-dispute.ts` — template-based per-case dispute draft generator *(deviation: templates, not LLM)*
- [x] `src/lib/llm/validate-output.ts` — regex validation ensuring no invented dollar amounts; sanitization fallback
- [ ] Prompt caching (deferred to LLM integration)
- [ ] Helicone proxy (deferred to LLM integration)
- [-] `src/trigger/narrate-llm.ts` (descoped: narration runs inline in audit-run.ts)
- [-] `src/trigger/draft-disputes.ts` (descoped: drafts run inline in audit-run.ts)
- [x] Fallback: template prose is the default for now; LLM becomes the upgrade
- [ ] **Promptfoo** tests (deferred to LLM integration)
- [-] PostHog events (descoped for MVP)

### 1.6 PDF rendering — Typst primary + React-PDF fallback

**User stories:** US-6.2, US-6.3 · **PRD:** §6.2 · **Arch:** §7

*Not yet built. PDF download button currently redirects to the web report page. Web report IS the product for MVP; PDF is an enhancement.*

- [x] `templates/report.typ` — Typst template (cover, exec summary, categories, methodology, top cases, CTA)
- [x] `src/lib/pdf/data-builder.ts` — findings + narrative → structured JSON *(built, used by audit-run.ts to populate `report_data` on audits)*
- [x] `src/lib/pdf/typst-render.ts` — compile Typst WASM via @myriaddreamin/typst.ts
- [x] `src/lib/pdf/react-pdf-render.tsx` — React-PDF fallback renderer
- [x] `src/trigger/render-pdf.ts` — Trigger.dev task with Typst primary + React-PDF fallback
- [x] `src/app/api/audit/pdf/route.ts` — serves signed PDF URL or on-demand React-PDF render
- [ ] Manual PDF inspection on 3 real datasets

### 1.7 Processing page + report page

**User stories:** US-4.1, US-4.2, US-6.1, US-6.5 · **PRD:** §4.4, §4.5, §6.1 · **Arch:** §5.1

- [x] `src/app/(public)/run/[id]/page.tsx` — processing page
  - [x] Real streamed stage labels via `useRealtimeRun()` (Report Killer P6.1, 2026-07-07) — the page accumulates the worker's live `metadata.stage`/`progress`; the upload route mints a 1h run-scoped public token + hands `{runId, publicAccessToken}` to the page via sessionStorage; the `/api/audit/status` poll stays the redirect/failure authority and the fallback when realtime is unavailable. *(Superseded the earlier simulated `setInterval` stages.)*
  - [x] Elapsed timer
  - [x] Auto-switch to "we'll email you" after 10 minutes (US-4.2)
  - [x] On failure: show actionable error + re-upload path (US-4.3) *(alert icon, explanation, "Start a new audit" button, support email with audit ID)*
- [x] `src/app/(public)/r/[uuid]/page.tsx` — report page served from DB
  - [x] Headline strip (total, urgent, cases)
  - [x] Executive summary (from `report_data.narrative`)
  - [x] Category cards with confidence badges
  - [x] Urgency timeline (Recharts) — `UrgencyChart.tsx` client component with horizontal bar chart, color-coded urgency buckets
  - [x] Top 10 cases table with badges
  - [x] Methodology section (from `report_data.narrative`)
  - [x] CTA block ("Filing N disputes is a 60-80 hour job...")
  - [x] Download PDF button (links to `/api/audit/pdf`)
- [x] Report URL valid indefinitely until deletion
- [-] PostHog events (descoped for MVP)

### 1.8 Email delivery

**User stories:** US-6.4 · **PRD:** §4.6 · **Arch:** §5

- [x] `src/lib/email/templates/report-ready.ts` — plain HTML email template *(deviation: plain HTML string, not React Email component — simpler for MVP)*. **Re-heroed to payout-integrity (Report Killer P6.2, 2026-07-07):** leads with the provable-forward monthly run-rate off `report_data` (mirrors the web hero + null/zero fallback), reconciled surfaced-in-total sub-line, "Settlement Truth Audit" framing; the old "$X Amazon may owe you" is gone (regression-tested). `notify-email.ts` feeds it from the stored `report_data`.
- [x] `src/lib/email/send.ts` — Resend client wrapper (raw fetch to Resend API)
- [x] `src/trigger/notify-email.ts` — sends email after admin approval, checks audit is `completed`
- [x] In Phase 1, `notify-email` runs **only** after admin approval

### 1.9 Admin (Phase 1)

**User stories:** US-9.1, US-9.2, US-9.3, US-9.6, US-9.7 · **PRD:** §8 · **Arch:** §9

*All admin pages built. Supabase Auth login flow live with admin role verification.*

- [x] Supabase Auth password flow — `/admin/login` page authenticates via Supabase Auth, verifies `app_metadata.role = 'admin'`, sets httpOnly session cookie (8h TTL). `/api/admin/logout` clears cookie. Admin nav bar with logout button on all admin pages.
- [x] `src/app/(admin)/admin/page.tsx` — dashboard with pending/processing/completed/failed counts + recent audits list + pending review queue *(deviation: simpler than planned — no sparkline charts yet)*
- [x] `src/app/(admin)/admin/audits/page.tsx` — audit list with status filters, search, sortable grid
- [x] `src/app/(admin)/admin/audits/[id]/page.tsx` — full audit detail (findings, uploads, cost breakdown, event timeline, rule versions, deletion warnings)
- [x] `src/app/(admin)/admin/review/[id]/page.tsx` — approve / reject UI
  - [x] Approve flips status → `completed` + triggers `notify.email`
  - [x] Reject sets `failed`, persists reason note
- [x] `src/app/(admin)/admin/cost/page.tsx` — cost tracking dashboard (total spend, avg/audit, 7-day rolling avg, component breakdown, flagged >$50)
- [x] `src/app/(admin)/admin/failures/page.tsx` — failed audit list with error events + metadata
- [x] `src/app/api/admin/approve/route.ts`
- [x] `src/app/api/admin/reject/route.ts`
- [ ] `src/app/api/admin/rerun/route.ts` (deferred)
- [x] Admin page has `robots: "noindex, nofollow"` metadata
- [-] PostHog events (descoped for MVP)

### 1.10 Privacy + deletion + purge

**User stories:** US-8.1, US-8.2, US-8.3, US-8.4 · **PRD:** §9 · **Arch:** §10

- [x] `src/trigger/purge-raw-uploads.ts` — scheduled daily (3 AM UTC), deletes Storage objects + sets `purged_at` on `raw_uploads` older than 30 days
- [x] `src/app/(public)/deletion/[audit_id]/page.tsx` — confirmation page with cascade wipe description
- [x] `src/app/api/deletion/route.ts` — writes `deletion_requests` row (Phase 1: manual processing)
- [x] `src/app/(admin)/admin/audits/[id]/page.tsx` includes a "Process deletion" action in Phase 1 — cascade wipes raw CSV (if present), Parquet, `findings`, `case_source_rows`, `reports/{audit_id}.pdf`, zeros PII on `audits`, sets status `deleted` (arch §10.1) *(implemented via `/api/admin/delete-audit` route + `DeleteAuditButton` client component)*
- [x] Privacy language on `/start` + `/upload` + privacy policy matches arch §4.3 (Parquet retention explicitly disclosed on both pages)

### 1.11 Hardening + launch readiness

- [x] Smoke test with **3 synthetic brand datasets** *(real Amazon data deferred — see below)* (PRD §11 Phase 1 step 14)
  - [x] NovaPeak Outdoor (50 SKUs, 2400 returns, 1820 reimb, 800 ledger → 801 findings)
  - [x] LuxeNest Home (31 SKUs, 1200 returns, 1054 reimb, 1000 ledger → 289 findings)
  - [x] PureGlow Beauty (52 SKUs, 3600 returns, 2314 reimb, 600 ledger → 1663 findings)
  - [x] Deterministic generator: `scripts/generate-smoke-data.mjs` with seeded PRNG for reproducibility
  - [x] All 3 rules fire on all 3 brands; 33 tests pass (12 smoke + 21 unit)
  - [ ] **Deferred:** Smoke test with 3 real brand datasets from Vyshag (requires actual Amazon Seller Central exports)
- [ ] Tune detection rule thresholds based on smoke test findings (update rule versions, preserve old versions for reproducibility per US-9.7)
- [ ] Manually inspect each PDF — typography, page breaks, forwardability test ("would a CFO read this?")
- [ ] Verify cost per audit on all three smoke datasets is under $30
- [ ] Final landing page polish: shoot the real 60-second screen recording, replace placeholder
- [x] Confirm `sitemap.xml` and `robots.txt` are correct
- [x] Confirm TLS 1.3, HSTS, CSP headers via `curl -sI` against production (`baslix-xray.vercel.app`): CSP, HSTS (63072000s), X-Frame-Options DENY, nosniff, referrer-policy, permissions-policy all present. Admin route 307→`/admin/login`. robots.txt correct.
- [ ] Load test: 10 concurrent audits don't trip cost circuit breaker or Trigger.dev concurrency limits
- [x] Write the internal launch announcement / outreach template for Vyshag *(docs/outreach-template.md — cold email + day 3 + day 7 follow-ups)*

### 🔒 Phase 1 exit gate

- [~] All P0-Phase-1 user stories meet their acceptance criteria (see `userstories.md` Story Map Summary). *(all code shipped; deferred: real-data acceptance)*
- [ ] Three real brand datasets produced defensible PDFs that Vyshag signed off on. *(synthetic smoke tests pass; real data deferred)*
- [x] `pnpm build && pnpm lint && pnpm test` all pass. *(33 tests, 0 errors, 2026-05-09)*
- [-] `npx promptfoo eval` passes on the narrate + draft-dispute suites. *(descoped: template-based for Phase 1, no LLM calls yet)*
- [ ] Per-audit cost on smoke tests confirmed under $30. *(templates → near $0; need production verification)*
- [ ] Admin has processed at least one real deletion request end-to-end.
- [ ] **User confirmation received before starting Phase 2.**

---

## Phase 1.5 — The Wedge Correction (payout-integrity lead)

**Why this phase exists:** A first-principles strategy review (`Baslix-brain/synthesis/the-wedge-correction-2026.md`, 2026-05-30) found a split between strategy and execution. The strategy docs say *"lead with payout integrity; FBA reimbursement is a table-stakes add-on."* The build led with FBA reimbursement — the one bucket Amazon is structurally euthanizing (auto-reimbursement Nov 2024/Jan 2025 + manufacturing-cost basis + the GETIDA/ProfitGuard price war). All three Phase-1 rules (`returns_gap`, `inventory_lost`, `refund_reimbursement_mismatch`) are Bucket 3. This phase re-points the audit at **payout integrity** — the confirmed *recovery* whitespace — by pulling the contract-free checks forward, demoting the reimbursement rules to add-ons, and reframing the messaging.

**What carries over unchanged:** the pipeline, rule registry (pluggable pure-SQL modules), CSV-fixture test harness, PDF/Typst render, report page, admin surface. This is a content swap inside a stable frame, not a rebuild.

**Note on PRD mapping:** the four checks below are largely the PRD's own §5.4–5.6 and §5.8 rules — previously sequenced into Phase 2 as "Bucket 3 expansion." This phase pulls them forward and reframes them as the lead wedge. PRD stays frozen; this re-sequencing is captured here + in the `decisions.md` change log.

**Goal:** The free audit leads with contract-free payout-integrity findings — discrepancies that need only the seller's own reports, are not auto-reimbursed by Amazon, are not commoditized, and produce the "wait, you found *what*?" moment. The three reimbursement rules survive as demoted add-ons.

**Exit gate:** A real $40–90M omnichannel brand's settlement data, run through the audit via a warm intro, surfaces material recoverable dollars in the non-commoditized (payout-integrity) buckets. All four new rules pass Vitest fixture tests. The landing page, narrative, and PDF lead with payout-integrity framing, not "Amazon owes you money."

### 🔬 Research checkpoint (before starting)

- [x] Pull **current Amazon referral-fee category table** — **AUTHORITATIVE (2026-06-01):** fetched Amazon's public pricing page (`sell.amazon.com/pricing`, no login). Verbatim tiered rules: Clothing 5%≤$15 / 10% $15-20 / 17% (3-tier), Jewelry 20%≤$250/5%, Watches 16%≤$1500/3%, Beauty & Baby 8%≤$10/15%, Furniture 15%≤$200/10%, Compact Appliances 15%≤$300/8%, Electronics Accessories 15%≤$100/8%; $0.30/unit min. Encoded in `referral-rates.ts` (progressive 3-tier model, v2026.2). ⚠️ Open gap: production needs a Fee-Preview `product-group`-code → referral-category mapping.
- [x] Pull **current FBA size-tier boundaries + per-tier fulfillment fees** — **Result (2026):** restructured Jan 15 2026 — tiers now Small Standard / Large Standard / Large Bulky / Extra-Large; price-bracket-sensitive; +3.5% fuel surcharge since Apr 17 2026. Representative schedule encoded in `src/lib/rules/reference/fba-fee-schedule.ts`.
- [x] Confirm **Transaction / Settlement report** (v2 flat file) column schema — **Result:** per `(order-id, sku)`, `amount-description='Principal'` = revenue, `='Commission'` = referral fee. Actual % = Commission/Principal. Fully contract-free. New signature `settlement`.
- [x] Verify **FBA Fee Preview** report exposes dimensions + size-tier — **Result:** has `longest-side`, `median-side`, `shortest-side`, `length-and-girth`, `item-package-weight`, `product-size-tier`, `estimated-fee-total`. New signature `fba_fee_preview`.
- [x] Confirm **Storage Fees / Aged-Inventory Surcharge** report schema — **Result:** aged surcharge per SKU + snapshot date; cross-referenced against `inventory_ledger` sales velocity (PRD §5.8). New signature `storage_fees`.
- [x] Decide how reference tables are versioned — **Decision:** versioned SQL `VALUES` CTEs in `src/lib/rules/reference/`, stamped with `reference_version`, embedded per-rule. Encoded as a representative 2026 subset; flagged for verification against Amazon's live schedule before production (same posture as Phase-1 placeholder headers).

### 1.5.1 Ingest surface expansion

**User stories:** US-3.4 · **PRD:** §4.3 · *Pulls the optional-report tiles from Phase 2.1 forward.*

- [x] Add **Transaction / Settlement report** signature to `src/lib/csv/headers.ts` (per-order fee lines)
- [x] Add **FBA Fee Preview** (or Manage FBA Inventory w/ dimensions) signature to `headers.ts`
- [x] Add **Storage / Aged-Inventory Surcharge** report signature to `headers.ts`
- [x] New upload tiles for the above on `src/app/(public)/upload/[id]/page.tsx` + client/server validation — required tiles (settlement, fba_fee_preview) + optional section (returns, inventory_ledger, reimbursements, storage_fees); upload route accepts new types, requires only the lead pair, skips absent optionals
- [ ] Pin each new signature with a `header_signature` hash to detect Amazon format drift (arch §4.2)
- [x] Update which reports are *required* vs *optional* so the lead wedge can run on the new minimum set — required = settlement + fba_fee_preview (referral + size-tier); everything else optional

### 1.5.2 Reference data tables (the long pole)

**Driver:** `Baslix-brain/concepts/payout-integrity.md` · *No PRD section — new supporting asset.*

- [x] Encode **Amazon category referral-rate table** as a versioned reference — `src/lib/rules/reference/referral-rates.ts` (SQL `VALUES` CTE + `REFERRAL_REFERENCE_VERSION` + tiered thresholds + $0.30 min)
- [x] Encode **FBA size-tier → fulfillment-fee schedule** as a versioned reference — `src/lib/rules/reference/fba-fee-schedule.ts` (SQL `VALUES` CTE + `FBA_FEE_REFERENCE_VERSION` + correct-tier expression)
- [ ] Stamp findings with `reference_version` so they're reproducible (CLAUDE.md: every finding carries `rule_id` + `rule_version` + `row_ref`) — *constants exist; flow into finding evidence when rules land*
- [x] Document the refresh procedure (Amazon updates these periodically) — inline in each reference file header (source URLs + "verify before production" + version-bump rule)

### 1.5.3 Payout-integrity detection rules (contract-free checks)

**User stories:** US-5.4, US-5.5, US-5.6 · **PRD:** §5.4, §5.5, §5.6, §5.8 (pulled forward) · **Rules reference:** `.claude/rules/detection-rules.md`

Each rule is: **pure SQL file + registry entry + Vitest CSV fixture + fixture test.**

- [x] `src/lib/rules/return-credit-unapplied.ts` — return credit issued but cost/inventory credit never applied (≈ PRD §5.4). **Test green (3/3).** Values gap at SKU avg price from settlement.
- [x] `src/lib/rules/aged-surcharge-on-sold.ts` — aged-inventory surcharge charged on actively-selling SKUs (≈ PRD §5.8). **Test green (3/3).** Cross-refs surcharge vs 90-day sales velocity.
- [x] `src/lib/rules/referral-fee-mismatch.ts` — referral % charged deviates from the SKU's category rate (≈ PRD §5.6). **Test green (3/3).** Requires `settlement` + `fba_fee_preview`; emits real overcharge as `amount_cents` from SQL.
- [x] `src/lib/rules/size-tier-misclassification.ts` — FBA fee implies a different size tier than the SKU's real dimensions (≈ PRD §5.5). **Test green (3/3).** Recomputes correct tier from dims; fee delta × units.
- [x] Fixture CSV + expected-findings test for each of the four rules — *all 4 in `tests/rules/`, 12 tests green*
- [x] Register in `src/lib/rules/index.ts` with payout-integrity leading — *all 4 registered first; categories: `referral_fee`, `fba_dimension`, `return_credit`, `aged_surcharge`*
- [x] Framework: `runRule`/`helpers` now prefer a SQL-emitted `amount_cents` (payout-integrity rules compute the real recoverable in SQL). Logged in `decisions.md` (2026-06-01).

### 1.5.4 Demote the Bucket-3 reimbursement rules

- [ ] Keep `returns_gap`, `inventory_lost`, `refund_reimbursement_mismatch` in the registry but **demote them out of the lead** — present as secondary add-on findings, not the headline
- [ ] Flag `inventory_lost` specifically — it surfaces the exact category Amazon now auto-reimburses; either gate it behind a freshness note or weight it last so stale "wins" don't undercut credibility with a sharp Controller
- [x] Update report category ordering so payout-integrity buckets render first *(done via Report Killer P0.2 — `report_data.categories` is canonically ordered wedge-first, reimbursement/estimated last; 2026-07-06)*

### 1.5.5 Messaging / positioning re-frame

**Driver:** `Baslix-brain/concepts/baslix-messaging-playbook.md`, `Baslix-brain/concepts/baslix-content-philosophy.md` · **PRD:** §4.1

- [x] Landing page (`src/app/(public)/page.tsx`) — headline now "Your settlement report is lying to you. We'll prove it."; subhead leads with referral/size-tier/credit overcharges; category cards + steps + stats re-pointed to payout integrity. *(Narrative templates + PDF still pending — see below.)*
- [x] Narrative templates (`src/lib/llm/narrate.ts`) + dispute drafts (`src/lib/llm/draft-dispute.ts`) — payout-integrity language; exec summary + methodology reframed; 4 new category narratives + 4 new dispute templates (referral/size-tier as "Fee Dispute", `[SELLER_SIGNATURE]` placeholder per llm.md)
- [x] PDF data-builder + `templates/report.typ` — `CATEGORY_DISPLAY_NAMES` + report-page `CATEGORY_LABELS` gain the 4 payout-integrity categories; PDF subtitle "Forensic FBA Audit Report" → "Settlement Truth Audit"
- [x] Headline stat aligned at **1–3%** (relabeled "Of revenue typically recoverable")
- [ ] Retire the 60-second video placeholder framing if it leads with reimbursement

### 1.5.6 The one test that resolves everything

- [ ] Run the audit on **one real $40–90M omnichannel brand's settlement data via a warm intro**. If it surfaces material recoverable dollars in the payout-integrity buckets → wedge + proof confirmed. If not → that's a real market signal (per the synthesis doc's decisive test).

### 🔒 Phase 1.5 exit gate

- [ ] All four payout-integrity rules pass Vitest fixture tests.
- [ ] Landing + narrative + PDF lead with payout-integrity framing, verified by reading the rendered report.
- [ ] At least one real omnichannel brand dataset run end-to-end, surfacing non-Bucket-3 recoverable dollars.
- [ ] Reference tables (referral rates, FBA fee schedule) are versioned and the refresh procedure is documented.
- [ ] `pnpm build && pnpm lint && pnpm test` all pass, zero regressions on existing rules.
- [ ] **User confirmation received before continuing to Phase 2.**

---

## Phase 2 — Tool maturation (formerly "Full Bucket 3")

> [!warning] RE-SCOPED 2026-06-23 by the wedge correction. The original Phase 2 ("build all 10 Bucket-3 detection rules") is **superseded.** Bucket 3 (FBA reimbursement) is the *declining, commoditized* bucket — building more free-tool Bucket-3 rules is no longer the right next step. Most of the old §2.2 rules (referral, dimension, aged-surcharge, return-credit) were already built in **Phase 1.5 as the payout-integrity wedge**. What genuinely remains here is **operational maturation of the tool** (self-serve delivery, admin analytics, automated deletion) plus at most 1–2 *optional* add-on checks (removal-not-received, inbound-shortage). **The real next company move is not in this plan: it's the paid recovery service** (Bucket 1 chargebacks + fee-accuracy recovery → retainer → full-stack), delivered by ops per [[service-ladder-strategy]] — gated on the decisive real-data test (Phase 1.5 §1.5.6), not on more tool features.

**Goal:** Mature the X-Ray from a manually-reviewed MVP into a self-serve tool: auto-delivery (no manual review), admin funnel analytics + block list, automated deletion. Detection rules are *largely done* (Phase 1.5); only optional add-on checks remain. Do **not** expand the free tool toward "full Bucket 3" — that bucket is demoted.

**Exit gate:** Self-serve delivery runs ≥50 audits without a credibility incident; admin funnel reflects real data; automated deletion processed end-to-end. (The old "detection catalog covers 5.4–5.9 / 300-brand" gate is retired — superseded by the wedge correction.)

### 🔬 Research checkpoint (before starting)

*Most of the original checkpoint is superseded — the referral table, FBA size-tier boundaries/fees, and aged-surcharge logic were all researched and built in Phase 1.5. Only the items for the two remaining optional add-ons and the operational capacity check survive.*

- [x] ~~Amazon referral-fee category table~~ — done in Phase 1.5 (`reference/referral-rates.ts`, authoritative).
- [x] ~~FBA size-tier boundaries + per-tier fees~~ — done in Phase 1.5 (`reference/fba-fee-schedule.ts` + self-calibration).
- [x] ~~LTSF / aged-inventory thresholds~~ — shipped as `aged-surcharge-on-sold.ts` (Phase 1.5).
- [ ] *(optional add-on)* Confirm **inbound-shipment reconciliation window** policy — only if building `inbound-shortage.ts`.
- [ ] *(optional add-on)* Confirm **Removal Order Detail** report schema — only if building `removal-not-received.ts`.
- [ ] Confirm **Supabase Pro tier** capacity covers projected volume (decisions §4 deferred decision).

### 2.1 Extended uploads

**User stories:** US-3.4 · **PRD:** §4.3

- [x] ~~Settlement + FBA Fee Preview tiles~~ — shipped in Phase 1.5 (now the *required* lead pair) + `storage_fees` optional tile; upload route accepts them.
- [ ] Add optional **All Listings Report** tile (`all_listings` signature already in `headers.ts`) — for SKU price/catalog enrichment.
- [ ] Add optional tiles for the two add-on rules' inputs (Removal Order Detail, inbound shipment) — only if building those rules.
- [ ] Optional tile styling + "+$X estimated findings if you add this" messaging
- [ ] Header schemas pinned with `header_signature` hash so we can detect Amazon format drift (arch §4.2) — *still open; flagged in Phase 1.5 too.*
- [ ] Smoke test all 8 reports against one real dataset end-to-end

### 2.2 Detection rules — mostly superseded by Phase 1.5

**User stories:** US-5.4–5.9 · **PRD:** §5.4–5.9 · **Rules reference:** `.claude/rules/detection-rules.md`

Four of the six originally-planned rules shipped in Phase 1.5 as the payout-integrity wedge (different filenames, self-calibrated where relevant):
- [x] `returned-not-resold` (§5.4) → **shipped as `return-credit-unapplied.ts`** (Phase 1.5)
- [x] `dim-overcharge` (§5.5) → **shipped as `size-tier-misclassification.ts`** (Phase 1.5, self-calibrated)
- [x] `referral-category` (§5.6) → **shipped as `referral-fee-mismatch.ts`** (Phase 1.5, real Amazon rates + product-group map)
- [x] `ltsf-active-sku` (§5.8) → **shipped as `aged-surcharge-on-sold.ts`** (Phase 1.5)

Genuinely remaining — *optional add-ons only* (not the lead; build only if a real customer's data shows them worth it):
- [ ] `src/lib/rules/removal-not-received.ts` (PRD §5.7) + tests — needs Removal Order Detail report
- [ ] `src/lib/rules/inbound-shortage.ts` (PRD §5.9) + tests — needs inbound shipment data
- [x] Report category cards + PDF render the payout-integrity categories (done in Phase 1.5)
- [ ] Regenerate sample report PDF for landing page (US-1.3)

### 2.3 Self-serve delivery

**User stories:** (no explicit story — driven by PRD §11 Phase 2)

- [ ] Env flag `AUTO_APPROVE` (decisions §5 anti-decision — simple env var, no vendor)
- [ ] When `AUTO_APPROVE=true`: `notify.email` runs immediately on pipeline completion, skipping review queue
- [ ] Admin review queue becomes optional dashboard (still reachable, not blocking delivery)
- [ ] Add a "spot check" admin filter: sample N% of auto-approved audits for post-hoc review
- [ ] Add an admin kill-switch: one-click flip AUTO_APPROVE back off if a bad batch slips through

### 2.4 Admin analytics

**User stories:** US-9.4, US-9.5 · **PRD:** §8.4, §8.5 · **Arch:** §9.2

- [ ] `src/app/(admin)/admin/funnel/page.tsx` — PostHog embedded dashboard + `audits` aggregates for $ metrics. **⚠ Metric superseded (Report Killer P5.2, 2026-07-07):** "median report value / % > $50k" (PRD §12) is NO LONGER the north star — synthetic magnitudes are generator artifacts and real payout-integrity findings are 1–3% of GMV, 90-day-capped. The gate is "surfaces a specific, verifiable, high-confidence, non-commoditized discrepancy that earns the call." If this page is built, do NOT lead with median $; see the recalibration note now on the admin dashboard + `real-data-asterisks.md` §C.
- [ ] `src/app/(admin)/admin/blocklist/page.tsx` — CRUD + blocked-attempt log
- [ ] PostHog funnel definitions: landing → start → upload → completed → pdf_downloaded
- [ ] PostHog cohort definitions: high-value ($50k+) vs low-value reports

### 2.5 UX polish

**User stories:** US-1.3, US-2.3, US-6.6 · **PRD:** §4.1

- [ ] `src/app/(public)/sample/page.tsx` — anonymized sample report PDF link (US-1.3)
- [ ] Cross-device resume link (US-2.3)
  - [ ] Signed 7-day-TTL link emailed on `audit.started` if no uploads arrive within 10 minutes
  - [ ] Link opens `/upload/[id]` with existing state
- [x] CSV export on report page (US-6.6) — streams as CSV download *(done via Report Killer P2.4, 2026-07-06; deviation from arch §4.3b: reads the `findings` rows from Postgres, not a DuckDB-over-Parquet query — the MVP has no Parquet layer. `GET /api/audit/csv?id=`, one row per finding + a copy-ready dispute message, RFC-4180-escaped, via `src/lib/report/findings-csv.ts`)*

### 2.6 Automated deletion

**User stories:** US-8.3 (Phase 2 automation half) · **Arch:** §10.1

- [ ] Scheduled Trigger.dev task `process.deletion-requests` drains the queue daily
- [ ] Cascade wipe is now automatic (raw CSV if present, Parquet, findings, case_source_rows, PDF, zero PII on audits, status=`deleted`)
- [ ] Admin gets a notification on each auto-processed deletion
- [ ] Verify 7-day SLA from request → completion (US-8.3 AC)

### 2.7 Admin 2FA (if threshold crossed)

- [ ] 🔬 Check cumulative completed audits. If ≥ 50 (decisions §4 trigger), add TOTP to the admin login via Supabase Auth MFA. Otherwise defer.

### 🔒 Phase 2 exit gate

- [ ] All P1-Phase-2 and P2-Phase-2 user stories meet their acceptance criteria.
- [ ] All 9 Phase-1 + Phase-2 detection rules pass Vitest fixture tests.
- [ ] Self-serve delivery has run for ≥ 50 audits without a credibility incident.
- [ ] Admin funnel dashboard reflects real data, not dev fixtures.
- [ ] At least one user-initiated deletion processed automatically end-to-end.
- [ ] **User confirmation received before starting Phase 3.**

---

## Phase 3 — Bucket 2 + growth

**Goal:** The X-Ray becomes the primary acquisition channel for Baslix. Fee anomaly detection ships. SP-API unlocks continuous monitoring. Partnership and whitelabel surfaces open. Contract-vs-Reality v2 is scoped (it is a separate sub-system; the v2 build itself gets its own architecture doc).

**Exit gate:** Phase 3 P3 user stories meet their acceptance criteria, sub-systems scoped in their own design docs as applicable.

### 🔬 Research checkpoint (before starting)

- [ ] Pull **current Amazon SP-API** OAuth (LWA) flow + scopes for read-only report pulls.
- [ ] Pull **SP-API Reports API** schedule + rate limits (daily pulls for the 8 reports we care about).
- [ ] Review **Amazon SP-API TOS** — confirm our use (read-only, user-authorized, no resale of data) is compliant (PRD §13 risk row).
- [ ] Evaluate **AWS KMS / HashiCorp Vault** for storing SP-API refresh tokens (new secret class, bigger blast radius than the Phase-1 secrets).
- [ ] Scope **Contract-vs-Reality** as its own architecture doc before any code.

### 3.1 Fee anomaly detection (§5.10)

**User stories:** US-5.10 · **PRD:** §5.10

- [ ] `src/lib/rules/fee-anomaly.ts` — MoM per-SKU fee delta rule (pure SQL)
- [ ] `tests/rules/fee-anomaly.test.ts`
- [ ] Narrative framing: "this changed silently in [month]" (LLM prompt update)

### 3.2 SP-API continuous monitoring

**User stories:** US-10.1

**⚠️ This is a new sub-system. Write a dedicated `sp-api-architecture.md` before writing code.** Plan items below are scaffolding only.

- [ ] Write `sp-api-architecture.md` covering OAuth flow, token storage, daily ingest job shape, failure model, deletion semantics
- [ ] Decide on incremental ingest strategy (cursor per report type)
- [ ] User-facing OAuth flow page
- [ ] Daily scheduled Trigger.dev task per connected seller
- [ ] Weekly digest email (first time we break the "single email per audit" rule — requires explicit user opt-in at SP-API connection time)
- [ ] Rolling recoverable-balance dashboard (first SaaS-dashboard surface — mark this as an explicit divergence from decisions §1 "no SaaS dashboards" and document the rationale)

### 3.3 Whitelabel / partnerships

**User stories:** US-10.2

- [ ] Revenue-share model defined with legal + finance
- [ ] Partner admin surface (separate from Vyshag's admin)
- [ ] Custom-branding template variables in `report.typ`
- [ ] Bulk audit CSV ingest for agencies with many brands

### 3.4 Contract-vs-Reality v2 (scope only)

**User stories:** US-10.3

- [ ] Write `contract-vs-reality-architecture.md` (LLM contract-term extraction, cross-reference model, discrepancy report structure)
- [ ] Do **not** start the build in Phase 3 unless the architecture is reviewed and approved

### 3.5 Free top-3 disputes offer

**User stories:** US-10.4

- [ ] Admin toggle per audit (visible only on audits ≥ $50k)
- [ ] Manual workflow; not automated
- [ ] Success metric: conversion to paid contract after disputes land

### 🔒 Phase 3 exit gate

- [ ] P3 user stories that shipped meet acceptance criteria.
- [ ] Any deferred P3 stories documented with the trigger for later resurrection.
- [ ] SP-API subsystem has a completed architecture doc (shipped or deferred).
- [ ] Contract-vs-Reality has a completed architecture doc (shipped or deferred).

---

## Cross-phase threads

These don't belong to a single phase — they're continuous discipline across all phases. Listed here so they don't get forgotten.

### Testing discipline

- [ ] Every detection rule ships with a Vitest fixture test before it can merge (CLAUDE.md hard rule).
- [ ] Every new LLM prompt change runs through Promptfoo regression before it can merge.
- [ ] Every API route has at least one happy-path + one error-path test.
- [ ] Every schema migration has a rollback plan documented in the migration file comment.

### Observability discipline

- [ ] Every new pipeline stage writes to `audit_events` with `{ audit_id, stage, status, duration_ms, error_sentry_id? }`.
- [ ] Every new LLM call goes through Helicone; its cost ends up in `cost_events`.
- [ ] Every new PostHog event name is documented in `src/lib/analytics/posthog.ts` (no ad-hoc event names).
- [ ] Sentry `beforeSend` filter is updated every time a new PII-adjacent field enters the error path.

### Privacy discipline

- [ ] Every new data field on any table is reviewed for PII classification + deletion cascade inclusion.
- [ ] Every new external service vendor is checked against decisions §5 anti-decisions (no analytics vendor that sees $ figures, no CRM integrations, etc.).

### Cost discipline

- [ ] Every new LLM call has a per-call token budget documented.
- [ ] Every phase gate checks 7-day avg cost per audit against the PRD §10 target ($6–$16 ideal, $30 hard cap).
- [ ] Circuit breaker (`MAX_COST_PER_AUDIT_CENTS`) is re-evaluated at each phase gate.

---

## Change log

| Date | Change | Trigger |
|---|---|---|
| 2026-07-07 | **Report Killer Phase 6 shipped (funnel consistency — email, processing page, upload privacy)** — `report-killer-plan.md` §4 Phase 6. Stops the surfaces around the report from contradicting it. **P6.2 (highest):** re-heroed `email/templates/report-ready.ts` off the stored `report_data` — leads with the provable-forward monthly run-rate ("Amazon is overbilling {brand} about {$X}/month … it compounds"), mirroring the web hero + its null/zero fallback, with a reconciled surfaced-in-total sub-line and "Settlement Truth Audit" framing; the old "$X Amazon may owe you" is gone. TDD: new `tests/email/report-ready.test.ts` (+6) — no `/owe/i` anywhere, monthly hero + fallbacks, reconciled numbers, sell-the-system + one CTA kept. `notify-email.ts` now feeds it from `report_data` (fallback to summary columns for legacy audits). **P6.1:** added `@trigger.dev/react-hooks@4.4.4`; `run/[id]/page.tsx` replaced the simulated `setInterval` stages with `useRealtimeRun()` — accumulates the worker's real `metadata.stage`/`progress` (no hard-coded stage names, frontend.md); the upload route mints a 1h run-scoped token (`auth.createPublicToken`, since the auto-token expires in 15 min) + returns `{runId, publicAccessToken}`, the upload page stashes them in sessionStorage, and the `/api/audit/status` poll stays the redirect/failure authority + graceful fallback. **P6.3:** promoted the one-line upload privacy footer into a prominent trust block (emphasized "No AI ever sees your rows" + 2×2 of no-login / auto-delete-30d / never-shared-or-trained / delete-anytime). `pnpm build/lint/test` green (170 pass, +6), zero regressions. Live in-browser render of processing/upload pends a deploy (needs the live Trigger.dev run). | Report Killer plan §4 Phase 6 executed in a fresh session; funnel now tells one consistent payout-integrity story. |
| 2026-07-07 | **Report Killer Phase 5 shipped (synthetic validation + real-data asterisk list)** — `report-killer-plan.md` §4 Phase 5. Validation + docs only; no new detection, no `report_data`/schema change. P5.1: new `tests/synthetic-brands-report.test.ts` builds `report_data` exactly as the pipeline does across all four generator profiles (NovaPeak/LuxeNest flat-15%, PureGlow 8%≤$10/15% split, Halcyon flat-8%) and asserts per brand — no object/bigint leak + no `"[object Object]"`; full reconciliation (`assertReportDataConsistent` + Σcategory==total + confidence==findings_count + provable+estimated==total + provable-confidence==provable); sane hierarchy (high-confidence wedge spotlights & leads, `categories[0]` provable with `high_cents>0`, flat-$15 estimated tier fenced strictly below, forward-monthly hero exists, referral `high>0`). Dollar magnitudes deliberately NOT asserted (generator artifacts); Halcyon's deep gate stays in `halcyon-report.test.ts`. Verified: NovaPeak 2,242/$50,733 · LuxeNest 795/$37,542 · PureGlow 2,829/$56,415 · Halcyon 1,289/$64,478, all reconciling. P5.2: success metric recalibrated OFF "median report value $30–75k" (frozen PRD §12/§13) onto "surfaces a specific, verifiable, high-confidence, non-commoditized discrepancy that earns the call" — admin dashboard recalibration note, funnel-page line annotated, `decisions.md` row, `feex-rework` R0.3 checked. P5.3: new **`real-data-asterisks.md`** — the five cross-cutting format-assumption classes + a per-rule table keyed by safe-failure direction (false finding catastrophic, miss safe); every rule file carries a `// REAL-DATA ASTERISK (P5.3):` pointer; `detection-rules.md` references it. +12 tests; `pnpm build/lint/test` green (164 pass), zero regressions. | Report Killer plan §4 Phase 5 executed in a fresh session; awaiting user go-ahead for Phase 6. |
| 2026-07-07 | **Report Killer Phase 4 shipped (Web/PDF parity + light printable aesthetic)** — `report-killer-plan.md` §4 Phase 4. P4.1: `data-builder.ts` now precomputes a `report_data.pdf` view (`PdfView`) with every print-ready string built from the same helpers the web uses (`formatDollars`/`catMeta`/`financeMath`, worked from the same largest-case-per-category), so both PDF renderers reconcile with the web by construction. Discovery: the **Download PDF** button (`/api/audit/pdf`) renders via **react-pdf**, the pipeline (`render.pdf`) is Typst-primary → react-pdf-fallback — so BOTH `templates/report.typ` and `src/lib/pdf/react-pdf-render.tsx` were rewritten to the tiered story off `data.pdf`: provable-forward hero on the cover (Halcyon $230/mo, not the $64,478 total), demoted surfaced sub-line, spotlight (size-tier HA-HDP-001, $9.50−$5.50=$4×229=$916), trust strip, provable dossiers in confidence×punch order (the $47k all-medium giant demoted below the sharp wedges), fenced estimated tier, dispute-ready appendix, sell-the-system close naming the recurring $/mo. P4.2: both PDFs adopt the web's slate palette + `category-meta.ts` accents verbatim (web ↔ PDF one document); light printable-document documented as the locked `frontend.md` exception. P4.3: root `layout.tsx` OG/twitter + report-page `generateMetadata` read "Settlement Truth Audit" (per-brand, `noindex`), never "FBA reimbursement". +7 reconciliation tests (`data-builder.test.ts`); invariant extended (pdf-category-partition==categories). `pnpm build/lint/test` green (149 pass), zero regressions; react-pdf rendered a 53KB PDF on real Halcyon + the pdf-view reconciles (Typst WASM/live render pend deploy). `architecture.md` `report_data` line + `frontend.md` updated. | Report Killer plan §4 Phase 4 executed in a fresh session; awaiting user go-ahead for Phase 5/6. |
| 2026-07-06 | **Report Killer Phase 2 shipped (finding dossiers — depth per finding)** — `report-killer-plan.md` §4 Phase 2. Turned each category card into a dispute-ready 5-part dossier in `CategoryDeepDive`: what happened → evidence rows → **the math, shown** → **how to file it** → **confidence & why**. P2.2: new pure/tested `finding-math.ts` (`financeMath`) renders the per-finding computation for all 6 categories, reconciling to `amount_cents`; `Spotlight` now shares it (single-source wedge math); money shown at 2-decimal so the on-screen subtraction self-reconciles to the penny (whole-dollar rounding made referral read $76−$41=$36). P2.1: `category-meta.ts` gained web-**researched** `filePath`/`disputeWindow`/`confidenceWhy` (fee disputes ~90d + Cubiscan re-measure; reimbursements up to 18mo). P2.3: dispute drafts (previously PDF-only) surfaced copy-ready on the web (`DisputeDraftBlock` + `CopyButton` islands) and per-finding in the CSV. P2.4: added the missing `GET /api/audit/csv` (the report copy referenced a non-existent export) + hero "Export CSV" button, serialized by pure/tested `src/lib/report/findings-csv.ts`. +12 tests (6 `finding-math` + 6 `findings-csv`, incl. a CSV formula-injection guard from the security review); `pnpm build/lint/test` green (113 pass), zero regressions. Halcyon dossiers eyeballed via a real-pipeline-output Artifact preview. | Report Killer plan §4 Phase 2 executed in a fresh session; awaiting user go-ahead for Phase 3/4. |
| 2026-07-06 | **Report Killer Phase 1 shipped (re-hero + hierarchy + visual system)** — the tiered report shape from `report-killer-plan.md` §3. P1.1: the hero is now the **provable-forward monthly run-rate** ($281/mo on Halcyon, high-confidence rolling ÷ settlement months), with `total_recoverable` ($62,760) demoted to a secondary "total surfaced" sub-line — new `report_data` fields `provable_forward_cents`/`provable_forward_monthly_cents`. P1.2: `report_data.spotlight` + new `Spotlight.tsx` feature the sharpest high-confidence wedge with its shown math (Halcyon: size-tier `HA-HDP-001`, $916). P1.3: category ordering changed from `$ desc` to **confidence×punch** (`high_cents` desc, then `$`) so the sharp wedge leads and the $47k all-medium *Credits Never Applied* giant is demoted (inverts D4). P1.4: a how-computed / traceability / confidence-legend trust strip. P1.5: sell-the-system close names the recurring $/mo. P1.6: `RecoveryVisuals` (2 charts) → `ForensicVisuals` (4: forward-bleed area, confidence×punch category bar, confidence×dollars, urgency timeline); the category palette was recolored to a **CVD-validated** set in `category-meta.ts` (old referral-blue↔size-tier-violet collapsed at ΔE 1.7 under deuteranopia). +10 tests (data-builder P1 fields + Halcyon P1 assertions); `pnpm build/lint/test` green (101 pass). Report is light-only by locked §3 Q4. PDF (Typst) hero/visual re-alignment deferred to P4.1 (numbers already reconcile from `report_data`). | Report Killer plan §4 Phase 1 executed in a fresh session; awaiting user go-ahead for Phase 2/3. |
| 2026-07-06 | **Report Killer Phase 0 shipped (credibility foundation)** — the report deliverable rework tracked in `report-killer-plan.md`. P0.1: central `normalizeDuckDBValue` (`src/lib/duckdb/normalize.ts`) kills the `[object Object]`/BigInt-serialization class (D1/D7 — found worse than framed: a `SUM()` beside a temporal column threw on insert). P0.2: `report_data` (`pdf/data-builder.ts`) is now the single source of truth, built from the complete in-memory finding set (not the PostgREST-1000-capped DB round-trip that caused the 1,122-vs-1,000 defect); report page + `CategoryDeepDive` render from it; paginated findings fetch; `assertReportDataConsistent` invariant. P0.3: provable/estimated split — hero shows the provable figure ($53,505 on Halcyon), flat-$15 reimbursement tier fenced below. P0.4: `windowLabel` (never "N/A") + provable-only hero urgency. P0.6: `generate-smoke-data.mjs` emits real product-group codes (`ce`, …) so the referral wedge fires through `product-group-map.ts` (D6 caught in CI). +27 tests (data-builder, normalize, halcyon-report). Halcyon reconciles end-to-end; `pnpm build/lint/test` green. Report-surface parts of Phase 1.5.4 folded in. | Report Killer plan §4 Phase 0 executed in a fresh session; awaiting user go-ahead for Phase 1. |
| 2026-04-18 | Initial plan written | User requested comprehensive phased plan after PRD / architecture / decisions / userstories were frozen |
| 2026-04-18 | Phase 0 research checkpoint completed | All 6 items verified. Corrected Sonnet model ID (`claude-sonnet-4-6` → `claude-sonnet-4-5-20250929`). |
| 2026-04-18 | Phase 0.6, 0.7 descoped; 0.5 deferred | User: "don't overdo observability, CI/CD etc — just care about CX and customer value." Jumped to building CX-facing Phase 1 code. |
| 2026-04-21 | Phase 1 bulk build completed (1.1–1.5 partial, 1.7–1.9 partial) | Built landing, start, upload, pipeline, report, admin review, email. Multiple deviations documented: FormData instead of Uppy/TUS, monolithic parent task instead of child tasks, template-based LLM instead of API calls, `read_csv()` instead of Parquet conversion. See decisions.md change log for rationale. |
| 2026-05-08 | CSV headers migrated to real Amazon formats | "FBA Inventory Adjustments" deprecated; replaced with "Inventory Ledger - Detailed View". Internal key renamed `adjustments` → `inventory_ledger`. DB migration added. All 3 detection rules updated. `status` moved to optional on returns. Optional headers added to reimbursements. All tests pass (21/21). |
| 2026-05-08 | Phase 0.2 service provisioning completed | Supabase, Trigger.dev, Vercel, Resend, Upstash, Anthropic all provisioned. Secrets added to Vercel + Trigger.dev. DNS live at x-ray.baslix.com. Helicone deferred (not using proxy yet). |
| 2026-05-08 | Admin login built with Supabase Auth | `/admin/login` page, `/api/admin/login` (Supabase Auth + admin role check + httpOnly cookie), `/api/admin/logout`, admin nav bar with logout. Replaces cookie-only guard. Admin user `vyshag@baslix.com` seeded with `app_metadata.role = 'admin'`. |
| 2026-05-08 | End-to-end pipeline verified on production | Trigger.dev v20260425.3 deployed. DuckDB `home_directory = '/tmp'` fix for container environments. Test audit completed: 201 findings, $3,015 recoverable. Full flow: upload → detect → narrate → report → admin review → email delivery. |
| 2026-05-08 | Phase 1 hardening: deletion, security, urgency chart, video placeholder, outreach template | Admin cascade-delete endpoint + button. Security: CSP header, Upstash rate limits (domain + IP), DOMPurify sanitizer. Urgency timeline chart on report page (Recharts). Landing page video placeholder. Outreach email templates for Vyshag. All 21 tests pass, build + lint clean. |
| 2026-05-09 | 3 synthetic brand datasets for smoke testing | Built deterministic data generator (`scripts/generate-smoke-data.mjs`) producing 3 brands: NovaPeak Outdoor (801 findings), LuxeNest Home (289 findings), PureGlow Beauty (1663 findings). All 3 detection rules fire on all 3 brands. 33 tests pass (12 smoke + 21 unit). Real Amazon data deferred — synthetic data validated rule coverage, edge cases, and cross-report matching. |
| 2026-06-23 | **Pre-real-data fixes + Phase 2 re-scope** | (1) **Product-group mapping** — new `reference/product-group-map.ts` bridges Fee Preview product-group codes (e.g. `ce`) → referral categories, with conservative fallback to Everything Else (a mapping miss can only *miss* an overcharge, never falsely flag one). Referral rule + test updated (code path proven). (2) **Self-calibrated fees** — `size-tier-misclassification` (v1.1.0) now computes the recovery from the SKU's *actual* charged fee vs the median fee of correctly-classified SKUs in the correct tier (from the seller's own data); the hardcoded schedule is only a fallback. Removes the placeholder-fee dependency on real data. (3) **Urgency reframe** — rolling overcharges (referral/size-tier, no dispute window) now show a "recurring overcharge — keeps accruing every month" line on the report + in the narrative, instead of a countdown. (4) **Phase 2 re-scoped** — "Full Bucket 3" demoted; 4 of its 6 rules already shipped in 1.5; real next move is the paid recovery service, not more free-tool rules. 66 tests pass. |
| 2026-06-23 | **Demo hero brand "Halcyon Audio" + report/PDF/dispute wording reframed** | Whole journey now tells one story: report exec-summary/methodology, PDF subtitle ("Settlement Truth Audit"), category labels, and 4 new dispute templates all reframed from reimbursement to payout integrity. Added a demo-ready synthetic brand (Consumer Electronics, real 8% referral rate → overcharges show as the default 15%) for the LinkedIn video; bumped synthetic settlement to realistic per-SKU order volume (40–160), and added return-credit-back events (~78% of sellable returns credited) so return_credit isn't artificially inflated. Halcyon totals: **~$53.5k recoverable** — referral $3,094 / size-tier $2,958 / return-credit $47,255 / aged $199 (+ reimbursement add-ons). **This is DEMO data (safe to show), NOT the real-store validation (1.5.6 still open).** 65 tests pass, lint + build clean. |
| 2026-06-01 | **Phase 1.5 surfacing (Road A): payout-integrity story + new upload reports live** | Referral table populated from Amazon's **public** pricing page (authoritative, v2026.2, 3-tier model). Landing page re-pointed: headline "Your settlement report is lying to you. We'll prove it.", subhead + category cards + steps + stats reframed from reimbursement to fee/payout overcharges. Upload page now shows required tiles (settlement, fba_fee_preview) + an optional section (returns, inventory_ledger, reimbursements, storage_fees); upload route requires only the lead pair and accepts/skips optionals; pipeline already runs whichever rules have their reports. FBA fee dollar grid still representative (resolves via self-calibration from real seller data — no Seller Central account available). Tests 57/57, lint clean. **Still open in 1.5:** narrative/PDF re-frame (1.5.4/1.5.5 server side), the one real-data test (1.5.6). |
| 2026-06-01 | **Phase 1.5 core built: research + reference tables + 4 rules + synthetic data** | Research checkpoint complete (2026 referral table, Jan-2026 FBA size-tier restructure, Settlement V2 / Fee Preview / Aged-Surcharge schemas). Shipped: `reference/referral-rates.ts` + `reference/fba-fee-schedule.ts` (versioned `VALUES` CTEs); 3 new report signatures in `headers.ts`; `run-rule.ts`/`helpers.ts` now accept a SQL-emitted `amount_cents`; 4 payout-integrity rules (`referral_fee_mismatch`, `size_tier_misclassification`, `return_credit_unapplied`, `aged_surcharge_on_sold`) each with a green fixture test (12 tests); smoke generator extended to emit all 3 new reports with planted discrepancies — all 4 rules fire on all 3 brands. Reimbursement rules demoted in the registry. 57 tests pass, lint clean. **Still open in 1.5:** upload tiles for the new reports (1.5.1), report/narrative demotion ordering (1.5.4), messaging re-frame (1.5.5), the one real-data test (1.5.6). |
| 2026-06-01 | **Phase 1.5 (The Wedge Correction) inserted; Phase 2/3 re-sequenced** | First-principles strategy review (`Baslix-brain/synthesis/the-wedge-correction-2026.md`, 2026-05-30) found execution led with FBA reimbursement (Bucket 3 — structurally dying: Amazon auto-reimbursement + manufacturing-cost basis + GETIDA/ProfitGuard price war), while strategy says lead with payout integrity (Bucket 2, confirmed recovery whitespace). New Phase 1.5 pulls the four contract-free payout-integrity checks forward (≈ PRD §5.4–5.6, §5.8), demotes the three reimbursement rules to add-ons, expands the ingest surface (settlement/transaction, FBA fee preview w/ dimensions, storage-surcharge reports), adds versioned reference tables (referral rates, FBA fee schedule), and reframes messaging to "your settlement report is lying to you." Bucket 3 reframed as table-stakes add-on, not the lead. Estimated ~1 week; architecture/pipeline unchanged. PRD frozen — re-sequencing also to be logged in `decisions.md`. |
