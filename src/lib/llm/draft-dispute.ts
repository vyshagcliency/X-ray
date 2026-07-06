/**
 * Dispute draft generation: Haiku 4.5 per-case drafts.
 *
 * Phase 1: Template-based dispute drafts.
 * LLM enhancement will be added in Phase 1.5.
 *
 * The LLM NEVER calculates. All dollar figures come from findings.amount_cents.
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
    // Payout-integrity disputes (the lead wedge).
    referral_fee_mismatch: {
      subject: `Fee Dispute: Incorrect Referral Fee Charged (Order ${orderId})`,
      body: `I am writing to dispute a referral fee that was charged above the published rate for my product's category.

Order ID: ${orderId}
SKU: ${sku}
Category: ${String(input.evidence.product_group ?? "See attached")}
Referral fee charged: above the category's published rate
Overcharge on this order: ${amount}

Amazon's published referral fee schedule sets a specific rate for this product category. The commission charged on this order exceeds that rate. My settlement data shows the discrepancy on the line items above.

Please review the category assignment and refund the difference between the rate charged and the correct published rate.

[SELLER_SIGNATURE]`,
    },
    size_tier_misclassification: {
      subject: `Fee Dispute: Size-Tier Misclassification (SKU: ${sku})`,
      body: `I am writing to dispute an FBA fulfillment fee charged at a higher size tier than my product's measured dimensions warrant.

SKU: ${sku}
Size tier charged: ${String(input.evidence.amazon_tier ?? "See attached")}
Correct size tier (per dimensions): ${String(input.evidence.correct_tier ?? "See attached")}
Overcharge: ${amount}

The dimensions recorded in my FBA Fee Preview report place this product in a smaller, lower-fee size tier than the one Amazon billed. The fulfillment fee was therefore overcharged on every unit shipped.

Please re-measure this product (a cubiscan request may be required) and refund the per-unit fee difference for the affected units.

[SELLER_SIGNATURE]`,
    },
    return_credit_unapplied: {
      subject: `Reimbursement Request: Return Credit Never Applied (SKU: ${sku})`,
      body: `I am writing to request a credit for customer returns that were recorded but never credited back to my inventory or account.

SKU: ${sku}
Units returned but not credited: ${String(input.evidence.gap_qty ?? "See attached")}
Amount: ${amount}

My Returns report shows these units coming back as sellable, but my Inventory Ledger shows no corresponding credit returning them to my account. The customer was refunded; I was not made whole.

Please investigate the missing credits and reimburse the value of the units that were never returned to my inventory.

[SELLER_SIGNATURE]`,
    },
    aged_surcharge_on_sold: {
      subject: `Fee Dispute: Aged-Inventory Surcharge on Active SKU (SKU: ${sku})`,
      body: `I am writing to dispute an aged-inventory surcharge applied to a SKU that has been actively selling.

SKU: ${sku}
Surcharge type: ${String(input.evidence.surcharge_type ?? "Aged Inventory Surcharge")}
Units sold in the prior 90 days: ${String(input.evidence.units_sold_prior_90d ?? "See attached")}
Amount: ${amount}

This SKU sold steadily in the 90 days before the surcharge snapshot, which is inconsistent with inventory that has genuinely aged out. The surcharge appears to have been applied to stock that should not have qualified.

Please review the sales velocity for this SKU and refund the surcharge if it was applied in error.

[SELLER_SIGNATURE]`,
    },
    // Fee-line wedge additions (Phase 3).
    low_price_fba: {
      subject: `Fee Dispute: Low-Price FBA Discount Not Applied (SKU: ${sku})`,
      body: `I am writing to dispute an FBA fulfillment fee charged without the automatic Low-Price FBA discount my sub-$10 product qualifies for.

SKU: ${sku}
Item price: ${String(input.evidence.avg_price_cents != null ? formatDollarsExact(Number(input.evidence.avg_price_cents)) : "under $10")}
Fee billed per unit: ${String(input.evidence.billed_fee_cents != null ? formatDollarsExact(Number(input.evidence.billed_fee_cents)) : "See attached")}
Recoverable: ${amount}

Items priced under $10 receive an automatic Low-Price FBA fulfillment-fee discount. This SKU was billed the full, non-discounted fee — matching what my ≥$10 SKUs in the same size tier pay — so the discount was not applied.

Please apply the Low-Price FBA fulfillment-fee discount to this SKU and refund the difference on the units already shipped.

[SELLER_SIGNATURE]`,
    },
    coupon_fee_error: {
      subject: `Fee Dispute: Coupon Redemption Fee With No Promotion (Order ${orderId})`,
      body: `I am writing to dispute a coupon redemption fee charged on an order that carries no matching promotion discount.

Order ID: ${orderId}
SKU: ${sku}
Redemption fee charged: ${amount}

Amazon charges a coupon redemption fee only when a coupon is actually redeemed. This order shows the redemption fee but no corresponding promotion discount on the same order in my settlement data — I was billed for a redemption that did not occur.

Please review this order and refund the coupon redemption fee.

[SELLER_SIGNATURE]`,
    },
    deal_fee_double_booked: {
      subject: `Fee Dispute: Duplicate Deal Fee (SKU: ${sku})`,
      body: `I am writing to dispute duplicate deal fees charged on a single deal run.

SKU: ${sku}
Deal date: ${String(input.evidence.deal_date ?? "See attached")}
Deal fees charged in this window: ${String(input.evidence.fee_count ?? "2 or more")}
Excess (recoverable): ${amount}

A deal is charged one fee per run. My settlement data shows two or more deal fees for this SKU within a single deal window, which is a duplicate charge.

Please refund the excess deal fee(s) beyond the one legitimate charge.

[SELLER_SIGNATURE]`,
    },
    storage_cube_overcharge: {
      subject: `Fee Dispute: Storage Fee on Inflated Cube (SKU: ${sku})`,
      body: `I am writing to dispute a monthly storage fee billed on a larger cubic-foot volume than my product's measured dimensions warrant.

SKU: ${sku}
Measured cube (cu ft): ${String(input.evidence.measured_cuft ?? "See attached")}
Billed cube (cu ft): ${String(input.evidence.billed_cuft ?? "See attached")}
Overcharge: ${amount}

The dimensions in my FBA Fee Preview report compute a smaller cubic-foot volume than the volume Amazon billed for storage. The storage fee was therefore charged on an inflated cube.

Please re-measure this product (a cubiscan request may be required) and refund the storage fee charged on the excess volume.

[SELLER_SIGNATURE]`,
    },
    // Reimbursement disputes (demoted add-ons).
    returns_gap: {
      subject: `Reimbursement Request: Damaged Return Not Credited (Order ${orderId})`,
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
      subject: `Reimbursement Request: Lost/Damaged Inventory (SKU: ${sku})`,
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
      subject: `Reimbursement Request: Refund Without Reimbursement (Order ${orderId})`,
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
    subject: `Reimbursement Request: ${input.category} Discrepancy (${orderId})`,
    body: `I am writing to request a reimbursement of ${amount} for a discrepancy identified in my Seller Central data.\n\nOrder/SKU: ${orderId} / ${sku}\n\nPlease investigate and process the appropriate reimbursement.`,
  };

  return {
    ...template,
    source: "template",
  };
}
