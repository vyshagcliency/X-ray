"use client";

import { useState } from "react";
import { ReportTopBar, type TabKey } from "./ReportTopBar";
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700">
      <ReportTopBar
        brand={m.brand}
        caseId={m.caseId}
        uuid={m.uuid}
        recoverableNowCents={m.provableOneTimeCents}
        tab={tab}
        onTab={setTab}
      />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
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
              chartCategories={m.chartCategories}
              provableConfidenceCents={m.provableConfidenceCents}
              urgencyBuckets={m.urgencyBuckets}
              closingSoon={m.closingSoon}
              catLabel={(k) => m.catLabelMap[k] ?? k}
            />
          )}
        </div>
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-4 sm:px-6">
        <p className="border-t border-slate-200 pt-4 text-xs text-slate-400">
          Generated for {m.brand}
          {m.completedLabel ? ` on ${m.completedLabel}` : ""} · Case ID {m.caseId}
        </p>
      </footer>
    </div>
  );
}
