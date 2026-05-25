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
  const trustRef = useReveal();
  const ctaRef = useReveal();

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="h-12 border-b border-white/[0.06] bg-[#0f172a] lg:h-14">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
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
          </Link>
          <Link
            href="/start"
            className="rounded-md bg-white px-4 py-1.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero — dark navy */}
      <section className="relative overflow-hidden bg-[#0f172a]">
        {/* Radial glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="size-[600px] rounded-full bg-blue-500/[0.07] blur-[120px]" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-5 lg:gap-16 lg:py-24">
          {/* Left — 3/5 */}
          <div className="flex flex-col justify-center lg:col-span-3">
            <span className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-blue-400">
              Free forensic audit for FBA sellers
            </span>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.08] tracking-tight text-white lg:text-6xl">
              Find every dollar
              <br />
              <span className="text-[#a5b4fc]">Amazon owes you.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-400">
              Upload 4 reports from Seller Central. In minutes, get a forensic
              audit of 18 months of FBA activity: missed reimbursements,
              overcharges, and closing dispute windows.
            </p>
            <div className="mt-10 flex items-center gap-4">
              <Link
                href="/start"
                className="inline-flex items-center rounded-lg bg-white px-6 py-3 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100"
              >
                Start your free audit
                <ArrowRight className="ml-2 size-4" />
              </Link>
              <span className="text-sm text-slate-500">
                No signup required
              </span>
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

      {/* Results metrics — light */}
      <section className="bg-[#f8fafc] py-16 lg:py-24">
        <div className="mx-auto grid max-w-5xl gap-8 px-6 text-center sm:grid-cols-3">
          {[
            { value: "1–3%", label: "Average FBA leakage rate" },
            { value: "18 mo", label: "Of transaction data scanned" },
            { value: "< 8 min", label: "From upload to full report" },
          ].map((metric) => (
            <div key={metric.label}>
              <p className="text-6xl font-bold tracking-tight text-blue-500 lg:text-7xl">
                {metric.value}
              </p>
              <p className="mt-3 text-sm font-medium text-slate-600">
                {metric.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works — dark navy */}
      <section className="bg-[#0f172a] py-16 lg:py-24" ref={howRef}>
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-xs font-medium uppercase tracking-wide text-blue-400">
            How it works
          </p>
          <h2 className="mt-3 text-center text-3xl font-semibold tracking-tight text-white lg:text-4xl">
            Three steps. No friction.
          </h2>
          <div className="mt-14 grid gap-10 sm:grid-cols-3">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="reveal-item flex flex-col items-center text-center opacity-0 translate-y-4 transition-all duration-700"
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <span className="text-xs font-medium text-slate-500">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="mt-3 flex size-14 items-center justify-center rounded-xl border border-white/10 bg-white/10">
                  <step.icon className="size-6 text-white" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What we scan for — light */}
      <section className="py-16 lg:py-24" ref={scanRef}>
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-xs font-medium uppercase tracking-wide text-blue-500">
            Detection categories
          </p>
          <h2 className="mt-3 text-center text-3xl font-semibold tracking-tight text-slate-900 lg:text-4xl">
            What we <span className="text-blue-500">scan for</span>
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {auditCategories.map((c, i) => (
              <div
                key={c.label}
                className="reveal-item rounded-2xl bg-white p-6 shadow-lg opacity-0 translate-y-4 transition-all duration-700 hover:shadow-xl"
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <div className="flex size-12 items-center justify-center rounded-xl bg-blue-50">
                  <c.icon className="size-6 text-blue-500" />
                </div>
                <p className="mt-4 text-lg font-semibold text-slate-900">
                  {c.label}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {c.detail}
                </p>
                <p className="mt-3 text-xs font-medium text-blue-500">
                  {c.stat}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust signals — light continuation */}
      <section className="bg-[#f8fafc] py-16 lg:py-24" ref={trustRef}>
        <div className="mx-auto grid max-w-5xl gap-8 px-6 sm:grid-cols-3">
          {[
            {
              icon: Shield,
              title: "Your data stays private",
              text: "Raw files deleted after 30 days. Never shared. Never used for training.",
            },
            {
              icon: Clock,
              title: "Results in minutes",
              text: "Most audits complete in 3\u20138 minutes. We\u2019ll email you when it\u2019s ready.",
            },
            {
              icon: DollarSign,
              title: "Real numbers, not estimates",
              text: "Every dollar figure traces to a specific transaction in your data.",
            },
          ].map((signal, i) => (
            <div
              key={signal.title}
              className="reveal-item flex items-start gap-3.5 opacity-0 translate-y-4 transition-all duration-700"
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50">
                <signal.icon className="size-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900">{signal.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  {signal.text}
                </p>
              </div>
            </div>
          ))}
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
      `}</style>
    </div>
  );
}
