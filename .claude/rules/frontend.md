---
paths: ["src/components/**", "src/app/**/*.tsx", "src/app/**/*.ts"]
---

# Frontend rules

## Aesthetic direction

The X-Ray product surface feels like a premium financial tool, not a SaaS dashboard. Dark, focused, typographically strong. Reference points: Linear, Vercel, Anthropic Console. Never Shopify-admin, never marketing-page gradient soup.

- **Base background:** near-black `hsl(0 0% 3.9%)` — never pure `#000`
- **Foreground text:** `hsl(0 0% 98%)` for primary, `hsl(0 0% 63%)` for secondary, `hsl(0 0% 45%)` for tertiary
- **Border/divider:** `hsl(0 0% 14.5%)` — subtle, not assertive
- **Accent:** reserved, used only for CTAs and headline recoverable $. Everything else is neutral.
- **Typography:** Geist Sans for body, Geist Mono for numbers. Financial figures always in tabular-nums.
- **Max content width:** 1100px. Never edge-to-edge layouts.
- **Cards:** glass-subtle — `bg-card/50` with `backdrop-blur` and 1px border, not heavy shadows.

### Exception — the report surface is a light printable document (LOCKED, P4.2)

The dark near-black direction above governs the **product** surfaces (landing, start, upload, processing, admin). The **report deliverable** — the web report at `src/app/(public)/r/[uuid]/` **and** the PDF (`templates/report.typ` + `src/lib/pdf/react-pdf-render.tsx`) — is a deliberate, locked exception: a **light printable document** (Vyshag, 2026-07-05; report-killer-plan §3 Q4). Rationale: the report is a forensic audit a Controller downloads, prints, and forwards to a CFO — it must read like a document, not a dashboard. Do **not** migrate the report to near-black.

- **Report palette (web + PDF share it, so they read as one document):** slate — ink `#0f172a`, body `#334155`, muted `#64748b`, faint `#94a3b8`, hairline `#e2e8f0`, panel `#f8fafc`. Web uses the Tailwind `slate-*` scale; the PDF (`react-pdf-render.tsx` constants + `report.typ` `#let`s) uses the same hexes verbatim.
- **Category accents:** the CVD-validated hues in `src/components/report/category-meta.ts` (`CategoryMeta.color`) are the single source — web charts/cards and both PDF renderers all read from it, so a category is the same color everywhere.
- **Web ↔ PDF parity:** both render the **same tiered story** from the single precomputed `report_data.pdf` view (`data-builder.ts`) — provable-forward hero → spotlight → trust strip → dossiers (confidence×punch) → fenced estimated tier → dispute-ready cases → sell-the-system close. Every figure is a pre-formatted string from `data-builder`, so no number can drift between surfaces.
- **Web reading shell (2026-07-07, Vyshag — supersedes "one scrolling page"):** the **web** report is wrapped in a premium 3-zone reading shell on `xl+` — a left scroll-spy ledger rail (`ReportNav.tsx`: numbered contents, collapsible category submenus with running $) and a right sticky action dock (`ReportDock.tsx`: recoverable-now + CTA/PDF/CSV), on a flat slate desk (no gradient blobs; solid-white hairline panels). This chrome is **web-only and `print:hidden`**; the **PDF/print deliverable stays a single linear document**, and `data-builder.ts` + both PDF renderers are untouched, so parity holds. See decisions.md 2026-07-07.

## Component patterns

- Functional components, TypeScript strict, named exports (except `page.tsx` which uses default).
- Mobile-first. Every screen usable at 375px. Upload page must work on a phone.
- Use shadcn/ui primitives first, Launch UI blocks for landing, custom only when neither fits.
- Use Motion (Framer Motion) sparingly. Fade/slide on route change is fine. No scroll-triggered parallax. No bouncing.
- Extract a reusable component only after 3+ uses. Inline the first two.
- Never use inline styles. Tailwind only.
- Icons: Lucide. Consistent stroke width (`stroke-[1.5]`).

## Data display

- **Monetary values:** use `formatDollars(cents)` from `@/lib/format`. Never interpolate `${amount / 100}` inline.
- **Confidence badges:** high = neutral-accent, medium = muted yellow, low = muted — never alarming red/green that reads as pass/fail. These are probabilities, not verdicts.
- **Urgency windows:** `<14 days` gets a subtle pulse + warmer tone. `<7 days` is more urgent but still not panic-red. Controllers trust calm tools.
- **Long numbers:** always `Intl.NumberFormat` with thousands separators and `style: "currency"` at the boundary.

## Accessibility

- All interactive elements keyboard-navigable.
- Color contrast AA minimum (verified in dev with Tailwind's `contrast` utility tests).
- Progress states announced via `aria-live="polite"` on the processing page.
- Focus states always visible (don't `outline: none` without a replacement).

## Forms

- React Hook Form + Zod resolver. No state-managed-by-hand forms.
- Errors shown inline under the field, in a muted warning tone. Never a toast.
- Submit buttons show loading state via a disabled + spinner; never disappear.
- Client-side validation first; server errors handled with consistent shape.

## Streaming UI

- Processing page uses `useRealtimeRun()` from `@trigger.dev/react-hooks`.
- Stage labels come from `metadata.stage` written by the worker. Do not hard-code stage names in the UI — they must match what the worker emits.
- Show real numbers ("Cross-referencing 12,884 customer returns...") not vague phrases ("Processing your data..."). The whole point is to make the work visible.

## What NOT to do

- No SaaS-style sidebars, tabs, or navigation on the **funnel** pages (landing, start, upload, processing). **Exception (2026-07-07, Vyshag):** the **web report** is a premium 3-zone reading shell — a left scroll-spy ledger rail + a right sticky action dock around the document (`ReportNav`/`ReportDock`), web-only and `print:hidden`. The PDF/print deliverable stays a single linear document. See the Exception section above.
- No modals or popups on the landing or report page. No newsletter captures, no exit intents.
- No "Loading..." text. Use skeleton shimmers matching the final layout.
- No animated counters on the headline $. The number appears, period. Trust survives on stillness.
- No marketing gradients. Keep it monochrome with a single reserved accent.
