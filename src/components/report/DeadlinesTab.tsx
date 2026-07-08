import { ArrowRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDollars } from "@/lib/format";
import { ForensicVisuals } from "./ForensicVisuals";
import type { ClosingSoonRow } from "./urgent-cases";

const CALENDLY = "https://calendly.com/vyshag-baslix/30min";

export function DeadlinesTab({
  forwardMonthlyCents,
  chartCategories,
  provableConfidenceCents,
  urgencyBuckets,
  closingSoon,
  catLabel,
}: {
  forwardMonthlyCents: number | null;
  chartCategories: { key: string; label: string; total: number; color: string }[];
  provableConfidenceCents: { high: number; medium: number; low: number };
  urgencyBuckets: { label: string; cents: number; count: number }[];
  closingSoon: ClosingSoonRow[];
  catLabel: (key: string) => string;
}) {
  return (
    <div className="space-y-12">
      <ForensicVisuals
        only="urgency"
        categories={chartCategories}
        confidenceCents={provableConfidenceCents}
        urgencyBuckets={urgencyBuckets}
        forwardMonthlyCents={forwardMonthlyCents}
      />

      {closingSoon.length > 0 && (
        <section>
          <div className="flex items-center gap-2 text-slate-800">
            <AlertTriangle className="size-4 stroke-[1.5] text-amber-600" />
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">
              Closing within 14 days
            </h2>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            Provable findings whose dispute window is about to close. File these first.
          </p>
          <div className="mt-5 overflow-x-auto rounded-xl ring-1 ring-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5">SKU</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-4 py-2.5 text-right">Days left</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {closingSoon.slice(0, 20).map((r, i) => (
                  <tr key={`${r.sku}-${i}`} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-700">{catLabel(r.category)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{r.sku}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-900">
                      {formatDollars(r.amountCents)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-medium tabular-nums text-amber-700">
                      {r.daysRemaining}d
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {closingSoon.length > 20 && (
            <p className="mt-2 text-xs text-slate-400">
              + {(closingSoon.length - 20).toLocaleString()} more closing soon. Full detail is in
              the PDF and CSV export.
            </p>
          )}
        </section>
      )}

      <section className="rounded-2xl bg-slate-900 px-8 py-10 text-center text-white">
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
        <Button size="lg" variant="secondary" className="mt-6" asChild>
          <a href={CALENDLY} target="_blank" rel="noopener noreferrer">
            Book a call, 15 min <ArrowRight className="ml-2 size-4" />
          </a>
        </Button>
      </section>
    </div>
  );
}
