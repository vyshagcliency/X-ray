"use client";

import { useState } from "react";
import { ReportSidebar, ReportMobileBar, type TabKey } from "./ReportSidebar";
import { OverviewTab, type OverviewTabProps } from "./OverviewTab";
import { FindingsTab, type CategoryRow } from "./FindingsTab";
import { DeadlinesTab } from "./DeadlinesTab";
import type { SpotlightProps } from "./Spotlight";
import type { ClosingSoonRow } from "./urgent-cases";

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

export interface ReportModel {
  brand: string;
  caseId: string;
  uuid: string;
  completedLabel: string | null;
  // hero + overview
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
  // findings
  categoryRows: CategoryRow[];
  findingsByCategory: Record<string, Finding[]>;
  categoryNarratives?: Record<string, string>;
  // deadlines
  closingSoon: ClosingSoonRow[];
  catLabelMap: Record<string, string>;
}

const SECTION: Record<TabKey, { title: string; subtitle: string }> = {
  overview: {
    title: "Overview",
    subtitle: "Where Amazon's settlement doesn't reconcile with what you're owed.",
  },
  findings: {
    title: "Findings",
    subtitle: "Every category, filterable, with the evidence behind each dollar.",
  },
  deadlines: {
    title: "Deadlines",
    subtitle: "What's closing now, and what compounds if you wait.",
  },
};

export function ReportShell({ model: m }: { model: ReportModel }) {
  const [tab, setTab] = useState<TabKey>("overview");
  const overview: OverviewTabProps = {
    brand: m.brand,
    forwardMonthlyCents: m.forwardMonthlyCents,
    provableCents: m.provableCents,
    provableOneTimeCents: m.provableOneTimeCents,
    urgentCents: m.urgentCents,
    totalCents: m.totalCents,
    estimatedCents: m.estimatedCents,
    categoryCount: m.categoryCount,
    conf: m.conf,
    stats: m.stats,
    spotlight: m.spotlight,
    chartCategories: m.chartCategories,
    provableConfidenceCents: m.provableConfidenceCents,
    urgencyBuckets: m.urgencyBuckets,
    execSummary: m.execSummary,
    methodologyNote: m.methodologyNote,
  };
  const section = SECTION[tab];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700">
      <ReportMobileBar tab={tab} onTab={setTab} />
      <div className="lg:flex">
        <ReportSidebar
          brand={m.brand}
          caseId={m.caseId}
          uuid={m.uuid}
          recoverableNowCents={m.provableOneTimeCents}
          urgentCents={m.urgentCents}
          tab={tab}
          onTab={setTab}
        />

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            <div className="mb-5">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                {section.title}
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">{section.subtitle}</p>
            </div>

            <div
              role="tabpanel"
              id="panel-overview"
              aria-labelledby="tab-overview"
              hidden={tab !== "overview"}
            >
              {tab === "overview" && <OverviewTab {...overview} />}
            </div>
            <div
              role="tabpanel"
              id="panel-findings"
              aria-labelledby="tab-findings"
              hidden={tab !== "findings"}
            >
              {tab === "findings" && (
                <FindingsTab
                  categories={m.categoryRows}
                  findingsByCategory={m.findingsByCategory}
                  narratives={m.categoryNarratives}
                  provableCents={m.provableCents}
                />
              )}
            </div>
            <div
              role="tabpanel"
              id="panel-deadlines"
              aria-labelledby="tab-deadlines"
              hidden={tab !== "deadlines"}
            >
              {tab === "deadlines" && (
                <DeadlinesTab
                  forwardMonthlyCents={m.forwardMonthlyCents}
                  urgentCents={m.urgentCents}
                  chartCategories={m.chartCategories}
                  provableConfidenceCents={m.provableConfidenceCents}
                  urgencyBuckets={m.urgencyBuckets}
                  closingSoon={m.closingSoon}
                  catLabel={(k) => m.catLabelMap[k] ?? k}
                />
              )}
            </div>

            <footer className="mt-8 border-t border-slate-200 pt-4">
              <p className="text-xs text-slate-400">
                Generated for {m.brand}
                {m.completedLabel ? ` on ${m.completedLabel}` : ""} · Case ID {m.caseId}
              </p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
