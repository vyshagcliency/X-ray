/**
 * Amazon Seller Central CSV header signatures for each report type.
 *
 * These are the expected column headers for the required Phase 1 reports.
 * Used for client-side validation (PapaParse preview) and server-side re-check.
 *
 * IMPORTANT: Amazon occasionally renames columns. These must be verified
 * against real data before Phase 1 launch (plan.md §1 research checkpoint).
 * Last verified: pending real-data validation.
 */

export interface ReportSignature {
  reportType: string;
  displayName: string;
  sellerCentralPath: string;
  dateRange: string;
  /** Required columns — all must be present for the file to match */
  requiredHeaders: string[];
  /** Optional columns that may or may not be present */
  optionalHeaders?: string[];
  /** Human-readable description for the upload tile */
  description: string;
}

export const REPORT_SIGNATURES: Record<string, ReportSignature> = {
  reimbursements: {
    reportType: "reimbursements",
    displayName: "FBA Reimbursements",
    sellerCentralPath: "Reports > Fulfillment > Payments > Reimbursements",
    dateRange: "Last 18 months",
    requiredHeaders: [
      "approval-date",
      "reimbursement-id",
      "case-id",
      "amazon-order-id",
      "reason",
      "sku",
      "fnsku",
      "asin",
      "condition",
      "currency-unit",
      "amount-per-unit",
      "amount-total",
      "quantity-reimbursed-cash",
      "quantity-reimbursed-inventory",
      "quantity-reimbursed-total",
    ],
    optionalHeaders: ["original-reimbursement-id", "original-reimbursement-type"],
    description: "Master list of what Amazon has already paid back",
  },

  returns: {
    reportType: "returns",
    displayName: "FBA Customer Returns",
    sellerCentralPath: "Reports > Fulfillment > Customer Concessions > Returns",
    dateRange: "Last 18 months",
    requiredHeaders: [
      "return-date",
      "order-id",
      "sku",
      "asin",
      "fnsku",
      "product-name",
      "quantity",
      "fulfillment-center-id",
      "detailed-disposition",
      "reason",
      "license-plate-number",
      "customer-comments",
    ],
    optionalHeaders: ["status"],
    description: "Every customer return event with disposition",
  },

  inventory_ledger: {
    reportType: "inventory_ledger",
    displayName: "Inventory Ledger - Detailed View",
    sellerCentralPath: "Reports > Fulfillment > Inventory > Inventory Ledger (Detailed)",
    dateRange: "Last 18 months",
    requiredHeaders: [
      "date",
      "fnsku",
      "asin",
      "msku",
      "title",
      "event type",
      "reference id",
      "quantity",
      "fulfillment center",
      "disposition",
      "reason",
    ],
    optionalHeaders: ["country"],
    description: "Every lost/damaged/found event in Amazon's warehouses",
  },

  all_listings: {
    reportType: "all_listings",
    displayName: "All Listings Report",
    sellerCentralPath: "Inventory > Inventory Reports > All Listings Report",
    dateRange: "Current snapshot",
    requiredHeaders: [
      "seller-sku",
      "asin1",
      "price",
      "item-name",
      "listing-id",
      "quantity",
      "fulfillment-channel",
    ],
    optionalHeaders: [
      "item-description",
      "open-date",
      "image-url",
      "item-is-marketplace",
      "product-id-type",
      "item-condition",
      "zshop-shipping-fee",
      "item-note",
      "zshop-category1",
      "zshop-browse-path",
      "zshop-storefront-feature",
      "date-created",
      "pending-quantity",
      "product-id",
    ],
    description: "SKU catalog with current price, ASIN, fulfillment channel",
  },

  // --- Phase 1.5: payout-integrity ("Settlement Truth Audit") reports ---
  // Headers pending verification against real Amazon exports (same posture as the
  // Phase-1 signatures above). See plan.md Phase 1.5 research checkpoint.

  settlement: {
    reportType: "settlement",
    displayName: "Payments — All Statements (Settlement V2)",
    sellerCentralPath: "Reports > Payments > All Statements > Download Flat File V2",
    dateRange: "Last 18 months (all statements)",
    requiredHeaders: [
      "settlement-id",
      "transaction-type",
      "order-id",
      "amount-type",
      "amount-description",
      "amount",
      "sku",
      "quantity-purchased",
    ],
    optionalHeaders: [
      "settlement-start-date",
      "settlement-end-date",
      "deposit-date",
      "total-amount",
      "currency",
      "marketplace-name",
      "fulfillment-id",
      "posted-date",
      "posted-date-time",
      "order-item-code",
      "promotion-id",
    ],
    description: "Every fee Amazon charged per order — the source of truth for referral %",
  },

  fba_fee_preview: {
    reportType: "fba_fee_preview",
    displayName: "FBA Fee Preview",
    sellerCentralPath: "Reports > Payments > Fee Preview",
    dateRange: "Current snapshot",
    requiredHeaders: [
      "sku",
      "asin",
      "product-group",
      "longest-side",
      "median-side",
      "shortest-side",
      "item-package-weight",
      "unit-of-dimension",
      "unit-of-weight",
      "product-size-tier",
      "estimated-fee-total",
    ],
    optionalHeaders: [
      "fnsku",
      "product-name",
      "brand",
      "your-price",
      "sales-price",
      "length-and-girth",
      "currency",
      "expected-fulfillment-fee-per-unit",
      "estimated-referral-fee-per-unit",
    ],
    description: "Amazon's measured dimensions, assigned size tier, and fee per SKU",
  },

  storage_fees: {
    reportType: "storage_fees",
    displayName: "FBA Aged Inventory Surcharge",
    sellerCentralPath: "Reports > Fulfillment > Inventory > Aged Inventory Surcharge",
    dateRange: "Last 18 months",
    requiredHeaders: [
      "snapshot-date",
      "sku",
      "fnsku",
      "asin",
      "qty-charged",
      "surcharge-type",
      "surcharge-amount",
    ],
    optionalHeaders: ["product-name", "condition", "currency", "fulfillment-center"],
    description: "Aged-inventory surcharges Amazon billed, by SKU and snapshot date",
  },
};

/**
 * Try to match a set of CSV headers to a known report type.
 * Returns the matching report type or null if no match.
 */
export function matchHeaders(headers: string[]): string | null {
  const normalized = new Set(headers.map((h) => h.trim().toLowerCase()));

  for (const [type, sig] of Object.entries(REPORT_SIGNATURES)) {
    const required = sig.requiredHeaders.map((h) => h.toLowerCase());
    const allPresent = required.every((h) => normalized.has(h));
    if (allPresent) return type;
  }

  return null;
}

/**
 * Given a set of headers, identify which report type they belong to
 * even if not all required headers match. Returns the best guess.
 */
export function guessReportType(headers: string[]): { type: string; confidence: number } | null {
  const normalized = new Set(headers.map((h) => h.trim().toLowerCase()));

  let bestMatch: { type: string; confidence: number } | null = null;

  for (const [type, sig] of Object.entries(REPORT_SIGNATURES)) {
    const required = sig.requiredHeaders.map((h) => h.toLowerCase());
    const matchCount = required.filter((h) => normalized.has(h)).length;
    const confidence = matchCount / required.length;

    if (confidence > 0.5 && (!bestMatch || confidence > bestMatch.confidence)) {
      bestMatch = { type, confidence };
    }
  }

  return bestMatch;
}
