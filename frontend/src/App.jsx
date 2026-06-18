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
import { supabase } from './lib/supabase';

const COUNTRIES = ['Ethiopia','Nigeria','Kenya','Ghana','South Africa','Tanzania','Uganda','Rwanda','Somalia','Sudan','Egypt','Morocco','Cameroon','Ivory Coast','Senegal','Mali','Burkina Faso','Niger','Chad','Guinea','Benin','Togo','Sierra Leone','Liberia','Gambia','Cape Verde','Djibouti','Eritrea','Seychelles','Mauritius','Comoros','Libya','Algeria','Tunisia','Botswana','Zimbabwe','Mozambique','Zambia','Malawi','Angola','Congo','Gabon','Equatorial Guinea','Central African Republic','Chad','Namibia','Lesotho','Eswatini'];
const ETHIOPIAN_CITIES = ['Addis Ababa','Dire Dawa','Mekelle','Adama','Gondar','Hawassa','Bahir Dar','Jimma','Dessie','Jijiga','Harar','Shashamane','Nekemte','Debre Markos','Bishoftu','Arba Minch','Woldia','Sodo','Debre Birhan','Asella','Gojjam','Wolaita','Hadiya','Kembata','Sidama','Oromia','Amhara','Tigray','SNNPR'];

const PasswordStrength = ({ password }) => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const levels = [{ label: 'Very Weak', color: '#EF4444', w: '20%' }, { label: 'Weak', color: '#F97316', w: '40%' }, { label: 'Fair', color: '#EAB308', w: '60%' }, { label: 'Strong', color: '#22C55E', w: '80%' }, { label: 'Very Strong', color: '#10B981', w: '100%' }];
  if (!password) return null;
  const level = levels[Math.min(score, 4)];
  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: level.w, background: level.color, borderRadius: '2px', transition: 'all 0.3s ease' }} />
      </div>
      <span style={{ fontSize: '11px', color: level.color, fontWeight: 600, marginTop: '4px', display: 'block' }}>{level.label}</span>
    </div>
  );
};

const AuthForm = ({ mode, onToggle, onBackToHome, externalError }) => {
  const { user, login, register, loading, error } = useAuth();
  const [localError, setLocalError] = useState('');

  if (mode === 'login') return <LoginForm onToggle={onToggle} onBackToHome={onBackToHome} externalError={externalError} />;
  return <SignupWizard onToggle={onToggle} onBackToHome={onBackToHome} externalError={externalError} />;
};

const LoginForm = ({ onToggle, onBackToHome, externalError }) => {
  const { login, verifyLoginOtp, loading, error, signInWithGoogle, sendPasswordResetEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [resetLinkSent, setResetLinkSent] = useState(false);
  const [localError, setLocalError] = useState('');
  const [otpState, setOtpState] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpRefs] = useState(() => Array.from({ length: 6 }, () => React.createRef()));
  const [countdown, setCountdown] = useState(300);
  const [canResend, setCanResend] = useState(false);

  const displayError = localError || externalError || error;

  useEffect(() => {
    if (!otpState) return;
    setCountdown(300);
    setCanResend(false);
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(interval); setCanResend(true); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [otpState]);

  const formatCountdown = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!email || !password) { setLocalError('Please enter both email and password.'); return; }
    const result = await login(email, password);
    if (result?.status === 'otp_required') {
      setOtpState(result);
      setOtpCode('');
      setTimeout(() => otpRefs[0]?.current?.focus(), 150);
    }
  };

  const handleOtpInput = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const chars = Array.from({ length: 6 }, (_, i) => otpCode[i] || '');
    chars[index] = digit;
    const newCode = chars.join('');
    setOtpCode(newCode);
    if (digit && index < 5) otpRefs[index + 1]?.current?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (otpCode[index]) {
        const chars = Array.from({ length: 6 }, (_, i) => otpCode[i] || '');
        chars[index] = '';
        setOtpCode(chars.join(''));
      } else if (index > 0) {
        otpRefs[index - 1]?.current?.focus();
        const chars = Array.from({ length: 6 }, (_, i) => otpCode[i] || '');
        chars[index - 1] = '';
        setOtpCode(chars.join(''));
      }
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const padded = pasted.padEnd(6, '');
    setOtpCode(padded);
    if (pasted.length === 6) { setTimeout(() => handleVerifyOtp(pasted), 50); }
    else { otpRefs[Math.min(pasted.length, 5)]?.current?.focus(); }
  };

  const handleVerifyOtp = async (code) => {
    const finalCode = code !== undefined ? code : otpCode;
    setLocalError('');
    if (finalCode.replace(/\s/g, '').length < 6) { setLocalError('Please enter the full 6-digit code.'); return; }
    await verifyLoginOtp(otpState.userId, otpState.email, otpState.password, finalCode.replace(/\s/g, ''));
  };

  const handleResend = async () => {
    setLocalError('');
    setOtpCode('');
    const result = await login(otpState.email, otpState.password);
    if (result?.status === 'otp_required') {
      setOtpState(result);
      setTimeout(() => otpRefs[0]?.current?.focus(), 150);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!email) { setLocalError('Please enter your email address.'); return; }
    const success = await sendPasswordResetEmail(email);
    if (success) setResetLinkSent(true);
  };

  // OTP Verification Screen
  if (otpState) {
    return (
      <div style={{ minHeight: '100vh', width: '100%', background: '#0A0E1A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflowY: 'auto' }}>
        <style>{`
          @keyframes otpPulse { 0%,100%{box-shadow:0 0 0 0 rgba(245,166,35,0.4)} 50%{box-shadow:0 0 0 14px rgba(245,166,35,0)} }
          .otp-digit{width:48px;height:58px;border-radius:12px;border:1.5px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);color:#fff;font-size:24px;font-weight:800;text-align:center;outline:none;transition:border-color 0.2s,box-shadow 0.2s;caret-color:#F5A623;font-family:'Courier New',monospace;}
          .otp-digit:focus{border-color:#F5A623;box-shadow:0 0 0 3px rgba(245,166,35,0.18);}
          .otp-digit.filled{border-color:rgba(245,166,35,0.5);background:rgba(245,166,35,0.07);}
        `}</style>
        <div style={{ position: 'absolute', top: '10%', left: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(245,166,35,0.1) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(40px)' }} />
        <div style={{ width: '100%', maxWidth: '400px', zIndex: 1 }}>
          <button type="button" onClick={() => { setOtpState(null); setOtpCode(''); setLocalError(''); }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50px', color: '#fff', padding: '8px 18px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '28px' }}>
            <i className="ti ti-arrow-left" style={{ fontSize: '13px' }}></i> Back to Sign In
          </button>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '36px 28px', textAlign: 'center' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)', color: '#F5A623', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '36px', animation: 'otpPulse 2s infinite' }}>
              <i className="ti ti-shield-lock"></i>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>Check Your Email</h2>
            <p style={{ fontSize: '14px', color: '#8B8FA3', lineHeight: '1.6', marginBottom: '28px' }}>
              We sent a 6-digit security code to<br />
              <strong style={{ color: '#F5A623' }}>{otpState.email}</strong>
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '20px' }} onPaste={handleOtpPaste}>
              {Array.from({ length: 6 }).map((_, i) => (
                <input
                  key={i}
                  ref={otpRefs[i]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className={`otp-digit${otpCode[i] ? ' filled' : ''}`}
                  value={otpCode[i] || ''}
                  onChange={e => handleOtpInput(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                />
              ))}
            </div>
            <div style={{ fontSize: '13px', color: '#8B8FA3', marginBottom: '20px' }}>
              {countdown > 0
                ? <span>Code expires in <strong style={{ color: countdown < 60 ? '#EF4444' : '#fff' }}>{formatCountdown(countdown)}</strong></span>
                : <span style={{ color: '#EF4444' }}>Code has expired — request a new one below</span>
              }
            </div>
            {displayError && (
              <div style={{ fontSize: '13px', color: '#EF4444', fontWeight: 600, padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', textAlign: 'left' }}>
                <i className="ti ti-alert-triangle" style={{ fontSize: '15px', flexShrink: 0 }}></i>
                <span>{displayError}</span>
              </div>
            )}
            <button type="button" onClick={() => handleVerifyOtp()} disabled={loading || otpCode.replace(/\s/g,'').length < 6}
              style={{ width: '100%', height: '52px', fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: otpCode.replace(/\s/g,'').length < 6 ? 'rgba(245,166,35,0.3)' : 'linear-gradient(135deg, #F5A623 0%, #FFE082 100%)', color: '#0A0C12', border: 'none', borderRadius: '14px', cursor: loading || otpCode.replace(/\s/g,'').length < 6 ? 'not-allowed' : 'pointer', marginBottom: '16px' }}>
              {loading ? 'Verifying...' : <><i className="ti ti-shield-check" style={{ fontSize: '18px' }}></i>&nbsp;Verify &amp; Sign In</>}
            </button>
            <button type="button" onClick={handleResend} disabled={!canResend || loading}
              style={{ fontSize: '13px', fontWeight: 700, color: canResend ? '#F5A623' : '#5A6275', background: 'none', border: 'none', cursor: canResend ? 'pointer' : 'not-allowed', padding: '8px', textDecoration: canResend ? 'underline' : 'none' }}>
              {canResend ? "Didn't receive it? Resend code" : `Resend available in ${formatCountdown(countdown)}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: '#0A0E1A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflowY: 'auto' }}>
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(245,166,35,0.12) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(40px)' }} />
      <div style={{ width: '100%', maxWidth: '420px', zIndex: 1 }}>
        {onBackToHome && (
          <button type="button" onClick={isForgotMode ? () => setIsForgotMode(false) : onBackToHome} style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50px', color: '#fff', padding: '8px 18px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '28px' }}>
            <i className="ti ti-arrow-left" style={{ fontSize: '13px' }}></i> Back
          </button>
        )}
        {isForgotMode ? (
          resetLinkSent ? (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(245,166,35,0.1)', color: '#F5A623', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '32px' }}><i className="ti ti-mail"></i></div>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>Check Your Email</h2>
              <p style={{ fontSize: '14px', color: '#8B8FA3', lineHeight: '1.6', marginBottom: '24px' }}>We sent a reset link to <strong style={{ color: '#fff' }}>{email}</strong>.</p>
              <button type="button" onClick={() => { setIsForgotMode(false); setResetLinkSent(false); setEmail(''); }} style={{ width: '100%', height: '48px', background: 'linear-gradient(135deg, #F5A623 0%, #FFE082 100%)', color: '#0A0C12', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}>Back to Sign In</button>
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '32px 24px' }}>
              <h2 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '6px', textAlign: 'center', color: '#fff' }}>Reset Password</h2>
              <p style={{ fontSize: '14px', color: '#8B8FA3', marginBottom: '28px', textAlign: 'center' }}>Enter your email to receive a recovery link</p>
              <form onSubmit={handleResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ position: 'relative' }}>
                  <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '14px 16px 14px 44px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} required />
                  <i className="ti ti-mail" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B8FA3', fontSize: '18px' }}></i>
                </div>
                {displayError && (<div style={{ fontSize: '13px', color: '#EF4444', fontWeight: 600, padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><i className="ti ti-alert-triangle" style={{ fontSize: '15px' }}></i><span>{displayError}</span></div>)}
                <button type="submit" disabled={loading} style={{ height: '52px', fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #F5A623 0%, #FFE082 100%)', color: '#0A0C12', border: 'none', borderRadius: '14px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>{loading ? 'Sending...' : 'Send Reset Link'}</button>
              </form>
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button type="button" onClick={() => setIsForgotMode(false)} style={{ fontSize: '14px', fontWeight: 700, color: '#F5A623', background: 'none', border: 'none', cursor: 'pointer' }}>Back to Sign In</button>
              </div>
            </div>
          )
        ) : (
          <>
            <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '6px', textAlign: 'center', color: '#fff' }}>Welcome Back</h2>
            <p style={{ fontSize: '14px', color: '#8B8FA3', marginBottom: '28px', textAlign: 'center' }}>Sign in to your EthioSwap wallet</p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ position: 'relative' }}>
                <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '14px 16px 14px 44px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                <i className="ti ti-mail" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B8FA3', fontSize: '18px' }}></i>
              </div>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '14px 44px 14px 44px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                <i className="ti ti-lock" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B8FA3', fontSize: '18px' }}></i>
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8B8FA3', cursor: 'pointer', padding: '4px' }}><i className={showPassword ? 'ti ti-eye-off' : 'ti ti-eye'} style={{ fontSize: '18px' }}></i></button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-4px' }}>
                <button type="button" onClick={() => { setIsForgotMode(true); setLocalError(''); setResetLinkSent(false); }} style={{ background: 'none', border: 'none', color: '#F5A623', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: '4px 0' }}>Forgot Password?</button>
              </div>
              {displayError && (<div style={{ fontSize: '13px', color: '#EF4444', fontWeight: 600, padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><i className="ti ti-alert-triangle" style={{ fontSize: '15px' }}></i><span>{displayError}</span></div>)}
              <button type="submit" disabled={loading} style={{ height: '52px', fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #F5A623 0%, #FFE082 100%)', color: '#0A0C12', border: 'none', borderRadius: '14px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>{loading ? 'Sending code...' : 'Sign In'}</button>
            </form>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
              <span style={{ fontSize: '12px', color: '#8B8FA3', fontWeight: 600 }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            </div>
            <button type="button" onClick={signInWithGoogle} disabled={loading}
              style={{ width: '100%', height: '52px', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s, border-color 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}>
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: '10px' }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <span style={{ fontSize: '14px', color: '#8B8FA3' }}>Don't have an account? </span>
              <button type="button" onClick={onToggle} style={{ fontSize: '14px', fontWeight: 700, color: '#F5A623', background: 'none', border: 'none', cursor: 'pointer' }}>Sign Up</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const SignupWizard = ({ onToggle, onBackToHome, externalError }) => {
  const { register, loading, error, signInWithGoogle } = useAuth();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState('next');
  const [localError, setLocalError] = useState('');
  const [width, setWidth] = useState(window.innerWidth);

  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [work, setWork] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Ethiopia');
  const [city, setCity] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [profilePicPreview, setProfilePicPreview] = useState('');
  const [idDoc, setIdDoc] = useState('');
  const [idDocPreview, setIdDocPreview] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [isPendingVerification, setIsPendingVerification] = useState(false);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!username || username.length < 3) { setUsernameError(''); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) { setUsernameError('Only letters, numbers, underscores'); return; }
    setCheckingUsername(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await supabase.from('users').select('id').eq('username', username.toLowerCase()).single();
        setUsernameError(data ? 'Username is already taken' : '');
      } catch (e) { console.error(e); }
      finally { setCheckingUsername(false); }
    }, 500);
    return () => clearTimeout(t);
  }, [username]);

  useEffect(() => {
    if (!email) { setEmailError(''); return; }
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) { setEmailError('Invalid email address'); return; }
    setCheckingEmail(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await supabase.from('users').select('id').eq('email', email.toLowerCase()).single();
        setEmailError(data ? 'Email is already registered' : '');
      } catch (e) { console.error(e); }
      finally { setCheckingEmail(false); }
    }, 500);
    return () => clearTimeout(t);
  }, [email]);

  const slideStyle = { animation: direction === 'next' ? 'slideInRight 0.3s ease' : 'slideInLeft 0.3s ease' };

  const goNext = () => {
    setLocalError('');
    if (step === 1) {
      if (!fullName.trim()) { setLocalError('Full name is required'); return; }
      if (!age || parseInt(age) < 18) { setLocalError('You must be at least 18 years old'); return; }
      if (!work.trim()) { setLocalError('Occupation is required'); return; }
    }
    if (step === 2) {
      if (!username || username.length < 3) { setLocalError('Username must be at least 3 characters'); return; }
      if (usernameError || checkingUsername) { setLocalError('Fix username errors first'); return; }
      if (!email || emailError || checkingEmail) { setLocalError('Valid email is required'); return; }
      if (!password || password.length < 6) { setLocalError('Password must be at least 6 characters'); return; }
      if (password !== confirmPassword) { setLocalError('Passwords do not match'); return; }
    }
    if (step === 3) {
      if (!phone.trim()) { setLocalError('Phone number is required'); return; }
      if (!country) { setLocalError('Please select a country'); return; }
      if (!city.trim()) { setLocalError('City is required'); return; }
    }
    setDirection('next');
    setStep(s => Math.min(s + 1, 4));
  };

  const goBack = () => { setDirection('back'); setLocalError(''); setStep(s => Math.max(s - 1, 1)); };

  const handleFile = (e, setter, previewSetter) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setLocalError('File must be less than 5MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => { previewSetter(reader.result); setter(reader.result); };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setLocalError('');
    if (usernameError || emailError) { setLocalError('Please fix the errors above'); return; }
    const result = await register(username, password, phone, email, fullName, age, country, city, work, profilePic);
    if (!result) return;
    if (result.status === 'pending_verification') {
      setIsPendingVerification(true);
    }
  };

  const displayError = localError || externalError || error;
  const cityOptions = country === 'Ethiopia' ? ETHIOPIAN_CITIES : [];

  const STEP_TITLES = ['Personal Info', 'Account Credentials', 'Location & Contact', 'Identity Verification'];
  const STEP_ICONS = ['ti ti-user', 'ti ti-key', 'ti ti-map-pin', 'ti ti-id'];

  if (isPendingVerification) {
    return (
      <div style={{ minHeight: '100vh', width: '100%', background: '#0A0E1A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflowY: 'auto' }}>
        <div style={{ position: 'absolute', top: '10%', left: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(245,166,35,0.12) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(40px)' }} />
        <div style={{ width: '100%', maxWidth: '460px', zIndex: 1 }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '40px 32px', textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(245,166,35,0.1)', color: '#F5A623', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '40px', animation: 'pulse 2s infinite' }}>
              <i className="ti ti-mail"></i>
            </div>
            <style>{`
              @keyframes pulse {
                0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245, 166, 35, 0.4); }
                70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(245, 166, 35, 0); }
                100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245, 166, 35, 0); }
              }
            `}</style>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>Verify Your Email</h2>
            <p style={{ fontSize: '15px', color: '#8B8FA3', lineHeight: '1.6', marginBottom: '32px' }}>
              A confirmation email has been sent to <strong style={{ color: '#fff' }}>{email}</strong>.<br />
              Please check your inbox (and spam folder) and click the verification link to activate your account.
            </p>
            <button
              type="button"
              onClick={onToggle}
              style={{
                width: '100%',
                height: '52px',
                background: 'linear-gradient(135deg, #F5A623 0%, #FFE082 100%)',
                color: '#0A0C12',
                border: 'none',
                borderRadius: '14px',
                fontSize: '15px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <i className="ti ti-login" style={{ fontSize: '18px' }}></i> Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: '#0A0E1A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflowY: 'auto' }}>
      <style>{`
        @keyframes slideInRight { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(245,166,35,0.12) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(40px)' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(0,200,150,0.06) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(40px)' }} />

      <div style={{ width: '100%', maxWidth: '460px', zIndex: 1 }}>
        {onBackToHome && (
          <button type="button" onClick={onBackToHome} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50px', color: '#fff', padding: '8px 18px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px' }}>
            <i className="ti ti-arrow-left" style={{ fontSize: '13px' }}></i> Back
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #F5A623, #FFE082)', color: '#0A0C12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', flexShrink: 0 }}>E</div>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>EthioSwap</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          {[1,2,3,4].map(s => (
            <div key={s} style={{ flex: 1, height: '3px', borderRadius: '2px', background: s <= step ? '#F5A623' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s ease' }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <span style={{ fontSize: '13px', color: '#F5A623', fontWeight: 600 }}>Step {step} of 4</span>
          <span style={{ fontSize: '12px', color: '#8B8FA3' }}>{STEP_TITLES[step - 1]}</span>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '28px 24px', ...slideStyle }}>

          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className={STEP_ICONS[step - 1]} style={{ color: '#F5A623', fontSize: '22px' }}></i>
            {STEP_TITLES[step - 1]}
          </h2>
          <p style={{ fontSize: '13px', color: '#8B8FA3', marginBottom: '22px' }}>
            {step === 1 && "Tell us a bit about yourself"}
            {step === 2 && "Set up your login credentials"}
            {step === 3 && "Where can we reach you?"}
            {step === 4 && "Upload your photo and ID for verification"}
          </p>

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={loading}
                style={{
                  width: '100%',
                  height: '52px',
                  fontSize: '14px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '14px',
                  color: '#fff',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s, border-color 0.2s',
                  marginBottom: '8px',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: '10px' }}>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Sign Up with Google
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '8px 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                <span style={{ fontSize: '11px', color: '#8B8FA3', fontWeight: 600, letterSpacing: '0.5px' }}>OR SIGN UP MANUALLY</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
              </div>
              <div style={{ position: 'relative' }}>
                <input type="text" placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} style={{ width: '100%', padding: '14px 16px 14px 44px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                <i className="ti ti-id-badge" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B8FA3', fontSize: '18px' }}></i>
              </div>
              <div style={{ position: 'relative' }}>
                <input type="number" min="18" placeholder="Age" value={age} onChange={e => setAge(e.target.value)} style={{ width: '100%', padding: '14px 16px 14px 44px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                <i className="ti ti-calendar-event" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B8FA3', fontSize: '18px' }}></i>
              </div>
              <div style={{ position: 'relative' }}>
                <input type="text" placeholder="Work / Occupation" value={work} onChange={e => setWork(e.target.value)} style={{ width: '100%', padding: '14px 16px 14px 44px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                <i className="ti ti-briefcase" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B8FA3', fontSize: '18px' }}></i>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ position: 'relative' }}>
                <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} style={{ width: '100%', padding: '14px 44px 14px 44px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${usernameError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)'}`, borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                <i className="ti ti-at" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B8FA3', fontSize: '18px' }}></i>
                {username.length >= 3 && !checkingUsername && (
                  <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px' }}>
                    {usernameError ? <span style={{ color: '#EF4444' }}>X</span> : <span style={{ color: '#22C55E' }}>&#10003;</span>}
                  </span>
                )}
                {checkingUsername && <div style={{ fontSize: '11px', color: '#8B8FA3', marginTop: '4px' }}>Checking...</div>}
                {usernameError && <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px' }}>{usernameError}</div>}
              </div>
              <p style={{ fontSize: '11px', color: '#8B8FA3', marginTop: '-8px' }}>Letters, numbers, and underscores only</p>
              <div style={{ position: 'relative' }}>
                <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '14px 44px 14px 44px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${emailError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)'}`, borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                <i className="ti ti-mail" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B8FA3', fontSize: '18px' }}></i>
                {email && !checkingEmail && (
                  <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px' }}>
                    {emailError ? <span style={{ color: '#EF4444' }}>X</span> : <span style={{ color: '#22C55E' }}>&#10003;</span>}
                  </span>
                )}
                {emailError && <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px' }}>{emailError}</div>}
              </div>
              <p style={{ fontSize: '11px', color: '#8B8FA3', marginTop: '-8px' }}>We'll never share your email</p>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '14px 44px 14px 44px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                <i className="ti ti-lock" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B8FA3', fontSize: '18px' }}></i>
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8B8FA3', cursor: 'pointer' }}>
                  <i className={showPassword ? 'ti ti-eye-off' : 'ti ti-eye'} style={{ fontSize: '18px' }}></i>
                </button>
              </div>
              <PasswordStrength password={password} />
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={{ width: '100%', padding: '14px 16px 14px 44px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${confirmPassword && password !== confirmPassword ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)'}`, borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                <i className="ti ti-shield-lock" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B8FA3', fontSize: '18px' }}></i>
              </div>
              {confirmPassword && password !== confirmPassword && <div style={{ fontSize: '11px', color: '#EF4444' }}>Passwords do not match</div>}
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ position: 'relative' }}>
                <input type="tel" placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: '100%', padding: '14px 16px 14px 44px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                <i className="ti ti-phone" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B8FA3', fontSize: '18px' }}></i>
              </div>
              <p style={{ fontSize: '11px', color: '#8B8FA3', marginTop: '-8px' }}>Used for account recovery only</p>
              <div style={{ position: 'relative' }}>
                <select value={country} onChange={e => { setCountry(e.target.value); setCity(''); }} style={{ width: '100%', padding: '14px 16px 14px 44px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none', appearance: 'none', cursor: 'pointer', boxSizing: 'border-box' }}>
                  {COUNTRIES.map(c => <option key={c} value={c} style={{ background: '#141827', color: '#fff' }}>{c}</option>)}
                </select>
                <i className="ti ti-world" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B8FA3', fontSize: '18px', pointerEvents: 'none' }}></i>
                <i className="ti ti-chevron-down" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B8FA3', fontSize: '16px', pointerEvents: 'none' }}></i>
              </div>
              {country === 'Ethiopia' ? (
                <div style={{ position: 'relative' }}>
                  <select value={city} onChange={e => setCity(e.target.value)} style={{ width: '100%', padding: '14px 16px 14px 44px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none', appearance: 'none', cursor: 'pointer', boxSizing: 'border-box' }}>
                      <option value="" style={{ background: '#141827', color: '#8B8FA3' }}>Select City</option>
                      {ETHIOPIAN_CITIES.map(c => <option key={c} value={c} style={{ background: '#141827', color: '#fff' }}>{c}</option>)}
                  </select>
                  <i className="ti ti-map-pin" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B8FA3', fontSize: '18px', pointerEvents: 'none' }}></i>
                  <i className="ti ti-chevron-down" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B8FA3', fontSize: '16px', pointerEvents: 'none' }}></i>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <input type="text" placeholder="City" value={city} onChange={e => setCity(e.target.value)} style={{ width: '100%', padding: '14px 16px 14px 44px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                  <i className="ti ti-map-pin" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B8FA3', fontSize: '18px' }}></i>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#ccc', fontWeight: 600, marginBottom: '8px', display: 'block' }}>Profile Photo</label>
                <div onClick={() => document.getElementById('profile-upload').click()} style={{ width: '100%', minHeight: '120px', border: '2px dashed rgba(255,255,255,0.12)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', transition: 'border-color 0.2s', overflow: 'hidden' }}>
                  {profilePicPreview ? (
                    <img src={profilePicPreview} alt="Preview" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '10px' }} />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '20px' }}>
                      <i className="ti ti-camera" style={{ fontSize: '28px', color: '#F5A623' }}></i>
                      <span style={{ fontSize: '13px', color: '#8B8FA3' }}>Tap to upload photo</span>
                    </div>
                  )}
                </div>
                <input id="profile-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e, setProfilePic, setProfilePicPreview)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.15)', borderRadius: '10px' }}>
                <i className="ti ti-shield-check" style={{ fontSize: '18px', color: '#00C896' }}></i>
                <span style={{ fontSize: '12px', color: '#8B8FA3' }}>Your data is encrypted & secure</span>
              </div>
            </div>
          )}

          {displayError && (
            <div style={{ fontSize: '13px', color: '#EF4444', fontWeight: 600, padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: '15px' }}></i>
              <span>{displayError}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
          {step > 1 ? (
            <button onClick={goBack} style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="ti ti-arrow-left" style={{ fontSize: '14px' }}></i> Back
            </button>
          ) : <div />}
          {step < 4 ? (
            <button onClick={goNext} style={{ padding: '12px 28px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #F5A623, #FFE082)', color: '#0A0C12', fontSize: '14px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Next <i className="ti ti-arrow-right" style={{ fontSize: '14px' }}></i>
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading} style={{ padding: '12px 28px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #F5A623, #FFE082)', color: '#0A0C12', fontSize: '14px', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <span style={{ fontSize: '14px', color: '#8B8FA3' }}>Already have an account? </span>
          <button type="button" onClick={onToggle} style={{ fontSize: '14px', fontWeight: 700, color: '#F5A623', background: 'none', border: 'none', cursor: 'pointer' }}>Sign In</button>
        </div>
      </div>
    </div>
  );
};

// ── Google Profile Completion Wizard ─────────────────────────────────────────
const GoogleProfileCompletion = () => {
  const { user, completeGoogleProfile, loading, error } = useAuth();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState('next');
  const [localError, setLocalError] = useState('');

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [age, setAge] = useState('');
  const [work, setWork] = useState(user?.work || '');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Ethiopia');
  const [city, setCity] = useState('');
  const [profilePic, setProfilePic] = useState(user?.profile_pic || '');
  const [profilePicPreview, setProfilePicPreview] = useState(user?.profile_pic || '');

  const slideStyle = { animation: direction === 'next' ? 'slideInRight 0.3s ease' : 'slideInLeft 0.3s ease' };
  const cityOptions = country === 'Ethiopia' ? ETHIOPIAN_CITIES : [];
  const displayError = localError || error;

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setLocalError('File must be less than 5MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => { setProfilePicPreview(reader.result); setProfilePic(reader.result); };
    reader.readAsDataURL(file);
  };

  const goNext = () => {
    setLocalError('');
    if (step === 1) {
      if (!fullName.trim()) { setLocalError('Full name is required'); return; }
      if (!age || parseInt(age) < 18) { setLocalError('You must be at least 18 years old'); return; }
      if (!work.trim()) { setLocalError('Occupation is required'); return; }
    }
    if (step === 2) {
      if (!phone.trim()) { setLocalError('Phone number is required'); return; }
      if (!city.trim()) { setLocalError('City is required'); return; }
    }
    setDirection('next');
    setStep(s => Math.min(s + 1, 3));
  };
  const goBack = () => { setDirection('back'); setLocalError(''); setStep(s => Math.max(s - 1, 1)); };

  const handleSubmit = async () => {
    setLocalError('');
    const result = await completeGoogleProfile({ fullName, age, phone, country, city, work, profilePic });
    // On success the user state updates and isProfileIncomplete becomes false → auto-redirects
  };

  const STEP_TITLES = ['Personal Info', 'Location & Contact', 'Profile Photo'];
  const STEP_ICONS = ['ti ti-user', 'ti ti-map-pin', 'ti ti-camera'];

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: '#0A0E1A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflowY: 'auto' }}>
      <style>{`
        @keyframes slideInRight { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes floatUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(245,166,35,0.12) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(40px)' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(66,133,244,0.08) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(40px)' }} />

      <div style={{ width: '100%', maxWidth: '460px', zIndex: 1, animation: 'floatUp 0.5s ease' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #F5A623, #FFE082)', color: '#0A0C12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '18px' }}>E</div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>EthioSwap</div>
            <div style={{ fontSize: '12px', color: '#8B8FA3' }}>Complete Your Profile</div>
          </div>
        </div>

        {/* Google user welcome banner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: 'rgba(66,133,244,0.08)', border: '1px solid rgba(66,133,244,0.2)', borderRadius: '12px', marginBottom: '20px' }}>
          {user?.profile_pic ? (
            <img src={user.profile_pic} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(66,133,244,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
            </div>
          )}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Welcome, {user?.full_name || user?.username}! 👋</div>
            <div style={{ fontSize: '12px', color: '#8B8FA3' }}>Signed in with Google · Fill in a few more details to get started</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
          {[1,2,3].map(s => (
            <div key={s} style={{ flex: 1, height: '3px', borderRadius: '2px', background: s <= step ? '#F5A623' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s ease' }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <span style={{ fontSize: '13px', color: '#F5A623', fontWeight: 600 }}>Step {step} of 3</span>
          <span style={{ fontSize: '12px', color: '#8B8FA3' }}>{STEP_TITLES[step - 1]}</span>
        </div>

        {/* Form card */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '28px 24px', ...slideStyle }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className={STEP_ICONS[step - 1]} style={{ color: '#F5A623', fontSize: '20px' }}></i>
            {STEP_TITLES[step - 1]}
          </h2>
          <p style={{ fontSize: '13px', color: '#8B8FA3', marginBottom: '20px' }}>
            {step === 1 && 'Tell us a bit about yourself'}
            {step === 2 && 'Where can we reach you?'}
            {step === 3 && 'Add a profile photo (optional)'}
          </p>

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ position: 'relative' }}>
                <input type="text" placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} style={{ width: '100%', padding: '14px 16px 14px 44px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                <i className="ti ti-id-badge" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B8FA3', fontSize: '18px' }}></i>
              </div>
              <div style={{ position: 'relative' }}>
                <input type="number" min="18" placeholder="Age (must be 18+)" value={age} onChange={e => setAge(e.target.value)} style={{ width: '100%', padding: '14px 16px 14px 44px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                <i className="ti ti-calendar-event" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B8FA3', fontSize: '18px' }}></i>
              </div>
              <div style={{ position: 'relative' }}>
                <input type="text" placeholder="Work / Occupation" value={work} onChange={e => setWork(e.target.value)} style={{ width: '100%', padding: '14px 16px 14px 44px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                <i className="ti ti-briefcase" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B8FA3', fontSize: '18px' }}></i>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ position: 'relative' }}>
                <input type="tel" placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: '100%', padding: '14px 16px 14px 44px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                <i className="ti ti-phone" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B8FA3', fontSize: '18px' }}></i>
              </div>
              <p style={{ fontSize: '11px', color: '#8B8FA3', marginTop: '-8px' }}>Used for account recovery only</p>
              <div style={{ position: 'relative' }}>
                <select value={country} onChange={e => { setCountry(e.target.value); setCity(''); }} style={{ width: '100%', padding: '14px 16px 14px 44px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none', appearance: 'none', cursor: 'pointer', boxSizing: 'border-box' }}>
                  {COUNTRIES.map(c => <option key={c} value={c} style={{ background: '#141827', color: '#fff' }}>{c}</option>)}
                </select>
                <i className="ti ti-world" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B8FA3', fontSize: '18px', pointerEvents: 'none' }}></i>
                <i className="ti ti-chevron-down" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B8FA3', fontSize: '16px', pointerEvents: 'none' }}></i>
              </div>
              {country === 'Ethiopia' ? (
                <div style={{ position: 'relative' }}>
                  <select value={city} onChange={e => setCity(e.target.value)} style={{ width: '100%', padding: '14px 16px 14px 44px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none', appearance: 'none', cursor: 'pointer', boxSizing: 'border-box' }}>
                    <option value="" style={{ background: '#141827', color: '#8B8FA3' }}>Select City</option>
                    {ETHIOPIAN_CITIES.map(c => <option key={c} value={c} style={{ background: '#141827', color: '#fff' }}>{c}</option>)}
                  </select>
                  <i className="ti ti-map-pin" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B8FA3', fontSize: '18px', pointerEvents: 'none' }}></i>
                  <i className="ti ti-chevron-down" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B8FA3', fontSize: '16px', pointerEvents: 'none' }}></i>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <input type="text" placeholder="City" value={city} onChange={e => setCity(e.target.value)} style={{ width: '100%', padding: '14px 16px 14px 44px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                  <i className="ti ti-map-pin" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B8FA3', fontSize: '18px' }}></i>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div onClick={() => document.getElementById('gpc-profile-upload').click()} style={{ width: '100%', minHeight: '150px', border: '2px dashed rgba(255,255,255,0.12)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', overflow: 'hidden', transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(245,166,35,0.4)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'}
              >
                {profilePicPreview ? (
                  <img src={profilePicPreview} alt="Preview" style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '10px' }} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '24px' }}>
                    <i className="ti ti-camera" style={{ fontSize: '36px', color: '#F5A623' }}></i>
                    <span style={{ fontSize: '13px', color: '#8B8FA3' }}>Tap to upload profile photo</span>
                    <span style={{ fontSize: '11px', color: '#5A6275' }}>Optional · Max 5MB</span>
                  </div>
                )}
              </div>
              <input id="gpc-profile-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.15)', borderRadius: '10px' }}>
                <i className="ti ti-shield-check" style={{ fontSize: '18px', color: '#00C896' }}></i>
                <span style={{ fontSize: '12px', color: '#8B8FA3' }}>You can always update your profile photo later</span>
              </div>
            </div>
          )}

          {displayError && (
            <div style={{ fontSize: '13px', color: '#EF4444', fontWeight: 600, padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: '15px' }}></i>
              <span>{displayError}</span>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
          {step > 1 ? (
            <button onClick={goBack} style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="ti ti-arrow-left" style={{ fontSize: '14px' }}></i> Back
            </button>
          ) : <div />}
          {step < 3 ? (
            <button onClick={goNext} style={{ padding: '12px 28px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #F5A623, #FFE082)', color: '#0A0C12', fontSize: '14px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Next <i className="ti ti-arrow-right" style={{ fontSize: '14px' }}></i>
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading} style={{ padding: '12px 28px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #F5A623, #FFE082)', color: '#0A0C12', fontSize: '14px', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
              {loading ? 'Saving...' : <><i className="ti ti-check" style={{ fontSize: '16px' }}></i> Finish Setup</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const RecoveryForm = () => {
  const { updatePassword, logout, setIsRecoveringPassword, loading, error } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  
  const displayError = localError || error;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!password) {
      setLocalError('Please enter a password.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }
    const success = await updatePassword(password);
    if (success) {
      setPasswordUpdated(true);
    }
  };

  const handleFinish = async () => {
    await logout();
    setIsRecoveringPassword(false);
  };

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: '#0A0E1A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflowY: 'auto' }}>
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(245,166,35,0.12) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(40px)' }} />
      <div style={{ width: '100%', maxWidth: '420px', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', justifyContent: 'center' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #F5A623, #FFE082)', color: '#0A0C12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '16px' }}>E</div>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>EthioSwap</span>
        </div>

        {passwordUpdated ? (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(34,197,94,0.1)', color: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '32px' }}>
              <i className="ti ti-checkbox"></i>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>Password Reset Done</h2>
            <p style={{ fontSize: '14px', color: '#8B8FA3', lineHeight: '1.6', marginBottom: '24px' }}>
              Your password has been successfully updated. You can now log in with your new password.
            </p>
            <button
              type="button"
              onClick={handleFinish}
              style={{
                width: '100%',
                height: '48px',
                background: 'linear-gradient(135deg, #F5A623 0%, #FFE082 100%)',
                color: '#0A0C12',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Sign In Now
            </button>
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '32px 24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '6px', textAlign: 'center', color: '#fff' }}>Reset Your Password</h2>
            <p style={{ fontSize: '14px', color: '#8B8FA3', marginBottom: '24px', textAlign: 'center' }}>Enter your new strong password below</p>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '14px 44px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  required
                />
                <i className="ti ti-lock" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B8FA3', fontSize: '18px' }}></i>
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8B8FA3', cursor: 'pointer', padding: '4px' }}>
                  <i className={showPassword ? 'ti ti-eye-off' : 'ti ti-eye'} style={{ fontSize: '18px' }}></i>
                </button>
              </div>
              <PasswordStrength password={password} />
              
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={{ width: '100%', padding: '14px 16px 14px 44px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${confirmPassword && password !== confirmPassword ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)'}`, borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  required
                />
                <i className="ti ti-shield-lock" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B8FA3', fontSize: '18px' }}></i>
              </div>
              {confirmPassword && password !== confirmPassword && <div style={{ fontSize: '11px', color: '#EF4444' }}>Passwords do not match</div>}

              {displayError && (
                <div style={{ fontSize: '13px', color: '#EF4444', fontWeight: 600, padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="ti ti-alert-triangle" style={{ fontSize: '15px' }}></i>
                  <span>{displayError}</span>
                </div>
              )}

              <button type="submit" disabled={loading} style={{ height: '52px', fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #F5A623 0%, #FFE082 100%)', color: '#0A0C12', border: 'none', borderRadius: '14px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Updating password...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

const PAGE_TITLES = { home: 'Home', p2p: 'Trade', wallet: 'Wallet', transactions: 'History', notifications: 'Notifications', profile: 'Profile', settings: 'Settings', admin: 'Admin', scan: 'Scan QR', sellerProfile: 'Trader Profile' };

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
    <aside style={{ position: 'fixed', top: 0, left: 0, width: 'var(--sidebar-w)', height: '100vh', background: '#0D1117', borderRight: '1px solid #1E2640', display: 'flex', flexDirection: 'column', zIndex: 100 }}>
      <div style={{ padding: '24px 20px 32px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setPage('home')}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #F5A623, #FFE082)', color: '#0A0C12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '16px' }}>E</div>
        <span style={{ fontSize: '18px', fontWeight: 600, color: '#E5E7EB' }}>EthioSwap</span>
      </div>
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 8px' }}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => { setPage(item.id); if (item.id === 'wallet') setWalletInitialTab('balance'); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px', fontSize: '14px', color: page === item.id ? '#F5A623' : '#8A9BB8', background: page === item.id ? 'rgba(245,166,35,0.1)' : 'transparent', borderLeft: page === item.id ? '3px solid #F5A623' : '3px solid transparent', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', transition: 'all 0.2s ease' }}>
            <i className={item.icon} style={{ fontSize: '20px' }}></i>
            <span style={{ fontWeight: page === item.id ? 700 : 500 }}>{item.label}</span>
          </button>
        ))}
      </nav>
      <div style={{ padding: '16px 20px', borderTop: '1px solid #1E2640', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #F5A623, #FFE082)', color: '#0A0C12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '13px' }}>{user?.username?.[0]?.toUpperCase() || 'U'}</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#E5E7EB' }}>{user?.full_name || user?.username || 'User'}</div>
            <div style={{ fontSize: '11px', color: '#8A9BB8' }}>{user?.role === 'admin' ? 'Admin' : 'User'}</div>
          </div>
        </div>
        <button onClick={logout} style={{ padding: '8px', borderRadius: '8px', color: '#8A9BB8', background: 'none', border: 'none', cursor: 'pointer' }}>
          <i className="ti ti-logout" style={{ fontSize: '18px' }}></i>
        </button>
      </div>
    </aside>
  );
};

const MobileBottomNav = ({ page, setPage }) => {
  const tabs = [
    { id: 'home', icon: 'ti ti-home', label: 'Home' },
    { id: 'p2p', icon: 'ti ti-arrows-left-right', label: 'Trade' },
    { id: 'scan', icon: 'ti ti-scan', label: 'Scan', center: true },
    { id: 'transactions', icon: 'ti ti-clock', label: 'History' },
    { id: 'profile', icon: 'ti ti-user', label: 'Profile' },
  ];

  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 'var(--bottom-nav-h)', background: '#0D1117', borderTop: '1px solid #1E2640', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 8px', zIndex: 100 }}>
      {tabs.map(tab => (
        tab.center ? (
          <button key={tab.id} onClick={() => setPage(tab.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 0, position: 'relative', background: 'none', border: 'none' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, #F5A623, #FFE082)', color: '#0A0C12', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '-20px', boxShadow: '0 4px 16px rgba(245,166,35,0.3)' }}>
              <i className={tab.icon} style={{ fontSize: '24px' }}></i>
            </div>
          </button>
        ) : (
          <button key={tab.id} onClick={() => setPage(tab.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '6px 12px', color: page === tab.id ? '#F5A623' : '#8A9BB8', background: 'none', border: 'none', fontSize: '10px' }}>
            <i className={tab.icon} style={{ fontSize: '22px' }}></i>
            <span>{tab.label}</span>
          </button>
        )
      ))}
    </nav>
  );
};

const AppContent = () => {
  const { user, logout, isLocked, setIsLocked, systemSettings, isRecoveringPassword, isProfileIncomplete } = useAuth();
  const [page, setPage] = useState('home');
  const [walletInitialTab, setWalletInitialTab] = useState('balance');
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
    if (window.location.hash) {
      const hash = window.location.hash.substring(1);
      if (hash.includes('error=') || hash.includes('access_token=')) {
        setShowAuth(true);
        setAuthMode('login');
      }
    }
  }, []);

  useEffect(() => {
    if (user && user.role === 'admin' && page === 'home') {
      setPage('admin');
    }
  }, [user]);

  const navigateToSeller = (id) => { setSellerId(id); setPage('sellerProfile'); };

  if (isLocked) return <AppLockScreen onUnlock={() => setIsLocked(false)} />;

  if (isRecoveringPassword) return <RecoveryForm />;

  if (user && isProfileIncomplete) return <GoogleProfileCompletion />;

  if (!user) {
    return showAuth ? (
      <AuthForm mode={authMode} onToggle={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} onBackToHome={() => setShowAuth(false)} />
    ) : (
      <LandingPage onGetStarted={() => { setAuthMode('register'); setShowAuth(true); }} onSignIn={() => { setAuthMode('login'); setShowAuth(true); }} systemSettings={systemSettings} />
    );
  }

  const isDesktop = width >= 768;
  const is_admin_page = page === 'admin' && user?.role === 'admin';
  const pageTitle = PAGE_TITLES[page] || 'EthioSwap';

  return (
    <div style={{ minHeight: '100vh', background: '#0B0E1A' }}>
      {isDesktop && !is_admin_page && <DesktopSidebar page={page} setPage={setPage} user={user} logout={logout} />}
      {!isDesktop && !is_admin_page && (
        <div style={{ position: 'sticky', top: 0, zIndex: 90, background: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #1E2640', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #F5A623, #FFE082)', color: '#0A0C12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px' }}>E</div>
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#E5E7EB' }}>EthioSwap</span>
          </div>
          <button onClick={() => setPage('notifications')} style={{ padding: '8px', position: 'relative', color: '#E5E7EB', background: 'none', border: 'none' }}>
            <i className="ti ti-bell" style={{ fontSize: '20px' }}></i>
            {notifCount > 0 && <div style={{ position: 'absolute', top: '6px', right: '6px', width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', border: '2px solid #0D1117' }}></div>}
          </button>
        </div>
      )}

      <main style={{ marginLeft: isDesktop && !is_admin_page ? 'var(--sidebar-w)' : 0, minHeight: '100vh', padding: isDesktop ? '32px' : '16px', paddingBottom: !isDesktop && !is_admin_page ? 'calc(var(--bottom-nav-h) + 24px)' : '32px' }}>
        <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
          {page === 'home' && (
            <UserDashboard
              onNavigate={(targetPage, subTab) => {
                setPage(targetPage);
                if (targetPage === 'wallet') {
                  setWalletInitialTab(subTab || 'balance');
                }
              }}
              onNavigateToSeller={navigateToSeller}
            />
          )}
          {page === 'p2p' && <P2PListings onNavigateToSeller={navigateToSeller} />}
          {page === 'wallet' && <WalletCard initialTab={walletInitialTab} />}
          {page === 'profile' && <ProfilePage />}
          {page === 'settings' && <SettingsPage user={user} onLogout={logout} />}
          {page === 'transactions' && <TransactionHistory />}
          {page === 'admin' && user.role === 'admin' && <AdminPanel user={user} />}
          {page === 'notifications' && <NotificationsPage setPage={setPage} />}
          {page === 'scan' && <ScanPage setPage={setPage} />}
          {page === 'sellerProfile' && <SellerProfilePage sellerId={sellerId} setPage={setPage} />}
        </div>
      </main>

      <TradeRoom />
      <SupportWidget />
      {showNotifications && <NotificationCenter onClose={() => setShowNotifications(false)} />}
      {!isDesktop && !is_admin_page && <MobileBottomNav page={page} setPage={setPage} />}
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
