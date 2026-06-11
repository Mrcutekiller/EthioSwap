import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "convex-api";
import { convex } from "../convexClient";
import { ethers } from "ethers";

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
  const [user, setUser]         = useState(null);
  const [error, setErrorState]  = useState(null);
  const [success, setSuccessState] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  // --- Robust Data Fetching ---
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

  const dbUser = useQuery(api.users.get, user?._id ? { id: user._id } : "skip");

  useEffect(() => {
    if (user?._id && dbUser === null) {
      console.log("Logged-in user not found in DB (possibly deleted). Logging out.");
      setUser(null);
      localStorage.removeItem('ethioswap_user');
      setErrorState("Account does not exist.");
    } else if (user?._id && dbUser) {
      const safeDbUser = { ...dbUser, id: dbUser._id };
      if (JSON.stringify(user) !== JSON.stringify(safeDbUser)) {
        setUser(safeDbUser);
        localStorage.setItem('ethioswap_user', JSON.stringify(safeDbUser));
      }
    }
  }, [user?._id, dbUser]);

  // Use Convex's reactive useQuery hooks for efficient live updates
  const systemSettingsQuery = useQuery(api.systemSettings.get);
  const listingsQuery = useQuery(api.listings.listActive);
  const tradesQuery = useQuery(api.trades.listForUser, user?._id ? { userId: user._id } : "skip");

  useEffect(() => {
    if (systemSettingsQuery) {
      setSystemSettings(systemSettingsQuery);
    }
  }, [systemSettingsQuery]);

  useEffect(() => {
    if (listingsQuery) {
      setListings(listingsQuery.map(l => ({ ...l, id: l._id })));
    }
  }, [listingsQuery]);

  useEffect(() => {
    if (tradesQuery) {
      setTrades(tradesQuery.map(t => ({ ...t, id: t._id })));
    }
  }, [tradesQuery]);

  // Derived queries (using skip pattern to be safe)
  const isAdmin = user?.role === 'admin';
  const allDepositReqs = useQuery(api.depositRequests.listAll, isAdmin ? {} : "skip") || [];
  const allWithdrawalReqs = useQuery(api.withdrawRequests.listAll, isAdmin ? {} : "skip") || [];

  // Fetch user-specific deposits and withdrawals defensively
  const userDepositsQuery = useQuery(api.depositRequests.listForUser, (user && user._id) ? { userId: user._id } : "skip") || [];
  const userWithdrawalsQuery = useQuery(api.withdrawRequests.listForUser, (user && user._id) ? { userId: user._id } : "skip") || [];

  const myDepositReqs = user ? (isAdmin ? allDepositReqs.filter(r => r.userId === user._id) : userDepositsQuery).map(r => ({ ...r, id: r._id })) : [];
  const myWithdrawalReqs = user ? (isAdmin ? allWithdrawalReqs.filter(r => r.userId === user._id) : userWithdrawalsQuery).map(r => ({ ...r, id: r._id })) : [];
  const myTransactions = trades; 

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
  const submitTradeRatingMutation = useMutation(api.tradeRatings.submitTradeRating);
  const openDisputeMutation = useMutation(api.trades.openDispute);
  const resolveDisputeMutation = useMutation(api.trades.resolveDispute);
  const uploadDisputeEvidenceMutation = useMutation(api.trades.uploadDisputeEvidence);
  const submitKycMutation = useMutation(api.users.submitKyc);
  const updateKycStatusMutation = useMutation(api.users.updateKycStatus);

  const submitReviewMutation = useMutation(api.reviews.create);
  const updateReviewMutation = useMutation(api.reviews.update);
  const deleteReviewMutation = useMutation(api.reviews.remove);

  const generateOtpMutation = useMutation(api.otp.generateOtp);
  const verifyLoginOtpMutation = useMutation(api.users.verifyLoginOtp);
  const verifySignupOtpMutation = useMutation(api.users.verifySignupOtp);
  const updateSensitiveDetailsMutation = useMutation(api.users.updateSensitiveDetails);
  const logoutUserMutation = useMutation(api.users.logoutUser);
  const generateTelegramLinkCodeMutation = useMutation(api.users.generateTelegramLinkCode);

  useEffect(() => {
    const savedUser = localStorage.getItem('ethioswap_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        // Ensure compat with legacy .id access
        if (parsed._id) parsed.id = parsed._id;
        if (parsed.id && !parsed._id) parsed._id = parsed.id;
        setUser(parsed);
      } catch (e) {
        localStorage.removeItem('ethioswap_user');
      }
    }
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

  const login = async (identifier, password) => {
    setLoading(true);
    setError(null);
    try {
      // First check if the account exists
      const check = await convex.query(api.users.getByIdentifier, { identifier });
      if (!check || !check.exists) {
        throw new Error('Account does not exist.');
      }

      const deviceFingerprint = getDeviceFingerprint();

      // Use the new authenticate query
      const res = await convex.query(api.users.authenticate, { identifier, password, deviceFingerprint });
      
      if (!res) {
        throw new Error('Invalid password.');
      }

      if (res.status === 'otp_required') {
        return res;
      }

      // If telegram was required but we've removed it, it might return success directly now
      if (res.status === 'telegram_required') {
        // Fallback: treat as success if backend still returns it but we want to skip it
        const userRes = await convex.query(api.users.get, { id: res.userId });
        if (userRes) {
          const safeUser = { ...userRes, id: userRes._id };
          setUser(safeUser);
          localStorage.setItem('ethioswap_user', JSON.stringify(safeUser));
          return { status: 'success', user: safeUser };
        }
      }

      // Add id alias for compatibility
      const safeUser = { ...res.user, id: res.user._id };
      setUser(safeUser);
      localStorage.setItem('ethioswap_user', JSON.stringify(safeUser));
      setSuccess(`Welcome back, ${safeUser.username}!`);
      return { status: 'success', user: safeUser };
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, password, phone, email, fullName, age) => {
    setLoading(true);
    setError(null);
    try {
      const privateKey = ethers.Wallet.createRandom().privateKey;
      const address = new ethers.Wallet(privateKey).address;

      const isAdminRole = email.toLowerCase().includes('admin');

      const result = await createUser({
        username,
        email,
        password,
        fullName,
        phone,
        age: age ? Number(age) : null,
        role: isAdminRole ? 'admin' : 'user',
        ethAddress: address,
        ethPrivateKey: privateKey,
      });

      if (!result) {
        throw new Error("Account creation failed.");
      }

      // Admin accounts skip OTP entirely
      if (isAdminRole) {
        setSuccess('Admin account created successfully! Please sign in.');
        return { status: 'success_admin', userId: result.userId };
      }

      // Telegram linking — NON-FATAL. If it fails, the connect screen
      // has a "Generate code" button that retries on demand. Account
      // creation is NEVER blocked by a Telegram failure.
      let linkCode = null;
      let linkExpires = null;
      let deepLink = null;

      // Try the atomically-generated code from create() first
      if (result.linkCode) {
        linkCode = result.linkCode;
        linkExpires = result.linkExpires;
        deepLink = result.deepLink;
      }

      // Fall back to generateTelegramLinkCode if we still have no code
      if (!linkCode) {
        try {
          const linkRes = await generateTelegramLinkCodeMutation({ userId: result.userId });
          if (linkRes?.code) {
            linkCode = linkRes.code;
            linkExpires = linkRes.expiresAt;
            deepLink = linkRes.deepLink;
          }
        } catch (e) {
          console.warn('Telegram linking skipped — will retry on connect screen:', e?.message || e);
          // Non-fatal — the UI shows a "Generate code" button
        }
      }

      // Generate a fresh Telegram link token so the connect screen has a valid code.
      // We use generateTelegramLinkToken (action) which stores in telegramLinkTokens table
      // and is validated by confirmTelegramLink which the bot uses.
      let token = null;

      // Try the atomically-generated code from create() first (stored in linkCode field)
      if (result.linkCode) {
        // The code from users.create uses the user.telegramLinkCode field, but the bot
        // uses the telegramLinkTokens table. Generate a fresh token via the action to ensure compatibility.
        token = result.linkCode;
        deepLink = result.deepLink;
      }

      // Always generate a proper token via the action (uses telegramLinkTokens table, works with bot)
      try {
        const linkRes = await generateTelegramLinkCode(result.userId);
        if (linkRes?.token) {
          token = linkRes.token;
          deepLink = linkRes.deepLink;
        }
      } catch (e) {
        console.warn('generateTelegramLinkToken failed, will retry on connect screen:', e?.message || e);
      }

      setSuccess('Account created! Please connect your Telegram to activate.');
      // Return telegram_required so the connect screen is displayed
      return {
        status: 'telegram_required',
        userId: result.userId,
        reason: 'new_signup',
        phone: result.phone || '',
        token,
        linkCode: token,
        deepLink,
      };
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    if (user?._id) {
      const fingerprint = getDeviceFingerprint();
      logoutUserMutation({ userId: user._id, deviceFingerprint: fingerprint }).catch((err) => {
        console.error("Failed to revoke trusted device on logout:", err);
      });
    }
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
        feeEth: 0,
      });
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
      await createDepositMutation({
        userId: user._id,
        amountUsd: amountUSD,
        amountEth: amountUSD / ETH_USD_PRICE, // simplified conversion
        screenshotUrl,
        otpCode,
        walletType: network,
        senderReference: txHash,
      });
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
      await createWithdrawMutation({
        userId: user._id,
        amountEth: amountUSD / ETH_USD_PRICE,
        amountUSD,
        address,
        otpCode,
        network,
        walletType: network,
      });
      setSuccess('Withdrawal request submitted!');
      return { success: true };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const verifyLoginOtp = async (userId, code, deviceName, location, trustDevice) => {
    setLoading(true);
    setError(null);
    try {
      const fingerprint = getDeviceFingerprint();
      const userObj = await verifyLoginOtpMutation({
        userId,
        code,
        deviceFingerprint: fingerprint,
        deviceName,
        location,
        trustDevice,
      });

      const safeUser = { ...userObj, id: userObj._id };
      setUser(safeUser);
      localStorage.setItem('ethioswap_user', JSON.stringify(safeUser));
      setSuccess(`Welcome back, ${safeUser.username}!`);
      return safeUser;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const verifySignupOtp = async (userId, code) => {
    setLoading(true);
    setError(null);
    try {
      const userObj = await verifySignupOtpMutation({
        userId,
        code,
      });

      const safeUser = { ...userObj, id: userObj._id };
      setUser(safeUser);
      localStorage.setItem('ethioswap_user', JSON.stringify(safeUser));
      setSuccess(`Welcome to EthioSwap, ${safeUser.username}! Your account is now active.`);
      return safeUser;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async (userId, purpose) => {
    setLoading(true);
    try {
      const res = await generateOtpMutation({ userId, purpose });
      return res;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const generateTelegramLinkCode = async (userId) => {
    try {
      // Use mutation instead of action for better reliability
      const res = await generateTelegramLinkCodeMutation({ userId });
      return res;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const resendSignupOtpWithFallback = async (userId) => {
    try {
      const res = await convex.action(api.otp.resendSignupOtpWithFallback, { userId });
      return res;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const getTelegramLinkStatus = async (userId) => {
    try {
      const res = await convex.query(api.telegram.getTelegramLinkStatus, { userId });
      return res;
    } catch (err) {
      console.error("getTelegramLinkStatus failed:", err);
      return null;
    }
  };

  const updateSensitiveDetails = async (otpCode, updates) => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await updateSensitiveDetailsMutation({
        userId: user._id,
        otpCode,
        updates,
      });
      // Merge updates locally
      const updatedUser = { ...user, ...updates, id: user._id };
      setUser(updatedUser);
      localStorage.setItem('ethioswap_user', JSON.stringify(updatedUser));
      setSuccess('Security details updated successfully!');
      return res;
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
      setSuccess('Review submitted successfully!');
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

  const submitRating = async (tradeId, rating, comment, lowRatingReason) => {
    try {
      await submitTradeRatingMutation({ tradeId, rating, comment, lowRatingReason, userId: user._id || user.id });
      setSuccess('Rating submitted successfully!');
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const openDispute = async (tradeId, reason) => {
    try {
      await openDisputeMutation({ tradeId, reason, userId: user._id || user.id });
      setSuccess('Dispute opened successfully. Escrow has been frozen.');
    } catch (err) {
      setError(err.message);
    }
  };

  const resolveDispute = async (disputeId, resolution, splitBuyerPercent, adminNote) => {
    try {
      await resolveDisputeMutation({ disputeId, resolution, splitBuyerPercent, adminNote, userId: user._id || user.id });
      setSuccess('Dispute resolved successfully.');
    } catch (err) {
      setError(err.message);
    }
  };

  const uploadDisputeEvidence = async (tradeId, storageId) => {
    try {
      await uploadDisputeEvidenceMutation({ tradeId, storageId, userId: user._id || user.id });
      setSuccess('Dispute evidence uploaded successfully.');
    } catch (err) {
      setError(err.message);
    }
  };

  const submitKycDetails = async (fullName, dob, idFront, idBack, selfie) => {
    if (!user) return;
    try {
      await submitKycMutation({ userId: user._id, fullName, dob, idFront, idBack, selfie });
      setSuccess('KYC submitted successfully!');
      await updateUser({ kycStatus: 'pending' });
    } catch (err) {
      setError(err.message);
    }
  };

  const approveKycRequest = async (userId) => {
    try {
      await updateKycStatusMutation({ id: userId, status: 'verified' });
      setSuccess('KYC request approved.');
    } catch (err) {
      setError(err.message);
    }
  };

  const rejectKycRequest = async (userId, reason) => {
    try {
      await updateKycStatusMutation({ id: userId, status: 'rejected', rejectionReason: reason });
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
    ethBalance: user.ethBalance || 0,
    ethAvailable: (user.ethBalance || 0) - (user.ethLocked || 0),
    ethLocked: user.ethLocked || 0,
    etbBalance: user.etbBalance || 0,
    ethAddress: user.ethAddress || '',
    numericId: user.numericId,
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
      verifyLoginOtp, verifySignupOtp, sendOtp, updateSensitiveDetails, generateTelegramLinkCode, getTelegramLinkStatus, resendSignupOtpWithFallback,
      setError, setSuccess, setIsLocked
    }}>
      {children}
    </AuthContext.Provider>
  );
};
