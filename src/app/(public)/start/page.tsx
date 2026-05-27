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
import { startAudit } from "./actions";

export default function StartPage() {
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      return await startAudit(formData);
    },
    null,
  );

  return (
    <div className="min-h-screen bg-[#0a1929]">
      <NavBar />

      {/* Hero section */}
      <div className="relative overflow-hidden">
        {/* Background elements */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/3 size-[600px] -translate-x-1/2 rounded-full bg-blue-500/[0.07] blur-[120px]" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `linear-gradient(rgba(148,163,184,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.5) 1px, transparent 1px)`,
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        <div className="relative mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-5 lg:gap-16 lg:py-24">
          {/* Left — context (3/5) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col justify-center lg:col-span-3"
          >
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3.5 py-1.5">
              <span className="text-xs font-medium text-blue-400">
                Step 1 of 3
              </span>
              <div className="flex gap-1">
                <div className="size-1.5 rounded-full bg-blue-400" />
                <div className="size-1.5 rounded-full bg-white/20" />
                <div className="size-1.5 rounded-full bg-white/20" />
              </div>
            </div>

            <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white lg:text-5xl">
              Start your free audit
            </h1>
            <p className="mt-4 max-w-lg text-lg leading-relaxed text-slate-400">
              Enter your details and we&apos;ll get your forensic report
              started. You&apos;ll upload your Seller Central CSVs on the next
              step.
            </p>

            {/* Feature cards */}
            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: Clock,
                  title: "Ready in 3–8 min",
                  text: "We'll email you when your report is done.",
                  color: "blue",
                },
                {
                  icon: FileText,
                  title: "PDF report",
                  text: "Every finding with dispute-ready evidence.",
                  color: "emerald",
                },
                {
                  icon: Shield,
                  title: "Data stays private",
                  text: "Raw files auto-deleted after 30 days.",
                  color: "violet",
                },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
                  className="group rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 transition-colors hover:border-white/[0.12]"
                >
                  <div
                    className={`flex size-9 items-center justify-center rounded-lg ${
                      item.color === "blue"
                        ? "bg-blue-500/15"
                        : item.color === "emerald"
                          ? "bg-emerald-500/15"
                          : "bg-violet-500/15"
                    }`}
                  >
                    <item.icon
                      className={`size-4.5 ${
                        item.color === "blue"
                          ? "text-blue-400"
                          : item.color === "emerald"
                            ? "text-emerald-400"
                            : "text-violet-400"
                      }`}
                    />
                  </div>
                  <p className="mt-3 text-sm font-medium text-white">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    {item.text}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right — form (2/5) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="flex items-start lg:col-span-2 lg:pt-4"
          >
            <div className="w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111c32] shadow-2xl shadow-black/20">
              {/* Card header accent */}
              <div className="h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400" />

              <div className="p-8">
                <div className="mb-6 flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  <p className="text-sm font-medium text-slate-300">
                    No signup or login required
                  </p>
                </div>

                <form action={formAction} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm text-slate-300">
                      Work email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@company.com"
                      required
                      autoComplete="email"
                      className="h-11 border-white/10 bg-white/5 text-white placeholder:text-slate-600 focus-visible:border-blue-500/50 focus-visible:ring-blue-500/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="brandName"
                      className="text-sm text-slate-300"
                    >
                      Brand / company name
                    </Label>
                    <Input
                      id="brandName"
                      name="brandName"
                      type="text"
                      placeholder="Your brand name"
                      required
                      className="h-11 border-white/10 bg-white/5 text-white placeholder:text-slate-600 focus-visible:border-blue-500/50 focus-visible:ring-blue-500/20"
                    />
                  </div>

                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="legalConsent"
                      name="legalConsent"
                      required
                      className="mt-1 size-4 rounded border-white/20 bg-white/5"
                    />
                    <Label
                      htmlFor="legalConsent"
                      className="text-sm font-normal text-slate-500"
                    >
                      I have read-only rights to upload these reports for my
                      company.
                    </Label>
                  </div>

                  {state?.error && (
                    <p className="text-sm text-red-400">{state.error}</p>
                  )}

                  <Button
                    type="submit"
                    className="h-11 w-full bg-blue-500 text-white hover:bg-blue-400"
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

                <p className="mt-6 text-center text-xs text-slate-600">
                  By continuing, you agree to our{" "}
                  <Link
                    href="/privacy"
                    className="text-slate-400 underline transition-colors hover:text-white"
                  >
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/terms"
                    className="text-slate-400 underline transition-colors hover:text-white"
                  >
                    Terms of Service
                  </Link>
                  .
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
