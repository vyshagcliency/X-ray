# Report UI Redesign: Settlement Truth as a light SaaS workspace

Date: 2026-07-07
Owner: Vyshag
Status: Approved design, ready for implementation plan
Scope: WEB report only (`src/app/(public)/r/[uuid]/` + `src/components/report/**`). The PDF, `data-builder.ts`, and all number logic are untouched.

## 1. Problem

The web report reads as "AI-generated UI" and feels like a long page. Three concrete causes, all presentational:

1. A colored border per container (`borderTop: 3px solid {category.color}` on every `CategoryDeepDive`, `borderLeft: 4px solid {category.color}` on `Spotlight`). Nine dossiers each wearing a different colored edge is the rainbow-card tell.
2. Every section is the identical white box: `rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px...]`. Around 15 equal-weight boxes stacked vertically read as a template and create the "long" feeling.
3. Nothing is progressively disclosed. Five numbered sections, four charts, then 9 fully expanded dossiers are all on screen at once.

## 2. Decision (locked with the user, 2026-07-07)

Re-cast the web report as a **modern, light SaaS workspace**: a persistent top app bar and three tabs, with findings as a filterable category table that drills into a drawer. This knowingly overrides the prior "web report reads like a document, not a dashboard" lock (P4.2 / frontend.md) for the WEB surface only. The PDF stays a linear light document; parity is protected because every number still comes from the same `report_data`.

Two global constraints from the user:
- **No detail dropped.** This is a relocation of content, not a trim. See the inventory in section 4.
- **No em dashes** (`—`) anywhere in customer-facing copy. They read as AI. Rewrite to commas / colons / periods without losing meaning. See section 7.

## 3. Information architecture: the persuasion arc

The report is a sales instrument (the audit is bait, recovery is the paid product). The arc maps to three tabs so the wow is never buried:

| Tab | Job | Carries |
|---|---|---|
| Overview | See it (the pitch, self-sufficient on one screen) | Hero claim, chips, summary line + estimated caveat, KPI stat row + confidence bar, sharpest finding, "where the money is" charts, trust strip, executive summary, methodology note, the full close CTA |
| Findings | Verify it (the evidence) | Filter bar over a 9-row category table; each row drills into a drawer with the full dossier |
| Deadlines | Act on it (urgency) | Forward-compounding chart, time-sensitive-dollars buckets, a closing-within-14-days case list, an urgency-framed CTA |

### Persistent chrome (replaces the left rail + right dock)
A sticky top app bar, present on every tab:
- Left: Baslix mark, "Settlement Truth Audit", brand, case ID.
- Right: `{recoverable now}` figure, **Book a call** (primary), PDF, CSV.
- Below the bar: the tab strip (Overview / Findings / Deadlines).

A slim global footer under the tab content carries the "Generated for {brand} on {date} · Case ID {caseId}" line.

The existing `ReportNav` (left scroll-spy ledger) and `ReportDock` (right action dock) retire. They only ever made sense for a single long scroll.

## 4. Content inventory: every current element and where it lands (no-drop guarantee)

Current report content on the left, its new home on the right. Nothing is removed.

### Overview section (current 01)
- Eyebrow "Settlement Truth Audit · brand · caseId" -> top app bar identity.
- Hero `$230/mo` + "/mo" + plain-English sentence (forward run-rate), with the provable-total fallback for legacy audits -> Overview hero. (Copy rewritten to drop em dash.)
- Chips "{recoverable now} recoverable now (one-time)", "{urgent} closing within 14 days" -> Overview hero.
- Summary line "{total} surfaced in total across N categories, {provable} provable, {estimated} estimated · H high · M medium confidence." -> Overview, under hero. (Em dash removed.)
- Estimated caveat "The estimated figure is a flat per-item placeholder..." -> Overview, under summary. (Em dash removed.)
- Inline mobile actions (Talk to us / PDF / CSV) -> top app bar (persistent on all widths).
- KPI strip (Findings / Categories / SKUs affected / High confidence) -> Overview KPI row.
- Confidence bar (H high / M medium / L review) -> Overview, beside KPI row.
- Spotlight "The sharpest finding" (headline + math-shown boxes + trace line) -> Overview, de-boxed (no colored left border).
- Trust strip (Recomputed not guessed / Every figure traces to a row / Honest confidence) -> Overview, as an inline three-up, not three boxes.
- Executive summary (narrative) -> Overview, editorial passage.

### Where the money is (current 02)
- Forward-compounding area chart (title, subtitle, endpoint label, footnote) -> Deadlines (it is an urgency argument), also referenced on Overview via the run-rate hero.
- Category bar chart ("Where the money is", ordered by confidence x punch) -> Overview "where the money is".
- Confidence x dollars bar chart ("How solid is each dollar?") -> Overview "where the money is".
- Urgency buckets bar chart ("Time-sensitive dollars") -> Deadlines.

All four charts keep their titles, subtitles, footnotes, and colors. They lose only the `ChartCard` white-box wrapper.

### The findings (current 03) and Estimated (current 04)
- Per-category `CategoryDeepDive` for each provable category (currently 7) and each estimated category (currently 2). Every part is preserved inside the drawer:
  - Header: color dot, label, `recurring` badge, mechanism/narrative, total `$`, case count.
  - KPI strip (per-category, 3 to 4 KPIs from the `DETAIL`/`FALLBACK` config).
  - Evidence table (up to 8 rows) plus the "+ N more cases in this category. Full detail is in the PDF and CSV export." line.
  - "The math, shown" (formula + worked-from-largest-case + math boxes).
  - "How to file it" (file path, window, urgent-count note).
  - Copy-ready dispute draft (`DisputeDraftBlock`).
  - "Confidence & why" (badges + explanation).
- The estimated tier's fenced intro paragraph ("These reimbursement buckets are... not counted in the {provable} above...") -> shown in the Findings tab when estimated rows are present (a note above/within the estimated group), and reinforced in the drawer for estimated categories. Estimated rows are visually tagged "estimated" and are excluded from the provable totals exactly as today.

### How we found this (current 05)
- Methodology note (narrative) -> Overview, closing editorial block ("How we found this").
- "Generated for {brand} on {date} · Case ID {caseId}" -> global footer.
- Close CTA block ("Every finding above is yours to file, free." + paragraph + "Talk to us: 15 minutes, no pitch deck") -> end of Overview (full block). Deadlines ends with a shorter, urgency-framed CTA. The top-bar "Book a call" covers conversion globally.

### Chrome
- `NavBar` -> replaced by the report top app bar.
- `ReportNav` (case file, numbered contents, category submenus with running `$`) -> the tab strip plus the Findings category table together cover this; the running per-category `$` lives in the Findings table rows. Retire the component.
- `ReportDock` (recovery `$`, urgent chip, Book a call, PDF, CSV, forward note) -> top app bar (recovery `$`, CTA, PDF, CSV); the forward note moves to Deadlines.

### New (additive, uses only existing real data)
- Deadlines "closing within 14 days" case list: built from the already-fetched provable findings where `window_days_remaining` is between 0 and 14, sorted ascending, showing category, SKU, amount, days left. No invented numbers; all fields are real finding columns. Kept provable-only so it reconciles with the hero urgency figure.

## 5. Design language (killing the AI tells)

- **No colored container borders anywhere.** Delete the `borderTop`/`borderLeft` inline accent styles. Category color survives only as an 8px dot and as chart bars.
- **Retire the uniform white-box stack.** Hierarchy comes from typography, dividers, and whitespace. Most content sits directly on a soft slate canvas (`slate-50`), unboxed. Only genuinely elevated, interactive surfaces get one restrained panel treatment: the drawer, the filter/table container, the top bar. One shadow token, hairline borders, no rainbow of edges.
- **Typography does the hierarchy.** Strong mono tabular display numbers, small-caps tracked section labels, slate-600 body. Editorial, not boxy.
- **One reserved accent** (refined blue) for the CTA and the recoverable figure only. Category hues appear only in charts and the 8px dots.
- **Palette stays the locked slate scale** (ink `#0f172a`, body `#334155`, muted `#64748b`, faint `#94a3b8`, hairline `#e2e8f0`, panel `#f8fafc`). Light. Category accents from `category-meta.ts` remain the single source.
- **Motion, sparingly** (per frontend.md): tab crossfade, drawer slide. No parallax, no counters on the headline number.
- **Density:** compact stat row, tighter vertical rhythm. Tabs remove the scroll.

The `frontend-design` skill guides typographic and aesthetic execution; the `dataviz` skill governs the charts (thin marks, recessive grid, direct labels, no animation, the CVD-validated category hues).

## 6. Component plan

- `page.tsx` (server): keeps ALL data loading and derivation (the reconciled `report_data` reads, pagination, provable-vs-estimated fencing, `navSections` becomes unnecessary). Computes props and renders a new client `ReportShell`. No number logic changes.
- New `ReportShell` (client): holds shadcn `Tabs`, renders the top app bar, the three tab panels, and the footer. Owns tab state.
- New `ReportTopBar`: identity + recoverable `$` + Book a call + PDF + CSV, sticky.
- New `OverviewTab`: hero, chips, summary, KPI row + confidence bar, `Spotlight`, "where the money is" charts, trust strip, executive summary, methodology note, close CTA.
- New `FindingsTab`: filter bar (confidence, provable/estimated, closing 14d) + category table + `Sheet` drawer. Renders the refactored dossier as the drawer body.
- New `DeadlinesTab`: forward chart, urgency buckets chart, closing-within-14-days case list, urgency CTA.
- Refactor `CategoryDeepDive` -> a de-boxed, de-bordered dossier body suitable for the drawer (drop the outer `section` card and the `borderTop`).
- Refactor `Spotlight` -> drop the colored left border and the card chrome; render on the canvas.
- Refactor `ForensicVisuals` -> drop the `ChartCard` white-box wrapper; charts sit on the canvas with a title/subtitle. Keep chart internals.
- Retire `ReportNav`, `ReportDock`. Retire the local `NavBar` usage on this page.
- Reuse unchanged: `category-meta.ts` (colors + text, text scrubbed of em dashes), `finding-math.ts` (text scrubbed), `DisputeDraftBlock`, `UrgencyChart` (if still used).
- New shadcn primitives to add if missing: `Tabs`, `Sheet`. Verify presence first (`src/components/ui/`).

## 7. Em-dash removal

Global rule: no `—` in customer-facing copy. Scope of edits (all re-render to existing reports; none touch the PDF structure):

- Static UI copy in `page.tsx` (hero sentence, summary line, estimated caveat), the section subtitles, the trust-strip copy, the close block.
- `category-meta.ts` string fields: `mechanism`, `disputeWindow`, `confidenceWhy`, `filePath` (the string literals only; code comments can keep em dashes but will be cleaned opportunistically where touched).
- `finding-math.ts` `formula` text.
- New component copy: authored em-dash-free from the start.
- Baked narrative in `report_data` (`executive_summary`, `category_narratives`, `methodology_note`) is generated by `narrate.ts` and stored, so editing `narrate.ts` only reaches NEW audits. To remove em dashes from existing reports on the web without a re-run, add a small display-boundary scrub (replace `—`/` — ` with `, ` or `. `) applied to narrative strings at render in the web report only. The PDF is not touched. Fixing `narrate.ts` at the source is a follow-up outside this UI task.
- Verify whether `category-meta.ts` / `finding-math.ts` text is consumed by the PDF renderers before editing; if so, the copy edits are still desirable (em-dash-free everywhere) and do not change document structure, so they are safe, but confirm the change is intentional for the PDF too.

## 8. What does not change

- `src/lib/pdf/**`, `templates/report.typ`, `src/lib/pdf/data-builder.ts`: untouched. PDF stays a linear light document.
- All number derivation in `page.tsx`: untouched (provable/estimated fencing, urgency counting, pagination, reconciliation with `report_data`).
- Detection, LLM, and pipeline code: untouched.
- Because the page re-renders from stored `report_data`, every existing report gets the new UI immediately, with no worker redeploy and no re-run.

## 9. Accessibility

- Tabs: shadcn `Tabs` is keyboard-navigable and ARIA-correct out of the box. Preserve focus management.
- Drawer (`Sheet`): focus trap, Escape to close, restore focus to the triggering row. On mobile the drawer is a full-height sheet.
- Filter controls: real buttons/toggles, keyboard operable, visible focus states.
- Contrast AA on the slate palette (already the locked scale). Category dots are decorative; never the only signal (labels always present).

## 10. Doc maintenance (part of this work)

- Update `.claude/rules/frontend.md`: the "web report = 3-zone reading shell, no SaaS sidebars/tabs" rule is superseded by the tabbed workspace. Rewrite the affected lines.
- Add a `decisions.md` change-log row (2026-07-07): web report re-cast as a light SaaS workspace, overriding the P4.2 "reads like a document" lock for the WEB surface; PDF unchanged; parity preserved via shared `report_data`.
- No change to `prd.md` / `userstories.md` (frozen); if any acceptance criterion is affected, capture the deviation in `decisions.md`.

## 11. Risks and tradeoffs

- Diverges the web report from the PDF more than the original model intended. Accepted by the user. Trust is preserved because numbers share one source.
- A tabbed app can weaken one-scroll persuasion; countered by making Overview self-sufficient (it carries the full pitch and the close) and keeping the CTA persistent.
- The Deadlines "closing within 14 days" list is new; must stay provable-only and derive strictly from real finding fields to avoid any figure that is not already in the report.
- Em-dash scrub must not alter meaning or numbers; it is punctuation-only.

## 12. Out of scope

- Any change to the PDF or its data builder.
- Fixing `narrate.ts` at the source (follow-up).
- Dark mode (the report stays light).
- New detection rules or data.
