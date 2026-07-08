import { cn } from "@/lib/utils";
import { formatDollars, formatPct } from "@/lib/format";
import { financeMath } from "./finding-math";
import { ACCENT } from "./DashboardCard";

/**
 * The single sharpest "you found what?" finding (P1.2), featured above the forensic
 * body. It shows the real row and the arithmetic inline so the number is undeniable in
 * ~30 seconds. All figures come from the finding's evidence — no calculation here.
 */
export interface SpotlightProps {
  rule_id: string;
  category: string;
  display_name: string;
  amount_cents: number;
  confidence: string;
  order_id: string;
  sku: string;
  evidence: Record<string, unknown>;
}

const num = (v: unknown) => Number(v ?? 0);

/** The plain-English claim for the spotlighted finding. The shown math beneath it comes
 * from `financeMath` — the same builder the dossiers use, so the two never diverge. */
function headlineFor(s: SpotlightProps): React.ReactNode {
  const e = s.evidence;
  if (s.category === "referral_fee") {
    const group = String(e.product_group ?? "this category");
    return (
      <>
        Amazon charged{" "}
        <span className="font-mono font-semibold">{s.sku}</span> a{" "}
        <span className="font-semibold text-slate-900">
          {formatPct(num(e.actual_pct))}
        </span>{" "}
        referral fee where <span className="font-medium">{group}</span> publishes{" "}
        <span className="font-semibold text-slate-900">
          {formatPct(num(e.expected_pct))}
        </span>
        . On this one order that is a{" "}
        <span className="font-semibold text-slate-900">
          {formatDollars(s.amount_cents)}
        </span>{" "}
        overcharge, and it repeats on every {group} sale until the category is fixed.
      </>
    );
  }
  if (s.category === "fba_dimension") {
    return (
      <>
        Amazon billed <span className="font-mono font-semibold">{s.sku}</span> at the{" "}
        <span className="font-semibold text-slate-900">
          {String(e.amazon_tier)}
        </span>{" "}
        size tier when its measured dimensions place it in{" "}
        <span className="font-semibold text-slate-900">
          {String(e.correct_tier)}
        </span>
        , overcharging{" "}
        <span className="font-semibold text-slate-900">
          {formatDollars(num(e.per_unit_overcharge_cents))}
        </span>{" "}
        on every one of {num(e.units_sold).toLocaleString()} units shipped, a{" "}
        <span className="font-semibold text-slate-900">
          {formatDollars(s.amount_cents)}
        </span>{" "}
        overcharge in total.
      </>
    );
  }
  // Fallback for a non-wedge spotlight (rare — only when no high-confidence wedge exists).
  return (
    <>
      The single largest discrepancy we found:{" "}
      <span className="font-semibold text-slate-900">
        {formatDollars(s.amount_cents)}
      </span>{" "}
      on <span className="font-mono font-semibold">{s.sku}</span>.
    </>
  );
}

export function Spotlight(props: SpotlightProps) {
  const headline = headlineFor(props);
  const { rows: math } = financeMath(props.category, props.evidence, props.amount_cents);
  const traceLabel = props.order_id && props.order_id !== "N/A" ? "order" : "SKU";
  const traceValue = props.order_id && props.order_id !== "N/A" ? props.order_id : props.sku;

  return (
    <div>
      <p className="max-w-3xl text-[17px] leading-relaxed text-slate-700">{headline}</p>

      {/* The math, shown. Every figure is from the row above; the result box pops in accent. */}
      <div className="mt-5 flex flex-wrap items-stretch gap-2">
        {math.map((m, i) => {
          const isResult = i === math.length - 1;
          return (
            <div
              key={m.label}
              className={cn("rounded-lg border px-3 py-2", !isResult && "border-slate-200 bg-white")}
              style={
                isResult
                  ? { borderColor: "rgba(73,113,255,0.35)", backgroundColor: "rgba(73,113,255,0.08)" }
                  : undefined
              }
            >
              <p className="text-[11px] leading-tight text-slate-500">{m.label}</p>
              <p
                className="font-mono text-sm font-bold tabular-nums"
                style={{ color: isResult ? ACCENT : "#0f172a" }}
              >
                {m.value}
              </p>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Traces to {traceLabel} <span className="font-mono">{traceValue}</span> in your own
        Seller Central data. Verify it line by line.
      </p>
    </div>
  );
}
