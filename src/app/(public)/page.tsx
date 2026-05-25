"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef } from "react";
import {
  ArrowRight,
  Shield,
  Clock,
  DollarSign,
  Upload,
  Search,
  FileText,
  RotateCcw,
  Ruler,
  PackageX,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

const auditCategories = [
  {
    label: "Returns gap",
    detail:
      "Customers get refunded, but Amazon never reimburses you. We flag every case.",
    stat: "1–3% of FBA revenue is typically lost here",
    icon: RotateCcw,
  },
  {
    label: "Dimension overcharges",
    detail:
      "Amazon re-measures your products and charges higher fees. We catch the mismatches.",
    stat: "Affects ~10% of ASINs on average",
    icon: Ruler,
  },
  {
    label: "Lost inventory",
    detail:
      "Inventory goes missing in warehouses. Amazon owes you, but won't remind you.",
    stat: "Reimbursement window closes after 18 months",
    icon: PackageX,
  },
];

const steps = [
  {
    icon: Upload,
    title: "Upload your CSVs",
    description:
      "Export 4 standard reports from Seller Central and drop them in. Takes 2 minutes.",
  },
  {
    icon: Search,
    title: "We scan 18 months",
    description:
      "Our engine cross-references every transaction, fee, return, and reimbursement.",
  },
  {
    icon: FileText,
    title: "Get your report",
    description:
      "A detailed PDF with every dollar Amazon owes you, dispute-ready evidence included.",
  },
];

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    const children = el.querySelectorAll(".reveal-item");
    children.forEach((child) => observer.observe(child));

    return () => observer.disconnect();
  }, []);

  return ref;
}

export default function LandingPage() {
  const howRef = useReveal();
  const scanRef = useReveal();
  const ctaRef = useReveal();

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="h-12 border-b border-white/[0.06] bg-[#0f172a] lg:h-14">
        <div className="mx-auto flex h-full items-center justify-between px-8 lg:px-12">
          <a href="https://baslix.com" className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="Baslix"
              width={32}
              height={32}
              className="size-8"
            />
            <span className="text-xl font-bold tracking-tight text-white">
              baslix
            </span>
          </a>
          <Link
            href="/start"
            className="rounded-md bg-white px-4 py-1.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero — dark navy */}
      <section className="relative overflow-hidden bg-[#0a1929]">
        {/* Cube grid pattern */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(148,163,184,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.5) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
        {/* Radial glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="size-[600px] rounded-full bg-blue-500/[0.07] blur-[120px]" />
        </div>

        <div className="relative mx-auto grid min-h-[70vh] max-w-[82rem] gap-12 pb-20 pl-6 pr-2 pt-12 lg:grid-cols-5 lg:gap-16 lg:pb-28 lg:pl-8 lg:pr-0 lg:pt-16">
          {/* Left — 3/5 */}
          <div className="flex flex-col items-start justify-center lg:col-span-3">
            <span className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-blue-400">
              100% free &mdash; no strings attached
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
              <span className="whitespace-nowrap">Amazon owes you money.</span>
              <br />
              <span className="text-[#a5b4fc]">Let&apos;s prove it.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-400">
              Upload 4 Seller Central reports. In under 8 minutes, get a
              forensic audit showing every missed reimbursement, fee
              overcharge, and expiring dispute window &mdash; with evidence
              to file claims.
            </p>
            <div className="mt-10 flex items-center gap-5">
              <Link
                href="/start"
                className="inline-flex items-center justify-center rounded-lg bg-blue-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-400 hover:shadow-blue-400/30"
              >
                Start your free audit
                <ArrowRight className="ml-2 size-5" />
              </Link>
              {/* Arrow pointing left to CTA + no signup text */}
              <div className="ml-2 flex items-center gap-0">
                <svg width="52" height="28" viewBox="0 0 52 28" fill="none" className="text-slate-500">
                  {/* Curvy line from right to left */}
                  <path
                    d="M50 20C42 22 32 18 22 12C14 7 10 4 6 3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                  {/* Arrowhead */}
                  <path
                    d="M10 0L5 3.5L10 7"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
                <span className="text-sm italic text-slate-500">
                  No signup required
                </span>
              </div>
            </div>
          </div>

          {/* Right — 2/5 — stock image with floating badges */}
          <div className="relative flex items-center lg:col-span-2">
            <div className="overflow-hidden rounded-2xl ring-1 ring-white/10">
              <Image
                src="https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&q=80"
                alt="Warehouse fulfillment center with organized inventory shelves"
                width={800}
                height={600}
                className="h-auto w-full object-cover"
                priority
              />
            </div>

            {/* Floating badge — top-left */}
            <div className="absolute -left-4 top-4 flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3.5 py-2 backdrop-blur">
              <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/20">
                <DollarSign className="size-4 text-emerald-400" />
              </div>
              <span className="text-xs font-semibold text-white">
                Leakage found
              </span>
            </div>

            {/* Floating badge — top-right */}
            <div className="absolute -right-3 top-12 flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3.5 py-2 backdrop-blur">
              <div className="flex size-8 items-center justify-center rounded-full bg-blue-500/20">
                <ShieldCheck className="size-4 text-blue-400" />
              </div>
              <span className="text-xs font-semibold text-white">
                Dispute-ready
              </span>
            </div>

            {/* Floating badge — bottom-left */}
            <div className="absolute -left-6 bottom-16 flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3.5 py-2 backdrop-blur">
              <div className="flex size-8 items-center justify-center rounded-full bg-amber-500/20">
                <AlertTriangle className="size-4 text-amber-400" />
              </div>
              <span className="text-xs font-semibold text-white">
                Window closing
              </span>
            </div>

            {/* Floating badge — bottom-right */}
            <div className="absolute -right-2 bottom-6 flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3.5 py-2 backdrop-blur">
              <div className="flex size-8 items-center justify-center rounded-full bg-violet-500/20">
                <TrendingUp className="size-4 text-violet-400" />
              </div>
              <span className="text-xs font-semibold text-white">
                Recovery ready
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Results metrics + How it works — white bg with design elements */}
      <section className="relative overflow-hidden bg-white py-16 lg:py-24" ref={howRef}>
        {/* ── Background design elements (inspired by baslix SolutionSection) ── */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage: `linear-gradient(to right, #1E3A8A 1px, transparent 1px),
                                linear-gradient(to bottom, #1E3A8A 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
              maskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, black 0%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, black 0%, transparent 100%)',
            }}
          />

          {/* Isometric cube grid (desktop only) */}
          <div
            className="absolute inset-0 hidden lg:block"
            style={{
              maskImage: 'radial-gradient(ellipse 90% 85% at 50% 50%, black 0%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(ellipse 90% 85% at 50% 50%, black 0%, transparent 100%)',
            }}
          >
            <svg className="absolute inset-0 h-full w-full" style={{ minWidth: 1792, minHeight: 1920 }}>
              {Array.from({ length: 20 }, (_, row) =>
                Array.from({ length: 16 }, (_, col) => {
                  const xOff = row % 2 === 0 ? 0 : 56;
                  const x = col * 112 + xOff - 112;
                  const y = row * 96 - 128;
                  return (
                    <g key={`${row}-${col}`} transform={`translate(${x}, ${y})`}>
                      <path d="M56 0 L112 32 L112 96 L56 128 L0 96 L0 32 Z" fill="none" stroke="#0d2847" strokeWidth="0.8" strokeOpacity="0.10" />
                      <path d="M56 64 L56 128" fill="none" stroke="#0d2847" strokeWidth="0.8" strokeOpacity="0.10" />
                      <path d="M56 64 L0 32" fill="none" stroke="#0d2847" strokeWidth="0.8" strokeOpacity="0.10" />
                      <path d="M56 64 L112 32" fill="none" stroke="#0d2847" strokeWidth="0.8" strokeOpacity="0.10" />
                    </g>
                  );
                })
              )}
            </svg>
            {/* Animated sweep layers */}
            <div className="cube-sweep absolute inset-0" />
            <div className="cube-sweep2 absolute inset-0" />
          </div>

          {/* Central ambient glow */}
          <div
            className="absolute left-1/2 top-[35%] h-[700px] w-[1000px] -translate-x-1/2 rounded-full blur-[120px]"
            style={{ background: 'radial-gradient(ellipse, hsl(215 50% 94%) 0%, hsl(220 30% 97%) 50%, transparent 75%)' }}
          />

          {/* Flowing curves — left */}
          <svg className="absolute -left-[10%] top-[15%] h-[800px] w-[600px] opacity-[0.04]" viewBox="0 0 600 800" fill="none">
            <path d="M500 0C500 0 600 200 450 350C300 500 400 650 300 800" stroke="url(#curveL)" strokeWidth="1.5" />
            <path d="M550 0C550 0 650 250 500 400C350 550 450 700 350 850" stroke="url(#curveL)" strokeWidth="1" opacity="0.6" />
            <defs>
              <linearGradient id="curveL" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1E3A8A" stopOpacity="0" />
                <stop offset="30%" stopColor="#1E3A8A" stopOpacity="1" />
                <stop offset="70%" stopColor="#1E3A8A" stopOpacity="1" />
                <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          {/* Flowing curves — right */}
          <svg className="absolute -right-[8%] top-[20%] h-[700px] w-[500px] opacity-[0.035]" viewBox="0 0 500 700" fill="none">
            <path d="M0 0C0 0 -100 180 50 300C200 420 100 550 200 700" stroke="url(#curveR)" strokeWidth="1.5" />
            <path d="M-50 50C-50 50 -150 220 0 350C150 480 50 600 150 750" stroke="url(#curveR)" strokeWidth="1" opacity="0.5" />
            <defs>
              <linearGradient id="curveR" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1E3A8A" stopOpacity="0" />
                <stop offset="25%" stopColor="#1E3A8A" stopOpacity="1" />
                <stop offset="75%" stopColor="#1E3A8A" stopOpacity="1" />
                <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          {/* Dot accent pattern — top */}
          <div
            className="absolute left-1/2 top-[6%] h-[100px] w-[400px] -translate-x-1/2 opacity-[0.06]"
            style={{
              backgroundImage: 'radial-gradient(circle, #1E3A8A 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)',
              WebkitMaskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)',
            }}
          />

          {/* Soft corner glows */}
          <div
            className="absolute left-[8%] top-[12%] h-[250px] w-[250px] rounded-full opacity-40 blur-[80px]"
            style={{ background: 'radial-gradient(circle, hsl(220 45% 93%) 0%, transparent 70%)' }}
          />
          <div
            className="absolute bottom-[15%] right-[10%] h-[200px] w-[200px] rounded-full opacity-35 blur-[70px]"
            style={{ background: 'radial-gradient(circle, hsl(210 40% 94%) 0%, transparent 70%)' }}
          />
        </div>

        {/* ── Content ── */}
        <div className="relative">
          {/* Metrics */}
          <div className="mx-auto grid max-w-5xl gap-8 px-6 text-center sm:grid-cols-3">
            {[
              { value: "1–3%", label: "Average FBA leakage rate" },
              { value: "18 mo", label: "Of transaction data scanned" },
              { value: "< 8 min", label: "From upload to full report" },
            ].map((metric) => (
              <div key={metric.label}>
                <p className="text-6xl font-bold tracking-tight text-[#1E3A8A] lg:text-7xl">
                  {metric.value}
                </p>
                <p className="mt-3 text-sm font-medium text-slate-500">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="mx-auto my-16 max-w-xs lg:my-20">
            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
          </div>

          {/* How it works */}
          <div className="mx-auto max-w-5xl px-6">
            <p className="text-center text-xs font-medium uppercase tracking-wide text-[#1E3A8A]">
              How it works
            </p>
            <h2 className="mt-3 text-center text-3xl font-semibold tracking-tight text-slate-900 lg:text-4xl">
              Three steps. <span className="text-[#1E3A8A]">No friction.</span>
            </h2>
            <div className="mt-14 grid gap-10 sm:grid-cols-3">
              {steps.map((step, i) => (
                <div
                  key={step.title}
                  className="reveal-item flex flex-col items-center text-center opacity-0 translate-y-4 transition-all duration-700"
                  style={{ transitionDelay: `${i * 150}ms` }}
                >
                  <span className="text-xs font-medium text-slate-400">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="mt-3 flex size-14 items-center justify-center rounded-xl border border-[#1E3A8A]/10 bg-[#1E3A8A]/5">
                    <step.icon className="size-6 text-[#1E3A8A]" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* What we scan for + Trust signals — dark navy with cube grid */}
      <section className="relative overflow-hidden py-16 lg:py-28" style={{ backgroundColor: '#0f172a' }} ref={scanRef}>
        {/* ── Background: cube grid + sweeps + glows ── */}
        <div className="pointer-events-none absolute inset-0">
          {/* Isometric cube grid (desktop) */}
          <div
            className="absolute inset-0 hidden lg:block"
            style={{
              maskImage: 'radial-gradient(ellipse 90% 80% at 50% 50%, black 0%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(ellipse 90% 80% at 50% 50%, black 0%, transparent 100%)',
            }}
          >
            <svg className="absolute inset-0 h-full w-full" style={{ minWidth: 1792, minHeight: 1344 }}>
              {Array.from({ length: 14 }, (_, row) =>
                Array.from({ length: 16 }, (_, col) => {
                  const xOff = row % 2 === 0 ? 0 : 56;
                  const x = col * 112 + xOff - 112;
                  const y = row * 96 - 128;
                  return (
                    <g key={`${row}-${col}`} transform={`translate(${x}, ${y})`}>
                      <path d="M56 0 L112 32 L112 96 L56 128 L0 96 L0 32 Z" fill="none" stroke="#0d2847" strokeWidth="0.8" strokeOpacity="0.15" />
                      <path d="M56 64 L56 128" fill="none" stroke="#0d2847" strokeWidth="0.8" strokeOpacity="0.15" />
                      <path d="M56 64 L0 32" fill="none" stroke="#0d2847" strokeWidth="0.8" strokeOpacity="0.15" />
                      <path d="M56 64 L112 32" fill="none" stroke="#0d2847" strokeWidth="0.8" strokeOpacity="0.15" />
                    </g>
                  );
                })
              )}
            </svg>
            <div className="scan-sweep absolute inset-0" />
            <div className="scan-sweep2 absolute inset-0" />
          </div>

          {/* Gradient overlays for depth */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a] via-transparent to-[#0f172a] opacity-50" />

          {/* Ambient glow */}
          <div
            className="absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 rounded-full opacity-15 blur-[120px]"
            style={{ background: 'radial-gradient(ellipse, #1e40af 0%, transparent 70%)' }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          {/* Section header */}
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <div className="h-px w-8 bg-gradient-to-r from-transparent to-blue-500/50" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
                Detection Categories
              </span>
              <div className="h-px w-8 bg-gradient-to-l from-transparent to-blue-500/50" />
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-white lg:text-4xl">
              What we <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">scan for</span>
            </h2>
            <p className="mt-4 text-sm text-slate-400 lg:text-base">
              Every detection rule runs independently. A failing rule never blocks the rest of your report.
            </p>
          </div>

          {/* Detection cards — individual cards */}
          <div className="mx-auto mt-12 grid max-w-5xl gap-5 sm:grid-cols-3">
            {auditCategories.map((c, i) => (
              <div
                key={c.label}
                className="reveal-item group relative overflow-hidden rounded-2xl border border-white/[0.08] opacity-0 translate-y-4 transition-all duration-700 hover:border-blue-500/30"
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                {/* Card bg */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a5f] via-[#0f2744] to-[#0a1929]" />
                {/* Noise texture */}
                <div
                  className="absolute inset-0 opacity-[0.12]"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                  }}
                />
                {/* Accent glow on hover */}
                <div className="absolute -right-16 -top-16 size-48 rounded-full bg-blue-500/0 blur-3xl transition-all duration-500 group-hover:bg-blue-500/10" />
                {/* Top accent line */}
                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400/20 to-transparent transition-opacity duration-500 group-hover:via-blue-400/40" />

                <div className="relative flex flex-col p-6 lg:p-7">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/20">
                    <c.icon className="size-5 text-blue-400" strokeWidth={1.5} />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-white">
                    {c.label}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">
                    {c.detail}
                  </p>
                  {/* Stat bar */}
                  <div className="mt-5 border-t border-white/[0.06] pt-4">
                    <p className="text-xs font-medium text-blue-400">
                      {c.stat}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Trust signals — compact strip below */}
          <div className="mx-auto mt-10 max-w-5xl rounded-xl border border-white/[0.06] bg-white/[0.03]">
            <div className="grid divide-y divide-white/[0.06] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {[
                {
                  icon: Shield,
                  title: "Your data stays private",
                  text: "Raw files deleted after 30 days. Never shared.",
                },
                {
                  icon: Clock,
                  title: "Results in minutes",
                  text: "Most audits complete in 3\u20138 minutes.",
                },
                {
                  icon: DollarSign,
                  title: "Real numbers, not estimates",
                  text: "Every figure traces to your data.",
                },
              ].map((signal) => (
                <div
                  key={signal.title}
                  className="flex items-center gap-3 px-5 py-4"
                >
                  <signal.icon className="size-4 shrink-0 text-slate-500" />
                  <div>
                    <span className="text-xs font-semibold text-slate-300">{signal.title}</span>
                    <span className="ml-1 text-xs text-slate-500">&mdash; {signal.text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA section — dark navy card */}
      <section className="bg-[#f8fafc] px-6 py-16 lg:py-24" ref={ctaRef}>
        <div className="reveal-item relative mx-auto max-w-4xl overflow-hidden rounded-[2rem_0_2rem_0] bg-[#0f172a] px-8 py-16 text-center opacity-0 translate-y-4 transition-all duration-700 lg:px-16 lg:py-20">
          {/* Plus/cross pattern SVG background */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.04]">
            <svg width="100%" height="100%">
              <defs>
                <pattern
                  id="crosses"
                  x="0"
                  y="0"
                  width="40"
                  height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M20 16v8M16 20h8"
                    stroke="white"
                    strokeWidth="1.5"
                    fill="none"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#crosses)" />
            </svg>
          </div>

          <div className="relative">
            <h2 className="text-3xl font-semibold tracking-tight text-white lg:text-4xl">
              Stop leaving money on the table.
            </h2>
            <p className="mx-auto mt-4 max-w-xl leading-relaxed text-slate-300">
              We&apos;re{" "}
              <span className="font-semibold text-white">Baslix</span>. We
              recover money from Amazon for ecommerce brands as a managed
              service — and only get paid when you do. The audit is free because
              if you find $200k of leakage, you&apos;ll probably want help
              filing the claims.
            </p>
            <Link
              href="/start"
              className="mt-8 inline-flex items-center rounded-full bg-blue-500 px-7 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-400"
            >
              Start your free audit
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer — deeper navy */}
      <footer className="relative bg-[#0a1929]">
        {/* Gradient accent line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
        <div className="border-t border-white/5">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2">
                <Image
                  src="/logo.png"
                  alt="Baslix"
                  width={20}
                  height={20}
                  className="size-5"
                />
                <span className="text-sm font-semibold text-white">
                  baslix
                </span>
              </Link>
              <div className="flex gap-6 text-sm">
                <Link
                  href="/privacy"
                  className="text-slate-400 transition-colors hover:text-white"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/terms"
                  className="text-slate-400 transition-colors hover:text-white"
                >
                  Terms of Service
                </Link>
              </div>
            </div>
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} Baslix
            </p>
          </div>
        </div>
      </footer>

      {/* Reveal animation styles */}
      <style jsx global>{`
        .reveal-item.revealed {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
        .cube-sweep {
          background: linear-gradient(135deg, transparent 0%, transparent 40%, rgba(30,58,138,0.05) 50%, transparent 60%, transparent 100%);
          background-size: 300% 300%;
          animation: cubeSweep 8s ease-in-out infinite;
        }
        .cube-sweep2 {
          background: linear-gradient(315deg, transparent 0%, transparent 40%, rgba(30,58,138,0.035) 50%, transparent 60%, transparent 100%);
          background-size: 300% 300%;
          animation: cubeSweep 8s ease-in-out infinite 4s;
        }
        @keyframes cubeSweep {
          0%, 100% { background-position: 0% 0%; }
          50% { background-position: 100% 100%; }
        }
        .scan-sweep {
          background: linear-gradient(135deg, transparent 0%, transparent 40%, rgba(59,130,246,0.07) 50%, transparent 60%, transparent 100%);
          background-size: 300% 300%;
          animation: cubeSweep 8s ease-in-out infinite;
        }
        .scan-sweep2 {
          background: linear-gradient(315deg, transparent 0%, transparent 40%, rgba(96,165,250,0.05) 50%, transparent 60%, transparent 100%);
          background-size: 300% 300%;
          animation: cubeSweep 8s ease-in-out infinite 4s;
        }
      `}</style>
    </div>
  );
}
