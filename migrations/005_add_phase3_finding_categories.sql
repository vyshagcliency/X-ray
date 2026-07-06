-- Migration: Add Phase 3 (fee-line wedge) finding_category values
-- Reason: Phase 3 (P3.2 / P3.6-D / P3.6-E) adds three contract-free fee-line rules that
-- emit new finding categories. As in migration 004, the enum must be migrated in the live
-- DB or the findings insert fails with an invalid enum value and the audit silently drops
-- those findings (see memory: enum-migration-gotcha). These ride on the G1 settlement
-- fee lines already present in ingest — no new report_type is needed.
--
-- ALTER TYPE ADD VALUE is additive and safe: it never rewrites existing rows and never
-- removes values. Supabase runs Postgres 15+, so ADD VALUE inside a migration is fine (the
-- new values are not used in the same transaction here).

-- finding_category: the three Phase 3 fee-line categories the new rules emit.
ALTER TYPE finding_category ADD VALUE IF NOT EXISTS 'low_price_fee';   -- low_price_fba
ALTER TYPE finding_category ADD VALUE IF NOT EXISTS 'coupon_fee';      -- coupon_fee_error
ALTER TYPE finding_category ADD VALUE IF NOT EXISTS 'deal_fee';        -- deal_fee_double_booked
