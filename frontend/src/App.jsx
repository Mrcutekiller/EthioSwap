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
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const displayError = localError || externalError || error;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!email || !password) { setLocalError('Please enter both email and password.'); return; }
    await login(email, password);
  };

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: '#0A0E1A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflowY: 'auto' }}>
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(245,166,35,0.12) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(40px)' }} />
      <div style={{ width: '100%', maxWidth: '420px', zIndex: 1 }}>
        {onBackToHome && (
          <button type="button" onClick={onBackToHome} style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50px', color: '#fff', padding: '8px 18px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '28px' }}>
            <i className="ti ti-arrow-left" style={{ fontSize: '13px' }}></i> Back
          </button>
        )}
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
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8B8FA3', cursor: 'pointer', padding: '4px' }}>
              <i className={showPassword ? 'ti ti-eye-off' : 'ti ti-eye'} style={{ fontSize: '18px' }}></i>
            </button>
          </div>
          {displayError && (
            <div style={{ fontSize: '13px', color: '#EF4444', fontWeight: 600, padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: '15px' }}></i>
              <span>{displayError}</span>
            </div>
          )}
          <button type="submit" disabled={loading} style={{ height: '52px', fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #F5A623 0%, #FFE082 100%)', color: '#0A0C12', border: 'none', borderRadius: '14px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <span style={{ fontSize: '14px', color: '#8B8FA3' }}>Don't have an account? </span>
          <button type="button" onClick={onToggle} style={{ fontSize: '14px', fontWeight: 700, color: '#F5A623', background: 'none', border: 'none', cursor: 'pointer' }}>Sign Up</button>
        </div>
      </div>
    </div>
  );
};

const SignupWizard = ({ onToggle, onBackToHome, externalError }) => {
  const { register, loading, error } = useAuth();
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
  };

  const displayError = localError || externalError || error;
  const cityOptions = country === 'Ethiopia' ? ETHIOPIAN_CITIES : [];

  const STEP_TITLES = ['Personal Info', 'Account Credentials', 'Location & Contact', 'Identity Verification'];
  const STEP_ICONS = ['ti ti-user', 'ti ti-key', 'ti ti-map-pin', 'ti ti-id'];

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
              <div>
                <label style={{ fontSize: '13px', color: '#ccc', fontWeight: 600, marginBottom: '8px', display: 'block' }}>National ID / Passport</label>
                <div onClick={() => document.getElementById('id-upload').click()} style={{ width: '100%', minHeight: '100px', border: '2px dashed rgba(255,255,255,0.12)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
                  {idDocPreview ? (
                    <img src={idDocPreview} alt="ID Preview" style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '10px' }} />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '20px' }}>
                      <i className="ti ti-id" style={{ fontSize: '28px', color: '#F5A623' }}></i>
                      <span style={{ fontSize: '13px', color: '#8B8FA3' }}>Tap to upload ID document</span>
                    </div>
                  )}
                </div>
                <input id="id-upload" type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => handleFile(e, setIdDoc, setIdDocPreview)} />
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
    <aside style={{ position: 'fixed', top: 0, left: 0, width: 'var(--sidebar-w)', height: '100vh', background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', zIndex: 100 }}>
      <div style={{ padding: '24px 20px 32px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setPage('home')}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--teal)', color: '#04342C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '16px' }}>E</div>
        <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>EthioSwap</span>
      </div>
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 8px' }}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => setPage(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px', fontSize: '14px', color: page === item.id ? 'var(--teal)' : 'var(--muted)', background: page === item.id ? 'rgba(0,200,150,0.08)' : 'transparent', borderLeft: page === item.id ? '3px solid var(--teal)' : '3px solid transparent', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer' }}>
            <i className={item.icon} style={{ fontSize: '20px' }}></i>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--teal)', color: '#04342C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '13px' }}>{user?.username?.[0]?.toUpperCase() || 'U'}</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{user?.full_name || user?.username || 'User'}</div>
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{user?.id?.substring(0, 8) || 'ES-XXX'}</div>
          </div>
        </div>
        <button onClick={logout} style={{ padding: '8px', borderRadius: '8px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
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
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 'var(--bottom-nav-h)', background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 8px', zIndex: 100 }}>
      {tabs.map(tab => (
        tab.center ? (
          <button key={tab.id} onClick={() => setPage(tab.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 0, position: 'relative', background: 'none', border: 'none' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--teal)', color: '#04342C', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '-20px', boxShadow: '0 4px 16px rgba(0,200,150,0.3)' }}>
              <i className={tab.icon} style={{ fontSize: '24px' }}></i>
            </div>
          </button>
        ) : (
          <button key={tab.id} onClick={() => setPage(tab.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '6px 12px', color: page === tab.id ? 'var(--teal)' : 'var(--muted)', background: 'none', border: 'none', fontSize: '10px' }}>
            <i className={tab.icon} style={{ fontSize: '22px' }}></i>
            <span>{tab.label}</span>
          </button>
        )
      ))}
    </nav>
  );
};

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

  const navigateToSeller = (id) => { setSellerId(id); setPage('sellerProfile'); };

  if (isLocked) return <AppLockScreen onUnlock={() => setIsLocked(false)} />;

  if (!user) {
    return showAuth ? (
      <AuthForm mode={authMode} onToggle={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} onBackToHome={() => setShowAuth(false)} />
    ) : (
      <LandingPage onGetStarted={() => { setAuthMode('register'); setShowAuth(true); }} onSignIn={() => { setAuthMode('login'); setShowAuth(true); }} systemSettings={null} />
    );
  }

  const isDesktop = width >= 768;
  const pageTitle = PAGE_TITLES[page] || 'EthioSwap';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {isDesktop && <DesktopSidebar page={page} setPage={setPage} user={user} logout={logout} />}
      {!isDesktop && (
        <div style={{ position: 'sticky', top: 0, zIndex: 90, background: 'rgba(11,14,26,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--teal)', color: '#04342C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px' }}>E</div>
            <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>EthioSwap</span>
          </div>
          <button onClick={() => setPage('notifications')} style={{ padding: '8px', position: 'relative', color: 'var(--text)', background: 'none', border: 'none' }}>
            <i className="ti ti-bell" style={{ fontSize: '20px' }}></i>
            {notifCount > 0 && <div style={{ position: 'absolute', top: '6px', right: '6px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)', border: '2px solid var(--bg)' }}></div>}
          </button>
        </div>
      )}

      <main style={{ marginLeft: isDesktop ? 'var(--sidebar-w)' : 0, minHeight: '100vh', padding: isDesktop ? '32px' : '16px', paddingBottom: !isDesktop ? 'calc(var(--bottom-nav-h) + 24px)' : '32px' }}>
        <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
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

      <TradeRoom />
      <SupportWidget />
      {showNotifications && <NotificationCenter onClose={() => setShowNotifications(false)} />}
      {!isDesktop && <MobileBottomNav page={page} setPage={setPage} />}
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
