import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Link,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { ensurePdfView, type ReportData, type PdfCategory, type PdfMathRow } from "./data-builder";

// Light printable-document (P4.2). Slate palette mirrors the web report + the Typst
// template, and every string is the precomputed `data.pdf` view (P4.1) — so this
// renderer, the Typst renderer and the web report all tell one reconciled tiered story.
const INK = "#0f172a";
const BODY = "#334155";
const MUTED = "#64748b";
const FAINT = "#94a3b8";
const HAIRLINE = "#e2e8f0";
const PANEL = "#f8fafc";
const AMBER = "#b45309";

const styles = StyleSheet.create({
  page: { padding: 46, fontFamily: "Helvetica", fontSize: 10, color: BODY },
  coverPage: {
    padding: 50,
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "Helvetica",
  },
  brandLabel: {
    fontSize: 11,
    color: MUTED,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2.5,
    marginBottom: 24,
  },
  brandName: { fontSize: 26, fontFamily: "Helvetica-Bold", color: INK, marginBottom: 6 },
  subtitle: { fontSize: 12, color: MUTED, marginBottom: 26 },
  rule: { width: 120, borderBottom: `0.5pt solid ${HAIRLINE}`, marginBottom: 26 },
  hero: { fontSize: 42, fontFamily: "Helvetica-Bold", color: INK },
  heroUnit: { fontSize: 18, color: MUTED },
  heroHeadline: {
    fontSize: 11,
    color: BODY,
    textAlign: "center",
    maxWidth: 380,
    marginTop: 14,
    lineHeight: 1.5,
  },
  urgentLine: { fontSize: 10.5, color: AMBER, fontFamily: "Helvetica-Bold", marginTop: 16 },
  surfacedLine: {
    fontSize: 9.5,
    color: MUTED,
    textAlign: "center",
    maxWidth: 400,
    marginTop: 14,
    lineHeight: 1.5,
  },
  generatedAt: { fontSize: 8.5, color: FAINT, marginTop: 60 },

  h1: { fontSize: 13, fontFamily: "Helvetica-Bold", color: INK, marginTop: 18, marginBottom: 4 },
  h1rule: { borderBottom: `0.5pt solid ${HAIRLINE}`, marginBottom: 8 },
  sectionLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: MUTED,
    letterSpacing: 0.8,
    marginTop: 9,
    marginBottom: 3,
  },
  body: { fontSize: 9.5, lineHeight: 1.5, color: BODY },

  spotlight: {
    borderLeft: "3pt solid",
    border: `0.5pt solid ${HAIRLINE}`,
    backgroundColor: PANEL,
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
  },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  claim: { fontSize: 11.5, color: INK, marginTop: 6, lineHeight: 1.45 },
  trace: { fontSize: 8, color: MUTED, marginTop: 6 },
  badge: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    backgroundColor: INK,
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 2,
    marginLeft: 5,
  },
  recurringBadge: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: AMBER,
    backgroundColor: "#fef3c7",
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 2,
    marginLeft: 5,
  },

  trustStrip: { flexDirection: "row", gap: 12, marginTop: 6, marginBottom: 4 },
  trustCell: { flex: 1 },
  trustTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: INK, marginBottom: 3 },
  trustBody: { fontSize: 8, color: MUTED, lineHeight: 1.45 },

  dossier: { borderRadius: 4, padding: 11, marginBottom: 9 },
  catName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: INK },
  catTotal: { fontSize: 11, fontFamily: "Helvetica-Bold", color: INK },
  catMeta: { fontSize: 8, color: MUTED, marginTop: 3 },
  catNarrative: { fontSize: 9, color: BODY, marginTop: 6, lineHeight: 1.45 },
  formula: { fontSize: 8, color: MUTED },
  ledgerRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  ledgerLabel: { fontSize: 8.5, color: MUTED },
  ledgerLabelEmph: { fontSize: 8.5, color: INK, fontFamily: "Helvetica-Bold" },
  ledgerValue: { fontSize: 8.5, color: INK, fontFamily: "Helvetica-Bold" },
  fileBody: { fontSize: 8.5, color: BODY, lineHeight: 1.45 },
  windowLine: { fontSize: 8, color: MUTED, marginTop: 3 },

  estimatedNote: { fontSize: 9, color: MUTED, lineHeight: 1.5, marginBottom: 8 },

  caseCard: { border: `0.5pt solid ${HAIRLINE}`, borderRadius: 3, padding: 10, marginBottom: 6 },
  caseHeader: { flexDirection: "row", alignItems: "center" },
  caseRank: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: INK },
  caseCat: { fontSize: 8.5, color: MUTED, marginLeft: 8, flex: 1 },
  caseAmount: { fontSize: 11, fontFamily: "Helvetica-Bold", color: INK },
  caseMeta: { fontSize: 8, color: MUTED, marginTop: 3 },
  draftBox: { backgroundColor: PANEL, padding: 8, borderRadius: 2, marginTop: 6 },
  draftLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: INK },
  draftBody: { fontSize: 7.5, color: BODY, marginTop: 3, lineHeight: 1.4 },

  ctaBox: { border: `1pt solid ${INK}`, borderRadius: 6, padding: 20, marginTop: 40, alignItems: "center", width: "82%" },
  ctaTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: INK, textAlign: "center" },
  ctaBody: { fontSize: 10, color: BODY, textAlign: "center", marginTop: 10, lineHeight: 1.5 },
  ctaCta: { fontSize: 11, fontFamily: "Helvetica-Bold", color: INK, textAlign: "center", marginTop: 12 },
  ctaUrl: { fontSize: 9, color: MUTED, textAlign: "center", marginTop: 4 },
  footer: { fontSize: 8, color: FAINT, textAlign: "center", marginTop: 40, maxWidth: 380 },
});

function Ledger({ rows }: { rows: PdfMathRow[] }) {
  return (
    <View>
      {rows.map((m, i) => (
        <View key={i} style={styles.ledgerRow}>
          <Text style={m.emphasis ? styles.ledgerLabelEmph : styles.ledgerLabel}>{m.label}</Text>
          <Text style={styles.ledgerValue}>{m.value}</Text>
        </View>
      ))}
    </View>
  );
}

function Dossier({ cat }: { cat: PdfCategory }) {
  const cardStyle = cat.estimated
    ? { ...styles.dossier, border: `0.5pt dashed ${HAIRLINE}` }
    : { ...styles.dossier, border: `0.5pt solid ${HAIRLINE}`, borderTop: `2pt solid ${cat.color}` };
  return (
    <View style={cardStyle} wrap={false}>
      <View style={styles.rowBetween}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={styles.catName}>{cat.display_name}</Text>
          {cat.recurring && <Text style={styles.recurringBadge}>RECURRING</Text>}
        </View>
        <Text style={styles.catTotal}>{cat.total}</Text>
      </View>
      <Text style={styles.catMeta}>
        {cat.count} case{cat.count !== 1 ? "s" : ""} · {cat.confidence_line}
        {cat.urgent_count > 0 ? ` · ${cat.urgent_count} closing within 14 days` : ""}
      </Text>
      <Text style={styles.catNarrative}>{cat.narrative ?? cat.mechanism}</Text>

      {cat.math && (
        <View>
          <Text style={styles.sectionLabel}>THE MATH, SHOWN</Text>
          <Text style={styles.formula}>{cat.math.formula}</Text>
          <View style={{ marginTop: 4 }}>
            <Ledger rows={cat.math.rows} />
          </View>
        </View>
      )}

      <Text style={styles.sectionLabel}>HOW TO FILE IT</Text>
      <Text style={styles.fileBody}>{cat.file_path}</Text>
      <Text style={styles.windowLine}>
        <Text style={{ fontFamily: "Helvetica-Bold" }}>Window: </Text>
        {cat.dispute_window}
      </Text>

      <Text style={styles.sectionLabel}>CONFIDENCE & WHY</Text>
      <Text style={styles.fileBody}>{cat.confidence_why}</Text>
    </View>
  );
}

function ReportPdf({ data }: { data: ReportData }) {
  const p = ensurePdfView(data);
  return (
    <Document>
      {/* Cover */}
      <Page size="LETTER" style={styles.coverPage}>
        <Text style={styles.brandLabel}>BASLIX LEAKAGE X-RAY</Text>
        <Text style={styles.brandName}>{data.brand_name}</Text>
        <Text style={styles.subtitle}>{p.subtitle}</Text>
        <View style={styles.rule} />
        <Text style={styles.hero}>
          {p.hero_amount}
          {p.hero_is_forward && <Text style={styles.heroUnit}> /mo</Text>}
        </Text>
        <Text style={styles.heroHeadline}>{p.hero_headline}</Text>
        {p.urgent && <Text style={styles.urgentLine}>{p.urgent} closing within 14 days</Text>}
        <Text style={styles.surfacedLine}>{p.surfaced_line}</Text>
        <Text style={styles.generatedAt}>
          Generated {data.generated_at.slice(0, 10)} · baslix.com
        </Text>
      </Page>

      {/* Verdict → trust → forensic body */}
      <Page size="LETTER" style={styles.page}>
        {/* Spotlight — the sharpest finding */}
        {p.spotlight && (
          <View style={{ ...styles.spotlight, borderLeftColor: p.spotlight.color }} wrap={false}>
            <View style={styles.rowBetween}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={styles.sectionLabel}>THE SHARPEST FINDING</Text>
                {p.spotlight.confidence === "high" && <Text style={styles.badge}>HIGH CONFIDENCE</Text>}
              </View>
              <Text style={styles.catMeta}>{p.spotlight.display_name}</Text>
            </View>
            <Text style={styles.claim}>{p.spotlight.claim}</Text>
            <View style={{ marginTop: 9 }}>
              <Ledger rows={p.spotlight.math_rows} />
            </View>
            <Text style={styles.trace}>
              Traces to {p.spotlight.trace_label} {p.spotlight.trace_value} in your own Seller
              Central data — verify it line by line.
            </Text>
          </View>
        )}

        {/* Trust strip */}
        <View style={styles.trustStrip}>
          <View style={styles.trustCell}>
            <Text style={styles.trustTitle}>Recomputed, not guessed</Text>
            <Text style={styles.trustBody}>
              We recompute what Amazon should have charged or credited on each sale and match it
              against what it actually did — using only your own reports.
            </Text>
          </View>
          <View style={styles.trustCell}>
            <Text style={styles.trustTitle}>Every figure traces to a row</Text>
            <Text style={styles.trustBody}>
              Each provable dollar carries the source order, SKU and date from your Seller Central
              data — defensible line by line.
            </Text>
          </View>
          <View style={styles.trustCell}>
            <Text style={styles.trustTitle}>Honest confidence</Text>
            <Text style={styles.trustBody}>
              High = direct, unambiguous match · medium = strong signal, exception possible ·
              review = human look before filing.
            </Text>
          </View>
        </View>

        <Text style={styles.h1}>Executive Summary</Text>
        <View style={styles.h1rule} />
        <Text style={styles.body}>{data.narrative.executive_summary}</Text>

        <Text style={styles.h1}>The findings, in detail</Text>
        <View style={styles.h1rule} />
        {p.provable_categories.map((cat) => (
          <Dossier key={cat.category} cat={cat} />
        ))}

        {p.estimated_categories.length > 0 && (
          <View>
            <Text style={styles.h1}>Estimated — needs confirmation</Text>
            <View style={styles.h1rule} />
            {p.estimated_note && <Text style={styles.estimatedNote}>{p.estimated_note}</Text>}
            {p.estimated_categories.map((cat) => (
              <Dossier key={cat.category} cat={cat} />
            ))}
          </View>
        )}
      </Page>

      {/* Appendix: dispute-ready cases */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.h1}>Appendix: Dispute-Ready Cases</Text>
        <View style={styles.h1rule} />
        <Text style={styles.catMeta}>
          The sharpest individual rows, each with a copy-ready dispute draft. Every case traces to
          a specific order or SKU in your own reports.
        </Text>
        <View style={{ marginTop: 8 }}>
          {data.top_cases.map((c) => (
            <View key={c.rank} style={styles.caseCard} wrap={false}>
              <View style={styles.caseHeader}>
                <Text style={styles.caseRank}>Case #{c.rank}</Text>
                <Text style={styles.caseCat}>
                  {c.category} · {c.sku}
                </Text>
                <Text style={styles.caseAmount}>{c.amount}</Text>
              </View>
              <Text style={styles.caseMeta}>
                Order: {c.order_id}
                {"    "}Confidence: {c.confidence}
                {"    "}
                {c.days_remaining != null
                  ? `${c.days_remaining} days remaining`
                  : "No hard deadline (recurring)"}
              </Text>
              {c.dispute_draft && (
                <View style={styles.draftBox}>
                  <Text style={styles.draftLabel}>Draft dispute: {c.dispute_draft.subject}</Text>
                  <Text style={styles.draftBody}>{c.dispute_draft.body}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <Text style={styles.h1}>Methodology</Text>
        <View style={styles.h1rule} />
        <Text style={styles.body}>{data.narrative.methodology_note}</Text>
      </Page>

      {/* Sell the system */}
      <Page size="LETTER" style={styles.coverPage}>
        <View style={styles.ctaBox}>
          <Text style={styles.ctaTitle}>Every finding above is yours to file, free.</Text>
          <Text style={styles.ctaBody}>
            The report is the easy part. What needs our hands is what recurs:{" "}
            {p.recurring_monthly
              ? `the ${p.recurring_monthly}/mo overcharge that keeps compounding until the root cause is fixed`
              : "next month's overcharge before it compounds"}
            , the same leakage across every channel you sell on, and the backward claims that need
            direct access to your account to chase down.
          </Text>
          <Link style={styles.ctaCta} src="https://calendly.com/vyshag-baslix/30min">
            Talk to us: 15 minutes, no pitch deck
          </Link>
          <Text style={styles.ctaUrl}>calendly.com/vyshag-baslix/30min</Text>
        </View>
        <Text style={styles.footer}>
          Generated by Baslix Leakage X-Ray. All findings are based on the Seller Central data you
          provided and are backed by row-level evidence from your own reports.
        </Text>
      </Page>
    </Document>
  );
}

/**
 * Render a PDF report using React-PDF (the on-demand download path + Typst fallback).
 *
 * @param reportData - The structured report data
 * @returns PDF as Buffer
 */
export async function renderReactPdf(reportData: ReportData): Promise<Buffer> {
  return renderToBuffer(<ReportPdf data={reportData} />);
}
