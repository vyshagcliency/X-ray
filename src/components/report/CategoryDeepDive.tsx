import { Badge } from "@/components/ui/badge";
import { formatDollars } from "@/lib/format";
import { catMeta } from "./category-meta";

interface Finding {
  id: string;
  category: string;
  amount_cents: number;
  confidence: string;
  window_days_remaining: number | null;
  evidence: Record<string, unknown>;
}

const num = (v: unknown) => Number(v ?? 0);
const str = (v: unknown) => (v == null || v === "" ? "N/A" : String(v));
const pct = (frac: unknown) => `${(num(frac) * 100).toFixed(1)}%`;
const sum = (fs: Finding[], k: string) => fs.reduce((s, f) => s + num(f.evidence[k]), 0);
const avg = (fs: Finding[], k: string) =>
  fs.length ? sum(fs, k) / fs.length : 0;
const month = (v: unknown) => {
  const d = new Date(String(v));
  return isNaN(d.getTime())
    ? str(v)
    : d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};
// A dispute window renders as a real countdown, "closed" once past, or "—" when the
// finding has no deadline (rolling overcharge). Never "N/A" beside an urgency claim (D5).
const windowLabel = (daysRemaining: number | null) =>
  daysRemaining == null
    ? "—"
    : daysRemaining < 0
      ? "closed"
      : `${daysRemaining}d left`;

interface Kpi {
  label: string;
  value: string;
}
interface DetailConfig {
  kpis: (fs: Finding[]) => Kpi[];
  columns: string[];
  /** Right-align these column indexes (numeric). */
  numericCols: number[];
  cell: (f: Finding) => (string | number)[];
}

const DETAIL: Record<string, DetailConfig> = {
  referral_fee: {
    kpis: (fs) => [
      { label: "Orders overcharged", value: String(fs.length) },
      { label: "Avg. rate charged", value: pct(avg(fs, "actual_pct")) },
      { label: "Category rate", value: pct(avg(fs, "expected_pct")) },
      { label: "Recoverable", value: formatDollars(fs.reduce((s, f) => s + f.amount_cents, 0)) },
    ],
    columns: ["Order", "SKU", "Category", "Charged", "Should be", "Overcharge"],
    numericCols: [3, 4, 5],
    cell: (f) => [
      str(f.evidence.order_id),
      str(f.evidence.sku),
      str(f.evidence.product_group),
      pct(f.evidence.actual_pct),
      pct(f.evidence.expected_pct),
      formatDollars(f.amount_cents),
    ],
  },
  fba_dimension: {
    kpis: (fs) => [
      { label: "SKUs mis-tiered", value: String(fs.length) },
      { label: "Units overcharged", value: sum(fs, "units_sold").toLocaleString() },
      { label: "Avg. per-unit", value: formatDollars(avg(fs, "per_unit_overcharge_cents")) },
      { label: "Recoverable", value: formatDollars(fs.reduce((s, f) => s + f.amount_cents, 0)) },
    ],
    columns: ["SKU", "Charged tier", "Correct tier", "Per unit", "Units", "Overcharge"],
    numericCols: [3, 4, 5],
    cell: (f) => [
      str(f.evidence.sku),
      str(f.evidence.amazon_tier),
      str(f.evidence.correct_tier),
      formatDollars(num(f.evidence.per_unit_overcharge_cents)),
      num(f.evidence.units_sold).toLocaleString(),
      formatDollars(f.amount_cents),
    ],
  },
  return_credit: {
    kpis: (fs) => [
      { label: "SKU-months affected", value: String(fs.length) },
      { label: "Units never credited", value: sum(fs, "gap_qty").toLocaleString() },
      { label: "Recoverable", value: formatDollars(fs.reduce((s, f) => s + f.amount_cents, 0)) },
    ],
    columns: ["SKU", "Month", "Returned", "Credited", "Gap", "Value"],
    numericCols: [2, 3, 4, 5],
    cell: (f) => [
      str(f.evidence.sku),
      month(f.evidence.month),
      num(f.evidence.returned_qty),
      num(f.evidence.found_qty),
      num(f.evidence.gap_qty),
      formatDollars(f.amount_cents),
    ],
  },
  aged_surcharge: {
    kpis: (fs) => [
      { label: "SKUs surcharged while selling", value: String(fs.length) },
      { label: "Units sold (prior 90d)", value: sum(fs, "units_sold_prior_90d").toLocaleString() },
      { label: "Recoverable", value: formatDollars(fs.reduce((s, f) => s + f.amount_cents, 0)) },
    ],
    columns: ["SKU", "Snapshot", "Qty charged", "Sold (90d)", "Surcharge"],
    numericCols: [2, 3, 4],
    cell: (f) => [
      str(f.evidence.sku),
      str(f.evidence.snapshot_date),
      num(f.evidence.qty_charged),
      num(f.evidence.units_sold_prior_90d),
      formatDollars(f.amount_cents),
    ],
  },
};

// Fallback for reimbursement add-on categories (returns, lost_inventory).
const FALLBACK: DetailConfig = {
  kpis: (fs) => [
    { label: "Cases", value: String(fs.length) },
    { label: "Recoverable (est.)", value: formatDollars(fs.reduce((s, f) => s + f.amount_cents, 0)) },
  ],
  columns: ["Identifier", "SKU", "Detail", "Window", "Amount"],
  numericCols: [4],
  cell: (f) => [
    str(f.evidence.order_id ?? f.evidence.transaction_id),
    str(f.evidence.sku),
    str(f.evidence.disposition ?? f.evidence.reason),
    windowLabel(f.window_days_remaining),
    formatDollars(f.amount_cents),
  ],
};

const ROW_CAP = 8;

/** Cross-checkable numbers come from report_data (the single source), not from the
 * fetched evidence rows — see P0.2. `findings` drives only the evidence table body. */
interface CategorySummary {
  count: number;
  total_cents: number;
  high: number;
  medium: number;
  low: number;
}

export function CategoryDeepDive({
  categoryKey,
  summary,
  findings,
  narrative,
}: {
  categoryKey: string;
  summary: CategorySummary;
  findings: Finding[];
  narrative?: string;
}) {
  if (summary.count === 0) return null;

  const meta = catMeta(categoryKey);
  const config = DETAIL[categoryKey] ?? FALLBACK;
  const total = summary.total_cents;
  const high = summary.high;
  const medium = summary.medium;
  const low = summary.low;
  const rows = findings.slice(0, ROW_CAP);
  const remaining = summary.count - rows.length;

  return (
    <section
      className="overflow-hidden rounded-xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur-sm"
      style={{ borderTop: `3px solid ${meta.color}` }}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="inline-block size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: meta.color }}
              />
              <h3 className="text-lg font-bold">{meta.label}</h3>
              {meta.recurring && (
                <Badge variant="outline" className="border-amber-300 text-amber-700">
                  recurring
                </Badge>
              )}
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {narrative ?? meta.mechanism}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-bold tabular-nums">
              {formatDollars(total)}
            </p>
            <p className="text-xs text-muted-foreground">
              {summary.count} case{summary.count !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {config.kpis(findings).map((k) => (
            <div key={k.label} className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5">
              <p className="font-mono text-base font-bold tabular-nums">{k.value}</p>
              <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Confidence summary */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {high > 0 && <Badge className="text-xs">{high} high confidence</Badge>}
          {medium > 0 && <Badge variant="secondary" className="text-xs">{medium} medium</Badge>}
          {low > 0 && <Badge variant="outline" className="text-xs">{low} flagged for review</Badge>}
        </div>
      </div>

      {/* Evidence table */}
      <div className="overflow-x-auto border-t border-slate-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/60 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {config.columns.map((c, i) => (
                <th
                  key={c}
                  className={`px-4 py-2.5 ${config.numericCols.includes(i) ? "text-right" : ""}`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((f) => (
              <tr key={f.id} className="hover:bg-slate-50/50">
                {config.cell(f).map((value, i) => (
                  <td
                    key={i}
                    className={`px-4 py-2.5 ${
                      config.numericCols.includes(i)
                        ? "text-right font-mono tabular-nums"
                        : i === 0
                          ? "max-w-[160px] truncate font-mono text-xs"
                          : ""
                    }`}
                    title={String(value)}
                  >
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {remaining > 0 && (
        <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-muted-foreground">
          + {remaining.toLocaleString()} more case{remaining !== 1 ? "s" : ""} in this category. Full detail is in the PDF and CSV export.
        </p>
      )}
    </section>
  );
}
