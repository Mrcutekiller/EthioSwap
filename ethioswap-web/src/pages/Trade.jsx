import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star } from '@phosphor-icons/react';
import { traders } from '../data/dummy';
import './Trade.css';

export default function Trade() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('buy');
  const [method, setMethod] = useState('All');

  const methods = ['All', 'CBE Birr', 'Telebirr', 'HelloCash'];

  const filtered = traders.filter(t => {
    if (t.type !== mode) return false;
    if (method !== 'All' && !t.methods.includes(method)) return false;
    return true;
  });

  return (
    <div className="trade page-fade">
      <h1 className="page-title">Trade</h1>

      <div className="trade-filters">
        <div className="mode-toggle">
          <button
            className={`mode-btn ${mode === 'buy' ? 'active' : ''}`}
            onClick={() => setMode('buy')}
          >
            Buy
          </button>
          <button
            className={`mode-btn ${mode === 'sell' ? 'active' : ''}`}
            onClick={() => setMode('sell')}
          >
            Sell
          </button>
        </div>
        <div className="method-pills">
          {methods.map(m => (
            <button
              key={m}
              className={`method-pill ${method === m ? 'active' : ''}`}
              onClick={() => setMethod(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="trader-grid">
        {filtered.map(trader => (
          <div
            key={trader.id}
            className="trader-card"
            onClick={() => navigate(`/profile/${trader.id}`)}
          >
            <div className="trader-top">
              <div className="trader-avatar">
                {trader.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="trader-meta">
                <span className="trader-name">{trader.name}</span>
                <span className="trader-rating">
                  {trader.rating} <Star size={12} weight="fill" className="star-icon" />
                </span>
              </div>
              <span className={`trader-badge badge-${trader.type}`}>
                {trader.type.toUpperCase()}
              </span>
            </div>
            <div className="trader-price">
              <span className="price-main">{trader.price} ETB</span>
              <span className="price-unit">/ USDT</span>
            </div>
            <div className="trader-limits">
              Min ${trader.limits.min} — Max ${trader.limits.max}
            </div>
            <div className="trader-methods">
              {trader.methods.map(m => (
                <span key={m} className="method-badge">{m}</span>
              ))}
            </div>
            <button className={`trader-action ${trader.type === 'buy' ? 'action-buy' : 'action-sell'}`}>
              {trader.type === 'buy' ? 'Buy Now' : 'Sell Now'}
            </button>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <p className="empty-title">No listings found</p>
          <p className="empty-sub">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}
