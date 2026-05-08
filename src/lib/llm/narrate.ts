/**
 * LLM narrative generation — Sonnet 4.5 pattern analysis.
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
  categories: FindingSummary[];
}

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
  const { brand_name, total_recoverable_cents, urgent_recoverable_cents, findings_count, categories } = input;

  const totalFormatted = formatDollars(total_recoverable_cents);
  const urgentFormatted = formatDollars(urgent_recoverable_cents);

  // Executive summary
  const urgentLine = urgent_recoverable_cents > 0
    ? ` Of this, ${urgentFormatted} is time-sensitive — dispute windows close within 14 days.`
    : "";

  const executive_summary = `Our analysis of ${brand_name}'s Amazon Seller Central data identified ${findings_count} discrepancies totaling ${totalFormatted} in potential recoveries.${urgentLine} Each finding below is backed by row-level evidence from your reports and is ready for dispute submission.`;

  // Per-category narratives
  const category_narratives: Record<string, string> = {};
  for (const cat of categories) {
    const catTotal = formatDollars(cat.total_cents);
    const skuList = cat.top_skus.slice(0, 3).join(", ");
    const urgentNote = cat.urgent_count > 0
      ? ` ${cat.urgent_count} of these have dispute windows closing within 14 days.`
      : "";

    const templates: Record<string, string> = {
      returns: `We identified ${cat.count} customer returns where Amazon received damaged or defective items but never issued a reimbursement, totaling ${catTotal}. The most affected SKUs include ${skuList || "multiple products"}.${urgentNote}`,
      inventory: `We found ${cat.count} instances of inventory reported as lost or damaged in Amazon's fulfillment centers without a corresponding reimbursement, totaling ${catTotal}. Affected SKUs include ${skuList || "multiple products"}.${urgentNote}`,
      refunds: `We detected ${cat.count} cases where Amazon refunded a customer but failed to issue a corresponding reimbursement to your account, totaling ${catTotal}. Top affected SKUs: ${skuList || "multiple products"}.${urgentNote}`,
    };

    category_narratives[cat.category] = templates[cat.category]
      ?? `We identified ${cat.count} discrepancies totaling ${catTotal} in the ${cat.category} category.${urgentNote}`;
  }

  const methodology_note = "This analysis was performed by cross-referencing your Returns, Reimbursements, and Inventory Ledger reports using exact order-ID and SKU matching. Each finding represents a verifiable discrepancy backed by specific rows in your Seller Central data. Confidence levels reflect the strength of the evidence — high-confidence findings have direct, unambiguous matches.";

  return {
    executive_summary,
    category_narratives,
    methodology_note,
    source: "template",
  };
}
