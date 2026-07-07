import { ArrowRight, Download, Table2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDollars } from "@/lib/format";

/**
 * The report's right action dock (web-only chrome, print:hidden). Keeps the recovery
 * figure and the single conversion action — a call, never a modal — in view as the
 * reader moves through the dossiers. No new numbers: every figure is passed in from
 * report_data, already reconciled with the hero.
 */

const CALENDLY = "https://calendly.com/vyshag-baslix/30min";

export function ReportDock({
  uuid,
  recoverableNowCents,
  urgentCents,
  forwardMonthlyCents,
}: {
  uuid: string;
  recoverableNowCents: number;
  urgentCents: number;
  forwardMonthlyCents: number | null;
}) {
  return (
    <aside className="hidden xl:block print:hidden">
      <div className="sticky top-20 space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Your recovery
          </p>
          {recoverableNowCents > 0 ? (
            <>
              <p className="mt-1.5 font-mono text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
                {formatDollars(recoverableNowCents)}
              </p>
              <p className="text-xs text-slate-500">recoverable now, one-time</p>
            </>
          ) : (
            <p className="mt-1.5 text-sm text-slate-500">
              Provable recovery detailed below.
            </p>
          )}

          {urgentCents > 0 && (
            <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700">
              <AlertTriangle className="size-3.5 shrink-0 stroke-[1.5]" />
              <span>
                {formatDollars(urgentCents)} closing within 14 days
              </span>
            </div>
          )}

          <div className="mt-4 space-y-2">
            <Button asChild className="w-full">
              <a href={CALENDLY} target="_blank" rel="noopener noreferrer">
                Book a call · 15 min <ArrowRight className="ml-1.5 size-4" />
              </a>
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline" size="sm">
                <a href={`/api/audit/pdf?id=${uuid}`} download>
                  <Download className="mr-1.5 size-3.5" />
                  PDF
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={`/api/audit/csv?id=${uuid}`} download>
                  <Table2 className="mr-1.5 size-3.5" />
                  CSV
                </a>
              </Button>
            </div>
          </div>
        </div>

        {forwardMonthlyCents !== null && forwardMonthlyCents > 0 && (
          <p className="px-1 text-[11px] leading-relaxed text-slate-500">
            Left uncorrected, the wrong category and size-tier keep billing{" "}
            <span className="font-medium text-slate-700">
              {formatDollars(forwardMonthlyCents)}/mo
            </span>
            . The call is about stopping that, not just clawing back the past.
          </p>
        )}
      </div>
    </aside>
  );
}
