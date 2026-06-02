import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Bell, RefreshCw } from 'lucide-react';

const MarketRates = () => {
  const { t } = useTranslation();
  const { createPriceAlert } = useAuth();
  const [currentRate, setCurrentRate] = useState(null);
  const [rateHistory, setRateHistory] = useState([]);
  const [bestBuyRates, setBestBuyRates] = useState([]);
  const [bestSellRates, setBestSellRates] = useState([]);
  const [timeframe, setTimeframe] = useState('1D');
  const [loading, setLoading] = useState(true);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [alertPrice, setAlertPrice] = useState('');
  const [alertCondition, setAlertCondition] = useState('above');

  useEffect(() => {
    fetchRateData();
    fetchBestRates();
    const interval = setInterval(fetchRateData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchRateData = async () => {
    try {
      const { data } = await supabase.from('rate_history')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(200);
      if (data && data.length > 0) {
        setCurrentRate(data[0]);
        setRateHistory(data);
      }
    } catch (err) {
      console.error('Error fetching rate:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBestRates = async () => {
    const { data: listings } = await supabase.from('listings')
      .select('*, seller:users!seller_id(username, avg_rating)')
      .eq('status', 'active')
      .eq('type', 'sell')
      .order('custom_rate_etb', { ascending: true })
      .limit(5);
    if (listings) setBestBuyRates(listings);

    const { data: sellListings } = await supabase.from('listings')
      .select('*, seller:users!seller_id(username, avg_rating)')
      .eq('status', 'active')
      .eq('type', 'buy')
      .order('custom_rate_etb', { ascending: false })
      .limit(5);
    if (sellListings) setBestSellRates(sellListings);
  };

  const handleCreateAlert = async () => {
    if (!alertPrice) return;
    await createPriceAlert(parseFloat(alertPrice), alertCondition);
    setShowAlertForm(false);
    setAlertPrice('');
  };

  const get24hChange = () => {
    if (rateHistory.length < 2) return 0;
    const now = rateHistory[0]?.usdt_etb_rate || 0;
    const dayAgo = rateHistory[Math.min(96, rateHistory.length - 1)]?.usdt_etb_rate || now;
    return ((now - dayAgo) / dayAgo * 100).toFixed(2);
  };

  const get24hHigh = () => {
    const last24 = rateHistory.slice(0, 96);
    return Math.max(...last24.map(r => r.usdt_etb_rate)).toFixed(2);
  };

  const get24hLow = () => {
    const last24 = rateHistory.slice(0, 96);
    return Math.min(...last24.map(r => r.usdt_etb_rate)).toFixed(2);
  };

  const change = parseFloat(get24hChange());
  const filteredHistory = timeframe === '1D' ? rateHistory.slice(0, 96)
    : timeframe === '7D' ? rateHistory.slice(0, 672)
    : timeframe === '30D' ? rateHistory.slice(0, 2880)
    : rateHistory;

  if (loading) return <div className="card" style={{ padding: '40px', textAlign: 'center' }}>Loading market rates...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      {/* Main Rate Display */}
      <div className="card glass-card" style={{ padding: '28px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(245,197,24,0.05) 0%, rgba(0,212,160,0.05) 100%)' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>USDT / ETB</div>
        <div style={{ fontSize: '36px', fontWeight: 900, color: '#fff', fontFamily: 'JetBrains Mono, monospace' }}>
          {currentRate?.usdt_etb_rate?.toFixed(2) || '---'}
        </div>
        <div style={{ fontSize: '13px', color: change >= 0 ? '#00d4a0' : '#ef4444', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          {change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {change >= 0 ? '+' : ''}{change}% today
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '8px' }}>
          Updated: {currentRate ? new Date(currentRate.recorded_at).toLocaleTimeString() : '---'}
        </div>
      </div>

      {/* Timeframe Selector */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        {['1D', '7D', '30D', '90D'].map(tf => (
          <button key={tf} onClick={() => setTimeframe(tf)} className={`btn ${timeframe === tf ? 'btn-gold' : 'btn-ghost'}`} style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 700 }}>
            {tf}
          </button>
        ))}
      </div>

      {/* Chart Placeholder (SVG mini chart) */}
      <div className="card" style={{ padding: '20px' }}>
        <svg viewBox="0 0 400 120" style={{ width: '100%', height: '120px' }}>
          {filteredHistory.length > 1 && (() => {
            const rates = filteredHistory.map(r => r.usdt_etb_rate);
            const min = Math.min(...rates);
            const max = Math.max(...rates);
            const range = max - min || 1;
            const step = 400 / (rates.length - 1);
            const points = rates.map((r, i) => `${i * step},${120 - ((r - min) / range) * 100}`).join(' ');
            return (
              <>
                <polyline fill="none" stroke={change >= 0 ? '#00d4a0' : '#ef4444'} strokeWidth="2" points={points} />
                <polygon fill={change >= 0 ? 'rgba(0,212,160,0.1)' : 'rgba(239,68,68,0.1)'} points={`0,120 ${points} 400,120`} />
              </>
            );
          })()}
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-3)', marginTop: '8px' }}>
          <span>{filteredHistory.length > 0 ? new Date(filteredHistory[filteredHistory.length - 1]?.recorded_at).toLocaleDateString() : ''}</span>
          <span>{filteredHistory.length > 0 ? new Date(filteredHistory[0]?.recorded_at).toLocaleDateString() : ''}</span>
        </div>
      </div>

      {/* 24h Stats */}
      <div className="card" style={{ padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>24h High</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#00d4a0' }}>{get24hHigh()}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>24h Low</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#ef4444' }}>{get24hLow()}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>24h Change</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: change >= 0 ? '#00d4a0' : '#ef4444' }}>{change >= 0 ? '+' : ''}{change}%</div>
          </div>
        </div>
      </div>

      {/* Best P2P Rates */}
      {bestBuyRates.length > 0 && (
        <div className="card" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px', color: '#00d4a0' }}>BEST BUY RATES (you buy USDT)</h3>
          {bestBuyRates.slice(0, 3).map((l, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>{l.custom_rate_etb} ETB</div>
              <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>@{l.seller?.username} ⭐{(l.seller?.avg_rating || 0).toFixed(1)}</div>
            </div>
          ))}
        </div>
      )}

      {bestSellRates.length > 0 && (
        <div className="card" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px', color: '#ef4444' }}>BEST SELL RATES (you sell USDT)</h3>
          {bestSellRates.slice(0, 3).map((l, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>{l.custom_rate_etb} ETB</div>
              <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>@{l.seller?.username} ⭐{(l.seller?.avg_rating || 0).toFixed(1)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Set Alert Button */}
      <button onClick={() => setShowAlertForm(true)} className="btn btn-gold btn-full" style={{ padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <Bell size={18} /> {t('Set Alert')}
      </button>

      {/* Alert Form Modal */}
      {showAlertForm && (
        <div className="modal-overlay" onClick={() => setShowAlertForm(false)}>
          <div className="card glass-card" style={{ maxWidth: '400px', width: '90%', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>Create Price Alert</h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button onClick={() => setAlertCondition('above')} className={`btn ${alertCondition === 'above' ? 'btn-gold' : 'btn-ghost'}`} style={{ flex: 1 }}>Above</button>
              <button onClick={() => setAlertCondition('below')} className={`btn ${alertCondition === 'below' ? 'btn-gold' : 'btn-ghost'}`} style={{ flex: 1 }}>Below</button>
            </div>
            <input type="number" className="input" placeholder="Target price in ETB" value={alertPrice} onChange={e => setAlertPrice(e.target.value)} style={{ marginBottom: '16px' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowAlertForm(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
              <button onClick={handleCreateAlert} className="btn btn-gold" style={{ flex: 1 }}>Create Alert</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketRates;
