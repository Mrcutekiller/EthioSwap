import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
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
  const { user, wallet, withdrawETH, myDepositReqs, myWithdrawalReqs, myTransactions, createDepositRequest, savePaymentAccounts, sendById, setError, setSuccess, systemSettings, confirmOnchainDeposit } = useAuth();

  const [activeSection, setActiveSection] = useState('balance');
  const [checkingDeposit, setCheckingDeposit] = useState(false);
  const [onchainTxHash, setOnchainTxHash] = useState('');

  // Transaction PIN states
  const setPinMutation = useMutation(api.users.setTransactionPin);
  const [withdrawPin, setWithdrawPin] = useState('');
  const [setupPin, setSetupPin] = useState('');
  const [confirmSetupPin, setConfirmSetupPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinMsg, setPinMsg] = useState({ type: '', text: '' });
  const [copied, setCopied] = useState(false);

  // Withdraw
  const [destAddress, setDestAddress] = useState('');
  const [withdrawAmt, setWithdrawAmt]  = useState('');
  const [withdrawing, setWithdrawing]  = useState(false);
  const [txDetails,   setTxDetails]    = useState(null);
  
  // Dual withdrawal network selector
  const [withdrawNetwork, setWithdrawNetwork] = useState('trc20');
  
  // Deposit network selector & inputs
  const [depNetwork, setDepNetwork] = useState('trc20');
  const [depAmount, setDepAmount] = useState('');
  const [depSubmitting, setDepSubmitting] = useState(false);

  // Send by ID state
  const [sendRecipientId, setSendRecipientId] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [sendPin, setSendPin] = useState('');

  if (!wallet) return (
    <div className="card" style={{ height: '120px' }}>
      <div className="skeleton" style={{ height: '100%', borderRadius: '8px' }} />
    </div>
  );

  const rate      = systemSettings?.etbRatePerDollar ?? 190;
  const depositFeePercent = systemSettings?.flatFeePercent ?? 1.0;
  const depositFeeLabel = depositFeePercent > 0 ? `${depositFeePercent}% Fee` : 'No Fee';
  const available = wallet.ethAvailable ?? (wallet.ethBalance - (wallet.ethLocked || 0));
  const etbTotal  = wallet.ethBalance * rate;

  const getWithdrawalDetails = () => {
    const amt = parseFloat(withdrawAmt) || 0;
    const commPercent = systemSettings?.commissionValue ?? 1.0;
    const platformFee = Math.round((amt * commPercent / 100) * 100) / 100;
    
    let netFee = withdrawNetwork === 'trc20' ? 0.10 : 0.50;
    let methodLabel = withdrawNetwork === 'trc20' 
      ? 'flat $0.10 network fee (Tron TRC20)' 
      : 'flat $0.50 network fee (Ethereum ERC20)';
    let deliveryLabel = withdrawNetwork === 'trc20' ? '~15 sec (Tron)' : '~2-5 mins (Ethereum)';
    
    const totalFee = Math.round((platformFee + netFee) * 100) / 100;
    const amountYouWillGet = Math.round(Math.max(amt - totalFee, 0) * 100) / 100;
    
    return {
      platformFee,
      netFee,
      totalFee,
      amountYouWillGet,
      methodLabel,
      deliveryLabel,
      commPercent
    };
  };
  const wdDetails = getWithdrawalDetails();

  const handleCopy = (address) => {
    navigator.clipboard.writeText(address);
    setCopied(true); setSuccess('Address copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWithdraw = async (e) => {
    e.preventDefault(); setTxDetails(null);
    const amt = parseFloat(withdrawAmt);
    if (isNaN(amt) || amt <= 0) { setError('Enter a valid amount.'); return; }
    if (amt < 10) { setError('Minimum withdrawal amount is $10.00 USD.'); return; }
    if (amt > available)         { setError(`Max: $${available.toFixed(2)}`); return; }
    
    const dest = destAddress.trim();
    if (withdrawNetwork === 'trc20') {
      if (!dest.startsWith('T') && !dest.startsWith('t')) {
        setError('TRC20 addresses must start with T.');
        return;
      }
    } else {
      if (!dest.startsWith('0x') && !dest.startsWith('0X')) {
        setError('ERC20 addresses must start with 0x.');
        return;
      }
    }

    setWithdrawing(true);
    const result = await withdrawETH(amt, dest, user.transactionPin ? withdrawPin : undefined);
    setWithdrawing(false);
    if (result?.success) { setTxDetails(result); setWithdrawAmt(''); setDestAddress(''); setWithdrawPin(''); }
  };

  const handleSubmitDeposit = async (e) => {
    e.preventDefault();
    if (!depAmount || parseFloat(depAmount) <= 0) { setError('Enter amount.'); return; }
    if (parseFloat(depAmount) < 5) { setError('Minimum deposit amount is $5.00 USD.'); return; }
    if (!onchainTxHash.trim()) { setError('Please enter your transaction TxID.'); return; }

    setDepSubmitting(true);
    
    const result = await confirmOnchainDeposit(parseFloat(depAmount), onchainTxHash.trim());
    setDepSubmitting(false);

    if (result?.success) {
      setSuccess(`✓ On-chain deposit of $${parseFloat(depAmount).toFixed(2)} USD processed automatically and credited to your available balance!`);
      setDepAmount(''); 
      setOnchainTxHash('');
    }
  };

  const pendingCount = myDepositReqs.filter(r => r.status === 'pending').length;

  const legacyWithdrawals = (myTransactions || [])
    .filter(t => t.type === 'withdrawal')
    .map(t => ({
      id: t.id || t._id?.toString() || Math.random().toString(),
      amountUSD: t.amountUSD,
      walletType: 'On-Chain Withdrawal',
      createdAt: t.createdAt,
      status: 'approved',
      type: 'withdrawal',
      note: t.note
    }));

  const withdrawalsMapped = (myWithdrawalReqs || []).map(r => ({
    id: r.id || r._id?.toString() || Math.random().toString(),
    amountUSD: r.amountUSD,
    walletType: r.walletType,
    createdAt: r.createdAt,
    status: r.status,
    type: 'withdrawal',
    adminNote: r.adminNote,
    destinationAddress: r.destinationAddress
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

  const combinedHistory = [...depositsMapped, ...withdrawalsMapped, ...legacyWithdrawals].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const tabs = [
    { id: 'balance',  label: '💰', sub: 'Balance' },
    { id: 'deposit',  label: '⬇', sub: 'Deposit' },
    { id: 'send',     label: '↗', sub: 'Send' },
    { id: 'withdraw', label: '⬆', sub: 'Withdraw' },
    { id: 'security', label: '🔒', sub: 'Security' },
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

        <div style={{ fontSize: '10px', color: 'var(--gold-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>EthioSwap Wallet</span>
          {wallet.numericId && (
            <span style={{ background: 'rgba(200,150,44,0.15)', padding: '2px 8px', borderRadius: '99px', fontSize: '10px', letterSpacing: '0.03em' }}>
              ID: #{wallet.numericId}
            </span>
          )}
        </div>
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
          <div className="card glass fade-in-2" style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '20px' }}>
            <div className="section-title" style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '-0.01em', marginBottom: '14px' }}>Your Deposit Address</div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ background: 'white', padding: '8px', borderRadius: '12px', flexShrink: 0, boxShadow: '0 4px 20px rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100&data=${wallet.ethAddress}`} alt="QR" style={{ width: '80px', height: '80px', display: 'block' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Send USD here (any network)</div>
                <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', fontFamily: 'monospace', fontSize: '10.5px', color: 'var(--text-1)', wordBreak: 'break-all', lineHeight: 1.4, letterSpacing: '0.02em', userSelect: 'all' }}>
                  {wallet.ethAddress}
                </div>
                <button 
                  onClick={handleCopy} 
                  style={{ 
                    marginTop: '8px', 
                    background: copied ? 'var(--status-success-bg)' : 'rgba(200,150,44,0.1)', 
                    border: copied ? '1px solid var(--status-success-border)' : '1px solid rgba(200,150,44,0.2)',
                    borderRadius: '8px',
                    color: copied ? 'var(--status-success-text)' : 'var(--gold-light)', 
                    padding: '6px 12px',
                    fontSize: '11px', 
                    fontWeight: 700, 
                    cursor: 'pointer', 
                    fontFamily: 'var(--font)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {copied ? '✓ Copied Address' : '📋 Copy Address'}
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
                            {isDeposit ? `via ${item.walletType}` : (item.destinationAddress ? `to ${item.walletType || 'External'} (${item.destinationAddress})` : (item.note || 'to external address'))}
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

          {/* Amount input & invoice calculator at the very top */}
          <div className="card glass fade-in-2" style={{ border: '1px solid rgba(200,150,44,0.25)', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--gold-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>1. Calculate Deposit Invoice</span>
              <span style={{ fontSize: '9px', padding: '1px 6px', background: 'var(--gold-bg)', color: 'var(--gold-light)', borderRadius: '99px', fontWeight: 700 }}>Min: $5.00</span>
            </div>
            
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Enter deposit amount (USD)</label>
              <input 
                type="number" 
                step="0.01" 
                required 
                className="input" 
                placeholder="Enter amount (e.g. 5, 50, 100)" 
                value={depAmount} 
                onChange={e => setDepAmount(e.target.value)} 
              />
            </div>

            {depAmount && !isNaN(parseFloat(depAmount)) && parseFloat(depAmount) >= 5 ? (
              <div style={{ background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', animation: 'fadeInUp 0.15s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-2)' }}>
                  <span>Net Amount Credited:</span>
                  <span style={{ fontWeight: 700, color: 'var(--teal-light)' }}>${parseFloat(depAmount).toFixed(2)} USD</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-3)' }}>
                  <span>Platform Commission ({depositFeePercent}%):</span>
                  <span>${(parseFloat(depAmount) * depositFeePercent / 100).toFixed(2)} USD</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-1)', borderTop: '1px solid var(--border)', paddingTop: '6px', marginTop: '4px' }}>
                  <span style={{ fontWeight: 700 }}>Total You Must Send:</span>
                  <span style={{ fontWeight: 800, color: 'var(--gold-light)' }}>${(parseFloat(depAmount) * (1 + depositFeePercent / 100)).toFixed(2)} USD (≈ {Math.round(parseFloat(depAmount) * (1 + depositFeePercent / 100) * rate).toLocaleString()} ETB)</span>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '11px', color: 'var(--status-warning-text)', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', padding: '10px 12px', borderRadius: '8px', lineHeight: 1.4 }}>
                ⚠️ Please enter a deposit amount of $5.00 USD or more to calculate commission fees, total due, and unlock the platform's receiving addresses and QR codes.
              </div>
            )}
          </div>

          {!(depAmount && !isNaN(parseFloat(depAmount)) && parseFloat(depAmount) >= 5) ? (
            /* LOCKED DETAILS */
            <div className="card glass fade-in-3" style={{ padding: '24px', textAlign: 'center', opacity: 0.65, border: '1.5px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '32px' }}>🔒</span>
              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-2)' }}>Recipient Details & Addresses Locked</div>
              <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: 0, maxWidth: '320px', lineHeight: 1.4 }}>
                Fill out a valid deposit invoice in Step 1 above to reveal the platform receiving accounts and copy addresses.
              </p>
            </div>
          ) : (
            /* UNLOCKED DETAILS & METHODS */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeInUp 0.3s ease' }}>
              
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Select On-Chain Network
              </div>

              {/* TRC20 vs ERC20 Selection Tabs */}
              <div style={{ display: 'flex', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', padding: '3px', gap: '2px' }}>
                {[
                  { id: 'trc20', label: '⚡ Tron Network (USDT-TRC20)', feeNote: 'Ultra-low fees (~$0.10 network fee)' },
                  { id: 'erc20', label: '⛓️ Ethereum Network (USDT-ERC20)', feeNote: 'Ethereum network fees apply (~$0.50 network fee)' }
                ].map(n => (
                  <button 
                    key={n.id} 
                    type="button" 
                    onClick={() => setDepNetwork(n.id)} 
                    style={{
                      flex: 1, 
                      padding: '10px 4px', 
                      borderRadius: '7px', 
                      border: 'none', 
                      cursor: 'pointer', 
                      fontFamily: 'var(--font)', 
                      fontSize: '11.5px', 
                      fontWeight: 700, 
                      transition: 'all 0.15s',
                      background: depNetwork === n.id ? 'var(--bg-base)' : 'transparent',
                      color: depNetwork === n.id ? 'var(--gold-light)' : 'var(--text-3)',
                      boxShadow: depNetwork === n.id ? 'inset 0 0 0 1px var(--border)' : 'none'
                    }}
                  >
                    <div>{n.label}</div>
                    <div style={{ fontSize: '8.5px', fontWeight: 500, opacity: 0.7, marginTop: '2px' }}>{n.feeNote}</div>
                  </button>
                ))}
              </div>

              {/* Address details card */}
              <div className="card glass glow-indigo fade-in-2" style={{ border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '20px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--indigo-light)' }}>
                    {depNetwork === 'trc20' ? '⚡ USDT-TRC20 Platform Address' : '⛓️ USDT-ERC20 Platform Address'}
                  </div>
                  <span className="option-badge option-badge-fast">⚡ Instant Detection</span>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ background: 'white', padding: '8px', borderRadius: '12px', flexShrink: 0, boxShadow: '0 4px 20px rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100&data=${depNetwork === 'trc20' ? "TNVT3GvY7C31s4K8bXF7a7W9gN23vW9X2c" : (systemSettings?.masterWalletAddress || "0x71C259654103112E118830F25f82bb54aA20336d")}`} 
                      alt="QR" 
                      style={{ width: '80px', height: '80px', display: 'block' }} 
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>USDT Platform Receiving Address</div>
                    <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', fontFamily: 'monospace', fontSize: '10.5px', color: 'var(--text-1)', wordBreak: 'break-all', lineHeight: 1.4, letterSpacing: '0.02em', userSelect: 'all' }}>
                      {depNetwork === 'trc20' ? "TNVT3GvY7C31s4K8bXF7a7W9gN23vW9X2c" : (systemSettings?.masterWalletAddress || "0x71C259654103112E118830F25f82bb54aA20336d")}
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleCopy(depNetwork === 'trc20' ? "TNVT3GvY7C31s4K8bXF7a7W9gN23vW9X2c" : (systemSettings?.masterWalletAddress || "0x71C259654103112E118830F25f82bb54aA20336d"))} 
                      style={{ 
                        marginTop: '8px', 
                        background: copied ? 'var(--status-success-bg)' : 'rgba(99, 102, 241, 0.1)', 
                        border: copied ? '1px solid var(--status-success-border)' : '1px solid rgba(99, 102, 241, 0.2)',
                        borderRadius: '8px',
                        color: copied ? 'var(--status-success-text)' : 'var(--indigo-light)', 
                        padding: '6px 12px',
                        fontSize: '11px', 
                        fontWeight: 700, 
                        cursor: 'pointer', 
                        fontFamily: 'var(--font)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {copied ? '✓ Copied Address' : `📋 Copy ${depNetwork.toUpperCase()} Address`}
                    </button>
                  </div>
                </div>
              </div>

              {/* Unified automated verification form */}
              <form onSubmit={handleSubmitDeposit} style={{ background: 'linear-gradient(135deg, rgba(17,19,24,0.95) 0%, rgba(99,102,241,0.06) 100%)', border: '1px solid var(--indigo-border)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--indigo-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Real-Time Verification</span>
                  <span style={{ fontSize: '10px', color: 'var(--teal-light)', fontWeight: 600 }}>⚡ Automated</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0, lineHeight: 1.5 }}>
                  Send exactly **${(parseFloat(depAmount) * (1 + depositFeePercent / 100)).toFixed(2)} USD** via your selected network to the address above. Once processed, paste the Transaction Hash (TxID) below to instantly verify and credit your wallet.
                </p>
                
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Transaction Hash (TxID)</label>
                  <input 
                    type="text" 
                    placeholder="Enter 64-char TxID (e.g. f83c... or 0x...)" 
                    className="input" 
                    value={onchainTxHash} 
                    onChange={e => setOnchainTxHash(e.target.value)} 
                    required 
                  />
                </div>

                <button
                  type="submit"
                  disabled={depSubmitting || !onchainTxHash.trim()}
                  className="btn btn-indigo btn-full animate-pulse"
                  style={{ padding: '14px', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px' }}
                >
                  {depSubmitting ? '⏳ Submitting deposit verification...' : `⚡ Automatically Confirm & Verify Deposit`}
                </button>
              </form>

              {/* Low Fee Notice */}
              <div style={{ background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--teal-light)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🛡️ Secured Automated Ledger</span>
                  <span style={{ fontSize: '9px', padding: '1px 6px', background: 'rgba(0,212,170,0.15)', borderRadius: '99px' }}>{depNetwork.toUpperCase()}</span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.5, margin: 0 }}>
                  On-chain USDT ({depNetwork.toUpperCase()}) deposits are checked by the backend instantly. Once validated, your available balance will be credited automatically. 
                </p>
              </div>

            </div>
          )}

        </div>
      )}

      {/* ══ SEND TAB ════════════════════════════════════════ */}
      {activeSection === 'send' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="card fade-in-2">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div className="section-title" style={{ marginBottom: 0 }}>Send USD by ID</div>
              {wallet.numericId && (
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                  Your ID: <span style={{ fontWeight: 800, color: 'var(--gold-light)', fontFamily: 'monospace' }}>#{wallet.numericId}</span>
                  <button onClick={() => { navigator.clipboard.writeText(String(wallet.numericId)); setSuccess('Your ID copied!'); }} style={{ marginLeft: '6px', background: 'none', border: 'none', color: 'var(--gold-light)', cursor: 'pointer', fontSize: '11px', fontWeight: 600, fontFamily: 'var(--font)' }}>📋</button>
                </div>
              )}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '14px' }}>
              Send USD instantly to any EthioSwap user by their numeric ID. Like Binance Pay or Bybit internal transfer.
            </p>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setSendResult(null);
              const rid = parseInt(sendRecipientId);
              const amt = parseFloat(sendAmount);
              if (isNaN(rid) || rid <= 0) { setError('Enter a valid recipient ID.'); return; }
              if (isNaN(amt) || amt <= 0) { setError('Enter a valid amount.'); return; }
              if (amt > available) { setError(`Insufficient balance. Available: $${available.toFixed(2)}`); return; }

              setSendLoading(true);
              const result = await sendById(rid, amt, user.transactionPin ? sendPin : undefined);
              setSendLoading(false);
              if (result?.success) {
                setSendResult(result);
                setSendRecipientId('');
                setSendAmount('');
                setSendPin('');
              }
            }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Recipient ID</label>
                <input
                  type="number"
                  required
                  min="1"
                  className="input"
                  placeholder="Enter user numeric ID (e.g. 1, 2, 3...)"
                  value={sendRecipientId}
                  onChange={e => setSendRecipientId(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '14px', letterSpacing: '0.05em' }}
                />
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Amount (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  className="input"
                  placeholder={`Max: $${available.toFixed(2)}`}
                  value={sendAmount}
                  onChange={e => setSendAmount(e.target.value)}
                />
                {sendAmount && !isNaN(parseFloat(sendAmount)) && (
                  <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>
                    ≈ {Math.round(parseFloat(sendAmount) * rate).toLocaleString()} ETB · Recipient receives (net): ${(parseFloat(sendAmount) * (1 - depositFeePercent / 100)).toFixed(2)} USD ({depositFeePercent}% fee: ${(parseFloat(sendAmount) * depositFeePercent / 100).toFixed(2)} USD)
                  </div>
                )}
              </div>

              {user.transactionPin && (
                <div className="input-group fade-in-2" style={{ marginTop: '12px', marginBottom: '8px' }}>
                  <label className="input-label" style={{ color: 'var(--teal-light)', fontWeight: 700 }}>🔒 Enter Transaction Security PIN</label>
                  <input 
                    type="password" 
                    maxLength={4} 
                    pattern="\d*" 
                    required 
                    value={sendPin} 
                    onChange={e => setSendPin(e.target.value.replace(/\D/g, ''))} 
                    placeholder="Enter 4-digit PIN" 
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '15px', textAlign: 'center', letterSpacing: '0.4em' }} 
                  />
                </div>
              )}

              <div style={{ background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: '12px', padding: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--teal-light)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span>⚡ Instant Transfer</span>
                  <span style={{ fontSize: '9px', padding: '1px 6px', background: 'rgba(0,212,170,0.15)', borderRadius: '99px' }}>{depositFeePercent}% FEE</span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: 0, lineHeight: 1.4 }}>
                  Transfers deduct a flat commission fee of {depositFeePercent}% which is routed to platform maintenance. The recipient is credited the net amount.
                </p>
              </div>

              <button type="submit" disabled={sendLoading} className="btn btn-teal btn-full" style={{ padding: '14px', fontWeight: 800 }}>
                {sendLoading ? '⏳ Sending…' : '↗ Send USD Now'}
              </button>
            </form>

            {sendResult && (
              <div style={{ marginTop: '14px', background: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--status-success-text)', marginBottom: '6px' }}>✓ Transfer Sent!</div>
                <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                  Sent to <strong>@{sendResult.recipient.username}</strong> (ID: #{sendResult.recipient.numericId})
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>
                  New balance: ${sendResult.newBalance.toFixed(2)} USD
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ WITHDRAW TAB ══════════════════════════════════════ */}
      {activeSection === 'withdraw' && (
        <div className="card fade-in-2">
          <div className="section-title">Withdraw USD</div>
          <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '16px' }}>
            Send USD instantly to your external TRC20 or ERC20 wallet. (Min: $10.00 USD)
          </p>

          {/* Withdrawal Network Selector */}
          <div style={{ display: 'flex', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', padding: '3px', marginBottom: '14px', gap: '2px' }}>
            {[
              { id: 'trc20', label: '⚡ Tron Network (USDT-TRC20)' },
              { id: 'erc20', label: '⛓️ Ethereum Network (USDT-ERC20)' }
            ].map(m => (
              <button 
                key={m.id} 
                type="button" 
                onClick={() => setWithdrawNetwork(m.id)} 
                style={{
                  flex: 1, 
                  padding: '10px 4px', 
                  borderRadius: '7px', 
                  border: 'none', 
                  cursor: 'pointer', 
                  fontFamily: 'var(--font)', 
                  fontSize: '11.5px', 
                  fontWeight: 700, 
                  transition: 'all 0.15s',
                  background: withdrawNetwork === m.id ? 'var(--bg-base)' : 'transparent',
                  color: withdrawNetwork === m.id ? 'var(--gold-light)' : 'var(--text-3)',
                  boxShadow: withdrawNetwork === m.id ? 'inset 0 0 0 1px var(--border)' : 'none'
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">
                {withdrawNetwork === 'trc20' ? 'USDT TRC20 Destination Address' : 'USDT ERC20 Destination Address'}
              </label>
              <input 
                className="input" 
                type="text" 
                placeholder={withdrawNetwork === 'trc20' ? "T… (e.g. TNVT3GvY...)" : "0x… (e.g. 0x71C2596...)"} 
                value={destAddress} 
                onChange={e => setDestAddress(e.target.value)} 
                required 
              />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Amount to Withdraw (USD)</label>
              <input 
                className="input" 
                type="number" 
                step="0.01" 
                min="10" 
                placeholder={`Max: $${available.toFixed(2)}`} 
                value={withdrawAmt} 
                onChange={e => setWithdrawAmt(e.target.value)} 
                required 
              />
              {withdrawAmt && <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>≈ {Math.round(parseFloat(withdrawAmt) * rate).toLocaleString()} ETB</div>}
            </div>

            {withdrawAmt && !isNaN(parseFloat(withdrawAmt)) && parseFloat(withdrawAmt) >= 10 ? (
              <div style={{ background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', animation: 'fadeInUp 0.15s ease', marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-2)' }}>
                  <span>Requested Withdrawal:</span>
                  <span style={{ fontWeight: 700 }}>${parseFloat(withdrawAmt).toFixed(2)} USD</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-3)' }}>
                  <span>Platform Commission ({wdDetails.commPercent.toFixed(1)}%):</span>
                  <span style={{ color: 'var(--status-danger-text)' }}>-${wdDetails.platformFee.toFixed(2)} USD</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-3)' }}>
                  <span>Network Gas Transfer Cost:</span>
                  <span style={{ color: 'var(--text-2)' }}>{wdDetails.methodLabel}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-3)' }}>
                  <span>Estimated Delivery:</span>
                  <span style={{ color: 'var(--text-2)' }}>{wdDetails.deliveryLabel}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-1)', borderTop: '1px solid var(--border)', paddingTop: '6px', marginTop: '4px' }}>
                  <span style={{ fontWeight: 700 }}>Net Amount You Will Receive:</span>
                  <span style={{ fontWeight: 800, color: 'var(--teal-light)', fontSize: '14px' }}>${wdDetails.amountYouWillGet.toFixed(2)} USD</span>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '11px', color: 'var(--status-warning-text)', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', padding: '10px 12px', borderRadius: '8px', marginTop: '4px', lineHeight: 1.4 }}>
                ⚠️ Enter a withdrawal amount of $10.00 USD or more to calculate platform commission and estimate the final amount you will receive.
              </div>
            )}

            {user.transactionPin && (
              <div className="input-group fade-in-2" style={{ marginTop: '6px', marginBottom: '4px' }}>
                <label className="input-label" style={{ color: 'var(--gold-light)', fontWeight: 700 }}>🔒 Enter Transaction Security PIN</label>
                <input 
                  type="password" 
                  maxLength={4} 
                  pattern="\d*" 
                  required 
                  value={withdrawPin} 
                  onChange={e => setWithdrawPin(e.target.value.replace(/\D/g, ''))} 
                  placeholder="Enter 4-digit PIN" 
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '15px', textAlign: 'center', letterSpacing: '0.4em' }} 
                />
              </div>
            )}

            <button type="submit" disabled={withdrawing} className="btn btn-gold btn-full" style={{ padding: '14px', marginTop: '4px' }}>
              {withdrawing ? '⚡ Broadcasting transaction...' : 'Withdraw USD On-Chain ↗'}
            </button>
          </form>

          {txDetails && (
            <div style={{ marginTop: '14px', background: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--status-success-text)', marginBottom: '6px' }}>✓ Withdrawal Processed Instantly!</div>
              <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-2)', wordBreak: 'break-all', marginBottom: '8px' }}>{txDetails.txHash}</div>
              <a 
                href={`https://tronscan.org/#/transaction/${txDetails.txHash}`} 
                target="_blank" 
                rel="noreferrer" 
                style={{ color: 'var(--gold-light)', fontSize: '12px', fontWeight: 600 }}
              >
                View on Blockchain Explorer ↗
              </a>
            </div>
          )}
        </div>
      )}

      {/* ══ SECURITY PIN TAB ════════════════════════════════════ */}
      {activeSection === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className="fade-in-2">
          <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>🔒 Transaction Security PIN</div>
          
          <div style={{ padding: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.4, margin: 0 }}>
              Add a 4-digit numeric Security PIN to protect your funds. When enabled, this PIN will be required prior to releasing escrow or submitting withdrawals.
            </p>

            {pinMsg.text && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 500,
                background: pinMsg.type === 'success' ? 'var(--status-success-bg)' : 'rgba(248,113,113,0.08)',
                border: `1px solid ${pinMsg.type === 'success' ? 'var(--status-success-border)' : 'rgba(248,113,113,0.25)'}`,
                color: pinMsg.type === 'success' ? 'var(--status-success-text)' : 'var(--status-danger-text)'
              }}>
                {pinMsg.text}
              </div>
            )}

            {!user.transactionPin ? (
              // ENABLE PIN FORM
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (setupPin.length !== 4 || confirmSetupPin.length !== 4) {
                  setPinMsg({ type: 'error', text: 'PIN must be exactly 4 digits.' });
                  return;
                }
                if (setupPin !== confirmSetupPin) {
                  setPinMsg({ type: 'error', text: 'PINs do not match.' });
                  return;
                }
                setPinLoading(true);
                try {
                  await setPinMutation({ userId: user.id, pin: setupPin });
                  setPinMsg({ type: 'success', text: '✓ Security transaction PIN enabled successfully.' });
                  setSetupPin('');
                  setConfirmSetupPin('');
                  user.transactionPin = setupPin;
                } catch (err) {
                  setPinMsg({ type: 'error', text: err.message });
                } finally {
                  setPinLoading(false);
                }
              }} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '11px' }}>Set 4-Digit Security PIN</label>
                  <input 
                    type="password" 
                    maxLength={4} 
                    pattern="\d*" 
                    required 
                    value={setupPin} 
                    onChange={e => setSetupPin(e.target.value.replace(/\D/g, ''))} 
                    placeholder="Enter 4 digits" 
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '15px', textAlign: 'center', letterSpacing: '0.4em' }} 
                  />
                </div>

                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '11px' }}>Confirm Security PIN</label>
                  <input 
                    type="password" 
                    maxLength={4} 
                    pattern="\d*" 
                    required 
                    value={confirmSetupPin} 
                    onChange={e => setConfirmSetupPin(e.target.value.replace(/\D/g, ''))} 
                    placeholder="Confirm 4 digits" 
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '15px', textAlign: 'center', letterSpacing: '0.4em' }} 
                  />
                </div>

                <button type="submit" disabled={pinLoading} className="btn btn-gold btn-full btn-sm" style={{ marginTop: '6px' }}>
                  {pinLoading ? 'Saving…' : 'Enable Security PIN'}
                </button>
              </form>
            ) : (
              // CHANGE / DISABLE PIN FORM
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: '12px', padding: '12px', fontSize: '12px', color: 'var(--teal-light)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>✓</span> <span>Transaction PIN Security is Active</span>
                </div>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (currentPin !== user.transactionPin) {
                    setPinMsg({ type: 'error', text: 'Current security PIN is incorrect.' });
                    return;
                  }
                  if (setupPin.length !== 4 || confirmSetupPin.length !== 4) {
                    setPinMsg({ type: 'error', text: 'New PIN must be exactly 4 digits.' });
                    return;
                  }
                  if (setupPin !== confirmSetupPin) {
                    setPinMsg({ type: 'error', text: 'New PINs do not match.' });
                    return;
                  }
                  setPinLoading(true);
                  try {
                    await setPinMutation({ userId: user.id, pin: setupPin });
                    setPinMsg({ type: 'success', text: '✓ Security transaction PIN updated successfully.' });
                    setCurrentPin('');
                    setSetupPin('');
                    setConfirmSetupPin('');
                    user.transactionPin = setupPin;
                  } catch (err) {
                    setPinMsg({ type: 'error', text: err.message });
                  } finally {
                    setPinLoading(false);
                  }
                }} style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '4px' }}>Change PIN</div>
                  
                  <div className="input-group">
                    <label className="input-label" style={{ fontSize: '10px' }}>Current PIN</label>
                    <input 
                      type="password" 
                      maxLength={4} 
                      pattern="\d*" 
                      required 
                      value={currentPin} 
                      onChange={e => setCurrentPin(e.target.value.replace(/\D/g, ''))} 
                      placeholder="Current 4 digits" 
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '14px', textAlign: 'center', letterSpacing: '0.4em' }} 
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label" style={{ fontSize: '10px' }}>New PIN</label>
                    <input 
                      type="password" 
                      maxLength={4} 
                      pattern="\d*" 
                      required 
                      value={setupPin} 
                      onChange={e => setSetupPin(e.target.value.replace(/\D/g, ''))} 
                      placeholder="New 4 digits" 
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '14px', textAlign: 'center', letterSpacing: '0.4em' }} 
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label" style={{ fontSize: '10px' }}>Confirm New PIN</label>
                    <input 
                      type="password" 
                      maxLength={4} 
                      pattern="\d*" 
                      required 
                      value={confirmSetupPin} 
                      onChange={e => setConfirmSetupPin(e.target.value.replace(/\D/g, ''))} 
                      placeholder="Confirm new 4 digits" 
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '14px', textAlign: 'center', letterSpacing: '0.4em' }} 
                    />
                  </div>

                  <button type="submit" disabled={pinLoading} className="btn btn-gold btn-full btn-sm" style={{ marginTop: '4px' }}>
                    {pinLoading ? 'Updating…' : 'Update Security PIN'}
                  </button>
                </form>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>Disable PIN</div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input 
                      type="password" 
                      maxLength={4} 
                      pattern="\d*" 
                      value={currentPin} 
                      onChange={e => setCurrentPin(e.target.value.replace(/\D/g, ''))} 
                      placeholder="Current PIN to disable" 
                      style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '13px', textAlign: 'center', letterSpacing: '0.3em' }} 
                    />
                    <button 
                      onClick={async () => {
                        if (currentPin !== user.transactionPin) {
                          setPinMsg({ type: 'error', text: 'Please enter your correct current PIN to disable security gating.' });
                          return;
                        }
                        setPinLoading(true);
                        try {
                          await setPinMutation({ userId: user.id, pin: null });
                          setPinMsg({ type: 'success', text: '✓ Security transaction PIN disabled successfully.' });
                          setCurrentPin('');
                          user.transactionPin = undefined;
                        } catch (err) {
                          setPinMsg({ type: 'error', text: err.message });
                        } finally {
                          setPinLoading(false);
                        }
                      }} 
                      disabled={pinLoading || !currentPin} 
                      className="btn btn-outline btn-sm" 
                      style={{ borderColor: 'rgba(248,113,113,0.3)', color: 'var(--accent)' }}
                    >
                      Disable PIN
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletCard;
