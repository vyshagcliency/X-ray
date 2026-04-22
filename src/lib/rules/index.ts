export interface Rule {
  id: string;
  version: string;
  /** Which Parquet files this rule needs (by report type) */
  requiredReports: string[];
  /** Pure SQL — parameterized with $returns_url, $reimbursements_url, $adjustments_url */
  sql: string;
  /** Map a result row to a confidence level */
  confidence: (row: Record<string, unknown>) => "high" | "medium" | "low";
  /** Finding category for grouping */
  category: string;
}

import { returnsGap } from "./returns-gap";
import { inventoryLost } from "./inventory-lost";
import { refundReimbursementMismatch } from "./refund-reimbursement-mismatch";

export const RULES: Rule[] = [returnsGap, inventoryLost, refundReimbursementMismatch];

export function getRuleById(id: string): Rule | undefined {
  return RULES.find((r) => r.id === id);
}
