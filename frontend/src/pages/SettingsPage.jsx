import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { Globe, Shield, Smartphone, Mail } from 'lucide-react';

const PremiumSwitch = ({ checked, onChange, disabled }) => {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      style={{
        width: '46px',
        height: '24px',
        borderRadius: '15px',
        background: checked ? 'linear-gradient(135deg, #00C896 0%, #00B487 100%)' : '#1E2640',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        padding: 0,
        boxShadow: checked ? '0 0 10px rgba(0, 200, 150, 0.3)' : 'inset 0 2px 4px rgba(0,0,0,0.3)',
        flexShrink: 0
      }}
    >
      <div style={{
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        background: '#fff',
        position: 'absolute',
        top: '3px',
        left: checked ? '25px' : '3px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {checked && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#00C896' }} />}
      </div>
    </button>
  );
};

const SettingsPage = ({ user, onLogout }) => {
  const { t, i18n } = useTranslation();
  const { updateUser } = useAuth();

  const [lang, setLang] = useState(i18n.language || 'en');

  const changeLanguage = async (newLang) => {
    i18n.changeLanguage(newLang);
    setLang(newLang);
    localStorage.setItem('ethioswap_language', newLang);
    if (user) {
      await updateUser({ preferred_language: newLang });
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
              <PremiumSwitch
                checked={!!user.two_fa_enabled}
                onChange={async () => {
                  const newState = !user.two_fa_enabled;
                  await updateUser({ two_fa_enabled: newState });
                }}
              />
            </div>
            
            {user.two_fa_enabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', padding: '12px', background: '#1A1F32', borderRadius: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#8A9BB8' }}>Verification Method</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button className={`btn btn-sm ${user.two_fa_method === 'email' ? 'btn-gold' : 'btn-ghost'}`} onClick={() => updateUser({ two_fa_method: 'email' })}>
                    <Mail size={14} /> Email
                  </button>
                  <button className={`btn btn-sm ${user.two_fa_method === 'sms' ? 'btn-gold' : 'btn-ghost'}`} onClick={() => updateUser({ two_fa_method: 'sms' })}>
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
            <PremiumSwitch
              checked={!!user.email_enabled}
              onChange={async () => {
                await updateUser({ email_enabled: !user.email_enabled });
              }}
            />
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
              <PremiumSwitch
                checked={notifPrefs[n.key] !== false}
                onChange={() => toggleNotif(n.key)}
              />
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

    </div>
  );
};

export default SettingsPage;
