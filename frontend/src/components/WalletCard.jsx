import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

// ─── External wallet options for manual deposit ────────────────
const WALLET_OPTIONS = [
  { id: 'binance',  label: 'Binance Pay',    icon: '🔶', color: '#F0B90B',
    steps: [
      'Choose Binance Pay in your Binance app or website',
      'Send payout directly to this admin email: birukf37@gmail.com',
      'Enter your sending Binance Email & Username + Amount below',
      'Click Deposit to automatically log proof and open Binance Pay'
    ]
  },
  { id: 'bybit',   label: 'Bybit Pay',           icon: '🟡', color: '#F7A600',
    steps: [
      'Choose internal asset transfer/send on Bybit',
      'Send payout directly to this admin email: birukf37@gmail.com',
      'Enter your sending Bybit Email & Username + Amount below',
      'Click Deposit to automatically log proof and open Bybit Funding'
    ]
  },
  { id: 'telegram',label: 'Telegram Wallet', icon: '✈️', color: '#2AABEE',
    steps: ['Open Telegram → Wallet bot', 'Tap Send → enter EthioSwap address', 'Confirm & screenshot the confirmation'] },
  { id: 'other',   label: 'Other',           icon: '💳', color: '#8B92A8',
    steps: ['Send USDT/USD to your EthioSwap address', 'Note your transaction ID / reference', 'Submit it below'] },
];

// ─── On-chain provider info ────────────────────────────────────
const ON_CHAIN_PROVIDERS = [
  { name: 'NOWPayments',    fee: '0% FEE (Platform Free)', free: 'FEE FREE - Platform charges waived by admin', url: 'https://nowpayments.io', best: true },
  { name: 'Coinbase Commerce', fee: '0% FEE (Always Free)', free: 'Always free for receiving', url: 'https://commerce.coinbase.com' },
  { name: 'TronGrid (TRC20 USDT)', fee: '0% FEE (Zero Platform Fee)', free: 'Zero network markup cost', url: 'https://trongrid.io' },
];

const StatusBadge = ({ status }) => {
  const m = {
    pending:  { color: 'var(--status-warning-text)', bg: 'var(--status-warning-bg)', label: '⏳ Pending' },
    approved: { color: 'var(--status-success-text)', bg: 'var(--status-success-bg)', label: '✓ Approved' },
    rejected: { color: 'var(--status-danger-text)',  bg: 'var(--status-danger-bg)',  label: '✗ Rejected' },
  }[status] || { color: 'var(--text-3)', bg: 'var(--bg-elevated)', label: status };
  return <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '99px', background: m.bg, color: m.color }}>{m.label}</span>;
};

// Helper to compress and convert File/Blob to compressed base64 JPEG
const toBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = (event) => {
    const img = new Image();
    img.src = event.target.result;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 640;
      const MAX_HEIGHT = 640;
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

      // Compress to JPEG with 0.5 quality to stay well below Convex's 1MB limit (approx 40KB)
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.5);
      resolve(compressedDataUrl);
    };
    img.onerror = (err) => reject(new Error("Failed to load image for compression"));
  };
  reader.onerror = (err) => reject(err);
});

const WalletCard = () => {
  const { user, wallet, withdrawETH, myDepositReqs, myTransactions, createDepositRequest, savePaymentAccounts, setError, setSuccess, systemSettings } = useAuth();

  const [activeSection, setActiveSection] = useState('balance');
  const [copied, setCopied] = useState(false);

  // Withdraw
  const [destAddress, setDestAddress] = useState('');
  const [withdrawAmt, setWithdrawAmt]  = useState('');
  const [withdrawing, setWithdrawing]  = useState(false);
  const [txDetails,   setTxDetails]    = useState(null);
  
  // Dual withdrawal states
  const [withdrawMethod, setWithdrawMethod] = useState('onchain');
  const [selectedExchangeAccount, setSelectedExchangeAccount] = useState(null);
  
  // Connect Exchange Profile states
  const [linkExchangeName, setLinkExchangeName] = useState('Binance Pay');
  const [linkExchangeIdType, setLinkExchangeIdType] = useState('Email');
  const [linkExchangeIdVal, setLinkExchangeIdVal] = useState('');
  const [linkExchangeHolder, setLinkExchangeHolder] = useState('');
  const [linkingExchange, setLinkingExchange] = useState(false);

  // Deposit method: 'A' = manual, 'B' = onchain
  const [depMethod,     setDepMethod]     = useState('A');
  const [depWalletType, setDepWalletType] = useState('binance');
  const [depAmount,     setDepAmount]     = useState('');
  const [depReference,  setDepReference]  = useState('');
  const [depSubmitting, setDepSubmitting] = useState(false);
  const [senderEmail,    setSenderEmail]    = useState('');
  const [senderUsername, setSenderUsername] = useState('');
  const [screenshotBase64, setScreenshotBase64] = useState('');
  const [screenshotPreview, setScreenshotPreview] = useState('');

  if (!wallet) return (
    <div className="card" style={{ height: '120px' }}>
      <div className="skeleton" style={{ height: '100%', borderRadius: '8px' }} />
    </div>
  );

  const rate      = systemSettings?.etbRatePerDollar ?? 190;
  const available = wallet.ethAvailable ?? (wallet.ethBalance - (wallet.ethLocked || 0));
  const etbTotal  = wallet.ethBalance * rate;

  const handleCopy = () => {
    navigator.clipboard.writeText(wallet.ethAddress);
    setCopied(true); setSuccess('Address copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWithdraw = async (e) => {
    e.preventDefault(); setTxDetails(null);
    const amt = parseFloat(withdrawAmt);
    if (isNaN(amt) || amt <= 0) { setError('Enter a valid amount.'); return; }
    if (amt < 10) { setError('Minimum withdrawal amount is $10.00 USD.'); return; }
    if (amt > available)         { setError(`Max: $${available.toFixed(2)}`); return; }
    
    let dest = destAddress;
    if (withdrawMethod === 'exchange') {
      if (!selectedExchangeAccount) {
        setError('Please select or connect a Binance Pay or Bybit Pay account first.');
        return;
      }
      dest = `${selectedExchangeAccount.bankName} | ${selectedExchangeAccount.accountNumber} (${selectedExchangeAccount.holderName})`;
    } else {
      if (!destAddress.startsWith('0x') && !destAddress.startsWith('T')) {
        setError('Invalid on-chain address.');
        return;
      }
    }

    setWithdrawing(true);
    const result = await withdrawETH(amt, dest);
    setWithdrawing(false);
    if (result?.success) { setTxDetails(result); setWithdrawAmt(''); setDestAddress(''); }
  };

  const handleSubmitDeposit = async (e) => {
    e.preventDefault();
    const isBinanceOrBybit = depWalletType === 'binance' || depWalletType === 'bybit';
    if (!depAmount || parseFloat(depAmount) <= 0) { setError('Enter amount.'); return; }
    if (parseFloat(depAmount) < 10) { setError('Minimum deposit amount is $10.00 USD.'); return; }
    
    if (isBinanceOrBybit) {
      if (!senderEmail.trim() || !senderUsername.trim()) {
        setError('Please enter both your sending account email and username.');
        return;
      }
    } else {
      if (!depReference.trim()) { setError('Enter TX reference.'); return; }
    }

    if (!screenshotBase64) {
      setError('Please upload a screenshot of your payment receipt as transaction proof.');
      return;
    }

    setDepSubmitting(true);
    
    const finalRef = isBinanceOrBybit 
      ? `Sender Email: ${senderEmail.trim()} | Username: ${senderUsername.trim()}`
      : depReference.trim();

    await createDepositRequest(parseFloat(depAmount), depWalletType, finalRef, screenshotBase64);
    
    // Automatically open checkout/transfer pages in new tabs
    if (depWalletType === 'binance') {
      window.open('https://pay.binance.com', '_blank');
    } else if (depWalletType === 'bybit') {
      window.open('https://www.bybit.com/en/assets/funding', '_blank');
    }

    setSuccess('Deposit request submitted! Admin will verify and credit your wallet.');
    setDepAmount(''); 
    setDepReference('');
    setSenderEmail('');
    setSenderUsername('');
    setScreenshotBase64('');
    setScreenshotPreview('');
    setDepSubmitting(false);
  };

  const pendingCount = myDepositReqs.filter(r => r.status === 'pending').length;
  const selWallet = WALLET_OPTIONS.find(w => w.id === depWalletType) || WALLET_OPTIONS[0];

  const withdrawals = (myTransactions || [])
    .filter(t => t.type === 'withdrawal')
    .map(t => ({
      id: t.id || t._id?.toString() || Math.random().toString(),
      amountUSD: t.amountUSD,
      walletType: 'On-Chain Withdrawal',
      createdAt: t.createdAt,
      status: 'approved', // withdrawals are executed instantly
      type: 'withdrawal',
      note: t.note
    }));

  const depositsMapped = (myDepositReqs || []).map(r => ({
    id: r.id || r._id?.toString() || Math.random().toString(),
    amountUSD: r.amountUSD,
    walletType: r.walletType,
    createdAt: r.createdAt,
    status: r.status,
    type: 'deposit',
    adminNote: r.adminNote
  }));

  const combinedHistory = [...depositsMapped, ...withdrawals].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const linkedExchangeAccounts = (user?.paymentAccounts || [])
    .filter(acc => acc.bankName === 'Binance Pay' || acc.bankName === 'Bybit Pay');

  const tabs = [
    { id: 'balance',  label: '💰', sub: 'Balance' },
    { id: 'deposit',  label: '⬇', sub: 'Deposit' },
    { id: 'withdraw', label: '⬆', sub: 'Withdraw' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* ── Balance Hero ──────────────────────────────────────── */}
      <div className="fade-in-1" style={{
        background: 'linear-gradient(135deg, rgba(17,19,24,0.95) 0%, rgba(200,150,44,0.08) 100%)',
        border: '1px solid rgba(200,150,44,0.3)', borderRadius: '22px', padding: '22px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '150px', height: '150px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(200,150,44,0.15),transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-20px', left: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,212,170,0.08),transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ fontSize: '10px', color: 'var(--gold-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>EthioSwap Wallet</div>
        <div style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1, marginBottom: '2px' }}>
          <span className="gradient-text-gold">${wallet.ethBalance.toFixed(2)}</span>
          <span style={{ fontSize: '18px', color: 'var(--text-3)', fontWeight: 500, marginLeft: '6px' }}>USD</span>
        </div>
        <div style={{ fontSize: '16px', color: 'var(--teal-light)', fontWeight: 600, marginBottom: '18px' }}>
          ≈ {Math.round(etbTotal).toLocaleString()} ETB
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {[
            { label: 'Available', usd: available, etb: available * rate },
            { label: 'In Escrow', usd: wallet.ethLocked || 0, etb: (wallet.ethLocked || 0) * rate, accent: true },
          ].map(c => (
            <div key={c.label} style={{ background: 'rgba(10,12,18,0.5)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>{c.label}</div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: c.accent ? 'var(--gold-light)' : 'var(--text-1)' }}>${c.usd.toFixed(2)}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>≈ {Math.round(c.etb).toLocaleString()} ETB</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab toggle ────────────────────────────────────────── */}
      <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '4px', gap: '2px' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveSection(t.id)} style={{
            flex: 1, padding: '9px 4px', borderRadius: '10px', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
            background: activeSection === t.id ? 'var(--bg-elevated)' : 'transparent',
            transition: 'all 0.15s ease',
          }}>
            <span style={{ fontSize: '16px', lineHeight: 1 }}>{t.label}</span>
            <span style={{ fontSize: '10px', fontWeight: 600, color: activeSection === t.id ? 'var(--gold-light)' : 'var(--text-3)' }}>{t.sub}</span>
          </button>
        ))}
      </div>

      {/* ══ BALANCE TAB ════════════════════════════════════════ */}
      {activeSection === 'balance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* QR + Address */}
          <div className="card fade-in-2">
            <div className="section-title">Your Deposit Address</div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ background: 'white', padding: '6px', borderRadius: '8px', flexShrink: 0 }}>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=80&data=${wallet.ethAddress}`} alt="QR" style={{ width: '80px', height: '80px', display: 'block' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '6px' }}>Send USD here (any network)</div>
                <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', fontFamily: 'monospace', fontSize: '9.5px', color: 'var(--text-2)', wordBreak: 'break-all', lineHeight: 1.5 }}>
                  {wallet.ethAddress}
                </div>
                <button onClick={handleCopy} style={{ marginTop: '6px', background: 'none', border: 'none', color: copied ? 'var(--status-success-text)' : 'var(--gold-light)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  {copied ? '✓ Copied!' : '📋 Copy Address'}
                </button>
              </div>
            </div>
          </div>

          {/* Unified Deposit & Withdrawal History */}
          {combinedHistory.length > 0 && (
            <div className="card fade-in-3">
              <div className="section-title">📊 Deposit & Withdrawal History</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {combinedHistory.slice(0, 10).map(item => {
                  const isDeposit = item.type === 'deposit';
                  const isPending = item.status === 'pending';
                  const isRejected = item.status === 'rejected';
                  
                  return (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '8px', 
                          background: isDeposit ? 'rgba(0, 212, 170, 0.12)' : 'rgba(99, 102, 241, 0.12)', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px'
                        }}>
                          {isDeposit ? '⬇️' : '↗️'}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-1)' }}>
                              {isDeposit ? 'Deposit' : 'Withdrawal'}
                            </span>
                            <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                              · {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-2)', marginTop: '2px' }}>
                            {isDeposit ? `via ${item.walletType}` : 'to external address'}
                          </div>
                          {isRejected && item.adminNote && (
                            <div style={{ fontSize: '9px', color: 'var(--status-danger-text)', marginTop: '2px' }}>
                              Reason: {item.adminNote}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: isDeposit ? 'var(--teal-light)' : 'var(--gold-light)' }}>
                          {isDeposit ? '+' : '-'}${item.amountUSD.toFixed(2)} USD
                        </div>
                        <StatusBadge status={item.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ══ DEPOSIT TAB ════════════════════════════════════════ */}
      {activeSection === 'deposit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Method chooser — two big cards */}
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Choose Deposit Method
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* Option A — Manual */}
            <div onClick={() => setDepMethod('A')} className={`option-card ${depMethod === 'A' ? 'selected-gold' : ''}`}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🤝</div>
              <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-1)', marginBottom: '4px' }}>Manual</div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '10px', lineHeight: 1.4 }}>
                Send from any wallet, submit TX proof, admin reviews
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className="option-badge option-badge-manual">⏱ 5–30 min</span>
                <span className="option-badge option-badge-free">✓ No fee</span>
              </div>
            </div>

            {/* Option B — On-chain */}
            <div onClick={() => setDepMethod('B')} className={`option-card ${depMethod === 'B' ? 'selected-indigo' : ''}`}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>⛓️</div>
              <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-1)', marginBottom: '4px' }}>On-Chain</div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '10px', lineHeight: 1.4 }}>
                Auto-detected via blockchain — no admin needed
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                 <span className="option-badge option-badge-fast">⚡ 1–5 min</span>
                 <span className="option-badge option-badge-free">✓ FREE</span>
                 <span className="option-badge option-badge-soon">🔧 Setup needed</span>
              </div>
            </div>
          </div>

          {/* ─── OPTION A — Manual form ─────────────────────── */}
          {depMethod === 'A' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeInUp 0.25s ease' }}>
              {/* Wallet type selector */}
              <div>
                <div className="section-title">From which wallet?</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {WALLET_OPTIONS.map(w => (
                    <button key={w.id} type="button" onClick={() => setDepWalletType(w.id)} style={{ padding: '12px', borderRadius: '12px', border: `2px solid ${depWalletType === w.id ? w.color : 'var(--border)'}`, background: depWalletType === w.id ? `${w.color}15` : 'var(--bg-elevated)', cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '22px' }}>{w.icon}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: depWalletType === w.id ? 'var(--text-1)' : 'var(--text-3)' }}>{w.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Interactive Admin Payment Card */}
              {(depWalletType === 'binance' || depWalletType === 'bybit') && (
                <div style={{ background: 'linear-gradient(135deg, rgba(17,19,24,0.98) 0%, rgba(200,150,44,0.05) 100%)', border: '1px solid rgba(200,150,44,0.25)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--gold-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Recipient Account</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 600 }}>0.5% Deposit Fee</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(10,12,18,0.6)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px' }}>
                      <span style={{ fontSize: '14px' }}>✉️</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-1)', fontFamily: 'monospace' }}>birukf37@gmail.com</span>
                    </div>
                    <button type="button" onClick={() => {
                      navigator.clipboard.writeText('birukf37@gmail.com');
                      setSuccess('Admin payment email copied!');
                    }} style={{ flexShrink: 0, padding: '11px 14px', background: 'var(--gold-bg)', border: '1px solid rgba(200,150,44,0.3)', borderRadius: '10px', color: 'var(--gold-light)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      📋 Copy
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <button type="button" onClick={() => {
                      if (depWalletType === 'binance') {
                        window.open('https://pay.binance.com', '_blank');
                      } else {
                        window.open('https://www.bybit.com/en/assets/funding', '_blank');
                      }
                    }} className="btn btn-teal btn-full" style={{ padding: '12px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      {depWalletType === 'binance' ? '🔶 Pay via Binance Pay App ↗' : '🟡 Pay via Bybit Funding ↗'}
                    </button>
                    <div style={{ fontSize: '10px', color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.4 }}>
                      Send USDT (TRC20) or any supported asset, take a screenshot, and submit proof below.
                    </div>
                  </div>
                </div>
              )}

              {/* Steps for other wallets */}
              {(depWalletType !== 'binance' && depWalletType !== 'bybit') && (
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold-light)', marginBottom: '10px' }}>
                    {selWallet.icon} Steps for {selWallet.label}:
                  </div>
                  <div className="timeline">
                    {selWallet.steps.map((s, i) => (
                      <div key={i} className="timeline-item">
                        <div className="timeline-dot active" style={{ background: 'var(--gold-bg)', border: '1px solid var(--border-active)', color: 'var(--gold-light)' }}>{i + 1}</div>
                        <div className="timeline-line" />
                        <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.5, paddingTop: '4px' }}>{s}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Address card */}
              <div className="card" style={{ padding: '14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '6px' }}>Your EthioSwap Receiving Address:</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ flex: 1, fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-2)', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', wordBreak: 'break-all', lineHeight: 1.5 }}>
                    {wallet.ethAddress}
                  </div>
                  <button type="button" onClick={handleCopy} style={{ flexShrink: 0, padding: '10px', background: 'var(--gold-bg)', border: '1px solid rgba(200,150,44,0.3)', borderRadius: '8px', color: 'var(--gold-light)', fontSize: '16px', cursor: 'pointer' }}>
                    {copied ? '✓' : '📋'}
                  </button>
                </div>
              </div>

              {/* Submit form */}
              <form onSubmit={handleSubmitDeposit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* Form Alert Info */}
                <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--status-success-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🛡️ Securing Your Funds</span>
                    <span style={{ fontSize: '9px', padding: '1px 6px', background: 'rgba(16,185,129,0.15)', borderRadius: '99px' }}>0.5% FEE</span>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--status-success-text)', lineHeight: 1.5, margin: 0 }}>
                    Please fill out the form after transfer. Once approved, the funds minus a 0.5% fee will be credited to your available balance. Fees are routed directly to the admin account.
                  </p>
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Amount Sent (USD)</label>
                  <input type="number" step="0.01" required className="input" placeholder="e.g. 100" value={depAmount} onChange={e => setDepAmount(e.target.value)} />
                  {depAmount && !isNaN(parseFloat(depAmount)) && (
                    <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>
                      ≈ {Math.round(parseFloat(depAmount) * rate).toLocaleString()} ETB · Credited (net): ${(parseFloat(depAmount) * 0.995).toFixed(2)} USD (0.5% fee: ${(parseFloat(depAmount) * 0.005).toFixed(2)} USD)
                    </div>
                  )}
                </div>

                { (depWalletType === 'binance' || depWalletType === 'bybit') ? (
                  <>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">Your Sending Account Email</label>
                      <input type="email" required className="input" placeholder="e.g. yourname@gmail.com" value={senderEmail} onChange={e => setSenderEmail(e.target.value)} />
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">Your Sending Account Username / Nickname</label>
                      <input type="text" required className="input" placeholder="e.g. yourname123" value={senderUsername} onChange={e => setSenderUsername(e.target.value)} />
                    </div>
                  </>
                ) : (
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">TX ID / Reference</label>
                    <input type="text" required className="input" placeholder="Paste transaction hash, order ID…" value={depReference} onChange={e => setDepReference(e.target.value)} />
                  </div>
                )}

                {/* Screenshot Uploader Component */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="input-label">Upload Payment Receipt / Screenshot</label>
                  {screenshotPreview ? (
                    <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-elevated)', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <img src={screenshotPreview} alt="Screenshot preview" style={{ maxWidth: '100%', maxHeight: '160px', borderRadius: '8px', objectFit: 'contain' }} />
                      <button type="button" onClick={() => {
                        setScreenshotBase64('');
                        setScreenshotPreview('');
                      }} style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: 'var(--status-danger-text)', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                        🗑️ Remove Photo
                      </button>
                    </div>
                  ) : (
                    <label style={{ background: 'var(--bg-elevated)', border: '2px dashed var(--border)', borderRadius: '12px', padding: '24px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'border-color 0.2s' }}>
                      <span style={{ fontSize: '28px' }}>📸</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-1)' }}>Choose screenshot or transaction proof</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-3)', textAlign: 'center' }}>Receipt will be compressed securely under 50KB</span>
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        try {
                          const base64 = await toBase64(file);
                          setScreenshotBase64(base64);
                          setScreenshotPreview(URL.createObjectURL(file));
                        } catch (err) {
                          setError('Failed to compress image. Please select another file.');
                        }
                      }} />
                    </label>
                  )}
                </div>

                <button type="submit" disabled={depSubmitting} className="btn btn-gold btn-full" style={{ padding: '14px', marginTop: '8px' }}>
                  {depSubmitting ? '⏳ Submitting…' : '📤 Submit Deposit Request'}
                </button>
              </form>
            </div>
          )}

          {/* ─── OPTION B — On-chain info ────────────────────── */}
          {depMethod === 'B' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeInUp 0.25s ease' }}>

              {/* Coming soon banner */}
              <div style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(99,102,241,0.04))', border: '1px solid var(--indigo-border)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>⛓️</div>
                <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--indigo-light)', marginBottom: '6px' }}>
                  Auto On-Chain Detection
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.6 }}>
                  Deposits are auto-detected from the blockchain — no admin approval needed.<br/>
                  Your wallet is credited within <strong style={{ color: 'var(--teal-light)' }}>1–5 minutes</strong> of sending.
                </div>
              </div>

              {/* How it works */}
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--indigo-light)', marginBottom: '10px' }}>⚡ How it works:</div>
                <div className="timeline">
                  {[
                    { step: 'Send USDT (TRC20) to your EthioSwap address', done: true },
                    { step: 'Blockchain confirms in ~1–2 min (Tron is fast)', done: true },
                    { step: 'Our system detects the TX via NOWPayments webhook', done: false },
                    { step: 'Wallet credited automatically — no admin needed', done: false },
                  ].map((s, i) => (
                    <div key={i} className="timeline-item">
                      <div className={`timeline-dot ${s.done ? 'done' : ''}`} style={!s.done ? { borderColor: 'var(--indigo-border)', color: 'var(--indigo-light)', background: 'var(--indigo-bg)' } : {}}>{s.done ? '✓' : (i + 1)}</div>
                      <div className="timeline-line" />
                      <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.5, paddingTop: '4px' }}>{s.step}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fee comparison */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', marginBottom: '10px' }}>💡 Best free/low-fee providers</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {ON_CHAIN_PROVIDERS.map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 12px', background: p.best ? 'linear-gradient(135deg,rgba(99,102,241,0.08),transparent)' : 'var(--bg-elevated)', border: `1px solid ${p.best ? 'var(--indigo-border)' : 'var(--border)'}`, borderRadius: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <span style={{ fontWeight: 700, fontSize: '12px' }}>{p.name}</span>
                          {p.best && <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', background: 'var(--indigo-bg)', color: 'var(--indigo-light)', borderRadius: '99px', border: '1px solid var(--indigo-border)' }}>BEST</span>}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--status-success-text)' }}>✓ {p.free}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-2)' }}>{p.fee}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Setup time warning */}
              <div style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid var(--status-warning-border)', borderRadius: '12px', padding: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--status-warning-text)', marginBottom: '6px' }}>🔧 Setup Required (One-time)</div>
                <p style={{ fontSize: '11px', color: 'var(--status-warning-text)', lineHeight: 1.6, margin: 0 }}>
                  This feature needs a server-side webhook endpoint to be configured by the platform admin.<br/>
                  <strong>Estimated setup time: 2–4 hours</strong> (register NOWPayments → add webhook URL → enable in admin).<br/>
                  Contact admin to enable this feature.
                </p>
              </div>

              {/* Use Option A in the meantime */}
              <button onClick={() => setDepMethod('A')} className="btn btn-gold btn-full" style={{ padding: '14px' }}>
                Use Manual Deposit (Option A) →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══ WITHDRAW TAB ══════════════════════════════════════ */}
      {activeSection === 'withdraw' && (
        <div className="card fade-in-2">
          <div className="section-title">Withdraw USD</div>
          <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '16px' }}>
            Send USD to your Binance, Bybit, or external wallet. (Min: $10.00 USD)
          </p>

          {/* Withdrawal Destination Type Selector */}
          <div style={{ display: 'flex', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', padding: '3px', marginBottom: '14px', gap: '2px' }}>
            {[
              { id: 'onchain', label: '⛓️ On-Chain USDT' },
              { id: 'exchange', label: '🔗 Connect / Pay Exchange' }
            ].map(m => (
              <button key={m.id} type="button" onClick={() => setWithdrawMethod(m.id)} style={{
                flex: 1, padding: '8px 4px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '11px', fontWeight: 700, transition: 'all 0.15s',
                background: withdrawMethod === m.id ? 'var(--bg-base)' : 'transparent',
                color: withdrawMethod === m.id ? 'var(--gold-light)' : 'var(--text-3)',
                boxShadow: withdrawMethod === m.id ? 'inset 0 0 0 1px var(--border)' : 'none'
              }}>
                {m.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {withdrawMethod === 'onchain' ? (
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Destination Address</label>
                <input className="input" type="text" placeholder="T… (TRC20) or 0x… (ERC20)" value={destAddress} onChange={e => setDestAddress(e.target.value)} required />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'fadeInUp 0.15s ease' }}>
                <label className="input-label">Select Connected Account</label>
                {linkedExchangeAccounts.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {linkedExchangeAccounts.map(acc => (
                      <div key={acc.id} onClick={() => setSelectedExchangeAccount(acc)} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                        background: selectedExchangeAccount?.id === acc.id ? 'linear-gradient(135deg, rgba(200,150,44,0.08), transparent)' : 'var(--bg-elevated)',
                        border: `1.5px solid ${selectedExchangeAccount?.id === acc.id ? 'var(--gold)' : 'var(--border)'}`,
                        transition: 'all 0.15s ease'
                      }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '14px' }}>{acc.bankName === 'Binance Pay' ? '🔶' : '🟡'}</span>
                            <span style={{ fontWeight: 700, fontSize: '12px' }}>{acc.bankName}</span>
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>{acc.accountNumber}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-2)' }}>{acc.holderName}</div>
                          {selectedExchangeAccount?.id === acc.id && <span style={{ color: 'var(--gold-light)', fontSize: '11px', fontWeight: 700 }}>✓ Selected</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ background: 'var(--bg-base)', border: '1px dashed var(--border)', borderRadius: '12px', padding: '16px', textAlign: 'center', fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.4 }}>
                    No connected exchange profiles yet. Please link your Binance or Bybit account below to withdraw.
                  </div>
                )}

                {/* Inline form to link an exchange account */}
                <div style={{ marginTop: '6px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    🔗 Link New Binance / Bybit Account
                  </div>
                  
                  <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Platform Selector */}
                    <div>
                      <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '4px' }}>Exchange Platform</div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {['Binance Pay', 'Bybit Pay'].map(p => (
                          <button key={p} type="button" onClick={() => setLinkExchangeName(p)} style={{
                            flex: 1, padding: '6px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '10px', fontWeight: 700, transition: 'all 0.15s',
                            background: linkExchangeName === p ? 'var(--bg-base)' : 'transparent',
                            color: linkExchangeName === p ? 'var(--gold-light)' : 'var(--text-3)',
                            boxShadow: linkExchangeName === p ? 'inset 0 0 0 1px var(--border)' : 'none'
                          }}>
                            {p === 'Binance Pay' ? '🔶 Binance' : '🟡 Bybit'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Linking identifier selector */}
                    <div>
                      <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '4px' }}>Link Profile via</div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {['Email', 'Username'].map(t => (
                          <button key={t} type="button" onClick={() => setLinkExchangeIdType(t)} style={{
                            flex: 1, padding: '6px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '10px', fontWeight: 700, transition: 'all 0.15s',
                            background: linkExchangeIdType === t ? 'var(--bg-base)' : 'transparent',
                            color: linkExchangeIdType === t ? 'var(--gold-light)' : 'var(--text-3)',
                            boxShadow: linkExchangeIdType === t ? 'inset 0 0 0 1px var(--border)' : 'none'
                          }}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Link identifier input */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-3)' }}>
                        Exchange {linkExchangeIdType} ID
                      </span>
                      <input className="input" type={linkExchangeIdType === 'Email' ? 'email' : 'text'} placeholder={linkExchangeIdType === 'Email' ? 'yourname@gmail.com' : 'yourname123'} value={linkExchangeIdVal} onChange={e => setLinkExchangeIdVal(e.target.value)} style={{ padding: '8px 10px', fontSize: '11px', borderRadius: '8px' }} />
                    </div>

                    {/* Holder nickname */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-3)' }}>
                        Nickname / Holder Name
                      </span>
                      <input className="input" type="text" placeholder="e.g. Nickname" value={linkExchangeHolder} onChange={e => setLinkExchangeHolder(e.target.value)} style={{ padding: '8px 10px', fontSize: '11px', borderRadius: '8px' }} />
                    </div>

                    <button type="button" disabled={linkingExchange} onClick={async () => {
                      if (!linkExchangeIdVal.trim() || !linkExchangeHolder.trim()) {
                        setError('Please fill out exchange ID and nickname.');
                        return;
                      }
                      setLinkingExchange(true);
                      const newAcc = {
                        id: 'acc_' + Math.random().toString(36).substring(2, 9),
                        bankName: linkExchangeName,
                        accountNumber: `${linkExchangeIdType}: ${linkExchangeIdVal.trim()}`,
                        holderName: linkExchangeHolder.trim()
                      };
                      const currentAccounts = user?.paymentAccounts || [];
                      try {
                        await savePaymentAccounts({
                          userId: user.id,
                          accounts: [...currentAccounts, newAcc]
                        });
                        setSuccess('Exchange account linked successfully!');
                        setSelectedExchangeAccount(newAcc);
                        setLinkExchangeIdVal('');
                        setLinkExchangeHolder('');
                      } catch (err) {
                        setError(err.message || 'Failed to link account.');
                      } finally {
                        setLinkingExchange(false);
                      }
                    }} className="btn btn-gold btn-full" style={{ padding: '10px', fontSize: '11px', fontWeight: 700, marginTop: '4px' }}>
                      {linkingExchange ? 'Connecting…' : '🔗 Save & Link Exchange Account'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Amount (USD)</label>
              <input className="input" type="number" step="0.01" min="10" placeholder={`Max: $${available.toFixed(2)}`} value={withdrawAmt} onChange={e => setWithdrawAmt(e.target.value)} required />
              {withdrawAmt && <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>≈ {Math.round(parseFloat(withdrawAmt) * rate).toLocaleString()} ETB</div>}
            </div>

            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Platform Withdrawal Fee</span>
                <span style={{ fontWeight: 600, color: 'var(--status-danger-text)' }}>1.0% (routed to admin)</span>
              </div>
              {withdrawAmt && !isNaN(parseFloat(withdrawAmt)) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-3)' }}>
                  <span>You receive (net)</span>
                  <span>${(parseFloat(withdrawAmt) * 0.99).toFixed(2)} USD</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Network fee</span>
                <span style={{ fontWeight: 500 }}>{withdrawMethod === 'onchain' ? '~$0.10 (TRC20) / $0.50 (ERC20)' : '✓ FREE'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-3)' }}>Confirmation time</span>
                <span style={{ fontWeight: 500 }}>{withdrawMethod === 'onchain' ? '~15 seconds (Tron) / ~2 min (ETH)' : '~5–15 mins'}</span>
              </div>
            </div>

            <button type="submit" disabled={withdrawing} className="btn btn-gold btn-full" style={{ padding: '14px' }}>
              {withdrawing ? 'Broadcasting…' : 'Withdraw USD ↗'}
            </button>
          </form>

          {txDetails && (
            <div style={{ marginTop: '14px', background: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--status-success-text)', marginBottom: '6px' }}>✓ Withdrawal Broadcast!</div>
              <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-2)', wordBreak: 'break-all', marginBottom: '8px' }}>{txDetails.txHash}</div>
              {txDetails.txHash.startsWith('0x') && (
                <a href={`https://tronscan.org/#/transaction/${txDetails.txHash}`} target="_blank" rel="noreferrer" style={{ color: 'var(--gold-light)', fontSize: '12px', fontWeight: 600 }}>View on TronScan ↗</a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WalletCard;
