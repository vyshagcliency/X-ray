import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Lazy singleton for server-side usage
let _serviceClient: SupabaseClient | undefined;

export function supabaseAdmin(): SupabaseClient {
  if (!_serviceClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    _serviceClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _serviceClient;
}
