import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const MarketRates = ({ onSelectOffer, isLoggedIn }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: listings } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'active');
      
      if (!listings || listings.length === 0) {
        setData({ bestBuyRate: 190, bestSellRate: 186, bestBuyOfferId: null, bestSellOfferId: null, rateHistory: [] });
        return;
      }

      const buyOffers = listings.filter(l => l.type === 'buy');
      const sellOffers = listings.filter(l => l.type === 'sell');
      
      const bestBuyRate = buyOffers.length > 0 ? Math.max(...buyOffers.map(o => o.rate)) : 190;
      const bestSellRate = sellOffers.length > 0 ? Math.min(...sellOffers.map(o => o.rate)) : 186;
      const bestBuyOfferId = buyOffers.find(o => o.rate === bestBuyRate)?.id || null;
      const bestSellOfferId = sellOffers.find(o => o.rate === bestSellRate)?.id || null;

      setData({ bestBuyRate, bestSellRate, bestBuyOfferId, bestSellOfferId, rateHistory: [] });
    };
    fetchData();
  }, []);

  const [mode, setMode] = useState('buy');
  const [usdtAmount, setUsdtAmount] = useState('');
  const [etbAmount, setEtbAmount] = useState('');
  const [lastEdited, setLastEdited] = useState('usdt');

  const bestBuyRate = data?.bestBuyRate || 190;
  const bestSellRate = data?.bestSellRate || 186;
  const rateHistory = data?.rateHistory || [];

  const currentRate = mode === 'buy' ? bestBuyRate : bestSellRate;

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
    if (val === '') { setEtbAmount(''); return; }
    const calculated = parseFloat(val) * currentRate;
    setEtbAmount(isNaN(calculated) ? '' : calculated.toFixed(2));
  };

  const handleEtbChange = (e) => {
    const val = e.target.value;
    setEtbAmount(val);
    setLastEdited('etb');
    if (val === '') { setUsdtAmount(''); return; }
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
        Loading market rates...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{
        padding: '28px',
        borderRadius: '20px',
        background: 'linear-gradient(135deg, rgba(245,166,35,0.10) 0%, rgba(0,200,150,0.08) 100%)',
        border: '1px solid rgba(245,166,35,0.3)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        boxShadow: '0 8px 40px rgba(0,0,0,0.3)'
      }}>
        <div style={{ fontSize: '12px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: '8px' }}>
          USDT / ETB Live Market Average
        </div>
        <div style={{ fontSize: '48px', fontWeight: 900, color: '#fff', fontFamily: 'JetBrains Mono, monospace', margin: '12px 0' }}>
          {((bestBuyRate + bestSellRate) / 2).toFixed(2)} <span style={{ fontSize: '20px', fontWeight: 500 }}>ETB</span>
        </div>
        <div style={{ fontSize: '14px', color: changePercent >= 0 ? '#00C896' : '#FF4D4D', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
          {changePercent >= 0 ? '▲ +' : '▼ '}{changePercent}% last 24h
        </div>
      </div>

      <div style={{ padding: '20px', borderRadius: '20px', background: '#141827', border: '1px solid #1E2640' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-3)', marginBottom: '12px', fontWeight: 600 }}>
          <span>24h Trend Chart</span>
          <span style={{ color: changePercent >= 0 ? '#00C896' : '#FF4D4D' }}>
            {changePercent >= 0 ? 'Trending Up' : 'Trending Down'}
          </span>
        </div>
        <svg viewBox="0 0 400 100" style={{ width: '100%', height: '100px', display: 'block' }}>
          {rateHistory.length > 1 && (() => {
            const rates = rateHistory.map(r => r.averageRate);
            const min = Math.min(...rates);
            const max = Math.max(...rates);
            const range = (max - min) || 1;
            const step = 400 / (rates.length - 1);
            const points = rates.map((r, i) => `${i * step},${85 - ((r - min) / range) * 70}`).join(' ');
            return (
              <>
                <polyline fill="none" stroke={changePercent >= 0 ? '#00C896' : '#FF4D4D'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} />
                <polygon fill={changePercent >= 0 ? 'rgba(0,200,150,0.12)' : 'rgba(255,77,77,0.12)'} points={`0,100 ${points} 400,100`} />
              </>
            );
          })()}
        </svg>
      </div>

      <div style={{ padding: '28px', borderRadius: '20px', background: '#141827', border: '1px solid #1E2640', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', background: '#0a0a0a', borderRadius: '12px', padding: '4px', border: '1px solid #1E2640' }}>
          <button onClick={() => setMode('buy')} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer', background: mode === 'buy' ? 'var(--gold)' : 'transparent', color: mode === 'buy' ? '#0a0a0a' : 'var(--text-3)', transition: 'all 0.2s' }}>
            Buy USDT
          </button>
          <button onClick={() => setMode('sell')} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer', background: mode === 'sell' ? 'var(--gold)' : 'transparent', color: mode === 'sell' ? '#0a0a0a' : 'var(--text-3)', transition: 'all 0.2s' }}>
            Sell USDT
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 700 }}>USDT</label>
          <div style={{ position: 'relative' }}>
            <input type="number" placeholder="0.00" value={usdtAmount} onChange={handleUsdtChange} className="input" style={{ width: '100%', paddingRight: '70px', margin: 0, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '18px', height: '56px', borderRadius: '12px' }} />
            <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', fontWeight: 800, color: 'var(--gold)' }}>USDT</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 700 }}>ETB</label>
          <div style={{ position: 'relative' }}>
            <input type="number" placeholder="0.00" value={etbAmount} onChange={handleEtbChange} className="input" style={{ width: '100%', paddingRight: '70px', margin: 0, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '18px', height: '56px', borderRadius: '12px' }} />
            <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', fontWeight: 800, color: 'var(--text-1)' }}>ETB</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px', borderRadius: '20px', background: '#141827', border: '1px solid #1E2640', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,200,150,0.08)', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(0,200,150,0.2)' }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#00C896' }}>Best Buy Offer (You buy)</span>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#fff', fontFamily: 'JetBrains Mono, monospace' }}>{bestBuyRate.toFixed(2)} ETB</div>
          </div>
          {onSelectOffer && (
            <button onClick={() => onSelectOffer('buy', data.bestBuyOfferId)} style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', background: '#00C896', color: '#0a0a0a', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Trade →
            </button>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(245,166,35,0.08)', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(245,166,35,0.2)' }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold)' }}>Best Sell Offer (You sell)</span>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#fff', fontFamily: 'JetBrains Mono, monospace' }}>{bestSellRate.toFixed(2)} ETB</div>
          </div>
          {onSelectOffer && (
            <button onClick={() => onSelectOffer('sell', data.bestSellOfferId)} style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', background: 'var(--gold)', color: '#0a0a0a', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Trade →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketRates;