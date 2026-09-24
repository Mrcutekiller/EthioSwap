import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabase';

const MIN_ORDER_USD = 5;

// 3D Flipping Paper Money Component (USD $100 on front, ETB 200 on back)
function PaperMoneyMini({ flipped, onToggleFlip }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onToggleFlip}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '130px',
        height: '270px',
        perspective: '1200px',
        cursor: 'pointer',
        userSelect: 'none',
        margin: '0 auto',
        filter: hovered
          ? 'drop-shadow(0 20px 40px rgba(0,0,0,0.8)) drop-shadow(0 0 25px rgba(245,166,35,0.4))'
          : 'drop-shadow(0 15px 30px rgba(0,0,0,0.6))',
        transition: 'filter 0.3s ease',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: 'transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* FRONT: US $100 Bill */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1.5px solid rgba(245, 166, 35, 0.4)',
            background: '#0d2217',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.6)',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundImage: 'url(/images/usd_100.jpg)',
              backgroundSize: '100% 100%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />
        </div>

        {/* BACK: Ethiopian Birr 200 Note */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1.5px solid rgba(245, 166, 35, 0.4)',
            background: '#1d1b24',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.6)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: '270px',
              height: '130px',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%) rotate(90deg)',
              backgroundImage: 'url(/images/etb_200.jpg)',
              backgroundSize: '100% 200%',
              backgroundPosition: 'top center',
              backgroundRepeat: 'no-repeat',
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function TelegramMiniApp() {
  const {
    user,
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
  } = useAuth();

  // Navigation tab: 'welcome', 'buy', 'sell', 'wallet', 'orders', 'history'
  const [activeTab, setActiveTab] = useState('welcome');
  const [welcomeStep, setWelcomeStep] = useState(1); // 1: Swap bill, 2: How it works, 3: Log In / Start
  const [billFlipped, setBillFlipped] = useState(false);
  const [swapUsd, setSwapUsd] = useState(100);
  const [swapDirection, setSwapDirection] = useState('USD_TO_ETB'); // 'USD_TO_ETB' or 'ETB_TO_USD'

  // Auth modal
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authIdentifier, setAuthIdentifier] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Trade modals
  const [selectedListing, setSelectedListing] = useState(null);
  const [buyAmountUsd, setBuyAmountUsd] = useState(10);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeSuccess, setTradeSuccess] = useState('');
  const [tradeError, setTradeError] = useState('');

  // Post Ad Modal
  const [showPostAdModal, setShowPostAdModal] = useState(false);
  const [postAdType, setPostAdType] = useState('sell');
  const [postAdAmount, setPostAdAmount] = useState(50);
  const [postAdRate, setPostAdRate] = useState(systemSettings?.etbRatePerDollarSell || 186.0);
  const [postAdAccount, setPostAdAccount] = useState('');
  const [postAdPaymentMethod, setPostAdPaymentMethod] = useState('Telebirr');

  // Wallet Modals
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

  // History Tab state
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all', 'trades', 'deposits', 'withdrawals'
  const [userTransactions, setUserTransactions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

    // If user is already logged in and previously visited, go to Buy
    if (localStorage.getItem('ethioswap_tma_visited') === 'true') {
      setActiveTab('buy');
    }
  }, []);

  const triggerHaptic = (style = 'light') => {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
    } catch (_) {}
  };

  // Helper to send instant notification directly to user's Telegram chat
  const notifyTelegramChat = async (messageText) => {
    try {
      const tgUserId =
        window.Telegram?.WebApp?.initDataUnsafe?.user?.id ||
        new URLSearchParams(window.location.search).get('chat_id') ||
        user?.telegram_chat_id;

      if (!tgUserId) {
        console.log('[Telegram Notification]: No chatId available in WebApp context.');
        return;
      }

      await fetch('https://api.telegram.org/bot8920615384:AAHoJ5OCIzwehDYQ-xDe6Zr-aaGEO3L2h5c/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: tgUserId,
          text: messageText,
          parse_mode: 'Markdown',
        }),
      });
    } catch (err) {
      console.warn('[Telegram Chat Notification Error]:', err);
    }
  };

  // Fetch full transaction history
  const loadUserHistory = async () => {
    if (!user?.id) return;
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);

      if (!error && data) {
        setUserTransactions(data);
      }
    } catch (err) {
      console.warn('Error loading transactions:', err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history' && user?.id) {
      loadUserHistory();
    }
  }, [activeTab, user?.id]);

  const handleBillFlip = () => {
    triggerHaptic('medium');
    setBillFlipped(f => !f);
    setSwapDirection(d => (d === 'USD_TO_ETB' ? 'ETB_TO_USD' : 'USD_TO_ETB'));
    // Advance to calculator if on step 1
    if (welcomeStep === 1) {
      setWelcomeStep(2);
    }
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
        localStorage.setItem('ethioswap_tma_visited', 'true');
        notifyTelegramChat(
          `🔐 *EthioSwap Account Connected!*\n\n` +
          `👤 *User:* @${authIdentifier.trim()}\n` +
          `💰 *P2P Balance:* $${Number(res.user?.balance_usd || 0).toFixed(2)} USD\n` +
          `✅ Your Telegram session is now linked with your EthioSwap account.`
        );
        setActiveTab('buy');
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
        localStorage.setItem('ethioswap_tma_visited', 'true');
        notifyTelegramChat(
          `✨ *Welcome to EthioSwap!*\n\n` +
          `👤 *New Account:* @${authIdentifier.trim()}\n` +
          `🚀 Your account is registered and ready for instant P2P dollar trading!`
        );
        setActiveTab('buy');
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
        notifyTelegramChat(
          `🛒 *P2P Buy Order Created!*\n\n` +
          `💵 *Buying:* $${buyAmountUsd.toFixed(2)} USD\n` +
          `💰 *Payable:* ${amountEtb.toLocaleString()} ETB (Rate: ${rate} ETB/$)\n` +
          `👤 *Seller:* @${selectedListing.seller_name || 'Seller'}\n` +
          `💳 *Payment Method:* ${selectedListing.payment_methods?.[0] || 'Telebirr'}\n` +
          `🛡️ *Escrow:* Funds safely secured in Escrow.\n\n` +
          `⚡ Transfer ETB to the seller and tap "I Have Paid" in the app!`
        );
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

  // Create Listing
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
        amount_eth: amountUsd,
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
      notifyTelegramChat(
        `📢 *New P2P Listing Published!*\n\n` +
        `📊 *Type:* ${postAdType.toUpperCase()} USD\n` +
        `💵 *Amount:* $${amountUsd.toFixed(2)} USD\n` +
        `📈 *Rate:* ${rate} ETB/USD\n` +
        `💳 *Payment Method:* ${postAdPaymentMethod}\n` +
        `🟢 *Status:* Active in EthioSwap P2P Marketplace.`
      );
      setTimeout(() => setTradeSuccess(''), 3000);
    } catch (err) {
      setTradeError(err.message || 'Failed to post ad.');
    } finally {
      setTradeLoading(false);
    }
  };

  // Deposit Tx Hash
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
      setDepositMsg('✅ Transaction submitted! Auto-crediting upon chain confirmation.');
      notifyTelegramChat(
        `📥 *On-Chain Deposit Submitted!*\n\n` +
        `🔗 *Tx Hash:* \`${depositTxHash.trim()}\`\n` +
        `🌐 *Network:* USDT TRC-20 / On-Chain\n` +
        `⏳ *Status:* Pending automated verification (usually 1-3 minutes).`
      );
      setDepositTxHash('');
      triggerHaptic('success');
    } catch (err) {
      setDepositMsg(`⚠️ ${err.message || 'Failed to submit.'}`);
    } finally {
      setDepositSubmitting(false);
    }
  };

  // Withdrawal
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
      await supabase.from('users').update({ balance_usd: currentBal - amount }).eq('id', user.id);
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
      setWithdrawMsg('✅ Withdrawal submitted! Automated dispatch is processing.');
      notifyTelegramChat(
        `📤 *Withdrawal Requested!*\n\n` +
        `💵 *Amount:* $${amount.toFixed(2)} USD\n` +
        `🏦 *Destination:* \`${withdrawAddress.trim()}\` (${withdrawNetwork})\n` +
        `⏳ *Status:* In queue for automated dispatch.`
      );
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

  const buyRate = systemSettings?.etbRatePerDollar || 190.0;
  const sellRate = systemSettings?.etbRatePerDollarSell || 186.0;

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
      paddingBottom: activeTab === 'welcome' ? '24px' : '80px',
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
              1 USD ≈ {buyRate} ETB
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => {
              triggerHaptic();
              setActiveTab('welcome');
              setWelcomeStep(1);
            }}
            title="Interactive Welcome / Tour"
            style={{
              background: activeTab === 'welcome' ? 'rgba(245, 166, 35, 0.2)' : 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(245, 166, 35, 0.3)',
              color: '#F5A623',
              fontSize: '11px',
              fontWeight: 700,
              padding: '5px 8px',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            ✨ Tour
          </button>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                onClick={() => setActiveTab('wallet')}
                style={{
                  background: 'rgba(245, 166, 35, 0.12)',
                  border: '1px solid rgba(245, 166, 35, 0.3)',
                  padding: '4px 8px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  textAlign: 'right',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#F5A623' }}>
                  ${Number(user.balance_usd || 0).toFixed(2)}
                </div>
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
                padding: '6px 12px',
                borderRadius: '10px',
                cursor: 'pointer',
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

      {/* ═════════════════════════════════════════════════════ */}
      {/* ─── TAB 0: WELCOME & INTERACTIVE CURRENCY SWAP ─── */}
      {/* ═════════════════════════════════════════════════════ */}
      {activeTab === 'welcome' && (
        <div style={{ padding: '20px 16px', maxWidth: '440px', margin: '0 auto', textAlign: 'center' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(245, 166, 35, 0.12)',
            border: '1px solid rgba(245, 166, 35, 0.3)',
            borderRadius: '20px',
            padding: '4px 14px',
            fontSize: '12px',
            fontWeight: 700,
            color: '#F5A623',
            marginBottom: '12px',
          }}>
            🇪🇹 Ethiopia’s Official P2P Currency Swap
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: 900, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
            Instant <span style={{ color: '#10B981' }}>USD ($)</span> ⇄ <span style={{ color: '#F5A623' }}>Birr (ETB)</span>
          </h1>
          <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '0 0 20px', lineHeight: 1.4 }}>
            Trade directly with Telebirr & CBE. Touch the bill below to swap currencies!
          </p>

          {/* ── THE 3D FLIPPING CURRENCY BILL ── */}
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <PaperMoneyMini flipped={billFlipped} onToggleFlip={handleBillFlip} />
            <div
              onClick={handleBillFlip}
              style={{
                marginTop: '12px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#F5A623',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(245,166,35,0.1)',
                padding: '6px 14px',
                borderRadius: '16px',
                border: '1px solid rgba(245,166,35,0.25)',
              }}
            >
              🔄 Touch Bill to Flip & Swap ({billFlipped ? '200 Birr' : '100 USD'})
            </div>
          </div>

          {/* ── STEP 1: INTERACTIVE SWAP CALCULATOR ── */}
          <div style={{
            background: 'linear-gradient(135deg, #141926, #1E2640)',
            border: '1px solid rgba(245, 166, 35, 0.25)',
            borderRadius: '18px',
            padding: '16px',
            marginTop: '16px',
            textAlign: 'left',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF' }}>Live Currency Swap</span>
              <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 700 }}>1 USD = {buyRate} ETB</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'center' }}>
              {/* Box 1 */}
              <div style={{ background: '#0B0E1A', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '10px', color: '#9CA3AF' }}>You Send</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFF' }}>
                  {swapDirection === 'USD_TO_ETB' ? `$${swapUsd}` : `${(swapUsd * buyRate).toLocaleString()} ETB`}
                </div>
              </div>

              {/* Swap Button */}
              <button
                onClick={handleBillFlip}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#F5A623',
                  border: 'none',
                  color: '#0B0E1A',
                  fontWeight: 900,
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(245,166,35,0.4)',
                }}
              >
                ⇄
              </button>

              {/* Box 2 */}
              <div style={{ background: '#0B0E1A', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '10px', color: '#9CA3AF' }}>You Receive</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#10B981' }}>
                  {swapDirection === 'USD_TO_ETB' ? `${(swapUsd * buyRate).toLocaleString()} ETB` : `$${swapUsd}`}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '12px', display: 'flex', gap: '6px' }}>
              {[25, 50, 100, 200, 500].map((amt) => (
                <button
                  key={amt}
                  onClick={() => { triggerHaptic(); setSwapUsd(amt); }}
                  style={{
                    flex: 1,
                    background: swapUsd === amt ? 'rgba(245, 166, 35, 0.25)' : 'rgba(255,255,255,0.04)',
                    border: swapUsd === amt ? '1px solid #F5A623' : '1px solid rgba(255,255,255,0.06)',
                    color: swapUsd === amt ? '#F5A623' : '#9CA3AF',
                    borderRadius: '8px',
                    padding: '6px 0',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>

          {/* ── STEP 2: HOW IT WORKS ── */}
          <div style={{ marginTop: '24px', textAlign: 'left' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 12px 4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              💡 How It Works in 3 Steps
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { step: '1', title: 'Choose Buy or Sell', desc: 'Select a verified trader or post your own custom price ad with Telebirr or CBE.' },
                { step: '2', title: '100% Escrow Protection', desc: 'The crypto or dollars are held securely in smart escrow. Zero risk of fraud.' },
                { step: '3', title: 'Instant Release', desc: 'Transfer ETB via Telebirr or Bank, confirm payment, and funds release to your wallet!' },
              ].map((item) => (
                <div
                  key={item.step}
                  style={{
                    background: '#141926',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '12px',
                    padding: '12px',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: '#F5A623',
                    color: '#0B0E1A',
                    fontWeight: 900,
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {item.step}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFF' }}>{item.title}</div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px', lineHeight: 1.35 }}>
                      {item.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── STEP 3: ACTION BUTTONS ── */}
          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {!user ? (
              <>
                <button
                  onClick={() => {
                    triggerHaptic('success');
                    setAuthMode('login');
                    setShowAuthModal(true);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #F5A623, #D97706)',
                    border: 'none',
                    color: '#0B0E1A',
                    fontWeight: 900,
                    fontSize: '15px',
                    padding: '14px',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(245, 166, 35, 0.35)',
                  }}
                >
                  🔐 Log In with EthioSwap Account
                </button>

                <button
                  onClick={() => {
                    triggerHaptic();
                    setAuthMode('register');
                    setShowAuthModal(true);
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#FFF',
                    fontWeight: 700,
                    fontSize: '14px',
                    padding: '12px',
                    borderRadius: '14px',
                    cursor: 'pointer',
                  }}
                >
                  ✨ Create Free Account
                </button>
              </>
            ) : null}

            <button
              onClick={() => {
                triggerHaptic();
                localStorage.setItem('ethioswap_tma_visited', 'true');
                setActiveTab('buy');
              }}
              style={{
                background: 'linear-gradient(135deg, #10B981, #059669)',
                border: 'none',
                color: '#FFF',
                fontWeight: 800,
                fontSize: '15px',
                padding: '14px',
                borderRadius: '14px',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
              }}
            >
              🚀 Explore P2P Market Now →
            </button>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════ */}
      {/* ─── TAB 1: BUY $ ─── */}
      {/* ═════════════════════════════════════════════════════ */}
      {activeTab === 'buy' && (
        <main style={{ padding: '16px' }}>
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
                const rate = Number(item.custom_rate_etb || buyRate);
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
        </main>
      )}

      {/* ═════════════════════════════════════════════════════ */}
      {/* ─── TAB 2: SELL $ ─── */}
      {/* ═════════════════════════════════════════════════════ */}
      {activeTab === 'sell' && (
        <main style={{ padding: '16px' }}>
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
                const rate = Number(item.custom_rate_etb || sellRate);
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
        </main>
      )}

      {/* ═════════════════════════════════════════════════════ */}
      {/* ─── TAB 3: WALLET ─── */}
      {/* ═════════════════════════════════════════════════════ */}
      {activeTab === 'wallet' && (
        <main style={{ padding: '16px' }}>
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
                  ≈ {(Number(user.balance_usd || 0) * buyRate).toLocaleString()} ETB
                </div>

                {Number(user.balance_escrow || 0) > 0 && (
                  <div style={{ fontSize: '11px', color: '#EAB308', marginTop: '6px' }}>
                    🔒 In Escrow: ${Number(user.balance_escrow).toFixed(2)} USD
                  </div>
                )}

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

              {/* On-Chain Crypto Box */}
              <div style={{
                background: '#141926',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '14px',
                padding: '14px',
                marginBottom: '16px',
              }}>
                <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: '#F5A623' }}>
                  📍 Your On-Chain Address (USDT / ETH)
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
        </main>
      )}

      {/* ═════════════════════════════════════════════════════ */}
      {/* ─── TAB 4: ORDERS ─── */}
      {/* ═════════════════════════════════════════════════════ */}
      {activeTab === 'orders' && (
        <main style={{ padding: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 14px 0' }}>📋 Active Orders</h2>

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
                Your active trades will appear here.
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

                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      {isBuyer && isPending && (
                        <button
                          onClick={async () => {
                            triggerHaptic('success');
                            await markTradeAsPaid(t.id);
                            notifyTelegramChat(
                              `✅ *Payment Confirmed by Buyer!*\n\n` +
                              `💵 *Order:* #${t.id.slice(0, 8)}\n` +
                              `💰 *Amount:* $${Number(t.amount_usd).toFixed(2)} USD (${Number(t.amount_etb).toLocaleString()} ETB)\n` +
                              `🔔 *Status:* Marked as Paid.\n\n` +
                              `The seller has been alerted to verify receipt and release the funds from escrow.`
                            );
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
                            notifyTelegramChat(
                              `🎉 *Escrow Released — Trade Completed!*\n\n` +
                              `💵 *Order:* #${t.id.slice(0, 8)}\n` +
                              `💰 *Amount:* $${Number(t.amount_usd).toFixed(2)} USD\n` +
                              `✅ Funds released to buyer. Trade successfully completed!`
                            );
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
        </main>
      )}

      {/* ═════════════════════════════════════════════════════ */}
      {/* ─── TAB 5: TRANSACTION HISTORY ─── */}
      {/* ═════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <main style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>📜 Transaction History</h2>
              <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0 0' }}>
                Your complete trading and funding ledger.
              </p>
            </div>
            <button
              onClick={loadUserHistory}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: 'none',
                color: '#F5A623',
                fontSize: '11px',
                padding: '6px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              🔄 Refresh
            </button>
          </div>

          {!user ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', background: '#141926', borderRadius: '16px' }}>
              <p style={{ fontSize: '13px', color: '#9CA3AF' }}>Please log in to view your transaction history.</p>
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
          ) : (
            <div>
              {/* Summary Metrics */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                marginBottom: '14px',
              }}>
                <div style={{ background: '#141926', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Total Trades</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#F5A623' }}>
                    {user.total_trades || user.trade_count || myTrades.length}
                  </div>
                </div>
                <div style={{ background: '#141926', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Completed Orders</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#10B981' }}>
                    {myTrades.filter(t => t.status === 'completed').length}
                  </div>
                </div>
              </div>

              {/* Filter Chips */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', overflowX: 'auto', paddingBottom: '4px' }}>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'trades', label: 'Trades' },
                  { id: 'deposits', label: 'Deposits' },
                  { id: 'withdrawals', label: 'Withdrawals' },
                ].map(chip => (
                  <button
                    key={chip.id}
                    onClick={() => { triggerHaptic(); setHistoryFilter(chip.id); }}
                    style={{
                      background: historyFilter === chip.id ? '#F5A623' : 'rgba(255,255,255,0.06)',
                      color: historyFilter === chip.id ? '#0B0E1A' : '#9CA3AF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 14px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Transaction List */}
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#9CA3AF', fontSize: '12px' }}>
                  Loading transaction ledger...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Render both trades and ledger transactions */}
                  {(() => {
                    const items = [];

                    // 1. Trades
                    if (historyFilter === 'all' || historyFilter === 'trades') {
                      myTrades.forEach(t => {
                        items.push({
                          id: t.id,
                          type: t.buyer_id === user.id ? 'P2P Buy' : 'P2P Sell',
                          isCredit: t.buyer_id === user.id,
                          amountUsd: Number(t.amount_usd || 0),
                          amountEtb: Number(t.amount_etb || 0),
                          status: t.status,
                          date: new Date(t.created_at || Date.now()),
                          details: `Rate: ${t.rate} ETB/$ (${t.payment_method || 'Telebirr'})`,
                        });
                      });
                    }

                    // 2. Ledger transactions (deposits / withdrawals)
                    userTransactions.forEach(tx => {
                      const isDep = tx.type === 'deposit';
                      const isWith = tx.type === 'withdrawal';
                      if (historyFilter === 'all' || (historyFilter === 'deposits' && isDep) || (historyFilter === 'withdrawals' && isWith)) {
                        items.push({
                          id: tx.id,
                          type: isDep ? 'On-Chain Deposit' : 'Crypto Withdrawal',
                          isCredit: isDep,
                          amountUsd: Number(tx.amount_usd || 0),
                          amountEtb: 0,
                          status: tx.status || 'completed',
                          date: new Date(tx.created_at || Date.now()),
                          details: tx.tx_hash ? `Tx: ${tx.tx_hash.slice(0, 10)}...` : tx.note || tx.method,
                        });
                      }
                    });

                    // Sort newest first
                    items.sort((a, b) => b.date - a.date);

                    if (items.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '32px 16px', background: '#141926', borderRadius: '14px' }}>
                          <div style={{ fontSize: '24px', marginBottom: '6px' }}>📜</div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#9CA3AF' }}>No records found in this category.</div>
                        </div>
                      );
                    }

                    return items.map((item, idx) => {
                      const isSuccess = item.status === 'completed' || item.status === 'approved';
                      const isPending = item.status === 'pending' || item.status === 'payment_pending' || item.status === 'paid';

                      return (
                        <div
                          key={item.id || idx}
                          style={{
                            background: '#141926',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '12px',
                            padding: '12px 14px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{item.isCredit ? '📥' : '📤'}</span>
                              <span>{item.type}</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                              {item.date.toLocaleDateString()} {item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {item.details}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{
                              fontSize: '14px',
                              fontWeight: 800,
                              color: item.isCredit ? '#10B981' : '#EF4444',
                            }}>
                              {item.isCredit ? '+' : '-'}${item.amountUsd.toFixed(2)}
                            </div>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              color: isSuccess ? '#10B981' : isPending ? '#F5A623' : '#9CA3AF',
                              textTransform: 'uppercase',
                            }}>
                              {item.status}
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          )}
        </main>
      )}

      {/* ── BOTTOM NAVIGATION (5 TABS INCLUDING HISTORY) ── */}
      {activeTab !== 'welcome' && (
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
          gridTemplateColumns: 'repeat(5, 1fr)',
          padding: '8px 0 12px',
        }}>
          {[
            { id: 'buy', icon: '🛒', label: 'Buy $' },
            { id: 'sell', icon: '💵', label: 'Sell $' },
            { id: 'wallet', icon: '💼', label: 'Wallet' },
            { id: 'orders', icon: '📋', label: 'Orders' },
            { id: 'history', icon: '📜', label: 'History' },
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
                <span style={{ fontSize: '18px' }}>{tab.icon}</span>
                <span style={{ fontSize: '10px', fontWeight: isActive ? 800 : 500 }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      )}

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

            <div style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '10px',
              padding: '12px',
              marginBottom: '16px',
              fontSize: '13px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#9CA3AF' }}>Exchange Rate:</span>
                <span style={{ fontWeight: 700 }}>1 USD = {selectedListing.custom_rate_etb || buyRate} ETB</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10B981', fontWeight: 800, fontSize: '15px' }}>
                <span>You will pay:</span>
                <span>{(buyAmountUsd * (selectedListing.custom_rate_etb || buyRate)).toLocaleString()} ETB</span>
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
