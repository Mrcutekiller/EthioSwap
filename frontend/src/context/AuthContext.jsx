import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';

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
  const login = async (email, password) => {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await fetchUserProfile(data.user.id);
      setSuccess(`Welcome back!`);
      return data.user;
    } catch (err) { setError(err.message); return null; }
    finally { setLoading(false); }
  };

  const register = async (username, password, phone, email, fullName, age, gender, avatarId, referralCode) => {
    setLoading(true); setError(null);
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username, phone } }
      });
      if (authError) throw authError;

      // Create profile record
      const { error: profileError } = await supabase.from('users').insert([{
        id: authUser.id,
        username,
        phone,
        email,
        full_name: fullName,
        age: age ? parseInt(age) : null,
        gender,
        selected_avatar: avatarId,
        referral_code: username.toUpperCase().substring(0, 4) + Math.floor(1000 + Math.random() * 9000),
        referred_by: referralCode, // This would need to be resolved to a UUID if it's a code
        eth_address: '0x' + Math.random().toString(16).slice(2, 42), // Mock
        eth_private_key: '0x' + Math.random().toString(16).slice(2, 66), // Mock
        display_name: fullName || username,
        joined_at: new Date().toISOString()
      }]);

      if (profileError) throw profileError;

      await fetchUserProfile(authUser.id);
      setSuccess('Account created!');
      return authUser;
    } catch (err) { setError(err.message); return null; }
    finally { setLoading(false); }
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
      const { data: buyer } = await supabase.from('users').select('eth_balance').eq('id', trade.buyer_id).single();
      const { data: seller } = await supabase.from('users').select('eth_balance').eq('id', trade.seller_id).single();
      
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

  const unlock = () => setIsLocked(false);
  const switchUser = () => {}; // Not needed for production

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
      ethUsdPrice: ETH_USD_PRICE,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
