import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase';
import { getNetworkAddress } from '../utils/crypto.js';
import Logo from './Logo.jsx';
import BrandedReceipt from './BrandedReceipt.jsx';

const fmt = (n, d = 2) => (+(n ?? 0)).toFixed(d);
const fmtEtb = (n) => Math.round(n ?? 0).toLocaleString();

// Compress image for upload
const compressImage = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 600;
      let { width, height } = img;
      if (width > height) { if (width > MAX) { height *= MAX / width; width = MAX; } }
      else { if (height > MAX) { width *= MAX / height; height = MAX; } }
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.5));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = event.target.result;
  };
  reader.onerror = () => reject(new Error('Failed to read file'));
});

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────
const FeePill = ({ label, value, color = '#8A9BB8' }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
    <span style={{ fontSize: '13px', color: '#8A9BB8' }}>{label}</span>
    <span style={{ fontSize: '13.5px', fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{value}</span>
  </div>
);

const Divider = () => <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />;

const BackBtn = ({ onClick }) => (
  <button onClick={onClick} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#8A9BB8', padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, transition: 'all 0.2s', flexShrink: 0 }}
    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
  >
    <i className="ti ti-arrow-left" /> Back
  </button>
);

const InfoBox = ({ children, type = 'info' }) => {
  const map = { 
    info: { bg: 'rgba(245,166,35,0.06)', border: 'rgba(245,166,35,0.2)', color: '#FFD580', icon: 'ti-info-circle' }, 
    warn: { bg: 'rgba(255,77,77,0.06)', border: 'rgba(255,77,77,0.2)', color: '#FF6B6B', icon: 'ti-alert-triangle' }, 
    success: { bg: 'rgba(0,200,150,0.06)', border: 'rgba(0,200,150,0.2)', color: '#00C896', icon: 'ti-circle-check' } 
  };
  const s = map[type] || map.info;
  return (
    <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '12px', padding: '14px 16px', fontSize: '12px', color: s.color, lineHeight: 1.5, display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
      <i className={`ti ${s.icon}`} style={{ fontSize: '16px', marginTop: '2px', flexShrink: 0 }} />
      <div>{children}</div>
    </div>
  );
};

const SuccessScreen = ({ title, subtitle, rows, note, onDone, doneLabel = 'Back to Wallet' }) => (
  <div className="wc-panel" style={{ background: 'linear-gradient(135deg, #141827 0%, #0B0E1A 100%)', border: '1px solid rgba(0,200,150,0.25)', borderRadius: '20px', padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '480px', margin: '0 auto' }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(0,200,150,0.12)', border: '2.5px solid rgba(0,200,150,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px', color: '#00C896' }}>
        <i className="ti ti-circle-check" />
      </div>
      <div style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>{title}</div>
      <div style={{ fontSize: '13px', color: '#00C896', fontWeight: 600 }}>{subtitle}</div>
    </div>
    <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '0', border: '1px solid rgba(255,255,255,0.05)' }}>
      {rows.map((r, i) => (
        <div key={i}>
          <FeePill label={r[0]} value={r[1]} color={r[2] || '#fff'} />
          {i < rows.length - 1 && <Divider />}
        </div>
      ))}
    </div>
    {note && <InfoBox>{note}</InfoBox>}
    <button onClick={onDone} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #F5A623, #D88E10)', color: '#0A0C12', fontSize: '14px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
      onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
      onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
    >
      <i className="ti ti-check" style={{ fontSize: '16px' }} /> {doneLabel}
    </button>
  </div>
);

const Sparkline = ({ data, color = '#F5A623', height = 36, width = 90 }) => {
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
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color.replace('#','')})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length-1].split(',')[0]} cy={pts[pts.length-1].split(',')[1]} r="2.5" fill={color} />
    </svg>
  );
};

const StepIndicator = ({ steps, currentStep }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '0 auto 24px', maxWidth: '400px' }}>
    {steps.map((s, idx) => {
      const stepNum = idx + 1;
      const isDone = currentStep > stepNum;
      const isActive = currentStep === stepNum;
      const color = isActive ? '#F5A623' : isDone ? '#00C896' : 'rgba(255,255,255,0.15)';
      return (
        <React.Fragment key={idx}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: isActive ? 'rgba(245,166,35,0.15)' : isDone ? 'rgba(0,200,150,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1.5px solid ${color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 700, color,
            }}>
              {isDone ? '✓' : stepNum}
            </div>
            <span style={{ fontSize: '12px', fontWeight: isActive || isDone ? 700 : 500, color: isActive || isDone ? '#fff' : '#4A5568' }}>{s}</span>
          </div>
          {idx < steps.length - 1 && (
            <div style={{ flex: 1, height: '1.5px', minWidth: '24px', background: isDone ? 'rgba(0,200,150,0.4)' : 'rgba(255,255,255,0.06)' }} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const WalletCard = ({ initialTab = 'balance' }) => {
  const {
    user, wallet, systemSettings,
    withdrawETH, myDepositReqs, myWithdrawalReqs,
    createDepositRequest, setError, setSuccess,
    transferToUser, trades,
  } = useAuth();

  // ── Tab state ────────────────────────────────────────────
  const [tab, setTab] = useState(initialTab);
  useEffect(() => { setTab(initialTab); }, [initialTab]);

  // ── Dashboard states ────────────────────────────────────
  const [showBalance, setShowBalance] = useState(true);
  const [selectedNet, setSelectedNet] = useState('trc20');
  const [showQR, setShowQR] = useState(false);
  const [txFilter, setTxFilter] = useState('all');

  // ── Deposit (Binance/Bybit) state ───────────────────────
  const [depStep, setDepStep] = useState(1);      // 1=form, 2=success
  const [depMethod, setDepMethod] = useState('binance');
  const [depAmount, setDepAmount] = useState('');
  const [depEmail, setDepEmail] = useState('');
  const [depUname, setDepUname] = useState('');
  const [depRef, setDepRef] = useState('');
  const [depScreenshot, setDepScreenshot] = useState(null);
  const [depScreenshotPreview, setDepScreenshotPreview] = useState(null);
  const [depLoading, setDepLoading] = useState(false);

  // ── Withdraw (Binance/Bybit) state ──────────────────────
  const [wdStep, setWdStep] = useState(1);        // 1=form, 2=confirm, 3=success
  const [wdMethod, setWdMethod] = useState('binance');
  const [wdAmount, setWdAmount] = useState('');
  const [wdEmail, setWdEmail] = useState('');
  const [wdLoading, setWdLoading] = useState(false);

  // ── Send (Internal) state ────────────────────────────────
  const [sendStep, setSendStep] = useState(1);    // 1=find, 2=amount
  const [sendQuery, setSendQuery] = useState('');
  const [foundRecipient, setFoundRecipient] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [sendAmt, setSendAmt] = useState('');
  const [sendLoading, setSendLoading] = useState(false);

  // ── Misc ─────────────────────────────────────────────────
  const [copied, setCopied] = useState('');
  const [selectedTx, setSelectedTx] = useState(null);

  const handleCopy = useCallback((text, key = 'default') => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setSuccess('Copied!');
    setTimeout(() => setCopied(''), 2000);
  }, [setSuccess]);

  const resetTab = (t) => {
    setTab(t);
    setDepStep(1); setDepAmount(''); setDepEmail(''); setDepUname(''); setDepRef(''); setDepScreenshot(null); setDepScreenshotPreview(null);
    setWdStep(1); setWdAmount(''); setWdEmail('');
    setSendStep(1); setSendQuery(''); setFoundRecipient(null); setLookupError(''); setSendAmt('');
  };

  // ── Derived values ───────────────────────────────────────
  const feePercent = systemSettings?.deposit_fee_percent ?? 5.0;
  const wdFeePercent = systemSettings?.withdrawal_fee_percent ?? 5.0;
  const minDep = systemSettings?.min_deposit_usd ?? 1;
  const minWd = systemSettings?.min_withdrawal_usd ?? 10;
  const rate = systemSettings?.etb_rate_per_dollar ?? 190;

  const balance = wallet?.eth_balance ?? 0;
  const locked = wallet?.eth_locked ?? 0;
  const available = Math.max(0, balance - locked);
  const numId = wallet?.numeric_id;

  const depAmtNum = parseFloat(depAmount) || 0;
  const depFee = depAmtNum * feePercent / 100;
  const depNet = Math.max(0, depAmtNum - depFee);

  const wdAmtNum = parseFloat(wdAmount) || 0;
  const wdFee = wdAmtNum * wdFeePercent / 100;
  const wdNet = Math.max(0, wdAmtNum - wdFee);

  const adminEmail = systemSettings?.master_wallet_address || 'birukf37@gmail.com';
  
  // Resolve admin deposit email safely if formatted as JSON
  const depositEmail = useMemo(() => {
    if (adminEmail.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(adminEmail);
        return parsed[depMethod] || parsed.email || Object.values(parsed)[0] || adminEmail;
      } catch (e) {
        return adminEmail;
      }
    }
    return adminEmail;
  }, [adminEmail, depMethod]);

  // Derive user specific address based on selected network
  const userAddress = wallet?.eth_address || wallet?.ethAddress || '';
  const activeAddress = useMemo(() => getNetworkAddress(selectedNet, userAddress, systemSettings), [selectedNet, userAddress, systemSettings]);

  // Asset allocation percentages
  const totalUSDT = available + locked;
  const fundingPct = totalUSDT > 0 ? (available / totalUSDT) * 100 : 100;
  const escrowPct = totalUSDT > 0 ? (locked / totalUSDT) * 100 : 0;

  // History — newest first, max 30
  const history = useMemo(() => {
    const deps = (myDepositReqs || []).map(r => ({ ...r, _kind: 'dep' }));
    const wds = (myWithdrawalReqs || []).map(r => ({ ...r, _kind: 'wd' }));
    return [...deps, ...wds].sort((a, b) => new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0)).slice(0, 30);
  }, [myDepositReqs, myWithdrawalReqs]);

  // Tabbed transaction history filtering
  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const isInternal = item.wallet_type === 'INTERNAL';
      const isP2P = item.wallet_type === 'P2P';
      if (txFilter === 'deposits') {
        return item._kind === 'dep' && !isInternal && !isP2P;
      }
      if (txFilter === 'withdrawals') {
        return item._kind === 'wd' && !isInternal && !isP2P;
      }
      if (txFilter === 'transfers') {
        return isInternal || isP2P;
      }
      return true; // 'all'
    });
  }, [history, txFilter]);

  const completedTrades = useMemo(() => (trades || []).filter(t => t.status === 'completed'), [trades]);
  const totalVolume = useMemo(() => completedTrades.reduce((s, t) => s + (t.amount_eth || 0), 0), [completedTrades]);

  // Sparkline data for volume trend
  const volumeData = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push({ date: d, vol: 0 });
    }
    (completedTrades || []).forEach(t => {
      const td = new Date(t.created_at);
      const match = days.find(d => d.date.toDateString() === td.toDateString());
      if (match) match.vol += (t.amount_eth || 0);
    });
    return days.map(d => d.vol);
  }, [completedTrades]);

  // Live rates sparkline mock trend
  const mockRateData = useMemo(() => {
    const r = rate || 190;
    return [r - 1.2, r - 0.5, r - 0.9, r + 0.3, r - 0.2, r + 0.7, r];
  }, [rate]);

  // ── Handlers ─────────────────────────────────────────────
  const handleDepositSubmit = async () => {
    if (depAmtNum < minDep) { setError(`Minimum deposit is $${minDep}`); return; }
    if (!depEmail.trim()) { setError('Please enter your Binance/Bybit email'); return; }
    if (!depUname.trim()) { setError('Please enter your Binance/Bybit username'); return; }
    if (!depScreenshot) { setError('Please upload a screenshot proof of payment'); return; }
    setDepLoading(true);
    try {
      const method = depMethod === 'binance' ? 'BINANCE' : 'BYBIT';
      const ref = JSON.stringify({ email: depEmail.trim(), username: depUname.trim(), ref: depRef.trim() });
      const res = await createDepositRequest(depAmtNum, method, ref, depScreenshot, undefined);
      if (res?.success) { setDepStep(2); setSuccess('Deposit request submitted!'); }
    } catch (err) { setError(err.message); }
    finally { setDepLoading(false); }
  };

  const handleWithdrawSubmit = async () => {
    if (wdAmtNum < minWd) { setError(`Minimum withdrawal is $${minWd}`); return; }
    if (wdAmtNum > available) { setError(`Insufficient balance. Available: $${fmt(available)}`); return; }
    if (!wdEmail.trim()) { setError('Enter your Binance/Bybit email or UID'); return; }
    setWdStep(2); // confirm
  };

  const handleWithdrawConfirm = async () => {
    setWdLoading(true);
    try {
      const res = await withdrawETH(wdAmtNum, wdEmail, '', depMethod.toUpperCase());
      if (res?.success) { setWdStep(3); setSuccess('Withdrawal request submitted!'); }
      else { setWdStep(1); }
    } catch (err) { setError(err.message); setWdStep(1); }
    finally { setWdLoading(false); }
  };

  const handleUserLookup = async () => {
    if (!sendQuery.trim()) return;
    setLookupLoading(true); setLookupError(''); setFoundRecipient(null);
    try {
      let q = sendQuery.trim().replace(/^@/, '');
      if (q.toLowerCase() === user.username.toLowerCase()) throw new Error('You cannot send funds to yourself.');
      const { data, error } = await supabase.rpc('get_user_by_username_or_email', { search_query: q });
      if (error) throw new Error(error.message);
      const rec = data && data.length > 0 ? data[0] : null;
      if (!rec) throw new Error('User not found. Check the username or email.');
      setFoundRecipient(rec);
    } catch (err) { setLookupError(err.message); }
    finally { setLookupLoading(false); }
  };

  const handleSendSubmit = async () => {
    if (!foundRecipient) { setError('Please verify recipient first'); return; }
    const amt = parseFloat(sendAmt) || 0;
    if (amt <= 0) { setError('Enter a valid amount'); return; }
    if (amt > available) { setError(`Max available: $${fmt(available)}`); return; }
    setSendLoading(true);
    try {
      await transferToUser(foundRecipient.username, amt);
      setSendQuery(''); setFoundRecipient(null); setSendAmt(''); setSendStep(1);
      setSuccess(`$${fmt(amt)} sent to @${foundRecipient.username}!`);
    } catch (err) { setError(err.message); }
    finally { setSendLoading(false); }
  };

  if (!wallet) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}.sk{background:linear-gradient(90deg,#141827 25%,#1e2640 50%,#141827 75%);background-size:400px 100%;animation:shimmer 1.5s ease-in-out infinite;border-radius:16px}`}</style>
      <div className="sk" style={{ height: 220 }} />
      <div className="sk" style={{ height: 52, borderRadius: 12 }} />
      <div className="sk" style={{ height: 160, borderRadius: 16 }} />
    </div>
  );

  const TABS = [
    { id: 'balance',  icon: 'ti ti-wallet',     label: 'Overview' },
    { id: 'deposit',  icon: 'ti ti-arrow-down',  label: 'Deposit' },
    { id: 'withdraw', icon: 'ti ti-arrow-up',    label: 'Withdraw' },
    { id: 'send',     icon: 'ti ti-send',        label: 'Send' },
  ];

  const NETWORKS = [
    { id: 'trc20', label: 'TRC-20', coin: 'USDT', color: '#E83564' },
    { id: 'bep20', label: 'BSC',    coin: 'USDT', color: '#F0B90B' },
    { id: 'erc20', label: 'ERC-20', coin: 'USDT', color: '#627EEA' },
    { id: 'aptos', label: 'Aptos',  coin: 'USDT', color: '#4EEAA6' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0', fontFamily: 'var(--font)' }}>
      <style>{`
        @keyframes wFadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        @keyframes wPulse { 0%,100%{opacity:1}50%{opacity:0.6} }
        @keyframes blink-green { 0%,100%{opacity:1;box-shadow:0 0 10px #00C896} 50%{opacity:0.3;box-shadow:none} }
        
        .wc-tabs-nav { display:flex; background:#141827; border:1px solid #1E2640; border-radius:14px; padding:4px; gap:4px; backdrop-filter:blur(12px); margin-bottom: 18px; }
        .wc-tab-nav-btn { flex:1; padding:12px 8px; border-radius:10px; border:none; cursor:pointer; background:transparent; color:#8A9BB8; font-family:var(--font); font-size:12px; font-weight:600; display:flex; align-items:center; justify-content:center; gap:8px; transition:all 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
        .wc-tab-nav-btn:hover { color:#fff; background:rgba(255,255,255,0.03); }
        .wc-tab-nav-btn.active { background:rgba(245,166,35,0.12); color:#F5A623; border:1px solid rgba(245,166,35,0.2); }
        
        .wc-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 18px; width: 100%; box-sizing: border-box; }
        @media (max-width: 991px) {
          .wc-grid { grid-template-columns: 1fr; }
        }

        .wc-bybit-card { background: linear-gradient(135deg, #141827 0%, #0e1220 100%); border-radius: 18px; border: 1px solid #1E2640; padding: 24px; position: relative; overflow: hidden; box-shadow: 0 12px 36px rgba(0,0,0,0.45); }
        .wc-panel { background:#141827; border:1px solid #1E2640; border-radius:18px; padding:24px; animation: wFadeUp 0.25s ease-out; }
        
        .wc-input { width:100%; box-sizing:border-box; background:#0B0E1A; border:1.5px solid #1E2640; border-radius:12px; color:#fff; outline:none; font-family:var(--font); transition:all 0.2s ease; }
        .wc-input:focus { border-color:rgba(245,166,35,0.5); background:rgba(245,166,35,0.015); box-shadow:0 0 0 3px rgba(245,166,35,0.08); }
        .wc-input::placeholder { color:#3E4962; }
        
        .wc-btn { width:100%; padding:14px; border-radius:12px; border:none; background:linear-gradient(135deg, #F5A623 0%, #D88E10 100%); color:#0A0C12; font-size:14px; font-weight:800; cursor:pointer; transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 4px 16px rgba(245,166,35,0.22); font-family:var(--font); }
        .wc-btn:hover:not(:disabled) { filter:brightness(1.08); transform:translateY(-1px); box-shadow:0 6px 20px rgba(245,166,35,0.3); }
        .wc-btn:disabled { background:#1E2640!important; color:#4A5568!important; cursor:not-allowed; box-shadow:none; filter:none; transform:none; }
        
        .wc-btn-outline { width:100%; padding:13px; border-radius:12px; border:1px solid #1E2640; background:transparent; color:#8A9BB8; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.2s; font-family:var(--font); }
        .wc-btn-outline:hover { border-color:rgba(255,255,255,0.15); color:#fff; background:rgba(255,255,255,0.02); }
        
        .wc-method { padding:16px; border-radius:14px; border:1.5px solid #1E2640; background:#0B0E1A; cursor:pointer; flex:1; display:flex; align-items:center; gap:12px; transition:all 0.2s; }
        .wc-method:hover { border-color:rgba(255,255,255,0.12); background:rgba(255,255,255,0.015); }
        .wc-method.active { border-color:#F5A623; background:rgba(245,166,35,0.04); }
        
        .wc-upload { border:2px dashed #1E2640; border-radius:14px; padding:28px 20px; display:flex; flex-direction:column; align-items:center; gap:10px; cursor:pointer; transition:all 0.2s; background:#0B0E1A; }
        .wc-upload:hover { border-color:rgba(245,166,35,0.4); background:rgba(245,166,35,0.01); }
        
        .wc-tx { display:flex; justify-content:space-between; align-items:center; padding:14px 16px; border-radius:12px; border:1px solid #1E2640; background:rgba(255,255,255,0.01); transition:all 0.18s; cursor:pointer; }
        .wc-tx:hover { background:rgba(255,255,255,0.025); border-color:rgba(255,255,255,0.1); transform:translateY(-1px); }
        
        .wc-recv-card { padding:18px; border-radius:14px; background:#0B0E1A; border:1px solid #1E2640; }
        .wc-tag { font-size:10px; font-weight:700; padding:4px 8px; border-radius:6px; letter-spacing:0.04em; text-transform:uppercase; }
        
        .wc-sub-tab { padding: 6px 12px; border-radius: 8px; border: 1px solid transparent; background: transparent; color: #8A9BB8; font-size: 12px; fontWeight: 600; cursor: pointer; transition: all 0.2s; }
        .wc-sub-tab:hover { color: #fff; }
        .wc-sub-tab.active { background: #1E2640; color: #fff; border-color: rgba(255,255,255,0.06); }
      `}</style>

      {/* ══ HEADER NAVIGATION TABS ═════════════════════════════════════════════ */}
      <div className="wc-tabs-nav">
        {TABS.map(t => (
          <button 
            key={t.id} 
            onClick={() => resetTab(t.id)} 
            className={`wc-tab-nav-btn${tab === t.id ? ' active' : ''}`}
          >
            <i className={t.icon} style={{ fontSize: '15px' }} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ══ OVERVIEW / BALANCE TAB ═════════════════════════════════════════════ */}
      {tab === 'balance' && (
        <div className="wc-grid">
          {/* Left Column: Asset overview and network addresses */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Bybit Asset Dashboard */}
            <div className="wc-bybit-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Logo size={26} showText={false} />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#F5A623', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Trading Account</span>
                  {numId && <span style={{ fontSize: '11px', color: '#4A5568', fontFamily: 'var(--font-mono)' }}>UID {numId}</span>}
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span className="wc-tag" style={{ background: 'rgba(0,200,150,0.12)', border: '1px solid rgba(0,200,150,0.25)', color: '#00C896', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#00C896', display: 'inline-block', animation: 'blink-green 2s infinite' }} /> Verified
                  </span>
                </div>
              </div>

              {/* Asset Balance Header */}
              <div style={{ marginBottom: '24px', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#8A9BB8', fontWeight: 500 }}>Total Assets (USDT)</span>
                  <button onClick={() => setShowBalance(!showBalance)} style={{ color: '#8A9BB8', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
                    <i className={`ti ti-eye${showBalance ? '' : '-off'}`} style={{ fontSize: '16px' }} />
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '40px', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)', letterSpacing: '-0.04em', lineHeight: 1 }}>
                    {showBalance ? `$${fmt(balance)}` : '••••••'}
                  </span>
                  <span style={{ fontSize: '15px', color: '#F5A623', fontWeight: 700 }}>USDT</span>
                </div>
                <div style={{ fontSize: '14px', color: '#00C896', fontWeight: 600, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  ≈ {showBalance ? `${fmtEtb(balance * rate)} ETB` : '••••••'}
                </div>
              </div>

              {/* Accounts breakdowns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', position: 'relative', zIndex: 1 }}>
                <div style={{ background: 'rgba(0,0,0,0.22)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: '10px', color: '#8A9BB8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>● Funding Account</div>
                  <div style={{ fontSize: '17px', fontWeight: 700, color: '#00C896', fontFamily: 'var(--font-mono)' }}>
                    {showBalance ? `$${fmt(available)}` : '••••••'}
                  </div>
                  <div style={{ fontSize: '10px', color: '#4A5568', marginTop: '2px' }}>
                    ≈ {showBalance ? `${fmtEtb(available * rate)} ETB` : '••••••'}
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.22)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: '10px', color: '#8A9BB8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>🔒 Locked / Escrow</div>
                  <div style={{ fontSize: '17px', fontWeight: 700, color: '#F5A623', fontFamily: 'var(--font-mono)' }}>
                    {showBalance ? `$${fmt(locked)}` : '••••••'}
                  </div>
                  <div style={{ fontSize: '10px', color: '#4A5568', marginTop: '2px' }}>
                    ≈ {showBalance ? `${fmtEtb(locked * rate)} ETB` : '••••••'}
                  </div>
                </div>
              </div>

              {/* Bybit Asset Allocation Bar */}
              <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', display: 'flex', overflow: 'hidden', marginBottom: '6px' }}>
                <div style={{ width: `${fundingPct}%`, height: '100%', background: '#00C896' }} />
                <div style={{ width: `${escrowPct}%`, height: '100%', background: '#F5A623' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#4A5568' }}>
                <span>Available ({fundingPct.toFixed(0)}%)</span>
                <span>Escrowed ({escrowPct.toFixed(0)}%)</span>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {[
                { label: 'Deposit', icon: 'ti-arrow-down-circle', color: '#F5A623', tab: 'deposit' },
                { label: 'Withdraw', icon: 'ti-arrow-up-circle', color: '#8A9BB8', tab: 'withdraw' },
                { label: 'Send', icon: 'ti-send', color: '#8A9BB8', tab: 'send' },
                { label: 'P2P Trade', icon: 'ti-arrows-left-right', color: '#00C896', customAction: () => {
                  // Navigate to P2P Trading page
                  const event = new CustomEvent('navigate-to-page', { detail: 'p2p' });
                  window.dispatchEvent(event);
                }}
              ].map(action => (
                <button
                  key={action.label}
                  onClick={action.customAction ? action.customAction : () => resetTab(action.tab)}
                  style={{
                    background: '#141827', border: '1px solid #1E2640', borderRadius: '14px',
                    padding: '14px 10px', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '8px', transition: 'all 0.2s', flex: 1
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = action.color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E2640'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: `${action.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: action.color }}>
                    <i className={`ti ${action.icon}`} style={{ fontSize: '20px' }} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#fff' }}>{action.label}</span>
                </button>
              ))}
            </div>

            {/* Network Deposit Address Selector Widget */}
            <div className="wc-panel">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="ti ti-qrcode" style={{ color: '#F5A623' }} /> Receive Crypto / USDT Addresses
                </div>
                <button 
                  onClick={() => setShowQR(true)}
                  style={{ background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.25)', color: '#F5A623', fontSize: '10.5px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <i className="ti ti-qrcode" /> QR Code
                </button>
              </div>

              {/* Address selector tabs */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                {NETWORKS.map(net => (
                  <button 
                    key={net.id} 
                    onClick={() => setSelectedNet(net.id)} 
                    style={{
                      padding: '6px 12px', borderRadius: '8px',
                      border: `1.5px solid ${selectedNet === net.id ? net.color : 'rgba(255,255,255,0.05)'}`,
                      background: selectedNet === net.id ? 'rgba(255,255,255,0.02)' : 'transparent',
                      color: selectedNet === net.id ? '#fff' : '#8A9BB8',
                      fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: net.color }} />
                    {net.label}
                  </button>
                ))}
              </div>

              {/* Address content */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: '#0B0E1A', borderRadius: '12px', border: '1px solid #1E2640', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '9px', color: '#4A5568', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>USDT Address ({selectedNet.toUpperCase()})</div>
                  <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: '#8A9BB8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activeAddress || 'No address assigned'}
                  </div>
                </div>
                <button 
                  onClick={() => handleCopy(activeAddress, 'netaddr')} 
                  style={{ padding: '6px', color: '#00C896', background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.2)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <i className={copied === 'netaddr' ? 'ti ti-check' : 'ti ti-copy'} style={{ fontSize: '16px' }} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '10px', padding: '8px 12px' }}>
                  <div style={{ fontSize: '9px', color: '#4A5568', fontWeight: 600 }}>UID / Account ID</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>#{numId || '—'}</span>
                    <button onClick={() => handleCopy(String(numId), 'uid')} style={{ border: 'none', background: 'none', color: '#8A9BB8', cursor: 'pointer', fontSize: '10px', padding: 0 }}>
                      {copied === 'uid' ? '✓' : 'Copy'}
                    </button>
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '10px', padding: '8px 12px' }}>
                  <div style={{ fontSize: '9px', color: '#4A5568', fontWeight: 600 }}>P2P Username</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>@{user?.username}</span>
                    <button onClick={() => handleCopy(`@${user?.username}`, 'username')} style={{ border: 'none', background: 'none', color: '#8A9BB8', cursor: 'pointer', fontSize: '10px', padding: 0 }}>
                      {copied === 'username' ? '✓' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Rates ticker and recent activities */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Live rates ticker */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(20,24,39,0.8) 0%, rgba(20,24,39,0.95) 100%)',
              border: '1px solid #1E2640',
              borderRadius: '18px',
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00C896', boxShadow: '0 0 8px #00C896' }} />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#8A9BB8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live Market Rate</span>
                </div>
                <span style={{ fontSize: '11px', color: '#00C896', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>ETB/USDT</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#00C896', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Buy Rate</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>{rate.toLocaleString()}</div>
                  <div style={{ fontSize: '9px', color: '#4A5568', marginTop: '1px' }}>ETB</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#FF4D4D', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Sell Rate</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>{(rate - 4).toLocaleString()}</div>
                  <div style={{ fontSize: '9px', color: '#4A5568', marginTop: '1px' }}>ETB</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#F5A623', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Spread</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#F5A623', fontFamily: 'var(--font-mono)' }}>4</div>
                  <div style={{ fontSize: '9px', color: '#4A5568', marginTop: '1px' }}>ETB</div>
                </div>
              </div>

              {/* Small Market Stats and Sparkline */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0B0E1A', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                <div>
                  <div style={{ fontSize: '9px', color: '#4A5568', fontWeight: 600 }}>P2P Volume (7D)</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>${fmt(totalVolume)}</div>
                </div>
                <div style={{ opacity: 0.85 }}>
                  <Sparkline data={mockRateData} color="#00C896" width={75} height={26} />
                </div>
              </div>
            </div>

            {/* Transaction panel */}
            <div className="wc-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <i className="ti ti-clock" style={{ color: '#F5A623' }} /> Recent Transactions
                </div>
              </div>

              {/* History Sub-tabs */}
              <div style={{ display: 'flex', gap: '2px', background: '#0B0E1A', padding: '3px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'deposits', label: 'Deposits' },
                  { id: 'withdrawals', label: 'Withdraws' },
                  { id: 'transfers', label: 'Transfers' },
                ].map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setTxFilter(sub.id)}
                    className={`wc-sub-tab${txFilter === sub.id ? ' active' : ''}`}
                    style={{ flex: 1, padding: '5px 2px', fontSize: '10.5px' }}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>

              {/* Transactions list */}
              {filteredHistory.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '310px', overflowY: 'auto', paddingRight: '2px' }} className="custom-scrollbar">
                  {filteredHistory.map((item, i) => {
                    const isDep = item._kind === 'dep';
                    const amt = item.amount_usd ?? 0;
                    const date = item.created_at;
                    const isP2P = item.wallet_type === 'P2P';
                    const isInternal = item.wallet_type === 'INTERNAL';
                    const isBinance = item.wallet_type === 'BINANCE';
                    const isBybit = item.wallet_type === 'BYBIT';

                    const txLabel = isP2P ? (isDep ? 'P2P Buy' : 'P2P Sell')
                      : isInternal ? (isDep ? 'Transfer Received' : 'Transfer Sent')
                      : isBinance ? (isDep ? 'Binance Deposit' : 'Binance Withdraw')
                      : isBybit  ? (isDep ? 'Bybit Deposit' : 'Bybit Withdraw')
                      : isDep ? 'Deposit' : 'Withdrawal';

                    const txSub = isDep
                      ? (() => {
                          if (item.sender_reference?.startsWith('{')) {
                            try { const p = JSON.parse(item.sender_reference); return `From ${p.email || p.username || 'Exchange'}`; } catch {}
                          }
                          return `From ${item.sender_reference || (isP2P ? 'P2P Trade' : isInternal ? 'User' : 'Exchange')}`;
                        })()
                      : `To ${item.address || (isInternal ? 'User' : 'Exchange')}`;

                    const amtColor = isDep ? '#00C896' : '#FF4D4D';
                    const statusColor = item.status === 'approved' || item.status === 'completed' ? '#00C896' : item.status === 'pending' ? '#F5A623' : '#FF4D4D';
                    const statusLabel = item.status === 'approved' ? 'Completed' : item.status === 'pending' ? 'Pending' : item.status;

                    return (
                      <div key={i} className="wc-tx" onClick={() => setSelectedTx({ ...item, isDep, amt })}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: isDep ? 'rgba(0,200,150,0.08)' : 'rgba(255,77,77,0.08)', border: `1px solid ${isDep ? 'rgba(0,200,150,0.15)' : 'rgba(255,77,77,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <i className={isDep ? 'ti ti-arrow-down' : 'ti ti-arrow-up'} style={{ color: isDep ? '#00C896' : '#FF4D4D', fontSize: '13px' }} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{txLabel}</div>
                            <div style={{ fontSize: '9.5px', color: '#4A5568', marginTop: '1.5px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {txSub} · {date ? new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: amtColor, fontFamily: 'var(--font-mono)' }}>{isDep ? '+' : '-'}${fmt(amt)}</div>
                          <span style={{ fontSize: '8.5px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: `${statusColor}12`, color: statusColor, display: 'inline-block', marginTop: '1.5px', textTransform: 'uppercase' }}>{statusLabel}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#4A5568' }}>
                  <i className="ti ti-inbox" style={{ fontSize: '32px', display: 'block', marginBottom: '8px', opacity: 0.4 }} />
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>No transaction history</div>
                  <div style={{ fontSize: '10.5px', marginTop: '3px' }}>Records for this filter will appear here</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ DEPOSIT TAB ═════════════════════════════════════════════════════════ */}
      {tab === 'deposit' && (
        <div style={{ animation: 'wFadeUp 0.25s ease-out' }}>
          <StepIndicator steps={['Amount & Method', 'Verify Request']} currentStep={depStep} />
          
          {depStep === 1 ? (
            <div className="wc-panel" style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '580px', margin: '0 auto' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>Deposit USDT</div>
                <div style={{ fontSize: '12.5px', color: '#8A9BB8' }}>Via verified Binance Pay or Bybit transfer</div>
              </div>

              {/* Method selection */}
              <div>
                <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '10px' }}>Transfer Method</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {[
                    { id: 'binance', label: 'Binance Pay', icon: '🟡', desc: 'Instant verification' },
                    { id: 'bybit',   label: 'Bybit Pay',   icon: '⚫', desc: 'Verification 5-15m' },
                  ].map(m => (
                    <button key={m.id} className={`wc-method${depMethod === m.id ? ' active' : ''}`} onClick={() => setDepMethod(m.id)}>
                      <span style={{ fontSize: '24px', flexShrink: 0 }}>{m.icon}</span>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#fff' }}>{m.label}</div>
                        <div style={{ fontSize: '10px', color: '#4A5568', marginTop: '1px' }}>{m.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div style={{ background: '#0B0E1A', borderRadius: '14px', padding: '18px', border: '1px solid #1E2640' }}>
                <div style={{ fontSize: '11px', color: '#F5A623', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="ti ti-help-circle" /> How to Deposit via {depMethod === 'binance' ? 'Binance' : 'Bybit'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    `Open the ${depMethod === 'binance' ? 'Binance' : 'Bybit'} App on your mobile device`,
                    `Send the desired USDT amount to our verified account address below`,
                    `Ensure to copy the exact address/email and take a screenshot of your transaction proof`,
                  ].map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#F5A623', flexShrink: 0 }}>{i + 1}</div>
                      <span style={{ fontSize: '12px', color: '#8A9BB8', lineHeight: 1.4 }}>{s}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '10px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#fff', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '10px' }}>{depositEmail}</span>
                  <button onClick={() => handleCopy(depositEmail, 'depemail')} style={{ background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.25)', color: '#F5A623', fontSize: '11px', fontWeight: 700, padding: '5px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    {copied === 'depemail' ? '✓ Copied' : <><i className="ti ti-copy" /> Copy</>}
                  </button>
                </div>
              </div>

              {/* Amount input */}
              <div>
                <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Amount to Deposit (USDT)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '22px', fontWeight: 700, color: '#4A5568', pointerEvents: 'none' }}>$</span>
                  <input
                    type="number" step="0.01" min={minDep}
                    value={depAmount} onChange={e => setDepAmount(e.target.value)}
                    placeholder="0.00"
                    className="wc-input"
                    style={{ padding: '16px 16px 16px 36px', fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                  />
                </div>
                {depAmtNum > 0 && (
                  <div style={{ background: '#0B0E1A', borderRadius: '12px', padding: '16px', border: '1px solid #1E2640', marginTop: '12px' }}>
                    <FeePill label="Deposit Amount" value={`$${fmt(depAmtNum)} USDT`} color="#fff" />
                    <Divider />
                    <FeePill label={`Verification Fee (${feePercent}%)`} value={`-$${fmt(depFee)} USDT`} color="#FF4D4D" />
                    <Divider />
                    <FeePill label="💰 Net Credit to Wallet" value={`$${fmt(depNet)} USDT`} color="#00C896" />
                    <div style={{ fontSize: '11px', color: '#4A5568', textAlign: 'right', marginTop: '8px' }}>≈ {fmtEtb(depNet * rate)} ETB</div>
                  </div>
                )}
              </div>

              {/* Exchange Username/Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Your {depMethod === 'binance' ? 'Binance' : 'Bybit'} Email *</label>
                  <input
                    type="email" value={depEmail} onChange={e => setDepEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="wc-input" style={{ padding: '12px 14px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Your {depMethod === 'binance' ? 'Binance' : 'Bybit'} Username *</label>
                  <input
                    type="text" value={depUname} onChange={e => setDepUname(e.target.value)}
                    placeholder="Account nickname"
                    className="wc-input" style={{ padding: '12px 14px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Transaction Pay ID / Reference (Optional)</label>
                <input
                  type="text" value={depRef} onChange={e => setDepRef(e.target.value)}
                  placeholder={`${depMethod === 'binance' ? 'Binance Pay ID' : 'Bybit Ref ID'}`}
                  className="wc-input" style={{ padding: '12px 14px', fontSize: '13px' }}
                />
              </div>

              {/* Upload screenshot */}
              <div>
                <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Screenshot Proof *</label>
                {depScreenshotPreview ? (
                  <div style={{ position: 'relative', borderRadius: '12px', border: '1.5px solid #1E2640', overflow: 'hidden', height: '180px', background: '#0B0E1A' }}>
                    <img src={depScreenshotPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    <button 
                      onClick={() => { setDepScreenshot(null); setDepScreenshotPreview(null); }}
                      style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,77,77,0.18)', border: '1px solid rgba(255,77,77,0.3)', borderRadius: '8px', color: '#FF4D4D', padding: '6px 12px', fontSize: '11px', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <i className="ti ti-trash" /> Remove
                    </button>
                  </div>
                ) : (
                  <label className="wc-upload">
                    <span style={{ fontSize: '32px', color: '#F5A623' }}><i className="ti ti-upload" /></span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#8A9BB8' }}>Click to Upload Receipt Screenshot</span>
                    <span style={{ fontSize: '10.5px', color: '#4A5568' }}>Supports PNG, JPG, JPEG · Max 5MB</span>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                      const file = e.target.files[0]; if (!file) return;
                      try { setDepLoading(true); const c = await compressImage(file); setDepScreenshot(c); setDepScreenshotPreview(c); }
                      catch (err) { setError('Failed to process image'); }
                      finally { setDepLoading(false); }
                    }} />
                  </label>
                )}
              </div>

              <InfoBox>
                💡 Admin will verify the transfer in your screenshot and credit your account within <strong>5–15 minutes</strong>. A verification fee of <strong>{feePercent}%</strong> applies.
              </InfoBox>

              <button
                className="wc-btn"
                onClick={handleDepositSubmit}
                disabled={depLoading || !depAmount || !depEmail.trim() || !depUname.trim() || !depScreenshot}
              >
                {depLoading ? '⏳ Processing Request...' : `Submit ${depMethod === 'binance' ? 'Binance' : 'Bybit'} Deposit`}
              </button>
            </div>
          ) : (
            <SuccessScreen
              title="Deposit Request Submitted ✓"
              subtitle="Verification Pending"
              rows={[
                ['Deposit Method', `${depMethod === 'binance' ? 'Binance Pay' : 'Bybit Transfer'}`],
                ['Sender Account', depEmail, '#fff'],
                ['Total Sent', `$${fmt(depAmtNum)} USDT`, '#fff'],
                ['Platform Fee', `-$${fmt(depFee)} USDT`, '#FF4D4D'],
                ['USDT to Credit', `$${fmt(depNet)} USDT`, '#00C896'],
                ['Review Status', '⏳ Pending Review', '#F5A623'],
              ]}
              note={`ℹ️ Admin is verifying your payment screenshot. Credit of $${fmt(depNet)} USDT will be instant upon receipt confirmation.`}
              onDone={() => resetTab('balance')}
              doneLabel="View Asset Overview"
            />
          )}
        </div>
      )}

      {/* ══ WITHDRAW TAB ════════════════════════════════════════════════════════ */}
      {tab === 'withdraw' && (
        <div style={{ animation: 'wFadeUp 0.25s ease-out' }}>
          <StepIndicator steps={['Details', 'Confirm Transaction', 'Completed']} currentStep={wdStep} />
          
          {wdStep === 1 && (
            <div className="wc-panel" style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '580px', margin: '0 auto' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>Withdraw USDT</div>
                <div style={{ fontSize: '12.5px', color: '#8A9BB8' }}>Withdraw funds back to your Binance or Bybit wallet</div>
              </div>

              {/* Available balance indicator */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.18)', borderRadius: '12px' }}>
                <span style={{ fontSize: '12px', color: '#8A9BB8', fontWeight: 600 }}>Available Funding Balance</span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#00C896', fontFamily: 'var(--font-mono)' }}>${fmt(available)} USDT</span>
              </div>

              {/* Method */}
              <div>
                <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '10px' }}>Withdrawal Network</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {[
                    { id: 'binance', label: 'Binance', icon: '🟡', desc: 'No network fee' },
                    { id: 'bybit',   label: 'Bybit',   icon: '⚫', desc: 'Direct exchange UID' },
                  ].map(m => (
                    <button key={m.id} className={`wc-method${wdMethod === m.id ? ' active' : ''}`} onClick={() => setWdMethod(m.id)}>
                      <span style={{ fontSize: '24px', flexShrink: 0 }}>{m.icon}</span>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#fff' }}>{m.label}</div>
                        <div style={{ fontSize: '10px', color: '#4A5568', marginTop: '1px' }}>{m.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Amount to Withdraw (USDT)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '22px', fontWeight: 700, color: '#4A5568', pointerEvents: 'none' }}>$</span>
                  <input
                    type="number" step="0.01" min={minWd}
                    value={wdAmount} onChange={e => setWdAmount(e.target.value)}
                    placeholder="0.00"
                    className="wc-input"
                    style={{ padding: '16px 16px 16px 36px', fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                  />
                </div>
                {available > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#4A5568' }}>Minimum Withdrawal: ${minWd} USDT</span>
                    <button type="button" onClick={() => setWdAmount(available.toFixed(2))} style={{ background: 'none', border: 'none', color: '#F5A623', cursor: 'pointer', fontWeight: 700, fontSize: '11.5px', padding: 0 }}>Withdraw Max</button>
                  </div>
                )}
                {wdAmtNum > 0 && (
                  <div style={{ background: '#0B0E1A', borderRadius: '12px', padding: '16px', border: '1px solid #1E2640', marginTop: '12px' }}>
                    <FeePill label="Subtotal" value={`$${fmt(wdAmtNum)} USDT`} color="#fff" />
                    <Divider />
                    <FeePill label={`Withdrawal Fee (${wdFeePercent}%)`} value={`-$${fmt(wdFee)} USDT`} color="#FF4D4D" />
                    <Divider />
                    <FeePill label="💰 Net Received Amount" value={`$${fmt(wdNet)} USDT`} color="#00C896" />
                  </div>
                )}
              </div>

              {/* Destination */}
              <div>
                <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Your {wdMethod === 'binance' ? 'Binance' : 'Bybit'} Email or Account UID *</label>
                <input
                  type="text" value={wdEmail} onChange={e => setWdEmail(e.target.value)}
                  placeholder={wdMethod === 'binance' ? 'Binance Account Email or Pay ID' : 'Bybit Email or Account UID'}
                  className="wc-input" style={{ padding: '12px 14px', fontSize: '13px' }}
                />
              </div>

              <InfoBox type="warn">
                ⚠️ Double check the withdrawal destination. Transfers sent to incorrect accounts or mismatched exchanges <strong>cannot be reversed or recovered</strong>.
              </InfoBox>

              <button
                className="wc-btn"
                onClick={handleWithdrawSubmit}
                disabled={!wdAmount || wdAmtNum < minWd || wdAmtNum > available || !wdEmail.trim()}
              >
                Review Withdrawal <i className="ti ti-arrow-right" style={{ marginLeft: '4px' }} />
              </button>
            </div>
          )}

          {wdStep === 2 && (
            <div className="wc-panel" style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '580px', margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <BackBtn onClick={() => setWdStep(1)} />
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>Confirm Withdrawal</div>
              </div>

              <div style={{ background: '#0B0E1A', borderRadius: '14px', padding: '20px', border: '1px solid #1E2640' }}>
                <div style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>Withdrawal Summary</div>
                <FeePill label="Gross Withdrawal" value={`$${fmt(wdAmtNum)} USDT`} color="#fff" />
                <Divider />
                <FeePill label={`Platform Fee (${wdFeePercent}%)`} value={`-$${fmt(wdFee)} USDT`} color="#FF4D4D" />
                <Divider />
                <FeePill label="You will Receive" value={`$${fmt(wdNet)} USDT`} color="#00C896" />
                <Divider />
                <FeePill label="Network Method" value={wdMethod === 'binance' ? 'Binance Pay' : 'Bybit Transfer'} color="#8A9BB8" />
                <Divider />
                <FeePill label="Destination Wallet" value={wdEmail} color="#F5A623" />
              </div>

              <InfoBox type="warn">
                ⚠️ You are confirming withdrawal of <strong>${fmt(wdAmtNum)} USDT</strong> to the account <strong>{wdEmail}</strong>. This transaction will complete in 5-30 minutes.
              </InfoBox>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="wc-btn-outline" onClick={() => setWdStep(1)} style={{ flex: 1 }}>Back</button>
                <button className="wc-btn" onClick={handleWithdrawConfirm} disabled={wdLoading} style={{ flex: 2 }}>
                  {wdLoading ? '⏳ Confirming...' : 'Confirm & Process'}
                </button>
              </div>
            </div>
          )}

          {wdStep === 3 && (
            <SuccessScreen
              title="Withdrawal Request Sent ✓"
              subtitle="Processing withdrawal"
              rows={[
                ['Method', wdMethod === 'binance' ? 'Binance Pay' : 'Bybit Transfer'],
                ['Recipient Destination', wdEmail, '#F5A623'],
                ['Gross Value', `$${fmt(wdAmtNum)} USDT`, '#fff'],
                ['Deducted Fee', `-$${fmt(wdFee)} USDT`, '#FF4D4D'],
                ['Credits Sent', `$${fmt(wdNet)} USDT`, '#00C896'],
                ['Review Status', '⏳ Processing', '#F5A623'],
              ]}
              note={`ℹ️ Admin is processing your request. Please wait 5–30 minutes for credits to reflect in your ${wdMethod === 'binance' ? 'Binance' : 'Bybit'} account.`}
              onDone={() => resetTab('balance')}
              doneLabel="View Asset Overview"
            />
          )}
        </div>
      )}

      {/* ══ SEND / INTERNAL TRANSFER TAB ═════════════════════════════════════════ */}
      {tab === 'send' && (
        <div style={{ animation: 'wFadeUp 0.25s ease-out' }}>
          <StepIndicator steps={['Find Recipient', 'Enter Amount']} currentStep={sendStep} />
          
          {sendStep === 1 ? (
            <div className="wc-panel" style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '580px', margin: '0 auto' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>Internal Transfer</div>
                <div style={{ fontSize: '12.5px', color: '#8A9BB8' }}>Send instant transfers to any EthioSwap user for free</div>
              </div>

              {/* Sender info */}
              <div className="wc-recv-card">
                <div style={{ fontSize: '10px', color: '#4A5568', fontWeight: 700, textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.04em' }}>Your Account Details</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, #F5A623, #D88E10)', color: '#0A0C12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '16px' }}>
                    {(user?.username || 'U')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>@{user?.username}</div>
                    <div style={{ fontSize: '11px', color: '#8A9BB8', marginTop: '1px' }}>Available Balance: <strong style={{ color: '#00C896' }}>${fmt(available)} USDT</strong></div>
                  </div>
                  <button onClick={() => handleCopy(`@${user?.username}`, 'senduser')} style={{ background: 'none', border: '1px solid #1E2640', borderRadius: '8px', color: '#8A9BB8', fontSize: '10px', padding: '5px 10px', cursor: 'pointer' }}>
                    {copied === 'senduser' ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Recipient username input */}
              <div>
                <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Recipient Account Username or Email</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={sendQuery}
                    onChange={e => { setSendQuery(e.target.value); if (foundRecipient) setFoundRecipient(null); if (lookupError) setLookupError(''); }}
                    placeholder="@username or email address"
                    className="wc-input"
                    style={{ padding: '12px 14px', flex: 1 }}
                    onKeyDown={e => e.key === 'Enter' && handleUserLookup()}
                  />
                  <button onClick={handleUserLookup} disabled={lookupLoading || !sendQuery.trim()} style={{
                    padding: '12px 18px', border: 'none', borderRadius: '12px', background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)',
                    color: '#F5A623', cursor: 'pointer', fontWeight: 700, fontSize: '15px', flexShrink: 0,
                  }}>
                    {lookupLoading ? '...' : <i className="ti ti-search" />}
                  </button>
                </div>
              </div>

              {lookupError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px', background: 'rgba(255,77,77,0.06)', border: '1px solid rgba(255,77,77,0.2)', borderRadius: '12px', fontSize: '13px', color: '#FF4D4D' }}>
                  <i className="ti ti-alert-circle" /> {lookupError}
                </div>
              )}

              {foundRecipient && (
                <>
                  <div className="wc-recv-card" style={{ border: '1px solid rgba(0,200,150,0.22)', background: 'rgba(0,200,150,0.02)' }}>
                    <div style={{ fontSize: '10px', color: '#00C896', fontWeight: 700, textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.04em' }}>✓ Recipient Match Found</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #00C896, #00A67E)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '16px' }}>
                        {(foundRecipient.username || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>@{foundRecipient.username}</div>
                        {foundRecipient.full_name && <div style={{ fontSize: '11.5px', color: '#8A9BB8', marginTop: '1px' }}>{foundRecipient.full_name}</div>}
                        <div style={{ fontSize: '10.5px', color: '#4A5568', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{foundRecipient.email}</div>
                      </div>
                    </div>
                  </div>
                  <button className="wc-btn" onClick={() => setSendStep(2)}>
                    Set Amount <i className="ti ti-arrow-right" style={{ marginLeft: '4px' }} />
                  </button>
                </>
              )}

              {!foundRecipient && (
                <button className="wc-btn" onClick={handleUserLookup} disabled={lookupLoading || !sendQuery.trim()}>
                  {lookupLoading ? '⏳ Searching Records...' : 'Verify Recipient'}
                </button>
              )}
            </div>
          ) : (
            <div className="wc-panel" style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '580px', margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <BackBtn onClick={() => setSendStep(1)} />
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>Transfer Amount</div>
              </div>

              {/* Recipient card brief */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: '#0B0E1A', borderRadius: '12px', border: '1px solid #1E2640' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #00C896, #00A67E)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', flexShrink: 0 }}>
                  {(foundRecipient?.username || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#8A9BB8' }}>Transferring USDT to</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginTop: '1px' }}>@{foundRecipient?.username}</div>
                </div>
              </div>

              {/* Amount input */}
              <div>
                <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Amount to Send (USD)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '24px', fontWeight: 700, color: '#4A5568', pointerEvents: 'none' }}>$</span>
                  <input
                    type="number" step="0.01" min="0.01"
                    value={sendAmt} onChange={e => setSendAmt(e.target.value)}
                    placeholder="0.00"
                    className="wc-input"
                    style={{ padding: '18px 16px 18px 36px', fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                    autoFocus
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: '#4A5568' }}>
                  <span>Available: <strong style={{ color: '#00C896' }}>${fmt(available)} USDT</strong></span>
                  {available > 0 && <button type="button" onClick={() => setSendAmt(available.toFixed(2))} style={{ background: 'none', border: 'none', color: '#F5A623', cursor: 'pointer', fontWeight: 700, padding: 0, fontSize: '11px' }}>Send Max</button>}
                </div>
              </div>

              {parseFloat(sendAmt) > 0 && (
                <div style={{ background: '#0B0E1A', borderRadius: '12px', padding: '16px', border: '1px solid #1E2640' }}>
                  <FeePill label="Gross Value" value={`$${fmt(parseFloat(sendAmt))} USDT`} color="#fff" />
                  <Divider />
                  <FeePill label="Internal Transfer Fee" value="FREE" color="#00C896" />
                  <Divider />
                  <FeePill label="Credits to Recipient" value={`$${fmt(parseFloat(sendAmt))} USDT`} color="#00C896" />
                </div>
              )}

              <InfoBox type="success">
                ✓ Internal user transfers are instant, zero-fee, and credit directly to the user's available funding balance.
              </InfoBox>

              <button
                className="wc-btn"
                onClick={handleSendSubmit}
                disabled={sendLoading || !sendAmt || parseFloat(sendAmt) <= 0 || parseFloat(sendAmt) > available}
              >
                {sendLoading ? '⏳ Sending Transfer...' : `Confirm & Send $${sendAmt || '0'} to @${foundRecipient?.username}`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══ QR CODE DEPOSIT MODAL ══════════════════════════════════════════════ */}
      {showQR && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }} 
          onClick={() => setShowQR(false)}
        >
          <div 
            style={{ background: '#141827', border: '1px solid #1E2640', borderRadius: '18px', padding: '32px', maxWidth: '340px', width: '100%', textAlign: 'center', boxShadow: '0 12px 48px rgba(0,0,0,0.6)' }} 
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>Scan to Deposit</div>
            <div style={{ fontSize: '11px', color: '#8A9BB8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '22px' }}>USDT · {selectedNet.toUpperCase()} Network</div>
            
            <div style={{ background: '#fff', borderRadius: '14px', padding: '16px', display: 'inline-block', marginBottom: '22px', border: '2px solid #1E2640' }}>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180&data=${activeAddress || 'ethioswap'}`} alt="QR Code" style={{ width: 180, height: 180, display: 'block' }} />
            </div>

            <div style={{ fontSize: '11px', color: '#4A5568', textAlign: 'left', marginBottom: '4px', fontWeight: 600 }}>DEPOSIT ADDRESS</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: '#0B0E1A', border: '1.5px solid #1E2640', borderRadius: '10px', marginBottom: '24px' }}>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#8A9BB8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                {activeAddress || 'No address assigned'}
              </span>
              <button 
                onClick={() => handleCopy(activeAddress, 'qraddr')}
                style={{ border: 'none', background: 'none', color: '#00C896', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
              >
                <i className={copied === 'qraddr' ? 'ti ti-check' : 'ti ti-copy'} style={{ fontSize: '14px' }} />
              </button>
            </div>

            <button 
              onClick={() => setShowQR(false)} 
              style={{ width: '100%', padding: '12px', background: '#1E2640', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#283254'}
              onMouseLeave={e => e.currentTarget.style.background = '#1E2640'}
            >
              Close Window
            </button>
          </div>
        </div>
      )}

      {/* ══ TRANSACTION RECEIPT MODAL ═══════════════════════════════════════════ */}
      {selectedTx && (() => {
        const item = selectedTx;
        const isDep = item.isDep;
        const amt = item.amt;
        const isInternal = item.wallet_type === 'INTERNAL';
        const isP2P = item.wallet_type === 'P2P';
        const statusLabel = item.status;
        let normalizedStatus = 'PENDING';
        if (statusLabel === 'approved' || statusLabel === 'completed') normalizedStatus = 'COMPLETED';
        else if (['rejected', 'cancelled', 'failed'].includes(statusLabel)) normalizedStatus = 'CANCELLED';
        const fromStr = isDep
          ? (() => { try { const p = JSON.parse(item.sender_reference || ''); return p.email || p.username || item.sender_reference; } catch { return item.sender_reference || (isP2P ? 'P2P Trade' : isInternal ? 'User Transfer' : 'Exchange'); } })()
          : (user?.full_name || user?.username || 'My Wallet');
        const toStr = isDep
          ? (user?.full_name || user?.username || 'My Wallet')
          : (item.address || (isInternal ? 'User Transfer' : 'Exchange'));

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(10px)', padding: '20px', overflowY: 'auto' }}
            onClick={() => setSelectedTx(null)}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '480px' }}>
              <BrandedReceipt
                txType={isDep ? 'DEPOSIT' : 'WITHDRAWAL'}
                status={normalizedStatus}
                dateTime={item.created_at}
                refId={item.id}
                fromName={fromStr}
                toName={toStr}
                amountSent={`$${fmt(amt)} USDT`}
                amountReceived={`$${fmt(isDep ? (isInternal || isP2P ? amt : Math.max(0, amt * (1 - feePercent / 100))) : (isInternal || isP2P ? amt : Math.max(0, amt - amt * wdFeePercent / 100)))} USDT`}
                fee={isInternal || isP2P ? '0.00 USDT (Free)' : `$${fmt(amt * feePercent / 100)} USDT (${feePercent}%)`}
                paymentMethod={isP2P ? 'P2P Trade' : isInternal ? 'EthioSwap Internal' : (item.wallet_type === 'BINANCE' ? 'Binance Pay' : item.wallet_type === 'BYBIT' ? 'Bybit Transfer' : 'Exchange')}
                network={isInternal || isP2P ? 'Internal Network' : (item.wallet_type || 'Exchange')}
                txHash={item.tx_hash || item.transaction_hash || ''}
                onClose={() => setSelectedTx(null)}
              />
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default WalletCard;
