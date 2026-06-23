import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase';
import './P2PTradePage.css';

// ── Payment methods ──────────────────────────────────────────────
const ALL_PAYMENT_METHODS = [
  { id: 'CBE',              label: 'CBE',            icon: '🏦', bg: 'rgba(122,40,155,0.08)', border: 'rgba(122,40,155,0.25)', text: '#d39eff' },
  { id: 'Telebirr',        label: 'Telebirr',       icon: '📱', bg: 'rgba(0,122,255,0.08)',   border: 'rgba(0,122,255,0.25)',   text: '#64b5f6' },
  { id: 'Dashen Bank',     label: 'Dashen',         icon: '🏦', bg: 'rgba(255,145,0,0.08)',   border: 'rgba(255,145,0,0.25)',   text: '#ffb74d' },
  { id: 'Bank of Abyssinia', label: 'BOA',          icon: '🏦', bg: 'rgba(245,166,35,0.08)',  border: 'rgba(245,166,35,0.25)',  text: '#F5A623' },
  { id: 'Awash Bank',      label: 'Awash',          icon: '🏦', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)',   text: '#ff7676' },
  { id: 'Wegagen Bank',    label: 'Wegagen',        icon: '🏦', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.25)',   text: '#4ade80' },
  { id: 'Nib Bank',        label: 'Nib Bank',       icon: '🏦', bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.06)', text: '#c8c8c8' },
  { id: 'Amhara Bank',     label: 'Amhara',         icon: '🏦', bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.06)', text: '#c8c8c8' },
  { id: 'HelloCash',       label: 'HelloCash',      icon: '💚', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.25)',   text: '#4ade80' },
  { id: 'M-Pesa',          label: 'M-Pesa',         icon: '📲', bg: 'rgba(0,200,150,0.08)',   border: 'rgba(0,200,150,0.25)',   text: '#5dfccb' },
];

const formatTimeAgo = (iso) => {
  if (!iso) return 'Just now';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const StarRating = ({ rating = 5.0 }) => {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  return (
    <span className="p2p-stars">
      {Array.from({ length: 5 }, (_, i) => (
        <i
          key={i}
          className={
            i < full
              ? 'ti ti-star-filled'
              : i === full && hasHalf
              ? 'ti ti-star-half-filled'
              : 'ti ti-star'
          }
          style={{ fontSize: '10px' }}
        />
      ))}
      &nbsp;{Number(rating).toFixed(1)}
    </span>
  );
};

// ── Trader Profile Modal ─────────────────────────────────────────
const TraderProfileModal = ({ traderId, onClose }) => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!traderId) return;
    (async () => {
      const [userRes, ratingsRes, tradesRes] = await Promise.all([
        supabase.from('users').select('id, username, kyc_status').eq('id', traderId).single(),
        supabase.from('trade_ratings').select('*').eq('rated_user_id', traderId),
        supabase.from('trades').select('id, status').or(`buyer_id.eq.${traderId},seller_id.eq.${traderId}`),
      ]);
      const ratings = ratingsRes.data || [];
      const trades = tradesRes.data || [];
      const totalRatings = ratings.length;
      const avgRating = totalRatings ? ratings.reduce((s, r) => s + (r.stars || 0), 0) / totalRatings : 0;
      const positiveRatings = ratings.filter(r => (r.stars || 0) >= 4).length;
      const completedTrades = trades.filter(t => t.status === 'completed').length;
      const disputes = trades.filter(t => t.status === 'disputed').length;
      const breakdown = [5, 4, 3, 2, 1].map(stars => {
        const count = ratings.filter(r => r.stars === stars).length;
        return { stars, count, pct: totalRatings ? Math.round((count / totalRatings) * 100) : 0 };
      });
      setStats({
        username: userRes.data?.username || 'Trader',
        kycApproved: userRes.data?.kyc_status === 'approved',
        avgRating,
        totalRatings,
        positivePercentage: totalRatings ? Math.round((positiveRatings / totalRatings) * 100) : 0,
        completedTrades,
        disputes,
        breakdown,
        reviews: ratings.slice(0, 5).map(r => ({ ...r, _id: r.id, createdAt: r.created_at })),
      });
    })();
  }, [traderId]);

  return (
    <div className="p2p-modal-overlay" onClick={onClose}>
      <div
        className="p2p-trade-modal"
        style={{ maxWidth: 440, borderRadius: 24 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#8b92a8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Trader Reputation</h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8b92a8' }}>✕</button>
        </div>
        {!stats ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#8b92a8' }}>Loading...</div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: '14px 16px', marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(245,166,35,0.12)', border: '2px solid #F5A623', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#F5A623', fontSize: 18 }}>
                {stats.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                  @{stats.username}
                  {stats.kycApproved && <i className="ti ti-discount-check-filled" style={{ color: '#00C896' }} />}
                </div>
                <StarRating rating={stats.avgRating} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Avg Rating', value: `⭐ ${Number(stats.avgRating).toFixed(1)}`, sub: `${stats.totalRatings} ratings`, color: '#F5A623' },
                { label: 'Positive', value: `👍 ${stats.positivePercentage}%`, sub: `${stats.completedTrades} trades done`, color: '#00C896' },
              ].map(s => (
                <div key={s.label} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ fontSize: 10, color: '#8b92a8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#8b92a8', marginTop: 2 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {stats.disputes > 0 && (
              <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#f43f5e', display: 'flex', justifyContent: 'space-between' }}>
                <span>⚠️ Disputes History</span>
                <strong>{stats.disputes} disputes</strong>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rating Breakdown</div>
              {stats.breakdown.map(row => (
                <div key={row.stars} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 6 }}>
                  <span style={{ width: 48, color: '#8b92a8', textAlign: 'right' }}>{row.stars}★</span>
                  <div style={{ flex: 1, height: 7, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${row.pct}%`, height: '100%', background: '#F5A623', borderRadius: 99 }} />
                  </div>
                  <span style={{ width: 28, color: '#8b92a8', textAlign: 'right', fontSize: 11 }}>{row.count}</span>
                </div>
              ))}
            </div>

            {stats.reviews.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Reviews</div>
                {stats.reviews.map(rev => (
                  <div key={rev._id} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: 10, marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: '#F5A623', letterSpacing: 1, fontSize: 12 }}>{'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}</span>
                      <span style={{ fontSize: 10, color: '#8b92a8' }}>{new Date(rev.createdAt).toLocaleDateString()}</span>
                    </div>
                    {rev.comment && <p style={{ margin: '0 0 4px', fontSize: 12.5, fontStyle: 'italic', color: '#e5e5e5' }}>"{rev.comment}"</p>}
    // ── Create Listing Form ──────────────────────────────────────────
const ALL_PAYMENT_METHOD_IDS = ['CBE', 'Telebirr', 'Dashen Bank', 'Bank of Abyssinia', 'Awash Bank', 'Wegagen Bank', 'Nib Bank', 'Amhara Bank', 'HelloCash', 'M-Pesa'];

const CreateListingForm = ({ onClose, onSubmit, isDesktop = false, initialType = 'sell', listings = [], editingId = null, wallet, systemSettings }) => {
  const { user } = useAuth();
  const rate = systemSettings?.etbRatePerDollar ?? 190;

  const editTarget = editingId ? listings.find(l => l.id === editingId) : null;

  const [createType, setCreateType] = useState(editTarget?.type || initialType);
  const [amount, setAmount] = useState(editTarget?.amount_eth?.toString() ?? '');
  const [minLimit, setMinLimit] = useState(editTarget?.min_limit_etb?.toString() ?? '');
  const [maxLimit, setMaxLimit] = useState(editTarget?.max_limit_etb?.toString() ?? '');
  const [useCustomRate, setUseCustomRate] = useState(!!editTarget?.custom_rate_etb);
  const [customRate, setCustomRate] = useState(editTarget?.custom_rate_etb?.toString() ?? '');
  const [description, setDescription] = useState(editTarget?.description ?? '');
  const [paymentWindow, setPaymentWindow] = useState(editTarget?.payment_window?.toString() ?? '15');
  const [allowThirdParty, setAllowThirdParty] = useState(!!editTarget?.allow_third_party);

  // Inline payment details for sell listings
  // Pre-fill from profile's first saved account if available
  const firstSavedAccount = user?.payment_accounts?.[0];
  const [payBank, setPayBank] = useState(() => {
    if (editTarget?.payment_accounts?.[0]?.bankName) return editTarget.payment_accounts[0].bankName;
    return firstSavedAccount?.bankName || 'CBE';
  });
  const [payHolder, setPayHolder] = useState(() => {
    if (editTarget?.payment_accounts?.[0]?.holderName) return editTarget.payment_accounts[0].holderName;
    return firstSavedAccount?.holderName || '';
  });
  const [payNumber, setPayNumber] = useState(() => {
    if (editTarget?.payment_accounts?.[0]?.accountNumber) return editTarget.payment_accounts[0].accountNumber;
    return firstSavedAccount?.accountNumber || '';
  });
  const [payNote, setPayNote] = useState('');

  // If user has multiple saved accounts, let them pick one to pre-fill
  const [selectedProfileAccount, setSelectedProfileAccount] = useState(null);

  const effRate = useCustomRate && customRate ? parseFloat(customRate) : rate;

  const handleSelectProfileAccount = (acc) => {
    setSelectedProfileAccount(acc.id);
    setPayBank(acc.bankName || 'CBE');
    setPayHolder(acc.holderName || '');
    setPayNumber(acc.accountNumber || '');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || !minLimit || !maxLimit) { alert('Please fill in all required fields.'); return; }
    if (parseFloat(amount) < 0.01) { alert('Minimum amount is $0.01'); return; }

    // For sell listings, account holder name and account number are required
    if (createType === 'sell') {
      if (!payHolder.trim()) { alert('Account holder name is required for sell listings.'); return; }
      if (!payNumber.trim()) { alert('Account number / phone number is required for sell listings.'); return; }
    }

    // Build payment account object for sell listings
    const inlineAccount = createType === 'sell' ? [{
      id: `inline_${Date.now()}`,
      bankName: payBank,
      holderName: payHolder.trim(),
      accountNumber: payNumber.trim(),
      note: payNote.trim() || null,
    }] : [];

    const selectedPayments = createType === 'sell'
      ? [payBank]
      : ['CBE', 'Telebirr', 'Dashen Bank', 'Awash Bank', 'Bank of Abyssinia'];

    onSubmit({
      editingId,
      createType,
      amount: parseFloat(amount),
      minLimit: parseFloat(minLimit),
      maxLimit: parseFloat(maxLimit),
      selectedPayments,
      useCustomRate,
      customRate: useCustomRate && customRate ? parseFloat(customRate) : undefined,
      linkedAccounts: inlineAccount,
      description,
      paymentWindow: parseInt(paymentWindow),
      allowThirdParty,
    });
  };

  const inputStyle = {
    width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff',
    fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif',
  };

  const formBody = (
    <form className="p2p-form" onSubmit={handleSubmit}>
      {/* Type toggle */}
      <div className="p2p-field">
        <label className="p2p-field-label">I want to…</label>
        <div className="p2p-type-toggle" style={{ opacity: editingId ? 0.5 : 1, pointerEvents: editingId ? 'none' : 'auto' }}>
          <button type="button" className={`p2p-type-btn ${createType === 'sell' ? 'active-sell' : ''}`} onClick={() => setCreateType('sell')}>📈 Sell USD</button>
          <button type="button" className={`p2p-type-btn ${createType === 'buy' ? 'active-buy' : ''}`} onClick={() => setCreateType('buy')}>📉 Buy USD</button>
        </div>
      </div>

      {/* Info banner */}
      <div className={`p2p-how-banner ${createType === 'buy' ? 'buy-color' : 'sell-color'}`}>
        <div className={`p2p-how-title ${createType === 'buy' ? 'buy-color' : 'sell-color'}`}>📖 How it works</div>
        {createType === 'buy' ? (
          <ol className="p2p-how-list">
            <li>Set USD amount you want to buy</li>
            <li>Your balance is NOT locked upfront</li>
            <li>Sellers respond and lock USD in escrow</li>
            <li>Transfer ETB → release USD</li>
          </ol>
        ) : (
          <ol className="p2p-how-list">
            <li>Enter USD amount &amp; set ETB limits</li>
            <li>Your USD gets locked in escrow</li>
            <li>Buyers pay ETB to your account below</li>
            <li>Confirm receipt → release USD</li>
          </ol>
        )}
      </div>

      {/* Amount */}
      <div className="p2p-field">
        <label className="p2p-field-label">USD Amount to {createType === 'sell' ? 'Sell' : 'Buy'}</label>
        <div className="p2p-input-wrap">
          <input className="p2p-input mono" type="number" step="0.01" min="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required />
          <span className="p2p-input-unit">USD</span>
        </div>
        {createType === 'sell' && wallet && (
          <button type="button" onClick={() => setAmount(((wallet.eth_balance ?? 0) - (wallet.eth_locked ?? 0)).toFixed(2))}
            style={{ alignSelf: 'flex-start', background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.25)', color: '#F5A623', borderRadius: 7, padding: '3px 10px', fontSize: 10, fontWeight: 800, cursor: 'pointer', marginTop: 4 }}>
            MAX
          </button>
        )}
        {amount && <span style={{ fontSize: 11, color: '#8b92a8', marginTop: 2 }}>≈ {Math.round(parseFloat(amount) * effRate).toLocaleString()} ETB total</span>}
      </div>

      {/* ETB Limits */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="p2p-field">
          <label className="p2p-field-label">Min Limit (ETB)</label>
          <div className="p2p-input-wrap">
            <input className="p2p-input" type="number" placeholder="e.g. 500" value={minLimit} onChange={e => setMinLimit(e.target.value)} required />
          </div>
        </div>
        <div className="p2p-field">
          <label className="p2p-field-label">Max Limit (ETB)</label>
          <div className="p2p-input-wrap">
            <input className="p2p-input" type="number" placeholder="e.g. 50000" value={maxLimit} onChange={e => setMaxLimit(e.target.value)} required />
          </div>
        </div>
      </div>

      {/* Custom Rate */}
      <div className="p2p-field">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Custom ETB Rate</div>
            <div style={{ fontSize: 11, color: '#8b92a8' }}>Set your own rate (default: {rate} ETB/$)</div>
          </div>
          <div className={`p2p-toggle-switch ${useCustomRate ? 'on' : 'off'}`} onClick={() => setUseCustomRate(!useCustomRate)}>
            <div className="p2p-toggle-thumb" />
          </div>
        </div>
        {useCustomRate && (
          <div className="p2p-input-wrap" style={{ marginTop: 8 }}>
            <input className="p2p-input mono" type="number" step="0.01" placeholder={`${rate}`} value={customRate} onChange={e => setCustomRate(e.target.value)} />
            <span className="p2p-input-unit">ETB/$</span>
          </div>
        )}
      </div>

      {/* Payment window */}
      <div className="p2p-field">
        <label className="p2p-field-label">Payment Window</label>
        <select className="p2p-input" value={paymentWindow} onChange={e => setPaymentWindow(e.target.value)} style={{ appearance: 'none' }}>
          {['15', '30', '45', '60'].map(v => <option key={v} value={v} style={{ background: '#141827' }}>{v} minutes</option>)}
        </select>
      </div>

      {/* ── Seller Payment Details (sell listings only) ─────────── */}
      {createType === 'sell' && (
        <div className="p2p-field" style={{ background: 'rgba(245,166,35,0.04)', border: '1px solid rgba(245,166,35,0.18)', borderRadius: 14, padding: '16px 14px' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#F5A623', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
            <i className="ti ti-building-bank" style={{ fontSize: 16 }} />
            Your Payment Details <span style={{ color: '#EF4444', fontSize: 11 }}>*required</span>
          </div>
          <div style={{ fontSize: 11, color: '#8b92a8', marginBottom: 12, lineHeight: 1.5 }}>
            Buyers will send ETB to this account. Make sure it is correct.
          </div>

          {/* Quick-fill from saved profile accounts */}
          {user?.payment_accounts?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#8b92a8', marginBottom: 7, fontWeight: 600 }}>Quick-fill from saved accounts:</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {user.payment_accounts.map(acc => (
                  <button key={acc.id} type="button"
                    onClick={() => handleSelectProfileAccount(acc)}
                    style={{
                      padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      background: selectedProfileAccount === acc.id ? 'rgba(245,166,35,0.2)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${selectedProfileAccount === acc.id ? 'rgba(245,166,35,0.5)' : 'rgba(255,255,255,0.08)'}`,
                      color: selectedProfileAccount === acc.id ? '#F5A623' : '#8b92a8',
                    }}>
                    {acc.bankName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Payment method selector */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: '#8b92a8', fontWeight: 600, display: 'block', marginBottom: 5 }}>
              Payment Method <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <select value={payBank} onChange={e => setPayBank(e.target.value)}
              style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
              {ALL_PAYMENT_METHOD_IDS.map(id => (
                <option key={id} value={id} style={{ background: '#141827' }}>{id}</option>
              ))}
            </select>
          </div>

          {/* Account holder name */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: '#8b92a8', fontWeight: 600, display: 'block', marginBottom: 5 }}>
              Account Holder Name <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="Full name exactly as on your bank account"
              value={payHolder}
              onChange={e => setPayHolder(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {/* Account number */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: '#8b92a8', fontWeight: 600, display: 'block', marginBottom: 5 }}>
              Account Number / Phone Number <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 0912345678 or 1000123456789"
              value={payNumber}
              onChange={e => setPayNumber(e.target.value)}
              required
              style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em' }}
            />
          </div>

          {/* Optional note */}
          <div>
            <label style={{ fontSize: 11, color: '#8b92a8', fontWeight: 600, display: 'block', marginBottom: 5 }}>
              Note for Buyer <span style={{ fontSize: 10, color: '#5a6275' }}>(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Send from personal account only"
              value={payNote}
              onChange={e => setPayNote(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
      )}

      {/* Allow 3rd party */}
      <div className="p2p-field">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Allow 3rd Party Pay</div>
            <div style={{ fontSize: 11, color: '#8b92a8' }}>Accept payments from others</div>
          </div>
          <div className={`p2p-toggle-switch ${allowThirdParty ? 'on' : 'off'}`} onClick={() => setAllowThirdParty(!allowThirdParty)}>
            <div className="p2p-toggle-thumb" />
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="p2p-field">
        <label className="p2p-field-label">Terms &amp; Notes</label>
        <textarea className="p2p-input" rows={3} placeholder="e.g. Only personal accounts. Fast release." value={description} onChange={e => setDescription(e.target.value)} style={{ resize: 'none', lineHeight: 1.5 }} />
      </div>

      <button type="submit" className="p2p-btn-post">
        {editingId ? '✏️ Update Listing' : '🚀 Post Advertisement'}
      </button>
    </form>
  );

  if (isDesktop) {
    return (
      <div className="p2p-create-panel">
        <div className="p2p-create-header">
          <div className="p2p-create-title">Create <span style={{ background: 'linear-gradient(135deg, #F5A623, #FFD700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Listing</span></div>
          <div className="p2p-pro-badge"><div className="p2p-pro-dot" /> Pro Mode</div>
        </div>
        {formBody}
      </div>
    );
  }

  return (
    <div className="p2p-sheet-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="p2p-sheet">
        <div className="p2p-sheet-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
            {editingId ? 'Edit Listing' : (createType === 'sell' ? 'Post Sell Ad' : 'Post Buy Ad')}
          </h3>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#8b92a8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
        </div>
        {formBody}
      </div>
    </div>
  );
};

// ── Trade Confirm Modal ──────────────────────────────────────────
const TradeConfirmModal = ({ listing, onClose, onConfirm, systemSettings, wallet }) => {
  const { user } = useAuth();
  const rate = systemSettings?.etbRatePerDollar ?? 190;
  const standardRate = listing.type === 'buy' ? (systemSettings?.etbRatePerDollarSell ?? rate) : rate;
  const effRate = listing.custom_rate_etb || standardRate;
  const minP2p = 0.01;

  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState('');
  const [chosenAccount, setChosenAccount] = useState(() => {
    if (listing.type === 'buy') return user?.payment_accounts?.[0] ?? null;
    return listing.payment_accounts?.[0] ?? null;
  });
  const [error, setError] = useState('');

  const totalEtb = amount ? parseFloat(amount) * effRate : 0;

  const handleNext = (e) => {
    e.preventDefault();
    setError('');
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < minP2p) { setError(`Minimum is $${minP2p.toFixed(2)}`); return; }
    if (amt > listing.amount_eth) { setError(`Max available: $${listing.amount_eth.toFixed(2)}`); return; }
    if (totalEtb < listing.min_limit_etb || totalEtb > listing.max_limit_etb) {
      setError(`Total (${Math.round(totalEtb).toLocaleString()} ETB) must be between ${listing.min_limit_etb.toLocaleString()}–${listing.max_limit_etb.toLocaleString()} ETB.`); return;
    }
    if (listing.type === 'buy' && !chosenAccount) { setError('Select your payment account.'); return; }
    setStep(2);
  };

  const isBuy = listing.type === 'buy';

  return (
    <div className="p2p-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="p2p-trade-modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: isBuy ? 'rgba(0,200,150,0.12)' : 'rgba(245,166,35,0.12)', border: `2px solid ${isBuy ? '#00C896' : '#F5A623'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: isBuy ? '#00C896' : '#F5A623' }}>
              {(listing.seller_name || 'T').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>@{listing.seller_name}</div>
              <StarRating rating={listing.sellerAverageRating || 5.0} />
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#8b92a8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 14, padding: '12px 16px', marginBottom: 18, display: 'flex', justifyContent: 'space-between' }}>
          <div><div style={{ fontSize: 9, color: '#8b92a8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Rate</div>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 800, color: isBuy ? '#00FFC2' : '#F5A623' }}>{effRate.toFixed(2)} <span style={{ fontSize: 11, color: '#8b92a8', fontFamily: 'Inter, sans-serif' }}>ETB/$</span></span>
          </div>
          <div style={{ textAlign: 'right' }}><div style={{ fontSize: 9, color: '#8b92a8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Available</div>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700, color: '#fff' }}>${listing.amount_eth.toFixed(2)}</span>
          </div>
        </div>

        {step === 1 ? (
          <form onSubmit={handleNext} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="p2p-field">
              <label className="p2p-field-label">USD Amount to {isBuy ? 'Sell' : 'Buy'}</label>
              <div className="p2p-input-wrap">
                <input className="p2p-input mono" type="number" step="0.01" min="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
                <span className="p2p-input-unit">USD</span>
              </div>
              {amount && !isNaN(parseFloat(amount)) && (
                <span style={{ fontSize: 11.5, color: '#8b92a8', marginTop: 2 }}>≈ {Math.round(totalEtb).toLocaleString()} ETB</span>
              )}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: '#8b92a8', marginBottom: 4 }}>Limit</div>
              <div style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#fff' }}>
                {listing.min_limit_etb.toLocaleString()} – {listing.max_limit_etb.toLocaleString()} ETB
              </div>
            </div>

            {/* Payment account selector */}
            {listing.type === 'sell' && listing.payment_accounts?.length > 0 && (
              <div className="p2p-field">
                <label className="p2p-field-label">Pay to seller's account</label>
                {listing.payment_accounts.map((acc, i) => (
                  <div key={i} onClick={() => setChosenAccount(acc)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: `1px solid ${chosenAccount?.id === acc.id ? 'rgba(245,166,35,0.4)' : 'rgba(255,255,255,0.06)'}`, background: chosenAccount?.id === acc.id ? 'rgba(245,166,35,0.07)' : 'transparent', cursor: 'pointer', marginTop: 4, transition: 'all 0.2s' }}>
                    <i className="ti ti-building-bank" style={{ color: '#F5A623' }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{acc.bankName}</div>
                      <div style={{ fontSize: 11, color: '#8b92a8', fontFamily: 'JetBrains Mono, monospace' }}>{acc.accountNumber}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {listing.type === 'buy' && user?.payment_accounts?.length > 0 && (
              <div className="p2p-field">
                <label className="p2p-field-label">Receive ETB to your account</label>
                {user.payment_accounts.map((acc, i) => (
                  <div key={i} onClick={() => setChosenAccount(acc)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: `1px solid ${chosenAccount?.id === acc.id ? 'rgba(0,200,150,0.4)' : 'rgba(255,255,255,0.06)'}`, background: chosenAccount?.id === acc.id ? 'rgba(0,200,150,0.07)' : 'transparent', cursor: 'pointer', marginTop: 4, transition: 'all 0.2s' }}>
                    <i className="ti ti-building-bank" style={{ color: '#00C896' }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{acc.bankName}</div>
                      <div style={{ fontSize: 11, color: '#8b92a8', fontFamily: 'JetBrains Mono, monospace' }}>{acc.accountNumber}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && <div style={{ fontSize: 12.5, color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '9px 12px' }}>⚠️ {error}</div>}

            <button type="submit" className="p2p-btn-post">Next: Review →</button>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, overflow: 'hidden' }}>
              {[
                ['You', isBuy ? 'Sell' : 'Buy', `$${parseFloat(amount).toFixed(2)} USD`],
                ['Rate', '', `${effRate.toFixed(2)} ETB/$`],
                ['Total ETB', '', `${Math.round(totalEtb).toLocaleString()} ETB`],
                ['Escrow', '', 'Protected 🔒'],
                ['Window', '', `${listing.payment_window || 15} min`],
              ].map(([label, , value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
                  <span style={{ color: '#8b92a8' }}>{label}</span>
                  <span style={{ fontWeight: 700, color: '#fff', fontFamily: label === 'Rate' || label === 'Total ETB' ? 'JetBrains Mono, monospace' : 'Inter, sans-serif' }}>{value}</span>
                </div>
              ))}
            </div>

            {chosenAccount && (
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: '#8b92a8', marginBottom: 6 }}>Payment Account</div>
                {[['Bank', chosenAccount.bankName], ['Holder', chosenAccount.holderName], ['Account', chosenAccount.accountNumber]].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: '#8b92a8' }}>{k}</span>
                    <span style={{ fontWeight: 600, color: k === 'Account' ? '#F5A623' : '#fff', fontFamily: k === 'Account' ? 'JetBrains Mono, monospace' : 'inherit' }}>{v}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ background: isBuy ? 'rgba(0,200,150,0.07)' : 'rgba(245,166,35,0.07)', border: `1px solid ${isBuy ? 'rgba(0,200,150,0.2)' : 'rgba(245,166,35,0.2)'}`, borderRadius: 12, padding: '10px 14px', fontSize: 12, color: isBuy ? '#a0eedb' : '#ffd580', lineHeight: 1.55 }}>
              {isBuy
                ? 'ℹ️ The buyer will transfer ETB to your account. USD is locked in escrow until you release it.'
                : `⚠️ Transfer exactly ${Math.round(totalEtb).toLocaleString()} ETB to the seller's account within ${listing.payment_window || 15} minutes.`}
            </div>

            {error && <div style={{ fontSize: 12.5, color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '9px 12px' }}>⚠️ {error}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: 13, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Back</button>
              <button onClick={() => onConfirm(parseFloat(amount), chosenAccount)} className="p2p-btn-post" style={{ flex: 2 }}>
                {isBuy ? 'Confirm & Proceed' : 'Confirm & Transfer'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main P2P Trade Page ──────────────────────────────────────────
const P2PTradePage = () => {
  const { user, listings, wallet, createListing, initiateTrade, systemSettings, cancelListing, updateListing } = useAuth();
  const rate = systemSettings?.etbRatePerDollar ?? 190;
  const kycApproved = user?.kyc_status === 'approved' || user?.username === 'biruk';

  const [tab, setTab] = useState(() => localStorage.getItem(`ethioswap_p2p_tab_${user?.id}`) || 'buy');
  const [filterPayment, setFilterPayment] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('rate_asc');
  const [kycDismissed, setKycDismissed] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [createInitialType, setCreateInitialType] = useState('sell');

  const [tradeListing, setTradeListing] = useState(null);
  const [viewingTraderId, setViewingTraderId] = useState(null);

  const setTabPersist = (v) => {
    setTab(v);
    localStorage.setItem(`ethioswap_p2p_tab_${user?.id}`, v);
  };

  const openCreate = (type) => {
    if (!kycApproved) { alert('Please verify your identity first. Go to Profile → Verify Identity.'); return; }
    setCreateInitialType(type);
    setEditingId(null);
    setShowCreate(true);
  };

  const openEdit = (listing) => {
    setEditingId(listing.id);
    setCreateInitialType(listing.type || 'sell');
    setShowCreate(true);
  };

  const handleCreateSubmit = useCallback(async ({ editingId, createType, amount, minLimit, maxLimit, selectedPayments, useCustomRate, customRate, linkedAccounts, description, paymentWindow, allowThirdParty }) => {
    if (editingId) {
      await updateListing(editingId, amount, minLimit, maxLimit, useCustomRate && customRate ? customRate : undefined, description, paymentWindow, allowThirdParty, []);
    } else {
      await createListing(amount, minLimit, maxLimit, selectedPayments, useCustomRate && customRate ? customRate : undefined, linkedAccounts, createType, description, paymentWindow, allowThirdParty, []);
    }
    setShowCreate(false);
    setEditingId(null);
  }, [createListing, updateListing]);

  const handleTradeConfirm = useCallback(async (amount, chosenAccount) => {
    await initiateTrade(tradeListing.id, amount, chosenAccount);
    setTradeListing(null);
    setTimeout(() => window.dispatchEvent(new CustomEvent('ethioswap_navigate', { detail: 'trades' })), 150);
  }, [initiateTrade, tradeListing]);

  const filtered = listings.filter(l => {
    const matchesType = tab === 'buy' ? (l.type === 'sell' || !l.type) : l.type === 'buy';
    const matchesStatus = l.status === 'active';
    const matchesPayment = filterPayment === 'All' || l.payment_methods?.includes(filterPayment);
    const term = searchQuery.toLowerCase().trim();
    const matchesSearch = !term || (l.seller_name || '').toLowerCase().includes(term) || (l.payment_methods || []).some(p => p.toLowerCase().includes(term));
    return matchesType && matchesStatus && matchesPayment && matchesSearch;
  }).sort((a, b) => {
    const rA = a.custom_rate_etb || rate;
    const rB = b.custom_rate_etb || rate;
    if (sortBy === 'rate_asc') return rA - rB;
    if (sortBy === 'rate_desc') return rB - rA;
    if (sortBy === 'reputation') return (b.sellerReputation ?? 0) - (a.sellerReputation ?? 0);
    if (sortBy === 'trades_desc') return (b.sellerTotalTrades ?? 0) - (a.sellerTotalTrades ?? 0);
    return 0;
  });

  const ownListings = listings.filter(l => l.seller_id === user?.id && l.status !== 'cancelled');

  return (
    <div className="p2p-page">
      <div className="p2p-shell">
        {/* ── Main ─────────────────────────────────────────── */}
        <div className="p2p-main">
          {/* Stats Row */}
          <div className="p2p-stats-row" style={{ marginBottom: 20 }}>
            <div className="p2p-glass p2p-stat-card">
              <div className="p2p-stat-label">Best Buy Rate</div>
              <div className="p2p-stat-value">{rate}</div>
              <span className="p2p-stat-meta teal"><i className="ti ti-circle-filled" style={{ fontSize: 7 }} /> Live ETB/$</span>
            </div>
            <div className="p2p-glass p2p-stat-card">
              <div className="p2p-stat-label">Best Sell Rate</div>
              <div className="p2p-stat-value">{systemSettings?.etbRatePerDollarSell ?? rate}</div>
              <span className="p2p-stat-meta gold"><i className="ti ti-circle-filled" style={{ fontSize: 7 }} /> Hot Market</span>
            </div>
            <div className="p2p-glass p2p-stat-card" style={{ display: 'none', gridColumn: 'span 2' }}>
              <div className="p2p-stat-label">Platform Fee</div>
              <div className="p2p-stat-value white" style={{ fontSize: 26 }}>0%</div>
              <span className="p2p-stat-meta teal">Free forever</span>
            </div>
          </div>

          {/* Toggle + Post + Search */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
              <div className="p2p-toggle" style={{ flex: 1 }}>
                <button className={`p2p-toggle-btn ${tab === 'buy' ? 'active-buy' : ''}`} onClick={() => setTabPersist('buy')}>Buy USDT</button>
                <button className={`p2p-toggle-btn ${tab === 'sell' ? 'active-sell' : ''}`} onClick={() => setTabPersist('sell')}>Sell USDT</button>
              </div>
              <button
                onClick={() => openCreate(tab === 'buy' ? 'sell' : 'buy')}
                style={{ padding: '0 18px', borderRadius: 12, background: 'linear-gradient(135deg, #F5A623, #FFD700)', border: 'none', color: '#0A0E1A', fontWeight: 800, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 14px rgba(245,166,35,0.25)' }}
                title="Post Ad"
              >
                +
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <div className="p2p-search-wrap">
                <i className="ti ti-search p2p-search-icon" />
                <input className="p2p-search-input" type="text" placeholder="Search traders or payment method..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '11px 12px', background: '#141827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'Inter, sans-serif', cursor: 'pointer', flexShrink: 0 }}>
                <option value="rate_asc" style={{ background: '#141827' }}>📈 Best Rate</option>
                <option value="rate_desc" style={{ background: '#141827' }}>📉 Worst Rate</option>
                <option value="reputation" style={{ background: '#141827' }}>⭐ Reputation</option>
                <option value="trades_desc" style={{ background: '#141827' }}>🔄 Most Trades</option>
              </select>
            </div>
          </div>

          {/* Payment filter chips */}
          <div className="p2p-chips" style={{ marginBottom: 20 }}>
            <button className={`p2p-chip ${filterPayment === 'All' ? 'active' : ''}`} onClick={() => setFilterPayment('All')}>🌐 All</button>
            {ALL_PAYMENT_METHODS.map(m => (
              <button key={m.id} className={`p2p-chip ${filterPayment === m.id ? 'active' : ''}`} onClick={() => setFilterPayment(m.id)}>{m.icon} {m.label}</button>
            ))}
          </div>

          {/* KYC Banner */}
          {!kycApproved && !kycDismissed && (
            <div className="p2p-kyc-banner" style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 20, marginTop: 2 }}>⚠️</div>
              <div style={{ flex: 1 }}>
                <div className="p2p-kyc-text-title">Identity Verification Required</div>
                <div className="p2p-kyc-text-sub">
                  <a href="#profile" style={{ color: '#F5A623', fontWeight: 600 }}>Profile → Verify Identity</a> to post listings and trade.
                </div>
              </div>
              <button onClick={() => setKycDismissed(true)} style={{ background: 'none', border: 'none', color: '#8b92a8', cursor: 'pointer', fontSize: 14, padding: 4 }}>✕</button>
            </div>
          )}

          {/* My Ads section */}
          {ownListings.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#8b92a8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>My Active Ads</div>
              <div className="p2p-grid">
                {ownListings.map((listing, idx) => (
                  <ListingCard key={listing.id} listing={listing} idx={idx} isOwn={true} isBuy={listing.type === 'buy'} effRate={listing.custom_rate_etb || rate} onEdit={() => openEdit(listing)} onCancel={async () => { if (window.confirm('Cancel this listing?')) await cancelListing(listing.id); }} onViewTrader={() => setViewingTraderId(listing.seller_id)} />
                ))}
              </div>
            </div>
          )}

          {/* Listings grid */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#8b92a8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {tab === 'buy' ? 'Sellers Offering USDT' : 'Buyers Wanting USDT'} <span style={{ color: '#F5A623' }}>({filtered.length})</span>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="p2p-empty">
                <div className="p2p-empty-icon">📋</div>
                <h3>No Active Offers</h3>
                <p>Be the first to post an offer!</p>
                <button onClick={() => openCreate(tab === 'buy' ? 'sell' : 'buy')} className="p2p-btn-post" style={{ marginTop: 20, width: 'auto', padding: '12px 28px', display: 'inline-block' }}>+ Post Listing</button>
              </div>
            ) : (
              <div className="p2p-grid">
                {filtered.map((listing, idx) => {
                  const standardRate = listing.type === 'buy' ? (systemSettings?.etbRatePerDollarSell ?? rate) : rate;
                  const effRate = listing.custom_rate_etb || standardRate;
                  const isBuy = listing.type === 'buy';
                  return (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      idx={idx}
                      isOwn={false}
                      isBuy={isBuy}
                      effRate={effRate}
                      kycApproved={kycApproved}
                      onTrade={() => { if (!kycApproved) { alert('Please verify your identity first.'); return; } setTradeListing(listing); }}
                      onViewTrader={() => setViewingTraderId(listing.seller_id)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Desktop Sidebar ───────────────────────────────── */}
        <div className="p2p-sidebar">
          <CreateListingForm
            isDesktop={true}
            onClose={() => { setShowCreate(false); setEditingId(null); }}
            onSubmit={handleCreateSubmit}
            initialType={createInitialType}
            listings={listings}
            editingId={editingId}
            wallet={wallet}
            systemSettings={systemSettings}
          />

          <div className="p2p-glass p2p-safety-card" style={{ marginTop: 14 }}>
            <div className="p2p-safety-title"><i className="ti ti-shield-check" /> Safety Reminders</div>
            <div className="p2p-safety-item"><div className="p2p-safety-dot" /><span>Never release crypto before confirming ETB in your bank app.</span></div>
            <div className="p2p-safety-item"><div className="p2p-safety-dot" /><span>Verify the sender's name matches the KYC name on EthioSwap.</span></div>
            <div className="p2p-safety-item"><div className="p2p-safety-dot" /><span>All trades are protected by EthioSwap's escrow system.</span></div>
          </div>
        </div>
      </div>

      {/* ── Mobile FAB ───────────────────────────────────────── */}
      <div style={{ position: 'fixed', bottom: 88, right: 20, zIndex: 200 }} className="show-mobile-only" id="p2p-fab-container">
        <button className="p2p-fab" onClick={() => openCreate(tab === 'buy' ? 'sell' : 'buy')}>
          <i className="ti ti-plus" />
        </button>
      </div>

      {/* ── Modals ───────────────────────────────────────────── */}
      {showCreate && (
        <CreateListingForm
          isDesktop={false}
          onClose={() => { setShowCreate(false); setEditingId(null); }}
          onSubmit={handleCreateSubmit}
          initialType={createInitialType}
          listings={listings}
          editingId={editingId}
          wallet={wallet}
          systemSettings={systemSettings}
        />
      )}

      {tradeListing && (
        <TradeConfirmModal
          listing={tradeListing}
          onClose={() => setTradeListing(null)}
          onConfirm={handleTradeConfirm}
          systemSettings={systemSettings}
          wallet={wallet}
        />
      )}

      {viewingTraderId && (
        <TraderProfileModal traderId={viewingTraderId} onClose={() => setViewingTraderId(null)} />
      )}

      <style>{`
        @media (min-width: 1024px) {
          #p2p-fab-container { display: none !important; }
        }
        @keyframes p2p-card-in {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

// ── Listing Card ─────────────────────────────────────────────────
const ListingCard = ({ listing, idx, isOwn, isBuy, effRate, kycApproved, onTrade, onEdit, onCancel, onViewTrader }) => {
  const avgRating = listing.sellerAverageRating || 5.0;
  const completionPct = listing.sellerPositivePercentage || 100;
  const totalTrades = listing.sellerTotalTrades || 0;

  return (
    <div
      className={`p2p-card ${isBuy ? 'buying' : ''}`}
      style={{ animation: `p2p-card-in 0.4s cubic-bezier(0.16,1,0.3,1) ${idx * 40}ms both` }}
    >
      {/* Header */}
      <div className="p2p-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div className="p2p-avatar-wrap" onClick={onViewTrader} style={{ cursor: 'pointer' }}>
            {listing.seller_profile_pic ? (
              <img src={listing.seller_profile_pic} alt="" className="p2p-avatar" />
            ) : (
              <div className="p2p-avatar">{(listing.seller_name || 'U').charAt(0).toUpperCase()}</div>
            )}
            <div className="p2p-avatar-online" />
          </div>
          <div className="p2p-trader-info">
            <div className="p2p-trader-name">
              <span onClick={onViewTrader} style={{ cursor: 'pointer' }} onMouseEnter={e => e.target.style.color = '#F5A623'} onMouseLeave={e => e.target.style.color = '#fff'}>
                @{listing.seller_name}
              </span>
              {(listing.seller_kyc_status === 'approved' || listing.seller_kyc_status === 'verified') && (
                <i className="ti ti-discount-check-filled p2p-verified-icon" title="KYC Verified" />
              )}
              {listing.isSellerVerifiedTrader && <span className="p2p-badge-pro">★ Pro</span>}
            </div>
            <div className="p2p-rep-row">
              <StarRating rating={avgRating} />
              <span className="p2p-rep-text">{completionPct}% ✓</span>
              <span className="p2p-rep-text">• {totalTrades.toLocaleString()} trades</span>
            </div>
          </div>
        </div>
        <span className={`p2p-type-badge ${isBuy ? 'buy' : 'sell'}`}>{isBuy ? 'BUYING' : 'SELLING'}</span>
      </div>

      {/* Rate Block */}
      <div className="p2p-rate-block">
        <div>
          <div className="p2p-rate-label">Exchange Rate</div>
          <div className={`p2p-rate-value ${isBuy ? 'buy-color' : ''}`}>
            {effRate.toFixed(2)} <span className="p2p-rate-unit">ETB/$</span>
          </div>
        </div>
        <div className="p2p-divider-v" />
        <div style={{ textAlign: 'right' }}>
          <div className="p2p-rate-label">Available</div>
          <div className="p2p-vol-value">${(listing.amount_eth ?? 0).toFixed(2)}</div>
        </div>
      </div>

      {/* Limits */}
      <div className="p2p-limits-row">
        <span className="p2p-limit-label">Limit</span>
        <span className="p2p-limit-value">{listing.min_limit_etb?.toLocaleString()} – {listing.max_limit_etb?.toLocaleString()} ETB</span>
      </div>

      {/* Payment chips */}
      <div className="p2p-payment-chips">
        {(listing.payment_methods || []).map(p => {
          const meta = ALL_PAYMENT_METHODS.find(m => m.id === p);
          return (
            <span key={p} className="p2p-payment-chip" style={{ background: meta?.bg || 'rgba(255,255,255,0.03)', border: `1px solid ${meta?.border || 'rgba(255,255,255,0.06)'}`, color: meta?.text || '#c8c8c8' }}>
              {meta?.icon || '🏦'} {meta?.label || p}
            </span>
          );
        })}
      </div>

      {/* Meta */}
      <div className="p2p-card-meta">
        <span>⏱️ {listing.payment_window || 15} min window</span>
        <span style={{ color: listing.allow_third_party ? '#00C896' : '#EF4444', fontWeight: 600 }}>
          {listing.allow_third_party ? '✓ 3rd Party OK' : '✕ No 3rd Party'}
        </span>
        <span>🕒 {formatTimeAgo(listing.created_at)}</span>
      </div>

      {/* CTA */}
      {isOwn ? (
        <div className="p2p-own-btns">
          <button className="p2p-btn-edit" onClick={onEdit}>✏️ Edit</button>
          <button className="p2p-btn-cancel" onClick={onCancel}>🚫 Cancel</button>
        </div>
      ) : (
        <button
          className={`p2p-btn-trade ${isBuy ? 'teal' : 'gold'}`}
          disabled={!kycApproved}
          onClick={onTrade}
        >
          {kycApproved
            ? (isBuy ? '💵 Sell USD Now →' : '🪙 Buy USD Now →')
            : '🛡️ Complete KYC to Trade'}
        </button>
      )}
    </div>
  );
};

export default P2PTradePage;
