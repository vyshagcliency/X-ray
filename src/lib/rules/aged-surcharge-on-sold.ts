import type { Rule } from "./index";

/**
 * PRD §5.8: Aged-inventory surcharge on actively-selling SKUs (payout-integrity wedge).
 *
 * Cross-references each aged-inventory surcharge (Aged Inventory Surcharge report)
 * against the SKU's sales velocity in the 90 days before the surcharge snapshot
 * (inventory ledger Shipments). A SKU that was actively selling should not be
 * carrying aged stock; a surcharge on it is likely charged on units that should
 * have cleared. The surcharge amount is the recoverable figure.
 *
 * Lower confidence: flagged for human review, not auto-included in the headline
 * (PRD §5.8). Contract-free: seller's own Aged Surcharge + Inventory Ledger reports.
 */
export const agedSurchargeOnSold: Rule = {
  id: "aged_surcharge_on_sold",
  version: "1.0.0",
  requiredReports: ["storage_fees", "inventory_ledger"],
  category: "aged_surcharge",

  sql: /* sql */ `
    WITH aged_charges AS (
      SELECT
        sku,
        fnsku,
        asin,
        "snapshot-date"::DATE AS snapshot_date,
        "qty-charged" AS qty_charged,
        "surcharge-type" AS surcharge_type,
        ROUND("surcharge-amount" * 100) AS surcharge_cents
      FROM read_csv($storage_fees_url, auto_detect=true)
      WHERE "surcharge-amount" > 0
    ),
    sales_velocity AS (
      SELECT
        "MSKU" AS sku,
        "Date"::DATE AS sale_date,
        ABS("Quantity") AS units
      FROM read_csv($inventory_ledger_url, auto_detect=true)
      WHERE "Event Type" = 'Shipments' AND "Quantity" < 0
    )
    SELECT
      a.sku,
      a.fnsku,
      a.snapshot_date,
      a.qty_charged,
      a.surcharge_type,
      a.surcharge_cents AS amount_cents,
      COALESCE(SUM(sv.units), 0) AS units_sold_prior_90d,
      a.snapshot_date + INTERVAL 6 MONTH AS window_closes_on,
      row_number() OVER (ORDER BY a.sku, a.snapshot_date) AS row_ref
    FROM aged_charges a
    LEFT JOIN sales_velocity sv
      ON sv.sku = a.sku
      AND sv.sale_date BETWEEN a.snapshot_date - INTERVAL 90 DAY AND a.snapshot_date
    GROUP BY a.sku, a.fnsku, a.snapshot_date, a.qty_charged, a.surcharge_type, a.surcharge_cents
    HAVING COALESCE(SUM(sv.units), 0) > 0
  `,

  // PRD §5.8: low-medium, flagged for review. Medium when the SKU sold at least as
  // many units as it was surcharged for (strong signal it shouldn't be aged); else low.
  confidence: (row) => {
    const sold = Number(row.units_sold_prior_90d ?? 0);
    const charged = Number(row.qty_charged ?? 0);
    return sold >= charged ? "medium" : "low";
  },
};
