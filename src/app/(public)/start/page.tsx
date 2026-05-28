"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Shield,
  Clock,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { NavBar } from "@/components/nav-bar";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { startAudit } from "./actions";

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

      <NavBar />

      <main className="relative mx-auto max-w-3xl px-6 py-12 lg:py-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <Badge variant="secondary" className="mx-auto">
            Step 1 of 3
          </Badge>
          <h1 className="mt-4 text-3xl font-bold tracking-tight lg:text-4xl">
            Start your free audit
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-muted-foreground">
            Enter your details and we&apos;ll get your forensic report started.
            You&apos;ll upload your Seller Central CSVs on the next step.
          </p>
        </motion.div>

        {/* Form card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mt-10"
        >
          <Card className="mx-auto max-w-md shadow-lg ring-1 ring-black/5">
            <CardContent className="p-8">
              <div className="mb-6 flex items-center justify-center gap-2">
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

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="mt-12 grid gap-4 sm:grid-cols-3"
        >
          {[
            {
              icon: Clock,
              title: "Ready in 3–8 minutes",
              text: "We'll email you when your report is done.",
            },
            {
              icon: FileText,
              title: "Detailed PDF report",
              text: "Every finding with dispute-ready evidence and deadlines.",
            },
            {
              icon: Shield,
              title: "Your data stays private",
              text: "Raw files auto-deleted after 30 days. Never shared.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex flex-col items-center rounded-xl border bg-white/60 p-5 text-center"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <item.icon className="size-5 text-primary" />
              </div>
              <p className="mt-3 text-sm font-medium">{item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {item.text}
              </p>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
