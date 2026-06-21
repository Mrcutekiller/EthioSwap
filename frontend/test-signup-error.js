import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gsiyofpzydlkgwpuxmbh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXlvZnB6eWRsa2d3cHV4bWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MjQ2MzMsImV4cCI6MjA5NjAwMDYzM30.iIveuTPYl1ZBUxBz1SRdTvGTG25VkcmOwVL6FebWs_0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSignUp() {
  console.log("Attempting sign up...");
  try {
    const { data, error } = await supabase.auth.signUp({
      email: 'testlogin_dummy@example.com',
      password: 'Password123!',
    });

    console.log("Data returned:", data);
    console.log("Error returned:", error);
    if (error) {
      console.log("Error details:", {
        message: error.message,
        status: error.status,
        name: error.name
      });
    }
  } catch (err) {
    console.error("Exception:", err);
  }
}

testSignUp();
