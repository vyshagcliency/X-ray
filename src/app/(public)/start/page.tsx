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

          <div className="mt-10 space-y-4">
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
                text: "Raw files auto-deleted after 30 days. A compact derivative is kept so your report stays accessible. Never shared.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-4 rounded-xl border border-border/60 bg-white/70 p-4 shadow-sm"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </motion.div>

        {/* Right — form card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="flex items-center"
        >
          <Card className="w-full overflow-hidden shadow-xl ring-1 ring-black/[0.08]">
            <div className="h-1 bg-gradient-to-r from-primary/80 via-primary to-primary/80" />
            <CardContent className="p-8">
              <div className="mb-6 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
                <CheckCircle2 className="size-4 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-900">
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
