require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// ─── Validate required environment variables ──────────────────────────────────
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('❌ FATAL: BOT_TOKEN environment variable is not set. Exiting.');
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL;
if (!SUPABASE_URL) {
  console.error('❌ FATAL: SUPABASE_URL environment variable is not set. Exiting.');
  process.exit(1);
}

const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY && !process.env.SUPABASE_SERVICE_KEY.includes('YOUR_')
  ? process.env.SUPABASE_SERVICE_KEY
  : process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
  console.error('❌ FATAL: Neither SUPABASE_SERVICE_KEY nor SUPABASE_ANON_KEY is set. Exiting.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

module.exports = {
  BOT_TOKEN,
  SUPABASE_URL,
  SUPABASE_KEY,
  supabase,
  MIN_ORDER_USD: 5,
  WEB_APP_URL: process.env.WEB_APP_URL || 'https://ethioswap.qzz.io/?mode=telegram',
  ADMIN_WALLET: process.env.ADMIN_WALLET_ADDRESS || '',
};
