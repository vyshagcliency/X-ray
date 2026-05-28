"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/db/supabase";
import { startRateLimit } from "@/lib/security/rate-limit";

const startSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .max(254)
    .transform((e) => e.toLowerCase().trim()),
  brandName: z
    .string()
    .min(1, "Brand name is required")
    .max(200)
    .transform((s) => s.trim()),
  legalConsent: z.literal(true, {
    errorMap: () => ({ message: "You must confirm you have rights to upload these reports" }),
  }),
});

// Common disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "throwaway.email",
  "yopmail.com",
  "sharklasers.com",
  "guerrillamailblock.com",
  "grr.la",
  "discard.email",
  "trashmail.com",
  "10minutemail.com",
  "temp-mail.org",
]);

export async function startAudit(formData: FormData) {
  const parsed = startSchema.safeParse({
    email: formData.get("email"),
    brandName: formData.get("brandName"),
    legalConsent: formData.get("legalConsent") === "on" ? true : undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { email, brandName } = parsed.data;
  const domain = email.split("@")[1] ?? "";

  // Reject disposable email domains
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { error: "Please use a work email address" };
  }

  let auditId: string;

  try {
    console.log("[startAudit] step 1: creating supabase client");
    const db = supabaseAdmin();

    // Check block list
    console.log("[startAudit] step 2: checking block list for domain:", domain);
    const { data: blocked, error: blockErr } = await db
      .from("block_list")
      .select("email_domain")
      .eq("email_domain", domain)
      .maybeSingle();

    if (blockErr) {
      console.error("[startAudit] block_list query error:", blockErr);
      return { error: "Something went wrong. Please try again." };
    }

    if (blocked) {
      return { error: "Please use a work email address" };
    }

    // Rate limit: 5 audits per domain per 30 days
    console.log("[startAudit] step 3: rate limiting");
    const { success: withinLimit } = await startRateLimit.limit(domain);
    if (!withinLimit) {
      return { error: "Too many audits from this domain. Please try again later." };
    }

    // Create the audit
    console.log("[startAudit] step 4: inserting audit");
    const { data: audit, error } = await db
      .from("audits")
      .insert({
        email,
        brand_name: brandName,
        status: "pending_upload",
      })
      .select("id")
      .single();

    if (error || !audit) {
      console.error("[startAudit] insert error:", error);
      return { error: "Something went wrong. Please try again." };
    }

    console.log("[startAudit] step 5: audit created:", audit.id);
    auditId = audit.id;
  } catch (err) {
    console.error("[startAudit] uncaught error:", err);
    return { error: "Something went wrong. Please try again." };
  }

  redirect(`/upload/${auditId}`);
}
