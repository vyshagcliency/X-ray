/**
 * "Show the math" (P2.2). For a single finding, build the plain-English formula plus
 * the labeled figures that produced its amount — so a Controller can see how the dollar
 * was computed, not just the result. Every figure comes from the finding's own evidence;
 * the emphasized result row always reconciles to the finding's amount_cents.
 *
 * This is the single source for the wedge arithmetic — the Spotlight and the per-category
 * dossier both render from it, so the two can never show the math differently.
 */

import { formatDollarsExact, formatPct } from "@/lib/format";

export interface MathRow {
  label: string;
  value: string;
  /** The result line (the overcharge / recoverable) — rendered emphasized. */
  emphasis?: boolean;
}

export interface FindingMath {
  /** Plain-English formula, e.g. "Referral fee = order revenue × category rate." */
  formula: string;
  rows: MathRow[];
}

const num = (v: unknown) => Number(v ?? 0);
const count = (v: unknown) => num(v).toLocaleString();

export function financeMath(
  category: string,
  evidence: Record<string, unknown>,
  amountCents: number,
): FindingMath {
  const e = evidence;
  const result = (label: string): MathRow => ({
    label,
    value: formatDollarsExact(amountCents),
    emphasis: true,
  });

  if (category === "referral_fee") {
    return {
      formula:
        "Referral fee = order revenue × category rate. Overcharge = fee charged − fee owed.",
      rows: [
        { label: "Order revenue", value: formatDollarsExact(num(e.revenue_cents)) },
        {
          label: `Charged (${formatPct(num(e.actual_pct))})`,
          value: formatDollarsExact(num(e.referral_charged_cents)),
        },
        {
          label: `Owed (${formatPct(num(e.expected_pct))})`,
          value: formatDollarsExact(num(e.expected_fee_cents)),
        },
        result("Overcharge"),
      ],
    };
  }

  if (category === "fba_dimension") {
    return {
      formula: "Overcharge = (fee charged − correct fee) per unit × units shipped.",
      rows: [
        { label: "Charged / unit", value: formatDollarsExact(num(e.actual_fee_cents)) },
        { label: "Correct / unit", value: formatDollarsExact(num(e.correct_fee_cents)) },
        {
          label: `Overcharge / unit × ${count(e.units_sold)}`,
          value: formatDollarsExact(num(e.per_unit_overcharge_cents)),
        },
        result("Total overcharge"),
      ],
    };
  }

  if (category === "return_credit") {
    return {
      formula:
        "Uncredited units = returned − credited, valued at your average unit economics.",
      rows: [
        { label: "Units returned", value: count(e.returned_qty) },
        { label: "Units credited", value: count(e.found_qty) },
        { label: "Gap", value: count(e.gap_qty) },
        result("Recoverable"),
      ],
    };
  }

  if (category === "aged_surcharge") {
    return {
      formula:
        "Aged-inventory surcharge billed on stock that was still actively selling.",
      rows: [
        { label: "Units sold, prior 90d", value: count(e.units_sold_prior_90d) },
        { label: "Qty surcharged", value: count(e.qty_charged) },
        result("Surcharge billed"),
      ],
    };
  }

  // Estimated reimbursement tier (returns, lost_inventory): flat placeholder, not a
  // row-level amount — say so honestly rather than dress it up as a computation (D3).
  if (category === "returns" || category === "lost_inventory") {
    return {
      formula:
        "Estimated at a flat placeholder per item — the real per-item value is confirmed before filing.",
      rows: [result("Per-item estimate")],
    };
  }

  return {
    formula: "Discrepancy detected from your own Seller Central reports.",
    rows: [result("Amount")],
  };
}
