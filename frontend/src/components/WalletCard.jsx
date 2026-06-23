import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getNetworkAddress } from '../utils/crypto.js';
import { supabase } from '../lib/supabase';
import Logo from './Logo.jsx';
import BrandedReceipt from './BrandedReceipt.jsx';

const fmt = (n, d = 2) => (+(n ?? 0)).toFixed(d);
const fmtEtb = (n) => Math.round(n ?? 0).toLocaleString();

const NETWORKS = [
  { id: 'aptos', label: 'Aptos',  coin: 'USDT', color: '#4EEAA6', chainFee: 0.1,  icon: '🟣', addrPlaceholder: '0x... Aptos address', warning: 'Send only USDT on Aptos network. Wrong network may result in permanent loss.' },
  { id: 'bep20', label: 'BSC',    coin: 'USDT', color: '#F0B90B', chainFee: 0.5,  icon: '🟡', addrPlaceholder: '0x... BSC address',      warning: 'Send only USDT on BNB Smart Chain (BEP-20). ERC-20 tokens will be lost.' },
  { id: 'trc20', label: 'TRC-20', coin: 'USDT', color: '#E83564', chainFee: 1.0,  icon: '🔴', addrPlaceholder: 'T... TRON address',         warning: 'Send only USDT on TRC-20 network. Minimum deposit: $1.' },
  { id: 'erc20', label: 'ERC-20', coin: 'USDT', color: '#627EEA', chainFee: 3.5,  icon: '🔵', addrPlaceholder: '0x... Ethereum address',    warning: 'ERC-20 fees are higher. Send only USDT on Ethereum network.' },
];

const FeePill = ({ label, value, color = '#F5A623' }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
    <span style={{ fontSize: '12px', color: '#8A9BB8' }}>{label}</span>
    <span style={{ fontSize: '13px', fontWeight: 600, color, fontFamily: 'var(--font-mono)' }}>{value}</span>
  </div>
);

const StepIndicator = ({ current, total }) => (
  <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
    {Array.from({ length: total }, (_, i) => (
      <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i < current ? '#F5A623' : 'rgba(255,255,255,0.08)', transition: 'background 0.3s ease' }} />
    ))}
  </div>
);

const NetworkCard = ({ network, selected, onSelect, compact }) => {
  const isActive = selected === network.id;
  return (
    <button
      type="button"
      onClick={() => onSelect(network.id)}
      style={{
        padding: compact ? '12px 14px' : '16px',
        borderRadius: '14px',
        border: `1.5px solid ${isActive ? network.color : '#1E2640'}`,
        background: isActive ? `${network.color}11` : '#141827',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        transition: 'all 0.2s ease',
        flex: 1,
        minWidth: '120px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '18px' }}>{network.icon}</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: isActive ? '#fff' : '#8A9BB8' }}>{network.label}</span>
      </div>
      <div style={{ fontSize: '11px', color: '#8A9BB8' }}>Chain fee: <span style={{ color: '#F5A623', fontWeight: 600 }}>${network.chainFee}</span></div>
    </button>
  );
};

const StatCard = ({ icon, label, value, sub, color = '#F5A623' }) => (
  <div style={{
    background: 'rgba(20, 24, 39, 0.6)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(30, 38, 64, 0.8)',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.25s ease',
    flex: 1,
    minWidth: '140px'
  }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}66`; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 30px ${color}15`; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(30, 38, 64, 0.8)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
          {icon}
        </div>
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#8A9BB8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      </div>
    </div>
    <div>
      <div style={{ fontSize: '24px', fontWeight: 700, color: color, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: '#8A9BB8', marginTop: '4px', fontWeight: 400 }}>{sub}</div>}
    </div>
  </div>
);

const ChoiceSelector = ({ title, desc, options, onSelect }) => (
  <div style={{ background: '#141827', borderRadius: '20px', border: '1px solid #1E2640', padding: '24px', textAlign: 'center' }}>
    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>{title}</h3>
    <p style={{ fontSize: '13px', color: '#8A9BB8', marginBottom: '20px' }}>{desc || 'Choose how you want to proceed'}</p>
    <div style={{ display: 'flex', gap: '12px' }}>
      {options.map(opt => (
        <button key={opt.id} onClick={() => onSelect(opt.id)} style={{
          flex: 1, padding: '24px 16px', borderRadius: '14px', border: '1px solid #1E2640',
          background: '#1A1F32', cursor: 'pointer', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '12px', transition: 'all 0.2s ease',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,166,35,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E2640'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245,166,35,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            {opt.icon}
          </div>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{opt.label}</span>
          <span style={{ fontSize: '11px', color: '#8A9BB8', lineHeight: 1.3 }}>{opt.desc}</span>
        </button>
      ))}
    </div>
  </div>
);

// Helper to compress and convert File/Blob to compressed base64 JPEG
const compressImage = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 480;
      const MAX_HEIGHT = 480;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Compress to JPEG with 0.4 quality to stay well below Convex's 1MB limit
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.4);
      resolve(compressedDataUrl);
    };
    img.onerror = () => {
      reject(new Error("Failed to load image for compression"));
    };
    img.src = event.target.result;
  };
  reader.onerror = (err) => {
    reject(new Error("Failed to read file"));
  };
});

const WalletCard = ({ initialTab = 'balance' }) => {
  const {
    user, wallet, systemSettings,
    withdrawETH, myDepositReqs, myWithdrawalReqs,
    createDepositRequest, setError, setSuccess,
    transferToUser,
    trades,
  } = useAuth();

  const [tab, setTab] = useState(initialTab);
  const [copied, setCopied] = useState(false);
  const [qrNet, setQrNet] = useState('trc20');

  // User verification send states
  const [sendStep, setSendStep] = useState(1);
  const [sendQuery, setSendQuery] = useState('');
  const [foundRecipient, setFoundRecipient] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');

  useEffect(() => {
    setTab(initialTab);
    // Reset wizard states when tab changes
    setSendType(initialTab === 'send' ? 'user' : null);
    setReceiveType(null);
    setWdType(null);
    setSendStep(1);
    setSendQuery('');
    setFoundRecipient(null);
    setLookupError('');
    setSendAmt('');
    setDepStep(1);
    setBbStep(1);
    setWdStep(1);
  }, [initialTab]);

  // Deposit/Receive Chain flow
  const [depStep, setDepStep] = useState(1);
  const [depNet, setDepNet] = useState('trc20');
  const [depAmt, setDepAmt] = useState('');
  const [depTxId, setDepTxId] = useState('');
  const [depLoading, setDepLoading] = useState(false);
  const [depTimeRemaining, setDepTimeRemaining] = useState('5:00');

  // Binance / Bybit Deposit flow states
  const [bbStep, setBbStep] = useState(1);
  const [bbAmount, setBbAmount] = useState('');
  const [bbMethod, setBbMethod] = useState('binance'); // 'binance' | 'bybit'
  const [bbScreenshot, setBbScreenshot] = useState(null);
  const [bbScreenshotPreview, setBbScreenshotPreview] = useState(null);
  const [bbTxRef, setBbTxRef] = useState('');
  const [bbLoading, setBbLoading] = useState(false);
  const [bbSenderEmail, setBbSenderEmail] = useState('');
  const [bbSenderUsername, setBbSenderUsername] = useState('');

  // Withdrawal/Send Chain flow
  const [wdStep, setWdStep] = useState(1);
  const [wdNet, setWdNet] = useState('trc20');
  const [wdAmt, setWdAmt] = useState('');
  const [wdAddr, setWdAddr] = useState('');
  const [wdLoading, setWdLoading] = useState(false);

  // Send & Receive Choice States
  const [sendType, setSendType] = useState('user'); // 'user' | 'address' | null
  const [sendUsername, setSendUsername] = useState('');
  const [sendAmt, setSendAmt] = useState('');
  const [sendLoading, setSendLoading] = useState(false);

  const [receiveType, setReceiveType] = useState(null); // 'user' | 'chain' | null
  const [wdType, setWdType] = useState(null); // 'user' | 'address' | null
  const [selectedWalletTx, setSelectedWalletTx] = useState(null);

  // Countdown timer for Deposit Pending State
  useEffect(() => {
    if (depStep !== 2) return;
    let sec = 300;
    setDepTimeRemaining('5:00');
    const interval = setInterval(() => {
      sec--;
      if (sec <= 0) {
        setDepTimeRemaining('Expired');
        clearInterval(interval);
      } else {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        setDepTimeRemaining(`${m}:${s < 10 ? '0' : ''}${s}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [depStep]);

  const platformFeePercent = systemSettings?.deposit_fee_percent ?? 5.0;

  const balance = wallet?.eth_balance ?? 0;
  const locked = wallet?.eth_locked ?? 0;
  const available = Math.max(0, balance - locked);
  const address = wallet?.eth_address ?? '';
  const qrAddress = useMemo(() => getNetworkAddress(qrNet, wallet?.eth_address, systemSettings), [qrNet, wallet?.eth_address, systemSettings]);
  const depAddress = useMemo(() => getNetworkAddress(depNet, wallet?.eth_address, systemSettings), [depNet, wallet?.eth_address, systemSettings]);
  const numId = wallet?.numeric_id;
  const rate = systemSettings?.etb_rate_per_dollar ?? 190;
  const minDep = systemSettings?.min_deposit_usd ?? 1;
  const minWd = systemSettings?.min_withdrawal_usd ?? 10;

  const completedTrades = useMemo(() => (trades || []).filter(t => t.status === 'completed'), [trades]);
  const pendingTrades = useMemo(() => (trades || []).filter(t => t.status === 'pending' || t.status === 'active'), [trades]);
  const totalVolume = useMemo(() => completedTrades.reduce((sum, t) => sum + (t.amount_eth || 0), 0), [completedTrades]);
  const totalDeposited = useMemo(() =>
    (myDepositReqs || []).filter(r => r.status === 'approved').reduce((s, r) => s + (r.amount_usd || 0), 0),
    [myDepositReqs]
  );

  const depNetData = NETWORKS.find(n => n.id === depNet);
  const wdNetData = NETWORKS.find(n => n.id === wdNet);

  const depAmtNum = parseFloat(depAmt) || 0;
  const depPlatFee = depAmtNum * platformFeePercent / 100;
  const depChainFee = depNetData?.chainFee ?? 0;
  const depTotalCost = depAmtNum + depChainFee;
  const depYouReceive = Math.max(0, depAmtNum - depPlatFee);

  const wdAmtNum = parseFloat(wdAmt) || 0;
  const wdPlatFee = wdAmtNum * platformFeePercent / 100;
  const wdChainFee = wdNetData?.chainFee ?? 0;
  const wdYouReceive = Math.max(0, wdAmtNum - wdPlatFee - wdChainFee);

  const history = useMemo(() => {
    const deps = (myDepositReqs || []).map(r => ({ ...r, _kind: 'dep' }));
    const wds = (myWithdrawalReqs || []).map(r => ({ ...r, _kind: 'wd' }));
    return [...deps, ...wds].sort((a, b) =>
      new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0)
    ).slice(0, 20);
  }, [myDepositReqs, myWithdrawalReqs]);

  const handleCopy = useCallback((text) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  }, [setSuccess]);

  const handleDepositSubmit = async () => {
    if (depAmtNum < minDep) { setError(`Minimum deposit is $${minDep}`); return; }
    if (!depTxId.trim()) { setError('Please enter your Transaction ID / Reference'); return; }
    setDepLoading(true);
    setSuccess('Processing deposit...');
    try {
      const res = await createDepositRequest(depAmtNum, depNet.toUpperCase(), depTxId.trim(), '', undefined);
      if (res && res.success) {
        setDepStep(4); // Success Receipt screen!
        setSuccess('Deposit request submitted successfully!');
      }
    } catch (err) { setError(err.message); }
    finally { setDepLoading(false); }
  };

  const handleBinanceBybitSubmit = async () => {
    const bbAmtNum = parseFloat(bbAmount) || 0;
    if (bbAmtNum < minDep) { setError(`Minimum deposit is $${minDep}`); return; }
    if (!bbSenderEmail.trim()) { setError('Please enter your Binance/Bybit email'); return; }
    if (!bbSenderUsername.trim()) { setError('Please enter your Binance/Bybit username'); return; }
    if (!bbScreenshot) { setError('Please upload a screenshot proof of payment'); return; }
    
    setBbLoading(true);
    setSuccess('Submitting deposit request...');
    try {
      const methodLabel = bbMethod === 'binance' ? 'BINANCE' : 'BYBIT';
      const refPayload = JSON.stringify({
        email: bbSenderEmail.trim(),
        username: bbSenderUsername.trim(),
        ref: bbTxRef.trim()
      });
      const res = await createDepositRequest(
        bbAmtNum,
        methodLabel,
        refPayload,
        bbScreenshot,
        undefined
      );
      if (res && res.success) {
        setBbStep(2); // Success Receipt screen!
        setSuccess('Deposit request submitted successfully!');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBbLoading(false);
    }
  };

  const handleWithdrawSubmit = async () => {
    if (wdAmtNum < minWd) { setError(`Minimum withdrawal is $${minWd}`); return; }
    if (wdAmtNum > available) { setError(`Max available: $${fmt(available)}`); return; }
    if (!wdAddr.trim()) { setError('Enter a wallet address'); return; }
    
    setWdStep(4); // Show "Processing Withdrawal" pending state
    setWdLoading(true);
    try {
      const res = await withdrawETH(wdAmtNum, wdAddr, '', wdNet.toUpperCase());
      if (res && res.success) {
        // Wait 2.5 seconds to simulate processing progress
        setTimeout(() => {
          setWdStep(5); // Success Receipt screen!
          setWdLoading(false);
          setSuccess('Withdrawal sent successfully!');
        }, 2500);
      } else {
        setWdStep(3);
        setWdLoading(false);
      }
    } catch (err) {
      setError(err.message);
      setWdStep(3);
      setWdLoading(false);
    }
  };

  const handleUserLookup = async () => {
    if (!sendQuery.trim()) return;
    setLookupLoading(true);
    setLookupError('');
    setFoundRecipient(null);
    try {
      let queryVal = sendQuery.trim();
      if (queryVal.startsWith('@')) {
        queryVal = queryVal.substring(1);
      }
      if (queryVal.toLowerCase() === user.username.toLowerCase() || queryVal.toLowerCase() === user.email.toLowerCase()) {
        throw new Error("You cannot send funds to yourself.");
      }

      const { data, error } = await supabase.rpc('get_user_by_username_or_email', {
        search_query: queryVal
      });

      if (error) {
        throw new Error(error.message);
      }

      const recipient = data && data.length > 0 ? data[0] : null;
      if (!recipient) {
        throw new Error("Recipient not found. Please verify the username or email.");
      }
      setFoundRecipient(recipient);
    } catch (err) {
      setLookupError(err.message);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleInternalSendSubmit = async () => {
    if (!foundRecipient) { setError('Please verify the recipient first'); return; }
    const amt = parseFloat(sendAmt) || 0;
    if (amt <= 0) { setError('Enter a valid amount'); return; }
    if (amt > available) { setError(`Max available: $${fmt(available)}`); return; }
    
    setSendLoading(true);
    setSuccess('Processing transfer...');
    try {
      await transferToUser(foundRecipient.username, amt);
      setSendQuery('');
      setFoundRecipient(null);
      setSendAmt('');
      setSendStep(1);
      setSendType(null);
      setWdType(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSendLoading(false);
    }
  };

  if (!wallet) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}.sk{background:linear-gradient(90deg,#1a1d28 25%,#22263a 50%,#1a1d28 75%);background-size:400px 100%;animation:shimmer 1.5s ease-in-out infinite;border-radius:24px}`}</style>
      <div className="sk" style={{ height: 220 }} />
      <div className="sk" style={{ height: 60, borderRadius: 16 }} />
      <div className="sk" style={{ height: 160, borderRadius: 24 }} />
    </div>
  );

  const TABS = [
    { id: 'balance',  icon: 'ti ti-wallet',      label: 'Balance' },
    { id: 'send',     icon: 'ti ti-send',        label: 'Send' },
    { id: 'receive',  icon: 'ti ti-arrow-down',   label: 'Receive' },
    { id: 'withdraw', icon: 'ti ti-arrow-up',     label: 'Withdraw' },
  ];

  const handleWdTypeSelect = (type) => {
    if (type === 'user') {
      setTab('send');
      setSendType('user');
    } else {
      setWdType('address');
      setWdStep(1);
    }
  };



  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <style>{`
        @keyframes shimmer { 0% { background-position: -400px 0 } 100% { background-position: 400px 0 } }
        .sk { background: linear-gradient(90deg, #1a1d28 25%, #22263a 50%, #1a1d28 75%); background-size: 400px 100%; animation: shimmer 1.5s ease-in-out infinite; border-radius: 20px; }
        
        .w-grid-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        @media (min-width: 992px) {
          .w-grid-container {
            display: grid;
            grid-template-columns: 380px 1fr;
            gap: 24px;
            align-items: start;
          }
          .w-mobile-only-qr {
            display: none !important;
          }
          .w-desktop-only-qr {
            display: block !important;
          }
        }
        @media (max-width: 991px) {
          .w-mobile-only-qr {
            display: block !important;
          }
          .w-desktop-only-qr {
            display: none !important;
          }
        }

        .w-hero-card {
          position: relative;
          border-radius: 24px;
          padding: 28px;
          background: linear-gradient(135deg, #1b203c 0%, #0d1021 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 20px 45px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.05);
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .w-hero-card:hover {
          border-color: rgba(245, 166, 35, 0.25);
          box-shadow: 0 24px 50px rgba(0, 0, 0, 0.6), 0 0 15px rgba(245, 166, 35, 0.05), inset 0 1px 1px rgba(255, 255, 255, 0.08);
          transform: translateY(-2px);
        }
        .w-stat-sub-card {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 16px;
          padding: 14px 16px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .w-stat-sub-card:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(0, 0, 0, 0.2);
        }
        .w-tab-btn {
          flex: 1;
          padding: 14px 4px;
          border-radius: 12px;
          border: 1px solid transparent;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          background: transparent;
          color: #8A9BB8;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .w-tab-btn:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.03);
        }
        .w-tab-btn.active {
          background: rgba(245, 166, 35, 0.08);
          color: #F5A623;
          border: 1px solid rgba(245, 166, 35, 0.25);
          box-shadow: 0 4px 12px rgba(245, 166, 35, 0.08);
        }
        .w-card {
          background: rgba(20, 24, 39, 0.7);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 24px;
          border: 1px solid rgba(30, 38, 64, 0.8);
          padding: 26px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .w-card:hover {
          border-color: rgba(245, 166, 35, 0.18);
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.4), 0 0 10px rgba(245, 166, 35, 0.03);
        }
        .w-input {
          width: 100%;
          box-sizing: border-box;
          background: rgba(9, 11, 21, 0.75);
          border: 1.5px solid rgba(30, 38, 64, 0.9);
          border-radius: 12px;
          color: #fff;
          outline: none;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .w-input:focus {
          border-color: #F5A623;
          background: rgba(245, 166, 35, 0.03);
          box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.15);
        }
        .w-input::placeholder {
          color: #4e5567;
        }
        .w-btn-primary {
          width: 100%;
          padding: 15px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #F5A623 0%, #D88E10 100%);
          color: #0A0C12;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 16px rgba(245, 166, 35, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .w-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          filter: brightness(1.08);
          box-shadow: 0 6px 20px rgba(245, 166, 35, 0.35);
        }
        .w-btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }
        .w-btn-primary:disabled {
          background: rgba(30, 38, 64, 0.6) !important;
          color: #5A6275 !important;
          cursor: not-allowed;
          box-shadow: none;
          opacity: 0.6;
        }
        .w-btn-secondary {
          flex: 1;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid rgba(30, 38, 64, 0.8);
          background: transparent;
          color: #8A9BB8;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .w-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.04);
          color: #fff;
          border-color: rgba(255, 255, 255, 0.12);
          transform: translateY(-1px);
        }
        .w-btn-secondary:active {
          transform: translateY(0);
        }
        .w-upload-zone {
          background: rgba(9, 11, 21, 0.7);
          border: 2px dashed rgba(30, 38, 64, 0.9);
          border-radius: 14px;
          padding: 30px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .w-upload-zone:hover {
          border-color: #F5A623;
          background: rgba(245, 166, 35, 0.02);
        }
        .w-network-card {
          padding: 14px 16px;
          border-radius: 14px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 6px;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          flex: 1;
          min-width: 120px;
          text-align: left;
          background: rgba(20, 24, 39, 0.6);
          border: 1.5px solid rgba(30, 38, 64, 0.8);
        }
        .w-network-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.15);
          box-shadow: 0 6px 15px rgba(0, 0, 0, 0.2);
        }
        .w-choice-btn {
          flex: 1;
          padding: 26px 20px;
          border-radius: 18px;
          border: 1px solid rgba(30, 38, 64, 0.8);
          background: rgba(26, 31, 50, 0.6);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .w-choice-btn:hover {
          border-color: rgba(245, 166, 35, 0.3);
          transform: translateY(-4px);
          background: rgba(32, 38, 61, 0.8);
        }
        .w-choice-btn:active {
          transform: translateY(-1px);
        }
        .w-grid-container {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        @media (min-width: 900px) {
          .w-grid-container {
            grid-template-columns: 380px 1fr;
          }
          .w-desktop-only-qr { display: block; }
          .w-mobile-only-qr { display: none; }
        }
        @media (max-width: 899px) {
          .w-desktop-only-qr { display: none; }
          .w-mobile-only-qr { display: block; }
        }
      `}</style>

      {/* 1. HERO CARD */}
      <div className="w-hero-card" style={{ marginBottom: '20px' }}>
            <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(245, 166, 35, 0.12)', filter: 'blur(50px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-80px', left: '-80px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(0, 200, 150, 0.04)', filter: 'blur(50px)', pointerEvents: 'none' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: '#F5A623', textTransform: 'uppercase', marginBottom: '4px' }}>EthioSwap Wallet</div>
                {numId && <div style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 600 }}>Account #{numId}</div>}
              </div>
              <div style={{ background: 'rgba(245, 166, 35, 0.08)', border: '1px solid rgba(245, 166, 35, 0.25)', borderRadius: '8px', padding: '5px 12px', fontSize: '11px', fontWeight: 700, color: '#F5A623', textTransform: 'uppercase', letterSpacing: '0.05em' }}>USDT</div>
            </div>
            
            <div style={{ marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', color: '#8A9BB8', fontWeight: 600 }}>Total Balance</span>
            </div>
            <div style={{ fontSize: '42px', fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '-0.04em', color: '#F5A623', lineHeight: 1.1, marginBottom: '4px' }}>
              <span>${fmt(balance)}</span>
              <span style={{ fontSize: '16px', color: '#8A9BB8', marginLeft: '8px', fontFamily: 'var(--font-body)', fontWeight: 500 }}>USD</span>
            </div>
            <div style={{ fontSize: '14px', color: '#00C896', fontWeight: 600, marginBottom: '24px', fontFamily: 'var(--font-mono)' }}>
              ≈ {fmtEtb(balance * rate)} ETB
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { label: 'Available', usd: available, etb: available * rate, color: '#00C896' },
                { label: 'In Escrow', usd: locked, etb: locked * rate, color: '#F5A623' },
              ].map(c => (
                <div key={c.label} className="w-stat-sub-card">
                  <div style={{ fontSize: '9px', color: '#8A9BB8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', fontWeight: 600 }}>{c.label}</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: c.color, fontFamily: 'var(--font-mono)' }}>${fmt(c.usd)}</div>
                  <div style={{ fontSize: '10px', color: '#8A9BB8', marginTop: '2px' }}>≈ {fmtEtb(c.etb)} ETB</div>
                </div>
              ))}
            </div>
          </div>

      {/* 2. TABS BAR + ACTIVE CONTENT PANEL */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
        
        {/* TABS BAR */}
          <div style={{ display: 'flex', background: 'rgba(20, 24, 39, 0.7)', border: '1px solid rgba(30, 38, 64, 0.8)', borderRadius: '16px', padding: '5px', gap: '5px' }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  setSendType(t.id === 'send' ? 'user' : null);
                  setReceiveType(null);
                  setWdType(null);
                  setSendStep(1);
                  setSendQuery('');
                  setFoundRecipient(null);
                  setLookupError('');
                  setSendAmt('');
                }}
                className={`w-tab-btn ${tab === t.id ? 'active' : ''}`}
              >
                <i className={t.icon} style={{ fontSize: '20px' }}></i>
                <span style={{ fontSize: '10px', fontWeight: 700 }}>{t.label}</span>
              </button>
            ))}
          </div>

          {/* ACTIVE CONTENT VIEW */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* BALANCE TAB CONTENT */}
            {tab === 'balance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {history.length > 0 ? (
                  <div className="w-card" style={{ padding: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#8A9BB8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>
                      <i className="ti ti-clock" style={{ marginRight: '6px' }}></i>Recent Transactions
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {history.map((item, i) => {
                        const isDep = item._kind === 'dep';
                        const amt = item.amount_usd ?? item.amount_usd_legacy ?? 0;
                        const date = item.created_at ?? '';
                        const isP2P = item.wallet_type === 'P2P';
                        const isInternal = item.wallet_type === 'INTERNAL';
                        const txColor = isDep ? '#F5A623' : '#FF4D4D';
                        const txBg = isDep ? 'rgba(245, 166, 35, 0.1)' : 'rgba(255, 77, 77, 0.1)';
                        const txIcon = isP2P ? 'ti ti-arrows-exchange' : isDep ? 'ti ti-arrow-down' : 'ti ti-arrow-up';
                        const txIconColor = isP2P ? '#00C896' : txColor;
                        const txBgColor = isP2P ? 'rgba(0,200,150,0.1)' : txBg;

                        const txLabel = (() => {
                          if (isP2P) return isDep ? '🤝 P2P Trade Received' : '🤝 P2P Trade Sent';
                          if (isInternal) return isDep ? '↙ Received (Internal)' : '↗ Sent (Internal)';
                          return isDep ? 'Deposit' : 'Withdrawal';
                        })();

                        const txSubLabel = (() => {
                          if (isDep) {
                            if (item.sender_reference && item.sender_reference.startsWith('{')) {
                              try {
                                const parsed = JSON.parse(item.sender_reference);
                                return `From ${parsed.email || parsed.username || 'Binance/Bybit'}`;
                              } catch(e) {}
                            }
                            return `From ${item.sender_reference || 'Chain'}`;
                          }
                          return `To ${item.address || 'Chain'}`;
                        })();

                        return (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)', transition: 'all 0.2s ease' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: txBgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                                <i className={txIcon} style={{ color: txIconColor }} />
                              </div>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                                  {txLabel}
                                </div>
                                <div style={{ fontSize: '10px', color: '#8A9BB8', marginTop: '1px' }}>
                                  {txSubLabel} · {date ? new Date(date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: isDep ? (isP2P ? '#00C896' : '#F5A623') : '#FF4D4D', fontFamily: 'var(--font-mono)' }}>{isDep ? '+' : '-'}${fmt(amt)}</div>
                                <span style={{
                                  fontSize: '8.5px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                                  textTransform: 'uppercase', display: 'inline-block', marginTop: '2px',
                                  background: item.status === 'approved' ? 'rgba(0,200,150,0.1)' : item.status === 'pending' ? 'rgba(138,155,184,0.1)' : 'rgba(255,77,77,0.1)',
                                  color: item.status === 'approved' ? '#00C896' : item.status === 'pending' ? '#8A9BB8' : '#FF4D4D',
                                }}>{item.status === 'approved' ? 'completed' : item.status}</span>
                              </div>
                              <button
                                onClick={() => setSelectedWalletTx({ ...item, isDep, amt })}
                                style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.18)', borderRadius: '8px', color: '#F5A623', cursor: 'pointer', padding: '6px 10px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.18s ease', whiteSpace: 'nowrap', flexShrink: 0 }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,166,35,0.15)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(245,166,35,0.08)'}
                              >
                                <i className="ti ti-file-text" style={{ fontSize: '12px' }} /> View
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="w-card" style={{ padding: '32px', textAlign: 'center' }}>
                    <div style={{ fontSize: '36px', marginBottom: '10px' }}>
                      <i className="ti ti-inbox" style={{ fontSize: '36px', color: '#8A9BB8' }}></i>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#8A9BB8' }}>No transactions yet</div>
                    <div style={{ fontSize: '12px', color: '#8A9BB8', marginTop: '4px' }}>Your deposit & withdrawal history will appear here</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      {/* ── Wallet Transaction Receipt Modal ── */}
      {selectedWalletTx && (() => {
        const item = selectedWalletTx;
        const isDep = item.isDep;
        const amt = item.amt;
        const isInternal = item.wallet_type === 'INTERNAL';
        const fromStr = isDep ? (
          (() => {
            if (item.sender_reference && item.sender_reference.startsWith('{')) {
              try {
                const parsed = JSON.parse(item.sender_reference);
                return parsed.email || parsed.username || 'Binance/Bybit';
              } catch(e) {}
            }
            return item.sender_reference || item.wallet_type || 'External Chain';
          })()
        ) : (user?.full_name || user?.username || 'My Wallet');
        const toStr = isDep ? (user?.full_name || user?.username || 'My Wallet') : (item.address || item.destination_address || item.wallet_type || 'External');
        const statusLabel = item.status || 'pending';

        let normalizedStatus = 'PENDING';
        if (statusLabel === 'completed' || statusLabel === 'approved' || statusLabel === 'success') {
          normalizedStatus = 'COMPLETED';
        } else if (statusLabel === 'failed' || statusLabel === 'cancelled' || statusLabel === 'rejected') {
          normalizedStatus = 'CANCELLED';
        }

        return (
          <div 
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(10px)', padding: '20px', overflowY: 'auto' }} 
            onClick={() => setSelectedWalletTx(null)}
          >
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '520px' }}>
              <BrandedReceipt
                txType={isDep ? 'DEPOSIT' : 'WITHDRAWAL'}
                status={normalizedStatus}
                dateTime={item.created_at}
                refId={item.id}
                fromName={fromStr}
                toName={toStr}
                amountSent={`$${fmt(amt)} USDT`}
                amountReceived={`$${fmt(isDep ? (isInternal ? amt : amt * (1 - platformFeePercent / 100)) : (isInternal ? amt : amt * (1 + platformFeePercent / 100)))} USDT`}
                fee={isInternal ? '0.00 USDT' : `$${fmt(amt * platformFeePercent / 100)} USDT (${platformFeePercent}%)`}
                paymentMethod={isInternal ? 'EthioSwap Internal Transfer' : 'External Wallet Transfer'}
                network={isInternal ? 'Internal Node' : (item.network || 'Ethereum (ERC-20)')}
                txHash={item.tx_hash || item.transaction_hash || ''}
                onClose={() => setSelectedWalletTx(null)}
              />
            </div>
          </div>
        );
      })()}

      {/* SEND TAB */}
      {tab === 'send' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="w-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Send to User</div>
            </div>

            {sendStep === 1 ? (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 600, display: 'block', marginBottom: '8px' }}>RECIPIENT USERNAME OR EMAIL</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={sendQuery}
                      onChange={e => {
                        setSendQuery(e.target.value);
                        if (foundRecipient) setFoundRecipient(null);
                        if (lookupError) setLookupError('');
                      }}
                      placeholder="Enter username or email address"
                      className="w-input"
                      style={{ padding: '13px 16px' }}
                    />
                  </div>
                </div>

                {lookupError && (
                  <div style={{ fontSize: '13px', color: '#EF4444', fontWeight: 600, padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <i className="ti ti-alert-triangle" style={{ fontSize: '15px' }}></i>
                    <span>{lookupError}</span>
                  </div>
                )}

                {foundRecipient && (
                  <div style={{ background: '#0B0E1A', border: '1px solid #1E2640', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                    {foundRecipient.profile_pic ? (
                      <img src={foundRecipient.profile_pic} alt="" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #F5A623' }} />
                    ) : (
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #F5A623, #FFE082)', color: '#0A0C12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '18px' }}>
                        {(foundRecipient.username || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>@{foundRecipient.username}</div>
                      {foundRecipient.full_name && <div style={{ fontSize: '13px', color: '#8A9BB8' }}>{foundRecipient.full_name}</div>}
                      <div style={{ fontSize: '12px', color: '#8A9BB8', fontFamily: 'var(--font-mono)' }}>{foundRecipient.email}</div>
                    </div>
                  </div>
                )}

                {!foundRecipient ? (
                  <button
                    onClick={handleUserLookup}
                    disabled={lookupLoading || !sendQuery.trim()}
                    className="w-btn-primary"
                  >
                    {lookupLoading ? '⏳ Searching...' : '🔍 Find Recipient'}
                  </button>
                ) : (
                  <button
                    onClick={() => setSendStep(2)}
                    className="w-btn-primary"
                  >
                    Continue <i className="ti ti-arrow-right" style={{ marginLeft: '6px' }}></i>
                  </button>
                )}
              </div>
            ) : (
              <div>
                {/* BACK TO RECIPIENT */}
                <button
                  type="button"
                  onClick={() => setSendStep(1)}
                  className="w-btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', padding: '8px 12px' }}
                >
                  <i className="ti ti-arrow-left"></i> Change Recipient
                </button>

                {/* SHOW RECIPIENT BRIEF */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  {foundRecipient.profile_pic ? (
                    <img src={foundRecipient.profile_pic} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #F5A623, #FFE082)', color: '#0A0C12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px' }}>
                      {(foundRecipient.username || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Sending to: <span style={{ color: '#F5A623' }}>@{foundRecipient.username}</span></div>
                    <div style={{ fontSize: '11px', color: '#8A9BB8' }}>{foundRecipient.email}</div>
                  </div>
                </div>

                <div style={{ position: 'relative', marginBottom: '20px' }}>
                  <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 600, display: 'block', marginBottom: '8px' }}>AMOUNT (USD)</label>
                  <span style={{ position: 'absolute', left: '16px', top: '42px', transform: 'translateY(-50%)', fontSize: '18px', fontWeight: 700, color: '#8A9BB8' }}>$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={sendAmt}
                    onChange={e => setSendAmt(e.target.value)}
                    placeholder="0.00"
                    className="w-input"
                    style={{ padding: '16px 16px 16px 36px', fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                  />
                  <div style={{ marginTop: '6px', fontSize: '12px', color: '#8A9BB8', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Available balance: <strong>${fmt(available)}</strong></span>
                    {available > 0 && (
                      <button
                        type="button"
                        onClick={() => setSendAmt(available.toFixed(2))}
                        style={{ background: 'none', border: 'none', color: '#F5A623', cursor: 'pointer', fontWeight: 700, fontSize: '12px', padding: 0 }}
                      >
                        Send Max
                      </button>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleInternalSendSubmit}
                  disabled={sendLoading || !sendAmt || parseFloat(sendAmt) <= 0 || parseFloat(sendAmt) > available}
                  className="w-btn-primary"
                >
                  {sendLoading ? '⏳ Processing...' : '✓ Send Instantly'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RECEIVE TAB */}
      {tab === 'receive' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {receiveType === null ? (
            <ChoiceSelector
              title="Receive USDT"
              desc="Select how you want to receive your USDT"
              options={[
                { id: 'user', icon: '👤', label: 'From User', desc: 'Share your username / Account ID for internal transfer' },
                { id: 'binance_bybit', icon: '💳', label: 'Binance / Bybit', desc: 'Deposit via Binance Pay or Bybit transfer' },
                { id: 'chain', icon: '🔗', label: 'From Chain', desc: 'Deposit from an external blockchain network' },
              ]}
              onSelect={setReceiveType}
            />
          ) : receiveType === 'user' ? (
            <div className="w-card" style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <button onClick={() => setReceiveType(null)} className="w-btn-secondary" style={{ padding: '6px 10px', borderRadius: '50px', flex: 'none' }}>
                  <i className="ti ti-arrow-left"></i>
                </button>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Receive from User</div>
              </div>

              <div style={{ background: '#0B0E1A', border: '1px solid #1E2640', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#8A9BB8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>Your Username</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#F5A623', fontFamily: 'var(--font-mono)' }}>@{user?.username}</div>
                </div>
                <div style={{ height: '1px', background: '#1E2640' }} />
                <div>
                  <div style={{ fontSize: '11px', color: '#8A9BB8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>Your Account ID</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>#{numId}</div>
                </div>
              </div>

              <p style={{ fontSize: '12px', color: '#8A9BB8', marginBottom: '20px', lineHeight: 1.5 }}>
                Share your username or Account ID with another EthioSwap user. They can transfer funds instantly to you with zero network fees.
              </p>

              <button onClick={() => handleCopy(`@${user?.username}`)} className="w-btn-primary" style={{ width: '100%' }}>
                {copied ? '✓ Copied Username!' : '📋 Copy Username'}
              </button>
            </div>
          ) : receiveType === 'binance_bybit' ? (
            bbStep === 1 ? (
              <div className="w-card">
                {/* Back Button & Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <button onClick={() => setReceiveType(null)} className="w-btn-secondary" style={{ padding: '6px 10px', borderRadius: '50px', flex: 'none' }}>
                    <i className="ti ti-arrow-left"></i>
                  </button>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Binance / Bybit Deposit</div>
                </div>

                {/* Instructions */}
                <div style={{ background: '#0B0E1A', border: '1px solid #1E2640', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
                  <div style={{ fontSize: '11px', color: '#8A9BB8', textTransform: 'uppercase', fontWeight: 600 }}>1. Transfer Payment</div>
                  <div style={{ fontSize: '13px', color: '#fff', lineHeight: 1.5 }}>
                    Send your USDT deposit using Binance Pay or Bybit Transfer to our designated email account:
                  </div>
                  
                  <div style={{ background: '#141827', border: '1px solid #1E2640', borderRadius: '10px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: '#F5A623', fontWeight: 700 }}>birukf37@gmail.com</span>
                    <button 
                      onClick={() => handleCopy('birukf37@gmail.com')} 
                      style={{ background: 'rgba(245, 166, 35, 0.1)', border: '1px solid rgba(245, 166, 35, 0.2)', color: '#F5A623', fontSize: '11px', fontWeight: 600, padding: '5px 10px', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      📋 Copy
                    </button>
                  </div>

                  <div style={{ background: 'rgba(245, 166, 35, 0.05)', border: '1px solid rgba(245, 166, 35, 0.15)', borderRadius: '10px', padding: '10px 12px', fontSize: '12px', color: '#FFE082', lineHeight: 1.5 }}>
                    💡 <strong>Important Note:</strong> Please remember to add the <strong>5% platform fee</strong> to your transfer. E.g., if you want to receive <strong>$100.00</strong> in your balance, you must send exactly <strong>$105.00</strong> to the email.
                  </div>
                </div>

                {/* Form Input fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 600, display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Select Transfer Method</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {['binance', 'bybit'].map(method => {
                        const isActive = bbMethod === method;
                        return (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setBbMethod(method)}
                            className="w-network-card"
                            style={{
                              padding: '10px',
                              borderColor: isActive ? '#F5A623' : '#1E2640',
                              background: isActive ? 'rgba(245, 166, 35, 0.08)' : '#0B0E1A',
                              color: isActive ? '#fff' : '#8A9BB8',
                            }}
                          >
                            {method === 'binance' ? '🟡 Binance Pay' : '⚫ Bybit Transfer'}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 600, display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Amount Sent (USD)</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '20px', fontWeight: 700, color: '#8A9BB8' }}>$</span>
                      <input
                        type="number" step="0.01" min={minDep}
                        value={bbAmount} onChange={e => setBbAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-input"
                        style={{ padding: '14px 16px 14px 36px', fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                      />
                    </div>
                    {parseFloat(bbAmount) > 0 && (() => {
                      const amtVal = parseFloat(bbAmount);
                      const platFee = amtVal * platformFeePercent / 100;
                      const netCred = Math.max(0, amtVal - platFee);
                      return (
                        <div style={{ background: '#0B0E1A', borderRadius: '14px', padding: '14px', border: '1px solid #1E2640', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: '#8A9BB8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                            <i className="ti ti-chart-line" style={{ marginRight: '6px' }}></i>Fee Breakdown
                          </div>
                          <FeePill label="Deposit Amount" value={`$${fmt(amtVal)} USDT`} color="#fff" />
                          <FeePill label={`Platform Fee (${platformFeePercent}%)`} value={`-$${fmt(platFee)} USDT`} color="#FF4D4D" />
                          <FeePill label="Transfer Fee (Binance/Bybit)" value="FREE" color="#00C896" />
                          <div style={{ height: '1px', background: '#1E2640', margin: '2px 0' }} />
                          <FeePill label="💰 You Receive in Wallet" value={`$${fmt(netCred)} USDT`} color="#00C896" />
                          <div style={{ fontSize: '10px', color: '#8A9BB8', textAlign: 'center', marginTop: '2px' }}>≈ {fmtEtb(netCred * rate)} ETB</div>
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 600, display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Your Binance/Bybit Email *</label>
                    <input
                      type="email"
                      value={bbSenderEmail} onChange={e => setBbSenderEmail(e.target.value)}
                      placeholder="Enter the email address you sent from"
                      required
                      className="w-input"
                      style={{ padding: '12px 14px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 600, display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Your Binance/Bybit Username *</label>
                    <input
                      type="text"
                      value={bbSenderUsername} onChange={e => setBbSenderUsername(e.target.value)}
                      placeholder="Enter the account username you sent from"
                      required
                      className="w-input"
                      style={{ padding: '12px 14px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 600, display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Transaction ID / Reference (Optional)</label>
                    <input
                      type="text"
                      value={bbTxRef} onChange={e => setBbTxRef(e.target.value)}
                      placeholder="Enter Binance Pay ID or Bybit TxID"
                      className="w-input"
                      style={{ padding: '12px 14px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 600, display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Upload Screenshot Proof *</label>
                    
                    {bbScreenshotPreview ? (
                      <div style={{ position: 'relative', borderRadius: '12px', border: '1px solid #1E2640', overflow: 'hidden', height: '140px', background: '#0B0E1A' }}>
                        <img src={bbScreenshotPreview} alt="Screenshot Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        <button 
                          type="button" 
                          onClick={() => { setBbScreenshot(null); setBbScreenshotPreview(null); }}
                          style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '6px', color: '#FF4D4D', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }}
                        >
                          ✕ Remove
                        </button>
                      </div>
                    ) : (
                      <label className="w-upload-zone">
                        <span style={{ fontSize: '24px' }}>📁</span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#8A9BB8' }}>Click to Upload Screenshot</span>
                        <span style={{ fontSize: '10px', color: '#4E5567' }}>Supports JPG, PNG (Max 5MB)</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          style={{ display: 'none' }} 
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            try {
                              setBbLoading(true);
                              const compressed = await compressImage(file);
                              setBbScreenshot(compressed);
                              setBbScreenshotPreview(compressed);
                            } catch (err) {
                              setError('Failed to compress screenshot: ' + err.message);
                            } finally {
                              setBbLoading(false);
                            }
                          }} 
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Submit / Cancel Buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    type="button" 
                    onClick={() => setReceiveType(null)} 
                    className="w-btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleBinanceBybitSubmit}
                    disabled={bbLoading || !bbAmount || !bbScreenshot || !bbSenderEmail.trim() || !bbSenderUsername.trim()}
                    className="w-btn-primary"
                    style={{ flex: 2 }}
                  >
                    {bbLoading ? '⏳ Processing...' : '✓ Submit Deposit Request'}
                  </button>
                </div>
              </div>
            ) : (
              /* Binance/Bybit Success Receipt */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#141827', border: '1px solid rgba(0, 200, 150, 0.25)', borderRadius: '20px', padding: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(0, 200, 150, 0.1)', color: '#00C896', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                    <CheckCircle size={32} />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>✓ Deposit Requested</h3>
                  <span style={{ fontSize: '11px', color: '#8A9BB8', marginTop: '4px' }}>Processing via admin verification</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
                  <Logo size={28} />
                </div>

                <div style={{ background: '#0B0E1A', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                    <span style={{ color: '#8A9BB8' }}>Deposit Type:</span>
                    <strong style={{ color: '#fff' }}>Binance/Bybit Transfer</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                    <span style={{ color: '#8A9BB8' }}>From Account:</span>
                    <strong style={{ color: '#fff' }}>{bbSenderEmail}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                    <span style={{ color: '#8A9BB8' }}>Method:</span>
                    <strong style={{ color: '#fff' }}>{bbMethod.toUpperCase()} Pay</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                    <span style={{ color: '#8A9BB8' }}>Amount Sent:</span>
                    <strong style={{ color: 'var(--gold)' }}>${parseFloat(bbAmount).toFixed(2)} USDT</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                    <span style={{ color: '#8A9BB8' }}>Platform Fee ({platformFeePercent}%):</span>
                    <strong style={{ color: '#FF4D4D' }}>-${(parseFloat(bbAmount) * platformFeePercent / 100).toFixed(2)} USDT</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                    <span style={{ color: '#8A9BB8' }}>Net Credited:</span>
                    <strong style={{ color: '#00C896' }}>${Math.max(0, parseFloat(bbAmount) - (parseFloat(bbAmount) * platformFeePercent / 100)).toFixed(2)} USDT</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                    <span style={{ color: '#8A9BB8' }}>Status:</span>
                    <strong style={{ color: '#F5A623' }}>⏳ Pending Admin Review</strong>
                  </div>
                </div>

                <div style={{ background: 'rgba(245, 166, 35, 0.05)', border: '1px solid rgba(245, 166, 35, 0.15)', borderRadius: '10px', padding: '12px', fontSize: '11.5px', color: '#ffd580', lineHeight: 1.4 }}>
                  ℹ️ <strong>Note:</strong> Admin will verify the uploaded screenshot and credit your wallet. This process usually takes <strong>5-15 minutes</strong>.
                </div>

                {/* Co-Signatures */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '16px', marginTop: '4px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', color: '#8A9BB8', textTransform: 'uppercase' }}>Authorized by</div>
                    <div style={{ fontFamily: '"Great Vibes", cursive, "Brush Script MT", sans-serif', fontSize: '18px', color: 'var(--gold-light)', fontStyle: 'italic', margin: '2px 0' }}>Mrcute</div>
                    <div style={{ fontSize: '8px', color: '#525866' }}>Platform Node</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', color: '#8A9BB8', textTransform: 'uppercase' }}>Founder, EthioSwap</div>
                    <div style={{ fontFamily: '"Great Vibes", cursive, "Brush Script MT", sans-serif', fontSize: '18px', color: 'var(--gold-light)', fontStyle: 'italic', margin: '2px 0' }}>Biruk Fikru</div>
                    <div style={{ fontSize: '8px', color: '#525866' }}>Founder & CEO</div>
                  </div>
                </div>

                <button onClick={() => {
                  setBbAmount('');
                  setBbSenderEmail('');
                  setBbSenderUsername('');
                  setBbScreenshot(null);
                  setBbScreenshotPreview(null);
                  setBbTxRef('');
                  setBbStep(1);
                  setReceiveType(null);
                  setTab('balance');
                }} className="w-btn-primary" style={{ marginTop: '8px' }}>
                  View Wallet
                </button>
              </div>
            )
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <StepIndicator current={depStep} total={4} />

              {/* STEP 1: Pick Network */}
              {depStep === 1 && (
                <div className="w-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <button onClick={() => setReceiveType(null)} className="w-btn-secondary" style={{ padding: '6px 10px', borderRadius: '50px', flex: 'none' }}>
                      <i className="ti ti-arrow-left"></i>
                    </button>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Pick Network</div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#8A9BB8', marginBottom: '16px' }}>Select the network you'll send USDT on</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                    {NETWORKS.map(n => <NetworkCard key={n.id} network={n} selected={depNet} onSelect={setDepNet} />)}
                  </div>
                  <button onClick={() => setDepStep(2)} className="w-btn-primary">
                    Next <i className="ti ti-arrow-right" style={{ marginLeft: '6px' }}></i>
                  </button>
                </div>
              )}

              {/* STEP 2: Enter Amount */}
              {depStep === 2 && (
                <div className="w-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <button onClick={() => setDepStep(1)} className="w-btn-secondary" style={{ padding: '6px 10px', borderRadius: '50px', flex: 'none' }}>
                      <i className="ti ti-arrow-left"></i>
                    </button>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Enter Amount</div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#8A9BB8', marginBottom: '16px' }}>
                    Deposit via <span style={{ color: depNetData?.color, fontWeight: 600 }}>{depNetData?.label}</span> · min ${minDep}
                  </div>

                  <div style={{ position: 'relative', marginBottom: '16px' }}>
                    <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '20px', fontWeight: 700, color: '#8A9BB8' }}>$</span>
                    <input
                      type="number" step="0.01" min={minDep}
                      value={depAmt} onChange={e => setDepAmt(e.target.value)}
                      placeholder="0.00"
                      className="w-input"
                      style={{ padding: '16px 16px 16px 36px', fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                    />
                  </div>

                  {depAmtNum > 0 && (
                    <div style={{ background: '#0B0E1A', borderRadius: '14px', padding: '14px', border: '1px solid #1E2640', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#8A9BB8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                        <i className="ti ti-chart-line" style={{ marginRight: '6px' }}></i>Fee Breakdown
                      </div>
                      <FeePill label="Deposit Amount" value={`$${fmt(depAmtNum)} USDT`} color="#fff" />
                      <FeePill label={`Platform Fee (${platformFeePercent}%)`} value={`-$${fmt(depPlatFee)} USDT`} color="#FF4D4D" />
                      <FeePill label={`Network Fee (${depNetData?.label})`} value={`+$${fmt(depChainFee)} USDT`} color="#F5A623" />
                      <div style={{ height: '1px', background: '#1E2640', margin: '2px 0' }} />
                      <FeePill label="You Send (incl. network fee)" value={`$${fmt(depTotalCost)} USDT`} color="#F5A623" />
                      <FeePill label="💰 You Receive in Wallet" value={`$${fmt(depYouReceive)} USDT`} color="#00C896" />
                      <div style={{ fontSize: '10px', color: '#8A9BB8', textAlign: 'center', marginTop: '2px' }}>≈ {fmtEtb(depYouReceive * rate)} ETB</div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setDepStep(1)} className="w-btn-secondary" style={{ flex: 'none', padding: '14px 20px' }}>
                      <i className="ti ti-arrow-left" style={{ marginRight: '6px' }}></i>Back
                    </button>
                    <button onClick={() => { if (depAmtNum < minDep) { setError(`Minimum deposit is $${minDep}`); return; } setDepStep(3); }} className="w-btn-primary" style={{ flex: 1 }}>
                      Next <i className="ti ti-arrow-right" style={{ marginLeft: '6px' }}></i>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Deposit Address + TxID (Pending State) */}
              {depStep === 3 && (
                <div className="w-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <button onClick={() => setDepStep(2)} className="w-btn-secondary" style={{ padding: '6px 10px', borderRadius: '50px', flex: 'none' }}>
                      <i className="ti ti-arrow-left"></i>
                    </button>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Send USDT</div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#8A9BB8', marginBottom: '16px' }}>
                    Send exactly <span style={{ color: '#F5A623', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>${fmt(depTotalCost)} USDT</span> to the address below
                  </div>

                  {/* Network warning */}
                  <div style={{ background: 'rgba(255, 77, 77, 0.06)', border: '1px solid rgba(255, 77, 77, 0.2)', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <i className="ti ti-alert-triangle" style={{ color: '#FF4D4D', fontSize: '16px', flexShrink: 0, marginTop: '1px' }}></i>
                    <span style={{ fontSize: '12px', color: '#FF4D4D', lineHeight: 1.5 }}>{depNetData?.warning}</span>
                  </div>

                  {/* Pending State Banner */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(245, 166, 35, 0.08)', border: '1px solid rgba(245, 166, 35, 0.25)', borderRadius: '10px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '12.5px', color: '#FFB800', fontWeight: 700 }}>⏳ Waiting for deposit...</span>
                    <span style={{ fontSize: '12px', color: 'var(--gold)', fontWeight: 700 }}>Expires in: {depTimeRemaining}</span>
                  </div>

                  {/* QR + Address */}
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <div style={{ background: 'white', padding: '8px', borderRadius: '12px', flexShrink: 0, margin: '0 auto' }}>
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=96&data=${depAddress}`} alt="QR" style={{ width: 80, height: 80, display: 'block' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ fontSize: '10px', color: '#8A9BB8', fontWeight: 600, marginBottom: '6px' }}>
                        {depNetData?.icon} {depNetData?.label} USDT Address
                      </div>
                      <div style={{ background: '#0B0E1A', border: '1px solid #1E2640', borderRadius: '10px', padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', wordBreak: 'break-all', color: '#F5A623', lineHeight: 1.6, marginBottom: '10px' }}>
                        {depAddress || 'No address assigned'}
                      </div>
                      <button onClick={() => handleCopy(depAddress)} className="w-btn-secondary" style={{ width: '100%', padding: '8px' }}>
                        {copied ? '✓ Copied!' : '📋 Copy Address'}
                      </button>
                    </div>
                  </div>

                  {/* Fee summary */}
                  <div style={{ background: '#0B0E1A', borderRadius: '14px', padding: '14px', border: '1px solid #1E2640', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    <FeePill label="You Send" value={`$${fmt(depTotalCost)} USDT`} color="#fff" />
                    <FeePill label="Platform Fee" value={`-$${fmt(depPlatFee)} USDT`} color="#FF4D4D" />
                    <FeePill label="💰 You Receive" value={`$${fmt(depYouReceive)} USDT`} color="#00C896" />
                  </div>

                  {/* TxID input */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 600, display: 'block', marginBottom: '8px' }}>TRANSACTION ID / REFERENCE</label>
                    <input
                      type="text" required
                      value={depTxId} onChange={e => setDepTxId(e.target.value)}
                      placeholder="Paste your TxID after sending"
                      className="w-input"
                      style={{ padding: '13px 16px', fontFamily: 'var(--font-mono)' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setDepStep(2)} className="w-btn-secondary" style={{ flex: 'none', padding: '14px 20px' }}>
                      <i className="ti ti-arrow-left" style={{ marginRight: '6px' }}></i>Back
                    </button>
                    <button onClick={handleDepositSubmit} disabled={depLoading || !depTxId.trim()} className="w-btn-primary" style={{ flex: 1 }}>
                      {depLoading ? '⏳ Submitting…' : "I've sent the USDT"}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: Success Receipt */}
              {depStep === 4 && (
                <div className="w-card" style={{ padding: '24px', background: '#141827', border: '1px solid rgba(0, 200, 150, 0.25)', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(0, 200, 150, 0.1)', color: '#00C896', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                      <CheckCircle size={32} />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>✓ Deposit received!</h3>
                    <span style={{ fontSize: '11px', color: '#00C896', fontWeight: 700, textTransform: 'uppercase', marginTop: '4px' }}>
                      Credited to wallet
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
                    <Logo size={28} />
                  </div>

                  <div style={{ background: '#0B0E1A', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                      <span style={{ color: '#8A9BB8' }}>From (My Wallet):</span>
                      <strong style={{ color: '#fff', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{depTxId}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                      <span style={{ color: '#8A9BB8' }}>To EthioSwap:</span>
                      <strong style={{ color: '#fff', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{depAddress}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                      <span style={{ color: '#8A9BB8' }}>Amount (USDT):</span>
                      <strong style={{ color: 'var(--gold)' }}>${depAmtNum.toFixed(2)} USDT</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                      <span style={{ color: '#8A9BB8' }}>Network:</span>
                      <strong style={{ color: '#fff' }}>{depNetData?.label} ({depNet.toUpperCase()})</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                      <span style={{ color: '#8A9BB8' }}>Confirmation:</span>
                      <strong style={{ color: '#00C896' }}>1/1 blocks confirmed</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                      <span style={{ color: '#8A9BB8' }}>Timestamp:</span>
                      <strong style={{ color: '#fff', fontSize: '11px' }}>{new Date().toLocaleString()}</strong>
                    </div>
                  </div>

                  {/* Co-Signatures */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '16px', marginTop: '4px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: '#8A9BB8', textTransform: 'uppercase' }}>Authorized by</div>
                      <div style={{ fontFamily: '"Great Vibes", cursive, "Brush Script MT", sans-serif', fontSize: '18px', color: 'var(--gold-light)', fontStyle: 'italic', margin: '2px 0' }}>Mrcute</div>
                      <div style={{ fontSize: '8px', color: '#525866' }}>Platform Node</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: '#8A9BB8', textTransform: 'uppercase' }}>Founder, EthioSwap</div>
                      <div style={{ fontFamily: '"Great Vibes", cursive, "Brush Script MT", sans-serif', fontSize: '18px', color: 'var(--gold-light)', fontStyle: 'italic', margin: '2px 0' }}>Biruk Fikru</div>
                      <div style={{ fontSize: '8px', color: '#525866' }}>Founder & CEO</div>
                    </div>
                  </div>

                  <button onClick={() => {
                    setDepAmt('');
                    setDepTxId('');
                    setDepStep(1);
                    setReceiveType(null);
                    setTab('balance');
                  }} className="w-btn-primary" style={{ marginTop: '8px' }}>
                    View Wallet
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* WITHDRAW TAB */}
      {tab === 'withdraw' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {wdType === null ? (
            <ChoiceSelector
              title="Withdraw USDT"
              desc="Select where you want to withdraw your USDT"
              options={[
                { id: 'user', icon: '👤', label: 'To User', desc: 'Transfer internally to another username for $0 fees' },
                { id: 'address', icon: '🔗', label: 'To Address', desc: 'Withdraw to an external blockchain network address' },
              ]}
              onSelect={handleWdTypeSelect}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <StepIndicator current={wdStep} total={5} />

              {/* STEP 1: Pick Network */}
              {wdStep === 1 && (
                <div className="w-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <button onClick={() => setWdType(null)} className="w-btn-secondary" style={{ padding: '6px 10px', borderRadius: '50px', flex: 'none' }}>
                      <i className="ti ti-arrow-left"></i>
                    </button>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Pick Network</div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#8A9BB8', marginBottom: '16px' }}>Select the network for your withdrawal</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                    {NETWORKS.map(n => <NetworkCard key={n.id} network={n} selected={wdNet} onSelect={setWdNet} />)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#8A9BB8', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="ti ti-wallet" style={{ color: '#F5A623' }}></i>
                    Available: <span style={{ color: '#F5A623', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>${fmt(available)}</span>
                  </div>
                  <button onClick={() => setWdStep(2)} className="w-btn-primary">
                    Next <i className="ti ti-arrow-right" style={{ marginLeft: '6px' }}></i>
                  </button>
                </div>
              )}

              {/* STEP 2: Amount + Address */}
              {wdStep === 2 && (
                <div className="w-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <button onClick={() => setWdStep(1)} className="w-btn-secondary" style={{ padding: '6px 10px', borderRadius: '50px', flex: 'none' }}>
                      <i className="ti ti-arrow-left"></i>
                    </button>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Withdraw</div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#8A9BB8', marginBottom: '16px' }}>
                    Withdraw via <span style={{ color: wdNetData?.color, fontWeight: 600 }}>{wdNetData?.label}</span> · available ${fmt(available)}
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 600, display: 'block', marginBottom: '8px' }}>WALLET ADDRESS</label>
                    <input
                      type="text" required value={wdAddr} onChange={e => setWdAddr(e.target.value)}
                      placeholder={wdNetData?.addrPlaceholder}
                      className="w-input"
                      style={{ padding: '13px 16px', fontFamily: 'var(--font-mono)' }}
                    />
                  </div>

                  <div style={{ position: 'relative', marginBottom: '16px' }}>
                    <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 600, display: 'block', marginBottom: '8px' }}>AMOUNT (USD)</label>
                    <span style={{ position: 'absolute', left: '16px', top: '42px', transform: 'translateY(-50%)', fontSize: '18px', fontWeight: 700, color: '#8A9BB8' }}>$</span>
                    <input
                      type="number" step="0.01" min={minWd}
                      value={wdAmt} onChange={e => setWdAmt(e.target.value)}
                      placeholder="0.00"
                      className="w-input"
                      style={{ padding: '16px 16px 16px 36px', fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                    />
                  </div>

                  {wdAmtNum > 0 && (
                    <div style={{ background: '#0B0E1A', borderRadius: '14px', padding: '14px', border: '1px solid #1E2640', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#8A9BB8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                        <i className="ti ti-chart-line" style={{ marginRight: '6px' }}></i>Fee Breakdown
                      </div>
                      <FeePill label="Withdraw Amount" value={`$${fmt(wdAmtNum)} USDT`} color="#fff" />
                      <FeePill label={`Platform Fee (${platformFeePercent}%)`} value={`-$${fmt(wdPlatFee)} USDT`} color="#FF4D4D" />
                      <FeePill label={`Network Fee (${wdNetData?.label})`} value={`-$${fmt(wdChainFee)} USDT`} color="#FF4D4D" />
                      <div style={{ height: '1px', background: '#1E2640', margin: '2px 0' }} />
                      <FeePill label="💰 You Receive" value={wdYouReceive > 0 ? `$${fmt(wdYouReceive)} USDT` : '⚠️ Amount too low'} color={wdYouReceive > 0 ? '#00C896' : '#FF4D4D'} />
                      {wdYouReceive > 0 && <div style={{ fontSize: '10px', color: '#8A9BB8', textAlign: 'center', marginTop: '2px' }}>≈ {fmtEtb(wdYouReceive * rate)} ETB</div>}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setWdStep(1)} className="w-btn-secondary" style={{ flex: 'none', padding: '14px 20px' }}>
                      <i className="ti ti-arrow-left" style={{ marginRight: '6px' }}></i>Back
                    </button>
                    <button onClick={() => {
                      if (wdAmtNum < minWd) { setError(`Minimum withdrawal is $${minWd}`); return; }
                      if (wdAmtNum > available) { setError(`Max available: $${fmt(available)}`); return; }
                      if (!wdAddr.trim()) { setError('Enter a wallet address'); return; }
                      setWdStep(3);
                    }} className="w-btn-primary" style={{ flex: 1 }}>
                      Next <i className="ti ti-arrow-right" style={{ marginLeft: '6px' }}></i>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Confirmation */}
              {wdStep === 3 && (
                <div className="w-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <button onClick={() => setWdStep(2)} className="w-btn-secondary" style={{ padding: '6px 10px', borderRadius: '50px', flex: 'none' }}>
                      <i className="ti ti-arrow-left"></i>
                    </button>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Confirm Withdrawal</div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#8A9BB8', marginBottom: '20px' }}>Review your withdrawal details carefully</div>

                  <div style={{ background: '#0B0E1A', borderRadius: '14px', border: '1px solid #1E2640', padding: '16px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', color: '#8A9BB8' }}>Network</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: wdNetData?.color }}>{wdNetData?.icon} {wdNetData?.label}</span>
                      </div>
                      <div style={{ height: '1px', background: '#1E2640' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', color: '#8A9BB8' }}>To Address</span>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#F5A623', fontFamily: 'var(--font-mono)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wdAddr}</span>
                      </div>
                      <div style={{ height: '1px', background: '#1E2640' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', color: '#8A9BB8' }}>Withdraw Amount</span>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>${fmt(wdAmtNum)} USDT</span>
                      </div>
                      <div style={{ height: '1px', background: '#1E2640' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', color: '#8A9BB8' }}>Platform Fee ({platformFeePercent}%)</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#FF4D4D', fontFamily: 'var(--font-mono)' }}>-${fmt(wdPlatFee)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', color: '#8A9BB8' }}>Network Fee</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#FF4D4D', fontFamily: 'var(--font-mono)' }}>-${fmt(wdChainFee)}</span>
                      </div>
                      <div style={{ height: '2px', background: '#F5A623', margin: '2px 0', borderRadius: '1px' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#F5A623' }}>💰 You Receive</span>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#00C896', fontFamily: 'var(--font-mono)' }}>${fmt(wdYouReceive)} USDT</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setWdStep(2)} className="w-btn-secondary" style={{ flex: 'none', padding: '14px 20px' }}>
                      <i className="ti ti-arrow-left" style={{ marginRight: '6px' }}></i>Back
                    </button>
                    <button onClick={handleWithdrawSubmit} disabled={wdLoading} className="w-btn-primary" style={{ flex: 1 }}>
                      {wdLoading ? '⏳ Processing…' : '✓ Confirm Withdrawal'}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: Processing Pending State */}
              {wdStep === 4 && (
                <div className="w-card" style={{ padding: '30px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', border: '4px solid rgba(255,255,255,0.05)', borderTopColor: '#F5A623', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <div>
                    <span style={{ display: 'inline-flex', padding: '4px 10px', background: 'rgba(245, 166, 35, 0.15)', border: '1px solid rgba(245, 166, 35, 0.3)', color: '#FFB800', borderRadius: '8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                      ⏳ Processing Withdrawal
                    </span>
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: 0 }}>Sending your USDT...</h3>
                  <p style={{ fontSize: '12px', color: '#8A9BB8', lineHeight: 1.5, margin: 0, maxWidth: '280px' }}>
                    Your USDT is being sent on the <strong>{wdNetData?.label}</strong> network. This may take <strong>1–5 minutes</strong>.
                  </p>
                  <div style={{ background: '#0B0E1A', border: '1px solid #1E2640', borderRadius: '12px', padding: '12px 16px', width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#8A9BB8' }}>From:</span>
                      <span style={{ color: '#fff', fontFamily: 'var(--font-mono)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{address}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#8A9BB8' }}>To:</span>
                      <span style={{ color: '#fff', fontFamily: 'var(--font-mono)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wdAddr}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#8A9BB8' }}>Amount:</span>
                      <span style={{ color: 'var(--gold)', fontWeight: 700 }}>${wdAmtNum.toFixed(2)} USDT</span>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: '#8A9BB8', fontStyle: 'italic' }}>
                    🔔 You'll be notified when transaction is fully complete.
                  </span>
                </div>
              )}

              {/* STEP 5: Success Receipt */}
              {wdStep === 5 && (
                <div className="w-card" style={{ padding: '24px', background: '#141827', border: '1px solid rgba(0, 200, 150, 0.25)', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(0, 200, 150, 0.1)', color: '#00C896', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                      <CheckCircle size={32} />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>✓ Withdrawal Sent!</h3>
                    <span style={{ fontSize: '11px', color: '#00C896', fontWeight: 700, textTransform: 'uppercase', marginTop: '4px' }}>
                      Complete
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
                    <Logo size={28} />
                  </div>

                  <div style={{ background: '#0B0E1A', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                      <span style={{ color: '#8A9BB8' }}>From (EthioSwap):</span>
                      <strong style={{ color: '#fff', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{address}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                      <span style={{ color: '#8A9BB8' }}>To Address:</span>
                      <strong style={{ color: '#fff', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wdAddr}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                      <span style={{ color: '#8A9BB8' }}>Amount Sent:</span>
                      <strong style={{ color: 'var(--gold)' }}>${wdAmtNum.toFixed(2)} USDT</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                      <span style={{ color: '#8A9BB8' }}>Platform Fee:</span>
                      <strong style={{ color: '#FF4D4D' }}>-${wdPlatFee.toFixed(2)} USDT</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                      <span style={{ color: '#8A9BB8' }}>Network Fee:</span>
                      <strong style={{ color: '#FF4D4D' }}>-${wdChainFee.toFixed(2)} USDT</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                      <span style={{ color: '#8A9BB8' }}>Network:</span>
                      <strong style={{ color: '#fff' }}>{wdNetData?.label} ({wdNet.toUpperCase()})</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                      <span style={{ color: '#8A9BB8' }}>Tx Hash:</span>
                      <strong style={{ color: '#00C896', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>MockHash_{Math.random().toString(36).substring(2, 10)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                      <span style={{ color: '#8A9BB8' }}>Timestamp:</span>
                      <strong style={{ color: '#fff', fontSize: '11px' }}>{new Date().toLocaleString()}</strong>
                    </div>
                  </div>

                  {/* Co-Signatures */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '16px', marginTop: '4px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: '#8A9BB8', textTransform: 'uppercase' }}>Authorized by</div>
                      <div style={{ fontFamily: '"Great Vibes", cursive, "Brush Script MT", sans-serif', fontSize: '18px', color: 'var(--gold-light)', fontStyle: 'italic', margin: '2px 0' }}>Mrcute</div>
                      <div style={{ fontSize: '8px', color: '#525866' }}>Platform Node</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: '#8A9BB8', textTransform: 'uppercase' }}>Founder, EthioSwap</div>
                      <div style={{ fontFamily: '"Great Vibes", cursive, "Brush Script MT", sans-serif', fontSize: '18px', color: 'var(--gold-light)', fontStyle: 'italic', margin: '2px 0' }}>Biruk Fikru</div>
                      <div style={{ fontSize: '8px', color: '#525866' }}>Founder & CEO</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <a 
                      href={`https://etherscan.io/address/${wdAddr}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="w-btn-secondary" 
                      style={{ flex: 1, textDecoration: 'none' }}
                    >
                      View Explorer
                    </a>
                    <button onClick={() => {
                      setWdAmt('');
                      setWdAddr('');
                      setWdStep(1);
                      setWdType(null);
                      setTab('balance');
                    }} className="w-btn-primary" style={{ flex: 1 }}>
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. STAT CARDS ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginTop: '24px' }}>
        <StatCard icon="💰" label="Total Balance" value={`$${fmt(balance)}`} sub="Your USDT wallet" color="#F5A623" />
        <StatCard icon="📤" label="Total Sent" value={`$${fmt(totalVolume || 0)}`} sub="All time" color="#FF4D4D" />
        <StatCard icon="📥" label="Total Received" value={`$${fmt(totalDeposited || 0)}`} sub="All time" color="#00C896" />
        <StatCard icon="📋" label="Active Orders" value={pendingTrades.length} sub="Open trades" color="#8A9BB8" />
      </div>

    </div>
  );
};

export default WalletCard;
