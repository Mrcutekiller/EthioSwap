import React, { useState } from 'react';
import KYCWizard from '../components/KYCWizard.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const SUPPORTED_BANKS = [
  { id: 'CBE',              label: 'Commercial Bank of Ethiopia (CBE)', icon: '🏦' },
  { id: 'Telebirr',        label: 'Telebirr Wallet',                  icon: '📱' },
  { id: 'Dashen Bank',     label: 'Dashen Bank',                      icon: '🏦' },
  { id: 'Bank of Abyssinia', label: 'Bank of Abyssinia',                 icon: '🏦' },
  { id: 'Awash Bank',      label: 'Awash Bank',                       icon: '🏦' },
  { id: 'Wegagen Bank',    label: 'Wegagen Bank',                     icon: '🏦' },
  { id: 'Nib Bank',        label: 'Nib Bank',                         icon: '🏦' },
  { id: 'Amhara Bank',     label: 'Amhara Bank',                      icon: '🏦' },
  { id: 'HelloCash',       label: 'HelloCash Mobile Money',           icon: '💚' },
  { id: 'M-Pesa',          label: 'M-Pesa Ethiopia',                  icon: '📲' },
];

const ProfilePage = ({ user, wallet, apiBase, onUserUpdate, systemSettings }) => {
  const { savePaymentAccounts } = useAuth();
  const [showKYC, setShowKYC] = useState(false);
  const [showAddAcc, setShowAddAcc] = useState(false);
  const [newBank, setNewBank] = useState('CBE');
  const [newAccNum, setNewAccNum] = useState('');
  const [newHolder, setNewHolder] = useState('');

  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!newAccNum.trim() || !newHolder.trim()) return;
    const newAcc = {
      id: String(Date.now()),
      bankName: newBank,
      accountNumber: newAccNum.trim(),
      holderName: newHolder.trim(),
    };
    const currentList = user.paymentAccounts || [];
    const updatedList = [...currentList, newAcc];
    await savePaymentAccounts(updatedList);
    setNewAccNum('');
    setNewHolder('');
    setShowAddAcc(false);
  };

  const handleDeleteAccount = async (id) => {
    if (!window.confirm('Delete this payment account profile?')) return;
    const currentList = user.paymentAccounts || [];
    const updatedList = currentList.filter(a => a.id !== id);
    await savePaymentAccounts(updatedList);
  };

  if (!user) return null;

  const getInitials = (name) => (name || 'U').substring(0, 2).toUpperCase();

  const kycSteps = [
    { key: 'registered', label: 'Account Created', done: true },
    { key: 'id_uploaded', label: 'ID / Passport Uploaded', done: ['id_uploaded', 'pending', 'approved'].includes(user.kycStep) },
    { key: 'face_captured', label: 'Selfie Verified', done: ['pending', 'approved'].includes(user.kycStep) || user.kycSelfie },
    { key: 'approved', label: 'Admin Approved', done: user.kycStatus === 'approved' },
  ];

  const kycStatusBadge = () => {
    switch (user.kycStatus) {
      case 'approved': return <span className="badge badge-success">✓ Verified</span>;
      case 'pending':  return <span className="badge badge-warning">⏳ Under Review</span>;
      case 'rejected': return <span className="badge badge-danger">✗ Rejected</span>;
      default:         return <span className="badge badge-neutral">Not Verified</span>;
    }
  };

  const joinDate = user.joinedAt
    ? new Date(user.joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Recently';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Profile Header Card */}
      <div className="card" style={{ textAlign: 'center', padding: '28px 20px' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--gold-bg)', border: '2px solid var(--border-active)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: 800, color: 'var(--gold-light)', margin: '0 auto 12px', boxShadow: 'var(--shadow-gold)' }}>
          {getInitials(user.username)}
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          @{user.username}
          {user.kycStatus === 'approved' && <span style={{ color: 'var(--secondary)', fontSize: '18px' }} title="Verified User">✓</span>}
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '12px' }}>Member since {joinDate}</p>
        {kycStatusBadge()}
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
        {[
          { label: 'USD Balance', value: wallet ? `$${wallet.ethAvailable?.toFixed(2) || '0.00'}` : '—', sub: wallet ? `≈ ${Math.round(wallet.ethAvailable * (systemSettings?.etbRatePerDollar ?? 190.0)).toLocaleString()} ETB` : '' },
          { label: 'Total Trades', value: user.totalTrades ?? 0 },
          { label: 'Reputation', value: `${user.reputation ?? 100}%` },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '14px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>{s.value}</div>
            {s.sub && <div style={{ fontSize: '11px', color: 'var(--gold-light)', fontWeight: 600 }}>{s.sub}</div>}
            <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Wallet Address */}
      <div className="card">
        <div className="section-title">Wallet Address</div>
        <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-2)', wordBreak: 'break-all', letterSpacing: '0.02em' }}>
          {user.ethAddress || '—'}
        </div>
        <button onClick={() => { navigator.clipboard.writeText(user.ethAddress || ''); }} style={{ marginTop: '8px', background: 'none', border: 'none', color: 'var(--gold-light)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', padding: '4px 0' }}>
          📋 Copy Address
        </button>
      </div>

      {/* KYC Verification Track */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Identity Verification</div>
          {kycStatusBadge()}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {kycSteps.map((step, i) => (
            <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 0', borderBottom: i < kycSteps.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, background: step.done ? 'var(--status-success-bg)' : 'var(--bg-elevated)', border: `1px solid ${step.done ? 'var(--status-success-border)' : 'var(--border)'}`, color: step.done ? 'var(--status-success-text)' : 'var(--text-3)', flexShrink: 0 }}>
                {step.done ? '✓' : i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: step.done ? 600 : 400, color: step.done ? 'var(--text-1)' : 'var(--text-3)' }}>{step.label}</div>
              </div>
              {i === 0 && <span className="badge badge-success" style={{ fontSize: '10px' }}>Done</span>}
              {i > 0 && step.done && <span className="badge badge-success" style={{ fontSize: '10px' }}>Done</span>}
              {i > 0 && !step.done && user.kycStatus !== 'approved' && <span className="badge badge-neutral" style={{ fontSize: '10px' }}>Pending</span>}
            </div>
          ))}
        </div>

        {/* CTA */}
        {user.kycStatus !== 'approved' && (
          <div style={{ marginTop: '16px' }}>
            {user.kycStatus === 'pending' || user.kycStep === 'pending' ? (
              <div style={{ background: 'var(--status-warning-bg)', border: '1px solid var(--status-warning-border)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: 'var(--status-warning-text)', fontWeight: 500 }}>
                ⏳ Your documents are under admin review. You'll be notified soon.
              </div>
            ) : (
              <button onClick={() => setShowKYC(true)} className="btn btn-gold btn-full">
                🛡️ Start Verification
              </button>
            )}
          </div>
        )}

        {user.kycStatus === 'approved' && (
          <div style={{ marginTop: '12px', background: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: 'var(--status-success-text)', fontWeight: 500, textAlign: 'center' }}>
            ✓ Your identity is fully verified. You can trade freely.
          </div>
        )}
      </div>

      {/* Saved Payment Accounts (Verified Users only) */}
      {user.kycStatus === 'approved' && (
        <div className="card">
          <div className="section-title">Saved Payment Accounts</div>
          <p style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '14px' }}>
            Add multiple local bank or mobile money accounts to receive payouts when you sell USD.
          </p>

          {/* List of accounts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {(user.paymentAccounts || []).length === 0 ? (
              <div style={{ padding: '16px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '10px', textAlign: 'center', fontSize: '12px', color: 'var(--text-3)' }}>
                No payment accounts added yet.
              </div>
            ) : (
              (user.paymentAccounts || []).map((acc) => {
                const matched = SUPPORTED_BANKS.find(b => b.id === acc.bankName);
                return (
                  <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{matched?.icon || '🏦'}</span>
                        <span>{matched?.label || acc.bankName}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '3px' }}>
                        Acc: <strong>{acc.accountNumber}</strong> · Holder: {acc.holderName}
                      </div>
                    </div>
                    <button onClick={() => handleDeleteAccount(acc.id)} style={{ padding: '6px 10px', background: 'rgba(248,113,113,0.1)', color: 'var(--status-danger-text)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                      Delete
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Add account form toggle */}
          {!showAddAcc ? (
            <button onClick={() => setShowAddAcc(true)} className="btn btn-outline btn-full btn-sm">
              + Add New Account
            </button>
          ) : (
            <form onSubmit={handleAddAccount} style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold-light)' }}>New Account Details</span>
                <button type="button" onClick={() => setShowAddAcc(false)} style={{ fontSize: '12px', color: 'var(--text-3)', cursor: 'pointer' }}>Cancel</button>
              </div>

              <div className="input-group">
                <label className="input-label" style={{ fontSize: '10px' }}>Select Bank/Wallet</label>
                <select value={newBank} onChange={e => setNewBank(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '13px' }}>
                  {SUPPORTED_BANKS.map(b => (
                    <option key={b.id} value={b.id}>{b.icon} {b.label}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label" style={{ fontSize: '10px' }}>Account / Phone Number</label>
                <input type="text" required value={newAccNum} onChange={e => setNewAccNum(e.target.value)} placeholder="e.g. 100029384849 or 0912345678" style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '13px' }} />
              </div>

              <div className="input-group">
                <label className="input-label" style={{ fontSize: '10px' }}>Account Holder Name</label>
                <input type="text" required value={newHolder} onChange={e => setNewHolder(e.target.value)} placeholder="e.g. Abebe Kebede" style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '13px' }} />
              </div>

              <button type="submit" className="btn btn-gold btn-full btn-sm" style={{ marginTop: '4px' }}>
                Save Account Profile
              </button>
            </form>
          )}
        </div>
      )}

      {/* Account Info */}
      <div className="card">
        <div className="section-title">Account Details</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {[
            { label: 'Username', value: `@${user.username}` },
            { label: 'Phone', value: user.phone || '—' },
            { label: 'Role', value: user.role === 'admin' ? '👑 Admin' : '👤 Trader' },
            { label: 'Last Active', value: user.lastActive ? new Date(user.lastActive).toLocaleString() : '—' },
          ].map((row, i, arr) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>{row.label}</span>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-1)' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* KYC Wizard Modal */}
      {showKYC && (
        <KYCWizard
          user={user}
          onClose={() => setShowKYC(false)}
          onComplete={(updatedUser) => {
            setShowKYC(false);
            if (onUserUpdate) onUserUpdate(updatedUser);
          }}
        />
      )}
    </div>
  );
};

export default ProfilePage;
