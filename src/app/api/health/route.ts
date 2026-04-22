import { NextResponse } from "next/server";

interface ServiceCheck {
  status: "ok" | "error";
  message?: string;
}

export async function GET() {
  const checks: Record<string, ServiceCheck> = {};

  // Supabase
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    checks.supabase = res.ok
      ? { status: "ok" }
      : { status: "error", message: `HTTP ${res.status}` };
  } catch (e) {
    checks.supabase = { status: "error", message: (e as Error).message };
  }

  // Anthropic (model list via Helicone proxy or direct)
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const heliconeKey = process.env.HELICONE_API_KEY;
    if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

    const baseUrl = heliconeKey
      ? "https://anthropic.helicone.ai"
      : "https://api.anthropic.com";

    const headers: Record<string, string> = {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    };
    if (heliconeKey) {
      headers["Helicone-Auth"] = `Bearer ${heliconeKey}`;
    }

    const res = await fetch(`${baseUrl}/v1/models`, { headers });
    checks.anthropic = res.ok
      ? { status: "ok" }
      : { status: "error", message: `HTTP ${res.status}` };
  } catch (e) {
    checks.anthropic = { status: "error", message: (e as Error).message };
  }

  // Resend
  try {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("Missing RESEND_API_KEY");
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
    });
    checks.resend = res.ok
      ? { status: "ok" }
      : { status: "error", message: `HTTP ${res.status}` };
  } catch (e) {
    checks.resend = { status: "error", message: (e as Error).message };
  }

  // Upstash Redis
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) throw new Error("Missing UPSTASH_REDIS_REST_URL or TOKEN");
    const res = await fetch(`${url}/ping`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    checks.upstash = res.ok
      ? { status: "ok" }
      : { status: "error", message: `HTTP ${res.status}` };
  } catch (e) {
    checks.upstash = { status: "error", message: (e as Error).message };
  }

  const allOk = Object.values(checks).every((c) => c.status === "ok");

  return NextResponse.json(
    { status: allOk ? "healthy" : "degraded", checks },
    { status: allOk ? 200 : 503 },
  );
}
