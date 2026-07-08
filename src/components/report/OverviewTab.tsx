import {
  AlertTriangle,
  FileSearch,
  Calculator,
  ScanLine,
  Gauge,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDollars } from "@/lib/format";
import { Spotlight, type SpotlightProps } from "./Spotlight";
import { ForensicVisuals } from "./ForensicVisuals";

const CALENDLY = "https://calendly.com/vyshag-baslix/30min";

export interface OverviewTabProps {
  brand: string;
  forwardMonthlyCents: number | null;
  provableCents: number;
  provableOneTimeCents: number;
  urgentCents: number;
  totalCents: number;
  estimatedCents: number;
  categoryCount: number;
  conf: { high: number; medium: number; low: number };
  stats: { value: string; label: string }[];
  spotlight: SpotlightProps | null;
  chartCategories: { key: string; label: string; total: number; color: string }[];
  provableConfidenceCents: { high: number; medium: number; low: number };
  urgencyBuckets: { label: string; cents: number; count: number }[];
  execSummary?: string;
  methodologyNote?: string;
}

export function OverviewTab(p: OverviewTabProps) {
  const confTotal = Math.max(p.conf.high + p.conf.medium + p.conf.low, 1);
  const hasForward = p.forwardMonthlyCents !== null && p.forwardMonthlyCents > 0;
  return (
    <div className="space-y-12">
      {/* Hero */}
      <section>
        {hasForward ? (
          <>
            <p className="font-mono text-5xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-6xl">
              {formatDollars(p.forwardMonthlyCents!)}
              <span className="ml-1 align-baseline text-2xl font-medium text-slate-400">
                /mo
              </span>
            </p>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-600">
              Amazon is overbilling {p.brand} about{" "}
              <span className="font-semibold text-slate-900">
                {formatDollars(p.forwardMonthlyCents!)} every month
              </span>{" "}
              in high-confidence, provable overcharges, and it compounds until the wrong
              referral category and size-tier are corrected.
            </p>
          </>
        ) : (
          <>
            <p className="font-mono text-5xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-6xl">
              {formatDollars(p.provableCents)}
            </p>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-600">
              Provable overcharges and missing credits we found in {p.brand}&apos;s own Seller
              Central data. Every figure below traces to a specific row.
            </p>
          </>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {p.provableOneTimeCents > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-100">
              <FileSearch className="size-3.5 stroke-[1.5]" />
              {formatDollars(p.provableOneTimeCents)} recoverable now (one-time)
            </span>
          )}
          {p.urgentCents > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-100">
              <AlertTriangle className="size-3.5 stroke-[1.5]" />
              {formatDollars(p.urgentCents)} closing within 14 days
            </span>
          )}
        </div>

        <p className="mt-5 max-w-2xl text-sm text-slate-500">
          <span className="font-semibold text-slate-700">{formatDollars(p.totalCents)}</span>{" "}
          surfaced in total across {p.categoryCount}{" "}
          {p.categoryCount === 1 ? "category" : "categories"}: {formatDollars(p.provableCents)}{" "}
          provable
          {p.estimatedCents > 0 && <>, {formatDollars(p.estimatedCents)} estimated</>} ·{" "}
          {p.conf.high} high · {p.conf.medium} medium confidence. Full forensic detail below.
        </p>
        {p.estimatedCents > 0 && (
          <p className="mt-2 max-w-2xl text-xs text-slate-400">
            The estimated figure is a flat per-item placeholder for reimbursement buckets, fenced
            in the Findings tab and <span className="font-medium">not</span> counted in the
            provable number. Amazon may have already auto-reimbursed some.
          </p>
        )}

        {/* KPI row + confidence bar */}
        <div className="mt-8 grid gap-6 border-t border-slate-200 pt-6 sm:grid-cols-[1fr_auto] sm:items-end sm:gap-10">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
            {p.stats.map((s) => (
              <div key={s.label}>
                <dt className="text-[11px] uppercase tracking-wider text-slate-400">
                  {s.label}
                </dt>
                <dd className="mt-0.5 font-mono text-xl font-semibold tabular-nums text-slate-900">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="sm:w-52">
            <p className="text-[11px] uppercase tracking-wider text-slate-400">
              Evidence confidence
            </p>
            <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="bg-blue-600"
                style={{ width: `${(p.conf.high / confTotal) * 100}%` }}
              />
              <div
                className="bg-amber-400"
                style={{ width: `${(p.conf.medium / confTotal) * 100}%` }}
              />
              <div
                className="bg-slate-300"
                style={{ width: `${(p.conf.low / confTotal) * 100}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-slate-400">
              <span>{p.conf.high} high</span>
              <span>{p.conf.medium} medium</span>
              <span>{p.conf.low} review</span>
            </div>
          </div>
        </div>
      </section>

      {p.spotlight && <Spotlight {...p.spotlight} />}

      {/* Where the money is */}
      <section>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          Where the money is
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
          The same evidence seen by category and by confidence.
        </p>
        <ForensicVisuals
          only="money"
          categories={p.chartCategories}
          confidenceCents={p.provableConfidenceCents}
          urgencyBuckets={p.urgencyBuckets}
          forwardMonthlyCents={p.forwardMonthlyCents}
        />
      </section>

      {/* Trust strip (inline, not boxes) */}
      <section className="grid gap-6 border-t border-slate-200 pt-8 sm:grid-cols-3">
        {[
          {
            icon: Calculator,
            h: "Recomputed, not guessed",
            b: "We recompute what Amazon should have charged or credited on each sale and match it against what it actually did, using only your own reports.",
          },
          {
            icon: ScanLine,
            h: "Every figure traces to a row",
            b: "Each provable dollar carries the source order, SKU and date from your Seller Central data, defensible line by line, in the PDF and CSV.",
          },
          {
            icon: Gauge,
            h: "Honest confidence",
            b: "High is a direct, unambiguous match. Medium is a strong signal with a legitimate exception possible. Review needs a human look before filing.",
          },
        ].map((t) => (
          <div key={t.h}>
            <div className="flex items-center gap-2 text-slate-800">
              <t.icon className="size-4 stroke-[1.5]" />
              <p className="text-sm font-semibold">{t.h}</p>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{t.b}</p>
          </div>
        ))}
      </section>

      {p.execSummary && (
        <section className="border-l-2 border-slate-900 pl-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Executive summary
          </p>
          <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-slate-700">
            {p.execSummary}
          </p>
        </section>
      )}

      {p.methodologyNote && (
        <section className="border-t border-slate-200 pt-8">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            How we found this
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
            {p.methodologyNote}
          </p>
        </section>
      )}

      {/* Close */}
      <section className="overflow-hidden rounded-2xl bg-slate-900 px-8 py-10 text-center text-white sm:px-10 sm:py-12">
        <ShieldCheck className="mx-auto mb-4 size-7 stroke-[1.5] text-white/70" />
        <p className="text-lg font-semibold">Every finding above is yours to file, free.</p>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
          The report is the easy part. What needs our hands is what recurs:{" "}
          {hasForward ? (
            <>
              the{" "}
              <span className="font-semibold text-white">
                {formatDollars(p.forwardMonthlyCents!)}/mo
              </span>{" "}
              overcharge that keeps compounding until the root cause is fixed
            </>
          ) : (
            <>the overcharge that keeps compounding until the root cause is fixed</>
          )}
          , the same leakage across every channel you sell on, and the backward claims that need
          direct access to your account to chase down.
        </p>
        <Button size="lg" variant="secondary" className="mt-6" asChild>
          <a href={CALENDLY} target="_blank" rel="noopener noreferrer">
            Talk to us: 15 minutes, no pitch deck <ArrowRight className="ml-2 size-4" />
          </a>
        </Button>
      </section>
    </div>
  );
}
