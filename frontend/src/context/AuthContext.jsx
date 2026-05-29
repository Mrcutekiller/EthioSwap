import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const ETH_USD_PRICE = 3000.0;

export const AuthProvider = ({ children }) => {
  const [user, setUser]         = useState(null);
  const [error, setError]       = useState(null);
  const [success, setSuccess]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const idleTimer = useRef(null);

  // ── Convex mutations ──────────────────────────────────
  const convexLogin                = useMutation(api.users.login);
  const convexRegister             = useMutation(api.users.register);
  const convexCreateListing        = useMutation(api.listings.create);
  const convexPauseListing         = useMutation(api.listings.pause);
  const convexInitiateTrade        = useMutation(api.trades.initiateTrade);
  const convexWithdraw             = useMutation(api.users.withdrawETH);
  const convexDepositMock          = useMutation(api.users.faucetDeposit);
  const convexCreateDepositRequest = useMutation(api.depositRequests.create);
  const convexApproveDeposit       = useMutation(api.depositRequests.approve);
  const convexRejectDeposit        = useMutation(api.depositRequests.reject);
  const convexSavePaymentAccounts  = useMutation(api.users.savePaymentAccounts);

  // ── Convex real-time queries ──────────────────────────
  const trades         = useQuery(api.trades.listByUser, user ? { userId: user.id } : "skip") ?? [];
  const listings       = useQuery(api.listings.listAll)                                        ?? [];
  const wallet         = useQuery(api.users.getById,     user ? { id: user.id } : "skip");
  const settings       = useQuery(api.settings.get);
  const myDepositReqs  = useQuery(api.depositRequests.listByUser, user ? { userId: user.id } : "skip") ?? [];
  const allDepositReqs = useQuery(api.depositRequests.listAll) ?? [];

  const systemSettings = settings ?? {
    etbRatePerDollar: 190.0,
    flatFeePercent: 0.5,
    maxFeeUSD: 0.5,
    commissionType: 'percentage',
    commissionValue: 0.5,
  };

  // Auto-clear alerts
  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(null), 4000); return () => clearTimeout(t); } }, [success]);
  useEffect(() => { if (error)   { const t = setTimeout(() => setError(null),   4500); return () => clearTimeout(t); } }, [error]);

  // Restore session from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ethioswap_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser(parsed);
        const lockMethod = localStorage.getItem('ethioswap_lock_method');
        if (lockMethod) setIsLocked(true);
      } catch {}
    }
  }, []);

  // Idle lock timer (5 minutes)
  const resetIdleTimer = useCallback(() => {
    clearTimeout(idleTimer.current);
    if (!user) return;
    idleTimer.current = setTimeout(() => setIsLocked(true), 5 * 60 * 1000);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const events = ['mousedown', 'touchstart', 'keydown', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }));
    resetIdleTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
      clearTimeout(idleTimer.current);
    };
  }, [user, resetIdleTimer]);

  const persistUser = (u) => {
    setUser(u);
    localStorage.setItem('ethioswap_user', JSON.stringify(u));
  };

  const login = async (username, password) => {
    setLoading(true); setError(null);
    try {
      const data = await convexLogin({ username, password });
      persistUser(data);
      setSuccess(`Welcome back, ${data.username}!`);
      const lockMethod = localStorage.getItem('ethioswap_lock_method');
      if (lockMethod) setIsLocked(true);
      return data;
    } catch (err) { setError(err.message); return null; }
    finally { setLoading(false); }
  };

  const register = async (username, password, phone, email, fullName, age) => {
    setLoading(true); setError(null);
    try {
      const data = await convexRegister({ 
        username, 
        password, 
        phone, 
        email: email || undefined, 
        fullName: fullName || undefined, 
        age: age ? parseInt(age) : undefined 
      });
      persistUser(data);
      setSuccess('Account created! Complete KYC verification to start trading.');
      return data;
    } catch (err) { setError(err.message); return null; }
    finally { setLoading(false); }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ethioswap_user');
    clearTimeout(idleTimer.current);
    setIsLocked(false);
    setSuccess('Signed out successfully.');
  };

  const unlock = () => {
    setIsLocked(false);
    resetIdleTimer();
  };

  const createListing = async (amountETH, minLimitETB, maxLimitETB, paymentMethods, customRateETB, paymentAccounts) => {
    setLoading(true);
    try {
      await convexCreateListing({ sellerId: user.id, amountETH, minLimitETB, maxLimitETB, paymentMethods, customRateETB, paymentAccounts });
      setSuccess('Listing published! USD locked in escrow.');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const pauseListing = async (listingId) => {
    try {
      await convexPauseListing({ listingId, sellerId: user.id });
      setSuccess('Listing paused.');
    } catch (err) { setError(err.message); }
  };

  const initiateTrade = async (listingId, amountETH, selectedPaymentAccount) => {
    setLoading(true);
    try {
      const tradeId = await convexInitiateTrade({ 
        buyerId: user.id, 
        listingId, 
        amountETH, 
        selectedPaymentAccount 
      });
      setSuccess('Trade opened! Chat with the seller.');
      return { id: tradeId?.toString() };
    } catch (err) { setError(err.message); return null; }
    finally { setLoading(false); }
  };

  const withdrawETH = async (amountETH, destinationAddress) => {
    setLoading(true);
    try {
      const data = await convexWithdraw({ userId: user.id, amountETH, destinationAddress });
      setSuccess(`Withdrawal broadcast! Tx: ${data.txHash?.substring(0, 12)}...`);
      return data;
    } catch (err) { setError(err.message); return null; }
    finally { setLoading(false); }
  };

  const depositMock = async (amountETH) => {
    try {
      await convexDepositMock({ userId: user.id, amountETH });
      setSuccess(`Deposited $${parseFloat(amountETH).toFixed(2)} USD successfully!`);
    } catch (err) { setError(err.message); }
  };

  const createDepositRequest = async (amountUSD, walletType, senderReference, screenshotUrl) => {
    setLoading(true);
    try {
      await convexCreateDepositRequest({ userId: user.id, amountUSD, walletType, senderReference, screenshotUrl });
      setSuccess('Deposit request submitted! Admin will review and credit your wallet within minutes.');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const approveDepositRequest = async (requestId, adminNote) => {
    try {
      await convexApproveDeposit({ requestId, adminId: user.id, adminNote });
      setSuccess('Deposit approved and wallet credited!');
    } catch (err) { setError(err.message); }
  };

  const rejectDepositRequest = async (requestId, adminNote) => {
    try {
      await convexRejectDeposit({ requestId, adminId: user.id, adminNote });
      setSuccess('Deposit request rejected.');
    } catch (err) { setError(err.message); }
  };

  const savePaymentAccounts = async (accounts) => {
    setLoading(true);
    try {
      const updated = await convexSavePaymentAccounts({ userId: user.id, accounts });
      updateUser(updated);
      setSuccess('Payment profiles saved!');
      return updated;
    } catch (err) { setError(err.message); return null; }
    finally { setLoading(false); }
  };

  const updateUser = (updatedUser) => {
    const merged = { ...user, ...updatedUser };
    persistUser(merged);
  };

  return (
    <AuthContext.Provider value={{
      user, wallet, listings, trades, systemSettings,
      error, success, loading, isLocked,
      myDepositReqs, allDepositReqs,
      setError, setSuccess,
      login, register, logout, unlock, updateUser,
      createListing, pauseListing, initiateTrade, withdrawETH, depositMock,
      createDepositRequest, approveDepositRequest, rejectDepositRequest, savePaymentAccounts,
      ethUsdPrice: ETH_USD_PRICE,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
