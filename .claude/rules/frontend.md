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

- No SaaS-style sidebars, tabs, or navigation on user-facing pages. One scrolling report page.
- No modals or popups on the landing or report page. No newsletter captures, no exit intents.
- No "Loading..." text. Use skeleton shimmers matching the final layout.
- No animated counters on the headline $. The number appears, period. Trust survives on stillness.
- No marketing gradients. Keep it monochrome with a single reserved accent.
