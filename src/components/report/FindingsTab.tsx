"use client";

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { formatDollars } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ReportDrawer } from "./ReportDrawer";
import { CategoryDeepDive } from "./CategoryDeepDive";
import { CARD_CLASS } from "./DashboardCard";

interface Finding {
  id: string;
  rule_id: string;
  category: string;
  amount_cents: number;
  confidence: string;
  window_days_remaining: number | null;
  window_closes_on?: string | null;
  narrative_summary?: string | null;
  evidence: Record<string, unknown>;
}
export interface CategoryRow {
  category: string;
  label: string;
  color: string;
  recurring: boolean;
  estimated: boolean;
  totalCents: number;
  count: number;
  urgentCount: number;
  high: number;
  medium: number;
  low: number;
}
type ConfFilter = "all" | "high" | "medium" | "low";
type KindFilter = "all" | "provable" | "estimated";

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors",
        active
          ? "bg-slate-900 text-white ring-slate-900"
          : "bg-white text-slate-600 ring-slate-200 hover:ring-slate-300",
      )}
    >
      {children}
    </button>
  );
}

export function FindingsTab({
  categories,
  findingsByCategory,
  narratives,
  provableCents,
}: {
  categories: CategoryRow[];
  findingsByCategory: Record<string, Finding[]>;
  narratives?: Record<string, string>;
  provableCents: number;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [conf, setConf] = useState<ConfFilter>("all");
  const [kind, setKind] = useState<KindFilter>("all");
  const [urgentOnly, setUrgentOnly] = useState(false);

  const rows = useMemo(
    () =>
      categories.filter((c) => {
        if (kind === "provable" && c.estimated) return false;
        if (kind === "estimated" && !c.estimated) return false;
        if (urgentOnly && c.urgentCount === 0) return false;
        if (conf === "high" && c.high === 0) return false;
        if (conf === "medium" && c.medium === 0) return false;
        if (conf === "low" && c.low === 0) return false;
        return true;
      }),
    [categories, conf, kind, urgentOnly],
  );

  const open = categories.find((c) => c.category === openKey) ?? null;
  const hasEstimated = categories.some((c) => c.estimated);

  return (
    <div className="space-y-4">
      <div className={cn(CARD_CLASS, "overflow-hidden")}>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
        <span className="mr-1 text-xs uppercase tracking-wider text-slate-400">Confidence</span>
        <FilterChip active={conf === "all"} onClick={() => setConf("all")}>
          All
        </FilterChip>
        <FilterChip active={conf === "high"} onClick={() => setConf("high")}>
          High
        </FilterChip>
        <FilterChip active={conf === "medium"} onClick={() => setConf("medium")}>
          Medium
        </FilterChip>
        <FilterChip active={conf === "low"} onClick={() => setConf("low")}>
          Review
        </FilterChip>
        <span className="ml-3 mr-1 text-xs uppercase tracking-wider text-slate-400">Kind</span>
        <FilterChip active={kind === "all"} onClick={() => setKind("all")}>
          All
        </FilterChip>
        <FilterChip active={kind === "provable"} onClick={() => setKind("provable")}>
          Provable
        </FilterChip>
        {hasEstimated && (
          <FilterChip active={kind === "estimated"} onClick={() => setKind("estimated")}>
            Estimated
          </FilterChip>
        )}
        <FilterChip active={urgentOnly} onClick={() => setUrgentOnly((v) => !v)}>
          Closing ≤14d
        </FilterChip>
      </div>

      {/* Category table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-[11px] font-medium uppercase tracking-wider text-slate-400">
              <th className="px-4 py-2.5">Category</th>
              <th className="hidden px-4 py-2.5 text-right sm:table-cell">Cases</th>
              <th className="hidden px-4 py-2.5 sm:table-cell">Confidence</th>
              <th className="px-4 py-2.5 text-right">Amount</th>
              <th className="w-8 px-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((c) => (
              <tr
                key={c.category}
                tabIndex={0}
                onClick={() => setOpenKey(c.category)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpenKey(c.category);
                  }
                }}
                className="cursor-pointer hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="font-medium text-slate-900">{c.label}</span>
                    {c.recurring && (
                      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                        recurring
                      </span>
                    )}
                    {c.estimated && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                        estimated
                      </span>
                    )}
                  </div>
                </td>
                <td className="hidden px-4 py-3 text-right font-mono tabular-nums text-slate-500 sm:table-cell">
                  {c.count.toLocaleString()}
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  <span className="text-xs text-slate-500">
                    {c.high > 0 && <span className="text-blue-600">{c.high} high</span>}
                    {c.medium > 0 && (
                      <>
                        {c.high > 0 ? " · " : ""}
                        <span className="text-amber-600">{c.medium} med</span>
                      </>
                    )}
                    {c.low > 0 && (
                      <>
                        {c.high > 0 || c.medium > 0 ? " · " : ""}
                        {c.low} review
                      </>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-slate-900">
                  {formatDollars(c.totalCents)}
                </td>
                <td className="px-2 text-slate-300">
                  <ChevronRight className="size-4" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>

      {kind !== "provable" && hasEstimated && (
        <p className="mt-3 max-w-3xl text-xs leading-relaxed text-slate-400">
          Rows tagged <span className="font-medium text-slate-500">estimated</span> are
          reimbursement buckets valued at a flat per-item placeholder, not a row-level amount, so
          they are not counted in the {formatDollars(provableCents)} provable total. Amazon&apos;s
          2024 to 2025 auto-reimbursement may already have covered some. We confirm the real
          per-item value before filing.
        </p>
      )}

      <ReportDrawer
        open={open !== null}
        onClose={() => setOpenKey(null)}
        title={open?.label ?? ""}
        colorDot={open?.color}
      >
        {open && (
          <CategoryDeepDive
            categoryKey={open.category}
            summary={{
              count: open.count,
              total_cents: open.totalCents,
              urgent_count: open.urgentCount,
              high: open.high,
              medium: open.medium,
              low: open.low,
            }}
            findings={findingsByCategory[open.category] ?? []}
            narrative={narratives?.[open.category]}
          />
        )}
      </ReportDrawer>
    </div>
  );
}
