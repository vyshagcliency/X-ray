import type { Rule } from "./index";

/**
 * Coupon redemption fee charged with no matching promotion (payout-integrity wedge,
 * Phase 3 / P3.6-D).
 *
 * Amazon charges a $0.60 `CouponRedemptionFee` per coupon redeemed. When an order carries
 * that fee line but NO corresponding promotion discount (`ItemPromotionDiscount`) on the
 * same order, the seller was billed for a redemption that didn't happen — an unambiguous,
 * settlement-internal inconsistency. The recoverable amount is the fee itself.
 *
 * Asymmetric safety: flags only when a redemption fee has no matching discount on the same
 * order; an order with both a fee and a discount is a legitimate redemption, never flagged.
 * High confidence — the evidence is entirely within the seller's own settlement.
 *
 * Contract-free: needs only the seller's own Settlement report.
 */
export const couponFeeError: Rule = {
  id: "coupon_fee_error",
  version: "1.0.0",
  requiredReports: ["settlement"],
  category: "coupon_fee",

  sql: /* sql */ `
    WITH order_lines AS (
      SELECT
        "order-id" AS order_id,
        sku,
        MIN("posted-date") AS charge_date,
        SUM(CASE WHEN "amount-description" = 'CouponRedemptionFee' THEN -amount ELSE 0 END) AS coupon_fee,
        SUM(CASE WHEN "amount-description" = 'CouponRedemptionFee' THEN 1 ELSE 0 END) AS coupon_fee_lines,
        SUM(CASE WHEN "amount-description" IN ('ItemPromotionDiscount', 'Promotion', 'PromotionShipping') THEN 1 ELSE 0 END) AS promo_lines
      FROM read_csv($settlement_url, auto_detect=true)
      WHERE "transaction-type" = 'Order' AND sku IS NOT NULL
      GROUP BY "order-id", sku
    )
    SELECT
      order_id,
      sku,
      charge_date,
      coupon_fee_lines,
      ROUND(coupon_fee * 100) AS amount_cents,
      -- Cast back to DATE: DATE + INTERVAL yields a TIMESTAMP, which would render with a
      -- spurious time and shift a day under local-TZ parsing downstream.
      (charge_date::DATE + INTERVAL 90 DAY)::DATE AS window_closes_on,
      row_number() OVER (ORDER BY order_id, sku) AS row_ref
    FROM order_lines
    WHERE coupon_fee_lines >= 1
      AND promo_lines = 0
      AND ROUND(coupon_fee * 100) >= 50
  `,

  // High: a redemption fee with no redemption on the same order is unambiguous.
  confidence: () => "high",
};
