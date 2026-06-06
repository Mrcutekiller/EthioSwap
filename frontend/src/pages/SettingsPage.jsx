import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { useMutation } from "convex/react";
import { api } from "convex-api";
import { Globe, Shield, Smartphone, Mail } from 'lucide-react';

const SettingsPage = ({ user, onLogout }) => {
  const { t, i18n } = useTranslation();
  const { updateUser, sendOtp } = useAuth();
  const generateTelegramCodeMutation = useMutation(api.users.generateTelegramLinkCode);
  const disconnectTelegramMutation = useMutation(api.users.disconnectTelegram);

  const [showSettingsOtp, setShowSettingsOtp] = useState(false);
  const [settingsOtpCode, setSettingsOtpCode] = useState('');
  const [settingsOtpChannel, setSettingsOtpChannel] = useState(user?.preferredVerificationMethod || 'sms');
  const [settingsSendingOtp, setSettingsSendingOtp] = useState(false);
  const [settingsResendTimer, setSettingsResendTimer] = useState(0);
  const [settingsOtpError, setSettingsOtpError] = useState('');
  const [settingsOtpLoading, setSettingsOtpLoading] = useState(false);

  const [linkCode, setLinkCode] = useState(user?.telegramLinkCode || '');
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    if (user?.telegramLinkCode && user?.telegramLinkExpires) {
      const remaining = user.telegramLinkExpires - Date.now();
      if (remaining > 0) {
        setLinkCode(user.telegramLinkCode);
        setTimeRemaining(remaining);
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

  useEffect(() => {
    if (settingsResendTimer <= 0) return;
    const interval = setInterval(() => {
      setSettingsResendTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [settingsResendTimer]);

  const triggerSettingsOtp = async (channel) => {
    setSettingsSendingOtp(true);
    setSettingsOtpError('');
    try {
      await sendOtp(user._id, 'sensitive_change', channel || settingsOtpChannel);
      setSettingsResendTimer(60);
    } catch (err) {
      setSettingsOtpError(err.message);
    } finally {
      setSettingsSendingOtp(false);
    }
  };

  const handleDisconnectTelegramClick = async () => {
    if (window.confirm("Are you sure you want to disconnect Telegram? This will disable Telegram alerts and security notifications.")) {
      setShowSettingsOtp(true);
      setSettingsOtpCode('');
      setSettingsOtpError('');
      await triggerSettingsOtp(settingsOtpChannel);
    }
  };

  const handleSettingsOtpSubmit = async (e) => {
    e.preventDefault();
    setSettingsOtpError('');
    if (settingsOtpCode.length !== 6) {
      setSettingsOtpError('Please enter the 6-digit OTP code.');
      return;
    }
    setSettingsOtpLoading(true);
    try {
      await disconnectTelegramMutation({ userId: user._id || user.id, otpCode: settingsOtpCode });
      setShowSettingsOtp(false);
      alert('Telegram disconnected successfully.');
    } catch (err) {
      setSettingsOtpError(err.message);
    } finally {
      setSettingsOtpLoading(false);
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
          {/* SMS Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>SMS Alerts</div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Receive trade alerts on {user.phone || 'your phone'}</div>
            </div>
            <div
              onClick={async () => {
                await updateUser({ smsEnabled: !user.smsEnabled });
              }}
              style={{ width: '44px', height: '26px', borderRadius: '13px', background: user.smsEnabled ? 'var(--gold)' : 'var(--bg-elevated)', border: `1px solid ${user.smsEnabled ? 'var(--gold)' : 'var(--border)'}`, cursor: 'pointer', position: 'relative', transition: 'all 0.2s ease' }}
            >
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: user.smsEnabled ? '20px' : '2px', transition: 'left 0.2s ease' }} />
            </div>
          </div>

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
                        <strong style={{ fontSize: '22px', letterSpacing: '2px', color: 'var(--gold)', fontFamily: 'monospace' }}>
                          {linkCode}
                        </strong>
                        <span style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '4px' }}>
                          Expires in {Math.max(0, Math.ceil(timeRemaining / 1000))}s
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-2)', lineHeight: 1.4 }}>
                          1. Click <b>Open Bot</b> below to open Telegram.
                          <br />
                          2. Send the 6-digit code <b>{linkCode}</b> to start receiving alerts.
                        </div>
                        <a 
                          href="https://t.me/EthioSwap_Bot" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn btn-gold btn-sm"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textDecoration: 'none', padding: '8px', borderRadius: '6px', fontWeight: 600 }}
                        >
                          ✈️ Open Bot (@EthioSwap_Bot)
                        </a>
                      </div>
                    </div>
                  ) : (
                    <button onClick={async () => {
                      try {
                        const targetId = user._id || user.id;
                        if (!targetId) {
                          alert("User ID not found. Please log in again.");
                          return;
                        }
                        const res = await generateTelegramCodeMutation({ userId: targetId });
                        if (res && res.code) {
                          setLinkCode(res.code);
                          setTimeRemaining(10 * 60 * 1000); // 10 mins
                        }
                      } catch (err) {
                        alert("Error generating Telegram link code: " + err.message);
                      }
                    }} className="btn btn-gold btn-full btn-sm" style={{ padding: '8px 12px', borderRadius: '6px', fontWeight: 600 }}>
                      🔌 Connect Telegram Bot
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

          {/* Preferred OTP Method */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>Preferred OTP Method</div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Default channel for 2FA and sensitive updates</div>
            </div>
            <select
              value={user.preferredVerificationMethod || 'sms'}
              onChange={async (e) => {
                await updateUser({ preferredVerificationMethod: e.target.value });
              }}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'var(--font)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="sms">💬 SMS OTP</option>
              <option value="telegram" disabled={!user.telegramChatId}>✈️ Telegram Bot</option>
            </select>
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

      {/* Settings OTP Modal */}
      {showSettingsOtp && (
        <div className="overlay modal-center" style={{ zIndex: 1100, position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="modal-box" style={{ width: '100%', maxWidth: '340px', padding: '24px 20px', textAlign: 'center', background: '#111318', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: '#fff' }}>Security Verification</h3>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '16px', lineHeight: '1.4' }}>
              Enter the 6-digit OTP code to verify disconnection request.
            </p>

            {/* Delivery channel selector */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={async () => { setSettingsOtpChannel('sms'); await triggerSettingsOtp('sms'); }}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: settingsOtpChannel === 'sms' ? 'var(--gold)' : 'transparent',
                  color: settingsOtpChannel === 'sms' ? '#0A0C12' : '#9ca3af',
                  transition: 'all 0.2s ease',
                }}
              >
                💬 SMS OTP
              </button>
              <button
                type="button"
                disabled={!user.telegramChatId}
                onClick={async () => { setSettingsOtpChannel('telegram'); await triggerSettingsOtp('telegram'); }}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: user.telegramChatId ? 'pointer' : 'not-allowed',
                  background: settingsOtpChannel === 'telegram' ? 'var(--gold)' : 'transparent',
                  color: settingsOtpChannel === 'telegram' ? '#0A0C12' : '#9ca3af',
                  opacity: user.telegramChatId ? 1 : 0.5,
                  transition: 'all 0.2s ease',
                }}
              >
                ✈️ Telegram
              </button>
            </div>

            <form onSubmit={handleSettingsOtpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="text"
                maxLength={6}
                placeholder="000000"
                value={settingsOtpCode}
                onChange={e => setSettingsOtpCode(e.target.value.replace(/\D/g, ''))}
                style={{
                  width: '100%',
                  height: '48px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '20px',
                  fontWeight: 700,
                  textAlign: 'center',
                  letterSpacing: '6px',
                  outline: 'none',
                }}
                className="input"
                autoFocus
              />

              {settingsOtpError && (
                <div style={{ color: 'var(--status-danger-text)', fontSize: '12px', textAlign: 'left', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px', borderRadius: '8px' }}>
                  ⚠ {settingsOtpError}
                </div>
              )}

              <button
                type="submit"
                disabled={settingsOtpLoading || settingsSendingOtp}
                className="btn btn-gold btn-full"
                style={{
                  height: '44px',
                  fontSize: '14px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #FFD700 0%, #FFE082 100%)',
                  color: '#0A0C12',
                  border: 'none',
                  borderRadius: '10px',
                  width: '100%',
                  cursor: 'pointer',
                }}
              >
                {settingsOtpLoading ? '⏳ Disconnecting...' : 'Verify & Disconnect'}
              </button>
            </form>

            <div style={{ marginTop: '14px' }}>
              {settingsResendTimer > 0 ? (
                <span style={{ fontSize: '11px', color: '#6b7280' }}>Resend code in {settingsResendTimer}s</span>
              ) : (
                <button
                  type="button"
                  onClick={() => triggerSettingsOtp(settingsOtpChannel)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--gold-light)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Resend Code
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowSettingsOtp(false)}
              className="btn btn-ghost btn-sm btn-full"
              style={{ marginTop: '12px', width: '100%' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default SettingsPage;
