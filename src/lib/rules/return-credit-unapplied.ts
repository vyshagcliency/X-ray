import type { Rule } from "./index";

/**
 * PRD §5.4: Return credit issued but inventory credit never applied
 * (payout-integrity wedge; sibling of returns_gap §5.1).
 *
 * Per SKU per month, compares the count of customer returns marked SELLABLE
 * against the units the inventory ledger shows actually credited back to sellable
 * stock. Where sellable returns exceed the credited units, the gap is product the
 * customer returned (and was refunded for) that never came back to the seller,
 * recoverable at the SKU's average selling price (from settlement). All in SQL.
 *
 * Contract-free: needs only the seller's own Returns, Inventory Ledger, and
 * Settlement reports.
 */
// REAL-DATA ASTERISK (P5.3): the `detailed-disposition` + ledger `Event Type`/`Reason` ('G','R')
// code sets are unverified against a real export — see real-data-asterisks.md §A(b)(c)+§B.
export const returnCreditUnapplied: Rule = {
  id: "return_credit_unapplied",
  version: "1.0.0",
  requiredReports: ["returns", "inventory_ledger", "settlement"],
  category: "return_credit",

  sql: /* sql */ `
    WITH sellable_returns AS (
      SELECT
        sku,
        date_trunc('month', "return-date"::DATE) AS month,
        SUM(quantity) AS returned_qty,
        MIN("return-date"::DATE) AS first_return_date
      FROM read_csv($returns_url, auto_detect=true)
      WHERE "detailed-disposition" = 'SELLABLE'
      GROUP BY sku, date_trunc('month', "return-date"::DATE)
    ),
    returned_to_inventory AS (
      SELECT
        "MSKU" AS sku,
        date_trunc('month', "Date"::DATE) AS month,
        SUM("Quantity") AS found_qty
      FROM read_csv($inventory_ledger_url, auto_detect=true)
      WHERE "Event Type" IN ('CustomerReturns', 'Adjustments')
        AND "Quantity" > 0
        AND ("Disposition" = 'SELLABLE' OR "Reason" IN ('G', 'R'))
      GROUP BY "MSKU", date_trunc('month', "Date"::DATE)
    ),
    avg_price AS (
      SELECT
        sku,
        ROUND(
          SUM(CASE WHEN "amount-description" = 'Principal' THEN amount ELSE 0 END) * 100
          / NULLIF(SUM(CASE WHEN "amount-description" = 'Principal' THEN "quantity-purchased" ELSE 0 END), 0)
        ) AS avg_price_cents
      FROM read_csv($settlement_url, auto_detect=true)
      WHERE "transaction-type" = 'Order' AND sku IS NOT NULL
      GROUP BY sku
    )
    SELECT
      sr.sku,
      sr.month,
      sr.returned_qty,
      COALESCE(ri.found_qty, 0) AS found_qty,
      sr.returned_qty - COALESCE(ri.found_qty, 0) AS gap_qty,
      COALESCE(ap.avg_price_cents, 0) AS avg_price_cents,
      (sr.returned_qty - COALESCE(ri.found_qty, 0)) * COALESCE(ap.avg_price_cents, 0) AS amount_cents,
      sr.first_return_date::DATE + INTERVAL 18 MONTH AS window_closes_on,
      row_number() OVER (ORDER BY sr.sku, sr.month) AS row_ref
    FROM sellable_returns sr
    LEFT JOIN returned_to_inventory ri ON ri.sku = sr.sku AND ri.month = sr.month
    LEFT JOIN avg_price ap ON ap.sku = sr.sku
    WHERE sr.returned_qty - COALESCE(ri.found_qty, 0) > 0
  `,

  // PRD §5.4: medium. A real gap, but legitimate timing differences exist.
  confidence: () => "medium",
};
