import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getNetworkAddress } from '../utils/crypto.js';

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

const WalletCard = () => {
  const {
    user, wallet, systemSettings,
    withdrawETH, myDepositReqs, myWithdrawalReqs,
    createDepositRequest, setError, setSuccess,
    transferToUser,
  } = useAuth();

  const [tab, setTab] = useState('balance');
  const [copied, setCopied] = useState(false);
  const [qrNet, setQrNet] = useState('trc20');

  // Deposit/Receive Chain flow
  const [depStep, setDepStep] = useState(1);
  const [depNet, setDepNet] = useState('trc20');
  const [depAmt, setDepAmt] = useState('');
  const [depTxId, setDepTxId] = useState('');
  const [depLoading, setDepLoading] = useState(false);

  // Binance / Bybit Deposit flow states
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
        setDepAmt(''); setDepTxId(''); setDepStep(1);
        setReceiveType(null); // Back to choice
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
        setBbAmount('');
        setBbSenderEmail('');
        setBbSenderUsername('');
        setBbScreenshot(null);
        setBbScreenshotPreview(null);
        setBbTxRef('');
        setReceiveType(null); // Go back to receive choices
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
    setWdLoading(true);
    setSuccess('Processing withdrawal...');
    try {
      const res = await withdrawETH(wdAmtNum, wdAddr, '', wdNet.toUpperCase());
      if (res && res.success) {
        setWdAmt(''); setWdAddr(''); setWdStep(1);
        setWdType(null); // Back to choice
      }
    } catch (err) { setError(err.message); }
    finally { setWdLoading(false); }
  };

  const handleInternalSendSubmit = async () => {
    if (!sendUsername.trim()) { setError('Please enter a username'); return; }
    const amt = parseFloat(sendAmt) || 0;
    if (amt <= 0) { setError('Enter a valid amount'); return; }
    if (amt > available) { setError(`Max available: $${fmt(available)}`); return; }
    
    setSendLoading(true);
    setSuccess('Processing transfer...');
    try {
      await transferToUser(sendUsername, amt);
      setSendUsername('');
      setSendAmt('');
      setSendType(null);
      setWdType(null);
    } catch (err) { setError(err.message); }
    finally { setSendLoading(false); }
  };

  if (!wallet) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}.sk{background:linear-gradient(90deg,#1a1d28 25%,#22263a 50%,#1a1d28 75%);background-size:400px 100%;animation:shimmer 1.5s ease-in-out infinite;border-radius:20px}`}</style>
      <div className="sk" style={{ height: 200 }} />
      <div className="sk" style={{ height: 60, borderRadius: 12 }} />
      <div className="sk" style={{ height: 140, borderRadius: 16 }} />
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

      {/* HERO */}
      <div style={{ position: 'relative', borderRadius: '20px', padding: '24px', background: 'linear-gradient(135deg, #141827 0%, #0B0E1A 100%)', border: '1px solid #1E2640', boxShadow: '0 12px 40px rgba(0,0,0,0.65), inset 0 1px 1px rgba(255,255,255,0.04)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(245, 166, 35, 0.08)', filter: 'blur(50px)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', color: '#F5A623', textTransform: 'uppercase', marginBottom: '4px' }}>EthioSwap Wallet</div>
            {numId && <div style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 600 }}>Account #{numId}</div>}
          </div>
          <div style={{ background: 'rgba(245, 166, 35, 0.1)', border: '1px solid rgba(245, 166, 35, 0.2)', borderRadius: '8px', padding: '5px 12px', fontSize: '11px', fontWeight: 600, color: '#F5A623', textTransform: 'uppercase', letterSpacing: '0.05em' }}>USDT</div>
        </div>
        <div style={{ marginBottom: '6px' }}>
          <span style={{ fontSize: '13px', color: '#8A9BB8', fontWeight: 600 }}>Total Balance</span>
        </div>
        <div style={{ fontSize: '42px', fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '-0.04em', color: '#F5A623', lineHeight: 1.1, marginBottom: '4px' }}>
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
            <div key={c.label} style={{ background: '#1A1F32', borderRadius: '14px', padding: '14px 16px', border: '1px solid #1E2640' }}>
              <div style={{ fontSize: '9px', color: '#8A9BB8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', fontWeight: 600 }}>{c.label}</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: c.color, fontFamily: 'var(--font-mono)' }}>${fmt(c.usd)}</div>
              <div style={{ fontSize: '10px', color: '#8A9BB8', marginTop: '2px' }}>≈ {fmtEtb(c.etb)} ETB</div>
            </div>
          ))}
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', background: '#141827', border: '1px solid #1E2640', borderRadius: '16px', padding: '4px', gap: '4px' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSendType(t.id === 'send' ? 'user' : null); setReceiveType(null); setWdType(null); }}
            style={{
              flex: 1, padding: '10px 4px', borderRadius: '12px', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
              background: tab === t.id ? '#1A1F32' : 'transparent',
              color: tab === t.id ? '#F5A623' : '#8A9BB8',
              border: tab === t.id ? '1px solid rgba(245,166,35,0.1)' : '1px solid transparent',
              boxShadow: tab === t.id ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <i className={t.icon} style={{ fontSize: '20px' }}></i>
            <span style={{ fontSize: '10px', fontWeight: 600 }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* BALANCE TAB */}
      {tab === 'balance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: '#141827', borderRadius: '20px', border: '1px solid #1E2640', padding: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#F5A623', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <i className="ti ti-arrow-down" style={{ marginRight: '6px' }}></i>Your Deposit Address
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {NETWORKS.map(n => (
                <button key={n.id} onClick={() => setQrNet(n.id)} style={{
                  padding: '6px 12px', borderRadius: '8px',
                  border: `1.5px solid ${qrNet === n.id ? n.color : 'rgba(255,255,255,0.06)'}`,
                  background: qrNet === n.id ? 'rgba(255,255,255,0.03)' : 'transparent',
                  color: qrNet === n.id ? '#fff' : '#8b92a8',
                  fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s ease',
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: n.color }} />
                  {n.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ background: 'white', padding: '8px', borderRadius: '12px', flexShrink: 0, margin: '0 auto' }}>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=96&data=${qrAddress}`} alt="QR" style={{ width: 80, height: 80, display: 'block' }} />
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ fontSize: '10px', color: '#8A9BB8', fontWeight: 600, marginBottom: '6px' }}>Send {qrNet.toUpperCase()} USDT to this address</div>
                <div style={{ background: '#0B0E1A', border: '1px solid #1E2640', borderRadius: '10px', padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', wordBreak: 'break-all', color: '#F5A623', lineHeight: 1.6, marginBottom: '10px' }}>
                  {qrAddress || 'No address assigned'}
                </div>
                <button onClick={() => handleCopy(qrAddress)} style={{
                  padding: '7px 16px', borderRadius: '8px', width: '100%',
                  background: 'rgba(245, 166, 35, 0.1)', border: '1px solid rgba(245, 166, 35, 0.2)',
                  color: '#F5A623', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                }}>
                  {copied ? '✓ Copied!' : '📋 Copy Address'}
                </button>
              </div>
            </div>
          </div>

          {history.length > 0 ? (
            <div style={{ background: '#141827', borderRadius: '20px', border: '1px solid #1E2640', padding: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#8A9BB8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>
                <i className="ti ti-clock" style={{ marginRight: '6px' }}></i>Recent Transactions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {history.map((item, i) => {
                  const isDep = item._kind === 'dep';
                  const amt = item.amount_usd ?? item.amount_usd_legacy ?? 0;
                  const date = item.created_at ?? '';
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#1A1F32', borderRadius: '12px', border: '1px solid #1E2640' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: isDep ? 'rgba(245, 166, 35, 0.1)' : 'rgba(255, 77, 77, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                          <i className={isDep ? 'ti ti-arrow-down' : 'ti ti-arrow-up'} style={{ color: isDep ? '#F5A623' : '#FF4D4D' }}></i>
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                            {isDep ? (item.wallet_type === 'INTERNAL' ? 'Received (Internal)' : 'Deposit') : (item.wallet_type === 'INTERNAL' ? 'Sent (Internal)' : 'Withdrawal')}
                          </div>
                          <div style={{ fontSize: '10px', color: '#8A9BB8', marginTop: '1px' }}>
                            {isDep ? `From ${item.sender_reference || 'Chain'}` : `To ${item.address || 'Chain'}`} · {date ? new Date(date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: isDep ? '#F5A623' : '#FF4D4D', fontFamily: 'var(--font-mono)' }}>{isDep ? '+' : '-'}${fmt(amt)}</div>
                          <span style={{
                            fontSize: '8.5px', fontWeight: 600, padding: '1px 5px', borderRadius: '4px',
                            textTransform: 'uppercase', display: 'inline-block', marginTop: '2px',
                            background: item.status === 'approved' ? 'rgba(245,166,35,0.1)' : item.status === 'pending' ? 'rgba(138,155,184,0.1)' : 'rgba(255,77,77,0.1)',
                            color: item.status === 'approved' ? '#F5A623' : item.status === 'pending' ? '#8A9BB8' : '#FF4D4D',
                          }}>{item.status}</span>
                        </div>
                        <button
                          onClick={() => setSelectedWalletTx({ ...item, isDep, amt })}
                          style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.18)', borderRadius: '8px', color: '#F5A623', cursor: 'pointer', padding: '6px 10px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.18s ease', whiteSpace: 'nowrap', flexShrink: 0 }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,166,35,0.15)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(245,166,35,0.08)'}
                        >
                          <i className="ti ti-file-text" style={{ fontSize: '12px' }}></i> View
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ background: '#141827', borderRadius: '20px', border: '1px solid #1E2640', padding: '32px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>
                <i className="ti ti-inbox" style={{ fontSize: '36px', color: '#8A9BB8' }}></i>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#8A9BB8' }}>No transactions yet</div>
              <div style={{ fontSize: '12px', color: '#8A9BB8', marginTop: '4px' }}>Your deposit & withdrawal history will appear here</div>
            </div>
          )}
        </div>
      )}

      {/* ── Wallet Transaction Receipt Modal ── */}
      {selectedWalletTx && (() => {
        const item = selectedWalletTx;
        const isDep = item.isDep;
        const amt = item.amt;
        const fromStr = isDep ? (item.sender_reference || item.wallet_type || 'External Chain') : (user?.full_name || user?.username || 'My Wallet');
        const toStr = isDep ? (user?.full_name || user?.username || 'My Wallet') : (item.address || item.destination_address || item.wallet_type || 'External');
        const statusLabel = item.status || 'pending';
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(12px)', padding: '20px', overflowY: 'auto' }} onClick={() => setSelectedWalletTx(null)}>
            <div style={{ background: '#fff', color: '#1c1917', maxWidth: '380px', width: '100%', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(245,166,35,0.25)', fontFamily: "'Inter', sans-serif" }} onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div style={{ background: 'linear-gradient(135deg, #0a0c18 0%, #141827 100%)', padding: '22px 22px 18px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(245,166,35,0.08)', filter: 'blur(20px)', pointerEvents: 'none' }} />
                <button onClick={() => setSelectedWalletTx(null)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(255,255,255,0.08)', border: 'none', width: '26px', height: '26px', borderRadius: '50%', color: '#fff', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '10px', background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🛡️</div>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '17px', color: '#F5A623', letterSpacing: '-0.02em' }}>EthioSwap</div>
                    <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.12em' }}>OFFICIAL TRANSACTION RECEIPT</div>
                  </div>
                </div>
                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', marginTop: '2px' }}>ethioswap.qzz.io  ·  MrCute Finance Platform</div>
              </div>

              {/* Body */}
              <div style={{ padding: '18px 22px 22px' }}>
                <div style={{ borderBottom: '2px dashed #e7e5e4', paddingBottom: '12px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#44403c' }}>
                  {[
                    ['Receipt No', `REC-${(item.id || '00000000').substring(0, 8).toUpperCase()}`],
                    ['Date & Time', item.created_at ? new Date(item.created_at).toLocaleString() : 'Pending'],
                    ['Account Name', user?.full_name || user?.username || 'User'],
                    ['Type', isDep ? 'DEPOSIT' : 'WITHDRAWAL'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#78716c' }}>{k}</span>
                      <span style={{ fontWeight: 700, fontFamily: k === 'Receipt No' ? 'monospace' : 'inherit', fontSize: k === 'Receipt No' ? '10px' : '12px' }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#78716c' }}>Status</span>
                    <span style={{ fontWeight: 800, fontSize: '9px', color: statusLabel === 'approved' || statusLabel === 'completed' ? '#047857' : '#d97706', background: statusLabel === 'approved' || statusLabel === 'completed' ? '#d1fae5' : '#fef3c7', padding: '2px 8px', borderRadius: '99px', textTransform: 'uppercase' }}>{statusLabel}</span>
                  </div>
                </div>

                <div style={{ background: '#f5f5f4', borderRadius: '12px', padding: '10px 12px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#78716c', fontWeight: 600 }}>FROM</span>
                    <span style={{ fontWeight: 700, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fromStr}</span>
                  </div>
                  <div style={{ height: 1, background: '#e7e5e4' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#78716c', fontWeight: 600 }}>TO</span>
                    <span style={{ fontWeight: 700, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{toStr}</span>
                  </div>
                </div>

                <div style={{ background: '#f5f5f4', borderRadius: '12px', padding: '10px 12px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#78716c' }}>Amount</span>
                    <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>${fmt(amt)} USDT</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#78716c' }}>Platform Fee</span>
                    <span style={{ fontWeight: 700, color: '#059669' }}>FREE ✓</span>
                  </div>
                  <div style={{ height: 1, background: '#e7e5e4' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '15px', color: '#1c1917' }}>
                    <span>TOTAL NET</span>
                    <span style={{ color: '#047857', fontFamily: 'monospace' }}>${fmt(amt)} USDT</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '12px', borderTop: '2px dashed #e7e5e4', marginBottom: '18px' }}>
                  <div style={{ border: '2px solid #059669', borderRadius: '8px', padding: '4px 8px', color: '#059669', fontSize: '8px', fontWeight: 900, letterSpacing: '0.06em', height: 'fit-content' }}>SECURED ✓</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Georgia', serif", fontSize: '17px', color: '#1d4ed8', fontStyle: 'italic', lineHeight: 1, marginBottom: '4px' }}>Biruk Fikru</div>
                    <div style={{ height: '1px', background: '#d1d5db', marginBottom: '3px', width: '110px' }} />
                    <div style={{ fontSize: '8px', color: '#78716c', fontWeight: 600 }}>CEO & Founder, EthioSwap</div>
                    <div style={{ fontSize: '7px', color: '#a8a29e' }}>MrCute Finance Platform</div>
                  </div>
                </div>

                <button onClick={() => setSelectedWalletTx(null)} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #F5A623, #FFD966)', color: '#1c1917', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}
      {tab === 'send' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: '#141827', borderRadius: '20px', border: '1px solid #1E2640', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Send to User</div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 600, display: 'block', marginBottom: '8px' }}>RECIPIENT USERNAME</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', fontWeight: 700, color: '#8A9BB8' }}>@</span>
                <input
                  type="text"
                  value={sendUsername}
                  onChange={e => setSendUsername(e.target.value)}
                  placeholder="username"
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '13px 16px 13px 32px',
                    borderRadius: '12px', background: '#0B0E1A', border: '1.5px solid #1E2640',
                    color: '#fff', fontSize: '13px', outline: 'none',
                  }}
                />
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
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '16px 16px 16px 36px',
                  background: '#0B0E1A', border: '1.5px solid #1E2640', borderRadius: '14px',
                  color: '#fff', fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', outline: 'none',
                }}
              />
            </div>

            <button
              onClick={handleInternalSendSubmit}
              disabled={sendLoading || !sendUsername.trim() || !sendAmt}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
                background: sendLoading || !sendUsername.trim() || !sendAmt ? '#1E2640' : 'linear-gradient(135deg, #F5A623, #FFE082)',
                color: sendLoading || !sendUsername.trim() || !sendAmt ? '#8A9BB8' : '#0A0C12',
                fontSize: '15px', fontWeight: 800, cursor: sendLoading || !sendUsername.trim() || !sendAmt ? 'not-allowed' : 'pointer',
              }}
            >
              {sendLoading ? '⏳ Processing...' : '✓ Send Instantly'}
            </button>
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
            <div style={{ background: '#141827', borderRadius: '20px', border: '1px solid #1E2640', padding: '24px', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <button onClick={() => setReceiveType(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #1E2640', borderRadius: '50px', color: '#8A9BB8', padding: '6px 10px', fontSize: '12px', cursor: 'pointer' }}>
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

              <button onClick={() => handleCopy(`@${user?.username}`)} style={{
                width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
                background: 'rgba(245, 166, 35, 0.1)', border: '1px solid rgba(245, 166, 35, 0.2)',
                color: '#F5A623', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              }}>
                {copied ? '✓ Copied Username!' : '📋 Copy Username'}
              </button>
            </div>
          ) : receiveType === 'binance_bybit' ? (
            <div style={{ background: '#141827', borderRadius: '20px', border: '1px solid #1E2640', padding: '24px' }}>
              {/* Back Button & Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <button onClick={() => setReceiveType(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #1E2640', borderRadius: '50px', color: '#8A9BB8', padding: '6px 10px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                          style={{
                            flex: 1, padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                            border: `1.5px solid ${isActive ? '#F5A623' : '#1E2640'}`,
                            background: isActive ? 'rgba(245, 166, 35, 0.08)' : '#0B0E1A',
                            color: isActive ? '#fff' : '#8A9BB8',
                            transition: 'all 0.15s ease'
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
                      style={{
                        width: '100%', boxSizing: 'border-box', padding: '14px 16px 14px 36px',
                        background: '#0B0E1A', border: '1.5px solid #1E2640', borderRadius: '12px',
                        color: '#fff', fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-mono)', outline: 'none'
                      }}
                    />
                  </div>
                  {parseFloat(bbAmount) > 0 && (
                    <div style={{ marginTop: '6px', fontSize: '12px', color: '#8A9BB8' }}>
                      Estimated credit amount (excl. {platformFeePercent}% fee): <strong style={{ color: '#00C896' }}>${(parseFloat(bbAmount) * (1 - platformFeePercent / 100)).toFixed(2)} USD</strong>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 600, display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Your Binance/Bybit Email *</label>
                  <input
                    type="email"
                    value={bbSenderEmail} onChange={e => setBbSenderEmail(e.target.value)}
                    placeholder="Enter the email address you sent from"
                    required
                    style={{
                      width: '100%', boxSizing: 'border-box', padding: '12px 14px',
                      background: '#0B0E1A', border: '1.5px solid #1E2640', borderRadius: '10px',
                      color: '#fff', fontSize: '13px', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 600, display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Your Binance/Bybit Username *</label>
                  <input
                    type="text"
                    value={bbSenderUsername} onChange={e => setBbSenderUsername(e.target.value)}
                    placeholder="Enter the account username you sent from"
                    required
                    style={{
                      width: '100%', boxSizing: 'border-box', padding: '12px 14px',
                      background: '#0B0E1A', border: '1.5px solid #1E2640', borderRadius: '10px',
                      color: '#fff', fontSize: '13px', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 600, display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Transaction ID / Reference (Optional)</label>
                  <input
                    type="text"
                    value={bbTxRef} onChange={e => setBbTxRef(e.target.value)}
                    placeholder="Enter Binance Pay ID or Bybit TxID"
                    style={{
                      width: '100%', boxSizing: 'border-box', padding: '12px 14px',
                      background: '#0B0E1A', border: '1.5px solid #1E2640', borderRadius: '10px',
                      color: '#fff', fontSize: '13px', outline: 'none'
                    }}
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
                    <label style={{ background: '#0B0E1A', border: '2px dashed #1E2640', borderRadius: '12px', padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'border-color 0.2s ease' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#F5A623'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#1E2640'}
                    >
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
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #1E2640', background: 'transparent', color: '#8A9BB8', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBinanceBybitSubmit}
                  disabled={bbLoading || !bbAmount || !bbScreenshot || !bbSenderEmail.trim() || !bbSenderUsername.trim()}
                  style={{
                    flex: 2, padding: '12px', borderRadius: '10px', border: 'none',
                    background: bbLoading || !bbAmount || !bbScreenshot || !bbSenderEmail.trim() || !bbSenderUsername.trim() ? '#1E2640' : 'linear-gradient(135deg, #F5A623, #FFE082)',
                    color: bbLoading || !bbAmount || !bbScreenshot || !bbSenderEmail.trim() || !bbSenderUsername.trim() ? '#8A9BB8' : '#0A0C12',
                    fontSize: '14px', fontWeight: 800, cursor: bbLoading || !bbAmount || !bbScreenshot || !bbSenderEmail.trim() || !bbSenderUsername.trim() ? 'not-allowed' : 'pointer'
                  }}
                >
                  {bbLoading ? '⏳ Processing...' : '✓ Submit Deposit Request'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <StepIndicator current={depStep} total={3} />

              {/* STEP 1: Pick Network */}
              {depStep === 1 && (
                <div style={{ background: '#141827', borderRadius: '20px', border: '1px solid #1E2640', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <button onClick={() => setReceiveType(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #1E2640', borderRadius: '50px', color: '#8A9BB8', padding: '6px 10px', fontSize: '12px', cursor: 'pointer' }}>
                      <i className="ti ti-arrow-left"></i>
                    </button>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Pick Network</div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#8A9BB8', marginBottom: '16px' }}>Select the network you'll send USDT on</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                    {NETWORKS.map(n => <NetworkCard key={n.id} network={n} selected={depNet} onSelect={setDepNet} />)}
                  </div>
                  <button onClick={() => setDepStep(2)} style={{
                    width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
                    background: 'linear-gradient(135deg, #F5A623, #FFE082)', color: '#0A0C12',
                    fontSize: '15px', fontWeight: 800, cursor: 'pointer',
                  }}>Next <i className="ti ti-arrow-right" style={{ marginLeft: '6px' }}></i></button>
                </div>
              )}

              {/* STEP 2: Enter Amount */}
              {depStep === 2 && (
                <div style={{ background: '#141827', borderRadius: '20px', border: '1px solid #1E2640', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <button onClick={() => setDepStep(1)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #1E2640', borderRadius: '50px', color: '#8A9BB8', padding: '6px 10px', fontSize: '12px', cursor: 'pointer' }}>
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
                      style={{
                        width: '100%', boxSizing: 'border-box', padding: '16px 16px 16px 36px',
                        background: '#0B0E1A', border: '1.5px solid #1E2640', borderRadius: '14px',
                        color: '#fff', fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-mono)',
                        outline: 'none',
                      }}
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
                    <button onClick={() => setDepStep(1)} style={{ padding: '14px 20px', borderRadius: '14px', border: '1px solid #1E2640', background: 'transparent', color: '#8A9BB8', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                      <i className="ti ti-arrow-left" style={{ marginRight: '6px' }}></i>Back
                    </button>
                    <button onClick={() => { if (depAmtNum < minDep) { setError(`Minimum deposit is $${minDep}`); return; } setDepStep(3); }} style={{
                      flex: 1, padding: '14px', borderRadius: '14px', border: 'none',
                      background: depAmtNum >= minDep ? 'linear-gradient(135deg, #F5A623, #FFE082)' : '#1E2640',
                      color: depAmtNum >= minDep ? '#0A0C12' : '#8A9BB8',
                      fontSize: '15px', fontWeight: 800, cursor: depAmtNum >= minDep ? 'pointer' : 'not-allowed',
                    }}>Next <i className="ti ti-arrow-right" style={{ marginLeft: '6px' }}></i></button>
                  </div>
                </div>
              )}

              {/* STEP 3: Deposit Address + TxID */}
              {depStep === 3 && (
                <div style={{ background: '#141827', borderRadius: '20px', border: '1px solid #1E2640', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <button onClick={() => setDepStep(2)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #1E2640', borderRadius: '50px', color: '#8A9BB8', padding: '6px 10px', fontSize: '12px', cursor: 'pointer' }}>
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
                      <button onClick={() => handleCopy(depAddress)} style={{
                        padding: '7px 16px', borderRadius: '8px', width: '100%',
                        background: 'rgba(245, 166, 35, 0.1)', border: '1px solid rgba(245, 166, 35, 0.2)',
                        color: '#F5A623', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                      }}>
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
                      style={{
                        width: '100%', boxSizing: 'border-box', padding: '13px 16px',
                        borderRadius: '12px', background: '#0B0E1A', border: '1.5px solid #1E2640',
                        color: '#fff', fontSize: '13px', fontFamily: 'var(--font-mono)', outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setDepStep(2)} style={{ padding: '14px 20px', borderRadius: '14px', border: '1px solid #1E2640', background: 'transparent', color: '#8A9BB8', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                      <i className="ti ti-arrow-left" style={{ marginRight: '6px' }}></i>Back
                    </button>
                    <button onClick={handleDepositSubmit} disabled={depLoading || !depTxId.trim()} style={{
                      flex: 1, padding: '14px', borderRadius: '14px', border: 'none',
                      background: depLoading || !depTxId.trim() ? '#1E2640' : 'linear-gradient(135deg, #F5A623, #FFE082)',
                      color: depLoading || !depTxId.trim() ? '#8A9BB8' : '#0A0C12',
                      fontSize: '15px', fontWeight: 800, cursor: depLoading || !depTxId.trim() ? 'not-allowed' : 'pointer',
                    }}>
                      {depLoading ? '⏳ Submitting…' : '✓ Submit Deposit'}
                    </button>
                  </div>
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
              <StepIndicator current={wdStep} total={3} />

              {/* STEP 1: Pick Network */}
              {wdStep === 1 && (
                <div style={{ background: '#141827', borderRadius: '20px', border: '1px solid #1E2640', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <button onClick={() => setWdType(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #1E2640', borderRadius: '50px', color: '#8A9BB8', padding: '6px 10px', fontSize: '12px', cursor: 'pointer' }}>
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
                  <button onClick={() => setWdStep(2)} style={{
                    width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
                    background: 'linear-gradient(135deg, #F5A623, #FFE082)', color: '#0A0C12',
                    fontSize: '15px', fontWeight: 800, cursor: 'pointer',
                  }}>Next <i className="ti ti-arrow-right" style={{ marginLeft: '6px' }}></i></button>
                </div>
              )}

              {/* STEP 2: Amount + Address */}
              {wdStep === 2 && (
                <div style={{ background: '#141827', borderRadius: '20px', border: '1px solid #1E2640', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <button onClick={() => setWdStep(1)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #1E2640', borderRadius: '50px', color: '#8A9BB8', padding: '6px 10px', fontSize: '12px', cursor: 'pointer' }}>
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
                      style={{
                        width: '100%', boxSizing: 'border-box', padding: '13px 16px',
                        borderRadius: '12px', background: '#0B0E1A', border: '1.5px solid #1E2640',
                        color: '#fff', fontSize: '13px', fontFamily: 'var(--font-mono)', outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ position: 'relative', marginBottom: '16px' }}>
                    <label style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 600, display: 'block', marginBottom: '8px' }}>AMOUNT (USD)</label>
                    <span style={{ position: 'absolute', left: '16px', top: '42px', transform: 'translateY(-50%)', fontSize: '18px', fontWeight: 700, color: '#8A9BB8' }}>$</span>
                    <input
                      type="number" step="0.01" min={minWd}
                      value={wdAmt} onChange={e => setWdAmt(e.target.value)}
                      placeholder="0.00"
                      style={{
                        width: '100%', boxSizing: 'border-box', padding: '16px 16px 16px 36px',
                        background: '#0B0E1A', border: '1.5px solid #1E2640', borderRadius: '14px',
                        color: '#fff', fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', outline: 'none',
                      }}
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
                    <button onClick={() => setWdStep(1)} style={{ padding: '14px 20px', borderRadius: '14px', border: '1px solid #1E2640', background: 'transparent', color: '#8A9BB8', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                      <i className="ti ti-arrow-left" style={{ marginRight: '6px' }}></i>Back
                    </button>
                    <button onClick={() => {
                      if (wdAmtNum < minWd) { setError(`Minimum withdrawal is $${minWd}`); return; }
                      if (wdAmtNum > available) { setError(`Max available: $${fmt(available)}`); return; }
                      if (!wdAddr.trim()) { setError('Enter a wallet address'); return; }
                      setWdStep(3);
                    }} style={{
                      flex: 1, padding: '14px', borderRadius: '14px', border: 'none',
                      background: wdAmtNum >= minWd && wdAmtNum <= available && wdAddr.trim() ? 'linear-gradient(135deg, #F5A623, #FFE082)' : '#1E2640',
                      color: wdAmtNum >= minWd && wdAmtNum <= available && wdAddr.trim() ? '#0A0C12' : '#8A9BB8',
                      fontSize: '15px', fontWeight: 800, cursor: wdAmtNum >= minWd && wdAmtNum <= available && wdAddr.trim() ? 'pointer' : 'not-allowed',
                    }}>Next <i className="ti ti-arrow-right" style={{ marginLeft: '6px' }}></i></button>
                  </div>
                </div>
              )}

              {/* STEP 3: Confirmation */}
              {wdStep === 3 && (
                <div style={{ background: '#141827', borderRadius: '20px', border: '1px solid #1E2640', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <button onClick={() => setWdStep(2)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #1E2640', borderRadius: '50px', color: '#8A9BB8', padding: '6px 10px', fontSize: '12px', cursor: 'pointer' }}>
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
                    <button onClick={() => setWdStep(2)} style={{ padding: '14px 20px', borderRadius: '14px', border: '1px solid #1E2640', background: 'transparent', color: '#8A9BB8', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                      <i className="ti ti-arrow-left" style={{ marginRight: '6px' }}></i>Back
                    </button>
                    <button onClick={handleWithdrawSubmit} disabled={wdLoading} style={{
                      flex: 1, padding: '14px', borderRadius: '14px', border: 'none',
                      background: wdLoading ? '#1E2640' : 'linear-gradient(135deg, #F5A623, #FFE082)',
                      color: wdLoading ? '#8A9BB8' : '#0A0C12',
                      fontSize: '15px', fontWeight: 800, cursor: wdLoading ? 'not-allowed' : 'pointer',
                    }}>
                      {wdLoading ? '⏳ Processing…' : '✓ Confirm Withdrawal'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default WalletCard;
