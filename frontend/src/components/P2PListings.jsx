import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

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
  const [tradeAmountETH, setTradeAmountETH]   = useState('');
  const [tradeError, setTradeError]           = useState('');
  const [chosenPaymentAccount, setChosenPaymentAccount] = useState(null);

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
  const [amountETH,       setAmountETH]       = useState('');
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
    if (!amountETH || !minLimit || !maxLimit) {
      alert('Please fill in all fields.');
      return;
    }
    if (parseFloat(amountETH) < 1) {
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
      parseFloat(amountETH), 
      parseFloat(minLimit), 
      parseFloat(maxLimit), 
      selectedPayments, 
      useCustomRate && customRate ? parseFloat(customRate) : undefined, 
      createType === 'sell' ? linkedAccounts : [], 
      createType
    );
    
    setAmountETH(''); setMinLimit(''); setMaxLimit('');
    setLinkedAccounts([]); setUseCustomRate(false); setCustomRate('');
    setShowCreateModal(false);
  };

  // ── Open trade ────────────────────────────────────────────
  const handleOpenTrade = async (e) => {
    e.preventDefault();
    setTradeError('');
    const amt = parseFloat(tradeAmountETH);
    if (isNaN(amt) || amt < 1) { setTradeError('Minimum transaction amount is $1.00 USD.'); return; }
    if (amt > selectedListing.amountETH) {
      setTradeError(`Maximum available is $${selectedListing.amountETH.toFixed(2)} USD.`);
      return;
    }
    const effectiveRate = selectedListing.customRateETB || rate;
    const totalETB = amt * effectiveRate;
    if (totalETB < selectedListing.minLimitETB || totalETB > selectedListing.maxLimitETB) {
      setTradeError(`Total (${Math.round(totalETB).toLocaleString()} ETB) must be between ${selectedListing.minLimitETB.toLocaleString()} – ${selectedListing.maxLimitETB.toLocaleString()} ETB.`);
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
    
    const trade = await initiateTrade(selectedListing.id, amt, chosenPaymentAccount);
    if (trade) { setSelectedListing(null); setTradeAmountETH(''); setShowBuyModal(false); }
  };

  // ── Filter listings ───────────────────────────────────────
  const filtered = listings.filter(l => {
    const matchesType = p2pTab === 'buy' ? (l.type === 'sell' || !l.type) : (l.type === 'buy');
    const matchesPayment = filterPayment === 'All' || l.paymentMethods.includes(filterPayment);
    
    let matchesAmount = true;
    if (filterAmountRange === 'under50') {
      matchesAmount = l.amountETH < 50;
    } else if (filterAmountRange === '50to200') {
      matchesAmount = l.amountETH >= 50 && l.amountETH <= 200;
    } else if (filterAmountRange === 'over200') {
      matchesAmount = l.amountETH > 200;
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>P2P Marketplace</h2>
          <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
            Rate: <strong style={{ color: 'var(--gold-light)' }}>{rate} ETB / $1 USD</strong>
          </div>
        </div>

        {kycApproved ? (
          <button onClick={() => { setCreateType(p2pTab === 'buy' ? 'sell' : 'buy'); setShowCreateModal(true); }} className="btn btn-gold" style={{ padding: '10px 16px', fontSize: '13px' }}>
            + Post Ad
          </button>
        ) : (
          <div style={{
            fontSize: '11px', color: 'var(--status-warning-text)', background: 'var(--status-warning-bg)',
            border: '1px solid var(--status-warning-border)', borderRadius: '8px',
            padding: '8px 12px', fontWeight: 600,
          }}>
            🛡️ Verify ID to trade
          </div>
        )}
      </div>

      {/* ── Segmented Tab Control ── */}
      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '16px', padding: '4px', gap: '6px' }}>
        <button
          onClick={() => setP2pTab('buy')}
          style={{
            flex: 1, padding: '12px 6px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font)', fontWeight: 800, fontSize: '13px',
            background: p2pTab === 'buy' 
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.16), rgba(52, 211, 153, 0.06))' 
              : 'transparent',
            color: p2pTab === 'buy' ? '#34D399' : 'var(--text-3)',
            border: p2pTab === 'buy' ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid transparent',
            boxShadow: p2pTab === 'buy' ? '0 4px 12px rgba(16, 185, 129, 0.1)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 8px #10B981' }} />
          Buy USD
        </button>
        <button
          onClick={() => setP2pTab('sell')}
          style={{
            flex: 1, padding: '12px 6px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font)', fontWeight: 800, fontSize: '13px',
            background: p2pTab === 'sell' 
              ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(251, 191, 36, 0.06))' 
              : 'transparent',
            color: p2pTab === 'sell' ? '#FBBF24' : 'var(--text-3)',
            border: p2pTab === 'sell' ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid transparent',
            boxShadow: p2pTab === 'sell' ? '0 4px 12px rgba(245, 158, 11, 0.1)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B', display: 'inline-block', boxShadow: '0 0 8px #F59E0B' }} />
          Sell USD
        </button>
      </div>

      {/* ── Payment filter pills ─────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
        {['All', ...ALL_PAYMENT_METHODS.map(m => m.id)].map(p => {
          const isSelected = filterPayment === p;
          const method = ALL_PAYMENT_METHODS.find(m => m.id === p);
          return (
            <button key={p} onClick={() => setFilterPayment(p)} style={{
              flexShrink: 0, padding: '8px 16px', borderRadius: '99px', border: '1px solid', cursor: 'pointer',
              fontFamily: 'var(--font)', fontSize: '11px', fontWeight: 700, transition: 'all 0.2s ease',
              background: isSelected ? 'linear-gradient(135deg, var(--gold), var(--gold-light))' : 'rgba(255,255,255,0.02)',
              color: isSelected ? '#0A0C12' : 'var(--text-2)',
              borderColor: isSelected ? 'var(--gold-light)' : 'var(--border)',
              boxShadow: isSelected ? '0 4px 12px rgba(200,150,44,0.25)' : 'none',
            }}>
              {p === 'All' ? '🌐 All Methods' : `${method?.icon} ${method?.label || p}`}
            </button>
          );
        })}
      </div>

      {/* ── Preset Amount filter badges ─────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', marginTop: '2px' }}>
        {[
          { id: 'All', label: '💰 All Amounts' },
          { id: 'under50', label: '💵 Under $50' },
          { id: '50to200', label: '💳 $50 - $200' },
          { id: 'over200', label: '🪙 $200+' },
        ].map(b => {
          const isSelected = filterAmountRange === b.id;
          return (
            <button key={b.id} type="button" onClick={() => setFilterAmountRange(b.id)} style={{
              flexShrink: 0, padding: '7px 14px', borderRadius: '99px', border: '1px solid', cursor: 'pointer',
              fontFamily: 'var(--font)', fontSize: '11px', fontWeight: 700, transition: 'all 0.2s ease',
              background: isSelected ? 'var(--teal-bg)' : 'transparent',
              color: isSelected ? 'var(--teal-light)' : 'var(--text-3)',
              borderColor: isSelected ? 'var(--teal-light)' : 'var(--border)',
              boxShadow: isSelected ? '0 0 10px rgba(0, 212, 170, 0.1)' : 'none',
            }}>
              {b.label}
            </button>
          );
        })}
      </div>

      {/* ── KYC Banner (if not verified) ─────────────────────── */}
      {!kycApproved && (
        <div className="glass" style={{
          background: 'rgba(251,191,36,0.03)', 
          border: '1px solid rgba(251,191,36,0.2)',
          borderLeft: '4px solid #F59E0B',
          borderRadius: '16px', 
          padding: '16px 20px',
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}>
          <div style={{ fontSize: '24px', filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.3))' }}>🛡️</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '14px', color: '#FDE68A', letterSpacing: '-0.01em' }}>
              Identity Verification Required
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-2)', marginTop: '4px', lineHeight: 1.4 }}>
              Post listings and open escrow trades securely. Go to <strong style={{ color: 'var(--gold-light)' }}>Profile → Verify Identity</strong> to submit KYC documents.
            </div>
          </div>
        </div>
      )}

      {/* ── Listings ─────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="card glass fade-in-2" style={{ padding: '60px 24px', textAlign: 'center', border: '1px dashed var(--border-hover)', borderRadius: '24px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 16px', color: 'var(--text-3)' }}>📋</div>
          <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-1)', marginBottom: '6px' }}>No active offers found</div>
          <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0, lineHeight: 1.5, maxWidth: '280px', margin: '0 auto' }}>
            {filterPayment !== 'All' ? `There are currently no listings matching the payment method "${filterPayment}".` : `Be the first one in Addis Ababa to post a ${p2pTab === 'buy' ? 'sell' : 'buy'} offer!`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map(listing => {
            const effectiveRate = listing.customRateETB || rate;
            const isOwnListing = listing.sellerId === user.id;
            const isBuyType = listing.type === 'buy';
            return (
              <div key={listing.id} style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: '16px', padding: '16px',
                display: 'flex', flexDirection: 'column', gap: '12px',
                transition: 'border-color 0.15s ease',
              }}>
                {/* Seller row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: 'var(--gold-bg)', border: `2px solid ${repColor(listing.sellerReputation)}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '16px', color: 'var(--gold-light)',
                    }}>
                      {(listing.sellerName || 'U').charAt(0).toUpperCase()}
                    </div>
                    {/* Green online dot */}
                    <div style={{
                      position: 'absolute', bottom: '0', right: '0',
                      width: '10px', height: '10px', borderRadius: '50%',
                      background: '#10B981', border: '2px solid var(--bg-surface)',
                    }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>@{listing.sellerName}
                      <span style={{ color: '#10B981', marginLeft: '4px', fontSize: '11px' }}>✓</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                      {listing.sellerReputation}% rep · {listing.sellerTotalTrades || 0} trades
                    </div>
                  </div>
                  <span className={`badge ${isBuyType ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '10px' }}>
                    {isBuyType ? 'BUY' : 'SELL'}
                  </span>
                </div>

                {/* Pricing */}
                <div style={{ background: 'var(--bg-elevated)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-1)' }}>
                      ${listing.amountETH.toFixed(2)}
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>
                      ≈ {Math.round(listing.amountETH * effectiveRate).toLocaleString()} ETB
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
                    <span style={{ color: 'var(--text-3)' }}>Rate:</span>
                    <span style={{ fontWeight: 700, color: 'var(--gold-light)' }}>
                      {effectiveRate} ETB / $1
                      {listing.customRateETB && <span style={{ fontSize: '10px', color: 'var(--text-3)', marginLeft: '4px' }}>(seller rate)</span>}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-3)' }}>Limits:</span>
                    <span style={{ fontWeight: 600 }}>
                      {listing.minLimitETB.toLocaleString()} – {listing.maxLimitETB.toLocaleString()} ETB
                    </span>
                  </div>
                </div>

                {/* Payment methods */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {listing.paymentMethods.map(p => {
                    const meta = ALL_PAYMENT_METHODS.find(m => m.id === p);
                    return (
                      <span key={p} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '4px 10px', borderRadius: '99px', fontSize: '10px', fontWeight: 600,
                        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                        color: 'var(--text-2)',
                      }}>
                        {meta?.icon} {meta?.label || p}
                      </span>
                    );
                  })}
                </div>

                {/* CTA */}
                {isOwnListing ? (
                  <div style={{
                    textAlign: 'center', padding: '10px', fontSize: '12px', fontWeight: 600,
                    color: 'var(--gold-light)', background: 'var(--gold-bg)',
                    border: '1px solid rgba(200,150,44,0.2)', borderRadius: '10px',
                  }}>
                    ✓ Your listing
                  </div>
                ) : (
                  <button
                    onClick={() => { setSelectedListing(listing); setShowBuyModal(true); setTradeAmountETH(''); setTradeError(''); }}
                    className="btn btn-gold btn-full"
                    disabled={!kycApproved}
                    style={{ fontSize: '14px', padding: '13px' }}
                  >
                    {kycApproved ? (isBuyType ? 'Sell USD →' : 'Buy USD →') : '🛡️ KYC Required'}
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
                  placeholder={`Available: $${wallet ? (wallet.ethBalance - (wallet.ethLocked || 0)).toFixed(2) : '0.00'} USD`}
                  value={amountETH}
                  onChange={e => setAmountETH(e.target.value)}
                />
                {amountETH && (
                  <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>
                    ≈ {Math.round(parseFloat(amountETH) * rate).toLocaleString()} ETB at admin rate
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
                  {selectedListing.customRateETB || rate} ETB / $1
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                  Limits: {selectedListing.minLimitETB.toLocaleString()} – {selectedListing.maxLimitETB.toLocaleString()} ETB
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
                  placeholder={`Max: $${selectedListing.amountETH.toFixed(2)} USD`}
                  value={tradeAmountETH}
                  onChange={e => setTradeAmountETH(e.target.value)}
                />
              </div>

              {tradeAmountETH && !isNaN(parseFloat(tradeAmountETH)) && (
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-3)' }}>Rate</span>
                    <span style={{ color: 'var(--gold-light)', fontWeight: 600 }}>{selectedListing.customRateETB || rate} ETB/$1</span>
                  </div>
                  <div style={{ height: '1px', background: 'var(--border)', margin: '6px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 800 }}>
                    <span>{selectedListing.type === 'buy' ? 'You Receive:' : 'You Pay:'}</span>
                    <span style={{ color: 'var(--gold-light)' }}>
                      {Math.round(parseFloat(tradeAmountETH) * (selectedListing.customRateETB || rate)).toLocaleString()} ETB
                    </span>
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
