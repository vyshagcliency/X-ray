import type { Rule } from "./index";
import {
  FBA_SIZE_TIERS_CTE,
  correctTierRankExpr,
} from "./reference/fba-fee-schedule";

/**
 * PRD §5.5: Dimension/size-tier fee overcharge (payout-integrity wedge).
 *
 * Recomputes the *correct* FBA size tier from a SKU's measured dimensions/weight
 * (Fee Preview) and flags SKUs Amazon placed in a larger/costlier tier than their
 * dimensions warrant. The overcharge is the SKU's actual charged fee
 * (`estimated-fee-total`) minus what the correct tier should cost × units sold.
 *
 * Self-calibrating: the "correct tier cost" is the median fee Amazon actually charges
 * SKUs that ARE correctly classified into that tier (from the seller's own data),
 * with no hardcoded fee dollars on the recovery path. The published fee schedule is only a
 * fallback for tiers with no clean in-dataset sample, and is still the source of the
 * dimension/weight tier boundaries (which are stable and not dollar-sensitive).
 *
 * 2026 dimensional weight (v2.0.0): Amazon bills the greater of actual and dimensional
 * weight (dim = ceil(L×W×H / 139) lb), EXCEPT items under 12 oz or over 150 lb, which are
 * billed on actual weight only. Modeling this makes the correct-tier calc accurate — it
 * suppresses false positives where a higher tier is genuinely justified by dim weight, and
 * it surfaces the sharp sub-12oz-exemption violation: a light item billed as if dim weight
 * applied when the exemption forbids it (`exemption_violation` → high confidence).
 *
 * Contract-free: needs only the seller's own Fee Preview and Settlement reports.
 */
export const sizeTierMisclassification: Rule = {
  id: "size_tier_misclassification",
  // 2.0.0: correct tier now models 2026 dimensional weight + the <12oz/>150lb exemption.
  // Major bump — it changes which SKUs flag on the same data (fewer dim-weight-legit false
  // positives; adds sub-12oz exemption violations).
  version: "2.0.0",
  requiredReports: ["fba_fee_preview", "settlement"],
  category: "fba_dimension",

  sql: /* sql */ `
    WITH ${FBA_SIZE_TIERS_CTE},
    preview AS (
      SELECT
        sku,
        asin,
        "product-size-tier" AS amazon_tier,
        CAST("longest-side" AS DOUBLE) AS longest_in,
        CAST("median-side" AS DOUBLE) AS median_in,
        CAST("shortest-side" AS DOUBLE) AS shortest_in,
        CAST("item-package-weight" AS DOUBLE) AS weight_oz,
        -- 2026 dimensional weight in oz: ceil(L×W×H / 139) lb × 16. Amazon bills the
        -- greater of this and actual weight (except the exemption below).
        CEIL(
          (CAST("longest-side" AS DOUBLE) * CAST("median-side" AS DOUBLE) * CAST("shortest-side" AS DOUBLE)) / 139.0
        ) * 16 AS dim_weight_oz,
        -- The fee Amazon actually charges this SKU, from its own report.
        ROUND(CAST("estimated-fee-total" AS DOUBLE) * 100) AS actual_fee_cents
      FROM read_csv($fba_fee_preview_url, auto_detect=true)
    ),
    measured AS (
      SELECT
        p.*,
        -- Billed weight = greater of actual and dimensional weight, EXCEPT items under
        -- 12 oz or over 150 lb (2400 oz) which Amazon bills on actual weight only. This is
        -- the weight the correct size tier is computed from.
        CASE
          WHEN p.weight_oz < 12 OR p.weight_oz > 2400 THEN p.weight_oz
          ELSE GREATEST(p.weight_oz, p.dim_weight_oz)
        END AS billed_weight_oz
      FROM preview p
    ),
    units AS (
      SELECT
        sku,
        SUM(CASE WHEN "amount-description" = 'Principal' THEN "quantity-purchased" ELSE 0 END) AS units_sold
      FROM read_csv($settlement_url, auto_detect=true)
      WHERE "transaction-type" = 'Order' AND sku IS NOT NULL
      GROUP BY sku
    ),
    classified AS (
      SELECT
        m.sku,
        m.asin,
        m.amazon_tier,
        m.actual_fee_cents,
        m.longest_in, m.median_in, m.shortest_in, m.weight_oz,
        m.dim_weight_oz, m.billed_weight_oz,
        -- Correct tier uses the BILLED weight (dim-weight-aware, exemption-respecting).
        ${correctTierRankExpr("m.longest_in", "m.median_in", "m.shortest_in", "m.billed_weight_oz")} AS correct_rank,
        amzt.rank AS amazon_rank
      FROM measured m
      LEFT JOIN fba_size_tiers amzt ON amzt.tier = m.amazon_tier
    ),
    -- Self-calibration: the typical fee Amazon charges for SKUs that ARE correctly
    -- classified into a tier (amazon_rank = correct_rank), derived from the seller's
    -- own data, no hardcoded dollars. Median is robust to the odd outlier.
    tier_baseline AS (
      SELECT correct_rank AS rank, median(actual_fee_cents) AS baseline_fee_cents
      FROM classified
      WHERE amazon_rank = correct_rank AND actual_fee_cents IS NOT NULL
      GROUP BY correct_rank
    ),
    joined AS (
      SELECT
        c.sku,
        c.asin,
        c.amazon_tier,
        ct.tier AS correct_tier,
        c.amazon_rank,
        c.correct_rank,
        c.actual_fee_cents,
        -- Correct fee = empirical baseline for the correct tier; fall back to the
        -- published schedule when this dataset has no clean sample for that tier.
        COALESCE(tb.baseline_fee_cents, ct.fee_cents) AS correct_fee_cents,
        c.actual_fee_cents - COALESCE(tb.baseline_fee_cents, ct.fee_cents) AS per_unit_overcharge_cents,
        COALESCE(u.units_sold, 0) AS units_sold,
        c.longest_in, c.median_in, c.shortest_in, c.weight_oz,
        c.dim_weight_oz,
        -- Sub-12oz-exemption violation: a light item (<12oz, so dim-weight-exempt) whose
        -- dim weight exceeds actual — i.e. it was over-tiered as if dim weight applied,
        -- which the exemption forbids. Unambiguous → high confidence.
        (c.weight_oz < 12 AND c.dim_weight_oz > c.weight_oz) AS exemption_violation
      FROM classified c
      JOIN fba_size_tiers ct ON ct.rank = c.correct_rank
      LEFT JOIN tier_baseline tb ON tb.rank = c.correct_rank
      LEFT JOIN units u ON u.sku = c.sku
      WHERE c.correct_rank IS NOT NULL
        AND c.amazon_rank IS NOT NULL
        AND c.correct_rank < c.amazon_rank
    )
    SELECT
      sku,
      asin,
      amazon_tier,
      correct_tier,
      amazon_rank,
      correct_rank,
      actual_fee_cents,
      correct_fee_cents,
      per_unit_overcharge_cents,
      units_sold,
      per_unit_overcharge_cents * GREATEST(units_sold, 1) AS amount_cents,
      longest_in, median_in, shortest_in, weight_oz,
      dim_weight_oz,
      exemption_violation,
      NULL::DATE AS window_closes_on,
      row_number() OVER (ORDER BY sku) AS row_ref
    FROM joined
    WHERE per_unit_overcharge_cents > 0
  `,

  // Hard data, but final recovery needs a cubiscan request (PRD §5.5). High when the
  // overcharge is large, the SKU is off by 2+ tiers, or it's a sub-12oz dim-weight
  // exemption violation (unambiguous); medium otherwise.
  confidence: (row) => {
    if (row.exemption_violation === true) return "high";
    const perUnit = Number(row.per_unit_overcharge_cents ?? 0);
    const amazonRank = Number(row.amazon_rank ?? 0);
    const correctRank = Number(row.correct_rank ?? 0);
    if (perUnit >= 300 || amazonRank - correctRank >= 2) return "high";
    return "medium";
  },
};
