"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, Layers, ShieldCheck, Clock } from "lucide-react";
import { formatDollars } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CARD_CLASS } from "./DashboardCard";

/**
 * The forensic visual system (P1.6). Four charts, each answering one buyer question —
 * not chart soup. Every value traces to a finding: charts render straight from
 * report_data aggregates and never introduce a number that isn't in the findings.
 *
 * The report is a light printable-document (locked §3 Q4), so the charts are
 * light-only by design; they obey the dataviz mark specs (thin marks, 4px rounded
 * data-ends, hairline recessive grid, direct labels, tooltips, no animation).
 */

interface CategoryDatum {
  key: string;
  label: string;
  total: number;
  color: string;
}
interface UrgencyDatum {
  label: string;
  cents: number;
  count: number;
}
interface ForensicVisualsProps {
  categories: CategoryDatum[];
  confidenceCents: { high: number; medium: number; low: number };
  urgencyBuckets: UrgencyDatum[];
  forwardMonthlyCents: number | null;
}

// Recessive chrome (dataviz: gridlines/axes are hairline, one step off the surface).
const AXIS_INK = "#475569"; // slate-600
const MUTED = "#94a3b8"; // slate-400
const GRID = "#e2e8f0"; // slate-200 hairline

// Confidence hues match the hero confidence bar + frontend.md (high = accent blue,
// medium = muted amber, review = muted slate — never pass/fail red/green).
const CONF = {
  high: { color: "#2563eb", label: "High" },
  medium: { color: "#d97706", label: "Medium" },
  low: { color: "#94a3b8", label: "Review" },
};

// Filing timeline: near-term is deeper amber (act soon), long windows cool to slate (runway,
// not panic-red per frontend.md). Covers the full band set out to 18 months.
const URGENCY_COLOR: Record<string, string> = {
  "≤ 7 days": "#b45309",
  "8–14 days": "#d97706",
  "15–30 days": "#f59e0b",
  "31–90 days": "#fbbf24",
  "3–6 months": "#a3b8d8",
  "6–18 months": "#94a3b8",
};

function shortDollars(cents: number): string {
  const d = cents / 100;
  if (Math.abs(d) >= 1000) return `$${(d / 1000).toFixed(d >= 10000 ? 0 : 1)}k`;
  return `$${Math.round(d)}`;
}

function ChartBlock({
  title,
  subtitle,
  icon,
  className,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(CARD_CLASS, "p-5", className)}>
      <div className="flex items-center gap-2 text-slate-700">
        {icon}
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      </div>
      <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{subtitle}</p>
      {children}
    </div>
  );
}

/** Endpoint-only label for the projection line (dataviz: label the endpoint, not every point).
 *  Exported so the Overview hero can render it as its signature area chart (Stripe pattern). */
export function ForwardBleedChart({ monthlyCents }: { monthlyCents: number }) {
  const HORIZON = 12;
  const data = Array.from({ length: HORIZON + 1 }, (_, m) => ({
    month: m,
    cumulative: monthlyCents * m,
  }));
  const endTotal = monthlyCents * HORIZON;

  return (
    <div style={{ width: "100%", height: 240 }} className="mt-4">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 16, right: 64, left: 8, bottom: 4 }}>
          <defs>
            <linearGradient id="forwardFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4971ff" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#4971ff" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="month"
            tickFormatter={(m) => (m === 0 ? "now" : `+${m}mo`)}
            ticks={[0, 3, 6, 9, 12]}
            tick={{ fontSize: 11, fill: MUTED }}
            tickLine={false}
            axisLine={{ stroke: GRID }}
          />
          <YAxis
            tickFormatter={(v) => shortDollars(Number(v))}
            tick={{ fontSize: 11, fill: MUTED }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            formatter={(v) => [formatDollars(Number(v)), "Cumulative overcharge"]}
            labelFormatter={(m) => (m === 0 ? "Today" : `${m} months from now`)}
            contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: GRID }}
          />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke="#4971ff"
            strokeWidth={2}
            fill="url(#forwardFill)"
            isAnimationActive={false}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "#ffffff" }}
          >
            <LabelList
              dataKey="cumulative"
              content={(props) => {
                const { x, y, value, index } = props as {
                  x: number;
                  y: number;
                  value: number;
                  index: number;
                };
                if (index !== HORIZON) return null;
                return (
                  <text
                    x={x + 8}
                    y={y}
                    fill={AXIS_INK}
                    fontSize={12}
                    fontWeight={600}
                    dominantBaseline="middle"
                  >
                    {shortDollars(Number(value))}
                  </text>
                );
              }}
            />
          </Area>
        </AreaChart>
      </ResponsiveContainer>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        Unchecked, this overcharge reaches{" "}
        <span className="font-medium text-slate-700">{formatDollars(endTotal)}</span>{" "}
        over the next 12 months.
      </p>
    </div>
  );
}

function HBarChart({
  data,
  height,
  yWidth,
}: {
  data: Array<{ label: string; value: number; color: string; sub?: string }>;
  height: number;
  yWidth: number;
}) {
  return (
    <div style={{ width: "100%", height }} className="mt-4">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 56, top: 4, bottom: 4 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            width={yWidth}
            tick={{ fontSize: 12, fill: AXIS_INK }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(15,23,42,0.04)" }}
            formatter={(v, _n, item) => {
              const sub = (item?.payload as { sub?: string })?.sub;
              return [formatDollars(Number(v)) + (sub ? ` · ${sub}` : ""), "Recoverable"];
            }}
            contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: GRID }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={22} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.label} fill={d.color} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              formatter={(v) => shortDollars(Number(v ?? 0))}
              style={{ fontSize: 11, fill: AXIS_INK, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Provable dollars by confidence, as a donut (part-to-whole). The hole carries the total,
 *  the legend direct-labels each tier with its $ and share. Dominant medium + a small high
 *  wedge visually says "the sharp wedge is smaller but undeniable" (dataviz: ≤5 slices,
 *  direct labels, no animation, colors match the confidence bar). */
function ConfidenceDonut({
  data,
}: {
  data: Array<{ label: string; value: number; color: string }>;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:justify-center sm:gap-8">
      <div className="relative shrink-0" style={{ width: 168, height: 168 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={54}
              outerRadius={80}
              paddingAngle={data.length > 1 ? 2 : 0}
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.label} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v, n) => [formatDollars(Number(v)), String(n)]}
              contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: GRID }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-lg font-semibold tabular-nums text-slate-900">
            {shortDollars(total)}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-slate-400">provable</span>
        </div>
      </div>
      <ul className="space-y-2.5">
        {data.map((d) => {
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <li key={d.label} className="flex items-center gap-2.5 text-sm">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: d.color }}
              />
              <span className="w-16 text-slate-600">{d.label}</span>
              <span className="font-mono font-semibold tabular-nums text-slate-900">
                {shortDollars(d.value)}
              </span>
              <span className="text-xs tabular-nums text-slate-400">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ForensicVisuals({
  categories,
  confidenceCents,
  urgencyBuckets,
  forwardMonthlyCents,
  only,
}: ForensicVisualsProps & { only?: "money" | "urgency" }) {
  // Keep the incoming confidence×punch order (P1.6: "ordered by confidence×punch to
  // match the body, not raw $") — re-sorting by total would re-hero the soft giant (D4).
  const catData = categories.map((c) => ({
    label: c.label,
    value: c.total,
    color: c.color,
  }));

  const confData = (["high", "medium", "low"] as const)
    .map((k) => ({ label: CONF[k].label, value: confidenceCents[k], color: CONF[k].color }))
    .filter((d) => d.value > 0);

  const urgData = urgencyBuckets.map((b) => ({
    label: b.label,
    value: b.cents,
    color: URGENCY_COLOR[b.label] ?? "#d97706",
    sub: `${b.count} finding${b.count !== 1 ? "s" : ""}`,
  }));

  const showMoney = !only || only === "money";
  const showUrgency = !only || only === "urgency";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {showUrgency && forwardMonthlyCents !== null && forwardMonthlyCents > 0 && (
        <ChartBlock
          className="md:col-span-2"
          icon={<TrendingUp className="size-4 stroke-[1.5]" />}
          title="The overcharge compounds forward"
          subtitle={`Projected from your ${formatDollars(forwardMonthlyCents)}/mo high-confidence run-rate, the reason to stop it now, not just claw back the past.`}
        >
          <ForwardBleedChart monthlyCents={forwardMonthlyCents} />
        </ChartBlock>
      )}

      {showMoney && (
        <ChartBlock
          icon={<Layers className="size-4 stroke-[1.5]" />}
          title="Where the money is"
          subtitle="Provable categories, ordered by evidence strength"
        >
          <HBarChart data={catData} height={catData.length * 52 + 24} yWidth={150} />
        </ChartBlock>
      )}

      {showMoney && (
        <ChartBlock
          icon={<ShieldCheck className="size-4 stroke-[1.5]" />}
          title="How solid is each dollar?"
          subtitle="Provable dollars by evidence strength, the sharp wedge is smaller but undeniable"
        >
          <ConfidenceDonut data={confData} />
        </ChartBlock>
      )}

      {showUrgency && urgData.length > 0 && (
        <ChartBlock
          className="md:col-span-2"
          icon={<Clock className="size-4 stroke-[1.5]" />}
          title="Filing windows"
          subtitle="Your provable recovery by how long until each dispute window closes. The near-term bands close soonest; the long bands hold the most, with more runway."
        >
          <HBarChart data={urgData} height={urgData.length * 46 + 24} yWidth={104} />
        </ChartBlock>
      )}
    </div>
  );
}
