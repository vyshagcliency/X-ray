import type { Rule } from "./index";

/**
 * PRD §5.1 — Customer return reimbursement gaps
 *
 * Finds returns marked as damaged/defective where Amazon never issued
 * a reimbursement and the item wasn't returned to sellable inventory.
 */
export const returnsGap: Rule = {
  id: "returns_gap",
  version: "1.0.0",
  requiredReports: ["returns", "reimbursements", "adjustments"],
  category: "returns",

  sql: /* sql */ `
    WITH damaged_returns AS (
      SELECT
        "order-id" AS order_id,
        sku,
        fnsku,
        "return-date" AS return_date,
        quantity,
        "detailed-disposition" AS disposition,
        row_number() OVER () AS row_ref
      FROM read_csv($returns_url, auto_detect=true)
      WHERE "detailed-disposition" IN (
        'CUSTOMER_DAMAGED', 'DEFECTIVE', 'CARRIER_DAMAGED', 'DAMAGED'
      )
    ),
    matched_reimbursements AS (
      SELECT DISTINCT
        r."amazon-order-id" AS order_id,
        r.sku
      FROM read_csv($reimbursements_url, auto_detect=true) r
      JOIN damaged_returns d
        ON r."amazon-order-id" = d.order_id
       AND r.sku = d.sku
       AND r."approval-date"::DATE BETWEEN d.return_date::DATE AND d.return_date::DATE + INTERVAL 90 DAY
    ),
    returned_to_sellable AS (
      SELECT DISTINCT a.sku
      FROM read_csv($adjustments_url, auto_detect=true) a
      JOIN damaged_returns d ON a.sku = d.sku
      WHERE a.reason IN ('G', 'M', 'R')
        AND a."adjusted-date"::DATE BETWEEN d.return_date::DATE AND d.return_date::DATE + INTERVAL 30 DAY
    )
    SELECT
      d.order_id,
      d.sku,
      d.fnsku,
      d.disposition,
      d.quantity,
      d.return_date,
      d.return_date::DATE + INTERVAL 90 DAY AS window_closes_on,
      d.row_ref::TEXT AS row_ref
    FROM damaged_returns d
    LEFT JOIN matched_reimbursements mr
      ON mr.order_id = d.order_id AND mr.sku = d.sku
    LEFT JOIN returned_to_sellable rs
      ON rs.sku = d.sku
    WHERE mr.order_id IS NULL
      AND rs.sku IS NULL
  `,

  confidence: (row) =>
    row.disposition === "DEFECTIVE" ? "high" : "medium",
};
