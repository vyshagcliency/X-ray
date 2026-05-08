import type { Rule } from "./index";

/**
 * PRD §5.2 — Lost/damaged inventory not reimbursed
 *
 * Finds inventory adjustment events where Amazon lost or damaged
 * items but never issued a reimbursement.
 */
export const inventoryLost: Rule = {
  id: "inventory_lost",
  version: "1.0.0",
  requiredReports: ["inventory_ledger", "reimbursements"],
  category: "lost_inventory",

  sql: /* sql */ `
    WITH lost_events AS (
      SELECT
        "Reference ID" AS transaction_id,
        "FNSKU" AS fnsku,
        "MSKU" AS sku,
        "Date" AS adjusted_date,
        ABS("Quantity") AS quantity,
        "Reason" AS reason,
        "Disposition" AS disposition,
        row_number() OVER () AS row_ref
      FROM read_csv($inventory_ledger_url, auto_detect=true)
      WHERE "Event Type" = 'Adjustments'
        AND "Quantity" < 0
        AND "Reason" IN ('E', 'M', 'D', 'U')
    ),
    found_events AS (
      SELECT "FNSKU" AS fnsku, SUM("Quantity") AS found_qty
      FROM read_csv($inventory_ledger_url, auto_detect=true)
      WHERE "Event Type" = 'Adjustments'
        AND "Quantity" > 0
        AND "Reason" IN ('E', 'M', 'D', 'U', 'G', 'R')
      GROUP BY "FNSKU"
    ),
    reimbursed AS (
      SELECT DISTINCT fnsku
      FROM read_csv($reimbursements_url, auto_detect=true)
      WHERE reason ILIKE '%lost%'
         OR reason ILIKE '%damaged%'
         OR reason ILIKE '%inventory%'
    )
    SELECT
      l.transaction_id,
      l.fnsku,
      l.sku,
      l.adjusted_date,
      l.quantity,
      l.reason,
      l.disposition,
      l.adjusted_date::DATE + INTERVAL 18 MONTH AS window_closes_on,
      l.row_ref::TEXT AS row_ref
    FROM lost_events l
    LEFT JOIN found_events f ON f.fnsku = l.fnsku
    LEFT JOIN reimbursed r ON r.fnsku = l.fnsku
    WHERE r.fnsku IS NULL
      AND (f.fnsku IS NULL OR f.found_qty < l.quantity)
  `,

  confidence: (row) => {
    const reason = String(row.reason ?? "");
    // Lost in warehouse (E) or damaged (D) are high confidence
    if (reason === "E" || reason === "D") return "high";
    return "medium";
  },
};
