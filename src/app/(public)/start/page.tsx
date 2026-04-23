"use client";

import { useActionState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Shield,
  Clock,
  FileText,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { startAudit } from "./actions";

const steps = [
  "Enter your details",
  "Upload 4 CSVs",
  "Get your report",
];

export default function StartPage() {
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      return await startAudit(formData);
    },
    null,
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Decorative background elements */}
      <div className="pointer-events-none absolute -left-32 top-20 size-80 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-20 size-72 rounded-full bg-emerald-500/5 blur-3xl" />
      <div className="pointer-events-none absolute right-1/3 top-1/4 size-64 rounded-full bg-violet-500/5 blur-3xl" />

      {/* Nav */}
      <nav className="relative border-b bg-white/80 backdrop-blur-sm">
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
        </div>
      </nav>

      {/* Progress steps */}
      <div className="relative mx-auto max-w-5xl px-6 pt-10">
        <div className="flex items-center justify-center gap-3">
          {steps.map((step, i) => (
            <div key={step} className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div
                  className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${
                    i === 0
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </div>
                <span
                  className={`text-sm ${
                    i === 0 ? "font-medium" : "text-muted-foreground"
                  }`}
                >
                  {step}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className="h-px w-8 bg-border" />
              )}
            </div>
          ))}
        </div>
      </div>

      <main className="relative mx-auto grid max-w-5xl gap-12 px-6 py-12 lg:grid-cols-2 lg:gap-20 lg:py-16">
        {/* Left — context */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col justify-center"
        >
          <Badge variant="secondary" className="w-fit">
            Step 1 of 3
          </Badge>
          <h1 className="mt-4 text-3xl font-bold tracking-tight lg:text-4xl">
            Start your free audit
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Enter your details and we&apos;ll get your forensic report started.
            You&apos;ll upload your Seller Central CSVs on the next step.
          </p>

          <div className="mt-10 space-y-5">
            <div className="flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Ready in 3-8 minutes</p>
                <p className="text-sm text-muted-foreground">
                  We&apos;ll email you when your report is done.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Detailed PDF report</p>
                <p className="text-sm text-muted-foreground">
                  Every finding with dispute-ready evidence and deadlines.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Your data stays private</p>
                <p className="text-sm text-muted-foreground">
                  Raw files auto-deleted after 30 days. Never shared.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom callout */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="mt-10 flex items-center gap-3 rounded-xl border bg-white/60 p-4"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <Zap className="size-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium">100% free, no credit card</p>
              <p className="text-xs text-muted-foreground">
                The audit is on us. If you want help recovering, that&apos;s
                where we come in.
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* Right — form card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="flex items-center"
        >
          <Card className="w-full shadow-lg ring-1 ring-black/5">
            <CardContent className="p-8">
              <div className="mb-6 flex items-center gap-2">
                <CheckCircle2 className="size-5 text-emerald-500" />
                <p className="text-sm font-medium">
                  No signup or login required
                </p>
              </div>

              <form action={formAction} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Work email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@company.com"
                    required
                    autoComplete="email"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brandName">Brand / company name</Label>
                  <Input
                    id="brandName"
                    name="brandName"
                    type="text"
                    placeholder="Your brand name"
                    required
                    className="h-11"
                  />
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="legalConsent"
                    name="legalConsent"
                    required
                    className="mt-1 size-4 rounded border-input"
                  />
                  <Label
                    htmlFor="legalConsent"
                    className="text-sm font-normal text-muted-foreground"
                  >
                    I have read-only rights to upload these reports for my
                    company.
                  </Label>
                </div>

                {state?.error && (
                  <p className="text-sm text-destructive">{state.error}</p>
                )}

                <Button
                  type="submit"
                  className="h-11 w-full"
                  disabled={isPending}
                >
                  {isPending ? (
                    "Creating audit..."
                  ) : (
                    <>
                      Continue to upload
                      <ArrowRight className="ml-2 size-4" />
                    </>
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                By continuing, you agree to our{" "}
                <Link href="/privacy" className="underline">
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <Link href="/terms" className="underline">
                  Terms of Service
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
