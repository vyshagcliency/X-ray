/**
 * Dispute draft generation — Haiku 4.5 per-case drafts.
 *
 * Phase 1: Template-based dispute drafts.
 * LLM enhancement will be added in Phase 1.5.
 *
 * The LLM NEVER calculates — all dollar figures come from findings.amount_cents.
 */

import { formatDollarsExact } from "@/lib/format";

interface DisputeInput {
  rule_id: string;
  category: string;
  amount_cents: number;
  confidence: string;
  evidence: Record<string, unknown>;
}

export interface DisputeDraft {
  subject: string;
  body: string;
  source: "template" | "llm";
}

/**
 * Generate a dispute draft for a single finding.
 * Template-based for Phase 1.
 */
export function draftDispute(input: DisputeInput): DisputeDraft {
  const amount = formatDollarsExact(input.amount_cents);
  const orderId = String(input.evidence.order_id ?? "N/A");
  const sku = String(input.evidence.sku ?? "N/A");

  const templates: Record<string, { subject: string; body: string }> = {
    returns_gap: {
      subject: `Reimbursement Request — Damaged Return Not Credited (Order ${orderId})`,
      body: `I am writing to request a reimbursement for a customer return that was received at your fulfillment center in damaged/defective condition but was never credited to my account.

Order ID: ${orderId}
SKU: ${sku}
Disposition: ${String(input.evidence.disposition ?? "Damaged")}
Return Date: ${String(input.evidence.return_date ?? "See attached")}
Amount: ${amount}

Per Amazon's FBA reimbursement policy, when a returned item is received in unsellable condition and is not returned to my inventory in sellable condition, I am entitled to a reimbursement. My records show no corresponding reimbursement or inventory adjustment for this return.

Please investigate and process the appropriate reimbursement. I have attached the relevant Seller Central report data for your reference.`,
    },
    inventory_lost: {
      subject: `Reimbursement Request — Lost/Damaged Inventory (SKU: ${sku})`,
      body: `I am writing to request a reimbursement for inventory that was reported as lost or damaged in your fulfillment center but was never reimbursed.

SKU: ${sku}
FNSKU: ${String(input.evidence.fnsku ?? "N/A")}
Reason: ${String(input.evidence.reason ?? "Lost/Damaged")}
Quantity: ${String(input.evidence.quantity ?? "1")}
Amount: ${amount}

Per Amazon's FBA lost and damaged inventory reimbursement policy, I am entitled to reimbursement for inventory that is lost or damaged while in Amazon's possession. My records show no corresponding reimbursement for this adjustment.

Please investigate and process the appropriate reimbursement.`,
    },
    refund_reimbursement_mismatch: {
      subject: `Reimbursement Request — Refund Without Reimbursement (Order ${orderId})`,
      body: `I am writing to request a reimbursement for an order where a customer refund was processed but no corresponding reimbursement was issued to my account.

Order ID: ${orderId}
SKU: ${sku}
Refund Amount: ${amount}
Return Date: ${String(input.evidence.return_date ?? "See attached")}

When Amazon processes a customer refund for an FBA order, a corresponding reimbursement should be issued to the seller. My records indicate this reimbursement was not processed.

Please investigate and issue the appropriate reimbursement.`,
    },
  };

  const template = templates[input.rule_id] ?? {
    subject: `Reimbursement Request — ${input.category} Discrepancy (${orderId})`,
    body: `I am writing to request a reimbursement of ${amount} for a discrepancy identified in my Seller Central data.\n\nOrder/SKU: ${orderId} / ${sku}\n\nPlease investigate and process the appropriate reimbursement.`,
  };

  return {
    ...template,
    source: "template",
  };
}
