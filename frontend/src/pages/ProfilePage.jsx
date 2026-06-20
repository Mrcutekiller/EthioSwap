import React, { useState, useEffect } from 'react';
import KYCWizard from '../components/KYCWizard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase';
import { 
  Copy, 
  Shield, 
  ShieldCheck, 
  QrCode, 
  Wallet, 
  Landmark, 
  User, 
  CreditCard, 
  Settings, 
  Check, 
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Info,
  RefreshCw,
  Plus, 
  Trash2, 
  Lock,
  LogOut
} from 'lucide-react';
import { getTronAddress } from '../utils/crypto.js';

// Default premium inline SVG avatar template
const DEFAULT_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bg1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="100%" stop-color="#06b6d4" />
    </linearGradient>
    <linearGradient id="hair1" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#3b82f6" />
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="50" fill="url(#bg1)" />
  <path d="M 25 85 C 25 72, 35 68, 50 68 C 65 68, 75 72, 75 85 Z" fill="#1e293b" />
  <path d="M 38 68 L 50 82 L 62 68" stroke="#06b6d4" stroke-width="2" fill="none" />
  <rect x="44" y="55" width="12" height="15" fill="#e2e8f0" rx="3" />
  <circle cx="50" cy="45" r="18" fill="#f8fafc" />
  <path d="M 32 40 C 32 24, 45 20, 50 20 C 58 20, 68 24, 68 40 C 66 38, 64 36, 60 38 C 55 40, 52 32, 48 35 C 44 38, 38 35, 32 40 Z" fill="url(#hair1)" />
  <rect x="35" y="38" width="30" height="10" rx="5" fill="#f43f5e" opacity="0.9" />
  <rect x="37" y="40" width="26" height="6" rx="3" fill="#ff7e93" />
  <line x1="32" y1="43" x2="68" y2="43" stroke="#f43f5e" stroke-width="1.5" stroke-dasharray="2,2" />
</svg>`;

// Helper to convert SVG strings safely into standard UTF-8/base64 encoded data URIs
const getAvatarUrl = (svgString) => {
  if (!svgString) return '';
  if (svgString.startsWith('data:')) return svgString;
  try {
    const base64 = window.btoa(unescape(encodeURIComponent(svgString)));
    return `data:image/svg+xml;base64,${base64}`;
  } catch (e) {
    console.error("Failed to encode SVG", e);
    return '';
  }
};

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

const SecurityLock = ({ onVerify, onClose }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (pin === '1234') { // Mock PIN for now
      onVerify();
    } else {
      setError('Incorrect PIN. Please try again.');
      setPin('');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5, 7, 12, 0.98)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(12px)' }}>
      <div style={{ width: '100%', maxWidth: '320px', textAlign: 'center', padding: '24px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(245, 166, 35, 0.1)', color: '#F5A623', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Lock size={32} />
        </div>
        <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>Security Check</h3>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '24px' }}>Enter your 4-digit security PIN to continue.</p>
        
        <form onSubmit={handleSubmit}>
          <input 
            type="password" 
            maxLength={4} 
            value={pin} 
            onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', fontSize: '24px', textAlign: 'center', letterSpacing: '1em', color: '#fff', marginBottom: '16px', outline: 'none' }}
            autoFocus
          />
          {error && <p style={{ color: '#FF4D4D', fontSize: '12px', marginBottom: '16px' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" style={{ flex: 2, padding: '14px', borderRadius: '12px', background: '#F5A623', color: '#000', border: 'none', fontWeight: 800, cursor: 'pointer' }}>Unlock</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ProfilePage = () => {
  const { user, wallet, savePaymentAccounts, submitReview, updateReview, deleteReview, logout, submitKycDetails, updateUser } = useAuth();
  

  const [showKYC, setShowKYC] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddAcc, setShowAddAcc] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSecurityLock, setShowSecurityLock] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [securityAction, setSecurityAction] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('openKyc') === 'true' && user?.kyc_status === 'none') {
      setShowKYC(true);
    }
  }, [user?.kyc_status]);
  
  // Edit Profile Form State
  const [editName, setEditName] = useState(user?.full_name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editLoading, setEditLoading] = useState(false);

  const [newBank, setNewBank] = useState('CBE');
  const [newAccNum, setNewAccNum] = useState('');
  const [newHolder, setNewHolder] = useState('');
  const [activeLightboxImage, setActiveLightboxImage] = useState(null);
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);

  // Review state
  const [myReview, setMyReview] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');
  const [reviewEditing, setReviewEditing] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      // Fetch user review from Supabase if needed
      // For now, using mock or skipping to fix build
    }
  }, [user?.id]);

  const handleSubmitReview = async () => {
    if (!reviewContent.trim()) return;
    setReviewLoading(true);
    try {
      if (myReview) {
        await updateReview(myReview.id, reviewRating, reviewContent);
        setMyReview({ ...myReview, rating: reviewRating, content: reviewContent, updated_at: new Date().toISOString() });
      } else {
        const result = await submitReview(reviewRating, reviewContent);
        if (result !== false) {
          setMyReview({ user_id: user.id, username: user.username, rating: reviewRating, content: reviewContent, created_at: new Date().toISOString() });
          setReviewContent('');
          setReviewRating(5);
        }
      }
      setReviewEditing(false);
    } catch (err) {
      // error already shown via setError in auth context
    } finally { setReviewLoading(false); }
  };

  const handleDeleteReview = async () => {
    if (!window.confirm('Delete your review?')) return;
    await deleteReview(myReview.id);
    setMyReview(null);
    setReviewContent('');
    setReviewRating(5);
  };

  // Cryptographic getTronAddress is now imported from utils/crypto.js

  const getImageUrl = (src) => {
    if (!src) return '';
    if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) return src;
    // Fallback for local development or missing base URL
    const baseUrl = import.meta.env.VITE_API_URL || '';
    return `${baseUrl}${src}`;
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
    const currentList = user.payment_accounts || [];
    const updatedList = [...currentList, newAcc];
    await savePaymentAccounts(updatedList);
    setNewAccNum('');
    setNewHolder('');
    setShowAddAcc(false);
  };

  const handleDeleteAccount = async (id) => {
    if (!window.confirm('Delete this payment account profile?')) return;
    const currentList = user.payment_accounts || [];
    const updatedList = currentList.filter(a => a.id !== id);
    await savePaymentAccounts(updatedList);
  };

  const handleEditProfile = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const updates = {};
      if (editName !== (user?.full_name || '')) updates.full_name = editName;
      if (editPhone !== (user?.phone || '')) updates.phone = editPhone;
      if (editEmail !== (user?.email || '')) updates.email = editEmail;

      if (Object.keys(updates).length > 0) {
        await updateUser(updates);
      }
      alert('✓ Profile updated successfully!');
      setShowEditProfile(false);
    } catch (err) {
      alert('Error updating profile: ' + err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleProfilePicUpload = async () => {
    if (!profilePicFile) return;
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result;
        await updateUser({ profile_pic: base64 });
        setProfilePicFile(null);
        setProfilePicPreview(null);
        alert('✓ Profile picture updated!');
      };
      reader.readAsDataURL(profilePicFile);
    } catch (err) {
      alert('Error uploading profile picture: ' + err.message);
    }
  };

  const handleSecurityVerify = () => {
    setShowSecurityLock(false);
    if (securityAction === 'view_docs') {
      setIsFlipped(true);
      // In a real app, this would also decrypt/reveal the ID images
    } else if (securityAction === 'withdraw') {
      // Trigger withdrawal flow
    }
    setSecurityAction(null);
  };

  const triggerSecurity = (action) => {
    setSecurityAction(action);
    setShowSecurityLock(true);
  };

  if (!user) return null;

  const kycSteps = [
    { key: 'registered', label: 'Account Created', done: true },
    { key: 'id_uploaded', label: 'ID / Passport Uploaded', done: ['id_uploaded', 'pending', 'approved'].includes(user.kyc_step) },
    { key: 'face_captured', label: 'Selfie Verified', done: ['pending', 'approved'].includes(user.kyc_step) || user.kyc_selfie },
    { key: 'approved', label: 'Admin Approved', done: user.kyc_status === 'approved' },
  ];

  const kycStatusBadge = () => {
    switch (user.kyc_status) {
      case 'approved': 
        return (
          <span className="badge" style={{ background: 'rgba(0, 200, 150, 0.12)', color: '#00C896', border: '1px solid rgba(0, 200, 150, 0.25)', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '99px' }}>
            ✓ Verified
          </span>
        );
      case 'pending':  
        return (
          <span className="badge" style={{ background: 'rgba(245, 166, 35, 0.12)', color: '#F5A623', border: '1px solid rgba(245, 166, 35, 0.25)', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '99px' }}>
            ⏳ Under Review
          </span>
        );
      case 'rejected': 
        return (
          <span className="badge" style={{ background: 'rgba(255, 77, 77, 0.12)', color: '#FF4D4D', border: '1px solid rgba(255, 77, 77, 0.25)', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '99px' }}>
            ✗ Rejected
          </span>
        );
      default:         
        return (
          <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--muted)', border: '1px solid var(--border)', fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '99px' }}>
            Not Verified
          </span>
        );
    }
  };

  const joinDate = user.joined_at
    ? new Date(user.joined_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Recently';

  const fullName = user.full_name || user.kyc_data?.name || user.display_name || user.username;
  const email = user.email || 'No email registered';
  const ethAddr = user.eth_address || '—';
  const tronAddr = getTronAddress(user.eth_address);
  const qrData = `EthiSwap Digital ID\nName: ${fullName}\nEmail: ${email}\nUsername: ${user.username}\nID: ${user.numeric_id || '—'}\nUSDT-ERC20: ${ethAddr}\nUSDT-TRC20: ${tronAddr}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120&data=${encodeURIComponent(qrData)}`;

  // Default to profilePicUrl or DEFAULT_AVATAR_SVG
  const userAvatar = user.profile_pic || (user.kyc_selfie ? getAvatarUrl(user.kyc_selfie) : getAvatarUrl(DEFAULT_AVATAR_SVG));

  // Split name into first and last for vertical stacked typography
  const nameParts = fullName.trim().split(/\s+/);
  const firstName = nameParts[0] || 'ETHIO';
  const lastName = nameParts.slice(1).join(' ') || 'SWAPPER';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      
      {/* ─── STYLING INJECTIONS ─────────────────────────────────── */}
      <style>{`
        .rainbow-ring {
          padding: 4px;
          border-radius: 50%;
          background: linear-gradient(45deg, #00C896, #F5A623, #3b82f6, #ec4899, #00C896);
          background-size: 200% 200%;
          animation: rainbow-rotate 4s linear infinite;
        }
        @keyframes rainbow-rotate {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .stat-card {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          transition: all 0.2s ease;
        }
        .stat-card:hover {
          border-color: #F5A623;
          transform: translateY(-2px);
        }
        .action-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          color: var(--text-1);
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .action-btn:hover {
          background: rgba(245, 166, 35, 0.05);
          border-color: #F5A623;
          color: #F5A623;
        }
        .badge-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
          gap: 12px;
        }
        .badge-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          text-align: center;
          opacity: 0.4;
          filter: grayscale(1);
        }
        .badge-item.unlocked {
          opacity: 1;
          filter: grayscale(0);
        }
        
        /* Digital ID Card 3D Flip per Item #10 */
        .id-card-container {
          perspective: 1000px;
          width: 100%;
          aspect-ratio: 1.58 / 1;
          cursor: pointer;
        }
        .id-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          transform-style: preserve-3d;
        }
        .id-card-container.flipped .id-card-inner {
          transform: rotateY(180deg);
        }
        .id-card-front, .id-card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 15px 35px rgba(0,0,0,0.5);
        }
        .id-card-back {
          transform: rotateY(180deg);
          background: #141827;
        }
      `}</style>

      {/* ─── DIGITAL ID CARD & CONTROL per Item #10 ─── */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>Digital Identity Card</h3>
          <div style={{ 
            display: 'flex', 
            background: 'rgba(255,255,255,0.05)', 
            borderRadius: '10px', 
            padding: '3px',
            border: '1px solid var(--border)'
          }}>
            <button 
              onClick={() => setIsFlipped(false)}
              style={{ 
                padding: '6px 12px', 
                borderRadius: '7px', 
                border: 'none', 
                fontSize: '11px', 
                fontWeight: 600,
                background: !isFlipped ? 'var(--teal)' : 'transparent',
                color: !isFlipped ? '#04342C' : 'var(--muted)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              White Card
            </button>
            <button 
              onClick={() => setIsFlipped(true)}
              style={{ 
                padding: '6px 12px', 
                borderRadius: '7px', 
                border: 'none', 
                fontSize: '11px', 
                fontWeight: 600,
                background: isFlipped ? 'var(--teal)' : 'transparent',
                color: isFlipped ? '#04342C' : 'var(--muted)',
                cursor: 'pointer',
                transition: 'all 0.2'
              }}
            >
              Flip Card
            </button>
          </div>
        </div>

        <div className={`id-card-container ${isFlipped ? 'flipped' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
          <div className="id-card-inner">
            {/* FRONT SIDE */}
            <div className="id-card-front" style={{ 
              background: 'linear-gradient(135deg, #1a1d24 0%, #0a0c12 100%)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 900, fontSize: '14px' }}>ES</div>
                  <span style={{ fontWeight: 800, fontSize: '16px', letterSpacing: '0.5px' }}>EthioSwap <span style={{ color: 'var(--gold)', fontSize: '10px' }}>ID</span></span>
                </div>
                {kycStatusBadge()}
              </div>

              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', border: '2px solid var(--gold)' }}>
                  <img src={userAvatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff', textTransform: 'uppercase' }}>{fullName}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 600 }}>@{user.username}</div>
                  
                  {/* Stats Row per Item #10 */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '8px', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase' }}>Trades</span>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#fff' }}>{user.trade_count || 0}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '8px', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase' }}>Volume</span>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#fff' }}>${(user.total_volume || 0).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '8px', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase' }}>Reputation</span>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#00C896' }}>{user.reputation ?? 100}%</span>
                    </div>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 700, marginTop: '4px' }}>MEMBER SINCE {joinDate.split(' ')[1]?.toUpperCase() || '2026'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '9px', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase' }}>Trading ID</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '2px', color: '#fff' }}>#{user.numeric_id || '0000'}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '9px', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase' }}>Status</span>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: user.kyc_status === 'approved' ? '#00C896' : '#F5A623' }}>{user.kyc_status?.toUpperCase() || 'NEW'}</div>
                </div>
              </div>
            </div>

            {/* BACK SIDE */}
            <div className="id-card-back" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ background: '#fff', padding: '10px', borderRadius: '12px', marginBottom: '16px' }}>
                <img src={qrCodeUrl} alt="QR Code" style={{ width: '120px', height: '120px' }} />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', maxWidth: '200px', lineHeight: 1.5 }}>
                This is a verified EthioSwap digital identity. Scan to verify trader reputation and security status.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── BALANCE & POINTS ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="stat-card">
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>ETH Balance</span>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#00C896' }}>${(user.eth_balance ?? 0).toFixed(2)}</div>
          <span style={{ fontSize: '10px', color: 'var(--muted)' }}>USD Escrow Wallet</span>
        </div>
        <div className="stat-card">
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>ETB Balance</span>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#F5A623' }}>ETB {(user.etb_balance ?? 0).toFixed(2)}</div>
          <span style={{ fontSize: '10px', color: 'var(--muted)' }}>Ethiopian Birr</span>
        </div>
      </div>

      <div className="stat-card" style={{ marginTop: '12px', background: 'linear-gradient(135deg, rgba(245,166,35,0.04) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(245,166,35,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Trust Score & Reputation</span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#00C896', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span>⭐ {user.reputation ?? 100}%</span>
              {(user.is_verified_trader || user.kyc_status === 'approved') && (
                <span style={{ background: 'rgba(245,166,35,0.15)', color: '#F5A623', fontSize: '9px', fontWeight: 800, padding: '2px 8px', borderRadius: '99px', border: '1px solid rgba(245,166,35,0.3)', letterSpacing: '0.05em' }}>
                  ★ VERIFIED TRADER
                </span>
              )}
            </div>
          </div>
          <div style={{ fontSize: '24px' }}>🛡️</div>
        </div>
      </div>

      {/* ─── USER INFO ──────────────────────────────────────── */}
      <div className="card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: '#fff' }}>Personal Information</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Full Name</span>
            <span style={{ fontWeight: 600, fontSize: '13px' }}>{user.full_name || '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Username</span>
            <span style={{ fontWeight: 600, fontSize: '13px' }}>@{user.username || '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Email</span>
            <span style={{ fontWeight: 600, fontSize: '13px' }}>{user.email || '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Phone</span>
            <span style={{ fontWeight: 600, fontSize: '13px' }}>{user.phone || '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Country</span>
            <span style={{ fontWeight: 600, fontSize: '13px' }}>{user.country || '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--muted)', fontSize: '13px' }}>City</span>
            <span style={{ fontWeight: 600, fontSize: '13px' }}>{user.city || '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Work</span>
            <span style={{ fontWeight: 600, fontSize: '13px' }}>{user.work || '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Trading ID</span>
            <span style={{ fontWeight: 600, fontSize: '13px', fontFamily: 'var(--font-mono)' }}>#{user.numeric_id || '—'}</span>
          </div>
        </div>
        <button
          onClick={() => setShowEditProfile(true)}
          style={{
            width: '100%', marginTop: '16px', padding: '12px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
            color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
          }}
        >
          ✏️ Edit Profile
        </button>
      </div>

      {/* ─── PAYMENT ACCOUNTS (BANK DETAILS) ─── */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>Payment / Bank Accounts</h3>
          <button 
            onClick={() => setShowAddAcc(true)}
            style={{ 
              background: '#00C896', color: '#04342C', border: 'none', borderRadius: '8px', 
              padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '4px' 
            }}
          >
            <Plus size={14} /> Add Account
          </button>
        </div>

        {/* List of saved payment accounts */}
        {user.payment_accounts && user.payment_accounts.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {user.payment_accounts.map(acc => {
              const matched = SUPPORTED_BANKS.find(b => b.id === acc.bankName);
              return (
                <div key={acc.id} style={{ 
                  background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', 
                  borderRadius: '12px', padding: '12px 14px', display: 'flex', 
                  justifyContent: 'space-between', alignItems: 'center' 
                }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                      <span>{matched?.icon || '🏦'}</span>
                      <span>{matched?.label || acc.bankName}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                      Acc: <span style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>{acc.accountNumber}</span> · Holder: <span style={{ color: '#fff' }}>{acc.holderName}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteAccount(acc.id)}
                    style={{ background: 'none', border: 'none', color: '#FF4D4D', cursor: 'pointer', padding: '6px' }}
                    title="Delete Account"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ 
            padding: '20px', textAlign: 'center', border: '1px dashed var(--border)', 
            borderRadius: '12px', color: 'var(--muted)', fontSize: '13px' 
          }}>
            No saved bank profiles. Add one to receive birr payments.
          </div>
        )}
      </div>

      {/* ─── QUICK ACTIONS ─────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button className="action-btn" onClick={() => {/* handle deposit */}}>
          <div style={{ background: 'rgba(0, 200, 150, 0.1)', color: '#00C896', padding: '10px', borderRadius: '12px' }}>
            <Plus size={24} />
          </div>
          <span>Deposit</span>
        </button>
        <button className="action-btn" onClick={() => triggerSecurity('withdraw')}>
          <div style={{ background: 'rgba(245, 166, 35, 0.1)', color: '#F5A623', padding: '10px', borderRadius: '12px' }}>
            <RefreshCw size={24} />
          </div>
          <span>Withdraw</span>
        </button>
        <button className="action-btn" onClick={() => {/* navigate to trades */}}>
          <div style={{ background: 'rgba(0, 200, 150, 0.1)', color: '#00C896', padding: '10px', borderRadius: '12px' }}>
            <ChevronRight size={24} />
          </div>
          <span>Trade</span>
        </button>
      </div>

      {/* ─── IDENTITY VERIFICATION (KYC) ──────────────────────── */}
      {user.kyc_status === 'approved' ? (
        <div style={{
          borderRadius: '20px', padding: '20px',
          background: 'linear-gradient(135deg, rgba(0,200,150,0.08) 0%, rgba(0,180,135,0.04) 100%)',
          border: '1.5px solid rgba(0,200,150,0.3)',
          display: 'flex', alignItems: 'center', gap: '16px',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '16px', flexShrink: 0,
            background: 'rgba(0,200,150,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26,
          }}>✅</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#00C896', marginBottom: '2px' }}>Identity Verified</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>
              Your KYC is approved. You can trade freely on EthioSwap.
            </div>
          </div>
        </div>
      ) : user.kyc_status === 'pending' ? (
        <div style={{
          borderRadius: '20px', padding: '20px',
          background: 'linear-gradient(135deg, rgba(245,166,35,0.08) 0%, rgba(200,150,0,0.04) 100%)',
          border: '1.5px solid rgba(245,166,35,0.3)',
          display: 'flex', alignItems: 'center', gap: '16px',
        }}>
          <div style={{ width: 52, height: 52, borderRadius: '16px', flexShrink: 0, background: 'rgba(245,166,35,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>⏳</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#F5A623', marginBottom: '2px' }}>Under Review</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>
              Your documents are being reviewed by our team. Usually takes under 24 hours.
            </div>
          </div>
        </div>
      ) : user.kyc_status === 'rejected' ? (
        <div style={{
          borderRadius: '20px', padding: '20px',
          background: 'rgba(255,77,77,0.06)', border: '1.5px solid rgba(255,77,77,0.3)',
          display: 'flex', flexDirection: 'column', gap: '14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: 52, height: 52, borderRadius: '16px', flexShrink: 0, background: 'rgba(255,77,77,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>❌</div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#FF4D4D', marginBottom: '2px' }}>Verification Rejected</div>
              {user.kyc_rejection_reason && (
                <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.4 }}>
                  Reason: <span style={{ color: '#fca5a5' }}>{user.kyc_rejection_reason}</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowKYC(true)}
            style={{
              padding: '14px', borderRadius: '14px', border: 'none', cursor: 'pointer',
              background: '#FF4D4D', color: '#fff', fontWeight: 600, fontSize: '14px',
              fontFamily: 'var(--font)', width: '100%',
            }}
          >
            🔄 Retry Verification
          </button>
        </div>
      ) : (
        /* NOT STARTED — the most important CTA */
        <div style={{
          borderRadius: '20px', overflow: 'hidden',
          border: '1.5px solid rgba(245,166,35,0.35)',
          background: 'linear-gradient(135deg, #141827 0%, rgba(245,166,35,0.05) 100%)',
        }}>
          {/* Top urgency banner */}
          <div style={{
            background: 'rgba(245,166,35,0.12)', padding: '10px 20px',
            borderBottom: '1px solid rgba(245,166,35,0.15)',
            fontSize: '11px', fontWeight: 600, color: '#F5A623', textAlign: 'center',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            ⚠️ Required to Trade on EthioSwap
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '18px' }}>
              <div style={{ width: 52, height: 52, borderRadius: '16px', flexShrink: 0, background: 'rgba(245,166,35,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🛡️</div>
              <div>
                <div style={{ fontSize: '17px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>Verify Your Identity</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6 }}>
                  Complete a quick KYC check to unlock deposits, withdrawals, and P2P trading.
                </div>
              </div>
            </div>

            {/* Steps */}
            {kycSteps.map((s, i) => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: i < kycSteps.length - 1 ? '10px' : '18px' }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: s.done ? 'rgba(0,200,150,0.15)' : 'rgba(255,255,255,0.05)',
                  border: `1.5px solid ${s.done ? '#00C896' : 'rgba(255,255,255,0.1)'}`,
                  fontSize: '12px', fontWeight: 600,
                  color: s.done ? '#00C896' : '#8A9BB8',
                }}>
                  {s.done ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: '13px', color: s.done ? '#00C896' : 'var(--muted)', fontWeight: s.done ? 600 : 400 }}>{s.label}</span>
              </div>
            ))}

            <button
              onClick={() => setShowKYC(true)}
              style={{
                width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
                cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600, fontSize: '16px',
                background: '#00C896',
                color: '#04342C',
                boxShadow: '0 4px 20px rgba(0,200,150,0.35)',
                transition: 'all 0.2s',
              }}
            >
              🪪 Start Identity Verification →
            </button>
            <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center', marginTop: '10px' }}>
              Takes 2–3 minutes · Your data is encrypted and secure
            </div>
          </div>
        </div>
      )}

      {/* ─── STATS SUMMARY ─────────────────────────────────────── */}
      <div className="card glass-card" style={{ padding: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: '#fff' }}>Performance Stats</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Average Star Rating</span>
            <span style={{ fontWeight: 600, color: 'var(--gold)' }}>⭐ {(user.avg_rating || 5.0).toFixed(1)} / 5.0</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Positive Feedback</span>
            <span style={{ fontWeight: 600, color: '#00C896' }}>👍 {user.positive_percentage || 100}% positive</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Total Completed Trades</span>
            <span style={{ fontWeight: 600 }}>{user.trade_count || 0} trades</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Member Since</span>
            <span style={{ fontWeight: 600 }}>{joinDate}</span>
          </div>
        </div>
      </div>

      {/* ─── SECURITY SECTION: ID DOCUMENTS ──────────────────── */}
      <div className="card" style={{ padding: '20px', border: '1px dashed var(--border)', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={20} style={{ color: 'var(--muted)' }} />
            </div>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>Confidential ID Data</h4>
              <p style={{ fontSize: '11px', color: 'var(--muted)' }}>Protected by security lock</p>
            </div>
          </div>
          <button 
            onClick={() => triggerSecurity('view_docs')}
            className="btn btn-sm btn-ghost"
            style={{ padding: '8px 16px', borderRadius: '8px' }}
          >
            🪪 View Documents
          </button>
        </div>
      </div>





      {/* ─── WRITE A REVIEW ──────────────────────────────────── */}
      <div className="card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: '#fff' }}>Write a Review About Us</h3>
        <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px' }}>
          Share your experience with EthioSwap. Your review will appear on our landing page.
        </p>

        {myReview && !reviewEditing ? (
          <div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
              {(() => {
                const rating = Math.max(0, Math.min(5, Math.round(Number(myReview.rating) || 5)));
                return (
                  <>
                    {Array.from({ length: rating }).map((_, i) => <span key={i} style={{ color: '#F5A623', fontSize: '16px' }}>★</span>)}
                    {Array.from({ length: 5 - rating }).map((_, i) => <span key={i} style={{ color: '#3a3a3a', fontSize: '16px' }}>★</span>)}
                  </>
                );
              })()}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-2)', fontStyle: 'italic', margin: '0 0 16px 0', lineHeight: 1.6 }}>"{myReview.content}"</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setReviewEditing(true)} className="btn btn-ghost" style={{ fontSize: '12px', flex: 1 }}>✏️ Edit Review</button>
              <button onClick={handleDeleteReview} className="btn btn-ghost" style={{ fontSize: '12px', color: '#FF4D4D', flex: 1 }}>🗑️ Delete Review</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: '6px' }}>Your Rating</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} onClick={() => setReviewRating(star)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '28px', padding: 0, color: star <= reviewRating ? '#F5A623' : '#3a3a3a' }}>★</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: '6px' }}>Your Review</label>
              <textarea
                value={reviewContent}
                onChange={e => setReviewContent(e.target.value)}
                placeholder="Tell others about your experience with EthioSwap..."
                rows={4}
                style={{ width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', fontSize: '13px', color: 'var(--text-1)', resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font)' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleSubmitReview} disabled={reviewLoading || !reviewContent.trim()} className="btn btn-gold" style={{ flex: 1 }}>
                {reviewLoading ? 'Posting...' : (myReview ? 'Update Review' : 'Post Review')}
              </button>
              {reviewEditing && (
                <button onClick={() => { setReviewEditing(false); setReviewContent(myReview.content); setReviewRating(myReview.rating); }} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── LOGOUT SECTION ─────────────────────────────────────── */}
      <button 
        onClick={logout} 
        style={{ width: '100%', padding: '14px', borderRadius: '16px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: '#FF9E9E', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 77, 77, 0.1)'; e.currentTarget.style.borderColor = 'rgba(255, 77, 77, 0.3)'; e.currentTarget.style.color = '#FF4D4D'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = '#FF9E9E'; }}
      >
        <LogOut size={18} /> Log Out
      </button>

      {/* ─── DANGER ZONE: DELETE ACCOUNT ──────────────────────── */}
      <div className="card" style={{ padding: '20px', border: '1px solid rgba(255, 77, 77, 0.2)', background: 'rgba(255, 77, 77, 0.02)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#FF4D4D' }}>Danger Zone</h3>
        <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px' }}>
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <button 
          onClick={() => setShowDeleteConfirm(true)} 
          className="btn btn-danger" 
          style={{ width: '100%', padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', background: 'rgba(255, 77, 77, 0.1)', border: '1px solid rgba(255, 77, 77, 0.3)', color: '#FF4D4D' }}
        >
          🗑️ Delete My Account
        </button>
      </div>

      {/* ─── SECURITY LOCK MODAL ───────────────────────────────── */}
      {showSecurityLock && (
        <SecurityLock 
          onVerify={handleSecurityVerify} 
          onClose={() => setShowSecurityLock(false)} 
        />
      )}



      {/* ─── KYC WIZARD MODAL ──────────────────────────────────── */}
      {showKYC && (
        <KYCWizard
          user={user}
          onClose={() => setShowKYC(false)}
          onComplete={async (updatedUser) => {
            setShowKYC(false);
            await submitKycDetails(
              updatedUser.full_name,
              updatedUser.kyc_data,
              updatedUser.kyc_id_front,
              updatedUser.kyc_id_back,
              updatedUser.kyc_selfie
            );
          }}
        />
      )}

      {/* ─── DELETE ACCOUNT CONFIRMATION MODAL ─────────────────── */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '30px 24px', position: 'relative', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.3)', boxShadow: '0 20px 40px rgba(239, 68, 68, 0.1)' }}>
            <div style={{ width: '56px', height: '56px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 16px' }}>⚠️</div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: '#FFF' }}>Delete Account</h3>
            <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.6', marginBottom: '24px' }}>
              Are you sure? This action is permanent and cannot be undone. All your balance, trade history, and profile data will be deleted forever.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowDeleteConfirm(false)} 
                className="btn btn-ghost" 
                style={{ flex: 1, height: '44px', fontWeight: 700, cursor: 'pointer' }}
              >
                No, I am not
              </button>
              <button 
                onClick={async () => {
                  try {
                    await supabase.from('users').delete().eq('id', user.id);
                    logout();
                  } catch (err) {
                    alert("Failed to delete account: " + err.message);
                  }
                }} 
                className="btn btn-danger" 
                style={{ flex: 1, height: '44px', background: '#FF4D4D', color: '#FFF', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Yes, I am sure
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT PROFILE MODAL ─────────────────────────────────── */}
      {showEditProfile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '24px', position: 'relative' }}>
            <button onClick={() => setShowEditProfile(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>
              ✕
            </button>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', color: '#fff' }}>Edit Profile</h3>
            
            <form onSubmit={handleEditProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Profile Picture</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--border)', flexShrink: 0 }}>
                    <img
                      src={profilePicPreview || user.profile_pic || getAvatarUrl(DEFAULT_AVATAR_SVG)}
                      alt="Profile"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      id="profile-pic-upload"
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) { alert('File must be less than 5MB'); return; }
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setProfilePicPreview(reader.result);
                          setProfilePicFile(file);
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById('profile-pic-upload').click()}
                      style={{
                        padding: '8px 16px', borderRadius: '8px',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                        color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      📷 Change Photo
                    </button>
                    {profilePicFile && (
                      <button
                        type="button"
                        onClick={handleProfilePicUpload}
                        style={{
                          marginTop: '8px', padding: '8px 16px', borderRadius: '8px',
                          background: '#00C896', border: 'none',
                          color: '#04342C', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        ✓ Save Photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Full Name</label>
                <input 
                  type="text" 
                  className="input" 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)} 
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Phone Number</label>
                <input 
                  type="text" 
                  className="input" 
                  value={editPhone} 
                  onChange={e => setEditPhone(e.target.value)} 
                  placeholder="Enter phone number"
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Email Address</label>
                <input 
                  type="email" 
                  className="input" 
                  value={editEmail} 
                  onChange={e => setEditEmail(e.target.value)} 
                  placeholder="Enter email address"
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-gold btn-full" 
                disabled={editLoading}
                style={{ marginTop: '10px' }}
              >
                {editLoading ? 'Saving Changes...' : 'Save Profile Updates'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── LIGHTBOX MODAL ─────────────────────────────────────── */}
      {activeLightboxImage && (
        <div 
          onClick={() => setActiveLightboxImage(null)}
          style={{ 
            position: 'fixed', inset: 0, background: 'rgba(5, 7, 12, 0.95)', zIndex: 4000, 
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', 
            backdropFilter: 'blur(10px)', animation: 'fadeIn 0.2s ease-out', cursor: 'zoom-out'
          }}
        >
          <img 
            src={activeLightboxImage} 
            alt="Enlarged Document" 
            style={{ 
              maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', 
              borderRadius: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.8)', 
            }} 
          />
          <div style={{ position: 'absolute', top: '24px', right: '24px', color: '#fff', fontSize: '20px', fontWeight: 'bold' }}>✕ Close</div>
        </div>
      )}

      {/* ─── ADD PAYMENT ACCOUNT MODAL ─── */}
      {showAddAcc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '24px', position: 'relative' }}>
            <button onClick={() => setShowAddAcc(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>
              ✕
            </button>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', color: '#fff' }}>Add Bank / Wallet</h3>
            
            <form onSubmit={handleAddAccount} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Bank or Wallet</label>
                <select 
                  value={newBank} 
                  onChange={e => setNewBank(e.target.value)}
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '10px', color: '#fff', fontSize: '13px', outline: 'none' }}
                >
                  {SUPPORTED_BANKS.map(b => (
                    <option key={b.id} value={b.id} style={{ background: '#141827', color: '#fff' }}>
                      {b.icon} {b.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Account / Phone Number</label>
                <input 
                  type="text" 
                  value={newAccNum} 
                  onChange={e => setNewAccNum(e.target.value)} 
                  placeholder="Enter account number or phone"
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '10px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Account Holder Name</label>
                <input 
                  type="text" 
                  value={newHolder} 
                  onChange={e => setNewHolder(e.target.value)} 
                  placeholder="Enter full name on account"
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '10px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-gold btn-full" 
                style={{ marginTop: '10px', padding: '14px', background: '#F5A623', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}
              >
                Add Account Profile
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProfilePage;

