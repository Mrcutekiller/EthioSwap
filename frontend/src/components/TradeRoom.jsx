import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from 'react-i18next';
import TradeChat from './TradeChat.jsx';
import { Star, Shield, CreditCard, CheckCircle, AlertTriangle, XCircle, Clock, Upload, FileImage } from 'lucide-react';
import { supabase } from '../lib/supabase';

const RatingModal = ({ trade, ratedUserId, onClose, onSubmit }) => {
  const [stars, setStars] = useState(5);
  const [review, setReview] = useState('');
  const [lowRatingReason, setLowRatingReason] = useState('');
  const { t } = useTranslation();

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
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px'
    }}>
      <div className="card glass-card" style={{ maxWidth: '420px', width: '100%', padding: '28px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(0,200,150, 0.1)', color: '#00C896', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
          <CheckCircle size={32} />
        </div>
        <h3 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px', color: '#fff' }}>Trade Complete!</h3>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Rate your experience with <strong style={{ color: 'var(--gold)' }}>@{partnerName}</strong>
        </p>
        
        {/* Avatar */}
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px', fontWeight: 800, color: 'var(--gold)', margin: '0 auto 24px auto'
        }}>
          {partnerName ? partnerName.charAt(0).toUpperCase() : 'U'}
        </div>

        {/* Stars */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '24px' }}>
          {[1, 2, 3, 4, 5].map(s => (
            <Star 
              key={s} 
              size={36} 
              fill={s <= stars ? '#F5A623' : 'none'} 
              color={s <= stars ? '#F5A623' : 'rgba(255,255,255,0.15)'} 
              style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
              onClick={() => setStars(s)}
            />
          ))}
        </div>

        {/* Low rating handling */}
        {stars < 3 && (
          <div style={{ marginBottom: '20px', textAlign: 'left' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#f43f5e', display: 'block', marginBottom: '8px' }}>
              Why the low rating? (Required)
            </label>
            <select 
              value={lowRatingReason} 
              onChange={e => setLowRatingReason(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#0d1117',
                border: '1px solid rgba(244,63,94,0.3)', color: '#f0f2f8', fontSize: '13px', outline: 'none'
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
                  width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#0d1117',
                  border: '1px solid rgba(255,255,255,0.08)', color: '#f0f2f8', fontSize: '13px', marginTop: '8px', outline: 'none'
                }}
              />
            )}
          </div>
        )}

        <textarea 
          className="input" 
          placeholder="Write a review (optional, max 200 chars)..." 
          maxLength={200}
          style={{ height: '80px', marginBottom: '24px', background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.05)', fontSize: '13px' }}
          value={review}
          onChange={e => setReview(e.target.value)}
        ></textarea>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-ghost" style={{ flex: 1, border: '1px solid rgba(255,255,255,0.07)' }} onClick={onClose}>Skip</button>
          <button className="btn btn-gold" style={{ flex: 1 }} onClick={handleRatingSubmit}>Submit Rating</button>
        </div>
      </div>
    </div>
  );
};

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
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }
    if (myEvidence.length >= 3) {
      setError('You can upload a maximum of 3 evidence files.');
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async (event) => {
      try {
        const base64String = event.target.result;
        await uploadDisputeEvidence(trade.id, base64String);
        setSuccess('Dispute evidence uploaded successfully!');
      } catch (err) {
        setError(err.message);
      } finally {
        setUploading(false);
      }
    };
    reader.onerror = () => {
      setError('File reading failed');
      setUploading(false);
    };
  };

  return (
    <div style={{
      background: 'rgba(239, 68, 68, 0.05)',
      border: '1px solid rgba(239, 68, 68, 0.15)',
      borderRadius: '16px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <AlertTriangle size={20} color="#FF4D4D" />
        <div>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fff' }}>Escrow Dispute Active</h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#8b92a8' }}>Escrow is frozen. Upload proof of payment (Telebirr/CBE receipt screenshot) for admin review.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* My Evidence */}
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#fff' }}>My Evidence ({myEvidence.length}/3)</span>
            {myEvidence.length < 3 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>
                <Upload size={12} /> Upload
                <input type="file" hidden accept="image/*" onChange={handleFileUpload} disabled={uploading} />
              </label>
            )}
          </div>
          {uploading && <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Uploading...</div>}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {myEvidence.map((src, idx) => (
              <a href={src} target="_blank" rel="noopener noreferrer" key={idx} style={{ position: 'relative', width: '50px', height: '50px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', display: 'block' }}>
                <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="evidence" />
              </a>
            ))}
            {myEvidence.length === 0 && !uploading && (
              <span style={{ fontSize: '11.5px', color: '#525866' }}>No evidence uploaded yet</span>
            )}
          </div>
        </div>

        {/* Counterparty Evidence */}
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>Counterparty Evidence ({theirEvidence.length}/3)</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {theirEvidence.map((src, idx) => (
              <a href={src} target="_blank" rel="noopener noreferrer" key={idx} style={{ position: 'relative', width: '50px', height: '50px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', display: 'block' }}>
                <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="evidence" />
              </a>
            ))}
            {theirEvidence.length === 0 && (
              <span style={{ fontSize: '11.5px', color: '#525866' }}>No evidence uploaded by partner</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const TradeRoom = () => {
  const { user, trades, markTradeAsPaid, releaseEscrow, cancelTrade, openDispute, uploadDisputeEvidence, submitRating, setError, setSuccess } = useAuth();
  const { t } = useTranslation();
  const [selectedTradeId, setSelectedTradeId] = useState(null);
  const [showRating, setShowRating] = useState(false);
  const [skippedTrades, setSkippedTrades] = useState({});
  const [timeRemaining, setTimeRemaining] = useState('');

  const activeTrade = trades.find(t => t.id === selectedTradeId);

  useEffect(() => {
    if (activeTrade && activeTrade.status === 'completed' && activeTrade.ratingGiven === null) {
      if (skippedTrades[activeTrade.id]) {
        setShowRating(false);
        return;
      }
      const completedTime = activeTrade.completed_at ? new Date(activeTrade.completed_at).getTime() : Date.now();
      const expired = Date.now() - completedTime > 48 * 60 * 60 * 1000;
      if (!expired) {
        setShowRating(true);
      } else {
        setShowRating(false);
      }
    } else {
      setShowRating(false);
    }
  }, [activeTrade?.id, activeTrade?.status, activeTrade?.ratingGiven, skippedTrades]);

  useEffect(() => {
    if (!activeTrade || activeTrade.status === 'completed' || activeTrade.status === 'cancelled') {
      setTimeRemaining('');
      return;
    }

    const interval = setInterval(() => {
      const created = new Date(activeTrade.created_at).getTime();
      const expires = created + (30 * 60 * 1000); // 30 mins window
      const now = new Date().getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setTimeRemaining('Expired');
        clearInterval(interval);
      } else {
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
    if (!window.confirm("Confirm that you have received the payment? This will release the ETH to the buyer.")) return;
    await releaseEscrow(activeTrade.id);
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

  if (trades.length === 0) {
    return <div className="card" style={{ padding: '40px', textAlign: 'center' }}>No active trades</div>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px', height: 'calc(100vh - 120px)' }}>
      {/* Sidebar: Active Trades */}
      <div className="card glass-card" style={{ overflowY: 'auto', padding: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>My Trades</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {trades.map(trade => (
            <div 
              key={trade.id} 
              onClick={() => setSelectedTradeId(trade.id)}
              className={selectedTradeId === trade.id ? "premium-glow" : ""}
              style={{
                padding: '12px', borderRadius: '12px', cursor: 'pointer',
                background: selectedTradeId === trade.id ? 'rgba(245,166,35, 0.05)' : 'var(--bg-elevated)',
                border: `1px solid ${selectedTradeId === trade.id ? '#F5A623' : 'var(--border)'}`,
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700 }}>@{user.id === trade.buyer_id ? trade.seller_name : trade.buyer_name}</span>
                <span style={{ fontSize: '10px', fontWeight: 800, color: trade.status === 'completed' ? '#00C896' : '#F5A623' }}>
                  {trade.status.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>{trade.amount_eth.toFixed(4)} ETH</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Area: Chat & Controls */}
      {activeTrade ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'hidden' }}>
          {/* Status Header */}
          <div className="card glass-card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(245,166,35, 0.1)', color: '#F5A623', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Trade #{activeTrade.id.substring(0, 8)}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-3)' }}>
                  <Clock size={14} /> {timeRemaining || 'Trade Locked'}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              {user.id === activeTrade.buyer_id && activeTrade.status === 'payment_pending' && (
                <button className="btn btn-indigo" onClick={handleMarkPaid}>{t('I Have Sent Payment')}</button>
              )}
              {user.id === activeTrade.seller_id && activeTrade.status === 'paid' && (
                <button className="btn btn-teal" onClick={handleRelease}>{t('I Received Payment')}</button>
              )}
              {activeTrade.status !== 'completed' && activeTrade.status !== 'cancelled' && (
                <>
                  <button className="btn btn-ghost" style={{ color: '#FF4D4D' }} onClick={handleCancel}>{t('Cancel Trade')}</button>
                  <button className="btn btn-ghost" style={{ color: '#FF4D4D' }} onClick={handleOpenDispute}>{t('Open Dispute')}</button>
                </>
              )}
            </div>
          </div>

          {activeTrade.status === 'disputed' && (
            <DisputeEvidenceConsole 
              trade={activeTrade} 
              user={user} 
              uploadDisputeEvidence={uploadDisputeEvidence} 
              setError={setError} 
              setSuccess={setSuccess} 
            />
          )}

          {/* Chat Component */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <TradeChat tradeId={activeTrade.id} sellerId={activeTrade.seller_id} buyerId={activeTrade.buyer_id} />
          </div>

          {showRating && (
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
        </div>
      ) : (
        <div className="card glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
          Select a trade to start chatting
        </div>
      )}
    </div>
  );
};

export default TradeRoom;
