"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
} from "recharts";
import { formatDollars } from "@/lib/format";

interface CategoryDatum {
  key: string;
  label: string;
  total: number;
  color: string;
}

interface RecoveryVisualsProps {
  categories: CategoryDatum[];
  recurringCents: number;
  oneTimeCents: number;
}

function shortDollars(cents: number): string {
  const d = cents / 100;
  if (d >= 1000) return `$${(d / 1000).toFixed(d >= 10000 ? 0 : 1)}k`;
  return `$${Math.round(d)}`;
}

export function RecoveryVisuals({
  categories,
  recurringCents,
  oneTimeCents,
}: RecoveryVisualsProps) {
  const sorted = [...categories].sort((a, b) => b.total - a.total);
  const total = recurringCents + oneTimeCents;

  const splitData = [
    { name: "Recurring bleed", value: recurringCents, color: "#d97706" },
    { name: "Recoverable now", value: oneTimeCents, color: "#2563eb" },
  ].filter((d) => d.value > 0);

  return (
    <section className="mt-8 grid gap-6 lg:grid-cols-5">
      {/* Where the money is — category bar */}
      <div className="rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm lg:col-span-3">
        <h2 className="text-lg font-bold">Where the money is</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Recoverable amount by leak category
        </p>
        <div
          className="mt-4"
          style={{ width: "100%", height: sorted.length * 52 + 16 }}
        >
          <ResponsiveContainer>
            <BarChart data={sorted} layout="vertical" margin={{ left: 8, right: 56 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="label"
                width={148}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
                formatter={(value) => [formatDollars(Number(value)), "Recoverable"]}
              />
              <Bar dataKey="total" radius={[0, 5, 5, 0]} barSize={26}>
                {sorted.map((c) => (
                  <Cell key={c.key} fill={c.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recurring vs recoverable-now — donut */}
      <div className="rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm lg:col-span-2">
        <h2 className="text-lg font-bold">Recurring vs. one-time</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          What keeps bleeding vs. what&apos;s sitting there
        </p>
        <div className="relative mt-4" style={{ width: "100%", height: 200 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={splitData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={62}
                outerRadius={92}
                paddingAngle={2}
                strokeWidth={0}
              >
                {splitData.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatDollars(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-2xl font-bold tabular-nums">
              {shortDollars(total)}
            </span>
            <span className="text-xs text-muted-foreground">total recoverable</span>
          </div>
        </div>
        <div className="mt-2 space-y-1.5 text-sm">
          {splitData.map((d) => (
            <div key={d.name} className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span
                  className="inline-block size-2.5 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                {d.name}
              </span>
              <span className="font-mono font-semibold tabular-nums">
                {formatDollars(d.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
