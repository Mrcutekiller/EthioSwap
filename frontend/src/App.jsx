import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth, cleanConvexError } from './context/AuthContext.jsx';
import LandingPage, { FloatingBill } from './pages/LandingPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import P2PListings from './components/P2PListings.jsx';
import UserDashboard from './components/UserDashboard.jsx';
import WalletCard from './components/WalletCard.jsx';
import TradeRoom from './components/TradeRoom.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import TransactionHistory from './pages/TransactionHistory.jsx';
import AppLockScreen from './components/AppLockScreen.jsx';
import { NotificationCenter, useNotifCount } from './components/NotificationCenter.jsx';
import SupportWidget from './components/SupportWidget.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import ScanPage from './pages/ScanPage.jsx';
import SellerProfilePage from './pages/SellerProfilePage.jsx';
import Logo from './components/Logo.jsx';
import { requestPermission, showBrowserNotification, isNotificationSupported } from './utils/notifications.js';
import { convex } from './convexClient';
import { useQuery, useMutation } from "convex/react";
import { api } from "convex-api";

// ── Icons (inline SVG for zero deps) ──
const Icon = ({ d, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const Icons = {
  home:     'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  wallet:   'M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0-2-2V9a2 2 0 0 0-2-2z M16 14a1 1 0 1 0 2 0 1 1 0 0 0-2 0',
  trades:   'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  bell:     'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0',
  person:   'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
  leaderboard: 'M12 20V10 M18 20V4 M6 20v-4',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  admin:    'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  logout:   'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  gift:     'M20 12V8H4v4 M2 6h20v2H2z M12 22V12 M12 7H7.5a2.5 0 0 1 0-5C11 2 12 7 12 7z M12 7h4.5a2.5 0 0 0 0-5C13 2 12 7 12 7z',
  history:  'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
};

// ── Auth Form ──────────────────────────────────────────────────
const AuthForm = ({ mode, onToggle, onBackToHome, externalError }) => {
  const { user, login, register, loading, error } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [work, setWork] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [profilePicPreview, setProfilePicPreview] = useState('');
  const [uploadingPic, setUploadingPic] = useState(false);
  const [localError, setLocalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [width, setWidth] = useState(window.innerWidth);

  // If user is already logged in, don't show auth form
  // (This is handled by AppContent, but just in case)
  if (user) {
    return null;
  }

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Inline validation state
  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Debounced Username Check
  useEffect(() => {
    if (mode === 'login') {
      setUsernameError('');
      return;
    }
    if (!username) {
      setUsernameError('');
      return;
    }
    if (username.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameError('Username can only contain letters, numbers, and underscores');
      return;
    }

    setCheckingUsername(true);
    const timer = setTimeout(async () => {
      try {
        const res = await convex.query(api.users.checkUsernameEmailAvailability, { username });
        if (res.usernameTaken) {
          setUsernameError('Username is already taken');
        } else {
          setUsernameError('');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username, mode]);

  // Debounced Email Check
  useEffect(() => {
    if (mode === 'login') {
      setEmailError('');
      return;
    }
    if (!email) {
      setEmailError('');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setCheckingEmail(true);
    const timer = setTimeout(async () => {
      try {
        const res = await convex.query(api.users.checkUsernameEmailAvailability, { email });
        if (res.emailTaken) {
          setEmailError('Email is already registered');
        } else {
          setEmailError('');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setCheckingEmail(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [email, mode]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setLocalError("Image size must be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePicPreview(reader.result);
    };
    reader.readAsDataURL(file);

    setUploadingPic(true);
    try {
      const uploadUrl = await convex.mutation(api.users.generateUploadUrl);
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) {
        throw new Error("HTTP error " + response.status);
      }
      const { storageId } = await response.json();
      setProfilePic(storageId);
    } catch (err) {
      console.error("Profile picture upload failed, falling back to base64:", err);
      // Wait for reader to load base64 if not already loaded
      const base64 = reader.result || await new Promise((resolve) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result);
        r.readAsDataURL(file);
      });
      setProfilePic(base64);
    } finally {
      setUploadingPic(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (mode === 'login') {
      if (!username || !password) {
        setLocalError('Please enter both email and password.');
        return;
      }
      const res = await login(username, password);
      if (!res) return;
    } else {
      if (usernameError || emailError) {
        setLocalError('Please resolve the errors on the form before submitting.');
        return;
      }
      if (!username || !password || !confirmPassword || !email || !fullName || !phone || !age || !country || !city || !work) {
        setLocalError('Please fill in all registration fields, including country, city, and work.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match.');
        return;
      }
      if (parseInt(age) < 18) {
        setLocalError('You must be at least 18 years old to join.');
        return;
      }
      const result = await register(username, password, phone, email, fullName, age, country, city, work, profilePic);
      if (!result) return;
    }
  };

  const displayError = localError || externalError || error;

  const Spinner = () => (
    <svg className="animate-spin" viewBox="0 0 24 24" style={{ width: '18px', height: '18px', marginRight: '8px', animation: 'spin 1s linear infinite' }}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" style={{ opacity: 0.25 }} />
      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" style={{ opacity: 0.75 }} />
    </svg>
  );

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflowY: 'auto' }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .input:focus { border-color: var(--gold) !important; box-shadow: 0 0 40px rgba(245,166,35,0.15) !important; }
        .input:-webkit-autofill,
        .input:-webkit-autofill:hover, 
        .input:-webkit-autofill:focus, 
        .input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #141827 inset !important;
          -webkit-text-fill-color: #ffffff !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>
      
      {/* Background decoration */}
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(245,166,35,0.12) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(40px)' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(0,200,150,0.06) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(40px)' }} />

      {/* Main Flex Wrapper: side-by-side on desktop, stacked on mobile */}
      <div style={{
        display: 'flex',
        flexDirection: width < 1024 ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: width < 1024 ? '32px' : '64px',
        width: '100%',
        maxWidth: '1000px',
        zIndex: 1,
        marginTop: width < 1024 ? '16px' : '0',
        marginBottom: width < 1024 ? '16px' : '0',
      }}>
        {/* Left/Top Column: 3D Paper Money (Vertical Note) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: width < 768 ? '300px' : '500px',
          width: width < 1024 ? '100%' : 'auto',
          flexShrink: 0
        }}>
          <FloatingBill size={width < 768 ? 'sm' : 'lg'} />
        </div>

        {/* Right/Bottom Column: Auth Form Card */}
        <div className="auth-card" style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column' }}>
          
          {onBackToHome && (
            <button 
              type="button" 
              onClick={onBackToHome} 
              style={{ 
                alignSelf: 'flex-start', 
                background: 'rgba(255,255,255,0.05)', 
                border: '1px solid rgba(255,255,255,0.2)', 
                borderRadius: '50px', 
                color: '#FFFFFF', 
                padding: '8px 18px', 
                fontSize: '12px', 
                fontWeight: '700',
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                marginBottom: '24px',
                transition: 'all 0.2s ease',
                fontFamily: 'var(--font)'
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.transform = 'translateX(-2px)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <i className="ti ti-arrow-left" style={{ fontSize: '13px' }}></i> Back to Home
            </button>
          )}

          <h2 className="auth-title" style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px', textAlign: 'center' }}>
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', marginBottom: '24px', textAlign: 'center', fontWeight: 500 }}>
            {mode === 'login' ? 'Sign in to your EthioSwap wallet' : 'Join the most trusted P2P exchange in Ethiopia'}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {mode === 'login' ? (
              <>
                <div className="auth-input-group">
                  <input 
                    className="auth-input" 
                    type="email" 
                    placeholder="Email Address" 
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    autoComplete="email" 
                  />
                  <i className="auth-input-icon ti ti-mail"></i>
                </div>
              </>
            ) : (
              <>
                <div className="auth-input-group">
                  <input 
                    className="auth-input" 
                    type="text" 
                    placeholder="Full Name" 
                    value={fullName} 
                    onChange={e => setFullName(e.target.value)} 
                    autoComplete="name" 
                  />
                  <i className="auth-input-icon ti ti-id-badge"></i>
                </div>
                <div className="auth-input-group">
                  <input 
                    className="auth-input" 
                    type="text" 
                    placeholder="Username" 
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    autoComplete="username" 
                    style={usernameError ? { borderColor: 'rgba(239, 68, 68, 0.5)' } : {}}
                  />
                  <i className="auth-input-icon ti ti-at"></i>
                  {checkingUsername && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-3)', fontSize: '11px', marginTop: '4px', paddingLeft: '4px' }}>
                      <div style={{ width: '10px', height: '10px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                      <span>Checking availability...</span>
                    </div>
                  )}
                  {usernameError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#EF4444', fontSize: '11px', fontWeight: 600, marginTop: '4px', paddingLeft: '4px' }}>
                      <i className="ti ti-alert-circle" style={{ fontSize: '12px' }}></i>
                      <span>{usernameError}</span>
                    </div>
                  )}
                  {!checkingUsername && !usernameError && username.length >= 3 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10B981', fontSize: '11px', fontWeight: 600, marginTop: '4px', paddingLeft: '4px' }}>
                      <i className="ti ti-circle-check" style={{ fontSize: '12px' }}></i>
                      <span>Username is available</span>
                    </div>
                  )}
                </div>
                <div className="auth-input-group">
                  <input 
                    className="auth-input" 
                    type="email" 
                    placeholder="Email Address" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    autoComplete="email" 
                    style={emailError ? { borderColor: 'rgba(239, 68, 68, 0.5)' } : {}}
                  />
                  <i className="auth-input-icon ti ti-mail"></i>
                  {checkingEmail && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-3)', fontSize: '11px', marginTop: '4px', paddingLeft: '4px' }}>
                      <div style={{ width: '10px', height: '10px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                      <span>Checking availability...</span>
                    </div>
                  )}
                  {emailError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#EF4444', fontSize: '11px', fontWeight: 600, marginTop: '4px', paddingLeft: '4px' }}>
                      <i className="ti ti-alert-circle" style={{ fontSize: '12px' }}></i>
                      <span>{emailError}</span>
                    </div>
                  )}
                  {!checkingEmail && !emailError && email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10B981', fontSize: '11px', fontWeight: 600, marginTop: '4px', paddingLeft: '4px' }}>
                      <i className="ti ti-circle-check" style={{ fontSize: '12px' }}></i>
                      <span>Email is available</span>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="auth-input-group">
              <input 
                className="auth-input" 
                type={showPassword ? "text" : "password"} 
                placeholder="Password" 
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'} 
                autoCorrect="off" 
                autoCapitalize="off" 
                spellCheck="false" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                style={{ paddingRight: '48px' }}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="auth-toggle-pwd"
              >
                <i className={showPassword ? "ti ti-eye-off" : "ti ti-eye"}></i>
              </button>
              <i className="auth-input-icon ti ti-lock"></i>
            </div>

            {mode === 'register' && (
              <>
                <div className="auth-input-group">
                  <input
                    className="auth-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm Password"
                    autoComplete="new-password"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    style={{ paddingRight: '48px' }}
                  />
                  <i className="auth-input-icon ti ti-shield-lock"></i>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                  <div className="auth-input-group">
                    <input className="auth-input" type="tel" placeholder="Phone: 0912..." value={phone} onChange={e => setPhone(e.target.value)} />
                    <i className="auth-input-icon ti ti-phone"></i>
                  </div>
                  <div className="auth-input-group">
                    <input className="auth-input" type="number" min="18" placeholder="Age" value={age} onChange={e => setAge(e.target.value)} />
                    <i className="auth-input-icon ti ti-calendar-event"></i>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="auth-input-group">
                    <input className="auth-input" type="text" placeholder="Country" value={country} onChange={e => setCountry(e.target.value)} />
                    <i className="auth-input-icon ti ti-world"></i>
                  </div>
                  <div className="auth-input-group">
                    <input className="auth-input" type="text" placeholder="City" value={city} onChange={e => setCity(e.target.value)} />
                    <i className="auth-input-icon ti ti-map-pin"></i>
                  </div>
                </div>
                <div className="auth-input-group">
                  <input className="auth-input" type="text" placeholder="Work / Occupation" value={work} onChange={e => setWork(e.target.value)} />
                  <i className="auth-input-icon ti ti-briefcase"></i>
                </div>

                {/* Profile Picture Upload - last */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', margin: '4px 0 0' }}>
                  <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', transition: 'border-color 0.2s' }} onClick={() => document.getElementById('pic-upload').click()}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--teal)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    {profilePicPreview ? (
                      <img src={profilePicPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: 'var(--muted)' }}>
                        <i className="ti ti-camera" style={{ fontSize: '22px' }}></i>
                        <span style={{ fontSize: '9px', fontWeight: 600 }}>Photo</span>
                      </div>
                    )}
                    {uploadingPic && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 700 }}>
                        <div style={{ width: '14px', height: '14px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', marginRight: '6px' }}></div>
                        <span>Uploading...</span>
                      </div>
                    )}
                  </div>
                  <input id="pic-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                  {profilePic && !uploadingPic && (
                    <span style={{ fontSize: '11px', color: 'var(--teal)', fontWeight: 600 }}>✓ Photo attached</span>
                  )}
                </div>
              </>
            )}

            {displayError && (
              <div style={{
                fontSize: '13px',
                color: 'var(--status-danger-text)',
                fontWeight: 600,
                padding: '12px 14px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                lineHeight: 1.4,
              }}>
                <i className="ti ti-alert-triangle" style={{ fontSize: '15px', color: '#EF4444' }}></i>
                <span>{cleanConvexError(displayError)}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-gold btn-full"
              style={{
                height: '52px',
                fontSize: '15px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #F5A623 0%, #FFE082 100%)',
                color: '#0A0C12',
                border: 'none',
                borderRadius: '14px',
                boxShadow: '0 8px 30px rgba(255, 215, 0, 0.2)',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.2s ease',
              }}
            >
              {loading && <Spinner />}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-2)', fontWeight: 500 }}>
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            </span>
            <button 
              type="button" 
              onClick={onToggle} 
              style={{ 
                fontSize: '14px', 
                fontWeight: 700, 
                color: 'var(--gold)', 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer', 
                padding: '0 6px',
                fontFamily: 'var(--font)'
              }}
            >
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Page titles ──
const PAGE_TITLES = {
  home: 'Home',
  p2p: 'Trade',
  wallet: 'Wallet',
  transactions: 'History',
  notifications: 'Notifications',
  profile: 'Profile',
  settings: 'Settings',
  admin: 'Admin',
  scan: 'Scan QR',
  sellerProfile: 'Trader Profile',
};

// ── Desktop Sidebar ──
const DesktopSidebar = ({ page, setPage, user, logout }) => {
  const navItems = [
    { id: 'home', icon: 'ti ti-home', label: 'Home' },
    { id: 'p2p', icon: 'ti ti-arrows-left-right', label: 'Trade' },
    { id: 'wallet', icon: 'ti ti-wallet', label: 'Wallet' },
    { id: 'transactions', icon: 'ti ti-clock', label: 'History' },
    { id: 'notifications', icon: 'ti ti-bell', label: 'Notifications' },
    { id: 'profile', icon: 'ti ti-user', label: 'Profile' },
    { id: 'settings', icon: 'ti ti-settings', label: 'Settings' },
  ];
  if (user?.role === 'admin') navItems.push({ id: 'admin', icon: 'ti ti-shield-star', label: 'Admin' });

  return (
    <aside style={{
      position: 'fixed', top: 0, left: 0, width: 'var(--sidebar-w)', height: '100vh',
      background: 'var(--surface)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 32px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setPage('home')}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--teal)', color: '#04342C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '16px', flexShrink: 0 }}>E</div>
        <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>EthioSwap</span>
      </div>

      {/* Nav Links */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 8px' }}>
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px',
              borderRadius: '10px', fontSize: '14px', fontWeight: 400,
              color: page === item.id ? 'var(--teal)' : 'var(--muted)',
              background: page === item.id ? 'rgba(0,200,150,0.08)' : 'transparent',
              borderLeft: page === item.id ? '3px solid var(--teal)' : '3px solid transparent',
              transition: 'all 0.15s ease', width: '100%', textAlign: 'left',
            }}
            onMouseEnter={e => { if (page !== item.id) e.currentTarget.style.background = 'var(--surface2)'; }}
            onMouseLeave={e => { if (page !== item.id) e.currentTarget.style.background = 'transparent'; }}
          >
            <i className={item.icon} style={{ fontSize: '20px' }}></i>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* User Info */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--teal)', color: '#04342C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '13px', flexShrink: 0 }}>
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.fullName || user?.username || 'User'}</span>
            <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{user?.id || 'ES-XXXXXXX'}</span>
          </div>
        </div>
        <button onClick={logout} style={{ padding: '8px', borderRadius: '8px', color: 'var(--muted)', transition: 'all 0.15s', flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,77,77,0.1)'; e.currentTarget.style.color = 'var(--danger)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}
        >
          <i className="ti ti-logout" style={{ fontSize: '18px' }}></i>
        </button>
      </div>
    </aside>
  );
};

// ── Mobile Bottom Nav ──
const MobileBottomNav = ({ page, setPage }) => {
  const tabs = [
    { id: 'home', icon: 'ti ti-home', label: 'Home' },
    { id: 'p2p', icon: 'ti ti-arrows-left-right', label: 'Trade' },
    { id: 'scan', icon: 'ti ti-scan', label: 'Scan', center: true },
    { id: 'transactions', icon: 'ti ti-clock', label: 'History' },
    { id: 'profile', icon: 'ti ti-user', label: 'Profile' },
  ];

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, height: 'var(--bottom-nav-h)',
      background: 'var(--surface)', borderTop: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 8px', zIndex: 100,
    }}>
      {tabs.map(tab => (
        tab.center ? (
          <button
            key={tab.id}
            onClick={() => setPage(tab.id)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0', position: 'relative',
            }}
          >
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%', background: 'var(--teal)', color: '#04342C',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '-20px',
              boxShadow: '0 4px 16px rgba(0,200,150,0.3)',
            }}>
              <i className={tab.icon} style={{ fontSize: '24px' }}></i>
            </div>
          </button>
        ) : (
          <button
            key={tab.id}
            onClick={() => setPage(tab.id)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '6px 12px',
              color: page === tab.id ? 'var(--teal)' : 'var(--muted)', background: 'none', border: 'none',
              fontSize: '10px', fontWeight: 400, transition: 'color 0.15s',
            }}
          >
            <i className={tab.icon} style={{ fontSize: '22px' }}></i>
            <span>{tab.label}</span>
          </button>
        )
      ))}
    </nav>
  );
};

// ── Main App ──────────────────────────────────────────────────
const AppContent = () => {
  const { user, logout, isLocked, setIsLocked } = useAuth();
  const [page, setPage] = useState('home');
  const [authMode, setAuthMode] = useState('login');
  const [showAuth, setShowAuth] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sellerId, setSellerId] = useState(null);
  const notifCount = useNotifCount();
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (user) {
      const session = localStorage.getItem('ethioswap_session');
      if (!session) {
        console.warn('No session token found — logging out.');
        logout();
      }
    }
  }, [user]);

  // Navigate to seller profile
  const navigateToSeller = (id) => {
    setSellerId(id);
    setPage('sellerProfile');
  };

  if (isLocked) {
    return <AppLockScreen onUnlock={() => setIsLocked(false)} />;
  }

  if (!user) {
    return showAuth ? (
      <AuthForm
        mode={authMode}
        onToggle={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
        onBackToHome={() => setShowAuth(false)}
      />
    ) : (
      <LandingPage
        onGetStarted={() => { setAuthMode('register'); setShowAuth(true); }}
        onSignIn={() => { setAuthMode('login'); setShowAuth(true); }}
        systemSettings={null}
      />
    );
  }

  const isDesktop = width >= 768;
  const pageTitle = PAGE_TITLES[page] || 'EthioSwap';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Desktop Sidebar */}
      {isDesktop && <DesktopSidebar page={page} setPage={setPage} user={user} logout={logout} />}

      {/* Mobile Top Bar */}
      {!isDesktop && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 90, background: 'rgba(11,14,26,0.92)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border)', padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--teal)', color: '#04342C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px' }}>E</div>
            <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>EthioSwap</span>
          </div>
          <button onClick={() => setPage('notifications')} style={{ padding: '8px', position: 'relative', color: 'var(--text)' }}>
            <i className="ti ti-bell" style={{ fontSize: '20px' }}></i>
            {notifCount > 0 && <div style={{ position: 'absolute', top: '6px', right: '6px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)', border: '2px solid var(--bg)' }}></div>}
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main style={{
        marginLeft: isDesktop ? 'var(--sidebar-w)' : 0,
        minHeight: '100vh',
        padding: isDesktop ? '32px' : '16px',
        paddingBottom: !isDesktop ? 'calc(var(--bottom-nav-h) + 24px)' : '32px',
      }}>
        <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }} className="page-fade">
          {/* Desktop Top Bar */}
          {isDesktop && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text)' }}>{pageTitle}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button onClick={() => setPage('notifications')} style={{ padding: '10px', borderRadius: '10px', color: 'var(--text)', position: 'relative', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <i className="ti ti-bell" style={{ fontSize: '20px' }}></i>
                  {notifCount > 0 && <div style={{ position: 'absolute', top: '6px', right: '6px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)', border: '2px solid var(--bg)' }}></div>}
                </button>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--teal)', color: '#04342C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }} onClick={() => setPage('profile')}>
                  {user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
              </div>
            </div>
          )}

          {page === 'home' && <UserDashboard onNavigate={setPage} onNavigateToSeller={navigateToSeller} />}
          {page === 'p2p' && <P2PListings onNavigateToSeller={navigateToSeller} />}
          {page === 'wallet' && <WalletCard />}
          {page === 'profile' && <ProfilePage />}
          {page === 'settings' && <SettingsPage />}
          {page === 'transactions' && <TransactionHistory />}
          {page === 'admin' && user.role === 'admin' && <AdminPanel />}
          {page === 'notifications' && <NotificationsPage setPage={setPage} />}
          {page === 'scan' && <ScanPage setPage={setPage} />}
          {page === 'sellerProfile' && <SellerProfilePage sellerId={sellerId} setPage={setPage} />}
        </div>
      </main>

      {/* Overlays */}
      <TradeRoom />
      <SupportWidget />
      {showNotifications && <NotificationCenter onClose={() => setShowNotifications(false)} />}

      {/* Mobile Bottom Nav */}
      {!isDesktop && <MobileBottomNav page={page} setPage={setPage} />}
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
