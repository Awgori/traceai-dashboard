/* ============================================================
   Trace AI — Supabase Client
   js/supabase.js
   ============================================================
   Replace the values below with your actual Supabase project
   URL and anon key from: https://app.supabase.com
   Project Settings → API
   ============================================================ */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://odktlxopvyynrgkfdioc.supabase.co';
const SUPABASE_ANON = 'sb_publishable_u2FFdM_UpvdKioR-4TcqXA_4wJxldSR';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
