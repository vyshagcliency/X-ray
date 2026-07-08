# Report UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-cast the web report (`/r/[uuid]`) as a light, modern SaaS workspace (persistent top app bar + three tabs + a findings drawer), removing the AI-UI tells, without dropping any content or touching the PDF/number logic.

**Architecture:** `page.tsx` stays a server component that loads and derives all figures from `report_data` exactly as today, then hands a fully-computed props object to a new client `ReportShell`. `ReportShell` owns tab state and composes a `ReportTopBar`, three tab panels (`OverviewTab`, `FindingsTab`, `DeadlinesTab`), and a footer. The existing content-bearing components (`Spotlight`, `ForensicVisuals`, `CategoryDeepDive`) are refactored to drop their white-box/colored-border chrome and are reused inside the tabs and a hand-rolled `ReportDrawer`.

**Tech Stack:** Next.js 15 (App Router, RSC), TypeScript strict, Tailwind CSS v4, Recharts (existing charts), Lucide icons, Vitest. No new dependencies.

## Global Constraints

- **No em dashes (`—`) in customer-facing copy.** Rewrite to comma/colon/period. Never touch en dashes (`–`) — they carry ranges (`8–14 days`, `2024–25`).
- **No detail dropped.** Every element in the current report must land somewhere per the spec's inventory (`docs/superpowers/specs/2026-07-07-report-ui-redesign-design.md` §4).
- **No colored container borders anywhere.** Category color only as an 8px dot or a chart bar.
- **Light slate palette only** (ink `#0f172a`, body `#334155`, muted `#64748b`, faint `#94a3b8`, hairline `#e2e8f0`, panel `#f8fafc`). Category accents from `category-meta.ts`.
- **Monetary values via `formatDollars(cents)` / `formatPct`** from `@/lib/format`. Never interpolate raw math.
- **No changes** to `src/lib/pdf/**`, `templates/report.typ`, `src/lib/pdf/data-builder.ts`, or the number-derivation code in `page.tsx`.
- **Web-only, `print:hidden` not needed** (the whole surface is web; the PDF is separate). Tailwind only, no inline styles except the one allowed case of a category-color dot background.
- Functional components, named exports (except `page.tsx`). `@/` import alias. Lucide icons at `stroke-[1.5]`.

---

## File Structure

- Create `src/lib/report/text.ts` — `stripEmDashes(text)` runtime scrub for baked narrative.
- Create `src/components/report/urgent-cases.ts` — `deriveClosingSoon(findings, maxDays)` pure helper for the Deadlines list.
- Create `src/components/report/ReportShell.tsx` — client; tab state + layout; the single props interface `ReportModel`.
- Create `src/components/report/ReportTopBar.tsx` — sticky identity + recoverable $ + CTA + PDF/CSV + tab strip.
- Create `src/components/report/OverviewTab.tsx` — the pitch.
- Create `src/components/report/FindingsTab.tsx` — filter bar + category table + drawer trigger.
- Create `src/components/report/ReportDrawer.tsx` — dependency-free accessible right drawer.
- Create `src/components/report/DeadlinesTab.tsx` — urgency charts + closing-soon list + CTA.
- Modify `src/components/report/Spotlight.tsx` — drop card + colored border.
- Modify `src/components/report/ForensicVisuals.tsx` — drop `ChartCard` box; split rendering so Overview and Deadlines can request specific charts.
- Modify `src/components/report/CategoryDeepDive.tsx` — drop outer bordered `section`; becomes the drawer body.
- Modify `src/components/report/category-meta.ts` — scrub em dashes in string literals.
- Modify `src/components/report/finding-math.ts` — scrub em dashes in `formula` strings.
- Modify `src/app/(public)/r/[uuid]/page.tsx` — keep all derivation; replace the JSX body with `<ReportShell model={...} />`; drop `ReportNav`/`ReportDock`/`NavBar`/`SectionHeader` usage.
- Delete usage of `src/components/report/ReportNav.tsx` and `ReportDock.tsx` (leave files or delete; plan deletes them).
- Create `tests/report/scrub.test.ts`, `tests/report/urgent-cases.test.ts`.
- Modify `.claude/rules/frontend.md`, `decisions.md` (docs).

---

### Task 1: Em-dash scrub helper + copy sweep of the shared text sources

**Files:**
- Create: `src/lib/report/text.ts`
- Test: `tests/report/scrub.test.ts`
- Modify: `src/components/report/category-meta.ts` (string literals only), `src/components/report/finding-math.ts` (`formula` strings only)

**Interfaces:**
- Produces: `stripEmDashes(text: string): string` — replaces every em dash `—` (with optional surrounding whitespace) by `", "`; leaves en dashes `–` untouched; collapses a resulting `", ,"`/double-space.

- [ ] **Step 1: Write the failing test**

```ts
// tests/report/scrub.test.ts
import { describe, it, expect } from "vitest";
import { stripEmDashes } from "@/lib/report/text";

describe("stripEmDashes", () => {
  it("replaces an em dash with a comma", () => {
    expect(stripEmDashes("overcharges — and it compounds")).toBe(
      "overcharges, and it compounds",
    );
  });
  it("handles an em dash with no surrounding spaces", () => {
    expect(stripEmDashes("Estimated—flagged")).toBe("Estimated, flagged");
  });
  it("leaves en-dash ranges intact", () => {
    expect(stripEmDashes("8–14 days and 2024–25")).toBe("8–14 days and 2024–25");
  });
  it("does not create a double comma", () => {
    expect(stripEmDashes("fee, — you were billed")).toBe("fee, you were billed");
  });
  it("is a no-op on clean text", () => {
    expect(stripEmDashes("a clean sentence")).toBe("a clean sentence");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/report/scrub.test.ts`
Expected: FAIL (`stripEmDashes` not found).

- [ ] **Step 3: Implement the helper**

```ts
// src/lib/report/text.ts
/**
 * Removes em dashes from customer-facing copy (they read as AI-generated).
 * En dashes (– used for ranges like "8–14 days", "2024–25") are preserved.
 * Applied at the render boundary to baked narrative in report_data so existing
 * reports become em-dash-free without a worker re-run. The PDF is untouched.
 */
export function stripEmDashes(text: string): string {
  return text
    .replace(/\s*—\s*/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- tests/report/scrub.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Scrub the shared copy sources**

In `src/components/report/category-meta.ts`, rewrite every `—` that appears **inside a string literal** (mechanism, filePath, disputeWindow, confidenceWhy) to natural punctuation. Examples (apply the same pattern to all occurrences found by the grep below):
- `"...within ~90 days of each charge — but the category error keeps recurring..."` becomes `"...within ~90 days of each charge, but the category error keeps recurring..."`
- `"...billed the full, non-discounted fee — the discount never applied..."` becomes `"...billed the full, non-discounted fee, and the discount never applied..."`
- `"Amazon charged a $0.60 coupon redemption fee on orders that carry no matching promotion discount — you were billed for a redemption that never happened."` becomes `"...no matching promotion discount, so you were billed for a redemption that never happened."`
- `"...on the same order in your own settlement — an internal inconsistency with no legitimate reading."` becomes `"...on the same order in your own settlement, an internal inconsistency with no legitimate reading."`
- `"A deal (Lightning/Best Deal) is charged one fee per run. These SKUs carry two or more deal fees within a single deal window — a duplicate or double-booked charge."` becomes `"...within a single deal window, a duplicate or double-booked charge."`
- `"Estimated — flagged from your reports but valued at a flat per-item placeholder; ..."` becomes `"Estimated: flagged from your reports but valued at a flat per-item placeholder; ..."`
- `"Estimated — flagged from the ledger but valued at a flat per-item placeholder; ..."` becomes `"Estimated: flagged from the ledger but valued at a flat per-item placeholder; ..."`
- `"File promptly — Amazon dispute windows are time-limited."` becomes `"File promptly. Amazon dispute windows are time-limited."`

In `src/components/report/finding-math.ts`, rewrite `—` inside the `formula` string(s), e.g. `"Estimated at a flat placeholder per item — the real per-item value is confirmed before filing."` becomes `"Estimated at a flat placeholder per item. The real per-item value is confirmed before filing."`

Verify none remain in string literals:

Run: `grep -n '"[^"]*—' src/components/report/category-meta.ts src/components/report/finding-math.ts`
Expected: no output (comments may still contain `—`; only string-literal copy must be clean).

- [ ] **Step 6: Verify build + lint + tests**

Run: `pnpm test -- tests/report/scrub.test.ts && pnpm lint`
Expected: tests PASS, lint clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/report/text.ts tests/report/scrub.test.ts src/components/report/category-meta.ts src/components/report/finding-math.ts
git commit -m "Report redesign: em-dash scrub helper + copy sweep of meta/math text"
```

---

### Task 2: `deriveClosingSoon` helper for the Deadlines list

**Files:**
- Create: `src/components/report/urgent-cases.ts`
- Test: `tests/report/urgent-cases.test.ts`

**Interfaces:**
- Consumes: the `Finding` shape used in `page.tsx` (has `category`, `amount_cents`, `window_days_remaining`, `confidence`, `evidence`).
- Produces: `deriveClosingSoon(findings, estimatedCategories, maxDays?): ClosingSoonRow[]` where `ClosingSoonRow = { category: string; sku: string; amountCents: number; daysRemaining: number }`, provable-only (excludes estimated categories), `0 <= window_days_remaining <= maxDays` (default 14), sorted ascending by days then descending by amount.

- [ ] **Step 1: Write the failing test**

```ts
// tests/report/urgent-cases.test.ts
import { describe, it, expect } from "vitest";
import { deriveClosingSoon } from "@/components/report/urgent-cases";

const f = (over: Partial<Record<string, unknown>>) => ({
  id: "x", rule_id: "r", category: "referral_fee", amount_cents: 100,
  confidence: "high", window_days_remaining: 5, window_closes_on: null,
  narrative_summary: null, evidence: { sku: "HA-1" }, ...over,
});

describe("deriveClosingSoon", () => {
  it("keeps only provable findings within the window, sorted by days then amount", () => {
    const rows = deriveClosingSoon(
      [
        f({ window_days_remaining: 10, amount_cents: 100, evidence: { sku: "A" } }),
        f({ window_days_remaining: 3, amount_cents: 200, evidence: { sku: "B" } }),
        f({ window_days_remaining: 3, amount_cents: 900, evidence: { sku: "C" } }),
        f({ window_days_remaining: 40, amount_cents: 500, evidence: { sku: "D" } }), // too far
        f({ window_days_remaining: -1, amount_cents: 500, evidence: { sku: "E" } }), // closed
        f({ category: "returns", window_days_remaining: 2, evidence: { sku: "F" } }), // estimated
      ],
      new Set(["returns"]),
      14,
    );
    expect(rows.map((r) => r.sku)).toEqual(["C", "B", "A"]);
    expect(rows[0]).toMatchObject({ category: "referral_fee", amountCents: 900, daysRemaining: 3 });
  });
  it("returns [] when nothing qualifies", () => {
    expect(deriveClosingSoon([f({ window_days_remaining: null })], new Set(), 14)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/report/urgent-cases.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the helper**

```ts
// src/components/report/urgent-cases.ts
interface FindingLike {
  category: string;
  amount_cents: number;
  window_days_remaining: number | null;
  evidence: Record<string, unknown>;
}
export interface ClosingSoonRow {
  category: string;
  sku: string;
  amountCents: number;
  daysRemaining: number;
}

/** Provable findings whose dispute window closes within `maxDays`, for the Deadlines
 *  list. Estimated categories are excluded so this reconciles with the hero urgency $.
 *  Uses only real finding fields (no computed figures). */
export function deriveClosingSoon(
  findings: FindingLike[],
  estimatedCategories: Set<string>,
  maxDays = 14,
): ClosingSoonRow[] {
  return findings
    .filter(
      (f) =>
        !estimatedCategories.has(f.category) &&
        f.window_days_remaining !== null &&
        f.window_days_remaining >= 0 &&
        f.window_days_remaining <= maxDays,
    )
    .map((f) => ({
      category: f.category,
      sku: String(f.evidence?.sku ?? f.evidence?.order_id ?? "—").replace("—", "N/A"),
      amountCents: f.amount_cents,
      daysRemaining: f.window_days_remaining as number,
    }))
    .sort((a, b) => a.daysRemaining - b.daysRemaining || b.amountCents - a.amountCents);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- tests/report/urgent-cases.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/report/urgent-cases.ts tests/report/urgent-cases.test.ts
git commit -m "Report redesign: deriveClosingSoon helper for Deadlines list"
```

---

### Task 3: De-box `Spotlight`

**Files:**
- Modify: `src/components/report/Spotlight.tsx:94-98` (the outer `section`) and the math-box styling.

**Interfaces:**
- Produces: `Spotlight(props: SpotlightProps)` unchanged signature; renders with no card border and no colored left border. Root becomes a plain `div` on the canvas.

- [ ] **Step 1: Replace the bordered `section`**

Replace:
```tsx
    <section
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      style={{ borderLeft: `4px solid ${meta.color}` }}
    >
      <div className="p-6 lg:p-7">
```
with (note: `meta` still used for the crosshair color + label; keep it):
```tsx
    <div>
      <div className="rounded-xl bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70 lg:p-7">
```
and change the matching closing `</div>\n    </section>` at the end of the component to `</div>\n    </div>`.

- [ ] **Step 2: Verify build + lint**

Run: `pnpm build`
Expected: compiles (the report page still imports Spotlight; no type change).

- [ ] **Step 3: Commit**

```bash
git add src/components/report/Spotlight.tsx
git commit -m "Report redesign: de-box Spotlight (drop colored left border)"
```

---

### Task 4: De-box `ForensicVisuals` and expose per-chart rendering

**Files:**
- Modify: `src/components/report/ForensicVisuals.tsx` (the `ChartCard` wrapper + the top-level composition).

**Interfaces:**
- Produces:
  - `ChartBlock({ title, subtitle, icon, children })` — replaces `ChartCard`; renders title/subtitle on the canvas (no white box).
  - `ForensicVisuals` keeps its existing prop signature but gains an optional `only?: "money" | "urgency"` prop. `only="money"` renders just the category bar chart + the confidence chart (for Overview). `only="urgency"` renders the forward-compound chart + the urgency-buckets chart (for Deadlines). Omitted renders all (back-compat).

- [ ] **Step 1: Replace `ChartCard` with `ChartBlock` (no box)**

Replace the `ChartCard` function (lines ~73-98) with:
```tsx
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
```

- [ ] **Step 2: Rework the composition to support `only`**

Change the component signature to `export function ForensicVisuals({ categories, confidenceCents, urgencyBuckets, forwardMonthlyCents, only }: ForensicVisualsProps & { only?: "money" | "urgency" })`.

Split the returned JSX so the money charts and urgency charts are gated:
```tsx
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
```
(Note the two subtitles above had their `—` rewritten to commas to satisfy the em-dash rule.)

- [ ] **Step 3: Verify build + lint**

Run: `pnpm build`
Expected: compiles. (`ForensicVisuals` is still imported by the page until Task 9 rewires it; the added optional prop is back-compatible.)

- [ ] **Step 4: Commit**

```bash
git add src/components/report/ForensicVisuals.tsx
git commit -m "Report redesign: de-box charts (ChartBlock) + split money/urgency via only prop"
```

---

### Task 5: Refactor `CategoryDeepDive` into a de-boxed drawer body

**Files:**
- Modify: `src/components/report/CategoryDeepDive.tsx:195-199` (root element) and the header spacing.

**Interfaces:**
- Produces: `CategoryDeepDive(props)` unchanged signature; root is a plain `div` (no bordered `section`, no `borderTop` colored line), suited to live inside the drawer. The color dot in the header stays as the only category-color cue.

- [ ] **Step 1: Replace the bordered root `section`**

Replace:
```tsx
    <section
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      style={{ borderTop: `3px solid ${meta.color}` }}
    >
      <div className="p-6">
```
with:
```tsx
    <div>
      <div className="px-1 pb-6">
```
and change the component's final closing `</div>\n    </section>` to `</div>\n    </div>`.

- [ ] **Step 2: Neutralize inner card seams for the drawer context**

The evidence table and dossier footer currently use `border-t border-slate-100` / `bg-slate-50/*` dividers that assumed a card. Keep them (they read fine on white drawer), but change the dossier footer wrapper (line ~287) from `border-t border-slate-200 bg-slate-50/30 p-6` to `mt-6 rounded-xl bg-slate-50 p-5` so it reads as a grouped panel inside the drawer rather than a card seam. Change the evidence-table wrapper (line ~242) `border-t border-slate-100` to `mt-5 overflow-hidden rounded-xl ring-1 ring-slate-200/70`.

- [ ] **Step 3: Verify build + lint**

Run: `pnpm build`
Expected: compiles.

- [ ] **Step 4: Commit**

```bash
git add src/components/report/CategoryDeepDive.tsx
git commit -m "Report redesign: CategoryDeepDive becomes a de-boxed drawer body"
```

---

### Task 6: `ReportTopBar`

**Files:**
- Create: `src/components/report/ReportTopBar.tsx`

**Interfaces:**
- Consumes: from `ReportShell`: `brand`, `caseId`, `uuid`, `recoverableNowCents`, `tab`, `onTab`.
- Produces: `ReportTopBar(props)` sticky bar + tab strip. `TabKey = "overview" | "findings" | "deadlines"`. Exports `TABS: { key: TabKey; label: string }[]`.

- [ ] **Step 1: Implement the component**

```tsx
// src/components/report/ReportTopBar.tsx
"use client";

import Image from "next/image";
import { ArrowRight, Download, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDollars } from "@/lib/format";
import { cn } from "@/lib/utils";

const CALENDLY = "https://calendly.com/vyshag-baslix/30min";

export type TabKey = "overview" | "findings" | "deadlines";
export const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "findings", label: "Findings" },
  { key: "deadlines", label: "Deadlines" },
];

export function ReportTopBar({
  brand,
  caseId,
  uuid,
  recoverableNowCents,
  tab,
  onTab,
}: {
  brand: string;
  caseId: string;
  uuid: string;
  recoverableNowCents: number;
  tab: TabKey;
  onTab: (t: TabKey) => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2.5 sm:px-6">
        <a href="https://baslix.com" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Baslix" width={24} height={24} className="size-6" />
          <span className="hidden text-sm font-semibold tracking-tight text-slate-900 sm:inline">
            Settlement Truth Audit
          </span>
        </a>
        <span className="hidden text-xs text-slate-400 md:inline">
          {brand} <span className="text-slate-300">·</span>{" "}
          <span className="font-mono">{caseId}</span>
        </span>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {recoverableNowCents > 0 && (
            <div className="hidden text-right sm:block">
              <p className="font-mono text-sm font-semibold tabular-nums text-slate-900">
                {formatDollars(recoverableNowCents)}
              </p>
              <p className="-mt-0.5 text-[10px] uppercase tracking-wider text-slate-400">
                recoverable
              </p>
            </div>
          )}
          <div className="hidden items-center gap-1 sm:flex">
            <Button asChild variant="ghost" size="sm">
              <a href={`/api/audit/pdf?id=${uuid}`} download aria-label="Download PDF">
                <Download className="size-4 stroke-[1.5]" />
              </a>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <a href={`/api/audit/csv?id=${uuid}`} download aria-label="Export CSV">
                <Table2 className="size-4 stroke-[1.5]" />
              </a>
            </Button>
          </div>
          <Button asChild size="sm">
            <a href={CALENDLY} target="_blank" rel="noopener noreferrer">
              Book a call <ArrowRight className="ml-1.5 size-4" />
            </a>
          </Button>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Report sections"
        className="mx-auto flex max-w-6xl gap-1 px-4 sm:px-6"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls={`panel-${t.key}`}
            onClick={() => onTab(t.key)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              tab === t.key
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Verify build + lint**

Run: `pnpm build && pnpm lint`
Expected: compiles (component is not yet mounted; verify it type-checks). If unused-import lint fires, it is because nothing imports it yet — acceptable until Task 10, or temporarily skip lint until then. Prefer to proceed; Task 10 mounts it.

- [ ] **Step 3: Commit**

```bash
git add src/components/report/ReportTopBar.tsx
git commit -m "Report redesign: ReportTopBar (identity + recoverable + CTA + tabs)"
```

---

### Task 7: `ReportDrawer` (dependency-free, accessible)

**Files:**
- Create: `src/components/report/ReportDrawer.tsx`

**Interfaces:**
- Produces: `ReportDrawer({ open, onClose, title, colorDot, children })` — a right-side sheet on desktop, full-height on mobile. Focus trap, Escape to close, overlay click to close, body scroll lock, restores focus to the previously focused element on close.

- [ ] **Step 1: Implement the drawer**

```tsx
// src/components/report/ReportDrawer.tsx
"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export function ReportDrawer({
  open,
  onClose,
  title,
  colorDot,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  colorDot?: string;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>("[data-autofocus]")?.focus() ?? panel?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panel) {
        const items = panel.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])',
        );
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      restoreRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px] motion-safe:animate-in motion-safe:fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-2xl outline-none motion-safe:animate-in motion-safe:slide-in-from-right sm:w-[560px]"
      >
        <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-4">
          {colorDot && (
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: colorDot }}
            />
          )}
          <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="size-5 stroke-[1.5]" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: compiles. (`animate-in`/`slide-in-from-right` utilities: if `tailwindcss-animate` is not present, replace those classes with `transition` + a mounted state, or drop them. Check `src/app/globals.css` / tailwind setup in Step 3.)

- [ ] **Step 3: Confirm animation utilities exist, else simplify**

Run: `grep -rn "tailwindcss-animate\|animate-in\|slide-in-from" src/app/globals.css package.json`
If no match, remove the `motion-safe:animate-in motion-safe:fade-in` and `motion-safe:animate-in motion-safe:slide-in-from-right` classes (the drawer still works without entrance animation). Re-run `pnpm build`.

- [ ] **Step 4: Commit**

```bash
git add src/components/report/ReportDrawer.tsx
git commit -m "Report redesign: dependency-free accessible ReportDrawer"
```

---

### Task 8: `OverviewTab`

**Files:**
- Create: `src/components/report/OverviewTab.tsx`

**Interfaces:**
- Consumes (from `ReportModel`, defined in Task 10): `brand, forwardMonthlyCents, provableCents, provableOneTimeCents, urgentCents, totalCents, estimatedCents, categoryCount, conf {high,medium,low}, stats [{value,label}], spotlight, chartCategories, provableConfidenceCents, urgencyBuckets, execSummary?, methodologyNote?`. All cents are numbers; `execSummary`/`methodologyNote` are already em-dash-scrubbed strings or undefined.
- Produces: `OverviewTab(props)`.

- [ ] **Step 1: Implement the tab (hero + summary + KPIs + spotlight + charts + trust + editorial + close)**

```tsx
// src/components/report/OverviewTab.tsx
import { AlertTriangle, FileSearch, Calculator, ScanLine, Gauge, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDollars } from "@/lib/format";
import { Spotlight, type SpotlightProps } from "./Spotlight";
import { ForensicVisuals } from "./ForensicVisuals";

const CALENDLY = "https://calendly.com/vyshag-baslix/30min";

export interface OverviewTabProps {
  brand: string;
  forwardMonthlyCents: number | null;
  provableCents: number;
  provableOneTimeCents: number;
  urgentCents: number;
  totalCents: number;
  estimatedCents: number;
  categoryCount: number;
  conf: { high: number; medium: number; low: number };
  stats: { value: string; label: string }[];
  spotlight: SpotlightProps | null;
  chartCategories: { key: string; label: string; total: number; color: string }[];
  provableConfidenceCents: { high: number; medium: number; low: number };
  urgencyBuckets: { label: string; cents: number; count: number }[];
  execSummary?: string;
  methodologyNote?: string;
}

export function OverviewTab(p: OverviewTabProps) {
  const confTotal = Math.max(p.conf.high + p.conf.medium + p.conf.low, 1);
  const hasForward = p.forwardMonthlyCents !== null && p.forwardMonthlyCents > 0;
  return (
    <div className="space-y-12">
      {/* Hero */}
      <section>
        {hasForward ? (
          <>
            <p className="font-mono text-5xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-6xl">
              {formatDollars(p.forwardMonthlyCents!)}
              <span className="ml-1 align-baseline text-2xl font-medium text-slate-400">/mo</span>
            </p>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-600">
              Amazon is overbilling {p.brand} about{" "}
              <span className="font-semibold text-slate-900">
                {formatDollars(p.forwardMonthlyCents!)} every month
              </span>{" "}
              in high-confidence, provable overcharges, and it compounds until the wrong
              referral category and size-tier are corrected.
            </p>
          </>
        ) : (
          <>
            <p className="font-mono text-5xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-6xl">
              {formatDollars(p.provableCents)}
            </p>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-600">
              Provable overcharges and missing credits we found in {p.brand}&apos;s own Seller
              Central data. Every figure below traces to a specific row.
            </p>
          </>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {p.provableOneTimeCents > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-100">
              <FileSearch className="size-3.5 stroke-[1.5]" />
              {formatDollars(p.provableOneTimeCents)} recoverable now (one-time)
            </span>
          )}
          {p.urgentCents > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-100">
              <AlertTriangle className="size-3.5 stroke-[1.5]" />
              {formatDollars(p.urgentCents)} closing within 14 days
            </span>
          )}
        </div>

        <p className="mt-5 max-w-2xl text-sm text-slate-500">
          <span className="font-semibold text-slate-700">{formatDollars(p.totalCents)}</span>{" "}
          surfaced in total across {p.categoryCount}{" "}
          {p.categoryCount === 1 ? "category" : "categories"}: {formatDollars(p.provableCents)}{" "}
          provable
          {p.estimatedCents > 0 && <>, {formatDollars(p.estimatedCents)} estimated</>} ·{" "}
          {p.conf.high} high · {p.conf.medium} medium confidence. Full forensic detail below.
        </p>
        {p.estimatedCents > 0 && (
          <p className="mt-2 max-w-2xl text-xs text-slate-400">
            The estimated figure is a flat per-item placeholder for reimbursement buckets, fenced
            in the Findings tab and <span className="font-medium">not</span> counted in the
            provable number. Amazon may have already auto-reimbursed some.
          </p>
        )}

        {/* KPI row + confidence bar */}
        <div className="mt-8 grid gap-6 border-t border-slate-200 pt-6 sm:grid-cols-[1fr_auto] sm:items-end sm:gap-10">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
            {p.stats.map((s) => (
              <div key={s.label}>
                <dt className="text-[11px] uppercase tracking-wider text-slate-400">{s.label}</dt>
                <dd className="mt-0.5 font-mono text-xl font-semibold tabular-nums text-slate-900">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="sm:w-52">
            <p className="text-[11px] uppercase tracking-wider text-slate-400">Evidence confidence</p>
            <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div className="bg-blue-600" style={{ width: `${(p.conf.high / confTotal) * 100}%` }} />
              <div className="bg-amber-400" style={{ width: `${(p.conf.medium / confTotal) * 100}%` }} />
              <div className="bg-slate-300" style={{ width: `${(p.conf.low / confTotal) * 100}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-slate-400">
              <span>{p.conf.high} high</span>
              <span>{p.conf.medium} medium</span>
              <span>{p.conf.low} review</span>
            </div>
          </div>
        </div>
      </section>

      {p.spotlight && <Spotlight {...p.spotlight} />}

      {/* Where the money is */}
      <section>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">Where the money is</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          The same evidence seen by category and by confidence.
        </p>
        <ForensicVisuals
          only="money"
          categories={p.chartCategories}
          confidenceCents={p.provableConfidenceCents}
          urgencyBuckets={p.urgencyBuckets}
          forwardMonthlyCents={p.forwardMonthlyCents}
        />
      </section>

      {/* Trust strip (inline, not boxes) */}
      <section className="grid gap-6 border-t border-slate-200 pt-8 sm:grid-cols-3">
        {[
          { icon: Calculator, h: "Recomputed, not guessed", b: "We recompute what Amazon should have charged or credited on each sale and match it against what it actually did, using only your own reports." },
          { icon: ScanLine, h: "Every figure traces to a row", b: "Each provable dollar carries the source order, SKU and date from your Seller Central data, defensible line by line, in the PDF and CSV." },
          { icon: Gauge, h: "Honest confidence", b: "High is a direct, unambiguous match. Medium is a strong signal with a legitimate exception possible. Review needs a human look before filing." },
        ].map((t) => (
          <div key={t.h}>
            <div className="flex items-center gap-2 text-slate-800">
              <t.icon className="size-4 stroke-[1.5]" />
              <p className="text-sm font-semibold">{t.h}</p>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{t.b}</p>
          </div>
        ))}
      </section>

      {p.execSummary && (
        <section className="border-l-2 border-slate-900 pl-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Executive summary
          </p>
          <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-slate-700">{p.execSummary}</p>
        </section>
      )}

      {p.methodologyNote && (
        <section className="border-t border-slate-200 pt-8">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">How we found this</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">{p.methodologyNote}</p>
        </section>
      )}

      {/* Close */}
      <section className="overflow-hidden rounded-2xl bg-slate-900 px-8 py-10 text-center text-white sm:px-10 sm:py-12">
        <ShieldCheck className="mx-auto mb-4 size-7 stroke-[1.5] text-white/70" />
        <p className="text-lg font-semibold">Every finding above is yours to file, free.</p>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
          The report is the easy part. What needs our hands is what recurs:{" "}
          {hasForward ? (
            <>
              the <span className="font-semibold text-white">{formatDollars(p.forwardMonthlyCents!)}/mo</span>{" "}
              overcharge that keeps compounding until the root cause is fixed
            </>
          ) : (
            <>the overcharge that keeps compounding until the root cause is fixed</>
          )}
          , the same leakage across every channel you sell on, and the backward claims that need
          direct access to your account to chase down.
        </p>
        <Button size="lg" variant="secondary" className="mt-6" asChild>
          <a href={CALENDLY} target="_blank" rel="noopener noreferrer">
            Talk to us: 15 minutes, no pitch deck <ArrowRight className="ml-2 size-4" />
          </a>
        </Button>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: compiles.

- [ ] **Step 3: Commit**

```bash
git add src/components/report/OverviewTab.tsx
git commit -m "Report redesign: OverviewTab (hero, KPIs, spotlight, money charts, trust, close)"
```

---

### Task 9: `FindingsTab` (filter bar + category table + drawer)

**Files:**
- Create: `src/components/report/FindingsTab.tsx`

**Interfaces:**
- Consumes: `categories: CategoryRow[]` where `CategoryRow = { category, label, color, recurring, estimated, totalCents, count, urgentCount, high, medium, low }`; `findingsByCategory: Record<string, Finding[]>`; `narratives?: Record<string,string>`; `provableCents` (for the fenced caveat copy). `Finding` is the page shape.
- Produces: `FindingsTab(props)`. Uses `ReportDrawer` + `CategoryDeepDive`.

- [ ] **Step 1: Implement the tab**

```tsx
// src/components/report/FindingsTab.tsx
"use client";

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { formatDollars } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ReportDrawer } from "./ReportDrawer";
import { CategoryDeepDive } from "./CategoryDeepDive";

interface Finding {
  id: string; rule_id: string; category: string; amount_cents: number;
  confidence: string; window_days_remaining: number | null;
  window_closes_on?: string | null; narrative_summary?: string | null;
  evidence: Record<string, unknown>;
}
export interface CategoryRow {
  category: string; label: string; color: string; recurring: boolean; estimated: boolean;
  totalCents: number; count: number; urgentCount: number; high: number; medium: number; low: number;
}
type ConfFilter = "all" | "high" | "medium" | "low";
type KindFilter = "all" | "provable" | "estimated";

export function FindingsTab({
  categories,
  findingsByCategory,
  narratives,
  provableCents,
}: {
  categories: CategoryRow[];
  findingsByCategory: Record<string, Finding[]>;
  narratives?: Record<string, string>;
  provableCents: number;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [conf, setConf] = useState<ConfFilter>("all");
  const [kind, setKind] = useState<KindFilter>("all");
  const [urgentOnly, setUrgentOnly] = useState(false);

  const rows = useMemo(
    () =>
      categories.filter((c) => {
        if (kind === "provable" && c.estimated) return false;
        if (kind === "estimated" && !c.estimated) return false;
        if (urgentOnly && c.urgentCount === 0) return false;
        if (conf === "high" && c.high === 0) return false;
        if (conf === "medium" && c.medium === 0) return false;
        if (conf === "low" && c.low === 0) return false;
        return true;
      }),
    [categories, conf, kind, urgentOnly],
  );

  const open = categories.find((c) => c.category === openKey) ?? null;
  const hasEstimated = categories.some((c) => c.estimated);

  const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors",
        active ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:ring-slate-300",
      )}
    >
      {children}
    </button>
  );

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs uppercase tracking-wider text-slate-400">Confidence</span>
        <Chip active={conf === "all"} onClick={() => setConf("all")}>All</Chip>
        <Chip active={conf === "high"} onClick={() => setConf("high")}>High</Chip>
        <Chip active={conf === "medium"} onClick={() => setConf("medium")}>Medium</Chip>
        <Chip active={conf === "low"} onClick={() => setConf("low")}>Review</Chip>
        <span className="ml-3 mr-1 text-xs uppercase tracking-wider text-slate-400">Kind</span>
        <Chip active={kind === "all"} onClick={() => setKind("all")}>All</Chip>
        <Chip active={kind === "provable"} onClick={() => setKind("provable")}>Provable</Chip>
        {hasEstimated && <Chip active={kind === "estimated"} onClick={() => setKind("estimated")}>Estimated</Chip>}
        <Chip active={urgentOnly} onClick={() => setUrgentOnly((v) => !v)}>Closing ≤14d</Chip>
      </div>

      {/* Category table */}
      <div className="mt-5 overflow-hidden rounded-xl ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-[11px] font-medium uppercase tracking-wider text-slate-400">
              <th className="px-4 py-2.5">Category</th>
              <th className="hidden px-4 py-2.5 text-right sm:table-cell">Cases</th>
              <th className="hidden px-4 py-2.5 sm:table-cell">Confidence</th>
              <th className="px-4 py-2.5 text-right">Amount</th>
              <th className="w-8 px-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((c) => (
              <tr
                key={c.category}
                tabIndex={0}
                onClick={() => setOpenKey(c.category)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpenKey(c.category))}
                className="cursor-pointer hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="font-medium text-slate-900">{c.label}</span>
                    {c.recurring && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">recurring</span>}
                    {c.estimated && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">estimated</span>}
                  </div>
                </td>
                <td className="hidden px-4 py-3 text-right font-mono tabular-nums text-slate-500 sm:table-cell">
                  {c.count.toLocaleString()}
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  <span className="text-xs text-slate-500">
                    {c.high > 0 && <span className="text-blue-600">{c.high} high</span>}
                    {c.medium > 0 && <>{c.high > 0 ? " · " : ""}<span className="text-amber-600">{c.medium} med</span></>}
                    {c.low > 0 && <>{(c.high > 0 || c.medium > 0) ? " · " : ""}{c.low} review</>}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-slate-900">
                  {formatDollars(c.totalCents)}
                </td>
                <td className="px-2 text-slate-300"><ChevronRight className="size-4" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {kind !== "provable" && hasEstimated && (
        <p className="mt-3 max-w-3xl text-xs leading-relaxed text-slate-400">
          Rows tagged <span className="font-medium text-slate-500">estimated</span> are reimbursement
          buckets valued at a flat per-item placeholder, not a row-level amount, so they are not
          counted in the {formatDollars(provableCents)} provable total. Amazon&apos;s 2024 to 2025
          auto-reimbursement may already have covered some. We confirm the real per-item value before
          filing.
        </p>
      )}

      <ReportDrawer
        open={open !== null}
        onClose={() => setOpenKey(null)}
        title={open?.label ?? ""}
        colorDot={open?.color}
      >
        {open && (
          <CategoryDeepDive
            categoryKey={open.category}
            summary={{
              count: open.count, total_cents: open.totalCents, urgent_count: open.urgentCount,
              high: open.high, medium: open.medium, low: open.low,
            }}
            findings={findingsByCategory[open.category] ?? []}
            narrative={narratives?.[open.category]}
          />
        )}
      </ReportDrawer>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: compiles. (`CategoryDeepDive` still renders its own header with label + total inside the drawer; that is intentional redundancy with the drawer title and acceptable, or remove the drawer title text later. Keep both for now.)

- [ ] **Step 3: Commit**

```bash
git add src/components/report/FindingsTab.tsx
git commit -m "Report redesign: FindingsTab (filter bar + category table + dossier drawer)"
```

---

### Task 10: `DeadlinesTab`

**Files:**
- Create: `src/components/report/DeadlinesTab.tsx`

**Interfaces:**
- Consumes: `forwardMonthlyCents, chartCategories, provableConfidenceCents, urgencyBuckets, closingSoon: ClosingSoonRow[], catLabel: (key:string)=>string, forwardNote?: boolean`.
- Produces: `DeadlinesTab(props)`. Reuses `ForensicVisuals only="urgency"` + a closing-soon table + CTA.

- [ ] **Step 1: Implement the tab**

```tsx
// src/components/report/DeadlinesTab.tsx
import { ArrowRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDollars } from "@/lib/format";
import { ForensicVisuals } from "./ForensicVisuals";
import type { ClosingSoonRow } from "./urgent-cases";

const CALENDLY = "https://calendly.com/vyshag-baslix/30min";

export function DeadlinesTab({
  forwardMonthlyCents,
  chartCategories,
  provableConfidenceCents,
  urgencyBuckets,
  closingSoon,
  catLabel,
}: {
  forwardMonthlyCents: number | null;
  chartCategories: { key: string; label: string; total: number; color: string }[];
  provableConfidenceCents: { high: number; medium: number; low: number };
  urgencyBuckets: { label: string; cents: number; count: number }[];
  closingSoon: ClosingSoonRow[];
  catLabel: (key: string) => string;
}) {
  return (
    <div className="space-y-12">
      <ForensicVisuals
        only="urgency"
        categories={chartCategories}
        confidenceCents={provableConfidenceCents}
        urgencyBuckets={urgencyBuckets}
        forwardMonthlyCents={forwardMonthlyCents}
      />

      {closingSoon.length > 0 && (
        <section>
          <div className="flex items-center gap-2 text-slate-800">
            <AlertTriangle className="size-4 stroke-[1.5] text-amber-600" />
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">
              Closing within 14 days
            </h2>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            Provable findings whose dispute window is about to close. File these first.
          </p>
          <div className="mt-5 overflow-hidden rounded-xl ring-1 ring-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5">SKU</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-4 py-2.5 text-right">Days left</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {closingSoon.slice(0, 20).map((r, i) => (
                  <tr key={`${r.sku}-${i}`} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-700">{catLabel(r.category)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{r.sku}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-900">
                      {formatDollars(r.amountCents)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums font-medium text-amber-700">
                      {r.daysRemaining}d
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {closingSoon.length > 20 && (
            <p className="mt-2 text-xs text-slate-400">
              + {(closingSoon.length - 20).toLocaleString()} more closing soon. Full detail is in the
              PDF and CSV export.
            </p>
          )}
        </section>
      )}

      <section className="rounded-2xl bg-slate-900 px-8 py-10 text-center text-white">
        <p className="text-lg font-semibold">
          {forwardMonthlyCents && forwardMonthlyCents > 0 ? (
            <>
              Left uncorrected, this keeps billing {formatDollars(forwardMonthlyCents)}/mo.
            </>
          ) : (
            <>These windows close whether or not you file.</>
          )}
        </p>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
          The call is about stopping that, not just clawing back the past.
        </p>
        <Button size="lg" variant="secondary" className="mt-6" asChild>
          <a href={CALENDLY} target="_blank" rel="noopener noreferrer">
            Book a call, 15 min <ArrowRight className="ml-2 size-4" />
          </a>
        </Button>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: compiles.

- [ ] **Step 3: Commit**

```bash
git add src/components/report/DeadlinesTab.tsx
git commit -m "Report redesign: DeadlinesTab (urgency charts + closing-soon list + CTA)"
```

---

### Task 11: `ReportShell` + wire into `page.tsx`

**Files:**
- Create: `src/components/report/ReportShell.tsx`
- Modify: `src/app/(public)/r/[uuid]/page.tsx` (replace JSX body only; keep ALL derivation)

**Interfaces:**
- Consumes: everything computed in `page.tsx`.
- Produces: `ReportShell({ model }: { model: ReportModel })`. `ReportModel` is exported and is the single prop contract between the server page and the client shell.

- [ ] **Step 1: Implement `ReportShell` with the `ReportModel` contract**

```tsx
// src/components/report/ReportShell.tsx
"use client";

import { useState } from "react";
import { ReportTopBar, type TabKey } from "./ReportTopBar";
import { OverviewTab, type OverviewTabProps } from "./OverviewTab";
import { FindingsTab, type CategoryRow } from "./FindingsTab";
import { DeadlinesTab } from "./DeadlinesTab";
import type { SpotlightProps } from "./Spotlight";
import type { ClosingSoonRow } from "./urgent-cases";

interface Finding {
  id: string; rule_id: string; category: string; amount_cents: number;
  confidence: string; window_days_remaining: number | null;
  window_closes_on?: string | null; narrative_summary?: string | null;
  evidence: Record<string, unknown>;
}

export interface ReportModel {
  brand: string;
  caseId: string;
  uuid: string;
  completedLabel: string | null;
  // hero + overview
  forwardMonthlyCents: number | null;
  provableCents: number;
  provableOneTimeCents: number;
  urgentCents: number;
  totalCents: number;
  estimatedCents: number;
  categoryCount: number;
  conf: { high: number; medium: number; low: number };
  stats: { value: string; label: string }[];
  spotlight: SpotlightProps | null;
  chartCategories: { key: string; label: string; total: number; color: string }[];
  provableConfidenceCents: { high: number; medium: number; low: number };
  urgencyBuckets: { label: string; cents: number; count: number }[];
  execSummary?: string;
  methodologyNote?: string;
  // findings
  categoryRows: CategoryRow[];
  findingsByCategory: Record<string, Finding[]>;
  categoryNarratives?: Record<string, string>;
  // deadlines
  closingSoon: ClosingSoonRow[];
  catLabelMap: Record<string, string>;
}

export function ReportShell({ model: m }: { model: ReportModel }) {
  const [tab, setTab] = useState<TabKey>("overview");
  const overview: OverviewTabProps = {
    brand: m.brand, forwardMonthlyCents: m.forwardMonthlyCents, provableCents: m.provableCents,
    provableOneTimeCents: m.provableOneTimeCents, urgentCents: m.urgentCents, totalCents: m.totalCents,
    estimatedCents: m.estimatedCents, categoryCount: m.categoryCount, conf: m.conf, stats: m.stats,
    spotlight: m.spotlight, chartCategories: m.chartCategories,
    provableConfidenceCents: m.provableConfidenceCents, urgencyBuckets: m.urgencyBuckets,
    execSummary: m.execSummary, methodologyNote: m.methodologyNote,
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700">
      <ReportTopBar
        brand={m.brand} caseId={m.caseId} uuid={m.uuid}
        recoverableNowCents={m.provableOneTimeCents} tab={tab} onTab={setTab}
      />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div role="tabpanel" id="panel-overview" aria-labelledby="tab-overview" hidden={tab !== "overview"}>
          {tab === "overview" && <OverviewTab {...overview} />}
        </div>
        <div role="tabpanel" id="panel-findings" aria-labelledby="tab-findings" hidden={tab !== "findings"}>
          {tab === "findings" && (
            <FindingsTab
              categories={m.categoryRows}
              findingsByCategory={m.findingsByCategory}
              narratives={m.categoryNarratives}
              provableCents={m.provableCents}
            />
          )}
        </div>
        <div role="tabpanel" id="panel-deadlines" aria-labelledby="tab-deadlines" hidden={tab !== "deadlines"}>
          {tab === "deadlines" && (
            <DeadlinesTab
              forwardMonthlyCents={m.forwardMonthlyCents}
              chartCategories={m.chartCategories}
              provableConfidenceCents={m.provableConfidenceCents}
              urgencyBuckets={m.urgencyBuckets}
              closingSoon={m.closingSoon}
              catLabel={(k) => m.catLabelMap[k] ?? k}
            />
          )}
        </div>
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-4 sm:px-6">
        <p className="border-t border-slate-200 pt-4 text-xs text-slate-400">
          Generated for {m.brand}
          {m.completedLabel ? ` on ${m.completedLabel}` : ""} · Case ID {m.caseId}
        </p>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Rewire `page.tsx` to build the model and render the shell**

Keep everything from the top of `ReportPage` down through the existing derivation (all the `const` computations). Then:
- Add imports at top: `import { ReportShell, type ReportModel } from "@/components/report/ReportShell";`, `import { deriveClosingSoon } from "@/components/report/urgent-cases";`, `import { stripEmDashes } from "@/lib/report/text";`.
- Remove imports no longer used by the JSX: `NavBar`, `ForensicVisuals`, `Spotlight` (types stay via ReportShell), `CategoryDeepDive`, `ReportNav`, `ReportDock`, `Button`, `Download`, `Table2`, `AlertTriangle`, `ArrowRight`, `ShieldCheck`, `FileSearch`, `Calculator`, `ScanLine`, `Gauge`, and the `SectionHeader` function, and `navSections`. (Keep `catMeta`, `formatDollars`, `REIMBURSEMENT_CATEGORIES`, `notFound`, `supabaseAdmin`.)
- Build `categoryRows` and the maps, then the model, then return the shell:

```tsx
  const estimatedCatKeys = new Set(estimatedCategories.map((c) => c.category));
  const categoryRows = categorySummaries.map((c) => ({
    category: c.category,
    label: catMeta(c.category).label,
    color: catMeta(c.category).color,
    recurring: catMeta(c.category).recurring,
    estimated: c.estimated,
    totalCents: c.total_cents,
    count: c.count,
    urgentCount: c.urgent_count ?? 0,
    high: c.high,
    medium: c.medium,
    low: c.low,
  }));
  const catLabelMap = Object.fromEntries(
    categorySummaries.map((c) => [c.category, catMeta(c.category).label]),
  );
  const closingSoon = deriveClosingSoon(typedFindings, estimatedCatKeys, 14);

  const model: ReportModel = {
    brand,
    caseId,
    uuid,
    completedLabel: typedAudit.completed_at
      ? new Date(typedAudit.completed_at).toLocaleDateString()
      : null,
    forwardMonthlyCents: forwardMonthly,
    provableCents: provable,
    provableOneTimeCents: provableOneTime,
    urgentCents,
    totalCents: total,
    estimatedCents,
    categoryCount,
    conf,
    stats,
    spotlight,
    chartCategories,
    provableConfidenceCents,
    urgencyBuckets,
    execSummary: narrative?.executive_summary
      ? stripEmDashes(narrative.executive_summary)
      : undefined,
    methodologyNote: narrative?.methodology_note
      ? stripEmDashes(narrative.methodology_note)
      : undefined,
    categoryRows,
    findingsByCategory: byCategory,
    categoryNarratives: narrative?.category_narratives
      ? Object.fromEntries(
          Object.entries(narrative.category_narratives).map(([k, v]) => [k, stripEmDashes(v)]),
        )
      : undefined,
    closingSoon,
    catLabelMap,
  };

  return <ReportShell model={model} />;
```

- [ ] **Step 3: Verify build + lint**

Run: `pnpm build && pnpm lint`
Expected: compiles clean, no unused-import warnings (they were removed in Step 2). Fix any residual unused symbol the linter flags.

- [ ] **Step 4: Commit**

```bash
git add src/components/report/ReportShell.tsx "src/app/(public)/r/[uuid]/page.tsx"
git commit -m "Report redesign: ReportShell tabs + wire page.tsx to the new model"
```

---

### Task 12: Retire `ReportNav` and `ReportDock`

**Files:**
- Delete: `src/components/report/ReportNav.tsx`, `src/components/report/ReportDock.tsx`

**Interfaces:** none produced.

- [ ] **Step 1: Confirm no remaining importers**

Run: `grep -rn "ReportNav\|ReportDock" src/`
Expected: no matches (page.tsx no longer imports them after Task 11).

- [ ] **Step 2: Delete the files**

Run: `git rm src/components/report/ReportNav.tsx src/components/report/ReportDock.tsx`

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: compiles.

- [ ] **Step 4: Commit**

```bash
git commit -m "Report redesign: retire ReportNav + ReportDock (replaced by top bar + tabs)"
```

---

### Task 13: Visual verification pass (desktop + mobile) and no-drop / no-em-dash audit

**Files:** none (verification only). Uses the running dev server and the chrome-devtools MCP (or manual browser).

**Preconditions:** a completed report UUID. Obtain one:

Run: `grep -rn "SUPABASE" .env* 2>/dev/null | head` to confirm env, then start dev.

- [ ] **Step 1: Start the dev server**

Run (background): `pnpm dev`
Then find a completed audit id (ask the user for a report URL, or if a service-role script exists, query `audits` for `status in ('completed','pending_review')`). Navigate to `http://localhost:3000/r/<uuid>`.

- [ ] **Step 2: Desktop checks (1280px)**

Verify against the spec inventory (§4):
- Top bar shows brand, case ID, recoverable $, Book a call, PDF, CSV; tab strip Overview / Findings / Deadlines.
- Overview: hero $/mo + sentence (no em dash), both chips, summary line, estimated caveat, KPI row (4) + confidence bar, Spotlight (no colored left border), both money charts (no white boxes), trust strip (3, inline), executive summary, methodology note, dark close block.
- Findings: filter chips work (confidence, provable/estimated, ≤14d); 9 category rows; clicking a row opens the drawer with the full dossier (mechanism, KPIs, evidence table + "N more", math, how-to-file, dispute draft, confidence); Escape and overlay close it; focus returns to the row.
- Deadlines: forward chart, urgency buckets, closing-within-14-days table, CTA.
- Footer: "Generated for … Case ID …".
- No element shows a colored top/left border. Grep to be sure:

Run: `grep -rn "borderTop\|borderLeft\|border-l-4\|border-t-\[3px\]" src/components/report/`
Expected: no colored-border style remains (only the ledger-spine in retired files, which are deleted).

- [ ] **Step 3: Mobile checks (375px)**

Resize to 375px. Verify: top bar collapses gracefully (labels hidden as coded), tabs scroll/fit, tables are horizontally scrollable or stack, the drawer is full-width, CTA reachable. Every screen usable at 375px.

- [ ] **Step 4: Em-dash audit across the rendered surface**

Run: `grep -rn "—" src/components/report/*.tsx "src/app/(public)/r/[uuid]/page.tsx" | grep '"'`
Expected: no em dash inside any JSX string / string literal (comments may remain). Spot-check the live page text for `—`.

- [ ] **Step 5: Full gate**

Run: `pnpm build && pnpm lint && pnpm test`
Expected: all pass, zero regressions.

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "Report redesign: verification fixes (visual + em-dash audit)"
```

---

### Task 14: Docs maintenance

**Files:**
- Modify: `.claude/rules/frontend.md`, `decisions.md`

**Interfaces:** none.

- [ ] **Step 1: Update `frontend.md`**

Rewrite the "Web reading shell" bullet (the 3-zone rail + dock description) and the "What NOT to do" exception to describe the new model: the web report is a light SaaS workspace, a sticky top app bar (identity + recoverable $ + Book-a-call + PDF/CSV) over three tabs (Overview / Findings / Deadlines), findings as a filterable category table that opens a drawer dossier. Note: no colored container borders; category color only as an 8px dot or chart bar; the PDF stays a linear light document; parity holds via shared `report_data`. Add the em-dash rule to the "What NOT to do" list: never use em dashes in customer-facing copy (en dashes for ranges are fine).

- [ ] **Step 2: Add a `decisions.md` change-log row**

Add a dated row (2026-07-07): "Web report re-cast from the 3-zone reading document into a light SaaS workspace (top app bar + Overview/Findings/Deadlines tabs + findings drawer). Overrides the P4.2 'reads like a document' lock for the WEB surface only; PDF unchanged; number parity preserved via shared `report_data`. Trigger: owner design direction. Also locks: no em dashes in customer-facing copy."

- [ ] **Step 3: Commit**

```bash
git add .claude/rules/frontend.md decisions.md
git commit -m "Report redesign: update frontend.md + decisions.md for the SaaS workspace model"
```

---

## Self-Review

**Spec coverage:** every §4 inventory item maps to a task (top bar T6; overview hero/KPIs/spotlight/money-charts/trust/exec/method/close T8; findings table + drawer dossier + estimated fence T9; deadlines charts + closing-soon + CTA T10; footer + wiring T11; retire rail/dock T12; em dashes T1 + display scrub in T11; docs T14; verification T13). No gaps.

**Placeholder scan:** no TBD/TODO; every code step shows real code; verification steps give exact commands and expected results.

**Type consistency:** `ReportModel` (T11) is the single contract; `OverviewTabProps` (T8), `CategoryRow` (T9), `ClosingSoonRow` (T2), `SpotlightProps` (existing), `TabKey` (T6) are referenced consistently. `deriveClosingSoon` signature matches its consumer in T11. `ForensicVisuals` `only` prop added in T4 is used in T8/T10.

**Known soft spots to watch during execution:** (1) the drawer redundantly shows the category label (drawer title + CategoryDeepDive header) — acceptable, can trim in T9 if it reads double; (2) `animate-in` utilities may not exist (T7 Step 3 handles the fallback); (3) obtaining a live report UUID for T13 needs the user or a DB query.
