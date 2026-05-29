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

  const [filterPayment, setFilterPayment] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBuyModal, setShowBuyModal]    = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [tradeAmountETH, setTradeAmountETH]   = useState('');
  const [tradeError, setTradeError]           = useState('');
  const [chosenPaymentAccount, setChosenPaymentAccount] = useState(null);

  // Sync selected listing's first payment account as default
  React.useEffect(() => {
    if (selectedListing && selectedListing.paymentAccounts && selectedListing.paymentAccounts.length > 0) {
      setChosenPaymentAccount(selectedListing.paymentAccounts[0]);
    } else {
      setChosenPaymentAccount(null);
    }
  }, [selectedListing]);

  // Create form state
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

  // ── Payment checkbox ─────────────────────────────────────
  const togglePayment = (id) => {
    setSelectedPayments(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  // ── Create listing ────────────────────────────────────────
  const handleCreateListing = async (e) => {
    e.preventDefault();
    if (linkedAccounts.length === 0) {
      alert('Please link at least one of your saved payment accounts.');
      return;
    }
    if (!amountETH || !minLimit || !maxLimit) {
      alert('Please fill in all fields.');
      return;
    }
    const selectedPayments = linkedAccounts.map(a => a.bankName);
    const effectiveRate = useCustomRate && customRate ? parseFloat(customRate) : undefined;
    await createListing(parseFloat(amountETH), parseFloat(minLimit), parseFloat(maxLimit), selectedPayments, effectiveRate, linkedAccounts);
    setAmountETH(''); setMinLimit(''); setMaxLimit('');
    setLinkedAccounts([]); setUseCustomRate(false); setCustomRate('');
    setShowCreateModal(false);
  };

  // ── Open trade ────────────────────────────────────────────
  const handleOpenTrade = async (e) => {
    e.preventDefault();
    setTradeError('');
    const amt = parseFloat(tradeAmountETH);
    if (isNaN(amt) || amt <= 0) { setTradeError('Please enter a valid amount.'); return; }
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
    if (!chosenPaymentAccount && selectedListing.paymentAccounts && selectedListing.paymentAccounts.length > 0) {
      setTradeError('Please select a bank/wallet of the seller to pay to.');
      return;
    }
    const trade = await initiateTrade(selectedListing.id, amt, chosenPaymentAccount);
    if (trade) { setSelectedListing(null); setTradeAmountETH(''); setShowBuyModal(false); }
  };

  // ── Filter listings ───────────────────────────────────────
  const filtered = listings.filter(l =>
    filterPayment === 'All' || l.paymentMethods.includes(filterPayment)
  );

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
          <button onClick={() => setShowCreateModal(true)} className="btn btn-gold" style={{ padding: '10px 16px', fontSize: '13px' }}>
            + Sell USD
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

      {/* ── Payment filter pills ─────────────────────────────── */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', WebkitOverflowScrolling: 'touch' }}>
        {['All', ...ALL_PAYMENT_METHODS.map(m => m.id)].map(p => (
          <button key={p} onClick={() => setFilterPayment(p)} style={{
            flexShrink: 0, padding: '6px 12px', borderRadius: '99px', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font)', fontSize: '11px', fontWeight: 600, transition: 'all 0.15s ease',
            background: filterPayment === p ? 'var(--gold)' : 'var(--bg-elevated)',
            color: filterPayment === p ? '#0A0C12' : 'var(--text-2)',
            boxShadow: filterPayment === p ? '0 2px 8px rgba(200,150,44,0.3)' : 'none',
          }}>
            {p === 'All' ? '🌐 All' : (ALL_PAYMENT_METHODS.find(m => m.id === p)?.icon + ' ' + (ALL_PAYMENT_METHODS.find(m => m.id === p)?.label || p))}
          </button>
        ))}
      </div>

      {/* ── KYC Banner (if not verified) ─────────────────────── */}
      {!kycApproved && (
        <div style={{
          background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)',
          borderRadius: '12px', padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <div style={{ fontSize: '24px' }}>🛡️</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--status-warning-text)' }}>
              Identity Verification Required
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>
              You must complete KYC before buying or selling. Go to Profile → Verify Identity.
            </div>
          </div>
        </div>
      )}

      {/* ── Listings ─────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="card" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>📋</div>
          <div style={{ fontWeight: 700, marginBottom: '4px' }}>No active offers</div>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
            {filterPayment !== 'All' ? `No listings accept ${filterPayment}. Try a different filter.` : 'Be the first to deposit and list a sell offer!'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map(listing => {
            const effectiveRate = listing.customRateETB || rate;
            const isOwnListing = listing.sellerId === user.id;
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
                  <span className="badge badge-success" style={{ fontSize: '10px' }}>SELL</span>
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
                    {kycApproved ? 'Buy USD →' : '🛡️ KYC Required'}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontWeight: 800, fontSize: '18px', margin: 0 }}>Sell USD</h3>
              <button onClick={() => setShowCreateModal(false)} style={{
                width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-elevated)',
                border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}>✕</button>
            </div>

            {/* How it works */}
            <div style={{
              background: 'var(--gold-bg)', border: '1px solid rgba(200,150,44,0.2)',
              borderRadius: '10px', padding: '12px', marginBottom: '20px',
            }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold-light)', marginBottom: '6px' }}>📖 How it works:</div>
              <ol style={{ fontSize: '12px', color: 'var(--text-2)', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>Enter USD amount & set min/max ETB limits</li>
                <li>Your USD will be locked in escrow</li>
                <li>Buyers will contact you and pay ETB</li>
                <li>Release USD after confirming ETB received</li>
              </ol>
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
                <button type="submit" disabled={!user.paymentAccounts || user.paymentAccounts.length === 0} className="btn btn-gold" style={{ flex: 2 }}>Create Listing</button>
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
              <h3 style={{ fontWeight: 800, fontSize: '17px', margin: 0 }}>Buy from @{selectedListing.sellerName}</h3>
              <button onClick={() => { setShowBuyModal(false); setSelectedListing(null); }} style={{
                width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-elevated)',
                border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}>✕</button>
            </div>

            {/* Seller info */}
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
            <div style={{ background: 'var(--gold-bg)', border: '1px solid rgba(200,150,44,0.2)', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold-light)', marginBottom: '6px' }}>📖 Steps:</div>
              <ol style={{ fontSize: '11px', color: 'var(--text-2)', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <li>Enter how much USD you want to buy</li>
                <li>You'll see the exact ETB you need to send</li>
                <li>Open trade → chat with seller privately</li>
                <li>Send ETB → upload receipt → seller releases USD</li>
              </ol>
            </div>

            <form onSubmit={handleOpenTrade} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Amount to Buy (USD)</label>
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
                    <span>You Pay:</span>
                    <span style={{ color: 'var(--gold-light)' }}>
                      {Math.round(parseFloat(tradeAmountETH) * (selectedListing.customRateETB || rate)).toLocaleString()} ETB
                    </span>
                  </div>
                </div>
              )}

              {/* Seller's Payment Accounts Selector */}
              {selectedListing.paymentAccounts && selectedListing.paymentAccounts.length > 0 && (
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
