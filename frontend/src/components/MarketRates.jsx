import React, { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

const MarketRates = ({ onSelectOffer, isLoggedIn }) => {
  const { t } = useTranslation();
  const data = useQuery(api.listings.getCalculatorData);

  const [mode, setMode] = useState('buy'); // 'buy' means visitor buys USDT, 'sell' means visitor sells USDT
  const [usdtAmount, setUsdtAmount] = useState('');
  const [etbAmount, setEtbAmount] = useState('');
  const [lastEdited, setLastEdited] = useState('usdt');

  const bestBuyRate = data?.bestBuyRate || 110;
  const bestSellRate = data?.bestSellRate || 108;
  const rateHistory = data?.rateHistory || [];

  const currentRate = mode === 'buy' ? bestBuyRate : bestSellRate;

  // Auto-calculate on mode or rate change
  useEffect(() => {
    if (lastEdited === 'usdt' && usdtAmount !== '') {
      const val = parseFloat(usdtAmount) * currentRate;
      setEtbAmount(isNaN(val) ? '' : val.toFixed(2));
    } else if (lastEdited === 'etb' && etbAmount !== '') {
      const val = parseFloat(etbAmount) / currentRate;
      setUsdtAmount(isNaN(val) ? '' : val.toFixed(4));
    }
  }, [currentRate, usdtAmount, etbAmount, lastEdited]);

  const handleUsdtChange = (e) => {
    const val = e.target.value;
    setUsdtAmount(val);
    setLastEdited('usdt');
    if (val === '') {
      setEtbAmount('');
      return;
    }
    const calculated = parseFloat(val) * currentRate;
    setEtbAmount(isNaN(calculated) ? '' : calculated.toFixed(2));
  };

  const handleEtbChange = (e) => {
    const val = e.target.value;
    setEtbAmount(val);
    setLastEdited('etb');
    if (val === '') {
      setUsdtAmount('');
      return;
    }
    const calculated = parseFloat(val) / currentRate;
    setUsdtAmount(isNaN(calculated) ? '' : calculated.toFixed(4));
  };

  const get24hChange = () => {
    if (rateHistory.length < 2) return 0;
    const now = rateHistory[rateHistory.length - 1]?.averageRate || 0;
    const first = rateHistory[0]?.averageRate || now;
    if (first === 0) return 0;
    return (((now - first) / first) * 100).toFixed(2);
  };

  const changePercent = parseFloat(get24hChange());

  if (!data) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-3)' }}>
        {t('Loading market rates...')}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Rate Display Card */}
      <div className="premium-dashboard-card" style={{
        padding: '24px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(245,197,24,0.04) 0%, rgba(0,212,160,0.03) 100%)',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
          USDT / ETB Live Market Average
        </div>
        <div style={{ fontSize: '32px', fontWeight: 900, color: '#fff', fontFamily: 'JetBrains Mono, monospace', margin: '8px 0' }}>
          {((bestBuyRate + bestSellRate) / 2).toFixed(2)} <span style={{ fontSize: '18px', fontWeight: 500 }}>ETB</span>
        </div>
        <div style={{ fontSize: '12px', color: changePercent >= 0 ? '#00d4a0' : '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
          {changePercent >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {changePercent >= 0 ? '▲ +' : '▼ '}{changePercent}% {t('last 24h')}
        </div>
      </div>

      {/* SVG Sparkline */}
      <div className="premium-dashboard-card" style={{ padding: '16px', borderRadius: '16px', background: '#111318', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
          <span>24h Trend Chart</span>
          <span style={{ color: changePercent >= 0 ? '#00d4a0' : '#ef4444' }}>
            {changePercent >= 0 ? 'Trending Up' : 'Trending Down'}
          </span>
        </div>
        <svg viewBox="0 0 400 80" style={{ width: '100%', height: '80px', display: 'block' }}>
          {rateHistory.length > 1 && (() => {
            const rates = rateHistory.map(r => r.averageRate);
            const min = Math.min(...rates);
            const max = Math.max(...rates);
            const range = (max - min) || 1;
            const step = 400 / (rates.length - 1);
            const points = rates.map((r, i) => `${i * step},${70 - ((r - min) / range) * 60}`).join(' ');
            return (
              <>
                <polyline fill="none" stroke={changePercent >= 0 ? '#00d4a0' : '#ef4444'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
                <polygon fill={changePercent >= 0 ? 'rgba(0,212,160,0.06)' : 'rgba(239,68,68,0.06)'} points={`0,80 ${points} 400,80`} />
              </>
            );
          })()}
        </svg>
      </div>

      {/* Calculator Inputs Card */}
      <div className="premium-dashboard-card" style={{ padding: '24px', borderRadius: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', background: '#0a0a0a', borderRadius: '10px', padding: '3px', border: '1px solid var(--border)' }}>
          <button onClick={() => setMode('buy')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', background: mode === 'buy' ? 'var(--gold)' : 'transparent', color: mode === 'buy' ? '#0a0a0a' : 'var(--text-secondary)', transition: 'all 0.2s' }}>
            {t('Buy USDT')}
          </button>
          <button onClick={() => setMode('sell')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', background: mode === 'sell' ? 'var(--gold)' : 'transparent', color: mode === 'sell' ? '#0a0a0a' : 'var(--text-secondary)', transition: 'all 0.2s' }}>
            {t('Sell USDT')}
          </button>
        </div>

        {/* USDT Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700 }}>USDT</label>
          <div style={{ position: 'relative' }}>
            <input type="number" placeholder="0.00" value={usdtAmount} onChange={handleUsdtChange} className="input" style={{ width: '100%', paddingRight: '64px', margin: 0, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '16px' }} />
            <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: 800, color: 'var(--gold)' }}>USDT</span>
          </div>
        </div>

        {/* ETB Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700 }}>ETB</label>
          <div style={{ position: 'relative' }}>
            <input type="number" placeholder="0.00" value={etbAmount} onChange={handleEtbChange} className="input" style={{ width: '100%', paddingRight: '64px', margin: 0, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '16px' }} />
            <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: 800, color: 'var(--text-1)' }}>ETB</span>
          </div>
        </div>
      </div>

      {/* Best Offers Section */}
      <div className="premium-dashboard-card" style={{ padding: '20px', borderRadius: '16px', background: '#111318', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#00d4a0' }}>Best Buy Offer (Taker buys)</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>{bestBuyRate.toFixed(2)} ETB</span>
            <button onClick={() => onSelectOffer('buy', data.bestBuyOfferId)} style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', background: 'rgba(0,212,160,0.15)', color: '#00d4a0', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
              Go <ArrowRight size={10} />
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold)' }}>Best Sell Offer (Taker sells)</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>{bestSellRate.toFixed(2)} ETB</span>
            <button onClick={() => onSelectOffer('sell', data.bestSellOfferId)} style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', background: 'rgba(245,197,24,0.15)', color: 'var(--gold)', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
              Go <ArrowRight size={10} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketRates;
