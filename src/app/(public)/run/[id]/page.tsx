"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";

const STAGES = [
  "Parsing your reimbursement records...",
  "Cross-referencing customer returns...",
  "Checking inventory adjustment events...",
  "Calculating dispute windows...",
  "Generating evidence packets for top cases...",
  "Drafting your report...",
];

export default function ProcessingPage({ params }: { params: Promise<{ id: string }> }) {
  const [stageIndex, setStageIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("processing");

  useEffect(() => {
    params.then((p) => setAuditId(p.id));
  }, [params]);

  // Simulate stage progression (will be replaced with useRealtimeRun)
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);

    const stageTimer = setInterval(() => {
      setStageIndex((i) => (i < STAGES.length - 1 ? i + 1 : i));
    }, 15000);

    return () => {
      clearInterval(timer);
      clearInterval(stageTimer);
    };
  }, []);

  // Poll for completion
  useEffect(() => {
    if (!auditId) return;

    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/audit/status?id=${auditId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "completed" || data.status === "pending_review") {
            setStatus(data.status);
            clearInterval(poll);
            window.location.href = `/r/${auditId}`;
          } else if (data.status === "failed") {
            setStatus("failed");
            clearInterval(poll);
          }
        }
      } catch {
        // Continue polling
      }
    }, 5000);

    return () => clearInterval(poll);
  }, [auditId]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  if (status === "failed") {
    return (
      <main className="mx-auto max-w-md px-6 py-32 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="size-8 text-destructive" />
        </div>
        <h1 className="mt-6 text-2xl font-bold">We couldn&apos;t process your audit</h1>
        <p className="mt-4 text-muted-foreground">
          Something went wrong while analyzing your data. This usually means one or more of
          your CSV files had an unexpected format.
        </p>
        <div className="mt-8 space-y-3">
          <a
            href="/start"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Start a new audit
          </a>
          <p className="text-xs text-muted-foreground">
            If this keeps happening, email{" "}
            <a href="mailto:support@baslix.com" className="underline">
              support@baslix.com
            </a>{" "}
            with your audit ID:{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{auditId}</code>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-32 text-center">
      <Loader2 className="mx-auto size-12 animate-spin text-primary" />
      <h1 className="mt-6 text-2xl font-bold">Analyzing your data</h1>
      <p className="mt-4 text-muted-foreground">{STAGES[stageIndex]}</p>
      <p className="mt-4 font-mono text-sm text-muted-foreground">{formatTime(elapsed)}</p>

      {elapsed > 600 && (
        <p className="mt-8 text-sm text-muted-foreground">
          This is taking longer than usual. We&apos;ll email you when it&apos;s ready — feel free
          to close this tab.
        </p>
      )}
    </main>
  );
}
