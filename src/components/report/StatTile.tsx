import { cn } from "@/lib/utils";
import { ACCENT, CARD_CLASS } from "./DashboardCard";

/** A Stripe-style KPI tile: uppercase tracked micro-label, big mono tabular value,
 *  optional context hint, optional subtle icon. `accent` tints the value indigo. */
export function StatTile({
  label,
  value,
  hint,
  accent,
  icon,
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
  accent?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className={cn(CARD_CLASS, "px-4 py-3.5")}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
        {icon && <span className="shrink-0 text-slate-300">{icon}</span>}
      </div>
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
