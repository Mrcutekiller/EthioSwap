import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ethers } from 'ethers';

const AuthContext = createContext();

export const cleanConvexError = (message) => {
  if (!message) return '';
  let cleaned = message.toString();
  if (cleaned.startsWith('Error: ')) {
    cleaned = cleaned.substring(7);
  }
  if (cleaned.startsWith('Uncaught Error: ')) {
    cleaned = cleaned.substring(16);
  }
  const requestIdIdx = cleaned.indexOf('(request ID:');
  if (requestIdIdx !== -1) {
    cleaned = cleaned.substring(0, requestIdIdx).trim();
  }
  const serverErrorIdx = cleaned.indexOf('Server Error:');
  if (serverErrorIdx !== -1) {
    cleaned = cleaned.substring(serverErrorIdx + 13).trim();
  }
  return cleaned;
};

export const getDeviceFingerprint = () => {
  let fp = localStorage.getItem('ethioswap_device_fingerprint');
  if (!fp) {
    fp = 'device_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('ethioswap_device_fingerprint', fp);
  }
  return fp;
};

export const useAuth = () => useContext(AuthContext);

export const ETH_USD_PRICE = 3000.0;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const userRef = React.useRef(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  const [error, setErrorState] = useState(null);
  const [success, setSuccessState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);

  const [systemSettings, setSystemSettings] = useState({
    etbRatePerDollar: 190.0,
    etbRatePerDollarSell: 186.0,
    flatFeePercent: 1.0,
    maxFeeUSD: 0.5,
    commissionType: 'percentage',
    commissionValue: 5.0,
    isP2pFreePeriod: false
  });
  const [listings, setListings] = useState([]);
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    if (window.location.hash) {
      const params = new URLSearchParams(window.location.hash.substring(1));
      const errorMsg = params.get('error_description') || params.get('error');
      if (errorMsg) {
        setError(decodeURIComponent(errorMsg.replace(/\+/g, ' ')));
        window.history.replaceState(null, null, window.location.pathname);
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserProfile(session.user.id, session.user).finally(() => setInitializing(false));
      } else {
        setUser(null);
        setInitializing(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveringPassword(true);
      }
      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null);
        localStorage.removeItem('ethioswap_user');
        setIsRecoveringPassword(false);
        return;
      }
      if (session?.user) {
        await loadUserProfile(session.user.id, session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId, passedAuthUser = null) => {
    let authUser = passedAuthUser;
    if (!authUser) {
      try {
        const { data } = await supabase.auth.getUser();
        authUser = data?.user;
      } catch (err) {
        console.error('Failed to get auth user:', err);
      }
    }
    const authRole = authUser?.user_metadata?.role || 'user';

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      if (data.role !== authRole) {
        await supabase.from('users').update({ role: authRole }).eq('id', userId);
        data.role = authRole;
      }
      setUser(data);
      localStorage.setItem('ethioswap_user', JSON.stringify(data));
      return data;
    }

    if (error) {
      console.error('Failed to load user profile:', error);
      if (authUser) {
        let address = '';
        let privateKey = '';
        try {
          privateKey = ethers.Wallet.createRandom().privateKey;
          address = new ethers.Wallet(privateKey).address;
        } catch (walletErr) {
          console.error('Failed to generate wallet for profile fallback:', walletErr);
        }

        const newProfile = {
          id: authUser.id,
          username: authUser.user_metadata?.username || authUser.email?.split('@')[0],
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || '',
          role: authRole,
          status: 'active',
          eth_address: address || null,
          eth_private_key: privateKey || null,
        };
        const { error: insertError } = await supabase.from('users').upsert(newProfile, { onConflict: 'id' });
        if (!insertError) {
          setUser(newProfile);
          localStorage.setItem('ethioswap_user', JSON.stringify(newProfile));
          return newProfile;
        }
      }
    }
    return null;
  };

  const loadSystemSettings = async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('*')
      .limit(1)
      .single();

    if (data) {
      setSystemSettings({
        ...data,
        etbRatePerDollar: data.etb_rate_per_dollar ?? 190.0,
        etbRatePerDollarSell: data.etb_rate_per_dollar_sell ?? 186.0,
        flatFeePercent: data.flat_fee_percent ?? 1.0,
        maxFeeUSD: data.max_fee_usd ?? 0.5,
        commissionType: data.commission_type ?? 'percentage',
        commissionValue: data.commission_value ?? 5.0,
        isP2pFreePeriod: data.is_p2p_free_period ?? false,
        depositFeePercent: data.deposit_fee_percent ?? 5.0,
        withdrawalFeePercent: data.withdrawal_fee_percent ?? 5.0,
        minDepositUsd: data.min_deposit_usd ?? 1.0,
        minWithdrawalUsd: data.min_withdrawal_usd ?? 10.0,
        minP2pListingUsd: data.min_p2p_listing_usd ?? 1.0,
        maxDailyWithdrawalUsd: data.max_daily_withdrawal_usd ?? 1000,
        collectedFeesETH: data.collected_fees_eth ?? 0,
      });
    }
  };

  const loadListings = async () => {
    let userId = userRef.current?.id;
    if (!userId) {
      const { data: sessionData } = await supabase.auth.getSession();
      userId = sessionData?.session?.user?.id;
    }

    let query = supabase.from('listings').select('*');
    if (userId) {
      query = query.or(`status.eq.active,seller_id.eq.${userId}`);
    } else {
      query = query.eq('status', 'active');
    }
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    console.log('loadListings data:', data, 'error:', error);

    if (error) {
      console.error('Error loading listings:', error);
    }

    if (data) {
      const sellerIds = [...new Set(data.map(l => l.seller_id).filter(Boolean))];
      if (sellerIds.length > 0) {
        const { data: sellers, error: sellersError } = await supabase
          .from('users')
          .select('id, profile_pic, is_verified_trader, reputation, kyc_status, total_trades')
          .in('id', sellerIds);
        if (sellersError) {
          console.error('Error loading sellers:', sellersError);
        }
        if (sellers) {
          const sellerMap = {};
          sellers.forEach(s => {
            sellerMap[s.id] = s;
          });
          data.forEach(l => {
            const s = sellerMap[l.seller_id];
            if (s) {
              l.isSellerVerifiedTrader = s.is_verified_trader || s.kyc_status === 'approved';
              l.seller_kyc_status = s.kyc_status;
              l.sellerReputation = s.reputation ?? 100;
              l.sellerTotalTrades = s.total_trades ?? 0;
              l.sellerAverageRating = 5.0;
              l.sellerPositivePercentage = s.reputation ?? 100;
              if (!l.seller_profile_pic && s.profile_pic) {
                l.seller_profile_pic = s.profile_pic;
              }
            }
          });
        }
      }
      console.log('Setting listings state to:', data);
      setListings(data);
    }
  };

  const loadTrades = async (userId) => {
    const { data } = await supabase
      .from('trades')
      .select('*')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);

    if (data) {
      const partyIds = [...new Set(data.flatMap(t => [t.buyer_id, t.seller_id]).filter(id => id && id !== userId))];
      if (partyIds.length > 0) {
        const { data: parties } = await supabase
          .from('users')
          .select('id, profile_pic, username')
          .in('id', partyIds);
        if (parties) {
          const picMap = {};
          const nameMap = {};
          parties.forEach(p => {
            if (p.profile_pic) picMap[p.id] = p.profile_pic;
            if (p.username) nameMap[p.id] = p.username;
          });
          data.forEach(t => {
            if (!t.buyer_profile_pic && picMap[t.buyer_id]) t.buyer_profile_pic = picMap[t.buyer_id];
            if (!t.seller_profile_pic && picMap[t.seller_id]) t.seller_profile_pic = picMap[t.seller_id];
            if (!t.buyer_name && nameMap[t.buyer_id]) t.buyer_name = nameMap[t.buyer_id];
            if (!t.seller_name && nameMap[t.seller_id]) t.seller_name = nameMap[t.seller_id];
          });
        }
      }
      setTrades(data);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadTrades(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    loadListings();
  }, [user?.id]);

  const isAdmin = user?.role === 'admin';
  const [allDepositReqs, setAllDepositReqs] = useState([]);
  const [allWithdrawalReqs, setAllWithdrawalReqs] = useState([]);
  const [userDeposits, setUserDeposits] = useState([]);
  const [userWithdrawals, setUserWithdrawals] = useState([]);

  useEffect(() => {
    if (user?.id) {
      if (isAdmin) {
        loadAllDepositRequests();
        loadAllWithdrawalRequests();
      } else {
        loadUserDeposits(user.id);
        loadUserWithdrawals(user.id);
      }
    }
  }, [user?.id, isAdmin]);

  const loadAllDepositRequests = async () => {
    const { data } = await supabase.from('deposit_requests').select('*').order('created_at', { ascending: false });
    if (data) setAllDepositReqs(data);
  };

  const loadAllWithdrawalRequests = async () => {
    const { data } = await supabase.from('withdraw_requests').select('*').order('created_at', { ascending: false });
    if (data) setAllWithdrawalReqs(data);
  };

  const loadUserDeposits = async (userId) => {
    const { data } = await supabase.from('deposit_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (data) setUserDeposits(data);
  };

  const loadUserWithdrawals = async (userId) => {
    const { data } = await supabase.from('withdraw_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (data) setUserWithdrawals(data);
  };

  const myDepositReqs = user ? (isAdmin ? allDepositReqs.filter(r => r.user_id === user.id) : userDeposits) : [];
  const myWithdrawalReqs = user ? (isAdmin ? allWithdrawalReqs.filter(r => r.user_id === user.id) : userWithdrawals) : [];
  const myTransactions = trades;

  useEffect(() => {
    loadSystemSettings();
    loadListings();

    const channel = supabase
      .channel('system_settings_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'system_settings' },
        (payload) => {
          if (payload.new) {
            const data = payload.new;
            setSystemSettings({
              etbRatePerDollar: data.etb_rate_per_dollar ?? 190.0,
              etbRatePerDollarSell: data.etb_rate_per_dollar_sell ?? 186.0,
              flatFeePercent: data.flat_fee_percent ?? 1.0,
              maxFeeUSD: data.max_fee_usd ?? 0.5,
              commissionType: data.commission_type ?? 'percentage',
              commissionValue: data.commission_value ?? 5.0,
              isP2pFreePeriod: data.is_p2p_free_period ?? false,
              depositFeePercent: data.deposit_fee_percent ?? 5.0,
              withdrawalFeePercent: data.withdrawal_fee_percent ?? 5.0,
              minDepositUsd: data.min_deposit_usd ?? 1.0,
              minWithdrawalUsd: data.min_withdrawal_usd ?? 10.0,
              minP2pListingUsd: data.min_p2p_listing_usd ?? 1.0,
              maxDailyWithdrawalUsd: data.max_daily_withdrawal_usd ?? 1000,
              collectedFeesETH: data.collected_fees_eth ?? 0,
              master_wallet_address: data.master_wallet_address,
            });
          }
        }
      )
      .subscribe();

    const listingsChannel = supabase
      .channel('listings_realtime_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'listings' },
        (payload) => {
          console.log('Realtime listings change received:', payload);
          loadListings();
        }
      )
      .subscribe((status) => {
        console.log('Listings channel subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(listingsChannel);
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    // 1. Subscribe to changes on user's own profile to update balance in real time
    const userChannel = supabase
      .channel(`user_profile_${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}` },
        (payload) => {
          if (payload.new) {
            setUser(payload.new);
            localStorage.setItem('ethioswap_user', JSON.stringify(payload.new));
          }
        }
      )
      .subscribe();

    // 2. Subscribe to changes in deposit requests to refresh the lists in real time
    const depositsChannel = supabase
      .channel('deposit_requests_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deposit_requests' },
        () => {
          if (isAdmin) {
            loadAllDepositRequests();
          } else {
            loadUserDeposits(user.id);
          }
        }
      )
      .subscribe();

    // 3. Subscribe to changes in withdrawal requests to refresh the lists in real time
    const withdrawalsChannel = supabase
      .channel('withdraw_requests_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'withdraw_requests' },
        () => {
          if (isAdmin) {
            loadAllWithdrawalRequests();
          } else {
            loadUserWithdrawals(user.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(userChannel);
      supabase.removeChannel(depositsChannel);
      supabase.removeChannel(withdrawalsChannel);
    };
  }, [user?.id, isAdmin]);

  useEffect(() => {
    if (!user?.id) return;
    const pollInterval = setInterval(() => {
      loadTrades(user.id);
      loadListings();
    }, 10000);
    return () => clearInterval(pollInterval);
  }, [user?.id]);

  useEffect(() => {
    const settingsInterval = setInterval(() => {
      loadSystemSettings();
    }, 60000);
    return () => clearInterval(settingsInterval);
  }, []);

  const setError = (message) => {
    const cleaned = cleanConvexError(message);
    setErrorState(cleaned);
    if (cleaned) setTimeout(() => setErrorState(null), 5000);
  };

  const setSuccess = (message) => {
    setSuccessState(message);
    if (message) setTimeout(() => setSuccessState(null), 5000);
  };

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      // Step 1: Verify credentials with Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      const userId = data.user.id;
      const userEmail = data.user.email;
      const userName = data.user.user_metadata?.full_name ||
        data.user.user_metadata?.username ||
        userEmail.split('@')[0];

      // Load profile and log in immediately — no OTP
      const profile = await loadUserProfile(userId, data.user);
      if (!profile) throw new Error('User profile not found');
      setSuccess(`Welcome back, ${profile.username}!`);
      return { status: 'success', user: profile };
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const verifyLoginOtp = async (userId, email, password, otpCode) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch the latest unused, non-expired OTP for this user
      const { data: otpRows, error: fetchErr } = await supabase
        .from('login_otps')
        .select('*')
        .eq('email', email)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchErr) throw new Error('Failed to verify code. Please try again.');
      if (!otpRows || otpRows.length === 0) throw new Error('Code has expired. Please sign in again.');

      const otpRow = otpRows[0];

      // Check max attempts (5 tries)
      if (otpRow.attempts >= 5) {
        throw new Error('Too many failed attempts. Please sign in again to get a new code.');
      }

      if (otpRow.otp_code !== otpCode.trim()) {
        // Increment attempts counter
        await supabase
          .from('login_otps')
          .update({ attempts: otpRow.attempts + 1 })
          .eq('id', otpRow.id);
        const remaining = 4 - otpRow.attempts;
        throw new Error(`Incorrect code. ${remaining > 0 ? `${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` : 'No attempts remaining.'}`);
      }

      // Mark OTP as used
      await supabase
        .from('login_otps')
        .update({ used: true })
        .eq('id', otpRow.id);

      // Re-authenticate with original credentials to get a real session
      const { data: authData, error: reAuthError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (reAuthError) throw reAuthError;

      const profile = await loadUserProfile(authData.user.id, authData.user);
      if (!profile) throw new Error('User profile not found');

      setSuccess(`Welcome back, ${profile.username}! ✓`);
      return { status: 'success', user: profile };
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };


  const register = async (username, password, phone, email, fullName, age, country, city, work, profilePic) => {
    setLoading(true);
    setError(null);
    try {
      const privateKey = ethers.Wallet.createRandom().privateKey;
      const address = new ethers.Wallet(privateKey).address;
      const isAdminRole = email.toLowerCase() === 'ethioswap@gmail.com';

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: fullName,
            role: isAdminRole ? 'admin' : 'user',
          }
        }
      });

      if (authError) throw authError;

      if (data.user) {
        const { error: profileError } = await supabase
          .from('users')
          .upsert({
            id: data.user.id,
            username,
            full_name: fullName,
            phone,
            email,
            age: age ? Number(age) : null,
            role: isAdminRole ? 'admin' : 'user',
            eth_address: address,
            eth_private_key: privateKey,
            country: country || null,
            city: city || null,
            work: work || null,
            profile_pic: profilePic || null,
          }, { onConflict: 'id' });

        if (profileError) throw profileError;

        if (data.session) {
          const profile = await loadUserProfile(data.user.id, data.user);
          if (profile) {
            setSuccess(`Welcome to EthioSwap, ${profile.username}!`);
            return { status: 'success', userId: data.user.id };
          }
        } else {
          setSuccess('Account created! Please check your email to verify your account.');
          return { status: 'pending_verification', userId: data.user.id };
        }
      }

      throw new Error('Account creation failed.');
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      localStorage.removeItem('ethioswap_user');
      await supabase.auth.signOut();
      setSuccess('Signed out successfully.');
    } catch (err) {
      setUser(null);
      localStorage.removeItem('ethioswap_user');
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Returns true if the user signed in via Google but hasn't filled required profile fields
  const isProfileIncomplete = user &&
    user.role !== 'admin' &&
    (!user.age || !user.phone || !user.city || !user.full_name);

  const completeGoogleProfile = async ({ fullName, age, phone, country, city, work, profilePic }) => {
    if (!user) return null;
    setLoading(true);
    setError(null);
    try {
      const updates = {
        full_name: fullName || user.full_name || '',
        age: age ? Number(age) : null,
        phone: phone || null,
        country: country || null,
        city: city || null,
        work: work || null,
        profile_pic: profilePic || user.profile_pic || null,
      };
      const { error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);
      if (updateError) throw updateError;
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('ethioswap_user', JSON.stringify(updatedUser));
      setSuccess(`Welcome to EthioSwap, ${updatedUser.username || updatedUser.full_name}! 🎉`);
      return updatedUser;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordResetEmail = async (email) => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setSuccess('Password reset link sent to your email!');
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (newPassword) => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSuccess('Password updated successfully!');
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const createListing = async (amountEth, minLimitEtb, maxLimitEtb, paymentMethods, customRateEtb, paymentAccounts, type, description, paymentWindow, allowThirdParty, images = []) => {
    if (!user) return;
    const isVerified = user?.kyc_status === 'approved' || user?.username === 'biruk';
    if (!isVerified) {
      setError('Please verify your identity first to post ads.');
      return;
    }
    setLoading(true);
    try {
      console.log('Creating listing with:', {
        seller_id: user.id,
        seller_name: user.username,
        amount_eth: amountEth,
        min_limit_etb: minLimitEtb,
        max_limit_etb: maxLimitEtb,
        payment_methods: paymentMethods,
        type,
        status: 'active',
        seller_profile_pic: user.profile_pic || null,
        custom_rate_etb: customRateEtb ? Number(customRateEtb) : null,
        payment_accounts: paymentAccounts,
        description: description || null,
        payment_window: paymentWindow ? Number(paymentWindow) : 15,
        allow_third_party: !!allowThirdParty,
        images: images || [],
      });
      const { data, error } = await supabase.from('listings').insert({
        seller_id: user.id,
        seller_name: user.username,
        seller_profile_pic: user.profile_pic || null,
        amount_eth: amountEth,
        min_limit_etb: minLimitEtb,
        max_limit_etb: maxLimitEtb,
        payment_methods: paymentMethods,
        type,
        status: 'active',
        custom_rate_etb: customRateEtb ? Number(customRateEtb) : null,
        payment_accounts: paymentAccounts,
        description: description || null,
        payment_window: paymentWindow ? Number(paymentWindow) : 15,
        allow_third_party: !!allowThirdParty,
        images: images || [],
      }).select().single();
      console.log('createListing result: data:', data, 'error:', error);
      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }
      setSuccess('Listing published!');
      
      if (data) {
        const newListing = {
          ...data,
          isSellerVerifiedTrader: user.kyc_status === 'approved' || user.is_verified_trader,
          seller_kyc_status: user.kyc_status,
          sellerReputation: user.reputation ?? 100,
          sellerTotalTrades: user.total_trades ?? 0,
          sellerAverageRating: 5.0,
          sellerPositivePercentage: user.reputation ?? 100,
        };
        console.log('Optimistically updating listings with:', newListing);
        setListings(prev => [newListing, ...prev]);
      }
      
      // Load listings from DB just to confirm
      await loadListings();
    } catch (err) {
      console.error('Error creating listing:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateListing = async (listingId, amountEth, minLimitEtb, maxLimitEtb, customRateEtb, description, paymentWindow, allowThirdParty, images = []) => {
    if (!user) return;
    const isVerified = user?.kyc_status === 'approved' || user?.username === 'biruk';
    if (!isVerified) {
      setError('Please verify your identity first to edit ads.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('listings')
        .update({
          amount_eth: amountEth,
          min_limit_etb: minLimitEtb,
          max_limit_etb: maxLimitEtb,
          custom_rate_etb: customRateEtb ? Number(customRateEtb) : null,
          description: description || null,
          payment_window: paymentWindow ? Number(paymentWindow) : 15,
          allow_third_party: !!allowThirdParty,
          images: images || [],
        })
        .eq('id', listingId)
        .eq('seller_id', user.id);
      if (error) throw error;
      setSuccess('Listing updated successfully!');
      await loadListings();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelListing = async (listingId) => {
    if (!user) return;
    const isVerified = user?.kyc_status === 'approved' || user?.username === 'biruk';
    if (!isVerified) {
      setError('Please verify your identity first to cancel ads.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: 'cancelled' })
        .eq('id', listingId)
        .eq('seller_id', user.id);
      if (error) throw error;
      setSuccess('Listing cancelled!');
      await loadListings();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const initiateTrade = async (listingId, amountEth, selectedPaymentAccount) => {
    if (!user) return;
    const isVerified = user?.kyc_status === 'approved' || user?.username === 'biruk';
    if (!isVerified) {
      setError('Please verify your identity first to start trades.');
      return;
    }
    setLoading(true);
    try {
      const listing = listings.find(l => l.id === listingId);
      if (!listing) throw new Error('Listing not found');

      const standardRate = listing.type === 'buy'
        ? (systemSettings.etbRatePerDollarSell ?? systemSettings.etbRatePerDollar)
        : systemSettings.etbRatePerDollar;
      const rateToUse = listing.custom_rate_etb || standardRate;

      const { data: newTrade, error } = await supabase.from('trades').insert({
        buyer_id: user.id,
        seller_id: listing.seller_id,
        listing_id: listingId,
        amount_eth: amountEth,
        amount_etb: Math.round(amountEth * rateToUse),
        rate: rateToUse,
        fee_eth: 0,
        status: 'payment_pending',
        payment_method: selectedPaymentAccount ? JSON.stringify(selectedPaymentAccount) : null,
      }).select().single();
      if (error) throw error;
      createNotification(listing.seller_id, 'trade_opened', 'New Trade', `${user.username || 'A buyer'} initiated a trade for $${(amountEth * ETH_USD_PRICE).toFixed(2)} USD.`);
      setSuccess('Trade initiated!');
      await loadListings();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  const createDepositRequest = async (amountUSD, network, txHash, screenshotUrl, otpCode) => {
    if (!user) return;
    setLoading(true);
    try {
      const platformFeePercent = systemSettings?.deposit_fee_percent ?? 5.0;
      const platformFee = amountUSD * platformFeePercent / 100;
      const netCredit = Math.max(0, amountUSD - platformFee);

      // Check for duplicate TxID/Reference to prevent double-spending
      if (network !== 'INTERNAL' && txHash) {
        const { data: existingTx, error: txCheckErr } = await supabase
          .from('deposit_requests')
          .select('id')
          .eq('sender_reference', txHash)
          .not('wallet_type', 'eq', 'INTERNAL')
          .limit(1);

        if (txCheckErr) throw txCheckErr;
        if (existingTx && existingTx.length > 0) {
          throw new Error('This Transaction ID/Reference has already been submitted or processed.');
        }
      }

      const isInternal = network === 'INTERNAL';

      const { error: insertErr } = await supabase.from('deposit_requests').insert({
        user_id: user.id,
        amount_usd: amountUSD,
        amount_eth: amountUSD / ETH_USD_PRICE,
        screenshot_url: screenshotUrl || '',
        wallet_type: network,
        sender_reference: txHash || '',
        username: user.username,
        status: isInternal ? 'approved' : 'pending',
        reviewed_at: isInternal ? new Date().toISOString() : null,
      });
      if (insertErr) throw insertErr;

      if (isInternal) {
        const { data: userData, error: userErr } = await supabase
          .from('users')
          .select('eth_balance')
          .eq('id', user.id)
          .single();
        if (userErr) throw userErr;

        const newBalance = (userData?.eth_balance || 0) + netCredit;
        const { error: balanceErr } = await supabase
          .from('users')
          .update({ eth_balance: newBalance })
          .eq('id', user.id);
        if (balanceErr) throw balanceErr;

        const { data: sett } = await supabase.from('system_settings').select('id, collected_fees_eth').limit(1).single();
        if (sett) {
          await supabase.from('system_settings').update({ collected_fees_eth: (sett.collected_fees_eth || 0) + platformFee }).eq('id', sett.id);
        }

        setUser(prev => ({ ...prev, eth_balance: newBalance }));
        setSuccess(`Deposit successful! $${netCredit.toFixed(2)} credited to your wallet (${platformFeePercent}% fee deducted).`);
        await createNotification(user.id, 'deposit', 'Deposit Successfully', `Your internal deposit of $${netCredit.toFixed(2)} USD was completed successfully.`);
      } else {
        setSuccess(`Deposit request of $${amountUSD.toFixed(2)} USD submitted successfully! It is pending admin verification.`);
        await createNotification(user.id, 'deposit', 'Deposit Processing', `Your deposit request of $${amountUSD.toFixed(2)} USD is processing.`);
      }

      return { success: true };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const withdrawETH = async (amountUSD, address, otpCode, network) => {
    if (!user) return;
    setLoading(true);
    try {
      const platformFeePercent = systemSettings?.withdrawal_fee_percent ?? 5.0;
      const platformFee = amountUSD * platformFeePercent / 100;
      const totalDeduction = amountUSD + platformFee;

      const { data: userData, error: userErr } = await supabase
          .from('users')
          .select('eth_balance')
          .eq('id', user.id)
          .single();
      if (userErr) throw userErr;

      const currentBalance = userData?.eth_balance || 0;
      if (currentBalance < totalDeduction) {
        throw new Error(`Insufficient balance. Required: $${totalDeduction.toFixed(2)}, Available: $${currentBalance.toFixed(2)}`);
      }

      const newBalance = currentBalance - totalDeduction;
      const { error: balanceErr } = await supabase
        .from('users')
        .update({ eth_balance: newBalance })
        .eq('id', user.id);
      if (balanceErr) throw balanceErr;

      const isInternal = network === 'INTERNAL';

      const { error: insertErr } = await supabase.from('withdraw_requests').insert({
        user_id: user.id,
        amount_eth: amountUSD / ETH_USD_PRICE,
        amount_usd: amountUSD,
        address,
        wallet_type: network,
        username: user.username,
        status: isInternal ? 'approved' : 'pending',
        reviewed_at: isInternal ? new Date().toISOString() : null,
      });
      if (insertErr) throw insertErr;

      if (isInternal) {
        const { data: sett } = await supabase.from('system_settings').select('id, collected_fees_eth').limit(1).single();
        if (sett) {
          await supabase.from('system_settings').update({ collected_fees_eth: (sett.collected_fees_eth || 0) + platformFee }).eq('id', sett.id);
        }
        setSuccess(`Withdrawal successful! $${amountUSD.toFixed(2)} sent to ${address.substring(0, 10)}... (${platformFeePercent}% fee deducted).`);
        await createNotification(user.id, 'withdrawal', 'Withdrawal Successfully', `Your internal withdrawal of $${amountUSD.toFixed(2)} USD was completed successfully.`);
      } else {
        setSuccess(`Withdrawal request of $${amountUSD.toFixed(2)} USD submitted! Pending admin verification ($${platformFee.toFixed(2)} platform fee will be finalized on approval).`);
        await createNotification(user.id, 'withdrawal', 'Withdrawal Processing', `Your withdrawal request of $${amountUSD.toFixed(2)} USD is processing.`);
      }

      setUser(prev => ({ ...prev, eth_balance: newBalance }));
      return { success: true };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateSensitiveDetails = async (otpCode, updates) => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('ethioswap_user', JSON.stringify(updatedUser));
      setSuccess('Security details updated successfully!');
      return { success: true };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const savePaymentAccounts = async (accounts) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ payment_accounts: accounts })
        .eq('id', user.id);

      if (error) throw error;

      const updatedUser = { ...user, payment_accounts: accounts };
      setUser(updatedUser);
      localStorage.setItem('ethioswap_user', JSON.stringify(updatedUser));
      setSuccess('Payment accounts updated!');
    } catch (err) {
      setError(err.message);
    }
  };

  const transferToUser = async (recipientUsername, amountUSD) => {
    if (!user) return;
    setLoading(true);
    try {
      let cleanUsername = recipientUsername.trim();
      if (cleanUsername.startsWith('@')) {
        cleanUsername = cleanUsername.substring(1);
      }
      if (cleanUsername.toLowerCase() === user.username.toLowerCase()) {
        throw new Error("You cannot transfer funds to yourself.");
      }

      // Call the secure RPC function to perform the transfer in one database transaction
      const { error: transferErr } = await supabase.rpc('execute_internal_transfer', {
        recipient_username: cleanUsername,
        transfer_amount: amountUSD
      });

      if (transferErr) {
        throw new Error(transferErr.message);
      }

      // The execution succeeded, fetch the sender's new balance to update local state
      const { data: newBalanceData, error: balErr } = await supabase
        .from('users')
        .select('eth_balance')
        .eq('id', user.id)
        .single();
      
      const newSenderBalance = balErr ? (user.eth_balance - amountUSD) : newBalanceData.eth_balance;

      setUser(prev => ({ ...prev, eth_balance: newSenderBalance }));
      setSuccess(`Successfully transferred $${amountUSD.toFixed(2)} USD to @${cleanUsername}!`);
      return { success: true };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (rating, content) => {
    if (!user) return false;
    try {
      const { error } = await supabase.from('reviews').insert({
        user_id: user.id,
        username: user.username,
        rating,
        content,
        is_approved: true,
      });
      if (error) throw error;
      setSuccess('Review submitted successfully!');
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const updateReview = async (id, rating, content) => {
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ rating, content })
        .eq('id', id);
      if (error) throw error;
      setSuccess('Review updated!');
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteReview = async (id) => {
    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setSuccess('Review deleted.');
    } catch (err) {
      setError(err.message);
    }
  };

  const approveDepositRequest = async (id, finalAmountUsd) => {
    try {
      const { data: req, error: fetchErr } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('id', id)
        .single();
      if (fetchErr) throw fetchErr;

      if (req.status === 'approved') {
        throw new Error('This deposit request is already approved.');
      }
      if (req.status === 'rejected') {
        throw new Error('Rejected deposit requests cannot be approved.');
      }

      const platformFeePercent = systemSettings?.deposit_fee_percent ?? 5.0;
      const approvedAmount = typeof finalAmountUsd === 'number' ? finalAmountUsd : (req.amount_usd || 0);
      const netCredit = approvedAmount;
      const platformFee = netCredit * platformFeePercent / 100;

      const { error: updateErr } = await supabase
        .from('deposit_requests')
        .update({ 
          status: 'approved', 
          amount_usd: approvedAmount,
          amount_eth: approvedAmount / ETH_USD_PRICE,
          reviewed_at: new Date().toISOString() 
        })
        .eq('id', id);
      if (updateErr) throw updateErr;

      const { data: userData, error: userErr } = await supabase
        .from('users')
        .select('eth_balance')
        .eq('id', req.user_id)
        .single();
      if (userErr) throw userErr;

      const newBalance = (userData?.eth_balance || 0) + netCredit;
      const { error: balanceErr } = await supabase
        .from('users')
        .update({ eth_balance: newBalance })
        .eq('id', req.user_id);
      if (balanceErr) throw balanceErr;

      const { data: sett } = await supabase.from('system_settings').select('id, collected_fees_eth').limit(1).single();
      if (sett) {
        await supabase.from('system_settings').update({ collected_fees_eth: (sett.collected_fees_eth || 0) + platformFee }).eq('id', sett.id);
      }

      await createNotification(
        req.user_id,
        'deposit_approved',
        'Deposit Successfully',
        `Your deposit of $${netCredit.toFixed(2)} USD was completed successfully.`
      );

      await loadAllDepositRequests();
      setSuccess(`Deposit approved! $${netCredit.toFixed(2)} credited.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const rejectDepositRequest = async (id, reason) => {
    try {
      const { data: req, error: fetchErr } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('id', id)
        .single();
      if (fetchErr) throw fetchErr;

      if (req.status === 'rejected') {
        throw new Error('This deposit request is already rejected.');
      }
      if (req.status === 'approved') {
        throw new Error('Approved deposit requests cannot be rejected.');
      }

      const { error } = await supabase
        .from('deposit_requests')
        .update({ status: 'rejected', admin_note: reason, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;

      await createNotification(
        req.user_id,
        'deposit_rejected',
        'Deposit Rejected',
        `Your deposit of $${(req.amount_usd || 0).toFixed(2)} USD was rejected. Reason: ${reason}`
      );

      await loadAllDepositRequests();
      setSuccess('Deposit rejected.');
    } catch (err) {
      setError(err.message);
    }
  };

  const approveWithdrawalRequest = async (id) => {
    try {
      const { data: req, error: fetchErr } = await supabase
        .from('withdraw_requests')
        .select('*')
        .eq('id', id)
        .single();
      if (fetchErr) throw fetchErr;

      if (req.status === 'approved') {
        throw new Error('This withdrawal request is already approved.');
      }
      if (req.status === 'rejected') {
        throw new Error('Rejected withdrawal requests cannot be approved.');
      }

      const platformFeePercent = systemSettings?.withdrawal_fee_percent ?? 5.0;
      const withdrawAmount = req.amount_usd || 0;
      const platformFee = withdrawAmount * platformFeePercent / 100;

      // Note: Balance was already deducted when withdrawal request was created in withdrawETH.
      // So we just update the status to approved and record fees.
      const { error: updateErr } = await supabase
        .from('withdraw_requests')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (updateErr) throw updateErr;

      const { data: sett } = await supabase.from('system_settings').select('id, collected_fees_eth').limit(1).single();
      if (sett) {
        await supabase.from('system_settings').update({ collected_fees_eth: (sett.collected_fees_eth || 0) + platformFee }).eq('id', sett.id);
      }

      await createNotification(
        req.user_id,
        'withdrawal_approved',
        'Withdrawal Successfully',
        `Your withdrawal of $${withdrawAmount.toFixed(2)} USD was completed successfully.`
      );

      setSuccess(`Success! $${withdrawAmount.toFixed(2)} sent to ${req.address || 'wallet'} ($${platformFee.toFixed(2)} fee recorded).`);
    } catch (err) {
      setError(err.message);
    }
  };

  const rejectWithdrawalRequest = async (id, reason) => {
    try {
      const { data: req, error: fetchErr } = await supabase
        .from('withdraw_requests')
        .select('*')
        .eq('id', id)
        .single();
      if (fetchErr) throw fetchErr;

      if (req.status === 'rejected') {
        throw new Error('This withdrawal request is already rejected.');
      }
      if (req.status === 'approved') {
        throw new Error('Approved withdrawal requests cannot be rejected.');
      }

      const platformFeePercent = systemSettings?.withdrawal_fee_percent ?? 5.0;
      const withdrawAmount = req.amount_usd || 0;
      const platformFee = withdrawAmount * platformFeePercent / 100;
      const totalRefund = withdrawAmount + platformFee;

      // Refund the user's balance since it was deducted when they submitted the request
      const { data: userData, error: userErr } = await supabase
        .from('users')
        .select('eth_balance')
        .eq('id', req.user_id)
        .single();
      if (userErr) throw userErr;

      const newBalance = (userData?.eth_balance || 0) + totalRefund;
      const { error: balanceErr } = await supabase
        .from('users')
        .update({ eth_balance: newBalance })
        .eq('id', req.user_id);
      if (balanceErr) throw balanceErr;

      const { error: updateErr } = await supabase
        .from('withdraw_requests')
        .update({ status: 'rejected', admin_note: reason, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (updateErr) throw updateErr;

      // Update user state if the logged-in user is the one whose withdrawal was rejected
      if (user && user.id === req.user_id) {
        setUser(prev => ({ ...prev, eth_balance: newBalance }));
      }

      await createNotification(
        req.user_id,
        'withdrawal_rejected',
        'Withdrawal Rejected',
        `Your withdrawal of $${withdrawAmount.toFixed(2)} USD was rejected. Reason: ${reason}. Refunded to your wallet.`
      );

      setSuccess('Withdrawal rejected and refunded.');
    } catch (err) {
      setError(err.message);
    }
  };

  const withdrawAdminEarnings = async (amountUsd, destinationAddress, network) => {
    if (!user) return;
    try {
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('collected_fees_eth')
        .limit(1)
        .single();

      const currentFees = settingsData?.collected_fees_eth || 0;
      if (currentFees < amountUsd) {
        throw new Error(`Insufficient platform balance. Available: $${currentFees.toFixed(2)}`);
      }

      const { error: insertErr } = await supabase.from('admin_withdrawals').insert({
        admin_id: user.id,
        amount_usd: amountUsd,
        amount_eth: amountUsd / ETH_USD_PRICE,
        destination_address: destinationAddress,
        network: network || 'TRC20',
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
      if (insertErr) throw insertErr;

      const { error: updateErr } = await supabase
        .from('system_settings')
        .update({ collected_fees_eth: currentFees - amountUsd })
        .eq('id', settingsData.id);
      if (updateErr) throw updateErr;

      setSuccess(`Withdrawal of $${amountUsd.toFixed(2)} USD submitted successfully!`);
      loadSystemSettings();
      return { success: true };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const markTradeAsPaid = async (tradeId) => {
    try {
      const { data: trade } = await supabase.from('trades').select('seller_id, buyer_id').eq('id', tradeId).single();
      const { error } = await supabase
        .from('trades')
        .update({ status: 'paid' })
        .eq('id', tradeId);
      if (error) throw error;
      if (trade?.seller_id && trade.seller_id !== user.id) {
        createNotification(trade.seller_id, 'trade_paid', 'Payment Confirmed', 'Buyer has marked the payment as sent. Please verify and release funds.');
      }
      setSuccess('Trade marked as paid!');
    } catch (err) {
      setError(err.message);
    }
  };

  const releaseEscrow = async (tradeId) => {
    try {
      const { data: trade } = await supabase.from('trades').select('buyer_id, seller_id').eq('id', tradeId).single();
      const { error } = await supabase
        .from('trades')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', tradeId);
      if (error) throw error;

      if (trade) {
        // Increment buyer's total trades
        const { data: buyerUser } = await supabase.from('users').select('total_trades').eq('id', trade.buyer_id).single();
        await supabase.from('users').update({ total_trades: (buyerUser?.total_trades || 0) + 1 }).eq('id', trade.buyer_id);

        // Increment seller's total trades
        const { data: sellerUser } = await supabase.from('users').select('total_trades').eq('id', trade.seller_id).single();
        await supabase.from('users').update({ total_trades: (sellerUser?.total_trades || 0) + 1 }).eq('id', trade.seller_id);
      }

      if (trade?.buyer_id && trade.buyer_id !== user.id) {
        createNotification(trade.buyer_id, 'trade_completed', 'Trade Completed', 'ETH has been released to your wallet. The trade is now complete.');
      }
      setSuccess('ETH released to buyer!');
    } catch (err) {
      setError(err.message);
    }
  };

  const cancelTrade = async (tradeId) => {
    try {
      const { data: trade } = await supabase.from('trades').select('buyer_id, seller_id').eq('id', tradeId).single();
      const { error } = await supabase
        .from('trades')
        .update({ status: 'cancelled' })
        .eq('id', tradeId);
      if (error) throw error;
      const otherPartyId = trade?.buyer_id === user.id ? trade.seller_id : trade.buyer_id;
      if (otherPartyId) {
        createNotification(otherPartyId, 'trade_cancelled', 'Trade Cancelled', 'The trade has been cancelled by the other party. Funds have been unlocked.');
      }
      setSuccess('Trade cancelled and ETH unlocked.');
    } catch (err) {
      setError(err.message);
    }
  };

  const submitRating = async (tradeId, rating, comment, lowRatingReason) => {
    try {
      const trade = trades.find(t => t.id === tradeId);
      if (!trade) throw new Error('Trade not found');

      const ratedUserId = trade.buyer_id === user.id ? trade.seller_id : trade.buyer_id;

      const { error } = await supabase.from('trade_ratings').insert({
        trade_id: tradeId,
        rater_id: user.id,
        rated_id: ratedUserId,
        rating,
        comment,
        rater_type: trade.buyer_id === user.id ? 'buyer' : 'seller',
        low_rating_reason: lowRatingReason,
      });
      if (error) throw error;

      // Fetch all ratings for this user to recalculate reputation percentage
      const { data: allRatings } = await supabase
        .from('trade_ratings')
        .select('rating')
        .eq('rated_id', ratedUserId);

      if (allRatings && allRatings.length > 0) {
        const sum = allRatings.reduce((acc, r) => acc + r.rating, 0);
        const avg = sum / allRatings.length;
        const reputationPercent = Math.min(100, Math.max(0, Math.round((avg / 5) * 100)));
        await supabase
          .from('users')
          .update({ reputation: reputationPercent })
          .eq('id', ratedUserId);
      }

      setSuccess('Rating submitted successfully!');
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const openDispute = async (tradeId, reason) => {
    try {
      const { data: trade } = await supabase.from('trades').select('buyer_id, seller_id').eq('id', tradeId).single();
      const { error } = await supabase.from('disputes').insert({
        trade_id: tradeId,
        opened_by: user.id,
        reason,
        status: 'open',
      });
      if (error) throw error;

      await supabase
        .from('trades')
        .update({ status: 'disputed' })
        .eq('id', tradeId);

      const otherPartyId = trade?.buyer_id === user.id ? trade.seller_id : trade.buyer_id;
      if (otherPartyId) {
        createNotification(otherPartyId, 'dispute_opened', 'Dispute Opened', 'A dispute has been opened on your trade. Support will review shortly.');
      }

      const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin');
      if (admins) {
        for (const admin of admins) {
          createNotification(admin.id, 'dispute_opened', 'New Dispute', `A dispute has been opened on trade #${tradeId.slice(0, 8)}. Reason: ${reason}`);
        }
      }

      setSuccess('Dispute opened successfully. Escrow has been frozen.');
    } catch (err) {
      setError(err.message);
    }
  };

  const resolveDispute = async (disputeId, resolution, splitBuyerPercent, adminNote) => {
    try {
      const { data: dispute } = await supabase.from('disputes').select('trade_id').eq('id', disputeId).single();
      const { data: trade } = dispute?.trade_id
        ? await supabase.from('trades').select('buyer_id, seller_id').eq('id', dispute.trade_id).single()
        : { data: null };

      const { error } = await supabase
        .from('disputes')
        .update({
          status: 'resolved',
          resolution,
          split_buyer_percent: splitBuyerPercent,
          admin_note: adminNote,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq('id', disputeId);
      if (error) throw error;

      if (trade) {
        createNotification(trade.buyer_id, 'dispute_resolved', 'Dispute Resolved', `Your dispute has been resolved. Resolution: ${resolution}`);
        createNotification(trade.seller_id, 'dispute_resolved', 'Dispute Resolved', `Your dispute has been resolved. Resolution: ${resolution}`);
      }

      setSuccess('Dispute resolved successfully.');
    } catch (err) {
      setError(err.message);
    }
  };

  const uploadDisputeEvidence = async (tradeId, storageId) => {
    try {
      const { data: dispute } = await supabase
        .from('disputes')
        .select('*')
        .eq('trade_id', tradeId)
        .eq('status', 'open')
        .single();

      if (!dispute) throw new Error('No open dispute found');

      const field = dispute.opened_by === user.id ? 'buyer_evidence' : 'seller_evidence';
      const evidence = dispute[field] || [];

      const { error } = await supabase
        .from('disputes')
        .update({ [field]: [...evidence, storageId] })
        .eq('id', dispute.id);
      if (error) throw error;
      setSuccess('Dispute evidence uploaded successfully.');
    } catch (err) {
      setError(err.message);
    }
  };

  const submitKycDetails = async (fullName, kycData, idFront, idBack, selfie) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({
          kyc_status: 'pending',
          kyc_full_name: fullName,
          kyc_dob: kycData?.birthDate || '',
          kyc_data: kycData || {},
          kyc_id_front: idFront,
          kyc_id_back: idBack,
          kyc_selfie: selfie,
        })
        .eq('id', user.id);
      if (error) throw error;
      setSuccess('KYC submitted successfully! Awaiting admin review.');
      await updateUser({ kyc_status: 'pending' });
      // Notify admin
      const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin');
      if (admins) {
        for (const admin of admins) {
          await createNotification(admin.id, 'kyc_new', 'New KYC Submission', `@${user.username} has submitted KYC documents for review.`);
        }
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const approveKycRequest = async (userId) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ kyc_status: 'approved', is_verified_trader: true })
        .eq('id', userId);
      if (error) throw error;
      setSuccess('KYC request approved.');
    } catch (err) {
      setError(err.message);
    }
  };

  const rejectKycRequest = async (userId, reason) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ kyc_status: 'rejected', kyc_rejection_reason: reason })
        .eq('id', userId);
      if (error) throw error;
      setSuccess('KYC request rejected.');
    } catch (err) {
      setError(err.message);
    }
  };

  const createNotification = async (userId, type, title, message) => {
    try {
      await supabase.from('notifications').insert({
        user_id: userId,
        type,
        title,
        message,
        is_read: false,
      });
    } catch (err) { /* silent fail */ }
  };

  const acknowledgeWarning = async (warningId) => {
    if (!user) return;
    try {
      const updatedWarnings = (user.warnings || []).map(w =>
        w.id === warningId ? { ...w, acknowledged: true } : w
      );
      const { error } = await supabase
        .from('users')
        .update({ warnings: updatedWarnings })
        .eq('id', user.id);
      if (error) throw error;
      const updatedUser = { ...user, warnings: updatedWarnings };
      setUser(updatedUser);
      localStorage.setItem('ethioswap_user', JSON.stringify(updatedUser));
    } catch (err) {
      setError(err.message);
    }
  };

  const unlock = (pin) => {
    const savedPin = localStorage.getItem('ethioswap_lock_pin');
    if (pin === savedPin) {
      setIsLocked(false);
      return true;
    }
    return false;
  };

  const switchUser = () => {
    logout();
  };

  const updateUser = async (updates) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);
      if (error) throw error;
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('ethioswap_user', JSON.stringify(updatedUser));
    } catch (err) {
      setError(err.message);
    }
  };

  const wallet = user ? {
    eth_balance: user.eth_balance || 0,
    eth_available: (user.eth_balance || 0) - (user.eth_locked || 0),
    eth_locked: user.eth_locked || 0,
    etb_balance: user.etb_balance || 0,
    eth_address: user.eth_address || '',
    numeric_id: user.numeric_id,
  } : null;

  return (
    <AuthContext.Provider value={{
      user, wallet, listings, trades, systemSettings,
      allDepositReqs, allWithdrawalReqs,
      myDepositReqs, myWithdrawalReqs, myTransactions,
      error, success, loading, initializing, isLocked,
      login, register, logout, createListing, initiateTrade,
      createDepositRequest, withdrawETH, savePaymentAccounts, transferToUser,
      submitReview, updateReview, deleteReview,
      approveDepositRequest, rejectDepositRequest,
      approveWithdrawalRequest, rejectWithdrawalRequest,
      markTradeAsPaid, releaseEscrow, cancelTrade, submitRating,
      openDispute, resolveDispute, uploadDisputeEvidence,
      submitKycDetails, approveKycRequest, rejectKycRequest,
      updateUser, acknowledgeWarning, unlock, switchUser,
      updateSensitiveDetails, updateListing, cancelListing,
      signInWithGoogle, sendPasswordResetEmail, updatePassword,
      isProfileIncomplete, completeGoogleProfile,
      verifyLoginOtp,
      isRecoveringPassword, setIsRecoveringPassword,
      setError, setSuccess, setIsLocked,
      loadSystemSettings, createNotification, withdrawAdminEarnings
    }}>
      {children}
    </AuthContext.Provider>
  );
};
