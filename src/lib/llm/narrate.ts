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
}

/**
 * Categories whose overcharge keeps recurring on future sales until the root cause
 * (wrong referral category / wrong size tier) is corrected — no dispute deadline.
 * Single source of truth for the "recurring" split; mirrored by category-meta's
 * `recurring` flag on the report page.
 */
export const ROLLING_CATEGORIES = new Set(["referral_fee", "fba_dimension"]);

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
  const { brand_name, total_recoverable_cents, urgent_recoverable_cents, findings_count, categories, settlement_months } = input;

  const totalFormatted = formatDollars(total_recoverable_cents);
  const urgentFormatted = formatDollars(urgent_recoverable_cents);

  // Executive summary
  const urgentLine = urgent_recoverable_cents > 0
    ? ` Of this, ${urgentFormatted} is time-sensitive: dispute windows close within 14 days.`
    : "";

  // Rolling overcharges (referral %, size-tier) have no deadline; they keep accruing.
  // The cumulative figure spans the whole settlement history, so quote a per-month
  // run-rate (cumulative ÷ months) rather than implying the cumulative recurs monthly.
  const recurringCents = categories
    .filter((c) => ROLLING_CATEGORIES.has(c.category))
    .reduce((s, c) => s + c.total_cents, 0);
  const recurringMonthlyCents = settlement_months && settlement_months > 0
    ? Math.round(recurringCents / settlement_months)
    : null;
  const recurringLine = recurringCents > 0
    ? recurringMonthlyCents !== null
      ? ` About ${formatDollars(recurringMonthlyCents)} of that is a recurring overcharge that keeps accruing each month until the root cause is corrected — ${formatDollars(recurringCents)} has built up over the ${settlement_months} months of data you provided.`
      : ` ${formatDollars(recurringCents)} of it is a recurring overcharge that keeps accruing until the root cause is corrected.`
    : "";

  const executive_summary = `Our forensic audit of ${brand_name}'s Amazon settlement, fee, and inventory data found ${findings_count} discrepancies totaling ${totalFormatted} where what Amazon charged or credited doesn't match what you're actually owed.${urgentLine}${recurringLine} Each finding below is backed by row-level evidence from your own reports and is ready to dispute.`;

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
