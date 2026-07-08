"use client";

import Image from "next/image";
import { ArrowRight, Download, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDollars } from "@/lib/format";
import { cn } from "@/lib/utils";

const CALENDLY = "https://calendly.com/vyshag-baslix/30min";

export type TabKey = "overview" | "findings" | "deadlines";
export const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "findings", label: "Findings" },
  { key: "deadlines", label: "Deadlines" },
];

export function ReportTopBar({
  brand,
  caseId,
  uuid,
  recoverableNowCents,
  tab,
  onTab,
}: {
  brand: string;
  caseId: string;
  uuid: string;
  recoverableNowCents: number;
  tab: TabKey;
  onTab: (t: TabKey) => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2.5 sm:px-6">
        <a href="https://baslix.com" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Baslix" width={24} height={24} className="size-6" />
          <span className="hidden text-sm font-semibold tracking-tight text-slate-900 sm:inline">
            Settlement Truth Audit
          </span>
        </a>
        <span className="hidden text-xs text-slate-400 md:inline">
          {brand} <span className="text-slate-300">·</span>{" "}
          <span className="font-mono">{caseId}</span>
        </span>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {recoverableNowCents > 0 && (
            <div className="hidden text-right sm:block">
              <p className="font-mono text-sm font-semibold tabular-nums text-slate-900">
                {formatDollars(recoverableNowCents)}
              </p>
              <p className="-mt-0.5 text-[10px] uppercase tracking-wider text-slate-400">
                recoverable
              </p>
            </div>
          )}
          <div className="hidden items-center gap-1 sm:flex">
            <Button asChild variant="ghost" size="sm">
              <a href={`/api/audit/pdf?id=${uuid}`} download aria-label="Download PDF">
                <Download className="size-4 stroke-[1.5]" />
              </a>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <a href={`/api/audit/csv?id=${uuid}`} download aria-label="Export CSV">
                <Table2 className="size-4 stroke-[1.5]" />
              </a>
            </Button>
          </div>
          <Button asChild size="sm">
            <a href={CALENDLY} target="_blank" rel="noopener noreferrer">
              Book a call <ArrowRight className="ml-1.5 size-4" />
            </a>
          </Button>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Report sections"
        className="mx-auto flex max-w-6xl gap-1 px-4 sm:px-6"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls={`panel-${t.key}`}
            onClick={() => onTab(t.key)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              tab === t.key
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
    </header>
  );
}
