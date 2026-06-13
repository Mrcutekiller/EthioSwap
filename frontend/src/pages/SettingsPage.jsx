import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "convex-api";
import { Globe, Shield, Smartphone, Mail } from 'lucide-react';

const SettingsPage = ({ user, onLogout }) => {
  const { t, i18n } = useTranslation();
  const { updateUser } = useAuth();
  const disconnectTelegramMutation = useMutation(api.users.disconnectTelegram);

  const [showDisconnectPwd, setShowDisconnectPwd] = useState(false);
  const [disconnectPassword, setDisconnectPassword] = useState('');
  const [disconnectConfirm, setDisconnectConfirm] = useState(false);
  const [disconnectLoading, setDisconnectLoading] = useState(false);
  const [disconnectError, setDisconnectError] = useState('');

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

  const generateTelegramCodeAction = useAction(api.telegram.generateTelegramLinkToken);
  
  const handleGenerateTelegramCode = async (autoOpen = true) => {
    try {
      setTgGenerating(true);
      const targetId = user._id || user.id;
      if (!targetId) {
        alert("User ID not found. Please log in again.");
        return;
      }
      const res = await generateTelegramCodeAction({ userId: targetId });
      if (res && res.token) {
        setLinkCode(res.token);
        setTimeRemaining(10 * 60 * 1000);
        setDeepLink(res.deepLink || `https://t.me/EthioSwap_Bot?start=${res.token}`);
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

  const handleDisconnectTelegramClick = async () => {
    const ok = window.confirm(
      "⚠ Disconnect Telegram?\n\n" +
      "You will NOT be able to log in again until you reconnect. " +
      "This is a security measure to prevent unauthorized access.\n\n" +
      "Are you sure?"
    );
    if (!ok) return;
    setShowDisconnectPwd(true);
    setDisconnectPassword('');
    setDisconnectConfirm(false);
    setDisconnectError('');
  };

  const handleDisconnectConfirm = async (e) => {
    e.preventDefault();
    setDisconnectError('');
    if (!disconnectConfirm) {
      setDisconnectError('Please confirm you understand the consequences.');
      return;
    }
    if (!disconnectPassword) {
      setDisconnectError('Please enter your account password.');
      return;
    }
    setDisconnectLoading(true);
    try {
      await disconnectTelegramMutation({
        userId: user._id || user.id,
        password: disconnectPassword,
      });
      setShowDisconnectPwd(false);
      alert('Telegram disconnected. You can reconnect from this page at any time.');
    } catch (err) {
      setDisconnectError(err.message);
    } finally {
      setDisconnectLoading(false);
    }
  };

  const [lang, setLang] = useState(i18n.language || 'en');

  const changeLanguage = async (newLang) => {
    i18n.changeLanguage(newLang);
    setLang(newLang);
    localStorage.setItem('ethioswap_language', newLang);
    if (user) {
      await updateUser({ preferredLanguage: newLang });
    }
  };

  const [notifPrefs, setNotifPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ethioswap_notif_prefs') || '{}'); } catch { return {}; }
  });

  const notifTypes = [
    { key: 'trades',      label: 'Trade Updates',       desc: 'When a buyer opens a trade or seller releases' },
    { key: 'payments',    label: 'Payment Alerts',       desc: 'When buyer marks as paid or timer expires' },
    { key: 'deposits',    label: 'Deposit Confirmed',    desc: 'When USD arrives in your wallet' },
    { key: 'withdrawals', label: 'Withdrawal Sent',      desc: 'When your withdrawal is broadcast' },
    { key: 'disputes',    label: 'Dispute Alerts',       desc: 'When a dispute is opened or resolved' },
    { key: 'kyc',         label: 'KYC Status Updates',   desc: 'Approval or rejection notifications' },
  ];

  const toggleNotif = (key) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    localStorage.setItem('ethioswap_notif_prefs', JSON.stringify(updated));
  };

  const isTelegramLinked = useQuery(api.telegram.isTelegramLinked, { userId: user?._id || user?.id });

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h1 className="page-title" style={{ fontSize: '24px', fontWeight: 600, color: '#fff' }}>{t('Settings')}</h1>
        <p className="page-subtitle" style={{ fontSize: '14px', color: '#8A9BB8' }}>Manage your account and preferences</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Language Selector */}
        <div className="card">
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#fff' }}>
            <Globe size={16} /> {t('Language')} / ቋንቋ
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => changeLanguage('en')}
              className={`btn ${lang === 'en' ? 'btn-gold' : 'btn-ghost'}`}
              style={{ flex: 1 }}
            >
              English
            </button>
            <button 
              onClick={() => changeLanguage('am')}
              className={`btn ${lang === 'am' ? 'btn-gold' : 'btn-ghost'}`}
              style={{ flex: 1 }}
            >
              አማርኛ
            </button>
          </div>
        </div>

        {/* 2FA Settings */}
        <div className="card">
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#fff' }}>
            <Shield size={16} /> Two-Factor Authentication
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Enable 2FA</div>
                <div style={{ fontSize: '11px', color: '#8A9BB8' }}>Extra security for withdrawals and login</div>
              </div>
              <div
                onClick={async () => {
                  const newState = !user.twoFaEnabled;
                  await updateUser({ twoFaEnabled: newState });
                }}
                style={{ width: '44px', height: '24px', borderRadius: '12px', background: user.twoFaEnabled ? '#00C896' : '#1A1F32', border: `1px solid ${user.twoFaEnabled ? '#00C896' : '#1E2640'}`, cursor: 'pointer', position: 'relative', transition: 'all 0.2s ease' }}
              >
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: user.twoFaEnabled ? '22px' : '2px', transition: 'left 0.2s ease' }} />
              </div>
            </div>
            
            {user.twoFaEnabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', padding: '12px', background: '#1A1F32', borderRadius: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#8A9BB8' }}>Verification Method</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button className={`btn btn-sm ${user.twoFaMethod === 'email' ? 'btn-gold' : 'btn-ghost'}`} onClick={() => updateUser({ twoFaMethod: 'email' })}>
                    <Mail size={14} /> Email
                  </button>
                  <button className={`btn btn-sm ${user.twoFaMethod === 'sms' ? 'btn-gold' : 'btn-ghost'}`} onClick={() => updateUser({ twoFaMethod: 'sms' })}>
                    <Smartphone size={14} /> SMS
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notification Channels */}
      <div className="card">
        <div className="section-title" style={{ fontWeight: 600, color: '#fff' }}>{t('Notification Channels')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Telegram Toggle & Connect - REMOVED */}
          
          {/* Email Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #1E2640' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Email Alerts</div>
              <div style={{ fontSize: '11px', color: '#8A9BB8' }}>Receive trade alerts on {user.email || 'your email'}</div>
            </div>
            <div
              onClick={async () => {
                await updateUser({ emailEnabled: !user.emailEnabled });
              }}
              style={{ width: '44px', height: '24px', borderRadius: '12px', background: user.emailEnabled ? '#00C896' : '#1A1F32', border: `1px solid ${user.emailEnabled ? '#00C896' : '#1E2640'}`, cursor: 'pointer', position: 'relative', transition: 'all 0.2s ease' }}
            >
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: user.emailEnabled ? '22px' : '2px', transition: 'left 0.2s ease' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="card">
        <div className="section-title" style={{ fontWeight: 600, color: '#fff' }}>Notification Preferences</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {notifTypes.map((n, i, arr) => (
            <div key={n.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid #1E2640' : 'none' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{n.label}</div>
                <div style={{ fontSize: '11px', color: '#8A9BB8' }}>{n.desc}</div>
              </div>
              <div
                onClick={() => toggleNotif(n.key)}
                style={{ width: '44px', height: '24px', borderRadius: '12px', background: notifPrefs[n.key] !== false ? '#00C896' : '#1A1F32', border: `1px solid ${notifPrefs[n.key] !== false ? '#00C896' : '#1E2640'}`, cursor: 'pointer', position: 'relative', transition: 'all 0.2s ease', flexShrink: 0 }}
              >
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: notifPrefs[n.key] !== false ? '22px' : '2px', transition: 'left 0.2s ease', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security Tips */}
      <div className="card" style={{ background: 'rgba(245,166,35,0.05)', border: '1px solid rgba(245,166,35,0.2)' }}>
        <div className="section-title" style={{ color: '#F5A623', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🛡️</span> Security Tips
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            'Never share your login password or PIN with anyone.',
            'Admins will NEVER ask for your private key or payment outside the app.',
            'Always verify bank transfers in your bank app before releasing USD.',
            'Use secure PIN lock to protect your wallet access.'
          ].map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', fontSize: '11px', color: '#8A9BB8', lineHeight: '1.4' }}>
              <span style={{ color: '#F5A623' }}>•</span>
              {tip}
            </div>
          ))}
        </div>
      </div>

      {/* About */}
      <div className="card">
        <div className="section-title" style={{ fontWeight: 600, color: '#fff' }}>About</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {[
            { label: 'App Version', value: '2.0.0' },
            { label: 'Network', value: 'Sepolia Testnet' },
            { label: 'Fee Structure', value: '0.5% max $0.50' },
          ].map((row, i, arr) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid #1E2640' : 'none' }}>
              <span style={{ fontSize: '13px', color: '#8A9BB8' }}>{row.label}</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sign Out */}
      <button onClick={onLogout} className="btn btn-danger btn-full" style={{ borderRadius: '12px', padding: '14px' }}>
        Sign Out
      </button>

      {/* Disconnect Telegram — password confirmation modal */}
      {showDisconnectPwd && (
        <div className="overlay modal-center" style={{ zIndex: 1100, position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="modal-box" style={{ width: '100%', maxWidth: '380px', padding: '24px 20px', background: '#141827', border: '1px solid #1E2640', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>⚠ Disconnect Telegram</h3>
            <p style={{ fontSize: '12px', color: '#8A9BB8', marginBottom: '16px', lineHeight: '1.5' }}>
              <b style={{ color: '#FF4D4D' }}>This will block you from logging in</b> until you reconnect Telegram. To confirm, enter your account password.
            </p>

            <form onSubmit={handleDisconnectConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="password"
                placeholder="Your account password"
                value={disconnectPassword}
                onChange={e => setDisconnectPassword(e.target.value)}
                style={{
                  width: '100%',
                  height: '44px',
                  background: '#0B0E1A',
                  border: '1px solid #1E2640',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '14px',
                  padding: '0 12px',
                  outline: 'none',
                }}
                className="input"
                autoFocus
              />

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', userSelect: 'none', fontSize: '12px', color: '#8A9BB8', lineHeight: 1.4 }}>
                <input
                  type="checkbox"
                  checked={disconnectConfirm}
                  onChange={e => setDisconnectConfirm(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#FF4D4D', cursor: 'pointer', marginTop: '2px', flexShrink: 0 }}
                />
                <span>I understand I will not be able to log in until I reconnect Telegram.</span>
              </label>

              {disconnectError && (
                <div style={{ color: '#FF4D4D', fontSize: '12px', textAlign: 'left', background: 'rgba(255, 77, 77, 0.08)', border: '1px solid rgba(255, 77, 77, 0.2)', padding: '10px', borderRadius: '8px' }}>
                  ⚠ {disconnectError}
                </div>
              )}

              <button
                type="submit"
                disabled={disconnectLoading}
                className="btn btn-full"
                style={{
                  height: '44px',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: disconnectLoading ? '#1f2937' : '#FF4D4D',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  width: '100%',
                  cursor: disconnectLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {disconnectLoading ? '⏳ Disconnecting...' : 'Disconnect Telegram'}
              </button>

              <button
                type="button"
                onClick={() => setShowDisconnectPwd(false)}
                className="btn btn-ghost btn-sm btn-full"
                style={{ width: '100%' }}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SettingsPage;
