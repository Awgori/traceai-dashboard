/* ============================================================
   Trace AI — Supabase Client
   js/supabase.js
   ============================================================
   Replace the values below with your actual Supabase project
   URL and anon key from: https://app.supabase.com
   Project Settings → API
   ============================================================ */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL  = 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON = 'YOUR_ANON_KEY_HERE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
