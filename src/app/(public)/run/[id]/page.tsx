"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Shield, Mail, Monitor } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { NavBar } from "@/components/nav-bar";

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
      <>
        <NavBar />
        <main className="relative flex min-h-[calc(100vh-48px)] flex-col items-center justify-center overflow-hidden bg-[#0a1929] px-6 lg:min-h-[calc(100vh-56px)]">
          {/* Grid pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `linear-gradient(rgba(148,163,184,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.5) 1px, transparent 1px)`,
              backgroundSize: "48px 48px",
            }}
          />
          {/* Radial glow */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="size-[600px] rounded-full bg-red-500/[0.06] blur-[120px]" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 max-w-md text-center"
          >
            <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10">
              <AlertTriangle className="size-8 text-red-400" />
            </div>
            <h1 className="mt-6 text-2xl font-bold text-white">We couldn&apos;t process your audit</h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Something went wrong while analyzing your data. This usually means one or more of
              your CSV files had an unexpected format.
            </p>
            <div className="mt-8 space-y-3">
              <a
                href="/start"
                className="inline-flex h-10 items-center justify-center rounded-md bg-white px-6 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
              >
                Start a new audit
              </a>
              <p className="text-xs text-slate-500">
                If this keeps happening, email{" "}
                <a href="mailto:support@baslix.com" className="underline text-slate-400">
                  support@baslix.com
                </a>{" "}
                with your audit ID:{" "}
                <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs text-slate-300">{auditId}</code>
              </p>
            </div>
          </motion.div>
        </main>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <main className="relative flex min-h-[calc(100vh-48px)] flex-col items-center justify-center overflow-hidden bg-[#0a1929] px-6 lg:min-h-[calc(100vh-56px)]">
        {/* Grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(148,163,184,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.5) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
        {/* Radial glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="size-[600px] rounded-full bg-blue-500/[0.07] blur-[120px]" />
        </div>

        <div className="relative z-10 flex max-w-lg flex-col items-center text-center">
          {/* Step badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-400">
              Step 3 of 3
            </span>
          </motion.div>

          {/* Progress ring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="relative mt-8"
          >
            <svg
              width={RING_SIZE}
              height={RING_SIZE}
              className="-rotate-90"
            >
              <defs>
                <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              {/* Background track */}
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
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
              <span className="text-2xl font-bold text-white">{stageIndex + 1}</span>
              <span className="text-xs text-slate-500">of {STAGES.length}</span>
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-6 text-2xl font-bold text-white"
          >
            Analyzing your data
          </motion.h1>

          {/* Animated stage text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-4 h-6"
          >
            <AnimatePresence mode="wait">
              <motion.p
                key={stageIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="text-sm text-slate-400"
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
            className="mt-6 flex items-center gap-2"
          >
            {STAGES.map((_, i) => (
              <div
                key={i}
                className={`size-2 rounded-full transition-all duration-500 ${
                  i < stageIndex
                    ? "bg-blue-500"
                    : i === stageIndex
                      ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                      : "bg-white/[0.1]"
                }`}
                style={i === stageIndex ? { animation: "pulse-dot 2s ease-in-out infinite" } : undefined}
              />
            ))}
          </motion.div>

          {/* Elapsed timer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-6 font-mono text-xs text-slate-600"
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
                className="mt-6 max-w-sm text-sm text-slate-400"
              >
                This is taking longer than usual. We&apos;ll email you when it&apos;s ready — feel free
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
          className="absolute bottom-8 left-1/2 z-10 w-full max-w-2xl -translate-x-1/2 px-6"
        >
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03]">
            <div className="grid divide-y divide-white/[0.06] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {[
                { icon: Shield, title: "Your data stays private", text: "Raw files auto-deleted after 30 days" },
                { icon: Mail, title: "Results emailed to you", text: "PDF report delivered to your inbox" },
                { icon: Monitor, title: "Safe to close this tab", text: "We\u2019ll keep working in the background" },
              ].map((signal) => (
                <div key={signal.title} className="flex items-center gap-3 px-5 py-4">
                  <signal.icon className="size-4 shrink-0 text-slate-500" />
                  <div>
                    <span className="text-xs font-semibold text-slate-300">{signal.title}</span>
                    <span className="ml-1 text-xs text-slate-500">&mdash; {signal.text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Pulse-dot animation */}
        <style>{`
          @keyframes pulse-dot {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.4); }
          }
        `}</style>
      </main>
    </>
  );
}
