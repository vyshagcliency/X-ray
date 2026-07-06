# Phase 3 New Buckets — Research Build + Data-Availability Truth

**Created:** 2026-07-05 · **Companion to:** `report-killer-plan.md` Phase 3 (P3.1–P3.3) · **Status:** research-built; **reshapes the P3 recommendation.**
**Applies to:** `src/lib/rules/*`, `reference/fba-fee-schedule.ts`, `src/lib/csv/headers.ts`, the synthetic generator.

This is the research-build spike for the three proposed new buckets (Low-Price FBA, weight/dim-rounding, storage-cube). **Doing the research first changed the recommendation** — so this doc leads with the honest finding, then gives the safe design for what's actually buildable.

---

## 1. Headline finding — the gate is DATA AVAILABILITY, not SQL

The three buckets are **not** equal "free adds on the current data." Verified against the Halcyon ingest (2026-07-05):

| Proposed bucket | Needs | On current ingest? | Verdict |
|---|---|---|---|
| **Low-Price FBA not applied** | per-unit price + **actually-billed fulfillment fee** | ❌ settlement carries only `Principal`+`Commission`; no fulfillment-fee line | **Blocked — needs a new data source** |
| **Weight / dim-weight rounding** | dims + weight + billed fee | ⚠️ dims present, but (a) no billed fee, (b) **substantially overlaps the existing size-tier rule** post-2026 | **Reframe to the distinct sub-case** |
| **Storage on wrong cubic footage** | **Monthly Storage Fees** report (billed cu-ft) + dims | ❌ `storage_fees` ingest = **Aged-Surcharge** report, no cu-ft/volume basis | **Blocked — needs a new report type** |

**Two root causes, both fixable but not free:**

1. **No actually-billed fulfillment fee anywhere in ingest.** Real Amazon settlement V2 carries `FBAPerUnitFulfillmentFee` (and storage, and other fee lines) under `amount-description` — but the synthetic settlement emits only `Principal`/`Commission`, and no rule or ingest reads fee lines. The fee-preview `estimated-fee-total` is a *quote*, not a charge; building recovery findings on a quote is exactly the "hypothesis vs confirmed finding" trap the wiki warns about. **Any fee-overcharge bucket that claims real recoverable dollars needs the billed fee line.**
2. **`storage_fees` is the wrong report for a cube check.** It's the Aged Inventory Surcharge report (`snapshot-date, qty-charged, surcharge-type, surcharge-amount`) — no cubic feet, no monthly-storage basis. A cube-overcharge check needs the **Monthly Inventory Storage Fees** report, which isn't in ingest.

**Consequence:** the real Phase 3 long pole is **ingest + generator work**, not rule SQL. Same shape as the referral finding — the honest blocker is data fidelity, not detection logic.

---

## 2. The 2026 dim-weight overhaul reshapes the "weight" bucket

Research (2026): Amazon now bills the **greater of actual weight and dimensional weight** across all major tiers (dim weight = L×W×H ÷ 139, **rounded up to the next lb**). Items **under 12 oz or over 150 lb are exempt** — billed on actual weight only. A 3.5% fuel surcharge (since Apr 17 2026) rides on top.

**What this does to the proposed "weight-rounding" bucket:**

- The existing `size_tier_misclassification` rule checks a SKU's raw longest/median/shortest side + unit weight against tier bounds — but it does **NOT** compute dimensional weight (verified: `correctTierRankExpr` never divides by 139). So there IS a real gap: a SKU can fit a tier *dimensionally* yet get pushed to a higher billed weight band by its dim weight. Post-2026, correctly *modeling* dim weight is part of "what tier is correct."
- **The clean, distinct, SAFE angle is the exemption case:** a SKU **under 12 oz** whose billed fee reflects a **dim-weight-inflated** tier. Amazon must bill sub-12oz on actual weight only, so dim-weight applied there is an unambiguous overcharge — no judgment call, computable from dims alone.

**Recommendation:** don't ship a standalone "weight-rounding" bucket that reheats size-tier. Instead: **(a) fold dim-weight into the existing size-tier rule** (compute `dim_weight = ceil(L×W×H/139)`, use `max(actual, dim)` for the weight-tier test, respecting the <12oz / >150lb exemption) as a rule upgrade — this makes the *existing* flagship rule correct for 2026 — and **(b) surface the sub-12oz-dim-weight-exemption violation** as its own high-confidence sub-finding. That's more valuable than a near-duplicate bucket and avoids two rules disagreeing on the same SKU.

---

## 3. Per-bucket safe design (for when data is available)

Each obeys the same asymmetric safety rule as the referral work: **only flag when the overcharge is unambiguous; when a legitimate exception is possible, drop to `review`, never headline.** All arithmetic in SQL.

### Bucket A — Low-Price FBA discount not applied
- **Mechanic (researched):** items priced **under $10** get an automatic fulfillment-fee discount (~**$0.86/unit** in 2026, applied by Amazon, no seller action). If a sub-$10 SKU's billed per-unit fulfillment fee equals the standard (non-discounted) rate for its tier, the discount was missed.
- **Needs:** per-unit price (settlement `Principal ÷ qty` — available) + **billed per-unit fulfillment fee** (settlement `FBAPerUnitFulfillmentFee` — **not in current ingest/generator**).
- **Safe design (self-calibrating, mirrors size-tier v1.1.0):** within a tier, compare sub-$10 SKUs' billed fee to the **median billed fee of ≥$10 SKUs in the same tier**. If a sub-$10 SKU is **not** ~$0.86 below that peer median, flag the missed discount = the gap × units. Self-calibration avoids hardcoding the exact low-price schedule (which has tier/price nuances). **Confidence:** medium (price + peer baseline are solid; the exact discount varies by tier). **Never** flag if the billed fee is already at/below the peer low-price level.
- **Status:** design-ready; **blocked on the billed-fee data source (§4).**

### Bucket B — Dim-weight overcharge (folded into size-tier + exemption sub-check)
- **Mechanic:** billed weight = `max(actual_oz/16, ceil(L×W×H/139))` lb, except <12 oz / >150 lb = actual only.
- **Two findings:**
  - **B1 (rule upgrade):** teach `size_tier_misclassification` to compute dim weight and use `max(actual, dim)` for the weight-tier test (respecting exemptions). Recovers cases where Amazon's tier is right on raw dims but the SKU is genuinely lighter-billed than charged. Same confidence model as today.
  - **B2 (exemption violation, sharp + safe):** SKU **< 12 oz** whose billed fee implies a **dim-weight-based** (heavier) tier than its actual weight warrants → Amazon shouldn't apply dim weight at all → **high confidence**, computable from dims + weight alone.
- **Needs:** dims + weight (in fee-preview — available) for the *tier* logic; billed fee (not in ingest) only to attach real recovered dollars. B2's *detection* works on fee-preview alone; its *dollar amount* wants the billed fee.
- **Status:** B1/B2 detection buildable now on fee-preview; **dollar precision blocked on billed-fee source.** Recommend building as a **size-tier rule upgrade**, not a new registry entry.

### Bucket C — Storage fee on wrong cubic footage
- **Mechanic (researched):** monthly storage = daily-avg-volume (cu ft) × rate; volume = **L×W×H ÷ 1,728**; standard ~**$0.78/cu ft** (Jan–Sep) / **$2.40** (Q4), oversize higher. Overcharge = Amazon billing on an **inflated cube** vs the SKU's measured dims.
- **Needs:** the **Monthly Inventory Storage Fees** report (billed cu-ft + fee per SKU) — **not in ingest** (`storage_fees` = Aged Surcharge). Plus dims (fee-preview — available) to recompute the correct cube.
- **Safe design:** recompute cube from measured dims; where the billed cube exceeds measured cube beyond a tolerance (packaging vs unit dims can differ legitimately → generous tolerance), flag the excess × rate. **Confidence:** medium at best — unit vs packaged dims is a real legitimate-exception source, so this leans `review`.
- **Status:** **blocked on a new report type** (Monthly Storage Fees) in ingest + generator.

---

## 4. The real work — ingest + generator (the long pole)

For any of these to be **built and fixture-tested on synthetic data** (per §1.5 of the plan — we validate on synthetic, not real), the generator and ingest must first carry the data:

- [ ] **G1 — Settlement fee lines.** Extend the generator's `settlement.csv` to emit `FBAPerUnitFulfillmentFee` (and, ideally, `FBAStorageFee`) rows under `amount-description`, at realistic per-tier rates, with a controllable "discount-missed" / "dim-weight-inflated" knob so the buckets have something to detect. Extend `headers.ts` settlement signature + any rule that reads fee lines. **Unblocks A and B's dollar amounts.**
- [ ] **G2 — Monthly Storage Fees report.** Add a new report type (`monthly_storage`) with a cu-ft basis + billed fee, a header signature in `headers.ts`, an upload tile, and a generator that emits realistic volumes with an "inflated-cube" knob. **Unblocks C.**
- [ ] **G3 — Adversarial format (ties to P0.6).** Emit these in real Amazon column/label forms so format mismatches fail in CI, not on real data.

Until G1/G2 land, A and C **cannot** produce confirmed findings on the data we have — only fee-preview-estimate hypotheses, which violate the "confirmed finding, not hypothesis" bar for the report body.

---

## 5. Revised Phase 3 recommendation

Replace "add 3 new buckets" with a **sequenced, data-honest** set:

1. **P3.1 (do first, no new data) — Dim-weight upgrade to size-tier (B1+B2).** Highest value, lowest data cost: makes the flagship rule 2026-correct and adds the sharp sub-12oz exemption finding, all from the fee-preview already in ingest. Ship as a `size_tier_misclassification` **version bump**, with fixtures for a dim-weight-inflated SKU and a sub-12oz exemption case.
2. **P3.2 (after G1) — Low-Price FBA not applied (Bucket A).** Build the generator fee lines (G1) first, then the self-calibrating rule. Sharp, provable, safe.
3. **P3.3 (after G2, lowest priority) — Storage cube (Bucket C).** Needs a whole new report type (G2) and is inherently lower-confidence (unit vs packaged dims). Defer unless the storage report is easy to add; it's the weakest of the three on both effort and confidence.

**Net vs the original plan:** one bucket (weight) becomes a rule *upgrade* not a new bucket; two buckets (low-price, storage) are gated behind generator/ingest work and reordered by data cost. This is a *better* Phase 3 — it avoids a near-duplicate rule and refuses to ship estimate-based "findings" that would fail the traceability promise.

---

## 6. Plan wiring

- `report-killer-plan.md` Phase 3: replace P3.1–P3.3 with the §5 sequence; add G1/G2/G3 as explicit generator/ingest prerequisites (they are the real long pole, not the SQL).
- Add to the §2 defect ledger / notes: **the fee-preview `estimated-fee-total` is a quote, not a charge** — any fulfillment-fee-overcharge finding must reconcile against a billed fee line, or be labelled a hypothesis (not headline).
- Real-data asterisk (P5.3): add the actual settlement fee-line `amount-description` variants and the Monthly Storage report's real columns to the "confirm on first real export" list.
- These buckets stay **contract-free** (seller's own reports only) — the wiki guardrail holds; the blocker is report *coverage*, not contracts.

**Sources (2026-07-05):** [Amazon: 2026 US Low Price FBA fee](https://sellercentral.amazon.com/help/hub/reference/external/GMUTB89XM7AATPR3) · [Amazon: 2026 US FBA fulfillment fee changes](https://sellercentral.amazon.com/help/hub/reference/external/GABBX6GZPA8MSZGW) · [Amazon: product size tiers](https://sellercentral.amazon.com/help/hub/reference/external/G201105770) · [Amazon: monthly inventory storage fees](https://sellercentral.amazon.com/help/hub/reference/external/G3EDYEF6KUCFQTNM) · dim-weight overhaul coverage (amalert, phasev, shipbob).

---

## 7. Promo-fee buckets (3P Amazon promotion-fee leakage) — added 2026-07-05

Founder-selected (Reading B of the "trade promotions" question): contract-free Amazon-3P *promotion-fee* overcharges. **Same data gate as §1** — all live as settlement `amount-description` fee lines the synthetic settlement doesn't emit (Principal/Commission only). So these are **blocked on G1** (settlement fee-lines in ingest + generator). Researched mechanics + safe designs:

### Bucket D — Coupon redemption fee errors
- **Mechanic (researched):** Amazon charges a **`CouponRedemptionFee` of $0.60 per coupon redeemed**. Error vectors: fee charged with **no corresponding coupon discount** on the same order (internal inconsistency); fee charged **outside the coupon's active window**; multiple redemption fees on one unit.
- **Needs:** settlement `CouponRedemptionFee` lines (**G1**). The *internal-inconsistency* variant (fee present, no promo discount on the same `order-id`) is fully settlement-internal → computable once G1 lands, no promo report needed. The *window* variant needs a Coupons/Promotions report (defer).
- **Safe design:** flag orders with a `CouponRedemptionFee` line but **no promotion/coupon discount amount** on that order → **high confidence** (unambiguous — you were billed for a redemption that didn't happen). Amount = the fee. Never flag when a matching discount exists.

### Bucket E — Deal fee double-booking (Lightning / Best Deal)
- **Mechanic (researched):** a deal fee (`LightningDealFee` / Best-Deal fee) is charged per deal run. Error: **two deal fees stacked** on the same ASIN/deal window (Lightning + Best Deal double-booked, or a duplicate).
- **Needs:** settlement deal-fee lines (**G1**).
- **Safe design:** flag **≥2 deal fees for the same ASIN within the same deal window** → **high confidence** (duplicate charges are unambiguous). Amount = the excess fee(s). A single deal fee is legitimate → never flagged.

### Bucket F — Subscribe & Save over-charge (LOWER priority — semi-contract-dependent)
- **Mechanic (researched):** S&S base discount funding is **seller-chosen (0/5/10%)**; Amazon funds ~5% for FBA base and additional tiered amounts. Leakage: seller charged for the **Amazon-funded** portion, or a discount **deeper than the configured tier**.
- **Needs:** S&S discount lines (**G1**) **AND the seller's configured funding %** — which is account config, not in any report. That makes this **closer to contract-dependent** (like co-op/Walmart) than to the pure contract-free wedge.
- **Verdict:** **defer.** It breaks the "seller's own reports only" purity (needs the S&S config), and the funding split is nuanced → false-positive risk. Belongs with the contract-dependent checks (post ~5 logos), not this build. Named here so it's not silently dropped.

### Sequencing for D–F
- **D + E ride on G1** alongside Low-Price FBA (P3.2) — once the generator emits settlement fee lines, all three become buildable together (shared data work). Both are **high-confidence, contract-free, sharp** → good "you found what?" additions.
- **F is deferred** (semi-contract-dependent).

**Promo-fee sources (2026-07-05):** [Amazon SP-API settlement report values](https://developer-docs.amazon.com/sp-api/docs/report-type-values-settlement) · [Settlement fee groups & names (Webgility)](https://helpcenter.webgility.com/en/articles/6257546-amazon-settlement-report-fee-groups-and-fee-names) · [Amazon Subscribe & Save for sellers (funding tiers)](https://sell.amazon.com/programs/subscribe-and-save).
