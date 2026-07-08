import {
  AlertTriangle,
  FileSearch,
  Calculator,
  ScanLine,
  Gauge,
  ShieldCheck,
  ArrowRight,
  Crosshair,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDollars } from "@/lib/format";
import { Spotlight, type SpotlightProps } from "./Spotlight";
import { ForensicVisuals, ForwardBleedChart } from "./ForensicVisuals";
import { DashboardCard, CARD_CLASS, ACCENT } from "./DashboardCard";
import { StatTile } from "./StatTile";

const CALENDLY = "https://calendly.com/vyshag-baslix/30min";
const CTA_CLASS = "bg-[#635bff] text-white hover:bg-[#544ee6]";

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

const TRUST = [
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
];

export function OverviewTab(p: OverviewTabProps) {
  const hasForward = p.forwardMonthlyCents !== null && p.forwardMonthlyCents > 0;

  return (
    <div className="space-y-4">
      {/* Hero: big metric + area chart (Stripe "Gross volume" pattern) */}
      <div className={cn(CARD_CLASS, "overflow-hidden")}>
        <div className="p-6 lg:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                {hasForward ? "High-confidence overcharge run-rate" : "Provable recovery"}
              </p>
              <p className="mt-1 font-mono text-4xl font-semibold tabular-nums text-slate-900 sm:text-5xl">
                {hasForward ? formatDollars(p.forwardMonthlyCents!) : formatDollars(p.provableCents)}
                {hasForward && (
                  <span className="ml-1 align-baseline text-2xl font-medium text-slate-400">
                    /mo
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {p.provableOneTimeCents > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">
                  <FileSearch className="size-3.5 stroke-[1.5]" />
                  {formatDollars(p.provableOneTimeCents)} recoverable now
                </span>
              )}
              {p.urgentCents > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-100">
                  <AlertTriangle className="size-3.5 stroke-[1.5]" />
                  {formatDollars(p.urgentCents)} closing within 14 days
                </span>
              )}
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-600">
            {hasForward ? (
              <>
                Amazon is overbilling {p.brand} about{" "}
                <span className="font-semibold text-slate-900">
                  {formatDollars(p.forwardMonthlyCents!)} every month
                </span>{" "}
                in high-confidence, provable overcharges, and it compounds until the wrong referral
                category and size-tier are corrected.
              </>
            ) : (
              <>
                Provable overcharges and missing credits we found in {p.brand}&apos;s own Seller
                Central data. Every figure below traces to a specific row.
              </>
            )}
          </p>
        </div>

        {hasForward && (
          <div className="border-t border-slate-100 px-4 pb-3">
            <ForwardBleedChart monthlyCents={p.forwardMonthlyCents!} />
          </div>
        )}

        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-3">
          <p className="text-xs leading-relaxed text-slate-500">
            <span className="font-semibold text-slate-700">{formatDollars(p.totalCents)}</span>{" "}
            surfaced in total across {p.categoryCount}{" "}
            {p.categoryCount === 1 ? "category" : "categories"}: {formatDollars(p.provableCents)}{" "}
            provable
            {p.estimatedCents > 0 && <>, {formatDollars(p.estimatedCents)} estimated</>} ·{" "}
            {p.conf.high} high · {p.conf.medium} medium confidence.
            {p.estimatedCents > 0 && (
              <>
                {" "}
                The estimated figure is a flat per-item placeholder, fenced in the Findings tab and
                not counted in the provable number.
              </>
            )}
          </p>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {p.stats.map((s) => (
          <StatTile key={s.label} label={s.label} value={s.value} />
        ))}
      </div>

      {/* Charts bento (category + confidence cards) */}
      <ForensicVisuals
        only="money"
        categories={p.chartCategories}
        confidenceCents={p.provableConfidenceCents}
        urgencyBuckets={p.urgencyBuckets}
        forwardMonthlyCents={p.forwardMonthlyCents}
      />

      {/* Sharpest finding, featured */}
      {p.spotlight && (
        <DashboardCard
          icon={<Crosshair className="size-4 stroke-[1.5]" style={{ color: ACCENT }} />}
          title="The sharpest finding"
          subtitle="Undeniable in about 30 seconds, traced to one row."
          action={
            <div className="flex items-center gap-2">
              {p.spotlight.confidence === "high" && (
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-white">
                  high confidence
                </span>
              )}
              <span className="hidden text-xs text-slate-500 sm:inline">
                {p.spotlight.display_name}
              </span>
            </div>
          }
        >
          <Spotlight {...p.spotlight} />
        </DashboardCard>
      )}

      {/* Trust row */}
      <div className="grid gap-4 sm:grid-cols-3">
        {TRUST.map((t) => (
          <div key={t.h} className={cn(CARD_CLASS, "p-5")}>
            <div className="flex items-center gap-2 text-slate-800">
              <t.icon className="size-4 stroke-[1.5]" />
              <p className="text-sm font-semibold">{t.h}</p>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{t.b}</p>
          </div>
        ))}
      </div>

      {/* Executive summary + method */}
      {(p.execSummary || p.methodologyNote) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {p.execSummary && (
            <DashboardCard title="Executive summary">
              <p className="text-sm leading-relaxed text-slate-600">{p.execSummary}</p>
            </DashboardCard>
          )}
          {p.methodologyNote && (
            <DashboardCard title="How we found this">
              <p className="text-sm leading-relaxed text-slate-600">{p.methodologyNote}</p>
            </DashboardCard>
          )}
        </div>
      )}

      {/* Close */}
      <div className="overflow-hidden rounded-xl bg-slate-900 px-8 py-10 text-center text-white sm:px-10 sm:py-12">
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
        <Button size="lg" className={cn("mt-6", CTA_CLASS)} asChild>
          <a href={CALENDLY} target="_blank" rel="noopener noreferrer">
            Talk to us: 15 minutes, no pitch deck <ArrowRight className="ml-2 size-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}
