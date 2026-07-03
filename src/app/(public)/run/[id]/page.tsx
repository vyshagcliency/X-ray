"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, Shield, Mail, Monitor } from "lucide-react";
import { motion } from "motion/react";
import { NavBar } from "@/components/nav-bar";

// The forensic passes the audit runs, in order. Labels describe the real
// payout-integrity work the pipeline does (settlement → fees → credits → evidence).
const STAGES = [
  "Reading your settlement and fee reports",
  "Recomputing referral fees on every sale",
  "Re-checking size-tier fulfillment fees",
  "Reconciling return credits and reimbursements",
  "Flagging aged-stock surcharges",
  "Compiling evidence and drafting disputes",
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
      <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="pointer-events-none absolute -left-32 top-20 size-80 rounded-full bg-destructive/5 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-20 size-72 rounded-full bg-orange-500/5 blur-3xl" />

        <NavBar />

        <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="size-8 text-destructive" />
            </div>
            <h1 className="mt-6 text-2xl font-bold tracking-tight">We couldn&apos;t process your audit</h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Something went wrong while analyzing your data. This usually means one or more of
              your CSV files had an unexpected format.
            </p>
            <div className="mt-8 space-y-3">
              <a
                href="/start"
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
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
          </motion.div>
        </main>
      </div>
    );
  }

  const activeLabel = STAGES[stageIndex];
  // Progress never reaches 100% while waiting — the redirect happens on completion,
  // so the bar leaves headroom rather than sitting "done" for minutes.
  const pct = Math.round(((stageIndex + 1) / (STAGES.length + 1)) * 100);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Ambient wash — calm, single accent */}
      <div className="pointer-events-none absolute -left-40 top-24 size-96 rounded-full bg-blue-500/5 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-24 size-80 rounded-full bg-emerald-500/5 blur-3xl" />

      <NavBar />

      <main className="relative flex flex-1 items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-xl"
        >
          {/* Header */}
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
              Leakage X-Ray
            </p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Auditing your settlement data
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
              We&apos;re recomputing every fee Amazon charged and matching it against what they
              should have, line by line.
            </p>
          </div>

          {/* Forensic passes */}
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white/80 p-2 shadow-sm backdrop-blur-sm sm:p-2.5">
            <ol aria-live="polite" className="space-y-0.5">
              {STAGES.map((label, i) => {
                const done = i < stageIndex;
                const active = i === stageIndex;
                return (
                  <li
                    key={label}
                    className={`relative flex items-center gap-3.5 overflow-hidden rounded-xl px-3.5 py-3 transition-colors ${
                      active ? "bg-blue-50/70" : ""
                    }`}
                  >
                    {active && <span aria-hidden className="xr-scan" />}

                    {/* Status glyph */}
                    <span className="relative z-10 flex size-6 shrink-0 items-center justify-center">
                      {done ? (
                        <span className="flex size-6 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-emerald-200">
                          <Check className="size-3.5 text-emerald-600" strokeWidth={2.5} />
                        </span>
                      ) : active ? (
                        <span className="flex size-6 items-center justify-center rounded-full bg-blue-100 ring-1 ring-blue-200">
                          <span className="xr-pulse size-2 rounded-full bg-blue-600" />
                        </span>
                      ) : (
                        <span className="flex size-6 items-center justify-center rounded-full ring-1 ring-slate-200">
                          <span className="size-1.5 rounded-full bg-slate-300" />
                        </span>
                      )}
                    </span>

                    {/* Label */}
                    <span
                      className={`relative z-10 text-sm ${
                        active
                          ? "font-medium text-slate-900"
                          : done
                            ? "text-slate-500"
                            : "text-slate-400"
                      }`}
                    >
                      {label}
                    </span>

                    {active && (
                      <span className="relative z-10 ml-auto text-[11px] font-medium uppercase tracking-wider text-blue-600">
                        Scanning
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Progress + elapsed */}
          <div className="mt-6">
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-[width] duration-700 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>
                Step {stageIndex + 1} of {STAGES.length}
              </span>
              <span className="font-mono tabular-nums">{formatTime(elapsed)}</span>
            </div>
            <span className="sr-only">{activeLabel}</span>
          </div>

          {/* Long-wait reassurance */}
          {elapsed > 600 && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 text-center text-sm text-slate-500"
            >
              This is taking longer than usual. We&apos;ll email you when it&apos;s ready, so
              feel free to close this tab.
            </motion.p>
          )}

          {/* Trust strip */}
          <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white/70 shadow-sm backdrop-blur-sm">
            <div className="grid divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {[
                { icon: Shield, title: "Private", text: "Raw files auto-deleted at 30 days" },
                { icon: Mail, title: "Emailed", text: "We send the report to your inbox" },
                { icon: Monitor, title: "Safe to leave", text: "We keep working in the background" },
              ].map((signal) => (
                <div key={signal.title} className="flex items-center gap-3 px-4 py-3.5">
                  <signal.icon className="size-4 shrink-0 text-slate-400" strokeWidth={1.5} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700">{signal.title}</p>
                    <p className="text-xs text-slate-500">{signal.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </main>

      {/* Signature scan beam + calm pulse. Motion disabled for reduced-motion users. */}
      <style>{`
        .xr-scan {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(37, 99, 235, 0.09) 50%,
            transparent 100%
          );
          transform: translateX(-100%);
          animation: xr-scan 2.6s ease-in-out infinite;
        }
        @keyframes xr-scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes xr-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.65); }
        }
        .xr-pulse { animation: xr-pulse 1.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .xr-scan { animation: none; opacity: 0; }
          .xr-pulse { animation: none; }
        }
      `}</style>
    </div>
  );
}
