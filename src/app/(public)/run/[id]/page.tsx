"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

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
        <h1 className="text-2xl font-bold text-destructive">Something went wrong</h1>
        <p className="mt-4 text-muted-foreground">
          We ran into an issue processing your data. Please try uploading again or contact us.
        </p>
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
