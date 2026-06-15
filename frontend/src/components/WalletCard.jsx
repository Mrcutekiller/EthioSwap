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

const WalletCard = () => {
  const {
    user, wallet, systemSettings,
    withdrawETH, myDepositReqs, myWithdrawalReqs,
    createDepositRequest, setError, setSuccess,
  } = useAuth();

  const [tab, setTab] = useState('balance');
  const [copied, setCopied] = useState(false);
  const [qrNet, setQrNet] = useState('trc20');

  const [depStep, setDepStep] = useState(1);
  const [depNet, setDepNet] = useState('trc20');
  const [depAmt, setDepAmt] = useState('');
  const [depTxId, setDepTxId] = useState('');
  const [depLoading, setDepLoading] = useState(false);

  const [wdStep, setWdStep] = useState(1);
  const [wdNet, setWdNet] = useState('trc20');
  const [wdAmt, setWdAmt] = useState('');
  const [wdAddr, setWdAddr] = useState('');
  const [wdLoading, setWdLoading] = useState(false);

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
    setSuccess('Address copied!');
    setTimeout(() => setCopied(false), 2000);
  }, [setSuccess]);

  const handleDepositSubmit = async () => {
    if (depAmtNum < minDep) { setError(`Minimum deposit is $${minDep}`); return; }
    if (!depTxId.trim()) { setError('Please enter your Transaction ID / Reference'); return; }
    setDepLoading(true);
    setSuccess('Processing deposit...');
    try {
      await createDepositRequest(depAmtNum, depNet.toUpperCase(), depTxId.trim(), '', undefined);
      setSuccess(`Success! $${depYouReceive.toFixed(2)} added to your wallet (${platformFeePercent}% fee deducted).`);
      setDepAmt(''); setDepTxId(''); setDepStep(1);
    } catch (err) { setError(err.message); }
    finally { setDepLoading(false); }
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
        setSuccess(`Success! $${wdAmtNum.toFixed(2)} sent to ${wdAddr.substring(0, 10)}...`);
        setWdAmt(''); setWdAddr(''); setWdStep(1);
      }
    } catch (err) { setError(err.message); }
    finally { setWdLoading(false); }
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
    { id: 'deposit',  icon: 'ti ti-arrow-down',   label: 'Deposit' },
    { id: 'withdraw', icon: 'ti ti-arrow-up',     label: 'Withdraw' },
  ];

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
          <button key={t.id} onClick={() => { setTab(t.id); if (t.id === 'deposit') setDepStep(1); if (t.id === 'withdraw') setWdStep(1); }}
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
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{isDep ? 'Deposit' : 'Withdrawal'}</div>
                          <div style={{ fontSize: '10px', color: '#8A9BB8', marginTop: '1px' }}>{date ? new Date(date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Pending'}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: isDep ? '#F5A623' : '#FF4D4D', fontFamily: 'var(--font-mono)' }}>{isDep ? '+' : '-'}${fmt(amt)}</div>
                        <span style={{
                          fontSize: '8.5px', fontWeight: 600, padding: '1px 5px', borderRadius: '4px',
                          textTransform: 'uppercase', display: 'inline-block', marginTop: '2px',
                          background: item.status === 'approved' ? 'rgba(245,166,35,0.1)' : item.status === 'pending' ? 'rgba(138,155,184,0.1)' : 'rgba(255,77,77,0.1)',
                          color: item.status === 'approved' ? '#F5A623' : item.status === 'pending' ? '#8A9BB8' : '#FF4D4D',
                        }}>{item.status}</span>
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

      {/* ══════ DEPOSIT 3-STEP FLOW ══════ */}
      {tab === 'deposit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <StepIndicator current={depStep} total={3} />

          {/* STEP 1: Pick Network */}
          {depStep === 1 && (
            <div style={{ background: '#141827', borderRadius: '20px', border: '1px solid #1E2640', padding: '20px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Pick Network</div>
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

      {/* ══════ WITHDRAW 3-STEP FLOW ══════ */}
      {tab === 'withdraw' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <StepIndicator current={wdStep} total={3} />

          {/* STEP 1: Pick Network */}
          {wdStep === 1 && (
            <div style={{ background: '#141827', borderRadius: '20px', border: '1px solid #1E2640', padding: '20px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Pick Network</div>
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
  );
};

export default WalletCard;
