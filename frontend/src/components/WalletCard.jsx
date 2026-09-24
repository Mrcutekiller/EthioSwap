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

  // ── On-Chain Deposit state ───────────────────────────────
  const [chainDepStep, setChainDepStep] = useState(1); // 1=select chain+amount, 2=show address+submit hash, 3=success
  const [chainDepChain, setChainDepChain] = useState('BEP20');
  const [chainDepAmount, setChainDepAmount] = useState('');
  const [chainDepTxHash, setChainDepTxHash] = useState('');
  const [chainDepLoading, setChainDepLoading] = useState(false);

  // ── On-Chain Withdraw state ──────────────────────────────
  const [chainWdStep, setChainWdStep] = useState(1); // 1=form, 2=confirm, 3=success
  const [chainWdChain, setChainWdChain] = useState('BEP20');
  const [chainWdAmount, setChainWdAmount] = useState('');
  const [chainWdAddress, setChainWdAddress] = useState('');
  const [chainWdLoading, setChainWdLoading] = useState(false);

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
    setChainDepStep(1); setChainDepAmount(''); setChainDepTxHash('');
    setChainWdStep(1); setChainWdAmount(''); setChainWdAddress('');
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

  // Derive user specific address
  const userAddress = wallet?.eth_address || wallet?.ethAddress || '';

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

  // On-chain network configurations
  const CHAIN_CONFIGS = {
    BEP20:   { label: 'BEP20 (BSC)', icon: '🟡', token: 'USDT', confirmations: 3, desc: 'Binance Smart Chain · Fast & cheap' },
    TRC20:   { label: 'TRC20 (Tron)', icon: '🔴', token: 'USDT', confirmations: 20, desc: 'Tron network · Very cheap fees' },
    ERC20:   { label: 'ERC20 (ETH)', icon: '🔵', token: 'USDT', confirmations: 12, desc: 'Ethereum network · High security' },
    POLYGON: { label: 'Polygon (MATIC)', icon: '🟣', token: 'USDT', confirmations: 20, desc: 'Polygon · Fast & low fee' },
  };

  // Get admin on-chain wallet address for selected chain
  const getChainWallet = (chain) => {
    const master = systemSettings?.master_wallet_address || '';
    try {
      if (master.trim().startsWith('{')) {
        const parsed = JSON.parse(master);
        const key = chain.toLowerCase().replace('20','').replace('erc','eth').replace('bep','bsc').replace('trc','tron');
        return parsed[chain] || parsed[key] || parsed.bep20 || parsed.usdt || Object.values(parsed)[0] || '';
      }
    } catch (e) {}
    // Try chain_wallets from system settings
    const cw = systemSettings?.chain_wallets;
    if (cw && typeof cw === 'object') {
      return cw[chain] || cw[chain.toLowerCase()] || '';
    }
    // Fallback: user eth address for EVM chains, else tron-style
    const ethAddr = userAddress;
    if (chain === 'TRC20') { try { const { getTronAddress } = require('../utils/crypto.js'); return getTronAddress(ethAddr); } catch { return ethAddr; } }
    return ethAddr;
  };

  const chainDepFeePercent = systemSettings?.funded_deposit_fee_percent ?? systemSettings?.deposit_fee_percent ?? 2.0;
  const chainWdFeePercent  = systemSettings?.funded_withdraw_fee_percent ?? systemSettings?.withdrawal_fee_percent ?? 2.0;
  const chainDepAmtNum = parseFloat(chainDepAmount) || 0;
  const chainDepFee = chainDepAmtNum * chainDepFeePercent / 100;
  const chainDepNet = Math.max(0, chainDepAmtNum - chainDepFee);
  const chainWdAmtNum = parseFloat(chainWdAmount) || 0;
  const chainWdFee = chainWdAmtNum * chainWdFeePercent / 100;
  const chainWdNet = Math.max(0, chainWdAmtNum - chainWdFee);

  // On-chain deposit: user pastes their TX hash → automatically verified & credited to wallet balance (no admin approval)
  const handleChainDepositSubmit = async () => {
    if (chainDepAmtNum < minDep) { setError(`Minimum deposit is $${minDep}`); return; }
    if (!chainDepTxHash.trim()) { setError('Please enter your transaction hash / TXID'); return; }
    setChainDepLoading(true);
    try {
      const adminWallet = getChainWallet(chainDepChain);
      // Check for duplicate TXID
      const { data: existing } = await supabase
        .from('onchain_deposits')
        .select('id')
        .eq('tx_hash', chainDepTxHash.trim())
        .limit(1);
      if (existing && existing.length > 0) {
        throw new Error('This transaction hash has already been submitted.');
      }

      // 1. Record on-chain deposit as credited
      const { error: insertErr } = await supabase.from('onchain_deposits').insert({
        user_id: user.id,
        chain: chainDepChain,
        token: 'USDT',
        from_address: userAddress || 'unknown',
        to_address: adminWallet,
        tx_hash: chainDepTxHash.trim(),
        amount_token: chainDepAmtNum,
        platform_fee_usd: chainDepFee,
        net_credit_usd: chainDepNet,
        status: 'credited',
        credited_at: new Date().toISOString(),
        required_confirmations: CHAIN_CONFIGS[chainDepChain]?.confirmations || 3,
      });
      if (insertErr) throw insertErr;

      // 2. Automatically credit user wallet balance immediately (NO admin approval needed)
      const { data: userData } = await supabase
        .from('users')
        .select('eth_balance')
        .eq('id', user.id)
        .single();
      const currentBal = userData?.eth_balance || 0;
      const newBal = currentBal + chainDepNet;
      await supabase.from('users').update({ eth_balance: newBal }).eq('id', user.id);

      // 3. Collect platform fee to admin wallet
      const { data: sett } = await supabase.from('system_settings').select('id, collected_fees_eth').limit(1).single();
      if (sett) {
        await supabase.from('system_settings').update({
          collected_fees_eth: (sett.collected_fees_eth || 0) + chainDepFee
        }).eq('id', sett.id);
      }

      // 4. Record approved deposit request for history
      await supabase.from('deposit_requests').insert({
        user_id: user.id,
        amount_usd: chainDepNet,
        amount_eth: chainDepNet / 3000,
        wallet_type: chainDepChain,
        sender_reference: chainDepTxHash.trim(),
        username: user.username,
        status: 'approved',
        reviewed_at: new Date().toISOString(),
      });

      // 5. Notify admin for tracking
      const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin');
      if (admins) {
        for (const admin of admins) {
          await supabase.from('notifications').insert({
            user_id: admin.id,
            type: 'deposit_auto_credited',
            title: 'On-Chain Deposit Auto-Credited',
            message: `@${user.username} deposited $${chainDepAmtNum} USDT via ${chainDepChain} (TXID: ${chainDepTxHash.slice(0, 16)}...). Auto-credited $${chainDepNet.toFixed(2)} to wallet. Admin fee earned: $${chainDepFee.toFixed(2)}.`,
          });
        }
      }

      // 6. Notify user
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'deposit_confirmed',
        title: 'Deposit Credited Automatically!',
        message: `Your deposit of $${chainDepAmtNum} USDT (${chainDepChain}) has been automatically credited! $${chainDepNet.toFixed(2)} USDT added to your balance.`,
      });

      setChainDepStep(3);
      setSuccess(`Deposit credited automatically! $${fmt(chainDepNet)} USDT added to your wallet.`);
    } catch (err) { setError(err.message); }
    finally { setChainDepLoading(false); }
  };

  // On-chain withdraw: deduct from balance → queue for admin to send on-chain
  const handleChainWithdrawSubmit = async () => {
    if (chainWdAmtNum < minWd) { setError(`Minimum withdrawal is $${minWd}`); return; }
    if (chainWdAmtNum > available) { setError(`Insufficient balance. Available: $${fmt(available)}`); return; }
    if (!chainWdAddress.trim()) { setError('Please enter your wallet address on the selected network'); return; }
    setChainWdStep(2);
  };

  const handleChainWithdrawConfirm = async () => {
    setChainWdLoading(true);
    try {
      // Deduct balance immediately (user-initiated withdrawal)
      const { data: userData, error: userErr } = await supabase
        .from('users').select('eth_balance').eq('id', user.id).single();
      if (userErr) throw userErr;
      const currentBal = userData?.eth_balance || 0;
      const totalDeduct = chainWdAmtNum; // fee comes from the net amount
      if (currentBal < totalDeduct) throw new Error(`Insufficient balance: $${currentBal.toFixed(2)} available`);
      const newBal = currentBal - totalDeduct;
      const { error: balErr } = await supabase.from('users').update({ eth_balance: newBal }).eq('id', user.id);
      if (balErr) throw balErr;
      // Record withdrawal
      const { error: wdErr } = await supabase.from('onchain_withdrawals').insert({
        user_id: user.id,
        chain: chainWdChain,
        token: 'USDT',
        to_address: chainWdAddress.trim(),
        amount_usd: chainWdAmtNum,
        platform_fee_usd: chainWdFee,
        net_sent_usd: chainWdNet,
        status: 'pending',
      });
      if (wdErr) throw wdErr;
      // Also record as withdraw_request for history
      await supabase.from('withdraw_requests').insert({
        user_id: user.id,
        amount_usd: chainWdAmtNum,
        amount_eth: chainWdAmtNum / 3000,
        address: chainWdAddress.trim(),
        wallet_type: chainWdChain,
        username: user.username,
        status: 'pending',
      });
      // Add fee to admin
      const { data: sett } = await supabase.from('system_settings').select('id, collected_fees_eth').limit(1).single();
      if (sett) {
        await supabase.from('system_settings').update({ collected_fees_eth: (sett.collected_fees_eth || 0) + chainWdFee }).eq('id', sett.id);
      }
      // Notify admin
      const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin');
      if (admins) {
        for (const admin of admins) {
          await supabase.from('notifications').insert({
            user_id: admin.id, type: 'withdrawal_new', title: 'On-Chain Withdrawal Request',
            message: `@${user.username} requested ${chainWdChain} USDT withdrawal of $${chainWdNet.toFixed(2)} to ${chainWdAddress.slice(0,16)}... (Fee: $${chainWdFee.toFixed(2)})`,
          });
        }
      }
      setChainWdStep(3);
      setSuccess(`Withdrawal of $${chainWdAmtNum} queued. You will receive $${chainWdNet.toFixed(2)} USDT on ${chainWdChain} within 1 hour.`);
    } catch (err) { setError(err.message); setChainWdStep(1); }
    finally { setChainWdLoading(false); }
  };

  const TABS = [
    { id: 'balance',    icon: 'ti ti-wallet',          label: 'Overview' },
    { id: 'chain_dep',  icon: 'ti ti-arrow-down-circle', label: 'Deposit' },
    { id: 'chain_wd',   icon: 'ti ti-arrow-up-circle',  label: 'Withdraw' },
    { id: 'send',       icon: 'ti ti-send',             label: 'Send' },
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

        .wc-grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .wc-methods-container { display: flex; gap: 12px; }
        @media (max-width: 480px) {
          .wc-tabs-nav { overflow-x: auto; white-space: nowrap; display: flex; scrollbar-width: none; }
          .wc-tabs-nav::-webkit-scrollbar { display: none; }
          .wc-tab-nav-btn { flex: 0 0 auto; padding: 10px 14px; }
          .wc-actions-bar { grid-template-columns: repeat(2, 1fr)!important; gap: 8px!important; }
          .wc-grid-2col { grid-template-columns: 1fr; }
          .wc-methods-container { flex-direction: column; }
        }
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
            <div className="wc-actions-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {[
                { label: 'Deposit', icon: 'ti-arrow-down-circle', color: '#F5A623', tab: 'chain_dep' },
                { label: 'Withdraw', icon: 'ti-arrow-up-circle', color: '#00C896', tab: 'chain_wd' },
                { label: 'Send', icon: 'ti-send', color: '#8A9BB8', tab: 'send' },
                { label: 'P2P Trade', icon: 'ti-arrows-left-right', color: '#6C5CE7', customAction: () => {
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

            {/* Internal Transfer Info Widget */}
            <div className="wc-panel">
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="ti ti-arrows-left-right" style={{ color: '#F5A623' }} /> Internal Transfer Details
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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

      {/* Exchange deposit tab removed — on-chain only */}

      {/* ══ ON-CHAIN DEPOSIT TAB ════════════════════════════════════════════ */}
      {tab === 'chain_dep' && (
        <div style={{ animation: 'wFadeUp 0.25s ease-out' }}>
          <StepIndicator steps={['Choose Network', 'Send & Submit TXID', 'Confirmed']} currentStep={chainDepStep} />

          {chainDepStep === 1 && (
            <div className="wc-panel" style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '580px', margin: '0 auto' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>Deposit USDT (On-Chain)</div>
                <div style={{ fontSize: '12.5px', color: '#8A9BB8' }}>Automatic — no admin approval needed. Fee: <strong style={{ color: '#F5A623' }}>{chainDepFeePercent}%</strong></div>
              </div>

              {/* Chain selection */}
              <div>
                <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '10px' }}>Select Blockchain Network</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {Object.entries(CHAIN_CONFIGS).map(([key, cfg]) => (
                    <button key={key} className={`wc-method${chainDepChain === key ? ' active' : ''}`} onClick={() => setChainDepChain(key)} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '6px', padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>{cfg.icon}</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{cfg.label}</span>
                      </div>
                      <span style={{ fontSize: '10px', color: '#4A5568' }}>{cfg.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Amount to Deposit (USDT)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '22px', fontWeight: 700, color: '#4A5568', pointerEvents: 'none' }}>$</span>
                  <input
                    type="number" step="0.01" min={minDep}
                    value={chainDepAmount} onChange={e => setChainDepAmount(e.target.value)}
                    placeholder="0.00"
                    className="wc-input"
                    style={{ padding: '16px 16px 16px 36px', fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                  />
                </div>
                {chainDepAmtNum > 0 && (
                  <div style={{ background: '#0B0E1A', borderRadius: '12px', padding: '16px', border: '1px solid #1E2640', marginTop: '12px' }}>
                    <FeePill label="Deposit Amount" value={`$${fmt(chainDepAmtNum)} USDT`} color="#fff" />
                    <Divider />
                    <FeePill label={`Platform Fee (${chainDepFeePercent}%)`} value={`-$${fmt(chainDepFee)} USDT`} color="#FF4D4D" />
                    <Divider />
                    <FeePill label="💰 Net Credit to Wallet" value={`$${fmt(chainDepNet)} USDT`} color="#00C896" />
                    <div style={{ fontSize: '11px', color: '#4A5568', textAlign: 'right', marginTop: '8px' }}>≈ {fmtEtb(chainDepNet * rate)} ETB</div>
                  </div>
                )}
              </div>

              <InfoBox>
                ✅ <strong>Automatic Processing:</strong> After you send USDT on the selected network and submit your TXID, your wallet balance is credited automatically once confirmed on-chain. No admin approval required.
              </InfoBox>

              <button
                className="wc-btn"
                onClick={() => {
                  if (chainDepAmtNum < minDep) { setError(`Minimum deposit is $${minDep}`); return; }
                  setChainDepStep(2);
                }}
                disabled={!chainDepAmount || chainDepAmtNum < minDep}
              >
                Continue — View Deposit Address <i className="ti ti-arrow-right" style={{ marginLeft: '4px' }} />
              </button>
            </div>
          )}

          {chainDepStep === 2 && (() => {
            const adminWallet = getChainWallet(chainDepChain);
            const cfg = CHAIN_CONFIGS[chainDepChain];
            return (
              <div className="wc-panel" style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '580px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <BackBtn onClick={() => setChainDepStep(1)} />
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>Send & Submit TXID</div>
                </div>

                {/* Admin wallet address to send to */}
                <div style={{ background: '#0B0E1A', borderRadius: '14px', padding: '20px', border: '1px solid #1E2640' }}>
                  <div style={{ fontSize: '11px', color: '#F5A623', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{cfg.icon}</span> Send {cfg.token} to this {cfg.label} Address
                  </div>
                  {[
                    { label: 'Network', value: cfg.label },
                    { label: 'Token', value: `${cfg.token} (USDT)` },
                    { label: 'Amount to Send', value: `$${fmt(chainDepAmtNum)} USDT` },
                    { label: 'After Fee Credit', value: `$${fmt(chainDepNet)} USDT` },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '12px' }}>
                      <span style={{ color: '#8A9BB8' }}>{row.label}</span>
                      <span style={{ color: '#fff', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{row.value}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: '14px' }}>
                    <div style={{ fontSize: '10px', color: '#8A9BB8', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>Deposit Address</div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#fff', fontWeight: 700, wordBreak: 'break-all', flex: 1 }}>{adminWallet || 'Address will be configured by admin'}</span>
                      {adminWallet && (
                        <button onClick={() => handleCopy(adminWallet, 'chainaddr')} style={{ background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.3)', color: '#F5A623', fontSize: '11px', fontWeight: 700, padding: '5px 12px', borderRadius: '8px', cursor: 'pointer', flexShrink: 0 }}>
                          {copied === 'chainaddr' ? '✓ Copied' : <><i className="ti ti-copy" /> Copy</>}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <InfoBox type="warn">
                  ⚠️ <strong>Important:</strong> Only send <strong>USDT</strong> on the <strong>{cfg.label}</strong> network to this address. Sending other tokens or using wrong network will result in permanent loss of funds.
                </InfoBox>

                {/* TX hash input */}
                <div>
                  <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Transaction Hash / TXID *</label>
                  <input
                    type="text" value={chainDepTxHash} onChange={e => setChainDepTxHash(e.target.value)}
                    placeholder="Paste your transaction hash (0x... or TXID)"
                    className="wc-input" style={{ padding: '12px 14px', fontSize: '13px', fontFamily: 'var(--font-mono)' }}
                  />
                  <div style={{ fontSize: '10.5px', color: '#4A5568', marginTop: '6px' }}>Find TXID in your wallet app after sending. Required for automatic verification.</div>
                </div>

                <button
                  className="wc-btn"
                  onClick={handleChainDepositSubmit}
                  disabled={chainDepLoading || !chainDepTxHash.trim()}
                >
                  {chainDepLoading ? '⏳ Verifying & Crediting...' : '⚡ Submit Deposit — Auto Credit to Wallet'}
                </button>
              </div>
            );
          })()}

          {chainDepStep === 3 && (
            <SuccessScreen
              title="Deposit Credited Automatically ✅"
              subtitle="Funds added to your balance instantly"
              rows={[
                ['Network', CHAIN_CONFIGS[chainDepChain]?.label || chainDepChain],
                ['Amount Sent', `$${fmt(chainDepAmtNum)} USDT`, '#fff'],
                ['Platform Fee', `-$${fmt(chainDepFee)} USDT`, '#FF4D4D'],
                ['Net Credit', `$${fmt(chainDepNet)} USDT`, '#00C896'],
                ['Status', '⚡ Credited & Available', '#00C896'],
              ]}
              note={`🎉 Your deposit of $${fmt(chainDepNet)} USDT has been automatically credited to your wallet balance. No admin approval required. You can trade P2P, deposit to brokers, or buy prop accounts right now!`}
              onDone={() => resetTab('balance')}
              doneLabel="View Asset Overview"
            />
          )}
        </div>
      )}

      {/* ══ ON-CHAIN WITHDRAW TAB ════════════════════════════════════════════ */}
      {tab === 'chain_wd' && (
        <div style={{ animation: 'wFadeUp 0.25s ease-out' }}>
          <StepIndicator steps={['Network & Amount', 'Confirm', 'Submitted']} currentStep={chainWdStep} />

          {chainWdStep === 1 && (
            <div className="wc-panel" style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '580px', margin: '0 auto' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>Withdraw USDT (On-Chain)</div>
                <div style={{ fontSize: '12.5px', color: '#8A9BB8' }}>Send USDT directly to your wallet. Fee: <strong style={{ color: '#F5A623' }}>{chainWdFeePercent}%</strong></div>
              </div>

              {/* Available balance */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.18)', borderRadius: '12px' }}>
                <span style={{ fontSize: '12px', color: '#8A9BB8', fontWeight: 600 }}>Available Balance</span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#00C896', fontFamily: 'var(--font-mono)' }}>${fmt(available)} USDT</span>
              </div>

              {/* Chain selection */}
              <div>
                <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '10px' }}>Select Withdrawal Network</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {Object.entries(CHAIN_CONFIGS).map(([key, cfg]) => (
                    <button key={key} className={`wc-method${chainWdChain === key ? ' active' : ''}`} onClick={() => setChainWdChain(key)} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '6px', padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>{cfg.icon}</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{cfg.label}</span>
                      </div>
                      <span style={{ fontSize: '10px', color: '#4A5568' }}>{cfg.desc}</span>
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
                    value={chainWdAmount} onChange={e => setChainWdAmount(e.target.value)}
                    placeholder="0.00"
                    className="wc-input"
                    style={{ padding: '16px 16px 16px 36px', fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                  />
                </div>
                {available > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#4A5568' }}>Minimum: ${minWd} USDT</span>
                    <button type="button" onClick={() => setChainWdAmount(available.toFixed(2))} style={{ background: 'none', border: 'none', color: '#F5A623', cursor: 'pointer', fontWeight: 700, fontSize: '11.5px', padding: 0 }}>Withdraw Max</button>
                  </div>
                )}
                {chainWdAmtNum > 0 && (
                  <div style={{ background: '#0B0E1A', borderRadius: '12px', padding: '16px', border: '1px solid #1E2640', marginTop: '12px' }}>
                    <FeePill label="Withdrawal Amount" value={`$${fmt(chainWdAmtNum)} USDT`} color="#fff" />
                    <Divider />
                    <FeePill label={`Platform Fee (${chainWdFeePercent}%)`} value={`-$${fmt(chainWdFee)} USDT`} color="#FF4D4D" />
                    <Divider />
                    <FeePill label="💸 You Will Receive" value={`$${fmt(chainWdNet)} USDT`} color="#00C896" />
                  </div>
                )}
              </div>

              {/* Destination wallet address */}
              <div>
                <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Your {CHAIN_CONFIGS[chainWdChain]?.label} Wallet Address *</label>
                <input
                  type="text" value={chainWdAddress} onChange={e => setChainWdAddress(e.target.value)}
                  placeholder={chainWdChain === 'TRC20' ? 'TRC20 Tron address (starts with T)' : '0x... wallet address'}
                  className="wc-input" style={{ padding: '12px 14px', fontSize: '13px', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <InfoBox type="warn">
                ⚠️ Verify your wallet address carefully. On-chain withdrawals <strong>cannot be reversed</strong> once processed.
              </InfoBox>

              <button
                className="wc-btn"
                onClick={handleChainWithdrawSubmit}
                disabled={!chainWdAmount || chainWdAmtNum < minWd || chainWdAmtNum > available || !chainWdAddress.trim()}
              >
                Review Withdrawal <i className="ti ti-arrow-right" style={{ marginLeft: '4px' }} />
              </button>
            </div>
          )}

          {chainWdStep === 2 && (
            <div className="wc-panel" style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '580px', margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <BackBtn onClick={() => setChainWdStep(1)} />
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>Confirm Withdrawal</div>
              </div>

              <div style={{ background: '#0B0E1A', borderRadius: '14px', padding: '20px', border: '1px solid #1E2640' }}>
                <div style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>Withdrawal Summary</div>
                <FeePill label="Network" value={CHAIN_CONFIGS[chainWdChain]?.label} color="#F5A623" />
                <Divider />
                <FeePill label="Gross Amount" value={`$${fmt(chainWdAmtNum)} USDT`} color="#fff" />
                <Divider />
                <FeePill label={`Platform Fee (${chainWdFeePercent}%)`} value={`-$${fmt(chainWdFee)} USDT`} color="#FF4D4D" />
                <Divider />
                <FeePill label="You Will Receive" value={`$${fmt(chainWdNet)} USDT`} color="#00C896" />
                <Divider />
                <FeePill label="Destination Address" value={chainWdAddress.length > 24 ? `${chainWdAddress.slice(0,12)}...${chainWdAddress.slice(-6)}` : chainWdAddress} color="#8A9BB8" />
              </div>

              <InfoBox type="warn">
                ⚠️ Confirming will deduct <strong>${fmt(chainWdAmtNum)} USDT</strong> from your wallet. You will receive <strong>${fmt(chainWdNet)} USDT</strong> at the address above via <strong>{CHAIN_CONFIGS[chainWdChain]?.label}</strong> within 1 hour.
              </InfoBox>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="wc-btn-outline" onClick={() => setChainWdStep(1)} style={{ flex: 1 }}>Back</button>
                <button className="wc-btn" onClick={handleChainWithdrawConfirm} disabled={chainWdLoading} style={{ flex: 2 }}>
                  {chainWdLoading ? '⏳ Processing...' : 'Confirm & Submit'}
                </button>
              </div>
            </div>
          )}

          {chainWdStep === 3 && (
            <SuccessScreen
              title="Withdrawal Queued ✓"
              subtitle="On-chain processing started"
              rows={[
                ['Network', CHAIN_CONFIGS[chainWdChain]?.label || chainWdChain],
                ['Amount Requested', `$${fmt(chainWdAmtNum)} USDT`, '#fff'],
                ['Platform Fee', `-$${fmt(chainWdFee)} USDT`, '#FF4D4D'],
                ['You Will Receive', `$${fmt(chainWdNet)} USDT`, '#00C896'],
                ['Destination', `${chainWdAddress.slice(0,14)}...`, '#F5A623'],
                ['ETA', '~ 30–60 minutes', '#8A9BB8'],
              ]}
              note={`⚡ Your withdrawal of $${fmt(chainWdNet)} USDT will be sent to your wallet address on the ${CHAIN_CONFIGS[chainWdChain]?.label} network. Platform fee of $${fmt(chainWdFee)} goes to EthioSwap treasury.`}
              onDone={() => resetTab('balance')}
              doneLabel="View Asset Overview"
            />
          )}
        </div>
      )}

      {/* Exchange withdraw tab removed — on-chain only */}
      {false && tab === 'withdraw' && (
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
                <div className="wc-methods-container">
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
