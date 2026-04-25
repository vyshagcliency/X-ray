# Baslix Leakage X-Ray — Build Plan

**Version:** 1.0
**Companion to:** prd.md, userstories.md, architecture.md, decisions.md
**Status:** Active
**Last updated:** 2026-04-25

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
| **2** | Full Bucket 3 | 6 weeks | All 10 core detection rules, self-serve delivery, admin funnel, block list, user-initiated deletion automation |
| **3** | Bucket 2 + growth | 3–6 months | Fee anomaly rule, SP-API continuous monitoring, whitelabel partnerships, Contract-vs-Reality v2, free-disputes conversion lever |

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
- [ ] Commit and push initial scaffold

### 0.2 External service provisioning

*Manual step — Vyshag provisions these before first real deploy.*

- [ ] Create Supabase project (Pro tier or Free to start)
- [ ] Create Trigger.dev v4 project
- [ ] Create Vercel project, link to repo
- [ ] Create Resend account + verify sending domain
- [ ] Create Upstash Redis database (free tier)
- [ ] Create Anthropic API key
- [ ] Create Helicone project, grab proxy URL + key
- [-] Create Sentry project (descoped: MVP focus on CX, add post-launch)
- [-] Create PostHog Cloud EU project (descoped: MVP focus on CX, add post-launch)
- [ ] Purchase / confirm `xray.baslix.com` DNS
- [ ] Add all secrets to Vercel + Trigger.dev env (never `NEXT_PUBLIC_*`)

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
- [ ] Migration: seed Vyshag's admin user with `role: 'admin'` app_metadata claim
- [ ] `pnpm db:types` regenerates TypeScript types into `src/types/supabase.ts`

### 0.5 Security baseline (deferred — add before public launch)

**Reference:** `.claude/rules/security.md`

*Descoped from Phase 0 per user direction ("don't overdo, just care about CX"). Will add before first real users.*

- [ ] `src/lib/security/nosecone.ts` — CSP per arch §10.5 (include `wasm-unsafe-eval` for Typst) *(deferred: add before public launch)*
- [ ] `src/lib/security/rate-limit.ts` — Upstash wrappers for the three limits in arch §10.4 *(deferred: add before public launch)*
- [ ] `src/lib/security/dompurify.ts` — isomorphic DOMPurify config *(deferred: add before public launch)*
- [x] `src/middleware.ts` — admin route guard (cookie-based for MVP; will upgrade to Supabase Auth JWT verification) + security headers (X-Frame-Options, HSTS, nosniff, referrer-policy, permissions-policy)
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
- [ ] Preview deploy URL boots, `/api/health` returns green for all services. *(blocked on 0.2 service provisioning)*
- [ ] Migrations applied, DB types generated, RLS verified.
- [-] Sentry + PostHog + Helicone each received at least one event. *(descoped for MVP)*
- [x] **User confirmed skipping Phase 0 ceremony and jumping to Phase 1 CX.** *(2026-04-18)*

---

## Phase 1 — MVP ship

**Goal:** 50 brands can upload 3 CSVs, wait 3–8 minutes, and get a PDF report. Vyshag reviews each one manually via `/admin/review/:id` before the user receives the email. Three detection rules live: returns gap, inventory lost/damaged, refund/reimbursement mismatch.

**Exit gate:** End-to-end test with 3 real brand datasets produces defensible PDFs. All P0-Phase-1 user stories pass their acceptance criteria. Per-audit cost stays under $30. Vyshag has approved and sent ≥3 real reports through the manual review queue.

### 🔬 Research checkpoint (before starting)

*Partially deferred — jumped to building CX-facing code per user direction. Headers need verification against real Amazon data before launch.*

- [~] Pull **current Amazon Seller Central report formats** — placeholder headers written in `src/lib/csv/headers.ts`; need verification against real CSVs before launch.
- [ ] Confirm **Anthropic prompt caching** API shape (deferred: template-based narrative for now)
- [ ] Confirm **Vercel AI SDK v5+** shape (deferred: template-based narrative for now)
- [ ] Confirm **Typst syntax + `@myriaddreamin/typst.ts`** embed API (deferred: PDF rendering not yet built)
- [-] Confirm **Uppy Dashboard** + `@uppy/tus` plugin (descoped: using simpler FormData upload for MVP — see decisions.md)
- [ ] Confirm **Supabase signed upload URLs** (using service-role direct upload for now)

### 1.1 Public intake — landing + start form

**User stories:** US-1.1, US-1.2, US-2.1, US-2.2 · **PRD:** §4.1, §4.2

- [x] `src/app/(public)/page.tsx` — landing page
  - [x] Hero with headline, subhead, trust line (PRD §4.1)
  - [ ] 60-second screen recording embed (placeholder video OK until Phase 1.11)
  - [x] Three anonymized sample finding cards
  - [x] "About Baslix" block (US-1.2)
  - [x] Footer with privacy policy + terms links
- [x] `src/app/(public)/start/page.tsx` — email + brand form
  - [x] Zod-validated form (email, brand_name, legal_checkbox) via server action *(deviation: useActionState instead of React Hook Form — simpler for this form)*
  - [x] Disposable email domain rejection (US-2.2)
  - [x] Block-list check against `block_list` table (US-2.2)
  - [ ] Rate limit: 5/domain/30d + 10/IP/day (arch §10.4) *(deferred to 0.5 security baseline)*
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
- [x] `src/app/(public)/upload/[id]/page.tsx` — page with 3 tiles for Returns, Adjustments, Reimbursements
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
  - [x] Animated stage labels (cycling every 15s) *(deviation: not `useRealtimeRun()` — uses polling via `/api/audit/status` every 5s; simpler, no Trigger.dev React hooks dependency)*
  - [x] Elapsed timer
  - [x] Auto-switch to "we'll email you" after 10 minutes (US-4.2)
  - [x] On failure: show actionable error + re-upload path (US-4.3) *(alert icon, explanation, "Start a new audit" button, support email with audit ID)*
- [x] `src/app/(public)/r/[uuid]/page.tsx` — report page served from DB
  - [x] Headline strip (total, urgent, cases)
  - [x] Executive summary (from `report_data.narrative`)
  - [x] Category cards with confidence badges
  - [ ] Urgency timeline (Recharts) *(deferred)*
  - [x] Top 10 cases table with badges
  - [x] Methodology section (from `report_data.narrative`)
  - [x] CTA block ("Filing N disputes is a 60-80 hour job...")
  - [x] Download PDF button (links to `/api/audit/pdf`)
- [x] Report URL valid indefinitely until deletion
- [-] PostHog events (descoped for MVP)

### 1.8 Email delivery

**User stories:** US-6.4 · **PRD:** §4.6 · **Arch:** §5

- [x] `src/lib/email/templates/report-ready.ts` — plain HTML email template *(deviation: plain HTML string, not React Email component — simpler for MVP)*
- [x] `src/lib/email/send.ts` — Resend client wrapper (raw fetch to Resend API)
- [x] `src/trigger/notify-email.ts` — sends email after admin approval, checks audit is `completed`
- [x] In Phase 1, `notify-email` runs **only** after admin approval

### 1.9 Admin (Phase 1)

**User stories:** US-9.1, US-9.2, US-9.3, US-9.6, US-9.7 · **PRD:** §8 · **Arch:** §9

*All admin pages built. Auth middleware uses cookie-based guard for MVP. Supabase Auth password flow deferred until service provisioned.*

- [~] Supabase Auth password flow *(deferred: needs Supabase project provisioned)*; [x] admin middleware guard *(cookie-based for MVP, security headers applied)*
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
- [ ] `src/app/(admin)/admin/audits/[id]/page.tsx` includes a "Process deletion" action in Phase 1 — cascade wipes raw CSV (if present), Parquet, `findings`, `case_source_rows`, `reports/{audit_id}.pdf`, zeros PII on `audits`, sets status `deleted` (arch §10.1)
- [x] Privacy language on `/start` + `/upload` + privacy policy matches arch §4.3 (Parquet retention explicitly disclosed on both pages)

### 1.11 Hardening + launch readiness

- [ ] Smoke test with **3 real brand datasets** provided by Vyshag (PRD §11 Phase 1 step 14)
- [ ] Tune detection rule thresholds based on smoke test findings (update rule versions, preserve old versions for reproducibility per US-9.7)
- [ ] Manually inspect each PDF — typography, page breaks, forwardability test ("would a CFO read this?")
- [ ] Verify cost per audit on all three smoke datasets is under $30
- [ ] Final landing page polish: shoot the real 60-second screen recording, replace placeholder
- [x] Confirm `sitemap.xml` and `robots.txt` are correct
- [ ] Confirm TLS 1.3, HSTS, CSP headers via `securityheaders.com` against the production domain
- [ ] Load test: 10 concurrent audits don't trip cost circuit breaker or Trigger.dev concurrency limits
- [ ] Write the internal launch announcement / outreach template for Vyshag

### 🔒 Phase 1 exit gate

- [ ] All P0-Phase-1 user stories meet their acceptance criteria (see `userstories.md` Story Map Summary).
- [ ] Three real brand datasets produced defensible PDFs that Vyshag signed off on.
- [ ] `pnpm build && pnpm lint && pnpm test` all pass.
- [ ] `npx promptfoo eval` passes on the narrate + draft-dispute suites.
- [ ] Per-audit cost on smoke tests confirmed under $30.
- [ ] Admin has processed at least one real deletion request end-to-end.
- [ ] **User confirmation received before starting Phase 2.**

---

## Phase 2 — Full Bucket 3

**Goal:** Self-serve delivery (no more manual review), all 10 Bucket-3 detection rules live, optional reports unlock deeper findings, admin gets funnel analytics + block list, user-initiated deletion is automated.

**Exit gate:** Phase 2 P1/P2 user stories pass. 300-brand target from PRD §11 Phase 2 is achievable. Detection rule catalog covers 5.4–5.9. Self-serve feature flag flipped without incident.

### 🔬 Research checkpoint (before starting)

- [ ] Pull **current Amazon referral-fee category table** — fee percentages by category (rule 5.5 depends on this; Amazon updates periodically).
- [ ] Pull **current FBA size-tier boundaries** and per-tier fulfillment fees (rule 5.4 depends on this).
- [ ] Pull **current 9-month inbound-shipment reconciliation window** policy (rule 5.8).
- [ ] Confirm **LTSF (long-term storage fee)** policy — aged-inventory thresholds (rule 5.9).
- [ ] Confirm **Removal Order Detail** report column schema (rule 5.6).
- [ ] Verify **Manage FBA Inventory** report now includes dimensions column (required for rule 5.4).
- [ ] Confirm **Supabase Pro tier** capacity covers projected volume (decisions §4 deferred decision).

### 2.1 Extended uploads

**User stories:** US-3.4 · **PRD:** §4.3

- [ ] Add 4th required CSV tile: **All Listings Report** — headers in `src/lib/csv/headers.ts`
- [ ] Add 4 optional CSV tiles: Settlement, FBA Fee Preview, Removal Order Detail, Manage FBA Inventory
- [ ] Optional tile styling + "+$X estimated findings if you add this" messaging
- [ ] `parse-csv` task handles the new report types; Parquet schemas added (arch §4.3)
- [ ] Header schemas pinned with `header_signature` hash so we can detect Amazon format drift (arch §4.2)
- [ ] Smoke test all 8 reports against one real dataset end-to-end

### 2.2 Detection rules — expansion

**User stories:** US-5.4, US-5.5, US-5.6, US-5.7, US-5.8, US-5.9 · **PRD:** §5.4–5.9 · **Rules reference:** `.claude/rules/detection-rules.md`

Each rule is: **pure SQL file + registry entry + Vitest fixture + fixture test.**

- [ ] `src/lib/rules/returned-not-resold.ts` (PRD §5.4) + tests
- [ ] `src/lib/rules/dim-overcharge.ts` (PRD §5.5) + tests — the headline Phase 2 feature per PRD §11
- [ ] `src/lib/rules/referral-category.ts` (PRD §5.6) + tests
- [ ] `src/lib/rules/removal-not-received.ts` (PRD §5.7) + tests
- [ ] `src/lib/rules/ltsf-active-sku.ts` (PRD §5.8) + tests
- [ ] `src/lib/rules/inbound-shortage.ts` (PRD §5.9) + tests
- [ ] Update report category cards to include the new rule categories
- [ ] Update PDF template to render the expanded findings
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

- [ ] `src/app/(admin)/admin/funnel/page.tsx` — PostHog embedded dashboard + `audits` aggregates for $ metrics (median report value, % > $50k per PRD §12)
- [ ] `src/app/(admin)/admin/blocklist/page.tsx` — CRUD + blocked-attempt log
- [ ] PostHog funnel definitions: landing → start → upload → completed → pdf_downloaded
- [ ] PostHog cohort definitions: high-value ($50k+) vs low-value reports

### 2.5 UX polish

**User stories:** US-1.3, US-2.3, US-6.6 · **PRD:** §4.1

- [ ] `src/app/(public)/sample/page.tsx` — anonymized sample report PDF link (US-1.3)
- [ ] Cross-device resume link (US-2.3)
  - [ ] Signed 7-day-TTL link emailed on `audit.started` if no uploads arrive within 10 minutes
  - [ ] Link opens `/upload/[id]` with existing state
- [ ] CSV export on report page (US-6.6) — just-in-time DuckDB query over Parquet (arch §4.3b), streams as CSV download

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
| 2026-04-18 | Initial plan written | User requested comprehensive phased plan after PRD / architecture / decisions / userstories were frozen |
| 2026-04-18 | Phase 0 research checkpoint completed | All 6 items verified. Corrected Sonnet model ID (`claude-sonnet-4-6` → `claude-sonnet-4-5-20250929`). |
| 2026-04-18 | Phase 0.6, 0.7 descoped; 0.5 deferred | User: "don't overdo observability, CI/CD etc — just care about CX and customer value." Jumped to building CX-facing Phase 1 code. |
| 2026-04-21 | Phase 1 bulk build completed (1.1–1.5 partial, 1.7–1.9 partial) | Built landing, start, upload, pipeline, report, admin review, email. Multiple deviations documented: FormData instead of Uppy/TUS, monolithic parent task instead of child tasks, template-based LLM instead of API calls, `read_csv()` instead of Parquet conversion. See decisions.md change log for rationale. |
