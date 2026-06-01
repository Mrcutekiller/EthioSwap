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
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardTheme, setCardTheme] = useState('black'); // 'black' or 'white'

  const getTronAddress = (ethAddr) => {
    if (!ethAddr) return '';
    return 'T' + ethAddr.replace('0x', '').substring(0, 33);
  };

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

  const fullName = user.fullName || user.kycData?.name || user.displayName || user.username;
  const email = user.email || 'No email registered';
  const ethAddr = user.ethAddress || '—';
  const tronAddr = getTronAddress(user.ethAddress);
  const qrData = `EthiSwap Digital ID\nName: ${fullName}\nEmail: ${email}\nUsername: ${user.username}\nID: ${user.numericId || '—'}\nUSDT-ERC20: ${ethAddr}\nUSDT-TRC20: ${tronAddr}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120&data=${encodeURIComponent(qrData)}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 3D Flipping Digital ID Card */}
      <div className="card" style={{ padding: '16px' }}>
        <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span>🪪 Digital Member ID Card</span>
          
          {/* Segmented Control Pill */}
          <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '99px', padding: '3px', gap: '2px', position: 'relative', width: '130px', height: '28px' }}>
            <div style={{
              position: 'absolute',
              top: '3px',
              bottom: '3px',
              left: isFlipped ? 'calc(50% + 1px)' : '3px',
              width: 'calc(50% - 4px)',
              background: '#f5c518',
              borderRadius: '99px',
              transition: 'left 0.2s ease',
              zIndex: 0
            }} />
            {['Front', 'Back'].map((face, idx) => {
              const isFaceActive = (idx === 0 && !isFlipped) || (idx === 1 && isFlipped);
              return (
                <button
                  key={face}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsFlipped(idx === 1); }}
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontFamily: 'var(--font)',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: isFaceActive ? '#080A10' : 'var(--text-2)',
                    zIndex: 1,
                    textAlign: 'center',
                    transition: 'color 0.2s'
                  }}
                >
                  {face}
                </button>
              );
            })}
          </div>
        </div>
        <p style={{ fontSize: '11.5px', color: 'var(--text-3)', margin: '0 0 12px 0' }}>
          Your premium digital credentials with cryptographically generated deposit addresses and QR verification. Use the selector above or click the card to flip.
        </p>

        <style>{`
          .id-card-perspective {
            perspective: 1200px;
            width: 100%;
            max-width: 440px;
            height: 270px;
            margin: 0 auto;
            cursor: pointer;
            transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          }
          .id-card-perspective:hover {
            transform: scale(1.02) translateY(-2px);
          }
          .id-card-inner {
            position: relative;
            width: 100%;
            height: 100%;
            transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
            transform-style: preserve-3d;
          }
          .id-card-inner.flipped {
            transform: rotateY(180deg);
          }
          .id-card-front, .id-card-back {
            position: absolute;
            width: 100%;
            height: 100%;
            backface-visibility: hidden;
            border-radius: 18px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            padding: 16px;
            transition: all 0.3s ease;
          }
          
          /* Front: Obsidian Black */
          .id-card-front-obsidian {
            background: linear-gradient(135deg, #0a0a0a 0%, #111318 100%);
            border: 1.5px solid #f5c518;
            color: #ffffff;
            box-shadow: 0 16px 45px rgba(0, 0, 0, 0.65), inset 0 1px 2px rgba(255, 255, 255, 0.1);
          }

          /* Back: Prism Silver-White */
          .id-card-back-prism {
            background: linear-gradient(135deg, #ffffff 0%, #f4f6fa 100%);
            border: 1px solid rgba(0, 0, 0, 0.1);
            color: #0a0a0a;
            box-shadow: 0 16px 45px rgba(0, 0, 0, 0.12), inset 0 1px 2px rgba(255, 255, 255, 0.9);
            transform: rotateY(180deg);
          }
          
          .id-card-chip-gold {
            width: 32px;
            height: 24px;
            border-radius: 5px;
            position: relative;
            background: linear-gradient(135deg, #f5c518, #d4af37);
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.3);
            border: 1px solid rgba(255,255,255,0.1);
          }

          .id-card-chip-silver {
            width: 32px;
            height: 24px;
            border-radius: 5px;
            position: relative;
            background: linear-gradient(135deg, #abb2bf, #5c6370);
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.5);
            border: 1px solid rgba(0,0,0,0.15);
          }

          .id-card-badge {
            font-size: 9px;
            font-weight: 800;
            padding: 2px 8px;
            border-radius: 99px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .id-card-badge-verified { background: rgba(16,185,129,0.15); color: #00d4a0; border: 1px solid rgba(16,185,129,0.3); }
          .id-card-badge-pending { background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3); }
          .id-card-badge-rejected { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
          .id-card-badge-unverified { background: rgba(107,114,128,0.15); color: #6b7280; border: 1px solid rgba(107,114,128,0.3); }
          
          .id-card-watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-image: url(/favicon.png);
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            width: 190px;
            height: 190px;
            opacity: 0.06;
            pointer-events: none;
            z-index: 0;
            transition: all 0.3s ease;
          }
          
          .id-card-sheen {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.03) 100%);
            pointer-events: none;
            z-index: 2;
          }

          .id-card-content {
            position: relative;
            z-index: 1;
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
          }
        `}</style>

        <div className="id-card-perspective" onClick={() => setIsFlipped(!isFlipped)}>
          <div className={`id-card-inner ${isFlipped ? 'flipped' : ''}`}>
            
            {/* FRONT SIDE (Obsidian Dark Card) */}
            <div className="id-card-front id-card-front-obsidian">
              <div className="id-card-sheen" />
              <div className="id-card-watermark" style={{ filter: 'grayscale(100%)', opacity: 0.07 }} />

              <div className="id-card-content">
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <img src="/favicon.png" style={{ width: '16px', height: '16px', objectFit: 'contain' }} alt="Logo" />
                    <span style={{ fontSize: '12px', fontWeight: 900, color: '#f5c518', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: "'Outfit', 'Inter', sans-serif" }}>
                      EthiSwap
                    </span>
                    <span style={{ fontSize: '9px', fontWeight: 600, color: '#cbd5e1', letterSpacing: '0.05em', marginLeft: '4px' }}>
                      MEMBER ID
                    </span>
                  </div>
                  {user.kycStatus === 'approved' && <span className="id-card-badge id-card-badge-verified">✓ Verified</span>}
                  {user.kycStatus === 'pending' && <span className="id-card-badge id-card-badge-pending">⏳ Review</span>}
                  {user.kycStatus === 'rejected' && <span className="id-card-badge id-card-badge-rejected">✗ Rejected</span>}
                  {user.kycStatus !== 'approved' && user.kycStatus !== 'pending' && user.kycStatus !== 'rejected' && <span className="id-card-badge id-card-badge-unverified">👤 Unverified</span>}
                </div>

                {/* Core row */}
                <div style={{ display: 'flex', gap: '14px', flex: 1, minHeight: 0 }}>
                  {/* Photo & Chip */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {user.kycSelfie ? (
                      <img 
                        src={user.kycSelfie} 
                        style={{ 
                          width: '70px', 
                          height: '70px', 
                          borderRadius: '10px', 
                          objectFit: 'cover', 
                          border: '1.5px solid #f5c518', 
                          boxShadow: '0 0 10px rgba(245, 197, 24, 0.2)' 
                        }} 
                        alt="Selfie" 
                      />
                    ) : (
                      <div style={{ 
                        width: '70px', 
                        height: '70px', 
                        borderRadius: '10px', 
                        background: 'rgba(245, 197, 24, 0.08)', 
                        border: '1.5px solid rgba(255, 255, 255, 0.08)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '20px', 
                        fontWeight: 800, 
                        color: '#f5c518' 
                      }}>
                        {(fullName || 'U').substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="id-card-chip-gold" />
                    <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#cbd5e1', fontWeight: 700 }}>
                      #{user.numericId || '—'}
                    </div>
                  </div>

                  {/* Info block */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
                    <div>
                      <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(255,255,255,0.45)' }}>Full Name</div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {fullName}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(255,255,255,0.45)' }}>Email Address</div>
                      <div style={{ fontSize: '11px', color: '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {email}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(255,255,255,0.45)' }}>Trader Handle</div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#cbd5e1' }}>
                        @{user.username}
                      </div>
                    </div>

                    <div style={{ marginTop: 'auto', display: 'flex', gap: '4px', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#00d4a0' }}>ERC20:</span>
                        <span style={{ fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.45)' }}>{ethAddr}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f5c518' }}>TRC20:</span>
                        <span style={{ fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.45)' }}>{tronAddr || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ 
                      background: 'white', 
                      padding: '5px', 
                      borderRadius: '8px', 
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <img 
                        src={qrCodeUrl} 
                        alt="QR" 
                        style={{ width: '80px', height: '80px', display: 'block' }} 
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom hint */}
                <div style={{ 
                  borderTop: '1px solid rgba(255,255,255,0.08)', 
                  paddingTop: '6px', 
                  marginTop: '8px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  fontSize: '9px', 
                  color: 'rgba(255,255,255,0.3)' 
                }}>
                  <span>🔒 SECURED MEMBERSHIP CREDENTIAL</span>
                  <span>💡 TAP TO FLIP CARD</span>
                </div>
              </div>
            </div>

            {/* BACK SIDE (Prism Silver-White Card) */}
            <div className="id-card-back id-card-back-prism">
              <div className="id-card-sheen" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 45%, rgba(0,0,0,0.02) 100%)' }} />
              <div className="id-card-watermark" style={{ opacity: 0.05 }} />

              <div className="id-card-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '8px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <img src="/favicon.png" style={{ width: '16px', height: '16px', objectFit: 'contain' }} alt="Logo" />
                    <span style={{ fontSize: '12px', fontWeight: 900, color: '#1a1f2c', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: "'Outfit', 'Inter', sans-serif" }}>
                      EthiSwap
                    </span>
                  </div>
                  <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700 }}>KYC VERIFICATION STORAGE</span>
                </div>

                <div style={{ display: 'flex', gap: '10px', flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center' }}>
                  {user.kycIdFront || user.kycIdBack || user.kycDocument ? (
                    <>
                      <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '4px', height: '100%' }}>
                        <span style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', textAlign: 'center', fontWeight: 600 }}>Front Document</span>
                        {user.kycIdFront ? (
                          <img 
                            src={user.kycIdFront} 
                            style={{ width: '100%', height: '100px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(0,0,0,0.1)' }} 
                            alt="ID Front" 
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100px', borderRadius: '8px', background: 'rgba(0,0,0,0.04)', border: '1px dashed rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#64748b' }}>None</div>
                        )}
                      </div>
                      
                      <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '4px', height: '100%' }}>
                        <span style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', textAlign: 'center', fontWeight: 600 }}>Back Document</span>
                        {user.kycIdBack || user.kycDocument ? (
                          <img 
                            src={user.kycIdBack || user.kycDocument} 
                            style={{ width: '100%', height: '100px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(0,0,0,0.1)' }} 
                            alt="ID Back" 
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100px', borderRadius: '8px', background: 'rgba(0,0,0,0.04)', border: '1px dashed rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#64748b' }}>None</div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      width: '100%', 
                      height: '120px', 
                      background: 'rgba(0,0,0,0.02)', 
                      border: '1.5px dashed rgba(0,0,0,0.12)', 
                      borderRadius: '10px', 
                      color: '#64748b' 
                    }}>
                      <span style={{ fontSize: '24px' }}>🔒</span>
                      <span style={{ fontSize: '11px', marginTop: '6px', fontWeight: 600 }}>Documents Locked</span>
                      <span style={{ fontSize: '9px', opacity: 0.8, marginTop: '2px' }}>Verify Identity to reveal scans</span>
                    </div>
                  )}
                </div>

                {/* Bottom hint */}
                <div style={{ 
                  borderTop: '1px solid rgba(0,0,0,0.08)', 
                  paddingTop: '6px', 
                  marginTop: '12px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  fontSize: '9px', 
                  color: '#64748b' 
                }}>
                  <span>🛡️ CONFIDENTIAL KYC STORAGE</span>
                  <span>💡 TAP TO FLIP CARD</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="card" style={{ textAlign: 'center', padding: '28px 20px' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--gold-bg)', border: '2px solid var(--border-active)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: 800, color: 'var(--gold-light)', margin: '0 auto 12px', boxShadow: 'var(--shadow-gold)' }}>
          {getInitials(user.username)}
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          @{user.username}
          {user.kycStatus === 'approved' && <span style={{ color: '#00d4a0', fontSize: '18px', fontWeight: '900' }} title="Verified P2P Trader">✓</span>}
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
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {user.kycStatus === 'rejected' && user.kycRejectionReason && (
              <div className="fade-in-2" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '10px', padding: '12px', fontSize: '12.5px', color: 'var(--status-danger-text)', lineHeight: 1.4 }}>
                <span style={{ fontWeight: 700 }}>⚠️ Verification Failed:</span> {user.kycRejectionReason}
              </div>
            )}
            {user.kycStatus === 'pending' || user.kycStep === 'pending' ? (
              <div style={{ background: 'var(--status-warning-bg)', border: '1px solid var(--status-warning-border)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: 'var(--status-warning-text)', fontWeight: 500 }}>
                ⏳ Your documents are under admin review. You'll be notified soon.
              </div>
            ) : (
              <button onClick={() => setShowKYC(true)} className="btn btn-gold btn-full">
                {user.kycStatus === 'rejected' ? '🛡️ Restart Verification' : '🛡️ Start Verification'}
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
                  <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '12px', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      <span style={{ color: '#f5c518', fontSize: '16px', fontWeight: 800, paddingRight: '4px' }}>›</span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{matched?.icon || '🏦'}</span>
                          <span style={{ color: 'var(--text-1)' }}>{matched?.label || acc.bankName}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '3px' }}>
                          Acc: <strong style={{ color: '#ffffff', fontFamily: 'monospace' }}>{acc.accountNumber}</strong> · Holder: {acc.holderName}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteAccount(acc.id)} style={{ padding: '6px 10px', background: 'rgba(248,113,113,0.1)', color: 'var(--status-danger-text)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', zIndex: 1 }}>
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
