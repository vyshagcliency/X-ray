import { cn } from "@/lib/utils";
import { ACCENT, CARD_CLASS } from "./DashboardCard";

/** A Stripe-style KPI tile: uppercase tracked micro-label, big mono tabular value,
 *  optional context hint. `accent` tints the value indigo (used for the money figure). */
export function StatTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={cn(CARD_CLASS, "px-4 py-3.5")}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p
        className="mt-1 font-mono text-2xl font-semibold tabular-nums"
        style={accent ? { color: ACCENT } : { color: "#0f172a" }}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] leading-tight text-slate-500">{hint}</p>}
    </div>
  );
}
