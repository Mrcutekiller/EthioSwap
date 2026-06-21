import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase';
import EmptyState from './EmptyState.jsx';
import MarketRates from './MarketRates.jsx';
import Logo from './Logo.jsx';

// ─── All Ethiopian payment methods ───────────────────────────
const ALL_PAYMENT_METHODS = [
  { id: 'CBE',              label: 'CBE',              icon: '🏦' },
  { id: 'Telebirr',        label: 'Telebirr',        icon: '📱' },
  { id: 'Dashen Bank',     label: 'Dashen Bank',     icon: '🏦' },
  { id: 'Bank of Abyssinia', label: 'Abyssinia Bank', icon: '🏦' },
  { id: 'Awash Bank',      label: 'Awash Bank',      icon: '🏦' },
  { id: 'Wegagen Bank',    label: 'Wegagen Bank',    icon: '🏦' },
  { id: 'Nib Bank',        label: 'Nib Bank',        icon: '🏦' },
  { id: 'Amhara Bank',     label: 'Amhara Bank',     icon: '🏦' },
  { id: 'HelloCash',       label: 'HelloCash',       icon: '💚' },
  { id: 'M-Pesa',          label: 'M-Pesa ET',       icon: '📲' },
];

// ─── Reputation ring color ────────────────────────────────────
const repColor = (rep) => rep >= 95 ? '#10B981' : rep >= 80 ? '#E8B84B' : '#EF4444';

const formatTimeAgo = (iso) => {
  if (!iso) return 'Just now';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const P2PListings = () => {
  const { user, listings, wallet, createListing, initiateTrade, systemSettings, cancelListing, updateListing } = useAuth();
  const minP2pListing = 0.01;

  const [viewingTraderId, setViewingTraderId] = useState(null);
  const [p2pTab, setP2pTabState] = useState(() => {
    return localStorage.getItem(`ethioswap_active_p2p_tab_${user?.id}`) || 'buy';
  });

  const setP2pTab = (val) => {
    setP2pTabState(val);
    localStorage.setItem(`ethioswap_active_p2p_tab_${user?.id}`, val);
  };

  const [filterPayment, setFilterPayment] = useState('All');
  const [filterAmountRange, setFilterAmountRange] = useState('All');
  const [filterMinRate, setFilterMinRate] = useState('');
  const [filterMaxRate, setFilterMaxRate] = useState('');
  const [buyModalStep, setBuyModalStep] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBuyModal, setShowBuyModal]    = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [tradeamount_eth, setTradeamount_eth]   = useState('');
  const [tradeError, setTradeError]           = useState('');
  const [chosenPaymentAccount, setChosenPaymentAccount] = useState(null);
  const [kycDismissed, setKycDismissed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('rate_asc');
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [onlyKyc, setOnlyKyc] = useState(false);
  const [onlyMyAds, setOnlyMyAds] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [editingListingId, setEditingListingId] = useState(null);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Sync selected listing's first payment account as default (only for Sell Listings where maker is seller)
  React.useEffect(() => {
    if (selectedListing) {
      setBuyModalStep(1);
      if (selectedListing.type === 'buy') {
        // Taker is seller, so default to taker's own first saved payment account
        if (user.payment_accounts && user.payment_accounts.length > 0) {
          setChosenPaymentAccount(user.payment_accounts[0]);
        } else {
          setChosenPaymentAccount(null);
        }
      } else {
        // Maker is seller, default to listing's payment account
        if (selectedListing.payment_accounts && selectedListing.payment_accounts.length > 0) {
          setChosenPaymentAccount(selectedListing.payment_accounts[0]);
        } else {
          setChosenPaymentAccount(null);
        }
      }
    } else {
      setChosenPaymentAccount(null);
    }
  }, [selectedListing, user]);

  React.useEffect(() => {
    if (!showCreateModal) {
      setEditingListingId(null);
      setamount_eth('');
      setMinLimit('');
      setMaxLimit('');
      setLinkedAccounts([]);
      setUseCustomRate(false);
      setCustomRate('');
      setDescription('');
      setPaymentWindow('15');
      setAllowThirdParty(false);
      setUploadedImages([]);
    } else if (editingListingId) {
      const listingToEdit = listings.find(l => l.id === editingListingId);
      if (listingToEdit) {
        setamount_eth((listingToEdit.amount_eth ?? '').toString());
        setMinLimit((listingToEdit.min_limit_etb ?? '').toString());
        setMaxLimit((listingToEdit.max_limit_etb ?? '').toString());
        setUseCustomRate(!!listingToEdit.custom_rate_etb);
        setCustomRate(listingToEdit.custom_rate_etb ? listingToEdit.custom_rate_etb.toString() : '');
        setDescription(listingToEdit.description || '');
        setPaymentWindow((listingToEdit.payment_window ?? 15).toString());
        setAllowThirdParty(!!listingToEdit.allow_third_party);
        setUploadedImages(listingToEdit.images || []);
      }
    }
  }, [showCreateModal, editingListingId, listings]);

  React.useEffect(() => {
    setActiveImageIdx(0);
  }, [selectedListing]);

  // Create form state
  const [createType,      setCreateType]      = useState('sell'); // 'sell' | 'buy'
  const [amount_eth,       setamount_eth]       = useState('');
  const [minLimit,        setMinLimit]         = useState('');
  const [maxLimit,        setMaxLimit]         = useState('');
  const [linkedAccounts,  setLinkedAccounts]  = useState([]);
  const [useCustomRate,   setUseCustomRate]   = useState(false);
  const [customRate,      setCustomRate]      = useState('');
  const [description,     setDescription]     = useState('');
  const [paymentWindow,   setPaymentWindow]   = useState('15');
  const [allowThirdParty, setAllowThirdParty] = useState(false);
  const [calcAmount,      setCalcAmount]      = useState('');
  const [calcUnit,        setCalcUnit]        = useState('ETB');

  const toggleLinkedAccount = (acc) => {
    setLinkedAccounts(prev =>
      prev.some(la => la.id === acc.id)
        ? prev.filter(la => la.id !== acc.id)
        : [...prev, acc]
    );
  };

  const rate = systemSettings?.etbRatePerDollar ?? 190;

  // ── KYC gate ─────────────────────────────────────────────
  const kycApproved = user?.kyc_status === 'approved' || user?.username === 'biruk';

  // ── Image upload helper (converts to base64 data URLs) ──────
  const handleImageFileSelect = async (files) => {
    const fileArray = Array.from(files).slice(0, 3 - uploadedImages.length);
    if (fileArray.length === 0) return;
    setIsUploadingImage(true);
    try {
      const newImages = await Promise.all(fileArray.map(file => new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) { reject(new Error('Only images are allowed')); return; }
        if (file.size > 5 * 1024 * 1024) { reject(new Error('Max 5MB per image')); return; }
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      })));
      setUploadedImages(prev => [...prev, ...newImages].slice(0, 3));
    } catch (err) {
      alert(err.message);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const [imageDragOver, setImageDragOver] = React.useState(false);

  // ── Create listing ────────────────────────────────────────
  const handleCreateListing = async (e) => {
    e.preventDefault();
    if (!kycApproved) {
      alert('Please verify your identity first. Go to Profile to start KYC verification.');
      return;
    }
    if (createType === 'sell' && linkedAccounts.length === 0 && user?.username !== 'biruk') {
      alert('Please link at least one of your saved payment accounts.');
      return;
    }
    if (!amount_eth || !minLimit || !maxLimit) {
      alert('Please fill in all fields.');
      return;
    }
    if (parseFloat(amount_eth) < minP2pListing) {
      alert(`Minimum ad amount is $${minP2pListing.toFixed(2)} USD.`);
      return;
    }
    const currentStandardRate = createType === 'buy' ? (systemSettings?.etbRatePerDollarSell ?? rate) : (systemSettings?.etbRatePerDollar ?? rate);
    const effectiveRate = useCustomRate && customRate ? parseFloat(customRate) : currentStandardRate;
    const minUSD = parseFloat(minLimit) / effectiveRate;
    if (minUSD < (minP2pListing - 0.01)) {
      alert(`Minimum transaction limit must be at least $${minP2pListing.toFixed(2)} USD equivalent (≈ ${Math.round(minP2pListing * effectiveRate)} ETB).`);
      return;
    }

    let selectedPayments = createType === 'sell' 
      ? linkedAccounts.map(a => a.bankName) 
      : ['CBE', 'Telebirr', 'Dashen Bank', 'Awash Bank', 'Bank of Abyssinia'];
    
    // If admin (biruk) is creating a sell listing without linked accounts, use default payment methods
    if (createType === 'sell' && user?.username === 'biruk' && linkedAccounts.length === 0) {
      selectedPayments = ['CBE', 'Telebirr', 'Dashen Bank', 'Awash Bank', 'Bank of Abyssinia'];
    }
      
    if (editingListingId) {
      await updateListing(
        editingListingId,
        parseFloat(amount_eth), 
        parseFloat(minLimit), 
        parseFloat(maxLimit), 
        useCustomRate && customRate ? parseFloat(customRate) : undefined, 
        description,
        parseInt(paymentWindow),
        allowThirdParty,
        uploadedImages
      );
      setEditingListingId(null);
    } else {
      await createListing(
        parseFloat(amount_eth), 
        parseFloat(minLimit), 
        parseFloat(maxLimit), 
        selectedPayments, 
        useCustomRate && customRate ? parseFloat(customRate) : undefined, 
        createType === 'sell' ? linkedAccounts : [], 
        createType,
        description,
        parseInt(paymentWindow),
        allowThirdParty,
        uploadedImages
      );
    }
    
    setamount_eth(''); setMinLimit(''); setMaxLimit('');
    setLinkedAccounts([]); setUseCustomRate(false); setCustomRate('');
    setDescription(''); setPaymentWindow('15'); setAllowThirdParty(false);
    setUploadedImages([]);
    setShowCreateModal(false);
  };

  // ── Open trade ────────────────────────────────────────────
  const handleNextConfirm = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!kycApproved) {
      alert('Please verify your identity first. Go to Profile to start KYC verification.');
      return;
    }
    setTradeError('');
    const amt = parseFloat(tradeamount_eth);
    if (isNaN(amt) || amt < minP2pListing) { setTradeError(`Minimum transaction amount is $${minP2pListing.toFixed(2)} USD.`); return; }
    if (amt > selectedListing.amount_eth) {
      setTradeError(`Maximum available is $${(selectedListing.amount_eth ?? 0).toFixed(2)} USD.`);
      return;
    }
    const standardRate = selectedListing.type === 'buy'
      ? (systemSettings?.etbRatePerDollarSell ?? rate)
      : (systemSettings?.etbRatePerDollar ?? rate);
    const effectiveRate = selectedListing.custom_rate_etb || standardRate;
    const totalEtb = amt * effectiveRate;
    if (totalEtb < selectedListing.min_limit_etb || totalEtb > selectedListing.max_limit_etb) {
      setTradeError(`Total (${Math.round(totalEtb).toLocaleString()} ETB) must be between ${selectedListing.min_limit_etb.toLocaleString()} – ${selectedListing.max_limit_etb.toLocaleString()} ETB.`);
      return;
    }
    
    if (selectedListing.type === 'buy') {
      if (!chosenPaymentAccount) {
        setTradeError('Please select one of your saved bank/wallet accounts to receive the ETB.');
        return;
      }
    } else {
      if (!chosenPaymentAccount && selectedListing.payment_accounts && selectedListing.payment_accounts.length > 0) {
        setTradeError('Please select a bank/wallet of the seller to pay to.');
        return;
      }
    }
    setBuyModalStep(2);
  };

  const handleOpenTrade = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const amt = parseFloat(tradeamount_eth);
    const trade = await initiateTrade(selectedListing.id, amt, chosenPaymentAccount);
    setSelectedListing(null); 
    setTradeamount_eth(''); 
    setShowBuyModal(false);
    setBuyModalStep(1);
    
    // Auto redirect to Active Trades tab
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('ethioswap_navigate', { detail: 'trades' }));
    }, 150);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (buyModalStep === 1) {
      handleNextConfirm(e);
    } else {
      handleOpenTrade(e);
    }
  };

  // ── Filter and Sort listings ──────────────────────────────
  const filtered = listings
    .filter(l => {
      const isOwnListing = l.seller_id === user?.id;
      const matchesMyAds = !onlyMyAds || isOwnListing;
      const matchesType = onlyMyAds || (p2pTab === 'buy' ? (l.type === 'sell' || !l.type) : (l.type === 'buy'));
      const matchesPayment = filterPayment === 'All' || l.payment_methods.includes(filterPayment);
      
      // Filter out non-active listings unless viewing own ads (excluding cancelled ones)
      const matchesStatus = l.status === 'active' || (onlyMyAds && isOwnListing && l.status !== 'cancelled');
      if (!matchesStatus) return false;
      
      let matchesAmount = true;
      if (filterAmountRange === 'under50') {
        matchesAmount = l.amount_eth < 50;
      } else if (filterAmountRange === '50to200') {
        matchesAmount = l.amount_eth >= 50 && l.amount_eth <= 200;
      } else if (filterAmountRange === 'over200') {
        matchesAmount = l.amount_eth > 200;
      }

      // Search matches username or payment method
      const term = searchQuery.toLowerCase().trim();
      const matchesSearch = !term || 
        (l.seller_name || '').toLowerCase().includes(term) ||
        (l.payment_methods || []).some(p => p.toLowerCase().includes(term));

      const matchesVerified = !onlyVerified || l.isSellerVerifiedTrader;
      const matchesKyc = !onlyKyc || l.seller_kyc_status === 'verified' || l.seller_kyc_status === 'approved';

      // Quick amount filter calculator logic
      let matchesCalc = true;
      if (calcAmount && !isNaN(parseFloat(calcAmount))) {
        const amtVal = parseFloat(calcAmount);
        if (calcUnit === 'ETB') {
          matchesCalc = l.min_limit_etb <= amtVal && l.max_limit_etb >= amtVal;
        } else {
          const standardRate = l.type === 'buy'
            ? (systemSettings?.etbRatePerDollarSell ?? rate)
            : (systemSettings?.etbRatePerDollar ?? rate);
          const effRate = l.custom_rate_etb || standardRate;
          const etbEquiv = amtVal * effRate;
          matchesCalc = l.min_limit_etb <= etbEquiv && l.max_limit_etb >= etbEquiv && l.amount_eth >= amtVal;
        }
      }

      // Rate range filter logic
      let matchesRate = true;
      const standardRate = l.type === 'buy'
        ? (systemSettings?.etbRatePerDollarSell ?? rate)
        : (systemSettings?.etbRatePerDollar ?? rate);
      const rateVal = l.custom_rate_etb || standardRate;
      if (filterMinRate && !isNaN(parseFloat(filterMinRate))) {
        matchesRate = matchesRate && rateVal >= parseFloat(filterMinRate);
      }
      if (filterMaxRate && !isNaN(parseFloat(filterMaxRate))) {
        matchesRate = matchesRate && rateVal <= parseFloat(filterMaxRate);
      }

      return matchesType && matchesPayment && matchesAmount && matchesSearch && matchesVerified && matchesKyc && matchesCalc && matchesRate && matchesMyAds;
    })
    .sort((a, b) => {
      const standardRateA = a.type === 'buy' ? (systemSettings?.etbRatePerDollarSell ?? rate) : (systemSettings?.etbRatePerDollar ?? rate);
      const standardRateB = b.type === 'buy' ? (systemSettings?.etbRatePerDollarSell ?? rate) : (systemSettings?.etbRatePerDollar ?? rate);
      const rateA = a.custom_rate_etb || standardRateA;
      const rateB = b.custom_rate_etb || standardRateB;
      
      if (sortBy === 'rate_asc') {
        return rateA - rateB;
      } else if (sortBy === 'rate_desc') {
        return rateB - rateA;
      } else if (sortBy === 'reputation') {
        return (b.sellerReputation ?? 0) - (a.sellerReputation ?? 0);
      } else if (sortBy === 'trades_desc') {
        return (b.sellerTotalTrades ?? 0) - (a.sellerTotalTrades ?? 0);
      }
      return 0;
    });

  // ── Shared styles ─────────────────────────────────────────
  const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(6px)', zIndex: 200,
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    animation: 'fadeIn 0.2s ease-out',
  };
  const sheetStyle = {
    background: 'var(--bg-surface)', borderRadius: '24px 24px 0 0',
    border: '1px solid var(--border)', borderBottom: 'none',
    width: '100%', maxWidth: '480px', maxHeight: '92dvh',
    overflowY: 'auto', padding: '24px 20px 32px',
    animation: 'slideUp 0.32s cubic-bezier(0.32, 0.94, 0.6, 1)',
  };
  const handleStyle = {
    width: '36px', height: '4px', background: 'var(--border-hover)',
    borderRadius: '99px', margin: '0 auto 20px',
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getPaymentMethodStyles = (methodId) => {
    switch (methodId) {
      case 'CBE':
        return { bg: 'rgba(122, 40, 155, 0.08)', border: 'rgba(122, 40, 155, 0.25)', text: '#d39eff' }; // CBE purple
      case 'Telebirr':
        return { bg: 'rgba(0, 122, 255, 0.08)', border: 'rgba(0, 122, 255, 0.25)', text: '#64b5f6' }; // Telebirr blue
      case 'Dashen Bank':
        return { bg: 'rgba(255, 145, 0, 0.08)', border: 'rgba(255, 145, 0, 0.25)', text: '#ffb74d' }; // Dashen orange
      case 'Bank of Abyssinia':
        return { bg: 'rgba(245, 166, 35, 0.08)', border: 'rgba(245, 166, 35, 0.25)', text: '#F5A623' }; // Abyssinia gold
      case 'Awash Bank':
        return { bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.25)', text: '#ff7676' }; // Awash red
      case 'Wegagen Bank':
        return { bg: 'rgba(34, 197, 94, 0.08)', border: 'rgba(34, 197, 94, 0.25)', text: '#4ade80' }; // Wegagen green
      default:
        return { bg: 'rgba(255, 255, 255, 0.03)', border: 'rgba(255, 255, 255, 0.06)', text: '#c8c8c8' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: 'var(--font)' }}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .premium-dashboard-card {
          position: relative;
          background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.25);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .premium-dashboard-card:hover {
          border-color: rgba(245, 166, 35, 0.15);
          transform: translateY(-2px);
          box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.45);
        }

        .gold-glow-btn {
          position: relative;
          overflow: hidden;
          background: #F5A623;
          box-shadow: 0 4px 14px rgba(245, 166, 35, 0.15);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .gold-glow-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(245, 166, 35, 0.3);
        }
        .gold-glow-btn::after {
          content: '';
          position: absolute;
          top: 0; left: -100%; width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          animation: shine-animation 3s infinite;
        }

        .teal-glow-btn {
          position: relative;
          overflow: hidden;
          background: #00C896;
          box-shadow: 0 4px 14px rgba(0, 200, 150, 0.15);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .teal-glow-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(0, 200, 150, 0.3);
        }
        .teal-glow-btn::after {
          content: '';
          position: absolute;
          top: 0; left: -100%; width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          animation: shine-animation 3s infinite;
        }
        
        @keyframes shine-animation {
          0% { left: -100%; }
          50% { left: 100%; }
          100% { left: 100%; }
        }

        .premium-p2p-card {
          position: relative;
          background: linear-gradient(135deg, rgba(22, 28, 41, 0.65) 0%, rgba(10, 12, 18, 0.8) 100%);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.25);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .premium-p2p-card:hover {
          transform: translateY(-4px) scale(1.005);
          border-color: rgba(245, 166, 35, 0.4);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), 0 0 24px rgba(245, 166, 35, 0.04);
        }
        .premium-p2p-card.buying:hover {
          border-color: rgba(0, 200, 150, 0.4);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), 0 0 24px rgba(0, 200, 150, 0.04);
        }

        .premium-p2p-badge-buy {
          background: linear-gradient(135deg, rgba(0, 200, 150, 0.15), rgba(0, 200, 150, 0.05));
          border: 1px solid rgba(0, 200, 150, 0.3);
          color: #00FFC2;
          font-size: 10px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 8px;
          text-shadow: 0 0 8px rgba(0, 200, 150, 0.2);
          letter-spacing: 0.05em;
        }
        
        .premium-p2p-badge-sell {
          background: linear-gradient(135deg, rgba(245, 166, 35, 0.15), rgba(245, 166, 35, 0.05));
          border: 1px solid rgba(245, 166, 35, 0.3);
          color: #FFB800;
          font-size: 10px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 8px;
          text-shadow: 0 0 8px rgba(245, 166, 35, 0.2);
          letter-spacing: 0.05em;
        }
        
        .premium-card-stat-block {
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.04);
          padding: 14px 18px;
          border-radius: 14px;
          transition: all 0.3s ease;
        }
        .premium-p2p-card:hover .premium-card-stat-block {
          background: rgba(0, 0, 0, 0.35);
          border-color: rgba(255, 255, 255, 0.08);
        }

        .custom-scrollbar::-webkit-scrollbar {
          height: 0px;
          width: 0px;
        }

        .p2p-listings-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 768px) {
          .p2p-listings-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 1200px) {
          .p2p-listings-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .search-sort-panel {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
        }
        @media (min-width: 576px) {
          .search-sort-panel {
            flex-direction: row;
            align-items: center;
          }
        }
      `}</style>

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Logo size={36} />
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 600, color: '#ffffff', margin: 0, fontFamily: 'var(--font-heading)' }}>P2P Marketplace</h2>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Safe Peer-to-Peer Trading Terminal</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowCalculator(!showCalculator)}
              className="btn btn-ghost"
              style={{ padding: '10px 14px', fontSize: '13px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, border: '1px solid var(--border)' }}
            >
              <span>🧮 {showCalculator ? 'Hide Calc' : 'Calculator'}</span>
            </button>
          )}

          {kycApproved ? (
            <button 
              onClick={() => { setCreateType(p2pTab === 'buy' ? 'sell' : 'buy'); setShowCreateModal(true); }} 
              className="btn btn-gold" 
              style={{ padding: '10px 20px', fontSize: '13px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
            >
              <span>+ Post Ad</span>
            </button>
          ) : (
            <button 
              onClick={() => {
                window.dispatchEvent(new CustomEvent('ethioswap_navigate', { detail: 'profile' }));
                setTimeout(() => {
                  window.history.pushState({}, '', '/profile?openKyc=true');
                  window.dispatchEvent(new Event('popstate'));
                }, 100);
              }}
              style={{
                background: 'transparent',
                border: '1.5px solid #F5A623',
                borderRadius: '20px',
                height: '38px',
                padding: '0 16px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#F5A623',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              🛡️ Verify ID to trade
            </button>
          )}
        </div>
      </div>

      {showCalculator && (
        <div className="premium-dashboard-card fade-in-1" style={{ padding: '20px', borderRadius: '16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <MarketRates 
            isLoggedIn={true} 
            onSelectOffer={(type, offerId) => {
              setP2pTab(type);
              setTimeout(() => {
                const el = document.getElementById(`listing-${offerId}`);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  el.style.outline = '2px solid var(--gold)';
                  setTimeout(() => el.style.outline = 'none', 3000);
                } else {
                  alert(`Selected offer is of type ${type.toUpperCase()}. Use filters below to find it.`);
                }
              }, 100);
            }} 
          />
        </div>
      )}

      {/* ── Welcome & Balance Widget ── */}
      <div className="premium-dashboard-card" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        background: 'linear-gradient(135deg, rgba(245, 166, 35, 0.05) 0%, rgba(6, 15, 28, 0.95) 100%)',
        padding: '18px 22px', 
        borderRadius: '16px', 
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)'
      }}>
        <div>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.05em' }}>
            {getGreeting()},
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <h4 style={{ margin: 0, fontSize: '16px', color: '#fff', fontWeight: 800 }}>@{user?.username}</h4>
            {kycApproved && (
              <span style={{ 
                background: 'rgba(0,200,150,0.15)', 
                color: '#00C896', 
                fontSize: '9px', 
                fontWeight: 600, 
                padding: '1px 5px', 
                borderRadius: '99px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px'
              }}>
                ✓ Verified
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.05em' }}>Wallet Balance</span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: '3px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <strong style={{ color: 'var(--gold)', fontSize: '18px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 800 }}>
                ${(wallet?.eth_available ?? 0).toFixed(2)}
              </strong>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>USD</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
              {wallet?.eth_locked > 0 && (
                <span style={{ fontSize: '9px', color: '#EF4444', background: 'rgba(239, 68, 68, 0.1)', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                  🔒 ${(wallet.eth_locked).toFixed(2)} locked
                </span>
              )}
              <span style={{ fontSize: '11px', color: '#e0e0e0', fontWeight: 600 }}>
                ≈ {Math.round((wallet?.eth_available ?? 0) * rate).toLocaleString()} ETB
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Platform Analytics Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        <div className="premium-dashboard-card" style={{ background: '#141827', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>Best Buy Rate</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#00C896', marginTop: '4px', fontFamily: 'JetBrains Mono, monospace' }}>
            {rate} <span style={{ fontSize: '11px', fontWeight: 500 }}>ETB</span>
          </div>
        </div>
        <div className="premium-dashboard-card" style={{ background: '#141827', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>Best Sell Rate</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--gold)', marginTop: '4px', fontFamily: 'JetBrains Mono, monospace' }}>
            {systemSettings?.etbRatePerDollarSell ?? rate} <span style={{ fontSize: '11px', fontWeight: 500 }}>ETB</span>
          </div>
        </div>
        <div className="premium-dashboard-card" style={{ background: '#141827', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>Platform Fee</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#00C896', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            0% <span className="notif-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00C896' }} />
          </div>
        </div>
      </div>

      {/* ── Buy/Sell Segmented Toggle ── */}
      <div style={{ 
        display: 'flex', 
        background: '#141827', 
        border: '1px solid rgba(255,255,255,0.06)', 
        borderRadius: '12px', 
        padding: '4px', 
        height: '54px', 
        gap: '6px' 
      }}>
        <button
          onClick={() => setP2pTab('buy')}
          style={{
            flex: 1, 
            borderRadius: '8px', 
            border: 'none', 
            cursor: 'pointer',
            fontFamily: 'var(--font)', 
            fontWeight: 600, 
            fontSize: '14px',
            background: p2pTab === 'buy' ? '#00C896' : 'transparent',
            color: p2pTab === 'buy' ? '#04342C' : '#8A9BB8',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: p2pTab === 'buy' ? '0 4px 15px rgba(0,200,150,0.3)' : 'none'
          }}
        >
          Buy USDT from locals
        </button>
        <button
          onClick={() => setP2pTab('sell')}
          style={{
            flex: 1, 
            borderRadius: '8px', 
            border: 'none', 
            cursor: 'pointer',
            fontFamily: 'var(--font)', 
            fontWeight: 600, 
            fontSize: '14px',
            background: p2pTab === 'sell' ? '#F5A623' : 'transparent',
            color: p2pTab === 'sell' ? '#04342C' : '#8A9BB8',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: p2pTab === 'sell' ? '0 4px 15px rgba(245,166,35,0.3)' : 'none'
          }}
        >
          Sell USDT to locals
        </button>
        <button
          onClick={() => {
            if (!kycApproved) {
              alert('Please verify your identity first. Go to Profile to start KYC verification.');
              return;
            }
            setCreateType(p2pTab === 'buy' ? 'sell' : 'buy');
            setShowCreateModal(true);
          }}
          className="gold-glow-btn"
          style={{
            width: '46px', 
            borderRadius: '8px', 
            border: 'none', 
            cursor: 'pointer',
            fontWeight: 800, 
            fontSize: '20px',
            color: '#0A0C12',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          title="Post a Listing"
        >
          +
        </button>
      </div>

      {/* ── Quick-Filter Calculator Input ── */}
      <div className="premium-dashboard-card fade-in-1" style={{ 
        padding: '16px', 
        borderRadius: '14px', 
        background: 'rgba(255, 255, 255, 0.01)', 
        border: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          🧮 Quick Amount Filter Calculator
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--muted)', fontSize: '14px' }}>
              {calcUnit === 'ETB' ? 'Br' : '$'}
            </span>
            <input
              type="number"
              placeholder={calcUnit === 'ETB' ? "Enter ETB amount to spend/receive..." : "Enter USD amount to buy/sell..."}
              value={calcAmount}
              onChange={e => setCalcAmount(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 12px 11px 40px',
                background: '#141827',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '13px',
                outline: 'none',
                fontFamily: 'var(--font)',
                transition: 'all 0.2s ease',
              }}
            />
            {calcAmount && (
              <button 
                onClick={() => setCalcAmount('')}
                style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer' }}
              >
                ✕
              </button>
            )}
          </div>
          <select
            value={calcUnit}
            onChange={e => setCalcUnit(e.target.value)}
            style={{
              padding: '11px 28px 11px 12px',
              background: '#141827',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '13px',
              outline: 'none',
              fontFamily: 'var(--font)',
              cursor: 'pointer',
              backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23a0aec0\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
              backgroundSize: '12px',
              WebkitAppearance: 'none',
              appearance: 'none',
              minWidth: '90px'
            }}
          >
            <option value="ETB">ETB</option>
            <option value="USD">USD</option>
          </select>
        </div>
        {calcAmount && !isNaN(parseFloat(calcAmount)) && (
          <div style={{ fontSize: '11.5px', color: '#00C896', display: 'flex', alignItems: 'center', gap: '4px', padding: '0 2px' }}>
            <span>⚡ Filtering listings that accept exactly </span>
            <strong>{parseFloat(calcAmount).toLocaleString()} {calcUnit}</strong>
          </div>
        )}
      </div>

      {/* ── Search & Sorting Control Panel ── */}
      <div className="search-sort-panel">
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-secondary)', fontSize: '13px' }}>🔍</span>
          <input
            type="text"
            placeholder="Search by username or payment method..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '11px 12px 11px 36px',
              background: '#141827',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '13px',
              outline: 'none',
              fontFamily: 'var(--font)',
              transition: 'all 0.2s ease',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'rgba(245, 166, 35, 0.3)';
              e.currentTarget.style.boxShadow = '0 0 15px rgba(245, 166, 35, 0.05)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: '10px', top: '11px', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer' }}
            >
              ✕
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="number"
            placeholder="Min Rate"
            value={filterMinRate}
            onChange={e => setFilterMinRate(e.target.value)}
            style={{
              width: '85px',
              padding: '11px 10px',
              background: '#141827',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '13px',
              outline: 'none',
              fontFamily: 'var(--font)',
            }}
          />
          <span style={{ color: 'var(--muted)', fontSize: '12px' }}>-</span>
          <input
            type="number"
            placeholder="Max Rate"
            value={filterMaxRate}
            onChange={e => setFilterMaxRate(e.target.value)}
            style={{
              width: '85px',
              padding: '11px 10px',
              background: '#141827',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '13px',
              outline: 'none',
              fontFamily: 'var(--font)',
            }}
          />
        </div>

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{
            padding: '11px 28px 11px 12px',
            background: '#141827',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '10px',
            color: '#fff',
            fontSize: '13px',
            outline: 'none',
            fontFamily: 'var(--font)',
            cursor: 'pointer',
            backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23a0aec0\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 10px center',
            backgroundSize: '12px',
            WebkitAppearance: 'none',
            appearance: 'none',
            minWidth: '135px',
            transition: 'all 0.2s ease',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = 'rgba(245, 166, 35, 0.3)';
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
          }}
        >
          <option value="rate_asc">📈 Best Rate</option>
          <option value="rate_desc">📉 Worst Rate</option>
          <option value="reputation">⭐ Reputation</option>
          <option value="trades_desc">🔄 Total Trades</option>
        </select>
      </div>

      {/* ── Quick Filter Badges ── */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '-4px', marginBottom: '4px' }}>
        <button
          onClick={() => setOnlyVerified(!onlyVerified)}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            border: '1px solid',
            background: onlyVerified ? 'rgba(245, 166, 35, 0.12)' : 'rgba(255, 255, 255, 0.02)',
            borderColor: onlyVerified ? '#F5A623' : 'rgba(255, 255, 255, 0.08)',
            color: onlyVerified ? '#F5A623' : '#8b92a8',
            transition: 'all 0.2s',
          }}
        >
          ★ Show Only Verified Traders
        </button>
        <button
          onClick={() => setOnlyKyc(!onlyKyc)}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            border: '1px solid',
            background: onlyKyc ? 'rgba(0, 200, 150, 0.12)' : 'rgba(255, 255, 255, 0.02)',
            borderColor: onlyKyc ? '#00C896' : 'rgba(255, 255, 255, 0.08)',
            color: onlyKyc ? '#00C896' : '#8b92a8',
            transition: 'all 0.2s',
          }}
        >
          🛡️ KYC Verified Only
        </button>
        <button
          onClick={() => setOnlyMyAds(!onlyMyAds)}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            border: '1px solid',
            background: onlyMyAds ? 'rgba(0, 200, 255, 0.12)' : 'rgba(255, 255, 255, 0.02)',
            borderColor: onlyMyAds ? '#00c8ff' : 'rgba(255, 255, 255, 0.08)',
            color: onlyMyAds ? '#00c8ff' : '#8b92a8',
            transition: 'all 0.2s',
          }}
        >
          👤 My Ads Only
        </button>
      </div>

      {/* ── Filter Row 1: Payment Method ── */}
      <div style={{ position: 'relative', width: '100%' }}>
        <div className="custom-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', WebkitOverflowScrolling: 'touch' }}>
          {['All', ...ALL_PAYMENT_METHODS.map(m => m.id)].map(p => {
            const isSelected = filterPayment === p;
            const method = ALL_PAYMENT_METHODS.find(m => m.id === p);
            return (
              <button 
                key={p} 
                onClick={() => setFilterPayment(p)} 
                style={{
                  flexShrink: 0, 
                  padding: '8px 16px', 
                  borderRadius: '99px', 
                  border: '1px solid', 
                  cursor: 'pointer',
                  fontFamily: 'var(--font)', 
                  fontSize: '11.5px', 
                  fontWeight: 600, 
                  transition: 'all 0.2s ease',
                  background: isSelected ? '#F5A623' : '#141827',
                  color: isSelected ? '#04342C' : '#c8c8c8',
                  borderColor: isSelected ? '#F5A623' : 'rgba(255,255,255,0.07)',
                  boxShadow: isSelected ? '0 4px 12px rgba(245,166,35,0.15)' : 'none',
                }}
              >
                {p === 'All' ? '🌐 All Methods' : `${method?.icon} ${method?.label || p}`}
              </button>
            );
          })}
        </div>
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: '6px', width: '40px',
          background: 'linear-gradient(to right, transparent, var(--bg-base, #0a0c12))',
          pointerEvents: 'none', zIndex: 5
        }} />
      </div>

      {/* ── Filter Row 2: Amount ── */}
      <div style={{ position: 'relative', width: '100%' }}>
        <div className="custom-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', WebkitOverflowScrolling: 'touch' }}>
          {[
            { id: 'All', label: '💰 All Amounts' },
            { id: 'under50', label: 'Under $50' },
            { id: '50to200', label: '$50–$200' },
            { id: 'over200', label: '$200+' },
          ].map(b => {
            const isSelected = filterAmountRange === b.id;
            return (
              <button 
                key={b.id} 
                type="button" 
                onClick={() => setFilterAmountRange(b.id)} 
                style={{
                  flexShrink: 0, 
                  padding: '7px 14px', 
                  borderRadius: '99px', 
                  border: isSelected ? '1.5px solid #00C896' : '1px solid rgba(255,255,255,0.07)', 
                  cursor: 'pointer',
                  fontFamily: 'var(--font)', 
                  fontSize: '11.5px', 
                  fontWeight: 600, 
                  transition: 'all 0.2s ease',
                  background: isSelected ? 'rgba(0, 200, 150, 0.08)' : '#141827',
                  color: isSelected ? '#00C896' : '#c8c8c8',
                  boxShadow: isSelected ? '0 0 10px rgba(0, 200, 150, 0.1)' : 'none',
                }}
              >
                {b.label}
              </button>
            );
          })}
        </div>
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: '6px', width: '40px',
          background: 'linear-gradient(to right, transparent, var(--bg-base, #0a0c12))',
          pointerEvents: 'none', zIndex: 5
        }} />
      </div>

      {/* ── KYC WARNING BANNER ── */}
      {!kycApproved && !kycDismissed && (
        <div style={{
          background: '#141827', 
          borderLeft: '3px solid #F5A623',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '12px', 
          padding: '16px',
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: '12px',
          position: 'relative',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}>
          <div style={{ fontSize: '20px', marginTop: '2px' }}>⚠️</div>
          <div style={{ flex: 1, paddingRight: '20px' }}>
            <div style={{ fontWeight: 600, fontSize: '15px', color: '#F5A623' }}>
              Identity Verification Required
            </div>
            <div style={{ fontSize: '13px', color: '#c8c8c8', marginTop: '4px', lineHeight: 1.4 }}>
              Post listings and open escrow P2P trades securely. Go to <a href="#profile" style={{ color: '#F5A623', fontWeight: 600, textDecoration: 'underline' }}>Profile → Verify Identity</a> to upload documents and selfie.
            </div>
          </div>
          <button 
            onClick={() => setKycDismissed(true)}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'none',
              border: 'none',
              color: '#8A9BB8',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── P2P LISTING CARDS ── */}
      {filtered.length === 0 ? (
        <EmptyState 
          icon="📋"
          title="No Active Offers Found"
          subtitle="Be the first to post an offer in Addis Ababa!"
          ctaText="Post a Listing"
          ctaAction={() => {
            if (!kycApproved) {
              alert('Please verify your identity first. Go to Profile to start KYC verification.');
              return;
            }
            setCreateType(p2pTab === 'buy' ? 'sell' : 'buy'); setShowCreateModal(true);
          }}
        />
      ) : (
        <div className="p2p-listings-grid">
          {filtered.map((listing, index) => {
            const standardRate = listing.type === 'buy'
              ? (systemSettings?.etbRatePerDollarSell ?? rate)
              : (systemSettings?.etbRatePerDollar ?? rate);
            const effectiveRate = listing.custom_rate_etb || standardRate;
            const isOwnListing = listing.seller_id === user?.id;
            const isBuyType = listing.type === 'buy';
            return (
              <div 
                key={listing.id} 
                className={`premium-p2p-card ${isBuyType ? 'buying' : ''}`}
                style={{
                  animation: 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
                  animationDelay: `${index * 50}ms`
                }}
              >
                {/* Top Row: User Avatar and Info */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                    <div style={{
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '50%',
                      background: isBuyType ? 'rgba(0, 200, 150, 0.1)' : 'rgba(245, 166, 35, 0.1)',
                      border: `2px solid ${isBuyType ? '#00C896' : '#F5A623'}`,
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontWeight: 700, 
                      fontSize: '14px', 
                      color: isBuyType ? '#00C896' : '#F5A623',
                      boxShadow: `0 0 10px ${isBuyType ? 'rgba(0, 200, 150, 0.2)' : 'rgba(245, 166, 35, 0.2)'}`,
                      flexShrink: 0,
                      overflow: 'hidden',
                      transition: 'all 0.3s ease'
                    }}>
                      {listing.seller_profile_pic ? (
                        <img src={listing.seller_profile_pic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        (listing.seller_name || 'U').charAt(0).toUpperCase()
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span 
                          onClick={(e) => { e.stopPropagation(); setViewingTraderId(listing.seller_id); }}
                          style={{ 
                            fontWeight: 700, 
                            fontSize: '14px', 
                            color: '#fff', 
                            cursor: 'pointer', 
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            transition: 'color 0.2s ease',
                          }}
                          onMouseEnter={(e) => e.target.style.color = '#F5A623'}
                          onMouseLeave={(e) => e.target.style.color = '#fff'}
                        >
                          @{listing.seller_name}
                        </span>
                        {(listing.seller_kyc_status === 'verified' || listing.seller_kyc_status === 'approved') && (
                          <span style={{ 
                            background: 'rgba(0,200,150,0.12)', 
                            color: '#00C896', 
                            fontSize: '9px', 
                            fontWeight: 600, 
                            padding: '2px 8px', 
                            borderRadius: '99px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            whiteSpace: 'nowrap',
                            border: '1px solid rgba(0,200,150,0.2)'
                          }}>
                            ✓ Verified
                          </span>
                        )}
                        {listing.isSellerVerifiedTrader && (
                          <span style={{ 
                            background: 'rgba(245,166,35,0.12)', 
                            color: '#F5A623', 
                            fontSize: '9px', 
                            fontWeight: 600, 
                            padding: '2px 8px', 
                            borderRadius: '99px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            whiteSpace: 'nowrap',
                            border: '1px solid rgba(245,166,35,0.2)'
                          }}>
                            ★ Pro
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                        <span style={{ color: '#F5A623', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                          ⭐ {(listing.sellerAverageRating || 5.0).toFixed(1)}
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          ({listing.sellerTotalTrades || 0} trades)
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.12)' }}>|</span>
                        <span style={{ color: '#00C896', fontWeight: 600 }}>
                          👍 {listing.sellerPositivePercentage || 100}%
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.12)' }}>|</span>
                        <span style={{ color: 'var(--muted)' }}>
                          🕒 {formatTimeAgo(listing.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className={isBuyType ? "premium-p2p-badge-buy" : "premium-p2p-badge-sell"}>
                    {isBuyType ? 'BUYING USD' : 'SELLING USD'}
                  </span>
                </div>

                {/* Middle Row: Big USD volume & Rate block */}
                <div className="premium-card-stat-block" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '9px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>AD VOLUME</div>
                    <div style={{ fontSize: '24px', marginTop: '4px', color: '#fff', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, letterSpacing: '-0.02em' }}>
                      ${(listing.amount_eth ?? 0).toFixed(2)} <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 500, fontFamily: 'var(--font)' }}>USD</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '9px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>EXCHANGE RATE</div>
                    <div style={{ fontSize: '20px', marginTop: '4px', color: isBuyType ? '#00FFC2' : '#FFB800', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                      {effectiveRate.toFixed(2)} <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 500, fontFamily: 'var(--font)' }}>ETB/$</span>
                    </div>
                  </div>
                </div>

                {/* Limits Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '0 4px', alignItems: 'center' }}>
                  <span style={{ color: 'var(--muted)', fontWeight: 500 }}>Limits</span>
                  <span style={{ color: '#fff', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                    {listing.min_limit_etb.toLocaleString()} – {listing.max_limit_etb.toLocaleString()} <span style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'var(--font)' }}>ETB</span>
                  </span>
                </div>

                {/* Payment method chips */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '2px 0' }}>
                  {listing.payment_methods.map(p => {
                    const meta = ALL_PAYMENT_METHODS.find(m => m.id === p);
                    const styles = getPaymentMethodStyles(p);
                    return (
                      <span key={p} style={{
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        padding: '6px 12px', 
                        borderRadius: '10px', 
                        fontSize: '11px', 
                        fontWeight: 700,
                        background: styles.bg, 
                        border: `1px solid ${styles.border}`,
                        color: styles.text,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s ease',
                      }}>
                        <span>{meta?.icon || '🏦'}</span>
                        <span>{meta?.label || p}</span>
                      </span>
                    );
                  })}
                </div>

                {/* Listing images thumbnail strip */}
                {listing.images && listing.images.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                    {listing.images.map((img, imgIdx) => (
                      <img
                        key={imgIdx}
                        src={img}
                        alt={`Listing image ${imgIdx + 1}`}
                        style={{
                          width: '64px',
                          height: '48px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid rgba(255,255,255,0.1)',
                          cursor: 'pointer',
                          flexShrink: 0,
                          transition: 'transform 0.2s ease',
                        }}
                        onMouseEnter={e => e.target.style.transform = 'scale(1.06)'}
                        onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedListing(listing);
                          setActiveImageIdx(imgIdx);
                          setShowBuyModal(true);
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Time Window & Third Party Rules */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--muted)', padding: '4px 4px 0', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                    ⏱️ {listing.payment_window || 15} Min Window
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: listing.allow_third_party ? '#00C896' : '#EF4444', fontWeight: 600 }}>
                    {listing.allow_third_party ? '✓ Third Party OK' : '✕ No Third Party'}
                  </span>
                </div>

                {/* Bottom Row CTA Button */}
                {isOwnListing ? (
                  <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '4px' }}>
                    <button
                      onClick={() => {
                        setEditingListingId(listing.id);
                        setamount_eth(listing.amount_eth.toString());
                        setMinLimit(listing.min_limit_etb.toString());
                        setMaxLimit(listing.max_limit_etb.toString());
                        setUseCustomRate(!!listing.custom_rate_etb);
                        setCustomRate(listing.custom_rate_etb ? listing.custom_rate_etb.toString() : '');
                        setDescription(listing.description || '');
                        setPaymentWindow(listing.payment_window ? listing.payment_window.toString() : '15');
                        setAllowThirdParty(!!listing.allow_third_party);
                        setCreateType(listing.type || 'sell');
                        setShowCreateModal(true);
                      }}
                      className="btn"
                      style={{ 
                        flex: 1, 
                        height: '44px', 
                        borderRadius: '12px', 
                        fontSize: '13.5px', 
                        fontWeight: 700, 
                        background: 'rgba(245,166,35,0.06)',
                        border: '1px solid rgba(245,166,35,0.25)',
                        color: '#F5A623',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(245,166,35,0.12)';
                        e.target.style.borderColor = 'rgba(245,166,35,0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(245,166,35,0.06)';
                        e.target.style.borderColor = 'rgba(245,166,35,0.25)';
                      }}
                    >
                      ✏️ Edit Ad
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to cancel this listing?')) {
                          await cancelListing(listing.id);
                        }
                      }}
                      className="btn"
                      style={{ 
                        flex: 1, 
                        height: '44px', 
                        borderRadius: '12px', 
                        fontSize: '13.5px', 
                        fontWeight: 700, 
                        background: 'rgba(239, 68, 68, 0.06)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#EF4444',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(239, 68, 68, 0.12)';
                        e.target.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(239, 68, 68, 0.06)';
                        e.target.style.borderColor = 'rgba(239, 68, 68, 0.25)';
                      }}
                    >
                      🚫 Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (!kycApproved) {
                        alert('Please verify your identity first. Go to Profile to start KYC verification.');
                        return;
                      }
                      setSelectedListing(listing); setShowBuyModal(true); setTradeamount_eth(''); setTradeError('');
                    }}
                    disabled={!kycApproved}
                    className={isBuyType ? "teal-glow-btn" : "gold-glow-btn"}
                    style={{ 
                      width: '100%',
                      height: '46px',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '14px', 
                      fontWeight: 700,
                      cursor: kycApproved ? 'pointer' : 'not-allowed',
                      color: isBuyType ? '#023026' : '#1e1302',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      marginTop: '4px',
                    }}
                  >
                    {kycApproved ? (!isBuyType ? 'Buy USD Now ➔' : 'Sell USD Now ➔') : '🛡️ Complete KYC to Trade'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══ CREATE LISTING BOTTOM SHEET ══════════════════════ */}
      {showCreateModal && (
        <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) setShowCreateModal(false); }}>
          <div style={sheetStyle}>
            <div style={handleStyle} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 800, fontSize: '17px', margin: 0 }}>
                {editingListingId 
                  ? (createType === 'buy' ? 'Edit Buy USD Ad' : 'Edit Sell USD Ad')
                  : (createType === 'buy' ? 'Post Buy USD Ad' : 'Post Sell USD Ad')}
              </h3>
              <button onClick={() => setShowCreateModal(false)} style={{
                width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-elevated)',
                border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}>✕</button>
            </div>

            {/* Offer type selector */}
            <div style={{ 
              display: 'flex', 
              background: 'var(--bg-base)', 
              border: '1px solid var(--border)', 
              borderRadius: '12px', 
              padding: '3px', 
              gap: '2px', 
              marginBottom: '16px',
              opacity: editingListingId ? 0.6 : 1,
              pointerEvents: editingListingId ? 'none' : 'auto'
            }}>
              <button
                type="button"
                onClick={() => setCreateType('sell')}
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font)', fontWeight: 700, fontSize: '11px',
                  background: createType === 'sell' ? 'linear-gradient(135deg,rgba(200,150,44,0.15),rgba(200,150,44,0.05))' : 'transparent',
                  color: createType === 'sell' ? 'var(--gold-light)' : 'var(--text-3)',
                  transition: 'all 0.15s ease'
                }}
              >
                📈 Sell USD Ad
              </button>
              <button
                type="button"
                onClick={() => setCreateType('buy')}
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font)', fontWeight: 700, fontSize: '11px',
                  background: createType === 'buy' ? 'linear-gradient(135deg,rgba(0,212,170,0.15),rgba(0,212,170,0.05))' : 'transparent',
                  color: createType === 'buy' ? 'var(--teal-light)' : 'var(--text-3)',
                  transition: 'all 0.15s ease'
                }}
              >
                📉 Buy USD Ad
              </button>
            </div>

            {/* How it works */}
            <div style={{
              background: createType === 'buy' ? 'rgba(0,212,170,0.07)' : 'var(--gold-bg)', 
              border: `1px solid ${createType === 'buy' ? 'rgba(0,212,170,0.2)' : 'rgba(200,150,44,0.2)'}`,
              borderRadius: '10px', padding: '12px', marginBottom: '20px',
            }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: createType === 'buy' ? 'var(--teal-light)' : 'var(--gold-light)', marginBottom: '6px' }}>📖 How it works:</div>
              {createType === 'buy' ? (
                <ol style={{ fontSize: '12px', color: 'var(--text-2)', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px', margin: 0 }}>
                  <li>Enter the USD amount you want to buy & set limits</li>
                  <li>Your USD balance is <strong>NOT locked upfront</strong></li>
                  <li>Sellers will select your ad and lock their USD in escrow</li>
                  <li>Transfer ETB to their bank account and release USD</li>
                </ol>
              ) : (
                <ol style={{ fontSize: '12px', color: 'var(--text-2)', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px', margin: 0 }}>
                  <li>Enter USD amount & set min/max ETB limits</li>
                  <li>Your USD will be locked in escrow</li>
                  <li>Buyers will contact you and pay ETB</li>
                  <li>Release USD after confirming ETB received</li>
                </ol>
              )}
            </div>

            <form onSubmit={handleCreateListing} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* SECTION 1: AD VOLUME & EXCHANGE RATE */}
              <div style={{
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--gold-light)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>💰</span> 1. Ad Volume & Rate
                </div>

                {/* USD Amount */}
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Amount to {createType === 'sell' ? 'Sell' : 'Buy'} (USD)</label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type="number" step="0.01" required
                      className="input"
                      style={{ paddingRight: '64px', height: '44px', borderRadius: '10px' }}
                      placeholder={`Min: $${minP2pListing.toFixed(2)}`}
                      value={amount_eth}
                      onChange={e => setamount_eth(e.target.value)}
                    />
                    {createType === 'sell' && wallet && (
                      <button
                        type="button"
                        onClick={() => setamount_eth(((wallet.eth_balance ?? 0) - (wallet.eth_locked ?? 0)).toFixed(2))}
                        style={{
                          position: 'absolute', right: '8px', top: '8px',
                          background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.25)',
                          color: 'var(--gold-light)', borderRadius: '6px', fontSize: '10px',
                          padding: '4px 8px', fontWeight: 800, cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,166,35,0.2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(245,166,35,0.12)'}
                      >
                        MAX
                      </button>
                    )}
                  </div>
                  {amount_eth && (
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', paddingLeft: '2px' }}>
                      ≈ {Math.round(parseFloat(amount_eth) * (useCustomRate && customRate ? parseFloat(customRate) : rate)).toLocaleString()} ETB total volume
                    </div>
                  )}
                </div>

                {/* Custom rate toggle card */}
                <div style={{
                  background: 'rgba(0,0,0,0.15)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Custom ETB Rate</span>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Set your own Birr exchange rate per $1</span>
                    </div>
                    <div
                      onClick={() => setUseCustomRate(!useCustomRate)}
                      style={{
                        width: '40px', height: '22px', borderRadius: '99px', position: 'relative',
                        background: useCustomRate ? '#F5A623' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${useCustomRate ? '#F5A623' : 'rgba(255,255,255,0.15)'}`,
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      <div style={{
                        position: 'absolute', top: '2px', transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        left: useCustomRate ? '20px' : '2px',
                        width: '16px', height: '16px', borderRadius: '50%',
                        background: '#0A0C12',
                      }} />
                    </div>
                  </div>
                  
                  {useCustomRate && (
                    <div style={{ animation: 'fadeInUp 0.2s ease-out' }}>
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <input
                          type="number" step="0.01" required={useCustomRate}
                          className="input"
                          placeholder={`Standard: ${rate} ETB`}
                          value={customRate}
                          onChange={e => setCustomRate(e.target.value)}
                          style={{ height: '40px', borderRadius: '8px' }}
                        />
                      </div>
                      {customRate && parseFloat(customRate) > rate && (
                        <div style={{ fontSize: '10.5px', color: '#EF4444', marginTop: '4px', paddingLeft: '2px' }}>
                          ⚠️ Your rate is higher than standard ({rate} ETB). Users usually prefer lower rates.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 2: LIMITS & PAYOUTS */}
              <div style={{
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--gold-light)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>💳</span> 2. Transaction Limits & Payouts
                </div>

                {/* Min / Max limits */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Min limit (ETB)</label>
                    <input type="number" required className="input" style={{ height: '42px', borderRadius: '10px' }} placeholder="e.g. 500" value={minLimit} onChange={e => setMinLimit(e.target.value)} />
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Max limit (ETB)</label>
                    <input type="number" required className="input" style={{ height: '42px', borderRadius: '10px' }} placeholder="e.g. 20000" value={maxLimit} onChange={e => setMaxLimit(e.target.value)} />
                  </div>
                </div>

                {/* Personal payment accounts selector */}
                <div style={{ marginTop: '4px' }}>
                  {createType === 'buy' ? (
                    <div style={{ background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.15)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '18px', marginBottom: '2px' }}>🛡️</div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--teal-light)' }}>No Payout Account Required</div>
                      <p style={{ fontSize: '10.5px', color: 'var(--muted)', margin: '4px 0 0', lineHeight: 1.5 }}>
                        Since you are buying USD, sellers will transfer Birr directly into your payout accounts upon trade completion. You will configure this when taking sell orders.
                      </p>
                    </div>
                  ) : (
                    <>
                      <label className="input-label" style={{ marginBottom: '4px', display: 'block', fontSize: '12px', color: 'var(--text-secondary)' }}>Select Receiving Bank/Wallet</label>
                      <p style={{ fontSize: '10.5px', color: 'var(--muted)', marginBottom: '8px', lineHeight: 1.4 }}>
                        Select the saved accounts where you accept ETB local transfers:
                      </p>
                      
                      {(!user.payment_accounts || user.payment_accounts.length === 0) ? (
                        <div style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid var(--status-danger-border)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                          <div style={{ fontSize: '18px', marginBottom: '2px' }}>⚠️</div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--status-danger-text)' }}>No Saved Bank Profiles</div>
                          <p style={{ fontSize: '10.5px', color: 'var(--text-3)', margin: '4px 0 8px', lineHeight: 1.4 }}>
                            You must add at least one bank account in your Profile first to list USD.
                          </p>
                          <a href="#profile" style={{ fontSize: '11px', color: 'var(--gold-light)', fontWeight: 700 }}>
                            Go to Profile & Add Account →
                          </a>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {user.payment_accounts.map(acc => {
                            const sel = linkedAccounts.some(la => la.id === acc.id);
                            const matched = ALL_PAYMENT_METHODS.find(m => m.id === acc.bankName);
                            return (
                              <div 
                                key={acc.id} 
                                onClick={() => toggleLinkedAccount(acc)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                                  background: sel ? 'var(--gold-bg)' : 'var(--bg-elevated)',
                                  border: `1px solid ${sel ? 'var(--gold)' : 'var(--border)'}`,
                                  borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <span style={{ fontSize: '16px' }}>{matched?.icon || '🏦'}</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ color: sel ? 'var(--gold-light)' : 'var(--text-1)' }}>
                                    {matched?.label || acc.bankName}
                                  </div>
                                  <div style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 400 }}>
                                    Acc: {acc.accountNumber} · Holder: {acc.holderName}
                                  </div>
                                </div>
                                <span style={{
                                  width: '16px', height: '16px', borderRadius: '50%',
                                  border: `2px solid ${sel ? 'var(--gold)' : 'var(--border-hover)'}`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: sel ? 'var(--gold)' : 'transparent',
                                  color: '#0A0C12', fontSize: '9px', fontWeight: 900
                                }}>
                                  {sel && '✓'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* SECTION 3: TERMS & RULES */}
              <div style={{
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--gold-light)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🛡️</span> 3. Trade Terms & Rules
                </div>

                {/* Description & Terms */}
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Description / Trade Terms</label>
                  <textarea
                    className="input"
                    style={{ minHeight: '60px', resize: 'vertical', paddingTop: '10px', borderRadius: '10px', fontSize: '13px' }}
                    placeholder="Enter custom requirements, e.g. Call me after payment, CBE transfers only, no third party..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>

                {/* Payment Time Limit & Third Party Settings */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Payment Window</label>
                    <select
                      className="input select-premium"
                      value={paymentWindow}
                      onChange={e => setPaymentWindow(e.target.value)}
                      style={{ height: '42px', width: '100%', background: '#141827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', color: '#fff', padding: '0 10px', fontSize: '12.5px' }}
                    >
                      <option value="15">15 Minutes</option>
                      <option value="30">30 Minutes</option>
                      <option value="45">45 Minutes</option>
                      <option value="60">60 Minutes</option>
                    </select>
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Third-Party Payments</label>
                    <select
                      className="input select-premium"
                      value={allowThirdParty ? 'true' : 'false'}
                      onChange={e => setAllowThirdParty(e.target.value === 'true')}
                      style={{ height: '42px', width: '100%', background: '#141827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', color: '#fff', padding: '0 10px', fontSize: '12.5px' }}
                    >
                      <option value="false">🚫 No Third Party</option>
                      <option value="true">✅ Third Party Ok</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 4: LISTING IMAGES (OPTIONAL) */}
              <div style={{
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--gold-light)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🖼️</span> 4. Listing Images <span style={{ fontWeight: 400, color: 'var(--muted)', textTransform: 'none', fontSize: '10px' }}>(optional, up to 3)</span>
                </div>

                {/* Drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setImageDragOver(true); }}
                  onDragLeave={() => setImageDragOver(false)}
                  onDrop={e => { e.preventDefault(); setImageDragOver(false); handleImageFileSelect(e.dataTransfer.files); }}
                  onClick={() => uploadedImages.length < 3 && document.getElementById('listing-image-input').click()}
                  style={{
                    border: `2px dashed ${imageDragOver ? '#F5A623' : 'rgba(255,255,255,0.12)'}`,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                    cursor: uploadedImages.length >= 3 ? 'not-allowed' : 'pointer',
                    background: imageDragOver ? 'rgba(245,166,35,0.06)' : 'rgba(255,255,255,0.01)',
                    transition: 'all 0.2s ease',
                    opacity: uploadedImages.length >= 3 ? 0.5 : 1,
                  }}
                >
                  <input
                    id="listing-image-input"
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={e => handleImageFileSelect(e.target.files)}
                  />
                  {isUploadingImage ? (
                    <div style={{ color: '#F5A623', fontSize: '13px', fontWeight: 600 }}>⏳ Processing images...</div>
                  ) : (
                    <>
                      <div style={{ fontSize: '24px', marginBottom: '6px' }}>📸</div>
                      <div style={{ fontSize: '12px', color: '#fff', fontWeight: 600 }}>
                        {uploadedImages.length >= 3 ? 'Maximum 3 images reached' : 'Drop images here or click to upload'}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--muted)', marginTop: '3px' }}>Max 5MB each · JPG, PNG, WebP</div>
                    </>
                  )}
                </div>

                {/* Preview strip */}
                {uploadedImages.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {uploadedImages.map((img, idx) => (
                      <div key={idx} style={{ position: 'relative' }}>
                        <img
                          src={img}
                          alt={`Preview ${idx + 1}`}
                          style={{
                            width: '72px',
                            height: '56px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: '1px solid rgba(245,166,35,0.3)',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== idx))}
                          style={{
                            position: 'absolute',
                            top: '-6px',
                            right: '-6px',
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: '#EF4444',
                            border: 'none',
                            color: '#fff',
                            fontSize: '9px',
                            fontWeight: 900,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            lineHeight: 1,
                          }}
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Warning */}
              <div style={{ background: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', borderRadius: '12px', padding: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--status-danger-text)', marginBottom: '3px' }}>⚠️ ESCROW SECURITY POLICY</div>
                <p style={{ fontSize: '10.5px', color: 'var(--status-danger-text)', lineHeight: '1.4', margin: 0 }}>
                  Escrow is locking transaction funds automatically. Do **NOT** release funds until you verify the ETB amount has cleared inside your personal banking application.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-outline" style={{ flex: 1, height: '46px', borderRadius: '12px' }}>Cancel</button>
                <button type="submit" disabled={createType === 'sell' && (!user.payment_accounts || user.payment_accounts.length === 0)} className="btn btn-gold" style={{ flex: 2, height: '46px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                  {editingListingId ? 'Save Changes' : 'Post Advertisement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ BUY MODAL BOTTOM SHEET ══════════════════════════ */}
      {showBuyModal && selectedListing && (
        <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) { setShowBuyModal(false); setSelectedListing(null); } }}>
          <div style={sheetStyle}>
            <div style={handleStyle} />
            
            {/* Logo and Brand Name Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
              <Logo size={28} />
              <button onClick={() => { setShowBuyModal(false); setSelectedListing(null); }} style={{
                width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-elevated)',
                border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}>✕</button>
            </div>

            {buyModalStep === 1 ? (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontWeight: 800, fontSize: '18px', margin: '0 0 4px 0', color: '#fff' }}>
                    {selectedListing.type === 'buy' ? `Sell USD to @${selectedListing.seller_name}` : `Buy from @${selectedListing.seller_name}`}
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>
                    Confirm your trade details to initiate the secure escrow transaction.
                  </p>
                </div>

                {/* Partner info */}
                <div style={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: '12px', padding: '16px', marginBottom: '16px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--gold)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => { setShowBuyModal(false); setViewingTraderId(selectedListing.seller_id); }}>
                        @{selectedListing.seller_name}
                      </span>
                      {(selectedListing.seller_kyc_status === 'verified' || selectedListing.seller_kyc_status === 'approved') && (
                        <span style={{ background: 'rgba(0,200,150,0.12)', color: '#00C896', fontSize: '8.5px', fontWeight: 700, padding: '1px 5px', borderRadius: '99px' }}>
                          ✅ Verified
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span>⭐ {(selectedListing.sellerAverageRating || 5.0).toFixed(1)}</span>
                      <span>({selectedListing.sellerTotalTrades || 0} trades)</span>
                      <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
                      <span style={{ color: '#00C896' }}>👍 {selectedListing.sellerPositivePercentage || 100}% positive</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--gold-light)' }}>
                      {selectedListing.custom_rate_etb || (selectedListing.type === 'buy' ? (systemSettings?.etbRatePerDollarSell ?? rate) : (systemSettings?.etbRatePerDollar ?? rate))} ETB / $1
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                      Limits: {selectedListing.min_limit_etb.toLocaleString()} – {selectedListing.max_limit_etb.toLocaleString()} ETB
                    </div>
                  </div>
                </div>

                {/* Listing images gallery */}
                {selectedListing.images && selectedListing.images.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    {/* Main image */}
                    <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', marginBottom: '8px' }}>
                      <img
                        src={selectedListing.images[activeImageIdx]}
                        alt={`Listing image ${activeImageIdx + 1}`}
                        style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}
                      />
                      <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.55)', borderRadius: '6px', padding: '3px 8px', fontSize: '10px', color: '#fff', fontWeight: 600, backdropFilter: 'blur(4px)' }}>
                        {activeImageIdx + 1} / {selectedListing.images.length}
                      </div>
                    </div>
                    {/* Thumbnail strip */}
                    {selectedListing.images.length > 1 && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {selectedListing.images.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`Thumbnail ${idx + 1}`}
                            onClick={() => setActiveImageIdx(idx)}
                            style={{
                              width: '52px', height: '40px', objectFit: 'cover', borderRadius: '6px',
                              border: `2px solid ${idx === activeImageIdx ? '#F5A623' : 'rgba(255,255,255,0.08)'}`,
                              cursor: 'pointer', flexShrink: 0, transition: 'border-color 0.15s ease',
                              opacity: idx === activeImageIdx ? 1 : 0.7,
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Steps */}
                {selectedListing.type === 'buy' ? (
                  <div style={{ background: 'rgba(0,212,170,0.07)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--teal-light)', marginBottom: '6px' }}>📖 Steps:</div>
                    <ol style={{ fontSize: '11px', color: 'var(--text-2)', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '3px', margin: 0 }}>
                      <li>Enter how much USD you want to sell to this buyer</li>
                      <li>You'll see the exact ETB they will transfer to you</li>
                      <li>Select your bank account where they will send local Birr</li>
                      <li>Open trade → your USD is locked in escrow → they pay you</li>
                    </ol>
                  </div>
                ) : (
                  <div style={{ background: 'var(--gold-bg)', border: '1px solid rgba(200,150,44,0.2)', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold-light)', marginBottom: '6px' }}>📖 Steps:</div>
                    <ol style={{ fontSize: '11px', color: 'var(--text-2)', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '3px', margin: 0 }}>
                      <li>Enter how much USD you want to buy</li>
                      <li>You'll see the exact ETB you need to send</li>
                      <li>Open trade → chat with seller privately</li>
                      <li>Send ETB → upload receipt → seller releases USD</li>
                    </ol>
                  </div>
                )}

                {/* Trade Terms & Conditions */}
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  padding: '14px',
                  marginBottom: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#fff', fontWeight: 600 }}>
                      ⏱️ Payment Window: <span style={{ color: 'var(--gold-light)' }}>{selectedListing.payment_window || 15} mins</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#fff', fontWeight: 600 }}>
                      👤 Third-Party: <span style={{ color: selectedListing.allow_third_party ? '#00C896' : '#EF4444' }}>
                        {selectedListing.allow_third_party ? 'Allowed' : 'Not Allowed'}
                      </span>
                    </div>
                  </div>
                  {selectedListing.description && (
                    <>
                      <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', fontWeight: 600 }}>
                          {selectedListing.type === 'buy' ? "Buyer's Terms & Instructions" : "Seller's Terms & Instructions"}
                        </div>
                        <div style={{ fontSize: '12px', color: '#e0e0e0', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                          {selectedListing.description}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">
                      {selectedListing.type === 'buy' ? 'Amount to Sell (USD)' : 'Amount to Buy (USD)'}
                    </label>
                    <input
                      type="number" step="0.01" required
                      className="input"
                      placeholder={`Max: $${(selectedListing.amount_eth ?? 0).toFixed(2)} USD`}
                      value={tradeamount_eth}
                      onChange={e => setTradeamount_eth(e.target.value)}
                    />
                  </div>

                  {tradeamount_eth && !isNaN(parseFloat(tradeamount_eth)) && (
                    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                        <span style={{ color: 'var(--text-3)' }}>Rate</span>
                        <span style={{ color: 'var(--gold-light)', fontWeight: 600 }}>
                          {selectedListing.custom_rate_etb || (selectedListing.type === 'buy' ? (systemSettings?.etbRatePerDollarSell ?? rate) : (systemSettings?.etbRatePerDollar ?? rate))} ETB/$1
                        </span>
                      </div>
                      <div style={{ height: '1px', background: 'var(--border)', margin: '6px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 800 }}>
                        <span>{selectedListing.type === 'buy' ? 'You Receive:' : 'You Pay:'}</span>
                        <span style={{ color: 'var(--gold-light)' }}>
                          {Math.round(parseFloat(tradeamount_eth) * (selectedListing.custom_rate_etb || (selectedListing.type === 'buy' ? (systemSettings?.etbRatePerDollarSell ?? rate) : (systemSettings?.etbRatePerDollar ?? rate)))).toLocaleString()} ETB
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '8px', color: '#00C896', fontWeight: 600 }}>
                        <span>Platform Fee:</span>
                        <span>{systemSettings?.isP2pFreePeriod ? 'FREE (0%)' : `${systemSettings?.p2p_commission || 1}%`}</span>
                      </div>
                    </div>
                  )}

                  {/* Dynamic Bank Accounts Selector */}
                  {selectedListing.type === 'buy' ? (
                    /* Taker is seller: Taker chooses ONE of THEIR OWN accounts to receive payment */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label className="input-label" style={{ marginBottom: '2px' }}>Receive Payout Into (My Bank/Wallet)</label>
                      {(!user.payment_accounts || user.payment_accounts.length === 0) ? (
                        <div style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid var(--status-danger-border)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                          <div style={{ fontSize: '20px', marginBottom: '4px' }}>⚠️</div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--status-danger-text)' }}>No Saved Bank Profiles</div>
                          <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: '4px 0 10px', lineHeight: 1.5 }}>
                            You must add a bank account in your Profile first so this buyer can send you the ETB.
                          </p>
                          <a href="#profile" style={{ fontSize: '11px', color: 'var(--gold-light)', fontWeight: 700 }} onClick={(e) => {
                            e.preventDefault();
                            setShowBuyModal(false);
                            window.dispatchEvent(new CustomEvent('ethioswap_navigate', { detail: 'profile' }));
                          }}>
                            Go to Profile page & add account →
                          </a>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {user.payment_accounts.map(acc => {
                            const sel = chosenPaymentAccount?.id === acc.id;
                            const matched = ALL_PAYMENT_METHODS.find(m => m.id === acc.bankName);
                            return (
                              <div key={acc.id} onClick={() => setChosenPaymentAccount(acc)} style={{
                                display: 'flex', alignItems: 'center', gap: '10px', padding: '12px',
                                background: sel ? 'rgba(0,212,170,0.08)' : 'var(--bg-elevated)',
                                border: `1px solid ${sel ? 'var(--teal)' : 'var(--border)'}`,
                                borderRadius: '12px', cursor: 'pointer', fontSize: '12.5px', fontWeight: 600,
                                transition: 'all 0.15s ease',
                              }}>
                                <span style={{ fontSize: '18px' }}>{matched?.icon || '🏦'}</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ color: sel ? 'var(--teal-light)' : 'var(--text-1)' }}>
                                    {matched?.label || acc.bankName}
                                  </div>
                                  <div style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 400, marginTop: '2px' }}>
                                    Acc: {acc.accountNumber} · Holder: {acc.holderName}
                                  </div>
                                </div>
                                <span style={{
                                  width: '18px', height: '18px', borderRadius: '50%',
                                  border: `2px solid ${sel ? 'var(--teal)' : 'var(--border-hover)'}`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: sel ? 'var(--teal)' : 'transparent',
                                  color: '#0A0C12', fontSize: '10px', fontWeight: 900
                                }}>
                                  {sel && '✓'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Taker is buyer: Taker chooses one of the Maker's bank accounts to pay to */
                    selectedListing.payment_accounts && selectedListing.payment_accounts.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label className="input-label" style={{ marginBottom: '2px' }}>Send Payout To (Seller Bank/Wallet)</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {selectedListing.payment_accounts.map(acc => {
                            const sel = chosenPaymentAccount?.id === acc.id;
                            const matched = ALL_PAYMENT_METHODS.find(m => m.id === acc.bankName);
                            return (
                              <div key={acc.id} onClick={() => setChosenPaymentAccount(acc)} style={{
                                display: 'flex', alignItems: 'center', gap: '10px', padding: '12px',
                                background: sel ? 'var(--gold-bg)' : 'var(--bg-elevated)',
                                border: `1px solid ${sel ? 'var(--gold)' : 'var(--border)'}`,
                                borderRadius: '12px', cursor: 'pointer', fontSize: '12.5px', fontWeight: 600,
                                transition: 'all 0.15s ease',
                              }}>
                                <span style={{ fontSize: '18px' }}>{matched?.icon || '🏦'}</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ color: sel ? 'var(--gold-light)' : 'var(--text-1)' }}>
                                    {matched?.label || acc.bankName}
                                  </div>
                                  <div style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 400, marginTop: '2px' }}>
                                    Acc Holder: {acc.holderName}
                                  </div>
                                </div>
                                <span style={{
                                  width: '18px', height: '18px', borderRadius: '50%',
                                  border: `2px solid ${sel ? 'var(--gold)' : 'var(--border-hover)'}`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: sel ? 'var(--gold)' : 'transparent',
                                  color: '#0A0C12', fontSize: '10px', fontWeight: 900
                                }}>
                                  {sel && '✓'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )
                  )}

                  {tradeError && (
                    <div style={{ background: 'var(--status-danger-bg)', color: 'var(--status-danger-text)', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', border: '1px solid var(--status-danger-border)' }}>
                      ⚠️ {tradeError}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button type="button" onClick={() => { setShowBuyModal(false); setSelectedListing(null); }} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
                    <button type="submit" className="btn teal-glow-btn" style={{ flex: 2, color: '#0B0E1A', fontWeight: 700 }}>
                      {selectedListing.type === 'buy' ? 'Sell Now' : 'Buy Now'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                {/* STEP 2: CONFIRMATION MODAL */}
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontWeight: 800, fontSize: '19px', margin: '0 0 4px 0', color: 'var(--gold)' }}>
                    {selectedListing.type === 'sell' ? "You're buying USDT" : "You're selling USDT"}
                  </h3>
                  <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--muted)' }}>
                    Please review and confirm the trade details below before opening the trade.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Details table */}
                  <div style={{ background: '#141827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--muted)' }}>Trade Partner</span>
                      <span style={{ color: '#fff', fontWeight: 600 }}>@{selectedListing.seller_name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--muted)' }}>Exchange Rate</span>
                      <span style={{ color: '#fff', fontWeight: 600 }}>
                        {selectedListing.custom_rate_etb || (selectedListing.type === 'buy' ? (systemSettings?.etbRatePerDollarSell ?? rate) : (systemSettings?.etbRatePerDollar ?? rate))} ETB / $1
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--muted)' }}>USDT Amount</span>
                      <span style={{ color: 'var(--gold)', fontWeight: 700 }}>${parseFloat(tradeamount_eth).toFixed(2)} USDT</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--muted)' }}>Total ETB Amount</span>
                      <span style={{ color: 'var(--gold-light)', fontWeight: 700 }}>
                        {Math.round(parseFloat(tradeamount_eth) * (selectedListing.custom_rate_etb || (selectedListing.type === 'buy' ? (systemSettings?.etbRatePerDollarSell ?? rate) : (systemSettings?.etbRatePerDollar ?? rate)))).toLocaleString()} ETB
                      </span>
                    </div>

                    {chosenPaymentAccount && (
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {selectedListing.type === 'sell' ? 'Payment Destination' : 'Your Receiving Account'}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: 'var(--muted)' }}>Bank/Wallet</span>
                          <span style={{ color: '#fff', fontWeight: 600 }}>{chosenPaymentAccount.bankName}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: 'var(--muted)' }}>Holder Name</span>
                          <span style={{ color: '#fff', fontWeight: 600 }}>{chosenPaymentAccount.holderName}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: 'var(--muted)' }}>Account Number</span>
                          <span style={{ color: 'var(--gold-light)', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{chosenPaymentAccount.accountNumber}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Warning Alerts */}
                  {selectedListing.type === 'sell' ? (
                    <div style={{ background: 'rgba(245, 166, 35, 0.08)', border: '1px solid rgba(245, 166, 35, 0.25)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ color: '#F5A623', fontSize: '13px', fontWeight: 700 }}>⚠️ Important Transfer Instruction</span>
                      <span style={{ color: '#ffd580', fontSize: '11.5px', lineHeight: 1.5 }}>
                        You must transfer exactly <strong>{Math.round(parseFloat(tradeamount_eth) * (selectedListing.custom_rate_etb || (selectedListing.type === 'buy' ? (systemSettings?.etbRatePerDollarSell ?? rate) : (systemSettings?.etbRatePerDollar ?? rate)))).toLocaleString()} ETB</strong> to the seller's payment account shown above within <strong>{selectedListing.payment_window || 30} minutes</strong>.
                      </span>
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(0, 200, 150, 0.08)', border: '1px solid rgba(0, 200, 150, 0.25)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ color: '#00C896', fontSize: '13px', fontWeight: 700 }}>ℹ️ Secure Escrow Transfer</span>
                      <span style={{ color: '#a0eedb', fontSize: '11.5px', lineHeight: 1.5 }}>
                        The buyer will transfer the ETB to your account. Once verified, you will release the USDT. Your USDT is locked securely in escrow during this period.
                      </span>
                    </div>
                  )}

                  {tradeError && (
                    <div style={{ background: 'var(--status-danger-bg)', color: 'var(--status-danger-text)', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', border: '1px solid var(--status-danger-border)' }}>
                      ⚠️ {tradeError}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                    <button type="button" onClick={() => setBuyModalStep(1)} className="btn btn-outline" style={{ flex: 1 }}>Back</button>
                    <button 
                      type="button" 
                      onClick={handleOpenTrade} 
                      className="btn gold-glow-btn" 
                      style={{ flex: 2, color: '#0B0E1A', fontWeight: 700 }}
                    >
                      {selectedListing.type === 'sell' ? 'Confirm & Transfer' : 'Confirm & Proceed'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* Trader Profile Modal */}
      {(() => {
        if (!viewingTraderId) return null;
        return <TraderProfileModal viewingTraderId={viewingTraderId} setViewingTraderId={setViewingTraderId} />;
      })()}
    </div>
  );
};

// Helper Trader Profile Modal Component to query stats and display
const TraderProfileModal = ({ viewingTraderId, setViewingTraderId }) => {
  const [traderStats, setTraderStats] = useState(null);

  useEffect(() => {
    if (!viewingTraderId) return;
    const loadStats = async () => {
      const [userRes, ratingsRes, tradesRes] = await Promise.all([
        supabase.from('users').select('id, username, kyc_status').eq('id', viewingTraderId).single(),
        supabase.from('trade_ratings').select('*').eq('rated_user_id', viewingTraderId),
        supabase.from('trades').select('id, status').or(`buyer_id.eq.${viewingTraderId},seller_id.eq.${viewingTraderId}`)
      ]);
      const user = userRes.data;
      const ratings = ratingsRes.data || [];
      const trades = tradesRes.data || [];
      const totalRatings = ratings.length;
      const avgRating = totalRatings > 0 ? ratings.reduce((s, r) => s + (r.stars || 0), 0) / totalRatings : 0;
      const positiveRatings = ratings.filter(r => (r.stars || 0) >= 4).length;
      const positivePercentage = totalRatings > 0 ? Math.round((positiveRatings / totalRatings) * 100) : 0;
      const completedTrades = trades.filter(t => t.status === 'completed').length;
      const disputes = trades.filter(t => t.status === 'disputed').length;
      const breakdown = [5, 4, 3, 2, 1].map(stars => {
        const count = ratings.filter(r => r.stars === stars).length;
        return { stars, count, pct: totalRatings > 0 ? Math.round((count / totalRatings) * 100) : 0 };
      });
      setTraderStats({
        username: user?.username || 'Trader',
        kycApproved: user?.kyc_status === 'verified',
        averageRating: avgRating,
        totalRatings,
        positivePercentage,
        totalCompletedTrades: completedTrades,
        totalDisputes: disputes,
        resolvedDisputes: disputes,
        breakdown,
        recentReviews: ratings.slice(0, 5).map(r => ({ ...r, _id: r.id, createdAt: r.created_at }))
      });
    };
    loadStats();
  }, [viewingTraderId]);

  if (!traderStats) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
      }}>
        <div className="card glass-card" style={{ padding: '28px', textAlign: 'center', color: '#fff' }}>
          Loading Trader Reputation...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px'
    }} onClick={() => setViewingTraderId(null)}>
      <div className="card glass-card custom-scrollbar" style={{ maxWidth: '480px', width: '100%', padding: '28px', border: '1px solid rgba(255,255,255,0.08)', animation: 'fadeIn 0.2s ease', overflowY: 'auto', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#8b92a8', letterSpacing: '0.08em' }}>TRADER REPUTATION</h3>
          <button onClick={() => setViewingTraderId(null)} className="btn btn-sm btn-ghost" style={{ padding: '4px 8px', fontSize: '16px', color: 'var(--text-3)' }}>✕</button>
        </div>

        {/* User Card */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--gold)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800 }}>
            {traderStats.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '16px', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              @{traderStats.username}
              {traderStats.kycApproved && (
                <span style={{ fontSize: '12px', color: '#00C896' }} title="KYC Verified">✅</span>
              )}
            </div>

          </div>
        </div>

        {/* Major Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.02)' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase' }}>AVERAGE RATING</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--gold)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ⭐ {Number(traderStats.averageRating || 0).toFixed(1)} <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 500 }}>/ 5.0</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>Based on {traderStats.totalRatings} ratings</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.02)' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase' }}>POSITIVE FEEDBACK</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#00C896', marginTop: '4px' }}>
              👍 {traderStats.positivePercentage}% <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 500 }}>Positive</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>{traderStats.totalCompletedTrades} completed trades</div>
          </div>
        </div>

        {/* Disputes count */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.12)', padding: '12px 16px', borderRadius: '10px', marginBottom: '24px', fontSize: '13px' }}>
          <span style={{ color: '#f43f5e', fontWeight: 600 }}>⚠️ Disputes History</span>
          <span style={{ fontWeight: 700, color: '#f43f5e' }}>{traderStats.totalDisputes} Disputes ({traderStats.resolvedDisputes} resolved)</span>
        </div>

        {/* Rating breakdown bars */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>RATING BREAKDOWN</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {traderStats.breakdown.map((row) => (
              <div key={row.stars} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px' }}>
                <span style={{ width: '50px', color: 'var(--text-secondary)', textAlign: 'right' }}>{row.stars} ★</span>
                <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ width: `${row.pct}%`, height: '100%', background: 'var(--gold)', borderRadius: '99px' }} />
                </div>
                <span style={{ width: '30px', color: 'var(--text-muted)', textAlign: 'right', fontSize: '11px' }}>{row.count}</span>
                <span style={{ width: '35px', color: 'var(--text-secondary)', textAlign: 'right', fontWeight: 600 }}>{row.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent reviews list */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>RECENT REVIEWS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {traderStats.recentReviews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-3)', fontSize: '13px' }}>No reviews yet</div>
            ) : traderStats.recentReviews.map((rev) => (
              <div key={rev._id} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--gold)', letterSpacing: '1px', fontSize: '12px' }}>
                    {'★'.repeat(rev.rating) + '☆'.repeat(5 - rev.rating)}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                    {new Date(rev.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {rev.comment && (
                  <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontStyle: 'italic', color: 'var(--text-1)' }}>
                    "{rev.comment}"
                  </p>
                )}
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                  By @{rev.raterName} ({rev.raterType})
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default P2PListings;

