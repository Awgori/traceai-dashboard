-- ============================================================
-- TraceAI — Supabase Database Setup
-- Run this entire file in: Supabase → SQL Editor → New Query
-- ============================================================

-- 1. FLAGGED CLAIMS TABLE
CREATE TABLE IF NOT EXISTS flagged_claims (
  id           BIGSERIAL PRIMARY KEY,
  claim_id     TEXT NOT NULL,
  patient_name TEXT,
  patient_id   TEXT,
  hospital     TEXT,
  amount       NUMERIC(10,2),
  risk_score   INTEGER CHECK (risk_score BETWEEN 0 AND 100),
  risk_level   TEXT,
  status       TEXT,
  fraud_type   TEXT,
  date         DATE DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 2. EXPORT AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS export_logs (
  id           BIGSERIAL PRIMARY KEY,
  report_type  TEXT,
  record_count INTEGER,
  exported_by  TEXT,
  exported_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SUSPICIOUS PRESCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS suspicious_prescriptions (
  id         BIGSERIAL PRIMARY KEY,
  doctor     TEXT,
  drug       TEXT,
  count_24h  INTEGER,
  threshold  INTEGER,
  status     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE flagged_claims           ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspicious_prescriptions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read on claims and prescriptions
CREATE POLICY "anon_read_claims" ON flagged_claims
  FOR SELECT USING (true);

CREATE POLICY "anon_read_prescriptions" ON suspicious_prescriptions
  FOR SELECT USING (true);

-- Allow anonymous insert on export_logs (for PDF download tracking)
CREATE POLICY "anon_insert_export_logs" ON export_logs
  FOR INSERT WITH CHECK (true);

-- Allow anonymous read on export_logs
CREATE POLICY "anon_read_export_logs" ON export_logs
  FOR SELECT USING (true);

-- ── Seed: Flagged Claims ────────────────────────────────────
INSERT INTO flagged_claims
  (claim_id, patient_name, patient_id, hospital, amount, risk_score, risk_level, status, fraud_type, date)
VALUES
  ('CLM-88219','Juan dela Cruz',  'PT-10042','Metro General',    2400,91,'High Risk', 'Under Review','Duplicate Submission','2026-03-12'),
  ('CLM-88105','Maria Santos',    'PT-20891','City Medical',     1750,85,'High Risk', 'Under Review','Upcoding Detected',   '2026-03-12'),
  ('CLM-87932','Roberto Reyes',   'PT-33810','St. Luke''s',      1200,67,'Suspicious','Flagged',     'Suspicious Activity', '2026-03-11'),
  ('CLM-87811','Ana Bautista',    'PT-44120','National Health',  2100,72,'Suspicious','Flagged',     'Billing Mismatch',    '2026-03-11'),
  ('CLM-87780','Carlos Mendoza',  'PT-55200','Riverside Medical', 900,22,'Normal',    'Cleared',     'Legitimate Claim',    '2026-03-10'),
  ('CLM-87654','Liza Ramos',      'PT-66033','Metro General',    1600,88,'High Risk', 'Under Review','Phantom Billing',     '2026-03-10');

-- ── Seed: Suspicious Prescriptions ─────────────────────────
INSERT INTO suspicious_prescriptions
  (doctor, drug, count_24h, threshold, status)
VALUES
  ('Dr. R. Santos','Oxycodone 80mg', 47,5, 'High Risk'),
  ('Dr. M. Lim',   'Alprazolam 2mg',23,8, 'Suspicious'),
  ('Dr. A. Cruz',  'Tramadol 100mg',31,10,'Suspicious'),
  ('Dr. J. Reyes', 'Zolpidem 10mg', 4, 6, 'Normal');

-- ── Verify ──────────────────────────────────────────────────
SELECT 'flagged_claims'           AS table_name, COUNT(*) AS rows FROM flagged_claims
UNION ALL
SELECT 'suspicious_prescriptions' AS table_name, COUNT(*) AS rows FROM suspicious_prescriptions
UNION ALL
SELECT 'export_logs'              AS table_name, COUNT(*) AS rows FROM export_logs;
