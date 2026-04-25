import { schedules } from "@trigger.dev/sdk/v3";
import { supabaseAdmin } from "@/lib/db/supabase";

/**
 * Daily scheduled task: purges raw CSV uploads older than 30 days.
 * Parquet files and findings survive — only raw CSVs are deleted.
 * This is a code-enforced privacy promise, not just policy.
 */
export const purgeRawUploads = schedules.task({
  id: "purge.raw-uploads",
  cron: "0 3 * * *", // Daily at 3 AM UTC

  run: async () => {
    const db = supabaseAdmin();
    const cutoffDate = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    // Find unpurged uploads older than 30 days
    const { data: staleUploads } = await db
      .from("raw_uploads")
      .select("id, storage_key, audit_id")
      .is("purged_at", null)
      .lt("created_at", cutoffDate);

    if (!staleUploads || staleUploads.length === 0) {
      return { purged: 0 };
    }

    let purgedCount = 0;

    for (const upload of staleUploads) {
      // Delete the Storage object
      const { error: storageError } = await db.storage
        .from("uploads")
        .remove([upload.storage_key]);

      if (storageError) {
        console.error(
          `Failed to delete storage object ${upload.storage_key}:`,
          storageError.message,
        );
        continue;
      }

      // Mark as purged in the database
      await db
        .from("raw_uploads")
        .update({ purged_at: new Date().toISOString() })
        .eq("id", upload.id);

      purgedCount++;
    }

    // Record event
    await db.from("audit_events").insert({
      audit_id: staleUploads[0].audit_id, // Use first audit for event
      stage: "purge.raw-uploads",
      status: "completed",
      metadata: { purged_count: purgedCount, total_stale: staleUploads.length },
    });

    return { purged: purgedCount };
  },
});
