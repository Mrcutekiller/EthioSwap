import React, { useState } from 'react';
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import LandingPage from './pages/LandingPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import P2PListings from './components/P2PListings.jsx';
import WalletCard from './components/WalletCard.jsx';
import TradeRoom from './components/TradeRoom.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import AppLockScreen from './components/AppLockScreen.jsx';
import { NotificationCenter, useNotifCount } from './components/NotificationCenter.jsx';
import SupportWidget from './components/SupportWidget.jsx';
import Logo from './components/Logo.jsx';

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
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  admin:    'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  logout:   'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
};

// ── Auth Form ──────────────────────────────────────────────────
const AuthForm = ({ mode, onToggle, onBackToHome }) => {
  const { login, register, loading, error } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [localError, setLocalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!username || !password) { setLocalError('Please fill in all fields.'); return; }
    if (mode === 'register') {
      if (!phone || !email || !fullName || !age) {
        setLocalError('Please fill in all registration fields.');
        return;
      }
      if (parseInt(age) < 18) {
        setLocalError('You must be at least 18 years old to join.');
        return;
      }
      if (email.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setLocalError('Please enter a valid email address.');
        return;
      }
    }

    if (mode === 'login') {
      await login(username, password);
    } else {
      await register(username, password, phone, email, fullName, age);
    }
  };

  const displayError = localError || error;

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflowY: 'auto' }}>
      {/* Background decoration */}
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ background: 'var(--bg-surface)', borderRadius: '24px', border: '1px solid var(--border)', width: '100%', maxWidth: '440px', padding: '36px 32px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', zIndex: 1, backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column' }}>
        {onBackToHome && (
          <button 
            type="button" 
            onClick={onBackToHome} 
            style={{ 
              alignSelf: 'flex-start', 
              background: 'rgba(255,255,255,0.02)', 
              border: '1px solid var(--border)', 
              borderRadius: '8px', 
              color: 'var(--text-2)', 
              padding: '6px 12px', 
              fontSize: '12px', 
              fontWeight: '600',
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              marginBottom: '20px',
              transition: 'all 0.2s ease',
              fontFamily: 'var(--font)'
            }}
          >
            ← Back to Home
          </button>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
          <Logo size={44} />
        </div>

        <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px', textAlign: 'center', color: 'var(--text-1)' }}>
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', marginBottom: '32px', textAlign: 'center' }}>
          {mode === 'login' ? 'Sign in to your EthioSwap wallet' : 'Join the most trusted P2P exchange in Ethiopia'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <input className="input" type="text" placeholder={mode === 'login' ? "Username" : "Desired Username"} value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" style={{ width: '100%' }} />
          </div>
          {mode === 'register' && (
            <div className="input-group" style={{ marginBottom: 0 }}>
              <input className="input" type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" style={{ width: '100%' }} />
            </div>
          )}
          <div className="input-group" style={{ marginBottom: 0, position: 'relative' }}>
            <input className="input" type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} style={{ width: '100%', paddingRight: '44px' }} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '18px' }}>
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          {mode === 'register' && (
            <>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <input className="input" type="text" placeholder="Full Legal Name" value={fullName} onChange={e => setFullName(e.target.value)} autoComplete="name" style={{ width: '100%' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <input className="input" type="tel" placeholder="Phone (+251...)" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: '100%' }} />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <input className="input" type="number" min="18" placeholder="Age" value={age} onChange={e => setAge(e.target.value)} style={{ width: '100%' }} />
                </div>
              </div>
            </>
          )}

          {displayError && <p style={{ fontSize: '13px', color: 'var(--status-danger-text)', fontWeight: 500, padding: '10px 12px', background: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', borderRadius: '10px' }}>⚠ {displayError}</p>}

          <button type="submit" disabled={loading} className="btn btn-gold btn-full btn-lg" style={{ marginTop: '8px', padding: '14px' }}>
            {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '24px 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        <button onClick={onToggle} style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-2)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.2s ease' }}>
          {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign In'}
        </button>

        <div style={{ marginTop: '24px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', fontSize: '12px', color: 'var(--text-3)', lineHeight: '1.6', textAlign: 'center' }}>
          🔒 Secure End-to-End Escrow Exchange System
        </div>
      </div>
    </div>
  );
};

// ── Main App Shell ─────────────────────────────────────────────
const AppShell = () => {
  const { user, wallet, trades, isLocked, unlock, logout, updateUser, switchUser, error, success, systemSettings } = useAuth();
  const [tab, setTabState] = useState(() => {
    if (user?.role === 'admin') return 'admin';
    return localStorage.getItem(`ethioswap_active_tab_${user?.id}`) || 'home';
  });

  const setTab = (newTab) => {
    setTabState(newTab);
    localStorage.setItem(`ethioswap_active_tab_${user?.id}`, newTab);
  };
  const [authMode, setAuthMode] = useState(null); // default to null (show landing)
  const [notifOpen, setNotifOpen] = useState(false);
  const notifCount = useNotifCount(user?.id);
  const activeTrades = trades.filter(t => ['payment_pending', 'paid', 'disputed'].includes(t.status)).length;

  const [prevNotifCount, setPrevNotifCount] = useState(0);
  const notifications = useQuery(api.notifications.list, user?.id ? { userId: user.id } : "skip") ?? [];

  // Request browser Notification Permission on login
  React.useEffect(() => {
    if (user && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [user]);

  // Real-time background HTML5 Notification trigger
  React.useEffect(() => {
    if (!user) return;
    const unread = notifications.filter(n => !n.isRead);
    // If a new unread notification arrives
    if (unread.length > prevNotifCount) {
      const latest = unread[0]; // sorted descending
      if (latest && 'Notification' in window && Notification.permission === 'granted') {
        new Notification("EthioSwap Alert", {
          body: latest.message,
          icon: '/favicon.ico',
        });
      }
    }
    setPrevNotifCount(unread.length);
  }, [notifications, user, prevNotifCount]);

  const getInitials = (name) => (name || 'U').substring(0, 2).toUpperCase();
  const lockMethod = localStorage.getItem('ethioswap_lock_method') || 'pin';
  const savedPin = localStorage.getItem('ethioswap_lock_pin'); // No fallback to force setup if not set

  // Auto-detect login link from website
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    if (params.get('action') === 'login' || hash === '#login') {
      setAuthMode('login');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('action') === 'register' || hash === '#register') {
      setAuthMode('register');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

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
      />
    );
  }

  // Locked → show lock screen
  if (isLocked) {
    return <AppLockScreen user={user} lockMethod={lockMethod} savedPin={savedPin} onUnlock={unlock} />;
  }

  // Bottom nav items
  const navItems = user.role === 'admin'
    ? [{ id: 'admin', label: 'Admin', icon: Icons.admin }]
    : [
        { id: 'home',     label: 'Trade',    icon: Icons.home },
        { id: 'wallet',   label: 'Wallet',   icon: Icons.wallet },
        { id: 'trades',   label: 'Trades',   icon: Icons.trades,   badge: activeTrades },
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
          <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center' }}>EthioSwap</span>
        </div>

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
          {/* Wallet balance */}
          {wallet && user.role !== 'admin' && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold-light)', lineHeight: '1.1' }}>${(wallet.ethAvailable ?? 0).toFixed(2)} USD</div>
              <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>≈ {Math.round((wallet.ethAvailable ?? 0) * (systemSettings?.etbRatePerDollar ?? 190)).toLocaleString()} ETB</div>
            </div>
          )}



          {/* User profile capsule */}
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
            {notifCount > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#EF4444', color: 'white', borderRadius: '99px', minWidth: '16px', height: '16px', fontSize: '9px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '2px solid var(--bg-base)' }}>{notifCount}</span>}
          </button>

          {/* Quick Logout (Desktop only) */}
          <button onClick={logout} className="desktop-nav" style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--status-danger-text)', cursor: 'pointer' }} title="Logout">
            <Icon d={Icons.logout} size={16} />
          </button>
        </div>
      </header>

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

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
