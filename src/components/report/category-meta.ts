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

export const CATEGORY_META: Record<string, CategoryMeta> = {
  referral_fee: {
    label: "Referral Fee Overcharges",
    color: "#2563eb",
    recurring: true,
    mechanism:
      "Amazon charged a higher referral percentage than your product category's published rate. It applies to every sale in the affected category and compounds until the category is corrected.",
  },
  fba_dimension: {
    label: "Size-Tier Overcharges",
    color: "#7c3aed",
    recurring: true,
    mechanism:
      "Amazon measured these products into a larger size tier than their real dimensions warrant, inflating the fulfillment fee on every unit shipped.",
  },
  return_credit: {
    label: "Credits Never Applied",
    color: "#059669",
    recurring: false,
    mechanism:
      "Customers returned these units as sellable and were refunded, but the inventory or cash credit never landed back in your account.",
  },
  aged_surcharge: {
    label: "Aged-Stock Surcharges",
    color: "#d97706",
    recurring: false,
    mechanism:
      "Amazon billed an aged-inventory surcharge on SKUs that were actively selling, inconsistent with stock that has genuinely aged out.",
  },
  returns: {
    label: "Customer Returns",
    color: "#0891b2",
    recurring: false,
    mechanism:
      "Customer returns received damaged or refunded where no corresponding reimbursement was issued to your account.",
  },
  lost_inventory: {
    label: "Lost & Damaged Inventory",
    color: "#db2777",
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
