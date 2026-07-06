# Referral Wedge — Research-Seeded Map + False-Positive Guard (D6/D9 resolution)

**Created:** 2026-07-05 · **Companion to:** `report-killer-plan.md` P3.5 · **Applies to:** `src/lib/rules/reference/product-group-map.ts`, `src/lib/rules/referral-fee-mismatch.ts`
**Status:** Research-built draft, ready for the execution session to apply under TDD (fixtures first).

This is the concrete output of the "can we resolve D6 with research instead of real data?" spike. It contains: (1) the design conclusion, (2) a new latent-bug finding (**D9**), (3) an improved drop-in `product-group-map.ts`, (4) the false-positive guard spec with the Halcyon worked example, (5) the safe sequencing.

---

## 1. Design conclusion (the honest headline)

**The referral wedge cannot be made both *sensitive* and *safe* by a static product-group→rate map alone.** The map answers "what is the published rate for category X" (facts, knowable). It cannot answer "what is *this SKU's* correct category," because Amazon's fee category is set by an internal, non-public GL code, and one `product-group` value routinely spans two fee categories at different rates. So:

- Map conservatively (everything → 15% fallback) → **safe but blind**: misses every sub-15% overcharge (the flagship "CE billed 15% vs 8% owed" case).
- Map aggressively (trust `ce → 8%`) → **sensitive but dangerous**: fabricates overcharges on correctly-billed 15% accessories sharing the `ce`/`Consumer Electronics` product-group.

**Therefore the rule needs a per-SKU guard that decides whether a SKU is genuinely mis-billed, using the seller's own data — not just the map.** Two complementary signals do this safely (§4). The map is necessary but not sufficient; the guard is required, not optional.

---

## 2. D9 — latent false-positive bugs in the current map (NEW finding)

The current `product-group-map.ts` already contains rows that violate the asymmetric safety rule (map to a rate *below* reality → false positives). Independent of D6 coverage:

| Row | Problem | Effect | Fix |
|---|---|---|---|
| `('wireless', 'Consumer Electronics')` | `gl_wireless` spans cell phones **and** phone accessories; it is not the 8% Consumer Electronics category. Mapping to 8% understates the true rate for accessories (15%). | Correctly-billed 15% wireless accessories flagged as 7% overcharges. | **Remove** — unmapped → `Everything Else` 15% is safe. |
| `('shoes', 'Clothing and Accessories')` | Shoes bill at ~15% flat, not the tiered Clothing schedule (5/10/17%), which computes **below** 15% for most price points. | Correctly-billed 15% shoes flagged as overcharges on cheaper price bands. | **Remove** — unmapped → 15% is both safe and closer to the true shoe rate. |
| `('consumer electronics', …)` + `('ce', …)` → 8% | Factually correct as *reference data*, BUT `product-group` is heterogeneous: an electronics seller's cables/chargers (15% Electronics Accessories) carry the same `Consumer Electronics` product-group as its headphones (8% CE). **Proven on Halcyon: 13 of 42 SKUs.** | Without the §4 guard, every correctly-billed 15% accessory becomes a false 7% overcharge. | **Keep the row** (it's correct), but the **rule must apply the guard** and cap sub-15% findings below headline until it does (§5). |

**Add D9 to the plan's defect ledger.** It is the reason the guard is mandatory.

---

## 3. Improved `product-group-map.ts` (drop-in)

Changes vs current: removes the two D9 rows; adds the missing `Lawn Mowers…` identity + `gl_`-prefixed variants of the safe stems; annotates which categories are sub-15% (guard-required); documents the asymmetric safety rule and the "map only to categories that exist in `referral-rates.ts`" constraint (the rule's `JOIN referral_rates` is inner — a mapping to an absent category silently drops the finding, which is safe but zero-coverage). Bump `PRODUCT_GROUP_MAP_VERSION` → `2026.2` and the rule `version` when applied.

```ts
/**
 * Amazon Fee Preview `product-group` → referral category map: payout-integrity wedge.
 *
 * Bridges the Fee Preview `product-group` value (legacy code like "ce"/"gl_home", or a
 * clean label) to a referral category in referral-rates.ts, so the referral-fee rule can
 * look up the SKU's published rate.
 *
 * ── ASYMMETRIC SAFETY RULE (governs every row) ───────────────────────────────
 * The rule flags when charged_rate > expected_rate. So:
 *   • Mapping a code to a rate HIGHER than reality → a missed finding (SAFE).
 *   • Mapping a code to a rate LOWER  than reality → a FALSE finding (CATASTROPHIC
 *     for a verify-everything CFO).
 * Only add a row at high confidence. When unsure, DO NOT add it — unmapped falls back
 * to "Everything Else" (15%) via COALESCE, a high expected rate = safe under-fire.
 * Never map a heterogeneous or uncertain code to a sub-15% category.
 *
 * ── HETEROGENEITY CAVEAT (why the map is necessary but not sufficient) ────────
 * One `product-group` value routinely spans two fee categories. Example, proven on the
 * Halcyon dataset: an audio-accessory seller's cables/chargers (Electronics Accessories,
 * 15%) carry the SAME "Consumer Electronics" product-group as its headphones (8%). Trusting
 * a sub-15% mapping (▼ rows below) without the rule-level false-positive guard fabricates
 * overcharges on the correctly-billed 15% members. Rows tagged ▼ are sub-15% and MUST NOT
 * be trusted for a headline finding without the guard in referral-fee-mismatch.ts
 * (see report-killer-referral-guard.md §4).
 *
 * ── COVERAGE CONSTRAINT ──────────────────────────────────────────────────────
 * The referral rule INNER-joins referral_rates, so a code mapped to a category NOT in
 * referral-rates.ts silently drops (safe, zero coverage). To cover sub-15% categories
 * absent from the rate table (Automotive 12%, Grocery 8%, Pet/Office/Books 15%), FIRST add
 * those categories to referral-rates.ts. Until then those codes stay unmapped → 15% (safe).
 *
 * SOURCE (2026-07-05 research): Amazon does not publish the enumerated product-group/GL list;
 * the fee category is set by an internal GL code, not this column. Common gl_* stems compiled
 * from Amazon inventory flat-file "Valid Values" tabs, seller-forum GL lists, and integration
 * vendor docs. VERIFY + EXTEND against a real Fee Preview export (real-data asterisk, plan P5.3).
 */

export const PRODUCT_GROUP_MAP_VERSION = "2026.2";

export const PRODUCT_GROUP_MAP_CTE = /* sql */ `
  product_group_map(alias, referral_category) AS (
    VALUES
      -- ── Identity: canonical referral category labels → themselves ──
      ('clothing and accessories',         'Clothing and Accessories'),
      ('jewelry',                          'Jewelry'),
      ('watches',                          'Watches'),
      ('beauty, health and personal care', 'Beauty, Health and Personal Care'),
      ('baby products',                    'Baby Products'),
      ('furniture',                        'Furniture'),
      ('appliances - compact',             'Appliances - Compact'),
      ('electronics accessories',          'Electronics Accessories'),
      ('consumer electronics',             'Consumer Electronics'),   -- ▼ 8%
      ('personal computers',               'Personal Computers'),     -- ▼ 6%
      ('amazon device accessories',        'Amazon Device Accessories'),
      ('home and kitchen',                 'Home and Kitchen'),
      ('toys and games',                   'Toys and Games'),
      ('sports and outdoors',              'Sports and Outdoors'),
      ('lawn mowers and snow throwers',    'Lawn Mowers and Snow Throwers'),
      ('everything else',                  'Everything Else'),

      -- ── Consumer Electronics (8%) ▼ guard-required ──
      ('ce',                  'Consumer Electronics'),
      ('gl_ce',               'Consumer Electronics'),
      ('consumer_electronics','Consumer Electronics'),
      ('camera',              'Consumer Electronics'),
      ('gl_camera',           'Consumer Electronics'),
      ('camera_photo',        'Consumer Electronics'),
      ('gl_camera_photo',     'Consumer Electronics'),
      ('photo',               'Consumer Electronics'),

      -- ── Personal Computers (6%) ▼ guard-required ──
      ('pc',                  'Personal Computers'),
      ('gl_pc',               'Personal Computers'),
      ('personal_computer',   'Personal Computers'),

      -- ── Beauty / Health & Personal Care (8% ≤$10, else 15%) ▼ guard-required on low band ──
      ('beauty',              'Beauty, Health and Personal Care'),
      ('gl_beauty',           'Beauty, Health and Personal Care'),
      ('luxury_beauty',       'Beauty, Health and Personal Care'),  -- true 5% → maps higher → safe (miss)
      ('hpc',                 'Beauty, Health and Personal Care'),
      ('health_and_beauty',   'Beauty, Health and Personal Care'),
      ('gl_health_personal_care','Beauty, Health and Personal Care'),

      -- ── Baby (8% ≤$10, else 15%) ▼ guard-required on low band ──
      ('baby',                'Baby Products'),
      ('baby_product',        'Baby Products'),
      ('gl_baby_product',     'Baby Products'),

      -- ── Clothing (tiered 5/10/17%) — apparel ONLY, never shoes ▼ guard-required ──
      ('apparel',             'Clothing and Accessories'),
      ('gl_apparel',          'Clothing and Accessories'),

      -- ── Jewelry (20% → 5% above $250) / Watches (16% → 3% above $1500) ──
      ('gl_jewelry',          'Jewelry'),
      ('watch',               'Watches'),
      ('gl_watch',            'Watches'),

      -- ── Furniture (15% → 10% above $200) ──
      ('gl_furniture',        'Furniture'),

      -- ── Home & Kitchen (15%, = fallback; mapped for clarity, behaviour-neutral) ──
      ('home',                'Home and Kitchen'),
      ('gl_home',             'Home and Kitchen'),
      ('kitchen',             'Home and Kitchen'),
      ('gl_kitchen',          'Home and Kitchen'),
      ('home_garden',         'Home and Kitchen'),
      ('gl_home_garden',      'Home and Kitchen'),
      ('home_improvement',    'Home and Kitchen'),
      ('gl_home_improvement', 'Home and Kitchen'),

      -- ── Sports & Outdoors (15%, = fallback) ──
      ('sporting_goods',      'Sports and Outdoors'),
      ('gl_sporting_goods',   'Sports and Outdoors'),
      ('sports',              'Sports and Outdoors'),
      ('outdoors',            'Sports and Outdoors'),

      -- ── Toys & Games (15%, = fallback) ──
      ('toy',                 'Toys and Games'),
      ('gl_toy',              'Toys and Games'),
      ('toys',                'Toys and Games')

      -- REMOVED (D9, false-positive risk — leave unmapped → safe 15%):
      --   ('wireless','Consumer Electronics')  gl_wireless spans phones+accessories, not 8% CE
      --   ('shoes','Clothing and Accessories') shoes ~15% flat, not the tiered 5/10/17 schedule
      -- NOT MAPPED (category absent from referral-rates.ts → would inner-join-drop; add the
      -- category there first to gain coverage): automotive(12%), grocery(8%), pet_products(15%),
      -- office_product(15%), book(15%), musical_instruments, major_appliances.
  )
`;
```

---

## 4. The false-positive guard (spec for `referral-fee-mismatch.ts`)

The rule currently emits one finding per `(order-id, sku)` where `charged − expected ≥ 50¢`. The guard is a **per-SKU gate applied before those order-level findings are emitted**, using two safe, self-calibrating signals from the seller's own data. Both stay pure SQL (per the hard rule).

### Signal A — within-SKU temporal rate change (safest; no category needed)

If a single SKU's referral % is **stable** across its whole settlement history, that rate is almost certainly its correct rate (Amazon has applied it consistently) → do not flag, whatever the map says. If a SKU's referral % **changed** materially over time (e.g., 8% for 12 months → 15%), *that transition is the anomaly* — high-confidence, and it needs no category mapping at all.

- Compute per SKU: the distribution of `actual_pct` across its orders over time.
- **Flag** SKUs with a material within-SKU shift (e.g., a ≥3-percentage-point step between an earlier and later period). Confidence **high** — it's a self-evident change in Amazon's own billing.
- This catches the "the rate jumped and nobody noticed" case cleanly and safely. It does NOT catch a steady-state systematic overcharge (billed 15% its whole life when 8% was owed) — that's Signal B.

### Signal B — published-rate comparison, guarded by peer clustering (catches steady-state)

For steady-state overcharges you must compare to the published rate (map). Guard it so heterogeneous product-groups don't fabricate findings:

- Group the SKU's product-group peers (same `product-group`) and look at the **cluster of charged rates** within the account.
- **Suppress** a SKU's finding if its charged rate matches a **substantial peer cluster** at that rate (e.g., ≥ N SKUs or ≥ X% of the group also bill that exact rate). Rationale: if many SKUs under `Consumer Electronics` legitimately bill 15% (the accessories), a given 15% SKU is far more likely a correctly-billed accessory than a mis-billed device — our map is likelier wrong than Amazon is inconsistent across a whole cluster.
- **Flag** only SKUs whose charged rate is an **outlier above** both the mapped published rate AND their peer cluster. Confidence **medium** (depends on the map); never headline without Signal A corroboration.

### Worked example — Halcyon (why the guard works)

All 42 SKUs carry `product-group = Consumer Electronics`. Real split: ~22 devices (headphones/earbuds/speakers, true 8%) + ~13 accessories (cables/chargers, true 15%) + ~7 mixed.

- **Naïve map-only rule:** every 15%-billed cable → "should be 8%" → **13 false findings.** ✗
- **With Signal B:** the 13 cables form a 15% peer cluster → suppressed. A headphone SKU billed 15% while the device cluster bills 8% → flagged (real). ✓
- **With Signal A:** any SKU whose rate *changed* from 8%→15% mid-history → flagged high-confidence regardless of the accessory noise. ✓

### Confidence tiering (final)

| Situation | Confidence |
|---|---|
| Within-SKU temporal rate jump (Signal A) | **high** |
| Outlier above mapped rate AND above peer cluster (Signal B), high-confidence mapping | **medium** |
| Any finding resting on a sub-15% (▼) mapping without peer-cluster corroboration | **review** (never headline) |

---

## 5. Safe sequencing (so applying this doesn't backfire)

1. **Apply §3 map + §4 guard in the SAME change.** Shipping the fuller map *without* the guard makes the CE false-positive risk *worse*, not better (Halcyon would emit 13 false findings). They are one unit of work.
2. **Interim one-liner if the guard slips:** until Signal B exists, cap any finding whose `expected_pct < 0.15` (i.e., rests on a ▼ sub-15% mapping) at confidence `review` — never `high`, never headline. One line in the `confidence` function; decouples immediate safety from the full guard.
3. **Fixtures first (TDD, per detection-rules.md):** write `referral-fee-mismatch` fixtures that include a heterogeneous product-group (a 15% accessory cluster + an 8% device cohort + one genuinely mis-billed device) and assert the accessories are NOT flagged and the mis-billed device IS. Use **code-form** product-groups (P0.6), not labels.
4. **Real-data asterisk (P5.3):** the map's real-world code coverage + correctness stays provisional until the first real Fee Preview export confirms the actual `product-group` values and that no false positives appear.

---

## 6. Plan wiring

- Add **D9** to `report-killer-plan.md` §2 defect ledger (latent false-positive rows; fixed here).
- **P3.5** now delivers: apply §3 map + §4 guard (one change), fixtures with heterogeneous groups, interim confidence cap. Points here.
- The §1 conclusion ("map necessary, guard required") supersedes the plan's earlier implication that D6 is a data-entry fix.
