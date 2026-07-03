"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Shield, Mail, Monitor } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { NavBar } from "@/components/nav-bar";
import { Badge } from "@/components/ui/badge";

const STAGES = [
  "Parsing your reimbursement records...",
  "Cross-referencing customer returns...",
  "Checking inventory adjustment events...",
  "Calculating dispute windows...",
  "Generating evidence packets for top cases...",
  "Drafting your report...",
];

const RING_SIZE = 140;
const RING_STROKE = 6;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

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

  const progress = (stageIndex + 1) / STAGES.length;
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);

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

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Decorative background elements */}
      <div className="pointer-events-none absolute -left-32 top-20 size-80 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-20 size-72 rounded-full bg-emerald-500/5 blur-3xl" />
      <div className="pointer-events-none absolute right-1/3 top-1/4 size-64 rounded-full bg-violet-500/5 blur-3xl" />

      <NavBar />

      <main className="relative mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center text-center">
          {/* Step badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="secondary">Step 3 of 3</Badge>
          </motion.div>

          {/* Progress ring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="relative mt-8"
          >
            {/* Slow spinning glow behind ring */}
            <div className="absolute inset-0 animate-spin-slow rounded-full blur-xl">
              <div className="size-full rounded-full bg-gradient-to-tr from-primary/20 via-transparent to-cyan-500/20" />
            </div>

            <svg
              width={RING_SIZE}
              height={RING_SIZE}
              className="relative -rotate-90"
            >
              <defs>
                <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              {/* Background track */}
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth={RING_STROKE}
              />
              {/* Progress arc */}
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke="url(#ring-gradient)"
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: "stroke-dashoffset 0.8s ease-in-out" }}
              />
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{stageIndex + 1}</span>
              <span className="text-xs text-muted-foreground">of {STAGES.length}</span>
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-6 text-2xl font-bold tracking-tight"
          >
            Analyzing your data
          </motion.h1>

          {/* Animated stage text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-3 h-6"
          >
            <AnimatePresence mode="wait">
              <motion.p
                key={stageIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="text-sm text-muted-foreground"
              >
                {STAGES[stageIndex]}
              </motion.p>
            </AnimatePresence>
          </motion.div>

          {/* Timeline dots */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-6 flex items-center gap-2.5"
          >
            {STAGES.map((_, i) => (
              <div
                key={i}
                className={`size-2 rounded-full transition-all duration-500 ${
                  i < stageIndex
                    ? "bg-primary"
                    : i === stageIndex
                      ? "bg-primary animate-pulse-dot shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
                      : "bg-border"
                }`}
              />
            ))}
          </motion.div>

          {/* Elapsed timer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-5 font-mono text-xs text-muted-foreground/60"
          >
            {formatTime(elapsed)}
          </motion.p>

          {/* Long-wait message */}
          <AnimatePresence>
            {elapsed > 600 && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-6 max-w-sm text-sm text-muted-foreground"
              >
                This is taking longer than usual. We&apos;ll email you when it&apos;s ready, feel free
                to close this tab.
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Trust strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-12 w-full max-w-xl"
        >
          <div className="rounded-xl border border-border/60 bg-white/70 shadow-sm">
            <div className="grid divide-y divide-border/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {[
                { icon: Shield, title: "Data stays private", text: "Auto-deleted after 30 days" },
                { icon: Mail, title: "Results emailed", text: "PDF delivered to your inbox" },
                { icon: Monitor, title: "Safe to close tab", text: "We keep working in background" },
              ].map((signal) => (
                <div key={signal.title} className="flex items-center gap-3 px-4 py-3">
                  <signal.icon className="size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <span className="text-xs font-semibold">{signal.title}</span>
                    <span className="ml-1 text-xs text-muted-foreground">: {signal.text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </main>

      {/* Animations */}
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 6s linear infinite;
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.5); }
        }
        .animate-pulse-dot {
          animation: pulse-dot 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
