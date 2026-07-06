import type { Rule } from "./index";

/**
 * Low-Price FBA discount not applied (payout-integrity wedge, Phase 3 / P3.2).
 *
 * Amazon automatically discounts the per-unit fulfillment fee (~$0.86/unit in 2026) on
 * items priced under $10 — no seller action required. When a sub-$10 SKU's billed
 * fulfillment fee equals the standard (non-discounted) rate for its size tier, the discount
 * was missed and the difference is recoverable.
 *
 * Self-calibrating (mirrors size-tier v1.1.0): the "standard" fee is the MEDIAN billed
 * fulfillment fee of the seller's own ≥$10 SKUs in the same size tier — no hardcoded fee
 * schedule on the recovery path. A sub-$10 SKU billed within half a discount of that peer
 * baseline (i.e. clearly not ~$0.86 below it) is flagged; the recoverable is the missed
 * discount × units, capped at the ~$0.86/unit discount (never invents a larger recovery).
 *
 * Asymmetric safety: only flags when a legitimate discount is clearly absent. A tier needs
 * ≥2 ≥$10 peers for a baseline (else the SKU is skipped, safe under-fire), and thin peer
 * samples drop to `review`. The exact low-price schedule varies by tier, so confidence
 * caps at medium.
 *
 * Contract-free: needs only the seller's own Settlement and Fee Preview reports.
 */
export const lowPriceFba: Rule = {
  id: "low_price_fba",
  version: "1.0.0",
  requiredReports: ["settlement", "fba_fee_preview"],
  category: "low_price_fee",

  sql: /* sql */ `
    WITH sku_settle AS (
      SELECT
        sku,
        SUM(CASE WHEN "amount-description" = 'Principal' THEN amount ELSE 0 END) AS revenue,
        SUM(CASE WHEN "amount-description" = 'Principal' THEN "quantity-purchased" ELSE 0 END) AS units,
        SUM(CASE WHEN "amount-description" = 'FBAPerUnitFulfillmentFee' THEN -amount ELSE 0 END) AS fulfillment_paid,
        SUM(CASE WHEN "amount-description" = 'FBAPerUnitFulfillmentFee' THEN "quantity-purchased" ELSE 0 END) AS fee_units
      FROM read_csv($settlement_url, auto_detect=true)
      WHERE "transaction-type" = 'Order' AND sku IS NOT NULL
      GROUP BY sku
    ),
    sku_metrics AS (
      SELECT
        sku,
        ROUND(revenue * 100 / NULLIF(units, 0)) AS avg_price_cents,
        ROUND(fulfillment_paid * 100 / NULLIF(fee_units, 0)) AS billed_fee_cents,
        units
      FROM sku_settle
      WHERE units > 0 AND fee_units > 0
    ),
    tiered AS (
      SELECT
        m.sku,
        m.avg_price_cents,
        m.billed_fee_cents,
        m.units,
        p."product-size-tier" AS tier
      FROM sku_metrics m
      JOIN read_csv($fba_fee_preview_url, auto_detect=true) p ON p.sku = m.sku
    ),
    -- Peer baseline: the standard fulfillment fee for a tier = median billed fee among the
    -- seller's own ≥$10 SKUs in that tier (which don't qualify for the low-price discount).
    tier_baseline AS (
      SELECT tier, median(billed_fee_cents) AS peer_fee_cents, COUNT(*) AS peer_n
      FROM tiered
      WHERE avg_price_cents >= 1000
      GROUP BY tier
    ),
    flagged AS (
      SELECT
        t.sku,
        t.tier,
        t.avg_price_cents,
        t.billed_fee_cents,
        t.units,
        b.peer_fee_cents,
        b.peer_n,
        -- Recoverable = how far the billed fee sits above the discounted rate
        -- (peer_fee − 86), capped at the ~$0.86/unit discount.
        LEAST(t.billed_fee_cents - (b.peer_fee_cents - 86), 86) AS per_unit_overcharge_cents
      FROM tiered t
      JOIN tier_baseline b ON b.tier = t.tier
      WHERE t.avg_price_cents < 1000        -- sub-$10: eligible for the discount
        AND b.peer_n >= 2                   -- need a real peer baseline (else skip = safe)
        AND t.billed_fee_cents > b.peer_fee_cents - 43   -- got less than half the discount
    )
    SELECT
      sku,
      tier,
      avg_price_cents,
      billed_fee_cents,
      peer_fee_cents,
      peer_n,
      units,
      per_unit_overcharge_cents,
      per_unit_overcharge_cents * GREATEST(units, 1) AS amount_cents,
      NULL::DATE AS window_closes_on,
      row_number() OVER (ORDER BY sku) AS row_ref
    FROM flagged
    WHERE per_unit_overcharge_cents > 0
      AND per_unit_overcharge_cents * GREATEST(units, 1) >= 50
  `,

  // Medium: price + peer baseline are solid, but the exact low-price schedule varies by
  // tier (PRD/new-buckets §3-A). A thin peer sample (2–3 SKUs) drops to review.
  confidence: (row) => {
    const peerN = Number(row.peer_n ?? 0);
    return peerN >= 4 ? "medium" : "low";
  },
};
