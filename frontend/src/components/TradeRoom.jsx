import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from 'react-i18next';
import TradeChat from './TradeChat.jsx';
import { Star, Shield, CreditCard, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';

const RatingModal = ({ trade, ratedUserId, onClose, onSubmit }) => {
  const [stars, setStars] = useState(5);
  const [review, setReview] = useState('');
  const { t } = useTranslation();

  return (
    <div className="modal-overlay">
      <div className="card glass-card" style={{ maxWidth: '400px', width: '90%', padding: '24px', textAlign: 'center' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>Rate your trade!</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '20px' }}>How was your experience with @{trade.buyer_id === ratedUserId ? trade.buyerName : trade.sellerName}?</p>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
          {[1, 2, 3, 4, 5].map(s => (
            <Star 
              key={s} 
              size={32} 
              fill={s <= stars ? '#f5c518' : 'none'} 
              color={s <= stars ? '#f5c518' : 'var(--text-3)'} 
              style={{ cursor: 'pointer' }}
              onClick={() => setStars(s)}
            />
          ))}
        </div>

        <textarea 
          className="input" 
          placeholder="Write a review (optional)..." 
          style={{ height: '80px', marginBottom: '20px' }}
          value={review}
          onChange={e => setReview(e.target.value)}
        ></textarea>

        <button className="btn btn-gold btn-full" onClick={() => onSubmit(stars, review)}>Submit Rating</button>
        <button className="btn btn-ghost btn-full" style={{ marginTop: '10px' }} onClick={onClose}>Skip</button>
      </div>
    </div>
  );
};

const TradeRoom = () => {
  const { user, trades, markTradeAsPaid, releaseEscrow, openDispute, submitRating, setError, setSuccess } = useAuth();
  const { t } = useTranslation();
  const [selectedTradeId, setSelectedTradeId] = useState(null);
  const [showRating, setShowRating] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');

  const activeTrade = trades.find(t => t.id === selectedTradeId);

  useEffect(() => {
    if (!activeTrade || activeTrade.status === 'completed' || activeTrade.status === 'cancelled') {
      setTimeRemaining('');
      return;
    }

    const interval = setInterval(() => {
      const expires = new Date(activeTrade.timer_expires_at).getTime();
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
    await markTradeAsPaid(activeTrade.id, ''); // In real app, upload proof first
  };

  const handleRelease = async () => {
    if (!window.confirm("Confirm that you have received the payment? This will release the USDT to the buyer.")) return;
    await releaseEscrow(activeTrade.id);
    setShowRating(true);
  };

  const handleOpenDispute = async () => {
    const reason = prompt("Why are you opening a dispute?");
    if (reason) await openDispute(activeTrade.id, reason);
  };

  const handleRatingSubmit = async (stars, review) => {
    const ratedUserId = user.id === activeTrade.buyer_id ? activeTrade.seller_id : activeTrade.buyer_id;
    await submitRating(activeTrade.id, ratedUserId, stars, review);
    setShowRating(false);
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
              style={{
                padding: '12px', borderRadius: '12px', cursor: 'pointer',
                background: selectedTradeId === trade.id ? 'rgba(245, 197, 24, 0.1)' : 'var(--bg-elevated)',
                border: `1px solid ${selectedTradeId === trade.id ? '#f5c518' : 'var(--border)'}`,
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700 }}>@{user.id === trade.buyer_id ? trade.sellerName : trade.buyerName}</span>
                <span style={{ fontSize: '10px', fontWeight: 800, color: trade.status === 'completed' ? '#00d4a0' : '#f5c518' }}>
                  {trade.status.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>${trade.amount_eth.toFixed(2)} USDT</div>
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
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(245, 197, 24, 0.1)', color: '#f5c518', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                <button className="btn btn-ghost" style={{ color: '#ef4444' }} onClick={handleOpenDispute}>{t('Open Dispute')}</button>
              )}
            </div>
          </div>

          {/* Chat Component */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <TradeChat tradeId={activeTrade.id} sellerId={activeTrade.seller_id} buyerId={activeTrade.buyer_id} />
          </div>

          {showRating && (
            <RatingModal 
              trade={activeTrade} 
              ratedUserId={user.id === activeTrade.buyer_id ? activeTrade.seller_id : activeTrade.buyer_id} 
              onClose={() => setShowRating(false)}
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
