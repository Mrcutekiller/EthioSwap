import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth, cleanConvexError } from './context/AuthContext.jsx';
import LandingPage, { FloatingBill } from './pages/LandingPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import P2PListings from './components/P2PListings.jsx';
import WalletCard from './components/WalletCard.jsx';
import TradeRoom from './components/TradeRoom.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import TransactionHistory from './pages/TransactionHistory.jsx';
import AppLockScreen from './components/AppLockScreen.jsx';
import { NotificationCenter, useNotifCount } from './components/NotificationCenter.jsx';
import SupportWidget from './components/SupportWidget.jsx';
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
  wallet:   'M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z M16 14a1 1 0 1 0 2 0 1 1 0 0 0-2 0',
  trades:   'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  bell:     'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0',
  person:   'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
  leaderboard: 'M12 20V10 M18 20V4 M6 20v-4',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  admin:    'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  logout:   'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  gift:     'M20 12V8H4v4 M2 6h20v2H2z M12 22V12 M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z',
  history:  'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
};

// ── Auth Form ──────────────────────────────────────────────────
const AuthForm = ({ mode, onToggle, onBackToHome, externalError }) => {
  const { login, register, verifyLoginOtp, verifySignupOtp, sendOtp, generateTelegramLinkCode, loading, error } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [localError, setLocalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [width, setWidth] = useState(window.innerWidth);

  // OTP State
  const [otpData, setOtpData] = useState(null); // { status, userId, preferredMethod, phone, telegramChatId, telegramLinkToken }
  const [otpCode, setOtpCode] = useState('');
  const [chosenChannel, setChosenChannel] = useState('sms');
  const [trustDevice, setTrustDevice] = useState(true);
  const [resendTimer, setResendTimer] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [showTgFallback, setShowTgFallback] = useState(false);
  const [tgLinkCode, setTgLinkCode] = useState('');
  const [tgDeepLink, setTgDeepLink] = useState('');
  const [tgCodeExpiresAt, setTgCodeExpiresAt] = useState(0);
  const [tgSecondsLeft, setTgSecondsLeft] = useState(0);
  const [tgLinking, setTgLinking] = useState(false);
  const [tgLinked, setTgLinked] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [autoOpenedBot, setAutoOpenedBot] = useState(false);

  const signupUser = useQuery(api.users.get, otpData?.userId && otpData?.isSignup ? { id: otpData.userId } : "skip");

  useEffect(() => {
    if (signupUser && signupUser.status === "active" && otpData?.isSignup) {
      setTgLinked(true);
    }
  }, [signupUser, otpData]);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    if (tgCodeExpiresAt <= 0) {
      setTgSecondsLeft(0);
      return;
    }
    const update = () => {
      const remaining = Math.max(0, Math.ceil((tgCodeExpiresAt - Date.now()) / 1000));
      setTgSecondsLeft(remaining);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [tgCodeExpiresAt]);

  const formatCountdown = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleConnectTelegram = async (autoOpen = false) => {
    if (!otpData?.userId) return;
    setTgLinking(true);
    setLocalError('');
    try {
      const res = await generateTelegramLinkCode(otpData.userId);
      if (res?.code) {
        setTgLinkCode(res.code);
        setTgDeepLink(res.deepLink || `https://t.me/EthioSwap_Bot?start=${res.code}`);
        setTgCodeExpiresAt(res.expiresAt || (Date.now() + 10 * 60 * 1000));
        setShowTgFallback(true);
        if (autoOpen && res.deepLink) {
          setAutoOpenedBot(true);
          window.open(res.deepLink, '_blank', 'noopener,noreferrer');
        }
      }
    } catch (err) {
      setLocalError(cleanConvexError(err.message));
    } finally {
      setTgLinking(false);
    }
  };

  useEffect(() => {
    if (!tgLinked || !otpData?.userId) return;
    const timer = setTimeout(() => {
      window.location.reload();
    }, 2000);
    return () => clearTimeout(timer);
  }, [tgLinked, otpData]);

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

  const triggerSendOtp = async (userId, channel) => {
    setSendingOtp(true);
    setLocalError('');
    try {
      const purpose = otpData?.isSignup ? 'signup' : 'login';
      await sendOtp(userId, purpose, channel);
      setResendTimer(60);
    } catch (err) {
      setLocalError(cleanConvexError(err.message));
    } finally {
      setSendingOtp(false);
    }
  };

  const handleChannelChange = async (channel) => {
    if (channel === 'telegram' && !otpData.telegramChatId) {
      setLocalError('Telegram is not linked to this account. Connect via settings first.');
      return;
    }
    setChosenChannel(channel);
    await triggerSendOtp(otpData.userId, channel);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    
    if (mode === 'login') {
      if (!username || !password) {
        setLocalError('Please enter both username/email and password.');
        return;
      }
      const res = await login(username, password);
      if (res && res.status === 'otp_required') {
        setOtpData(res);
        setChosenChannel(res.preferredMethod || 'sms');
        if (res.isSignup) {
          setResendTimer(60);
        } else {
          await triggerSendOtp(res.userId, res.preferredMethod || 'sms');
        }
      }
    } else {
      if (usernameError || emailError) {
        setLocalError('Please resolve the errors on the form before submitting.');
        return;
      }
      if (!username || !password || !confirmPassword || !email || !fullName || !phone || !age) {
        setLocalError('Please fill in all registration fields.');
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
      const result = await register(username, password, phone, email, fullName, age);
      if (result) {
        if (result.status === 'otp_required') {
          setOtpData(result);
          setChosenChannel('sms');
          setResendTimer(60);
        } else if (result.status === 'success_admin') {
          onToggle();
        } else if (result.alreadyRegistered) {
          onToggle();
        }
      }
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (otpCode.length !== 6) {
      setLocalError('Please enter the 6-digit OTP code.');
      return;
    }
    setOtpLoading(true);
    try {
      const fallbackDevice = navigator.userAgent;
      const parsedDevice = fallbackDevice.includes("Windows") ? "Windows PC" : fallbackDevice.includes("Mac") ? "Mac PC" : fallbackDevice.includes("Linux") ? "Linux PC" : "Mobile Device";
      const deviceName = navigator.userAgentData
        ? `${navigator.userAgentData?.brands?.[0]?.brand || 'Browser'} on ${navigator.userAgentData?.platform || 'Windows/MacOS'}`
        : parsedDevice;

      if (otpData?.isSignup) {
        await verifySignupOtp(otpData.userId, otpCode);
      } else {
        await verifyLoginOtp(otpData.userId, otpCode, deviceName, "Addis Ababa, Ethiopia", trustDevice);
      }
    } catch (err) {
      setLocalError(cleanConvexError(err.message));
    } finally {
      setOtpLoading(false);
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
        .input:focus { border-color: var(--gold) !important; box-shadow: 0 0 40px rgba(245,197,24,0.15) !important; }
        .input:-webkit-autofill,
        .input:-webkit-autofill:hover, 
        .input:-webkit-autofill:focus, 
        .input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #111318 inset !important;
          -webkit-text-fill-color: #ffffff !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>
      
      {/* Background decoration */}
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(245,197,24,0.12) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(40px)' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(0,212,160,0.06) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(40px)' }} />

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
          
          {otpData ? (
            // ── OTP VERIFICATION FORM ──
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <button 
                type="button" 
                onClick={() => { setOtpData(null); setOtpCode(''); setLocalError(''); setShowTgFallback(false); }} 
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
                  fontFamily: 'var(--font)',
                  transition: 'all 0.2s ease',
                }}
              >
                <i className="ti ti-arrow-left"></i> {otpData?.isSignup ? 'Back to Sign Up' : 'Back to Login'}
              </button>

              <h2 style={{ fontSize: '26px', fontWeight: 800, textAlign: 'center', margin: '10px 0 2px' }}>
                {otpData?.isSignup ? 'Verify Phone Number' : 'Verify Identity'}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-3)', textAlign: 'center', lineHeight: '1.5', margin: '0 0 10px' }}>
                {otpData?.isSignup 
                  ? `We sent a 6-digit OTP code to ${otpData.phone || 'your phone number'} via SMS.`
                  : 'We sent a 6-digit OTP code to verify your login attempt.'}
              </p>

              {otpData?.isSignup && showTgFallback && !tgLinked && (
                <div style={{
                  background: 'rgba(0, 212, 160, 0.04)',
                  border: '1px solid rgba(0, 212, 160, 0.2)',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: '24px' }}>✈️</span>
                  <p style={{ fontSize: '13px', color: 'var(--text-2)', textAlign: 'center', margin: 0, fontWeight: 600 }}>
                    Connect via Telegram
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-3)', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
                    Tap the button below to open Telegram with the code pre-filled. Just hit <b>Send</b> and your account is verified instantly.
                  </p>
                  <div
                    onClick={() => {
                      if (tgLinkCode) {
                        navigator.clipboard.writeText(tgLinkCode).then(() => {
                          setCodeCopied(true);
                          setTimeout(() => setCodeCopied(false), 2000);
                        }).catch(() => {});
                      }
                    }}
                    style={{
                      background: 'rgba(255, 215, 0, 0.1)',
                      border: '1px solid rgba(255, 215, 0, 0.3)',
                      borderRadius: '12px',
                      padding: '12px 20px',
                      fontSize: '24px',
                      fontWeight: 800,
                      color: 'var(--gold)',
                      letterSpacing: '8px',
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      userSelect: 'all',
                      transition: 'all 0.2s ease',
                    }}
                    title="Click to copy code"
                  >
                    {tgLinkCode}
                  </div>
                  <span style={{ fontSize: '11px', color: codeCopied ? '#00d4a0' : 'var(--text-3)', textAlign: 'center', margin: 0, fontWeight: codeCopied ? 700 : 400 }}>
                    {codeCopied ? '✓ Code copied! Paste it in the Telegram chat' : 'Tap code to copy manually'}
                  </span>
                  <a
                    href={tgDeepLink || 'https://t.me/EthioSwap_Bot'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-gold w-full"
                    style={{
                      height: '44px',
                      fontSize: '13px',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textDecoration: 'none',
                      background: 'linear-gradient(135deg, #2AABEE 0%, #229ED9 100%)',
                      color: '#fff',
                      boxShadow: '0 8px 24px rgba(42, 171, 238, 0.35)',
                    }}
                    onClick={() => setAutoOpenedBot(true)}
                  >
                    <i className="ti ti-brand-telegram" style={{ marginRight: '8px', fontSize: '18px' }}></i>
                    Open & Send Code in Telegram
                  </a>
                  <p style={{ fontSize: '11px', color: 'var(--text-3)', textAlign: 'center', margin: 0 }}>
                    {autoOpenedBot
                      ? 'Waiting for you to send the code in Telegram...'
                      : 'Waiting for you to send the code in Telegram...'}
                  </p>
                  {tgSecondsLeft > 0 ? (
                    <span style={{ fontSize: '10px', color: tgSecondsLeft < 60 ? '#EF4444' : 'var(--text-3)', textAlign: 'center', margin: 0, fontWeight: 600 }}>
                      ⏱ Code expires in {formatCountdown(tgSecondsLeft)}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleConnectTelegram(false)}
                      disabled={tgLinking}
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px dashed var(--border)',
                        borderRadius: '10px',
                        color: 'var(--gold-light)',
                        padding: '8px 12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: tgLinking ? 'wait' : 'pointer',
                        opacity: tgLinking ? 0.6 : 1,
                      }}
                    >
                      {tgLinking ? '⏳ Generating…' : '🔄 Code expired? Generate a new one'}
                    </button>
                  )}
                </div>
              )}

              {otpData?.isSignup && tgLinked && (
                <div style={{
                  background: 'rgba(0, 212, 160, 0.08)',
                  border: '1px solid rgba(0, 212, 160, 0.3)',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: '28px' }}>✅</span>
                  <p style={{ fontSize: '14px', color: 'var(--text-1)', textAlign: 'center', margin: 0, fontWeight: 700 }}>
                    Telegram Connected!
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-3)', textAlign: 'center', margin: 0 }}>
                    Your account is now active. Redirecting...
                  </p>
                </div>
              )}

              {otpData?.isSignup && !showTgFallback && (
                <button
                  type="button"
                  disabled={tgLinking}
                  onClick={() => handleConnectTelegram(true)}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    color: 'var(--text-2)',
                    padding: '12px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: tgLinking ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    width: '100%',
                    opacity: tgLinking ? 0.6 : 1,
                  }}
                  onMouseOver={(e) => { if (!tgLinking) e.currentTarget.style.borderColor = 'var(--gold)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  {tgLinking ? '⏳ Opening Telegram…' : '💬 Did not receive SMS? Connect via Telegram'}
                </button>
              )}

              {/* Delivery channel selector */}
              {!otpData?.isSignup && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <button
                      type="button"
                      onClick={() => handleChannelChange('sms')}
                      style={{
                        padding: '8px',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: chosenChannel === 'sms' ? 'var(--gold)' : 'transparent',
                        color: chosenChannel === 'sms' ? '#0A0C12' : 'var(--text-2)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      💬 SMS OTP
                    </button>
                    <button
                      type="button"
                      disabled={!otpData.telegramChatId}
                      onClick={() => handleChannelChange('telegram')}
                      style={{
                        padding: '8px',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: otpData.telegramChatId ? 'pointer' : 'not-allowed',
                        background: chosenChannel === 'telegram' ? 'var(--gold)' : 'transparent',
                        color: chosenChannel === 'telegram' ? '#0A0C12' : 'var(--text-2)',
                        opacity: otpData.telegramChatId ? 1 : 0.5,
                        transition: 'all 0.2s ease',
                      }}
                      title={!otpData.telegramChatId ? 'Telegram account not linked' : ''}
                    >
                      ✈️ Telegram Bot
                    </button>
                  </div>

                  {!otpData.telegramChatId && chosenChannel === 'sms' && (
                    <span style={{ fontSize: '11px', color: 'var(--text-3)', textAlign: 'center' }}>
                      Telegram OTP unavailable (not connected in Settings)
                    </span>
                  )}
                </>
              )}

              <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter code"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    style={{
                      width: '100%',
                      height: '52px',
                      background: '#111318',
                      border: '1px solid var(--border)',
                      borderRadius: '14px',
                      color: '#ffffff',
                      fontSize: '22px',
                      fontWeight: 700,
                      textAlign: 'center',
                      letterSpacing: '8px',
                      outline: 'none',
                      transition: 'all 0.2s ease',
                    }}
                    className="input"
                    autoFocus
                  />
                </div>

                {/* Trust device checkbox */}
                {!otpData?.isSignup && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none', fontSize: '13px', color: 'var(--text-2)', padding: '4px 0' }}>
                    <input
                      type="checkbox"
                      checked={trustDevice}
                      onChange={e => setTrustDevice(e.target.checked)}
                      style={{
                        width: '18px',
                        height: '18px',
                        accentColor: 'var(--gold)',
                        cursor: 'pointer',
                      }}
                    />
                    <span>Trust this device for 30 days</span>
                  </label>
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
                    lineHeight: 1.4
                  }}>
                    <i className="ti ti-alert-triangle" style={{ fontSize: '15px', color: '#EF4444' }}></i>
                    <span>{displayError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={otpLoading || sendingOtp}
                  className="btn btn-gold btn-full"
                  style={{
                    height: '52px',
                    fontSize: '15px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #FFD700 0%, #FFE082 100%)',
                    color: '#0A0C12',
                    border: 'none',
                    borderRadius: '14px',
                    boxShadow: '0 8px 30px rgba(255, 215, 0, 0.2)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {otpLoading ? (
                    <>
                      <Spinner />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify & Log In
                      <i className="ti ti-shield-check" style={{ marginLeft: '8px', fontSize: '18px' }}></i>
                    </>
                  )}
                </button>
              </form>

              {/* Resend actions */}
              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                {resendTimer > 0 ? (
                  <span style={{ fontSize: '13px', color: 'var(--text-3)', fontWeight: 500 }}>
                    Resend code in {resendTimer}s
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={sendingOtp}
                    onClick={() => triggerSendOtp(otpData.userId, chosenChannel)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--gold-light)',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      fontFamily: 'var(--font)',
                    }}
                  >
                    {sendingOtp ? 'Sending...' : 'Resend Verification Code'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            // ── STANDARD LOGIN/REGISTER FORM ──
            <>
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
              <p style={{ fontSize: '14px', color: 'var(--text-3)', marginBottom: '32px', textAlign: 'center', fontWeight: 500 }}>
                {mode === 'login' ? 'Sign in to your EthioSwap wallet' : 'Join the most trusted P2P exchange in Ethiopia'}
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {mode === 'login' ? (
                  <>
                    <div className="auth-input-group">
                      <input 
                        className="auth-input" 
                        type="text" 
                        placeholder="Username or Email" 
                        value={username} 
                        onChange={e => setUsername(e.target.value)} 
                        autoComplete="username" 
                      />
                      <i className="auth-input-icon ti ti-user"></i>
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
                        <input 
                          className="auth-input" 
                          type="tel" 
                          placeholder="Phone (+251...)" 
                          value={phone} 
                          onChange={e => setPhone(e.target.value)} 
                        />
                        <i className="auth-input-icon ti ti-phone"></i>
                      </div>
                      <div className="auth-input-group">
                        <input 
                          className="auth-input" 
                          type="number" 
                          min="18" 
                          placeholder="Age" 
                          value={age} 
                          onChange={e => setAge(e.target.value)} 
                        />
                        <i className="auth-input-icon ti ti-calendar-event"></i>
                      </div>
                    </div>

                  </>
                )}

                {displayError && (
                  <div style={{ 
                    fontSize: '13px', 
                    color: 'var(--status-danger-text)', 
                    fontWeight: 600, 
                    padding: '14px 16px', 
                    background: 'rgba(239, 68, 68, 0.08)', 
                    border: '1px solid rgba(239, 68, 68, 0.2)', 
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    lineHeight: 1.4
                  }}>
                    <i className="ti ti-alert-triangle" style={{ fontSize: '16px', color: '#EF4444' }}></i>
                    <span>{displayError}</span>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={loading} 
                  className="btn btn-gold btn-full animate-hover" 
                  style={{ 
                    marginTop: '12px', 
                    height: '52px', 
                    fontSize: '16px', 
                    fontWeight: 800, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #FFD700 0%, #FFE082 100%)',
                    color: '#0A0C12',
                    border: 'none',
                    borderRadius: '14px',
                    width: '100%',
                    cursor: 'pointer',
                    boxShadow: '0 8px 30px rgba(255, 215, 0, 0.25)',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    pointerEvents: loading ? 'none' : 'auto',
                    opacity: loading ? 0.8 : 1
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 12px 35px rgba(255, 215, 0, 0.4)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(255, 215, 0, 0.25)';
                  }}
                >
                  {loading ? (
                    <>
                      <Spinner />
                      {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                    </>
                  ) : (
                    <>
                      {mode === 'login' ? 'Sign In' : 'Create Account'}
                      <i className="ti ti-arrow-right" style={{ marginLeft: '8px', fontSize: '18px' }}></i>
                    </>
                  )}
                </button>
              </form>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '28px 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              </div>

              <button 
                onClick={onToggle} 
                style={{ 
                  width: '100%', 
                  padding: '14px', 
                  background: 'rgba(255, 215, 0, 0.04)', 
                  border: '1px solid rgba(255, 215, 0, 0.2)', 
                  borderRadius: '14px', 
                  color: '#FFD700', 
                  fontSize: '14px', 
                  fontWeight: 700, 
                  cursor: 'pointer', 
                  fontFamily: 'var(--font)', 
                  transition: 'all 0.25s ease',
                  boxShadow: '0 2px 10px rgba(255, 215, 0, 0.02)'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = 'rgba(255, 215, 0, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.4)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = 'rgba(255, 215, 0, 0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.2)';
                }}
              >
                {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign In'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main App Shell ─────────────────────────────────────────────
const AppShell = () => {
  const { user, wallet, trades, isLocked, initializing, unlock, logout, updateUser, switchUser, error, success, systemSettings, acknowledgeWarning } = useAuth();
  
  const [authMode, setAuthMode] = useState(() => {
    const path = window.location.pathname;
    if (path === '/login') return 'login';
    if (path === '/register') return 'register';
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    if (params.get('action') === 'login' || hash === '#login') return 'login';
    if (params.get('action') === 'register' || hash === '#register') return 'register';
    return null;
  });

  const [tab, setTabState] = useState(() => {
    const path = window.location.pathname;
    if (path === '/admin') return 'admin';
    if (path === '/dashboard') return 'home';
    if (user?.role === 'admin') return 'admin';
    return localStorage.getItem(`ethioswap_active_tab_${user?.id}`) || 'home';
  });

  const setTab = (newTab) => {
    setTabState(newTab);
    if (user) {
      localStorage.setItem(`ethioswap_active_tab_${user.id}`, newTab);
    }
  };

  const [authError, setAuthError] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const activeTrades = (trades || []).filter(t => ['payment_pending', 'paid', 'disputed'].includes(t.status)).length;
  const [notifications, setNotifications] = useState([]);

  // Clear auth error when switching modes
  React.useEffect(() => {
    setAuthError(null);
  }, [authMode]);

  // Sync AuthContext error with local authError
  React.useEffect(() => {
    if (error) setAuthError(error);
  }, [error]);

  // Removed redundant onAuthStateChange listener as it's handled in AuthContext.jsx

  React.useEffect(() => {
    if (user && !initializing) {
      console.log('AppShell: User detected, checking redirection...', user.role);
      const path = window.location.pathname;
      const targetTab = user.role === 'admin' ? 'admin' : 'home';
      const targetPath = user.role === 'admin' ? '/admin' : '/dashboard';

      if (path === '/' || path === '/login' || path === '/register') {
        console.log('AppShell: Redirecting from', path, 'to', targetPath);
        window.history.replaceState({}, '', targetPath);
        setTabState(targetTab);
        setAuthMode(null); // Clear auth mode to ensure LandingPage isn't shown if user becomes null later
      } else {
        // Even if path is already correct, ensure tab state matches role if it's the first load
        if (user.role === 'admin' && tab !== 'admin') {
          setTabState('admin');
        }
      }
    }
  }, [user, initializing]);

  const fetchNotifications = async () => {
    if (!user) return;
    const data = await convex.query(api.notifications.listForUser, { userId: user._id });
    if (data) setNotifications(data);
  };

  const notificationsFromQuery = useQuery(api.notifications.listForUser, user ? { userId: user._id } : "skip") || [];
  const markAllRead = useMutation(api.notifications.markAllRead);
  const markAsRead = useMutation(api.notifications.markAsRead);

  React.useEffect(() => {
    if (notificationsFromQuery.length > 0) {
      setNotifications(notificationsFromQuery);
    }
  }, [notificationsFromQuery]);

  const getInitials = (name) => (name || 'U').substring(0, 2).toUpperCase();
  const lockMethod = localStorage.getItem('ethioswap_lock_method') || 'pin';
  const savedPin = localStorage.getItem('ethioswap_lock_pin'); // No fallback to force setup if not set

  // Auto-detect login link from website
  React.useEffect(() => {
    if (user) return; // Only relevant for non-logged in users
    const path = window.location.pathname;
    if (path === '/login') {
      setAuthMode('login');
    } else if (path === '/register') {
      setAuthMode('register');
    }
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    if (params.get('action') === 'login' || hash === '#login') {
      setAuthMode('login');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('action') === 'register' || hash === '#register') {
      setAuthMode('register');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user]);

  // Custom internal navigation handler
  React.useEffect(() => {
    const handleNavigate = (e) => {
      if (e.detail) {
        setTab(e.detail);
      }
    };
    window.addEventListener('ethioswap_navigate', handleNavigate);
    return () => window.removeEventListener('ethioswap_navigate', handleNavigate);
  }, []);

  // Initialization splash screen
  if (initializing) {
    return (
      <div style={{ minHeight: '100vh', width: '100%', background: '#0A0C12', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Logo size={64} />
        <div style={{ marginTop: '24px', color: '#f5c518', fontSize: '14px', fontWeight: 600, letterSpacing: '0.1em' }}>
          LOADING ETHIOSWAP...
        </div>
      </div>
    );
  }

  // Not logged in → show landing or login/register
  if (!user) {
    if (authMode === null) {
      return (
        <LandingPage
          onGetStarted={() => setAuthMode('register')}
          onSignIn={() => setAuthMode('login')}
          systemSettings={systemSettings}
        />
      );
    }
    return (
      <AuthForm
        mode={authMode}
        onToggle={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
        onBackToHome={() => setAuthMode(null)}
        externalError={authError}
      />
    );
  }


  // Suspended → show gorgeous suspension lock screen
  if (user?.isSuspended) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        width: '100%', 
        background: '#0A0C12', 
        backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(248,113,113,0.12) 0%, transparent 60%)', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '24px', 
        position: 'relative',
        fontFamily: 'var(--font)',
        color: 'var(--text-1)'
      }}>
        {/* Background decorations */}
        <div className="bg-orb bg-orb-1" style={{ background: 'radial-gradient(circle, rgba(248,113,113,0.15) 0%, transparent 70%)' }} />
        
        <div className="glass" style={{ 
          borderRadius: '24px', 
          border: '1px solid rgba(248,113,113,0.25)', 
          width: '100%', 
          maxWidth: '460px', 
          padding: '40px 32px', 
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)', 
          zIndex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          textAlign: 'center'
        }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '20px', 
            background: 'rgba(248,113,113,0.12)', 
            border: '1px solid rgba(248,113,113,0.25)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '32px',
            marginBottom: '24px',
            boxShadow: '0 0 20px rgba(248,113,113,0.15)'
          }}>
            🛑
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: 900, marginBottom: '12px', letterSpacing: '-0.02em', color: '#FFF' }}>
            Account Suspended
          </h2>
          
          <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: '1.6', marginBottom: '24px' }}>
            Your account (@{user.username}) has been restricted or temporarily suspended by the system administrator due to unwanted activities or violation of terms of service.
          </p>

          <div style={{ 
            background: 'rgba(248,113,113,0.05)', 
            border: '1px solid rgba(248,113,113,0.15)', 
            borderRadius: '12px', 
            padding: '14px', 
            fontSize: '12px', 
            color: 'var(--status-danger-text)', 
            lineHeight: '1.5',
            width: '100%',
            marginBottom: '28px',
            textAlign: 'left'
          }}>
            <strong>📌 Notice to appeal:</strong>
            <br />
            You may request an appeal or contact the administration using the live chat support widget located at the bottom-right corner of this screen.
          </div>

          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <button 
              onClick={logout} 
              className="btn" 
              style={{ 
                flex: 1, 
                padding: '12px', 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid var(--border)', 
                color: 'var(--text-2)', 
                borderRadius: '12px', 
                fontWeight: 700, 
                cursor: 'pointer',
                fontFamily: 'var(--font)'
              }}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Keeping SupportWidget loaded so they can appeal! */}
        <SupportWidget />
      </div>
    );
  }

  // Bottom nav items
  const navItems = user.role === 'admin'
    ? [{ id: 'admin', label: 'Admin', icon: Icons.admin }]
    : [
        { id: 'home',     label: 'Trade',    icon: Icons.home },
        { id: 'wallet',   label: 'Wallet',   icon: Icons.wallet },
        { id: 'trades',   label: 'Trades',   icon: Icons.trades,   badge: activeTrades },
        { id: 'history',  label: 'History',  icon: Icons.history },
        { id: 'profile',  label: 'Profile',  icon: Icons.person },
        { id: 'settings', label: 'Settings', icon: Icons.settings },
      ];

  if (user.role === 'admin' && tab !== 'admin') setTab('admin');

  return (
    <div className="app-shell">

      {/* ── TOP BAR ── */}
      <header className="top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Logo size={28} />
        </div>

        {/* Center Mobile Header Balance (USD + ETB) */}
        {wallet && user.role !== 'admin' && (
          <div className="mobile-only-header-balance" style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#f5c518', fontFamily: 'JetBrains Mono, monospace', lineHeight: '1.1' }}>
              ${(wallet.ethAvailable ?? 0).toFixed(2)} USD
            </div>
            <div style={{ fontSize: '11px', color: '#00d4a0', fontFamily: 'JetBrains Mono, monospace', marginTop: '1px' }}>
              ≈ {Math.round((wallet.ethAvailable ?? 0) * (systemSettings?.etbRatePerDollar ?? 190)).toLocaleString()} ETB
            </div>
          </div>
        )}

        {/* Desktop Navigation Links */}
        <div className="desktop-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`desktop-nav-btn ${tab === item.id ? 'active' : ''}`}
            >
              <Icon d={item.icon} size={16} />
              <span>{item.label}</span>
              {item.badge > 0 && <span className="nav-badge" style={{ position: 'static', transform: 'none', marginLeft: '6px' }}>{item.badge}</span>}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Desktop-only Wallet balance */}
          {wallet && user.role !== 'admin' && (
            <div className="desktop-nav" style={{ textAlign: 'right', flexDirection: 'column' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold-light)', lineHeight: '1.1' }}>${(wallet.ethAvailable ?? 0).toFixed(2)} USD</div>
              <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>≈ {Math.round((wallet.ethAvailable ?? 0) * (systemSettings?.etbRatePerDollar ?? 190)).toLocaleString()} ETB</div>
            </div>
          )}

          {/* User profile capsule (Desktop only) */}
          <div className="desktop-nav" style={{ gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '4px 10px', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '11px', fontWeight: 700 }}>@{user.username}</span>
              <span style={{ fontSize: '9px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{user.role}</span>
            </div>
            <span className={`badge ${user.kycStatus === 'approved' ? 'badge-success' : user.kycStatus === 'pending' ? 'badge-warning' : 'badge-neutral'}`} style={{ fontSize: '9px', padding: '2px 6px' }}>
              {user.kycStatus === 'approved' ? '✓ Verified' : user.kycStatus === 'pending' ? '⏳ Pending' : '✗ Unverified'}
            </span>
          </div>

          {/* Notification bell */}
          <button onClick={() => setNotifOpen(!notifOpen)} style={{ position: 'relative', width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', cursor: 'pointer' }}>
            <Icon d={Icons.bell} size={18} />
            {notifications.filter(n => !n.isRead).length > 0 && (
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#EF4444', color: 'white', borderRadius: '99px', minWidth: '16px', height: '16px', fontSize: '9px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '2px solid var(--bg-base)' }}>
                {notifications.filter(n => !n.isRead).length}
              </span>
            )}
          </button>

          {/* Quick Logout (Always visible on mobile/desktop right side) */}
          <button onClick={logout} style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--status-danger-text)', cursor: 'pointer' }} title="Logout">
            <Icon d={Icons.logout} size={16} />
          </button>
        </div>
      </header>

      {/* Notifications Panel */}
      {notifOpen && (
        <div style={{ position: 'fixed', top: '70px', right: '20px', width: '320px', maxHeight: '450px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: 'var(--shadow-lg)', zIndex: 1000, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, fontSize: '14px' }}>Notifications</span>
            <button onClick={async () => {
              if (user?._id) {
                try {
                  await markAllRead({ userId: user._id });
                } catch (err) {
                  console.error("Error marking all read:", err);
                }
              }
              setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            }} style={{ background: 'transparent', border: 'none', color: 'var(--gold)', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>Mark all read</button>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>No notifications yet</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n._id}
                  onClick={async () => {
                    if (!n.isRead) {
                      try {
                        await markAsRead({ id: n._id });
                      } catch (err) {
                        console.error("Error marking notification as read:", err);
                      }
                      setNotifications(prev => prev.map(item => item._id === n._id ? { ...item, isRead: true } : item));
                    }
                  }}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                    background: n.isRead ? 'transparent' : 'rgba(212,175,55,0.03)',
                    position: 'relative',
                    cursor: n.isRead ? 'default' : 'pointer'
                  }}
                >
                  {!n.isRead && <div style={{ position: 'absolute', left: '6px', top: '18px', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--gold)' }} />}
                  <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '2px', color: n.isRead ? 'var(--text-2)' : 'var(--text-1)' }}>{n.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)', lineHeight: '1.4' }}>{n.message}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '6px' }}>{new Date(n.createdAt).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Warnings Alert Banner */}
      {user?.warnings && user.warnings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 16px', background: 'var(--bg-base)', borderBottom: '1px solid var(--border)', zIndex: 10 }}>
          {user.warnings.map(warn => (
            <div 
              key={warn.id} 
              className="glass fade-in-1" 
              style={{ 
                border: '1px solid var(--status-warning-border)', 
                background: 'rgba(251,191,36,0.07)', 
                borderRadius: '14px', 
                padding: '14px 18px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                gap: '16px',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '240px' }}>
                <span style={{ fontSize: '20px' }}>⚠️</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--status-warning-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Official Warning from Administration</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-1)', fontWeight: 600, lineHeight: 1.5 }}>{warn.message}</span>
                  <span style={{ fontSize: '9px', color: 'var(--text-3)' }}>Received on {new Date(warn.createdAt).toLocaleString()}</span>
                </div>
              </div>
              
              <button 
                onClick={() => acknowledgeWarning(warn.id)} 
                className="btn-teal"
                style={{ 
                  padding: '8px 16px', 
                  borderRadius: '10px', 
                  fontSize: '12px', 
                  fontWeight: 700, 
                  cursor: 'pointer',
                  border: 'none',
                  fontFamily: 'var(--font)'
                }}
              >
                ✓ Acknowledge & Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Toast Alerts */}
      <div className="toast-wrap">
        {error   && <div className="toast toast-error">⚠ {error}</div>}
        {success && <div className="toast toast-success">✓ {success}</div>}
      </div>

      {/* Notification Center */}
      <NotificationCenter userId={user.id} isOpen={notifOpen} onClose={() => setNotifOpen(false)} />

      {/* Support Widget */}
      <SupportWidget />

      {/* ── PAGE CONTENT ── */}
      <main className="page-content">
        {tab === 'home'     && <P2PListings />}
        {tab === 'wallet'   && <WalletCard />}
        {tab === 'trades'   && <TradeRoom />}
        {tab === 'history'  && <TransactionHistory />}

        {tab === 'profile'  && <ProfilePage user={user} wallet={wallet} onUserUpdate={updateUser} systemSettings={systemSettings} />}
        {tab === 'settings' && <SettingsPage user={user} onLogout={logout} />}
        {tab === 'admin'    && <AdminPanel user={user} />}
      </main>

      {/* ── BOTTOM NAV ── */}
      <nav className="bottom-nav">
        {navItems.map(item => (
          <button key={item.id} onClick={() => setTab(item.id)} className={`nav-item ${tab === item.id ? 'active' : ''}`}>
            <div style={{ position: 'relative' }}>
              <Icon d={item.icon} size={22} />
              {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
            </div>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

// ── Error Boundary for Audit & Failure Prevention ─────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("App Crash:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          width: '100%',
          background: '#0A0C12',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          color: '#F0F4FF',
          textAlign: 'center',
          fontFamily: 'sans-serif'
        }}>
          <Logo size={48} />
          <h2 style={{ marginTop: '24px', fontSize: '20px', fontWeight: 800 }}>App Encountered an Issue</h2>
          <p style={{ marginTop: '12px', color: '#8b92a8', maxWidth: '400px', lineHeight: 1.6 }}>
            {this.state.error?.message || "A runtime error occurred. This is likely due to missing data or a connection issue."}
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: '24px', background: '#f5c518', color: '#000', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ErrorBoundary>
  );
}
