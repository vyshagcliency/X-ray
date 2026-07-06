import { Crosshair } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDollars, formatPct } from "@/lib/format";
import { catMeta } from "./category-meta";

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

interface MathRow {
  label: string;
  value: string;
}

/** Build the plain-English claim + the shown math for the two wedge rules. */
function explain(s: SpotlightProps): { headline: React.ReactNode; math: MathRow[] } {
  const e = s.evidence;
  if (s.category === "referral_fee") {
    const group = String(e.product_group ?? "this category");
    return {
      headline: (
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
          overcharge — and it repeats on every {group} sale until the category is fixed.
        </>
      ),
      math: [
        { label: "Order revenue", value: formatDollars(num(e.revenue_cents)) },
        {
          label: `Charged (${formatPct(num(e.actual_pct))})`,
          value: formatDollars(num(e.referral_charged_cents)),
        },
        {
          label: `Owed (${formatPct(num(e.expected_pct))})`,
          value: formatDollars(num(e.expected_fee_cents)),
        },
        { label: "Overcharge", value: formatDollars(s.amount_cents) },
      ],
    };
  }
  if (s.category === "fba_dimension") {
    return {
      headline: (
        <>
          Amazon billed <span className="font-mono font-semibold">{s.sku}</span> at the{" "}
          <span className="font-semibold text-slate-900">
            {String(e.amazon_tier)}
          </span>{" "}
          size tier when its measured dimensions place it in{" "}
          <span className="font-semibold text-slate-900">
            {String(e.correct_tier)}
          </span>
          {" "}— overcharging{" "}
          <span className="font-semibold text-slate-900">
            {formatDollars(num(e.per_unit_overcharge_cents))}
          </span>{" "}
          on every one of {num(e.units_sold).toLocaleString()} units shipped, a{" "}
          <span className="font-semibold text-slate-900">
            {formatDollars(s.amount_cents)}
          </span>{" "}
          overcharge in total.
        </>
      ),
      math: [
        {
          label: "Charged / unit",
          value: formatDollars(num(e.actual_fee_cents)),
        },
        {
          label: "Correct / unit",
          value: formatDollars(num(e.correct_fee_cents)),
        },
        {
          label: `Overcharge / unit × ${num(e.units_sold).toLocaleString()}`,
          value: formatDollars(num(e.per_unit_overcharge_cents)),
        },
        { label: "Total overcharge", value: formatDollars(s.amount_cents) },
      ],
    };
  }
  // Fallback for a non-wedge spotlight (rare — only when no high-confidence wedge exists).
  return {
    headline: (
      <>
        The single largest discrepancy we found:{" "}
        <span className="font-semibold text-slate-900">
          {formatDollars(s.amount_cents)}
        </span>{" "}
        on <span className="font-mono font-semibold">{s.sku}</span>.
      </>
    ),
    math: [{ label: "Amount", value: formatDollars(s.amount_cents) }],
  };
}

export function Spotlight(props: SpotlightProps) {
  const meta = catMeta(props.category);
  const { headline, math } = explain(props);
  const traceLabel =
    props.order_id && props.order_id !== "N/A" ? "order" : "SKU";
  const traceValue =
    props.order_id && props.order_id !== "N/A" ? props.order_id : props.sku;

  return (
    <section
      className="overflow-hidden rounded-xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur-sm"
      style={{ borderLeft: `4px solid ${meta.color}` }}
    >
      <div className="p-6 lg:p-7">
        <div className="flex items-center gap-2">
          <Crosshair className="size-4 stroke-[1.5]" style={{ color: meta.color }} />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            The sharpest finding
          </p>
          {props.confidence === "high" && (
            <Badge className="text-[11px]">high confidence</Badge>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {meta.label}
          </span>
        </div>

        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-foreground/90">
          {headline}
        </p>

        {/* The math, shown — every figure is from the row above. */}
        <div className="mt-5 flex flex-wrap gap-2">
          {math.map((m, i) => (
            <div
              key={m.label}
              className={`rounded-lg border px-3 py-2 ${
                i === math.length - 1
                  ? "border-slate-300 bg-slate-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <p className="text-[11px] leading-tight text-muted-foreground">
                {m.label}
              </p>
              <p className="font-mono text-sm font-bold tabular-nums">{m.value}</p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Traces to {traceLabel}{" "}
          <span className="font-mono">{traceValue}</span> in your own Seller Central
          data — verify it line by line.
        </p>
      </div>
    </section>
  );
}
