import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from 'react-i18next';
import TradeChat from './TradeChat.jsx';
import { Star, Shield, CreditCard, CheckCircle, AlertTriangle, XCircle, Clock, Upload, FileImage, Copy, ChevronRight, ArrowRight, Lock, Unlock, MessageSquare, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Logo from './Logo.jsx';

// ─── Animated Copy Button ─────────────────────────────────────
const CopyButton = ({ text, label }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        background: copied ? 'rgba(0,200,150,0.15)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${copied ? 'rgba(0,200,150,0.3)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: '6px', color: copied ? '#00C896' : '#a0aec0',
        fontSize: '10px', padding: '3px 8px', cursor: 'pointer',
        transition: 'all 0.2s ease', fontWeight: 600,
        fontFamily: 'var(--font)',
      }}
    >
      {copied ? <CheckCircle size={10} /> : <Copy size={10} />}
      {copied ? 'Copied!' : (label || 'Copy')}
    </button>
  );
};

// ─── Step Indicator ───────────────────────────────────────────
const StepIndicator = ({ steps, currentStep }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: '20px' }}>
    {steps.map((step, idx) => {
      const isActive = idx === currentStep;
      const isDone = idx < currentStep;
      return (
        <React.Fragment key={idx}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: isDone ? '#00C896' : isActive ? 'rgba(245,166,35,0.15)' : 'rgba(255,255,255,0.04)',
              border: `2px solid ${isDone ? '#00C896' : isActive ? '#F5A623' : 'rgba(255,255,255,0.1)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isDone ? '#fff' : isActive ? '#F5A623' : '#5a6375',
              fontSize: '11px', fontWeight: 700,
              transition: 'all 0.3s ease',
              boxShadow: isActive ? '0 0 16px rgba(245,166,35,0.25)' : isDone ? '0 0 12px rgba(0,200,150,0.2)' : 'none'
            }}>
              {isDone ? <CheckCircle size={14} /> : idx + 1}
            </div>
            <span style={{ fontSize: '9px', color: isActive ? '#F5A623' : isDone ? '#00C896' : '#5a6375', marginTop: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>
              {step}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div style={{ height: '2px', flex: 1, background: isDone ? 'linear-gradient(90deg, #00C896, rgba(245,166,35,0.4))' : 'rgba(255,255,255,0.06)', marginBottom: '14px', transition: 'all 0.3s ease' }} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ─── Trade Status Badge ───────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = {
    payment_pending: { label: 'Awaiting Payment', color: '#FFB800', bg: 'rgba(245,166,35,0.12)', border: 'rgba(245,166,35,0.25)', icon: '⏳' },
    payment_sent: { label: 'Payment Sent', color: '#00C896', bg: 'rgba(0,200,150,0.12)', border: 'rgba(0,200,150,0.25)', icon: '✓' },
    completed: { label: 'Completed', color: '#00C896', bg: 'rgba(0,200,150,0.12)', border: 'rgba(0,200,150,0.25)', icon: '🏆' },
    disputed: { label: 'Disputed', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', icon: '⚠️' },
    cancelled: { label: 'Cancelled', color: '#8A9BB8', bg: 'rgba(138,155,184,0.08)', border: 'rgba(138,155,184,0.2)', icon: '✕' },
  }[status] || { label: status, color: '#8A9BB8', bg: 'transparent', border: 'rgba(255,255,255,0.1)', icon: '•' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '4px 12px', borderRadius: '999px',
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      color: cfg.color, fontSize: '11px', fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

// ─── Rating Modal ─────────────────────────────────────────────
const RatingModal = ({ trade, ratedUserId, onClose, onSubmit }) => {
  const [stars, setStars] = useState(5);
  const [hovered, setHovered] = useState(0);
  const [review, setReview] = useState('');
  const [lowRatingReason, setLowRatingReason] = useState('');

  const handleRatingSubmit = () => {
    if (stars < 3 && !lowRatingReason) {
      alert("Please select a reason for the low rating.");
      return;
    }
    onSubmit(stars, review, lowRatingReason);
  };

  const partnerName = trade.buyer_id === ratedUserId ? trade.buyer_name : trade.seller_name;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '16px',
      animation: 'fadeIn 0.2s ease-out',
    }}>
      <div style={{
        maxWidth: '440px', width: '100%', padding: '32px',
        background: 'linear-gradient(135deg, rgba(22,28,41,0.98) 0%, rgba(10,12,18,0.99) 100%)',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        textAlign: 'center',
        animation: 'slideUp 0.3s cubic-bezier(0.32, 0.94, 0.6, 1)',
      }}>
        {/* Success Icon */}
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,200,150,0.2) 0%, rgba(0,200,150,0.05) 70%)',
          border: '2px solid rgba(0,200,150,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', boxShadow: '0 0 32px rgba(0,200,150,0.15)',
        }}>
          <CheckCircle size={30} color="#00C896" />
        </div>

        <h3 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px', color: '#fff' }}>Trade Complete! 🎉</h3>
        <p style={{ fontSize: '14px', color: '#8A9BB8', marginBottom: '28px' }}>
          Rate your experience with <strong style={{ color: '#F5A623' }}>@{partnerName}</strong>
        </p>

        {/* Trader Avatar */}
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(245,166,35,0.15), rgba(245,166,35,0.05))',
          border: '2px solid rgba(245,166,35,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px', fontWeight: 800, color: '#F5A623',
          margin: '0 auto 20px',
        }}>
          {partnerName ? partnerName.charAt(0).toUpperCase() : 'U'}
        </div>

        {/* Stars */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
          {[1, 2, 3, 4, 5].map(s => (
            <Star
              key={s}
              size={38}
              fill={s <= (hovered || stars) ? '#F5A623' : 'none'}
              color={s <= (hovered || stars) ? '#F5A623' : 'rgba(255,255,255,0.15)'}
              style={{ cursor: 'pointer', transition: 'all 0.15s ease', filter: s <= (hovered || stars) ? 'drop-shadow(0 0 6px rgba(245,166,35,0.5))' : 'none' }}
              onClick={() => setStars(s)}
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(0)}
            />
          ))}
        </div>

        <div style={{ fontSize: '12px', color: '#F5A623', fontWeight: 600, marginBottom: '20px' }}>
          {stars === 5 ? '⭐ Excellent!' : stars === 4 ? '👍 Good' : stars === 3 ? '😐 Average' : stars === 2 ? '😕 Poor' : '👎 Terrible'}
        </div>

        {stars < 3 && (
          <div style={{ marginBottom: '20px', textAlign: 'left' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#EF4444', display: 'block', marginBottom: '8px' }}>
              Why the low rating? (Required)
            </label>
            <select
              value={lowRatingReason}
              onChange={e => setLowRatingReason(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '10px',
                background: '#0d1117', border: '1px solid rgba(239,68,68,0.3)',
                color: '#f0f2f8', fontSize: '13px', outline: 'none', fontFamily: 'var(--font)',
              }}
            >
              <option value="">-- Select a reason --</option>
              <option value="Slow response or payment delay">Extremely slow response / payment delay</option>
              <option value="Unprofessional or rude communication">Unprofessional or rude communication</option>
              <option value="Stale or expired payment details">Stale / expired payment details provided</option>
              <option value="Suspicious behavior or payment mismatch">Suspicious behavior / payment mismatch</option>
              <option value="Other">Other</option>
            </select>
            {lowRatingReason === 'Other' && (
              <input
                type="text"
                placeholder="Specify reason..."
                onChange={e => setLowRatingReason(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)',
                  color: '#f0f2f8', fontSize: '13px', marginTop: '8px', outline: 'none',
                  fontFamily: 'var(--font)',
                }}
              />
            )}
          </div>
        )}

        <textarea
          placeholder="Write a review (optional, max 200 chars)..."
          maxLength={200}
          style={{
            width: '100%', height: '80px', padding: '12px', borderRadius: '10px',
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)',
            color: '#fff', fontSize: '13px', resize: 'none', outline: 'none',
            fontFamily: 'var(--font)', marginBottom: '20px', boxSizing: 'border-box',
          }}
          value={review}
          onChange={e => setReview(e.target.value)}
        />

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, height: '44px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#8A9BB8', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font)', transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.08)'}
            onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.04)'}
          >
            Skip
          </button>
          <button
            onClick={handleRatingSubmit}
            style={{
              flex: 2, height: '44px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #F5A623, #e8971a)',
              border: 'none', color: '#0B0E1A', fontSize: '14px',
              fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)',
              boxShadow: '0 4px 16px rgba(245,166,35,0.25)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 6px 20px rgba(245,166,35,0.35)'; }}
            onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 16px rgba(245,166,35,0.25)'; }}
          >
            ⭐ Submit Rating
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Dispute Evidence Console ─────────────────────────────────
const DisputeEvidenceConsole = ({ trade, user, uploadDisputeEvidence, setError, setSuccess }) => {
  const [dispute, setDispute] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!trade?.id) return;
    supabase.from('disputes').select('*').eq('trade_id', trade.id).single().then(({ data }) => setDispute(data));
  }, [trade?.id]);

  if (!dispute) return null;

  const isBuyer = user.id === trade.buyer_id;
  const myEvidence = isBuyer ? (dispute.buyer_evidence || []) : (dispute.seller_evidence || []);
  const theirEvidence = isBuyer ? (dispute.seller_evidence || []) : (dispute.buyer_evidence || []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('File size must be less than 5MB'); return; }
    if (myEvidence.length >= 3) { setError('You can upload a maximum of 3 evidence files.'); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async (event) => {
      try {
        await uploadDisputeEvidence(trade.id, event.target.result);
        setSuccess('Dispute evidence uploaded successfully!');
      } catch (err) {
        setError(err.message);
      } finally {
        setUploading(false);
      }
    };
    reader.onerror = () => { setError('File reading failed'); setUploading(false); };
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(239,68,68,0.02) 100%)',
      border: '1px solid rgba(239,68,68,0.2)',
      borderRadius: '16px', padding: '20px',
      display: 'flex', flexDirection: 'column', gap: '16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <AlertTriangle size={18} color="#EF4444" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fff' }}>Escrow Dispute Active</h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#8b92a8', lineHeight: 1.4 }}>
            Escrow is frozen. Upload proof of payment (receipt screenshot) for admin review.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {/* My Evidence */}
        <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>My Evidence ({myEvidence.length}/3)</span>
            {myEvidence.length < 3 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#F5A623', cursor: 'pointer', fontWeight: 600 }}>
                <Upload size={11} /> Upload
                <input type="file" hidden accept="image/*" onChange={handleFileUpload} disabled={uploading} />
              </label>
            )}
          </div>
          {uploading && <div style={{ fontSize: '11px', color: '#8A9BB8', marginBottom: '8px' }}>Uploading...</div>}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {myEvidence.map((src, idx) => (
              <a href={src} target="_blank" rel="noopener noreferrer" key={idx}
                style={{ width: '50px', height: '50px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', display: 'block' }}>
                <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="evidence" />
              </a>
            ))}
            {myEvidence.length === 0 && !uploading && (
              <span style={{ fontSize: '11px', color: '#525866' }}>No evidence uploaded yet</span>
            )}
          </div>
        </div>

        {/* Counterparty Evidence */}
        <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>Counterparty Evidence ({theirEvidence.length}/3)</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {theirEvidence.map((src, idx) => (
              <a href={src} target="_blank" rel="noopener noreferrer" key={idx}
                style={{ width: '50px', height: '50px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', display: 'block' }}>
                <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="evidence" />
              </a>
            ))}
            {theirEvidence.length === 0 && (
              <span style={{ fontSize: '11px', color: '#525866' }}>No evidence uploaded by partner</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Payment Detail Row ───────────────────────────────────────
const PaymentRow = ({ label, value, mono }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
  }}>
    <span style={{ fontSize: '12px', color: '#8A9BB8', fontWeight: 500 }}>{label}</span>
    <span style={{
      fontSize: '13px', color: '#fff', fontWeight: 700,
      fontFamily: mono ? 'JetBrains Mono, monospace' : 'var(--font)',
    }}>{value}</span>
  </div>
);

// ─── Main TradeRoom Component ─────────────────────────────────
const TradeRoom = () => {
  const { user, trades, markTradeAsPaid, releaseEscrow, cancelTrade, openDispute, uploadDisputeEvidence, submitRating, setError, setSuccess } = useAuth();
  const [selectedTradeId, setSelectedTradeId] = useState(null);
  const [showRating, setShowRating] = useState(false);
  const [skippedTrades, setSkippedTrades] = useState({});
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isReleasing, setIsReleasing] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const activeTrade = trades.find(t => t.id === selectedTradeId);

  // Auto-select first trade
  useEffect(() => {
    if (!selectedTradeId && trades.length > 0) {
      setSelectedTradeId(trades[0].id);
    }
  }, [trades]);

  useEffect(() => {
    if (activeTrade && activeTrade.status === 'completed' && activeTrade.ratingGiven === null) {
      if (skippedTrades[activeTrade.id]) { setShowRating(false); return; }
      const completedTime = activeTrade.completed_at ? new Date(activeTrade.completed_at).getTime() : Date.now();
      const expired = Date.now() - completedTime > 48 * 60 * 60 * 1000;
      setShowRating(!expired);
    } else {
      setShowRating(false);
    }
  }, [activeTrade?.id, activeTrade?.status, activeTrade?.ratingGiven, skippedTrades]);

  useEffect(() => {
    if (!activeTrade || activeTrade.status === 'completed' || activeTrade.status === 'cancelled') {
      setTimeRemaining(''); return;
    }
    const interval = setInterval(() => {
      const created = new Date(activeTrade.created_at).getTime();
      const expires = created + (30 * 60 * 1000);
      const now = Date.now();
      const diff = expires - now;
      if (diff <= 0) { setTimeRemaining('Expired'); clearInterval(interval); }
      else {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTrade]);

  const handleMarkPaid = async () => {
    if (!window.confirm("Confirm that you have sent the payment?")) return;
    await markTradeAsPaid(activeTrade.id);
  };

  const handleRelease = async () => {
    if (!window.confirm("Confirm that you have received the payment? This will release the USDT to the buyer.")) return;
    setIsReleasing(true);
    try {
      await releaseEscrow(activeTrade.id);
      setSuccess("USDT released successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setTimeout(() => setIsReleasing(false), 1500);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel this trade?")) return;
    await cancelTrade(activeTrade.id);
  };

  const handleOpenDispute = async () => {
    const created = new Date(activeTrade.created_at).getTime();
    const elapsed = Date.now() - created;
    if (elapsed < 30 * 60 * 1000) {
      const remainingMins = Math.ceil((30 * 60 * 1000 - elapsed) / (60 * 1000));
      alert(`You must wait 30 minutes since trade start before opening a dispute. Please wait another ${remainingMins} minute(s).`);
      return;
    }
    const reason = prompt("Why are you opening a dispute?");
    if (reason) await openDispute(activeTrade.id, reason);
  };

  const handleRatingSubmit = async (stars, review, lowRatingReason) => {
    try {
      await submitRating(activeTrade.id, stars, review, lowRatingReason);
      setShowRating(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const rate = activeTrade?.rate_etb || 190;
  const isBuyer = activeTrade ? user.id === activeTrade.buyer_id : false;

  let paymentAccount = null;
  if (activeTrade?.payment_method) {
    try { paymentAccount = JSON.parse(activeTrade.payment_method); }
    catch { paymentAccount = { bankName: activeTrade.payment_method, holderName: 'Seller Account', accountNumber: 'N/A' }; }
  }

  // Determine step for progress indicator
  const getStepIndex = (status) => {
    if (status === 'payment_pending') return 0;
    if (status === 'payment_sent') return 1;
    if (status === 'completed') return 3;
    return 0;
  };

  if (trades.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '400px', textAlign: 'center', gap: '16px',
        background: 'linear-gradient(135deg, rgba(22,28,41,0.5) 0%, rgba(10,12,18,0.8) 100%)',
        borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px',
        }}>📋</div>
        <div>
          <h3 style={{ color: '#fff', margin: '0 0 8px', fontSize: '18px', fontWeight: 700 }}>No Active Trades</h3>
          <p style={{ color: '#8A9BB8', margin: 0, fontSize: '13px' }}>Go to the P2P Marketplace to start trading</p>
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('ethioswap_navigate', { detail: 'p2p' }))}
          style={{
            padding: '10px 24px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #F5A623, #e8971a)',
            border: 'none', color: '#0B0E1A', fontWeight: 700, fontSize: '14px',
            cursor: 'pointer', fontFamily: 'var(--font)',
            boxShadow: '0 4px 14px rgba(245,166,35,0.25)',
          }}
        >
          Browse P2P Marketplace →
        </button>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes shimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }

        .trade-sidebar-item { transition: all 0.2s ease; }
        .trade-sidebar-item:hover { background: rgba(245,166,35,0.04) !important; border-color: rgba(245,166,35,0.2) !important; }
        
        .trade-action-btn { transition: all 0.2s ease; }
        .trade-action-btn:hover { transform: translateY(-1px); }

        .trade-room-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 20px;
          min-height: calc(100vh - 140px);
        }

        @media (max-width: 768px) {
          .trade-room-layout {
            grid-template-columns: 1fr;
            min-height: auto;
          }
          .trade-sidebar-mobile-hidden {
            display: none;
          }
          .trade-sidebar-mobile-visible {
            display: flex;
          }
        }

        .escrow-lock-badge {
          background: linear-gradient(135deg, rgba(245,166,35,0.12) 0%, rgba(245,166,35,0.04) 100%);
          border: 1px solid rgba(245,166,35,0.25);
          border-radius: 12px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
      `}</style>

      <div className="trade-room-layout">
        {/* ── Left Sidebar: Trade List ─────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(22,28,41,0.7) 0%, rgba(10,12,18,0.9) 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.06)',
          padding: '16px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#fff', margin: 0 }}>My Trades</h3>
            <span style={{
              background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.2)',
              color: '#F5A623', fontSize: '10px', fontWeight: 700,
              padding: '2px 8px', borderRadius: '99px',
            }}>
              {trades.length} Active
            </span>
          </div>

          {trades.map(trade => {
            const partnerPic = user.id === trade.buyer_id ? trade.seller_profile_pic : trade.buyer_profile_pic;
            const partnerName = user.id === trade.buyer_id ? trade.seller_name : trade.buyer_name;
            const isSelected = selectedTradeId === trade.id;
            const statusColor = trade.status === 'completed' ? '#00C896' : trade.status === 'disputed' ? '#EF4444' : '#F5A623';
            return (
              <div
                key={trade.id}
                className="trade-sidebar-item"
                onClick={() => setSelectedTradeId(trade.id)}
                style={{
                  padding: '12px', borderRadius: '14px', cursor: 'pointer',
                  background: isSelected ? 'rgba(245,166,35,0.08)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isSelected ? 'rgba(245,166,35,0.3)' : 'rgba(255,255,255,0.05)'}`,
                  boxShadow: isSelected ? '0 4px 20px rgba(245,166,35,0.08)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    overflow: 'hidden', flexShrink: 0,
                    background: 'rgba(245,166,35,0.08)',
                    border: `2px solid ${isSelected ? 'rgba(245,166,35,0.4)' : 'rgba(255,255,255,0.1)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: 700, color: '#F5A623',
                  }}>
                    {partnerPic ? (
                      <img src={partnerPic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      (partnerName || 'U').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      @{partnerName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#8A9BB8', marginTop: '2px' }}>
                      ${trade.amount_eth.toFixed(2)} USDT
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: statusColor,
                      boxShadow: `0 0 6px ${statusColor}`,
                    }} />
                    <span style={{ fontSize: '9px', color: statusColor, fontWeight: 700, textTransform: 'uppercase' }}>
                      {trade.status === 'payment_pending' ? 'Pending' : trade.status === 'payment_sent' ? 'Paid' : trade.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Main Trade Area ──────────────────────────────────── */}
        {activeTrade ? (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '16px',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Releasing Overlay */}
            {isReleasing && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(10,12,18,0.96)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                zIndex: 100, borderRadius: '20px', backdropFilter: 'blur(8px)',
                animation: 'fadeIn 0.2s ease-out',
              }}>
                <div style={{
                  width: '64px', height: '64px',
                  border: '4px solid rgba(245,166,35,0.1)',
                  borderTopColor: '#F5A623', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  marginBottom: '20px',
                }} />
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#F5A623' }}>Releasing USDT...</span>
                <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#8A9BB8' }}>Unlocking escrow safe node</p>
              </div>
            )}

            {/* ── Trade Header Card ── */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(22,28,41,0.7) 0%, rgba(10,12,18,0.9) 100%)',
              borderRadius: '20px', border: '1px solid rgba(255,255,255,0.07)',
              padding: '20px 24px',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
              animation: 'slideInRight 0.3s ease-out',
            }}>
              {/* Partner + Status Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: 'rgba(245,166,35,0.1)',
                    border: '2px solid rgba(245,166,35,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px', fontWeight: 800, color: '#F5A623',
                    boxShadow: '0 0 16px rgba(245,166,35,0.15)',
                    overflow: 'hidden', flexShrink: 0,
                  }}>
                    {(isBuyer ? activeTrade.seller_profile_pic : activeTrade.buyer_profile_pic) ? (
                      <img src={isBuyer ? activeTrade.seller_profile_pic : activeTrade.buyer_profile_pic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      (isBuyer ? activeTrade.seller_name : activeTrade.buyer_name || 'U').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#8A9BB8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Trading with
                    </div>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
                      @{isBuyer ? activeTrade.seller_name : activeTrade.buyer_name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#8A9BB8', marginTop: '2px' }}>
                      {isBuyer ? 'Seller (has USD)' : 'Buyer (sending ETB)'}
                    </div>
                  </div>
                </div>
                <StatusBadge status={activeTrade.status} />
              </div>

              {/* Progress Steps */}
              <StepIndicator
                steps={['Awaiting Payment', 'Payment Sent', 'Confirming', 'Complete']}
                currentStep={getStepIndex(activeTrade.status)}
              />

              {/* Trade Summary Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { label: 'USD Amount', value: `$${activeTrade.amount_eth.toFixed(2)}`, color: '#F5A623' },
                  { label: 'ETB Amount', value: `${Math.round(activeTrade.amount_eth * rate).toLocaleString()} ETB`, color: '#00C896' },
                  { label: 'Rate Used', value: `${rate} ETB/$`, color: '#8A9BB8' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{
                    background: 'rgba(0,0,0,0.2)', borderRadius: '12px',
                    padding: '12px 16px', border: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <div style={{ fontSize: '9px', color: '#5a6375', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{label}</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color, marginTop: '4px', fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Timer (if active) */}
              {timeRemaining && activeTrade.status !== 'completed' && activeTrade.status !== 'cancelled' && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginTop: '16px', padding: '10px 16px', borderRadius: '10px',
                  background: timeRemaining === 'Expired' ? 'rgba(239,68,68,0.08)' : 'rgba(245,166,35,0.06)',
                  border: `1px solid ${timeRemaining === 'Expired' ? 'rgba(239,68,68,0.2)' : 'rgba(245,166,35,0.15)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#8A9BB8' }}>
                    <Clock size={14} color={timeRemaining === 'Expired' ? '#EF4444' : '#F5A623'} />
                    Payment Window Remaining
                  </div>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: '16px', fontWeight: 800,
                    color: timeRemaining === 'Expired' ? '#EF4444' : '#F5A623',
                  }}>
                    {timeRemaining}
                  </span>
                </div>
              )}

              {/* Trade ID & Ref */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                <span style={{ fontSize: '11px', color: '#5a6375' }}>Trade ID:</span>
                <span style={{ fontSize: '11px', color: '#8A9BB8', fontFamily: 'JetBrains Mono, monospace' }}>
                  ES-{activeTrade.id.substring(0, 8).toUpperCase()}
                </span>
                <CopyButton text={`ES-${activeTrade.id.substring(0, 8).toUpperCase()}`} label="Copy" />
              </div>
            </div>

            {/* ── COMPLETED STATE ── */}
            {activeTrade.status === 'completed' ? (
              <div style={{
                background: 'linear-gradient(135deg, rgba(0,200,150,0.06) 0%, rgba(10,12,18,0.9) 100%)',
                borderRadius: '20px', border: '1px solid rgba(0,200,150,0.2)',
                padding: '28px', textAlign: 'center',
                backdropFilter: 'blur(16px)',
                animation: 'slideInRight 0.3s ease-out',
              }}>
                <div style={{
                  width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 20px',
                  background: 'radial-gradient(circle, rgba(0,200,150,0.2) 0%, rgba(0,200,150,0.04) 70%)',
                  border: '2px solid rgba(0,200,150,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 32px rgba(0,200,150,0.15)',
                  fontSize: '28px',
                }}>
                  🏆
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>Trade Completed!</h3>
                <p style={{ color: '#8A9BB8', fontSize: '14px', margin: '0 0 24px' }}>
                  {isBuyer
                    ? `You received $${activeTrade.amount_eth.toFixed(2)} USDT`
                    : `You received ${Math.round(activeTrade.amount_eth * rate).toLocaleString()} ETB`}
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('ethioswap_navigate', { detail: 'history' }))}
                    style={{
                      padding: '12px 24px', borderRadius: '12px',
                      background: 'linear-gradient(135deg, #F5A623, #e8971a)',
                      border: 'none', color: '#0B0E1A', fontWeight: 700,
                      fontSize: '14px', cursor: 'pointer', fontFamily: 'var(--font)',
                      boxShadow: '0 4px 14px rgba(245,166,35,0.25)',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 6px 20px rgba(245,166,35,0.35)'; }}
                    onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 14px rgba(245,166,35,0.25)'; }}
                  >
                    View in History
                  </button>
                  {activeTrade.ratingGiven === null && (
                    <button
                      onClick={() => setShowRating(true)}
                      style={{
                        padding: '12px 24px', borderRadius: '12px',
                        background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.25)',
                        color: '#F5A623', fontWeight: 700, fontSize: '14px',
                        cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { e.target.style.background = 'rgba(245,166,35,0.14)'; }}
                      onMouseLeave={e => { e.target.style.background = 'rgba(245,166,35,0.08)'; }}
                    >
                      ⭐ Rate Trade
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'slideInRight 0.3s ease-out' }}>

                {/* ── Escrow Lock Banner ── */}
                <div className="escrow-lock-badge">
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Lock size={16} color="#F5A623" />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#F5A623' }}>Escrow Protected</div>
                    <div style={{ fontSize: '11px', color: '#8A9BB8', marginTop: '2px' }}>
                      ${activeTrade.amount_eth.toFixed(2)} USDT is safely locked until trade completes
                    </div>
                  </div>
                </div>

                {/* ── BUYER: Payment Pending ── */}
                {isBuyer && activeTrade.status === 'payment_pending' && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(22,28,41,0.8) 0%, rgba(10,12,18,0.95) 100%)',
                    borderRadius: '20px', border: '1px solid rgba(255,255,255,0.07)',
                    padding: '24px', backdropFilter: 'blur(16px)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F5A623', animation: 'pulse 1.5s infinite' }} />
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Send Payment to Seller</span>
                    </div>

                    {/* Payment Details Card */}
                    <div style={{
                      background: 'rgba(0,0,0,0.3)', borderRadius: '14px',
                      padding: '18px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '16px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                        <CreditCard size={14} color="#F5A623" />
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#F5A623', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Bank Transfer Details (Pay To)
                        </span>
                      </div>
                      {paymentAccount ? (
                        <div>
                          <PaymentRow label="Bank / Platform" value={paymentAccount.bankName} />
                          <PaymentRow label="Account Holder" value={paymentAccount.holderName} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <span style={{ fontSize: '12px', color: '#8A9BB8', fontWeight: 500 }}>Account Number</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '15px', color: '#F5A623', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>
                                {paymentAccount.accountNumber}
                              </span>
                              <CopyButton text={paymentAccount.accountNumber} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                            <span style={{ fontSize: '12px', color: '#8A9BB8', fontWeight: 500 }}>Amount to Send</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '16px', color: '#00C896', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>
                                {Math.round(activeTrade.amount_eth * rate).toLocaleString()} ETB
                              </span>
                              <CopyButton text={Math.round(activeTrade.amount_eth * rate).toString()} label="Copy" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: '13px', color: '#8A9BB8' }}>
                          Payment to: {activeTrade.payment_method}
                        </div>
                      )}
                    </div>

                    {/* Warning */}
                    <div style={{
                      background: 'rgba(245,166,35,0.05)', border: '1px solid rgba(245,166,35,0.15)',
                      borderRadius: '10px', padding: '12px 16px',
                      display: 'flex', gap: '10px', marginBottom: '20px',
                    }}>
                      <AlertCircle size={14} color="#FFB800" style={{ flexShrink: 0, marginTop: '1px' }} />
                      <div style={{ fontSize: '11.5px', color: '#ffd580', lineHeight: 1.5 }}>
                        <strong>Important:</strong> Transfer exactly <strong>{Math.round(activeTrade.amount_eth * rate).toLocaleString()} ETB</strong> using your banking app.
                        Only click "I Have Sent Payment" after the transfer is confirmed. Do NOT close this window.
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <button
                        className="trade-action-btn"
                        onClick={handleMarkPaid}
                        style={{
                          flex: 1, height: '50px', borderRadius: '14px', border: 'none',
                          background: 'linear-gradient(135deg, #F5A623, #e8971a)',
                          color: '#0A0C12', fontWeight: 800, fontSize: '14px',
                          cursor: 'pointer', fontFamily: 'var(--font)',
                          boxShadow: '0 4px 20px rgba(245,166,35,0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        }}
                      >
                        <CheckCircle size={16} /> I Have Sent Payment
                      </button>
                      <button
                        className="trade-action-btn"
                        onClick={handleCancel}
                        style={{
                          padding: '0 18px', height: '50px', borderRadius: '14px',
                          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                          color: '#EF4444', fontWeight: 600, fontSize: '13px',
                          cursor: 'pointer', fontFamily: 'var(--font)',
                          display: 'flex', alignItems: 'center', gap: '6px',
                        }}
                      >
                        <XCircle size={14} /> Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* ── BUYER: Payment Sent (waiting) ── */}
                {isBuyer && activeTrade.status === 'payment_sent' && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(0,200,150,0.05) 0%, rgba(10,12,18,0.95) 100%)',
                    borderRadius: '20px', border: '1px solid rgba(0,200,150,0.2)',
                    padding: '28px', backdropFilter: 'blur(16px)',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      width: '60px', height: '60px', borderRadius: '50%', margin: '0 auto 20px',
                      background: 'rgba(0,200,150,0.1)', border: '2px solid rgba(0,200,150,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 0 24px rgba(0,200,150,0.15)',
                    }}>
                      <CheckCircle size={26} color="#00C896" />
                    </div>
                    <h3 style={{ color: '#fff', margin: '0 0 8px', fontSize: '18px', fontWeight: 800 }}>Payment Sent!</h3>
                    <p style={{ color: '#8A9BB8', fontSize: '13px', margin: '0 0 20px', lineHeight: 1.5 }}>
                      Waiting for <strong style={{ color: '#fff' }}>@{activeTrade.seller_name}</strong> to verify the ETB transfer and release your USDT.
                    </p>
                    <div style={{
                      background: 'rgba(0,200,150,0.05)', border: '1px solid rgba(0,200,150,0.15)',
                      borderRadius: '10px', padding: '12px', fontSize: '12px', color: '#a0eedb',
                      marginBottom: '20px',
                    }}>
                      ⏳ Seller will release escrow once payment is verified. This may take a few minutes.
                    </div>
                    <button
                      className="trade-action-btn"
                      onClick={handleOpenDispute}
                      style={{
                        padding: '10px 20px', borderRadius: '10px',
                        background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                        color: '#EF4444', fontWeight: 600, fontSize: '13px',
                        cursor: 'pointer', fontFamily: 'var(--font)',
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                      }}
                    >
                      <AlertTriangle size={13} /> Open Dispute
                    </button>
                  </div>
                )}

                {/* ── SELLER: Payment Pending ── */}
                {!isBuyer && activeTrade.status === 'payment_pending' && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(22,28,41,0.8) 0%, rgba(10,12,18,0.95) 100%)',
                    borderRadius: '20px', border: '1px solid rgba(255,255,255,0.07)',
                    padding: '24px', backdropFilter: 'blur(16px)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F5A623', animation: 'pulse 2s infinite' }} />
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Waiting for Buyer's Payment</span>
                    </div>

                    <div style={{
                      background: 'rgba(0,0,0,0.25)', borderRadius: '14px',
                      padding: '18px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '16px',
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#8A9BB8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                        Your Receiving Account
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', color: '#8A9BB8' }}>
                        Buyer (<strong style={{ color: '#fff' }}>@{activeTrade.buyer_name}</strong>) will send{' '}
                        <strong style={{ color: '#00C896', fontFamily: 'JetBrains Mono, monospace' }}>
                          {Math.round(activeTrade.amount_eth * rate).toLocaleString()} ETB
                        </strong>{' '}
                        to your account below.
                      </p>
                      {paymentAccount && (
                        <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', fontSize: '12px', color: '#8A9BB8' }}>
                          <span style={{ color: '#fff', fontWeight: 700 }}>{paymentAccount.bankName}</span> · {paymentAccount.accountNumber}
                        </div>
                      )}
                    </div>

                    <div style={{
                      background: 'rgba(0,200,150,0.04)', border: '1px solid rgba(0,200,150,0.12)',
                      borderRadius: '10px', padding: '12px 16px',
                      display: 'flex', gap: '10px', marginBottom: '20px',
                    }}>
                      <Shield size={14} color="#00C896" style={{ flexShrink: 0, marginTop: '1px' }} />
                      <div style={{ fontSize: '11.5px', color: '#a0eedb', lineHeight: 1.5 }}>
                        You'll be notified when the buyer sends the ETB. <strong>Do NOT release USDT</strong> until you verify funds in your account!
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{
                        flex: 1, height: '50px', borderRadius: '14px',
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '13px', color: '#5a6375', fontWeight: 600,
                        gap: '8px',
                      }}>
                        <Clock size={14} /> Waiting for Buyer...
                      </div>
                      <button
                        className="trade-action-btn"
                        onClick={handleCancel}
                        style={{
                          padding: '0 18px', height: '50px', borderRadius: '14px',
                          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                          color: '#EF4444', fontWeight: 600, fontSize: '13px',
                          cursor: 'pointer', fontFamily: 'var(--font)',
                          display: 'flex', alignItems: 'center', gap: '6px',
                        }}
                      >
                        <XCircle size={14} /> Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* ── SELLER: Payment Sent (confirm & release) ── */}
                {!isBuyer && activeTrade.status === 'payment_sent' && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(0,200,150,0.07) 0%, rgba(10,12,18,0.95) 100%)',
                    borderRadius: '20px', border: '1px solid rgba(0,200,150,0.25)',
                    padding: '24px', backdropFilter: 'blur(16px)',
                    boxShadow: '0 8px 32px rgba(0,200,150,0.08)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: 'rgba(0,200,150,0.15)', border: '1px solid rgba(0,200,150,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <CheckCircle size={16} color="#00C896" />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Buyer Marked as Paid</div>
                        <div style={{ fontSize: '11px', color: '#8A9BB8' }}>Verify the ETB has arrived in your account</div>
                      </div>
                    </div>

                    <div style={{
                      background: 'rgba(0,0,0,0.25)', borderRadius: '14px',
                      padding: '18px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '16px',
                    }}>
                      <h3 style={{ margin: '0 0 6px', fontSize: '15px', color: '#fff', fontWeight: 800 }}>
                        Verify & Release USDT
                      </h3>
                      <p style={{ margin: 0, fontSize: '13px', color: '#8A9BB8', lineHeight: 1.5 }}>
                        Check your bank/wallet that you've received{' '}
                        <strong style={{ color: '#00C896', fontFamily: 'JetBrains Mono, monospace' }}>
                          {Math.round(activeTrade.amount_eth * rate).toLocaleString()} ETB
                        </strong>{' '}
                        from <strong style={{ color: '#fff' }}>@{activeTrade.buyer_name}</strong>.
                      </p>
                    </div>

                    <div style={{
                      background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)',
                      borderRadius: '10px', padding: '12px 16px',
                      display: 'flex', gap: '10px', marginBottom: '20px',
                    }}>
                      <AlertTriangle size={14} color="#EF4444" style={{ flexShrink: 0, marginTop: '1px' }} />
                      <div style={{ fontSize: '11.5px', color: '#fca5a5', lineHeight: 1.5 }}>
                        Only release USDT after you physically see the ETB in your account. Once released, it <strong>cannot be reversed</strong>.
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <button
                        className="trade-action-btn"
                        onClick={handleRelease}
                        style={{
                          flex: 2, height: '50px', borderRadius: '14px', border: 'none',
                          background: 'linear-gradient(135deg, #00C896, #00a87d)',
                          color: '#023026', fontWeight: 800, fontSize: '14px',
                          cursor: 'pointer', fontFamily: 'var(--font)',
                          boxShadow: '0 4px 20px rgba(0,200,150,0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        }}
                      >
                        <Unlock size={16} /> Release USDT to Buyer
                      </button>
                      <button
                        className="trade-action-btn"
                        onClick={handleOpenDispute}
                        style={{
                          flex: 1, height: '50px', borderRadius: '14px',
                          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                          color: '#EF4444', fontWeight: 600, fontSize: '13px',
                          cursor: 'pointer', fontFamily: 'var(--font)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        }}
                      >
                        <AlertTriangle size={13} /> Dispute
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Dispute Console ── */}
                {activeTrade.status === 'disputed' && (
                  <DisputeEvidenceConsole
                    trade={activeTrade}
                    user={user}
                    uploadDisputeEvidence={uploadDisputeEvidence}
                    setError={setError}
                    setSuccess={setSuccess}
                  />
                )}
              </div>
            )}

            {/* ── Chat Section ── */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(22,28,41,0.7) 0%, rgba(10,12,18,0.9) 100%)',
              borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)',
              overflow: 'hidden', backdropFilter: 'blur(16px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
              minHeight: '340px',
            }}>
              <div style={{
                padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <MessageSquare size={15} color="#8A9BB8" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Trade Chat</span>
                <span style={{ fontSize: '11px', color: '#8A9BB8' }}>• Secure encrypted channel</span>
              </div>
              <TradeChat
                tradeId={activeTrade.id}
                sellerId={activeTrade.seller_id}
                buyerId={activeTrade.buyer_id}
                tradeStatus={activeTrade.status}
              />
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, rgba(22,28,41,0.6) 0%, rgba(10,12,18,0.8) 100%)',
            borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)',
            color: '#5a6375', fontSize: '14px',
          }}>
            Select a trade to view details
          </div>
        )}
      </div>

      {/* Rating Modal */}
      {showRating && activeTrade && (
        <RatingModal
          trade={activeTrade}
          ratedUserId={user.id === activeTrade.buyer_id ? activeTrade.seller_id : activeTrade.buyer_id}
          onClose={() => {
            setSkippedTrades(prev => ({ ...prev, [activeTrade.id]: true }));
            setShowRating(false);
          }}
          onSubmit={handleRatingSubmit}
        />
      )}
    </>
  );
};

export default TradeRoom;
