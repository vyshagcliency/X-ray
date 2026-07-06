export interface Rule {
  id: string;
  version: string;
  /** Which Parquet files this rule needs (by report type) */
  requiredReports: string[];
  /** Pure SQL, parameterized with $returns_url, $reimbursements_url, $inventory_ledger_url */
  sql: string;
  /** Map a result row to a confidence level */
  confidence: (row: Record<string, unknown>) => "high" | "medium" | "low";
  /** Finding category for grouping */
  category: string;
}

// Payout-integrity wedge (Phase 1.5): the lead. Contract-free "Settlement Truth Audit" checks.
import { referralFeeMismatch } from "./referral-fee-mismatch";
import { sizeTierMisclassification } from "./size-tier-misclassification";
import { returnCreditUnapplied } from "./return-credit-unapplied";
import { agedSurchargeOnSold } from "./aged-surcharge-on-sold";

// Fee-line wedge additions (Phase 3): ride on the settlement fee lines (G1). Sharp,
// contract-free, high-confidence "you found what?" checks.
import { lowPriceFba } from "./low-price-fba";
import { couponFeeError } from "./coupon-fee-error";
import { dealFeeDoubleBooked } from "./deal-fee-double-booked";
import { storageCubeOvercharge } from "./storage-cube-overcharge";

// Bucket 3 reimbursement rules (Phase 1): demoted to table-stakes add-ons (Phase 1.5).
import { returnsGap } from "./returns-gap";
import { inventoryLost } from "./inventory-lost";
import { refundReimbursementMismatch } from "./refund-reimbursement-mismatch";

export const RULES: Rule[] = [
  // Lead with payout integrity (PRD §5.4–5.6, §5.8).
  referralFeeMismatch,
  sizeTierMisclassification,
  returnCreditUnapplied,
  agedSurchargeOnSold,
  // Fee-line wedge additions (Phase 3, P3.2 / P3.6-D / P3.6-E).
  lowPriceFba,
  couponFeeError,
  dealFeeDoubleBooked,
  // Storage-cube overcharge (Phase 3, P3.3) — needs the Monthly Storage report (G2).
  storageCubeOvercharge,
  // Reimbursement add-ons (PRD §5.1-5.3): demoted out of the lead.
  returnsGap,
  inventoryLost,
  refundReimbursementMismatch,
];

export function getRuleById(id: string): Rule | undefined {
  return RULES.find((r) => r.id === id);
}
