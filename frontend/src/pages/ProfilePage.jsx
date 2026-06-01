import React, { useState } from 'react';
import KYCWizard from '../components/KYCWizard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
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

const ProfilePage = ({ user, wallet, apiBase, onUserUpdate, systemSettings }) => {
  const { savePaymentAccounts } = useAuth();
  const [showKYC, setShowKYC] = useState(false);
  const [showAddAcc, setShowAddAcc] = useState(false);
  const [newBank, setNewBank] = useState('CBE');
  const [newAccNum, setNewAccNum] = useState('');
  const [newHolder, setNewHolder] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      
      {/* ─── STYLING INJECTIONS ─────────────────────────────────── */}
      <style>{`
        /* Lanyard Holder Casing & Strap styles */
        .lanyard-holder {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin: 4px auto 16px;
          position: relative;
          width: 328px;
        }

        .lanyard-connector {
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 38px;
          width: 100%;
          position: relative;
          z-index: 10;
        }

        .lanyard-strap {
          width: 16px;
          height: 18px;
          background: linear-gradient(to bottom, #111318, #1f2937);
          border-radius: 3px 3px 0 0;
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.06);
          border-bottom: none;
        }

        .lanyard-clip {
          width: 24px;
          height: 20px;
          background: linear-gradient(135deg, #abb2bf 0%, #4b5563 100%);
          border-radius: 4px;
          border: 1.5px solid #2d3139;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 3px 5px rgba(0,0,0,0.4);
          position: relative;
          top: -2px;
          z-index: 11;
        }

        .lanyard-clip::after {
          content: '';
          width: 6px;
          height: 6px;
          background: #111318;
          border-radius: 50%;
        }

        .lanyard-frame {
          background: linear-gradient(135deg, #1e222b 0%, #0d0f14 100%);
          border: 4.5px solid #252a35;
          border-radius: 26px;
          padding: 8px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.75), inset 0 1px 3px rgba(255,255,255,0.05);
          position: relative;
          width: 100%;
          display: flex;
          justify-content: center;
        }

        .lanyard-slot {
          width: 46px;
          height: 8px;
          background: #000000;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 99px;
          position: absolute;
          top: -14px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 5;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.9);
        }

        /* 3D Flip Mechanics */
        .id-card-perspective {
          perspective: 1500px;
          width: 300px;
          height: 460px;
          cursor: pointer;
        }

        .id-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
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
          padding: 20px;
          transition: border-color 0.3s;
        }

        /* FRONT: Obsidian Dark Theme */
        .id-card-front-obsidian {
          background: linear-gradient(135deg, #07090d 0%, #12151c 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #ffffff;
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.05);
        }

        /* BACK: Prism Silver-White Theme */
        .id-card-back-prism {
          background: linear-gradient(135deg, #ffffff 0%, #f1f3f7 100%);
          border: 1.5px solid rgba(0,0,0,0.08);
          color: #0b0c10;
          transform: rotateY(180deg);
          box-shadow: inset 0 1px 2px rgba(255,255,255,0.9);
        }

        .id-card-sheen {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.02) 100%);
          pointer-events: none;
          z-index: 2;
        }

        .id-card-sheen-back {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 45%, rgba(0,0,0,0.03) 100%);
          pointer-events: none;
          z-index: 2;
        }

        /* Gold metallic chip styling */
        .id-card-chip-gold {
          width: 36px;
          height: 27px;
          border-radius: 6px;
          position: relative;
          background: linear-gradient(135deg, #f5c518 0%, #d4af37 50%, #b45309 100%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.3);
          border: 1px solid rgba(0,0,0,0.15);
          overflow: hidden;
        }

        .id-card-chip-gold::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-image: 
            linear-gradient(90deg, transparent 50%, rgba(0,0,0,0.2) 50%),
            linear-gradient(0deg, transparent 50%, rgba(0,0,0,0.2) 50%);
          background-size: 8px 8px;
        }

        /* Keyframe for rotating rainbow ring */
        @keyframes rainbow-rotate {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        /* Avatar selection grid dynamic styling */
        .avatar-option:hover {
          transform: scale(1.06) !important;
          border-color: #f5c518 !important;
        }

        /* Minor staggers and shadows */
        .fade-in {
          animation: fade-in-anim 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        @keyframes fade-in-anim {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .profile-btn-action:hover {
          background: var(--bg-elevated) !important;
          transform: translateX(2px);
        }
      `}</style>

      {/* ─── DIGITAL MEMBER ID CARD SECTION ─────────────────────── */}
      <div className="card" style={{ padding: '16px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={16} style={{ color: '#f5c518' }} /> Verified Member ID Badge
          </span>
          
          {/* Segmented Control Switcher Pill */}
          <div style={{ display: 'flex', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '99px', padding: '3px', gap: '2px', position: 'relative', width: '124px', height: '28px' }}>
            <div style={{
              position: 'absolute',
              top: '3px',
              bottom: '3px',
              left: isFlipped ? 'calc(50% + 1px)' : '3px',
              width: 'calc(50% - 4px)',
              background: '#f5c518',
              borderRadius: '99px',
              transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
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
                    fontWeight: 800,
                    color: isFaceActive ? '#07090d' : 'var(--text-2)',
                    zIndex: 1,
                    textAlign: 'center',
                    transition: 'color 0.25s'
                  }}
                >
                  {face}
                </button>
              );
            })}
          </div>
        </div>
        <p style={{ fontSize: '11.5px', color: 'var(--text-3)', margin: '0 0 14px 0', lineHeight: 1.4 }}>
          Flip your vertical physical-frame ID to access system scan codes, deposit addresses, or locked confidential KYC document records. Click the badge to flip.
        </p>

        {/* Lanyard Holder Frame Assembly */}
        <div className="lanyard-holder">
          
          {/* Lanyard top straps */}
          <div className="lanyard-connector">
            <div className="lanyard-strap" />
            <div className="lanyard-clip" />
          </div>

          {/* Physical casing border */}
          <div className="lanyard-frame">
            <div className="lanyard-slot" />

            {/* Interactive 3D Perspective Card Container */}
            <div className="id-card-perspective" onClick={() => setIsFlipped(!isFlipped)}>
              <div className={`id-card-inner ${isFlipped ? 'flipped' : ''}`}>
                
                {/* ─── FRONT FACE (Obsidian Dark) ─── */}
                <div className="id-card-front id-card-front-obsidian">
                  <div className="id-card-sheen" />
                  
                  {/* Gray constellation network nodes background */}
                  <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.12 }} xmlns="http://www.w3.org/2000/svg">
                    <line x1="20" y1="40" x2="80" y2="120" stroke="#ffffff" strokeWidth="0.5" />
                    <line x1="80" y1="120" x2="220" y2="90" stroke="#ffffff" strokeWidth="0.5" />
                    <line x1="220" y1="90" x2="160" y2="220" stroke="#ffffff" strokeWidth="0.5" />
                    <line x1="160" y1="220" x2="40" y2="300" stroke="#ffffff" strokeWidth="0.5" />
                    <line x1="40" y1="300" x2="120" y2="380" stroke="#ffffff" strokeWidth="0.5" />
                    <line x1="120" y1="380" x2="250" y2="340" stroke="#ffffff" strokeWidth="0.5" />
                    <line x1="220" y1="90" x2="250" y2="210" stroke="#ffffff" strokeWidth="0.5" />
                    <line x1="250" y1="210" x2="160" y2="220" stroke="#ffffff" strokeWidth="0.5" />
                    <line x1="160" y1="220" x2="250" y2="340" stroke="#ffffff" strokeWidth="0.5" />
                    
                    <circle cx="20" cy="40" r="3.5" fill="#f5c518" />
                    <circle cx="80" cy="120" r="2.5" fill="#ffffff" />
                    <circle cx="220" cy="90" r="3" fill="#ffffff" />
                    <circle cx="160" cy="220" r="4" fill="#f5c518" />
                    <circle cx="40" cy="300" r="2" fill="#ffffff" />
                    <circle cx="120" cy="380" r="3" fill="#ffffff" />
                    <circle cx="250" cy="340" r="4.5" fill="#00d4a0" />
                    <circle cx="250" cy="210" r="2" fill="#ffffff" />
                  </svg>

                  {/* Top brand header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 3, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontSize: '26px', fontWeight: 900, color: '#f5c518', fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>E.</span>
                      <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.12em', fontFamily: "'Inter', sans-serif" }}>ETHIOSWAP</span>
                    </div>
                    {user.kycStatus === 'approved' ? (
                      <span style={{ fontSize: '8.5px', fontWeight: 900, color: '#00d4a0', background: 'rgba(0, 212, 160, 0.12)', border: '1px solid rgba(0, 212, 160, 0.25)', padding: '2px 8px', borderRadius: '99px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>✓ VERIFIED</span>
                    ) : (
                      <span style={{ fontSize: '8.5px', fontWeight: 900, color: '#f5c518', background: 'rgba(245, 197, 24, 0.12)', border: '1px solid rgba(245, 197, 24, 0.25)', padding: '2px 8px', borderRadius: '99px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>PENDING</span>
                    )}
                  </div>

                  {/* Core middle section */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 3, margin: '14px 0' }}>
                    
                    {/* Gold card chip on upper-left */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div className="id-card-chip-gold" />
                        
                        {/* QR Code in white rounded container */}
                        <div style={{
                          background: '#ffffff',
                          padding: '6px',
                          borderRadius: '12px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                          display: 'inline-block',
                          border: '1.5px solid rgba(255,255,255,0.1)'
                        }}>
                          <img src={qrCodeUrl} alt="QR" style={{ width: '84px', height: '84px', display: 'block', borderRadius: '4px' }} />
                        </div>
                      </div>

                      {/* Grayscale Avatar on the Right side */}
                      <div style={{
                        width: '125px',
                        height: '160px',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        background: 'linear-gradient(135deg, #111318 0%, #1e293b 100%)',
                        border: '2px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 12px 28px rgba(0,0,0,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative'
                      }}>
                        <img 
                          src={userAvatar} 
                          alt="ID Portrait" 
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'cover',
                            filter: 'grayscale(100%) contrast(1.05)'
                          }} 
                        />
                        {/* Overlay subtle diagonal lines */}
                        <div style={{
                          position: 'absolute',
                          top: 0, left: 0, right: 0, bottom: 0,
                          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.02) 10px, rgba(255,255,255,0.02) 11px)',
                          pointerEvents: 'none'
                        }} />
                      </div>
                    </div>

                    {/* Numeric ID overlay absolute */}
                    <div style={{
                      position: 'absolute',
                      right: '12px',
                      bottom: '-4px',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      color: 'rgba(255,255,255,0.3)',
                      fontWeight: 700,
                      letterSpacing: '0.04em'
                    }}>
                      NO. {user.numericId || '—'}
                    </div>

                  </div>

                  {/* Lower section name and credentials */}
                  <div style={{ zIndex: 3, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div>
                        {/* Stacked big name block */}
                        <div style={{
                          fontSize: '23px',
                          fontWeight: 900,
                          color: '#ffffff',
                          lineHeight: '1.05',
                          textTransform: 'uppercase',
                          fontFamily: "'Inter', sans-serif",
                          letterSpacing: '-0.02em',
                          maxWidth: '180px',
                          wordWrap: 'break-word'
                        }}>
                          {firstName}
                          <br />
                          {lastName}
                        </div>
                        {/* Gold Italic Role */}
                        <div style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#f5c518',
                          fontStyle: 'italic',
                          marginTop: '4px',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase'
                        }}>
                          P2P TRADER
                        </div>
                      </div>

                      {/* Small text right */}
                      <div style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '8.5px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>
                        <div>ETHADDRESS</div>
                        <div style={{ color: '#ffffff', fontWeight: 600 }}>{ethAddr.substring(0, 8)}...</div>
                      </div>
                    </div>

                    {/* Footer web address */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '8px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
                      <span>🛡️ SECURED CRYPTOGRAPHIC BADGE</span>
                      <span style={{ color: '#f5c518' }}>WWW.ETHIOSWAP.COM</span>
                    </div>
                  </div>
                </div>

                {/* ─── BACK FACE (Prism Silver-White) ─── */}
                <div className="id-card-back id-card-back-prism">
                  <div className="id-card-sheen-back" />
                  
                  {/* Top Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '8px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '20px', fontWeight: 900, color: '#0b0c10', fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>E.</span>
                      <span style={{ fontSize: '9px', fontWeight: 800, color: '#0b0c10', letterSpacing: '0.05em' }}>SECURE STORAGE</span>
                    </div>
                    <span style={{ fontSize: '8px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>KYC IDENTITY DATA</span>
                  </div>

                  {/* Body Details in white aesthetic */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '10px' }}>
                    
                    <div style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '10px', padding: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#6b7280' }}>Handle:</span>
                          <strong style={{ color: '#0b0c10' }}>@{user.username}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#6b7280' }}>Joined:</span>
                          <span style={{ color: '#0b0c10', fontWeight: 500 }}>{joinDate}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#6b7280' }}>User ID:</span>
                          <span style={{ color: '#0b0c10', fontWeight: 500 }}>#{user.numericId || '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Address boxes in white */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ fontSize: '8.5px', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.02em' }}>ERC20 USDT Receive Address</div>
                      <div style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '6px', padding: '6px', fontFamily: 'monospace', fontSize: '9px', color: '#1f2937', wordBreak: 'break-all', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{ethAddr}</span>
                      </div>

                      <div style={{ fontSize: '8.5px', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.02em', marginTop: '2px' }}>TRC20 USDT Receive Address</div>
                      <div style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '6px', padding: '6px', fontFamily: 'monospace', fontSize: '9px', color: '#1f2937', wordBreak: 'break-all' }}>
                        {tronAddr || '—'}
                      </div>
                    </div>

                    {/* KYC Scans Container */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, justifyContent: 'center' }}>
                      {user.kycIdFront || user.kycIdBack || user.kycDocument ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', height: '110px' }}>
                          <div style={{ display: 'flex', gap: '6px', height: '100%' }}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '8px', color: '#6b7280', fontWeight: 700, textAlign: 'center' }}>ID FRONT</span>
                              {user.kycIdFront ? (
                                <img src={user.kycIdFront} style={{ width: '100%', height: '80px', borderRadius: '6px', objectFit: 'cover', border: '1px solid rgba(0,0,0,0.1)' }} alt="Front Scan" />
                              ) : (
                                <div style={{ flex: 1, borderRadius: '6px', background: 'rgba(0,0,0,0.03)', border: '1px dashed rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#9ca3af' }}>None</div>
                              )}
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '8px', color: '#6b7280', fontWeight: 700, textAlign: 'center' }}>ID BACK</span>
                              {user.kycIdBack || user.kycDocument ? (
                                <img src={user.kycIdBack || user.kycDocument} style={{ width: '100%', height: '80px', borderRadius: '6px', objectFit: 'cover', border: '1px solid rgba(0,0,0,0.1)' }} alt="Back Scan" />
                              ) : (
                                <div style={{ flex: 1, borderRadius: '6px', background: 'rgba(0,0,0,0.03)', border: '1px dashed rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#9ca3af' }}>None</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(0,0,0,0.02)',
                          border: '1.5px dashed rgba(0,0,0,0.1)',
                          borderRadius: '12px',
                          padding: '12px',
                          color: '#4b5563',
                          textAlign: 'center',
                          height: '92px'
                        }}>
                          <Lock size={16} style={{ color: '#6b7280', marginBottom: '4px' }} />
                          <strong style={{ fontSize: '9.5px', color: '#0b0c10' }}>Confidential Records Locked</strong>
                          <span style={{ fontSize: '8px', color: '#6b7280', marginTop: '2px' }}>Scanned ID documents are hidden for security.</span>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Footer Back */}
                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '8px', marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '8px', color: '#6b7280', fontFamily: 'monospace' }}>
                    <span>🔐 CONFIDENTIAL DOCUMENT STORAGE</span>
                    <span>TAP TO FLIP 🔄</span>
                  </div>

                </div>

              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ─── REDESIGNED PROFILE HEADER (Noah Thompson Sky-Clouds layout) ─── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
        
        {/* Sky banner background */}
        <div style={{
          width: '100%',
          height: '110px',
          background: 'linear-gradient(135deg, #a5b4fc 0%, #818cf8 50%, #c7d2fe 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Action change avatar button floating */}
          <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10 }}>
            <button
              onClick={() => setShowAvatarPicker(true)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s'
              }}
              className="avatar-option"
              title="Change Avatar"
            >
              <Settings size={16} />
            </button>
          </div>
          
          {/* Abstract vector cloud details */}
          <div style={{ position: 'absolute', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', top: '40px', left: '10%' }} />
          <div style={{ position: 'absolute', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', top: '20px', left: '25%', filter: 'blur(6px)' }} />
          <div style={{ position: 'absolute', width: '90px', height: '90px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)', top: '50px', right: '15%', filter: 'blur(4px)' }} />
        </div>

        {/* Overlapping Avatar wrapped in Rotating Rainbow Gradient border */}
        <div style={{
          position: 'relative',
          marginTop: '-46px',
          zIndex: 2,
          display: 'flex',
          justifyContent: 'center'
        }}>
          <div className="rainbow-ring" onClick={() => setShowAvatarPicker(true)} style={{
            cursor: 'pointer',
            padding: '3.5px',
            borderRadius: '50%',
            background: 'linear-gradient(45deg, #00d4a0, #f5c518, #3b82f6, #ec4899, #00d4a0)',
            backgroundSize: '200% 200%',
            animation: 'rainbow-rotate 4s linear infinite',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
          }}>
            <img
              src={userAvatar}
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                background: 'var(--bg-surface)',
                border: '2px solid var(--bg-surface)',
                objectFit: 'cover'
              }}
              alt="Profile Avatar"
            />
            {/* Tiny Edit Overlay Pencil Badge */}
            <div style={{
              position: 'absolute',
              bottom: '0',
              right: '2px',
              background: '#f5c518',
              border: '2px solid var(--bg-surface)',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: '#07090d',
              fontWeight: 800
            }}>
              +
            </div>
          </div>
        </div>

        {/* Content text */}
        <div style={{ textAlign: 'center', padding: '12px 18px 24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '2px', color: '#ffffff', letterSpacing: '-0.02em' }}>
            {fullName}
          </h2>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#f5c518', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', letterSpacing: '0.04em' }}>
            @{user.username}
            {user.kycStatus === 'approved' && <span style={{ color: '#00d4a0', fontSize: '13px', fontWeight: 900 }} title="Verified P2P Trader">✓</span>}
          </p>
          <p style={{ fontSize: '11.5px', color: 'var(--text-2)', marginTop: '4px' }}>
            Joined {joinDate} · {user.role === 'admin' ? '👑 Admin' : '👤 Trader'}
          </p>
          <div style={{ marginTop: '12px' }}>
            {kycStatusBadge()}
          </div>
        </div>

      </div>

      {/* ─── STYLISH STATS ROW CAPSULE (Noah Thompson Card style) ─── */}
      <div style={{
        display: 'flex',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '12px 6px',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginTop: '-2px'
      }}>
        {[
          { label: 'USD Balance', value: wallet ? `$${wallet.ethAvailable?.toFixed(2) || '0.00'}` : '—' },
          { label: 'Total Trades', value: user.totalTrades ?? 0 },
          { label: 'Reputation', value: `${user.reputation ?? 100}%` },
        ].map((s, i, arr) => (
          <div key={i} style={{
            flex: 1,
            textAlign: 'center',
            borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none'
          }}>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.01em' }}>{s.value}</div>
            <div style={{ fontSize: '9px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px', fontWeight: 700 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ─── WALLET ADDRESS CARD ────────────────────────────────── */}
      <div className="card" style={{ padding: '16px 14px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Wallet size={16} style={{ color: '#f5c518' }} /> P2P Receive Wallet Address
        </div>
        
        <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-2)', wordBreak: 'break-all', letterSpacing: '0.02em', lineHeight: 1.4 }}>
          {user.ethAddress || '—'}
        </div>
        
        <button 
          onClick={() => { 
            navigator.clipboard.writeText(user.ethAddress || ''); 
            alert('Address copied to clipboard!');
          }} 
          style={{ 
            marginTop: '10px', 
            background: 'rgba(245, 197, 24, 0.06)', 
            border: '1px solid rgba(245, 197, 24, 0.15)', 
            color: '#f5c518', 
            fontSize: '11.5px', 
            fontWeight: 700, 
            cursor: 'pointer', 
            borderRadius: '8px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
          className="avatar-option"
        >
          <Copy size={13} /> Copy Secure Address
        </button>
      </div>

      {/* ─── IDENTITY VERIFICATION TRACK ───────────────────────── */}
      <div className="card" style={{ padding: '16px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={16} style={{ color: '#f5c518' }} /> Identity KYC Verification Track
          </div>
          {kycStatusBadge()}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {kycSteps.map((step, i) => (
            <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: i < kycSteps.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ 
                width: '28px', 
                height: '28px', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '11px', 
                fontWeight: 800, 
                background: step.done ? 'var(--status-success-bg)' : 'var(--bg-elevated)', 
                border: `1px solid ${step.done ? 'var(--status-success-border)' : 'var(--border)'}`, 
                color: step.done ? 'var(--status-success-text)' : 'var(--text-3)', 
                flexShrink: 0 
              }}>
                {step.done ? '✓' : i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12.5px', fontWeight: step.done ? 700 : 500, color: step.done ? 'var(--text-1)' : 'var(--text-3)' }}>{step.label}</div>
              </div>
              {step.done ? (
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#00d4a0', background: 'rgba(0, 212, 160, 0.1)', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>Done</span>
              ) : (
                <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-3)', background: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>Locked</span>
              )}
            </div>
          ))}
        </div>

        {/* Verification Action / Alerts */}
        {user.kycStatus !== 'approved' && (
          <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {user.kycStatus === 'rejected' && user.kycRejectionReason && (
              <div className="fade-in" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '12px', fontSize: '12px', color: '#fca5a5', lineHeight: 1.4, display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <span style={{ fontWeight: 800 }}>Verification Rejected:</span> {user.kycRejectionReason}
                </div>
              </div>
            )}
            
            {user.kycStatus === 'pending' || user.kycStep === 'pending' ? (
              <div style={{ background: 'rgba(245,197,24,0.06)', border: '1px solid rgba(245,197,24,0.2)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#fde68a', fontWeight: 500, display: 'flex', gap: '8px', alignItems: 'center' }}>
                <RefreshCw size={14} className="rainbow-ring" style={{ borderRadius: '50%', padding: '1px', animation: 'rainbow-rotate 2s linear infinite' }} />
                <span>Your KYC files are currently under administrator review.</span>
              </div>
            ) : (
              <button onClick={() => setShowKYC(true)} className="btn btn-gold btn-full btn-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px' }}>
                <Shield size={14} /> {user.kycStatus === 'rejected' ? 'Restart Identity Verification' : 'Start Identity Verification'}
              </button>
            )}
          </div>
        )}

        {user.kycStatus === 'approved' && (
          <div style={{ marginTop: '12px', background: 'rgba(0, 212, 160, 0.06)', border: '1px solid rgba(0, 212, 160, 0.2)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#6ee7b7', fontWeight: 600, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <ShieldCheck size={14} /> Identity is fully authenticated. Ready to trade.
          </div>
        )}
      </div>

      {/* ─── SAVED PAYMENT ACCOUNTS (Verified only) ─────────────── */}
      {user.kycStatus === 'approved' && (
        <div className="card" style={{ padding: '16px 14px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Landmark size={16} style={{ color: '#f5c518' }} /> Saved Local Payout Accounts
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '12px', lineHeight: 1.4 }}>
            Link bank or wallet payout nodes to automatically collect local ETB when executing Buy requests.
          </p>

          {/* List of active payout channels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
            {(user.paymentAccounts || []).length === 0 ? (
              <div style={{ padding: '16px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '10px', textAlign: 'center', fontSize: '12px', color: 'var(--text-3)' }}>
                No active payout accounts configured yet.
              </div>
            ) : (
              (user.paymentAccounts || []).map((acc) => {
                const matched = SUPPORTED_BANKS.find(b => b.id === acc.bankName);
                return (
                  <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '12px', transition: 'all 0.2s' }} className="profile-btn-action">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <span style={{ fontSize: '16px' }}>{matched?.icon || '🏦'}</span>
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-1)' }}>
                          {matched?.label || acc.bankName}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '2px', fontFamily: 'monospace' }}>
                          Acc: <span style={{ color: '#ffffff', fontWeight: 700 }}>{acc.accountNumber}</span> · Holder: <span style={{ fontFamily: 'var(--font)' }}>{acc.holderName}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteAccount(acc.id)} 
                      style={{ 
                        padding: '6px 10px', 
                        background: 'rgba(239, 68, 68, 0.08)', 
                        color: '#fca5a5', 
                        border: '1px solid rgba(239,68,68,0.2)', 
                        borderRadius: '6px', 
                        fontSize: '10.5px', 
                        fontWeight: 700, 
                        cursor: 'pointer' 
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Add account panel toggler */}
          {!showAddAcc ? (
            <button 
              onClick={() => setShowAddAcc(true)} 
              className="btn btn-outline btn-full btn-sm"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px' }}
            >
              <Plus size={14} /> Link New Payout Channel
            </button>
          ) : (
            <form onSubmit={handleAddAccount} style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }} className="fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#f5c518', textTransform: 'uppercase', letterSpacing: '0.04em' }}>New Channel Configuration</span>
                <button type="button" onClick={() => setShowAddAcc(false)} style={{ fontSize: '11.5px', color: 'var(--text-3)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              </div>

              <div className="input-group">
                <label className="input-label" style={{ fontSize: '9.5px', color: 'var(--text-3)' }}>Select Financial Node</label>
                <select value={newBank} onChange={e => setNewBank(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '12.5px' }}>
                  {SUPPORTED_BANKS.map(b => (
                    <option key={b.id} value={b.id}>{b.icon} {b.label}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label" style={{ fontSize: '9.5px', color: 'var(--text-3)' }}>Account Identifier / Wallet Phone</label>
                <input type="text" required value={newAccNum} onChange={e => setNewAccNum(e.target.value)} placeholder="e.g. 100029384849 or 0912345678" style={{ width: '100%', padding: '9px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '12.5px' }} />
              </div>

              <div className="input-group">
                <label className="input-label" style={{ fontSize: '9.5px', color: 'var(--text-3)' }}>Holder Legitimate Name</label>
                <input type="text" required value={newHolder} onChange={e => setNewHolder(e.target.value)} placeholder="e.g. Abebe Kebede" style={{ width: '100%', padding: '9px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '12.5px' }} />
              </div>

              <button type="submit" className="btn btn-gold btn-full btn-sm" style={{ marginTop: '4px', padding: '9px' }}>
                Securely Register Payout Channel
              </button>
            </form>
          )}
        </div>
      )}

      {/* ─── SYSTEM ACCOUNT PARAMETERS ─────────────────────────── */}
      <div className="card" style={{ padding: '16px 14px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <User size={16} style={{ color: '#f5c518' }} /> Account System Parameters
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[
            { label: 'Username', value: `@${user.username}` },
            { label: 'Phone Registry', value: user.phone || '—' },
            { label: 'Role Authority', value: user.role === 'admin' ? '👑 Admin Privileges' : '👤 Standard Trader' },
            { label: 'Node Activity', value: user.lastActive ? new Date(user.lastActive).toLocaleString() : '—' },
          ].map((row, i, arr) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--text-2)' }}>{row.label}</span>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-1)' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── INTERACTIVE ILLUSTRATED AVATAR SELECTOR MODAL ────── */}
      {showAvatarPicker && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(7, 9, 13, 0.85)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }} className="fade-in">
          <div className="card" style={{ width: '100%', maxWidth: '380px', padding: '20px', position: 'relative', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 25px 50px rgba(0,0,0,0.6)' }}>
            
            <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#ffffff', marginBottom: '4px', letterSpacing: '-0.01em' }}>Choose Trading Persona</h3>
            <p style={{ fontSize: '11px', color: 'var(--text-2)', marginBottom: '16px', lineHeight: 1.4 }}>
              Select a premium illustrated custom character to represent your profile and physical ID badge.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '18px' }}>
              {AVATAR_TEMPLATES.map((avatar) => {
                const dataUrl = getAvatarUrl(avatar.svg);
                const isSelected = user.kycSelfie === avatar.svg;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => {
                      if (onUserUpdate) onUserUpdate({ kycSelfie: avatar.svg });
                      setShowAvatarPicker(false);
                    }}
                    style={{
                      background: 'var(--bg-base)',
                      border: isSelected ? '2px solid #f5c518' : '1px solid var(--border)',
                      borderRadius: '14px',
                      padding: '8px 4px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s',
                      transform: isSelected ? 'scale(1.04)' : 'none',
                      boxShadow: isSelected ? '0 0 10px rgba(245, 197, 24, 0.15)' : 'none'
                    }}
                    className="avatar-option"
                  >
                    <img src={dataUrl} style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg-surface)' }} alt={avatar.name} />
                    <span style={{ 
                      fontSize: '8.5px', 
                      fontWeight: 800, 
                      color: isSelected ? '#f5c518' : 'var(--text-2)', 
                      textAlign: 'center', 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      width: '100%',
                      maxWidth: '68px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.01em'
                    }}>
                      {avatar.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
            
            <button
              type="button"
              onClick={() => setShowAvatarPicker(false)}
              className="btn btn-outline btn-full btn-sm"
              style={{ width: '100%', padding: '8px' }}
            >
              Close System Console
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

    </div>
  );
};

export default ProfilePage;
