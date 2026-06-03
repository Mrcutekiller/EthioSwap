import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "convex-api";
import { convex } from "../convexClient";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const ETH_USD_PRICE = 3000.0;

export const AuthProvider = ({ children }) => {
  const [user, setUser]         = useState(null);
  const [error, setErrorState]  = useState(null);
  const [success, setSuccess]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  // Convex Queries
  const systemSettings = useQuery(api.systemSettings.get) || {
    etbRatePerDollar: 190.0,
    flatFeePercent: 1.0,
    maxFeeUSD: 0.5,
    commissionType: 'percentage',
    commissionValue: 1.0,
  };
  
  const listingsFromQuery = useQuery(api.listings.listActive) || [];
  const tradesFromQuery = useQuery(api.trades.listForUser, user ? { userId: user._id } : "skip") || [];
  
  const allDepositReqs = useQuery(api.depositRequests.listAll) || [];
  const allWithdrawalReqs = useQuery(api.withdrawRequests.listAll) || [];

  // Add id alias for compatibility across all arrays
  const listings = listingsFromQuery.map(l => ({ ...l, id: l._id }));
  const trades = tradesFromQuery.map(t => ({ ...t, id: t._id }));

  const myDepositReqs = user ? allDepositReqs.filter(r => r.userId === user._id).map(r => ({ ...r, id: r._id })) : [];
  const myWithdrawalReqs = user ? allWithdrawalReqs.filter(r => r.userId === user._id).map(r => ({ ...r, id: r._id })) : [];
  const myTransactions = trades; 

  // System Settings with safe defaults
  const settingsFromQuery = useQuery(api.systemSettings.get);
  const systemSettings = settingsFromQuery || {
    etbRatePerDollar: 190.0,
    etbRatePerDollarSell: 186.0,
    flatFeePercent: 1.0,
    maxFeeUSD: 0.5,
    commissionType: 'percentage',
    commissionValue: 1.0,
    isP2pFreePeriod: false
  };
  const createUser = useMutation(api.users.create);
  const createListingMutation = useMutation(api.listings.create);
  const createTradeMutation = useMutation(api.trades.create);
  
  const createDepositMutation = useMutation(api.depositRequests.create);
  const createWithdrawMutation = useMutation(api.withdrawRequests.create);
  
  const updateDepositStatusMutation = useMutation(api.depositRequests.updateStatus);
  const updateWithdrawStatusMutation = useMutation(api.withdrawRequests.updateStatus);

  const updateUserMutation = useMutation(api.users.update);

  const markPaidMutation = useMutation(api.trades.markPaid);
  const releaseEthMutation = useMutation(api.trades.releaseEth);
  const cancelTradeMutation = useMutation(api.trades.cancelTrade);

  const submitReviewMutation = useMutation(api.reviews.create);
  const updateReviewMutation = useMutation(api.reviews.update);
  const deleteReviewMutation = useMutation(api.reviews.remove);

  useEffect(() => {
    const savedUser = localStorage.getItem('ethioswap_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        // Ensure compat with legacy .id access
        if (parsed._id) parsed.id = parsed._id;
        setUser(parsed);
      } catch (e) {
        localStorage.removeItem('ethioswap_user');
      }
    }
    setInitializing(false);
  }, []);

  const setError = (message) => {
    setErrorState(message);
    if (message) setTimeout(() => setErrorState(null), 5000);
  };

  const login = async (identifier, password) => {
    setLoading(true);
    setError(null);
    try {
      // Use the new authenticate query
      const u = await convex.query(api.users.authenticate, { identifier, password });
      
      if (!u) {
        throw new Error('Invalid username/email or password.');
      }

      // Add id alias for compatibility
      const safeUser = { ...u, id: u._id };
      setUser(safeUser);
      localStorage.setItem('ethioswap_user', JSON.stringify(safeUser));
      setSuccess(`Welcome back, ${u.username}!`);
      return safeUser;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, password, phone, email, fullName, age, referralCode) => {
    setLoading(true);
    setError(null);
    try {
      const userId = await createUser({
        username,
        email,
        password, // Pass password for storage
        fullName,
        phone,
        role: email.toLowerCase().includes('admin') ? 'admin' : 'user',
        ethAddress: '0x' + Math.random().toString(16).slice(2, 42),
        ethPrivateKey: '0x' + Math.random().toString(16).slice(2, 66),
      });

      const newUser = await convex.query(api.users.get, { id: userId });
      const safeUser = { ...newUser, id: newUser._id };
      setUser(safeUser);
      localStorage.setItem('ethioswap_user', JSON.stringify(safeUser));
      setSuccess('Account created successfully!');
      return safeUser;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ethioswap_user');
    setSuccess('Signed out successfully.');
  };

  const createListing = async (amountEth, minLimitEtb, maxLimitEtb, paymentMethods, customRateEtb, paymentAccounts, type) => {
    if (!user) return;
    setLoading(true);
    try {
      await createListingMutation({
        sellerId: user._id,
        amountEth: amountEth,
        minLimitEtb: minLimitEtb,
        maxLimitEtb: maxLimitEtb,
        paymentMethods,
        type,
        customRateEtb: customRateEtb,
        paymentAccounts,
      });
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
      const listing = listings.find(l => l._id === listingId);
      if (!listing) throw new Error('Listing not found');

      await createTradeMutation({
        buyerId: user._id,
        sellerId: listing.sellerId,
        listingId: listingId,
        amountEth: amountEth,
        amountEtb: Math.round(amountEth * (listing.customRateEtb || systemSettings.etbRatePerDollar)),
        feeEth: amountEth * (systemSettings.flatFeePercent / 100),
      });
      setSuccess('Trade initiated!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createDepositRequest = async (amountUSD, network, txHash, screenshotUrl) => {
    if (!user) return;
    setLoading(true);
    try {
      await createDepositMutation({
        userId: user._id,
        amountUsd: amountUSD,
        amountEth: amountUSD / ETH_USD_PRICE, // simplified conversion
        screenshotUrl,
      });
      setSuccess('Deposit request submitted!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const withdrawETH = async (amountEth, address) => {
    if (!user) return;
    setLoading(true);
    try {
      await createWithdrawMutation({
        userId: user._id,
        amountEth: amountEth,
        address,
      });
      setSuccess('Withdrawal request submitted!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const savePaymentAccounts = async (accounts) => {
    if (!user) return;
    try {
      await updateUserMutation({ id: user._id, updates: { paymentAccounts: accounts } });
      const updatedUser = { ...user, paymentAccounts: accounts, id: user._id };
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
      await submitReviewMutation({
        userId: user._id,
        username: user.username,
        rating,
        content,
      });
      setSuccess('Review submitted! It will be live after admin approval.');
    } catch (err) {
      setError(err.message);
    }
  };

  const updateReview = async (id, rating, content) => {
    try {
      await updateReviewMutation({ id, rating, content });
      setSuccess('Review updated!');
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteReview = async (id) => {
    try {
      await deleteReviewMutation({ id });
      setSuccess('Review deleted.');
    } catch (err) {
      setError(err.message);
    }
  };

  const approveDepositRequest = async (id) => {
    try {
      await updateDepositStatusMutation({ id, status: 'approved' });
      setSuccess('Deposit approved!');
    } catch (err) {
      setError(err.message);
    }
  };

  const rejectDepositRequest = async (id, reason) => {
    try {
      await updateDepositStatusMutation({ id, status: 'rejected', adminNote: reason });
      setSuccess('Deposit rejected.');
    } catch (err) {
      setError(err.message);
    }
  };

  const approveWithdrawalRequest = async (id) => {
    try {
      await updateWithdrawStatusMutation({ id, status: 'approved' });
      setSuccess('Withdrawal approved!');
    } catch (err) {
      setError(err.message);
    }
  };

  const rejectWithdrawalRequest = async (id, reason) => {
    try {
      await updateWithdrawStatusMutation({ id, status: 'rejected', adminNote: reason });
      setSuccess('Withdrawal rejected.');
    } catch (err) {
      setError(err.message);
    }
  };

  const markTradeAsPaid = async (tradeId) => {
    try {
      await markPaidMutation({ tradeId });
      setSuccess('Trade marked as paid!');
    } catch (err) {
      setError(err.message);
    }
  };

  const releaseEscrow = async (tradeId) => {
    try {
      await releaseEthMutation({ tradeId });
      setSuccess('ETH released to buyer!');
    } catch (err) {
      setError(err.message);
    }
  };

  const cancelTrade = async (tradeId) => {
    try {
      await cancelTradeMutation({ tradeId });
      setSuccess('Trade cancelled and ETH unlocked.');
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
      await updateUserMutation({ id: user._id, updates: { warnings: updatedWarnings } });
      const updatedUser = { ...user, warnings: updatedWarnings, id: user._id };
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
    // For now, just logout to allow switching
    logout();
  };

  const updateUser = async (updates) => {
    if (!user) return;
    try {
      await updateUserMutation({ id: user._id, updates });
      // Update local state if needed
      const updatedUser = { ...user, ...updates, id: user._id };
      setUser(updatedUser);
      localStorage.setItem('ethioswap_user', JSON.stringify(updatedUser));
    } catch (err) {
      setError(err.message);
    }
  };

  const wallet = user ? {
    ethAvailable: user.ethBalance || 0,
    ethLocked: user.ethLocked || 0,
    etbBalance: user.etbBalance || 0,
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
      markTradeAsPaid, releaseEscrow, cancelTrade,
      updateUser, acknowledgeWarning, unlock, switchUser,
      setError, setSuccess, setIsLocked
    }}>
      {children}
    </AuthContext.Provider>
  );
};
