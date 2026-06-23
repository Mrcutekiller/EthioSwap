import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from 'react-i18next';
import TradeChat from './TradeChat.jsx';
import {
  Star, CheckCircle, AlertTriangle, XCircle, Clock, X,
  Upload, Lock, Unlock, MessageSquare, AlertCircle, Copy, CreditCard, Shield,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

/* ─── Copy Button ──────────────────────────────────────── */
const CopyBtn = ({ text, label = 'Copy' }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <button onClick={copy} style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      background: copied ? 'rgba(0,200,150,0.12)' : 'rgba(255,255,255,0.05)',
      border: `1px solid ${copied ? 'rgba(0,200,150,0.3)' : 'var(--border)'}`,
      borderRadius: '6px', color: copied ? 'var(--teal)' : 'var(--muted)',
      fontSize: '10px', padding: '3px 8px', cursor: 'pointer',
      transition: 'all 0.2s', fontWeight: 600, fontFamily: 'var(--font)',
    }}>
      {copied ? <CheckCircle size={10} /> : <Copy size={10} />}
      {copied ? 'Copied!' : label}
    </button>
  );
};

/* ─── Step Progress Bar ────────────────────────────────── */
const StepBar = ({ steps, current }) => (
  <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: '20px' }}>
    {steps.map((step, i) => {
      const done = i < current;
      const active = i === current;
      return (
        <React.Fragment key={i}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '50%',
              background: done ? 'var(--teal)' : active ? 'rgba(245,166,35,0.12)' : 'var(--surface2)',
              border: `2px solid ${done ? 'var(--teal)' : active ? 'var(--gold)' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: done ? '#fff' : active ? 'var(--gold)' : 'var(--muted)',
              fontSize: '11px', fontWeight: 700,
              boxShadow: active ? '0 0 14px rgba(245,166,35,0.2)' : done ? '0 0 10px rgba(0,200,150,0.15)' : 'none',
              transition: 'all 0.3s',
            }}>
              {done ? <CheckCircle size={13} /> : i + 1}
            </div>
            <span style={{
              fontSize: '9px', marginTop: '4px', fontWeight: 600,
              color: active ? 'var(--gold)' : done ? 'var(--teal)' : 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center',
            }}>{step}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              height: '2px', flex: 1, marginBottom: '14px',
              background: done ? 'var(--teal)' : 'var(--border)',
              transition: 'all 0.3s',
            }} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

/* ─── Status Badge ─────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const map = {
    payment_pending: { label: 'Awaiting Payment', color: 'var(--gold)',   bg: 'rgba(245,166,35,0.1)',  border: 'rgba(245,166,35,0.25)',  icon: '⏳' },
    payment_sent:    { label: 'Payment Sent',     color: 'var(--teal)',   bg: 'rgba(0,200,150,0.1)',   border: 'rgba(0,200,150,0.25)',   icon: '✓' },
    completed:       { label: 'Completed',        color: 'var(--teal)',   bg: 'rgba(0,200,150,0.1)',   border: 'rgba(0,200,150,0.25)',   icon: '🏆' },
    disputed:        { label: 'Disputed',         color: 'var(--danger)', bg: 'rgba(255,77,77,0.1)',   border: 'rgba(255,77,77,0.25)',   icon: '⚠️' },
    cancelled:       { label: 'Cancelled',        color: 'var(--muted)',  bg: 'var(--surface2)',       border: 'var(--border)',          icon: '✕' },
  };
  const c = map[status] || map.cancelled;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '4px 12px', borderRadius: '999px',
      background: c.bg, border: `1px solid ${c.border}`,
      color: c.color, fontSize: '11px', fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      {c.icon} {c.label}
    </span>
  );
};

/* ─── Rating Modal ─────────────────────────────────────── */
const RatingModal = ({ trade, ratedUserId, onClose, onSubmit }) => {
  const [stars, setStars] = useState(5);
  const [hovered, setHovered] = useState(0);
  const [review, setReview] = useState('');
  const [reason, setReason] = useState('');
  const partnerName = trade.buyer_id === ratedUserId ? trade.buyer_name : trade.seller_name;

  const submit = () => {
    if (stars < 3 && !reason) { alert('Please select a reason for the low rating.'); return; }
    onSubmit(stars, review, reason);
  };

  const starLabel = ['', '👎 Terrible', '😕 Poor', '😐 Average', '👍 Good', '⭐ Excellent!'];

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '16px', animation: 'fadeIn 0.2s ease',
    }}>
      <div style={{
        maxWidth: '420px', width: '100%', padding: '32px',
        background: 'var(--surface)', borderRadius: '20px',
        border: '1px solid var(--border)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        textAlign: 'center', animation: 'slideUp 0.3s cubic-bezier(0.32,0.94,0.6,1)',
      }}>
        <div style={{
          width: '60px', height: '60px', borderRadius: '50%',
          background: 'rgba(0,200,150,0.1)', border: '2px solid rgba(0,200,150,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          boxShadow: '0 0 24px rgba(0,200,150,0.12)',
        }}>
          <CheckCircle size={28} color="var(--teal)" />
        </div>

        <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', margin: '0 0 6px' }}>Trade Complete! 🎉</h3>
        <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px' }}>
          Rate your experience with <strong style={{ color: 'var(--gold)' }}>@{partnerName}</strong>
        </p>

        {/* Avatar */}
        <div style={{
          width: '52px', height: '52px', borderRadius: '50%',
          background: 'rgba(245,166,35,0.1)', border: '2px solid rgba(245,166,35,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px', fontWeight: 800, color: 'var(--gold)', margin: '0 auto 20px',
        }}>
          {typeof partnerName === 'string' && partnerName.trim() ? partnerName.trim().charAt(0).toUpperCase() : 'U'}
        </div>

        {/* Stars */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '10px' }}>
          {[1, 2, 3, 4, 5].map(s => (
            <Star key={s} size={36}
              fill={s <= (hovered || stars) ? '#F5A623' : 'none'}
              color={s <= (hovered || stars) ? '#F5A623' : 'var(--border)'}
              style={{ cursor: 'pointer', transition: 'all 0.15s', filter: s <= (hovered || stars) ? 'drop-shadow(0 0 5px rgba(245,166,35,0.45))' : 'none' }}
              onClick={() => setStars(s)}
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(0)}
            />
          ))}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--gold)', fontWeight: 600, marginBottom: '20px' }}>{starLabel[hovered || stars]}</div>

        {stars < 3 && (
          <div style={{ marginBottom: '16px', textAlign: 'left' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--danger)', display: 'block', marginBottom: '6px' }}>
              Why the low rating? (Required)
            </label>
            <select value={reason} onChange={e => setReason(e.target.value)} style={{
              width: '100%', padding: '10px 14px', borderRadius: '10px',
              background: 'var(--bg)', border: '1px solid rgba(255,77,77,0.3)',
              color: 'var(--text)', fontSize: '13px', outline: 'none', fontFamily: 'var(--font)',
            }}>
              <option value="">-- Select a reason --</option>
              <option value="Slow response or payment delay">Extremely slow response / payment delay</option>
              <option value="Unprofessional or rude communication">Unprofessional or rude communication</option>
              <option value="Stale or expired payment details">Stale / expired payment details provided</option>
              <option value="Suspicious behavior or payment mismatch">Suspicious behavior / payment mismatch</option>
              <option value="Other">Other</option>
            </select>
            {reason === 'Other' && (
              <input type="text" placeholder="Specify reason..." onChange={e => setReason(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px', marginTop: '8px',
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: '13px', outline: 'none', fontFamily: 'var(--font)',
                }}
              />
            )}
          </div>
        )}

        <textarea placeholder="Write a review (optional, max 200 chars)..." maxLength={200}
          value={review} onChange={e => setReview(e.target.value)}
          style={{
            width: '100%', height: '76px', padding: '12px', borderRadius: '10px',
            background: 'var(--bg)', border: '1px solid var(--border)',
            color: 'var(--text)', fontSize: '13px', resize: 'none', outline: 'none',
            fontFamily: 'var(--font)', marginBottom: '20px', boxSizing: 'border-box',
          }}
        />

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1, height: '44px', borderRadius: '12px', fontSize: '14px' }}>Skip</button>
          <button onClick={submit} className="btn btn-gold" style={{ flex: 2, height: '44px', borderRadius: '12px', fontSize: '14px', fontWeight: 700 }}>⭐ Submit Rating</button>
        </div>
      </div>
    </div>
  );
};

/* ─── Dispute Evidence Console ─────────────────────────── */
const DisputeConsole = ({ trade, user, uploadDisputeEvidence, setError, setSuccess }) => {
  const [dispute, setDispute] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!trade?.id) return;
    supabase.from('disputes').select('*').eq('trade_id', trade.id).single().then(({ data }) => setDispute(data));
  }, [trade?.id]);

  if (!dispute) return null;

  const isBuyer = user.id === trade.buyer_id;
  const mine = isBuyer ? (dispute.buyer_evidence || []) : (dispute.seller_evidence || []);
  const theirs = isBuyer ? (dispute.seller_evidence || []) : (dispute.buyer_evidence || []);

  const onFile = async e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Max 5 MB per file'); return; }
    if (mine.length >= 3) { setError('Max 3 evidence files'); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async ev => {
      try { await uploadDisputeEvidence(trade.id, ev.target.result); setSuccess('Evidence uploaded!'); }
      catch (err) { setError(err.message); }
      finally { setUploading(false); }
    };
    reader.onerror = () => { setError('File read failed'); setUploading(false); };
  };

  const thumbStyle = { width: '50px', height: '50px', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden', display: 'block' };

  return (
    <div style={{
      background: 'rgba(255,77,77,0.04)', border: '1px solid rgba(255,77,77,0.18)',
      borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
          background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AlertTriangle size={17} color="var(--danger)" />
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>Escrow Dispute Active</div>
          <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px', lineHeight: 1.4 }}>
            Upload proof of payment (receipt screenshot) for admin review.
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {/* Mine */}
        <div style={{ background: 'var(--surface2)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>My Evidence ({mine.length}/3)</span>
            {mine.length < 3 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--gold)', cursor: 'pointer', fontWeight: 600 }}>
                <Upload size={11} /> Upload
                <input type="file" hidden accept="image/*" onChange={onFile} disabled={uploading} />
              </label>
            )}
          </div>
          {uploading && <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px' }}>Uploading…</div>}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {mine.map((src, i) => <a href={src} target="_blank" rel="noopener noreferrer" key={i} style={thumbStyle}><img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="ev" /></a>)}
            {mine.length === 0 && !uploading && <span style={{ fontSize: '11px', color: 'var(--muted)' }}>No evidence uploaded yet</span>}
          </div>
        </div>
        {/* Theirs */}
        <div style={{ background: 'var(--surface2)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '10px' }}>Counterparty ({theirs.length}/3)</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {theirs.map((src, i) => <a href={src} target="_blank" rel="noopener noreferrer" key={i} style={thumbStyle}><img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="ev" /></a>)}
            {theirs.length === 0 && <span style={{ fontSize: '11px', color: 'var(--muted)' }}>No evidence from partner</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Info Row (payment detail) ────────────────────────── */
const InfoRow = ({ label, value, mono, children }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
    <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 500 }}>{label}</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {value && <span style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 700, fontFamily: mono ? 'JetBrains Mono, monospace' : 'var(--font)' }}>{value}</span>}
      {children}
    </div>
  </div>
);

/* ─── Alert Box ────────────────────────────────────────── */
const AlertBox = ({ icon: Icon, color, children }) => (
  <div style={{
    background: `${color}0d`, border: `1px solid ${color}28`,
    borderRadius: '10px', padding: '12px 16px',
    display: 'flex', gap: '10px', alignItems: 'flex-start',
  }}>
    {Icon && <Icon size={14} color={color} style={{ flexShrink: 0, marginTop: '1px' }} />}
    <div style={{ fontSize: '11.5px', color: `${color}cc`, lineHeight: 1.5 }}>{children}</div>
  </div>
);

/* ════════════════════════════════════════════════════════
   MAIN TRADE ROOM
════════════════════════════════════════════════════════ */
const TradeRoom = ({ tradeId, setPage }) => {
  const { user, trades, markTradeAsPaid, releaseEscrow, cancelTrade, openDispute, uploadDisputeEvidence, submitRating, setError, setSuccess } = useAuth();
  const [selectedId, setSelectedId] = useState(tradeId);
  const [showRating, setShowRating] = useState(false);
  const [skipped, setSkipped] = useState({});
  const [timer, setTimer] = useState('');
  const [releasing, setReleasing] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);

  const isDirectTrade = !!tradeId; // Came directly from trade detail page

  const trade = trades.find(t => t.id === selectedId);

  // Auto-select first or use passed tradeId
  useEffect(() => {
    if (!selectedId && trades.length > 0) setSelectedId(trades[0].id);
    if (tradeId && tradeId !== selectedId) setSelectedId(tradeId);
  }, [trades, tradeId]);

  // Rating prompt
  useEffect(() => {
    if (trade?.status === 'completed' && trade.ratingGiven === null && !skipped[trade.id]) {
      const age = Date.now() - (trade.completed_at ? new Date(trade.completed_at).getTime() : Date.now());
      setShowRating(age < 48 * 60 * 60 * 1000);
    } else {
      setShowRating(false);
    }
  }, [trade?.id, trade?.status, trade?.ratingGiven, skipped]);

  // Countdown timer
  useEffect(() => {
    if (!trade || trade.status === 'completed' || trade.status === 'cancelled') { setTimer(''); return; }
    const id = setInterval(() => {
      const diff = new Date(trade.created_at).getTime() + 30 * 60000 - Date.now();
      if (diff <= 0) { setTimer('Expired'); clearInterval(id); }
      else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimer(`${m}:${s < 10 ? '0' : ''}${s}`);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [trade]);

  const handlePaid    = async () => { if (!window.confirm('Confirm you have sent the payment?')) return; await markTradeAsPaid(trade.id); };
  const handleRelease = async () => {
    if (!window.confirm('Confirm you received the ETB? This releases USDT to the buyer.')) return;
    setReleasing(true);
    try { await releaseEscrow(trade.id); setSuccess('USDT released successfully!'); }
    catch (e) { setError(e.message); }
    finally { setTimeout(() => setReleasing(false), 1500); }
  };
  const handleCancel  = async () => { if (!window.confirm('Cancel this trade?')) return; await cancelTrade(trade.id); };
  const handleDispute = async () => {
    const elapsed = Date.now() - new Date(trade.created_at).getTime();
    if (elapsed < 30 * 60000) { alert(`Wait ${Math.ceil((30 * 60000 - elapsed) / 60000)} more min(s) before disputing.`); return; }
    const r = prompt('Reason for dispute?');
    if (r) await openDispute(trade.id, r);
  };
  const handleRate = async (stars, review, lowRatingReason) => {
    try { await submitRating(trade.id, stars, review, lowRatingReason); setShowRating(false); }
    catch (e) { setError(e.message); }
  };

  const rate = trade?.rate_etb || 190;
  const isBuyer = trade ? user.id === trade.buyer_id : false;
  let paymentAcc = null;
  if (trade?.payment_method) {
    try {
      const parsed = JSON.parse(trade.payment_method);
      paymentAcc = {
        bankName: parsed.bankName || parsed.method || 'N/A',
        holderName: parsed.holderName || parsed.holder || 'Seller Account',
        accountNumber: parsed.accountNumber || parsed.account || 'N/A'
      };
    }
    catch {
      paymentAcc = { bankName: trade.payment_method, holderName: 'Seller Account', accountNumber: 'N/A' };
    }
  }

  const stepIndex = { payment_pending: 0, payment_sent: 1, completed: 3 }[trade?.status] ?? 0;

  /* ── Card shared style ─────────────────────────────────── */
  const card = (extra = {}) => ({
    background: 'var(--surface)', borderRadius: '16px',
    border: '1px solid var(--border)', ...extra,
  });

  /* ── Empty state ─────────────────────────────────────── */
  if (trades.length === 0) {
    return (
      <div style={{
        ...card(), padding: '48px 24px', textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
      }}>
        <div style={{ fontSize: '40px' }}>📋</div>
        <div>
          <h3 style={{ color: 'var(--text)', margin: '0 0 6px', fontSize: '18px', fontWeight: 700 }}>No Active Trades</h3>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: '13px' }}>Go to the P2P Marketplace to start trading</p>
        </div>
        <button className="btn btn-gold" style={{ borderRadius: '12px', padding: '10px 24px' }}
          onClick={() => window.dispatchEvent(new CustomEvent('ethioswap_navigate', { detail: 'p2p' }))}>
          Browse P2P Marketplace →
        </button>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes blink   { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        .tr-card-btn { transition: all 0.18s; }
        .tr-card-btn:hover { transform: translateY(-1px); }
        .tr-sidebar-item { transition: all 0.18s; cursor: pointer; }
        .tr-sidebar-item:hover { border-color: rgba(245,166,35,0.25) !important; background: rgba(245,166,35,0.03) !important; }
        .trade-room-grid { display: grid; grid-template-columns: 272px 1fr; gap: 16px; min-height: calc(100vh - 140px); }
        @media (max-width: 768px) { .trade-room-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div className="trade-room-grid">

        {/* ── SIDEBAR ─────────────────────────────────────── */}
        <div style={{ ...card(), padding: '14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>My Trades</span>
            <span style={{
              background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)',
              color: 'var(--gold)', fontSize: '10px', fontWeight: 700,
              padding: '2px 8px', borderRadius: '99px',
            }}>{trades.length}</span>
          </div>

          {trades.map(tr => {
            const sel = selectedId === tr.id;
            const partnerPic = user.id === tr.buyer_id ? tr.seller_profile_pic : tr.buyer_profile_pic;
            const partnerName = user.id === tr.buyer_id ? tr.seller_name : tr.buyer_name;
            const dotColor = tr.status === 'completed' ? 'var(--teal)' : tr.status === 'disputed' ? 'var(--danger)' : 'var(--gold)';
            const shortStatus = { payment_pending: 'Pending', payment_sent: 'Paid', completed: 'Done', disputed: 'Dispute', cancelled: 'Cancelled' }[tr.status] || tr.status;
            return (
              <div key={tr.id} className="tr-sidebar-item" onClick={() => setSelectedId(tr.id)}
                style={{
                  padding: '11px 12px', borderRadius: '12px',
                  background: sel ? 'rgba(245,166,35,0.06)' : 'var(--surface2)',
                  border: `1px solid ${sel ? 'rgba(245,166,35,0.3)' : 'var(--border)'}`,
                  boxShadow: sel ? '0 4px 16px rgba(245,166,35,0.06)' : 'none',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(245,166,35,0.08)',
                    border: `2px solid ${sel ? 'rgba(245,166,35,0.4)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: 700, color: 'var(--gold)', overflow: 'hidden',
                  }}>
                    {partnerPic ? <img src={partnerPic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (typeof partnerName === 'string' && partnerName.trim() ? partnerName.trim().charAt(0).toUpperCase() : 'U')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      @{partnerName}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '1px' }}>${tr.amount_eth.toFixed(2)} USDT</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: dotColor, boxShadow: `0 0 5px ${dotColor}` }} />
                    <span style={{ fontSize: '9px', color: dotColor, fontWeight: 700, textTransform: 'uppercase' }}>{shortStatus}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── MAIN PANEL ─────────────────────────────────── */}
        {trade ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative', overflow: 'hidden' }}>

            {/* Releasing overlay */}
            {releasing && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(11,14,26,0.97)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                zIndex: 50, borderRadius: '16px', backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s',
              }}>
                <div style={{ width: '52px', height: '52px', border: '4px solid var(--border)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '16px' }} />
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--gold)' }}>Releasing USDT…</span>
                <span style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>Unlocking escrow node</span>
              </div>
            )}

            {/* ── Trade header ── */}
            <div style={{ ...card(), padding: '20px 22px' }}>
              {/* Partner + status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '46px', height: '46px', borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                    background: 'rgba(245,166,35,0.08)', border: '2px solid rgba(245,166,35,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '17px', fontWeight: 800, color: 'var(--gold)',
                  }}>
                    {(isBuyer ? trade.seller_profile_pic : trade.buyer_profile_pic)
                      ? <img src={isBuyer ? trade.seller_profile_pic : trade.buyer_profile_pic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (typeof (isBuyer ? trade.seller_name : trade.buyer_name) === 'string' && (isBuyer ? trade.seller_name : trade.buyer_name).trim() ? (isBuyer ? trade.seller_name : trade.buyer_name).trim().charAt(0).toUpperCase() : 'U')}
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Trading with</div>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text)', marginTop: '2px' }}>
                      @{isBuyer ? trade.seller_name : trade.buyer_name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '1px' }}>
                      {isBuyer ? 'Seller (has USDT)' : 'Buyer (sending ETB)'}
                    </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  onClick={() => setShowChatModal(true)} 
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '6px', 
                      background: 'rgba(245, 166, 35, 0.1)', border: '1px solid rgba(245, 166, 35, 0.25)', 
                      borderRadius: '10px', color: '#F5A623', padding: '8px 14px', 
                      fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                      transition: 'all 0.2s ease', fontFamily: 'inherit'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245, 166, 35, 0.18)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245, 166, 35, 0.1)'; }}
                  >
                    <MessageSquare size={14} /> Messages
                  </button>
                  <StatusBadge status={trade.status} />
                </div>
              </div>

              {/* Step bar */}
              <StepBar steps={['Awaiting Payment', 'Payment Sent', 'Confirming', 'Complete']} current={stepIndex} />

              {/* Trade summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  { label: 'USD Amount', value: `$${trade.amount_eth.toFixed(2)}`, color: 'var(--gold)' },
                  { label: 'ETB Amount', value: `${Math.round(trade.amount_eth * rate).toLocaleString()} ETB`, color: 'var(--teal)' },
                  { label: 'Rate Used',  value: `${rate} ETB/$`, color: 'var(--muted)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: 'var(--surface2)', borderRadius: '10px', padding: '11px 14px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '9px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{label}</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color, marginTop: '4px', fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Timer */}
              {timer && trade.status !== 'completed' && trade.status !== 'cancelled' && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginTop: '14px', padding: '10px 14px', borderRadius: '10px',
                  background: timer === 'Expired' ? 'rgba(255,77,77,0.06)' : 'rgba(245,166,35,0.05)',
                  border: `1px solid ${timer === 'Expired' ? 'rgba(255,77,77,0.2)' : 'rgba(245,166,35,0.15)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: 'var(--muted)' }}>
                    <Clock size={13} color={timer === 'Expired' ? 'var(--danger)' : 'var(--gold)'} />
                    Payment Window Remaining
                  </div>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '15px', fontWeight: 800, color: timer === 'Expired' ? 'var(--danger)' : 'var(--gold)' }}>
                    {timer}
                  </span>
                </div>
              )}

              {/* Trade ref */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Trade ID:</span>
                <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace' }}>ES-{trade.id.substring(0, 8).toUpperCase()}</span>
                <CopyBtn text={`ES-${trade.id.substring(0, 8).toUpperCase()}`} />
              </div>
            </div>

            {/* ── Escrow badge ── */}
            {trade.status !== 'completed' && trade.status !== 'cancelled' && (
              <div style={{
                background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.18)',
                borderRadius: '12px', padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: '12px',
              }}>
                <Lock size={15} color="var(--gold)" />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold)' }}>Escrow Protected</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '1px' }}>
                    ${trade.amount_eth.toFixed(2)} USDT locked until trade completes
                  </div>
                </div>
              </div>
            )}

            {/* ── COMPLETED VIEW ── */}
            {trade.status === 'completed' && (
              <div style={{ ...card({ background: 'rgba(0,200,150,0.04)', border: '1px solid rgba(0,200,150,0.2)' }), padding: '32px', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '14px' }}>🏆</div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', margin: '0 0 6px' }}>Trade Completed!</h3>
                <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '0 0 24px' }}>
                  {isBuyer ? `You received $${trade.amount_eth.toFixed(2)} USDT` : `You received ${Math.round(trade.amount_eth * rate).toLocaleString()} ETB`}
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button className="btn btn-gold tr-card-btn" style={{ borderRadius: '12px' }}
                    onClick={() => window.dispatchEvent(new CustomEvent('ethioswap_navigate', { detail: 'history' }))}>
                    View in History
                  </button>
                  {trade.ratingGiven === null && (
                    <button className="btn btn-ghost tr-card-btn" style={{ borderRadius: '12px' }} onClick={() => setShowRating(true)}>
                      ⭐ Rate Trade
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── ACTIVE STATES ── */}
            {trade.status !== 'completed' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                {/* BUYER — payment_pending */}
                {isBuyer && trade.status === 'payment_pending' && (
                  <div style={{ ...card(), padding: '22px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--gold)', animation: 'blink 1.6s infinite' }} />
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>Send Payment to Seller</span>
                    </div>

                    {/* Payment card */}
                    <div style={{ background: 'var(--surface2)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px' }}>
                        <CreditCard size={13} color="var(--gold)" />
                        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bank Transfer Details</span>
                      </div>
                      {paymentAcc ? (
                        <>
                          <InfoRow label="Bank / Platform" value={paymentAcc.bankName}>
                            <CopyBtn text={paymentAcc.bankName} />
                          </InfoRow>
                          <InfoRow label="Account Holder" value={paymentAcc.holderName}>
                            <CopyBtn text={paymentAcc.holderName} />
                          </InfoRow>
                          <InfoRow label="Account Number" mono>
                            <span style={{ fontSize: '15px', color: 'var(--gold)', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>{paymentAcc.accountNumber}</span>
                            <CopyBtn text={paymentAcc.accountNumber} />
                          </InfoRow>
                          <InfoRow label="Amount to Send">
                            <span style={{ fontSize: '15px', color: 'var(--teal)', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>
                              {Math.round(trade.amount_eth * rate).toLocaleString()} ETB
                            </span>
                            <CopyBtn text={Math.round(trade.amount_eth * rate).toString()} />
                          </InfoRow>
                        </>
                      ) : (
                        <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Payment to: {trade.payment_method}</div>
                      )}
                    </div>

                    <AlertBox icon={AlertCircle} color="#F5A623">
                      <strong>Important:</strong> Transfer exactly <strong>{Math.round(trade.amount_eth * rate).toLocaleString()} ETB</strong> using your banking app.
                      Click "I Have Sent Payment" only after the transfer is confirmed. Do NOT close this window.
                    </AlertBox>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                      <button className="btn btn-gold tr-card-btn" onClick={handlePaid}
                        style={{ flex: 1, height: '48px', borderRadius: '12px', fontSize: '14px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <CheckCircle size={15} /> I Have Sent Payment
                      </button>
                      <button className="tr-card-btn" onClick={handleCancel}
                        style={{ padding: '0 16px', height: '48px', borderRadius: '12px', background: 'rgba(255,77,77,0.06)', border: '1px solid rgba(255,77,77,0.2)', color: 'var(--danger)', fontWeight: 600, fontSize: '13px', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <XCircle size={13} /> Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* BUYER — payment_sent */}
                {isBuyer && trade.status === 'payment_sent' && (
                  <div style={{ ...card({ border: '1px solid rgba(0,200,150,0.2)' }), padding: '28px', textAlign: 'center' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', margin: '0 auto 16px', background: 'rgba(0,200,150,0.08)', border: '2px solid rgba(0,200,150,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle size={24} color="var(--teal)" />
                    </div>
                    <h3 style={{ color: 'var(--text)', margin: '0 0 6px', fontSize: '17px', fontWeight: 800 }}>Payment Sent!</h3>
                    <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '0 0 20px', lineHeight: 1.5 }}>
                      Waiting for <strong style={{ color: 'var(--text)' }}>@{trade.seller_name}</strong> to verify the ETB and release your USDT.
                    </p>
                    <div style={{ background: 'var(--surface2)', borderRadius: '10px', padding: '11px 14px', fontSize: '12px', color: 'var(--muted)', marginBottom: '18px' }}>
                      ⏳ Seller will release escrow once payment is confirmed. This may take a few minutes.
                    </div>
                    <button className="tr-card-btn" onClick={handleDispute}
                      style={{ padding: '9px 18px', borderRadius: '10px', background: 'rgba(255,77,77,0.06)', border: '1px solid rgba(255,77,77,0.2)', color: 'var(--danger)', fontWeight: 600, fontSize: '13px', fontFamily: 'var(--font)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangle size={13} /> Open Dispute
                    </button>
                  </div>
                )}

                {/* SELLER — payment_pending */}
                {!isBuyer && trade.status === 'payment_pending' && (
                  <div style={{ ...card(), padding: '22px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--gold)', animation: 'blink 2s infinite' }} />
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>Waiting for Buyer's Payment</span>
                    </div>

                    <div style={{ background: 'var(--surface2)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)', marginBottom: '14px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Your Receiving Account</div>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
                        Buyer <strong style={{ color: 'var(--text)' }}>@{trade.buyer_name}</strong> will send{' '}
                        <strong style={{ color: 'var(--teal)', fontFamily: 'JetBrains Mono, monospace' }}>
                          {Math.round(trade.amount_eth * rate).toLocaleString()} ETB
                        </strong>{' '}to your account.
                      </p>
                      {paymentAcc && (
                        <div style={{ marginTop: '10px', padding: '9px 12px', borderRadius: '8px', background: 'var(--bg, #0B0E1A)', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--muted)' }}>
                          <strong style={{ color: 'var(--text)' }}>{paymentAcc.bankName}</strong> · {paymentAcc.accountNumber}
                        </div>
                      )}
                    </div>

                    <AlertBox icon={Shield} color="#00C896">
                      You'll be notified when the buyer sends ETB. <strong>Do NOT release USDT</strong> until you verify funds in your account!
                    </AlertBox>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                      <div style={{ flex: 1, height: '48px', borderRadius: '12px', background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: 'var(--muted)', gap: '7px' }}>
                        <Clock size={13} /> Waiting for Buyer…
                      </div>
                      <button className="tr-card-btn" onClick={handleCancel}
                        style={{ padding: '0 16px', height: '48px', borderRadius: '12px', background: 'rgba(255,77,77,0.06)', border: '1px solid rgba(255,77,77,0.2)', color: 'var(--danger)', fontWeight: 600, fontSize: '13px', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <XCircle size={13} /> Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* SELLER — payment_sent */}
                {!isBuyer && trade.status === 'payment_sent' && (
                  <div style={{ ...card({ border: '1px solid rgba(0,200,150,0.2)' }), padding: '22px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                      <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle size={15} color="var(--teal)" />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>Buyer Marked as Paid</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '1px' }}>Verify ETB has arrived in your account</div>
                      </div>
                    </div>

                    <div style={{ background: 'var(--surface2)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)', marginBottom: '14px' }}>
                      <h3 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>Verify & Release USDT</h3>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
                        Check your bank/wallet for{' '}
                        <strong style={{ color: 'var(--teal)', fontFamily: 'JetBrains Mono, monospace' }}>
                          {Math.round(trade.amount_eth * rate).toLocaleString()} ETB
                        </strong>{' '}from <strong style={{ color: 'var(--text)' }}>@{trade.buyer_name}</strong>.
                      </p>
                    </div>

                    <AlertBox icon={AlertTriangle} color="#FF4D4D">
                      Only release USDT after you <strong>physically see the ETB</strong> in your account. Once released, it <strong>cannot be reversed</strong>.
                    </AlertBox>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                      <button className="tr-card-btn" onClick={handleRelease}
                        style={{
                          flex: 2, height: '48px', borderRadius: '12px', border: 'none', fontFamily: 'var(--font)',
                          background: 'var(--teal)', color: '#023026', fontWeight: 800, fontSize: '14px', cursor: 'pointer',
                          boxShadow: '0 4px 18px rgba(0,200,150,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        }}>
                        <Unlock size={15} /> Release USDT to Buyer
                      </button>
                      <button className="tr-card-btn" onClick={handleDispute}
                        style={{ flex: 1, height: '48px', borderRadius: '12px', background: 'rgba(255,77,77,0.06)', border: '1px solid rgba(255,77,77,0.2)', color: 'var(--danger)', fontWeight: 600, fontSize: '13px', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <AlertTriangle size={13} /> Dispute
                      </button>
                    </div>
                  </div>
                )}

                {/* Dispute console */}
                {trade.status === 'disputed' && (
                  <DisputeConsole trade={trade} user={user} uploadDisputeEvidence={uploadDisputeEvidence} setError={setError} setSuccess={setSuccess} />
                )}
              </div>
            )}
          </div>
        ) : (
          <div style={{ ...card(), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '14px' }}>
            Select a trade to view details
          </div>
        )}
      </div>

      {/* Rating modal */}
      {showRating && trade && (
        <RatingModal
          trade={trade}
          ratedUserId={user.id === trade.buyer_id ? trade.seller_id : trade.buyer_id}
          onClose={() => { setSkipped(p => ({ ...p, [trade.id]: true })); setShowRating(false); }}
          onSubmit={handleRate}
        />
      )}

      {/* Chat modal overlay */}
      {showChatModal && trade && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(11, 14, 26, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#141827', border: '1px solid #1E2640',
            borderRadius: '20px', width: '600px', maxWidth: '100%',
            height: '80vh', display: 'flex', flexDirection: 'column',
            overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.6)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid #1E2640',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#0D1117'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={16} color="#F5A623" />
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>
                  Chat with @{isBuyer ? trade.seller_name : trade.buyer_name}
                </span>
              </div>
              <button 
                onClick={() => setShowChatModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: 'none',
                  color: '#8A9BB8', padding: '6px', borderRadius: '50%',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = '#8A9BB8'}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              <TradeChat 
                tradeId={trade.id} 
                sellerId={trade.seller_id} 
                buyerId={trade.buyer_id} 
                tradeStatus={trade.status} 
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TradeRoom;
