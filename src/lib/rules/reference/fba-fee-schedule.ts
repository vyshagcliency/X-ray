/**
 * Amazon US FBA fulfillment-fee size-tier reference table — payout-integrity wedge (Phase 1.5).
 *
 * The size-tier misclassification rule (PRD §5.5) recomputes the *correct* size tier
 * from a SKU's real dimensions/weight (FBA Fee Preview report) and compares the fee
 * for that tier against the fee Amazon actually charged. This file is the schedule
 * that maps a tier → per-unit fulfillment fee, plus the dimension/weight bounds that
 * define each tier.
 *
 * "Correct tier" = the smallest-`rank` tier whose every max bound is >= the SKU's
 * measured longest/median/shortest side and unit weight.
 *
 * SOURCE: Amazon Seller Central "Product size tiers" + 2026 FBA fee changes.
 *   https://sellercentral.amazon.com/help/hub/reference/external/G201105770
 *   https://sellercentral.amazon.com/help/hub/reference/external/G201411300
 *   2026 restructure (eff. Jan 15 2026): tiers are Small Standard / Large Standard /
 *   Large Bulky / Extra-Large; a 3.5% fuel & logistics surcharge applies since Apr 17 2026.
 *
 * ⚠️ REPRESENTATIVE SUBSET — fees here are a simplified, price-bracket-agnostic
 * baseline for detecting *tier* misclassification (the cross-tier delta), not an exact
 * fee calculator. Verify against Amazon's live fee table before production. Bump
 * FBA_FEE_REFERENCE_VERSION and the dependent rule's `version` when values change.
 *
 * Units: dimensions in inches, weight in ounces, fee in cents.
 */

export const FBA_FEE_REFERENCE_VERSION = "2026.1";

/**
 * Named CTE defining the size-tier schedule. Compose into a rule via:
 *   `WITH ${FBA_SIZE_TIERS_CTE}, ... SELECT ...`
 * Columns: tier, rank, max_longest_in, max_median_in, max_shortest_in, max_weight_oz, fee_cents.
 * `rank` ascends from the smallest/cheapest tier; the correct tier is the lowest rank
 * whose bounds all accommodate the SKU.
 */
export const FBA_SIZE_TIERS_CTE = /* sql */ `
  fba_size_tiers(tier, rank, max_longest_in, max_median_in, max_shortest_in, max_weight_oz, fee_cents) AS (
    VALUES
      ('Small Standard', 1, 15.0,  12.0,  0.75,   16.0,  350),
      ('Large Standard', 2, 18.0,  14.0,  8.0,   320.0,  550),
      ('Large Bulky',    3, 59.0,  33.0, 33.0,   800.0,  950),
      ('Extra-Large',    4, 108.0, 108.0, 108.0, 2400.0, 2500)
  )
`;

/**
 * SQL expression returning the `rank` of the correct (smallest-fitting) tier for a
 * SKU's measured dimensions/weight. Expects the `fba_size_tiers` CTE in scope and the
 * given column expressions for longest/median/shortest side (inches) and weight (oz).
 */
export function correctTierRankExpr(
  longestIn: string,
  medianIn: string,
  shortestIn: string,
  weightOz: string,
): string {
  return /* sql */ `(
    SELECT MIN(t.rank)
    FROM fba_size_tiers t
    WHERE ${longestIn}  <= t.max_longest_in
      AND ${medianIn}   <= t.max_median_in
      AND ${shortestIn} <= t.max_shortest_in
      AND ${weightOz}   <= t.max_weight_oz
  )`;
}
