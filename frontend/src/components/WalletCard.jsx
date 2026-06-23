import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase';
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
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0' }}>
    <span style={{ fontSize: '12.5px', color: '#8A9BB8' }}>{label}</span>
    <span style={{ fontSize: '13px', fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{value}</span>
  </div>
);

const Divider = () => <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />;

const BackBtn = ({ onClick }) => (
  <button onClick={onClick} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#8A9BB8', padding: '7px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, transition: 'all 0.2s', flexShrink: 0 }}
    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
  >
    <i className="ti ti-arrow-left" /> Back
  </button>
);

const Badge = ({ children, color = '#F5A623' }) => (
  <span style={{ background: `${color}1A`, border: `1px solid ${color}40`, color, fontSize: '9.5px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{children}</span>
);

const InfoBox = ({ children, type = 'info' }) => {
  const map = { info: { bg: 'rgba(245,166,35,0.06)', border: 'rgba(245,166,35,0.2)', color: '#FFD580' }, warn: { bg: 'rgba(255,77,77,0.06)', border: 'rgba(255,77,77,0.2)', color: '#FF6B6B' }, success: { bg: 'rgba(0,200,150,0.06)', border: 'rgba(0,200,150,0.2)', color: '#00C896' } };
  const s = map[type] || map.info;
  return (
    <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '12px', padding: '12px 14px', fontSize: '12px', color: s.color, lineHeight: 1.5 }}>{children}</div>
  );
};

const SuccessScreen = ({ title, subtitle, rows, note, onDone, doneLabel = 'Back to Wallet' }) => (
  <div style={{ background: 'linear-gradient(135deg, #0d1221 0%, #111827 100%)', border: '1px solid rgba(0,200,150,0.25)', borderRadius: '20px', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(0,200,150,0.12)', border: '2px solid rgba(0,200,150,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '24px' }}>✓</div>
      <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>{title}</div>
      <div style={{ fontSize: '12px', color: '#00C896', fontWeight: 600 }}>{subtitle}</div>
    </div>
    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '0' }}>
      {rows.map((r, i) => (
        <div key={i}>
          <FeePill label={r[0]} value={r[1]} color={r[2] || '#fff'} />
          {i < rows.length - 1 && <Divider />}
        </div>
      ))}
    </div>
    {note && <InfoBox>{note}</InfoBox>}
    <button onClick={onDone} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #F5A623, #D88E10)', color: '#0A0C12', fontSize: '14px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
      onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
    >{doneLabel}</button>
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

  // History — newest first, max 30
  const history = useMemo(() => {
    const deps = (myDepositReqs || []).map(r => ({ ...r, _kind: 'dep' }));
    const wds = (myWithdrawalReqs || []).map(r => ({ ...r, _kind: 'wd' }));
    return [...deps, ...wds].sort((a, b) => new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0)).slice(0, 30);
  }, [myDepositReqs, myWithdrawalReqs]);

  const completedTrades = useMemo(() => (trades || []).filter(t => t.status === 'completed'), [trades]);
  const totalVolume = useMemo(() => completedTrades.reduce((s, t) => s + (t.amount_eth || 0), 0), [completedTrades]);

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
      <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}.sk{background:linear-gradient(90deg,#1a1d28 25%,#22263a 50%,#1a1d28 75%);background-size:400px 100%;animation:shimmer 1.5s ease-in-out infinite;border-radius:16px}`}</style>
      <div className="sk" style={{ height: 200 }} />
      <div className="sk" style={{ height: 52, borderRadius: 12 }} />
      <div className="sk" style={{ height: 140, borderRadius: 16 }} />
    </div>
  );

  const TABS = [
    { id: 'balance',  icon: 'ti ti-wallet',     label: 'Overview' },
    { id: 'deposit',  icon: 'ti ti-arrow-down',  label: 'Deposit' },
    { id: 'withdraw', icon: 'ti ti-arrow-up',    label: 'Withdraw' },
    { id: 'send',     icon: 'ti ti-send',        label: 'Send' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0', fontFamily: 'var(--font)' }}>
      <style>{`
        @keyframes wFadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        @keyframes wPulse { 0%,100%{opacity:1}50%{opacity:0.6} }
        @keyframes shimmer { 0%{background-position:-400px 0}100%{background-position:400px 0} }
        .wc-hero { background: linear-gradient(135deg, #0f1628 0%, #0a0e1c 60%, #111827 100%); border-radius: 20px; border: 1px solid rgba(255,255,255,0.07); padding: 28px; position: relative; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
        .wc-hero::before { content:''; position:absolute; top:-80px; right:-60px; width:220px; height:220px; border-radius:50%; background:radial-gradient(circle, rgba(245,166,35,0.14) 0%, transparent 70%); pointer-events:none; }
        .wc-hero::after  { content:''; position:absolute; bottom:-100px; left:-80px; width:240px; height:240px; border-radius:50%; background:radial-gradient(circle, rgba(0,200,150,0.06) 0%, transparent 70%); pointer-events:none; }
        .wc-tabs { display:flex; background:rgba(15,18,30,0.9); border:1px solid rgba(255,255,255,0.07); border-radius:14px; padding:4px; gap:3px; backdrop-filter:blur(12px); }
        .wc-tab { flex:1; padding:10px 6px; border-radius:10px; border:none; cursor:pointer; background:transparent; color:#8A9BB8; font-family:var(--font); font-size:11px; font-weight:600; display:flex; flex-direction:column; align-items:center; gap:4px; transition:all 0.2s cubic-bezier(0.16,1,0.3,1); }
        .wc-tab:hover { color:#fff; background:rgba(255,255,255,0.04); }
        .wc-tab.active { background:rgba(245,166,35,0.1); color:#F5A623; border:1px solid rgba(245,166,35,0.22); }
        .wc-tab.active-teal { background:rgba(0,200,150,0.1); color:#00C896; border:1px solid rgba(0,200,150,0.22); }
        .wc-panel { background:rgba(14,17,28,0.85); border:1px solid rgba(255,255,255,0.07); border-radius:18px; padding:24px; backdrop-filter:blur(16px); animation: wFadeUp 0.25s ease-out; }
        .wc-input { width:100%; box-sizing:border-box; background:rgba(8,10,20,0.8); border:1.5px solid rgba(255,255,255,0.08); border-radius:12px; color:#fff; outline:none; font-family:var(--font); transition:all 0.2s ease; }
        .wc-input:focus { border-color:rgba(245,166,35,0.5); background:rgba(245,166,35,0.025); box-shadow:0 0 0 3px rgba(245,166,35,0.1); }
        .wc-input::placeholder { color:#3A4558; }
        .wc-btn { width:100%; padding:14px; border-radius:12px; border:none; background:linear-gradient(135deg, #F5A623 0%, #D88E10 100%); color:#0A0C12; font-size:14px; font-weight:800; cursor:pointer; transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 4px 20px rgba(245,166,35,0.2); font-family:var(--font); }
        .wc-btn:hover:not(:disabled) { filter:brightness(1.1); transform:translateY(-1px); box-shadow:0 6px 24px rgba(245,166,35,0.32); }
        .wc-btn:disabled { background:rgba(30,38,64,0.6)!important; color:#4A5568!important; cursor:not-allowed; box-shadow:none; filter:none; transform:none; }
        .wc-btn-outline { width:100%; padding:13px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); background:transparent; color:#8A9BB8; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.2s; font-family:var(--font); }
        .wc-btn-outline:hover { border-color:rgba(255,255,255,0.2); color:#fff; background:rgba(255,255,255,0.03); }
        .wc-method { padding:14px 16px; border-radius:14px; border:1.5px solid rgba(255,255,255,0.08); background:rgba(15,18,30,0.8); cursor:pointer; flex:1; display:flex; align-items:center; gap:12px; transition:all 0.2s; }
        .wc-method:hover { border-color:rgba(255,255,255,0.2); background:rgba(255,255,255,0.03); }
        .wc-method.active { border-color:#F5A623; background:rgba(245,166,35,0.05); }
        .wc-upload { border:2px dashed rgba(255,255,255,0.1); border-radius:14px; padding:28px 20px; display:flex; flex-direction:column; align-items:center; gap:10px; cursor:pointer; transition:all 0.2s; background:rgba(8,10,20,0.5); }
        .wc-upload:hover { border-color:rgba(245,166,35,0.5); background:rgba(245,166,35,0.025); }
        .wc-tx { display:flex; justify-content:space-between; align-items:center; padding:12px 14px; border-radius:12px; border:1px solid rgba(255,255,255,0.05); background:rgba(255,255,255,0.015); transition:all 0.18s; cursor:pointer; }
        .wc-tx:hover { background:rgba(255,255,255,0.04); border-color:rgba(255,255,255,0.1); transform:translateY(-1px); }
        .wc-stat { background:rgba(14,17,28,0.85); border:1px solid rgba(255,255,255,0.07); border-radius:16px; padding:16px 18px; flex:1; transition:all 0.2s; }
        .wc-stat:hover { border-color:rgba(245,166,35,0.2); transform:translateY(-2px); }
        .wc-recv-card { padding:18px; border-radius:14px; background:rgba(8,10,20,0.7); border:1px solid rgba(255,255,255,0.07); }
        .wc-tag { font-size:9.5px; font-weight:700; padding:3px 8px; border-radius:6px; letter-spacing:0.04em; text-transform:uppercase; }
      `}</style>

      {/* ══ HERO CARD ══════════════════════════════════════════════════════════ */}
      <div className="wc-hero" style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <Logo size={28} showText={false} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#F5A623', letterSpacing: '0.1em', textTransform: 'uppercase' }}>EthioSwap Wallet</span>
            </div>
            {numId && <div style={{ fontSize: '11px', color: '#4A5568', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>UID #{numId}</div>}
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span className="wc-tag" style={{ background: 'rgba(0,200,150,0.12)', border: '1px solid rgba(0,200,150,0.25)', color: '#00C896' }}>● Live</span>
            <span className="wc-tag" style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.25)', color: '#F5A623' }}>USDT</span>
          </div>
        </div>

        {/* Balance */}
        <div style={{ position: 'relative', zIndex: 1, marginBottom: '22px' }}>
          <div style={{ fontSize: '11px', color: '#4A5568', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Balance</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontSize: '44px', fontWeight: 800, color: '#F5A623', fontFamily: 'var(--font-mono)', letterSpacing: '-0.04em', lineHeight: 1 }}>${fmt(balance)}</span>
            <span style={{ fontSize: '16px', color: '#8A9BB8', fontWeight: 500 }}>USD</span>
          </div>
          <div style={{ fontSize: '14px', color: '#00C896', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>≈ {fmtEtb(balance * rate)} ETB</div>
        </div>

        {/* Sub-balances */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', position: 'relative', zIndex: 1 }}>
          {[
            { label: 'Available', val: available, color: '#00C896', icon: '●' },
            { label: 'In Escrow', val: locked,    color: '#F5A623', icon: '🔒' },
            { label: 'Trades Done', val: completedTrades.length, color: '#8A9BB8', icon: '🤝', raw: true },
          ].map(c => (
            <div key={c.label} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '9.5px', color: '#4A5568', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{c.icon} {c.label}</div>
              <div style={{ fontSize: '17px', fontWeight: 700, color: c.color, fontFamily: 'var(--font-mono)' }}>{c.raw ? c.val : `$${fmt(c.val)}`}</div>
              {!c.raw && <div style={{ fontSize: '9px', color: '#4A5568', marginTop: '1px' }}>≈ {fmtEtb(c.val * rate)} ETB</div>}
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginTop: '18px', position: 'relative', zIndex: 1 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => resetTab(t.id)} style={{
              padding: '10px 6px', border: 'none', borderRadius: '10px',
              background: tab === t.id ? 'rgba(245,166,35,0.15)' : 'rgba(255,255,255,0.05)',
              color: tab === t.id ? '#F5A623' : '#8A9BB8',
              cursor: 'pointer', fontSize: '11px', fontWeight: 700, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '5px', transition: 'all 0.2s', fontFamily: 'var(--font)',
              border: tab === t.id ? '1px solid rgba(245,166,35,0.3)' : '1px solid rgba(255,255,255,0.05)',
            }}>
              <i className={t.icon} style={{ fontSize: '18px' }} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══ TABS ══════════════════════════════════════════════════════════════ */}
      <div className="wc-tabs" style={{ marginBottom: '14px' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => resetTab(t.id)} className={`wc-tab${tab === t.id ? ' active' : ''}`}>
            <i className={t.icon} style={{ fontSize: '18px' }} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ OVERVIEW TAB ═══════════════════════════════════════════════════════ */}
      {tab === 'balance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'wFadeUp 0.25s ease-out' }}>
          {/* Stats Row */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div className="wc-stat">
              <div style={{ fontSize: '9.5px', color: '#4A5568', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>P2P Volume</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#00C896', fontFamily: 'var(--font-mono)' }}>${fmt(totalVolume)}</div>
              <div style={{ fontSize: '10px', color: '#4A5568', marginTop: '2px' }}>Lifetime</div>
            </div>
            <div className="wc-stat">
              <div style={{ fontSize: '9.5px', color: '#4A5568', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Deposits</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#F5A623', fontFamily: 'var(--font-mono)' }}>
                {(myDepositReqs || []).filter(r => r.status === 'approved').length}
              </div>
              <div style={{ fontSize: '10px', color: '#4A5568', marginTop: '2px' }}>Approved</div>
            </div>
            <div className="wc-stat">
              <div style={{ fontSize: '9.5px', color: '#4A5568', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Fee Rate</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#8A9BB8', fontFamily: 'var(--font-mono)' }}>{feePercent}%</div>
              <div style={{ fontSize: '10px', color: '#4A5568', marginTop: '2px' }}>Platform fee</div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="wc-panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <i className="ti ti-clock" style={{ color: '#F5A623' }} /> Transaction History
              </div>
              {history.length > 0 && <span style={{ fontSize: '10px', color: '#4A5568' }}>{history.length} records</span>}
            </div>

            {history.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {history.map((item, i) => {
                  const isDep = item._kind === 'dep';
                  const amt = item.amount_usd ?? 0;
                  const date = item.created_at;
                  const isP2P = item.wallet_type === 'P2P';
                  const isInternal = item.wallet_type === 'INTERNAL';
                  const isBinance = item.wallet_type === 'BINANCE';
                  const isBybit = item.wallet_type === 'BYBIT';

                  const txLabel = isP2P ? (isDep ? '🤝 P2P Trade Received' : '🤝 P2P Trade Sent')
                    : isInternal ? (isDep ? '↙ Received from User' : '↗ Sent to User')
                    : isBinance ? (isDep ? '🟡 Binance Deposit' : '🟡 Binance Withdrawal')
                    : isBybit  ? (isDep ? '⚫ Bybit Deposit' : '⚫ Bybit Withdrawal')
                    : isDep ? 'Deposit' : 'Withdrawal';

                  const txSub = isDep
                    ? (() => {
                        if (item.sender_reference?.startsWith('{')) {
                          try { const p = JSON.parse(item.sender_reference); return `From ${p.email || p.username || 'Exchange'}`; } catch {}
                        }
                        return `From ${item.sender_reference || (isP2P ? 'P2P Trade' : isInternal ? 'User transfer' : 'Exchange')}`;
                      })()
                    : `To ${item.address || (isInternal ? 'User' : 'Exchange')}`;

                  const amtColor = isDep ? (isP2P ? '#00C896' : '#F5A623') : '#FF6B6B';
                  const statusColor = item.status === 'approved' ? '#00C896' : item.status === 'pending' ? '#F5A623' : '#FF6B6B';
                  const statusLabel = item.status === 'approved' ? 'Completed' : item.status === 'pending' ? 'Pending' : item.status;

                  return (
                    <div key={i} className="wc-tx" onClick={() => setSelectedTx({ ...item, isDep, amt })}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isDep ? 'rgba(245,166,35,0.1)' : 'rgba(255,107,107,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <i className={isDep ? 'ti ti-arrow-down' : 'ti ti-arrow-up'} style={{ color: isDep ? '#F5A623' : '#FF6B6B', fontSize: '15px' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#fff' }}>{txLabel}</div>
                          <div style={{ fontSize: '10px', color: '#4A5568', marginTop: '1px' }}>
                            {txSub} · {date ? new Date(date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: amtColor, fontFamily: 'var(--font-mono)' }}>{isDep ? '+' : '-'}${fmt(amt)}</div>
                        <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '5px', background: `${statusColor}18`, color: statusColor, display: 'inline-block', marginTop: '2px' }}>{statusLabel}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#4A5568' }}>
                <i className="ti ti-inbox" style={{ fontSize: '36px', display: 'block', marginBottom: '10px' }} />
                <div style={{ fontSize: '13px', fontWeight: 600 }}>No transactions yet</div>
                <div style={{ fontSize: '11px', marginTop: '4px' }}>Your deposit & withdrawal history will appear here</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ DEPOSIT TAB ═══════════════════════════════════════════════════════ */}
      {tab === 'deposit' && (
        <div style={{ animation: 'wFadeUp 0.25s ease-out' }}>
          {depStep === 1 ? (
            <div className="wc-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>Deposit USDT</div>
                <div style={{ fontSize: '12px', color: '#4A5568' }}>Powered by Binance Pay · Bybit Transfer</div>
              </div>

              {/* Step 1 — Method */}
              <div>
                <label style={{ fontSize: '10.5px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '10px' }}>Transfer Method</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[
                    { id: 'binance', label: 'Binance Pay', icon: '🟡', desc: 'Via Binance P2P / Pay' },
                    { id: 'bybit',   label: 'Bybit',       icon: '⚫', desc: 'Via Bybit transfer' },
                  ].map(m => (
                    <button key={m.id} className={`wc-method${depMethod === m.id ? ' active' : ''}`} onClick={() => setDepMethod(m.id)}>
                      <span style={{ fontSize: '22px' }}>{m.icon}</span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '1px' }}>{m.label}</div>
                        <div style={{ fontSize: '10px', color: '#4A5568' }}>{m.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* How to transfer */}
              <div style={{ background: 'rgba(8,10,20,0.7)', borderRadius: '14px', padding: '16px', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontSize: '10.5px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                  📋 How to Deposit via {depMethod === 'binance' ? 'Binance' : 'Bybit'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    `Open ${depMethod === 'binance' ? 'Binance Pay' : 'Bybit'} on your phone`,
                    `Send USDT to our verified account email:`,
                  ].map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#F5A623', flexShrink: 0 }}>{i + 1}</div>
                      <span style={{ fontSize: '12px', color: '#8A9BB8', lineHeight: 1.5 }}>{s}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#F5A623', fontWeight: 700 }}>{adminEmail}</span>
                  <button onClick={() => handleCopy(adminEmail, 'email')} style={{ background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.25)', color: '#F5A623', fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' }}>
                    {copied === 'email' ? '✓ Copied' : '📋 Copy'}
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label style={{ fontSize: '10.5px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Amount Sent (USDT)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '20px', fontWeight: 700, color: '#4A5568', pointerEvents: 'none' }}>$</span>
                  <input
                    type="number" step="0.01" min={minDep}
                    value={depAmount} onChange={e => setDepAmount(e.target.value)}
                    placeholder="0.00"
                    className="wc-input"
                    style={{ padding: '14px 16px 14px 34px', fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                  />
                </div>
                {depAmtNum > 0 && (
                  <div style={{ background: 'rgba(8,10,20,0.7)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255,255,255,0.07)', marginTop: '10px' }}>
                    <FeePill label="Amount Sent" value={`$${fmt(depAmtNum)} USDT`} color="#fff" />
                    <Divider />
                    <FeePill label={`Platform Fee (${feePercent}%)`} value={`-$${fmt(depFee)} USDT`} color="#FF6B6B" />
                    <Divider />
                    <FeePill label="💰 You Receive" value={`$${fmt(depNet)} USDT`} color="#00C896" />
                    <div style={{ fontSize: '10px', color: '#4A5568', textAlign: 'right', marginTop: '6px' }}>≈ {fmtEtb(depNet * rate)} ETB</div>
                  </div>
                )}
              </div>

              {/* Your account details */}
              <div>
                <label style={{ fontSize: '10.5px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Your {depMethod === 'binance' ? 'Binance' : 'Bybit'} Email *</label>
                <input
                  type="email" value={depEmail} onChange={e => setDepEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="wc-input" style={{ padding: '12px 14px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '10.5px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Your {depMethod === 'binance' ? 'Binance' : 'Bybit'} Username *</label>
                <input
                  type="text" value={depUname} onChange={e => setDepUname(e.target.value)}
                  placeholder="Your exchange username"
                  className="wc-input" style={{ padding: '12px 14px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '10.5px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Transaction ID / Reference (Optional)</label>
                <input
                  type="text" value={depRef} onChange={e => setDepRef(e.target.value)}
                  placeholder={`${depMethod === 'binance' ? 'Binance Pay ID' : 'Bybit TxID'}`}
                  className="wc-input" style={{ padding: '12px 14px' }}
                />
              </div>

              {/* Screenshot */}
              <div>
                <label style={{ fontSize: '10.5px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Screenshot Proof *</label>
                {depScreenshotPreview ? (
                  <div style={{ position: 'relative', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', height: '150px', background: '#0B0E1A' }}>
                    <img src={depScreenshotPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    <button onClick={() => { setDepScreenshot(null); setDepScreenshotPreview(null); }}
                      style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '6px', color: '#FF6B6B', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }}>✕</button>
                  </div>
                ) : (
                  <label className="wc-upload">
                    <span style={{ fontSize: '28px' }}>📁</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#8A9BB8' }}>Click to Upload Screenshot</span>
                    <span style={{ fontSize: '10px', color: '#4A5568' }}>JPG, PNG · Max 5MB</span>
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
                💡 <strong>Note:</strong> Admin will verify your screenshot and credit your wallet within <strong>5–15 minutes</strong>. A <strong>{feePercent}% platform fee</strong> is always deducted.
              </InfoBox>

              <button
                className="wc-btn"
                onClick={handleDepositSubmit}
                disabled={depLoading || !depAmount || !depEmail.trim() || !depUname.trim() || !depScreenshot}
              >
                {depLoading ? '⏳ Submitting...' : `✓ Submit ${depMethod === 'binance' ? 'Binance' : 'Bybit'} Deposit Request`}
              </button>
            </div>
          ) : (
            <SuccessScreen
              title="Deposit Request Submitted ✓"
              subtitle="Processing via admin verification · Usually 5–15 min"
              rows={[
                ['Method', `${depMethod === 'binance' ? 'Binance Pay' : 'Bybit Transfer'}`],
                ['From Account', depEmail, '#fff'],
                ['Amount Sent', `$${fmt(depAmtNum)} USDT`, '#fff'],
                ['Platform Fee', `-$${fmt(depFee)} USDT`, '#FF6B6B'],
                ['You Receive', `$${fmt(depNet)} USDT`, '#00C896'],
                ['Status', '⏳ Pending Admin Review', '#F5A623'],
              ]}
              note={`ℹ️ Admin will verify your ${depMethod === 'binance' ? 'Binance Pay' : 'Bybit'} screenshot and credit $${fmt(depNet)} USDT to your wallet.`}
              onDone={() => resetTab('balance')}
              doneLabel="View Wallet"
            />
          )}
        </div>
      )}

      {/* ══ WITHDRAW TAB ══════════════════════════════════════════════════════ */}
      {tab === 'withdraw' && (
        <div style={{ animation: 'wFadeUp 0.25s ease-out' }}>
          {wdStep === 1 && (
            <div className="wc-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>Withdraw USDT</div>
                <div style={{ fontSize: '12px', color: '#4A5568' }}>Receive to your Binance or Bybit account</div>
              </div>

              {/* Available balance pill */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.2)', borderRadius: '12px' }}>
                <span style={{ fontSize: '12px', color: '#4A5568', fontWeight: 600 }}>Available Balance</span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#00C896', fontFamily: 'var(--font-mono)' }}>${fmt(available)} USDT</span>
              </div>

              {/* Method */}
              <div>
                <label style={{ fontSize: '10.5px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '10px' }}>Receive To</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[
                    { id: 'binance', label: 'Binance', icon: '🟡' },
                    { id: 'bybit',   label: 'Bybit',   icon: '⚫' },
                  ].map(m => (
                    <button key={m.id} className={`wc-method${wdMethod === m.id ? ' active' : ''}`} onClick={() => setWdMethod(m.id)}>
                      <span style={{ fontSize: '22px' }}>{m.icon}</span>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{m.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label style={{ fontSize: '10.5px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Amount (USDT)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '20px', fontWeight: 700, color: '#4A5568', pointerEvents: 'none' }}>$</span>
                  <input
                    type="number" step="0.01" min={minWd}
                    value={wdAmount} onChange={e => setWdAmount(e.target.value)}
                    placeholder="0.00"
                    className="wc-input"
                    style={{ padding: '14px 16px 14px 34px', fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                  />
                </div>
                {available > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#4A5568' }}>Min: ${minWd}</span>
                    <button type="button" onClick={() => setWdAmount(available.toFixed(2))} style={{ background: 'none', border: 'none', color: '#F5A623', cursor: 'pointer', fontWeight: 700, fontSize: '11px', padding: 0 }}>Withdraw Max</button>
                  </div>
                )}
                {wdAmtNum > 0 && (
                  <div style={{ background: 'rgba(8,10,20,0.7)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255,255,255,0.07)', marginTop: '10px' }}>
                    <FeePill label="Withdrawal Amount" value={`$${fmt(wdAmtNum)} USDT`} color="#fff" />
                    <Divider />
                    <FeePill label={`Platform Fee (${wdFeePercent}%)`} value={`-$${fmt(wdFee)} USDT`} color="#FF6B6B" />
                    <Divider />
                    <FeePill label="💰 You Receive" value={`$${fmt(wdNet)} USDT`} color="#00C896" />
                  </div>
                )}
              </div>

              {/* Destination */}
              <div>
                <label style={{ fontSize: '10.5px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Your {wdMethod === 'binance' ? 'Binance' : 'Bybit'} Email or UID *</label>
                <input
                  type="text" value={wdEmail} onChange={e => setWdEmail(e.target.value)}
                  placeholder={wdMethod === 'binance' ? 'Binance email or UID' : 'Bybit email or UID'}
                  className="wc-input" style={{ padding: '12px 14px' }}
                />
              </div>

              <InfoBox type="warn">
                ⚠️ Make sure your {wdMethod === 'binance' ? 'Binance' : 'Bybit'} email or UID is correct. Funds sent to the wrong address <strong>cannot be recovered</strong>.
              </InfoBox>

              <button
                className="wc-btn"
                onClick={handleWithdrawSubmit}
                disabled={!wdAmount || wdAmtNum < minWd || wdAmtNum > available || !wdEmail.trim()}
              >
                Continue <i className="ti ti-arrow-right" style={{ marginLeft: '4px' }} />
              </button>
            </div>
          )}

          {wdStep === 2 && (
            <div className="wc-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BackBtn onClick={() => setWdStep(1)} />
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#fff' }}>Confirm Withdrawal</div>
              </div>

              <div style={{ background: 'rgba(8,10,20,0.7)', borderRadius: '14px', padding: '18px', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontSize: '11px', color: '#4A5568', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>Transaction Summary</div>
                <FeePill label="Amount" value={`$${fmt(wdAmtNum)} USDT`} color="#fff" />
                <Divider />
                <FeePill label={`Platform Fee (${wdFeePercent}%)`} value={`-$${fmt(wdFee)} USDT`} color="#FF6B6B" />
                <Divider />
                <FeePill label="You Receive" value={`$${fmt(wdNet)} USDT`} color="#00C896" />
                <Divider />
                <FeePill label="Method" value={wdMethod === 'binance' ? 'Binance' : 'Bybit'} color="#8A9BB8" />
                <Divider />
                <FeePill label="Destination" value={wdEmail} color="#F5A623" />
              </div>

              <InfoBox type="warn">
                ⚠️ You are about to withdraw <strong>${fmt(wdAmtNum)} USDT</strong>. After the <strong>{wdFeePercent}% fee</strong>, you will receive <strong>${fmt(wdNet)} USDT</strong> to your {wdMethod === 'binance' ? 'Binance' : 'Bybit'} account. This action cannot be undone.
              </InfoBox>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="wc-btn-outline" onClick={() => setWdStep(1)} style={{ flex: 1 }}>Cancel</button>
                <button className="wc-btn" onClick={handleWithdrawConfirm} disabled={wdLoading} style={{ flex: 2 }}>
                  {wdLoading ? '⏳ Processing...' : '✓ Confirm Withdrawal'}
                </button>
              </div>
            </div>
          )}

          {wdStep === 3 && (
            <SuccessScreen
              title="Withdrawal Request Submitted ✓"
              subtitle="Admin will process your withdrawal"
              rows={[
                ['Method', wdMethod === 'binance' ? 'Binance' : 'Bybit'],
                ['Destination', wdEmail, '#F5A623'],
                ['Amount', `$${fmt(wdAmtNum)} USDT`, '#fff'],
                ['Fee', `-$${fmt(wdFee)} USDT`, '#FF6B6B'],
                ['You Receive', `$${fmt(wdNet)} USDT`, '#00C896'],
                ['Status', '⏳ Pending', '#F5A623'],
              ]}
              note={`ℹ️ Admin will send $${fmt(wdNet)} USDT to your ${wdMethod === 'binance' ? 'Binance' : 'Bybit'} account. Processing time: 5–30 minutes.`}
              onDone={() => resetTab('balance')}
              doneLabel="View Wallet"
            />
          )}
        </div>
      )}

      {/* ══ SEND TAB ══════════════════════════════════════════════════════════ */}
      {tab === 'send' && (
        <div style={{ animation: 'wFadeUp 0.25s ease-out' }}>
          {sendStep === 1 ? (
            <div className="wc-panel" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>Send to User</div>
                <div style={{ fontSize: '12px', color: '#4A5568' }}>Instant internal transfer · No network fee</div>
              </div>

              {/* Your info */}
              <div className="wc-recv-card">
                <div style={{ fontSize: '10px', color: '#4A5568', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Your Wallet</div>
                <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #F5A623, #FFE082)', color: '#0A0C12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '15px' }}>
                    {(user?.username || 'U')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>@{user?.username}</div>
                    <div style={{ fontSize: '11px', color: '#4A5568' }}>Available: <strong style={{ color: '#00C896' }}>${fmt(available)}</strong></div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {numId && <div style={{ fontSize: '10px', color: '#4A5568', fontFamily: 'var(--font-mono)' }}>#{numId}</div>}
                    <button onClick={() => handleCopy(`@${user?.username}`, 'myuser')} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#8A9BB8', fontSize: '10px', padding: '3px 8px', cursor: 'pointer', marginTop: '4px' }}>
                      {copied === 'myuser' ? '✓' : '📋 Copy'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Find recipient */}
              <div>
                <label style={{ fontSize: '10.5px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Recipient Username or Email</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={sendQuery}
                    onChange={e => { setSendQuery(e.target.value); if (foundRecipient) setFoundRecipient(null); if (lookupError) setLookupError(''); }}
                    placeholder="@username or email"
                    className="wc-input"
                    style={{ padding: '12px 14px', flex: 1 }}
                    onKeyDown={e => e.key === 'Enter' && handleUserLookup()}
                  />
                  <button onClick={handleUserLookup} disabled={lookupLoading || !sendQuery.trim()} style={{
                    padding: '12px 16px', border: 'none', borderRadius: '12px', background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)',
                    color: '#F5A623', cursor: 'pointer', fontWeight: 700, fontSize: '13px', flexShrink: 0,
                  }}>
                    {lookupLoading ? '...' : '🔍'}
                  </button>
                </div>
              </div>

              {lookupError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)', borderRadius: '12px', fontSize: '12.5px', color: '#FF6B6B' }}>
                  <i className="ti ti-alert-circle" /> {lookupError}
                </div>
              )}

              {foundRecipient && (
                <>
                  <div className="wc-recv-card" style={{ border: '1px solid rgba(0,200,150,0.25)', background: 'rgba(0,200,150,0.04)' }}>
                    <div style={{ fontSize: '10px', color: '#00C896', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>✓ Recipient Found</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #00C896, #00A67E)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '16px' }}>
                        {(foundRecipient.username || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>@{foundRecipient.username}</div>
                        {foundRecipient.full_name && <div style={{ fontSize: '11px', color: '#8A9BB8' }}>{foundRecipient.full_name}</div>}
                        <div style={{ fontSize: '10px', color: '#4A5568', fontFamily: 'var(--font-mono)' }}>{foundRecipient.email}</div>
                      </div>
                    </div>
                  </div>
                  <button className="wc-btn" onClick={() => setSendStep(2)}>
                    Continue <i className="ti ti-arrow-right" style={{ marginLeft: '4px' }} />
                  </button>
                </>
              )}

              {!foundRecipient && (
                <button className="wc-btn" onClick={handleUserLookup} disabled={lookupLoading || !sendQuery.trim()}>
                  {lookupLoading ? '⏳ Searching...' : '🔍 Find Recipient'}
                </button>
              )}
            </div>
          ) : (
            <div className="wc-panel" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BackBtn onClick={() => setSendStep(1)} />
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#fff' }}>Enter Amount</div>
              </div>

              {/* Recipient brief */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #00C896, #00A67E)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', flexShrink: 0 }}>
                  {(foundRecipient?.username || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#8A9BB8' }}>Sending to</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>@{foundRecipient?.username}</div>
                </div>
              </div>

              {/* Amount input */}
              <div>
                <label style={{ fontSize: '10.5px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Amount (USD)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '24px', fontWeight: 700, color: '#4A5568', pointerEvents: 'none' }}>$</span>
                  <input
                    type="number" step="0.01" min="0.01"
                    value={sendAmt} onChange={e => setSendAmt(e.target.value)}
                    placeholder="0.00"
                    className="wc-input"
                    style={{ padding: '16px 16px 16px 36px', fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                    autoFocus
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: '#4A5568' }}>
                  <span>Available: <strong style={{ color: '#00C896' }}>${fmt(available)}</strong></span>
                  {available > 0 && <button type="button" onClick={() => setSendAmt(available.toFixed(2))} style={{ background: 'none', border: 'none', color: '#F5A623', cursor: 'pointer', fontWeight: 700, padding: 0, fontSize: '11px' }}>Send All</button>}
                </div>
              </div>

              {parseFloat(sendAmt) > 0 && (
                <div style={{ background: 'rgba(8,10,20,0.7)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <FeePill label="Amount" value={`$${fmt(parseFloat(sendAmt))} USDT`} color="#fff" />
                  <Divider />
                  <FeePill label="Internal Transfer Fee" value="FREE" color="#00C896" />
                  <Divider />
                  <FeePill label="Recipient Receives" value={`$${fmt(parseFloat(sendAmt))} USDT`} color="#00C896" />
                </div>
              )}

              <InfoBox type="success">
                ✓ Internal transfers are <strong>instant and fee-free</strong>. The recipient's balance updates immediately.
              </InfoBox>

              <button
                className="wc-btn"
                onClick={handleSendSubmit}
                disabled={sendLoading || !sendAmt || parseFloat(sendAmt) <= 0 || parseFloat(sendAmt) > available}
              >
                {sendLoading ? '⏳ Sending...' : `✓ Send $${sendAmt || '0'} to @${foundRecipient?.username}`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══ RECEIVE INFO (visible from Overview) ══════════════════════════════ */}
      {tab === 'balance' && (
        <div className="wc-panel" style={{ marginTop: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="ti ti-qrcode" style={{ color: '#F5A623' }} /> Receive
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="wc-recv-card">
              <div style={{ fontSize: '10px', color: '#4A5568', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Your Username</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#F5A623', fontFamily: 'var(--font-mono)' }}>@{user?.username}</div>
                <button onClick={() => handleCopy(`@${user?.username}`, 'uname')} style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.25)', color: '#F5A623', fontSize: '11px', fontWeight: 600, padding: '5px 10px', borderRadius: '7px', cursor: 'pointer' }}>
                  {copied === 'uname' ? '✓' : '📋 Copy'}
                </button>
              </div>
            </div>
            {numId && (
              <div className="wc-recv-card">
                <div style={{ fontSize: '10px', color: '#4A5568', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Account ID</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>#{numId}</div>
                  <button onClick={() => handleCopy(String(numId), 'nid')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#8A9BB8', fontSize: '11px', fontWeight: 600, padding: '5px 10px', borderRadius: '7px', cursor: 'pointer' }}>
                    {copied === 'nid' ? '✓' : '📋 Copy'}
                  </button>
                </div>
              </div>
            )}
            <InfoBox>
              💡 Share your <strong>username</strong> or <strong>Account ID</strong> to receive instant, fee-free transfers from other EthioSwap users.
            </InfoBox>
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
