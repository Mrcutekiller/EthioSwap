import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gsiyofpzydlkgwpuxmbh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXlvZnB6eWRsa2d3cHV4bWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MjQ2MzMsImV4cCI6MjA5NjAwMDYzM30.iIveuTPYl1ZBUxBz1SRdTvGTG25VkcmOwVL6FebWs_0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInvoke() {
  console.log("Invoking 'send-login-otp' edge function...");
  const startTime = Date.now();
  try {
    const { data, error } = await supabase.functions.invoke('send-login-otp', {
      body: {
        userId: '00000000-0000-0000-0000-000000000000',
        email: 'test@example.com',
        name: 'Test User'
      }
    });

    console.log(`Finished in ${Date.now() - startTime}ms`);
    if (error) {
      console.error("Invocation error returned:", error);
    } else {
      console.log("Invocation data returned:", data);
    }
  } catch (err) {
    console.error("Exception thrown during invocation:", err);
  }
}

testInvoke();
