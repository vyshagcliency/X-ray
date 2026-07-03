-- Migration: Add Phase 1.5 (payout-integrity wedge) enum values
-- Reason: Phase 1.5 shipped new report types and finding categories in code, but the
-- report_type and finding_category enums were never migrated. Result: the upload route's
-- raw_uploads insert for 'fba_fee_preview'/'storage_fees' failed (invalid enum value) and
-- the error was swallowed, so those reports never reached the pipeline and every audit that
-- relied on them produced $0 / 0 findings. Even once ingested, findings in the new
-- categories could not be inserted. (Migration 003's 'inventory_ledger' value was also never
-- applied to the live DB.)
--
-- ALTER TYPE ADD VALUE is additive and safe: it never rewrites existing rows and never
-- removes values. Postgres cannot remove enum values, so legacy unused values remain.
-- Supabase runs Postgres 15+, so ADD VALUE inside a migration is fine (the new values are
-- not used in the same transaction here).

-- report_type: add the Phase 1.5 ingest reports the upload flow actually inserts.
-- 'inventory_ledger' is re-asserted here because migration 003 was never applied live.
ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'inventory_ledger';
ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'fba_fee_preview';
ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'storage_fees';

-- finding_category: add the four payout-integrity categories the current rules emit.
ALTER TYPE finding_category ADD VALUE IF NOT EXISTS 'referral_fee';
ALTER TYPE finding_category ADD VALUE IF NOT EXISTS 'fba_dimension';
ALTER TYPE finding_category ADD VALUE IF NOT EXISTS 'return_credit';
ALTER TYPE finding_category ADD VALUE IF NOT EXISTS 'aged_surcharge';
