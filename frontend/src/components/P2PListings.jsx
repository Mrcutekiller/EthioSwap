import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import EmptyState from './EmptyState.jsx';

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

const P2PListings = () => {
  const { user, listings, wallet, createListing, initiateTrade, systemSettings } = useAuth();

  const [p2pTab, setP2pTabState] = useState(() => {
    return localStorage.getItem(`ethioswap_active_p2p_tab_${user?.id}`) || 'buy';
  });

  const setP2pTab = (val) => {
    setP2pTabState(val);
    localStorage.setItem(`ethioswap_active_p2p_tab_${user?.id}`, val);
  };

  const [filterPayment, setFilterPayment] = useState('All');
  const [filterAmountRange, setFilterAmountRange] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBuyModal, setShowBuyModal]    = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [tradeamountEth, setTradeamountEth]   = useState('');
  const [tradeError, setTradeError]           = useState('');
  const [chosenPaymentAccount, setChosenPaymentAccount] = useState(null);
  const [kycDismissed, setKycDismissed] = useState(false);

  // Sync selected listing's first payment account as default (only for Sell Listings where maker is seller)
  React.useEffect(() => {
    if (selectedListing) {
      if (selectedListing.type === 'buy') {
        // Taker is seller, so default to taker's own first saved payment account
        if (user.paymentAccounts && user.paymentAccounts.length > 0) {
          setChosenPaymentAccount(user.paymentAccounts[0]);
        } else {
          setChosenPaymentAccount(null);
        }
      } else {
        // Maker is seller, default to listing's payment account
        if (selectedListing.paymentAccounts && selectedListing.paymentAccounts.length > 0) {
          setChosenPaymentAccount(selectedListing.paymentAccounts[0]);
        } else {
          setChosenPaymentAccount(null);
        }
      }
    } else {
      setChosenPaymentAccount(null);
    }
  }, [selectedListing, user]);

  // Create form state
  const [createType,      setCreateType]      = useState('sell'); // 'sell' | 'buy'
  const [amountEth,       setamountEth]       = useState('');
  const [minLimit,        setMinLimit]         = useState('');
  const [maxLimit,        setMaxLimit]         = useState('');
  const [linkedAccounts,  setLinkedAccounts]  = useState([]);
  const [useCustomRate,   setUseCustomRate]   = useState(false);
  const [customRate,      setCustomRate]      = useState('');

  const toggleLinkedAccount = (acc) => {
    setLinkedAccounts(prev =>
      prev.some(la => la.id === acc.id)
        ? prev.filter(la => la.id !== acc.id)
        : [...prev, acc]
    );
  };

  const rate = systemSettings?.etbRatePerDollar ?? 190;

  // ── KYC gate ─────────────────────────────────────────────
  const kycApproved = user?.kycStatus === 'approved';

  // ── Create listing ────────────────────────────────────────
  const handleCreateListing = async (e) => {
    e.preventDefault();
    if (createType === 'sell' && linkedAccounts.length === 0) {
      alert('Please link at least one of your saved payment accounts.');
      return;
    }
    if (!amountEth || !minLimit || !maxLimit) {
      alert('Please fill in all fields.');
      return;
    }
    if (parseFloat(amountEth) < 1) {
      alert('Minimum ad amount is $1.00 USD.');
      return;
    }
    const effectiveRate = useCustomRate && customRate ? parseFloat(customRate) : rate;
    const minUSD = parseFloat(minLimit) / effectiveRate;
    if (minUSD < 0.99) {
      alert(`Minimum transaction limit must be at least $1.00 USD equivalent (≈ ${Math.round(effectiveRate)} ETB).`);
      return;
    }

    const selectedPayments = createType === 'sell' 
      ? linkedAccounts.map(a => a.bankName) 
      : ['CBE', 'Telebirr', 'Dashen Bank', 'Awash Bank', 'Bank of Abyssinia'];
      
    await createListing(
      parseFloat(amountEth), 
      parseFloat(minLimit), 
      parseFloat(maxLimit), 
      selectedPayments, 
      useCustomRate && customRate ? parseFloat(customRate) : undefined, 
      createType === 'sell' ? linkedAccounts : [], 
      createType
    );
    
    setamountEth(''); setMinLimit(''); setMaxLimit('');
    setLinkedAccounts([]); setUseCustomRate(false); setCustomRate('');
    setShowCreateModal(false);
  };

  // ── Open trade ────────────────────────────────────────────
  const handleOpenTrade = async (e) => {
    e.preventDefault();
    setTradeError('');
    const amt = parseFloat(tradeamountEth);
    if (isNaN(amt) || amt < 1) { setTradeError('Minimum transaction amount is $1.00 USD.'); return; }
    if (amt > selectedListing.amountEth) {
      setTradeError(`Maximum available is $${(selectedListing.amountEth ?? 0).toFixed(2)} USD.`);
      return;
    }
    const effectiveRate = selectedListing.customRateEtb || rate;
    const totalEtb = amt * effectiveRate;
    if (totalEtb < selectedListing.minLimitEtb || totalEtb > selectedListing.maxLimitEtb) {
      setTradeError(`Total (${Math.round(totalEtb).toLocaleString()} ETB) must be between ${selectedListing.minLimitEtb.toLocaleString()} – ${selectedListing.maxLimitEtb.toLocaleString()} ETB.`);
      return;
    }
    
    if (selectedListing.type === 'buy') {
      if (!chosenPaymentAccount) {
        setTradeError('Please select one of your saved bank/wallet accounts to receive the ETB.');
        return;
      }
    } else {
      if (!chosenPaymentAccount && selectedListing.paymentAccounts && selectedListing.paymentAccounts.length > 0) {
        setTradeError('Please select a bank/wallet of the seller to pay to.');
        return;
      }
    }
    
    const trade = await initiateTrade(selectedListing._id, amt, chosenPaymentAccount);
    if (trade) { setSelectedListing(null); setTradeamountEth(''); setShowBuyModal(false); }
  };

  // ── Filter listings ───────────────────────────────────────
  const filtered = listings.filter(l => {
    const matchesType = p2pTab === 'buy' ? (l.type === 'sell' || !l.type) : (l.type === 'buy');
    const matchesPayment = filterPayment === 'All' || l.paymentMethods.includes(filterPayment);
    
    let matchesAmount = true;
    if (filterAmountRange === 'under50') {
      matchesAmount = l.amountEth < 50;
    } else if (filterAmountRange === '50to200') {
      matchesAmount = l.amountEth >= 50 && l.amountEth <= 200;
    } else if (filterAmountRange === 'over200') {
      matchesAmount = l.amountEth > 200;
    }

    return matchesType && matchesPayment && matchesAmount;
  });

  // ── Shared styles ─────────────────────────────────────────
  const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(4px)', zIndex: 200,
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  };
  const sheetStyle = {
    background: 'var(--bg-surface)', borderRadius: '24px 24px 0 0',
    border: '1px solid var(--border)', borderBottom: 'none',
    width: '100%', maxWidth: '480px', maxHeight: '92dvh',
    overflowY: 'auto', padding: '24px 20px 32px',
    animation: 'slideUp 0.3s ease',
  };
  const handleStyle = {
    width: '36px', height: '4px', background: 'var(--border-hover)',
    borderRadius: '99px', margin: '0 auto 20px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: 'var(--font)' }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', margin: 0 }}>P2P Marketplace</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <div style={{ fontSize: '13px', color: '#00d4a0', fontWeight: 600 }}>
              Rate: <strong style={{ color: '#00d4a0' }}>{rate} ETB / $1 USD</strong>
            </div>
            {systemSettings?.isP2pFreePeriod && (
              <div style={{ 
                background: 'rgba(0, 212, 160, 0.15)', 
                color: '#00d4a0', 
                fontSize: '10px', 
                fontWeight: 800, 
                padding: '2px 8px', 
                borderRadius: '99px',
                border: '1px solid rgba(0, 212, 160, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                FREE 🎉 <span style={{ fontSize: '9px', fontWeight: 500 }}>0% Fee</span>
              </div>
            )}
          </div>
        </div>

        {kycApproved ? (
          <button 
            onClick={() => { setCreateType(p2pTab === 'buy' ? 'sell' : 'buy'); setShowCreateModal(true); }} 
            className="btn btn-gold" 
            style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '10px' }}
          >
            + Post Ad
          </button>
        ) : (
          <button 
            onClick={() => alert("Please open the Profile section to complete your Identity Verification (KYC).")}
            style={{
              background: 'transparent',
              border: '1.5px solid #f5c518',
              borderRadius: '20px',
              height: '36px',
              padding: '0 14px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#f5c518',
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

      {/* ── Buy/Sell Segmented Toggle ── */}
      <div style={{ 
        display: 'flex', 
        background: '#111318', 
        border: '1px solid rgba(255,255,255,0.07)', 
        borderRadius: '8px', 
        padding: '3px', 
        height: '52px', 
        gap: '4px' 
      }}>
        <button
          onClick={() => setP2pTab('buy')}
          style={{
            flex: 1, 
            borderRadius: '6px', 
            border: 'none', 
            cursor: 'pointer',
            fontFamily: 'var(--font)', 
            fontWeight: 700, 
            fontSize: '14px',
            background: p2pTab === 'buy' ? '#00d4a0' : 'transparent',
            color: p2pTab === 'buy' ? '#0a0a0a' : '#6b7280',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px',
            transition: 'all 0.2s ease',
            boxShadow: p2pTab === 'buy' ? '0 4px 12px rgba(0,212,160,0.2)' : 'none'
          }}
        >
          Buy USD
        </button>
        <button
          onClick={() => setP2pTab('sell')}
          style={{
            flex: 1, 
            borderRadius: '6px', 
            border: 'none', 
            cursor: 'pointer',
            fontFamily: 'var(--font)', 
            fontWeight: 700, 
            fontSize: '14px',
            background: p2pTab === 'sell' ? '#f5c518' : 'transparent',
            color: p2pTab === 'sell' ? '#0a0a0a' : '#6b7280',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px',
            transition: 'all 0.2s ease',
            boxShadow: p2pTab === 'sell' ? '0 4px 12px rgba(245,197,24,0.2)' : 'none'
          }}
        >
          Sell USD
        </button>
      </div>

      {/* ── Filter Row 1: Payment Method ── */}
      <div style={{ position: 'relative', width: '100%' }}>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
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
                  fontSize: '11px', 
                  fontWeight: 700, 
                  transition: 'all 0.2s ease',
                  background: isSelected ? '#f5c518' : '#111318',
                  color: isSelected ? '#0a0a0a' : '#c8c8c8',
                  borderColor: isSelected ? '#f5c518' : 'rgba(255,255,255,0.07)',
                  boxShadow: isSelected ? '0 4px 12px rgba(245,197,24,0.15)' : 'none',
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
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
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
                  border: isSelected ? '1.5px solid #00d4a0' : '1px solid rgba(255,255,255,0.07)', 
                  cursor: 'pointer',
                  fontFamily: 'var(--font)', 
                  fontSize: '11px', 
                  fontWeight: 700, 
                  transition: 'all 0.2s ease',
                  background: isSelected ? 'rgba(0, 212, 160, 0.08)' : '#111318',
                  color: isSelected ? '#00d4a0' : '#c8c8c8',
                  boxShadow: isSelected ? '0 0 10px rgba(0, 212, 160, 0.1)' : 'none',
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
          background: '#111318', 
          borderLeft: '3px solid #f5c518',
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
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#f5c518' }}>
              Identity Verification Required
            </div>
            <div style={{ fontSize: '13px', color: '#c8c8c8', marginTop: '4px', lineHeight: 1.4 }}>
              Post listings and open escrow P2P trades securely. Go to <a href="#profile" style={{ color: '#f5c518', fontWeight: 700, textDecoration: 'underline' }}>Profile → Verify Identity</a> to upload documents and selfie.
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
              color: '#6b7280',
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
          ctaAction={() => { setCreateType(p2pTab === 'buy' ? 'sell' : 'buy'); setShowCreateModal(true); }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filtered.map((listing, index) => {
            const effectiveRate = listing.customRateEtb || rate;
            const isOwnListing = listing.sellerId === user.id;
            const isBuyType = listing.type === 'buy';
            return (
              <div 
                key={listing.id} 
                className={isBuyType ? "premium-glow" : "premium-glow-teal"}
                style={{
                  background: 'rgba(17, 19, 24, 0.75)', 
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px', 
                  padding: '20px',
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '14px',
                  backdropFilter: 'blur(10px)',
                  animation: 'fadeInUp 0.3s ease both',
                  animationDelay: `${index * 80}ms`
                }}
              >
                {/* Top Row: User initials avatar + Name + verified check + trades */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '50%',
                    background: 'rgba(245,197,24,0.1)',
                    border: '1.5px solid #f5c518',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontWeight: 800, 
                    fontSize: '14px', 
                    color: '#f5c518',
                  }}>
                    {(listing.sellerName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: '#ffffff' }}>@{listing.sellerName}</span>
                      <span style={{ 
                        background: 'rgba(0,212,160,0.12)', 
                        color: '#00d4a0', 
                        fontSize: '9px', 
                        fontWeight: 700, 
                        padding: '2px 6px', 
                        borderRadius: '99px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}>
                        ✓ Verified
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                      {listing.sellerReputation}% rep · {listing.sellerTotalTrades || 0} trades
                    </div>
                  </div>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: isBuyType ? '#f5c518' : '#00d4a0',
                    background: isBuyType ? 'rgba(245,197,24,0.1)' : 'rgba(0,212,160,0.1)',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    textTransform: 'uppercase'
                  }}>
                    {isBuyType ? 'BUYING' : 'SELLING'}
                  </span>
                </div>

                {/* Middle Row: Big USD volume, rate, limits */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.15)', padding: '14px', borderRadius: '10px' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>AD VOLUME</div>
                    <div className="money-usd" style={{ fontSize: '24px', marginTop: '2px', color: '#f5c518', fontFamily: 'JetBrains Mono, monospace', fontWeight: 800 }}>
                      ${(listing.amountEth ?? 0).toFixed(2)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>EXCHANGE RATE</div>
                    <div className="money-etb" style={{ fontSize: '16px', marginTop: '2px', color: '#00d4a0', fontFamily: 'JetBrains Mono, monospace', fontWeight: 800 }}>
                      {effectiveRate} ETB/$
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#c8c8c8' }}>
                  <span>Transaction Limits:</span>
                  <strong className="money-etb" style={{ color: '#00d4a0', fontFamily: 'JetBrains Mono, monospace' }}>
                    {listing.minLimitEtb.toLocaleString()} – {listing.maxLimitEtb.toLocaleString()} ETB
                  </strong>
                </div>

                {/* Payment method chips */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {listing.paymentMethods.map(p => {
                    const meta = ALL_PAYMENT_METHODS.find(m => m.id === p);
                    return (
                      <span key={p} style={{
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        padding: '4px 10px', 
                        borderRadius: '6px', 
                        fontSize: '11px', 
                        fontWeight: 600,
                        background: 'rgba(255,255,255,0.03)', 
                        border: '1px solid rgba(255,255,255,0.05)',
                        color: '#c8c8c8',
                      }}>
                        {meta?.icon} {meta?.label || p}
                      </span>
                    );
                  })}
                </div>

                {/* Bottom Row CTA Button */}
                {isOwnListing ? (
                  <div style={{
                    textAlign: 'center', 
                    padding: '12px', 
                    fontSize: '13px', 
                    fontWeight: 700,
                    color: '#f5c518', 
                    background: 'rgba(245,197,24,0.08)',
                    border: '1px solid rgba(245,197,24,0.15)', 
                    borderRadius: '10px',
                  }}>
                    ✓ Your active P2P listing
                  </div>
                ) : (
                  <button
                    onClick={() => { setSelectedListing(listing); setShowBuyModal(true); setTradeamountEth(''); setTradeError(''); }}
                    disabled={!kycApproved}
                    className="glow-btn"
                    style={{ 
                      width: '100%',
                      height: '46px',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '14px', 
                      fontWeight: 700,
                      cursor: kycApproved ? 'pointer' : 'not-allowed',
                      background: isBuyType ? '#00d4a0' : '#f5c518',
                      color: '#0a0a0a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {kycApproved ? (isBuyType ? 'Buy USD Now ➔' : 'Sell USD Now ➔') : '🛡️ Complete KYC to Trade'}
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
                {createType === 'buy' ? 'Post Buy USD Ad' : 'Post Sell USD Ad'}
              </h3>
              <button onClick={() => setShowCreateModal(false)} style={{
                width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-elevated)',
                border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}>✕</button>
            </div>

            {/* Offer type selector */}
            <div style={{ display: 'flex', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '12px', padding: '3px', gap: '2px', marginBottom: '16px' }}>
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

            <form onSubmit={handleCreateListing} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* USD Amount */}
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Amount to Sell (USD)</label>
                <input
                  type="number" step="0.01" required
                  className="input"
                  placeholder={`Available: $${wallet ? ((wallet.ethBalance ?? 0) - (wallet.ethLocked ?? 0)).toFixed(2) : '0.00'} USD`}
                  value={amountEth}
                  onChange={e => setamountEth(e.target.value)}
                />
                {amountEth && (
                  <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>
                    ≈ {Math.round(parseFloat(amountEth) * rate).toLocaleString()} ETB at admin rate
                  </div>
                )}
              </div>

              {/* Min / Max limits */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Min (ETB)</label>
                  <input type="number" required className="input" placeholder="e.g. 500" value={minLimit} onChange={e => setMinLimit(e.target.value)} />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Max (ETB)</label>
                  <input type="number" required className="input" placeholder="e.g. 20000" value={maxLimit} onChange={e => setMaxLimit(e.target.value)} />
                </div>
              </div>

              {/* Custom rate toggle */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--text-2)' }}>
                  <div
                    onClick={() => setUseCustomRate(!useCustomRate)}
                    style={{
                      width: '36px', height: '20px', borderRadius: '99px', position: 'relative',
                      background: useCustomRate ? 'var(--gold)' : 'var(--bg-elevated)',
                      border: `1px solid ${useCustomRate ? 'var(--gold)' : 'var(--border)'}`,
                      transition: 'all 0.2s ease', cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: '2px', transition: 'left 0.2s ease',
                      left: useCustomRate ? '17px' : '2px',
                      width: '14px', height: '14px', borderRadius: '50%',
                      background: useCustomRate ? '#0A0C12' : 'var(--text-3)',
                    }} />
                  </div>
                  Set my own ETB rate (custom)
                </label>
                {useCustomRate && (
                  <div style={{ marginTop: '10px' }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">My Rate (ETB per $1 USD)</label>
                      <input
                        type="number" step="0.01"
                        className="input"
                        placeholder={`Admin rate: ${rate}`}
                        value={customRate}
                        onChange={e => setCustomRate(e.target.value)}
                      />
                    </div>
                    {customRate && parseFloat(customRate) > rate && (
                      <div style={{ fontSize: '11px', color: 'var(--status-warning-text)', marginTop: '4px' }}>
                        ⚠️ Your rate is above admin rate ({rate}). Buyers may prefer lower rates.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Personal payment accounts selector */}
              <div>
                {createType === 'buy' ? (
                  <div style={{ background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>🛡️</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--teal-light)' }}>No Payout Account Required Upfront</div>
                    <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: '4px 0 0', lineHeight: 1.5 }}>
                      Since you are the buyer, you do not need to link a bank account to receive ETB. Takers (sellers) will provide their own payout details when they sell USD to you.
                    </p>
                  </div>
                ) : (
                  <>
                    <label className="input-label" style={{ marginBottom: '6px', display: 'block' }}>Select My Payment Accounts to Receive Birr</label>
                    <p style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '10px' }}>
                      Check which bank or wallet accounts you want to accept ETB transfers into for this listing:
                    </p>
                    
                    {(!user.paymentAccounts || user.paymentAccounts.length === 0) ? (
                      <div style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid var(--status-danger-border)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                        <div style={{ fontSize: '20px', marginBottom: '4px' }}>⚠️</div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--status-danger-text)' }}>No Saved Bank Profiles</div>
                        <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: '4px 0 10px', lineHeight: 1.5 }}>
                          You must add at least one bank account or mobile wallet in your Profile before listing USD.
                        </p>
                        <a href="#profile" style={{ fontSize: '11px', color: 'var(--gold-light)', fontWeight: 700 }}>
                          Go to Profile page & add account →
                        </a>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {user.paymentAccounts.map(acc => {
                          const sel = linkedAccounts.some(la => la.id === acc.id);
                          const matched = ALL_PAYMENT_METHODS.find(m => m.id === acc.bankName);
                          return (
                            <label key={acc.id} style={{
                              display: 'flex', alignItems: 'center', gap: '10px', padding: '12px',
                              background: sel ? 'var(--gold-bg)' : 'var(--bg-elevated)',
                              border: `1px solid ${sel ? 'var(--gold)' : 'var(--border)'}`,
                              borderRadius: '12px', cursor: 'pointer', fontSize: '12.5px', fontWeight: 600,
                              transition: 'all 0.15s ease',
                            }}>
                              <input type="checkbox" checked={sel} onChange={() => toggleLinkedAccount(acc)} style={{ display: 'none' }} />
                              <span style={{ fontSize: '18px' }}>{matched?.icon || '🏦'}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ color: sel ? 'var(--gold-light)' : 'var(--text-1)' }}>
                                  {matched?.label || acc.bankName}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 400 }}>
                                  Acc: {acc.accountNumber} · Holder: {acc.holderName}
                                </div>
                              </div>
                              {sel && <span style={{ color: 'var(--gold-light)', fontSize: '16px' }}>✓</span>}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Warning */}
              <div style={{ background: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--status-danger-text)', marginBottom: '4px' }}>⚠️ IMPORTANT</div>
                <p style={{ fontSize: '11px', color: 'var(--status-danger-text)', lineHeight: '1.5', margin: 0 }}>
                  Once you release escrow, the transaction is <strong>final and irreversible</strong>. Always confirm ETB receipt in your bank app first.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" disabled={createType === 'sell' && (!user.paymentAccounts || user.paymentAccounts.length === 0)} className="btn btn-gold" style={{ flex: 2 }}>Create Listing</button>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 800, fontSize: '17px', margin: 0 }}>
                {selectedListing.type === 'buy' ? `Sell USD to @${selectedListing.sellerName}` : `Buy from @${selectedListing.sellerName}`}
              </h3>
              <button onClick={() => { setShowBuyModal(false); setSelectedListing(null); }} style={{
                width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-elevated)',
                border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}>✕</button>
            </div>

            {/* Partner info */}
            <div style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '12px', marginBottom: '16px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>@{selectedListing.sellerName}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{selectedListing.sellerReputation}% reputation</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--gold-light)' }}>
                  {selectedListing.customRateEtb || rate} ETB / $1
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                  Limits: {selectedListing.minLimitEtb.toLocaleString()} – {selectedListing.maxLimitEtb.toLocaleString()} ETB
                </div>
              </div>
            </div>

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

            <form onSubmit={handleOpenTrade} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">
                  {selectedListing.type === 'buy' ? 'Amount to Sell (USD)' : 'Amount to Buy (USD)'}
                </label>
                <input
                  type="number" step="0.01" required
                  className="input"
                  placeholder={`Max: $${(selectedListing.amountEth ?? 0).toFixed(2)} USD`}
                  value={tradeamountEth}
                  onChange={e => setTradeamountEth(e.target.value)}
                />
              </div>

              {tradeamountEth && !isNaN(parseFloat(tradeamountEth)) && (
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-3)' }}>Rate</span>
                    <span style={{ color: 'var(--gold-light)', fontWeight: 600 }}>{selectedListing.customRateEtb || rate} ETB/$1</span>
                  </div>
                  <div style={{ height: '1px', background: 'var(--border)', margin: '6px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 800 }}>
                    <span>{selectedListing.type === 'buy' ? 'You Receive:' : 'You Pay:'}</span>
                    <span style={{ color: 'var(--gold-light)' }}>
                      {Math.round(parseFloat(tradeamountEth) * (selectedListing.customRateEtb || rate)).toLocaleString()} ETB
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '8px', color: '#00d4a0', fontWeight: 600 }}>
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
                  {(!user.paymentAccounts || user.paymentAccounts.length === 0) ? (
                    <div style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid var(--status-danger-border)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', marginBottom: '4px' }}>⚠️</div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--status-danger-text)' }}>No Saved Bank Profiles</div>
                      <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: '4px 0 10px', lineHeight: 1.5 }}>
                        You must add a bank account in your Profile first so this buyer can send you the ETB.
                      </p>
                      <a href="#profile" style={{ fontSize: '11px', color: 'var(--gold-light)', fontWeight: 700 }}>
                        Go to Profile page & add account →
                      </a>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {user.paymentAccounts.map(acc => {
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
                selectedListing.paymentAccounts && selectedListing.paymentAccounts.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label className="input-label" style={{ marginBottom: '2px' }}>Send Payout To (Seller Bank/Wallet)</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedListing.paymentAccounts.map(acc => {
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

              <div style={{ background: 'var(--status-warning-bg)', border: '1px solid var(--status-warning-border)', borderRadius: '10px', padding: '10px' }}>
                <p style={{ fontSize: '11px', color: 'var(--status-warning-text)', lineHeight: '1.5', margin: 0 }}>
                  ⚠️ Do <strong>NOT</strong> mark as paid until you have actually sent the funds. False claims may result in account suspension.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => { setShowBuyModal(false); setSelectedListing(null); }} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-gold" style={{ flex: 2 }}>Open Trade →</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default P2PListings;

