-- Baslix Leakage X-Ray — Initial Schema
-- All monetary columns are bigint (cents). No floats on anything financial.
-- All tables use uuid PKs and created_at/updated_at timestamps.

-- Enums
CREATE TYPE audit_status AS ENUM (
  'pending_upload', 'processing', 'pending_review', 'completed', 'failed', 'deleted'
);

CREATE TYPE report_type AS ENUM (
  'returns', 'adjustments', 'reimbursements', 'listings',
  'settlement', 'fee_preview', 'removal_orders', 'manage_inventory'
);

CREATE TYPE finding_category AS ENUM (
  'returns', 'lost_inventory', 'dimensions', 'fees', 'removals', 'shortages', 'other'
);

CREATE TYPE confidence_level AS ENUM ('high', 'medium', 'low');

-- updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- audits — the spine
-- ============================================================
CREATE TABLE audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name text NOT NULL,
  email text NOT NULL,
  email_domain text GENERATED ALWAYS AS (split_part(email, '@', 2)) STORED,
  status audit_status NOT NULL DEFAULT 'pending_upload',
  trigger_run_id text,
  total_recoverable_cents bigint DEFAULT 0,
  urgent_recoverable_cents bigint DEFAULT 0,
  findings_count int DEFAULT 0,
  report_version int DEFAULT 1,
  rule_versions jsonb DEFAULT '{}',
  ip inet,
  ua text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER audits_updated_at
  BEFORE UPDATE ON audits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- raw_uploads — auto-purged at 30 days
-- ============================================================
CREATE TABLE raw_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  report_type report_type NOT NULL,
  storage_key text NOT NULL,
  size_bytes bigint,
  row_count int,
  date_range_start date,
  date_range_end date,
  header_signature text,
  purged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER raw_uploads_updated_at
  BEFORE UPDATE ON raw_uploads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- findings — detection rule outputs
-- ============================================================
CREATE TABLE findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  rule_id text NOT NULL,
  rule_version text NOT NULL,
  category finding_category NOT NULL,
  amount_cents bigint NOT NULL,
  confidence confidence_level NOT NULL DEFAULT 'medium',
  window_days_remaining int,
  window_closes_on date,
  evidence jsonb DEFAULT '{}',
  narrative_summary text,
  draft_dispute_text text,
  human_reviewed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_findings_audit_category ON findings(audit_id, category);
CREATE INDEX idx_findings_audit_confidence ON findings(audit_id, confidence, amount_cents DESC);
CREATE INDEX idx_findings_window ON findings(window_closes_on);

-- ============================================================
-- case_source_rows — top-25 evidence for PDF
-- ============================================================
CREATE TABLE case_source_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  finding_id uuid NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  report_type report_type NOT NULL,
  row_data jsonb NOT NULL,
  row_ref text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- audit_events — every state transition
-- ============================================================
CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  stage text NOT NULL,
  status text NOT NULL,
  duration_ms int,
  error_sentry_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_events_audit ON audit_events(audit_id, created_at);

-- ============================================================
-- cost_events — per-audit cost tracking
-- ============================================================
CREATE TABLE cost_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  component text NOT NULL,
  amount_cents int NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- block_list — domain blocking
-- ============================================================
CREATE TABLE block_list (
  email_domain text PRIMARY KEY,
  reason text,
  added_by text,
  added_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- deletion_requests — user-initiated
-- ============================================================
CREATE TABLE deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  status text NOT NULL DEFAULT 'pending'
);

-- ============================================================
-- rule_versions — registry
-- ============================================================
CREATE TABLE rule_versions (
  rule_id text PRIMARY KEY,
  version text NOT NULL,
  changelog text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS — deny all to anon and authenticated (server-only tables)
-- ============================================================
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_source_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE block_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_versions ENABLE ROW LEVEL SECURITY;

-- All access goes through service_role key (server-side only)
-- No policies = deny all for anon and authenticated roles
