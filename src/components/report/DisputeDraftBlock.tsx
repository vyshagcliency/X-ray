"use client";

import { useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import { CopyButton } from "@/components/ui/copy-button";

/**
 * Surfaces the copy-ready dispute draft that the pipeline already computes for each
 * finding (P2.3) — previously only in the PDF. Collapsed by default so the dossier
 * stays scannable; expands to the exact message a Controller can paste into a case.
 */
export function DisputeDraftBlock({
  subject,
  body,
  caption,
}: {
  subject: string;
  body: string;
  caption?: string;
}) {
  const [open, setOpen] = useState(false);
  const fullText = `Subject: ${subject}\n\n${body}`;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100/60"
      >
        <FileText className="size-4 stroke-[1.5] text-slate-500" />
        <span>Copy-ready dispute draft</span>
        {caption && (
          <span className="truncate text-xs font-normal text-muted-foreground">
            · {caption}
          </span>
        )}
        <ChevronDown
          className={`ml-auto size-4 stroke-[1.5] text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="border-t border-slate-200 p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-slate-800">{subject}</p>
            <CopyButton text={fullText} label="Copy draft" className="shrink-0" />
          </div>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-600">
            {body}
          </pre>
          <p className="mt-3 text-[11px] text-muted-foreground">
            A starter message, not a finished filing — replace{" "}
            <span className="font-mono">[SELLER_SIGNATURE]</span> and attach the CSV or PDF
            export. A draft for every finding is in the CSV export.
          </p>
        </div>
      )}
    </div>
  );
}
