/**
 * Shared visual + copy metadata per finding category. Used by the report page,
 * the charts, and the per-category deep-dive sections so colors and labels stay
 * consistent across the whole report.
 */
export interface CategoryMeta {
  label: string;
  /** Hex for charts + accents */
  color: string;
  /** True for rolling overcharges with no dispute deadline (keep accruing). */
  recurring: boolean;
  /** One-line, Controller-facing description of the leak mechanism. */
  mechanism: string;
  /** "How to file it" (P2.1): the Amazon case path a Controller follows to dispute this.
   * Researched against current Seller Central flows (2026-07) — kept accurate but not
   * over-specific about menu labels, which drift. */
  filePath: string;
  /** The real dispute window for this category — honest about the deadline. */
  disputeWindow: string;
  /** "Confidence & why" (P2.1): what high/medium means for THIS category, honestly. */
  confidenceWhy: string;
}

// Colors are the CVD-validated categorical set (dataviz skill, `validate_palette.js`).
// The two lead wedges (referral=blue, size-tier=orange) sit adjacent in the
// confidence×punch order, so they use a warm/cool pair that stays distinct under
// deuteranopia — the previous blue↔violet pair collapsed (ΔE 1.7). Every chart that
// uses these hues also direct-labels its marks (the floor-band relief rule).
export const CATEGORY_META: Record<string, CategoryMeta> = {
  referral_fee: {
    label: "Referral Fee Overcharges",
    color: "#2a78d6",
    recurring: true,
    mechanism:
      "Amazon charged a higher referral percentage than your product category's published rate. It applies to every sale in the affected category and compounds until the category is corrected.",
    filePath:
      "In Seller Central, open Help → Get support → Selling on Amazon and raise a fee-discrepancy case disputing the referral category for the SKUs below. A SAFE-T / fee-investigation claim accepts the settlement line as evidence.",
    disputeWindow:
      "Fee discrepancies are best disputed within ~90 days of each charge — but the category error keeps recurring on every future sale until it is corrected.",
    confidenceWhy:
      "High when the settlement's own commission rate exceeds the category's published rate on the same order; medium where the category mapping is less certain.",
  },
  fba_dimension: {
    label: "Size-Tier Overcharges",
    color: "#eb6834",
    recurring: true,
    mechanism:
      "Amazon measured these products into a larger size tier than their real dimensions warrant, inflating the fulfillment fee on every unit shipped.",
    filePath:
      "In Seller Central, open Help → Get support → Fulfillment by Amazon and request a multi-unit re-measurement (Cubiscan) for each SKU, citing the Fee Preview dimensions, then ask for the per-unit fee difference to be refunded.",
    disputeWindow:
      "FBA fee re-measurement disputes have a ~90-day window from the charge date; a SKU can't be re-measured more than twice in 60 days.",
    confidenceWhy:
      "High when the Fee Preview's measured dimensions place the item a full tier below what was billed; medium on borderline tiers.",
  },
  return_credit: {
    label: "Credits Never Applied",
    color: "#008300",
    recurring: false,
    mechanism:
      "Customers returned these units as sellable and were refunded, but the inventory or cash credit never landed back in your account.",
    filePath:
      "In Seller Central, open a Fulfillment by Amazon reimbursement case (or Inventory → Inventory Defect and Reimbursement), citing the SKU-month gap between returned and credited units.",
    disputeWindow:
      "Uncredited units in fulfillment carry up to an 18-month reimbursement window from the transaction date.",
    confidenceWhy:
      "High when the Returns report shows sellable units back with no matching ledger credit; medium where timing across the month boundary is ambiguous.",
  },
  aged_surcharge: {
    label: "Aged-Stock Surcharges",
    color: "#eda100",
    recurring: false,
    mechanism:
      "Amazon billed an aged-inventory surcharge on SKUs that were actively selling, inconsistent with stock that has genuinely aged out.",
    filePath:
      "In Seller Central, open a Fulfillment by Amazon case disputing the aged-inventory surcharge for these SKUs, citing their sales velocity in the prior 90 days.",
    disputeWindow:
      "Surcharge disputes are strongest within ~90 days of the surcharge snapshot date.",
    confidenceWhy:
      "High when the SKU sold steadily in the 90 days before the surcharge snapshot; medium on low-velocity SKUs.",
  },
  returns: {
    label: "Customer Returns",
    color: "#1baf7a",
    recurring: false,
    mechanism:
      "Customer returns received damaged or refunded where no corresponding reimbursement was issued to your account.",
    filePath:
      "In Seller Central, open a Fulfillment by Amazon reimbursement case for each damaged/defective return with no matching reimbursement, attaching the Returns and Reimbursements report lines.",
    disputeWindow:
      "Reimbursement claims for FC-received returns are generally filable up to 18 months after the return.",
    confidenceWhy:
      "Estimated — flagged from your reports but valued at a flat per-item placeholder; the real per-item value is confirmed before filing.",
  },
  lost_inventory: {
    label: "Lost & Damaged Inventory",
    color: "#e87ba4",
    recurring: false,
    mechanism:
      "Inventory reported lost or damaged inside Amazon's fulfillment network with no corresponding reimbursement.",
    filePath:
      "In Seller Central, open a Fulfillment by Amazon reimbursement case for each lost/damaged adjustment with no matching reimbursement, citing the Inventory Ledger reference ID.",
    disputeWindow:
      "Lost/damaged-in-fulfillment claims have up to an 18-month window; inbound-shipment claims 9 months.",
    confidenceWhy:
      "Estimated — flagged from the ledger but valued at a flat per-item placeholder; the real per-item value is confirmed before filing.",
  },
};

export function catMeta(key: string): CategoryMeta {
  return (
    CATEGORY_META[key] ?? {
      label: key,
      color: "#64748b",
      recurring: false,
      mechanism: "Discrepancies detected in this category.",
      filePath:
        "In Seller Central, open Help → Get support and raise a case citing the rows below as evidence.",
      disputeWindow: "File promptly — Amazon dispute windows are time-limited.",
      confidenceWhy:
        "Confidence reflects how directly the discrepancy is evidenced by your own reports.",
    }
  );
}
