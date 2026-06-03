import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { notify } from '../lib/notify';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const ETH_USD_PRICE = 3000.0;

export const AuthProvider = ({ children }) => {
  const [user, setUser]         = useState(null);
  const [session, setSession]   = useState(null);
  const [error, setErrorState]  = useState(null);
  const [success, setSuccess]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  
  const [trades, setTrades] = useState([]);
  const [listings, setListings] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [systemSettings, setSystemSettings] = useState({
    etbRatePerDollar: 190.0,
    flatFeePercent: 1.0,
    maxFeeUSD: 0.5,
    commissionType: 'percentage',
    commissionValue: 1.0,
  });
  const [myDepositReqs, setMyDepositReqs] = useState([]);
  const [allDepositReqs, setAllDepositReqs] = useState([]);
  const [myTransactions, setMyTransactions] = useState([]);
  const [myWithdrawalReqs, setMyWithdrawalReqs] = useState([]);
  const [allWithdrawalReqs, setAllWithdrawalReqs] = useState([]);

  const idleTimer = useRef(null);

  // ── Session & User Management ────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
      else setUser(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('fetchUserProfile error:', error.message);
    }
    
    if (data) {
      setUser(data);
      setWallet(data);
      localStorage.setItem('ethioswap_user', JSON.stringify(data));
    }
  };

  // ── Real-time Subscriptions ──────────────────────────
  useEffect(() => {
    if (!user) return;

    const tradesSub = supabase
      .channel('trades-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, () => fetchTrades())
      .subscribe();

    const listingsSub = supabase
      .channel('listings-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => fetchListings())
      .subscribe();

    const notificationsSub = supabase
      .channel('notifications-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
        // Handle real-time notification
      })
      .subscribe();

    fetchTrades();
    fetchListings();
    fetchSystemSettings();
    if (user.role === 'admin') {
      fetchAllDepositReqs();
      fetchAllWithdrawalReqs();
    } else {
      fetchMyDepositReqs();
      fetchMyWithdrawalReqs();
    }
    fetchMyTransactions();

    return () => {
      tradesSub.unsubscribe();
      listingsSub.unsubscribe();
      notificationsSub.unsubscribe();
    };
  }, [user]);

  const fetchTrades = async () => {
    const { data } = await supabase
      .from('trades')
      .select('*, buyer:users!buyer_id(username), seller:users!seller_id(username)')
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);
    if (data) setTrades(data.map(t => ({
      ...t,
      buyerName: t.buyer?.username,
      sellerName: t.seller?.username
    })));
  };

  const fetchListings = async () => {
    const { data } = await supabase
      .from('listings')
      .select('*, seller:users!seller_id(username, reputation, total_trades)')
      .eq('status', 'active');
    if (data) setListings(data.map(l => ({
      ...l,
      sellerName: l.seller?.username,
      sellerReputation: l.seller?.reputation,
      sellerTotalTrades: l.seller?.total_trades
    })));
  };

  const fetchSystemSettings = async () => {
    const { data } = await supabase.from('system_settings').select('*').limit(1).single();
    if (data) setSystemSettings(data);
  };

  const fetchMyDepositReqs = async () => {
    const { data } = await supabase.from('deposit_requests').select('*').eq('user_id', user.id);
    if (data) setMyDepositReqs(data);
  };

  const fetchAllDepositReqs = async () => {
    const { data } = await supabase.from('deposit_requests').select('*');
    if (data) setAllDepositReqs(data);
  };

  const fetchMyWithdrawalReqs = async () => {
    const { data } = await supabase.from('withdraw_requests').select('*').eq('user_id', user.id);
    if (data) setMyWithdrawalReqs(data);
  };

  const fetchAllWithdrawalReqs = async () => {
    const { data } = await supabase.from('withdraw_requests').select('*');
    if (data) setAllWithdrawalReqs(data);
  };

  const fetchMyTransactions = async () => {
    const { data } = await supabase.from('transactions').select('*').eq('user_id', user.id);
    if (data) setMyTransactions(data);
  };

  const setError = (message) => {
    if (!message) {
      setErrorState(null);
      return;
    }
    setErrorState(message);
  };

  // ── Auth Actions ─────────────────────────────────────
  const login = async (identifier, password) => {
    setLoading(true);
    setError(null);
    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase is not configured. Please add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the .env file.');
      }

      let loginEmail = identifier.trim().toLowerCase();

      // If identifier doesn't look like an email, look up by username
      if (!loginEmail.includes('@')) {
        const { data: profile, error: lookupError } = await supabase
          .from('users')
          .select('email')
          .eq('username', identifier.trim())
          .single();
        
        if (lookupError || !profile?.email) {
          throw new Error('Invalid email or password. Please try again.');
        }
        loginEmail = profile.email;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: loginEmail, 
        password: password 
      });
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please try again.');
        }
        throw error;
      }

      // Try to fetch profile
      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileData) {
        setUser(profileData);
        setWallet(profileData);
        localStorage.setItem('ethioswap_user', JSON.stringify(profileData));
      } else {
        // Profile doesn't exist — create it now (fallback for users in Auth but not in users table)
        const meta = data.user.user_metadata || {};
        const { data: newProfile, error: insertError } = await supabase.from('users').insert([{
          id: data.user.id,
          username: meta.username || loginEmail.split('@')[0],
          phone: meta.phone || '',
          email: loginEmail,
          full_name: meta.full_name || meta.username || loginEmail.split('@')[0],
          role: 'user',
          eth_address: '0x' + Math.random().toString(16).slice(2, 42),
          eth_private_key: '0x' + Math.random().toString(16).slice(2, 66),
          display_name: meta.username || loginEmail.split('@')[0],
          password_hash: 'managed_by_supabase_auth',
          joined_at: new Date().toISOString()
        }]).select().single();

        if (insertError) {
          console.error('Profile insert error:', insertError.message);
        } else if (newProfile) {
          setUser(newProfile);
          setWallet(newProfile);
          localStorage.setItem('ethioswap_user', JSON.stringify(newProfile));
        }
      }

      setSuccess(`Welcome back!`);
      return data.user;
    } catch (err) {
      console.error('Login error:', err);
      const msg = err.message?.includes('Failed to fetch')
        ? 'Cannot connect to Supabase. Please check your network connection.'
        : err.message;
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, password, phone, email, fullName, age, referralCode) => {
    setLoading(true);
    setError(null);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedUsername = username.trim();

      const { data, error: authError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: password,
        options: { 
          data: { 
            username: trimmedUsername, 
            full_name: fullName,
            phone: phone 
          } 
        }
      });

      if (authError) {
        if (authError.message.includes('rate limit') || authError.message.includes('email')) {
          throw new Error('Registration is temporarily limited. Please try again in a few minutes, or contact support.');
        }
        if (authError.message.includes('User already registered')) {
          throw new Error('This email is already registered. Please try logging in instead.');
        }
        throw authError;
      }

      // If user is returned but no session, it might mean email confirmation is needed 
      // OR the user already exists in Auth but not in the users table.
      if (data.user && !data.session) {
        // Try to check if profile exists
        const { data: existingProfile } = await supabase.from('users').select('id').eq('id', data.user.id).single();
        
        if (!existingProfile) {
          // Profile doesn't exist — create it now as a fallback
          const { error: profileError } = await supabase.from('users').insert([{
            id: data.user.id,
            username: trimmedUsername,
            phone: phone,
            email: trimmedEmail,
            full_name: fullName,
            age: age ? parseInt(age) : null,
            referral_code: trimmedUsername.toUpperCase().substring(0, 4) + Math.floor(1000 + Math.random() * 9000),
            referred_by: referralCode && referralCode.trim() ? referralCode.trim() : null,
            eth_address: '0x' + Math.random().toString(16).slice(2, 42),
            eth_private_key: '0x' + Math.random().toString(16).slice(2, 66),
            display_name: fullName || trimmedUsername,
            role: 'user',
            password_hash: 'managed_by_supabase_auth',
            joined_at: new Date().toISOString()
          }]);
          
          if (profileError) {
            console.error('Fallback profile creation error:', profileError.message);
          }
        }

        setSuccess('Account created! Please check your email to verify your account before logging in.');
        return data.user;
      }

      // Create profile record if session exists (auto-login or email confirmation disabled)
      if (data.user && data.session) {
        const { error: profileError } = await supabase.from('users').insert([{
          id: data.user.id,
          username: trimmedUsername,
          phone: phone,
          email: trimmedEmail,
          full_name: fullName,
          age: age ? parseInt(age) : null,
          referral_code: trimmedUsername.toUpperCase().substring(0, 4) + Math.floor(1000 + Math.random() * 9000),
          referred_by: referralCode && referralCode.trim() ? referralCode.trim() : null,
          eth_address: '0x' + Math.random().toString(16).slice(2, 42),
          eth_private_key: '0x' + Math.random().toString(16).slice(2, 66),
          display_name: fullName || trimmedUsername,
          role: 'user',
          password_hash: 'managed_by_supabase_auth',
          joined_at: new Date().toISOString()
        }]);

        if (profileError) throw profileError;

        await fetchUserProfile(data.user.id);
        setSuccess('Account created successfully!');
      }

      return data.user;
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    localStorage.removeItem('ethioswap_user');
    setSuccess('Signed out successfully.');
  };

  // ── Business Actions ─────────────────────────────────
  const createListing = async (amountETH, minLimitETB, maxLimitETB, paymentMethods, customRateETB, paymentAccounts, type) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('listings').insert([{
        seller_id: user.id,
        amount_eth: amountETH,
        min_limit_etb: minLimitETB,
        max_limit_etb: maxLimitETB,
        payment_methods: paymentMethods,
        custom_rate_etb: customRateETB,
        payment_accounts: paymentAccounts,
        type,
        status: 'active'
      }]);
      if (error) throw error;
      setSuccess('Listing published!');
      fetchListings();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const initiateTrade = async (listingId, amountETH, selectedPaymentAccount) => {
    setLoading(true);
    try {
      const { data: listing } = await supabase.from('listings').select('*').eq('id', listingId).single();
      if (!listing) throw new Error('Listing not found');

      // Create trade
      const { data: trade, error } = await supabase.from('trades').insert([{
        listing_id: listingId,
        buyer_id: user.id,
        seller_id: listing.seller_id,
        amount_eth: amountETH,
        amount_etb: Math.round(amountETH * (listing.custom_rate_etb || systemSettings.etb_rate_per_dollar)),
        status: 'payment_pending',
        selected_payment_account: selectedPaymentAccount,
        timer_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      }]).select().single();

      if (error) throw error;

      // Create escrow entry
      await supabase.from('escrow_accounts').insert([{
        trade_id: trade.id,
        seller_id: listing.seller_id,
        buyer_id: user.id,
        amount_usdt: amountETH,
        status: 'locked'
      }]);

      // Create chat
      const { data: chat } = await supabase.from('trade_chats').insert([{ trade_id: trade.id }]).select().single();

      // System message
      await supabase.from('chat_messages').insert([{
        chat_id: chat.id,
        sender_id: user.id, // System messages can use a specific ID or just be marked as system
        message_text: "Trade started",
        message_type: 'system'
      }]);

      setSuccess('Trade opened!');
      return trade;
    } catch (err) { setError(err.message); return null; }
    finally { setLoading(false); }
  };

  const markTradeAsPaid = async (tradeId, proofUrl) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('trades').update({ status: 'paid', proof_url: proofUrl }).eq('id', tradeId);
      if (error) throw error;

      // Log system message in chat
      const { data: chat } = await supabase.from('trade_chats').select('id').eq('trade_id', tradeId).single();
      if (chat) {
        await supabase.from('chat_messages').insert([{
          chat_id: chat.id,
          sender_id: user.id,
          message_text: "Payment marked as sent",
          message_type: 'system'
        }]);
      }

      setSuccess('Payment marked as sent!');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const releaseEscrow = async (tradeId) => {
    setLoading(true);
    try {
      const { data: trade } = await supabase.from('trades').select('*').eq('id', tradeId).single();
      if (!trade) throw new Error('Trade not found');

      // 1. Update escrow status
      const { error: escrowError } = await supabase.from('escrow_accounts').update({ 
        status: 'released', 
        released_at: new Date().toISOString() 
      }).eq('trade_id', tradeId);
      if (escrowError) throw escrowError;

      // 2. Transfer funds to buyer
      const { data: buyer } = await supabase.from('users').select('id, email, full_name, eth_balance').eq('id', trade.buyer_id).single();
      const { data: seller } = await supabase.from('users').select('id, email, full_name, eth_balance').eq('id', trade.seller_id).single();
      
      await supabase.from('users').update({ eth_balance: buyer.eth_balance + trade.amount_eth }).eq('id', trade.buyer_id);
      await supabase.from('users').update({ eth_balance: seller.eth_balance - trade.amount_eth }).eq('id', trade.seller_id);

      // 3. Update trade status
      await supabase.from('trades').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', tradeId);

      // 4. Log system message
      const { data: chat } = await supabase.from('trade_chats').select('id').eq('trade_id', tradeId).single();
      if (chat) {
        await supabase.from('chat_messages').insert([{
          chat_id: chat.id,
          sender_id: user.id,
          message_text: "Trade completed",
          message_type: 'system'
        }]);
      }

      // 5. Send notifications
      await notify({
        userId: buyer.id,
        userEmail: buyer.email,
        userName: buyer.full_name,
        type: 'p2p_completed',
        title: 'Trade Completed',
        body: `You have received $${trade.amount_eth} USD from @${seller.username}.`,
        amountUsd: trade.amount_eth,
        transactionId: tradeId
      });

      await notify({
        userId: seller.id,
        userEmail: seller.email,
        userName: seller.full_name,
        type: 'p2p_completed',
        title: 'Trade Completed',
        body: `Your trade with @${buyer.username} for $${trade.amount_eth} USD is complete.`,
        amountUsd: trade.amount_eth,
        transactionId: tradeId
      });

      setSuccess('Funds released to buyer!');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const openDispute = async (tradeId, reason) => {
    setLoading(true);
    try {
      const { data: trade } = await supabase.from('trades').select('*').eq('id', tradeId).single();
      if (!trade) throw new Error('Trade not found');

      await supabase.from('disputes').insert([{
        trade_id: tradeId,
        opened_by: user.id,
        against_user: user.id === trade.buyer_id ? trade.seller_id : trade.buyer_id,
        reason,
        status: 'open'
      }]);

      await supabase.from('trades').update({ status: 'disputed' }).eq('id', tradeId);
      await supabase.from('escrow_accounts').update({ status: 'disputed' }).eq('id', tradeId);

      const { data: chat } = await supabase.from('trade_chats').select('id').eq('trade_id', tradeId).single();
      if (chat) {
        await supabase.from('chat_messages').insert([{
          chat_id: chat.id,
          sender_id: user.id,
          message_text: "Dispute opened",
          message_type: 'system'
        }]);
      }

      setSuccess('Dispute opened. Admin will review.');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const submitRating = async (tradeId, ratedUserId, stars, reviewText) => {
    try {
      await supabase.from('trader_ratings').insert([{
        trade_id: tradeId,
        rater_id: user.id,
        rated_user_id: ratedUserId,
        stars,
        review_text: reviewText
      }]);
      
      // Update user rating (simple avg calculation for now, better to use DB function)
      const { data: ratings } = await supabase.from('trader_ratings').select('stars').eq('rated_user_id', ratedUserId);
      const avg = ratings.reduce((s, r) => s + r.stars, 0) / ratings.length;
      
      await supabase.from('users').update({ 
        avg_rating: avg, 
        total_ratings: ratings.length 
      }).eq('id', ratedUserId);

      setSuccess('Rating submitted!');
    } catch (err) { setError(err.message); }
  };

  const withdrawETH = async (amountUSD, destinationAddress, pin) => {
    setLoading(true);
    try {
      // Pin check and logic here
      const { error } = await supabase.from('withdraw_requests').insert([{
        user_id: user.id,
        username: user.username,
        amount_usd: amountUSD,
        wallet_type: 'On-Chain',
        destination_address: destinationAddress,
        status: 'pending'
      }]);
      if (error) throw error;
      setSuccess(`Withdrawal request submitted!`);
    } catch (err) { setError(err.message); return null; }
    finally { setLoading(false); }
  };

  const createDepositRequest = async (amountUSD, walletType, senderReference, screenshotUrl) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('deposit_requests').insert([{
        user_id: user.id,
        username: user.username,
        amount_usd: amountUSD,
        wallet_type: walletType,
        sender_reference: senderReference,
        screenshot_url: screenshotUrl,
        status: 'pending'
      }]);
      if (error) throw error;
      setSuccess('Deposit request submitted!');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const savePaymentAccounts = async (accounts) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ payment_accounts: accounts })
        .eq('id', user.id);
      if (error) throw error;
      await fetchUserProfile(user.id);
      setSuccess('Payment profiles saved!');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const updateUser = (updatedUser) => {
    const merged = { ...user, ...updatedUser };
    setUser(merged);
    localStorage.setItem('ethioswap_user', JSON.stringify(merged));
  };

  // ── Internal Transfer (Send/Receive between users) ──
  const sendInternalTransfer = async (receiverUsername, amount, note) => {
    setLoading(true);
    try {
      // Find receiver
      const { data: receiver } = await supabase.from('users').select('id, username').eq('username', receiverUsername).single();
      if (!receiver) throw new Error('User not found');
      if (receiver.id === user.id) throw new Error('Cannot send to yourself');
      if (amount < 1) throw new Error('Minimum transfer is $1');
      if (amount > (user.eth_balance || 0)) throw new Error('Insufficient balance');

      // Check daily limit
      const today = new Date().toISOString().split('T')[0];
      const { data: todayTransfers } = await supabase.from('internal_transfers')
        .select('amount')
        .eq('sender_id', user.id)
        .gte('created_at', today);
      const todayTotal = (todayTransfers || []).reduce((sum, t) => sum + t.amount, 0);
      const dailyLimit = systemSettings?.max_internal_transfer_daily || 500;
      if (todayTotal + amount > dailyLimit) throw new Error(`Daily limit of $${dailyLimit} exceeded`);

      // Execute transfer
      const { error } = await supabase.from('internal_transfers').insert([{
        sender_id: user.id,
        receiver_id: receiver.id,
        amount,
        note,
        status: 'completed'
      }]);
      if (error) throw error;

      // Update balances
      await supabase.from('users').update({ eth_balance: (user.eth_balance || 0) - amount }).eq('id', user.id);
      const { data: recv } = await supabase.from('users').select('eth_balance').eq('id', receiver.id).single();
      await supabase.from('users').update({ eth_balance: (recv.eth_balance || 0) + amount }).eq('id', receiver.id);

      // Log transactions
      await supabase.from('transactions').insert([
        { user_id: user.id, type: 'send', amount_usd: amount, net_amount: amount, currency: 'USDT', status: 'completed', note: `Sent to @${receiverUsername}`, related_user_id: receiver.id },
        { user_id: receiver.id, type: 'receive', amount_usd: amount, net_amount: amount, currency: 'USDT', status: 'completed', note: `Received from @${user.username}`, related_user_id: user.id }
      ]);

      // Create notifications
      await notify({
        userId: user.id,
        userEmail: user.email,
        userName: user.full_name,
        type: 'send_sent',
        title: 'Funds Sent',
        body: `✅ Sent $${amount} to @${receiverUsername}`,
        amountUsd: amount,
        counterpartyUsername: receiverUsername
      });

      await notify({
        userId: receiver.id,
        userEmail: receiver.email,
        userName: receiver.full_name,
        type: 'send_received',
        title: 'Funds Received',
        body: `💰 You received $${amount} from @${user.username}!`,
        amountUsd: amount,
        counterpartyUsername: user.username
      });

      await fetchUserProfile(user.id);
      setSuccess(`$${amount} sent to @${receiverUsername}!`);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  // ── Price Alerts ──
  const createPriceAlert = async (targetPrice, condition) => {
    try {
      const { error } = await supabase.from('price_alerts').insert([{
        user_id: user.id,
        target_price: targetPrice,
        condition,
        crypto: 'USDT',
        currency: 'ETB'
      }]);
      if (error) throw error;
      setSuccess(`Alert created: USDT ${condition} ${targetPrice} ETB`);
    } catch (err) { setError(err.message); }
  };

  const deletePriceAlert = async (alertId) => {
    try {
      await supabase.from('price_alerts').delete().eq('id', alertId);
    } catch (err) { setError(err.message); }
  };

  const togglePriceAlert = async (alertId, isActive) => {
    try {
      await supabase.from('price_alerts').update({ is_active: !isActive }).eq('id', alertId);
    } catch (err) { setError(err.message); }
  };

  // ── Dispute Evidence ──
  const uploadDisputeEvidence = async (disputeId, file, description) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${disputeId}/${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('dispute-evidence').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('dispute-evidence').getPublicUrl(fileName);
      await supabase.from('dispute_evidence').insert([{
        dispute_id: disputeId,
        uploaded_by: user.id,
        file_url: publicUrl,
        file_type: file.type.includes('pdf') ? 'pdf' : 'image',
        description
      }]);
      setSuccess('Evidence uploaded!');
    } catch (err) { setError(err.message); }
  };

  // ── Payment Requests ──
  const createPaymentRequest = async (targetUsername, amount, note) => {
    try {
      const { data: target } = await supabase.from('users').select('id').eq('username', targetUsername).single();
      if (!target) throw new Error('User not found');
      const { error } = await supabase.from('payment_requests').insert([{
        requester_id: user.id,
        target_user_id: target.id,
        target_username: targetUsername,
        amount,
        note,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }]);
      if (error) throw error;
      await supabase.from('notifications').insert([{
        user_id: target.id, type: 'payment_request',
        message: `📩 @${user.username} requested $${amount} from you`
      }]);
      setSuccess(`Payment request sent to @${targetUsername}`);
    } catch (err) { setError(err.message); }
  };

  // ── Reviews ──
  const submitReview = async (rating, content) => {
    try {
      if (!user) throw new Error('You must be logged in to write a review');
      const { error } = await supabase.from('reviews').insert([{
        user_id: user.id,
        username: user.username,
        rating,
        content
      }]);
      if (error) throw error;
      setSuccess('Review posted successfully!');
    } catch (err) { setError(err.message); }
  };

  const updateReview = async (reviewId, rating, content) => {
    try {
      const { error } = await supabase.from('reviews').update({
        rating,
        content,
        updated_at: new Date().toISOString()
      }).eq('id', reviewId).eq('user_id', user.id);
      if (error) throw error;
      setSuccess('Review updated!');
    } catch (err) { setError(err.message); }
  };

  const deleteReview = async (reviewId) => {
    try {
      const { error } = await supabase.from('reviews').delete()
        .eq('id', reviewId).eq('user_id', user.id);
      if (error) throw error;
      setSuccess('Review deleted!');
    } catch (err) { setError(err.message); }
  };

  // ── Warning Acknowledgement ──
  const acknowledgeWarning = async (warnId) => {
    try {
      const updatedWarnings = (user.warnings || []).filter(w => w.id !== warnId);
      await supabase.from('users').update({ warnings: updatedWarnings }).eq('id', user.id);
      setUser({ ...user, warnings: updatedWarnings });
    } catch (err) { setError(err.message); }
  };

  const unlock = () => setIsLocked(false);
  const switchUser = () => {};

  return (
    <AuthContext.Provider value={{
      user, wallet, listings, trades, systemSettings,
      error, success, loading, isLocked,
      myDepositReqs, allDepositReqs, myTransactions,
      myWithdrawalReqs, allWithdrawalReqs,
      setError, setSuccess,
      login, register, logout, unlock, updateUser, switchUser,
      createListing, initiateTrade, withdrawETH,
      createDepositRequest, savePaymentAccounts,
      markTradeAsPaid, releaseEscrow, openDispute, submitRating,
      sendInternalTransfer, createPriceAlert, deletePriceAlert, togglePriceAlert,
      uploadDisputeEvidence, createPaymentRequest, acknowledgeWarning,
      submitReview, updateReview, deleteReview,
      ethUsdPrice: ETH_USD_PRICE,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
