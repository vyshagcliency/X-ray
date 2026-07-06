# Report Killer — Per-Phase Execution Prompts

**Created:** 2026-07-05 · **Use with:** `report-killer-plan.md` (the plan), `report-killer-referral-guard.md` + `report-killer-new-buckets.md` (Phase 3 research builds).
**How to use:** one phase per session. Copy the **master prompt**, change the two `PHASE N` references, and paste the matching **focus line** as the first line. Each session stops at its phase gate and waits for your go-ahead.

---

## Master prompt (change only `PHASE N`)

```
Execute PHASE N of the X-Ray report-killer plan.

CONTEXT — read first, in this order (a fresh session has zero context):
1. report-killer-plan.md — read §0–§3 fully (the bar, the anchor, the synthetic-data
   validation reality §1.5, the target design), then the PHASE N section + its exit gate,
   then §7 (doc maintenance).
2. CLAUDE.md + .claude/rules/detection-rules.md + .claude/rules/frontend.md — project
   conventions + hard rules. These OVERRIDE defaults.
3. plan.md — the project's source-of-truth build plan; find the pointer to this rework and
   keep plan.md in sync as you go.
4. Phase 3 only: also read report-killer-new-buckets.md and report-killer-referral-guard.md
   (the research-built designs that phase executes).

STANDING CONSTRAINTS (every phase):
- This is EXECUTION of an approved, written design — not new design work. Do NOT re-brainstorm
  or re-open decisions locked in the plan (§3 "Resolved open decisions"). If you hit a §6
  still-open item, use its stated default and note it; only stop for a genuinely new fork.
- SYNTHETIC-DATA REALITY: there is no real seller data. tests/smoke/halcyon-audio/ is the
  ground-truth fixture — validate everything against it. Synthetic data proves presentation +
  reconciliation, NOT detection-vs-real-Amazon-format. So before committing to ANY Amazon fee
  mechanic, report format, column name, or code enum, RESEARCH it (web + the plan's cited
  sources) instead of assuming; put every assumption only real data can confirm on the P5.3
  asterisk list.
- CREDIBILITY FIRST: every $ figure traces to a real row. A FALSE finding is worse than a
  missed one (asymmetric safety rule) — when a legitimate exception is possible, lower the
  confidence, never headline it.
- Detection logic is pure SQL; LLM narrates never calculates; cents (bigint) internally;
  every finding carries rule_id + rule_version + row_ref. Do NOT touch the anchor in plan §1
  (engine, pipeline, privacy model, ingest boundary).

METHOD:
- TDD: for any rule or serialization change, write the failing fixture/test FIRST (fixtures use
  CODE-FORM Amazon values per P0.6), watch it fail, implement, watch it pass. Follow
  detection-rules.md.
- Run the pipeline on tests/smoke/halcyon-audio/ and EYEBALL the rendered report as your
  acceptance check — not just green tests.
- Check off each PHASE N item in report-killer-plan.md the MOMENT it's done. Never batch.
- Keep every number reconciling across web + PDF + narrative (single source of truth).

DONE = the phase's exit gate met + `pnpm build && pnpm lint && pnpm test` green, zero
regressions + the Halcyon report visually verified + docs updated per §7 (check off plan items;
update plan.md/decisions.md/architecture.md/rules only for what actually shipped this phase).
Then post a short summary (shipped / deferred / what the gate proved) and STOP — do not start
the next phase without my go-ahead.

Start by reading the docs, then give me a 3–5 line plan of attack for PHASE N and begin.
```

---

## Per-phase focus lines (paste as the FIRST line, above the master prompt)

**Phase 0 — Credibility foundation**
> Focus: P0.1 (the `[object Object]` serialization fix in run-rule.ts — DuckDB temporal/BigInt values → JSON-safe strings) is first and highest-value; TDD it. Then P0.2 single-source-of-truth reconciliation, P0.3 fence the estimate buckets below the fold, P0.4 window consistency, P0.6 harden the generator to emit code-form product-groups. This phase makes the report defensible — no new features.

**Phase 1 — Re-hero + hierarchy + visuals**
> Focus: reshape existing content into the tiered shape (§3). Hero becomes the PROVABLE-FORWARD number, not the big total — expect a smaller, honest headline (this is intended). Spotlight the sharpest finding; reorder by confidence×punch; fence the soft tier. P1.6: invoke the `dataviz` skill and build a coherent multi-chart visual system (forward-bleed projection, urgency timeline, confidence×dollars, improved category bar) — every chart value traces to a finding, no chart soup. No new detection.

**Phase 2 — Finding dossiers**
> Focus: turn each finding into the 5-part dossier (what happened / evidence rows / math shown / how-to-file + window / confidence & why). Surface the dispute drafts (draft-dispute.ts) and CSV export that already exist but are hidden. A Controller should be able to file any single row from the report alone.

**Phase 3 — New buckets (data-availability gated)**
> Focus: data availability is the gate, not SQL (read report-killer-new-buckets.md first). Do P3.1 (dim-weight upgrade to size-tier — NO new data) first. P3.2 (low-price), P3.3 (storage), P3.6 (promo-fee: coupon + deal-fee) are BLOCKED on generator work G1/G2 — build G1/G2 before their rules. Execute the referral fix P3.5 per report-killer-referral-guard.md as ONE change (map + guard together — the map alone makes false positives worse). Subscribe & Save stays deferred.

**Phase 4 — Web/PDF parity + aesthetic**
> Focus: PDF (Typst) and web tell the SAME tiered story with reconciled numbers — align the PDF cover off the big total onto the provable-forward hero. Aesthetic is LOCKED to light printable-document; document the frontend.md exception. OG/share tags read "Settlement Truth Audit," never "FBA reimbursement."

**Phase 5 — Synthetic validation + real-data asterisk list**
> Focus: NOT "wait for real data." Run across all synthetic brand profiles (code-form product-groups); confirm no object bugs, reconciled numbers, sane hierarchy. Write the explicit real-data asterisk list (the format assumptions only a real export confirms). Recalibrate the success metric OFF "median report value $30–75k" onto "surfaces a specific, verifiable, high-confidence, non-commoditized discrepancy."

**Phase 6 — Funnel consistency (run any time after Phase 1)**
> Focus: stop the surfaces around the report from contradicting it. P6.2 (email re-hero — it still says "Amazon owes you $X" and undoes Phase 0–1) is HIGHEST value — do it whenever the report hero is settled. P6.1 wire the processing page to real useRealtimeRun (kill the simulated setInterval stages). P6.3 promote upload-page privacy to a prominent conversion trust block. Every prospect-facing surface tells one consistent payout-integrity, provable-forward, sell-the-system story.

---

## Notes

- **Phase order:** 0 → 1 are the gate (ship these first — already a killer leap). 2, 3, 4 build depth; 3 can run parallel to 2. 5 validates. 6 (funnel) is independent — run after Phase 1 lands the hero so the email can mirror it.
- **If a session finishes early:** it should NOT roll into the next phase (the plan gates transitions on your confirmation). It can instead deepen tests or tighten docs within its phase.
- **The three research docs are pre-built** so Phase 3 doesn't re-derive Amazon mechanics — the session applies them, but still verifies against `detection-rules.md` and writes fixtures first.
