import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gsiyofpzydlkgwpuxmbh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXlvZnB6eWRsa2d3cHV4bWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MjQ2MzMsImV4cCI6MjA5NjAwMDYzM30.iIveuTPYl1ZBUxBz1SRdTvGTG25VkcmOwVL6FebWs_0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDb() {
  try {
    console.log("Checking system_settings...");
    const { data: settings, error: err1 } = await supabase.from('system_settings').select('*').limit(1);
    if (err1) console.error("Error fetching system_settings:", err1);
    else console.log("system_settings:", settings);

    console.log("\nChecking exchange_rates...");
    const { data: rates, error: err2 } = await supabase.from('exchange_rates').select('*').limit(5);
    if (err2) console.error("Error fetching exchange_rates:", err2);
    else console.log("exchange_rates count:", rates?.length, "rows:", rates);

    console.log("\nChecking listings...");
    const { data: listings, error: err3 } = await supabase.from('listings').select('*').limit(5);
    if (err3) console.error("Error fetching listings:", err3);
    else console.log("listings count:", listings?.length, "rows:", listings);
  } catch (e) {
    console.error("Unhandled error:", e);
  }
}

checkDb();
