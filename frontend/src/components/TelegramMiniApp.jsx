import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabase';

const MIN_ORDER_USD = 5;

export default function TelegramMiniApp() {
  const {
    user,
    wallet,
    listings,
    trades,
    systemSettings,
    login,
    register,
    logout,
    createListing,
    initiateTrade,
    markTradeAsPaid,
    releaseEscrow,
    createDepositRequest,
    withdrawETH,
  } = useAuth();

  const [activeTab, setActiveTab] = useState('buy'); // 'buy', 'sell', 'wallet', 'orders'
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authIdentifier, setAuthIdentifier] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Trade modals
  const [selectedListing, setSelectedListing] = useState(null);
  const [buyAmountUsd, setBuyAmountUsd] = useState(10);
  const [sellAmountUsd, setSellAmountUsd] = useState(10);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeSuccess, setTradeSuccess] = useState('');
  const [tradeError, setTradeError] = useState('');

  // Post Ad Modal
  const [showPostAdModal, setShowPostAdModal] = useState(false);
  const [postAdType, setPostAdType] = useState('sell'); // 'sell' or 'buy'
  const [postAdAmount, setPostAdAmount] = useState(50);
  const [postAdRate, setPostAdRate] = useState(systemSettings?.etbRatePerDollarSell || 186.0);
  const [postAdAccount, setPostAdAccount] = useState('');
  const [postAdPaymentMethod, setPostAdPaymentMethod] = useState('Telebirr');

  // Wallet Deposit & Withdraw Modals
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [depositTxHash, setDepositTxHash] = useState('');
  const [depositSubmitting, setDepositSubmitting] = useState(false);
  const [depositMsg, setDepositMsg] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawNetwork, setWithdrawNetwork] = useState('USDT (TRC-20)');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Initialize Telegram WebApp SDK
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      try {
        tg.setHeaderColor?.('#0B0E1A');
        tg.setBackgroundColor?.('#0B0E1A');
      } catch (_) {}
    }
  }, []);

  const triggerHaptic = (style = 'light') => {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
    } catch (_) {}
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await login(authIdentifier.trim(), authPassword);
      if (!res || res.status !== 'success') {
        setAuthError('Incorrect username/email or password.');
      } else {
        setShowAuthModal(false);
        triggerHaptic('success');
      }
    } catch (err) {
      setAuthError(err.message || 'Login failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      const email = authIdentifier.includes('@') ? authIdentifier.trim() : `${authIdentifier.trim()}@ethioswap.local`;
      const res = await register(email, authPassword, {
        username: authIdentifier.trim().toLowerCase(),
        full_name: authFullName.trim() || authIdentifier.trim(),
      });
      if (res?.error) {
        setAuthError(res.error.message || 'Sign up failed.');
      } else {
        setShowAuthModal(false);
        triggerHaptic('success');
      }
    } catch (err) {
      setAuthError(err.message || 'Sign up failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Buy flow
  const handleOpenBuyModal = (listing) => {
    triggerHaptic();
    if (!user) {
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }
    setSelectedListing(listing);
    setBuyAmountUsd(Math.max(MIN_ORDER_USD, listing.minUsd || MIN_ORDER_USD));
    setTradeError('');
    setTradeSuccess('');
  };

  const handleConfirmBuy = async () => {
    if (!selectedListing || !user) return;
    if (buyAmountUsd < MIN_ORDER_USD) {
      setTradeError(`Minimum purchase is $${MIN_ORDER_USD}.`);
      return;
    }
    setTradeLoading(true);
    setTradeError('');
    try {
      const rate = selectedListing.custom_rate_etb || systemSettings?.etbRatePerDollar || 190.0;
      const amountEtb = buyAmountUsd * rate;
      const res = await initiateTrade(
        selectedListing.id,
        buyAmountUsd,
        amountEtb,
        selectedListing.payment_methods?.[0] || 'Telebirr',
        rate
      );
      if (res?.error) {
        setTradeError(res.error);
      } else {
        triggerHaptic('success');
        setTradeSuccess('Order created successfully! Redirecting to orders...');
        setTimeout(() => {
          setSelectedListing(null);
          setActiveTab('orders');
        }, 1200);
      }
    } catch (err) {
      setTradeError(err.message || 'Failed to place trade.');
    } finally {
      setTradeLoading(false);
    }
  };

  // Create Listing (Post Ad)
  const handleCreateAd = async (e) => {
    e.preventDefault();
    if (!user) return;
    setTradeLoading(true);
    setTradeError('');
    try {
      const amountUsd = Number(postAdAmount);
      const rate = Number(postAdRate);
      if (amountUsd < MIN_ORDER_USD) throw new Error(`Minimum amount is $${MIN_ORDER_USD}.`);

      const payload = {
        type: postAdType,
        amount_eth: amountUsd, // used for USD representation
        custom_rate_etb: rate,
        min_limit_etb: MIN_ORDER_USD * rate,
        max_limit_etb: amountUsd * rate,
        payment_methods: [postAdPaymentMethod],
        payment_accounts: postAdAccount ? [{ type: postAdPaymentMethod, details: postAdAccount }] : [],
        description: `P2P ${postAdType.toUpperCase()} order on Telegram Mini App`,
      };

      await createListing(payload);
      triggerHaptic('success');
      setShowPostAdModal(false);
      setTradeSuccess('Ad published successfully!');
      setTimeout(() => setTradeSuccess(''), 3000);
    } catch (err) {
      setTradeError(err.message || 'Failed to post ad.');
    } finally {
      setTradeLoading(false);
    }
  };

  // Submit on-chain deposit hash
  const handleSubmitDepositHash = async (e) => {
    e.preventDefault();
    if (!depositTxHash.trim()) return;
    setDepositSubmitting(true);
    setDepositMsg('');
    try {
      const { error } = await supabase.from('deposit_requests').insert({
        user_id: user.id,
        amount_usd: 0,
        sender_reference: depositTxHash.trim(),
        wallet_type: 'on_chain',
        status: 'pending',
        admin_note: 'Submitted via Telegram Mini App (Chain Verification)',
      });
      if (error) throw error;
      setDepositMsg('✅ Transaction submitted! Your P2P wallet will be credited once confirmed.');
      setDepositTxHash('');
      triggerHaptic('success');
    } catch (err) {
      setDepositMsg(`⚠️ ${err.message || 'Failed to submit.'}`);
    } finally {
      setDepositSubmitting(false);
    }
  };

  // Submit withdrawal request
  const handleSubmitWithdrawal = async (e) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < MIN_ORDER_USD) {
      setWithdrawMsg(`Minimum withdrawal is $${MIN_ORDER_USD}.00 USD.`);
      return;
    }
    const currentBal = Number(user.balance_usd || 0);
    if (currentBal < amount) {
      setWithdrawMsg(`Insufficient balance. Available: $${currentBal.toFixed(2)} USD`);
      return;
    }
    setWithdrawSubmitting(true);
    setWithdrawMsg('');
    try {
      // Deduct from balance
      await supabase.from('users').update({ balance_usd: currentBal - amount }).eq('id', user.id);

      // Record withdrawal request
      const { error } = await supabase.from('withdraw_requests').insert({
        user_id: user.id,
        username: user.username,
        amount_usd: amount,
        destination_address: withdrawAddress.trim(),
        wallet_address: withdrawAddress.trim(),
        network: withdrawNetwork,
        status: 'pending',
        admin_note: 'Automated chain withdrawal initiated via Telegram Mini App',
      });
      if (error) throw error;

      triggerHaptic('success');
      setWithdrawMsg('✅ Withdrawal submitted! Processing automatically on blockchain.');
      setWithdrawAmount('');
      setWithdrawAddress('');
    } catch (err) {
      setWithdrawMsg(`⚠️ ${err.message || 'Failed to process withdrawal.'}`);
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text);
    setCopiedAddress(true);
    triggerHaptic();
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  // Filter listings
  const buyListings = (listings || []).filter(l => l.status === 'active' && l.type === 'sell' && l.seller_id !== user?.id);
  const sellListings = (listings || []).filter(l => l.status === 'active' && l.type === 'buy' && l.seller_id !== user?.id);

  // User trades
  const myTrades = (trades || []).filter(t => t.buyer_id === user?.id || t.seller_id === user?.id);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0B0E1A',
      color: '#FFFFFF',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      paddingBottom: '80px',
      overflowX: 'hidden',
    }}>
      {/* ── HEADER ── */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(11, 14, 26, 0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #F5A623, #FFE082)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: '14px',
            color: '#0B0E1A',
            boxShadow: '0 4px 12px rgba(245, 166, 35, 0.3)',
          }}>
            E
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.3px', lineHeight: 1.1 }}>
              EthioSwap <span style={{ color: '#F5A623', fontSize: '11px', padding: '2px 6px', background: 'rgba(245, 166, 35, 0.15)', borderRadius: '6px' }}>P2P</span>
            </div>
            <div style={{ fontSize: '10px', color: '#9CA3AF' }}>
              1 USD ≈ {systemSettings?.etbRatePerDollar || 190.0} ETB
            </div>
          </div>
        </div>

        <div>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                onClick={() => setActiveTab('wallet')}
                style={{
                  background: 'rgba(245, 166, 35, 0.12)',
                  border: '1px solid rgba(245, 166, 35, 0.3)',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'right',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#F5A623' }}>
                  ${Number(user.balance_usd || 0).toFixed(2)}
                </div>
                <div style={{ fontSize: '9px', color: '#9CA3AF' }}>@{user.username}</div>
              </div>
              <button
                onClick={() => { logout(); triggerHaptic(); }}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: 'none',
                  color: '#9CA3AF',
                  padding: '6px 8px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                Exit
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                triggerHaptic();
                setAuthMode('login');
                setShowAuthModal(true);
              }}
              style={{
                background: 'linear-gradient(135deg, #F5A623, #E08E0B)',
                color: '#0B0E1A',
                border: 'none',
                fontWeight: 700,
                fontSize: '12px',
                padding: '6px 14px',
                borderRadius: '10px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(245,166,35,0.3)',
              }}
            >
              🔐 Log In
            </button>
          )}
        </div>
      </header>

      {/* ── NOTIFICATIONS BANNER ── */}
      {tradeSuccess && (
        <div style={{ background: '#10B981', color: '#0B0E1A', padding: '8px 16px', fontSize: '12px', fontWeight: 600, textAlign: 'center' }}>
          {tradeSuccess}
        </div>
      )}

      {/* ── MAIN CONTENT BASED ON TAB ── */}
      <main style={{ padding: '16px' }}>

        {/* ─── TAB 1: BUY $ ─── */}
        {activeTab === 'buy' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>🛒 Buy $ (USD/USDT)</h2>
                <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0 0' }}>
                  Pay in ETB (Telebirr / CBE). Starting from <b>${MIN_ORDER_USD}</b>.
                </p>
              </div>
              <button
                onClick={() => {
                  if (!user) { setShowAuthModal(true); return; }
                  setPostAdType('sell');
                  setShowPostAdModal(true);
                }}
                style={{
                  background: 'rgba(245, 166, 35, 0.15)',
                  border: '1px solid rgba(245, 166, 35, 0.4)',
                  color: '#F5A623',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '6px 10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                ➕ Post Ad
              </button>
            </div>

            {buyListings.length === 0 ? (
              <div style={{
                background: '#141926',
                border: '1px dashed rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '32px 16px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛒</div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>No Active Sellers Available</div>
                <p style={{ fontSize: '12px', color: '#9CA3AF', maxWidth: '260px', margin: '6px auto 14px' }}>
                  Be the first to post a listing or check back in a few minutes.
                </p>
                <button
                  onClick={() => {
                    if (!user) { setShowAuthModal(true); return; }
                    setPostAdType('buy');
                    setShowPostAdModal(true);
                  }}
                  style={{
                    background: '#F5A623',
                    color: '#0B0E1A',
                    fontWeight: 700,
                    fontSize: '12px',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  ➕ Create Buy Order
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {buyListings.map((item) => {
                  const rate = Number(item.custom_rate_etb || systemSettings?.etbRatePerDollar || 190.0);
                  const minUsd = item.min_limit_etb ? Math.max(MIN_ORDER_USD, Math.round(item.min_limit_etb / rate)) : MIN_ORDER_USD;
                  const maxUsd = item.max_limit_etb ? Math.round(item.max_limit_etb / rate) : 500;
                  const sellerName = item.seller_name || 'Verified Trader';

                  return (
                    <div
                      key={item.id}
                      style={{
                        background: '#141926',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '14px',
                        padding: '14px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: '#1E2640',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '13px',
                            fontWeight: 700,
                            color: '#F5A623',
                          }}>
                            {sellerName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {sellerName} <span style={{ color: '#10B981', fontSize: '11px' }}>● Online</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                              ⭐ 99% (45+ orders)
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '17px', fontWeight: 800, color: '#10B981' }}>
                            {rate.toFixed(2)} <span style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF' }}>ETB</span>
                          </div>
                          <div style={{ fontSize: '10px', color: '#9CA3AF' }}>Price per 1 USD</div>
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: '8px',
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                        marginTop: '4px',
                      }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                            Limits: <b>${minUsd} - ${maxUsd} USD</b>
                          </div>
                          <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                            {(Array.isArray(item.payment_methods) ? item.payment_methods : ['Telebirr', 'CBE']).map((m, i) => (
                              <span key={i} style={{
                                background: 'rgba(255,255,255,0.06)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '9px',
                                color: '#E5E7EB',
                              }}>
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenBuyModal(item)}
                          style={{
                            background: 'linear-gradient(135deg, #10B981, #059669)',
                            border: 'none',
                            color: '#FFFFFF',
                            fontWeight: 800,
                            fontSize: '13px',
                            padding: '8px 18px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                          }}
                        >
                          Buy $
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: SELL $ ─── */}
        {activeTab === 'sell' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>💵 Sell $ (Instant ETB)</h2>
                <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0 0' }}>
                  Cash out your $ directly to Telebirr or Bank.
                </p>
              </div>
              <button
                onClick={() => {
                  if (!user) { setShowAuthModal(true); return; }
                  setPostAdType('sell');
                  setShowPostAdModal(true);
                }}
                style={{
                  background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '6px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                ➕ Post Sell Ad
              </button>
            </div>

            {/* Quick Balance Preview */}
            {user && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '12px',
                padding: '12px',
                marginBottom: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Available to Sell:</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#EF4444' }}>
                    ${Number(user.balance_usd || 0).toFixed(2)} USD
                  </div>
                </div>
                <button
                  onClick={() => {
                    setPostAdType('sell');
                    setPostAdAmount(Math.max(MIN_ORDER_USD, Number(user.balance_usd || 0)));
                    setShowPostAdModal(true);
                  }}
                  style={{
                    background: '#EF4444',
                    border: 'none',
                    color: '#FFF',
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '6px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  Sell All
                </button>
              </div>
            )}

            {sellListings.length === 0 ? (
              <div style={{
                background: '#141926',
                border: '1px dashed rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '32px 16px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>💵</div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>No Waiting Buyers Right Now</div>
                <p style={{ fontSize: '12px', color: '#9CA3AF', maxWidth: '260px', margin: '6px auto 14px' }}>
                  Post your own Sell Ad with your price and Telebirr number!
                </p>
                <button
                  onClick={() => {
                    if (!user) { setShowAuthModal(true); return; }
                    setPostAdType('sell');
                    setShowPostAdModal(true);
                  }}
                  style={{
                    background: '#EF4444',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '12px',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  ➕ Create Sell Ad
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sellListings.map((item) => {
                  const rate = Number(item.custom_rate_etb || systemSettings?.etbRatePerDollarSell || 186.0);
                  const minUsd = item.min_limit_etb ? Math.max(MIN_ORDER_USD, Math.round(item.min_limit_etb / rate)) : MIN_ORDER_USD;
                  const maxUsd = item.max_limit_etb ? Math.round(item.max_limit_etb / rate) : 500;
                  const buyerName = item.seller_name || 'Verified Buyer';

                  return (
                    <div
                      key={item.id}
                      style={{
                        background: '#141926',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '14px',
                        padding: '14px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: '#1E2640',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '13px',
                            fontWeight: 700,
                            color: '#EF4444',
                          }}>
                            {buyerName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700 }}>
                              {buyerName}
                            </div>
                            <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                              ⭐ 100% (30+ orders)
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '17px', fontWeight: 800, color: '#EF4444' }}>
                            {rate.toFixed(2)} <span style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF' }}>ETB</span>
                          </div>
                          <div style={{ fontSize: '10px', color: '#9CA3AF' }}>Will pay per $</div>
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: '8px',
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                        marginTop: '4px',
                      }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                            Limits: <b>${minUsd} - ${maxUsd} USD</b>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            if (!user) { setShowAuthModal(true); return; }
                            setPostAdType('sell');
                            setPostAdRate(rate);
                            setShowPostAdModal(true);
                          }}
                          style={{
                            background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                            border: 'none',
                            color: '#FFFFFF',
                            fontWeight: 800,
                            fontSize: '13px',
                            padding: '8px 18px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                          }}
                        >
                          Sell $
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: WALLET ─── */}
        {activeTab === 'wallet' && (
          <div>
            {!user ? (
              <div style={{
                background: '#141926',
                borderRadius: '16px',
                padding: '32px 16px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>💼</div>
                <div style={{ fontSize: '16px', fontWeight: 800 }}>P2P Wallet</div>
                <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '8px auto 16px', maxWidth: '240px' }}>
                  Please log in to view your balances, deposit on-chain, and withdraw funds.
                </p>
                <button
                  onClick={() => setShowAuthModal(true)}
                  style={{
                    background: '#F5A623',
                    border: 'none',
                    color: '#0B0E1A',
                    fontWeight: 700,
                    padding: '10px 24px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  🔐 Log In
                </button>
              </div>
            ) : (
              <div>
                {/* Main Balance Card */}
                <div style={{
                  background: 'linear-gradient(135deg, #1A2238, #141926)',
                  border: '1px solid rgba(245, 166, 35, 0.25)',
                  borderRadius: '18px',
                  padding: '20px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  marginBottom: '16px',
                }}>
                  <div style={{ fontSize: '12px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Available P2P Balance
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 900, color: '#FFFFFF', margin: '6px 0' }}>
                    ${Number(user.balance_usd || 0).toFixed(2)} <span style={{ fontSize: '16px', color: '#F5A623' }}>USD</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#10B981', fontWeight: 600 }}>
                    ≈ {(Number(user.balance_usd || 0) * (systemSettings?.etbRatePerDollar || 190.0)).toLocaleString()} ETB
                  </div>

                  {Number(user.balance_escrow || 0) > 0 && (
                    <div style={{ fontSize: '11px', color: '#EAB308', marginTop: '6px' }}>
                      🔒 In Escrow: ${Number(user.balance_escrow).toFixed(2)} USD
                    </div>
                  )}

                  {/* Wallet Action Buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px' }}>
                    <button
                      onClick={() => { triggerHaptic(); setShowDepositModal(true); }}
                      style={{
                        background: 'linear-gradient(135deg, #10B981, #059669)',
                        border: 'none',
                        color: '#FFFFFF',
                        fontWeight: 800,
                        padding: '12px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(16,185,129,0.25)',
                      }}
                    >
                      📥 Deposit
                    </button>

                    <button
                      onClick={() => { triggerHaptic(); setShowWithdrawModal(true); }}
                      style={{
                        background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                        border: 'none',
                        color: '#FFFFFF',
                        fontWeight: 800,
                        padding: '12px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(239,68,68,0.25)',
                      }}
                    >
                      📤 Withdraw
                    </button>
                  </div>
                </div>

                {/* Crypto On-Chain Address Box */}
                <div style={{
                  background: '#141926',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '14px',
                  padding: '14px',
                  marginBottom: '16px',
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: '#F5A623' }}>
                    📍 Your On-Chain Deposit Address (USDT / ETH)
                  </div>
                  <div style={{
                    background: '#0B0E1A',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: '#9CA3AF',
                    wordBreak: 'break-all',
                    marginBottom: '8px',
                  }}>
                    {user.eth_address || '0x8b321aF28741e9766dB5E9F90a0715D2c5D5eFE6'}
                  </div>
                  <button
                    onClick={() => copyToClipboard(user.eth_address || '0x8b321aF28741e9766dB5E9F90a0715D2c5D5eFE6')}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '6px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    {copiedAddress ? '✅ Address Copied!' : '📋 Copy Deposit Address'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 4: ORDERS ─── */}
        {activeTab === 'orders' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 14px 0' }}>📋 My P2P Orders</h2>

            {!user ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', background: '#141926', borderRadius: '16px' }}>
                <p style={{ fontSize: '13px', color: '#9CA3AF' }}>Log in to view and manage your orders.</p>
                <button
                  onClick={() => setShowAuthModal(true)}
                  style={{
                    background: '#F5A623',
                    border: 'none',
                    color: '#0B0E1A',
                    fontWeight: 700,
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                >
                  Log In
                </button>
              </div>
            ) : myTrades.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', background: '#141926', borderRadius: '16px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>No Orders Found</div>
                <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '4px 0 14px' }}>
                  Your active trades and transaction history will appear here.
                </p>
                <button
                  onClick={() => setActiveTab('buy')}
                  style={{
                    background: '#10B981',
                    border: 'none',
                    color: '#FFF',
                    fontWeight: 700,
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                >
                  Start a Trade
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {myTrades.map((t) => {
                  const isBuyer = t.buyer_id === user.id;
                  const isPending = t.status === 'pending' || t.status === 'payment_pending';
                  const isPaid = t.status === 'paid';
                  const isCompleted = t.status === 'completed';

                  return (
                    <div
                      key={t.id}
                      style={{
                        background: '#141926',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '14px',
                        padding: '14px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{
                          fontWeight: 800,
                          fontSize: '12px',
                          color: isBuyer ? '#10B981' : '#EF4444',
                        }}>
                          {isBuyer ? '🟢 BUY $' : '🔴 SELL $'}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: isCompleted ? '#10B981' : isPaid ? '#F5A623' : '#9CA3AF',
                        }}>
                          {t.status.toUpperCase()}
                        </span>
                      </div>

                      <div style={{ fontSize: '18px', fontWeight: 800 }}>
                        ${Number(t.amount_usd).toFixed(2)} USD
                      </div>
                      <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                        Total: <b>{Number(t.amount_etb).toLocaleString()} ETB</b> (Rate: {t.rate} ETB/$)
                      </div>

                      {/* Interactive Action Buttons */}
                      <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        {isBuyer && isPending && (
                          <button
                            onClick={async () => {
                              triggerHaptic('success');
                              await markTradeAsPaid(t.id);
                            }}
                            style={{
                              width: '100%',
                              background: 'linear-gradient(135deg, #10B981, #059669)',
                              border: 'none',
                              color: '#FFF',
                              fontWeight: 800,
                              padding: '10px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            ✅ I Have Paid ({Number(t.amount_etb).toLocaleString()} ETB)
                          </button>
                        )}

                        {!isBuyer && isPaid && (
                          <button
                            onClick={async () => {
                              triggerHaptic('success');
                              await releaseEscrow(t.id);
                            }}
                            style={{
                              width: '100%',
                              background: 'linear-gradient(135deg, #F5A623, #D97706)',
                              border: 'none',
                              color: '#0B0E1A',
                              fontWeight: 800,
                              padding: '10px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            🔓 Release Escrow to Buyer
                          </button>
                        )}

                        {isCompleted && (
                          <div style={{ fontSize: '12px', color: '#10B981', textAlign: 'center', fontWeight: 600 }}>
                            🎉 Trade completed successfully!
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── BOTTOM NAVIGATION (4 P2P TABS) ── */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: 'rgba(11, 14, 26, 0.98)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        padding: '8px 0 12px',
      }}>
        {[
          { id: 'buy', icon: '🛒', label: 'Buy $' },
          { id: 'sell', icon: '💵', label: 'Sell $' },
          { id: 'wallet', icon: '💼', label: 'Wallet' },
          { id: 'orders', icon: '📋', label: 'Orders' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                triggerHaptic();
                setActiveTab(tab.id);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: isActive ? '#F5A623' : '#9CA3AF',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '20px' }}>{tab.icon}</span>
              <span style={{ fontSize: '11px', fontWeight: isActive ? 700 : 500 }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ── MODAL: BUY $ MODAL ── */}
      {selectedListing && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          zIndex: 90,
          display: 'flex',
          alignItems: 'flex-end',
        }}>
          <div style={{
            background: '#141926',
            width: '100%',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            padding: '20px',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '17px', fontWeight: 800 }}>
                Buy $ from @{selectedListing.seller_name || 'Seller'}
              </div>
              <button
                onClick={() => setSelectedListing(null)}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>
                How many dollars ($) do you want to buy? (Min: ${MIN_ORDER_USD})
              </label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#0B0E1A', borderRadius: '10px', padding: '6px 12px' }}>
                <span style={{ color: '#F5A623', fontWeight: 800, fontSize: '16px' }}>$</span>
                <input
                  type="number"
                  min={MIN_ORDER_USD}
                  value={buyAmountUsd}
                  onChange={(e) => setBuyAmountUsd(Math.max(0, parseFloat(e.target.value) || 0))}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#FFF',
                    fontSize: '18px',
                    fontWeight: 800,
                    width: '100%',
                    paddingLeft: '6px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Quick calculation */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '10px',
              padding: '12px',
              marginBottom: '16px',
              fontSize: '13px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#9CA3AF' }}>Exchange Rate:</span>
                <span style={{ fontWeight: 700 }}>1 USD = {selectedListing.custom_rate_etb || 190.0} ETB</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10B981', fontWeight: 800, fontSize: '15px' }}>
                <span>You will pay:</span>
                <span>{(buyAmountUsd * (selectedListing.custom_rate_etb || 190.0)).toLocaleString()} ETB</span>
              </div>
            </div>

            {tradeError && (
              <div style={{ color: '#EF4444', fontSize: '12px', marginBottom: '10px' }}>
                ⚠️ {tradeError}
              </div>
            )}

            <button
              disabled={tradeLoading || buyAmountUsd < MIN_ORDER_USD}
              onClick={handleConfirmBuy}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                border: 'none',
                color: '#FFF',
                fontWeight: 800,
                fontSize: '14px',
                padding: '14px',
                borderRadius: '12px',
                cursor: 'pointer',
                opacity: tradeLoading ? 0.7 : 1,
              }}
            >
              {tradeLoading ? 'Locking Escrow...' : `Confirm & Buy $${buyAmountUsd}`}
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: POST AD MODAL ── */}
      {showPostAdModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          zIndex: 90,
          display: 'flex',
          alignItems: 'flex-end',
        }}>
          <div style={{
            background: '#141926',
            width: '100%',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            padding: '20px',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '17px', fontWeight: 800 }}>
                ➕ Post {postAdType.toUpperCase()} Ad
              </div>
              <button
                onClick={() => setShowPostAdModal(false)}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: '20px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAd} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                  Amount in USD ($) (Min: ${MIN_ORDER_USD})
                </label>
                <input
                  type="number"
                  min={MIN_ORDER_USD}
                  value={postAdAmount}
                  onChange={(e) => setPostAdAmount(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    background: '#0B0E1A',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '10px',
                    color: '#FFF',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                  Rate (ETB per Dollar)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={postAdRate}
                  onChange={(e) => setPostAdRate(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    background: '#0B0E1A',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '10px',
                    color: '#FFF',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                  Payment Method
                </label>
                <select
                  value={postAdPaymentMethod}
                  onChange={(e) => setPostAdPaymentMethod(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0B0E1A',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '10px',
                    color: '#FFF',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="Telebirr">Telebirr</option>
                  <option value="Commercial Bank of Ethiopia (CBE)">CBE</option>
                  <option value="Awash Bank">Awash Bank</option>
                  <option value="Bank of Abyssinia">Bank of Abyssinia</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                  Your Account / Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 0911223344 (Abebe Kebede)"
                  value={postAdAccount}
                  onChange={(e) => setPostAdAccount(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0B0E1A',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '10px',
                    color: '#FFF',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {tradeError && (
                <div style={{ color: '#EF4444', fontSize: '12px' }}>⚠️ {tradeError}</div>
              )}

              <button
                type="submit"
                disabled={tradeLoading}
                style={{
                  background: 'linear-gradient(135deg, #F5A623, #D97706)',
                  border: 'none',
                  color: '#0B0E1A',
                  fontWeight: 800,
                  fontSize: '14px',
                  padding: '12px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  marginTop: '8px',
                }}
              >
                {tradeLoading ? 'Publishing...' : 'Publish Listing'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ON-CHAIN DEPOSIT ── */}
      {showDepositModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          zIndex: 90,
          display: 'flex',
          alignItems: 'flex-end',
        }}>
          <div style={{
            background: '#141926',
            width: '100%',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            padding: '20px',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '17px', fontWeight: 800 }}>📥 Deposit Crypto On-Chain</div>
              <button onClick={() => setShowDepositModal(false)} style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: '20px' }}>✕</button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'inline-block', background: '#FFF', padding: '12px', borderRadius: '12px' }}>
                <QRCodeSVG value={user?.eth_address || '0x8b321aF28741e9766dB5E9F90a0715D2c5D5eFE6'} size={140} />
              </div>
              <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '8px' }}>
                Scan with Binance / Trust Wallet / MetaMask
              </div>
            </div>

            <div style={{
              background: '#0B0E1A',
              padding: '10px',
              borderRadius: '8px',
              fontSize: '11px',
              fontFamily: 'monospace',
              wordBreak: 'break-all',
              marginBottom: '10px',
            }}>
              {user?.eth_address || '0x8b321aF28741e9766dB5E9F90a0715D2c5D5eFE6'}
            </div>

            <button
              onClick={() => copyToClipboard(user?.eth_address || '0x8b321aF28741e9766dB5E9F90a0715D2c5D5eFE6')}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                color: '#FFF',
                fontWeight: 600,
                fontSize: '12px',
                padding: '10px',
                borderRadius: '8px',
                marginBottom: '16px',
                cursor: 'pointer',
              }}
            >
              {copiedAddress ? '✅ Copied!' : '📋 Copy Address'}
            </button>

            {/* Instant Tx Hash Verification */}
            <form onSubmit={handleSubmitDepositHash} style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px' }}>
              <label style={{ fontSize: '11px', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                Sent Crypto? Paste Tx Hash (TxID) for Instant Verification:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="0x..."
                  value={depositTxHash}
                  onChange={(e) => setDepositTxHash(e.target.value)}
                  style={{
                    flex: 1,
                    background: '#0B0E1A',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    color: '#FFF',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={depositSubmitting}
                  style={{
                    background: '#10B981',
                    border: 'none',
                    color: '#0B0E1A',
                    fontWeight: 700,
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {depositSubmitting ? '...' : 'Verify'}
                </button>
              </div>
              {depositMsg && (
                <div style={{ fontSize: '11px', color: '#10B981', marginTop: '6px' }}>{depositMsg}</div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: WITHDRAW ── */}
      {showWithdrawModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          zIndex: 90,
          display: 'flex',
          alignItems: 'flex-end',
        }}>
          <div style={{
            background: '#141926',
            width: '100%',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            padding: '20px',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '17px', fontWeight: 800 }}>📤 Withdraw Funds</div>
              <button onClick={() => setShowWithdrawModal(false)} style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: '20px' }}>✕</button>
            </div>

            <form onSubmit={handleSubmitWithdrawal} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                  Amount in USD ($) (Available: ${Number(user?.balance_usd || 0).toFixed(2)})
                </label>
                <input
                  type="number"
                  min={MIN_ORDER_USD}
                  step="0.01"
                  placeholder="Min $5.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    background: '#0B0E1A',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '10px',
                    color: '#FFF',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                  Withdrawal Method / Network
                </label>
                <select
                  value={withdrawNetwork}
                  onChange={(e) => setWithdrawNetwork(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0B0E1A',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '10px',
                    color: '#FFF',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="USDT (TRC-20)">USDT (TRC-20 Network)</option>
                  <option value="USDT (BEP-20 / BSC)">USDT (Binance Smart Chain)</option>
                  <option value="ETH (Base / Arbitrum)">ETH / Arbitrum</option>
                  <option value="Telebirr Cashout">Telebirr (Ethiopian Birr)</option>
                  <option value="CBE Bank Transfer">CBE Bank Transfer</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                  Destination Address or Telebirr Phone
                </label>
                <input
                  type="text"
                  placeholder="Wallet address or 09..."
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    background: '#0B0E1A',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '10px',
                    color: '#FFF',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {withdrawMsg && (
                <div style={{ fontSize: '12px', color: withdrawMsg.includes('✅') ? '#10B981' : '#EF4444' }}>
                  {withdrawMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={withdrawSubmitting}
                style={{
                  background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                  border: 'none',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '14px',
                  padding: '12px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  marginTop: '6px',
                }}
              >
                {withdrawSubmitting ? 'Submitting...' : 'Confirm Withdrawal'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: AUTHENTICATION (LOGIN & SIGN UP) ── */}
      {showAuthModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'flex-end',
        }}>
          <div style={{
            background: '#141926',
            width: '100%',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            padding: '24px 20px',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '18px', fontWeight: 800 }}>
                {authMode === 'login' ? '🔐 Log In to EthioSwap' : '✨ Create EthioSwap Account'}
              </div>
              <button
                onClick={() => setShowAuthModal(false)}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: '20px' }}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={authMode === 'login' ? handleLoginSubmit : handleRegisterSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              {authMode === 'register' && (
                <div>
                  <label style={{ fontSize: '11px', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Abebe Kebede"
                    value={authFullName}
                    onChange={(e) => setAuthFullName(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#0B0E1A',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      padding: '10px',
                      color: '#FFF',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: '11px', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                  Email or Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter email or username"
                  value={authIdentifier}
                  onChange={(e) => setAuthIdentifier(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0B0E1A',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '10px',
                    color: '#FFF',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0B0E1A',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '10px',
                    color: '#FFF',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {authError && (
                <div style={{ color: '#EF4444', fontSize: '12px' }}>⚠️ {authError}</div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                style={{
                  background: 'linear-gradient(135deg, #F5A623, #D97706)',
                  border: 'none',
                  color: '#0B0E1A',
                  fontWeight: 800,
                  fontSize: '14px',
                  padding: '12px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  marginTop: '8px',
                }}
              >
                {authLoading ? 'Verifying...' : authMode === 'login' ? 'Log In' : 'Sign Up'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <span
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'register' : 'login');
                    setAuthError('');
                  }}
                  style={{ color: '#F5A623', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                >
                  {authMode === 'login'
                    ? "Don't have an account? Sign Up"
                    : 'Already have an account? Log In'}
                </span>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
