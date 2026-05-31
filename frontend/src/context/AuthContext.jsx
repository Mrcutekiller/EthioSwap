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
  const convexAcknowledgeWarning   = useMutation(api.users.acknowledgeWarning);
  const convexSendById             = useMutation(api.users.sendById);
  const convexApproveWithdrawal    = useMutation(api.admin.approveWithdrawal);
  const convexRejectWithdrawal     = useMutation(api.admin.rejectWithdrawal);

  // ── Convex real-time queries ──────────────────────────
  const trades         = useQuery(api.trades.listByUser, user?.id ? { userId: user.id } : "skip") ?? [];
  const listings       = useQuery(api.listings.listAll)                                        ?? [];
  const wallet         = useQuery(api.users.getById,     user?.id ? { id: user.id } : "skip");
  const settings       = useQuery(api.settings.get);
  const myDepositReqs  = useQuery(api.depositRequests.listByUser, user?.id ? { userId: user.id } : "skip") ?? [];
  const allDepositReqs = useQuery(api.depositRequests.listAll, user?.role === 'admin' ? undefined : "skip") ?? [];
  const myTransactions = useQuery(api.wallet.listTransactions, user?.id ? { userId: user.id } : "skip") ?? [];
  const myWithdrawalReqs  = useQuery(api.users.listWithdrawalRequests, user?.id ? { userId: user.id } : "skip") ?? [];
  const allWithdrawalReqs = useQuery(api.admin.listAllWithdrawalRequests, user?.role === 'admin' ? undefined : "skip") ?? [];

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
      } catch {}
    }
  }, []);

  // Real-time synchronization of session from Convex database 'wallet' (user record)
  useEffect(() => {
    if (wallet) {
      setUser(prev => {
        if (!prev) return prev;

        const needsUpdate =
          wallet.kycStatus !== prev.kycStatus ||
          wallet.kycStep !== prev.kycStep ||
          wallet.role !== prev.role ||
          wallet.displayName !== prev.displayName ||
          wallet.ethBalance !== prev.ethBalance ||
          wallet.ethLocked !== prev.ethLocked ||
          wallet.isSuspended !== prev.isSuspended ||
          JSON.stringify(wallet.warnings || []) !== JSON.stringify(prev.warnings || []) ||
          JSON.stringify(wallet.paymentAccounts || []) !== JSON.stringify(prev.paymentAccounts || []);

        if (needsUpdate) {
          const merged = {
            ...prev,
            role: wallet.role,
            kycStatus: wallet.kycStatus,
            kycStep: wallet.kycStep,
            displayName: wallet.displayName,
            ethBalance: wallet.ethBalance,
            ethLocked: wallet.ethLocked,
            isSuspended: wallet.isSuspended,
            warnings: wallet.warnings || [],
            paymentAccounts: wallet.paymentAccounts || [],
          };
          localStorage.setItem('ethioswap_user', JSON.stringify(merged));
          return merged;
        }
        return prev;
      });
    }
  }, [wallet]);

  // Idle lock timer (disabled)
  const resetIdleTimer = useCallback(() => {
    clearTimeout(idleTimer.current);
  }, []);

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

  const createListing = async (amountETH, minLimitETB, maxLimitETB, paymentMethods, customRateETB, paymentAccounts, type) => {
    setLoading(true);
    try {
      await convexCreateListing({ sellerId: user.id, amountETH, minLimitETB, maxLimitETB, paymentMethods, customRateETB, paymentAccounts, type });
      setSuccess('Listing published! Ad is now active.');
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

  const withdrawETH = async (amountETH, destinationAddress, pin) => {
    setLoading(true);
    try {
      const data = await convexWithdraw({ userId: user.id, amountETH, destinationAddress, pin });
      setSuccess(`Withdrawal request submitted successfully!`);
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

  const approveWithdrawalRequest = async (requestId, adminNote) => {
    try {
      await convexApproveWithdrawal({ requestId, adminId: user.id, adminNote });
      setSuccess('Withdrawal approved and processed!');
    } catch (err) { setError(err.message); }
  };

  const rejectWithdrawalRequest = async (requestId, adminNote) => {
    try {
      await convexRejectWithdrawal({ requestId, adminId: user.id, adminNote });
      setSuccess('Withdrawal request rejected and refunded.');
    } catch (err) { setError(err.message); }
  };

  const savePaymentAccounts = async (accountsOrObj) => {
    setLoading(true);
    try {
      // Support both direct array and { userId, accounts } object (legacy)
      const accounts = Array.isArray(accountsOrObj)
        ? accountsOrObj
        : (accountsOrObj?.accounts ?? accountsOrObj);
      const updated = await convexSavePaymentAccounts({ userId: user.id, accounts });
      updateUser(updated);
      setSuccess('Payment profiles saved!');
      return updated;
    } catch (err) { setError(err.message); return null; }
    finally { setLoading(false); }
  };

  const acknowledgeWarning = async (warningId) => {
    try {
      const updated = await convexAcknowledgeWarning({ userId: user.id, warningId });
      updateUser(updated);
      setSuccess('Warning acknowledged.');
      return updated;
    } catch (err) { setError(err.message); return null; }
  };

  const sendById = async (recipientNumericId, amount, pin) => {
    setLoading(true);
    try {
      const data = await convexSendById({
        senderId: user.id,
        recipientNumericId: parseInt(recipientNumericId),
        amount: parseFloat(amount),
        pin: pin || undefined,
      });
      if (data?.success) {
        updateUser({ ethBalance: data.newBalance });
        setSuccess(`$${parseFloat(amount).toFixed(2)} USD sent to @${data.recipient.username} (ID: ${data.recipient.numericId})!`);
      }
      return data;
    } catch (err) { setError(err.message); return null; }
    finally { setLoading(false); }
  };

  const updateUser = (updatedUser) => {
    const merged = { ...user, ...updatedUser };
    persistUser(merged);
  };

  const switchUser = async (target) => {
    setLoading(true); setError(null);
    try {
      let username = target;
      let password = 'password';
      if (target === 'admin') {
        username = 'ethioswap@gmail.com';
        password = 'Et20sw26#';
      }
      const data = await convexLogin({ username, password });
      persistUser(data);
      setSuccess(`Switched context to @${data.username}!`);
      return data;
    } catch (err) {
      // If user doesn't exist, register them
      try {
        let username = target;
        let password = 'password';
        let phone = '+251911223344';
        let email = `${target}@ethioswap.com`;
        let fullName = `${target.toUpperCase()} Test`;
        let age = 25;
        if (target === 'admin') {
          username = 'ethioswap@gmail.com';
          password = 'Et20sw26#';
          phone = '+251000000000';
          email = 'ethioswap@gmail.com';
          fullName = 'System Admin';
        }
        const data = await convexRegister({
          username,
          password,
          phone,
          email,
          fullName,
          age
        });
        persistUser(data);
        setSuccess(`Created and switched to test @${data.username}!`);
        return data;
      } catch (regErr) {
        setError(regErr.message);
        return null;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user, wallet, listings, trades, systemSettings,
      error, success, loading, isLocked,
      myDepositReqs, allDepositReqs, myTransactions,
      myWithdrawalReqs, allWithdrawalReqs,
      setError, setSuccess,
      login, register, logout, unlock, updateUser, switchUser,
      createListing, pauseListing, initiateTrade, withdrawETH, depositMock,
      createDepositRequest, approveDepositRequest, rejectDepositRequest, savePaymentAccounts,
      approveWithdrawalRequest, rejectWithdrawalRequest,
      acknowledgeWarning, sendById,
      ethUsdPrice: ETH_USD_PRICE,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
