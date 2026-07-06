// Baslix Leakage X-Ray Report — light printable-document (P4.2, LOCKED aesthetic).
// Renders the same tiered story as the web report from the precomputed `data.pdf` view
// (P4.1): provable-forward hero → spotlight → trust strip → dossiers (confidence×punch)
// → fenced estimated tier → dispute-ready cases → sell-the-system close. Every figure is
// a pre-formatted string from data-builder.ts, so web ↔ PDF numbers can never diverge.

#let data = json("report.data.json")

// Slate palette — mirrors the web report (Tailwind slate) so the two read as one document.
#let ink = rgb("#0f172a") // slate-900
#let body = rgb("#334155") // slate-700
#let muted = rgb("#64748b") // slate-500
#let faint = rgb("#94a3b8") // slate-400
#let hairline = rgb("#e2e8f0") // slate-200
#let panel = rgb("#f8fafc") // slate-50
#let amber = rgb("#b45309")

// Page setup
#set page(
  paper: "us-letter",
  margin: (x: 0.75in, y: 0.85in),
  numbering: "1 / 1",
  header: context {
    if counter(page).get().first() > 1 [
      #set text(size: 8pt, fill: faint)
      Baslix Leakage X-Ray · #data.brand_name
      #h(1fr)
      #data.pdf.subtitle
    ]
  },
)

#set text(font: "Helvetica", size: 10pt, fill: body)
#set par(leading: 0.65em, justify: false)

#show heading.where(level: 1): it => [
  #v(4pt)
  #text(size: 13pt, weight: "bold", fill: ink)[#it.body]
  #v(4pt)
  #line(length: 100%, stroke: 0.5pt + hairline)
  #v(8pt)
]

// ── Reusable pieces ─────────────────────────────────────────────
#let label(s) = text(size: 8pt, weight: "bold", fill: muted, tracking: 0.8pt)[#s]

#let ledger(rows) = {
  for m in rows [
    #text(
      size: 8.5pt,
      fill: if m.emphasis { ink } else { muted },
      weight: if m.emphasis { "bold" } else { "regular" },
    )[#m.label]
    #h(1fr)
    #text(size: 8.5pt, weight: "bold", fill: ink)[#m.value]
    #linebreak()
  ]
}

#let trustcell(title, text_body) = [
  #text(size: 9pt, weight: "bold", fill: ink)[#title]
  #v(3pt)
  #text(size: 8pt, fill: muted)[#text_body]
]

#let dossier(cat) = block(
  breakable: false,
  width: 100%,
  inset: 11pt,
  radius: 4pt,
  stroke: if cat.estimated {
    (paint: hairline, thickness: 0.5pt, dash: "dashed")
  } else {
    (top: 2pt + rgb(cat.color), rest: 0.5pt + hairline)
  },
)[
  #text(size: 11pt, weight: "bold", fill: ink)[#cat.display_name]
  #if cat.recurring [
    #h(5pt)
    #box(fill: rgb("#fef3c7"), inset: (x: 4pt, y: 1pt), radius: 2pt)[
      #text(size: 6.5pt, weight: "bold", fill: amber)[RECURRING]
    ]
  ]
  #h(1fr)
  #text(size: 11pt, weight: "bold", fill: ink)[#cat.total]

  #v(3pt)
  #text(size: 8pt, fill: muted)[
    #str(cat.count) case#if cat.count != 1 [s] · #cat.confidence_line#if cat.urgent_count > 0 [ · #str(cat.urgent_count) closing within 14 days]
  ]

  #v(6pt)
  #text(size: 9pt, fill: body)[#if cat.narrative != none { cat.narrative } else { cat.mechanism }]

  #if cat.math != none [
    #v(9pt)
    #label("THE MATH, SHOWN")
    #v(3pt)
    #text(size: 8pt, fill: muted)[#cat.math.formula]
    #v(4pt)
    #ledger(cat.math.rows)
  ]

  #v(9pt)
  #label("HOW TO FILE IT")
  #v(3pt)
  #text(size: 8.5pt, fill: body)[#cat.file_path]
  #v(3pt)
  #text(size: 8pt, fill: muted)[*Window:* #cat.dispute_window]

  #v(9pt)
  #label("CONFIDENCE & WHY")
  #v(3pt)
  #text(size: 8.5pt, fill: body)[#cat.confidence_why]
]

// ── Cover Page ──────────────────────────────────────────────────
#page(numbering: none, header: none)[
  #v(1.5in)
  #align(center)[
    #text(size: 11pt, fill: muted, weight: "bold", tracking: 2.5pt)[BASLIX LEAKAGE X-RAY]

    #v(0.35in)

    #text(size: 26pt, weight: "bold", fill: ink)[#data.brand_name]

    #v(0.1in)

    #text(size: 12pt, fill: muted)[#data.pdf.subtitle]

    #v(0.4in)
    #line(length: 28%, stroke: 0.5pt + hairline)
    #v(0.4in)

    // HERO — the provable-forward monthly run-rate (not the big total).
    #text(size: 42pt, weight: "bold", fill: ink)[
      #data.pdf.hero_amount#if data.pdf.hero_is_forward [#text(size: 18pt, fill: muted, weight: "regular")[ /mo]]
    ]

    #v(0.2in)

    #block(width: 70%)[
      #align(center)[
        #text(size: 11pt, fill: body)[#data.pdf.hero_headline]
      ]
    ]

    #v(0.25in)

    #if data.pdf.urgent != none [
      #text(size: 10.5pt, fill: amber, weight: "bold")[#data.pdf.urgent closing within 14 days]
      #v(0.12in)
    ]

    #block(width: 74%)[
      #align(center)[
        #text(size: 9.5pt, fill: muted)[#data.pdf.surfaced_line]
      ]
    ]

    #v(1in)

    #text(size: 8.5pt, fill: faint)[Generated #data.generated_at.slice(0, 10) · baslix.com]
  ]
]

// ── The sharpest finding (spotlight) ────────────────────────────
#if data.pdf.spotlight != none [
  #let s = data.pdf.spotlight
  #block(
    width: 100%,
    inset: 12pt,
    radius: 4pt,
    fill: panel,
    stroke: (left: 3pt + rgb(s.color), rest: 0.5pt + hairline),
  )[
    #label("THE SHARPEST FINDING")
    #if s.confidence == "high" [
      #h(5pt)
      #box(fill: ink, inset: (x: 4pt, y: 1pt), radius: 2pt)[
        #text(size: 6.5pt, weight: "bold", fill: white)[HIGH CONFIDENCE]
      ]
    ]
    #h(1fr)
    #text(size: 8pt, fill: muted)[#s.display_name]

    #v(6pt)
    #text(size: 11.5pt, fill: ink)[#s.claim]

    #v(9pt)
    #ledger(s.math_rows)

    #v(6pt)
    #text(size: 8pt, fill: muted)[Traces to #s.trace_label #raw(s.trace_value) in your own Seller Central data — verify it line by line.]
  ]
  #v(12pt)
]

// ── Why you can trust this (trust strip) ────────────────────────
#grid(
  columns: (1fr, 1fr, 1fr),
  gutter: 12pt,
  trustcell(
    "Recomputed, not guessed",
    "We recompute what Amazon should have charged or credited on each sale and match it against what it actually did — using only your own reports.",
  ),
  trustcell(
    "Every figure traces to a row",
    "Each provable dollar carries the source order, SKU and date from your Seller Central data — defensible line by line.",
  ),
  trustcell(
    "Honest confidence",
    "High = direct, unambiguous match · medium = strong signal, exception possible · review = human look before filing.",
  ),
)

#v(6pt)

// ── Executive Summary ───────────────────────────────────────────
#heading(level: 1)[Executive Summary]
#text(size: 9.5pt, fill: body)[#data.narrative.executive_summary]

// ── The findings, in detail (provable, confidence×punch order) ──
#heading(level: 1)[The findings, in detail]
#for cat in data.pdf.provable_categories [
  #dossier(cat)
  #v(9pt)
]

// ── Estimated tier — fenced, excluded from the provable hero ────
#if data.pdf.estimated_categories.len() > 0 [
  #heading(level: 1)[Estimated — needs confirmation]
  #text(size: 9pt, fill: muted)[#data.pdf.estimated_note]
  #v(8pt)
  #for cat in data.pdf.estimated_categories [
    #dossier(cat)
    #v(9pt)
  ]
]

// ── Appendix: dispute-ready cases ───────────────────────────────
#pagebreak()
#heading(level: 1)[Appendix: Dispute-Ready Cases]
#text(size: 8.5pt, fill: muted)[The sharpest individual rows, each with a copy-ready dispute draft. Every case traces to a specific order or SKU in your own reports.]
#v(8pt)

#for case in data.top_cases [
  #block(
    width: 100%,
    inset: 10pt,
    stroke: 0.5pt + hairline,
    radius: 3pt,
    breakable: false,
  )[
    #text(weight: "bold", size: 9.5pt, fill: ink)[Case ##str(case.rank)]
    #h(8pt)
    #text(size: 8.5pt, fill: muted)[#case.category · #case.sku]
    #h(1fr)
    #text(weight: "bold", size: 11pt, fill: ink)[#case.amount]

    #v(4pt)
    #text(size: 8pt, fill: muted)[
      Order: #case.order_id #h(12pt) Confidence: #case.confidence #h(12pt)
      #if case.days_remaining != none [
        #text(fill: if case.days_remaining < 14 { amber } else { muted })[#str(case.days_remaining) days remaining]
      ] else [
        No hard deadline (recurring)
      ]
    ]

    #if case.dispute_draft != none [
      #v(6pt)
      #block(width: 100%, inset: 8pt, fill: panel, radius: 2pt)[
        #text(size: 7.5pt, weight: "bold", fill: ink)[Draft dispute: #case.dispute_draft.subject]
        #v(3pt)
        #text(size: 7.5pt, fill: body)[#case.dispute_draft.body]
      ]
    ]
  ]
  #v(6pt)
]

// ── Methodology ─────────────────────────────────────────────────
#heading(level: 1)[Methodology]
#text(size: 8.5pt, fill: body)[#data.narrative.methodology_note]

// ── Sell the system (close) ─────────────────────────────────────
#pagebreak()
#align(center)[
  #v(1in)
  #block(
    width: 82%,
    inset: 20pt,
    stroke: 1pt + ink,
    radius: 6pt,
  )[
    #text(size: 14pt, weight: "bold", fill: ink)[
      Every finding above is yours to file, free.
    ]

    #v(10pt)

    #text(size: 10pt, fill: body)[
      The report is the easy part. What needs our hands is what recurs:
      #if data.pdf.recurring_monthly != none [
        the *#data.pdf.recurring_monthly\/mo* overcharge that keeps compounding until the
        root cause is fixed,
      ] else [
        next month's overcharge before it compounds,
      ]
      the same leakage across every channel you sell on, and the backward claims that need
      direct access to your account to chase down.
    ]

    #v(12pt)

    #text(size: 11pt, weight: "bold", fill: ink)[
      #link("https://calendly.com/vyshag-baslix/30min")[Talk to us: 15 minutes, no pitch deck]
    ]

    #v(4pt)

    #text(size: 9pt, fill: muted)[calendly.com/vyshag-baslix/30min]
  ]

  #v(1in)

  #text(size: 8pt, fill: faint)[
    Generated by Baslix Leakage X-Ray. All findings are based on the Seller Central data you
    provided and are backed by row-level evidence from your own reports.
  ]
]
