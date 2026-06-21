import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gsiyofpzydlkgwpuxmbh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXlvZnB6eWRsa2d3cHV4bWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MjQ2MzMsImV4cCI6MjA5NjAwMDYzM30.iIveuTPYl1ZBUxBz1SRdTvGTG25VkcmOwVL6FebWs_0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const testEmail = 'testlisting_' + Math.random().toString(36).substring(7) + '@example.com';
const testPassword = 'TestPassword123!';

async function runTest() {
  console.log(`\n--- Test Account: ${testEmail} ---`);
  
  try {
    // 1. Sign up
    console.log("Step 1: Signing up test user...");
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          username: 'test_lister_' + Math.random().toString(36).substring(7),
          full_name: 'Test Lister User',
          role: 'user'
        }
      }
    });

    if (signUpError) {
      console.error("Sign up failed:", signUpError.message);
      return;
    }
    const userId = signUpData.user.id;
    console.log("User signed up. ID:", userId);

    // 2. Load/Upsert Profile in public.users to ensure foreign keys pass
    console.log("Step 2: Creating profile row in public.users...");
    const profile = {
      id: userId,
      username: signUpData.user.user_metadata?.username,
      email: testEmail,
      full_name: 'Test Lister User',
      role: 'user',
      status: 'active',
      kyc_status: 'approved', // Auto-approve KYC for test listing
      payment_accounts: [{ id: 'acc_1', bankName: 'CBE', accountNumber: '100012345678', holderName: 'Test Lister' }]
    };
    const { error: profileError } = await supabase.from('users').upsert(profile);
    if (profileError) {
      console.error("Profile upsert failed:", profileError.message);
      return;
    }
    console.log("Profile created!");

    // 3. Log in to get auth session
    console.log("Step 3: Signing in to establish session...");
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    if (loginError) {
      console.error("Login failed:", loginError.message);
      return;
    }
    console.log("Logged in!");

    // 4. Try inserting a listing
    console.log("Step 4: Inserting a P2P listing...");
    const listing = {
      seller_id: userId,
      seller_name: profile.username,
      amount_eth: 1.5,
      min_limit_etb: 500,
      max_limit_etb: 10000,
      payment_methods: ['CBE'],
      type: 'sell',
      status: 'active',
      payment_accounts: profile.payment_accounts
    };

    const { data: insertedData, error: insertError } = await supabase
      .from('listings')
      .insert(listing)
      .select();

    if (insertError) {
      console.error("Listing insert failed:", insertError.message);
      return;
    }
    console.log("Listing successfully created in database!", insertedData);

    // 5. Query active listings as the logged-in user
    console.log("Step 5: Querying listings table as authenticated user...");
    const { data: activeListings, error: fetchError } = await supabase
      .from('listings')
      .select('*')
      .eq('status', 'active');

    if (fetchError) {
      console.error("Failed to fetch listings:", fetchError.message);
    } else {
      console.log("Listings count fetched:", activeListings?.length);
      console.log("Listings details:", activeListings);
    }

  } catch (err) {
    console.error("Unhandled exception in test:", err);
  }
}

runTest();
