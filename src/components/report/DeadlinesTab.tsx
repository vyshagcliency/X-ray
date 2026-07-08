import { ArrowRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDollars } from "@/lib/format";
import { ForensicVisuals } from "./ForensicVisuals";
import { DashboardCard, CTA_CLASS } from "./DashboardCard";
import { StatTile } from "./StatTile";
import type { ClosingSoonRow } from "./urgent-cases";

const CALENDLY = "https://calendly.com/vyshag-baslix/30min";

export function DeadlinesTab({
  forwardMonthlyCents,
  recoverableNowCents,
  urgentCents,
  chartCategories,
  provableConfidenceCents,
  urgencyBuckets,
  closingSoon,
  catLabel,
}: {
  forwardMonthlyCents: number | null;
  recoverableNowCents: number;
  urgentCents: number;
  chartCategories: { key: string; label: string; total: number; color: string }[];
  provableConfidenceCents: { high: number; medium: number; low: number };
  urgencyBuckets: { label: string; cents: number; count: number }[];
  closingSoon: ClosingSoonRow[];
  catLabel: (key: string) => string;
}) {
  const hasForward = forwardMonthlyCents !== null && forwardMonthlyCents > 0;

  return (
    <div className="space-y-4">
      {/* Anchor on the real recoverable figure, then the imminent subset + the recurring drip.
          Most of the recovery has a long (up to 18-month) window, so the ≤14-day number is small
          by nature; leading with it alone made the tab read as tiny. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {recoverableNowCents > 0 && (
          <StatTile
            label="Recoverable now"
            value={formatDollars(recoverableNowCents)}
            hint="provable, file each within its window (up to 18 months)"
            accent
          />
        )}
        {urgentCents > 0 && (
          <StatTile
            label="Closing ≤ 14 days"
            value={formatDollars(urgentCents)}
            hint={`${closingSoon.length} finding${closingSoon.length === 1 ? "" : "s"}, file these first`}
          />
        )}
        {hasForward && (
          <StatTile
            label="Recurring drain"
            value={`${formatDollars(forwardMonthlyCents!)}/mo`}
            hint="keeps billing until the root cause is fixed"
          />
        )}
      </div>

      <ForensicVisuals
        only="urgency"
        categories={chartCategories}
        confidenceCents={provableConfidenceCents}
        urgencyBuckets={urgencyBuckets}
        forwardMonthlyCents={forwardMonthlyCents}
      />

      {closingSoon.length > 0 && (
        <DashboardCard
          icon={<AlertTriangle className="size-4 stroke-[1.5] text-amber-600" />}
          title="Closing within 14 days"
          subtitle="Provable findings whose dispute window is about to close. File these first."
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-2.5">Category</th>
                  <th className="px-5 py-2.5">SKU</th>
                  <th className="px-5 py-2.5 text-right">Amount</th>
                  <th className="px-5 py-2.5 text-right">Days left</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {closingSoon.slice(0, 20).map((r, i) => (
                  <tr key={`${r.sku}-${i}`} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5 text-slate-700">{catLabel(r.category)}</td>
                    <td className="px-5 py-2.5 font-mono text-xs text-slate-500">{r.sku}</td>
                    <td className="px-5 py-2.5 text-right font-mono tabular-nums text-slate-900">
                      {formatDollars(r.amountCents)}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono font-medium tabular-nums text-amber-700">
                      {r.daysRemaining}d
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {closingSoon.length > 20 && (
            <p className="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-400">
              + {(closingSoon.length - 20).toLocaleString()} more closing soon. Full detail is in
              the PDF and CSV export.
            </p>
          )}
        </DashboardCard>
      )}

      <div className="rounded-xl bg-slate-900 px-8 py-10 text-center text-white">
        <p className="text-lg font-semibold">
          {forwardMonthlyCents && forwardMonthlyCents > 0 ? (
            <>Left uncorrected, this keeps billing {formatDollars(forwardMonthlyCents)}/mo.</>
          ) : (
            <>These windows close whether or not you file.</>
          )}
        </p>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
          The call is about stopping that, not just clawing back the past.
        </p>
        <Button size="lg" className={cn("mt-6", CTA_CLASS)} asChild>
          <a href={CALENDLY} target="_blank" rel="noopener noreferrer">
            Book a call, 15 min <ArrowRight className="ml-2 size-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}
