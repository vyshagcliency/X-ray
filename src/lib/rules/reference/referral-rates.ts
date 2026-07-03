/**
 * Amazon US referral-fee reference table: payout-integrity wedge (Phase 1.5).
 *
 * The referral-fee mismatch rule (PRD §5.6) compares the referral % Amazon
 * actually charged (Settlement V2: Commission ÷ Principal) against the rate the
 * SKU's category *should* pay. This file is that reference rate table.
 *
 * Progressive (piecewise) model: handles flat, 2-tier, and 3-tier categories with
 * one expression. Per category:
 *   t1_cents, t2_cents : price-tier boundaries (t1 ≤ t2), in cents
 *   rate1, rate2, rate3: fraction applied to the revenue in each band
 * Expected fee for revenue R (cents):
 *   LEAST(R, t1)*rate1
 *   + GREATEST(LEAST(R, t2) - t1, 0)*rate2
 *   + GREATEST(R - t2, 0)*rate3
 *   - Flat category:  t1 = t2 = 0, rate3 = the flat rate  → R*rate3
 *   - 2-tier category: t1 = t2 = threshold               → below*rate1, above*rate3
 *   - 3-tier category: t1 < t2                            → all three bands
 * Amazon also enforces a $0.30/unit minimum referral fee.
 *
 * SOURCE: Amazon's public published referral fee schedule (no Seller Central login
 *   required): https://sell.amazon.com/pricing, fetched 2026-06-01.
 *   No referral % changes were announced for 2026 (structure stable vs 2025).
 *
 * Values below for tiered categories are verbatim from that page. Flat-rate
 * categories shown were either confirmed there or are long-stable published rates
 * (Consumer Electronics 8%, Personal Computers 6%); verify a specific flat category
 * against the page before relying on a large finding. Bump REFERRAL_REFERENCE_VERSION
 * and the dependent rule's `version` when these values change.
 *
 * ⚠️ PRODUCT-GROUP MAPPING GAP: the rule joins the Fee Preview report's `product-group`
 * column directly to `product_group` here. In production Amazon's report uses product
 * *group codes* (e.g. "ce", "kitchen") that differ from these referral category labels;
 * a code→category mapping is needed before running on real data. Fixtures use matching
 * labels so the join works in tests.
 */

export const REFERRAL_REFERENCE_VERSION = "2026.2";

/** Minimum referral fee Amazon charges per unit, in cents. */
export const REFERRAL_MIN_FEE_CENTS = 30;

/**
 * Named CTE defining the referral-rate table. Compose into a rule via:
 *   `WITH ${REFERRAL_RATES_CTE}, ... SELECT ...`
 * Columns: product_group, t1_cents, t2_cents, rate1, rate2, rate3.
 */
export const REFERRAL_RATES_CTE = /* sql */ `
  referral_rates(product_group, t1_cents, t2_cents, rate1, rate2, rate3) AS (
    VALUES
      -- 3-tier
      ('Clothing and Accessories',          1500,  2000,  0.05, 0.10, 0.17),
      -- 2-tier (t1 = t2; rate2 unused, set = rate1 for clarity)
      ('Jewelry',                           25000, 25000, 0.20, 0.20, 0.05),
      ('Watches',                           150000,150000,0.16, 0.16, 0.03),
      ('Beauty, Health and Personal Care',  1000,  1000,  0.08, 0.08, 0.15),
      ('Baby Products',                     1000,  1000,  0.08, 0.08, 0.15),
      ('Furniture',                         20000, 20000, 0.15, 0.15, 0.10),
      ('Appliances - Compact',              30000, 30000, 0.15, 0.15, 0.08),
      ('Electronics Accessories',           10000, 10000, 0.15, 0.15, 0.08),
      ('Lawn Mowers and Snow Throwers',     50000, 50000, 0.15, 0.15, 0.08),
      -- flat (t1 = t2 = 0; rate3 = flat rate)
      ('Consumer Electronics',              0,     0,     0.0,  0.0,  0.08),
      ('Personal Computers',                0,     0,     0.0,  0.0,  0.06),
      ('Amazon Device Accessories',         0,     0,     0.0,  0.0,  0.45),
      ('Home and Kitchen',                  0,     0,     0.0,  0.0,  0.15),
      ('Toys and Games',                    0,     0,     0.0,  0.0,  0.15),
      ('Sports and Outdoors',               0,     0,     0.0,  0.0,  0.15),
      ('Everything Else',                   0,     0,     0.0,  0.0,  0.15)
  )
`;

/**
 * SQL expression for the expected referral fee in cents, given a revenue column
 * (cents) joined to a `referral_rates` row aliased `rr`. Caller applies the
 * $0.30/unit minimum at the per-unit level.
 */
export function expectedReferralFeeCentsExpr(revenueCentsCol: string): string {
  return /* sql */ `(
    LEAST(${revenueCentsCol}, rr.t1_cents) * rr.rate1
    + GREATEST(LEAST(${revenueCentsCol}, rr.t2_cents) - rr.t1_cents, 0) * rr.rate2
    + GREATEST(${revenueCentsCol} - rr.t2_cents, 0) * rr.rate3
  )`;
}
