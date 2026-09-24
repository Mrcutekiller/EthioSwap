require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const BOT_TOKEN = process.env.BOT_TOKEN || '8920615384:AAHoJ5OCIzwehDYQ-xDe6Zr-aaGEO3L2h5c';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gsiyofpzydlkgwpuxmbh.supabase.co';
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY && !process.env.SUPABASE_SERVICE_KEY.includes('YOUR_'))
  ? process.env.SUPABASE_SERVICE_KEY
  : (process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXlvZnB6eWRsa2d3cHV4bWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MjQ2MzMsImV4cCI6MjA5NjAwMDYzM30.iIveuTPYl1ZBUxBz1SRdTvGTG25VkcmOwVL6FebWs_0');

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
};
