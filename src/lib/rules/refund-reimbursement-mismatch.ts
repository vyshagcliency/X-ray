import type { Rule } from "./index";

/**
 * PRD §5.3 — Refund issued but reimbursement missing
 *
 * Finds customer returns where Amazon refunded the customer
 * but never reimbursed the seller.
 */
export const refundReimbursementMismatch: Rule = {
  id: "refund_reimbursement_mismatch",
  version: "1.0.0",
  requiredReports: ["returns", "reimbursements"],
  category: "returns",

  sql: /* sql */ `
    WITH returned_orders AS (
      SELECT
        "order-id" AS order_id,
        sku,
        fnsku,
        "return-date" AS return_date,
        status,
        "detailed-disposition" AS disposition,
        row_number() OVER () AS row_ref
      FROM read_csv($returns_url, auto_detect=true)
      WHERE status = 'Refunded'
    ),
    reimbursed_orders AS (
      SELECT DISTINCT
        "amazon-order-id" AS order_id,
        sku
      FROM read_csv($reimbursements_url, auto_detect=true)
    )
    SELECT
      r.order_id,
      r.sku,
      r.fnsku,
      r.return_date,
      r.disposition,
      r.return_date::DATE + INTERVAL 90 DAY AS window_closes_on,
      r.row_ref::TEXT AS row_ref
    FROM returned_orders r
    LEFT JOIN reimbursed_orders rm
      ON rm.order_id = r.order_id AND rm.sku = r.sku
    WHERE rm.order_id IS NULL
  `,

  confidence: () => "high",
};
