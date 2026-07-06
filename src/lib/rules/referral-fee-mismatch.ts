import type { Rule } from "./index";
import {
  REFERRAL_RATES_CTE,
  REFERRAL_MIN_FEE_CENTS,
  expectedReferralFeeCentsExpr,
} from "./reference/referral-rates";
import { PRODUCT_GROUP_MAP_CTE } from "./reference/product-group-map";

/**
 * PRD §5.6: Referral fee category misclassification (payout-integrity wedge).
 *
 * Compares the referral fee Amazon actually charged per order (Settlement V2:
 * Commission ÷ Principal) against the rate the SKU's category should pay
 * (referral-rate reference table, joined by product-group from the Fee Preview
 * report). Where the charged fee exceeds the expected fee + the $0.30/unit floor,
 * the overcharge is the recoverable amount, computed entirely in SQL.
 *
 * False-positive guard (v2.0.0 — P3.5 / D9). A static product-group→rate map is
 * necessary but not sufficient: one `product-group` value routinely spans two fee
 * categories (e.g. `ce` covers 8% headphones AND 15% cables), so a sub-15% mapping alone
 * fabricates overcharges on the correctly-billed 15% members. Two self-calibrating signals
 * from the seller's own data gate the map, both pure SQL:
 *   • Signal A — a within-SKU referral-rate JUMP over time (e.g. 8%→15%). Self-evident in
 *     Amazon's own billing; flagged high, no category certainty needed.
 *   • Signal B — peer clustering: suppress a SKU whose charged rate matches a substantial
 *     peer cluster in the same product-group (the map is likelier wrong than Amazon is
 *     inconsistent across a whole cluster); flag only outliers above the peer norm.
 * Findings resting on a sub-15% mapping are confidence-tiered by that corroboration and
 * never headline without it (asymmetric safety — a false finding is the worst outcome).
 *
 * Contract-free: needs only the seller's own Settlement and Fee Preview reports.
 */
export const referralFeeMismatch: Rule = {
  id: "referral_fee_mismatch",
  // 2.0.0: false-positive guard (Signals A+B) + confidence tiering by mapping certainty.
  // Major bump — suppresses map-only false positives and re-tiers confidence on the same data.
  version: "2.0.0",
  requiredReports: ["settlement", "fba_fee_preview"],
  category: "referral_fee",

  sql: /* sql */ `
    WITH ${REFERRAL_RATES_CTE},
    ${PRODUCT_GROUP_MAP_CTE},
    sku_category AS (
      SELECT DISTINCT
        p.sku,
        -- Map the report's product-group code/label to a referral category.
        -- Unmapped → 'Everything Else' (15%): a mapping miss can only cause a
        -- missed overcharge, never a false one.
        COALESCE(m.referral_category, 'Everything Else') AS product_group
      FROM read_csv($fba_fee_preview_url, auto_detect=true) p
      LEFT JOIN product_group_map m
        ON m.alias = LOWER(TRIM(p."product-group"))
    ),
    settlement_agg AS (
      SELECT
        "order-id" AS order_id,
        sku,
        "posted-date" AS posted_date,
        ROUND(SUM(CASE WHEN "amount-description" = 'Principal' THEN amount ELSE 0 END) * 100) AS revenue_cents,
        ROUND(SUM(CASE WHEN "amount-description" = 'Commission' THEN -amount ELSE 0 END) * 100) AS referral_charged_cents,
        SUM(CASE WHEN "amount-description" = 'Principal' THEN "quantity-purchased" ELSE 0 END) AS qty
      FROM read_csv($settlement_url, auto_detect=true)
      WHERE "transaction-type" = 'Order' AND sku IS NOT NULL
      GROUP BY "order-id", sku, "posted-date"
    ),
    -- Per-SKU orders + an early/late half by posted-date (drives Signal A).
    sku_orders AS (
      SELECT
        sku, revenue_cents, referral_charged_cents,
        NTILE(2) OVER (PARTITION BY sku ORDER BY posted_date) AS half
      FROM settlement_agg
      WHERE revenue_cents > 0 AND referral_charged_cents > 0
    ),
    sku_rate AS (
      SELECT
        o.sku,
        c.product_group,
        SUM(o.referral_charged_cents)::DOUBLE / NULLIF(SUM(o.revenue_cents), 0) AS rate,
        -- Signal A: late-period rate minus early-period rate (0 if not enough history).
        CASE
          WHEN SUM(CASE WHEN o.half = 1 THEN o.revenue_cents ELSE 0 END) > 0
           AND SUM(CASE WHEN o.half = 2 THEN o.revenue_cents ELSE 0 END) > 0
          THEN
            SUM(CASE WHEN o.half = 2 THEN o.referral_charged_cents ELSE 0 END)::DOUBLE
              / SUM(CASE WHEN o.half = 2 THEN o.revenue_cents ELSE 0 END)
            - SUM(CASE WHEN o.half = 1 THEN o.referral_charged_cents ELSE 0 END)::DOUBLE
              / SUM(CASE WHEN o.half = 1 THEN o.revenue_cents ELSE 0 END)
          ELSE 0
        END AS rate_shift
      FROM sku_orders o
      JOIN sku_category c ON c.sku = o.sku
      GROUP BY o.sku, c.product_group
    ),
    -- Signal B: peer clustering within the mapped product-group (self-join over SKUs).
    peer_counts AS (
      SELECT
        a.sku, a.product_group, a.rate, a.rate_shift, grp.grp_size,
        SUM(CASE WHEN abs(b.rate - a.rate) <= 0.01 THEN 1 ELSE 0 END) AS peers_at_rate,
        SUM(CASE WHEN b.rate <= a.rate - 0.03 THEN 1 ELSE 0 END) AS peers_below
      FROM sku_rate a
      JOIN sku_rate b ON b.product_group = a.product_group
      JOIN (SELECT product_group, COUNT(*) AS grp_size FROM sku_rate GROUP BY product_group) grp
        ON grp.product_group = a.product_group
      GROUP BY a.sku, a.product_group, a.rate, a.rate_shift, grp.grp_size
    ),
    sku_guard AS (
      SELECT
        sku,
        (rate_shift >= 0.03) AS temporal_jump,
        -- Suppress when this SKU's rate is shared by a substantial cluster (≥25% of a group
        -- of ≥4): a whole cluster billing this rate is likelier correct than our map.
        (grp_size >= 4 AND peers_at_rate::DOUBLE / grp_size >= 0.25) AS in_cluster,
        -- Corroborated when a majority of peers bill ≥3pp LESS — this SKU is a genuine
        -- outlier above the peer norm (lifts a sub-15% finding from review to medium).
        (peers_below::DOUBLE / grp_size >= 0.5) AS peer_corroborated
      FROM peer_counts
    ),
    joined AS (
      SELECT
        s.order_id,
        s.sku,
        c.product_group,
        s.revenue_cents,
        s.referral_charged_cents,
        s.qty,
        g.temporal_jump,
        g.peer_corroborated,
        GREATEST(
          ROUND(${expectedReferralFeeCentsExpr("s.revenue_cents")}),
          ${REFERRAL_MIN_FEE_CENTS} * GREATEST(s.qty, 1)
        ) AS expected_fee_cents
      FROM settlement_agg s
      JOIN sku_category c ON c.sku = s.sku
      JOIN referral_rates rr ON rr.product_group = c.product_group
      JOIN sku_guard g ON g.sku = s.sku
      WHERE s.revenue_cents > 0 AND s.referral_charged_cents > 0
        -- The guard gate: suppress peer-cluster SKUs UNLESS a within-SKU rate jump proves
        -- the anomaly. Signal A overrides Signal B suppression.
        AND (g.temporal_jump OR NOT g.in_cluster)
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
      temporal_jump,
      peer_corroborated,
      NULL::DATE AS window_closes_on,
      row_number() OVER (ORDER BY order_id, sku) AS row_ref
    FROM joined
    WHERE referral_charged_cents - expected_fee_cents >= 50
  `,

  // Confidence tiered by mapping certainty (P3.5, asymmetric safety):
  //   • within-SKU rate jump (Signal A) → high — self-evident in Amazon's own billing.
  //   • rests on a sub-15% (▼) mapping → medium only if peer-corroborated, else review (low),
  //     never headline — this is the heterogeneity false-positive class (D9).
  //   • billed above a standard ≥15% rate → gap-based high/medium (unambiguous overcharge).
  confidence: (row) => {
    if (row.temporal_jump === true) return "high";
    const actual = Number(row.actual_pct ?? 0);
    const expected = Number(row.expected_pct ?? 0);
    if (expected < 0.15) {
      return row.peer_corroborated === true ? "medium" : "low";
    }
    return actual - expected >= 0.05 ? "high" : "medium";
  },
};
