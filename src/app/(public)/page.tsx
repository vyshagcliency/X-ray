import Link from "next/link";
import { ArrowRight, Shield, Clock, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const sampleFindings = [
  {
    amount: "$14,331",
    label: "in unreimbursed customer returns",
    detail: "47 returns marked damaged but never reimbursed",
  },
  {
    amount: "$8,902",
    label: "in dimension overcharges",
    detail: "23 ASINs measured larger than actual — you're overpaying per unit",
  },
  {
    amount: "$4,210",
    label: "in lost inventory never claimed",
    detail: "Inventory Amazon lost in warehouses — reimbursement window still open",
  },
];

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      {/* Hero */}
      <section className="text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Find every dollar Amazon owes you.
          <br />
          In 10 minutes. Free.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Upload 4 reports from Seller Central. We&apos;ll forensically audit 18 months of FBA
          activity and show you every reimbursement Amazon should have paid you, every fee they
          overcharged, and every dispute window closing this week.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          No call. No signup. No software to install. We pay the compute bill.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/start">
            Start your free audit <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
      </section>

      {/* Sample findings */}
      <section className="mt-20">
        <h2 className="text-center text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Real findings from real audits (anonymized)
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {sampleFindings.map((f) => (
            <Card key={f.amount}>
              <CardContent className="pt-6">
                <p className="text-2xl font-bold">{f.amount}</p>
                <p className="mt-1 text-sm font-medium">{f.label}</p>
                <p className="mt-2 text-xs text-muted-foreground">{f.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Trust signals */}
      <section className="mt-20">
        <div className="grid gap-8 sm:grid-cols-3">
          <div className="text-center">
            <Shield className="mx-auto size-8 text-muted-foreground" />
            <h3 className="mt-3 font-medium">Your data stays private</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Raw files deleted after 30 days. Never shared. Never used for training.
            </p>
          </div>
          <div className="text-center">
            <Clock className="mx-auto size-8 text-muted-foreground" />
            <h3 className="mt-3 font-medium">Results in minutes</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Most audits complete in 3-8 minutes. We&apos;ll email you when it&apos;s ready.
            </p>
          </div>
          <div className="text-center">
            <DollarSign className="mx-auto size-8 text-muted-foreground" />
            <h3 className="mt-3 font-medium">Real numbers, not estimates</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Every dollar figure traces to a specific transaction in your data.
            </p>
          </div>
        </div>
      </section>

      {/* About Baslix */}
      <section className="mt-20 rounded-lg border bg-muted/50 p-8 text-center">
        <p className="text-muted-foreground">
          We&apos;re{" "}
          <span className="font-medium text-foreground">Baslix</span>. We do this for ecommerce
          brands as a managed service and only get paid when you recover. The audit is free because
          if you find $200k of leakage, you&apos;ll probably want help filing the claims.
        </p>
      </section>

      {/* Footer */}
      <footer className="mt-16 border-t pt-8 text-center text-sm text-muted-foreground">
        <div className="flex justify-center gap-6">
          <Link href="/privacy" className="hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:underline">
            Terms of Service
          </Link>
        </div>
      </footer>
    </main>
  );
}
