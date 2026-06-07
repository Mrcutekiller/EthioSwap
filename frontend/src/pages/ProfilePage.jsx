import React, { useState, useEffect } from 'react';
import KYCWizard from '../components/KYCWizard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useMutation, useQuery } from "convex/react";
import { api } from "convex-api";
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
  Lock
} from 'lucide-react';

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
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(245, 197, 24, 0.1)', color: '#f5c518', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
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
          {error && <p style={{ color: '#ef4444', fontSize: '12px', marginBottom: '16px' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" style={{ flex: 2, padding: '14px', borderRadius: '12px', background: '#f5c518', color: '#000', border: 'none', fontWeight: 800, cursor: 'pointer' }}>Unlock</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ProfilePage = ({ user, wallet, apiBase, onUserUpdate, systemSettings }) => {
  const { savePaymentAccounts, submitReview, updateReview, deleteReview, logout, submitKycDetails, sendOtp, updateSensitiveDetails, updateUser } = useAuth();
  
  const [showProfileOtp, setShowProfileOtp] = useState(false);
  const [profileOtpCode, setProfileOtpCode] = useState('');
  const [profileSendingOtp, setProfileSendingOtp] = useState(false);
  const [profileResendTimer, setProfileResendTimer] = useState(0);
  const [profileOtpError, setProfileOtpError] = useState('');

  const deleteAccountMutation = useMutation(api.users.remove);
  
  const generateTelegramCodeMutation = useMutation(api.users.generateTelegramLinkCode);
  const [linkCode, setLinkCode] = useState(user?.telegramLinkCode || '');
  const [deepLink, setDeepLink] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [codeCopied, setCodeCopied] = useState(false);
  const [tgGenerating, setTgGenerating] = useState(false);

  useEffect(() => {
    if (user?.telegramLinkCode && user?.telegramLinkExpires) {
      const remaining = user.telegramLinkExpires - Date.now();
      if (remaining > 0) {
        setLinkCode(user.telegramLinkCode);
        setTimeRemaining(remaining);
        setDeepLink(`https://t.me/EthioSwap_Bot?start=${user.telegramLinkCode}`);
      }
    }
  }, [user]);

  useEffect(() => {
    if (timeRemaining <= 0) {
      setLinkCode('');
      return;
    }
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1000) {
          clearInterval(timer);
          setLinkCode('');
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeRemaining]);

  const formatCountdown = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleGenerateTelegramCode = async (autoOpen = true) => {
    try {
      setTgGenerating(true);
      const res = await generateTelegramCodeMutation({ userId: user.id || user._id });
      if (res && res.code) {
        setLinkCode(res.code);
        setTimeRemaining(10 * 60 * 1000);
        setDeepLink(res.deepLink || `https://t.me/EthioSwap_Bot?start=${res.code}`);
        if (autoOpen && res.deepLink) {
          window.open(res.deepLink, '_blank', 'noopener,noreferrer');
        }
      }
    } catch (err) {
      alert("Error generating Telegram link code: " + err.message);
    } finally {
      setTgGenerating(false);
    }
  };

  const [showKYC, setShowKYC] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddAcc, setShowAddAcc] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSecurityLock, setShowSecurityLock] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('openKyc') === 'true' && user?.kycStatus === 'none') {
      setShowKYC(true);
    }
  }, [user?.kycStatus]);
  
  // Edit Profile Form State
  const [editName, setEditName] = useState(user?.fullName || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editPassword, setEditPassword] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const [newBank, setNewBank] = useState('CBE');
  const [newAccNum, setNewAccNum] = useState('');
  const [newHolder, setNewHolder] = useState('');
  const [activeLightboxImage, setActiveLightboxImage] = useState(null);

  // Review state
  const [myReview, setMyReview] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');
  const [reviewEditing, setReviewEditing] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    if (user?._id) {
      // Fetch user review from Convex if needed
      // For now, using mock or skipping to fix build
    }
  }, [user?._id]);

  const handleSubmitReview = async () => {
    if (!reviewContent.trim()) return;
    setReviewLoading(true);
    try {
      if (myReview) {
        await updateReview(myReview._id, reviewRating, reviewContent);
        setMyReview({ ...myReview, rating: reviewRating, content: reviewContent, updatedAt: new Date().toISOString() });
      } else {
        await submitReview(reviewRating, reviewContent);
        // Refetch review
      }
      setReviewEditing(false);
    } finally { setReviewLoading(false); }
  };

  const handleDeleteReview = async () => {
    if (!window.confirm('Delete your review?')) return;
    await deleteReview(myReview.id);
    setMyReview(null);
    setReviewContent('');
    setReviewRating(5);
  };

  const getTronAddress = (ethAddr) => {
    if (!ethAddr) return '';
    return 'T' + ethAddr.replace('0x', '').substring(0, 33);
  };

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

  useEffect(() => {
    if (profileResendTimer <= 0) return;
    const interval = setInterval(() => {
      setProfileResendTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [profileResendTimer]);

  const triggerProfileOtp = async () => {
    setProfileSendingOtp(true);
    setProfileOtpError('');
    try {
      await sendOtp(user._id, 'sensitive_change');
      setProfileResendTimer(60);
    } catch (err) {
      setProfileOtpError(err.message);
    } finally {
      setProfileSendingOtp(false);
    }
  };

  const handleEditProfile = async (e) => {
    e.preventDefault();
    const hasSensitive = editPhone !== (user?.phone || '') || editEmail !== (user?.email || '') || editPassword !== '';

    if (hasSensitive) {
      if (!user.telegramLinked || !user.telegramChatId) {
        alert('Please connect Telegram in Settings before editing sensitive profile details.');
        return;
      }
      setShowProfileOtp(true);
      setProfileOtpCode('');
      setProfileOtpError('');
      await triggerProfileOtp();
    } else {
      setEditLoading(true);
      try {
        await updateUser({ fullName: editName });
        alert('✓ Profile updated successfully!');
        setShowEditProfile(false);
      } catch (err) {
        alert('Error updating profile: ' + err.message);
      } finally {
        setEditLoading(false);
      }
    }
  };

  const handleProfileOtpVerifyAndSubmit = async (e) => {
    e.preventDefault();
    setProfileOtpError('');
    if (profileOtpCode.length !== 6) {
      setProfileOtpError('Please enter the 6-digit OTP code.');
      return;
    }
    setEditLoading(true);
    try {
      const updates = {};
      if (editPhone !== (user?.phone || '')) updates.phone = editPhone;
      if (editEmail !== (user?.email || '')) updates.email = editEmail;
      if (editPassword !== '') updates.password = editPassword;
      
      if (editName !== (user?.fullName || '')) {
        await updateUser({ fullName: editName });
      }

      await updateSensitiveDetails(profileOtpCode, updates);
      alert('✓ Profile updated successfully!');
      setShowProfileOtp(false);
      setShowEditProfile(false);
      setEditPassword('');
    } catch (err) {
      setProfileOtpError(err.message);
    } finally {
      setEditLoading(false);
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
    { key: 'id_uploaded', label: 'ID / Passport Uploaded', done: ['id_uploaded', 'pending', 'approved'].includes(user.kycStep) },
    { key: 'face_captured', label: 'Selfie Verified', done: ['pending', 'approved'].includes(user.kycStep) || user.kycSelfie },
    { key: 'approved', label: 'Admin Approved', done: user.kycStatus === 'approved' },
  ];

  const kycStatusBadge = () => {
    switch (user.kycStatus) {
      case 'approved': 
        return (
          <span className="badge" style={{ background: 'rgba(0, 212, 160, 0.1)', color: '#00d4a0', border: '1px solid rgba(0, 212, 160, 0.25)', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '99px' }}>
            ✓ Verified
          </span>
        );
      case 'pending':  
        return (
          <span className="badge" style={{ background: 'rgba(245, 197, 24, 0.1)', color: '#f5c518', border: '1px solid rgba(245, 197, 24, 0.25)', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '99px' }}>
            ⏳ Under Review
          </span>
        );
      case 'rejected': 
        return (
          <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '99px' }}>
            ✗ Rejected
          </span>
        );
      default:         
        return (
          <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-3)', border: '1px solid var(--border)', fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '99px' }}>
            Not Verified
          </span>
        );
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

  // Default to Cyberpunk Coder if no custom kycSelfie is selected
  const userAvatar = user.kycSelfie ? getAvatarUrl(user.kycSelfie) : getAvatarUrl(AVATAR_TEMPLATES[0].svg);

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
          background: linear-gradient(45deg, #00d4a0, #f5c518, #3b82f6, #ec4899, #00d4a0);
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
          border-color: #f5c518;
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
          background: rgba(245, 197, 24, 0.05);
          border-color: #f5c518;
          color: #f5c518;
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
          background: #111318;
        }
      `}</style>

      {/* ─── DIGITAL ID CARD & CONTROL per Item #10 ─── */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>Digital Identity Card</h3>
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
                fontWeight: 700,
                background: !isFlipped ? 'var(--gold)' : 'transparent',
                color: !isFlipped ? '#000' : 'var(--text-3)',
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
                fontWeight: 700,
                background: isFlipped ? 'var(--gold)' : 'transparent',
                color: isFlipped ? '#000' : 'var(--text-3)',
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
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#fff' }}>{user.totalTrades || 0}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '8px', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase' }}>Volume</span>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#fff' }}>${(user.totalVolume || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 700, marginTop: '4px' }}>MEMBER SINCE {joinDate.split(' ')[1]?.toUpperCase() || '2026'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '9px', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase' }}>Trading ID</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '2px', color: '#fff' }}>#{user.numericId || '0000'}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '9px', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase' }}>Status</span>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: user.kycStatus === 'approved' ? '#00d4a0' : '#f5c518' }}>{user.kycStatus?.toUpperCase() || 'NEW'}</div>
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
        <div className="stat-card">
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>Available Balance</span>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#00d4a0' }}>${(user.ethBalance ?? 0).toFixed(2)}</div>
          <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>USD Escrow Wallet</span>
        </div>
      </div>

      {/* ─── QUICK ACTIONS ─────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button className="action-btn" onClick={() => {/* handle deposit */}}>
          <div style={{ background: 'rgba(0, 212, 160, 0.1)', color: '#00d4a0', padding: '10px', borderRadius: '12px' }}>
            <Plus size={24} />
          </div>
          <span>Deposit</span>
        </button>
        <button className="action-btn" onClick={() => triggerSecurity('withdraw')}>
          <div style={{ background: 'rgba(245, 197, 24, 0.1)', color: '#f5c518', padding: '10px', borderRadius: '12px' }}>
            <RefreshCw size={24} />
          </div>
          <span>Withdraw</span>
        </button>
        <button className="action-btn" onClick={() => {/* navigate to trades */}}>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '10px', borderRadius: '12px' }}>
            <ChevronRight size={24} />
          </div>
          <span>Trade</span>
        </button>
      </div>

      {/* ─── IDENTITY VERIFICATION (KYC) ──────────────────────── */}
      {user.kycStatus === 'approved' ? (
        <div style={{
          borderRadius: '20px', padding: '20px',
          background: 'linear-gradient(135deg, rgba(0,212,160,0.08) 0%, rgba(0,180,135,0.04) 100%)',
          border: '1.5px solid rgba(0,212,160,0.3)',
          display: 'flex', alignItems: 'center', gap: '16px',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '16px', flexShrink: 0,
            background: 'rgba(0,212,160,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26,
          }}>✅</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#00d4a0', marginBottom: '2px' }}>Identity Verified</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.5 }}>
              Your KYC is approved. You can trade freely on EthioSwap.
            </div>
          </div>
        </div>
      ) : user.kycStatus === 'pending' ? (
        <div style={{
          borderRadius: '20px', padding: '20px',
          background: 'linear-gradient(135deg, rgba(245,197,24,0.08) 0%, rgba(200,150,0,0.04) 100%)',
          border: '1.5px solid rgba(245,197,24,0.3)',
          display: 'flex', alignItems: 'center', gap: '16px',
        }}>
          <div style={{ width: 52, height: 52, borderRadius: '16px', flexShrink: 0, background: 'rgba(245,197,24,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>⏳</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#f5c518', marginBottom: '2px' }}>Under Review</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.5 }}>
              Your documents are being reviewed by our team. Usually takes under 24 hours.
            </div>
          </div>
        </div>
      ) : user.kycStatus === 'rejected' ? (
        <div style={{
          borderRadius: '20px', padding: '20px',
          background: 'rgba(239,68,68,0.06)', border: '1.5px solid rgba(239,68,68,0.3)',
          display: 'flex', flexDirection: 'column', gap: '14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: 52, height: 52, borderRadius: '16px', flexShrink: 0, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>❌</div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#ef4444', marginBottom: '2px' }}>Verification Rejected</div>
              {user.kycRejectionReason && (
                <div style={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.4 }}>
                  Reason: <span style={{ color: '#fca5a5' }}>{user.kycRejectionReason}</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowKYC(true)}
            style={{
              padding: '14px', borderRadius: '14px', border: 'none', cursor: 'pointer',
              background: '#ef4444', color: '#fff', fontWeight: 800, fontSize: '14px',
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
          border: '1.5px solid rgba(245,197,24,0.35)',
          background: 'linear-gradient(135deg, #111318 0%, rgba(245,197,24,0.05) 100%)',
        }}>
          {/* Top urgency banner */}
          <div style={{
            background: 'rgba(245,197,24,0.12)', padding: '10px 20px',
            borderBottom: '1px solid rgba(245,197,24,0.15)',
            fontSize: '11px', fontWeight: 700, color: '#f5c518', textAlign: 'center',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            ⚠️ Required to Trade on EthioSwap
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '18px' }}>
              <div style={{ width: 52, height: 52, borderRadius: '16px', flexShrink: 0, background: 'rgba(245,197,24,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🛡️</div>
              <div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>Verify Your Identity</div>
                <div style={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.6 }}>
                  Complete a quick KYC check to unlock deposits, withdrawals, and P2P trading.
                </div>
              </div>
            </div>

            {/* Steps */}
            {kycSteps.map((s, i) => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: i < kycSteps.length - 1 ? '10px' : '18px' }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: s.done ? 'rgba(0,212,160,0.15)' : 'rgba(255,255,255,0.05)',
                  border: `1.5px solid ${s.done ? '#00d4a0' : 'rgba(255,255,255,0.1)'}`,
                  fontSize: '12px', fontWeight: 800,
                  color: s.done ? '#00d4a0' : '#6b7280',
                }}>
                  {s.done ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: '13px', color: s.done ? '#00d4a0' : '#9ca3af', fontWeight: s.done ? 700 : 400 }}>{s.label}</span>
              </div>
            ))}

            <button
              onClick={() => setShowKYC(true)}
              style={{
                width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
                cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 800, fontSize: '16px',
                background: 'linear-gradient(135deg, #f5c518, #e5a800)',
                color: '#000',
                boxShadow: '0 4px 20px rgba(245,197,24,0.35)',
                transition: 'all 0.2s',
              }}
            >
              🪪 Start Identity Verification →
            </button>
            <div style={{ fontSize: '11px', color: '#6b7280', textAlign: 'center', marginTop: '10px' }}>
              Takes 2–3 minutes · Your data is encrypted and secure
            </div>
          </div>
        </div>
      )}

      {/* ─── TELEGRAM BOT CONNECTION ─────────────────────────── */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(42, 171, 238, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#2AABEE' }}>
            ✈️
          </div>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-1)', margin: 0 }}>Telegram Bot Connection</h3>
            <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: 0 }}>Receive trade alerts and secure OTP codes on Telegram</p>
          </div>
        </div>

        {user.telegramChatId ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,212,160,0.03)', border: '1px solid rgba(0,212,160,0.15)', padding: '12px 16px', borderRadius: '12px' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#00d4a0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🟢 Connected
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>Chat ID: {user.telegramChatId}</span>
            </div>
            <button 
              onClick={() => {
                window.dispatchEvent(new CustomEvent('ethioswap_navigate', { detail: 'settings' }));
              }} 
              className="btn btn-sm btn-ghost" 
              style={{ padding: '6px 12px', fontSize: '11px', textDecoration: 'underline', color: 'var(--gold-light)' }}
            >
              Configure
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-2)', margin: 0, lineHeight: 1.4 }}>
              Link your account to our Telegram bot <b>@EthioSwap_Bot</b> to get rich alerts and check trade statuses even before your account is verified.
            </p>
            {linkCode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'rgba(245,197,24,0.04)', borderRadius: '10px', border: '1px dashed var(--gold)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Linking Code</span>
                  <strong
                    onClick={() => {
                      navigator.clipboard.writeText(linkCode).then(() => {
                        setCodeCopied(true);
                        setTimeout(() => setCodeCopied(false), 2000);
                      });
                    }}
                    style={{ fontSize: '22px', letterSpacing: '2px', color: 'var(--gold)', fontFamily: 'monospace', cursor: 'pointer', padding: '4px 12px', borderRadius: '8px', background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.15)', userSelect: 'all', transition: 'all 0.2s ease' }}
                    title="Click to copy code"
                  >
                    {linkCode}
                  </strong>
                  <span style={{ fontSize: '10px', color: codeCopied ? '#00d4a0' : 'var(--text-3)', marginTop: '4px', fontWeight: codeCopied ? 700 : 400 }}>
                    {codeCopied
                      ? '✓ Copied to clipboard!'
                      : timeRemaining > 0
                        ? `Expires in ${formatCountdown(timeRemaining)} — Tap code to copy`
                        : '⏱ Code expired'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-2)', lineHeight: 1.4 }}>
                    Tap the button below to open Telegram with the code pre-filled. Just hit <b>Send</b>.
                  </div>
                  <a
                    href={deepLink || `https://t.me/EthioSwap_Bot?start=${linkCode}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textDecoration: 'none', padding: '8px', borderRadius: '6px', fontWeight: 700, background: 'linear-gradient(135deg, #2AABEE 0%, #229ED9 100%)', color: '#fff', border: 'none' }}
                  >
                    ✈️ Open & Send Code in Telegram
                  </a>
                  {timeRemaining <= 0 && (
                    <button
                      onClick={() => handleGenerateTelegramCode(true)}
                      disabled={tgGenerating}
                      style={{ background: 'transparent', border: '1px dashed var(--border)', borderRadius: '6px', color: 'var(--gold-light)', padding: '6px', fontSize: '11px', fontWeight: 700, cursor: tgGenerating ? 'wait' : 'pointer' }}
                    >
                      {tgGenerating ? '⏳ Generating…' : '🔄 Generate a new code'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <button
                onClick={() => handleGenerateTelegramCode(true)}
                disabled={tgGenerating}
                className="btn btn-gold btn-full btn-sm"
                style={{ padding: '8px 12px', borderRadius: '6px', fontWeight: 600 }}
              >
                {tgGenerating ? '⏳ Opening Telegram…' : '🔌 Connect Telegram Bot'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── STATS SUMMARY ─────────────────────────────────────── */}
      <div className="card glass-card" style={{ padding: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '16px', color: 'var(--text-1)' }}>Performance Stats</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-3)', fontSize: '13px' }}>Average Star Rating</span>
            <span style={{ fontWeight: 700, color: 'var(--gold)' }}>⭐ {(user.avg_rating || user.averageRating || 5.0).toFixed(1)} / 5.0</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-3)', fontSize: '13px' }}>Positive Feedback</span>
            <span style={{ fontWeight: 700, color: '#00d4a0' }}>👍 {user.positive_percentage || 100}% positive</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-3)', fontSize: '13px' }}>Total Completed Trades</span>
            <span style={{ fontWeight: 700 }}>{user.totalCompletedTrades || user.totalTrades || 0} trades</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-3)', fontSize: '13px' }}>Member Since</span>
            <span style={{ fontWeight: 700 }}>{joinDate}</span>
          </div>
        </div>
      </div>

      {/* ─── SECURITY SECTION: ID DOCUMENTS ──────────────────── */}
      <div className="card" style={{ padding: '20px', border: '1px dashed var(--border)', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={20} style={{ color: 'var(--text-3)' }} />
            </div>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>Confidential ID Data</h4>
              <p style={{ fontSize: '11px', color: 'var(--text-3)' }}>Protected by security lock</p>
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
        <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '16px', color: 'var(--text-1)' }}>Write a Review About Us</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '16px' }}>
          Share your experience with EthioSwap. Your review will appear on our landing page.
        </p>

        {myReview && !reviewEditing ? (
          <div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
              {(() => {
                const rating = Math.max(0, Math.min(5, Math.round(Number(myReview.rating) || 5)));
                return (
                  <>
                    {Array.from({ length: rating }).map((_, i) => <span key={i} style={{ color: '#f5c518', fontSize: '16px' }}>★</span>)}
                    {Array.from({ length: 5 - rating }).map((_, i) => <span key={i} style={{ color: '#3a3a3a', fontSize: '16px' }}>★</span>)}
                  </>
                );
              })()}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-2)', fontStyle: 'italic', margin: '0 0 16px 0', lineHeight: 1.6 }}>"{myReview.content}"</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setReviewEditing(true)} className="btn btn-ghost" style={{ fontSize: '12px', flex: 1 }}>✏️ Edit Review</button>
              <button onClick={handleDeleteReview} className="btn btn-ghost" style={{ fontSize: '12px', color: '#ef4444', flex: 1 }}>🗑️ Delete Review</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: '6px' }}>Your Rating</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} onClick={() => setReviewRating(star)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '28px', padding: 0, color: star <= reviewRating ? '#f5c518' : '#3a3a3a' }}>★</button>
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

      {/* ─── DANGER ZONE: DELETE ACCOUNT ──────────────────────── */}
      <div className="card" style={{ padding: '20px', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.02)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '8px', color: '#ef4444' }}>Danger Zone</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '16px' }}>
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <button 
          onClick={() => setShowDeleteConfirm(true)} 
          className="btn btn-danger" 
          style={{ width: '100%', padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }}
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
              updatedUser.fullName,
              updatedUser.kycData.birthDate,
              updatedUser.kycIdFront,
              updatedUser.kycIdBack,
              updatedUser.kycSelfie
            );
          }}
        />
      )}

      {/* ─── DELETE ACCOUNT CONFIRMATION MODAL ─────────────────── */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '30px 24px', position: 'relative', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.3)', boxShadow: '0 20px 40px rgba(239, 68, 68, 0.1)' }}>
            <div style={{ width: '56px', height: '56px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 16px' }}>⚠️</div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px', color: '#FFF' }}>Delete Account</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: '1.6', marginBottom: '24px' }}>
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
                    await deleteAccountMutation({ id: user._id });
                    logout();
                  } catch (err) {
                    alert("Failed to delete account: " + err.message);
                  }
                }} 
                className="btn btn-danger" 
                style={{ flex: 1, height: '44px', background: '#EF4444', color: '#FFF', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
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
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px', color: 'var(--text-1)' }}>Edit Profile</h3>
            
            <form onSubmit={handleEditProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>Full Name</label>
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
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>Phone Number</label>
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
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>Email Address</label>
                <input 
                  type="email" 
                  className="input" 
                  value={editEmail} 
                  onChange={e => setEditEmail(e.target.value)} 
                  placeholder="Enter email address"
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>New Password (leave blank to keep current)</label>
                <input 
                  type="password" 
                  className="input" 
                  value={editPassword} 
                  onChange={e => setEditPassword(e.target.value)} 
                  placeholder="••••••••"
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

      {/* Profile Update OTP Modal */}
      {showProfileOtp && (
        <div className="overlay modal-center" style={{ zIndex: 1100, position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="modal-box" style={{ width: '100%', maxWidth: '340px', padding: '24px 20px', textAlign: 'center', background: '#111318', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: '#fff' }}>Profile Security Verification</h3>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '16px', lineHeight: '1.4' }}>
              Confirm your identity by entering the 6-digit OTP code to update your profile details.
            </p>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 14px',
              background: 'rgba(42,171,238,0.08)',
              border: '1px solid rgba(42,171,238,0.25)',
              borderRadius: '10px',
              marginBottom: '16px',
            }}>
              <i className="ti ti-brand-telegram" style={{ fontSize: '18px', color: '#2AABEE' }}></i>
              <span style={{ fontSize: '12px', color: 'var(--text-1)', fontWeight: 700 }}>
                Code sent to @EthioSwap_Bot
              </span>
            </div>

            <form onSubmit={handleProfileOtpVerifyAndSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="text"
                maxLength={6}
                placeholder="000000"
                value={profileOtpCode}
                onChange={e => setProfileOtpCode(e.target.value.replace(/\D/g, ''))}
                style={{
                  width: '100%',
                  height: '48px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '20px',
                  fontWeight: 700,
                  textAlign: 'center',
                  letterSpacing: '6px',
                  outline: 'none',
                }}
                className="input"
                autoFocus
              />

              {profileOtpError && (
                <div style={{ color: 'var(--status-danger-text)', fontSize: '12px', textAlign: 'left', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px', borderRadius: '8px' }}>
                  ⚠ {profileOtpError}
                </div>
              )}

              <button
                type="submit"
                disabled={editLoading || profileSendingOtp}
                className="btn btn-gold btn-full"
                style={{
                  height: '44px',
                  fontSize: '14px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #FFD700 0%, #FFE082 100%)',
                  color: '#0A0C12',
                  border: 'none',
                  borderRadius: '10px',
                  width: '100%',
                  cursor: 'pointer',
                }}
              >
                {editLoading ? '⏳ Saving...' : 'Verify & Update Profile'}
              </button>
            </form>

            <div style={{ marginTop: '14px' }}>
              {profileResendTimer > 0 ? (
                <span style={{ fontSize: '11px', color: '#6b7280' }}>Resend code in {profileResendTimer}s</span>
              ) : (
                <button
                  type="button"
                  onClick={() => triggerProfileOtp()}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--gold-light)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Resend Code
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowProfileOtp(false)}
              className="btn btn-ghost btn-sm btn-full"
              style={{ marginTop: '12px', width: '100%' }}
            >
              Cancel
            </button>
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



    </div>
  );
};

export default ProfilePage;

