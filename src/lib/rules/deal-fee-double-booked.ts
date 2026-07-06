import type { Rule } from "./index";

/**
 * Deal fee double-booked (payout-integrity wedge, Phase 3 / P3.6-E).
 *
 * A deal fee (`LightningDealFee` / Best-Deal fee) is charged once per deal run. When two or
 * more deal fees land on the same SKU on the same date (one deal window) — a Lightning + Best
 * Deal double-book, or a plain duplicate — the extra fee(s) are an unambiguous overcharge.
 * The recoverable amount is the excess: total fees minus one legitimate fee.
 *
 * Asymmetric safety: a single deal fee is legitimate and never flagged; only ≥2 fees for the
 * same SKU in the same window flag. High confidence — duplicate charges are self-evident.
 *
 * Contract-free: needs only the seller's own Settlement report.
 */
export const dealFeeDoubleBooked: Rule = {
  id: "deal_fee_double_booked",
  version: "1.0.0",
  requiredReports: ["settlement"],
  category: "deal_fee",

  sql: /* sql */ `
    WITH deal_fees AS (
      SELECT
        sku,
        "posted-date" AS deal_date,
        COUNT(*) AS fee_count,
        SUM(-amount) AS total_fee
      FROM read_csv($settlement_url, auto_detect=true)
      WHERE "transaction-type" = 'Order'
        AND sku IS NOT NULL
        AND "amount-description" IN ('LightningDealFee', 'BestDealFee', 'DealFee')
      GROUP BY sku, "posted-date"
    )
    SELECT
      sku,
      deal_date,
      fee_count,
      ROUND(total_fee * 100) AS total_fee_cents,
      -- Excess = every fee beyond the one legitimate charge.
      ROUND(total_fee * 100 * (fee_count - 1) / fee_count) AS amount_cents,
      -- Cast back to DATE: DATE + INTERVAL yields a TIMESTAMP, which would render with a
      -- spurious time and shift a day under local-TZ parsing downstream.
      (deal_date::DATE + INTERVAL 90 DAY)::DATE AS window_closes_on,
      row_number() OVER (ORDER BY sku, deal_date) AS row_ref
    FROM deal_fees
    WHERE fee_count >= 2
      AND ROUND(total_fee * 100 * (fee_count - 1) / fee_count) >= 50
  `,

  // High: two deal fees in one window for one SKU is a self-evident duplicate.
  confidence: () => "high",
};
