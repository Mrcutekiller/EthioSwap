import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gsiyofpzydlkgwpuxmbh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXlvZnB6eWRsa2d3cHV4bWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MjQ2MzMsImV4cCI6MjA5NjAwMDYzM30.iIveuTPYl1ZBUxBz1SRdTvGTG25VkcmOwVL6FebWs_0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    const { data: users, error: err } = await supabase
      .from('users')
      .select('id, username, email, full_name')
      .limit(5);
    
    if (err) throw err;
    console.log("Existing Users in DB:", users);

    if (users && users.length > 0) {
      const testUser = users[0];
      console.log(`\nTesting lookup for username: "${testUser.username}"`);
      
      const queryVal = testUser.username;
      
      const { data, error } = await supabase
        .from('users')
        .select('username, email, full_name, profile_pic')
        .or(`username.ilike.${queryVal},email.ilike.${queryVal}`)
        .single();
      
      if (error) {
        console.error("Lookup Error:", error);
      } else {
        console.log("Lookup Success:", data);
      }
    }
  } catch (e) {
    console.error("Error executing script:", e);
  }
}

run();
