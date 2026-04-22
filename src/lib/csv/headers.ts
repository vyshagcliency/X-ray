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
      "status",
      "license-plate-number",
      "customer-comments",
    ],
    description: "Every customer return event with disposition",
  },

  adjustments: {
    reportType: "adjustments",
    displayName: "FBA Inventory Adjustments",
    sellerCentralPath: "Reports > Fulfillment > Inventory > Adjustments",
    dateRange: "Last 18 months",
    requiredHeaders: [
      "adjusted-date",
      "transaction-item-id",
      "fnsku",
      "sku",
      "product-name",
      "fulfillment-center-id",
      "quantity",
      "reason",
      "disposition",
    ],
    description: "Every lost/damaged/found event in Amazon's warehouses",
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
