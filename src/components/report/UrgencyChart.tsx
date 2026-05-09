"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface UrgencyBucket {
  label: string;
  totalCents: number;
  count: number;
  color: string;
}

function formatDollarsChart(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(dollars);
}

export function UrgencyChart({
  findings,
}: {
  findings: { amount_cents: number; window_days_remaining: number | null }[];
}) {
  const buckets: UrgencyBucket[] = [
    { label: "Closing this week", totalCents: 0, count: 0, color: "#ef4444" },
    { label: "Next 30 days", totalCents: 0, count: 0, color: "#f97316" },
    { label: "Next 90 days", totalCents: 0, count: 0, color: "#eab308" },
    { label: "No hard window", totalCents: 0, count: 0, color: "#9ca3af" },
  ];

  for (const f of findings) {
    const d = f.window_days_remaining;
    let idx: number;
    if (d == null || d > 90) {
      idx = 3;
    } else if (d <= 7) {
      idx = 0;
    } else if (d <= 30) {
      idx = 1;
    } else {
      idx = 2;
    }
    buckets[idx].totalCents += f.amount_cents;
    buckets[idx].count += 1;
  }

  // Only show buckets that have findings
  const data = buckets.filter((b) => b.count > 0);

  if (data.length === 0) return null;

  return (
    <section className="mt-8 rounded-lg border bg-card p-6">
      <h2 className="text-lg font-bold">Urgency timeline</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        How much is at risk by dispute window
      </p>
      <div className="mt-4" style={{ width: "100%", height: data.length * 56 + 24 }}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
            <XAxis
              type="number"
              tickFormatter={(v: number) => formatDollarsChart(v)}
              fontSize={12}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={130}
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value) => [formatDollarsChart(Number(value)), "Amount"]}
              labelFormatter={(label) => String(label)}
            />
            <Bar dataKey="totalCents" radius={[0, 4, 4, 0]} barSize={28}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs">
        {data.map((b) => (
          <span key={b.label} className="flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ backgroundColor: b.color }}
            />
            {b.label}: {formatDollarsChart(b.totalCents)} ({b.count} case
            {b.count !== 1 ? "s" : ""})
          </span>
        ))}
      </div>
    </section>
  );
}
