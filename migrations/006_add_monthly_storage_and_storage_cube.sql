-- Migration: Add Phase 3 (G2/P3.3) Monthly Storage report type + storage-cube category
-- Reason: P3.3 (storage cube overcharge) adds a new ingest report type
-- (`monthly_storage` — the Monthly Inventory Storage Fees report) and a new
-- finding_category (`storage_cube`). As in migrations 004/005, both enums must be migrated
-- in the live DB or the upload route's raw_uploads insert fails (invalid report_type) and
-- the findings insert fails (invalid finding_category), silently dropping the report and its
-- findings (see memory: enum-migration-gotcha).
--
-- ALTER TYPE ADD VALUE is additive and safe: it never rewrites existing rows and never
-- removes values. Supabase runs Postgres 15+, so ADD VALUE inside a migration is fine.

-- report_type: the Monthly Storage Fees report the upload flow now accepts (optional tile).
ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'monthly_storage';

-- finding_category: the storage-cube overcharge category the new rule emits.
ALTER TYPE finding_category ADD VALUE IF NOT EXISTS 'storage_cube';
