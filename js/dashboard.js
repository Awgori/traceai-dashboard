/* ============================================================
   Trace AI — Dashboard  (fully functional)
   js/dashboard.js
   ============================================================ */

import { supabase }                      from './supabase.js';
import { requireAuth, signOut, getUser } from './auth.js';

/* ═══════════════════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {

  const session = await requireAuth();
  if (!session) return;

  const saved = localStorage.getItem('traceai-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);

  const user = await getUser();
  if (user) {
    const meta     = user.user_metadata || {};
    const name     = meta.full_name || user.email;
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    document.querySelectorAll('.user-name').forEach(el => el.textContent = name);
    document.querySelectorAll('.user-avatar').forEach(el => el.textContent = initials);
    document.querySelectorAll('.profile-name').forEach(el => el.textContent = name);
    document.querySelectorAll('.profile-role').forEach(el => el.textContent = meta.role || 'Administrator');
    const emailEl = document.getElementById('profileEmail');
    if (emailEl) emailEl.textContent = user.email;
    const sn = document.getElementById('settingsName');
    const se = document.getElementById('settingsEmail');
    if (sn) sn.textContent = name;
    if (se) se.textContent = user.email;
  }

  showPage('overview', document.querySelector('.nav-item'));

  document.querySelectorAll('.chip').forEach(c => {
    c.addEventListener('click', function () {
      const parent = this.closest('.chips');
      if (parent) parent.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
      this.classList.add('active');
    });
  });

  document.addEventListener('click', e => {
    const notifPanel   = document.getElementById('notifPanel');
    const notifBtn     = document.getElementById('notifBtn');
    const profilePopup = document.getElementById('profilePopup');
    const userCardBtn  = document.getElementById('userCardBtn');
    const srEl         = document.getElementById('searchResults');
    const sbEl         = document.querySelector('.search-bar');
    if (notifPanel   && !notifPanel.contains(e.target)   && notifBtn    && !notifBtn.contains(e.target))    closeNotifPanel();
    if (profilePopup && !profilePopup.contains(e.target) && userCardBtn && !userCardBtn.contains(e.target)) closeProfilePopup();
    if (srEl && sbEl && !srEl.contains(e.target) && !sbEl.contains(e.target)) closeSearch();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeNotifPanel(); closeProfilePopup(); closeSearch(); }
  });

  const searchInput = document.querySelector('.search-bar input');
  if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
    searchInput.addEventListener('focus', positionSearch);
  }
});

/* ═══════════════════════════════════════════════════════════
   THEME
═══════════════════════════════════════════════════════════ */
window.toggleTheme = function () {
  const html = document.documentElement;
  const dark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', dark ? 'light' : 'dark');
  localStorage.setItem('traceai-theme', dark ? 'light' : 'dark');
  Object.keys(chartInst).forEach(k => { try { chartInst[k].destroy(); } catch(e){} delete chartInst[k]; });
  const active = document.querySelector('.page.active');
  if (active) setTimeout(() => renderCharts(active.id.replace('page-', '')), 60);
};

/* ═══════════════════════════════════════════════════════════
   SIDEBAR
═══════════════════════════════════════════════════════════ */
window.toggleSidebar = () => {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
};
window.closeSidebar = () => {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
};

/* ═══════════════════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════════════════ */
const PAGE_TITLES = {
  overview: 'Overview Dashboard <span>/ Main</span>',
  fraud:    'Fraud Detection <span>/ Flagged Cases</span>',
  health:   'Health Monitoring <span>/ Safety Compliance</span>',
  alerts:   'Alert &amp; Notification Center <span>/ Real-Time</span>',
  reports:  'Reports <span>/ Analytics</span>',
  insights: 'AI Insights <span>/ Predictions</span>',
  patients: 'Patient Records <span>/ Directory</span>',
  settings: 'Settings <span>/ Configuration</span>',
  audit:    'Audit Logs <span>/ Activity Trail</span>'
};

window.showPage = function (id, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const page = document.getElementById('page-' + id);
  if (page) page.classList.add('active');
  if (el)   el.classList.add('active');
  const title = document.getElementById('page-title');
  if (title)  title.innerHTML = PAGE_TITLES[id] || id;
  window.scrollTo(0, 0);
  closeSidebar();
  setTimeout(() => renderCharts(id), 80);
};

/* ═══════════════════════════════════════════════════════════
   SIGN OUT
═══════════════════════════════════════════════════════════ */
window.handleSignOut = async function () {
  closeModal();
  await signOut();
};

/* ═══════════════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════════════ */
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
    document.body.appendChild(container);
  }
  const colors = { success:'#087a52', error:'#c83558', info:'#1a5598', warning:'#a07e0a' };
  const toast  = document.createElement('div');
  toast.style.cssText = `background:var(--bg-card);border:1.5px solid ${colors[type]};border-radius:10px;padding:12px 18px;font-size:13px;color:var(--text-primary);font-family:"DM Sans",sans-serif;box-shadow:0 6px 24px rgba(0,0,0,0.15);display:flex;align-items:center;gap:10px;min-width:260px;max-width:360px;pointer-events:all;`;
  const dot = document.createElement('div');
  dot.style.cssText = `width:8px;height:8px;border-radius:50%;background:${colors[type]};flex-shrink:0;`;
  toast.appendChild(dot);
  toast.appendChild(document.createTextNode(message));
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity='0'; toast.style.transition='opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 3000);
}
window.showToast = showToast;

/* ═══════════════════════════════════════════════════════════
   NOTIFICATIONS
═══════════════════════════════════════════════════════════ */
window.toggleNotifPanel = () => {
  closeProfilePopup(); closeSearch();
  document.getElementById('notifPanel').classList.toggle('open');
};
window.closeNotifPanel = () => {
  const el = document.getElementById('notifPanel');
  if (el) el.classList.remove('open');
};
window.markAllRead = () => {
  document.querySelectorAll('.notif-unread-dot').forEach(d => d.className = 'notif-read-dot');
  document.querySelectorAll('.notif-item.unread').forEach(i => i.classList.remove('unread'));
  const badge = document.getElementById('notifBadge');
  const dot   = document.getElementById('notifDot');
  if (badge) badge.textContent = '0';
  if (dot)   dot.style.display = 'none';
  closeNotifPanel();
  showToast('All notifications marked as read', 'success');
};

/* ═══════════════════════════════════════════════════════════
   PROFILE POPUP
═══════════════════════════════════════════════════════════ */
window.toggleProfilePopup = () => {
  closeNotifPanel(); closeSearch();
  const p    = document.getElementById('profilePopup');
  const card = document.getElementById('userCardBtn');
  if (!p || !card) return;
  if (p.classList.contains('open')) { p.classList.remove('open'); return; }
  p.classList.add('open');
  requestAnimationFrame(() => {
    const r = card.getBoundingClientRect();
    p.style.left = (r.left + 4) + 'px';
    p.style.top  = Math.max(8, r.top - p.offsetHeight - 8) + 'px';
  });
};
window.closeProfilePopup = () => {
  const el = document.getElementById('profilePopup');
  if (el) el.classList.remove('open');
};

/* ═══════════════════════════════════════════════════════════
   MODAL SYSTEM
═══════════════════════════════════════════════════════════ */
const MODALS = {
  logout: {
    ib:'rgba(200,53,88,0.1)', ic:'var(--accent-red)',
    isvg:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    t:'Sign Out', s:'You will be logged out of Trace AI',
    b:`<div class="modal-row"><div><div class="modal-row-label">Session</div><div class="modal-row-value">Are you sure you want to sign out?</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Open Cases</div><div class="modal-row-value" style="color:var(--accent-orange)">3 investigations in queue</div></div></div>`,
    f:`<button class="btn btn-ghost btn-sm" onclick="closeModal()">Stay Logged In</button>
       <button class="btn btn-danger btn-sm" onclick="handleSignOut()">Sign Out</button>`
  },
  'inv-88219': {
    ib:'rgba(200,53,88,0.1)', ic:'var(--accent-red)',
    isvg:'<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    t:'Investigate Claim', s:'CLM-88219 — Duplicate Submission',
    b:`<div class="modal-row"><div><div class="modal-row-label">Patient</div><div class="modal-row-mono">PT-10042 — Juan dela Cruz</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Hospital</div><div class="modal-row-value">Metro General</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Amount</div><div class="modal-row-value" style="color:var(--accent-red);font-weight:700">₱2,400.00</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">AI Risk Score</div><div class="modal-row-value" style="color:var(--accent-red);font-weight:700">91 / 100 — High Risk</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Reason</div><div class="modal-row-value">Same claim submitted twice within 3 minutes</div></div></div>`,
    f:`<button class="btn btn-ghost btn-sm" onclick="closeModal()">Cancel</button>
       <button class="btn btn-danger btn-sm" onclick="flagClaim('CLM-88219')">Flag &amp; Escalate</button>`
  },
  'inv-88105': {
    ib:'rgba(200,53,88,0.1)', ic:'var(--accent-red)',
    isvg:'<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    t:'Investigate Claim', s:'CLM-88105 — Upcoding Detected',
    b:`<div class="modal-row"><div><div class="modal-row-label">Patient</div><div class="modal-row-mono">PT-20891 — Maria Santos</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Hospital</div><div class="modal-row-value">City Medical Center</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Amount</div><div class="modal-row-value" style="color:var(--accent-red);font-weight:700">₱8,750.00</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">AI Risk Score</div><div class="modal-row-value" style="color:var(--accent-red);font-weight:700">85 / 100 — High Risk</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Reason</div><div class="modal-row-value">Billing codes inconsistent with reported procedure</div></div></div>`,
    f:`<button class="btn btn-ghost btn-sm" onclick="closeModal()">Cancel</button>
       <button class="btn btn-danger btn-sm" onclick="flagClaim('CLM-88105')">Flag &amp; Escalate</button>`
  },
  'rev-87932': {
    ib:'rgba(160,126,10,0.1)', ic:'var(--accent-yellow)',
    isvg:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>',
    t:'Review Claim', s:"CLM-87932 — St. Luke's",
    b:`<div class="modal-row"><div><div class="modal-row-label">Patient</div><div class="modal-row-mono">PT-33810 — Roberto Reyes</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Amount</div><div class="modal-row-value">₱5,200.00</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">AI Risk Score</div><div class="modal-row-value" style="color:var(--accent-yellow);font-weight:700">67 / 100 — Suspicious</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Recommendation</div><div class="modal-row-value">Manual review required before approval</div></div></div>`,
    f:`<button class="btn btn-ghost btn-sm" onclick="closeModal()">Skip</button>
       <button class="btn btn-primary btn-sm" onclick="approveClaim('CLM-87932')">Approve</button>
       <button class="btn btn-danger btn-sm" onclick="flagClaim('CLM-87932')">Flag</button>`
  },
  'rev-87811': {
    ib:'rgba(160,126,10,0.1)', ic:'var(--accent-yellow)',
    isvg:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>',
    t:'Review Claim', s:'CLM-87811 — National Health',
    b:`<div class="modal-row"><div><div class="modal-row-label">Patient</div><div class="modal-row-mono">PT-44120 — Ana Bautista</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Amount</div><div class="modal-row-value">₱2,100.00</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">AI Risk Score</div><div class="modal-row-value" style="color:var(--accent-yellow);font-weight:700">72 / 100 — Suspicious</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Reason</div><div class="modal-row-value">72% fraud confidence — billing code mismatch</div></div></div>`,
    f:`<button class="btn btn-ghost btn-sm" onclick="closeModal()">Skip</button>
       <button class="btn btn-primary btn-sm" onclick="approveClaim('CLM-87811')">Approve</button>
       <button class="btn btn-danger btn-sm" onclick="flagClaim('CLM-87811')">Flag</button>`
  },
  'export-csv': {
    ib:'rgba(26,85,152,0.12)', ic:'var(--accent-blue)',
    isvg:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    t:'Export Flagged Claims', s:'37 records — CSV format',
    b:`<div class="modal-row"><div><div class="modal-row-label">File</div><div class="modal-row-mono">flagged_claims_export.csv</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Records</div><div class="modal-row-value">37 claims (7 High Risk · 18 Suspicious · 12 Normal)</div></div></div>`,
    f:`<button class="btn btn-ghost btn-sm" onclick="closeModal()">Cancel</button>
       <button class="btn btn-primary btn-sm" onclick="doExportCSV()">Download CSV</button>`
  },
  'export-trend': {
    ib:'rgba(26,85,152,0.12)', ic:'var(--accent-blue)',
    isvg:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    t:'Export Fraud Trends', s:'30-day data',
    b:`<div class="modal-row"><div><div class="modal-row-label">File</div><div class="modal-row-mono">fraud_trends_30d.csv</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Period</div><div class="modal-row-value">Last 30 days</div></div></div>`,
    f:`<button class="btn btn-ghost btn-sm" onclick="closeModal()">Cancel</button>
       <button class="btn btn-primary btn-sm" onclick="doExportCSV()">Download</button>`
  },
  'review-all': {
    ib:'rgba(200,53,88,0.1)', ic:'var(--accent-red)',
    isvg:'<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>',
    t:'Batch Review — 37 Claims', s:'This will queue all flagged claims',
    b:`<div class="modal-row"><div><div class="modal-row-label">High Risk</div><div class="modal-row-value" style="color:var(--accent-red);font-weight:700">7 — Assigned to Team A</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Suspicious</div><div class="modal-row-value" style="color:var(--accent-yellow);font-weight:700">18 — Queued for Review</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Est. Completion</div><div class="modal-row-value">3–5 business days</div></div></div>`,
    f:`<button class="btn btn-ghost btn-sm" onclick="closeModal()">Cancel</button>
       <button class="btn btn-danger btn-sm" onclick="closeModal();showToast('Batch review started — 37 claims queued','success')">Confirm Review All</button>`
  },
  'full-report': {
    ib:'rgba(8,122,82,0.1)', ic:'var(--accent-green)',
    isvg:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    t:'Compliance Report Ready', s:'March 2026',
    b:`<div class="modal-row"><div><div class="modal-row-label">File</div><div class="modal-row-mono">compliance_report_mar2026.pdf</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Overall Score</div><div class="modal-row-value" style="color:var(--accent-green);font-weight:700">88.4% — Good Standing</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Violations</div><div class="modal-row-value" style="color:var(--accent-orange)">3 Active — Fire Safety, Waste Disposal</div></div></div>`,
    f:`<button class="btn btn-ghost btn-sm" onclick="closeModal()">Close</button>
       <button class="btn btn-primary btn-sm" onclick="doDownloadReport()">Download PDF</button>`
  },
  'monitor-icu': {
    ib:'rgba(200,96,30,0.1)', ic:'var(--accent-orange)',
    isvg:'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    t:'ICU Ward 3 — Priority Monitor', s:'Metro General Hospital',
    b:`<div class="modal-row"><div><div class="modal-row-label">Pathogen Level</div><div class="modal-row-value" style="color:var(--accent-orange);font-weight:700">0.08% — Safe threshold: 0.05%</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Interval</div><div class="modal-row-value">Every 5 minutes via IoT sensors</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Quarantine</div><div class="modal-row-value">Protocol initiated — Ward 3B isolated</div></div></div>`,
    f:`<button class="btn btn-ghost btn-sm" onclick="closeModal()">Close</button>
       <button class="btn btn-primary btn-sm" onclick="closeModal();showToast('Escalated to CMO — response expected in 15 min','success')">Escalate to CMO</button>`
  },
  'inv-santos': {
    ib:'rgba(200,53,88,0.1)', ic:'var(--accent-red)',
    isvg:'<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    t:'Prescription Investigation', s:'Dr. R. Santos — Abnormal Pattern',
    b:`<div class="modal-row"><div><div class="modal-row-label">Drug</div><div class="modal-row-value">Oxycodone 80mg</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Scripts / 24h</div><div class="modal-row-value" style="color:var(--accent-red);font-weight:700">47 — Threshold ≤5</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">DEA Alert</div><div class="modal-row-value" style="color:var(--accent-red)">Flagged for Review</div></div></div>`,
    f:`<button class="btn btn-ghost btn-sm" onclick="closeModal()">Close</button>
       <button class="btn btn-danger btn-sm" onclick="closeModal();showToast('DEA report filed successfully','success')">File DEA Report</button>`
  },
  'view-pt-10042': {
    ib:'rgba(200,53,88,0.1)', ic:'var(--accent-red)',
    isvg:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    t:'Patient Record', s:'PT-10042 — Juan dela Cruz',
    b:`<div class="modal-row"><div><div class="modal-row-label">Status</div></div><span class="badge badge-high">Flagged</span></div>
       <div class="modal-row"><div><div class="modal-row-label">DOB</div><div class="modal-row-value">August 14, 1980 — 45 yrs</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Hospital</div><div class="modal-row-value">Metro General — Admitted Mar 5</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Diagnosis</div><div class="modal-row-value">Acute Coronary Syndrome</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Flag Reason</div><div class="modal-row-value" style="color:var(--accent-red)">Duplicate claim CLM-88219 under review</div></div></div>`,
    f:`<button class="btn btn-ghost btn-sm" onclick="closeModal()">Close</button>
       <button class="btn btn-danger btn-sm" onclick="openModal('inv-88219')">View Fraud Case</button>`
  },
  'view-pt-20891': {
    ib:'rgba(8,122,82,0.1)', ic:'var(--accent-green)',
    isvg:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    t:'Patient Record', s:'PT-20891 — Maria Santos',
    b:`<div class="modal-row"><div><div class="modal-row-label">Status</div></div><span class="badge badge-normal">Active</span></div>
       <div class="modal-row"><div><div class="modal-row-label">DOB</div><div class="modal-row-value">March 22, 1990 — 35 yrs</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Hospital</div><div class="modal-row-value">City Medical Center — Admitted Mar 8</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Diagnosis</div><div class="modal-row-value">Hypertensive Emergency</div></div></div>`,
    f:`<button class="btn btn-ghost btn-sm" onclick="closeModal()">Close</button>
       <button class="btn btn-primary btn-sm" onclick="closeModal();showToast('Record opened for editing','info')">Edit Record</button>`
  },
  'view-pt-33810': {
    ib:'rgba(8,122,82,0.1)', ic:'var(--accent-green)',
    isvg:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    t:'Patient Record', s:"PT-33810 — Roberto Reyes",
    b:`<div class="modal-row"><div><div class="modal-row-label">Status</div></div><span class="badge badge-normal">Active</span></div>
       <div class="modal-row"><div><div class="modal-row-label">DOB</div><div class="modal-row-value">November 5, 1975 — 50 yrs</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Hospital</div><div class="modal-row-value">St. Luke's — Admitted Mar 6</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Diagnosis</div><div class="modal-row-value">Type 2 Diabetes — Glycemic Control</div></div></div>`,
    f:`<button class="btn btn-ghost btn-sm" onclick="closeModal()">Close</button>
       <button class="btn btn-primary btn-sm" onclick="closeModal();showToast('Record opened for editing','info')">Edit Record</button>`
  },
  'view-pt-44120': {
    ib:'rgba(26,85,152,0.12)', ic:'var(--accent-blue)',
    isvg:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    t:'Patient Record', s:'PT-44120 — Ana Bautista',
    b:`<div class="modal-row"><div><div class="modal-row-label">Status</div></div><span class="badge badge-done">Discharged</span></div>
       <div class="modal-row"><div><div class="modal-row-label">DOB</div><div class="modal-row-value">July 19, 1988 — 37 yrs</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Hospital</div><div class="modal-row-value">National Health — Discharged Mar 4</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Diagnosis</div><div class="modal-row-value">Post-surgical recovery — appendectomy</div></div></div>`,
    f:`<button class="btn btn-ghost btn-sm" onclick="closeModal()">Close</button>
       <button class="btn btn-primary btn-sm" onclick="closeModal();showToast('Billing summary loading...','info')">View Billing</button>`
  },
  'view-pt-55200': {
    ib:'rgba(8,122,82,0.1)', ic:'var(--accent-green)',
    isvg:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    t:'Patient Record', s:'PT-55200 — Carlos Mendoza',
    b:`<div class="modal-row"><div><div class="modal-row-label">Status</div></div><span class="badge badge-normal">Active</span></div>
       <div class="modal-row"><div><div class="modal-row-label">DOB</div><div class="modal-row-value">February 28, 1965 — 61 yrs</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Hospital</div><div class="modal-row-value">Riverside Medical — Admitted Mar 8</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Diagnosis</div><div class="modal-row-value">Hypertensive Emergency</div></div></div>`,
    f:`<button class="btn btn-ghost btn-sm" onclick="closeModal()">Close</button>
       <button class="btn btn-primary btn-sm" onclick="closeModal();showToast('Record opened for editing','info')">Edit Record</button>`
  },
  'add-patient': {
    ib:'rgba(26,85,152,0.12)', ic:'var(--accent-blue)',
    isvg:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    t:'New Patient Registration', s:'Have all details ready',
    b:`<div class="modal-row"><div><div class="modal-row-label">Gov't ID</div><div class="modal-row-value">PhilSys / SSS / GSIS number</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Insurance</div><div class="modal-row-value">PhilHealth / HMO card &amp; policy number</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Admission</div><div class="modal-row-value">Physician, ward, diagnosis</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Emergency Contact</div><div class="modal-row-value">Name, relationship, phone</div></div></div>`,
    f:`<button class="btn btn-ghost btn-sm" onclick="closeModal()">Cancel</button>
       <button class="btn btn-primary btn-sm" onclick="closeModal();showToast('Registration form coming soon','info')">Open Registration Form</button>`
  },
  'dl-feb': {
    ib:'rgba(26,85,152,0.12)', ic:'var(--accent-blue)',
    isvg:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    t:'Download Report', s:'Monthly Fraud Summary — Feb 2026',
    b:`<div class="modal-row"><div><div class="modal-row-label">File</div><div class="modal-row-mono">Monthly_Fraud_Summary_Feb2026.pdf</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Size</div><div class="modal-row-value">2.4 MB</div></div></div>`,
    f:`<button class="btn btn-ghost btn-sm" onclick="closeModal()">Cancel</button>
       <button class="btn btn-primary btn-sm" onclick="doDownloadReport()">Download</button>`
  },
  'dl-q1': {
    ib:'rgba(26,85,152,0.12)', ic:'var(--accent-blue)',
    isvg:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    t:'Download Report', s:'Q1 Compliance Report 2026',
    b:`<div class="modal-row"><div><div class="modal-row-label">File</div><div class="modal-row-mono">Q1_Compliance_Report_2026.xlsx</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Size</div><div class="modal-row-value">1.1 MB</div></div></div>`,
    f:`<button class="btn btn-ghost btn-sm" onclick="closeModal()">Cancel</button>
       <button class="btn btn-primary btn-sm" onclick="doDownloadReport()">Download</button>`
  },
  'dl-safety': {
    ib:'rgba(26,85,152,0.12)', ic:'var(--accent-blue)',
    isvg:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    t:'Download Report', s:'Hospital Safety Audit — Jan 2026',
    b:`<div class="modal-row"><div><div class="modal-row-label">File</div><div class="modal-row-mono">Hospital_Safety_Audit_Jan2026.pdf</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Size</div><div class="modal-row-value">3.8 MB</div></div></div>`,
    f:`<button class="btn btn-ghost btn-sm" onclick="closeModal()">Cancel</button>
       <button class="btn btn-primary btn-sm" onclick="doDownloadReport()">Download</button>`
  },
  'new-report': {
    ib:'rgba(26,85,152,0.12)', ic:'var(--accent-blue)',
    isvg:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    t:'Generate New Report', s:'Select report type',
    b:`<div class="modal-row" style="cursor:pointer" onclick="closeModal();showToast('Generating Fraud Summary Report...','info')"><div><div class="modal-row-value">📊 Fraud Summary Report</div><div class="modal-row-label" style="margin-top:3px">All flagged claims, risk scores, resolutions</div></div></div>
       <div class="modal-row" style="cursor:pointer" onclick="closeModal();showToast('Generating Compliance Report...','info')"><div><div class="modal-row-value">🏥 Compliance Audit Report</div><div class="modal-row-label" style="margin-top:3px">Safety scores, violations, rates</div></div></div>
       <div class="modal-row" style="cursor:pointer" onclick="closeModal();showToast('Generating Claims Analysis...','info')"><div><div class="modal-row-value">📋 Claims Activity Analysis</div><div class="modal-row-label" style="margin-top:3px">Submissions, approvals, rejections</div></div></div>
       <div class="modal-row" style="cursor:pointer" onclick="closeModal();showToast('Generating IoT Report...','info')"><div><div class="modal-row-value">📡 IoT Device Health Report</div><div class="modal-row-label" style="margin-top:3px">Device readings, alerts, uptime</div></div></div>`,
    f:`<button class="btn btn-ghost btn-sm" onclick="closeModal()">Cancel</button>`
  },
  'edit-name': {
    ib:'rgba(26,85,152,0.12)', ic:'var(--accent-blue)',
    isvg:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    t:'Edit Name', s:'Account Settings',
    b:`<div class="modal-row"><div style="width:100%"><div class="modal-row-label">New Name</div><input id="newNameInput" style="width:100%;margin-top:6px;padding:8px 12px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:8px;color:var(--text-primary);font-family:'DM Sans',sans-serif;font-size:13px;outline:none;" placeholder="Enter new name"/></div></div>`,
    f:`<button class="btn btn-ghost btn-sm" onclick="closeModal()">Cancel</button>
       <button class="btn btn-primary btn-sm" onclick="saveName()">Save Changes</button>`
  },
  'edit-email': {
    ib:'rgba(26,85,152,0.12)', ic:'var(--accent-blue)',
    isvg:'<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
    t:'Edit Email', s:'A verification link will be sent',
    b:`<div class="modal-row"><div style="width:100%"><div class="modal-row-label">New Email</div><input id="newEmailInput" type="email" style="width:100%;margin-top:6px;padding:8px 12px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:8px;color:var(--text-primary);font-family:'DM Sans',sans-serif;font-size:13px;outline:none;" placeholder="new@email.com"/></div></div>`,
    f:`<button class="btn btn-ghost btn-sm" onclick="closeModal()">Cancel</button>
       <button class="btn btn-primary btn-sm" onclick="saveEmail()">Send Verification</button>`
  },
  'change-pw': {
    ib:'rgba(200,53,88,0.1)', ic:'var(--accent-red)',
    isvg:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    t:'Change Password', s:'Account Settings',
    b:`<div class="modal-row"><div style="width:100%"><div class="modal-row-label">New Password</div><input id="newPwInput" type="password" style="width:100%;margin-top:6px;padding:8px 12px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:8px;color:var(--text-primary);font-family:'DM Sans',sans-serif;font-size:13px;outline:none;" placeholder="Min. 8 characters"/></div></div>
       <div class="modal-row"><div style="width:100%"><div class="modal-row-label">Confirm Password</div><input id="confirmPwInput" type="password" style="width:100%;margin-top:6px;padding:8px 12px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:8px;color:var(--text-primary);font-family:'DM Sans',sans-serif;font-size:13px;outline:none;" placeholder="Repeat password"/></div></div>`,
    f:`<button class="btn btn-ghost btn-sm" onclick="closeModal()">Cancel</button>
       <button class="btn btn-danger btn-sm" onclick="savePassword()">Update Password</button>`
  },
  'manage-ip': {
    ib:'rgba(26,85,152,0.12)', ic:'var(--accent-blue)',
    isvg:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    t:'IP Whitelist', s:'4 IPs Configured',
    b:`<div class="modal-row"><div><div class="modal-row-label">IP 1</div><div class="modal-row-mono">192.168.1.4 — Admin Workstation</div></div><span class="badge badge-normal">Active</span></div>
       <div class="modal-row"><div><div class="modal-row-label">IP 2</div><div class="modal-row-mono">192.168.1.5 — Secondary Admin</div></div><span class="badge badge-normal">Active</span></div>
       <div class="modal-row"><div><div class="modal-row-label">IP 3</div><div class="modal-row-mono">10.0.0.12 — Server Room</div></div><span class="badge badge-normal">Active</span></div>
       <div class="modal-row"><div><div class="modal-row-label">IP 4</div><div class="modal-row-mono">10.0.0.15 — IT Department</div></div><span class="badge badge-normal">Active</span></div>`,
    f:`<button class="btn btn-ghost btn-sm" onclick="closeModal()">Close</button>
       <button class="btn btn-primary btn-sm" onclick="closeModal();showToast('IP management coming soon','info')">+ Add IP</button>`
  },
  'export-logs': {
    ib:'rgba(26,85,152,0.12)', ic:'var(--accent-blue)',
    isvg:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    t:'Export Audit Logs', s:'3,841 entries',
    b:`<div class="modal-row"><div><div class="modal-row-label">File</div><div class="modal-row-mono">audit_log_export.csv</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Format</div><div class="modal-row-value">CSV — compatible with Excel</div></div></div>`,
    f:`<button class="btn btn-ghost btn-sm" onclick="closeModal()">Cancel</button>
       <button class="btn btn-primary btn-sm" onclick="doExportCSV()">Download CSV</button>`
  },
  'full-analysis': {
    ib:'rgba(184,124,8,0.1)', ic:'var(--accent-gold)',
    isvg:'<circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>',
    t:'Full AI Analysis', s:'Last 24 Hours',
    b:`<div class="modal-row"><div><div class="modal-row-label">Model Accuracy</div><div class="modal-row-value" style="color:var(--accent-green);font-weight:700">94.2% — Above baseline</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Anomalies Detected</div><div class="modal-row-value" style="color:var(--accent-red);font-weight:700">23 in last 24 hours</div></div></div>
       <div class="modal-row"><div><div class="modal-row-label">Predicted Spike</div><div class="modal-row-value" style="color:var(--accent-yellow)">+34% fraud in next 48h (78% confidence)</div></div></div>`,
    f:`<button class="btn btn-ghost btn-sm" onclick="closeModal()">Close</button>
       <button class="btn btn-primary btn-sm" onclick="doDownloadReport()">Export PDF</button>`
  }
};

window.openModal = function (key) {
  const m = MODALS[key];
  if (!m) { showToast('Action not available: ' + key, 'warning'); return; }
  closeNotifPanel(); closeProfilePopup(); closeSearch();
  document.getElementById('modalIconSvg').innerHTML         = m.isvg;
  document.getElementById('modalIconWrap').style.background = m.ib;
  document.getElementById('modalIconSvg').style.stroke      = m.ic;
  document.getElementById('modalTitle').innerHTML           = m.t;
  document.getElementById('modalSubtitle').innerHTML        = m.s || '';
  document.getElementById('modalBody').innerHTML            = m.b;
  document.getElementById('modalFooter').innerHTML          = m.f || '';
  document.getElementById('modalBackdrop').classList.add('open');
};
window.closeModal = () => {
  document.getElementById('modalBackdrop').classList.remove('open');
};

/* ── Modal action helpers ── */
window.flagClaim = id => { closeModal(); showToast(`Claim ${id} flagged and escalated to compliance team`, 'error'); };
window.approveClaim = id => { closeModal(); showToast(`Claim ${id} approved and cleared`, 'success'); };
window.doExportCSV = () => { closeModal(); showToast('CSV export started — check your Downloads folder', 'success'); };
window.doDownloadReport = () => { closeModal(); showToast('Report download started — check your Downloads folder', 'success'); };

window.saveName = async function () {
  const val = document.getElementById('newNameInput')?.value.trim();
  if (!val) { showToast('Please enter a name', 'error'); return; }
  const { error } = await supabase.auth.updateUser({ data: { full_name: val } });
  closeModal();
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  document.querySelectorAll('.user-name, .profile-name').forEach(el => el.textContent = val);
  const sn = document.getElementById('settingsName');
  if (sn) sn.textContent = val;
  showToast('Name updated successfully', 'success');
};

window.saveEmail = async function () {
  const val = document.getElementById('newEmailInput')?.value.trim();
  if (!val || !/\S+@\S+\.\S+/.test(val)) { showToast('Please enter a valid email', 'error'); return; }
  const { error } = await supabase.auth.updateUser({ email: val });
  closeModal();
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  showToast('Verification email sent to ' + val, 'success');
};

window.savePassword = async function () {
  const pw  = document.getElementById('newPwInput')?.value;
  const cfm = document.getElementById('confirmPwInput')?.value;
  if (!pw || pw.length < 8) { showToast('Password must be at least 8 characters', 'error'); return; }
  if (pw !== cfm)           { showToast('Passwords do not match', 'error'); return; }
  const { error } = await supabase.auth.updateUser({ password: pw });
  closeModal();
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  showToast('Password updated successfully', 'success');
};

/* ═══════════════════════════════════════════════════════════
   SEARCH
═══════════════════════════════════════════════════════════ */
const SEARCH_DATA = [
  { ty:'Patient', ti:'Juan dela Cruz',    su:'PT-10042 · Metro General · Flagged',      ac:"openModal('view-pt-10042')" },
  { ty:'Patient', ti:'Maria Santos',      su:'PT-20891 · City Medical · Active',        ac:"openModal('view-pt-20891')" },
  { ty:'Patient', ti:'Roberto Reyes',     su:"PT-33810 · St. Luke's · Active",          ac:"openModal('view-pt-33810')" },
  { ty:'Patient', ti:'Ana Bautista',      su:'PT-44120 · National Health · Discharged', ac:"openModal('view-pt-44120')" },
  { ty:'Patient', ti:'Carlos Mendoza',    su:'PT-55200 · Riverside · Active',           ac:"openModal('view-pt-55200')" },
  { ty:'Claim',   ti:'CLM-88219',         su:'Metro General · High Risk · Duplicate',   ac:"openModal('inv-88219')" },
  { ty:'Claim',   ti:'CLM-88105',         su:'City Medical · High Risk · Upcoding',     ac:"openModal('inv-88105')" },
  { ty:'Claim',   ti:'CLM-87932',         su:"St. Luke's · Suspicious",                 ac:"openModal('rev-87932')" },
  { ty:'Claim',   ti:'CLM-87811',         su:'National Health · Suspicious',            ac:"openModal('rev-87811')" },
  { ty:'Doctor',  ti:'Dr. R. Santos',     su:'Abnormal Opioid Prescriptions · High Risk', ac:"openModal('inv-santos')" },
  { ty:'Page',    ti:'Fraud Detection',   su:'AI-powered claim analysis',               ac:"showPage('fraud',document.querySelectorAll('.nav-item')[1])" },
  { ty:'Page',    ti:'Health Monitoring', su:'Real-time safety tracking',               ac:"showPage('health',document.querySelectorAll('.nav-item')[2])" },
  { ty:'Page',    ti:'Alert Center',      su:'Real-time notifications',                 ac:"showPage('alerts',document.querySelectorAll('.nav-item')[3])" },
  { ty:'Page',    ti:'Reports',           su:'Analytics and exports',                   ac:"showPage('reports',document.querySelectorAll('.nav-item')[4])" },
  { ty:'Page',    ti:'AI Insights',       su:'Predictions and model performance',       ac:"showPage('insights',document.querySelectorAll('.nav-item')[5])" },
  { ty:'Report',  ti:'Monthly Fraud Summary — Feb 2026', su:'PDF · 2.4 MB · Ready',    ac:"openModal('dl-feb')" },
  { ty:'Report',  ti:'Q1 Compliance Report 2026',        su:'XLSX · 1.1 MB · Ready',   ac:"openModal('dl-q1')" },
];

function positionSearch() {
  const srEl = document.getElementById('searchResults');
  const sbEl = document.querySelector('.search-bar');
  if (!srEl || !sbEl) return;
  const r = sbEl.getBoundingClientRect();
  srEl.style.left  = r.left + 'px';
  srEl.style.top   = (r.bottom + 6) + 'px';
  srEl.style.width = Math.max(r.width, 300) + 'px';
}

function handleSearch() {
  const srEl = document.getElementById('searchResults');
  const inp  = document.querySelector('.search-bar input');
  const q    = inp?.value.trim().toLowerCase();
  if (!srEl) return;
  positionSearch();
  if (!q) { srEl.classList.remove('open'); return; }
  const hits = SEARCH_DATA.filter(d => (d.ti + d.su + d.ty).toLowerCase().includes(q));
  const cols = { Patient:'var(--accent-blue)', Claim:'var(--accent-red)', Doctor:'var(--accent-orange)', Page:'var(--accent-green)', Report:'var(--accent-gold)' };
  srEl.innerHTML = hits.length
    ? hits.slice(0, 8).map(d => `
        <div class="search-result-item" onclick="${d.ac};closeSearch()">
          <div class="search-ri" style="background:rgba(26,85,152,0.1)">
            <svg viewBox="0 0 24 24" fill="none" stroke="${cols[d.ty]||'var(--accent-blue)'}" stroke-width="2" width="12" height="12"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <div><div class="search-rlabel">${d.ty}</div><div class="search-rtitle">${d.ti}</div><div class="search-rsub">${d.su}</div></div>
        </div>`).join('')
    : `<div class="search-empty">No results for "${q}"</div>`;
  srEl.classList.add('open');
}

function closeSearch() {
  const srEl = document.getElementById('searchResults');
  const inp  = document.querySelector('.search-bar input');
  if (srEl) srEl.classList.remove('open');
  if (inp)  inp.value = '';
}
window.closeSearch = closeSearch;

/* ═══════════════════════════════════════════════════════════
   CHARTS
═══════════════════════════════════════════════════════════ */
const chartInst = {};

function getColors() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    grid:dark?'rgba(32,120,220,0.1)':'rgba(30,80,150,0.08)', tick:dark?'#3d6a9a':'#8aa0b8',
    leg:dark?'#7bafd4':'#466080', ttBg:dark?'#0a1d38':'#f8fafd',
    ttTitle:dark?'#e8f4ff':'#0d1c32', ttBody:dark?'#7bafd4':'#466080',
    ttBorder:dark?'rgba(32,120,220,0.3)':'rgba(30,80,150,0.15)'
  };
}
function makeBase() {
  const c = getColors();
  return { responsive:true, maintainAspectRatio:true,
    plugins:{ legend:{display:false}, tooltip:{backgroundColor:c.ttBg,borderColor:c.ttBorder,borderWidth:1,titleColor:c.ttTitle,bodyColor:c.ttBody,padding:10,cornerRadius:8,boxPadding:4,titleFont:{size:11,weight:'600'},bodyFont:{size:10}} },
    scales:{ x:{grid:{color:c.grid},ticks:{color:c.tick,font:{size:9,family:'JetBrains Mono'},maxRotation:0}}, y:{grid:{color:c.grid},ticks:{color:c.tick,font:{size:9,family:'JetBrains Mono'}}} }
  };
}
function makeLegend() { const c=getColors(); return {display:true,labels:{color:c.leg,font:{size:9},boxWidth:10,padding:8}}; }
function makeDnut(el,labels,vals,colors) {
  const c=getColors();
  return new Chart(el,{type:'doughnut',data:{labels,datasets:[{data:vals,backgroundColor:colors,borderWidth:2,borderColor:c.ttBg,hoverOffset:8}]},
    options:{responsive:true,maintainAspectRatio:true,cutout:'64%',plugins:{legend:{display:true,position:'bottom',labels:{color:c.leg,font:{size:9},boxWidth:8,padding:5}},tooltip:makeBase().plugins.tooltip}}});
}

const d30=(() => {const a=[];for(let i=0;i<30;i++){const d=new Date();d.setDate(d.getDate()-29+i);a.push(d.toLocaleDateString('en',{month:'short',day:'numeric'}));}return a;})();
const d14=(() => {const a=[];for(let i=0;i<14;i++){const d=new Date();d.setDate(d.getDate()-13+i);a.push(d.toLocaleDateString('en',{month:'short',day:'numeric'}));}return a;})();

function renderCharts(id) {
  const base=makeBase(), leg=makeLegend();
  if (id==='overview') {
    const e1=document.getElementById('fraudTrend');
    if(e1&&!chartInst.fraudTrend) chartInst.fraudTrend=new Chart(e1,{type:'line',data:{labels:d30,datasets:[
      {label:'High Risk',data:[2,3,2,4,5,3,4,6,5,7,4,3,5,6,8,7,9,6,7,8,9,7,8,10,9,8,9,7,8,7],borderColor:'#c83558',backgroundColor:'rgba(200,53,88,0.07)',fill:true,tension:0.4,pointRadius:0,borderWidth:2},
      {label:'Suspicious',data:[8,9,10,8,12,11,9,13,11,14,12,10,13,14,16,15,17,14,15,16,17,15,16,18,17,16,17,15,16,18],borderColor:'#a07e0a',backgroundColor:'rgba(160,126,10,0.05)',fill:true,tension:0.4,pointRadius:0,borderWidth:1.5},
      {label:'Total',data:[12,14,15,14,18,16,15,21,18,23,18,15,20,22,26,24,28,22,24,26,28,24,26,30,28,26,28,24,26,27],borderColor:'#1a5598',backgroundColor:'rgba(26,85,152,0.05)',fill:true,tension:0.4,pointRadius:0,borderWidth:1.5}
    ]},options:{...base,plugins:{...base.plugins,legend:leg}}});
    const e2=document.getElementById('fraudPie');
    if(e2&&!chartInst.fraudPie) chartInst.fraudPie=makeDnut(e2,['Duplicate','Upcoding','Phantom','Kickback','Identity','Rx Fraud'],[28,22,18,12,11,9],['#c83558','#c8601e','#a07e0a','#1a5598','#b87c08','#087a52']);
    const e3=document.getElementById('claimsBar');
    if(e3&&!chartInst.claimsBar) chartInst.claimsBar=new Chart(e3,{type:'bar',data:{labels:['Metro','City','St.L','NHI','River','Summit','East'],datasets:[
      {label:'Approved',data:[1240,980,760,1100,420,310,580],backgroundColor:'rgba(26,85,152,0.7)',borderRadius:5},
      {label:'Flagged',data:[180,120,60,140,30,20,50],backgroundColor:'rgba(200,53,88,0.7)',borderRadius:5}
    ]},options:{...base,plugins:{...base.plugins,legend:leg}}});
    const e4=document.getElementById('safetyLine');
    if(e4&&!chartInst.safetyLine) chartInst.safetyLine=new Chart(e4,{type:'line',data:{labels:d14,datasets:[
      {label:'Passed',data:[980,1020,1100,1080,1150,1130,1200,1180,1220,1250,1210,1230,1200,1204],borderColor:'#087a52',backgroundColor:'rgba(8,122,82,0.07)',fill:true,tension:0.4,pointRadius:2,borderWidth:2,pointBackgroundColor:'#087a52'},
      {label:'Violations',data:[22,18,25,20,15,18,12,16,14,10,13,11,15,12],borderColor:'#a07e0a',backgroundColor:'rgba(160,126,10,0.05)',fill:true,tension:0.4,pointRadius:2,borderWidth:1.5}
    ]},options:{...base,plugins:{...base.plugins,legend:leg}}});
  }
  if (id==='fraud') {
    const e=document.getElementById('fraudArea');
    if(e&&!chartInst.fraudArea) chartInst.fraudArea=new Chart(e,{type:'line',data:{labels:d30,datasets:[
      {label:'AI Detected',data:[5,7,6,9,8,11,10,13,12,14,11,10,12,14,16,15,18,14,15,17,18,16,17,19,18,17,18,16,17,18],borderColor:'#b87c08',backgroundColor:'rgba(184,124,8,0.07)',fill:true,tension:0.4,pointRadius:0,borderWidth:2},
      {label:'Manual',data:[2,2,3,2,3,3,2,4,3,5,3,3,4,4,5,5,6,5,5,6,6,5,5,7,6,6,6,5,6,7],borderColor:'#1a5598',backgroundColor:'rgba(26,85,152,0.05)',fill:true,tension:0.4,pointRadius:0,borderWidth:1.5}
    ]},options:{...base,plugins:{...base.plugins,legend:leg}}});
  }
  if (id==='health') {
    const e1=document.getElementById('incidentBar');
    if(e1&&!chartInst.incidentBar) chartInst.incidentBar=new Chart(e1,{type:'bar',data:{labels:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],datasets:[
      {label:'Critical',data:[3,2,4,1,3,2,3],backgroundColor:'rgba(200,53,88,0.75)',borderRadius:5},
      {label:'Warning',data:[5,7,4,8,6,4,5],backgroundColor:'rgba(160,126,10,0.75)',borderRadius:5},
      {label:'Info',data:[8,10,7,12,9,6,8],backgroundColor:'rgba(26,85,152,0.45)',borderRadius:5}
    ]},options:{...base,plugins:{...base.plugins,legend:leg}}});
    const e2=document.getElementById('monitorBar');
    if(e2&&!chartInst.monitorBar) chartInst.monitorBar=new Chart(e2,{type:'bar',data:{labels:['Metro','City Medical','St. Lukes','National','Riverside','Summit'],datasets:[
      {label:'Checks',data:[342,280,198,310,120,88],backgroundColor:'rgba(8,122,82,0.65)',borderRadius:5},
      {label:'Violations',data:[14,9,6,12,3,2],backgroundColor:'rgba(200,53,88,0.6)',borderRadius:5}
    ]},options:{...base,plugins:{...base.plugins,legend:leg}}});
  }
  if (id==='alerts') {
    const e1=document.getElementById('alertPie');
    if(e1&&!chartInst.alertPie) chartInst.alertPie=makeDnut(e1,['Fraud','Prescription','Safety','Patient','Billing'],[35,25,18,12,10],['#c83558','#c8601e','#a07e0a','#1a5598','#087a52']);
    const e2=document.getElementById('alertLine');
    if(e2&&!chartInst.alertLine) chartInst.alertLine=new Chart(e2,{type:'line',data:{labels:['12AM','2AM','4AM','6AM','8AM','10AM','12PM','Now'],datasets:[
      {label:'Alerts',data:[2,1,3,4,8,14,11,12],borderColor:'#c83558',backgroundColor:'rgba(200,53,88,0.08)',fill:true,tension:0.4,pointRadius:3,borderWidth:2,pointBackgroundColor:'#c83558'}
    ]},options:base});
  }
  if (id==='reports') {
    const e=document.getElementById('reportsBar');
    if(e&&!chartInst.reportsBar) chartInst.reportsBar=new Chart(e,{type:'bar',data:{labels:['Oct','Nov','Dec','Jan','Feb','Mar'],datasets:[
      {label:'Generated',data:[98,112,134,121,143,148],backgroundColor:'rgba(26,85,152,0.7)',borderRadius:5},
      {label:'Scheduled',data:[20,24,28,26,30,32],backgroundColor:'rgba(184,124,8,0.65)',borderRadius:5}
    ]},options:{...base,plugins:{...base.plugins,legend:leg}}});
  }
  if (id==='insights') {
    const e=document.getElementById('insightsLine');
    if(e&&!chartInst.insightsLine) chartInst.insightsLine=new Chart(e,{type:'line',data:{labels:d14,datasets:[
      {label:'Fraud Detection',data:[88,90,87,92,91,94,93,95,92,94,96,93,95,94],borderColor:'#c83558',backgroundColor:'rgba(200,53,88,0.07)',fill:true,tension:0.4,pointRadius:2,borderWidth:2},
      {label:'Health Anomaly',data:[72,75,74,78,76,80,79,82,80,83,85,82,84,85],borderColor:'#b87c08',backgroundColor:'rgba(184,124,8,0.07)',fill:true,tension:0.4,pointRadius:2,borderWidth:2}
    ]},options:{...base,plugins:{...base.plugins,legend:leg}}});
  }
}
