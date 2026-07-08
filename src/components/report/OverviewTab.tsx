import {
  AlertTriangle,
  Repeat,
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
import { ForensicVisuals } from "./ForensicVisuals";
import { DashboardCard, CARD_CLASS, CTA_CLASS, ACCENT } from "./DashboardCard";
import { StatTile } from "./StatTile";

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

/** Confidence tiers, shown as a color-dot legend instead of a run-on sentence. */
const CONFIDENCE_LEGEND = [
  { dot: "#2563eb", term: "High", def: "direct, unambiguous match" },
  { dot: "#d97706", term: "Medium", def: "strong signal, exception possible" },
  { dot: "#94a3b8", term: "Review", def: "human look before filing" },
];

/** The method, shown as three steps instead of one dense clause. */
const METHOD_STEPS = [
  { n: "1", term: "Recompute", def: "what Amazon should have charged or credited on each sale" },
  { n: "2", term: "Match", def: "it against what Amazon actually did" },
  { n: "3", term: "Flag", def: "every discrepancy, with a confidence level" },
];

/** The Seller Central reports the audit reads (the fixed ingest surface). */
const REPORTS_READ = [
  "Settlement",
  "FBA Fee Preview",
  "Returns",
  "Reimbursements",
  "Inventory Ledger",
];

/** A soft accent square holding a trust icon. */
function TrustBadge({ icon }: { icon: React.ReactNode }) {
  return (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-lg"
      style={{ backgroundColor: "rgba(73,113,255,0.1)", color: ACCENT }}
    >
      {icon}
    </span>
  );
}

export function OverviewTab(p: OverviewTabProps) {
  const hasForward = p.forwardMonthlyCents !== null && p.forwardMonthlyCents > 0;
  // Lead with the big, provable, one-time recoverable figure; the recurring run-rate is
  // the "and it keeps bleeding" hook beneath it (Vyshag, 2026-07-08).
  const leadOneTime = p.provableOneTimeCents > 0;
  const heroCents = leadOneTime ? p.provableOneTimeCents : p.provableCents;

  return (
    <div className="space-y-4">
      {/* Hero: the provable recoverable-now figure (Stripe metric card) */}
      <div className={cn(CARD_CLASS, "overflow-hidden")}>
        <div className="p-6 lg:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                {leadOneTime ? "Recoverable now, provable line by line" : "Provable recovery"}
              </p>
              <p className="mt-1 font-mono text-4xl font-semibold tabular-nums text-slate-900 sm:text-5xl">
                {formatDollars(heroCents)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {hasForward && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-100">
                  <Repeat className="size-3.5 stroke-[1.5]" />
                  {formatDollars(p.forwardMonthlyCents!)}/mo still bleeding
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
            {leadOneTime ? (
              <>
                We found{" "}
                <span className="font-semibold text-slate-900">{formatDollars(heroCents)}</span> in
                provable overcharges and missing credits in {p.brand}&apos;s own Seller Central
                data, every dollar traced to a specific row.
                {hasForward && (
                  <>
                    {" "}
                    On top of that, Amazon keeps overbilling about{" "}
                    <span className="font-semibold text-slate-900">
                      {formatDollars(p.forwardMonthlyCents!)}/mo
                    </span>{" "}
                    until the wrong referral category and size-tier are corrected.
                  </>
                )}
              </>
            ) : (
              <>
                Provable overcharges and missing credits we found in {p.brand}&apos;s own Seller
                Central data. Every figure below traces to a specific row.
              </>
            )}
          </p>
        </div>

        {/* Surfaced breakdown, shown as a split bar instead of a sentence */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-baseline justify-between text-[11px] font-medium">
            <span className="uppercase tracking-wider text-slate-400">
              {formatDollars(p.totalCents)} surfaced across {p.categoryCount}{" "}
              {p.categoryCount === 1 ? "category" : "categories"}
            </span>
          </div>
          <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full"
              style={{
                width: `${(p.provableCents / Math.max(p.totalCents, 1)) * 100}%`,
                backgroundColor: ACCENT,
              }}
            />
            {p.estimatedCents > 0 && (
              <div
                className="h-full bg-slate-300"
                style={{ width: `${(p.estimatedCents / Math.max(p.totalCents, 1)) * 100}%` }}
              />
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: ACCENT }} />
              <span className="font-semibold text-slate-700">{formatDollars(p.provableCents)}</span>
              <span className="text-slate-400">provable</span>
            </span>
            {p.estimatedCents > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-slate-300" />
                <span className="font-semibold text-slate-600">
                  {formatDollars(p.estimatedCents)}
                </span>
                <span className="text-slate-400">estimated, a flat placeholder, not counted</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {p.stats.map((s) => (
          <StatTile key={s.label} label={s.label} value={s.value} />
        ))}
      </div>

      {/* Executive summary: figure tiles up top, prose beneath */}
      {p.execSummary && (
        <DashboardCard title="Executive summary">
          <div className="mb-4 grid grid-cols-3 divide-x divide-slate-100 rounded-lg bg-slate-50 py-3 text-center">
            <div className="px-2">
              <p className="font-mono text-lg font-semibold tabular-nums text-slate-900">
                {p.stats.find((s) => s.label === "Findings")?.value ?? p.stats[0]?.value}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Discrepancies</p>
            </div>
            <div className="px-2">
              <p className="font-mono text-lg font-semibold tabular-nums text-slate-900">
                {formatDollars(p.provableCents)}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Provable</p>
            </div>
            <div className="px-2">
              <p
                className="font-mono text-lg font-semibold tabular-nums"
                style={{ color: p.urgentCents > 0 ? "#b45309" : "#0f172a" }}
              >
                {p.urgentCents > 0 ? formatDollars(p.urgentCents) : "None"}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Time-sensitive</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-slate-600">{p.execSummary}</p>
        </DashboardCard>
      )}

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

      {/* Trust row: each claim carried by a visual, with minimal words */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* 1. Recomputed — a charged/correct/gap diagram */}
        <div className={cn(CARD_CLASS, "flex flex-col p-5")}>
          <div className="flex items-center gap-2.5">
            <TrustBadge icon={<Calculator className="size-4 stroke-[1.5]" />} />
            <p className="text-sm font-semibold text-slate-900">Recomputed, not guessed</p>
          </div>
          <div className="mt-4 flex items-stretch gap-2 text-center">
            <div className="flex-1 rounded-lg bg-slate-100 px-2 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Charged</p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-slate-700">$9.50</p>
            </div>
            <div className="flex items-center text-slate-300">&minus;</div>
            <div className="flex-1 rounded-lg bg-slate-100 px-2 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Correct</p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-slate-700">$5.50</p>
            </div>
            <div className="flex items-center text-slate-300">=</div>
            <div
              className="flex-1 rounded-lg px-2 py-2.5"
              style={{ backgroundColor: "rgba(73,113,255,0.1)" }}
            >
              <p className="text-[10px] uppercase tracking-wide" style={{ color: ACCENT }}>
                Gap
              </p>
              <p className="mt-0.5 font-mono text-sm font-semibold" style={{ color: ACCENT }}>
                $4.00
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Matched against your own reports, never estimated.
          </p>
        </div>

        {/* 2. Traces to a row — a sample evidence row */}
        <div className={cn(CARD_CLASS, "flex flex-col p-5")}>
          <div className="flex items-center gap-2.5">
            <TrustBadge icon={<ScanLine className="size-4 stroke-[1.5]" />} />
            <p className="text-sm font-semibold text-slate-900">Every figure traces to a row</p>
          </div>
          <div className="mt-4 overflow-hidden rounded-lg ring-1 ring-slate-200">
            <div className="grid grid-cols-4 bg-slate-50 px-2.5 py-1.5 text-[9px] font-medium uppercase tracking-wide text-slate-400">
              <span>Order</span>
              <span>SKU</span>
              <span>Date</span>
              <span className="text-right">Amount</span>
            </div>
            <div className="grid grid-cols-4 items-center px-2.5 py-2 font-mono text-[11px] text-slate-600">
              <span className="truncate">583…4688</span>
              <span className="truncate">HA-HDP-003</span>
              <span>Mar 2026</span>
              <span className="text-right font-semibold text-slate-900">$59.67</span>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Defensible line by line, in the PDF and CSV.
          </p>
        </div>

        {/* 3. Honest confidence — an aligned legend */}
        <div className={cn(CARD_CLASS, "flex flex-col p-5")}>
          <div className="flex items-center gap-2.5">
            <TrustBadge icon={<Gauge className="size-4 stroke-[1.5]" />} />
            <p className="text-sm font-semibold text-slate-900">Honest confidence</p>
          </div>
          <ul className="mt-4 space-y-2.5">
            {CONFIDENCE_LEGEND.map((c) => (
              <li key={c.term} className="flex items-center gap-2.5 text-xs">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: c.dot }}
                />
                <span className="w-14 shrink-0 font-semibold text-slate-700">{c.term}</span>
                <span className="text-slate-500">{c.def}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* How we found this: method steps + reports read + prose */}
      {p.methodologyNote && (
        <DashboardCard title="How we found this">
          <div className="grid gap-5 lg:grid-cols-3">
            <ol className="space-y-2 lg:col-span-1">
              {METHOD_STEPS.map((s) => (
                <li key={s.n} className="flex items-start gap-2.5">
                  <span
                    className="flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                    style={{ backgroundColor: "rgba(73,113,255,0.1)", color: ACCENT }}
                  >
                    {s.n}
                  </span>
                  <span className="text-xs leading-relaxed text-slate-600">
                    <span className="font-medium text-slate-800">{s.term}</span> {s.def}.
                  </span>
                </li>
              ))}
            </ol>
            <div className="lg:col-span-2">
              <p className="text-sm leading-relaxed text-slate-600">{p.methodologyNote}</p>
              <div className="mt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Reports we read
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] font-medium text-slate-600">
                  {REPORTS_READ.map((r) => (
                    <span key={r} className="rounded-md bg-slate-100 px-2 py-1">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </DashboardCard>
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
