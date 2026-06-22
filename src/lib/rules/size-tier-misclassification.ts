import type { Rule } from "./index";
import {
  FBA_SIZE_TIERS_CTE,
  correctTierRankExpr,
} from "./reference/fba-fee-schedule";

/**
 * PRD §5.5 — Dimension/size-tier fee overcharge (payout-integrity wedge).
 *
 * Recomputes the *correct* FBA size tier from a SKU's measured dimensions/weight
 * (Fee Preview report) using the size-tier reference schedule, and compares it
 * against the tier Amazon actually assigned. Where Amazon placed the SKU in a
 * larger/costlier tier than its dimensions warrant, the per-unit fee delta × units
 * sold (from settlement) is the recoverable overcharge — computed in SQL.
 *
 * Contract-free: needs only the seller's own Fee Preview and Settlement reports.
 */
export const sizeTierMisclassification: Rule = {
  id: "size_tier_misclassification",
  version: "1.0.0",
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
        CAST("item-package-weight" AS DOUBLE) AS weight_oz
      FROM read_csv($fba_fee_preview_url, auto_detect=true)
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
        p.sku,
        p.asin,
        p.amazon_tier,
        p.longest_in, p.median_in, p.shortest_in, p.weight_oz,
        ${correctTierRankExpr("p.longest_in", "p.median_in", "p.shortest_in", "p.weight_oz")} AS correct_rank,
        amzt.rank AS amazon_rank,
        amzt.fee_cents AS amazon_fee_cents
      FROM preview p
      LEFT JOIN fba_size_tiers amzt ON amzt.tier = p.amazon_tier
    ),
    joined AS (
      SELECT
        c.sku,
        c.asin,
        c.amazon_tier,
        ct.tier AS correct_tier,
        c.amazon_rank,
        c.correct_rank,
        c.amazon_fee_cents,
        ct.fee_cents AS correct_fee_cents,
        c.amazon_fee_cents - ct.fee_cents AS per_unit_overcharge_cents,
        COALESCE(u.units_sold, 0) AS units_sold,
        c.longest_in, c.median_in, c.shortest_in, c.weight_oz
      FROM classified c
      JOIN fba_size_tiers ct ON ct.rank = c.correct_rank
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
      amazon_fee_cents,
      correct_fee_cents,
      per_unit_overcharge_cents,
      units_sold,
      per_unit_overcharge_cents * GREATEST(units_sold, 1) AS amount_cents,
      longest_in, median_in, shortest_in, weight_oz,
      NULL::DATE AS window_closes_on,
      row_number() OVER (ORDER BY sku) AS row_ref
    FROM joined
    WHERE per_unit_overcharge_cents > 0
  `,

  // Hard data, but final recovery needs a cubiscan request (PRD §5.5). High when the
  // overcharge is large or the SKU is off by 2+ tiers; medium otherwise.
  confidence: (row) => {
    const perUnit = Number(row.per_unit_overcharge_cents ?? 0);
    const amazonRank = Number(row.amazon_rank ?? 0);
    const correctRank = Number(row.correct_rank ?? 0);
    if (perUnit >= 300 || amazonRank - correctRank >= 2) return "high";
    return "medium";
  },
};
