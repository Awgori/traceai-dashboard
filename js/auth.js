/* ============================================================
   Trace AI — Auth Logic
   js/auth.js
   ============================================================ */

import { supabase } from './supabase.js';

/* ── Theme ── */
export function initTheme() {
  const saved = localStorage.getItem('traceai-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
}

export function toggleTheme() {
  const html = document.documentElement;
  const dark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', dark ? 'light' : 'dark');
  localStorage.setItem('traceai-theme', dark ? 'light' : 'dark');
}

/* ── Session guard ──
   Call at the top of every protected page.
   If no session → redirect to login.              */
export async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = '../index.html';
  }
  return session;
}

/* ── Session guard for auth pages ──
   Call on login/register pages.
   If already logged in → redirect to dashboard.  */
export async function redirectIfLoggedIn() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    window.location.href = 'pages/dashboard.html';
  }
}

/* ── Sign Up ── */
export async function signUp({ firstName, lastName, email, password }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: `${firstName} ${lastName}`.trim(),
        first_name: firstName,
        last_name:  lastName,
        role: 'user'
      }
    }
  });
  return { data, error };
}

/* ── Sign In ── */
export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

/* ── Sign Out ── */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (!error) window.location.href = '../index.html';
}

/* ── Get current user ── */
export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/* ── Password strength helper ── */
export function checkPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return 'weak';
  if (score === 2) return 'fair';
  if (score === 3) return 'good';
  return 'strong';
}
