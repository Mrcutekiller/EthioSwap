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

// 6 Premium, custom-illustrated inline SVG avatar templates
const AVATAR_TEMPLATES = [
  {
    id: 'cyberpunk_coder',
    name: 'Cyberpunk Coder',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
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
    </svg>`
  },
  {
    id: 'crypto_guru',
    name: 'Crypto Guru',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#b45309" />
          <stop offset="100%" stop-color="#f5c518" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg2)" />
      <circle cx="50" cy="30" r="24" stroke="#ffffff" stroke-width="2.5" fill="none" opacity="0.3" />
      <path d="M 22 90 C 22 75, 32 70, 50 70 C 68 70, 78 75, 78 90 Z" fill="#0f172a" />
      <path d="M 45 70 L 50 85 L 55 70" stroke="#f5c518" stroke-width="2" fill="none" />
      <rect x="42" y="76" width="16" height="15" fill="#ffffff" />
      <rect x="44" y="58" width="12" height="14" fill="#f59e0b" rx="2" />
      <circle cx="50" cy="45" r="17" fill="#facc15" />
      <path d="M 33 45 C 33 58, 40 64, 50 64 C 60 64, 67 58, 67 45" fill="none" stroke="#e2e8f0" stroke-width="4.5" stroke-linecap="round" />
      <path d="M 44 54 C 47 56, 53 56, 56 54" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round" />
      <path d="M 33 40 C 31 30, 38 25, 50 25 C 62 25, 69 30, 67 40 C 62 38, 58 35, 50 35 C 42 35, 38 38, 33 40 Z" fill="#f1f5f9" />
      <circle cx="42" cy="43" r="6" stroke="#ffffff" stroke-width="1.5" fill="none" />
      <circle cx="58" cy="43" r="6" stroke="#ffffff" stroke-width="1.5" fill="none" />
      <line x1="48" y1="43" x2="52" y2="43" stroke="#ffffff" stroke-width="1.5" />
    </svg>`
  },
  {
    id: 'defi_nomad',
    name: 'DeFi Nomad',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="bg3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#064e3b" />
          <stop offset="100%" stop-color="#10b981" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg3)" />
      <path d="M 23 88 C 23 74, 33 70, 50 70 C 67 70, 77 74, 77 88 Z" fill="#0f172a" />
      <path d="M 40 70 L 50 79 L 60 70" stroke="#f43f5e" stroke-width="3" fill="none" />
      <rect x="44" y="58" width="12" height="15" fill="#fcd34d" rx="2" />
      <path d="M 33 60 C 33 72, 67 72, 67 60" stroke="#10b981" stroke-width="4.5" fill="none" stroke-linecap="round" />
      <rect x="30" y="52" width="6" height="10" rx="3" fill="#10b981" />
      <rect x="64" y="52" width="6" height="10" rx="3" fill="#10b981" />
      <circle cx="50" cy="45" r="17" fill="#fcd34d" />
      <path d="M 33 38 C 33 24, 40 22, 50 22 C 60 22, 67 24, 67 38 Z" fill="#f97316" />
      <rect x="31" y="34" width="38" height="6" rx="2" fill="#ea580c" />
      <path d="M 34 46 C 34 56, 40 61, 50 61 C 60 61, 66 56, 66 46" stroke="#451a03" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.65" />
      <rect x="36" y="40" width="10" height="7" rx="2" stroke="#1e293b" stroke-width="1.5" fill="none" />
      <rect x="54" y="40" width="10" height="7" rx="2" stroke="#1e293b" stroke-width="1.5" fill="none" />
      <line x1="46" y1="43" x2="54" y2="43" stroke="#1e293b" stroke-width="1.5" />
    </svg>`
  },
  {
    id: 'alpha_trader',
    name: 'Alpha Trader',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="bg4" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e3a8a" />
          <stop offset="100%" stop-color="#3b82f6" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg4)" />
      <path d="M 22 92 C 22 76, 32 72, 50 72 C 68 72, 78 76, 78 92 Z" fill="#1e293b" />
      <path d="M 40 76 C 45 80, 55 80, 60 76" stroke="#f5c518" stroke-width="2.5" fill="none" stroke-linecap="round" />
      <rect x="44" y="58" width="12" height="15" fill="#fca5a5" rx="2" />
      <circle cx="50" cy="45" r="17" fill="#fca5a5" />
      <path d="M 33 38 C 32 23, 44 20, 50 20 C 58 20, 67 24, 67 36 C 60 33, 52 35, 45 38 C 38 41, 35 40, 33 38 Z" fill="#0f172a" />
      <path d="M 37 38 Q 42 36 45 39" stroke="#0f172a" stroke-width="1.5" fill="none" />
      <path d="M 63 38 Q 58 36 55 39" stroke="#0f172a" stroke-width="1.5" fill="none" />
      <circle cx="41" cy="42" r="1.5" fill="#0f172a" />
      <circle cx="59" cy="42" r="1.5" fill="#0f172a" />
      <path d="M 46 52 Q 52 56 55 51" stroke="#0f172a" stroke-linecap="round" stroke-width="1.5" fill="none" />
    </svg>`
  },
  {
    id: 'solidity_wizard',
    name: 'Solidity Wizard',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="bg5" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4c1d95" />
          <stop offset="100%" stop-color="#d946ef" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg5)" />
      <path d="M 23 90 C 23 75, 33 70, 50 70 C 67 70, 77 75, 77 90 Z" fill="#1e1b4b" />
      <path d="M 50 78 L 52 82 L 56 82 L 53 84 L 54 88 L 50 85 L 46 88 L 47 84 L 44 82 L 48 82 Z" fill="#d946ef" />
      <rect x="44" y="58" width="12" height="14" fill="#fed7aa" rx="2" />
      <path d="M 33 48 C 33 75, 50 82, 50 82 C 50 82, 67 75, 67 48" fill="#e9d5ff" />
      <circle cx="50" cy="45" r="16" fill="#fed7aa" />
      <path d="M 32 42 C 30 25, 45 18, 50 18 C 55 18, 70 25, 68 42 C 64 45, 60 40, 50 40 C 40 40, 36 45, 32 42 Z" fill="#3b0764" />
      <path d="M 50 22 L 51 25 L 54 25 L 52 27 L 53 30 L 50 28 L 47 30 L 48 27 L 46 25 L 49 25 Z" fill="#facc15" />
      <circle cx="43" cy="43" r="5" stroke="#facc15" stroke-width="1.2" fill="none" />
      <circle cx="57" cy="43" r="5" stroke="#facc15" stroke-width="1.2" fill="none" />
      <line x1="48" y1="43" x2="52" y2="43" stroke="#facc15" stroke-width="1.2" />
    </svg>`
  },
  {
    id: 'meme_astronaut',
    name: 'Meme Astronaut',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="bg6" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#0284c7" />
        </linearGradient>
        <linearGradient id="visor6" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#fbbf24" />
          <stop offset="100%" stop-color="#f59e0b" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#bg6)" />
      <circle cx="20" cy="25" r="1" fill="#ffffff" opacity="0.8" />
      <circle cx="80" cy="30" r="0.8" fill="#ffffff" opacity="0.6" />
      <circle cx="35" cy="70" r="1.2" fill="#ffffff" opacity="0.9" />
      <path d="M 22 92 C 22 75, 32 72, 50 72 C 68 72, 78 75, 78 92 Z" fill="#e2e8f0" />
      <rect x="40" y="72" width="20" height="20" fill="#cbd5e1" rx="4" />
      <circle cx="50" cy="80" r="4" fill="#ef4444" />
      <circle cx="50" cy="46" r="23" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5" />
      <path d="M 33 46 C 33 34, 67 34, 67 46 C 67 56, 33 56, 33 46 Z" fill="url(#visor6)" />
      <ellipse cx="50" cy="46" r="10" fill="#ea580c" />
      <ellipse cx="50" cy="47" r="8" fill="#fed7aa" />
      <path d="M 42 39 L 38 33 L 44 36 Z" fill="#ea580c" />
      <path d="M 58 39 L 62 33 L 56 36 Z" fill="#ea580c" />
      <circle cx="46" cy="44" r="1" fill="#000000" />
      <circle cx="54" cy="44" r="1" fill="#000000" />
      <polygon points="50,47 48,46 52,46" fill="#000000" />
      <path d="M 37 42 C 40 37, 48 36, 52 36" stroke="#ffffff" stroke-dasharray="none" stroke-linecap="round" stroke-width="2.5" fill="none" opacity="0.6" />
    </svg>`
  }
];

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
  const { savePaymentAccounts, submitReview, updateReview, deleteReview, logout } = useAuth();
  const updateProfileMutation = useMutation(api.users.update);
  const deleteAccountMutation = useMutation(api.users.remove);
  // loyalty/referral stats derived locally from available data
  const loyaltyInfo = null;
  const referralStats = null;
  
  const [showKYC, setShowKYC] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddAcc, setShowAddAcc] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSecurityLock, setShowSecurityLock] = useState(false);
  const [securityAction, setSecurityAction] = useState(null); // 'view_docs' | 'withdraw'
  const [showLoyaltyHistory, setShowLoyaltyHistory] = useState(false);
  const [showReferralDash, setShowReferralDash] = useState(false);
  
  // Edit Profile Form State
  const [editName, setEditName] = useState(user?.fullName || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editPassword, setEditPassword] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const [newBank, setNewBank] = useState('CBE');
  const [newAccNum, setNewAccNum] = useState('');
  const [newHolder, setNewHolder] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
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

  const handleEditProfile = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      await updateProfileMutation({
        userId: user.id,
        fullName: editName,
        phone: editPhone,
        email: editEmail,
        password: editPassword || undefined
      });
      alert('✓ Profile updated successfully!');
      setShowEditProfile(false);
      if (onUserUpdate) {
        onUserUpdate({
          ...user,
          fullName: editName,
          phone: editPhone,
          email: editEmail
        });
      }
    } catch (err) {
      alert('Error updating profile: ' + err.message);
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="stat-card">
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>Available Balance</span>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#00d4a0' }}>${(user.ethBalance ?? 0).toFixed(2)}</div>
          <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>USD Escrow Wallet</span>
        </div>
        <div className="stat-card" onClick={() => setShowLoyaltyHistory(true)} style={{ cursor: 'pointer' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>Loyalty Points</span>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#f5c518' }}>{user.loyalty_points || 0} pts</div>
          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '6px' }}>
            <div style={{ width: `${Math.min(100, ((user.loyalty_points || 0) % 1000) / 10)}%`, height: '100%', background: '#f5c518', borderRadius: '2px' }} />
          </div>
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

      {/* ─── STATS SUMMARY ─────────────────────────────────────── */}
      <div className="card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '16px', color: 'var(--text-1)' }}>Performance Stats</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-3)', fontSize: '13px' }}>Total Completed Trades</span>
            <span style={{ fontWeight: 700 }}>{user.totalTrades || 0} trades</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-3)', fontSize: '13px' }}>Trust Reputation</span>
            <span style={{ fontWeight: 700, color: '#00d4a0' }}>{user.reputation || 100}% Rating</span>
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

      {/* ─── BADGES & ACHIEVEMENTS ───────────────────────────── */}
      <div className="card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '20px', color: 'var(--text-1)' }}>Badges & Achievements</h3>
        <div className="badge-grid">
          {[
            { id: 'bronze', icon: '🥉', label: 'Bronze' },
            { id: 'silver', icon: '🥈', label: 'Silver' },
            { id: 'gold', icon: '🥇', label: 'Gold' },
            { id: 'diamond', icon: '💎', label: 'Diamond' },
            { id: 'legend', icon: '👑', label: 'Legend' },
            { id: 'verified', icon: '✅', label: 'Verified' },
            { id: 'streak_7', icon: '🔥', label: '7 Day' },
            { id: 'streak_30', icon: '⚡', label: '30 Day' },
          ].map(b => {
            const isUnlocked = 
              (b.id === 'bronze' && (user.totalTrades || 0) >= 5) ||
              (b.id === 'silver' && (user.totalTrades || 0) >= 20) ||
              (b.id === 'gold' && (user.totalTrades || 0) >= 50) ||
              (b.id === 'diamond' && (user.totalTrades || 0) >= 100) ||
              (b.id === 'legend' && (user.totalTrades || 0) >= 500) ||
              (b.id === 'verified' && user.is_verified_trader) ||
              (b.id === 'streak_7' && (user.longest_streak || 0) >= 7) ||
              (b.id === 'streak_30' && (user.longest_streak || 0) >= 30);
            
            return (
              <div key={b.id} className={`badge-item ${isUnlocked ? 'unlocked' : ''}`}>
                <div style={{ fontSize: '32px' }}>{b.icon}</div>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-2)' }}>{b.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── PROFILE CUSTOMIZATION ───────────────────────────── */}
      <div className="card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '16px', color: 'var(--text-1)' }}>Profile Customization</h3>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setShowAvatarPicker(true)} className="btn btn-ghost" style={{ flex: 1, fontSize: '12px' }}>
            🎨 Change Avatar
          </button>
          <button className="btn btn-ghost" style={{ flex: 1, fontSize: '12px' }}>
            ✨ Unlock Borders
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

      {/* ─── REFERRAL DASHBOARD MODAL ──────────────────────────── */}
      {showReferralDash && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '24px', position: 'relative' }}>
            <button onClick={() => setShowReferralDash(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>✕</button>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: 'var(--text-1)' }}>Referral Dashboard</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '20px' }}>Invite friends and earn points + free trades!</p>
            
            <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', textAlign: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 700 }}>Your Unique Code</span>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#f5c518', margin: '4px 0' }}>{user.referral_code}</div>
              <button 
                onClick={() => { navigator.clipboard.writeText(user.referral_code); alert('Copied!'); }}
                className="btn btn-sm btn-gold" style={{ marginTop: '8px' }}
              >
                <Copy size={14} /> Copy Code
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-base)', borderRadius: '12px' }}>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>{referralStats?.totalReferrals || 0}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>Total Referrals</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-base)', borderRadius: '12px' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#00d4a0' }}>{referralStats?.completedReferrals || 0}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>Completed</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-full" style={{ background: '#25D366', color: '#fff', fontSize: '12px' }}>WhatsApp</button>
              <button className="btn btn-full" style={{ background: '#0088cc', color: '#fff', fontSize: '12px' }}>Telegram</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── LOYALTY HISTORY MODAL ─────────────────────────────── */}
      {showLoyaltyHistory && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '24px', position: 'relative', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <button onClick={() => setShowLoyaltyHistory(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>✕</button>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px', color: 'var(--text-1)' }}>Loyalty Points History</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '20px' }}>Your earned and spent points log.</p>
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {loyaltyInfo?.history?.length > 0 ? loyaltyInfo.history.map((h, i) => (
                <div key={i} style={{ padding: '12px', background: 'var(--bg-base)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>{h.reason}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>{new Date(h.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: h.points > 0 ? '#00d4a0' : '#ef4444' }}>
                    {h.points > 0 ? '+' : ''}{h.points}
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>No history yet.</div>
              )}
            </div>

            <button onClick={() => {/* open rewards shop */}} className="btn btn-gold btn-full" style={{ marginTop: '20px' }}>
              Redeem Points for Rewards
            </button>
          </div>
        </div>
      )}

      {/* ─── KYC WIZARD MODAL ──────────────────────────────────── */}
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

      {/* ─── AVATAR PICKER MODAL ───────────────────────────────── */}
      {showAvatarPicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '24px', position: 'relative' }}>
            <button onClick={() => setShowAvatarPicker(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: 'var(--text-1)' }}>Choose Avatar</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '20px' }}>Select one of our premium illustrated avatars.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '24px' }}>
              {AVATAR_TEMPLATES.map(avatar => {
                const isSelected = user.kycSelfie === avatar.svg;
                return (
                  <button 
                    key={avatar.id}
                    onClick={async () => {
                      try {
                        await updateProfileMutation({ id: user._id, updates: { kycSelfie: avatar.svg } });
                        if (onUserUpdate) onUserUpdate({ ...user, kycSelfie: avatar.svg, id: user._id });
                        setShowAvatarPicker(false);
                      } catch (err) {
                        alert("Error saving avatar: " + err.message);
                      }
                    }}
                    style={{
                      background: 'var(--bg-base)',
                      border: `2px solid ${isSelected ? 'var(--gold)' : 'transparent'}`,
                      borderRadius: '16px',
                      padding: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div 
                      style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden' }}
                      dangerouslySetInnerHTML={{ __html: avatar.svg }}
                    />
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-2)' }}>{avatar.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProfilePage;

