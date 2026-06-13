import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

/* ─── helpers ─────────────────────────────────────────────────── */
const fmt = (n, d = 2) => (+(n ?? 0)).toFixed(d);
const fmtEtb = (n) => Math.round(n ?? 0).toLocaleString();

/* ─── static data ─────────────────────────────────────────────── */
const NETWORKS = [
  { id: 'trc20', label: 'TRC-20', coin: 'USDT', color: '#e83564', fee: 1 },
  { id: 'erc20', label: 'ERC-20', coin: 'USDT', color: '#627eea', fee: 10 },
  { id: 'bep20', label: 'BEP-20', coin: 'BSC',  color: '#f0b90b', fee: 0.5 },
];

const StatusBadge = ({ status }) => {
  const s = {
    pending:  { color: '#F5A623', bg: 'rgba(245,166,35,0.12)',  label: '⏳ Pending' },
    approved: { color: '#00C896', bg: 'rgba(0,200,150,0.12)',   label: '✓ Approved' },
    rejected: { color: '#FF4D4D', bg: 'rgba(255,77,77,0.12)',   label: '✗ Rejected' },
  }[status] ?? { color: '#8A9BB8', bg: 'rgba(255,255,255,0.05)', label: status };
  return (
    <span style={{
      fontSize: '10px', fontWeight: 600, padding: '3px 9px',
      borderRadius: '99px', background: s.bg, color: s.color,
    }}>{s.label}</span>
  );
};

/* ─── Fee breakdown pill ──────────────────────────────────────── */
const FeePill = ({ label, value, color = '#F5A623' }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 12px', borderRadius: '10px',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
  }}>
    <span style={{ fontSize: '12px', color: '#8A9BB8' }}>{label}</span>
    <span style={{ fontSize: '13px', fontWeight: 600, color }}>{value}</span>
  </div>
);

/* ─── networkChip selection helper ───────────────────────────────── */
const networkChip = (networkId, selectedId, setSelectedId) => {
  const n = NETWORKS.find(item => item.id === networkId);
  if (!n) return null;
  const isActive = selectedId === networkId;
  return (
    <button
      key={networkId}
      type="button"
      onClick={() => setSelectedId(networkId)}
      style={{
        padding: '6px 12px',
        borderRadius: '8px',
        border: `1.5px solid ${isActive ? n.color : 'rgba(255,255,255,0.06)'}`,
        background: isActive ? 'rgba(255,255,255,0.03)' : 'transparent',
        color: isActive ? '#fff' : '#8b92a8',
        fontSize: '11px',
        fontWeight: 700,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.15s ease',
      }}
    >
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: n.color }} />
      {n.label}
    </button>
  );
};

/* ─── Main component ──────────────────────────────────────────── */
const WalletCard = () => {
  const {
    user, wallet,
    withdrawETH, myDepositReqs, myWithdrawalReqs, myTransactions,
    createDepositRequest, setError, setSuccess, systemSettings,
  } = useAuth();

  const [tab, setTab]             = useState('balance');
  const [copied, setCopied]       = useState(false);
  const [qrNet, setQrNet]         = useState('trc20');

  // Deposit
  const [depNet, setDepNet]       = useState('trc20');
  const [depAmt, setDepAmt]       = useState('');
  const [depTxId, setDepTxId]     = useState('');
  const [depLoading, setDepLoading] = useState(false);

  // Deposit OTP
  const [showDepOtp, setShowDepOtp] = useState(false);
  const [depOtpCode, setDepOtpCode] = useState('');
  const [depSendingOtp, setDepSendingOtp] = useState(false);
  const [depResendTimer, setDepResendTimer] = useState(0);
  const [depOtpError, setDepOtpError] = useState('');

  // Withdraw
  const [wdNet, setWdNet]         = useState('trc20');
  const [wdAmt, setWdAmt]         = useState('');
  const [wdAddr, setWdAddr]       = useState('');
  const [wdPin, setWdPin]         = useState('');
  const [wdLoading, setWdLoading] = useState(false);

  const { sendOtp } = useAuth();
  const [showWdOtp, setShowWdOtp] = useState(false);
  const [wdOtpCode, setWdOtpCode] = useState('');
  const [wdSendingOtp, setWdSendingOtp] = useState(false);
  const [wdResendTimer, setWdResendTimer] = useState(0);
  const [wdOtpError, setWdOtpError] = useState('');

  // Send
  const [snAmt, setSnAmt]         = useState('');
  const [snTo, setSnTo]           = useState('');

  /* ─── computed ─────────────────────────────────────────────── */
  const rate        = systemSettings?.etbRatePerDollar ?? 190;
  const depFeePercent = systemSettings?.depositFeePercent ?? 1.0;  // %
  const wdFeePercent  = systemSettings?.withdrawalFeePercent ?? 1.0; // %
  const minDep      = systemSettings?.minDepositUSD   ?? 1;
  const minWd       = systemSettings?.minWithdrawalUSD ?? 10;

  const balance     = wallet?.ethBalance  ?? wallet?.eth_balance  ?? 0;
  const locked      = wallet?.ethLocked   ?? wallet?.eth_locked   ?? 0;
  const available   = Math.max(0, balance - locked);
  const address     = wallet?.ethAddress  ?? wallet?.eth_address  ?? '';
  const numId       = wallet?.numericId   ?? wallet?.numeric_id;

  const selectedNetwork = NETWORKS.find(n => n.id === (tab === 'deposit' ? depNet : wdNet));
  const chainFee        = selectedNetwork?.fee ?? 1;

  /* deposit breakdown */
  const depAmtNum     = parseFloat(depAmt) || 0;
  const depPlatFeeAmt = depAmtNum * depFeePercent / 100;
  const depYouGet     = Math.max(0, depAmtNum - depPlatFeeAmt);

  /* withdraw breakdown */
  const wdAmtNum      = parseFloat(wdAmt) || 0;
  const wdPlatFeeAmt  = wdAmtNum * wdFeePercent / 100;
  const wdChainFee    = chainFee;
  const wdYouGet      = Math.max(0, wdAmtNum - wdPlatFeeAmt - wdChainFee);

  /* history */
  const history = useMemo(() => {
    const deps = (myDepositReqs  || []).map(r => ({ ...r, _kind: 'dep' }));
    const wds  = (myWithdrawalReqs || []).map(r => ({ ...r, _kind: 'wd' }));
    return [...deps, ...wds].sort((a, b) =>
      new Date(b.createdAt ?? b.created_at ?? 0) - new Date(a.createdAt ?? a.created_at ?? 0)
    ).slice(0, 20);
  }, [myDepositReqs, myWithdrawalReqs]);

  /* ─── handlers ─────────────────────────────────────────────── */
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true); setSuccess('Address copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (depAmtNum < minDep) { setError(`Minimum deposit is $${minDep}`); return; }
    if (!depTxId.trim())    { setError('Please enter your Transaction ID / Reference'); return; }

    if (user.role !== "admin" && (!user.telegramLinked || !user.telegramChatId)) {
      setError('Please connect Telegram in Settings before making a deposit.');
      return;
    }

    if (user.role !== "admin") {
      setShowDepOtp(true);
      setDepOtpCode('');
      setDepOtpError('');
      await triggerDepOtp();
    } else {
      setDepLoading(true);
      try {
        await createDepositRequest(depAmtNum, depNet.toUpperCase(), depTxId.trim(), '', undefined);
        setDepAmt(''); setDepTxId('');
      } catch (err) {
        setError(err.message);
      } finally {
        setDepLoading(false);
      }
    }
  };

  React.useEffect(() => {
    if (wdResendTimer <= 0) return;
    const interval = setInterval(() => {
      setWdResendTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [wdResendTimer]);

  React.useEffect(() => {
    if (depResendTimer <= 0) return;
    const interval = setInterval(() => {
      setDepResendTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [depResendTimer]);

  const triggerWdOtp = async () => {
    setWdSendingOtp(true);
    setWdOtpError('');
    try {
      await sendOtp(user._id, 'withdrawal');
      setWdResendTimer(60);
    } catch (err) {
      setWdOtpError(err.message);
    } finally {
      setWdSendingOtp(false);
    }
  };

  const triggerDepOtp = async () => {
    setDepSendingOtp(true);
    setDepOtpError('');
    try {
      await sendOtp(user._id, 'deposit');
      setDepResendTimer(60);
    } catch (err) {
      setDepOtpError(err.message);
    } finally {
      setDepSendingOtp(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (wdAmtNum < minWd)     { setError(`Minimum withdrawal is $${minWd}`); return; }
    if (wdAmtNum > available) { setError(`Max available: $${fmt(available)}`); return; }
    if (!wdAddr.trim())       { setError('Enter a wallet address'); return; }
    if (user.role !== "admin" && (!user.telegramLinked || !user.telegramChatId)) {
      setError('Please connect Telegram in Settings before withdrawing.');
      return;
    }

    setShowWdOtp(true);
    setWdOtpCode('');
    setWdOtpError('');
    await triggerWdOtp();
  };

  const handleWdOtpVerifyAndSubmit = async (e) => {
    e.preventDefault();
    setWdOtpError('');
    if (wdOtpCode.length !== 6) {
      setWdOtpError('Please enter the 6-digit OTP code.');
      return;
    }
    setWdLoading(true);
    try {
      const res = await withdrawETH(wdAmtNum, wdAddr, wdOtpCode, wdNet.toUpperCase());
      if (res && res.success) {
        setShowWdOtp(false);
        setWdAmt(''); setWdAddr(''); setWdPin(''); setWdOtpCode('');
      }
    } catch (err) {
      setWdOtpError(err.message);
    } finally {
      setWdLoading(false);
    }
  };

  const handleDepOtpVerifyAndSubmit = async (e) => {
    e.preventDefault();
    setDepOtpError('');
    if (depOtpCode.length !== 6) {
      setDepOtpError('Please enter the 6-digit OTP code.');
      return;
    }
    setDepLoading(true);
    try {
      const res = await createDepositRequest(depAmtNum, depNet.toUpperCase(), depTxId.trim(), '', depOtpCode);
      if (res && res.success) {
        setShowDepOtp(false);
        setDepAmt(''); setDepTxId(''); setDepOtpCode('');
      }
    } catch (err) {
      setDepOtpError(err.message);
    } finally {
      setDepLoading(false);
    }
  };

  /* ─── loading skeleton ─────────────────────────────────────── */
  if (!wallet) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}.sk{background:linear-gradient(90deg,#1a1d28 25%,#22263a 50%,#1a1d28 75%);background-size:400px 100%;animation:shimmer 1.5s ease-in-out infinite;border-radius:20px}`}</style>
      <div className="sk" style={{ height: 200 }} />
      <div className="sk" style={{ height: 60, borderRadius: 12 }} />
      <div className="sk" style={{ height: 140, borderRadius: 16 }} />
    </div>
  );

  /* ─── tabs config ──────────────────────────────────────────── */
  const TABS = [
    { id: 'balance',  icon: '💰', label: 'Balance'  },
    { id: 'deposit',  icon: '⬇️', label: 'Deposit'  },
    { id: 'send',     icon: '↗️', label: 'Send'      },
    { id: 'withdraw', icon: '⬆️', label: 'Withdraw' },
  ];

  return (
    <div className="wallet-container">
      <style>{`
        .wallet-container {
          display: flex;
          flex-direction: column;
          gap: 18px;
          font-family: var(--font-body);
        }
        
        .wallet-hero {
          position: relative;
          border-radius: 20px;
          padding: 24px;
          background: linear-gradient(135deg, #141827 0%, #0B0E1A 100%);
          border: 1px solid #1E2640;
          box-shadow: 0 12px 40px rgba(0,0,0,0.65), inset 0 1px 1px rgba(255,255,255,0.04);
          overflow: hidden;
        }
        
        .wallet-hero-glow-1 {
          position: absolute;
          top: -40px;
          right: -40px;
          width: 160px;
          height: 160px;
          border-radius: 50%;
          background: rgba(245, 166, 35, 0.08);
          filter: blur(50px);
          pointer-events: none;
        }
        
        .wallet-hero-glow-2 {
          position: absolute;
          bottom: -30px;
          left: 20px;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: rgba(0, 200, 150, 0.06);
          filter: blur(40px);
          pointer-events: none;
        }

        .wallet-hero-badge {
          background: rgba(245, 166, 35, 0.1);
          border: 1px solid rgba(245, 166, 35, 0.2);
          border-radius: 8px;
          padding: 5px 12px;
          font-size: 11px;
          font-weight: 600;
          color: var(--gold);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .balance-text {
          font-size: 42px;
          font-weight: 600;
          font-family: var(--font-mono);
          letter-spacing: -0.04em;
          color: var(--gold);
          line-height: 1.1;
        }

        .wallet-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        
        .wallet-grid-item {
          background: #1A1F32;
          border-radius: 14px;
          padding: 14px 16px;
          border: 1px solid #1E2640;
          transition: all 0.2s;
        }
        
        .wallet-grid-item:hover {
          border-color: #1E2640;
          background: #1A1F32;
        }

        .wallet-tabs {
          display: flex;
          background: #141827;
          border: 1px solid #1E2640;
          border-radius: 16px;
          padding: 4px;
          gap: 4px;
        }
        
        .wallet-tab-btn {
          flex: 1;
          padding: 10px 4px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          font-family: var(--font-body);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          background: transparent;
          color: var(--muted);
          transition: all 0.2s ease;
        }
        
        .wallet-tab-btn:hover {
          color: #8A9BB8;
          background: rgba(255,255,255,0.02);
        }
        
        .wallet-tab-btn.active {
          background: #1A1F32;
          color: var(--gold);
          border: 1px solid rgba(245,166,35,0.1);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .wallet-card-panel {
          background: #141827;
          border-radius: 20px;
          border: 1px solid #1E2640;
          padding: 20px;
        }

        .wallet-deposit-addr-box {
          background: #0B0E1A;
          border: 1px solid #1E2640;
          border-radius: 10px;
          padding: 12px 14px;
          font-family: var(--font-mono);
          font-size: 11px;
          word-break: break-all;
          color: var(--gold);
          line-height: 1.6;
        }

        .form-input {
          width: 100%;
          box-sizing: border-box;
          padding: 13px 16px;
          border-radius: 12px;
          background: #0B0E1A;
          border: 1.5px solid #1E2640;
          color: #fff;
          font-size: 14px;
          outline: none;
          transition: all 0.2s;
        }
        
        .form-input:focus {
          border-color: rgba(0, 200, 150, 0.5);
          background: #0B0E1A;
          box-shadow: 0 0 12px rgba(0, 200, 150, 0.1);
        }

        .wallet-history-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 14px;
          background: #1A1F32;
          border-radius: 12px;
          border: 1px solid #1E2640;
          transition: all 0.2s;
        }
        
        .wallet-history-item:hover {
          background: #1A1F32;
          border-color: #1E2640;
        }

        @media (max-width: 576px) {
          .wallet-hero {
            padding: 18px;
          }
          .balance-text {
            font-size: 32px;
          }
          .wallet-card-panel {
            padding: 16px;
          }
        }
      `}</style>

      {/* ── HERO BALANCE CARD ─────────────────────────────────── */}
      <div className="wallet-hero">
        <div className="wallet-hero-glow-1" />
        <div className="wallet-hero-glow-2" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', color: '#F5A623', textTransform: 'uppercase', marginBottom: '4px' }}>
              EthioSwap Wallet
            </div>
            {numId && (
              <div style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 600 }}>Account #{numId}</div>
            )}
          </div>
          <div className="wallet-hero-badge">USDT</div>
        </div>

        <div style={{ marginBottom: '6px' }}>
          <span style={{ fontSize: '13px', color: '#8A9BB8', fontWeight: 600 }}>Total Balance</span>
        </div>
        
        <div className="balance-text" style={{ marginBottom: '4px' }}>
          <span>${fmt(balance)}</span>
          <span style={{ fontSize: '16px', color: '#8A9BB8', marginLeft: '8px', fontFamily: 'var(--font-body)', fontWeight: 500 }}>USD</span>
        </div>
        
        <div style={{ fontSize: '14px', color: '#00C896', fontWeight: 600, marginBottom: '24px', fontFamily: 'var(--font-mono)' }}>
          ≈ {fmtEtb(balance * rate)} ETB
        </div>

        <div className="wallet-grid">
          {[
            { label: 'Available', usd: available, etb: available * rate, color: '#00C896' },
            { label: 'In Escrow', usd: locked,    etb: locked * rate,    color: '#F5A623' },
          ].map(c => (
            <div key={c.label} className="wallet-grid-item">
              <div style={{ fontSize: '9px', color: '#8A9BB8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', fontWeight: 600 }}>{c.label}</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: c.color, fontFamily: 'var(--font-mono)' }}>${fmt(c.usd)}</div>
              <div style={{ fontSize: '10px', color: '#8A9BB8', marginTop: '2px' }}>≈ {fmtEtb(c.etb)} ETB</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TAB BAR ───────────────────────────────────────────── */}
      <div className="wallet-tabs">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`wallet-tab-btn ${tab === t.id ? 'active' : ''}`}>
            <span style={{ fontSize: '18px', lineHeight: 1 }}>{t.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: 600, color: tab === t.id ? '#F5A623' : '#8A9BB8' }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ══ BALANCE TAB ══════════════════════════════════════════ */}
      {tab === 'balance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Deposit address */}
          <div className="wallet-card-panel">
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#F5A623', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📥 Your Deposit Address</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {NETWORKS.map(n => networkChip(n.id, qrNet, setQrNet))}
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ background: 'white', padding: '8px', borderRadius: '12px', flexShrink: 0, margin: '0 auto' }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=96&data=${address}`}
                  alt="QR" style={{ width: 80, height: 80, display: 'block' }}
                />
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ fontSize: '10px', color: '#8A9BB8', fontWeight: 600, marginBottom: '6px' }}>
                  Send {qrNet.toUpperCase()} USDT to this address
                </div>
                <div className="wallet-deposit-addr-box" style={{ marginBottom: '10px' }}>
                  {address || 'No address assigned'}
                </div>
                <button onClick={() => handleCopy(address)} style={{
                  padding: '7px 16px', borderRadius: '8px',
                  background: 'rgba(0, 200, 150, 0.1)', border: '1px solid rgba(0, 200, 150, 0.2)',
                  color: '#00C896', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
                  transition: 'all 0.15s',
                  width: '100%'
                }}>
                  {copied ? '✓ Copied!' : '📋 Copy Address'}
                </button>
              </div>
            </div>
          </div>

          {/* Transaction history */}
          {history.length > 0 ? (
            <div className="wallet-card-panel">
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#8A9BB8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>📊 Recent Transactions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {history.map((item, i) => {
                  const isDep = item._kind === 'dep';
                  const amt   = item.amountUSD ?? item.amountUsd ?? item.amountEth ?? item.amount_usd ?? 0;
                  const date  = item.createdAt ?? item.created_at ?? '';
                  return (
                    <div key={item._id ?? i} className="wallet-history-item">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '8px',
                          background: isDep ? 'rgba(0, 200, 150, 0.1)' : 'rgba(255, 77, 77, 0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '14px', flexShrink: 0
                        }}>
                          {isDep ? '⬇️' : '⬆️'}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                            {isDep ? 'Deposit Funds' : 'Withdraw Funds'}
                          </div>
                          <div style={{ fontSize: '10px', color: '#8A9BB8', marginTop: '1px' }}>
                            {date ? new Date(date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: isDep ? '#00C896' : '#FF4D4D', fontFamily: 'var(--font-mono)' }}>
                          {isDep ? '+' : '-'}${fmt(amt)}
                        </div>
                        <span style={{
                          fontSize: '8.5px', fontWeight: 600, padding: '1px 5px', borderRadius: '4px',
                          textTransform: 'uppercase', display: 'inline-block', marginTop: '2px',
                          background: item.status === 'completed' || item.status === 'approved' ? 'rgba(0,200,150,0.1)' : item.status === 'pending' ? 'rgba(245,166,35,0.1)' : 'rgba(255,77,77,0.1)',
                          color: item.status === 'completed' || item.status === 'approved' ? '#00C896' : item.status === 'pending' ? '#F5A623' : '#FF4D4D',
                        }}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="wallet-card-panel" style={{ padding: '32px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>📭</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#8A9BB8' }}>No transactions yet</div>
              <div style={{ fontSize: '12px', color: '#8A9BB8', marginTop: '4px' }}>Your deposit & withdrawal history will appear here</div>
            </div>
          )}
        </div>
      )}

      {/* ══ DEPOSIT TAB ══════════════════════════════════════════ */}
      {tab === 'deposit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Info banner */}
          <div style={{ background: 'rgba(0,200,150,0.07)', border: '1px solid rgba(0,200,150,0.2)', borderRadius: '14px', padding: '14px 16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#00C896', marginBottom: '6px' }}>ℹ️ How to Deposit</div>
            <ol style={{ fontSize: '12px', color: '#8A9BB8', paddingLeft: '16px', margin: 0, lineHeight: 1.8 }}>
              <li>Transfer USDT to the admin address shown above</li>
              <li>Copy your Transaction ID from your wallet/exchange</li>
              <li>Fill in amount & TxID below and submit</li>
              <li>Admin reviews and credits your account (usually &lt;30 min)</li>
            </ol>
          </div>

          {/* Form */}
          <div className="wallet-card-panel">
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>💳 Submit Deposit</div>

            <form onSubmit={handleDeposit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Network */}
              <div>
                <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 600, display: 'block', marginBottom: '8px' }}>NETWORK</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {NETWORKS.map(n => networkChip(n.id, depNet, setDepNet))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                  AMOUNT (USD) <span style={{ color: '#8A9BB8' }}>· min ${minDep}</span>
                </label>
                <input
                  type="number" step="0.01" min={minDep} required
                  value={depAmt} onChange={e => setDepAmt(e.target.value)}
                  placeholder={`e.g. 50.00`}
                  className="form-input"
                  style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                />
              </div>

              {/* TxID */}
              <div>
                <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 600, display: 'block', marginBottom: '8px' }}>TRANSACTION ID / REFERENCE</label>
                <input
                  type="text" required
                  value={depTxId} onChange={e => setDepTxId(e.target.value)}
                  placeholder="Paste your TxID here"
                  className="form-input"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>

              {/* Fee breakdown */}
              {depAmtNum > 0 && (
                <div style={{ background: '#0B0E1A', borderRadius: '14px', padding: '14px', border: '1px solid #1E2640', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#8A9BB8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>📊 Deposit Breakdown</div>
                  <FeePill label="USDT to Deposit (on platform)" value={`$${fmt(depAmtNum)} USDT`} color="#fff" />
                  <FeePill label={`Platform Commission (${depFeePercent}%)`} value={`-$${fmt(depPlatFeeAmt)} USDT`} color="#FF4D4D" />
                  <FeePill label={`Est. Network Fee (${depNet.toUpperCase()})`} value={`+$${fmt(chainFee)} USDT`} color="#F5A623" />
                  <div style={{ height: '1px', background: '#1E2640', margin: '2px 0' }} />
                  <FeePill label="Total Wallet Cost (incl. network fee)" value={`$${fmt(depAmtNum + chainFee)} USDT`} color="#F5A623" />
                  <FeePill label="💰 Net Balance You Receive" value={`$${fmt(depYouGet)} USDT`} color="#00C896" />
                  <div style={{ fontSize: '10px', color: '#8A9BB8', textAlign: 'center', marginTop: '2px' }}>
                    ≈ {fmtEtb(depYouGet * rate)} ETB at today's rate
                  </div>
                </div>
              )}

              <button type="submit" disabled={depLoading} className="submit-btn" style={{
                background: depLoading ? '#374151' : '#00C896',
                color: depLoading ? '#8A9BB8' : '#04342C',
                boxShadow: depLoading ? 'none' : '0 4px 20px rgba(0,200,150,0.25)',
              }}>
                {depLoading ? '⏳ Submitting…' : '⬇️ Submit Deposit'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══ SEND TAB ═════════════════════════════════════════════ */}
      {tab === 'send' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: 'rgba(245,166,35,0.07)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '14px', padding: '14px 16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#F5A623', marginBottom: '4px' }}>🚧 Internal Transfers</div>
            <div style={{ fontSize: '12px', color: '#8A9BB8' }}>
              Send USD to another EthioSwap user by their account ID. Transfers are instant and free between EthioSwap wallets.
            </div>
          </div>
          <div className="wallet-card-panel">
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>↗️ Send to User</div>
            <form onSubmit={e => { e.preventDefault(); setError('Internal transfers are temporarily disabled.'); }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 600, display: 'block', marginBottom: '8px' }}>RECIPIENT ACCOUNT ID</label>
                <input
                  type="text" required value={snTo} onChange={e => setSnTo(e.target.value)}
                  placeholder="e.g. #0042"
                  className="form-input"
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 600, display: 'block', marginBottom: '8px' }}>AMOUNT (USD)</label>
                <input
                  type="number" step="0.01" min="1" required value={snAmt} onChange={e => setSnAmt(e.target.value)}
                  placeholder="e.g. 25.00"
                  className="form-input"
                  style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                />
              </div>
              {parseFloat(snAmt) > 0 && (
                <div style={{ background: '#0B0E1A', borderRadius: '14px', padding: '14px', border: '1px solid #1E2640', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#8A9BB8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>📊 Transfer Summary</div>
                  <FeePill label="Amount to Send" value={`$${fmt(parseFloat(snAmt))} USDT`} color="#fff" />
                  <FeePill label="Platform Commission" value="0.00 USDT (Free) ✓" color="#00C896" />
                  <FeePill label="Network Transfer Fee" value="0.00 USDT (Free) ✓" color="#00C896" />
                  <div style={{ height: '1px', background: '#1E2640', margin: '2px 0' }} />
                  <FeePill label="Total Deducted" value={`$${fmt(parseFloat(snAmt))} USDT`} color="#F5A623" />
                  <FeePill label="💰 Recipient Gets" value={`$${fmt(parseFloat(snAmt))} USDT`} color="#00C896" />
                </div>
              )}
              <button type="submit" className="submit-btn" style={{ background: 'rgba(245,166,35,0.15)', color: '#F5A623', border: '1px solid rgba(245,166,35,0.3)' }}>
                ↗️ Send Now
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══ WITHDRAW TAB ═════════════════════════════════════════ */}
      {tab === 'withdraw' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          <div style={{ background: 'rgba(255,77,77,0.07)', border: '1px solid rgba(255,77,77,0.2)', borderRadius: '14px', padding: '14px 16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#FF4D4D', marginBottom: '6px' }}>⚠️ Before You Withdraw</div>
            <ul style={{ fontSize: '12px', color: '#8A9BB8', paddingLeft: '16px', margin: 0, lineHeight: 1.8 }}>
              <li>Make sure your wallet address is correct — withdrawals are irreversible</li>
              <li>Processing time: up to 24 hours</li>
              <li>Minimum withdrawal: ${minWd} USD</li>
            </ul>
          </div>

          <div className="wallet-card-panel">
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>⬆️ Withdraw Funds</div>

            <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Network */}
              <div>
                <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 600, display: 'block', marginBottom: '8px' }}>NETWORK</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {NETWORKS.map(n => networkChip(n.id, wdNet, setWdNet))}
                </div>
                <div style={{ fontSize: '10px', color: '#8A9BB8', marginTop: '6px' }}>
                  Network fee: <span style={{ color: '#F5A623', fontWeight: 600 }}>${chainFee} USDT</span>
                </div>
              </div>

              {/* Address */}
              <div>
                <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 600, display: 'block', marginBottom: '8px' }}>WALLET ADDRESS</label>
                <input
                  type="text" required value={wdAddr} onChange={e => setWdAddr(e.target.value)}
                  placeholder={`Your ${wdNet.toUpperCase()} USDT address`}
                  className="form-input"
                  style={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              {/* Amount */}
              <div>
                <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                  AMOUNT (USD) <span style={{ color: '#8A9BB8' }}>· available ${fmt(available)}</span>
                </label>
                <input
                  type="number" step="0.01" min={minWd} required
                  value={wdAmt} onChange={e => setWdAmt(e.target.value)}
                  placeholder={`Min $${minWd}`}
                  className="form-input"
                  style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                />
              </div>

              {/* PIN */}
              {user?.transaction_pin && (
                <div>
                  <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 600, display: 'block', marginBottom: '8px' }}>🔒 TRANSACTION PIN</label>
                  <input
                    type="password" maxLength={4} required value={wdPin} onChange={e => setWdPin(e.target.value)}
                    placeholder="••••"
                    className="form-input"
                    style={{ fontSize: '20px', letterSpacing: '0.3em', textAlign: 'center' }}
                  />
                </div>
              )}

              {/* Fee breakdown */}
              {wdAmtNum > 0 && (
                <div style={{ background: '#0B0E1A', borderRadius: '14px', padding: '14px', border: '1px solid #1E2640', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#8A9BB8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>📊 Withdrawal Breakdown</div>
                  <FeePill label="Amount to Withdraw" value={`$${fmt(wdAmtNum)} USDT`} color="#fff" />
                  <FeePill label={`Platform Commission (${wdFeePercent}%)`} value={`-$${fmt(wdPlatFeeAmt)} USDT`} color="#FF4D4D" />
                  <FeePill label={`Network Transfer Fee (${wdNet.toUpperCase()})`} value={`-$${fmt(wdChainFee)} USDT`} color="#FF4D4D" />
                  <div style={{ height: '1px', background: '#1E2640', margin: '2px 0' }} />
                  <FeePill label="💰 Net Received in Your Wallet" value={wdYouGet > 0 ? `$${fmt(wdYouGet)} USDT` : '⚠️ Too Low'} color={wdYouGet > 0 ? '#00C896' : '#FF4D4D'} />
                  {wdYouGet > 0 && (
                    <div style={{ fontSize: '10px', color: '#8A9BB8', textAlign: 'center', marginTop: '2px' }}>
                      ≈ {fmtEtb(wdYouGet * rate)} ETB at today's rate
                    </div>
                  )}
                </div>
              )}

              <button type="submit" disabled={wdLoading || wdYouGet <= 0} style={{
                padding:'15px', borderRadius:'14px', border:'none', cursor: wdLoading || wdYouGet <= 0 ? 'not-allowed' : 'pointer',
                fontFamily:'var(--font)', fontWeight:600, fontSize:'15px',
                background: wdLoading || wdYouGet <= 0 ? '#1f2937' : '#F5A623',
                color: wdLoading || wdYouGet <= 0 ? '#8A9BB8' : '#04342C',
                transition:'all 0.2s',
                boxShadow: wdLoading || wdYouGet <= 0 ? 'none' : '0 4px 20px rgba(245,166,35,0.3)',
              }}>
                {wdLoading ? '⏳ Processing…' : '⬆️ Confirm Withdrawal'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Withdrawal OTP Modal */}
      {showWdOtp && (
        <div className="overlay modal-center" style={{ zIndex: 1100, position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="modal-box" style={{ width: '100%', maxWidth: '340px', padding: '24px 20px', textAlign: 'center', background: '#141827', border: '1px solid #1E2640', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>Withdrawal Verification</h3>
            <p style={{ fontSize: '12px', color: '#8A9BB8', marginBottom: '16px', lineHeight: '1.4' }}>
              Enter the 6-digit OTP code to authorize withdrawal of <b>${fmt(wdAmtNum)} USDT</b>.
            </p>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 14px',
              background: 'rgba(42,171,238,0.08)',
              border: '1px solid rgba(42,171,238,0.25)',
              borderRadius: '10px',
              marginBottom: '16px',
            }}>
              <i className="ti ti-brand-telegram" style={{ fontSize: '18px', color: '#2AABEE' }}></i>
              <span style={{ fontSize: '12px', color: '#fff', fontWeight: 600 }}>
                Code sent to @EthioSwap_Bot
              </span>
            </div>

            <form onSubmit={handleWdOtpVerifyAndSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="text"
                maxLength={6}
                placeholder="000000"
                value={wdOtpCode}
                onChange={e => setWdOtpCode(e.target.value.replace(/\D/g, ''))}
                style={{
                  width: '100%',
                  height: '48px',
                  background: '#0B0E1A',
                  border: '1px solid #1E2640',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '20px',
                  fontWeight: 600,
                  textAlign: 'center',
                  letterSpacing: '6px',
                  outline: 'none',
                }}
                className="input"
                autoFocus
              />

              {wdOtpError && (
                <div style={{ color: '#FF4D4D', fontSize: '12px', textAlign: 'left', background: 'rgba(255, 77, 77, 0.08)', border: '1px solid rgba(255, 77, 77, 0.2)', padding: '10px', borderRadius: '8px' }}>
                  ⚠ {wdOtpError}
                </div>
              )}

              <button
                type="submit"
                disabled={wdLoading || wdSendingOtp}
                className="btn btn-gold btn-full"
                style={{
                  height: '44px',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#00C896',
                  color: '#04342C',
                  border: 'none',
                  borderRadius: '10px',
                  width: '100%',
                  cursor: 'pointer',
                }}
              >
                {wdLoading ? '⏳ Authorizing...' : 'Confirm & Submit'}
              </button>
            </form>

            <div style={{ marginTop: '14px' }}>
              {wdResendTimer > 0 ? (
                <span style={{ fontSize: '11px', color: '#8A9BB8' }}>Resend code in {wdResendTimer}s</span>
              ) : (
                <button
                  type="button"
                  onClick={() => triggerWdOtp()}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#F5A623',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Resend Code
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowWdOtp(false)}
              className="btn btn-ghost btn-sm btn-full"
              style={{ marginTop: '12px', width: '100%' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Deposit OTP Modal */}
      {showDepOtp && (
        <div className="overlay modal-center" style={{ zIndex: 1100, position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="modal-box" style={{ width: '100%', maxWidth: '340px', padding: '24px 20px', textAlign: 'center', background: '#141827', border: '1px solid #1E2640', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>Deposit Verification</h3>
            <p style={{ fontSize: '12px', color: '#8A9BB8', marginBottom: '16px', lineHeight: '1.4' }}>
              We sent a 6-digit OTP code to your linked Telegram account to authorize deposit of <b>${fmt(depAmtNum)} USDT</b>.
            </p>

            <form onSubmit={handleDepOtpVerifyAndSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="text"
                maxLength={6}
                placeholder="000000"
                value={depOtpCode}
                onChange={e => setDepOtpCode(e.target.value.replace(/\D/g, ''))}
                style={{
                  width: '100%',
                  height: '48px',
                  background: '#0B0E1A',
                  border: '1px solid #1E2640',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '20px',
                  fontWeight: 600,
                  textAlign: 'center',
                  letterSpacing: '6px',
                  outline: 'none',
                }}
                className="input"
                autoFocus
              />

              {depOtpError && (
                <div style={{ color: '#FF4D4D', fontSize: '12px', textAlign: 'left', background: 'rgba(255, 77, 77, 0.08)', border: '1px solid rgba(255, 77, 77, 0.2)', padding: '10px', borderRadius: '8px' }}>
                  ⚠ {depOtpError}
                </div>
              )}

              <button
                type="submit"
                disabled={depLoading || depSendingOtp}
                className="btn btn-gold btn-full"
                style={{
                  height: '44px',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#00C896',
                  color: '#04342C',
                  border: 'none',
                  borderRadius: '10px',
                  width: '100%',
                  cursor: 'pointer',
                }}
              >
                {depLoading ? '⏳ Authorizing...' : 'Confirm & Submit'}
              </button>
            </form>

            <div style={{ marginTop: '14px' }}>
              {depResendTimer > 0 ? (
                <span style={{ fontSize: '11px', color: '#8A9BB8' }}>Resend code in {depResendTimer}s</span>
              ) : (
                <button
                  type="button"
                  onClick={triggerDepOtp}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#F5A623',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Resend Code
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowDepOtp(false)}
              className="btn btn-ghost btn-sm btn-full"
              style={{ marginTop: '12px', width: '100%' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default WalletCard;
