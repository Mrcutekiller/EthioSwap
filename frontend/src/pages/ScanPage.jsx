import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const truncateAddr = (addr) => {
  if (!addr || addr.length <= 8) return addr || '';
  return addr.slice(0, 4) + '...' + addr.slice(-3);
};

const ScanPage = ({ setPage }) => {
  const { wallet } = useAuth();
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);

  const balance = wallet?.ethBalance ?? 0;

  const handleSend = () => {
    if (!address || !amount) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      alert(`Sent $${Number(amount).toFixed(2)} to ${truncateAddr(address)}`);
      setAddress('');
      setAmount('');
    }, 1500);
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto' }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '24px',
      }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text)', marginBottom: '20px', textAlign: 'center' }}>Send USDT</h1>

        {/* Camera Viewfinder */}
        <div style={{
          width: '240px', height: '240px', margin: '0 auto 20px',
          border: '2px solid var(--teal)', borderRadius: '12px',
          background: 'var(--bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Corner brackets */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '24px', height: '24px', borderTop: '3px solid var(--teal)', borderLeft: '3px solid var(--teal)', borderRadius: '4px 0 0 0' }}></div>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '24px', height: '24px', borderTop: '3px solid var(--teal)', borderRight: '3px solid var(--teal)', borderRadius: '0 4px 0 0' }}></div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '24px', height: '24px', borderBottom: '3px solid var(--teal)', borderLeft: '3px solid var(--teal)', borderRadius: '0 0 0 4px' }}></div>
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: '24px', height: '24px', borderBottom: '3px solid var(--teal)', borderRight: '3px solid var(--teal)', borderRadius: '0 0 4px 0' }}></div>
          <div style={{ textAlign: 'center' }}>
            <i className="ti ti-camera" style={{ fontSize: '32px', color: 'var(--muted)', opacity: 0.4, display: 'block', marginBottom: '8px' }}></i>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Camera will activate here</span>
          </div>
        </div>

        {/* OR Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
          <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
        </div>

        {/* Address Input */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Paste TRC20 wallet address"
            value={address}
            onChange={e => setAddress(e.target.value)}
            style={{
              width: '100%', padding: '12px 16px',
              background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '12px',
              color: 'var(--text)', fontSize: '13px', fontFamily: 'var(--font-mono)',
              outline: 'none', transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--teal)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <button
            onClick={() => navigator.clipboard?.readText().then(t => setAddress(t)).catch(() => {})}
            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', padding: '4px' }}
          >
            <i className="ti ti-paste" style={{ fontSize: '18px' }}></i>
          </button>
        </div>

        {/* Amount Input */}
        <div style={{ marginBottom: '20px' }}>
          <input
            type="number"
            placeholder="$0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            style={{
              width: '100%', padding: '14px 16px',
              background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '12px',
              color: 'var(--gold)', fontSize: '24px', fontWeight: 600, textAlign: 'center',
              fontFamily: 'var(--font-mono)', outline: 'none', transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--teal)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!address || !amount || sending}
          style={{
            width: '100%', padding: '14px', height: '48px',
            background: 'var(--teal)', color: '#04342C',
            borderRadius: '12px', fontSize: '15px', fontWeight: 600,
            border: 'none', cursor: (!address || !amount) ? 'not-allowed' : 'pointer',
            opacity: (!address || !amount || sending) ? 0.6 : 1,
            transition: 'all 0.15s',
          }}
        >
          {sending ? 'Sending...' : 'Send USDT'}
        </button>

        {/* Available Balance */}
        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--muted)', marginTop: '12px' }}>
          Available: ${Number(balance).toFixed(2)}
        </p>
      </div>
    </div>
  );
};

export default ScanPage;
