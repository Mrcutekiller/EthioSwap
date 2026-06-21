import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from 'react-i18next';
import TradeChat from './TradeChat.jsx';
import { Star, Shield, CreditCard, CheckCircle, AlertTriangle, XCircle, Clock, Upload, FileImage } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Logo from './Logo.jsx';

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
  const [isReleasing, setIsReleasing] = useState(false);

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
    if (!window.confirm("Confirm that you have received the payment? This will release the USDT to the buyer.")) return;
    setIsReleasing(true);
    try {
      await releaseEscrow(activeTrade.id);
      setSuccess("USDT released successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setTimeout(() => {
        setIsReleasing(false);
      }, 1500);
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
  if (activeTrade && activeTrade.payment_method) {
    try {
      paymentAccount = JSON.parse(activeTrade.payment_method);
    } catch (e) {
      // Fallback
      paymentAccount = { bankName: activeTrade.payment_method, holderName: 'Seller Account', accountNumber: 'N/A' };
    }
  }

  if (trades.length === 0) {
    return <div className="card" style={{ padding: '40px', textAlign: 'center', background: '#141827', color: 'var(--text-secondary)' }}>No active trades</div>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px', height: 'calc(100vh - 120px)' }}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
      `}</style>
      
      {/* Sidebar: Active Trades */}
      <div className="card glass-card" style={{ overflowY: 'auto', padding: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>My Trades</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {trades.map(trade => {
            const partnerPic = user.id === trade.buyer_id ? trade.seller_profile_pic : trade.buyer_profile_pic;
            return (
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden', background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#F5A623', flexShrink: 0 }}>
                    {partnerPic ? <img src={partnerPic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (user.id === trade.buyer_id ? trade.seller_name : trade.buyer_name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>@{user.id === trade.buyer_id ? trade.seller_name : trade.buyer_name}</span>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: trade.status === 'completed' ? '#00C896' : '#F5A623', flexShrink: 0 }}>
                    {trade.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>${trade.amount_eth.toFixed(2)} USDT</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Area: Chat & Controls */}
      {activeTrade ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'hidden', position: 'relative' }}>
          
          {/* Releasing animation overlay */}
          {isReleasing && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(11, 14, 26, 0.95)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              zIndex: 100, borderRadius: '16px'
            }}>
              <div style={{ width: '48px', height: '48px', border: '4px solid rgba(255,255,255,0.05)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <span style={{ marginTop: '16px', fontSize: '16px', fontWeight: 700, color: 'var(--gold)' }}>Sending USDT...</span>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--muted)' }}>Unlocking escrow safe node</p>
            </div>
          )}

          {activeTrade.status === 'completed' ? (
            /* COMPLETED RECEIPT VIEW */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
              <BrandedReceipt
                txType={isBuyer ? 'BUY USDT' : 'SELL USDT'}
                status="COMPLETED"
                dateTime={activeTrade.completed_at || activeTrade.created_at}
                refId={activeTrade.id}
                fromName={activeTrade.seller_name}
                fromId={activeTrade.seller_id}
                toName={activeTrade.buyer_name}
                toId={activeTrade.buyer_id}
                amountSent={`$${activeTrade.amount_eth.toFixed(2)} USDT`}
                amountReceived={`${Math.round(activeTrade.amount_eth * rate).toLocaleString()} ETB`}
                rate={`${rate} ETB / $1`}
                paymentMethod={paymentAccount?.bankName || activeTrade.payment_method}
                showActions={true}
              />
              <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '520px', margin: '0 auto' }}>
                <button 
                  className="btn gold-glow-btn" 
                  style={{ flex: 1, color: '#0B0E1A', fontWeight: 700, height: '42px', borderRadius: '10px' }}
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('ethioswap_navigate', { detail: 'history' }));
                  }}
                >
                  View in History
                </button>
                {activeTrade.ratingGiven === null && (
                  <button 
                    className="btn btn-outline" 
                    style={{ border: '1px solid rgba(255,255,255,0.08)', flex: 1, height: '42px', borderRadius: '10px' }} 
                    onClick={() => setShowRating(true)}
                  >
                    ⭐ Rate Trade
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* ACTIVE TRADE STATE CONSOLE */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {isBuyer ? (
                /* BUYER STATES */
                activeTrade.status === 'payment_pending' ? (
                  <div style={{ background: '#141827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ display: 'flex', padding: '4px 10px', background: 'rgba(245, 166, 35, 0.15)', border: '1px solid rgba(245, 166, 35, 0.3)', color: '#FFB800', borderRadius: '8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                          ⏳ Awaiting your payment
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700, color: 'var(--gold)' }}>
                        ⏱️ Timer: <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{timeRemaining}</span>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.04em' }}>
                        🏦 Bank Transfer Details (Pay to)
                      </div>
                      {paymentAccount ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Bank/Platform:</span>
                            <strong style={{ fontSize: '13px', color: '#fff' }}>{paymentAccount.bankName}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Account Holder:</span>
                            <strong style={{ fontSize: '13px', color: '#fff' }}>{paymentAccount.holderName}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Account Number:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{ fontSize: '13.5px', color: 'var(--gold-light)', fontFamily: 'JetBrains Mono, monospace' }}>{paymentAccount.accountNumber}</strong>
                              <button 
                                onClick={() => { navigator.clipboard.writeText(paymentAccount.accountNumber); alert('Account number copied!'); }}
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text-2)', fontSize: '10px', padding: '2px 6px', cursor: 'pointer' }}
                              >
                                Copy
                              </button>
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Trade Reference:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{ fontSize: '12px', color: '#fff', fontFamily: 'JetBrains Mono, monospace' }}>ES-{activeTrade.id.substring(0,6).toUpperCase()}</strong>
                              <button 
                                onClick={() => { navigator.clipboard.writeText(`ES-${activeTrade.id.substring(0,6).toUpperCase()}`); alert('Reference copied!'); }}
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text-2)', fontSize: '10px', padding: '2px 6px', cursor: 'pointer' }}
                              >
                                Copy
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>Seller payment details: {activeTrade.payment_method}</div>
                      )}
                    </div>

                    <div style={{ background: 'rgba(245, 166, 35, 0.05)', border: '1px solid rgba(245, 166, 35, 0.15)', borderRadius: '10px', padding: '12px', fontSize: '11px', color: '#ffd580', lineHeight: '1.4' }}>
                      ⚠️ <strong>Warning:</strong> Transfer local Birr using your banking app. Once completed, click "I Have Sent Payment". Do NOT close this window.
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button className="btn gold-glow-btn" style={{ flex: 1, color: '#0A0C12', fontWeight: 700 }} onClick={handleMarkPaid}>
                        Confirm & Transfer Sent
                      </button>
                      <button className="btn btn-ghost" style={{ color: '#FF4D4D', textDecoration: 'underline', fontSize: '12px' }} onClick={handleCancel}>
                        Cancel this trade
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Buyer paid state */
                  <div style={{ background: '#141827', border: '1px solid rgba(0, 200, 150, 0.2)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="notif-pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00C896' }} />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#00C896' }}>Payment Sent</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Waiting for the seller (@{activeTrade.seller_name}) to verify the ETB transfer and release your USDT.
                    </p>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                      <button className="btn btn-ghost" style={{ color: '#FF4D4D', padding: '6px 12px', fontSize: '12.5px' }} onClick={handleOpenDispute}>Open Dispute</button>
                    </div>
                  </div>
                )
              ) : (
                /* SELLER STATES */
                activeTrade.status === 'payment_pending' ? (
                  <div style={{ background: '#141827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <span style={{ display: 'flex', padding: '4px 10px', background: 'rgba(245, 166, 35, 0.15)', border: '1px solid rgba(245, 166, 35, 0.3)', color: '#FFB800', borderRadius: '8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                          ⏳ Awaiting Buyer's Payment
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700, color: 'var(--gold)' }}>
                        ⏱️ Time Remaining: <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{timeRemaining}</span>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                        Receiving account details
                      </div>
                      <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        Your account receives ETB from <strong style={{ color: '#fff' }}>@{activeTrade.buyer_name}</strong>
                      </p>
                      {paymentAccount && (
                        <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '6px' }}>
                          Bank: {paymentAccount.bankName} · Acc: {paymentAccount.accountNumber}
                        </div>
                      )}
                    </div>

                    <div style={{ background: 'rgba(0, 200, 150, 0.05)', border: '1px solid rgba(0, 200, 150, 0.15)', borderRadius: '10px', padding: '12px', fontSize: '11.5px', color: '#a0eedb', lineHeight: '1.4' }}>
                      ℹ️ You'll be notified when the buyer transfers the ETB. Do NOT release USDT until you verify the funds are in your account!
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <button className="btn btn-outline" style={{ border: '1px solid rgba(255,255,255,0.08)', flex: 1 }} disabled>
                        Waiting for Buyer...
                      </button>
                      <button className="btn btn-ghost" style={{ color: '#FF4D4D', textDecoration: 'underline', fontSize: '12px' }} onClick={handleCancel}>
                        Cancel Trade
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Seller paid state */
                  <div style={{ background: '#141827', border: '1px solid rgba(0, 200, 150, 0.2)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ display: 'flex', padding: '4px 10px', background: 'rgba(0, 200, 150, 0.15)', border: '1px solid rgba(0, 200, 150, 0.3)', color: '#00FFC2', borderRadius: '8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                        ✓ Buyer Marked as Paid
                      </span>
                    </div>

                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#fff', fontWeight: 800 }}>Confirm & Release USDT</h3>
                      <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        Please verify that you have received <strong>{Math.round(activeTrade.amount_eth * rate).toLocaleString()} ETB</strong> in your bank/wallet from <strong>@{activeTrade.buyer_name}</strong>.
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <button className="btn gold-glow-btn" style={{ flex: 2, color: '#0B0E1A', fontWeight: 700 }} onClick={handleRelease}>
                        Release USDT
                      </button>
                      <button className="btn btn-ghost" style={{ color: '#FF4D4D', flex: 1 }} onClick={handleOpenDispute}>
                        Dispute Trade
                      </button>
                    </div>
                  </div>
                )
              )}

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

          {/* Chat Component */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <TradeChat tradeId={activeTrade.id} sellerId={activeTrade.seller_id} buyerId={activeTrade.buyer_id} tradeStatus={activeTrade.status} />
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
