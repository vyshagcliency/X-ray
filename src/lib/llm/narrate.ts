/**
 * LLM narrative generation: Sonnet 4.5 pattern analysis.
 *
 * The LLM narrates from pre-computed findings JSON. It NEVER calculates.
 * Every dollar figure in output must trace back to findings.amount_cents.
 *
 * Phase 1: Template-based prose with optional LLM enhancement.
 * Falls back to template if LLM is unavailable or cost circuit breaker trips.
 */

import { formatDollars } from "@/lib/format";

interface FindingSummary {
  category: string;
  count: number;
  total_cents: number;
  urgent_count: number;
  urgent_cents: number;
  top_skus: string[];
}

interface NarrativeInput {
  brand_name: string;
  total_recoverable_cents: number;
  urgent_recoverable_cents: number;
  findings_count: number;
  /** Whole months the settlement report spans; null when no date column was present. */
  settlement_months?: number | null;
  categories: FindingSummary[];
  // Reconciled hero figures from data-builder (`computeNarrativeFigures`). When provided,
  // the executive summary quotes THESE so it can never diverge from the headline — the
  // hero leads with the high-confidence rolling run-rate and provable-only urgent, and the
  // narrative must match (fixes the recurring/urgent "two bases on one page" bug,
  // decisions.md 2026-07-07). Optional: legacy callers fall back to the old aggregates.
  provable_urgent_cents?: number;
  /** Provable-tier total (row-level amounts; estimated tier fenced out). The exec summary
   *  LEADS with this, not the soft all-in total (Vyshag, 2026-07-08). */
  provable_cents?: number;
  /** High-confidence rolling overcharge, cumulative across the settlement window. */
  provable_forward_cents?: number;
  /** High-confidence rolling overcharge as a monthly run-rate; null when window unknown. */
  provable_forward_monthly_cents?: number | null;
}

/**
 * Categories whose overcharge keeps recurring on future sales until the root cause
 * (wrong referral category / wrong size tier) is corrected — no dispute deadline.
 * Single source of truth for the "recurring" split; mirrored by category-meta's
 * `recurring` flag on the report page.
 */
export const ROLLING_CATEGORIES = new Set([
  "referral_fee",
  "fba_dimension",
  // Low-Price FBA discount misses recur on every sub-$10 sale until corrected — a rolling
  // overcharge with no dispute deadline (like referral/size-tier). Coupon/deal fees are
  // discrete one-time charges with real windows, so they are NOT rolling.
  "low_price_fee",
]);

export interface NarrativeOutput {
  executive_summary: string;
  category_narratives: Record<string, string>;
  methodology_note: string;
  source: "template" | "llm";
}

/**
 * Generate the report narrative. Template-based for Phase 1.
 * LLM enhancement will be added in Phase 1.5.
 */
export function generateNarrative(input: NarrativeInput): NarrativeOutput {
  const { brand_name, total_recoverable_cents, urgent_recoverable_cents, categories, settlement_months } = input;

  // The exec summary quotes the SAME figures the hero leads with. When data-builder passes
  // reconciled figures, trust them exactly; otherwise fall back to the pre-reconciliation
  // aggregates (legacy callers / tests). `?? ` only falls back on undefined, so a provided
  // 0 is honored.
  const reconciled = input.provable_forward_cents !== undefined;

  // Time-sensitive line = the hero's PROVABLE urgent figure (the estimated tier is fenced
  // out of the headline), not the all-findings urgent.
  const urgentForNarrative = input.provable_urgent_cents ?? urgent_recoverable_cents;
  const urgentLine = urgentForNarrative > 0
    ? ` Of this, ${formatDollars(urgentForNarrative)} is time-sensitive: dispute windows close within 14 days.`
    : "";

  // Rolling overcharges (referral %, size-tier) have no deadline; they keep accruing. The
  // hero leads with the HIGH-confidence rolling overcharge as a monthly run-rate, so the
  // narrative uses the reconciled provable-forward figures when present (else the old
  // all-confidence rolling sum ÷ months).
  const recurringCents = reconciled
    ? input.provable_forward_cents!
    : categories
        .filter((c) => ROLLING_CATEGORIES.has(c.category))
        .reduce((s, c) => s + c.total_cents, 0);
  const recurringMonthlyCents = reconciled
    ? (input.provable_forward_monthly_cents ?? null)
    : settlement_months && settlement_months > 0
      ? Math.round(recurringCents / settlement_months)
      : null;
  const recurringLine = recurringCents > 0
    ? recurringMonthlyCents !== null
      ? ` About ${formatDollars(recurringMonthlyCents)} of that keeps accruing each month until the root cause is corrected, ${formatDollars(recurringCents)} built up over the ${settlement_months} months of data you provided.`
      : ` ${formatDollars(recurringCents)} of it keeps accruing until the root cause is corrected.`
    : "";

  // Lead with the PROVABLE, row-traceable figure, not the soft all-in total (which
  // includes flat estimates). The soft total + estimated split is shown visually on the
  // report, so the prose stays tight (Vyshag, 2026-07-08).
  const leadFormatted = formatDollars(input.provable_cents ?? total_recoverable_cents);
  const executive_summary = `We recomputed ${brand_name}'s Amazon settlement, fee, and inventory data and found ${leadFormatted} in provable overcharges and missing credits, every figure traced to a specific row in your own reports.${urgentLine}${recurringLine} Each finding below is ready to dispute.`;

  // Per-category narratives
  const category_narratives: Record<string, string> = {};
  for (const cat of categories) {
    const catTotal = formatDollars(cat.total_cents);
    const skuList = cat.top_skus.slice(0, 3).join(", ");
    const urgentNote = cat.urgent_count > 0
      ? ` ${cat.urgent_count} of these have dispute windows closing within 14 days.`
      : "";

    const templates: Record<string, string> = {
      // Payout-integrity findings (the lead wedge).
      referral_fee: `We found ${cat.count} orders where Amazon charged a higher referral fee than your product category's published rate, totaling ${catTotal}. The most affected SKUs include ${skuList || "multiple products"}. A wrong category rate compounds on every sale until it's corrected.${urgentNote}`,
      fba_dimension: `We found ${cat.count} SKUs Amazon placed in a larger size tier than their measured dimensions warrant, overcharging the fulfillment fee on every unit shipped, totaling ${catTotal}. Affected SKUs include ${skuList || "multiple products"}.${urgentNote}`,
      return_credit: `We found ${cat.count} SKUs where customer returns were credited back on paper but the inventory or cash credit never landed in your account, totaling ${catTotal}. Top affected SKUs: ${skuList || "multiple products"}.${urgentNote}`,
      aged_surcharge: `We found ${cat.count} SKUs charged an aged-inventory surcharge while they were actively selling, totaling ${catTotal}. Affected SKUs include ${skuList || "multiple products"}.${urgentNote}`,
      low_price_fee: `We found ${cat.count} sub-$10 SKUs billed the full fulfillment fee where Amazon's automatic Low-Price FBA discount should have applied, totaling ${catTotal}. Affected SKUs include ${skuList || "multiple products"}. The missed discount recurs on every unit until it's corrected.${urgentNote}`,
      coupon_fee: `We found ${cat.count} orders charged a coupon redemption fee with no matching promotion on the same order, totaling ${catTotal}. Affected SKUs include ${skuList || "multiple products"}; you were billed for a redemption that didn't happen.${urgentNote}`,
      deal_fee: `We found ${cat.count} SKUs charged two or more deal fees within a single deal window, totaling ${catTotal}. Affected SKUs include ${skuList || "multiple products"}. A deal runs one fee; the duplicates are recoverable.${urgentNote}`,
      storage_cube: `We found ${cat.count} SKUs billed monthly storage on a larger cubic-foot volume than their measured dimensions warrant, totaling ${catTotal}. Affected SKUs include ${skuList || "multiple products"}. A re-measurement confirms the true cube before filing.${urgentNote}`,
      // Reimbursement findings (demoted add-ons).
      returns: `We identified ${cat.count} customer returns where Amazon received damaged or defective items but never issued a reimbursement, totaling ${catTotal}. The most affected SKUs include ${skuList || "multiple products"}.${urgentNote}`,
      lost_inventory: `We found ${cat.count} instances of inventory reported as lost or damaged in Amazon's fulfillment centers without a corresponding reimbursement, totaling ${catTotal}. Affected SKUs include ${skuList || "multiple products"}.${urgentNote}`,
    };

    category_narratives[cat.category] = templates[cat.category]
      ?? `We identified ${cat.count} discrepancies totaling ${catTotal} in the ${cat.category} category.${urgentNote}`;
  }

  const methodology_note = "This analysis recomputes what Amazon should have charged or credited on each sale, using your category's published referral rates and your products' measured dimensions, and matches it against what Amazon actually did, drawing on your Settlement, FBA Fee Preview, Returns, Reimbursements, and Inventory Ledger reports. Each finding is a verifiable discrepancy backed by specific rows in your own Seller Central data. Confidence levels reflect the strength of the evidence: high-confidence findings have direct, unambiguous matches.";

  return {
    executive_summary,
    category_narratives,
    methodology_note,
    source: "template",
  };
}
