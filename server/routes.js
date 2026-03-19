const express  = require('express');
const router   = express.Router();
const supabase = require('./supabase');

// ── Dummy data fallback (used if Supabase tables are empty) ──────────────────
const DUMMY_CLAIMS = [
  { claim_id:'CLM-88219', patient_name:'Juan dela Cruz',  patient_id:'PT-10042', hospital:'Metro General',     amount:2400, risk_score:91, risk_level:'High Risk',  status:'Under Review', fraud_type:'Duplicate Submission', date:'2026-03-12' },
  { claim_id:'CLM-88105', patient_name:'Maria Santos',    patient_id:'PT-20891', hospital:'City Medical',      amount:1750, risk_score:85, risk_level:'High Risk',  status:'Under Review', fraud_type:'Upcoding Detected',   date:'2026-03-12' },
  { claim_id:'CLM-87932', patient_name:'Roberto Reyes',   patient_id:'PT-33810', hospital:"St. Luke's",        amount:1200, risk_score:67, risk_level:'Suspicious',  status:'Flagged',      fraud_type:'Suspicious Activity',  date:'2026-03-11' },
  { claim_id:'CLM-87811', patient_name:'Ana Bautista',    patient_id:'PT-44120', hospital:'National Health',   amount:2100, risk_score:72, risk_level:'Suspicious',  status:'Flagged',      fraud_type:'Billing Mismatch',     date:'2026-03-11' },
  { claim_id:'CLM-87780', patient_name:'Carlos Mendoza',  patient_id:'PT-55200', hospital:'Riverside Medical', amount:900,  risk_score:22, risk_level:'Normal',      status:'Cleared',      fraud_type:'Legitimate Claim',     date:'2026-03-10' },
  { claim_id:'CLM-87654', patient_name:'Liza Ramos',      patient_id:'PT-66033', hospital:'Metro General',     amount:1600, risk_score:88, risk_level:'High Risk',  status:'Under Review', fraud_type:'Phantom Billing',      date:'2026-03-10' }
];

const DUMMY_PRESCRIPTIONS = [
  { doctor:'Dr. R. Santos', drug:'Oxycodone 80mg', count_24h:47, threshold:5,  status:'High Risk'  },
  { doctor:'Dr. M. Lim',    drug:'Alprazolam 2mg', count_24h:23, threshold:8,  status:'Suspicious' },
  { doctor:'Dr. A. Cruz',   drug:'Tramadol 100mg', count_24h:31, threshold:10, status:'Suspicious' },
  { doctor:'Dr. J. Reyes',  drug:'Zolpidem 10mg',  count_24h:4,  threshold:6,  status:'Normal'     }
];

// ── GET /api/claims ──────────────────────────────────────────────────────────
router.get('/claims', async (req, res) => {
  const { data, error } = await supabase
    .from('flagged_claims')
    .select('*')
    .order('risk_score', { ascending: false });

  if (error) {
    console.error('Supabase error /claims:', error.message);
    return res.json(DUMMY_CLAIMS);   // graceful fallback
  }

  // If table is empty, seed it and return dummy data
  if (!data || data.length === 0) {
    await supabase.from('flagged_claims').insert(DUMMY_CLAIMS);
    return res.json(DUMMY_CLAIMS);
  }

  res.json(data);
});

// ── GET /api/summary ─────────────────────────────────────────────────────────
router.get('/summary', async (req, res) => {
  const { data, error } = await supabase
    .from('flagged_claims')
    .select('risk_level, amount');

  const rows = (!error && data && data.length > 0) ? data : DUMMY_CLAIMS;

  res.json({
    totalClaims : rows.length,
    highRisk    : rows.filter(c => c.risk_level === 'High Risk').length,
    suspicious  : rows.filter(c => c.risk_level === 'Suspicious').length,
    normal      : rows.filter(c => c.risk_level === 'Normal').length,
    totalAmount : rows.reduce((s, c) => s + (Number(c.amount) || 0), 0)
  });
});

// ── GET /api/prescriptions ───────────────────────────────────────────────────
router.get('/prescriptions', async (req, res) => {
  const { data, error } = await supabase
    .from('suspicious_prescriptions')
    .select('*')
    .order('count_24h', { ascending: false });

  if (error || !data || data.length === 0) {
    return res.json(DUMMY_PRESCRIPTIONS);
  }
  res.json(data);
});

// ── POST /api/export-log ─────────────────────────────────────────────────────
router.post('/export-log', async (req, res) => {
  const { report_type, record_count, exported_by } = req.body;

  const { error } = await supabase
    .from('export_logs')
    .insert([{
      report_type,
      record_count,
      exported_by,
      exported_at: new Date().toISOString()
    }]);

  if (error) {
    console.error('Supabase error /export-log:', error.message);
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true });
});

// ── GET /api/health ──────────────────────────────────────────────────────────
router.get('/health', async (req, res) => {
  res.json({
    status  : 'ok',
    service : 'TraceAI API',
    version : '1.0.0',
    time    : new Date().toISOString()
  });
});

module.exports = router;
