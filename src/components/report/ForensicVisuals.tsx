"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, Layers, ShieldCheck, Clock } from "lucide-react";
import { formatDollars } from "@/lib/format";

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

// Urgency: a restrained warm ramp — sooner is deeper amber, never panic-red (frontend.md).
const URGENCY_COLOR: Record<string, string> = {
  "≤ 7 days": "#b45309",
  "8–14 days": "#d97706",
  "15–30 days": "#f59e0b",
  "31–60 days": "#fbbf24",
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
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-slate-700">
        {icon}
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      </div>
      <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{subtitle}</p>
      {children}
    </div>
  );
}

/** Endpoint-only label for the projection line (dataviz: label the endpoint, not every point). */
function ForwardBleedChart({ monthlyCents }: { monthlyCents: number }) {
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
              <stop offset="0%" stopColor="#2a78d6" stopOpacity={0.16} />
              <stop offset="100%" stopColor="#2a78d6" stopOpacity={0.02} />
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
            stroke="#2a78d6"
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
    <div className="mt-6 grid gap-x-10 gap-y-8 md:grid-cols-2">
      {showUrgency && forwardMonthlyCents !== null && forwardMonthlyCents > 0 && (
        <div className="md:col-span-2">
          <ChartBlock
            icon={<TrendingUp className="size-4 stroke-[1.5]" />}
            title="The overcharge compounds forward"
            subtitle={`Projected from your ${formatDollars(forwardMonthlyCents)}/mo high-confidence run-rate, the reason to stop it now, not just claw back the past.`}
          >
            <ForwardBleedChart monthlyCents={forwardMonthlyCents} />
          </ChartBlock>
        </div>
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
          <HBarChart data={confData} height={confData.length * 52 + 24} yWidth={70} />
        </ChartBlock>
      )}

      {showUrgency && urgData.length > 0 && (
        <div className="md:col-span-2">
          <ChartBlock
            icon={<Clock className="size-4 stroke-[1.5]" />}
            title="Time-sensitive dollars"
            subtitle="Provable findings with a closing dispute window, by days remaining"
          >
            <HBarChart data={urgData} height={urgData.length * 46 + 24} yWidth={90} />
          </ChartBlock>
        </div>
      )}
    </div>
  );
}
