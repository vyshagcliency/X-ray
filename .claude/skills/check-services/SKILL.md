---
name: check-services
description: Verify all external service connections are working (Supabase, Trigger.dev, Anthropic, Resend, Helicone, PostHog)
user-invocable: true
allowed-tools: Bash, Read
---

Check the following services are reachable and configured:

1. **Supabase** — verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set; run a quick health check:
   ```bash
   curl -s "$SUPABASE_URL/rest/v1/" -H "apikey: $SUPABASE_ANON_KEY" | jq '.message // "OK"'
   ```

2. **Trigger.dev** — verify `TRIGGER_SECRET_KEY` is set; confirm the worker can connect:
   ```bash
   npx trigger.dev whoami 2>&1 | head -5
   ```

3. **Anthropic** — verify `ANTHROPIC_API_KEY` is set and starts with `sk-ant-`.

4. **Helicone** — verify `HELICONE_API_KEY` is set.

5. **Resend** — verify `RESEND_API_KEY` is set and starts with `re_`.

6. **Upstash** — verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set.

7. **PostHog** — verify `NEXT_PUBLIC_POSTHOG_KEY` is set and starts with `phc_`. Verify `NEXT_PUBLIC_POSTHOG_HOST` is set (default `https://eu.i.posthog.com`).

8. **Sentry** — verify `SENTRY_DSN` is set and starts with `https://`. Verify `SENTRY_AUTH_TOKEN` is set for source-map uploads.

Report: ✓ / ✗ per service, with a clear fix instruction for each failure.

Do NOT log the actual key values — just confirm they're present and have the right prefix/format.
