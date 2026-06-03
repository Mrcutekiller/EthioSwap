import React, { useState, useEffect } from 'react';
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

const WalletCard = () => {
  const { user, wallet, withdrawETH, myDepositReqs, myWithdrawalReqs, myTransactions, createDepositRequest, savePaymentAccounts, sendById, setError, setSuccess, systemSettings } = useAuth();

  const [activeSection, setActiveSection] = useState('balance');
  const [checkingDeposit, setCheckingDeposit] = useState(false);
  const [onchainTxHash, setOnchainTxHash] = useState('');
  const [qrNetwork, setQrNetwork] = useState('trc20');

  // Transaction PIN states
  const [withdrawPin, setWithdrawPin] = useState('');
  const [setupPin, setSetupPin] = useState('');
  const [confirmSetupPin, setConfirmSetupPin] = useState('');
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

  const handleSendById = async (e) => {
    e.preventDefault();
    setError('Internal transfers are temporarily disabled for maintenance.');
    /*
    if (!sendRecipientId || !sendAmount || parseFloat(sendAmount) < 1) {
      setError('Minimum transfer is $1.00 USD.');
      return;
    }
    setSendLoading(true);
    try {
      // Logic moved to Convex
      setSuccess(`Successfully sent!`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSendLoading(false);
    }
    */
  };

  if (!wallet) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .shimmer-card {
          background: linear-gradient(90deg, #1a1d28 25%, #22263a 50%, #1a1d28 75%);
          background-size: 400px 100%;
          animation: shimmer 1.5s ease-in-out infinite;
          border-radius: 22px;
        }
      `}</style>
      <div className="shimmer-card" style={{ height: '180px' }} />
      <div className="shimmer-card" style={{ height: '60px', borderRadius: '14px' }} />
      <div className="shimmer-card" style={{ height: '120px', borderRadius: '16px' }} />
    </div>
  );

  const rate      = systemSettings?.etbRatePerDollar ?? 190;
  const depositFeePercent = systemSettings?.flatFeePercent ?? 1.0;
  const available = wallet.eth_balance - (wallet.eth_locked || 0);
  const etbTotal  = wallet.eth_balance * rate;

  const handleCopy = (address) => {
    navigator.clipboard.writeText(address);
    setCopied(true); setSuccess('Address copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmt);
    if (isNaN(amt) || amt <= 0) { setError('Enter a valid amount.'); return; }
    if (amt < 10) { setError('Minimum withdrawal amount is $10.00 USD.'); return; }
    if (amt > available)         { setError(`Max: $${available.toFixed(2)}`); return; }
    
    setWithdrawing(true);
    const result = await withdrawETH(amt, destAddress, user.transaction_pin ? withdrawPin : undefined);
    setWithdrawing(false);
    if (result) { setWithdrawAmt(''); setDestAddress(''); setWithdrawPin(''); }
  };

  const handleSubmitDeposit = async (e) => {
    e.preventDefault();
    if (!depAmount || parseFloat(depAmount) < 5) { setError('Minimum deposit amount is $5.00 USD.'); return; }
    setDepSubmitting(true);
    await createDepositRequest(parseFloat(depAmount), depNetwork.toUpperCase(), onchainTxHash.trim(), '');
    setDepSubmitting(false);
    setDepAmount(''); setOnchainTxHash('');
  };

  const combinedHistory = [...(myDepositReqs || []), ...(myWithdrawalReqs || [])]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const tabs = [
    { id: 'balance',  label: '💰', sub: 'Balance' },
    { id: 'deposit',  label: '⬇', sub: 'Deposit' },
    { id: 'send',     label: '↗', sub: 'Send' },
    { id: 'withdraw', label: '⬆', sub: 'Withdraw' },
    { id: 'security', label: '🔒', sub: 'Security' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .network-chip { cursor: pointer; padding: 5px 12px; border-radius: 99px; font-size: 11px; font-weight: 700; border: 1px solid; transition: all 0.2s ease; font-family: var(--font); }
        .network-chip.active-trc { background: rgba(232,53,100,0.12); color: #e83564; border-color: rgba(232,53,100,0.3); }
        .network-chip.active-erc { background: rgba(98,126,234,0.12); color: #627eea; border-color: rgba(98,126,234,0.3); }
        .network-chip.active-bep { background: rgba(240,185,11,0.12); color: #f0b90b; border-color: rgba(240,185,11,0.3); }
        .network-chip.inactive { background: rgba(255,255,255,0.03); color: #6b7280; border-color: rgba(255,255,255,0.07); }
      `}</style>

      {/* ── Balance Hero ──────────────────────────────────────── */}
      <div className="fade-in-1" style={{
        background: 'linear-gradient(135deg, rgba(17,19,24,0.95) 0%, rgba(245,197,24,0.06) 100%)',
        border: '1.5px solid transparent',
        backgroundImage: 'linear-gradient(rgba(17,19,24,0.98), rgba(17,19,24,0.98)), linear-gradient(135deg, #f5c518 0%, rgba(0,212,170,0.5) 100%)',
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
        borderRadius: '22px', 
        padding: '22px',
        position: 'relative', 
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        <div style={{ fontSize: '10px', color: '#f5c518', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>EthioSwap Wallet</span>
          {wallet.numeric_id && (
            <span style={{ background: 'rgba(245,197,24,0.15)', padding: '2px 8px', borderRadius: '99px', fontSize: '10px', letterSpacing: '0.03em', fontWeight: 800 }}>
              ID: #{wallet.numeric_id}
            </span>
          )}
        </div>
        <div style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1, marginBottom: '2px', fontFamily: 'JetBrains Mono, monospace' }}>
          <span style={{ color: '#f5c518' }}>${wallet.eth_balance.toFixed(2)}</span>
          <span style={{ fontSize: '18px', color: 'var(--text-3)', fontWeight: 500, marginLeft: '6px', fontFamily: 'var(--font)' }}>USD</span>
        </div>
        <div style={{ fontSize: '16px', color: '#00d4a0', fontWeight: 600, marginBottom: '18px', fontFamily: 'JetBrains Mono, monospace' }}>
          ≈ {Math.round(etbTotal).toLocaleString()} ETB
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {[
            { label: 'Available', usd: available, etb: available * rate },
            { label: 'In Escrow', usd: wallet.eth_locked || 0, etb: (wallet.eth_locked || 0) * rate, accent: true },
          ].map(c => (
            <div key={c.label} style={{ 
              background: 'rgba(10,12,18,0.6)', 
              border: c.accent ? '1.5px solid rgba(245,197,24,0.2)' : '1.5px solid rgba(0,212,170,0.2)', 
              borderRadius: '99px', 
              padding: '8px 16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '9px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '2px' }}>{c.label}</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: c.accent ? '#f5c518' : 'var(--text-1)' }}>${c.usd.toFixed(2)}</div>
              <div style={{ fontSize: '9px', color: '#00d4a0', fontWeight: 600 }}>≈ {Math.round(c.etb).toLocaleString()} ETB</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab toggle ────────────────────────────────────────── */}
      <div style={{ position: 'relative', display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '4px', gap: '2px' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveSection(t.id)} style={{
            flex: 1, padding: '9px 4px', borderRadius: '10px', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
            background: activeSection === t.id ? 'var(--bg-elevated)' : 'transparent',
            zIndex: 1,
            transition: 'all 0.15s ease',
          }}>
            <span style={{ fontSize: '16px', lineHeight: 1 }}>{t.label}</span>
            <span style={{ fontSize: '10px', fontWeight: 600, color: activeSection === t.id ? '#f5c518' : 'var(--text-3)' }}>{t.sub}</span>
          </button>
        ))}
      </div>

      {/* ══ BALANCE TAB ════════════════════════════════════════ */}
      {activeSection === 'balance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="card glass" style={{ padding: '20px' }}>
            <div className="section-title">Your Deposit Address</div>
            {/* Network Selector Chips */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {[
                { id: 'trc20', label: 'TRC-20', hint: 'USDT' },
                { id: 'erc20', label: 'ERC-20', hint: 'USDT' },
                { id: 'bep20', label: 'BEP-20', hint: 'BSC' },
              ].map(net => (
                <button
                  key={net.id}
                  onClick={() => setQrNetwork(net.id)}
                  className={`network-chip ${qrNetwork === net.id ? `active-${net.id.replace('20','')}` : 'inactive'}`}
                >
                  {net.label} <span style={{ opacity: 0.6, fontWeight: 500 }}>{net.hint}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ background: 'white', padding: '8px', borderRadius: '12px', flexShrink: 0 }}>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100&data=${wallet.eth_address}`} alt="QR" style={{ width: '80px', height: '80px' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Send {qrNetwork.toUpperCase()} USDT here</div>
                <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px', fontFamily: 'JetBrains Mono, monospace', fontSize: '10.5px', wordBreak: 'break-all', color: '#f5c518' }}>
                  {wallet.eth_address}
                </div>
                <button onClick={() => handleCopy(wallet.eth_address)} className="btn btn-ghost" style={{ marginTop: '8px', padding: '6px 12px', fontSize: '11px' }}>
                  {copied ? '✓ Copied' : '📋 Copy Address'}
                </button>
              </div>
            </div>
          </div>

          {combinedHistory.length > 0 && (
            <div className="card">
              <div className="section-title">📊 History</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {combinedHistory.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-elevated)', borderRadius: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '12px' }}>{item.wallet_type || (item.destination_address ? 'Withdrawal' : 'Deposit')}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>{new Date(item.created_at).toLocaleDateString()}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: item.amount_usd > 0 ? '#00d4a0' : '#f5c518' }}>${Math.abs(item.amount_usd).toFixed(2)}</div>
                      <StatusBadge status={item.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ DEPOSIT TAB ════════════════════════════════════════ */}
      {activeSection === 'deposit' && (
        <div className="card" style={{ padding: '20px' }}>
          <div className="section-title">1. Deposit Invoice</div>
          <form onSubmit={handleSubmitDeposit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="input-group">
              <label className="input-label">Amount (USD)</label>
              <input type="number" step="0.01" min="5" className="input" value={depAmount} onChange={e => setDepAmount(e.target.value)} required />
            </div>
            <div className="input-group">
              <label className="input-label">Transaction TxID / Reference</label>
              <input type="text" className="input" value={onchainTxHash} onChange={e => setOnchainTxHash(e.target.value)} required />
            </div>
            <button type="submit" disabled={depSubmitting} className="btn btn-indigo btn-full">
              {depSubmitting ? 'Submitting...' : 'Confirm Deposit'}
            </button>
          </form>
        </div>
      )}

      {/* ══ SEND TAB ════════════════════════════════════════ */}
      {activeSection === 'send' && (
        <div className="card" style={{ padding: '20px' }}>
          <div className="section-title">Send USD by ID</div>
          <form onSubmit={handleSendById} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input type="number" placeholder="Recipient ID" className="input" value={sendRecipientId} onChange={e => setSendRecipientId(e.target.value)} required />
            <input type="number" step="0.01" placeholder="Amount" className="input" value={sendAmount} onChange={e => setSendAmount(e.target.value)} required />
            {user.transaction_pin && <input type="password" placeholder="PIN" className="input" value={sendPin} onChange={e => setSendPin(e.target.value)} required />}
            <button type="submit" disabled={sendLoading} className="btn btn-teal btn-full">
              {sendLoading ? 'Sending...' : 'Send Now'}
            </button>
          </form>
        </div>
      )}

      {/* ══ WITHDRAW TAB ══════════════════════════════════════ */}
      {activeSection === 'withdraw' && (
        <div className="card" style={{ padding: '20px' }}>
          <div className="section-title">Withdraw USD</div>
          <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input type="text" placeholder="Wallet Address" className="input" value={destAddress} onChange={e => setDestAddress(e.target.value)} required />
            <input type="number" step="0.01" min="10" placeholder="Amount" className="input" value={withdrawAmt} onChange={e => setWithdrawAmt(e.target.value)} required />
            {user.transaction_pin && <input type="password" placeholder="PIN" className="input" value={withdrawPin} onChange={e => setWithdrawPin(e.target.value)} required />}
            <button type="submit" disabled={withdrawing} className="btn btn-gold btn-full">
              {withdrawing ? 'Processing...' : 'Withdraw Now'}
            </button>
          </form>
        </div>
      )}

      {/* ══ SECURITY PIN TAB ════════════════════════════════════ */}
      {activeSection === 'security' && (
        <div className="card" style={{ padding: '20px' }}>
          <div className="section-title">Transaction Security PIN</div>
          <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>Add a 4-digit PIN to protect your funds.</p>
          <form onSubmit={async (e) => {
            e.preventDefault();
            setPinLoading(true);
            const { error } = // await // supabase.from('users').update({ transaction_pin: setupPin }).eq('id', user.id);
            setPinLoading(false);
            if (error) setPinMsg({ type: 'error', text: error.message });
            else setPinMsg({ type: 'success', text: 'PIN set successfully!' });
          }} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input type="password" maxLength={4} placeholder="New 4-digit PIN" className="input" value={setupPin} onChange={e => setSetupPin(e.target.value)} required />
            <button type="submit" disabled={pinLoading} className="btn btn-gold btn-full">
              {pinLoading ? 'Saving...' : 'Set PIN'}
            </button>
            {pinMsg.text && <div style={{ fontSize: '12px', color: pinMsg.type === 'success' ? '#00d4a0' : '#ef4444' }}>{pinMsg.text}</div>}
          </form>
        </div>
      )}

    </div>
  );
};

export default WalletCard;
