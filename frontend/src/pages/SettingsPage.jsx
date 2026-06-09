import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { useMutation } from "convex/react";
import { api } from "convex-api";
import { Globe, Shield, Smartphone, Mail } from 'lucide-react';

const SettingsPage = ({ user, onLogout }) => {
  const { t, i18n } = useTranslation();
  const { updateUser } = useAuth();
  const generateTelegramCodeMutation = useMutation(api.users.generateTelegramLinkCode);
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

  const handleGenerateTelegramCode = async (autoOpen = true) => {
    try {
      setTgGenerating(true);
      const targetId = user._id || user.id;
      if (!targetId) {
        alert("User ID not found. Please log in again.");
        return;
      }
      const res = await generateTelegramCodeMutation({ userId: targetId });
      if (res && res.code) {
        setLinkCode(res.code);
        setTimeRemaining(res.expiresAt ? Math.max(0, res.expiresAt - Date.now()) : 15 * 60 * 1000);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '4px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800 }}>{t('Settings')}</h2>
      </div>

      {/* Language Selector */}
      <div className="card">
        <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
        <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={16} /> Two-Factor Authentication
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>Enable 2FA</div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Extra security for withdrawals and login</div>
            </div>
            <div
              onClick={async () => {
                const newState = !user.twoFaEnabled;
                await updateUser({ twoFaEnabled: newState });
              }}
              style={{ width: '44px', height: '26px', borderRadius: '13px', background: user.twoFaEnabled ? 'var(--gold)' : 'var(--bg-elevated)', border: `1px solid ${user.twoFaEnabled ? 'var(--gold)' : 'var(--border)'}`, cursor: 'pointer', position: 'relative', transition: 'all 0.2s ease' }}
            >
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: user.twoFaEnabled ? '20px' : '2px', transition: 'left 0.2s ease' }} />
            </div>
          </div>
          
          {user.twoFaEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-3)' }}>Verification Method</div>
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

      {/* Notification Channels */}
      <div className="card">
        <div className="section-title">{t('Notification Channels')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Telegram Toggle & Connect */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>Telegram Alerts</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Receive rich trade alerts on Telegram</div>
              </div>
              <div
                onClick={async () => {
                  if (!user.telegramChatId) {
                    alert('Please connect your Telegram account first.');
                    return;
                  }
                  await updateUser({ telegramEnabled: !user.telegramEnabled });
                }}
                style={{ width: '44px', height: '26px', borderRadius: '13px', background: user.telegramEnabled ? 'var(--gold)' : 'var(--bg-elevated)', border: `1px solid ${user.telegramEnabled ? 'var(--gold)' : 'var(--border)'}`, cursor: user.telegramChatId ? 'pointer' : 'not-allowed', position: 'relative', transition: 'all 0.2s ease', opacity: user.telegramChatId ? 1 : 0.5 }}
              >
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: user.telegramEnabled ? '20px' : '2px', transition: 'left 0.2s ease' }} />
              </div>
            </div>

            {/* Telegram Link/Disconnect Widget */}
            <div style={{ marginTop: '6px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border)' }}>
              {user.telegramChatId ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#00d4a0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      🟢 Connected
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>ID: {user.telegramChatId}</span>
                  </div>
                  <button onClick={handleDisconnectTelegramClick} className="btn btn-sm btn-danger" style={{ padding: '6px 12px', fontSize: '11px' }}>
                    Disconnect
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--text-2)', margin: 0, lineHeight: 1.4 }}>
                    Link your account to our Telegram bot <b>@EthioSwap_Bot</b> to get rich alerts and check trade statuses.
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
          </div>

          {/* Email Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>Email Alerts</div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Receive trade alerts on {user.email || 'your email'}</div>
            </div>
            <div
              onClick={async () => {
                await updateUser({ emailEnabled: !user.emailEnabled });
              }}
              style={{ width: '44px', height: '26px', borderRadius: '13px', background: user.emailEnabled ? 'var(--gold)' : 'var(--bg-elevated)', border: `1px solid ${user.emailEnabled ? 'var(--gold)' : 'var(--border)'}`, cursor: 'pointer', position: 'relative', transition: 'all 0.2s ease' }}
            >
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: user.emailEnabled ? '20px' : '2px', transition: 'left 0.2s ease' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="card">
        <div className="section-title">Notification Preferences</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {notifTypes.map((n, i, arr) => (
            <div key={n.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-1)' }}>{n.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{n.desc}</div>
              </div>
              <div
                onClick={() => toggleNotif(n.key)}
                style={{ width: '44px', height: '26px', borderRadius: '13px', background: notifPrefs[n.key] !== false ? 'var(--gold)' : 'var(--bg-elevated)', border: `1px solid ${notifPrefs[n.key] !== false ? 'var(--gold)' : 'var(--border)'}`, cursor: 'pointer', position: 'relative', transition: 'all 0.2s ease', flexShrink: 0 }}
              >
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: notifPrefs[n.key] !== false ? '20px' : '2px', transition: 'left 0.2s ease', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security Tips */}
      <div className="card" style={{ background: 'var(--gold-bg)', border: '1px solid var(--border-active)' }}>
        <div className="section-title" style={{ color: 'var(--gold-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🛡️</span> Security Tips
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            'Never share your login password or PIN with anyone.',
            'Admins will NEVER ask for your private key or payment outside the app.',
            'Always verify bank transfers in your bank app before releasing USD.',
            'Use secure PIN lock to protect your wallet access.'
          ].map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', fontSize: '11px', color: 'var(--text-2)', lineHeight: '1.4' }}>
              <span style={{ color: 'var(--gold-light)' }}>•</span>
              {tip}
            </div>
          ))}
        </div>
      </div>

      {/* About */}
      <div className="card">
        <div className="section-title">About</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {[
            { label: 'App Version', value: '2.0.0' },
            { label: 'Network', value: 'Sepolia Testnet' },
            { label: 'Fee Structure', value: '0.5% max $0.50' },
          ].map((row, i, arr) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>{row.label}</span>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-1)' }}>{row.value}</span>
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
          <div className="modal-box" style={{ width: '100%', maxWidth: '380px', padding: '24px 20px', background: '#111318', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: '#fff' }}>⚠ Disconnect Telegram</h3>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '16px', lineHeight: '1.5' }}>
              <b style={{ color: '#EF4444' }}>This will block you from logging in</b> until you reconnect Telegram. To confirm, enter your account password.
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
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '14px',
                  padding: '0 12px',
                  outline: 'none',
                }}
                className="input"
                autoFocus
              />

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', userSelect: 'none', fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.4 }}>
                <input
                  type="checkbox"
                  checked={disconnectConfirm}
                  onChange={e => setDisconnectConfirm(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#EF4444', cursor: 'pointer', marginTop: '2px', flexShrink: 0 }}
                />
                <span>I understand I will not be able to log in until I reconnect Telegram.</span>
              </label>

              {disconnectError && (
                <div style={{ color: 'var(--status-danger-text)', fontSize: '12px', textAlign: 'left', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px', borderRadius: '8px' }}>
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
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: disconnectLoading ? '#1f2937' : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
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
