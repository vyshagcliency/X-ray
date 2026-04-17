# Baslix Leakage X-Ray — Architecture

**Version:** 1.0
**Companion to:** prd.md, userstories.md
**Status:** Draft for build
**Last updated:** April 2026

---

## 0. How to read this document

This is the engineering blueprint for the tool described in `prd.md`. It locks the **stack**, the **system shape**, the **data model**, the **pipeline**, and the **security model**. Every choice below has a rationale. Where a choice is non-obvious, the alternative we rejected is stated so we don't re-debate it later.

A companion file `decisions.md` captures the one-line "locked" version of each choice. If you find yourself disagreeing with something here, update `decisions.md` with the new evidence — do not silently deviate.

---

## 1. System at a glance

```
┌───────────────────────────────────────────────────────────────────────┐
│                             Public surface                             │
│                                                                        │
│  xray.baslix.com                                                       │
│  ├── /           landing                                                │
│  ├── /start      email + brand capture                                  │
│  ├── /upload     4 required + 4 optional CSVs (TUS resumable)           │
│  ├── /run/:id    processing (live stream from Trigger.dev)              │
│  └── /r/:uuid    report (in-browser dashboard + PDF download)           │
└───────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────────┐
│                           Next.js app (Vercel)                         │
│                                                                        │
│  - Server actions & API routes (thin — validation + enqueue only)       │
│  - Streams realtime progress from Trigger.dev                           │
│  - Renders report page from DB rows (not the LLM, not recomputed)       │
└───────────────────────────────────────────────────────────────────────┘
                      │                         │
          (enqueue)   │                         │  (read)
                      ▼                         ▼
┌───────────────────────────────┐   ┌──────────────────────────────────┐
│   Trigger.dev v4 workers      │   │   Supabase (Postgres + Storage)   │
│                               │   │                                   │
│  audit.run (parent)           │   │   raw_uploads (30-day TTL)         │
│   ├── validate.csv  ×N        │◄──┤   normalized_* tables              │
│   ├── parse.csv     ×N        │──►│   findings                         │
│   ├── detect.rule   ×M        │   │   audits, audit_events             │
│   ├── narrate.llm             │   │   reports (PDF in Storage)         │
│   ├── render.pdf              │   │   cost_events                      │
│   └── notify.email            │   │   rule_versions, block_list        │
└───────────────────────────────┘   └──────────────────────────────────┘
                      │
                      ▼
┌───────────────────────────────────────────────────────────────────────┐
│                            External services                           │
│                                                                        │
│  Anthropic Claude (narrative + draft disputes only, never arithmetic)   │
│  Helicone (LLM proxy — cost tracking, caching, observability)           │
│  Resend (single transactional email — report delivery)                  │
│  Upstash Redis (rate limiting only)                                     │
└───────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    Admin (internal, not indexed)                       │
│                                                                        │
│  xray.baslix.com/admin  (Supabase Auth — single user: Vyshag)           │
│  ├── /admin/audits           list + search + open any report            │
│  ├── /admin/review/:id       manual approval queue (Phase 1)            │
│  ├── /admin/cost             per-audit cost, rolling avg, flags         │
│  ├── /admin/funnel           step conversion, median report value       │
│  ├── /admin/blocklist        domain block management                    │
│  └── /admin/failures         failed audits + raw uploads (<30d)         │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 2. Stack — final choices

| Layer | Choice | Why | Rejected |
|---|---|---|---|
| Framework | **Next.js 15 (App Router)** on Vercel | Same as ChannelScope. Server actions + streaming are the fit for progress UI. | Remix, SvelteKit — no second-order reason to switch. |
| Language | **TypeScript, strict** | Non-negotiable for financial calcs. | JS. |
| Package manager | **pnpm** | Monorepo-ready, disk-efficient. | npm, yarn. |
| Database | **Supabase Postgres** | We need persistence (audits outlive the request). Managed Postgres with row-level security, a generous free tier, and built-in Storage + Auth in the same project. | Neon (no Storage), PlanetScale (no Postgres-grade JSON, no RLS), self-hosted (overkill). |
| Object storage | **Supabase Storage v3** | Same project as DB. **Supports 50GB uploads with resumable TUS protocol, 6MB chunks.** Signed URLs for per-report isolation. | S3 direct (no TUS without writing our own), R2 (extra vendor, no native resumable). |
| Resumable upload | **Uppy Dashboard + tus-js-client → Supabase Storage `/upload/resumable` endpoint** | Proven TUS client with pause/resume, chunk retry, drag-drop, progress. Supabase Storage v3 speaks TUS natively. | Raw `fetch` POST — dies on 150MB CSV + flaky Wi-Fi. Filestack/Uploadcare — vendor lock and cost. |
| CSV parsing (client validation) | **PapaParse, `preview: 50`** | Sniff headers + first 50 rows client-side before upload. Reject wrong reports before they cost server compute. | Manual `split('\n')` — handles quoted commas wrong. |
| CSV → Parquet conversion | **DuckDB (`@duckdb/node-api`) inside `parse.csv` task** | DuckDB streams CSV → writes columnar Parquet in one pass. Parquet is 10–20× smaller than CSV and DuckDB reads it 10–100× faster. | PapaParse-only pipeline — forces a second pass + ORM-style inserts. |
| Analytics engine (detection rules) | **DuckDB (in-process, serverless)** | Every detection rule is pure SQL against the Parquet files. DuckDB runs in-process in Node — no server, no port. 1TB TPC-H in ~30s on a laptop; our audits are ~150MB total. Cross-CSV joins (Returns ⨝ Reimbursements ⨝ Adjustments) become 15-line SQL, not 150-line TypeScript. | Postgres for detection (slow on cross-CSV analytics + inserts are wasted work), Python+pandas (not our language), hand-rolled JS joins (error-prone, unreviewable). |
| Background jobs | **Trigger.dev v4** | Same as ChannelScope. v4 adds `triggerAndWait` and `batchTriggerAndWait` for parent→child orchestration with back-pressure. Warm starts ~100-300ms. Native realtime streams for progress UI. | Inngest (fine, but v4's parent-child API fits pipeline shape better), raw queue (we'd rewrite Trigger.dev). |
| LLM | **Anthropic Claude (`claude-sonnet-4-6` default, `claude-haiku-4-5-20251001` for summaries)** via **Vercel AI SDK** | Narrative only — never arithmetic. Sonnet for the main pattern-finding prose. Haiku for per-case dispute drafts (cost/latency). Prompt caching cuts ~70% of repeated system-prompt cost. | GPT — no benefit for our workload, cost same order. Opus 4.7 — latency + cost not worth it for narrative. |
| LLM proxy | **Helicone** | Per-audit cost attribution, request logging, cache layer. Powers the admin cost page without our own infra. | Raw API — we'd rebuild cost tracking. |
| LLM prompt testing | **Promptfoo** | Same as ChannelScope. Regression tests on synthetic finding sets so narrative quality doesn't drift. | — |
| PDF generation | **Typst via `@myriaddreamin/typst.ts` (WASM) as primary**, **`@react-pdf/renderer` as fallback** | Typst: Rust-based, compiles beautiful typography in milliseconds. WASM means no Rust toolchain on Vercel. React-PDF is declarative and widely battle-tested if Typst runtime turns out flaky on serverless. | Puppeteer (cold start + Chromium binary size on Vercel is painful), LaTeX (same), PDFKit (ugly). |
| Email | **Resend + React Email** | Single transactional email. 3k/mo free, $20/mo paid tier has plenty of headroom. React Email templates live in the same repo. | SES (setup cost), Postmark (fine alternative, Resend just cleaner DX). |
| Auth (admin only) | **Supabase Auth — password** | Single-user admin; email+password sufficient. No OAuth complexity. Works naturally with Supabase RLS (admin role bypasses row policies via `service_role` server-side, standard user policies for read-only). | Clerk — overkill, extra bill. NextAuth — more code to wire. |
| Rate limiting | **Upstash Redis + @upstash/ratelimit** | Same as ChannelScope. Sliding window, edge-compatible. | In-memory — breaks on multi-region. |
| Validation | **Zod v4** | Same as ChannelScope. Report-header schemas, form inputs, API contracts. | Yup, io-ts. |
| Env | **T3 Env (`@t3-oss/env-nextjs`)** | Compile-time env validation, server vs client split. | Raw `process.env` — runtime error risk. |
| Server actions | **next-safe-action** | Type-safe, zod-validated, middleware-friendly. | Raw actions. |
| Forms | **React Hook Form + @hookform/resolvers/zod** | Standard. | Formik. |
| Styling | **Tailwind CSS v4 + @tailwindcss/typography** | Same as ChannelScope. | — |
| UI kit | **shadcn/ui (New York)** + **Launch UI** blocks for landing | Same as ChannelScope. Copy-paste, own the source. | MUI, Mantine. |
| Animation | **Motion (Framer Motion)**, sparingly | Same as ChannelScope. | — |
| Charts | **shadcn/ui chart (Recharts)** | Urgency timeline + category donut in the report. | D3 direct — overkill for 4 charts. |
| Markdown → HTML | **react-markdown + remark-gfm** | LLM prose → rendered safely. | — |
| Sanitization | **isomorphic-dompurify** | Any LLM output rendered as HTML passes through this. | — |
| Security headers | **Nosecone** | Same as ChannelScope. CSP + HSTS + Permissions-Policy. | — |
| Concurrency | **p-limit** | Cap parallel detection workers + LLM calls per audit. | — |
| Testing | **Vitest** | Every detection rule has a unit test with synthetic input → expected findings (US-4.5). | — |
| Error tracking | **Sentry** | Native Next.js + Trigger.dev integration (Trigger publishes an official guide). Source-mapped stack traces across browser + server + worker. | Axiom (log-mgmt focused, weak on errors), Rollbar (dated). |
| Product analytics | **PostHog (Cloud EU)** | Funnels, cohorts, retention, session replay, feature flags — all free up to 1M events/mo (covers us through ~5k audits/mo). Replaces hand-rolled admin funnel page. Event-compatible with `audit_events` table for dual-write observability. | Plausible (no funnels), Mixpanel (paid), hand-rolled (reinventing). |
| Linting | **ESLint v9 flat + Prettier** | — | — |
| Deployment | **Vercel Hobby** for Next.js; **Trigger.dev Cloud** for workers; **Supabase Cloud** | Zero-ops. | Self-host — no. |

---

## 3. What carries over vs. what is new

### Carries over from ChannelScope (no re-evaluation)

- Next.js 15 App Router, TypeScript strict, pnpm
- Tailwind v4 + shadcn/ui (New York) + Launch UI + Motion
- Zod v4 + T3 Env + next-safe-action + React Hook Form
- Trigger.dev v4 for background work, realtime streams for progress
- Vercel AI SDK + Claude + prompt caching + Helicone
- Promptfoo for LLM regression tests
- Upstash Redis for rate limiting
- Nosecone headers + isomorphic-dompurify
- react-markdown + remark-gfm for LLM prose rendering
- Vitest test harness
- ESLint v9 flat + Prettier
- Monetary values as **cents integers** everywhere, format at display boundary
- **LLM narrates, never calculates** (this is the architectural contract)

### New for X-Ray (not in ChannelScope)

| New thing | Why X-Ray needs it |
|---|---|
| **DuckDB (`@duckdb/node-api`)** | **The detection engine.** In-process analytics over Parquet, pure SQL rules, zero infra. Replaces the naive "parse CSV into Postgres, query Postgres" pipeline that would have dominated compute and been slow to write. |
| **Parquet (output of `parse.csv`)** | Columnar, ~10–20× smaller than CSV, read 10–100× faster by DuckDB. The canonical working-set format for detection + re-runs. |
| **Supabase Postgres** | X-Ray is stateful — audits, findings, and admin analytics persist. Stores **outputs** (findings, audit state, costs) not raw working data. |
| **Supabase Storage + TUS** | 4–8 CSVs per audit, up to 200MB each. Also hosts the derived Parquet files and final PDFs. |
| **Uppy Dashboard + tus-js-client** | Resumable upload UX on big files (US-3.3). |
| **Supabase Auth** | Admin page gating. |
| **Typst (PDF)** | Primary report artifact is a PDF (US-6.2). |
| **@react-pdf/renderer** (fallback) | Insurance against Typst runtime surprises on Vercel. |
| **Resend + React Email** | Single transactional delivery email (US-6.4). |
| **@trigger.dev/sdk v4 parent-child tasks** | Multi-stage pipeline with per-stage retry. |
| **Sentry** | Error tracking across Next.js + Trigger.dev. |
| **PostHog** | Funnel, cohort, retention analytics on top of `audit_events`. Replaces hand-rolled admin funnel. |
| **Per-audit cost ledger table** | Admin cost monitoring (US-9.3). |

### Dropped from ChannelScope (not needed in X-Ray)

- Easyparser client, Shopify `/products.json` client, string-similarity, p-queue-based cross-channel matching
- ChannelScope's `splice-briefing.ts` (single-shot report, not two-phase)
- The "two-phase Step 1 → CSV → Step 2" orchestration — X-Ray is linear

---

## 4. Data model

All tables use `uuid` PKs, `created_at timestamptz default now()`, `updated_at` via trigger. Monetary columns are `bigint` (cents). No floats on anything financial.

### 4.1 `audits` — the spine

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` pk | Also used as the `/r/:uuid` report slug. |
| `brand_name` | `text` | From form. |
| `email` | `text` | Lowercased on write. |
| `email_domain` | `text generated always as (split_part(email,'@',2)) stored` | For rate-limit + block-list joins. |
| `status` | `audit_status enum` | `pending_upload` → `processing` → `pending_review` → `completed` · `failed` · `deleted`. |
| `trigger_run_id` | `text` | Trigger.dev run ID for the parent task. |
| `total_recoverable_cents` | `bigint` | Sum of high-confidence findings. |
| `urgent_recoverable_cents` | `bigint` | Subset with window ≤14 days. |
| `findings_count` | `int` | |
| `report_version` | `int default 1` | Bumped if the audit is re-run after a rule fix. |
| `rule_versions` | `jsonb` | `{ "returns_gap": "1.2.0", ... }` — every rule's semver at run time. |
| `ip` | `inet` | For rate limiting. Purged with raw uploads at 30 days. |
| `ua` | `text` | Same. |
| `completed_at` | `timestamptz` | |

### 4.2 `raw_uploads` — auto-purged

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` pk | |
| `audit_id` | `uuid` fk | |
| `report_type` | `report_type enum` | `returns`, `adjustments`, `reimbursements`, `listings`, `settlement`, `fee_preview`, `removal_orders`, `manage_inventory`. |
| `storage_key` | `text` | Path in Supabase Storage. |
| `size_bytes` | `bigint` | |
| `row_count` | `int` | Populated post-parse. |
| `date_range_start` | `date` | |
| `date_range_end` | `date` | |
| `header_signature` | `text` | SHA-256 of the normalized header row — detects Amazon format drift. |
| `purged_at` | `timestamptz` | Set by daily purge job. |

**Purge policy:** daily scheduled Trigger.dev job deletes `raw_uploads` where `created_at < now() - interval '30 days'`, sets `purged_at`, and removes the Storage object. Findings and the report survive the purge.

### 4.3 Working set — Parquet files in Storage, NOT Postgres tables

This is the DuckDB-driven shift. The "working set" for detection rules lives in **Parquet files in Supabase Storage**, one per report type per audit, at `parquet/{audit_id}/{report_type}.parquet`. Columns are the canonical schema per report type (same fields as the old `normalized_*` list):

- `returns.parquet` — order_id, sku, fnsku, asin, return_date, disposition, refund_cents, quantity, row_ref
- `adjustments.parquet` — adjustment_id, fnsku, sku, date, reason_code, quantity, row_ref
- `reimbursements.parquet` — reimbursement_id, order_id, sku, fnsku, amount_cents, reason, posted_date, row_ref
- `listings.parquet` — asin, sku, price_cents, fulfillment_channel, category_hint, dimensions_jsonb
- `settlement.parquet` — date, sku, asin, amount_type, amount_description, amount_cents, quantity (optional)
- `fee_preview.parquet` — asin, measured_length_in, measured_width_in, measured_height_in, measured_weight_lb, size_tier, fee_cents (optional)
- `removals.parquet` — order_id, created_date, shipped_date, delivered_date, tracking, units, unit_value_cents (optional)
- `manage_inventory.parquet` — asin, sku, stated_length_in, stated_width_in, stated_height_in, stated_weight_lb (optional)

Each Parquet row carries `row_ref` — a stable reference to `{ upload_id, row_number }` in the original CSV — so any finding traces to a source row for audit trail (PRD §7.3).

Detection rules open these files via signed URL + `duckdb.sql("SELECT ... FROM read_parquet('<signed_url>')")`. No row ever lands in Postgres; only findings do.

**Retention:** Parquet files survive the 30-day raw-CSV purge. They are 10–20× smaller than the CSVs they derived from (a 150MB CSV becomes ~10MB Parquet), so indefinite retention is ~free and enables re-running old audits against new rule versions.

**Privacy language alignment:** The Parquet file contains the same rows as the raw CSV, just columnar. The privacy copy on `/start` and `/upload` must not imply that all derivatives are deleted at 30 days — it must say: *"We delete the original CSV files after 30 days. An anonymized columnar copy is retained so your report stays accessible; full deletion available on request."* A user-initiated deletion (US-8.3) wipes raw CSV + Parquet + `case_source_rows` + findings in one cascade. See §10.1 for the enforcement mechanism.

### 4.3b `case_source_rows` — admin-only lookup for the evidence pages

For the top-25 cases that get per-case PDF evidence pages, we materialize their source rows into a small Postgres table so the report renderer doesn't need to re-open Parquet just to display "Order #123-456 on 2025-08-14". Columns: `id, audit_id, finding_id, report_type, row_data jsonb, row_ref`.

Everything else (full case list export to CSV — US-6.6) is served by a just-in-time DuckDB query over the Parquet files, not from Postgres.

### 4.4 `findings` — the outputs

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` pk | Also the human case ID (last 8 chars uppercased). |
| `audit_id` | `uuid` fk | |
| `rule_id` | `text` | e.g., `returns_gap`, `inventory_lost`, `dim_overcharge`. |
| `rule_version` | `text` | Semver at run time. |
| `category` | `finding_category enum` | `returns`, `lost_inventory`, `dimensions`, `fees`, `removals`, `shortages`, `other`. |
| `amount_cents` | `bigint` | Recoverable amount. |
| `confidence` | `confidence enum` | `high` \| `medium` \| `low`. |
| `window_days_remaining` | `int` | Computed at finding time; may be negative for closed windows. |
| `window_closes_on` | `date` | Computed from source event date + policy window. |
| `evidence` | `jsonb` | Structured: source row refs, expected vs actual, policy citation. |
| `narrative_summary` | `text` | LLM-generated plain-English summary (for the PDF case pages). |
| `draft_dispute_text` | `text` | LLM-generated starter dispute (not auto-fileable). |
| `human_reviewed` | `boolean default false` | Flipped by admin on approve. |

Indexes: `(audit_id, category)`, `(audit_id, confidence, amount_cents desc)`, `(window_closes_on)` for the "closing soon" ribbon.

### 4.5 Operational tables

- **`audit_events`** — every state transition + stage completion. Powers the processing page's stream and the admin audit detail timeline.
- **`cost_events`** — `{ audit_id, component, amount_cents_or_micros, metadata }`. Written by Trigger.dev tasks (compute seconds) and Helicone webhook (LLM tokens). Powers admin cost page (US-9.3).
- **`rule_versions`** — registry of rule_id → current semver + changelog. Written at deploy time.
- **`block_list`** — `email_domain pk, reason, added_by, added_at`. Read on `/start` submit. Managed via `/admin/blocklist`.
- **`deletion_requests`** — user-triggered deletions (US-8.3). Admin acts manually in Phase 1, automated in Phase 2.

### 4.6 Row-level security

- `audits`, `findings`, `raw_uploads`, `case_source_rows`, `audit_events` are **server-only** — RLS `deny all` to `anon` and `authenticated`. Next.js API routes use the `service_role` key (server-side only).
- The report page (`/r/:uuid`) hits an API route that reads by `audit_id` — the uuid in the URL is the only capability. No auth, consistent with PRD §9.
- Admin pages use the same `service_role` route but gated by Supabase Auth session (`role = 'admin'` custom claim on Vyshag's user).

---

## 5. End-to-end pipeline

The processing pipeline is one **parent Trigger.dev task** (`audit.run`) that orchestrates children. Children use `batchTriggerAndWait` so the parent blocks without counting compute time against the concurrency budget ([Trigger.dev v4 doc: parent waits, only children consume a slot](https://trigger.dev/docs/v4)).

```
audit.run (parent)
  │
  ├─► validate.csv          batchTriggerAndWait × N reports   (N = 3..8)
  │     - re-read header from Storage
  │     - zod-validate the header signature
  │     - sample first 100 rows with DuckDB (`read_csv` with sniff + limit)
  │     - record row_count + date_range
  │     - FAIL-FAST with clear message if wrong report
  │
  ├─► parse.csv             batchTriggerAndWait × N
  │     - DuckDB streams the CSV end-to-end in one SQL statement:
  │         COPY (SELECT col_a::TEXT, col_b::BIGINT, ... FROM read_csv('<url>'))
  │         TO 'parquet/{audit_id}/{type}.parquet' (FORMAT PARQUET, COMPRESSION ZSTD);
  │     - upload the Parquet file to Supabase Storage
  │     - DuckDB is in-process, bounded memory, terabyte-scale proven
  │
  ├─► detect.rule           batchTriggerAndWait × M rules     (M = 3 in Phase 1, 10 in Phase 3)
  │     - each rule is a pure SQL query against the Parquet files
  │     - DuckDB opens the files via signed URL (read_parquet('<signed_url>'))
  │     - rules run in parallel; p-limit(4) per-worker concurrency
  │     - each rule INSERTs its findings into Postgres
  │     - each finding carries rule_version + row_ref array
  │
  ├─► materialize.cases     single task
  │     - for top-25 findings per audit, DuckDB pulls source rows from Parquet
  │     - inserts into case_source_rows for fast PDF rendering
  │
  ├─► narrate.llm           single task, Sonnet 4.6
  │     - reads top-25 findings + aggregates
  │     - generates pattern-analysis narrative (~2k tokens out)
  │     - prompt-cached system message (big, static) saves 70% cost
  │
  ├─► draft.disputes        batchTriggerAndWait × up to 25, Haiku 4.5
  │     - one LLM call per top-25 case
  │     - input: finding evidence jsonb + rule policy snippet
  │     - output: draft_dispute_text (deliberate starter-quality)
  │
  ├─► render.pdf            single task
  │     - Typst compile from a .typ template populated with Postgres data
  │     - fallback: @react-pdf/renderer if Typst run fails (caught + retried with fallback flag)
  │     - upload to Storage at `reports/{audit_id}.pdf`
  │
  └─► notify.email          single task
        - Resend + React Email template
        - subject includes headline number
        - mark audit status = `completed` (or `pending_review` in Phase 1 and SKIP email)
```

### 5.1 Realtime progress stream

Every stage emits a `metadata.set(...)` update that the Next.js processing page subscribes to via `useRealtimeRun()` from `@trigger.dev/react-hooks`. This is the same pattern as ChannelScope — no FlowToken, no server-sent-events handroll.

```ts
// inside detect.rule task
await metadata.set("stage", "Cross-referencing 12,884 customer returns...")
await metadata.set("progress", 0.45)
```

### 5.2 Failure model

- Each child task has `retry: { maxAttempts: 3, factor: 2 }`.
- A child that hits `maxAttempts` marks the audit `failed` with an `audit_events` row capturing which stage and the error shape.
- **Parse failures** (bad CSV) surface on the processing page immediately with actionable text (US-4.3). User can re-upload the bad file and resume from parse.
- **Rule failures** never block the audit — a single rule can fail and the others proceed; the report flags the missing category.
- **LLM failures** fall back to templated prose (per-finding summary becomes `"{$amount} {category} case. See evidence."`). The report ships; admin is flagged.
- **PDF failures** retry once with the fallback renderer. Second failure → report ships in-browser only, admin is flagged.

### 5.3 Idempotency

Every Trigger.dev child is called with an `idempotencyKey` = `{audit_id}:{stage}:{input_hash}`. Safe to retry, re-run, or re-process a failed audit from the admin panel without double-writing findings.

### 5.4 What a detection rule looks like (worked example)

PRD §5.1 — customer return reimbursement gaps. This is the entire rule:

```ts
// src/lib/rules/returns-gap.ts
export const returnsGap: Rule = {
  id: "returns_gap",
  version: "1.0.0",
  requiredReports: ["returns", "reimbursements", "adjustments"],

  sql: /* sql */ `
    WITH damaged_returns AS (
      SELECT order_id, sku, fnsku, return_date, refund_cents, quantity, row_ref
      FROM read_parquet($returns_url)
      WHERE disposition IN ('CUSTOMER_DAMAGED', 'DEFECTIVE', 'CARRIER_DAMAGED', 'DAMAGED')
    ),
    matched_reimbursements AS (
      SELECT DISTINCT r.order_id, r.sku
      FROM read_parquet($reimbursements_url) r
      JOIN damaged_returns d
        ON r.order_id = d.order_id
       AND r.sku = d.sku
       AND r.posted_date BETWEEN d.return_date AND d.return_date + INTERVAL 60 DAY
    ),
    returned_to_sellable AS (
      SELECT DISTINCT a.sku
      FROM read_parquet($adjustments_url) a
      JOIN damaged_returns d ON a.sku = d.sku
      WHERE a.reason_code IN ('R', 'G')  -- found/sellable
        AND a.date BETWEEN d.return_date AND d.return_date + INTERVAL 30 DAY
    )
    SELECT
      d.order_id,
      d.sku,
      d.refund_cents                           AS amount_cents,
      d.return_date + INTERVAL 60 DAY          AS window_closes_on,
      d.row_ref
    FROM damaged_returns d
    LEFT JOIN matched_reimbursements mr ON mr.order_id = d.order_id AND mr.sku = d.sku
    LEFT JOIN returned_to_sellable rs  ON rs.sku = d.sku
    WHERE mr.order_id IS NULL
      AND rs.sku IS NULL
  `,

  confidence: (row) => row.disposition === "DEFECTIVE" ? "high" : "medium",
}
```

That is the whole rule. The engine executes the SQL against the audit's Parquet files with DuckDB, maps each returned row to a `findings` insert, and records `rule_version = "1.0.0"` on each row. Vitest tests feed in fixture Parquet files and assert the returned rows. **No arithmetic in JavaScript anywhere** — the calculation lives in SQL, which is the most reviewable form of financial logic.

Compared to the Postgres-based path this replaces: ~10× less code per rule, trivially reviewable by a finance person, and the rule runs in hundreds of milliseconds even against the full 18-month dataset.

---

## 6. Upload architecture in detail

Uploads are the single biggest source of risk (large files, flaky Wi-Fi, wrong-file-in-wrong-slot). The architecture is built to survive all three.

### 6.1 Client

- **Uppy Dashboard** renders the 4 required + 4 optional tiles.
- Each tile has an Uppy instance scoped to a specific `report_type`.
- `@uppy/tus` plugin talks to `https://<project>.supabase.co/storage/v1/upload/resumable` ([Supabase Storage TUS docs](https://supabase.com/docs/guides/storage/uploads/resumable-uploads)).
- Chunk size: **6 MB** (Supabase's TUS minimum + default).
- Upload endpoint auth: scoped signed JWT (valid 30 min, `role: anon`, path-restricted) issued by `/api/upload-token` after the `/start` form succeeds.
- **Before upload:** client runs PapaParse `{ preview: 50, header: true }` on the first 50 rows. If the header signature doesn't match the tile's expected schema (for example, the user dropped the Reimbursements file into the Returns tile), reject client-side with: *"This looks like the Reimbursements report, not the Returns report."* Zero server cost on bad uploads (US-3.2).

### 6.2 Server

- `POST /api/upload-token` — validates the audit exists in `pending_upload`, issues a Supabase Storage upload JWT for path `raw/{audit_id}/{report_type}/{uuid}.csv`.
- On upload completion, client calls `POST /api/upload-complete` with `{ audit_id, report_type, storage_key, client_row_count }`.
- Server inserts the `raw_uploads` row (`row_count` left null, populated later by `parse.csv` task).
- When all required uploads exist, the `POST /api/audit/run` endpoint enqueues the `audit.run` Trigger.dev task.

### 6.3 Size + abuse limits

- Per-file hard cap: **200 MB** (enforced in Supabase Storage bucket policy + client check).
- Per-audit hard cap: **800 MB** total (enforced in `/api/upload-complete`).
- Upload JWT expires 30 min — forces resume via the email link flow (US-2.3) rather than day-long pending sessions.

---

## 7. PDF generation — Typst primary, React-PDF fallback

### 7.1 Why Typst

Typst is a modern typesetting system (Rust) with millisecond compile times and a content-first syntax that fits structured financial output. A 40-page X-Ray report with 25 per-case evidence pages compiles in ~300ms on a warm worker. Output is typographically strong — the kind of document a Controller forwards to a CFO without apologizing.

**Runtime:** `@myriaddreamin/typst.ts` (WASM) — no Rust toolchain required on Vercel/Trigger.dev workers. The WASM compiler ships with the package (~8MB); cold start adds ~200ms, negligible inside a Trigger.dev task.

**Template location:** `templates/report.typ` in-repo. Populated by injecting a JSON blob (`report.data.json`) that the Typst template reads via `json("report.data.json")`. Keeps the template declarative and testable.

```typst
#let data = json("report.data.json")
#set page(margin: (x: 1in, y: 1in), numbering: "1 / 1")
#set text(font: "Inter", size: 10pt)

#cover(brand: data.brand, date: data.date, total: data.total_formatted)
#executive-summary(headline: data.headline, bullets: data.exec_bullets)
#methodology(reports_analyzed: data.reports)
#findings-by-category(categories: data.categories)
#top-cases(cases: data.top_cases)
...
```

### 7.2 Fallback: @react-pdf/renderer

If Typst compilation fails (WASM load error, template parse error, unexpected field), the `render.pdf` task retries once with `@react-pdf/renderer`. The React-PDF template mirrors the Typst structure page-for-page, implemented once alongside the Typst template. Slightly uglier typography — still shippable.

Selection flag is stored in the `reports` row so admin knows which renderer produced which report.

### 7.3 Storage

Rendered PDFs live at `reports/{audit_id}.pdf` in Supabase Storage. The report page serves a signed URL valid 1 hour per request (new URL minted each time the download button is clicked). No public-link mode on this bucket.

---

## 8. LLM usage — the contract

There is exactly one rule and it is worth repeating:

> **LLMs never touch arithmetic. Every dollar figure in the report traces to a `findings.amount_cents` column, which was written by a deterministic detection rule with a unit test.**

LLM calls in the pipeline:

| Call | Model | Input | Output | Cost budget |
|---|---|---|---|---|
| `narrate.llm` | Claude Sonnet 4.6 | Top-25 findings + per-category aggregates (structured JSON, precomputed) | Pattern-analysis narrative for report §5 | ≤ $2 per audit |
| `draft.disputes` × 25 | Claude Haiku 4.5 | One finding's `evidence` jsonb + matching policy excerpt | One draft dispute message | ≤ $0.20 per audit total |
| `category_blurbs` (optional) | Haiku 4.5 | Per-category total + confidence mix | 2-3 sentence category intro | ≤ $0.05 per audit |

Total per-audit LLM cost target: **$3-10** (PRD §10).

### 8.1 Prompt caching

The system prompt for each LLM task is large (detection rule reference, report-writing style guide, anti-hallucination guardrails). It is identical across audits. We cache it via Anthropic prompt caching (`cache_control: { type: "ephemeral" }`), cutting ~70% of system-prompt token cost from the second audit of the hour onward.

### 8.2 Guardrails

- **No numeric output from the LLM.** The prompt instructs: *"Do not compute, adjust, or invent dollar figures. Reference the numbers in the input by their field name. If you need a number not provided, emit `[MISSING: ...]` and stop."*
- **No invented case IDs, SKUs, or order IDs.** Same shape.
- **Output is markdown.** Rendered through react-markdown → isomorphic-dompurify before hitting the browser.
- **Validation:** after LLM output, a zod schema checks that every `$X` substring in the prose matches a known `findings.amount_cents` value. Any mismatch → fall back to template prose + flag to admin.

### 8.3 Observability

All Anthropic requests go through Helicone. Gives us:
- Per-audit token cost attribution (written into `cost_events`)
- Request logs for debugging (admin cost page can link out)
- Built-in prompt-level caching layer as backup to Anthropic's

---

## 9. Admin page

Lives at `xray.baslix.com/admin`. **Not linked from anywhere public. `robots.txt` disallows. `noindex` on every admin route.**

### 9.1 Auth

Supabase Auth password flow. Single seeded user (Vyshag) with `role: 'admin'` custom claim. Middleware in `src/middleware.ts` redirects any non-admin session to `/`. (Stack is locked at Next.js 15; if we ever upgrade to 16 where middleware may rename to `src/proxy.ts`, update `decisions.md` first.)

```ts
// src/middleware.ts
export async function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith("/admin")) return NextResponse.next()
  const { data } = await supabase.auth.getUser()
  if (data.user?.app_metadata.role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url))
  }
  return NextResponse.next()
}
```

Session lifetime: 24h. Refresh token rotates. No password reset UI — if Vyshag locks himself out, direct Supabase dashboard recovery.

### 9.2 Pages

| Route | Data source | Capability |
|---|---|---|
| `/admin` | `audit_events` aggregated | Today's counts, yesterday's, 7-day trend sparkline |
| `/admin/audits` | `audits` joined with `findings` aggregates | List + search + filter + sort |
| `/admin/audits/:id` | `audits` + `findings` + `audit_events` | Full report view (same component as `/r/:uuid`) + timeline + raw upload links |
| `/admin/review/:id` | Same as above | Approve / reject buttons, reject-reason notes |
| `/admin/cost` | `cost_events` aggregated per audit + daily | Per-audit breakdown, 7-day rolling avg, $50 flag list, month total |
| `/admin/funnel` | **PostHog embedded dashboard** + `audits` for $ metrics | Step counts + conversion come from PostHog funnels. Median report value + % above $50k come from `audits` (real $ data stays in our DB, not PostHog). |
| `/admin/blocklist` | `block_list` CRUD | Add/remove, blocked attempt log |
| `/admin/failures` | `audits` where status = 'failed' | Stage + error, re-run button, raw file preview (pre-purge) |

### 9.3 Approve & send (Phase 1)

In Phase 1, a new audit ends in `pending_review`, **the delivery email is not sent**, and the user's processing page shows "Your report is being finalized — we'll email you shortly." On `/admin/review/:id`, Vyshag clicks Approve → server flips status to `completed` and triggers `notify.email`. Reject → status `failed`, notes stored, user gets the standard failure flow.

Phase 2 flips a feature flag (`AUTO_APPROVE = true`) and new audits skip the queue.

---

## 10. Security and data handling

### 10.1 Privacy promises and enforcement

Each promise in PRD §9.2 is enforced by a specific mechanism:

| Promise | Mechanism |
|---|---|
| Encryption at rest | Supabase default (AES-256) |
| Encryption in transit | TLS 1.3 enforced via Nosecone HSTS + Vercel defaults |
| 30-day deletion of **raw CSV files** | Daily Trigger.dev scheduled task `purge.raw-uploads` — deletes Storage objects under `raw/{audit_id}/...` and sets `purged_at` |
| Parquet retention (disclosed) | Columnar derivative retained so the report remains accessible and re-runnable; covered in the on-page privacy language in §4.3 |
| Never shared with third parties | Zero webhooks, zero analytics tooling that ingests finding data, no CRM integrations (per PRD non-goals) |
| Never used to train models | Anthropic API contract (no training on API traffic); Helicone doesn't train either |
| Request deletion any time | **Per-audit deletion link** in the report email → `/deletion/{audit_id}?token=...` form → `/api/deletion` route → `deletion_requests` row. Admin processes manually in Phase 1; a scheduled task drains the queue in Phase 2. Cascade wipes: raw CSV (if still present), Parquet, findings, `case_source_rows`, the rendered PDF, and the `audits` row (status=`deleted`, PII zeroed). No inbound email — the link is the capability. |

### 10.2 Secrets

- `ANTHROPIC_API_KEY`, `HELICONE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `TRIGGER_SECRET_KEY`, `UPSTASH_*` live only in Vercel and Trigger.dev env.
- T3 Env schema explicitly forbids any of these from being `NEXT_PUBLIC_*`.
- No secret is ever written to DB or Storage.

### 10.3 Input sanitization

- Brand name and email: zod-validated, length-capped, DOMPurified before any display.
- CSV rows: every string column is trim+NFC-normalized, length-capped at 500 chars (no 10MB-in-a-single-cell attacks), parsed but not interpreted.
- LLM output: react-markdown with the `disallowedElements: ["script", "iframe"]` option + DOMPurify.

### 10.4 Rate limits (US-2.2)

All via Upstash `@upstash/ratelimit`:
- `5 audits per email-domain per 30 days` (keyed by domain)
- `10 submissions per IP per day` (keyed by IP)
- `30 upload-complete requests per audit` (keyed by audit_id — prevents a stuck client from hammering)
- Block list checked first; blocked domains get the polite rejection message without consuming a rate-limit slot.

### 10.5 CSP

Nosecone config:
- `default-src 'self'`
- `connect-src 'self' https://*.supabase.co https://api.helicone.ai https://api.resend.com wss://*.trigger.dev`
- `img-src 'self' data: https://*.supabase.co`
- `script-src 'self' 'wasm-unsafe-eval'` (needed for Typst WASM)
- `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`

---

## 11. Cost model (engineering view)

Target per-audit: **$6–16** (PRD §10).

| Component | Where the cost lives | Controls |
|---|---|---|
| Supabase DB + Storage | ~$0.10/audit at expected volume | Free tier covers the first ~300 audits/month; Pro tier after. |
| Trigger.dev compute | ~$0.50/audit | Parent-child pattern so the parent doesn't count concurrency. Haiku for per-case narration keeps compute cheap. |
| Claude tokens | $3–10/audit | Prompt caching, Haiku for bulk, Sonnet only for the main narrative. Helicone enforces a per-audit cap ($15) — halts the LLM stage if exceeded and falls back to templates. |
| PDF generation | $0.05/audit | Typst WASM is essentially free compute; <1s per audit. |
| Email | $0.01/audit | Single email via Resend. |
| Upstash Redis | $0 | Rate-limit only; under free-tier ops/month even at 1000 audits. |

### 11.1 Cost circuit-breaker

A new admin toggle `MAX_COST_PER_AUDIT_CENTS` (default 5000 = $50). If `cost_events` for an audit crosses this while the pipeline is still running, the next LLM stage short-circuits to template prose. An admin row is added to `/admin/failures` with reason `cost_cap`. This is the load-bearing line between "controlled test" and "someone uploaded a 500MB file of nothing."

---

## 12. Directory structure

```
src/
  app/
    (public)/
      page.tsx                   landing
      start/page.tsx             email + brand capture (server action)
      upload/[id]/page.tsx       Uppy dashboard, tile per report
      run/[id]/page.tsx          processing page (useRealtimeRun)
      r/[uuid]/page.tsx          in-browser report
    (admin)/
      admin/
        page.tsx                 dashboard
        audits/page.tsx          list
        audits/[id]/page.tsx     detail
        review/[id]/page.tsx     approve/reject (Phase 1)
        cost/page.tsx
        funnel/page.tsx
        blocklist/page.tsx
        failures/page.tsx
    api/
      upload-token/route.ts      issue scoped Supabase Storage JWT
      upload-complete/route.ts   record raw_uploads row
      audit/run/route.ts         enqueue parent Trigger.dev task
      admin/approve/route.ts     flip pending_review → completed + notify
      admin/reject/route.ts
      deletion/route.ts          user-initiated deletion request
  components/
    landing/                     Hero, SampleCards, TrustSignals
    upload/                      UppyDashboard, ReportTile, ValidationBadge
    processing/                  StageStream, Timeline
    report/                      HeadlineStrip, CategoryCards, UrgencyBar, TopCasesTable, PatternBlock, CtaBlock
    admin/                       AuditTable, CostChart, FunnelChart, BlockListTable, FailureCard
    ui/                          shadcn/ui base
  lib/
    db/                          Supabase clients (anon + service-role)
    storage/                     signed URL helpers, upload-token issuer
    csv/
      headers.ts                 per-report header signatures (zod)
      validate-client.ts         PapaParse preview + match (client-only)
    duckdb/
      client.ts                  DuckDB connection factory (per-task, in-memory)
      parse-to-parquet.ts        CSV → typed Parquet via COPY
      run-rule.ts                Executes rule SQL against Parquet, maps rows → findings
    rules/
      returns-gap.ts             §5.1 (Phase 1) — SQL
      inventory-lost.ts          §5.2 (Phase 1) — SQL
      refund-reimbursement-mismatch.ts  §5.3 (Phase 1) — SQL
      returned-not-resold.ts     §5.4 (Phase 2) — SQL
      dim-overcharge.ts          §5.5 (Phase 2) — SQL
      referral-category.ts       §5.6 (Phase 2) — SQL
      removal-not-received.ts    §5.7 (Phase 2) — SQL
      ltsf-active-sku.ts         §5.8 (Phase 2) — SQL
      inbound-shortage.ts        §5.9 (Phase 2) — SQL
      fee-anomaly.ts             §5.10 (Phase 3) — SQL
      index.ts                   registry { id, version, sql, requiredReports, confidenceFn }
    llm/
      narrate.ts                 Sonnet 4.6 pattern narrative
      draft-dispute.ts           Haiku 4.5 per-case drafts
      validate-output.ts         zod + regex to ensure no invented numbers
    pdf/
      typst-render.ts            primary
      react-pdf-render.tsx       fallback
      data-builder.ts            findings → render input JSON
    email/
      templates/ReportReady.tsx  React Email
      send.ts                    Resend client
    cost/
      record.ts                  write cost_events
      circuit-breaker.ts         enforce MAX_COST_PER_AUDIT_CENTS
    security/
      dompurify.ts               isomorphic config
      nosecone.ts                CSP config
      rate-limit.ts              Upstash wrappers
    admin/
      auth.ts                    middleware helpers
  trigger/
    audit-run.ts                 parent task
    validate-csv.ts              child × N
    parse-csv.ts                 child × N
    detect-rule.ts               child × M (generic: takes rule_id, runs from registry)
    narrate-llm.ts
    draft-disputes.ts
    render-pdf.ts
    notify-email.ts
    purge-raw-uploads.ts         scheduled daily
  types/
    audit.ts, findings.ts, reports.ts, admin.ts
  env.ts                         T3 Env schema
templates/
  report.typ                     Typst template (+ imported partials)
tests/
  rules/                         vitest — one test file per rule, synthetic fixtures in/out
  validation/                    header-signature tests
migrations/
  *.sql                          Supabase migrations
```

---

## 13. Build phasing (engineering slice through PRD §11)

### Phase 1 — MVP ship list

Source: PRD §11 Phase 1, user stories US-1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3, 3.5, 4.1–4.5, 5.1–5.3, 6.1–6.5, 7.1, 8.1, 8.2, 8.4, 9.1–9.3, 9.6, 9.7.

Engineering order (one engineer + Vyshag):

1. **Foundation** — Next.js scaffold, Supabase project, Trigger.dev project, env plumbing, Nosecone, rate-limit, block-list table.
2. **Database migrations** — every table from §4. RLS policies. Seed admin user.
3. **Landing + start form** — US-1.1, 1.2, 2.1, 2.2.
4. **Upload page (3 required reports)** — US-3.1, 3.2, 3.3, 3.5 with Uppy + Supabase TUS.
5. **CSV validation + parsing** — client preview + server streaming parse + normalized tables.
6. **Detection rules §5.1, 5.2, 5.3** — with Vitest fixtures. Each is pure; no LLM anywhere.
7. **Trigger.dev parent + children** — audit.run wiring with realtime streams (US-4.1, 4.2, 4.4).
8. **LLM narrative + dispute drafts** — Sonnet + Haiku wired, guardrails in place (US-4.5).
9. **PDF** — Typst template + WASM render task + React-PDF fallback.
10. **Report page** — US-6.1, 6.2, 6.3, 6.5.
11. **Resend email** — US-6.4, 4.3.
12. **Admin** — US-9.1, 9.2, 9.3, 9.6, 9.7.
13. **Privacy surface** — US-8.1, 8.2, 8.4 and the daily purge task.
14. **Smoke test with 3 real brand datasets** — tune rules, confirm PDF looks right.

### Phase 2 — full Bucket 3

- 4th required report (Listings) + optional reports 5–8
- Detection rules 5.4, 5.5, 5.6, 5.7, 5.8, 5.9
- Self-serve delivery (flip AUTO_APPROVE)
- US-9.4, 9.5 (funnel + block list)
- US-3.4, 6.6, 8.3, 1.3, 2.3

### Phase 3 — Bucket 2 + growth

- Rule 5.10 (fee anomaly)
- SP-API ingest (US-10.1) — **this is not in this architecture; requires its own doc**
- Whitelabel + contract-vs-reality — separate sub-system, out of scope here.

---

## 14. Observability

Five surfaces, each with a specific job:

| Surface | What it's for |
|---|---|
| **Sentry** | Unhandled errors, source-mapped stack traces, release health. Wired into Next.js (`instrumentation.ts`) and Trigger.dev tasks (via their official Sentry integration). First place to look when something is broken. |
| **PostHog** | Funnel + cohort + retention analytics on top of `audit_events`. Powers the "step drop-off" view that would have been hand-rolled in `/admin/funnel`. Also provides session replay on the upload page (opt-in, useful for diagnosing "I couldn't find the right report" support tickets). |
| **Helicone dashboard** | LLM requests, per-project cost, prompt cache hit rate. Write-through of every Claude call. |
| **Trigger.dev dashboard** | Per-run timeline, per-task logs, retry history. Gold for pipeline debugging. |
| **Admin `/failures` page** | Our own UI — the distillation relevant to Vyshag. Joins `audit_events` + Sentry error IDs into one actionable list. |

Every stage writes a row to `audit_events { audit_id, stage, status, duration_ms, error_sentry_id? }` so we can reconstruct any audit offline without digging through four providers' logs. This is the X-Ray's own X-Ray.

### 14.1 Privacy guardrails on observability

- **Sentry** — never send CSV row data, never send $ figures from findings. Only error messages + stack traces. `beforeSend` strips anything that looks like an order ID, email, or dollar value.
- **PostHog** — event names only (`audit.started`, `audit.uploads_complete`, `audit.completed`), no PII payloads. Brand name and email live only in Postgres.
- **Helicone** — prompt + completion logging is unavoidable (that's the point), but every Anthropic call passes only precomputed aggregate numbers; raw CSV rows never hit the LLM, so they never hit Helicone.

---

## 15. Open architectural questions

- **Typst on Vercel serverless cold starts** — the WASM binary adds ~8MB. Acceptable in a Trigger.dev task (long-running). If we ever generate PDFs inside a Vercel function (we shouldn't, but…), this needs re-evaluation.
- **Normalized-table retention past 30 days** — keeping them lets us re-run old audits against new rule versions (useful for QA). Cost is negligible at <10k audits. Revisit at 100k.
- **Per-finding markdown prose vs. per-category** — currently Haiku narrates top-25 individually. If LLM cost creeps, we collapse to per-category narration + generic per-case template. Flag to evaluate after first 100 audits' cost data.
- **Supabase Pro vs self-managed Postgres** — Pro at $25/mo covers us through ~5k audits/mo. If we outgrow it, the migration is straightforward (just Postgres). No lock-in concern.
- **Admin 2FA** — single-user password is fine for Phase 1, but a single credential compromise exposes every audit. Add TOTP on Supabase Auth before we exceed 50 completed audits.

---

## 16. What this architecture deliberately does NOT do

Calling these out to stop them sneaking in:

- **No SaaS dashboards** for end users. One report URL, one PDF. No "log in to see your history." The report page is the product.
- **No webhooks to third parties.** No Zapier, no Slack, no CRM, no analytics vendor that sees finding data. Plausible/Umami for traffic analytics is fine — it never sees a $ figure.
- **No email sequences.** The Resend integration sends exactly one email per audit. If a future phase wants follow-ups, that's a separate system with its own opt-in.
- **No LLM in the detection path.** An LLM can draft prose about a finding. It cannot produce a finding.
- **No SP-API in v1.** The upload flow is the entire data ingest surface.
- **No multi-tenancy primitives.** Per-audit isolation is enough. We are not building for resellers yet.
- **No cache-warming or pre-computation.** Audits are one-shot; caching the system prompt is the only layer of LLM caching we rely on.

---

## 17. Review schedule

This document is re-reviewed at the end of each phase. Deltas go into `decisions.md` with the date and the trigger. If a section in this file turns out to be wrong, update it — don't append a "see below" footnote.
