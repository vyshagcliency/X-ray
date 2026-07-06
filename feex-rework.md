# FEEX Rework — Aligning Leakage X-Ray to the Current Wiki Strategy

**Created:** 2026-06-13
**Owner:** Vyshag
**Status:** Proposed — awaiting sign-off
**Companion to:** `plan.md` (Phase 1.5 already covers part of this), `prd.md` (frozen, v2.0 pre-pivot), `decisions.md`, `Baslix-brain` wiki
**Driver docs (wiki):** `synthesis/the-wedge-correction-2026`, `concepts/teardown-led-acquisition`, `synthesis/give-the-finding-sell-the-system`

---

## 0. Why this rework exists (the delta)

The codebase was built against `prd.md` v2.0 (April 2026). Since then the Baslix wiki has pivoted **twice**, and FEEX is now behind on both axes:

| Axis | What the code/PRD still encodes | What the wiki now says |
|---|---|---|
| **What we detect** | FBA reimbursement (returns gap, lost inventory, refund mismatch) | **Payout integrity** ("Settlement Truth Audit") — FBA reimbursement is structurally dying (Amazon auto-reimburses + cost-bases it + GETIDA price war) |
| **What the lead magnet is** | A self-serve tool = the top of funnel ("build it and they will come") | The **manual public-data teardown** is the acquisition magnet; X-Ray is the **fulfillment back-end** that confirms findings on real data. Self-serve returns at scale. |
| **What we sell** | One-shot recovery ("20% of recovered, no retainer") | **The recurring system** — continuous monitoring, cross-channel reconciliation, backward claims. *Recovery is the wedge, not the product.* |

**The decision that frames this rework (Vyshag, 2026-06-13):** ship FEEX self-serve and **pin it to LinkedIn as a lead magnet** — but aligned to the wiki. That is coherent *if and only if* the self-serve tool is treated as **air cover / corroboration behind the manual outreach, not the acquisition engine.** (See §2 and §4.)

This is **not a rebuild.** The pipeline, rule registry, DuckDB/SQL engine, Typst PDF, report page, and admin surface all stay. It is a content + framing + rule-priority swap inside a stable frame.

---

## 1. What does NOT change (the anchor)

To bound fear: every locked decision in `decisions.md §3` holds, and these stay exactly as built —

- The DuckDB + pure-SQL detection engine and the `Rule` registry shape.
- The CSV-upload-only / no-SP-API / Amazon-3P-only v1 ingest boundary (`decisions.md §1`). The new payout-integrity checks still read **Seller Central reports** — no new trust ask.
- The Trigger.dev pipeline, Typst PDF + React-PDF fallback, the report page, the admin review queue, the single transactional email.
- The privacy architecture: no login, UUID report URLs, raw-CSV auto-purge at 30 days, no LLM ever sees raw rows.
- `bigint` cents internally, LLM-narrates-never-calculates, every finding carries `rule_id` + `rule_version` + `row_ref`.

If a proposed change touches any of the above, it is out of scope for this rework.

---

## 2. The two reframes that drive every change

Everything below descends from two strategic reframes. Hold these in mind while reading the phases.

**Reframe A — Role flip (X-Ray is fulfillment, self-serve is air cover).**
The manual teardown finds the prospect and earns the CSV; X-Ray confirms it into a real, dispute-ready number and closes. A self-serve instance pinned to LinkedIn is **corroboration** for a prospect who already got a DM and is checking you out — *not* a traffic-driven inbound funnel. Practical consequence: **build the tool, do not build the acquisition machinery** (SEO sample pages, funnel-conversion optimization, "+$X unlock" gamification, growth instrumentation). That machinery is the displacement trap (`baslix-gtm-risks` Risk 8) and is premature until there's a case study + real inbound.

**Reframe B — Give the finding, sell the system.**
The report **gives away** the finding (proof of competence). The CTA **sells** the recurring system the buyer cannot self-serve: continuous payout-integrity monitoring, cross-channel reconciliation, and backward claims that need our hands on their data. The current CTA ("we'll recover this batch, 20% of recovered") sells the wedge as if it were the product — it must change.

---

## 3. Nuance analysis (the hard thinking)

These are the non-obvious points that shape the build. Read before planning sprints.

1. **Self-serve on real data produces *confirmed* findings, not hypotheses — this is a strength.** The wiki's "unverifiable hypothesis" warning is about the *cold public-data teardown*, not about X-Ray. When a seller uploads their own CSVs, X-Ray computes real discrepancies from real data. So the self-serve magnet is *more* credible than the manual cold touch, and the hypothesis-honesty caveats do **not** apply to its output. Lean into this.

2. **The data trust cliff is the #1 self-serve conversion risk.** A cold LinkedIn visitor is being asked to upload sensitive Seller Central settlement data to a no-logo, no-SOC2, overseas tool — the wiki's biggest documented trust cliff (`teardown-led-acquisition` / Risk 3). The manual motion dodges this (run a self-check yourself, CSV is ask #2). The self-serve tool cannot dodge it — so it must **disarm** it. Mitigation = make the privacy story (no login, auto-purge, no-LLM-sees-rows, no training, one-click deletion) a **prominent conversion device on the upload page**, not a 3-line footnote (it's currently one line at `upload/[id]/page.tsx:142`). This turns the weakness (overseas, no logo) into "we literally can't keep or misuse your data."

3. **The CTA reframe is load-bearing, not cosmetic — because of the self-fixable trap.** Size-tier/dimension overcharges are trivially self-fixable AND 90-day-capped (`give-the-finding-sell-the-system`). If the report gives that finding away and the CTA says "we'll recover it for you," we've handed over 100% of the monetizable value on that bucket and pitched a weak one-shot. The CTA must pivot to *"we watch every settlement across every channel, continuously, and chase the recoveries you can't file yourself."*

4. **Reference data is the long pole, not the SQL.** The referral-fee category table and the FBA size-tier → fee schedule are the inputs the two highest-wow rules join against. They must be encoded as **versioned reference tables** (`reference_version`) so old reports stay reproducible, with a documented refresh procedure (Amazon updates them). Budget more time here than for the rule SQL.

5. **Ship contract-free checks only.** The four contract-free payout-integrity checks (return-credit-unapplied, aged-surcharge-on-sold, referral-fee mismatch, size-tier misclassification) need only the seller's own reports. Contract-dependent checks (co-op, freight, Walmart cash-discount) need documents we don't have and belong to a later phase. Do not let scope creep into them.

6. **Lead with "stop the bleeding forward," not a big backward number.** The 90-day reimbursement cap on fee buckets means the recoverable *backward* dollars are modest; the value is stopping the *ongoing* overcharge. Headline and urgency framing should reflect this — it also keeps us honest with a sharp Controller who'll dismiss an inflated number.

7. **Cross-channel is what we SELL, not what the free tool does.** Payout-integrity rules in FEEX read Amazon Seller Central reports only (still within the v1 boundary). "Cross-channel reconciliation (Amazon + Walmart + Target)" is part of the recurring-system *pitch*, delivered as a service — not a feature to build into the free tool now. Keep the tool's scope Amazon-only; sell the breadth.

8. **Recalibrate the success metric.** PRD §12 makes "median report value" the north star and sets it at $30k–$75k — a number anchored on the old FBA "$147k Amazon owes you" fantasy. The aligned tool surfaces 1–3% payout-integrity discrepancies, 90-day-capped — the headline number will be *smaller and more honest*. Do not measure the aligned tool against the inflated bar; the right metric is "did it surface a specific, verifiable, non-commoditized discrepancy that earns a conversation," not raw dollar size.

---

## 4. Relationship to `plan.md` Phase 1.5

`plan.md` already inserted **Phase 1.5 — The Wedge Correction** (2026-06-01). It covers a large chunk of this rework's detection + messaging work and should be the execution home for it. This document does **not** replace Phase 1.5 — it (a) confirms its priority, and (b) adds the items Phase 1.5 does **not** yet capture, which came out of the 2026-06-13 self-serve-lead-magnet decision:

| Rework need | Covered by plan.md 1.5? | Gap this doc adds |
|---|---|---|
| Payout-integrity rules + reference tables + ingest | ✅ 1.5.1–1.5.4 | — |
| Demote FBA rules | ✅ 1.5.4 | — |
| "Settlement report is lying to you" landing copy | ✅ 1.5.5 | — |
| **CTA → sell-the-system (not one-shot recovery)** | ⚠️ partial ("payout-integrity language") | **R2.2 below — explicit give/sell CTA rewrite** |
| **Privacy story as a conversion device on upload** | ❌ | **R3.1 below** |
| **Self-serve-as-air-cover framing + non-goals** | ❌ | **R4 below** |
| **CLAUDE.md / docs realignment (2 pivots behind)** | ❌ | **R0 below** |
| **Success-metric recalibration** | ❌ | **R0.3 below** |

---

## 5. The phased plan

Phases are ordered by what unblocks shipping an *aligned* self-serve lead magnet. **R1 (rules) is the critical path** — pinning a tool that runs only the dying FBA bucket is explicitly off-strategy ("finds little and looks like free GETIDA"). Do not pin to LinkedIn before R1 + R2 ship.

### Phase R0 — Doc realignment (fast; do first so the build stops drifting)

**Why first:** the canonical docs currently point the next engineer (or next Claude session) back at the old model. Realign them before writing feature code.

- [ ] **CLAUDE.md** — rewrite the opening definition. Current: *"Free forensic audit tool for Amazon FBA sellers… The audit is the bait. Recovery (the paid service) is the product."* Change to payout-integrity framing + the role-flip note (self-serve tool = fulfillment/air cover; manual teardown = acquisition). Keep all hard rules.
- [ ] **decisions.md** — add a change-log row dated 2026-06-13: the self-serve-as-LinkedIn-lead-magnet decision, framed as air cover not acquisition engine; CTA shifts to sell-the-system; privacy-as-trust-device. Update the §1 "Free lead-magnet tool" row's rationale to note the role flip (it is fulfillment + corroboration now, full self-serve acquisition at scale).
- [ ] **prd.md** — PRD is frozen; do **not** edit. Add a one-line deviation pointer in `decisions.md` noting §4.1 (headline), §4.5/§6.1 (CTA), §11 (phase ordering), and §12 (success metric) are superseded by this rework + Phase 1.5.
- [ ] **architecture.md** — only if a data-shape changes (new ingest report schemas, reference tables). Fold into the relevant section, don't append.
- [x] **R0.3 — recalibrate success metric** — note in `plan.md` Phase 1.5 + admin that "median report value" is no longer the primary gate (see Nuance 8); the gate is "surfaces a specific verifiable non-commoditized discrepancy." **DONE 2026-07-07 (Report Killer P5.2):** admin dashboard carries the recalibration note; `plan.md` funnel-page line + `decisions.md` change-log record the deviation from frozen PRD §12; the full rationale (synthetic $ are generator artifacts) lives in `real-data-asterisks.md` §C.

**Exit gate:** CLAUDE.md and decisions.md read consistently with the wiki; no canonical doc still calls the self-serve tool the acquisition engine or leads with FBA reimbursement.

### Phase R1 — Rules repoint to payout-integrity (critical path; = plan.md 1.5.1–1.5.4)

Execute `plan.md` Phase 1.5.1–1.5.4 as written. Summarized here for completeness:

- [ ] **R1.1 Ingest expansion** (plan 1.5.1) — add header signatures + upload tiles + client/server validation for: Transaction/Settlement report, FBA Fee Preview (or Manage FBA Inventory w/ dimensions), Storage/Aged-Inventory Surcharge report. Pin each with a `header_signature` hash. Re-decide required vs optional so the lead wedge runs on the new minimum set.
- [ ] **R1.2 Reference tables (long pole)** (plan 1.5.2) — versioned Amazon referral-rate table (with tiered thresholds) + FBA size-tier→fee schedule; stamp both with `reference_version`; document the refresh procedure. *(See Nuance 4.)*
- [ ] **R1.3 The four contract-free rules** (plan 1.5.3) — each = pure SQL + registry entry + Vitest CSV fixture + test:
  - `return-credit-unapplied` (≈ PRD §5.4; ~80% reuse of `returns_gap`) — *easy*
  - `aged-surcharge-on-sold` (≈ PRD §5.8) — *medium, needs storage-fee + ledger join*
  - `referral-fee-mismatch` (≈ PRD §5.6) — *medium-hard, needs settlement + referral-rate table*
  - `size-tier-misclassification` (≈ PRD §5.5) — *medium-hard, needs dimensions + fee-schedule table*
  - Lead with `referral-fee-mismatch` + `size-tier-misclassification` (the "you found *what*?" angles; most provable per the wiki).
- [ ] **R1.4 Demote FBA rules** (plan 1.5.4) — keep `returns_gap`/`inventory_lost`/`refund_reimbursement_mismatch` registered but out of the lead; weight `inventory_lost` last (it's the now-auto-reimbursed category; stale "wins" undercut credibility). Reorder report categories so payout-integrity renders first.

**Exit gate:** four payout-integrity rules pass Vitest fixtures; reference tables versioned; `pnpm build && pnpm lint && pnpm test` green with zero regressions on existing rules.

### Phase R2 — Messaging + give-the-finding-sell-the-system (= plan.md 1.5.5, extended)

- [ ] **R2.1 Landing copy** (plan 1.5.5) — `src/app/(public)/page.tsx`: replace *"Amazon owes you money."* (line 126) and *"every dollar Amazon owes you"* (lines 41, 64) with **"your settlement report is lying to you, and we can prove it."** Lead with one concrete verifiable discrepancy (e.g., "15% referral fee charged where 8% was contracted — for 14 months"). Headline magnitude framing = 1–3% / one concrete discrepancy, "stop the bleeding forward" (Nuance 6).
- [ ] **R2.2 CTA rewrite — sell the system (NEW, beyond plan 1.5.5).** `src/app/(public)/r/[uuid]/page.tsx:284–288` currently: *"Filing N disputes is a 60-80 hour job… 20% of recovered, no retainer, no software."* Rewrite to the give/sell posture: the finding is yours (we gave it away); what we sell is **watching every settlement across every channel continuously + chasing the recoveries you can't self-file**. Do the same for the email CTA (`src/lib/email/templates/report-ready.ts`) and PDF "About Baslix"/CTA section. *(See Reframe B + Nuance 3.)*
- [ ] **R2.3 Narrative + dispute-draft templates** (plan 1.5.5) — payout-integrity language in `src/lib/llm/narrate.ts` + `draft-dispute.ts`. Keep hypothesis-vs-confirmed honesty in dispute-draft prose (the drafts go to Amazon; confirmed findings are fine, but don't over-claim recoverability past the 90-day cap).
- [ ] **R2.4 PDF lead section** (plan 1.5.5) — `data-builder.ts` + `templates/report.typ` lead with the payout-integrity wedge and the sell-the-system CTA.

**Exit gate:** landing, report, email, and PDF all lead with payout integrity and sell the recurring system (verified by reading the rendered outputs); no surface still says "Amazon owes you" or pitches one-shot recovery as the product.

### Phase R3 — Self-serve-as-lead-magnet hardening (NEW)

The decision is to pin a working self-serve tool to LinkedIn. These items make it convert without falling off the data trust cliff.

- [ ] **R3.1 Privacy as a conversion device** — promote the privacy story on `upload/[id]/page.tsx` from a one-liner (line 142) to a prominent, scannable trust block above the upload tiles: no login, raw CSVs auto-purged at 30 days, **no LLM ever sees your rows**, never shared, never used for training, one-click full deletion. This is the single highest-leverage self-serve conversion fix (Nuance 2). Mirror a short version on the `/start` page.
- [ ] **R3.2 "Run it yourself" honesty on landing** — since self-serve produces *confirmed* (not hypothesis) findings on the user's own data, say so plainly: "you upload your own reports; we compute the discrepancies from your real numbers; nothing is estimated." Differentiates from creepy cold-audit tools.
- [ ] **R3.3 LinkedIn-pin readiness** — confirm the landing URL is shareable/OG-tagged for a LinkedIn featured-section pin (title, description, preview image that reads "Settlement Truth Audit," not "FBA reimbursement"). No new infra — just metadata + the OG image.
- [ ] **R3.4 (optional) SOC2/trust-roadmap line** — a single honest "security roadmap" line on the upload page or About (per PRD §13 mitigation) to blunt the no-SOC2 objection. Low effort, real conversion value for finance buyers.

**Exit gate:** a cold visitor landing on the upload page sees the privacy promise before being asked to upload; the LinkedIn pin preview reflects the payout-integrity wedge.

### Phase R4 — Guardrails / explicit non-goals (displacement trap)

Not build tasks — a written boundary so the rework doesn't quietly become the thing the wiki warns against (Reframe A, Risk 8).

- [ ] **Do NOT build acquisition machinery now:** no SEO sample-report pages as a growth play, no funnel-conversion optimization, no "+$X estimated additional findings — unlock!" gamification (PRD §4.3), no growth analytics instrumentation beyond what admin already needs. These are scale-phase items; building them now is the displacement trap.
- [ ] **Do NOT build cross-channel detection** into the free tool (Walmart/Target). It's part of the *sales pitch*, delivered as a service (Nuance 7).
- [ ] **Do NOT build contract-dependent checks** (co-op/freight/Walmart cash-discount) — Phase 3, after the first ~5 logos (Nuance 5).
- [ ] **The pinned tool is air cover.** Customer #1 still comes from the manual teardown outreach. If LinkedIn-pin + posting starts substituting for manual finding-delivery, that's the trap — stop and return to outreach.

---

## 6. Open decisions needed from Vyshag

1. **Minimum aligned ship set** — ship all four contract-free rules before pinning, or lead with the two highest-wow (`referral-fee-mismatch` + `size-tier-misclassification`) plus the easy `return-credit-unapplied`, and add `aged-surcharge-on-sold` after? (Recommendation: the two wow rules + return-credit is the minimum that earns the "you found *what*?" moment.)
2. **Required vs optional reports** — the payout-integrity wedge needs the Settlement + Fee-Preview reports, which the current 3-report flow doesn't ask for. Make them required (higher friction, better findings) or optional-with-strong-nudge (lower friction, weaker default report)? Trade-off matters for self-serve conversion.
3. **Reference-table source + cadence** — who maintains the referral-rate + fee-schedule tables, and how often are they refreshed? This is the long pole (Nuance 4).
4. **Keep `inventory_lost` visible at all?** It surfaces the now-auto-reimbursed category; weighting it last is planned, but consider hiding it from the free report entirely to avoid stale-win credibility hits.

---

## 7. Sequencing & critical path

```
R0 (docs, ~0.5 day) ─┐
                     ├─> R1 (rules + reference tables, the long pole) ─> R2 (messaging/CTA) ─> R3 (privacy/pin) ─> PIN TO LINKEDIN
R4 (guardrails, write once) ─┘                                                                                    ▲
                                                                              R1+R2 are the gate; do not pin before both ship
```

- **R0** can be done immediately and in parallel with everything (it's documentation).
- **R1** is the long pole (reference data > rule SQL). Everything aligned depends on it.
- **R2** can start its copy work in parallel with R1, but the report can't ship until R1's rules produce the new findings.
- **R3** is small and can land alongside R2.
- **Do not pin to LinkedIn until R1 + R2 are live** — a pinned tool running the dying FBA bucket with "Amazon owes you" copy is worse than no pin.

The decisive validation remains the wiki's one test: run the aligned audit on **one real $40–90M omnichannel brand's settlement data** (the first CSV the manual teardown earns) — that simultaneously validates the rules and unblocks the "real data" gate that has blocked Phase 1 all along.
