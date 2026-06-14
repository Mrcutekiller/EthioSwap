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
  const [error, setErrorState] = useState(null);
  const [success, setSuccessState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  const [systemSettings, setSystemSettings] = useState({
    etbRatePerDollar: 190.0,
    etbRatePerDollarSell: 186.0,
    flatFeePercent: 1.0,
    maxFeeUSD: 0.5,
    commissionType: 'percentage',
    commissionValue: 1.0,
    isP2pFreePeriod: false
  });
  const [listings, setListings] = useState([]);
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserProfile(session.user.id);
      }
      setInitializing(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      setUser(data);
      localStorage.setItem('ethioswap_user', JSON.stringify(data));
    } else if (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  const loadSystemSettings = async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('*')
      .limit(1)
      .single();

    if (data) {
      setSystemSettings(data);
    }
  };

  const loadListings = async () => {
    const { data } = await supabase
      .from('listings')
      .select('*')
      .eq('status', 'active');

    if (data) {
      setListings(data);
    }
  };

  const loadTrades = async (userId) => {
    const { data } = await supabase
      .from('trades')
      .select('*')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);

    if (data) {
      setTrades(data);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadTrades(user.id);
    }
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
    const savedUser = localStorage.getItem('ethioswap_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
      } catch (e) {
        localStorage.removeItem('ethioswap_user');
      }
    }
    loadSystemSettings();
    loadListings();
    setInitializing(false);
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
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (!profile) throw new Error('User profile not found');

      setUser(profile);
      localStorage.setItem('ethioswap_user', JSON.stringify(profile));
      setSuccess(`Welcome back, ${profile.username}!`);
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

        const loginResult = await login(email, password);
        if (loginResult?.status === 'success') {
          return { status: 'success', userId: data.user.id };
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
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem('ethioswap_user');
    setSuccess('Signed out successfully.');
  };

  const createListing = async (amountEth, minLimitEtb, maxLimitEtb, paymentMethods, customRateEtb, paymentAccounts, type) => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('listings').insert({
        seller_id: user.id,
        amount_eth: amountEth,
        min_limit_etb: minLimitEtb,
        max_limit_etb: maxLimitEtb,
        payment_methods: paymentMethods,
        type,
        custom_rate_etb: customRateEtb,
        payment_accounts: paymentAccounts,
      });
      if (error) throw error;
      setSuccess('Listing published!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const initiateTrade = async (listingId, amountEth, selectedPaymentAccount) => {
    if (!user) return;
    setLoading(true);
    try {
      const listing = listings.find(l => l.id === listingId);
      if (!listing) throw new Error('Listing not found');

      const { error } = await supabase.from('trades').insert({
        buyer_id: user.id,
        seller_id: listing.seller_id,
        listing_id: listingId,
        amount_eth: amountEth,
        amount_etb: Math.round(amountEth * (listing.custom_rate_etb || systemSettings.etbRatePerDollar)),
        fee_eth: 0,
        status: 'payment_pending',
      });
      if (error) throw error;
      setSuccess('Trade initiated!');
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
      const { error } = await supabase.from('deposit_requests').insert({
        user_id: user.id,
        amount_usd: amountUSD,
        amount_eth: amountUSD / ETH_USD_PRICE,
        screenshot_url: screenshotUrl,
        wallet_type: network,
        sender_reference: txHash,
        username: user.username,
      });
      if (error) throw error;
      setSuccess('Deposit request submitted!');
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
      const { error } = await supabase.from('withdraw_requests').insert({
        user_id: user.id,
        amount_eth: amountUSD / ETH_USD_PRICE,
        amount_usd: amountUSD,
        address,
        wallet_type: network,
        username: user.username,
      });
      if (error) throw error;
      setSuccess('Withdrawal request submitted!');
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

  const sendById = async (recipientId, amountUSD) => {
    setError('Internal transfers are temporarily disabled for maintenance.');
  };

  const submitReview = async (rating, content) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('reviews').insert({
        user_id: user.id,
        username: user.username,
        rating,
        content,
      });
      if (error) throw error;
      setSuccess('Review submitted successfully!');
    } catch (err) {
      setError(err.message);
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

  const approveDepositRequest = async (id) => {
    try {
      const { error } = await supabase
        .from('deposit_requests')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      setSuccess('Deposit approved!');
    } catch (err) {
      setError(err.message);
    }
  };

  const rejectDepositRequest = async (id, reason) => {
    try {
      const { error } = await supabase
        .from('deposit_requests')
        .update({ status: 'rejected', admin_note: reason, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      setSuccess('Deposit rejected.');
    } catch (err) {
      setError(err.message);
    }
  };

  const approveWithdrawalRequest = async (id) => {
    try {
      const { error } = await supabase
        .from('withdraw_requests')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      setSuccess('Withdrawal approved!');
    } catch (err) {
      setError(err.message);
    }
  };

  const rejectWithdrawalRequest = async (id, reason) => {
    try {
      const { error } = await supabase
        .from('withdraw_requests')
        .update({ status: 'rejected', admin_note: reason, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      setSuccess('Withdrawal rejected.');
    } catch (err) {
      setError(err.message);
    }
  };

  const markTradeAsPaid = async (tradeId) => {
    try {
      const { error } = await supabase
        .from('trades')
        .update({ status: 'paid' })
        .eq('id', tradeId);
      if (error) throw error;
      setSuccess('Trade marked as paid!');
    } catch (err) {
      setError(err.message);
    }
  };

  const releaseEscrow = async (tradeId) => {
    try {
      const { error } = await supabase
        .from('trades')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', tradeId);
      if (error) throw error;
      setSuccess('ETH released to buyer!');
    } catch (err) {
      setError(err.message);
    }
  };

  const cancelTrade = async (tradeId) => {
    try {
      const { error } = await supabase
        .from('trades')
        .update({ status: 'cancelled' })
        .eq('id', tradeId);
      if (error) throw error;
      setSuccess('Trade cancelled and ETH unlocked.');
    } catch (err) {
      setError(err.message);
    }
  };

  const submitRating = async (tradeId, rating, comment, lowRatingReason) => {
    try {
      const trade = trades.find(t => t.id === tradeId);
      if (!trade) throw new Error('Trade not found');

      const { error } = await supabase.from('trade_ratings').insert({
        trade_id: tradeId,
        rater_id: user.id,
        rated_id: trade.buyer_id === user.id ? trade.seller_id : trade.buyer_id,
        rating,
        comment,
        rater_type: trade.buyer_id === user.id ? 'buyer' : 'seller',
        low_rating_reason: lowRatingReason,
      });
      if (error) throw error;
      setSuccess('Rating submitted successfully!');
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const openDispute = async (tradeId, reason) => {
    try {
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

      setSuccess('Dispute opened successfully. Escrow has been frozen.');
    } catch (err) {
      setError(err.message);
    }
  };

  const resolveDispute = async (disputeId, resolution, splitBuyerPercent, adminNote) => {
    try {
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

  const submitKycDetails = async (fullName, dob, idFront, idBack, selfie) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({
          kyc_status: 'pending',
          kyc_full_name: fullName,
          kyc_dob: dob,
          kyc_id_front: idFront,
          kyc_id_back: idBack,
          kyc_selfie: selfie,
        })
        .eq('id', user.id);
      if (error) throw error;
      setSuccess('KYC submitted successfully!');
      await updateUser({ kyc_status: 'pending' });
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
    ethBalance: user.eth_balance || 0,
    ethAvailable: (user.eth_balance || 0) - (user.eth_locked || 0),
    ethLocked: user.eth_locked || 0,
    etbBalance: user.etb_balance || 0,
    ethAddress: user.eth_address || '',
    numericId: user.numeric_id,
  } : null;

  return (
    <AuthContext.Provider value={{
      user, wallet, listings, trades, systemSettings,
      allDepositReqs, allWithdrawalReqs,
      myDepositReqs, myWithdrawalReqs, myTransactions,
      error, success, loading, initializing, isLocked,
      login, register, logout, createListing, initiateTrade,
      createDepositRequest, withdrawETH, savePaymentAccounts, sendById,
      submitReview, updateReview, deleteReview,
      approveDepositRequest, rejectDepositRequest,
      approveWithdrawalRequest, rejectWithdrawalRequest,
      markTradeAsPaid, releaseEscrow, cancelTrade, submitRating,
      openDispute, resolveDispute, uploadDisputeEvidence,
      submitKycDetails, approveKycRequest, rejectKycRequest,
      updateUser, acknowledgeWarning, unlock, switchUser,
      updateSensitiveDetails,
      setError, setSuccess, setIsLocked
    }}>
      {children}
    </AuthContext.Provider>
  );
};
