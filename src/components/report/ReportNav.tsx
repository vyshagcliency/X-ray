"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The report's left ledger rail (web-only chrome, print:hidden). A scroll-spy contents
 * index that tracks the reader's position down a hairline "ledger spine" and lists every
 * category with its dollar figure — so the whole audit is legible from the margin.
 *
 * The document body and the PDF are untouched by this; the rail is a reading aid layered
 * around the locked light-document, not part of it.
 */

export interface NavChild {
  id: string;
  label: string;
  amount: string;
  color: string;
}
export interface NavSection {
  id: string;
  index: string;
  label: string;
  children?: NavChild[];
}

export function ReportNav({
  sections,
  caseId,
  brand,
}: {
  sections: NavSection[];
  caseId: string;
  brand: string;
}) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sections.filter((s) => s.children?.length).map((s) => [s.id, true])),
  );

  // Scroll-spy: the active anchor is the last section whose top has crossed a thin band
  // just under the sticky nav. Observing a ~20%-tall band keeps exactly one section lit.
  useEffect(() => {
    const ids = sections.flatMap((s) => [s.id, ...(s.children?.map((c) => c.id) ?? [])]);
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    const visible = new Set<string>();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        // Lowest-on-page id still within the band = where the reader is.
        const inOrder = ids.filter((id) => visible.has(id));
        if (inOrder.length) setActive(inOrder[inOrder.length - 1]);
      },
      { rootMargin: "-88px 0px -72% 0px", threshold: 0 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [sections]);

  const jump = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  }, []);

  // A child anchor being active should also light its parent group.
  const activeTop =
    sections.find((s) => s.id === active || s.children?.some((c) => c.id === active))?.id ?? active;

  return (
    <aside className="hidden xl:block print:hidden">
      <nav
        aria-label="Report contents"
        className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2"
      >
        <div className="pb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Case file
          </p>
          <p className="mt-1 font-mono text-sm font-semibold tracking-tight text-slate-900">
            {caseId}
          </p>
          <p className="truncate text-xs text-slate-500">{brand}</p>
        </div>

        <ol className="space-y-0.5">
          {sections.map((s) => {
            const isActiveTop = activeTop === s.id;
            const hasChildren = !!s.children?.length;
            const isOpen = open[s.id];
            return (
              <li key={s.id}>
                <div
                  className={cn(
                    "group flex items-stretch border-l-2 transition-colors",
                    isActiveTop ? "border-slate-900" : "border-slate-200 hover:border-slate-400",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => jump(s.id)}
                    className="flex flex-1 items-baseline gap-2 py-1.5 pl-3 pr-1 text-left"
                  >
                    <span
                      className={cn(
                        "font-mono text-[10px] tabular-nums",
                        isActiveTop ? "text-slate-900" : "text-slate-400",
                      )}
                    >
                      {s.index}
                    </span>
                    <span
                      className={cn(
                        "text-[13px] leading-tight transition-colors",
                        isActiveTop
                          ? "font-semibold text-slate-900"
                          : "text-slate-500 group-hover:text-slate-800",
                      )}
                    >
                      {s.label}
                    </span>
                  </button>
                  {hasChildren && (
                    <button
                      type="button"
                      aria-label={isOpen ? `Collapse ${s.label}` : `Expand ${s.label}`}
                      aria-expanded={isOpen}
                      onClick={() => setOpen((o) => ({ ...o, [s.id]: !o[s.id] }))}
                      className="px-2 text-slate-400 hover:text-slate-700"
                    >
                      <ChevronRight
                        className={cn(
                          "size-3.5 stroke-[1.5] transition-transform",
                          isOpen && "rotate-90",
                        )}
                      />
                    </button>
                  )}
                </div>

                {hasChildren && isOpen && (
                  <ol className="mb-1 ml-3 border-l border-slate-200">
                    {s.children!.map((c) => {
                      const isActive = active === c.id;
                      return (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => jump(c.id)}
                            className={cn(
                              "flex w-full items-center gap-2 py-1 pl-3 pr-1 text-left transition-colors",
                              isActive ? "text-slate-900" : "text-slate-500 hover:text-slate-800",
                            )}
                          >
                            <span
                              className="size-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: c.color }}
                            />
                            <span
                              className={cn(
                                "flex-1 truncate text-xs leading-tight",
                                isActive && "font-medium",
                              )}
                            >
                              {c.label}
                            </span>
                            <span className="font-mono text-[11px] tabular-nums text-slate-400">
                              {c.amount}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </aside>
  );
}
