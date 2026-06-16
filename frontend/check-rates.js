import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gsiyofpzydlkgwpuxmbh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXlvZnB6eWRsa2d3cHV4bWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MjQ2MzMsImV4cCI6MjA5NjAwMDYzM30.iIveuTPYl1ZBUxBz1SRdTvGTG25VkcmOwVL6FebWs_0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkListings() {
  console.log('Querying all listings...');
  const { data: listings, error: lError } = await supabase
    .from('listings')
    .select('id, type, amount_eth, custom_rate_etb, status');

  if (lError) {
    console.error('Listings error:', lError);
    return;
  }

  console.log(`Found ${listings.length} listings:`);
  listings.forEach(l => {
    console.log(`- ID: ${l.id}, Type: ${l.type}, Amount: ${l.amount_eth}, Custom Rate: ${l.custom_rate_etb}, Status: ${l.status}`);
  });

  const { data: settings, error: sError } = await supabase
    .from('system_settings')
    .select('*')
    .limit(1)
    .single();
  if (sError) {
    console.error('System settings error:', sError);
  } else {
    console.log('System settings standard rates:');
    console.log(`- Buy rate (etb_rate_per_dollar): ${settings.etb_rate_per_dollar}`);
    console.log(`- Sell rate (etb_rate_per_dollar_sell): ${settings.etb_rate_per_dollar_sell}`);
  }
}

checkListings();
