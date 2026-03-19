require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  console.error('    Add them as Environment Variables in your Render dashboard.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
