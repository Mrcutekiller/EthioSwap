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
  
  const listings = useQuery(api.listings.listActive) || [];
  const trades = useQuery(api.trades.listForUser, user ? { userId: user._id } : "skip") || [];
  const allDepositReqs = useQuery(api.depositRequests.listAll) || [];
  const allWithdrawalReqs = useQuery(api.withdrawRequests.listAll) || [];

  // Mutations
  const createUser = useMutation(api.users.create);
  const createListingMutation = useMutation(api.listings.create);
  const createTradeMutation = useMutation(api.trades.create);
  
  const updateDepositStatusMutation = useMutation(api.depositRequests.updateStatus);
  const updateWithdrawStatusMutation = useMutation(api.withdrawRequests.updateStatus);

  const updateUserMutation = useMutation(api.users.update);

  const markPaidMutation = useMutation(api.trades.markPaid);
  const releaseEthMutation = useMutation(api.trades.releaseEth);
  const cancelTradeMutation = useMutation(api.trades.cancelTrade);

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

      setUser(u);
      localStorage.setItem('ethioswap_user', JSON.stringify(u));
      setSuccess(`Welcome back, ${u.username}!`);
      return u;
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
      setUser(newUser);
      localStorage.setItem('ethioswap_user', JSON.stringify(newUser));
      setSuccess('Account created successfully!');
      return newUser;
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

  const createListing = async (amountETH, minLimitETB, maxLimitETB, paymentMethods, customRateETB, paymentAccounts, type) => {
    if (!user) return;
    setLoading(true);
    try {
      await createListingMutation({
        sellerId: user._id,
        amountEth: amountETH,
        minLimitEtb: minLimitETB,
        maxLimitEtb: maxLimitETB,
        paymentMethods,
        type,
        customRateEtb: customRateETB,
        paymentAccounts,
      });
      setSuccess('Listing published!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const initiateTrade = async (listingId, amountETH, selectedPaymentAccount) => {
    if (!user) return;
    setLoading(true);
    try {
      const listing = listings.find(l => l._id === listingId);
      if (!listing) throw new Error('Listing not found');

      await createTradeMutation({
        buyerId: user._id,
        sellerId: listing.sellerId,
        listingId: listingId,
        amountEth: amountETH,
        amountEtb: Math.round(amountETH * (listing.customRateEtb || systemSettings.etbRatePerDollar)),
        feeEth: amountETH * (systemSettings.flatFeePercent / 100),
      });
      setSuccess('Trade initiated!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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

  const updateUser = async (updates) => {
    if (!user) return;
    try {
      await updateUserMutation({ id: user._id, updates });
      // Update local state if needed
      setUser({ ...user, ...updates });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AuthContext.Provider value={{
      user, listings, trades, systemSettings,
      allDepositReqs, allWithdrawalReqs,
      error, success, loading, initializing, isLocked,
      login, register, logout, createListing, initiateTrade,
      approveDepositRequest, rejectDepositRequest,
      approveWithdrawalRequest, rejectWithdrawalRequest,
      markTradeAsPaid, releaseEscrow, cancelTrade,
      updateUser,
      setError, setSuccess, setIsLocked
    }}>
      {children}
    </AuthContext.Provider>
  );
};
