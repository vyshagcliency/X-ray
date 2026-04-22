"use client";

import Link from "next/link";
import Image from "next/image";
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
    icon: RotateCcw,
  },
  {
    amount: "$8,902",
    label: "Dimension overcharges",
    detail: "23 ASINs measured larger than actual — you're overpaying per unit",
    icon: Ruler,
  },
  {
    amount: "$4,210",
    label: "Lost inventory never claimed",
    detail:
      "Inventory Amazon lost in warehouses — reimbursement window still open",
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

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="Baslix"
              width={32}
              height={32}
              className="size-8"
            />
            <span className="text-xl font-bold tracking-tight">Baslix</span>
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
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
              Upload 4 reports from Seller Central. In minutes, get a forensic
              audit of 18 months of FBA activity — every missed reimbursement,
              every overcharge, every closing dispute window.
            </p>
            <div className="mt-10 flex items-center gap-4">
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

          {/* Right — 2/5 — stock image */}
          <div className="flex items-center lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="overflow-hidden rounded-xl shadow-lg"
            >
              <Image
                src="https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&q=80"
                alt="Warehouse fulfillment center with organized inventory shelves"
                width={800}
                height={600}
                className="h-auto w-full object-cover"
                priority
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            How it works
          </h2>
          <div className="mt-14 grid gap-10 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.title} className="flex flex-col items-center text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                  <step.icon className="size-6" />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample findings */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Real findings from real audits (anonymized)
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {sampleFindings.map((f) => (
              <Card key={f.amount} className="shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="py-6">
                  <f.icon className="size-7 text-muted-foreground" />
                  <p className="mt-4 text-3xl font-bold tracking-tight">
                    {f.amount}
                  </p>
                  <p className="mt-2 text-sm font-medium">{f.label}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {f.detail}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust signals */}
      <section className="border-y bg-slate-50">
        <div className="mx-auto grid max-w-5xl gap-8 px-6 py-14 sm:grid-cols-3">
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
          ].map((signal) => (
            <div key={signal.title} className="flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <signal.icon className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">{signal.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
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
          <p className="mt-4 leading-relaxed text-primary-foreground/80">
            We&apos;re{" "}
            <span className="font-semibold text-primary-foreground">
              Baslix
            </span>
            . We recover money from Amazon for ecommerce brands as a managed
            service — and only get paid when you do. The audit is free because if
            you find $200k of leakage, you&apos;ll probably want help filing the
            claims.
          </p>
          <Button variant="secondary" size="lg" asChild className="mt-8">
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
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="Baslix"
                width={20}
                height={20}
                className="size-5"
              />
              <span className="text-sm font-semibold">Baslix</span>
            </Link>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:underline">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:underline">
                Terms of Service
              </Link>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Baslix
          </p>
        </div>
      </footer>
    </div>
  );
}
