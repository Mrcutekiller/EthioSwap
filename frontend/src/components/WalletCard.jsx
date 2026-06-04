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
    pending:  { color: '#f5c518', bg: 'rgba(245,197,24,0.12)',  label: '⏳ Pending' },
    approved: { color: '#00d4a0', bg: 'rgba(0,212,160,0.12)',   label: '✓ Approved' },
    rejected: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   label: '✗ Rejected' },
  }[status] ?? { color: '#9ca3af', bg: 'rgba(255,255,255,0.05)', label: status };
  return (
    <span style={{
      fontSize: '10px', fontWeight: 700, padding: '3px 9px',
      borderRadius: '99px', background: s.bg, color: s.color,
    }}>{s.label}</span>
  );
};

/* ─── Fee breakdown pill ──────────────────────────────────────── */
const FeePill = ({ label, value, color = '#f5c518' }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 12px', borderRadius: '10px',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
  }}>
    <span style={{ fontSize: '12px', color: '#9ca3af' }}>{label}</span>
    <span style={{ fontSize: '13px', fontWeight: 700, color }}>{value}</span>
  </div>
);

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

  // Withdraw
  const [wdNet, setWdNet]         = useState('trc20');
  const [wdAmt, setWdAmt]         = useState('');
  const [wdAddr, setWdAddr]       = useState('');
  const [wdPin, setWdPin]         = useState('');
  const [wdLoading, setWdLoading] = useState(false);

  // Send
  const [snAmt, setSnAmt]         = useState('');
  const [snTo, setSnTo]           = useState('');

  /* ─── computed ─────────────────────────────────────────────── */
  const rate        = systemSettings?.etbRatePerDollar ?? 190;
  const platFee     = systemSettings?.flatFeePercent ?? 1.0;       // %
  const minDep      = systemSettings?.minDepositUSD   ?? 5;
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
  const depPlatFeeAmt = depAmtNum * platFee / 100;
  const depYouGet     = Math.max(0, depAmtNum - depPlatFeeAmt);

  /* withdraw breakdown */
  const wdAmtNum      = parseFloat(wdAmt) || 0;
  const wdPlatFeeAmt  = wdAmtNum * platFee / 100;
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
    setDepLoading(true);
    await createDepositRequest(depAmtNum, depNet.toUpperCase(), depTxId.trim(), '');
    setDepLoading(false);
    setDepAmt(''); setDepTxId('');
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (wdAmtNum < minWd)     { setError(`Minimum withdrawal is $${minWd}`); return; }
    if (wdAmtNum > available) { setError(`Max available: $${fmt(available)}`); return; }
    if (!wdAddr.trim())       { setError('Enter a wallet address'); return; }
    setWdLoading(true);
    await withdrawETH(wdAmtNum, wdAddr, user?.transaction_pin ? wdPin : undefined);
    setWdLoading(false);
    setWdAmt(''); setWdAddr(''); setWdPin('');
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

  const networkChip = (n, active, setActive) => {
    const net = NETWORKS.find(x => x.id === n);
    const isActive = active === n;
    return (
      <button key={n} onClick={() => setActive(n)} style={{
        padding: '6px 14px', borderRadius: '99px', border: '1.5px solid',
        cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '11px', fontWeight: 700,
        transition: 'all 0.18s',
        background: isActive ? net.color + '18' : 'rgba(255,255,255,0.03)',
        color:      isActive ? net.color : '#6b7280',
        borderColor: isActive ? net.color + '55' : 'rgba(255,255,255,0.08)',
        boxShadow: isActive ? `0 0 12px ${net.color}22` : 'none',
      }}>
        {net.label} <span style={{ opacity: 0.6 }}>{net.coin}</span>
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ── HERO BALANCE CARD ─────────────────────────────────── */}
      <div style={{
        borderRadius: '24px', padding: '24px',
        background: 'linear-gradient(135deg, #0e1117 0%, #151924 100%)',
        border: '1.5px solid rgba(245,197,24,0.2)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* glow blobs */}
        <div style={{ position:'absolute',top:'-40px',right:'-40px',width:'160px',height:'160px',borderRadius:'50%',background:'rgba(245,197,24,0.08)',filter:'blur(50px)',pointerEvents:'none' }} />
        <div style={{ position:'absolute',bottom:'-30px',left:'20px',width:'120px',height:'120px',borderRadius:'50%',background:'rgba(0,212,160,0.07)',filter:'blur(40px)',pointerEvents:'none' }} />

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'18px' }}>
          <div>
            <div style={{ fontSize:'10px', fontWeight:700, letterSpacing:'0.1em', color:'#f5c518', textTransform:'uppercase', marginBottom:'4px' }}>
              EthioSwap Wallet
            </div>
            {numId && (
              <div style={{ fontSize:'11px', color:'#9ca3af', fontWeight:600 }}>Account #{numId}</div>
            )}
          </div>
          <div style={{
            background:'rgba(245,197,24,0.1)', border:'1px solid rgba(245,197,24,0.2)',
            borderRadius:'10px', padding:'6px 12px', fontSize:'11px', fontWeight:700, color:'#f5c518',
          }}>USDT</div>
        </div>

        <div style={{ marginBottom:'6px' }}>
          <span style={{ fontSize:'13px', color:'#9ca3af', fontWeight:600 }}>Total Balance</span>
        </div>
        <div style={{ fontSize:'42px', fontWeight:900, letterSpacing:'-0.04em', lineHeight:1, marginBottom:'4px', fontFamily:'JetBrains Mono, monospace' }}>
          <span style={{ color:'#f5c518' }}>${fmt(balance)}</span>
          <span style={{ fontSize:'16px', color:'#4b5563', marginLeft:'8px', fontFamily:'var(--font)', fontWeight:500 }}>USD</span>
        </div>
        <div style={{ fontSize:'14px', color:'#00d4a0', fontWeight:600, marginBottom:'24px', fontFamily:'JetBrains Mono, monospace' }}>
          ≈ {fmtEtb(balance * rate)} ETB
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
          {[
            { label:'Available', usd: available, etb: available * rate, color:'#00d4a0' },
            { label:'In Escrow', usd: locked,    etb: locked * rate,    color:'#f5c518' },
          ].map(c => (
            <div key={c.label} style={{
              background:'rgba(10,12,18,0.7)', borderRadius:'14px', padding:'12px 14px',
              border:`1px solid ${c.color}22`,
            }}>
              <div style={{ fontSize:'9px', color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'4px' }}>{c.label}</div>
              <div style={{ fontSize:'18px', fontWeight:800, color:c.color, fontFamily:'JetBrains Mono, monospace' }}>${fmt(c.usd)}</div>
              <div style={{ fontSize:'10px', color:'#4b5563', marginTop:'2px' }}>≈ {fmtEtb(c.etb)} ETB</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TAB BAR ───────────────────────────────────────────── */}
      <div style={{
        display:'flex', background:'#0e1117', border:'1px solid rgba(255,255,255,0.07)',
        borderRadius:'16px', padding:'4px', gap:'3px',
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex:1, padding:'10px 4px', borderRadius:'12px', border:'none', cursor:'pointer',
            fontFamily:'var(--font)', display:'flex', flexDirection:'column', alignItems:'center', gap:'3px',
            background: tab === t.id ? 'rgba(255,255,255,0.07)' : 'transparent',
            transition:'all 0.15s',
          }}>
            <span style={{ fontSize:'18px', lineHeight:1 }}>{t.icon}</span>
            <span style={{ fontSize:'10px', fontWeight:700, color: tab === t.id ? '#f5c518' : '#6b7280' }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ══ BALANCE TAB ══════════════════════════════════════════ */}
      {tab === 'balance' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>

          {/* Deposit address */}
          <div style={{ background:'#111318', borderRadius:'20px', border:'1px solid rgba(255,255,255,0.07)', padding:'20px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color:'#f5c518', marginBottom:'14px', textTransform:'uppercase', letterSpacing:'0.06em' }}>📥 Your Deposit Address</div>
            <div style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap' }}>
              {NETWORKS.map(n => networkChip(n.id, qrNet, setQrNet))}
            </div>
            <div style={{ display:'flex', gap:'16px', alignItems:'center' }}>
              <div style={{ background:'white', padding:'8px', borderRadius:'12px', flexShrink:0 }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=96&data=${address}`}
                  alt="QR" style={{ width:80, height:80, display:'block' }}
                />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'10px', color:'#9ca3af', fontWeight:600, marginBottom:'6px' }}>
                  Send {qrNet.toUpperCase()} USDT to this address
                </div>
                <div style={{
                  background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.08)',
                  borderRadius:'10px', padding:'10px 12px', fontFamily:'JetBrains Mono, monospace',
                  fontSize:'10.5px', wordBreak:'break-all', color:'#f5c518', lineHeight:1.6,
                }}>
                  {address || 'No address assigned'}
                </div>
                <button onClick={() => handleCopy(address)} style={{
                  marginTop:'10px', padding:'7px 16px', borderRadius:'8px',
                  background:'rgba(245,197,24,0.1)', border:'1px solid rgba(245,197,24,0.2)',
                  color:'#f5c518', fontSize:'11px', fontWeight:700, cursor:'pointer', fontFamily:'var(--font)',
                  transition:'all 0.15s',
                }}>
                  {copied ? '✓ Copied!' : '📋 Copy Address'}
                </button>
              </div>
            </div>
          </div>

          {/* Transaction history */}
          {history.length > 0 ? (
            <div style={{ background:'#111318', borderRadius:'20px', border:'1px solid rgba(255,255,255,0.07)', padding:'20px' }}>
              <div style={{ fontSize:'12px', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'14px' }}>📊 Recent Transactions</div>
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                {history.map((item, i) => {
                  const isDep = item._kind === 'dep';
                  const amt   = item.amountUSD ?? item.amountUsd ?? item.amountEth ?? item.amount_usd ?? 0;
                  const date  = item.createdAt ?? item.created_at ?? '';
                  return (
                    <div key={item._id ?? i} style={{
                      display:'flex', justifyContent:'space-between', alignItems:'center',
                      padding:'12px 14px', background:'rgba(255,255,255,0.03)',
                      borderRadius:'12px', border:'1px solid rgba(255,255,255,0.05)',
                    }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                        <div style={{
                          width:34, height:34, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px',
                          background: isDep ? 'rgba(0,212,160,0.1)' : 'rgba(245,197,24,0.1)',
                        }}>
                          {isDep ? '⬇️' : '⬆️'}
                        </div>
                        <div>
                          <div style={{ fontSize:'13px', fontWeight:700, color:'#e5e7eb' }}>
                            {isDep ? (item.walletType ?? 'Deposit') : 'Withdrawal'}
                          </div>
                          <div style={{ fontSize:'10px', color:'#6b7280' }}>
                            {date ? new Date(date).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—'}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:'14px', fontWeight:800, color: isDep ? '#00d4a0' : '#f87171' }}>
                          {isDep ? '+' : '-'}${fmt(Math.abs(amt))}
                        </div>
                        <StatusBadge status={item.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ background:'#111318', borderRadius:'20px', border:'1px solid rgba(255,255,255,0.07)', padding:'32px', textAlign:'center' }}>
              <div style={{ fontSize:'36px', marginBottom:'10px' }}>📭</div>
              <div style={{ fontSize:'14px', fontWeight:700, color:'#9ca3af' }}>No transactions yet</div>
              <div style={{ fontSize:'12px', color:'#6b7280', marginTop:'4px' }}>Your deposit & withdrawal history will appear here</div>
            </div>
          )}
        </div>
      )}

      {/* ══ DEPOSIT TAB ══════════════════════════════════════════ */}
      {tab === 'deposit' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>

          {/* Info banner */}
          <div style={{ background:'rgba(0,212,160,0.07)', border:'1px solid rgba(0,212,160,0.2)', borderRadius:'14px', padding:'14px 16px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color:'#00d4a0', marginBottom:'6px' }}>ℹ️ How to Deposit</div>
            <ol style={{ fontSize:'12px', color:'#9ca3af', paddingLeft:'16px', margin:0, lineHeight:1.8 }}>
              <li>Transfer USDT to the admin address shown above</li>
              <li>Copy your Transaction ID from your wallet/exchange</li>
              <li>Fill in amount & TxID below and submit</li>
              <li>Admin reviews and credits your account (usually &lt;30 min)</li>
            </ol>
          </div>

          {/* Form */}
          <div style={{ background:'#111318', borderRadius:'20px', border:'1px solid rgba(255,255,255,0.07)', padding:'20px' }}>
            <div style={{ fontSize:'13px', fontWeight:700, color:'#e5e7eb', marginBottom:'16px' }}>💳 Submit Deposit</div>

            <form onSubmit={handleDeposit} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>

              {/* Network */}
              <div>
                <label style={{ fontSize:'11px', color:'#9ca3af', fontWeight:600, display:'block', marginBottom:'8px' }}>NETWORK</label>
                <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                  {NETWORKS.map(n => networkChip(n.id, depNet, setDepNet))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label style={{ fontSize:'11px', color:'#9ca3af', fontWeight:600, display:'block', marginBottom:'8px' }}>
                  AMOUNT (USD) <span style={{ color:'#6b7280' }}>· min ${minDep}</span>
                </label>
                <input
                  type="number" step="0.01" min={minDep} required
                  value={depAmt} onChange={e => setDepAmt(e.target.value)}
                  placeholder={`e.g. 50.00`}
                  style={{
                    width:'100%', boxSizing:'border-box', padding:'13px 16px', borderRadius:'12px',
                    background:'rgba(255,255,255,0.04)', border:'1.5px solid rgba(255,255,255,0.09)',
                    color:'#fff', fontSize:'15px', fontFamily:'JetBrains Mono, monospace', fontWeight:700,
                    outline:'none',
                  }}
                />
              </div>

              {/* TxID */}
              <div>
                <label style={{ fontSize:'11px', color:'#9ca3af', fontWeight:600, display:'block', marginBottom:'8px' }}>TRANSACTION ID / REFERENCE</label>
                <input
                  type="text" required
                  value={depTxId} onChange={e => setDepTxId(e.target.value)}
                  placeholder="Paste your TxID here"
                  style={{
                    width:'100%', boxSizing:'border-box', padding:'13px 16px', borderRadius:'12px',
                    background:'rgba(255,255,255,0.04)', border:'1.5px solid rgba(255,255,255,0.09)',
                    color:'#e5e7eb', fontSize:'13px', fontFamily:'JetBrains Mono, monospace',
                    outline:'none',
                  }}
                />
              </div>

              {/* Fee breakdown */}
              {depAmtNum > 0 && (
                <div style={{ background:'rgba(0,0,0,0.3)', borderRadius:'14px', padding:'14px', border:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', gap:'8px' }}>
                  <div style={{ fontSize:'11px', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'4px' }}>📊 Deposit Breakdown</div>
                  <FeePill label="You're Sending"      value={`$${fmt(depAmtNum)}`}     color="#e5e7eb" />
                  <FeePill label={`Platform Fee (${platFee}%)`} value={`-$${fmt(depPlatFeeAmt)}`} color="#f87171" />
                  <div style={{ height:'1px', background:'rgba(255,255,255,0.06)', margin:'2px 0' }} />
                  <FeePill label="💰 You Will Receive" value={`$${fmt(depYouGet)}`}     color="#00d4a0" />
                  <div style={{ fontSize:'10px', color:'#6b7280', textAlign:'center', marginTop:'2px' }}>
                    ≈ {fmtEtb(depYouGet * rate)} ETB at today's rate
                  </div>
                </div>
              )}

              <button type="submit" disabled={depLoading} style={{
                padding:'15px', borderRadius:'14px', border:'none', cursor:'pointer',
                fontFamily:'var(--font)', fontWeight:800, fontSize:'15px',
                background: depLoading ? '#374151' : 'linear-gradient(135deg, #00d4a0, #00b389)',
                color: depLoading ? '#6b7280' : '#fff',
                transition:'all 0.2s',
                boxShadow: depLoading ? 'none' : '0 4px 20px rgba(0,212,160,0.3)',
              }}>
                {depLoading ? '⏳ Submitting…' : '⬇️ Submit Deposit'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══ SEND TAB ═════════════════════════════════════════════ */}
      {tab === 'send' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
          <div style={{ background:'rgba(245,197,24,0.07)', border:'1px solid rgba(245,197,24,0.2)', borderRadius:'14px', padding:'14px 16px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color:'#f5c518', marginBottom:'4px' }}>🚧 Internal Transfers</div>
            <div style={{ fontSize:'12px', color:'#9ca3af' }}>
              Send USD to another EthioSwap user by their account ID. Transfers are instant and free between EthioSwap wallets.
            </div>
          </div>
          <div style={{ background:'#111318', borderRadius:'20px', border:'1px solid rgba(255,255,255,0.07)', padding:'20px' }}>
            <div style={{ fontSize:'13px', fontWeight:700, color:'#e5e7eb', marginBottom:'16px' }}>↗️ Send to User</div>
            <form onSubmit={e => { e.preventDefault(); setError('Internal transfers are temporarily disabled.'); }} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              <div>
                <label style={{ fontSize:'11px', color:'#9ca3af', fontWeight:600, display:'block', marginBottom:'8px' }}>RECIPIENT ACCOUNT ID</label>
                <input
                  type="text" required value={snTo} onChange={e => setSnTo(e.target.value)}
                  placeholder="e.g. #0042"
                  style={{ width:'100%', boxSizing:'border-box', padding:'13px 16px', borderRadius:'12px', background:'rgba(255,255,255,0.04)', border:'1.5px solid rgba(255,255,255,0.09)', color:'#e5e7eb', fontSize:'14px', outline:'none', fontFamily:'var(--font)' }}
                />
              </div>
              <div>
                <label style={{ fontSize:'11px', color:'#9ca3af', fontWeight:600, display:'block', marginBottom:'8px' }}>AMOUNT (USD)</label>
                <input
                  type="number" step="0.01" min="1" required value={snAmt} onChange={e => setSnAmt(e.target.value)}
                  placeholder="e.g. 25.00"
                  style={{ width:'100%', boxSizing:'border-box', padding:'13px 16px', borderRadius:'12px', background:'rgba(255,255,255,0.04)', border:'1.5px solid rgba(255,255,255,0.09)', color:'#fff', fontSize:'15px', fontFamily:'JetBrains Mono, monospace', fontWeight:700, outline:'none' }}
                />
              </div>
              {parseFloat(snAmt) > 0 && (
                <div style={{ background:'rgba(0,0,0,0.3)', borderRadius:'14px', padding:'14px', border:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', gap:'8px' }}>
                  <div style={{ fontSize:'11px', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'4px' }}>📊 Transfer Summary</div>
                  <FeePill label="Amount to Send"       value={`$${fmt(parseFloat(snAmt))}`} color="#e5e7eb" />
                  <FeePill label="Platform Fee (0%)"    value="FREE ✓"                        color="#00d4a0" />
                  <div style={{ height:'1px', background:'rgba(255,255,255,0.06)', margin:'2px 0' }} />
                  <FeePill label="💰 Recipient Gets"   value={`$${fmt(parseFloat(snAmt))}`} color="#00d4a0" />
                </div>
              )}
              <button type="submit" style={{ padding:'15px', borderRadius:'14px', border:'none', cursor:'pointer', fontFamily:'var(--font)', fontWeight:800, fontSize:'15px', background:'rgba(245,197,24,0.15)', color:'#f5c518', border:'1px solid rgba(245,197,24,0.3)' }}>
                ↗️ Send Now
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══ WITHDRAW TAB ═════════════════════════════════════════ */}
      {tab === 'withdraw' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>

          <div style={{ background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'14px', padding:'14px 16px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color:'#f87171', marginBottom:'6px' }}>⚠️ Before You Withdraw</div>
            <ul style={{ fontSize:'12px', color:'#9ca3af', paddingLeft:'16px', margin:0, lineHeight:1.8 }}>
              <li>Make sure your wallet address is correct — withdrawals are irreversible</li>
              <li>Processing time: up to 24 hours</li>
              <li>Minimum withdrawal: ${minWd} USD</li>
            </ul>
          </div>

          <div style={{ background:'#111318', borderRadius:'20px', border:'1px solid rgba(255,255,255,0.07)', padding:'20px' }}>
            <div style={{ fontSize:'13px', fontWeight:700, color:'#e5e7eb', marginBottom:'16px' }}>⬆️ Withdraw Funds</div>

            <form onSubmit={handleWithdraw} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>

              {/* Network */}
              <div>
                <label style={{ fontSize:'11px', color:'#9ca3af', fontWeight:600, display:'block', marginBottom:'8px' }}>NETWORK</label>
                <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                  {NETWORKS.map(n => networkChip(n.id, wdNet, setWdNet))}
                </div>
                <div style={{ fontSize:'10px', color:'#6b7280', marginTop:'6px' }}>
                  Network fee: <span style={{ color:'#f5c518', fontWeight:700 }}>${chainFee} USDT</span>
                </div>
              </div>

              {/* Address */}
              <div>
                <label style={{ fontSize:'11px', color:'#9ca3af', fontWeight:600, display:'block', marginBottom:'8px' }}>WALLET ADDRESS</label>
                <input
                  type="text" required value={wdAddr} onChange={e => setWdAddr(e.target.value)}
                  placeholder={`Your ${wdNet.toUpperCase()} USDT address`}
                  style={{ width:'100%', boxSizing:'border-box', padding:'13px 16px', borderRadius:'12px', background:'rgba(255,255,255,0.04)', border:'1.5px solid rgba(255,255,255,0.09)', color:'#e5e7eb', fontSize:'12px', fontFamily:'JetBrains Mono, monospace', outline:'none' }}
                />
              </div>

              {/* Amount */}
              <div>
                <label style={{ fontSize:'11px', color:'#9ca3af', fontWeight:600, display:'block', marginBottom:'8px' }}>
                  AMOUNT (USD) <span style={{ color:'#6b7280' }}>· available ${fmt(available)}</span>
                </label>
                <input
                  type="number" step="0.01" min={minWd} required
                  value={wdAmt} onChange={e => setWdAmt(e.target.value)}
                  placeholder={`Min $${minWd}`}
                  style={{ width:'100%', boxSizing:'border-box', padding:'13px 16px', borderRadius:'12px', background:'rgba(255,255,255,0.04)', border:'1.5px solid rgba(255,255,255,0.09)', color:'#fff', fontSize:'15px', fontFamily:'JetBrains Mono, monospace', fontWeight:700, outline:'none' }}
                />
              </div>

              {/* PIN */}
              {user?.transaction_pin && (
                <div>
                  <label style={{ fontSize:'11px', color:'#9ca3af', fontWeight:600, display:'block', marginBottom:'8px' }}>🔒 TRANSACTION PIN</label>
                  <input
                    type="password" maxLength={4} required value={wdPin} onChange={e => setWdPin(e.target.value)}
                    placeholder="••••"
                    style={{ width:'100%', boxSizing:'border-box', padding:'13px 16px', borderRadius:'12px', background:'rgba(255,255,255,0.04)', border:'1.5px solid rgba(255,255,255,0.09)', color:'#fff', fontSize:'20px', letterSpacing:'0.3em', outline:'none', textAlign:'center' }}
                  />
                </div>
              )}

              {/* Fee breakdown */}
              {wdAmtNum > 0 && (
                <div style={{ background:'rgba(0,0,0,0.3)', borderRadius:'14px', padding:'14px', border:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', gap:'8px' }}>
                  <div style={{ fontSize:'11px', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'4px' }}>📊 Withdrawal Breakdown</div>
                  <FeePill label="You're Withdrawing"       value={`$${fmt(wdAmtNum)}`}    color="#e5e7eb" />
                  <FeePill label={`Platform Fee (${platFee}%)`}   value={`-$${fmt(wdPlatFeeAmt)}`}  color="#f87171" />
                  <FeePill label={`Network Fee (${wdNet.toUpperCase()})`} value={`-$${fmt(wdChainFee)}`}   color="#f87171" />
                  <div style={{ height:'1px', background:'rgba(255,255,255,0.06)', margin:'2px 0' }} />
                  <FeePill label="💰 You Will Receive"      value={wdYouGet > 0 ? `$${fmt(wdYouGet)}` : '⚠️ Too Low'} color={wdYouGet > 0 ? '#00d4a0' : '#f87171'} />
                  {wdYouGet > 0 && (
                    <div style={{ fontSize:'10px', color:'#6b7280', textAlign:'center', marginTop:'2px' }}>
                      ≈ {fmtEtb(wdYouGet * rate)} ETB at today's rate
                    </div>
                  )}
                </div>
              )}

              <button type="submit" disabled={wdLoading || wdYouGet <= 0} style={{
                padding:'15px', borderRadius:'14px', border:'none', cursor: wdLoading || wdYouGet <= 0 ? 'not-allowed' : 'pointer',
                fontFamily:'var(--font)', fontWeight:800, fontSize:'15px',
                background: wdLoading || wdYouGet <= 0 ? '#1f2937' : 'linear-gradient(135deg, #f5c518, #e5a800)',
                color: wdLoading || wdYouGet <= 0 ? '#6b7280' : '#000',
                transition:'all 0.2s',
                boxShadow: wdLoading || wdYouGet <= 0 ? 'none' : '0 4px 20px rgba(245,197,24,0.3)',
              }}>
                {wdLoading ? '⏳ Processing…' : '⬆️ Confirm Withdrawal'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default WalletCard;
