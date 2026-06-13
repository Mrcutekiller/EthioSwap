import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useQuery } from 'convex/react';
import { api } from 'convex-api';

/* ─── Helpers ──────────────────────────────────────────────────── */
const fmt = (n, d = 2) => (+(n ?? 0)).toFixed(d);
const fmtEtb = (n) => Math.round(n ?? 0).toLocaleString();

/* ─── Mini Sparkline Chart ───────────────────────────────────── */
const Sparkline = ({ data, color = '#F5A623', height = 40, width = 80 }) => {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });
  const area = `M${pts[0]} ${pts.slice(1).map(p => `L${p}`).join(' ')} L${width},${height} L0,${height} Z`;
  const line = `M${pts[0]} ${pts.slice(1).map(p => `L${p}`).join(' ')}`;
  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color.replace('#','')})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length-1].split(',')[0]} cy={pts[pts.length-1].split(',')[1]} r="2.5" fill={color} />
    </svg>
  );
};

/* ─── Stat Card ───────────────────────────────────────────────── */
const StatCard = ({ icon, label, value, sub, color = 'var(--gold)', sparkData, trend }) => (
  <div style={{
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.25s ease',
  }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}44`; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 30px ${color}15`; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
          {icon}
        </div>
        <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      </div>
      {trend !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 600, color: trend >= 0 ? 'var(--teal)' : 'var(--danger)', background: trend >= 0 ? 'rgba(0,200,150,0.12)' : 'rgba(255,77,77,0.12)', padding: '3px 7px', borderRadius: '99px' }}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </div>
      )}
    </div>

    <div>
      <div style={{ fontSize: '28px', fontWeight: 600, color: color, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', fontWeight: 400 }}>{sub}</div>}
    </div>

    {sparkData && (
      <div style={{ opacity: 0.7 }}>
        <Sparkline data={sparkData} color={color} width={100} height={32} />
      </div>
    )}
  </div>
);

/* ─── Quick Action Button ─────────────────────────────────────── */
const QuickAction = ({ icon, label, color, onClick }) => (
  <button onClick={onClick} style={{
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '18px 12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    flex: 1,
    minWidth: 0,
  }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}40`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
  >
    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {icon}
    </div>
    <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{label}</span>
  </button>
);

/* ─── Live Rate Ticker ────────────────────────────────────────── */
const RateTicker = ({ systemSettings }) => {
  const [blink, setBlink] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setBlink(p => !p), 1800);
    return () => clearInterval(t);
  }, []);

  const rate = systemSettings?.etbRatePerDollar ?? 190;
  const sellRate = systemSettings?.etbRatePerDollarSell ?? 186;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(245,166,35,0.06) 0%, rgba(0,200,150,0.04) 100%)',
      border: '1px solid rgba(245,166,35,0.15)',
      borderRadius: '16px',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00C896', boxShadow: '0 0 8px #00C896', opacity: blink ? 1 : 0.3, transition: 'opacity 0.4s ease' }} />
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live ETB/USD Rate</span>
      </div>
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#00C896', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Buy</div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#fff', fontFamily: "'JetBrains Mono', monospace" }}>{rate.toLocaleString()}</div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>ETB per USD</div>
        </div>
        <div style={{ width: '1px', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#FF4D4D', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Sell</div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#fff', fontFamily: "'JetBrains Mono', monospace" }}>{sellRate.toLocaleString()}</div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>ETB per USD</div>
        </div>
        <div style={{ width: '1px', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#F5A623', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Spread</div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#F5A623', fontFamily: "'JetBrains Mono', monospace" }}>{(rate - sellRate).toFixed(0)}</div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>ETB</div>
        </div>
      </div>
    </div>
  );
};

/* ─── Recent Activity Item ────────────────────────────────────── */
const ActivityItem = ({ type, amount, status, date, counterparty }) => {
  const isDeposit = type === 'deposit';
  const isBuy = type === 'buy';
  const isPositive = isDeposit || isBuy;
  const color = isPositive ? 'var(--teal)' : 'var(--danger)';
  const bgColor = isPositive ? 'rgba(0,200,150,0.12)' : 'rgba(255,77,77,0.12)';

  const typeLabel = {
    deposit: 'Deposit',
    withdrawal: 'Withdrawal',
    buy: 'P2P Buy',
    sell: 'P2P Sell',
  }[type] || type;

  const typeIcon = {
    deposit: '⬇️',
    withdrawal: '⬆️',
    buy: '🤝',
    sell: '💱',
  }[type] || '💸';

  const pillClass = status === 'completed' || status === 'approved' ? 'status-pill-received' : status === 'pending' ? 'status-pill-pending' : 'status-pill-sent';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      padding: '14px 16px',
      background: 'var(--surface)',
      borderRadius: '12px',
      border: '1px solid var(--border)',
      transition: 'all 0.2s ease',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--surface2)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
        {typeIcon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{typeLabel}</span>
          {counterparty && <span style={{ fontSize: '11px', color: 'var(--muted)' }}>with @{counterparty}</span>}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
          {date ? new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Processing…'}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color, fontFamily: 'var(--font-mono)' }}>
          {isPositive ? '+' : '-'}${fmt(amount)}
        </div>
        <div style={{ marginTop: '4px' }}>
          <span className={`status-pill ${pillClass}`}>
            {status || 'pending'}
          </span>
        </div>
      </div>
    </div>
  );
};

/* ─── QR Scan Modal (Placeholder — real feature can be wired up) */
const QRModal = ({ onClose, address }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }} onClick={onClose}>
    <div style={{ background: '#141827', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '24px', padding: '32px', maxWidth: '320px', width: '100%', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
      <div style={{ fontSize: '14px', fontWeight: 800, color: '#F5A623', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📱 Scan to Deposit</div>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', display: 'inline-block', marginBottom: '20px' }}>
        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180&data=${address || 'ethioswap'}`} alt="QR Code" style={{ width: 180, height: 180, display: 'block' }} />
      </div>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', wordBreak: 'break-all', fontFamily: "'JetBrains Mono', monospace", padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', marginBottom: '20px' }}>
        {address || 'No address assigned'}
      </div>
      <button onClick={onClose} style={{ width: '100%', padding: '13px', background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '12px', color: '#F5A623', fontWeight: 800, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>
        Close
      </button>
    </div>
  </div>
);

/* ─── Main Dashboard ──────────────────────────────────────────── */
const UserDashboard = ({ onNavigate, onNavigateToSeller }) => {
  const {
    user, wallet,
    myDepositReqs, myWithdrawalReqs,
    systemSettings,
    trades,
  } = useAuth();

  const [showQR, setShowQR] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [greeting, setGreeting] = useState('');
  const [animIn, setAnimIn] = useState(false);

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting('Good morning');
    else if (h < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
    setTimeout(() => setAnimIn(true), 50);
  }, []);

  /* ── Stats ── */
  const balance = wallet?.ethBalance ?? wallet?.eth_balance ?? 0;
  const locked = wallet?.ethLocked ?? wallet?.eth_locked ?? 0;
  const available = Math.max(0, balance - locked);
  const rate = systemSettings?.etbRatePerDollar ?? 190;
  const address = wallet?.ethAddress ?? wallet?.eth_address ?? '';

  const completedTrades = useMemo(() => (trades || []).filter(t => t.status === 'completed'), [trades]);
  const pendingTrades = useMemo(() => (trades || []).filter(t => t.status === 'pending' || t.status === 'active'), [trades]);

  const totalVolume = useMemo(() => completedTrades.reduce((sum, t) => sum + (t.amountEth || 0), 0), [completedTrades]);

  const totalDeposited = useMemo(() =>
    (myDepositReqs || []).filter(r => r.status === 'approved').reduce((s, r) => s + (r.amountUsd || r.amountUSD || 0), 0),
    [myDepositReqs]
  );

  /* ── Recent activity merged ── */
  const recentActivity = useMemo(() => {
    const deps = (myDepositReqs || []).slice(0, 4).map(r => ({
      type: 'deposit',
      amount: r.amountUsd || r.amountUSD || 0,
      status: r.status,
      date: r.createdAt || r.created_at,
    }));
    const wds = (myWithdrawalReqs || []).slice(0, 2).map(r => ({
      type: 'withdrawal',
      amount: r.amountUSD || 0,
      status: r.status,
      date: r.createdAt || r.created_at,
    }));
    const p2p = (trades || []).slice(0, 3).map(t => {
      const isBuyer = user?._id === t.buyerId;
      return {
        type: isBuyer ? 'buy' : 'sell',
        amount: t.amountEth || 0,
        status: t.status,
        date: t.createdAt,
        counterparty: isBuyer ? t.sellerName : t.buyerName,
      };
    });
    return [...deps, ...wds, ...p2p]
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 6);
  }, [myDepositReqs, myWithdrawalReqs, trades, user?._id]);

  /* ── Volume sparkline (last 7 days) ── */
  const volumeData = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push({ date: d, vol: 0 });
    }
    (completedTrades || []).forEach(t => {
      const td = new Date(t.createdAt);
      const match = days.find(d => d.date.toDateString() === td.toDateString());
      if (match) match.vol += (t.amountEth || 0);
    });
    return days.map(d => d.vol);
  }, [completedTrades]);

  const kycBannerVisible = !user?.kycStatus || user?.kycStatus === 'none';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px', opacity: animIn ? 1 : 0, transform: animIn ? 'translateY(0)' : 'translateY(16px)', transition: 'all 0.4s ease' }}>
      {/* ── Balance Card ── */}
      <div style={{
        background: 'var(--surface)',
        borderLeft: '3px solid var(--teal)',
        borderRadius: '16px',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 400, marginBottom: '4px' }}>Total Balance</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '32px', fontWeight: 600, color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>
                {showBalance ? `$${fmt(balance)}` : '••••••'}
              </span>
              <button onClick={() => setShowBalance(!showBalance)} style={{ padding: '6px', borderRadius: '8px', color: 'var(--muted)', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <i className={`ti ti-eye${showBalance ? '' : '-off'}`} style={{ fontSize: '18px' }}></i>
              </button>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--teal)', fontWeight: 400, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              ≈ {showBalance ? `${fmtEtb(balance * rate)} ETB` : '••••••'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>{greeting},</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>@{user?.username || 'Trader'}</div>
            {user?.kycStatus === 'approved' && (
              <span style={{ fontSize: '11px', fontWeight: 600, background: 'rgba(0,200,150,0.12)', color: 'var(--teal)', border: '1px solid rgba(0,200,150,0.25)', padding: '2px 8px', borderRadius: '99px', display: 'inline-block', marginTop: '4px' }}>
                ✓ Verified
              </span>
            )}
          </div>
        </div>
        {/* TRC20 Address */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'var(--surface2)', borderRadius: '10px', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>TRC20:</span>
          <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {address || 'No address assigned'}
          </span>
          <button onClick={() => navigator.clipboard?.writeText(address)} style={{ padding: '4px', color: 'var(--teal)', transition: 'opacity 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <i className="ti ti-copy" style={{ fontSize: '14px' }}></i>
          </button>
        </div>
      </div>

      {/* ── KYC Banner ── */}
      {kycBannerVisible && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.04) 100%)',
          border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: '14px',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🔐</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b' }}>Complete KYC Verification</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>Unlock higher trade limits and full platform access</div>
            </div>
          </div>
          <button onClick={() => onNavigate?.('profile')} style={{ padding: '9px 18px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '10px', color: '#f59e0b', fontWeight: 800, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.2s ease' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.15)'; }}
          >
            Verify Now →
          </button>
        </div>
      )}

      {/* ── Live Rate Ticker ── */}
      <RateTicker systemSettings={systemSettings} />

      {/* ── Stats Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
        <StatCard
          icon="💰"
          label="Total Balance"
          value={`$${fmt(balance)}`}
          sub="Your USDT wallet"
          color="var(--gold)"
        />
        <StatCard
          icon="📤"
          label="Total Sent"
          value={`$${fmt(totalVolume || 0)}`}
          sub="All time"
          color="var(--danger)"
        />
        <StatCard
          icon="📥"
          label="Total Received"
          value={`$${fmt(totalDeposited || 0)}`}
          sub="All time"
          color="var(--teal)"
        />
        <StatCard
          icon="📋"
          label="Active Orders"
          value={pendingTrades.length}
          sub="Open trades"
          color="var(--text)"
        />
      </div>

      {/* ── Quick Actions ── */}
      <div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '4px' }}>
          <QuickAction icon={<i className="ti ti-send" style={{ fontSize: '20px', color: 'var(--teal)' }}></i>} label="Send" color="var(--teal)" onClick={() => onNavigate?.('scan')} />
          <QuickAction icon={<i className="ti ti-download" style={{ fontSize: '20px', color: 'var(--teal)' }}></i>} label="Receive" color="var(--teal)" onClick={() => setShowQR(true)} />
          <QuickAction icon={<i className="ti ti-scan" style={{ fontSize: '20px', color: 'var(--teal)' }}></i>} label="Scan QR" color="var(--teal)" onClick={() => onNavigate?.('scan')} />
          <QuickAction icon={<i className="ti ti-arrow-up" style={{ fontSize: '20px', color: 'var(--teal)' }}></i>} label="Withdraw" color="var(--teal)" onClick={() => onNavigate?.('wallet')} />
        </div>
      </div>

      {/* ── Recent Activity ── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>Latest Transactions</div>
          <button onClick={() => onNavigate?.('transactions')} style={{ fontSize: '13px', color: 'var(--teal)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '4px 0' }}>
            See all →
          </button>
        </div>
        {recentActivity.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <i className="ti ti-inbox" style={{ fontSize: '36px', color: 'var(--teal)', opacity: 0.3, display: 'block', marginBottom: '10px' }}></i>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>No activity yet</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Start trading to see your history</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentActivity.map((item, i) => (
              <ActivityItem key={i} {...item} />
            ))}
          </div>
        )}
      </div>

      {/* ── QR Modal ── */}
      {showQR && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }} onClick={() => setShowQR(false)}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', maxWidth: '320px', width: '100%', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--teal)', marginBottom: '20px' }}>Scan to Deposit</div>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', display: 'inline-block', marginBottom: '20px' }}>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180&data=${address || 'ethioswap'}`} alt="QR Code" style={{ width: 180, height: 180, display: 'block' }} />
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', wordBreak: 'break-all', fontFamily: 'var(--font-mono)', padding: '10px 14px', background: 'var(--surface2)', borderRadius: '10px', marginBottom: '20px' }}>
              {address || 'No address assigned'}
            </div>
            <button onClick={() => setShowQR(false)} style={{ width: '100%', padding: '12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text)', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
