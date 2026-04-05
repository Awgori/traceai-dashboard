/* ============================================================
   Trace AI — Dashboard JS
   js/dashboard.js
   ============================================================ */

import { requireAuth, signOut, getUser, toggleTheme } from './auth.js';

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', async () => {
  // Guard: redirect to login if not authenticated
  const session = await requireAuth();
  if (!session) return;

  // Populate user info in sidebar
  const user = await getUser();
  if (user) {
    const meta = user.user_metadata || {};
    const name = meta.full_name || user.email;
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    document.querySelectorAll('.user-name').forEach(el => el.textContent = name);
    document.querySelectorAll('.user-avatar').forEach(el => el.textContent = initials);
    document.querySelectorAll('.profile-name').forEach(el => el.textContent = name);
    document.querySelectorAll('.profile-role').forEach(el => el.textContent = meta.role || 'User');
  }

  // Restore theme
  const saved = localStorage.getItem('traceai-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);

  // Show first page
  showPage('overview', document.querySelector('.nav-item'));

  // Chips
  document.querySelectorAll('.chip').forEach(c => {
    c.addEventListener('click', function () {
      const parent = this.closest('.chips');
      if (parent) parent.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // Close panels on outside click
  document.addEventListener('click', e => {
    const notifPanel   = document.getElementById('notifPanel');
    const notifBtn     = document.getElementById('notifBtn');
    const profilePopup = document.getElementById('profilePopup');
    const userCardBtn  = document.getElementById('userCardBtn');
    const srEl         = document.getElementById('searchResults');
    const sbEl         = document.querySelector('.search-bar');

    if (notifPanel   && !notifPanel.contains(e.target)   && notifBtn   && !notifBtn.contains(e.target))   closeNotifPanel();
    if (profilePopup && !profilePopup.contains(e.target) && userCardBtn && !userCardBtn.contains(e.target)) closeProfilePopup();
    if (srEl && sbEl && !srEl.contains(e.target) && !sbEl.contains(e.target)) srEl.classList.remove('open');
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeNotifPanel(); closeProfilePopup(); }
  });
});

/* ── Theme ── */
window.toggleTheme = function () {
  toggleTheme();
  // Rebuild charts after theme change
  Object.keys(chartInst).forEach(k => { try { chartInst[k].destroy(); } catch (e) {} delete chartInst[k]; });
  const active = document.querySelector('.page.active');
  if (active) setTimeout(() => renderCharts(active.id.replace('page-', '')), 60);
};

/* ── Sidebar / Mobile ── */
window.toggleSidebar = () => {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
};
window.closeSidebar = () => {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
};

/* ── Navigation ── */
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
  if (el) el.classList.add('active');
  const title = document.getElementById('page-title');
  if (title) title.innerHTML = PAGE_TITLES[id] || id;
  window.scrollTo(0, 0);
  closeSidebar();
  setTimeout(() => renderCharts(id), 80);
};

/* ── Sign Out ── */
window.handleSignOut = async function () {
  await signOut();
};

/* ── Notifications ── */
window.toggleNotifPanel = () => {
  closeProfilePopup();
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
};

/* ── Profile popup ── */
window.toggleProfilePopup = () => {
  closeNotifPanel();
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

/* ── Modal ── */
window.openModal = function (key) {
  closeNotifPanel(); closeProfilePopup();
  const m = MODALS[key]; if (!m) return;
  document.getElementById('modalIconSvg').innerHTML    = m.isvg;
  document.getElementById('modalIconWrap').style.background = m.ib;
  document.getElementById('modalIconSvg').style.stroke = m.ic;
  document.getElementById('modalTitle').innerHTML      = m.t;
  document.getElementById('modalSubtitle').innerHTML   = m.s || '';
  document.getElementById('modalBody').innerHTML       = m.b;
  document.getElementById('modalFooter').innerHTML     = m.f || '';
  document.getElementById('modalBackdrop').classList.add('open');
};
window.closeModal = () => {
  document.getElementById('modalBackdrop').classList.remove('open');
};

/* ── Charts ── */
const chartInst = {};

function getColors() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    grid: dark ? 'rgba(32,120,220,0.1)' : 'rgba(30,80,150,0.08)',
    tick: dark ? '#3d6a9a' : '#8aa0b8',
    leg:  dark ? '#7bafd4' : '#466080',
    ttBg:     dark ? '#0a1d38' : '#f8fafd',
    ttTitle:  dark ? '#e8f4ff' : '#0d1c32',
    ttBody:   dark ? '#7bafd4' : '#466080',
    ttBorder: dark ? 'rgba(32,120,220,0.3)' : 'rgba(30,80,150,0.15)'
  };
}

function makeBase() {
  const c = getColors();
  return {
    responsive: true, maintainAspectRatio: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: c.ttBg, borderColor: c.ttBorder, borderWidth: 1,
        titleColor: c.ttTitle, bodyColor: c.ttBody, padding: 10,
        cornerRadius: 8, boxPadding: 4,
        titleFont: { size: 11, weight: '600' }, bodyFont: { size: 10 }
      }
    },
    scales: {
      x: { grid: { color: c.grid }, ticks: { color: c.tick, font: { size: 9, family: 'JetBrains Mono' }, maxRotation: 0 } },
      y: { grid: { color: c.grid }, ticks: { color: c.tick, font: { size: 9, family: 'JetBrains Mono' } } }
    }
  };
}

function makeLegend() {
  const c = getColors();
  return { display: true, labels: { color: c.leg, font: { size: 9 }, boxWidth: 10, padding: 8 } };
}

function makeDnut(el, labels, vals, colors) {
  const c = getColors();
  return new Chart(el, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: vals, backgroundColor: colors, borderWidth: 2, borderColor: c.ttBg, hoverOffset: 8 }] },
    options: {
      responsive: true, maintainAspectRatio: true, cutout: '64%',
      plugins: {
        legend: { display: true, position: 'bottom', labels: { color: c.leg, font: { size: 9 }, boxWidth: 8, padding: 5 } },
        tooltip: makeBase().plugins.tooltip
      }
    }
  });
}

const d30 = (() => { const a = []; for (let i = 0; i < 30; i++) { const d = new Date(); d.setDate(d.getDate() - 29 + i); a.push(d.toLocaleDateString('en', { month: 'short', day: 'numeric' })); } return a; })();
const d14 = (() => { const a = []; for (let i = 0; i < 14; i++) { const d = new Date(); d.setDate(d.getDate() - 13 + i); a.push(d.toLocaleDateString('en', { month: 'short', day: 'numeric' })); } return a; })();

function renderCharts(id) {
  const base = makeBase(), leg = makeLegend();

  if (id === 'overview') {
    const e1 = document.getElementById('fraudTrend');
    if (e1 && !chartInst.fraudTrend) chartInst.fraudTrend = new Chart(e1, { type: 'line', data: { labels: d30, datasets: [
      { label: 'High Risk',  data: [2,3,2,4,5,3,4,6,5,7,4,3,5,6,8,7,9,6,7,8,9,7,8,10,9,8,9,7,8,7], borderColor: '#c83558', backgroundColor: 'rgba(200,53,88,0.07)',   fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2 },
      { label: 'Suspicious', data: [8,9,10,8,12,11,9,13,11,14,12,10,13,14,16,15,17,14,15,16,17,15,16,18,17,16,17,15,16,18], borderColor: '#a07e0a', backgroundColor: 'rgba(160,126,10,0.05)', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 1.5 },
      { label: 'Total',      data: [12,14,15,14,18,16,15,21,18,23,18,15,20,22,26,24,28,22,24,26,28,24,26,30,28,26,28,24,26,27], borderColor: '#1a5598', backgroundColor: 'rgba(26,85,152,0.05)', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 1.5 }
    ] }, options: { ...base, plugins: { ...base.plugins, legend: leg } } });

    const e2 = document.getElementById('fraudPie');
    if (e2 && !chartInst.fraudPie) chartInst.fraudPie = makeDnut(e2, ['Duplicate','Upcoding','Phantom','Kickback','Identity','Rx Fraud'], [28,22,18,12,11,9], ['#c83558','#c8601e','#a07e0a','#1a5598','#b87c08','#087a52']);

    const e3 = document.getElementById('claimsBar');
    if (e3 && !chartInst.claimsBar) chartInst.claimsBar = new Chart(e3, { type: 'bar', data: { labels: ['Metro','City','St.L','NHI','River','Summit','East'], datasets: [
      { label: 'Approved', data: [1240,980,760,1100,420,310,580], backgroundColor: 'rgba(26,85,152,0.7)', borderRadius: 5 },
      { label: 'Flagged',  data: [180,120,60,140,30,20,50],       backgroundColor: 'rgba(200,53,88,0.7)', borderRadius: 5 }
    ] }, options: { ...base, plugins: { ...base.plugins, legend: leg } } });

    const e4 = document.getElementById('safetyLine');
    if (e4 && !chartInst.safetyLine) chartInst.safetyLine = new Chart(e4, { type: 'line', data: { labels: d14, datasets: [
      { label: 'Passed',     data: [980,1020,1100,1080,1150,1130,1200,1180,1220,1250,1210,1230,1200,1204], borderColor: '#087a52', backgroundColor: 'rgba(8,122,82,0.07)',  fill: true, tension: 0.4, pointRadius: 2, borderWidth: 2, pointBackgroundColor: '#087a52' },
      { label: 'Violations', data: [22,18,25,20,15,18,12,16,14,10,13,11,15,12],                           borderColor: '#a07e0a', backgroundColor: 'rgba(160,126,10,0.05)', fill: true, tension: 0.4, pointRadius: 2, borderWidth: 1.5 }
    ] }, options: { ...base, plugins: { ...base.plugins, legend: leg } } });
  }

  if (id === 'fraud') {
    const e = document.getElementById('fraudArea');
    if (e && !chartInst.fraudArea) chartInst.fraudArea = new Chart(e, { type: 'line', data: { labels: d30, datasets: [
      { label: 'AI Detected', data: [5,7,6,9,8,11,10,13,12,14,11,10,12,14,16,15,18,14,15,17,18,16,17,19,18,17,18,16,17,18], borderColor: '#b87c08', backgroundColor: 'rgba(184,124,8,0.07)', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2 },
      { label: 'Manual',      data: [2,2,3,2,3,3,2,4,3,5,3,3,4,4,5,5,6,5,5,6,6,5,5,7,6,6,6,5,6,7],             borderColor: '#1a5598', backgroundColor: 'rgba(26,85,152,0.05)', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 1.5 }
    ] }, options: { ...base, plugins: { ...base.plugins, legend: leg } } });
  }

  if (id === 'health') {
    const e1 = document.getElementById('incidentBar');
    if (e1 && !chartInst.incidentBar) chartInst.incidentBar = new Chart(e1, { type: 'bar', data: { labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], datasets: [
      { label: 'Critical', data: [3,2,4,1,3,2,3], backgroundColor: 'rgba(200,53,88,0.75)',  borderRadius: 5 },
      { label: 'Warning',  data: [5,7,4,8,6,4,5], backgroundColor: 'rgba(160,126,10,0.75)', borderRadius: 5 },
      { label: 'Info',     data: [8,10,7,12,9,6,8], backgroundColor: 'rgba(26,85,152,0.45)', borderRadius: 5 }
    ] }, options: { ...base, plugins: { ...base.plugins, legend: leg } } });

    const e2 = document.getElementById('monitorBar');
    if (e2 && !chartInst.monitorBar) chartInst.monitorBar = new Chart(e2, { type: 'bar', data: { labels: ['Metro','City Medical','St. Lukes','National','Riverside','Summit'], datasets: [
      { label: 'Checks',     data: [342,280,198,310,120,88], backgroundColor: 'rgba(8,122,82,0.65)',  borderRadius: 5 },
      { label: 'Violations', data: [14,9,6,12,3,2],          backgroundColor: 'rgba(200,53,88,0.6)', borderRadius: 5 }
    ] }, options: { ...base, plugins: { ...base.plugins, legend: leg } } });
  }

  if (id === 'alerts') {
    const e1 = document.getElementById('alertPie');
    if (e1 && !chartInst.alertPie) chartInst.alertPie = makeDnut(e1, ['Fraud','Prescription','Safety','Patient','Billing'], [35,25,18,12,10], ['#c83558','#c8601e','#a07e0a','#1a5598','#087a52']);

    const e2 = document.getElementById('alertLine');
    if (e2 && !chartInst.alertLine) chartInst.alertLine = new Chart(e2, { type: 'line', data: { labels: ['12AM','2AM','4AM','6AM','8AM','10AM','12PM','Now'], datasets: [
      { label: 'Alerts', data: [2,1,3,4,8,14,11,12], borderColor: '#c83558', backgroundColor: 'rgba(200,53,88,0.08)', fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2, pointBackgroundColor: '#c83558' }
    ] }, options: base });
  }

  if (id === 'reports') {
    const e = document.getElementById('reportsBar');
    if (e && !chartInst.reportsBar) chartInst.reportsBar = new Chart(e, { type: 'bar', data: { labels: ['Oct','Nov','Dec','Jan','Feb','Mar'], datasets: [
      { label: 'Generated', data: [98,112,134,121,143,148], backgroundColor: 'rgba(26,85,152,0.7)',  borderRadius: 5 },
      { label: 'Scheduled', data: [20,24,28,26,30,32],      backgroundColor: 'rgba(184,124,8,0.65)', borderRadius: 5 }
    ] }, options: { ...base, plugins: { ...base.plugins, legend: leg } } });
  }

  if (id === 'insights') {
    const e = document.getElementById('insightsLine');
    if (e && !chartInst.insightsLine) chartInst.insightsLine = new Chart(e, { type: 'line', data: { labels: d14, datasets: [
      { label: 'Fraud Detection', data: [88,90,87,92,91,94,93,95,92,94,96,93,95,94], borderColor: '#c83558', backgroundColor: 'rgba(200,53,88,0.07)', fill: true, tension: 0.4, pointRadius: 2, borderWidth: 2 },
      { label: 'Health Anomaly',  data: [72,75,74,78,76,80,79,82,80,83,85,82,84,85], borderColor: '#b87c08', backgroundColor: 'rgba(184,124,8,0.07)', fill: true, tension: 0.4, pointRadius: 2, borderWidth: 2 }
    ] }, options: { ...base, plugins: { ...base.plugins, legend: leg } } });
  }
}

/* ── Minimal modal data (extend as needed) ── */
const MODALS = {
  logout: {
    ib: 'rgba(200,53,88,0.1)', ic: 'var(--accent-red)',
    isvg: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    t: 'Sign Out', s: 'You will be logged out of Trace AI',
    b: '<div class="modal-row"><div><div class="modal-row-label">Session</div><div class="modal-row-value">Are you sure you want to sign out?</div></div></div>',
    f: '<button class="btn btn-ghost btn-sm" onclick="closeModal()">Cancel</button><button class="btn btn-danger btn-sm" onclick="handleSignOut()">Sign Out</button>'
  }
};
