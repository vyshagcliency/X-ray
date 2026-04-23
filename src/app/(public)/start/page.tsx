"use client";

import { useActionState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Shield, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { startAudit } from "./actions";

export default function StartPage() {
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      return await startAudit(formData);
    },
    null,
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
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
        </div>
      </nav>

      <main className="mx-auto grid max-w-5xl gap-12 px-6 py-16 lg:grid-cols-2 lg:gap-20 lg:py-24">
        {/* Left — context */}
        <div className="flex flex-col justify-center">
          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
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
        </div>

        {/* Right — form card */}
        <div className="flex items-center">
          <Card className="w-full shadow-lg ring-1 ring-black/5">
            <CardContent className="p-8">
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
        </div>
      </main>
    </div>
  );
}
