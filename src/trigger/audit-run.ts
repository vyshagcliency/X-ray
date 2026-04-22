import { task, metadata } from "@trigger.dev/sdk/v3";
import { supabaseAdmin } from "@/lib/db/supabase";
import { RULES } from "@/lib/rules";
import { runRule } from "@/lib/duckdb/run-rule";
import { generateNarrative } from "@/lib/llm/narrate";
import { draftDispute } from "@/lib/llm/draft-dispute";
import { buildReportData } from "@/lib/pdf/data-builder";

export const auditRun = task({
  id: "audit.run",
  retry: { maxAttempts: 3 },

  run: async ({ auditId }: { auditId: string }) => {
    const db = supabaseAdmin();

    await metadata.set("stage", "Starting audit...");
    await metadata.set("progress", 0);

    // 1. Get the raw uploads for this audit
    const { data: uploads } = await db
      .from("raw_uploads")
      .select("report_type, storage_key")
      .eq("audit_id", auditId);

    if (!uploads || uploads.length === 0) {
      throw new Error("No uploads found for this audit");
    }

    // Get audit info
    const { data: audit } = await db
      .from("audits")
      .select("brand_name")
      .eq("id", auditId)
      .single();

    const brandName = audit?.brand_name ?? "Your Brand";

    // 2. Get signed URLs for raw CSVs
    await metadata.set("stage", `Parsing ${uploads.length} reports...`);
    await metadata.set("progress", 0.1);

    const csvUrls: Record<string, string> = {};
    for (const upload of uploads) {
      const { data: signedUrl } = await db.storage
        .from("uploads")
        .createSignedUrl(upload.storage_key, 3600);

      if (signedUrl?.signedUrl) {
        csvUrls[upload.report_type] = signedUrl.signedUrl;
      }
    }

    // 3. Run detection rules
    await metadata.set("stage", "Cross-referencing your data...");
    await metadata.set("progress", 0.3);

    interface FindingRecord {
      audit_id: string;
      rule_id: string;
      rule_version: string;
      category: string;
      amount_cents: number;
      confidence: string;
      window_closes_on: string | null;
      window_days_remaining: number | null;
      evidence: Record<string, unknown>;
      row_ref: string;
    }

    const allFindings: FindingRecord[] = [];

    for (const rule of RULES) {
      const hasRequired = rule.requiredReports.every((r) => csvUrls[r]);
      if (!hasRequired) {
        console.log(`Skipping rule ${rule.id} — missing required reports`);
        continue;
      }

      try {
        await metadata.set("stage", `Running ${rule.id.replace(/_/g, " ")} detection...`);

        const findings = await runRule(rule, csvUrls);

        for (const f of findings) {
          const windowDaysRemaining = f.window_closes_on
            ? Math.ceil(
                (new Date(f.window_closes_on).getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24),
              )
            : null;

          allFindings.push({
            audit_id: auditId,
            rule_id: f.rule_id,
            rule_version: f.rule_version,
            category: f.category,
            amount_cents: f.amount_cents,
            confidence: f.confidence,
            window_closes_on: f.window_closes_on,
            window_days_remaining: windowDaysRemaining,
            evidence: f.evidence,
            row_ref: f.row_ref,
          });
        }
      } catch (err) {
        console.error(`Rule ${rule.id} failed:`, err);
        await db.from("audit_events").insert({
          audit_id: auditId,
          stage: `detect.${rule.id}`,
          status: "failed",
          metadata: { error: String(err) },
        });
      }
    }

    // 4. Insert findings
    await metadata.set("stage", "Recording findings...");
    await metadata.set("progress", 0.6);

    if (allFindings.length > 0) {
      const { data: insertedFindings } = await db
        .from("findings")
        .insert(allFindings)
        .select("id, rule_id, category, amount_cents, confidence, window_closes_on, window_days_remaining, evidence");

      // 5. Generate narrative (template-based for Phase 1)
      await metadata.set("stage", "Writing analysis...");
      await metadata.set("progress", 0.7);

      // Aggregate findings by category for narrative input
      const catMap = new Map<string, { count: number; total_cents: number; urgent_count: number; urgent_cents: number; skus: Set<string> }>();
      for (const f of allFindings) {
        const existing = catMap.get(f.category) ?? { count: 0, total_cents: 0, urgent_count: 0, urgent_cents: 0, skus: new Set<string>() };
        existing.count++;
        existing.total_cents += f.amount_cents;
        if (f.window_days_remaining !== null && f.window_days_remaining >= 0 && f.window_days_remaining <= 14) {
          existing.urgent_count++;
          existing.urgent_cents += f.amount_cents;
        }
        const sku = f.evidence.sku as string | undefined;
        if (sku) existing.skus.add(sku);
        catMap.set(f.category, existing);
      }

      const totalCents = allFindings.reduce((sum, f) => sum + f.amount_cents, 0);
      const urgentCents = allFindings
        .filter((f) => f.window_days_remaining !== null && f.window_days_remaining >= 0 && f.window_days_remaining <= 14)
        .reduce((sum, f) => sum + f.amount_cents, 0);

      const narrative = generateNarrative({
        brand_name: brandName,
        total_recoverable_cents: totalCents,
        urgent_recoverable_cents: urgentCents,
        findings_count: allFindings.length,
        categories: Array.from(catMap.entries()).map(([cat, data]) => ({
          category: cat,
          count: data.count,
          total_cents: data.total_cents,
          urgent_count: data.urgent_count,
          urgent_cents: data.urgent_cents,
          top_skus: Array.from(data.skus).slice(0, 5),
        })),
      });

      // 6. Generate dispute drafts for top 25 findings
      await metadata.set("stage", "Drafting disputes...");
      await metadata.set("progress", 0.8);

      const disputeDrafts = new Map<string, ReturnType<typeof draftDispute>>();
      const sorted = [...(insertedFindings ?? [])].sort((a, b) => b.amount_cents - a.amount_cents);
      const top25 = sorted.slice(0, 25);

      for (const f of top25) {
        const draft = draftDispute({
          rule_id: f.rule_id,
          category: f.category,
          amount_cents: f.amount_cents,
          confidence: f.confidence,
          evidence: f.evidence as Record<string, unknown>,
        });
        disputeDrafts.set(f.id, draft);
      }

      // 7. Build report data and store
      const reportData = buildReportData(
        brandName,
        (insertedFindings ?? []).map((f) => ({
          ...f,
          evidence: f.evidence as Record<string, unknown>,
        })),
        narrative,
        disputeDrafts,
      );

      // Store report data as JSON in audits for the report page
      await db
        .from("audits")
        .update({
          total_recoverable_cents: totalCents,
          urgent_recoverable_cents: urgentCents,
          findings_count: allFindings.length,
          report_data: reportData,
          status: "pending_review", // Phase 1: manual review
          completed_at: new Date().toISOString(),
          rule_versions: Object.fromEntries(RULES.map((r) => [r.id, r.version])),
        })
        .eq("id", auditId);

      // 8. Record completion event
      await db.from("audit_events").insert({
        audit_id: auditId,
        stage: "audit.run",
        status: "completed",
        metadata: {
          findings_count: allFindings.length,
          total_recoverable_cents: totalCents,
          narrative_source: narrative.source,
        },
      });

      await metadata.set("stage", "Complete!");
      await metadata.set("progress", 1);

      return {
        auditId,
        findingsCount: allFindings.length,
        totalRecoverableCents: totalCents,
      };
    }

    // No findings case
    await db
      .from("audits")
      .update({
        total_recoverable_cents: 0,
        urgent_recoverable_cents: 0,
        findings_count: 0,
        status: "pending_review",
        completed_at: new Date().toISOString(),
        rule_versions: Object.fromEntries(RULES.map((r) => [r.id, r.version])),
      })
      .eq("id", auditId);

    await db.from("audit_events").insert({
      audit_id: auditId,
      stage: "audit.run",
      status: "completed",
      metadata: { findings_count: 0, total_recoverable_cents: 0 },
    });

    await metadata.set("stage", "Complete!");
    await metadata.set("progress", 1);

    return { auditId, findingsCount: 0, totalRecoverableCents: 0 };
  },
});
