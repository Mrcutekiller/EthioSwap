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

  if (user) return null;

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  useEffect(() => {
    if (mode === 'login') { setUsernameError(''); return; }
    if (!username || username.length < 3) { setUsernameError(''); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) { setUsernameError('Username can only contain letters, numbers, and underscores'); return; }

    setCheckingUsername(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await supabase.from('users').select('id').eq('username', username.toLowerCase()).single();
        setUsernameError(data ? 'Username is already taken' : '');
      } catch (err) { console.error(err); }
      finally { setCheckingUsername(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [username, mode]);

  useEffect(() => {
    if (mode === 'login') { setEmailError(''); return; }
    if (!email) { setEmailError(''); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setEmailError('Please enter a valid email address'); return; }

    setCheckingEmail(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await supabase.from('users').select('id').eq('email', email.toLowerCase()).single();
        setEmailError(data ? 'Email is already registered' : '');
      } catch (err) { console.error(err); }
      finally { setCheckingEmail(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [email, mode]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setLocalError("Image size must be less than 2MB."); return; }

    const reader = new FileReader();
    reader.onloadend = () => setProfilePicPreview(reader.result);
    reader.readAsDataURL(file);

    setUploadingPic(true);
    try {
      const base64 = await new Promise((resolve) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result);
        r.readAsDataURL(file);
      });
      setProfilePic(base64);
    } catch (err) {
      console.error("Profile picture upload failed:", err);
    } finally {
      setUploadingPic(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (mode === 'login') {
      if (!username || !password) { setLocalError('Please enter both email and password.'); return; }
      const res = await login(username, password);
      if (!res) return;
    } else {
      if (usernameError || emailError) { setLocalError('Please resolve the errors on the form before submitting.'); return; }
      if (!username || !password || !confirmPassword || !email || !fullName || !phone || !age || !country || !city || !work) {
        setLocalError('Please fill in all registration fields.'); return;
      }
      if (password !== confirmPassword) { setLocalError('Passwords do not match.'); return; }
      if (parseInt(age) < 18) { setLocalError('You must be at least 18 years old to join.'); return; }
      const result = await register(username, password, phone, email, fullName, age, country, city, work, profilePic);
      if (!result) return;
    }
  };

  const displayError = localError || externalError || error;

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflowY: 'auto' }}>
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(245,166,35,0.12) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(40px)' }} />

      <div style={{ display: 'flex', flexDirection: width < 1024 ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: width < 1024 ? '32px' : '64px', width: '100%', maxWidth: '1000px', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: width < 768 ? '300px' : '500px', width: width < 1024 ? '100%' : 'auto', flexShrink: 0 }}>
          <FloatingBill size={width < 768 ? 'sm' : 'lg'} />
        </div>

        <div className="auth-card" style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column' }}>
          {onBackToHome && (
            <button type="button" onClick={onBackToHome} style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50px', color: '#FFFFFF', padding: '8px 18px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px' }}>
              <i className="ti ti-arrow-left" style={{ fontSize: '13px' }}></i> Back to Home
            </button>
          )}

          <h2 className="auth-title" style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px', textAlign: 'center' }}>
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {mode === 'login' ? (
              <div className="auth-input-group">
                <input className="auth-input" type="email" placeholder="Email Address" value={username} onChange={e => setUsername(e.target.value)} />
                <i className="auth-input-icon ti ti-mail"></i>
              </div>
            ) : (
              <>
                <div className="auth-input-group">
                  <input className="auth-input" type="text" placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} />
                  <i className="auth-input-icon ti ti-id-badge"></i>
                </div>
                <div className="auth-input-group">
                  <input className="auth-input" type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} style={usernameError ? { borderColor: 'rgba(239, 68, 68, 0.5)' } : {}} />
                  <i className="auth-input-icon ti ti-at"></i>
                  {usernameError && <div style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px' }}>{usernameError}</div>}
                </div>
                <div className="auth-input-group">
                  <input className="auth-input" type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} style={emailError ? { borderColor: 'rgba(239, 68, 68, 0.5)' } : {}} />
                  <i className="auth-input-icon ti ti-mail"></i>
                  {emailError && <div style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px' }}>{emailError}</div>}
                </div>
              </>
            )}

            <div className="auth-input-group">
              <input className="auth-input" type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="auth-toggle-pwd">
                <i className={showPassword ? "ti ti-eye-off" : "ti ti-eye"}></i>
              </button>
              <i className="auth-input-icon ti ti-lock"></i>
            </div>

            {mode === 'register' && (
              <>
                <div className="auth-input-group">
                  <input className="auth-input" type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', margin: '4px 0 0' }}>
                  <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer' }} onClick={() => document.getElementById('pic-upload').click()}>
                    {profilePicPreview ? <img src={profilePicPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <i className="ti ti-camera" style={{ fontSize: '22px', color: 'var(--muted)' }}></i>}
                  </div>
                  <input id="pic-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                </div>
              </>
            )}

            {displayError && (
              <div style={{ fontSize: '13px', color: 'var(--status-danger-text)', fontWeight: 600, padding: '12px 14px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="ti ti-alert-triangle" style={{ fontSize: '15px', color: '#EF4444' }}></i>
                <span>{cleanConvexError(displayError)}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-gold btn-full" style={{ height: '52px', fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #F5A623 0%, #FFE082 100%)', color: '#0A0C12', border: 'none', borderRadius: '14px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-2)' }}>
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            </span>
            <button type="button" onClick={onToggle} style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 6px' }}>
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
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
