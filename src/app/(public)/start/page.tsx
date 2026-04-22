"use client";

import { useActionState } from "react";
import Link from "next/link";
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
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-bold">Start your free audit</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We&apos;ll email you the report when it&apos;s ready. Takes 3-8 minutes.
      </p>

      <form action={formAction} className="mt-8 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@company.com"
            required
            autoComplete="email"
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
          <Label htmlFor="legalConsent" className="text-sm font-normal text-muted-foreground">
            I have read-only rights to upload these reports for my company.
          </Label>
        </div>

        {state?.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Creating audit..." : "Continue to upload"}
        </Button>
      </form>

      <p className="mt-8 text-center text-xs text-muted-foreground">
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
    </main>
  );
}
