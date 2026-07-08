"use client";

import Image from "next/image";
import {
  LayoutDashboard,
  FileSearch,
  Clock,
  ArrowRight,
  Download,
  Table2,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDollars } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ACCENT, CTA_CLASS } from "./DashboardCard";

const CALENDLY = "https://calendly.com/vyshag-baslix/30min";

export type TabKey = "overview" | "findings" | "deadlines";
export const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "findings", label: "Findings", icon: FileSearch },
  { key: "deadlines", label: "Deadlines", icon: Clock },
];

interface NavProps {
  brand: string;
  caseId: string;
  uuid: string;
  recoverableNowCents: number;
  urgentCents: number;
  tab: TabKey;
  onTab: (t: TabKey) => void;
}

/** Desktop left rail: brand + case, section nav, and a pinned recovery/CTA block. */
export function ReportSidebar({
  brand,
  caseId,
  uuid,
  recoverableNowCents,
  urgentCents,
  tab,
  onTab,
}: NavProps) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
      <div className="sticky top-0 flex h-screen flex-col">
        <div className="px-5 py-5">
          <a href="https://baslix.com" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Baslix" width={24} height={24} className="size-6" />
            <span className="text-sm font-semibold tracking-tight text-slate-900">
              Settlement Truth Audit
            </span>
          </a>
          <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200/70">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Case file
            </p>
            <p className="mt-0.5 truncate text-sm font-medium text-slate-800">{brand}</p>
            <p className="font-mono text-xs text-slate-400">{caseId}</p>
          </div>
        </div>

        <nav role="tablist" aria-label="Report sections" className="flex flex-col gap-1 px-3">
          {TABS.map((t) => {
            const active = tab === t.key;
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                role="tab"
                id={`tab-${t.key}`}
                aria-selected={active}
                aria-controls={`panel-${t.key}`}
                onClick={() => onTab(t.key)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-slate-100 font-medium text-slate-900"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
                )}
              >
                <Icon
                  className="size-4 stroke-[1.5]"
                  style={active ? { color: ACCENT } : undefined}
                />
                {t.label}
              </button>
            );
          })}
        </nav>

        <div className="flex-1" />

        <div className="space-y-3 border-t border-slate-100 px-5 py-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Recoverable now
            </p>
            <p className="mt-0.5 font-mono text-2xl font-semibold tabular-nums text-slate-900">
              {recoverableNowCents > 0 ? formatDollars(recoverableNowCents) : "See below"}
            </p>
            {urgentCents > 0 && (
              <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-700">
                <AlertTriangle className="size-3 stroke-[1.5]" />
                {formatDollars(urgentCents)} closing within 14 days
              </p>
            )}
          </div>
          <Button asChild className={cn("w-full", CTA_CLASS)}>
            <a href={CALENDLY} target="_blank" rel="noopener noreferrer">
              Book a call <ArrowRight className="ml-1.5 size-4" />
            </a>
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={`/api/audit/pdf?id=${uuid}`} download>
                <Download className="mr-1.5 size-3.5" /> PDF
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/audit/csv?id=${uuid}`} download>
                <Table2 className="mr-1.5 size-3.5" /> CSV
              </a>
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}

/** Mobile top bar: brand, Book-a-call, and a scrollable segmented section nav. */
export function ReportMobileBar({
  tab,
  onTab,
}: {
  tab: TabKey;
  onTab: (t: TabKey) => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur lg:hidden">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <a href="https://baslix.com" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Baslix" width={22} height={22} className="size-[22px]" />
          <span className="text-sm font-semibold tracking-tight text-slate-900">
            Settlement Truth Audit
          </span>
        </a>
        <Button asChild size="sm" className={cn("ml-auto", CTA_CLASS)}>
          <a href={CALENDLY} target="_blank" rel="noopener noreferrer">
            Book a call
          </a>
        </Button>
      </div>
      <div role="tablist" aria-label="Report sections" className="flex gap-1 overflow-x-auto px-3 pb-2">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => onTab(t.key)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:text-slate-800",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
