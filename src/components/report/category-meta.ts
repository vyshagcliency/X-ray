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
  },
  fba_dimension: {
    label: "Size-Tier Overcharges",
    color: "#eb6834",
    recurring: true,
    mechanism:
      "Amazon measured these products into a larger size tier than their real dimensions warrant, inflating the fulfillment fee on every unit shipped.",
  },
  return_credit: {
    label: "Credits Never Applied",
    color: "#008300",
    recurring: false,
    mechanism:
      "Customers returned these units as sellable and were refunded, but the inventory or cash credit never landed back in your account.",
  },
  aged_surcharge: {
    label: "Aged-Stock Surcharges",
    color: "#eda100",
    recurring: false,
    mechanism:
      "Amazon billed an aged-inventory surcharge on SKUs that were actively selling, inconsistent with stock that has genuinely aged out.",
  },
  returns: {
    label: "Customer Returns",
    color: "#1baf7a",
    recurring: false,
    mechanism:
      "Customer returns received damaged or refunded where no corresponding reimbursement was issued to your account.",
  },
  lost_inventory: {
    label: "Lost & Damaged Inventory",
    color: "#e87ba4",
    recurring: false,
    mechanism:
      "Inventory reported lost or damaged inside Amazon's fulfillment network with no corresponding reimbursement.",
  },
};

export function catMeta(key: string): CategoryMeta {
  return (
    CATEGORY_META[key] ?? {
      label: key,
      color: "#64748b",
      recurring: false,
      mechanism: "Discrepancies detected in this category.",
    }
  );
}
