-- Migration: Rename 'adjustments' → 'inventory_ledger' in report_type enum
-- Reason: Amazon deprecated "FBA Inventory Adjustments" (Jan 31, 2023).
-- The replacement report is "Inventory Ledger - Detailed View" with different columns.

-- Step 1: Add new enum value
ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'inventory_ledger';

-- Step 2: Update existing rows (must run AFTER the above commits)
-- Note: ALTER TYPE ADD VALUE cannot run inside a transaction in Postgres < 12.
-- Supabase runs Postgres 15+, so this is fine in a single migration.
UPDATE raw_uploads SET report_type = 'inventory_ledger' WHERE report_type = 'adjustments';

-- Step 3: Postgres does not support removing enum values.
-- The old 'adjustments' value remains in the enum but is unused.
-- Any new inserts should use 'inventory_ledger'.
COMMENT ON TYPE report_type IS 'adjustments value is deprecated — use inventory_ledger';
