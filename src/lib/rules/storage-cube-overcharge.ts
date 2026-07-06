import type { Rule } from "./index";

/**
 * Storage fee billed on an inflated cube (payout-integrity wedge, Phase 3 / P3.3).
 *
 * Monthly FBA storage is billed on a SKU's cubic-foot volume × a rate. The Monthly Storage
 * Fees report carries Amazon's billed `item-volume` (cu ft) and the estimated monthly fee;
 * the FBA Fee Preview carries the SKU's measured dimensions. Recomputing the true cube from
 * those dimensions (L×W×H ÷ 1,728) and comparing it to Amazon's billed volume surfaces SKUs
 * charged storage on more cubic feet than their dimensions warrant. The recoverable amount is
 * the inflated share of the billed fee.
 *
 * Asymmetric safety — the weakest-confidence bucket by design. Unit vs packaged dimensions
 * legitimately differ (a boxed item measures larger than its bare dimensions), so this uses a
 * GENEROUS tolerance (billed must exceed measured by >25% to flag) and leans `review` (low)
 * confidence — only a >2× inflation, which no packaging explains, reaches medium. It never
 * headlines.
 *
 * Contract-free: needs only the seller's own Monthly Storage Fees and Fee Preview reports.
 */
// REAL-DATA ASTERISK (P5.3): the Monthly Storage `item-volume` basis + the packaged-vs-bare dims
// 1.25× tolerance are unverified against a real export (review-tier by design) — see real-data-asterisks.md §A(b)(d)(e)+§B.
export const storageCubeOvercharge: Rule = {
  id: "storage_cube_overcharge",
  version: "1.0.0",
  requiredReports: ["monthly_storage", "fba_fee_preview"],
  category: "storage_cube",

  sql: /* sql */ `
    WITH measured AS (
      SELECT
        sku,
        asin,
        -- True cube in cubic feet from the measured dimensions (1,728 cu in per cu ft).
        (CAST("longest-side" AS DOUBLE) * CAST("median-side" AS DOUBLE) * CAST("shortest-side" AS DOUBLE)) / 1728.0 AS measured_cuft
      FROM read_csv($fba_fee_preview_url, auto_detect=true)
    ),
    billed AS (
      SELECT
        asin,
        CAST("item-volume" AS DOUBLE) AS billed_cuft,
        CAST("average-quantity-on-hand" AS DOUBLE) AS avg_qty,
        ROUND(CAST("estimated-monthly-storage-fee" AS DOUBLE) * 100) AS fee_cents,
        "month-of-charge" AS charge_month
      FROM read_csv($monthly_storage_url, auto_detect=true)
      WHERE CAST("item-volume" AS DOUBLE) > 0
    ),
    joined AS (
      SELECT
        m.sku,
        m.asin,
        m.measured_cuft,
        b.billed_cuft,
        b.avg_qty,
        b.fee_cents,
        b.charge_month,
        b.billed_cuft / NULLIF(m.measured_cuft, 0) AS inflation_ratio,
        -- Recoverable = the inflated share of the billed fee.
        ROUND(b.fee_cents * (b.billed_cuft - m.measured_cuft) / NULLIF(b.billed_cuft, 0)) AS amount_cents
      FROM billed b
      JOIN measured m ON m.asin = b.asin
      WHERE m.measured_cuft > 0
        -- Generous 25% tolerance: packaged dims legitimately exceed bare dims.
        AND b.billed_cuft > m.measured_cuft * 1.25
    )
    SELECT
      sku,
      asin,
      ROUND(measured_cuft, 4) AS measured_cuft,
      ROUND(billed_cuft, 4) AS billed_cuft,
      ROUND(inflation_ratio, 4) AS inflation_ratio,
      avg_qty,
      fee_cents,
      amount_cents,
      (charge_month::DATE + INTERVAL 90 DAY)::DATE AS window_closes_on,
      row_number() OVER (ORDER BY sku) AS row_ref
    FROM joined
    WHERE amount_cents >= 50
  `,

  // Leans review: unit vs packaged dims is a real legitimate-exception source. Only an
  // inflation no packaging explains (>2×) reaches medium; never high, never headline.
  confidence: (row) => {
    const ratio = Number(row.inflation_ratio ?? 0);
    return ratio >= 2 ? "medium" : "low";
  },
};
