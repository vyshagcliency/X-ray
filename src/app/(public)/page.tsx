"use client";

import Link from "next/link";
import {
  ArrowRight,
  Shield,
  Clock,
  DollarSign,
  Upload,
  Search,
  FileText,
} from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const sampleFindings = [
  {
    amount: "$14,331",
    label: "Unreimbursed customer returns",
    detail: "47 returns marked damaged but never reimbursed",
  },
  {
    amount: "$8,902",
    label: "Dimension overcharges",
    detail: "23 ASINs measured larger than actual — you're overpaying per unit",
  },
  {
    amount: "$4,210",
    label: "Lost inventory never claimed",
    detail: "Inventory Amazon lost in warehouses — reimbursement window still open",
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

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Baslix
          </Link>
          <Button variant="outline" size="sm" asChild>
            <Link href="/start">Start Free Audit</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-5 lg:gap-16 lg:py-28">
          {/* Left — 3/5 */}
          <div className="flex flex-col justify-center lg:col-span-3">
            <Badge variant="secondary" className="w-fit">
              Free forensic audit for FBA sellers
            </Badge>
            <h1 className="mt-6 text-5xl font-bold tracking-tight lg:text-6xl">
              Find every dollar
              <br />
              Amazon owes you.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Upload 4 reports from Seller Central. In minutes, get a forensic
              audit of 18 months of FBA activity — every missed reimbursement,
              every overcharge, every closing dispute window.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <Button asChild size="lg">
                <Link href="/start">
                  Start your free audit
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <span className="text-sm text-muted-foreground">
                No signup required
              </span>
            </div>
          </div>

          {/* Right — 2/5 — animated finding cards */}
          <div className="flex flex-col gap-4 lg:col-span-2">
            {sampleFindings.map((f, i) => (
              <motion.div
                key={f.amount}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.15, duration: 0.5 }}
              >
                <Card className="overflow-hidden border-l-4 border-l-emerald-500">
                  <CardContent className="py-4">
                    <p className="text-2xl font-bold">{f.amount}</p>
                    <p className="mt-1 text-sm font-medium">{f.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {f.detail}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            How it works
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.title} className="text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <span className="text-lg font-bold">{i + 1}</span>
                </div>
                <step.icon className="mx-auto mt-4 size-8 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample findings */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Real findings from real audits (anonymized)
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {sampleFindings.map((f) => (
              <Card
                key={f.amount}
                className="overflow-hidden border-l-4 border-l-emerald-500"
              >
                <CardContent className="py-6">
                  <p className="text-3xl font-bold">{f.amount}</p>
                  <p className="mt-2 text-sm font-medium">{f.label}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {f.detail}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust signals */}
      <section className="bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-16 sm:flex-row sm:justify-between">
          {[
            {
              icon: Shield,
              title: "Your data stays private",
              text: "Raw files deleted after 30 days. Never shared. Never used for training.",
            },
            {
              icon: Clock,
              title: "Results in minutes",
              text: "Most audits complete in 3–8 minutes. We'll email you when it's ready.",
            },
            {
              icon: DollarSign,
              title: "Real numbers, not estimates",
              text: "Every dollar figure traces to a specific transaction in your data.",
            },
          ].map((signal) => (
            <div key={signal.title} className="flex items-start gap-4">
              <signal.icon className="mt-0.5 size-6 shrink-0 text-muted-foreground" />
              <div>
                <h3 className="font-medium">{signal.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {signal.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA section */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Stop leaving money on the table.
          </h2>
          <p className="mt-4 text-primary-foreground/80">
            We&apos;re{" "}
            <span className="font-semibold text-primary-foreground">
              Baslix
            </span>
            . We recover money from Amazon for ecommerce brands as a managed
            service — and only get paid when you do. The audit is free because if
            you find $200k of leakage, you&apos;ll probably want help filing the
            claims.
          </p>
          <Button
            variant="secondary"
            size="lg"
            asChild
            className="mt-8"
          >
            <Link href="/start">
              Start your free audit
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-8">
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:underline">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:underline">
              Terms of Service
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Baslix
          </p>
        </div>
      </footer>
    </div>
  );
}
