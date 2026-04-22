-- Add report_data jsonb to audits for storing the fully-built report JSON
ALTER TABLE audits ADD COLUMN IF NOT EXISTS report_data jsonb;

-- Add row_ref to findings for traceability back to source CSV rows
ALTER TABLE findings ADD COLUMN IF NOT EXISTS row_ref text;
