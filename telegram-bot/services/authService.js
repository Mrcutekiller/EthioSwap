const { supabase } = require('../config');

// In-memory sessions mapped by chatId: { user, step, tempState }
const sessions = new Map();

function getSession(chatId) {
  return sessions.get(chatId.toString());
}

function setSession(chatId, data) {
  const current = sessions.get(chatId.toString()) || {};
  sessions.set(chatId.toString(), { ...current, ...data });
}

function clearSession(chatId) {
  sessions.delete(chatId.toString());
}

function setStep(chatId, step, tempState = {}) {
  const current = sessions.get(chatId.toString()) || {};
  sessions.set(chatId.toString(), {
    ...current,
    step,
    tempState: { ...(current.tempState || {}), ...tempState },
  });
}

function clearStep(chatId) {
  const current = sessions.get(chatId.toString()) || {};
  delete current.step;
  delete current.tempState;
  sessions.set(chatId.toString(), current);
}

/**
 * Get current authenticated user for a chat.
 * Tries memory first, then checks database for existing telegram_chat_id link.
 */
async function getCurrentUser(chatId) {
  const idStr = chatId.toString();
  const session = sessions.get(idStr);
  if (session?.user) {
    return session.user;
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_chat_id', idStr)
      .maybeSingle();

    if (user && !error) {
      setSession(idStr, { user });
      return user;
    }
  } catch (err) {
    console.error('Failed to lookup user by telegram_chat_id:', err.message);
  }

  return null;
}

/**
 * Refresh user profile from database to get latest balances
 */
async function refreshUserProfile(chatId) {
  const user = await getCurrentUser(chatId);
  if (!user?.id) return null;

  try {
    const { data: updated, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (updated && !error) {
      setSession(chatId.toString(), { user: updated });
      return updated;
    }
  } catch (err) {
    console.error('Error refreshing user profile:', err.message);
  }
  return user;
}

/**
 * Log in with email or username + password
 */
async function login(chatId, identifier, password) {
  const cleanId = (identifier || '').trim();
  const cleanPass = (password || '').trim();

  if (!cleanId || !cleanPass) {
    return { success: false, message: 'Please provide both your email/username and password.' };
  }

  try {
    let email = cleanId;

    // If identifier doesn't have @, resolve username to email
    if (!email.includes('@')) {
      const { data: userRow, error: uErr } = await supabase
        .from('users')
        .select('email')
        .ilike('username', cleanId)
        .maybeSingle();

      if (uErr || !userRow?.email) {
        return { success: false, message: `No EthioSwap account found with username "${cleanId}".` };
      }
      email = userRow.email;
    }

    // Authenticate with Supabase Auth
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password: cleanPass,
    });

    if (authErr || !authData?.user) {
      return {
        success: false,
        message: authErr?.message?.includes('Invalid login credentials')
          ? 'Incorrect password or email. Please check your credentials.'
          : (authErr?.message || 'Login failed.'),
      };
    }

    const userId = authData.user.id;

    // Fetch user profile from public.users table
    let { data: profile, error: pErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!profile) {
      // Create minimal profile if not yet populated
      const fallback = {
        id: userId,
        username: authData.user.user_metadata?.username || email.split('@')[0],
        email: email,
        telegram_chat_id: chatId.toString(),
        telegram_connected: true,
      };
      await supabase.from('users').upsert(fallback, { onConflict: 'id' });
      profile = fallback;
    } else {
      // Link telegram chat ID
      await supabase
        .from('users')
        .update({
          telegram_chat_id: chatId.toString(),
          telegram_connected: true,
          telegram_connected_at: new Date().toISOString(),
        })
        .eq('id', userId);
      profile.telegram_chat_id = chatId.toString();
    }

    // Store in session
    setSession(chatId.toString(), { user: profile, authUser: authData.user });
    clearStep(chatId);

    return { success: true, user: profile };
  } catch (err) {
    console.error('Bot login error:', err);
    return { success: false, message: err.message || 'An unexpected error occurred during login.' };
  }
}

/**
 * Log out user from this Telegram chat
 */
async function logout(chatId) {
  const user = await getCurrentUser(chatId);
  if (user?.id) {
    try {
      await supabase
        .from('users')
        .update({ telegram_connected: false })
        .eq('id', user.id);
    } catch (err) {
      // ignore unlink errors on logout
    }
  }
  clearSession(chatId);
  return true;
}

module.exports = {
  getSession,
  setSession,
  clearSession,
  setStep,
  clearStep,
  getCurrentUser,
  refreshUserProfile,
  login,
  logout,
};
