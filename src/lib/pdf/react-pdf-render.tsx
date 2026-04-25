import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ReportData } from "./data-builder";

const styles = StyleSheet.create({
  page: { padding: 50, fontFamily: "Helvetica", fontSize: 10 },
  coverPage: { padding: 50, justifyContent: "center", alignItems: "center" },
  brandLabel: { fontSize: 12, color: "#666", marginBottom: 20 },
  brandName: { fontSize: 26, fontWeight: "bold", marginBottom: 10 },
  subtitle: { fontSize: 11, color: "#666", marginBottom: 20 },
  totalAmount: { fontSize: 20, fontWeight: "bold", marginBottom: 8 },
  urgentAmount: { fontSize: 12, color: "#c44", marginBottom: 8 },
  casesCount: { fontSize: 10, color: "#666", marginBottom: 40 },
  generatedAt: { fontSize: 8, color: "#999" },
  h1: { fontSize: 16, fontWeight: "bold", marginTop: 20, marginBottom: 10 },
  h2: { fontSize: 13, fontWeight: "bold", marginTop: 14, marginBottom: 6 },
  body: { fontSize: 9, lineHeight: 1.5, marginBottom: 8, color: "#333" },
  catCard: {
    border: "0.5pt solid #ddd",
    borderRadius: 3,
    padding: 10,
    marginBottom: 8,
  },
  catHeader: { flexDirection: "row", justifyContent: "space-between" },
  catName: { fontSize: 11, fontWeight: "bold" },
  catTotal: { fontSize: 11, fontWeight: "bold" },
  catMeta: { fontSize: 8, color: "#666", marginTop: 3 },
  catNarrative: { fontSize: 8, color: "#444", marginTop: 5 },
  caseCard: {
    border: "0.5pt solid #ddd",
    borderRadius: 3,
    padding: 8,
    marginBottom: 6,
  },
  caseHeader: { flexDirection: "row", justifyContent: "space-between" },
  caseRank: { fontSize: 10, fontWeight: "bold" },
  caseCat: { fontSize: 8, color: "#666" },
  caseAmount: { fontSize: 11, fontWeight: "bold" },
  caseMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 3,
  },
  caseMetaItem: { fontSize: 7, color: "#666" },
  draftBox: {
    backgroundColor: "#f8f8f8",
    padding: 6,
    borderRadius: 2,
    marginTop: 5,
  },
  draftLabel: { fontSize: 7, fontWeight: "bold" },
  draftSubject: { fontSize: 7, marginTop: 2 },
  draftBody: { fontSize: 7, color: "#444", marginTop: 3 },
  ctaBox: {
    border: "1pt solid #222",
    borderRadius: 5,
    padding: 18,
    marginTop: 30,
    alignItems: "center",
  },
  ctaTitle: { fontSize: 13, fontWeight: "bold", textAlign: "center" },
  ctaBody: { fontSize: 9, textAlign: "center", marginTop: 8 },
  ctaCta: {
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 10,
  },
  footer: {
    fontSize: 7,
    color: "#999",
    textAlign: "center",
    marginTop: 20,
  },
  divider: { borderBottom: "0.5pt solid #ccc", marginVertical: 15 },
});

function ReportPdf({ data }: { data: ReportData }) {
  return (
    <Document>
      {/* Cover Page */}
      <Page size="LETTER" style={styles.coverPage}>
        <Text style={styles.brandLabel}>BASLIX LEAKAGE X-RAY</Text>
        <Text style={styles.brandName}>{data.brand_name}</Text>
        <Text style={styles.subtitle}>Forensic FBA Audit Report</Text>
        <View style={styles.divider} />
        <Text style={styles.totalAmount}>
          {data.total_recoverable} recoverable
        </Text>
        {data.urgent_recoverable_cents > 0 && (
          <Text style={styles.urgentAmount}>
            {data.urgent_recoverable} closing within 14 days
          </Text>
        )}
        <Text style={styles.casesCount}>
          {data.findings_count} cases across {data.categories.length} categories
        </Text>
        <Text style={styles.generatedAt}>
          Generated {data.generated_at.slice(0, 10)} — baslix.com
        </Text>
      </Page>

      {/* Content Pages */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.h1}>Executive Summary</Text>
        <Text style={styles.body}>
          {data.narrative.executive_summary}
        </Text>

        <Text style={styles.h1}>Findings by Category</Text>
        {data.categories.map((cat) => (
          <View key={cat.category} style={styles.catCard}>
            <View style={styles.catHeader}>
              <Text style={styles.catName}>{cat.display_name}</Text>
              <Text style={styles.catTotal}>{cat.total}</Text>
            </View>
            <Text style={styles.catMeta}>
              {cat.count} cases
              {cat.urgent_count > 0
                ? ` — ${cat.urgent_count} urgent`
                : ""}
            </Text>
            {data.narrative.category_narratives[cat.category] && (
              <Text style={styles.catNarrative}>
                {data.narrative.category_narratives[cat.category]}
              </Text>
            )}
          </View>
        ))}

        <Text style={styles.h1}>Methodology</Text>
        <Text style={styles.body}>
          {data.narrative.methodology_note}
        </Text>
      </Page>

      {/* Top Cases */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.h1}>Top Cases — Dispute-Ready Evidence</Text>
        {data.top_cases.map((c) => (
          <View key={c.rank} style={styles.caseCard} wrap={false}>
            <View style={styles.caseHeader}>
              <Text style={styles.caseRank}>
                Case #{c.rank}
              </Text>
              <Text style={styles.caseCat}>
                {c.category} — {c.sku}
              </Text>
              <Text style={styles.caseAmount}>{c.amount}</Text>
            </View>
            <View style={styles.caseMeta}>
              <Text style={styles.caseMetaItem}>
                Order: {c.order_id}
              </Text>
              <Text style={styles.caseMetaItem}>
                Confidence: {c.confidence}
              </Text>
              <Text style={styles.caseMetaItem}>
                {c.days_remaining != null
                  ? `${c.days_remaining} days remaining`
                  : "No hard deadline"}
              </Text>
            </View>
            {c.dispute_draft && (
              <View style={styles.draftBox}>
                <Text style={styles.draftLabel}>Draft Dispute:</Text>
                <Text style={styles.draftSubject}>
                  {c.dispute_draft.subject}
                </Text>
                <Text style={styles.draftBody}>
                  {c.dispute_draft.body}
                </Text>
              </View>
            )}
          </View>
        ))}
      </Page>

      {/* CTA Page */}
      <Page size="LETTER" style={styles.coverPage}>
        <View style={styles.ctaBox}>
          <Text style={styles.ctaTitle}>
            Filing {data.findings_count} disputes is a 60-80 hour job.
          </Text>
          <Text style={styles.ctaBody}>
            We do this for our customers as a managed service — we only get
            paid when the money lands in your account (20% of recovered, no
            retainer, no software).
          </Text>
          <Text style={styles.ctaCta}>
            Talk to us — 15 min, no pitch deck
          </Text>
        </View>
        <Text style={styles.footer}>
          This report was generated by Baslix Leakage X-Ray. All findings are
          based on the Seller Central data you provided and are backed by
          row-level evidence from your reports.
        </Text>
      </Page>
    </Document>
  );
}

/**
 * Render a PDF report using React-PDF (fallback renderer).
 *
 * @param reportData - The structured report data
 * @returns PDF as Buffer
 */
export async function renderReactPdf(
  reportData: ReportData,
): Promise<Buffer> {
  return renderToBuffer(<ReportPdf data={reportData} />);
}
