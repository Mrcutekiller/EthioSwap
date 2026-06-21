import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gsiyofpzydlkgwpuxmbh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaXlvZnB6eWRsa2d3cHV4bWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MjQ2MzMsImV4cCI6MjA5NjAwMDYzM30.iIveuTPYl1ZBUxBz1SRdTvGTG25VkcmOwVL6FebWs_0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const testEmail = 'testlogin_' + Math.random().toString(36).substring(7) + '@example.com';
const testPassword = 'TestPassword123!';

async function runTest() {
  console.log(`\n--- Test Account: ${testEmail} ---`);
  
  try {
    // 1. Sign up a new user to test the flow
    console.log("Step 0: Creating test account...");
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          username: 'test_login_user',
          full_name: 'Test Login User',
          role: 'user'
        }
      }
    });

    if (signUpError) {
      console.error("Sign up failed:", signUpError.message);
      return;
    }
    console.log("Test account created in Auth. User ID:", signUpData.user.id);

    // 2. Perform step 1 of login: signInWithPassword
    console.log("Step 1: signInWithPassword...");
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (loginError) {
      console.error("Step 1 Failed:", loginError.message);
      return;
    }
    console.log("Step 1 Succeeded!");

    // 3. Perform step 2 of login: check role
    console.log("Step 2: Checking role from users table...");
    const { data: profileRow, error: profileError } = await supabase
      .from('users')
      .select('role, username')
      .eq('id', loginData.user.id)
      .single();

    if (profileError) {
      console.log("Step 2 Profile row not found (as expected for new users):", profileError.message);
    } else {
      console.log("Step 2 Profile row found:", profileRow);
    }

    const isAdmin = profileRow?.role === 'admin';
    console.log(`Is Admin: ${isAdmin}`);

    // 4. Perform step 3: signOut
    console.log("Step 3: signing out regular user...");
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error("Step 3 SignOut failed:", signOutError.message);
    } else {
      console.log("Step 3 SignOut succeeded!");
    }

    // 5. Perform step 4: invoke send-login-otp
    console.log("Step 4: Invoking send-login-otp Edge function...");
    const { data: invokeData, error: invokeError } = await supabase.functions.invoke('send-login-otp', {
      body: { 
        userId: loginData.user.id, 
        email: testEmail, 
        name: 'Test Login User' 
      },
    });

    if (invokeError) {
      console.log("Step 4 Edge function failed (expected fallback):", invokeError.message || invokeError);
      
      // 6. Perform fallback: signInWithPassword
      console.log("Step 5 (Fallback): Signing in again...");
      const { data: reData, error: reAuthError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });

      if (reAuthError) {
        console.error("Step 5 Re-authentication failed:", reAuthError.message);
        return;
      }
      console.log("Step 5 Re-authentication succeeded!");

      // 7. Perform step 6: loadUserProfile
      console.log("Step 6: Loading user profile...");
      const profile = await loadUserProfileMock(reData.user.id, reData.user);
      console.log("Step 6 Profile result:", profile);

    } else {
      console.log("Step 4 Edge function succeeded! OTP sent:", invokeData);
    }

  } catch (err) {
    console.error("Unhandled exception in test:", err);
  }
}

async function loadUserProfileMock(userId, authUser) {
  const authRole = authUser?.user_metadata?.role || 'user';
  console.log("  [mock] Querying users table...");
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (data) {
    console.log("  [mock] User profile loaded:", data.username);
    return data;
  }

  if (error) {
    console.log("  [mock] Profile row not found. Upserting default profile...");
    const newProfile = {
      id: authUser.id,
      username: authUser.user_metadata?.username || authUser.email?.split('@')[0],
      email: authUser.email,
      full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || '',
      role: authRole,
      status: 'active',
      eth_address: '0x0000000000000000000000000000000000000000',
      eth_private_key: '0x0000000000000000000000000000000000000000000000000000000000000000',
    };
    const { error: insertError } = await supabase.from('users').upsert(newProfile, { onConflict: 'id' });
    if (insertError) {
      console.error("  [mock] Upsert failed:", insertError.message);
      return null;
    }
    console.log("  [mock] Profile row upserted successfully!");
    return newProfile;
  }
  return null;
}

runTest();
