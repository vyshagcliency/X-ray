import type { Rule } from "./index";
import {
  REFERRAL_RATES_CTE,
  REFERRAL_MIN_FEE_CENTS,
  expectedReferralFeeCentsExpr,
} from "./reference/referral-rates";

/**
 * PRD §5.6 — Referral fee category misclassification (payout-integrity wedge).
 *
 * Compares the referral fee Amazon actually charged per order (Settlement V2:
 * Commission ÷ Principal) against the rate the SKU's category should pay
 * (referral-rate reference table, joined by product-group from the Fee Preview
 * report). Where the charged fee exceeds the expected fee + the $0.30/unit floor,
 * the overcharge is the recoverable amount — computed entirely in SQL.
 *
 * Contract-free: needs only the seller's own Settlement and Fee Preview reports.
 */
export const referralFeeMismatch: Rule = {
  id: "referral_fee_mismatch",
  version: "1.0.0",
  requiredReports: ["settlement", "fba_fee_preview"],
  category: "referral_fee",

  sql: /* sql */ `
    WITH ${REFERRAL_RATES_CTE},
    sku_category AS (
      SELECT DISTINCT
        sku,
        "product-group" AS product_group
      FROM read_csv($fba_fee_preview_url, auto_detect=true)
    ),
    settlement_agg AS (
      SELECT
        "order-id" AS order_id,
        sku,
        ROUND(SUM(CASE WHEN "amount-description" = 'Principal' THEN amount ELSE 0 END) * 100) AS revenue_cents,
        ROUND(SUM(CASE WHEN "amount-description" = 'Commission' THEN -amount ELSE 0 END) * 100) AS referral_charged_cents,
        SUM(CASE WHEN "amount-description" = 'Principal' THEN "quantity-purchased" ELSE 0 END) AS qty
      FROM read_csv($settlement_url, auto_detect=true)
      WHERE "transaction-type" = 'Order' AND sku IS NOT NULL
      GROUP BY "order-id", sku
    ),
    joined AS (
      SELECT
        s.order_id,
        s.sku,
        c.product_group,
        s.revenue_cents,
        s.referral_charged_cents,
        s.qty,
        GREATEST(
          ROUND(${expectedReferralFeeCentsExpr("s.revenue_cents")}),
          ${REFERRAL_MIN_FEE_CENTS} * GREATEST(s.qty, 1)
        ) AS expected_fee_cents
      FROM settlement_agg s
      JOIN sku_category c ON c.sku = s.sku
      JOIN referral_rates rr ON rr.product_group = c.product_group
      WHERE s.revenue_cents > 0 AND s.referral_charged_cents > 0
    )
    SELECT
      order_id,
      sku,
      product_group,
      revenue_cents,
      referral_charged_cents,
      expected_fee_cents,
      referral_charged_cents - expected_fee_cents AS amount_cents,
      ROUND(referral_charged_cents::DOUBLE / revenue_cents, 4) AS actual_pct,
      ROUND(expected_fee_cents::DOUBLE / revenue_cents, 4) AS expected_pct,
      NULL::DATE AS window_closes_on,
      row_number() OVER (ORDER BY order_id, sku) AS row_ref
    FROM joined
    WHERE referral_charged_cents - expected_fee_cents >= 50
  `,

  // Larger rate gaps are unambiguous overcharges (PRD §5.6: "High when category is
  // unambiguous"); small gaps near the threshold are medium.
  confidence: (row) => {
    const actual = Number(row.actual_pct ?? 0);
    const expected = Number(row.expected_pct ?? 0);
    return actual - expected >= 0.05 ? "high" : "medium";
  },
};
