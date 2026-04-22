import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /*
   * Server-side environment variables.
   * All secrets live here — never prefixed with NEXT_PUBLIC_.
   */
  server: {
    // Supabase
    SUPABASE_URL: z.string().url(),
    SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

    // Anthropic (via Helicone proxy)
    ANTHROPIC_API_KEY: z.string().min(1),
    HELICONE_API_KEY: z.string().min(1).optional(),

    // Trigger.dev
    TRIGGER_SECRET_KEY: z.string().min(1),

    // Resend (email)
    RESEND_API_KEY: z.string().min(1),

    // Upstash Redis (rate limiting)
    UPSTASH_REDIS_REST_URL: z.string().url(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

    // Sentry
    SENTRY_DSN: z.string().url().optional(),
    SENTRY_AUTH_TOKEN: z.string().min(1).optional(),

    // PostHog
    POSTHOG_API_KEY: z.string().min(1).optional(),
    POSTHOG_HOST: z.string().url().optional(),

    // App config
    MAX_COST_PER_AUDIT_CENTS: z
      .string()
      .transform(Number)
      .pipe(z.number().int().positive())
      .default("5000"),

    AUTO_APPROVE: z
      .string()
      .transform((v) => v === "true")
      .default("false"),

    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },

  /*
   * Client-side variables — only truly public, non-secret values.
   * Hard rule: no API keys, no secrets, no credentials here.
   */
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  },

  /*
   * Runtime values — map env vars to the schema above.
   */
  runtimeEnv: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    HELICONE_API_KEY: process.env.HELICONE_API_KEY,
    TRIGGER_SECRET_KEY: process.env.TRIGGER_SECRET_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    POSTHOG_API_KEY: process.env.POSTHOG_API_KEY,
    POSTHOG_HOST: process.env.POSTHOG_HOST,
    MAX_COST_PER_AUDIT_CENTS: process.env.MAX_COST_PER_AUDIT_CENTS,
    AUTO_APPROVE: process.env.AUTO_APPROVE,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },

  /**
   * Skip validation during build if env vars aren't set yet.
   * CI and preview deploys may not have all secrets.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  /**
   * Throw if a server-side env var is accidentally bundled for the client.
   */
  emptyStringAsUndefined: true,
});
