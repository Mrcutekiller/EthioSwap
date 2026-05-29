import React, { useState, useEffect } from 'react';

const SettingsPage = ({ user, onLogout, onLockMethodChange, onPinChange }) => {
  const [lockMethod, setLockMethod] = useState(localStorage.getItem('ethioswap_lock_method') || 'pin');
  const [notifPrefs, setNotifPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ethioswap_notif_prefs') || '{}'); } catch { return {}; }
  });
  const [settingPin, setSettingPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinStep, setPinStep] = useState('new'); // 'new' | 'confirm'
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricRegistered, setBiometricRegistered] = useState(!!localStorage.getItem('ethioswap_webauthn_credId'));
  const [biometricLoading, setBiometricLoading] = useState(false);

  useEffect(() => {
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(v => setBiometricAvailable(v)).catch(() => {});
    }
  }, []);

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

  const handleLockMethodChange = (method) => {
    setLockMethod(method);
    localStorage.setItem('ethioswap_lock_method', method);
    if (onLockMethodChange) onLockMethodChange(method);
  };

  // PIN numpad entry
  const handlePinKey = (key) => {
    setPinError('');
    if (key === 'del') {
      if (pinStep === 'new') setNewPin(p => p.slice(0,-1));
      else setConfirmPin(p => p.slice(0,-1));
      return;
    }
    if (pinStep === 'new') {
      const updated = newPin + key;
      setNewPin(updated);
      if (updated.length === 6) {
        setTimeout(() => { setPinStep('confirm'); }, 200);
      }
    } else {
      const updated = confirmPin + key;
      setConfirmPin(updated);
      if (updated.length === 6) {
        setTimeout(() => {
          if (updated === newPin) {
            localStorage.setItem('ethioswap_lock_pin', newPin);
            if (onPinChange) onPinChange(newPin);
            setPinSuccess('PIN set successfully!');
            setSettingPin(false);
            setNewPin(''); setConfirmPin(''); setPinStep('new');
          } else {
            setPinError('PINs do not match. Try again.');
            setConfirmPin('');
          }
        }, 150);
      }
    }
  };

  // Register WebAuthn credential
  const registerBiometric = async () => {
    setBiometricLoading(true);
    setPinError('');
    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      const userId = new TextEncoder().encode(user.id);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'EthioSwap', id: window.location.hostname },
          user: { id: userId, name: user.username, displayName: user.username },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
          timeout: 60000,
          authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
        }
      });

      // Store credential ID for future auth
      const credId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      localStorage.setItem('ethioswap_webauthn_credId', credId);
      setBiometricRegistered(true);
      handleLockMethodChange('biometric');
      setPinSuccess('Biometric lock enabled!');
    } catch (err) {
      setPinError(err.name === 'NotAllowedError' ? 'Biometric registration cancelled.' : 'Could not register biometric. Try PIN instead.');
    } finally {
      setBiometricLoading(false);
    }
  };

  const currentPin = localStorage.getItem('ethioswap_lock_pin') || '123456';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '4px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800 }}>Settings</h2>
      </div>

      {/* App Lock Section */}
      <div className="card">
        <div className="section-title">App Lock</div>
        <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '14px' }}>
          Protect your wallet. The app locks automatically after 5 minutes of inactivity.
        </p>

        {/* Lock method selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {[
            { id: 'pin',       icon: '🔢', label: 'PIN Code',            desc: '6-digit numeric PIN' },
            { id: 'password',  icon: '🔑', label: 'Password',             desc: 'Text password' },
            ...(biometricAvailable ? [{ id: 'biometric', icon: '👆', label: 'Biometric', desc: 'Fingerprint or Face ID' }] : []),
          ].map(opt => (
            <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: lockMethod === opt.id ? 'var(--gold-bg)' : 'var(--bg-elevated)', border: `1px solid ${lockMethod === opt.id ? 'var(--border-active)' : 'var(--border)'}`, borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s ease' }}>
              <input type="radio" name="lock" value={opt.id} checked={lockMethod === opt.id} onChange={() => handleLockMethodChange(opt.id)} style={{ display: 'none' }} />
              <span style={{ fontSize: '20px' }}>{opt.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: lockMethod === opt.id ? 'var(--gold-light)' : 'var(--text-1)' }}>{opt.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{opt.desc}</div>
              </div>
              {lockMethod === opt.id && <span style={{ color: 'var(--gold-light)', fontSize: '14px', fontWeight: 700 }}>✓</span>}
            </label>
          ))}
        </div>

        {/* Actions */}
        {lockMethod === 'pin' && (
          <button onClick={() => { setSettingPin(true); setPinStep('new'); setNewPin(''); setConfirmPin(''); setPinError(''); }} className="btn btn-ghost btn-sm btn-full">
            {localStorage.getItem('ethioswap_lock_pin') ? '🔄 Change PIN' : '+ Set PIN'}
          </button>
        )}
        {lockMethod === 'biometric' && biometricAvailable && !biometricRegistered && (
          <button onClick={registerBiometric} disabled={biometricLoading} className="btn btn-gold btn-sm btn-full">
            {biometricLoading ? 'Registering...' : '👆 Register Biometric'}
          </button>
        )}
        {lockMethod === 'biometric' && biometricRegistered && (
          <div style={{ fontSize: '12px', color: 'var(--status-success-text)', background: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)', padding: '8px 12px', borderRadius: '8px', fontWeight: 500 }}>
            ✓ Biometric registered and active
          </div>
        )}
        {lockMethod === 'password' && (
          <div style={{ fontSize: '12px', color: 'var(--text-3)', background: 'var(--bg-base)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '8px' }}>
            Your login password is used. Change it from the Sign In screen.
          </div>
        )}

        {pinSuccess && <p style={{ fontSize: '12px', color: 'var(--status-success-text)', marginTop: '8px', fontWeight: 500 }}>✓ {pinSuccess}</p>}
        {pinError && <p style={{ fontSize: '12px', color: 'var(--status-danger-text)', marginTop: '8px', fontWeight: 500 }}>⚠ {pinError}</p>}
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
            'Use Biometric lock if your device supports it for maximum security.'
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

      {/* SET PIN SHEET */}
      {settingPin && (
        <div className="overlay modal-center">
          <div className="modal-box" style={{ textAlign: 'center', maxWidth: '320px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>
              {pinStep === 'new' ? 'Enter New PIN' : 'Confirm PIN'}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '24px' }}>
              {pinStep === 'new' ? 'Choose a 6-digit PIN to lock your app' : 'Re-enter your PIN to confirm'}
            </p>

            {/* Dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginBottom: '28px' }}>
              {[...Array(6)].map((_, i) => {
                const current = pinStep === 'new' ? newPin : confirmPin;
                return (
                  <div key={i} style={{ width: '14px', height: '14px', borderRadius: '50%', background: i < current.length ? 'var(--gold)' : 'transparent', border: `2px solid ${i < current.length ? 'var(--gold)' : 'var(--border-hover)'}`, transition: 'all 0.15s ease', boxShadow: i < current.length ? 'var(--shadow-gold)' : 'none' }} />
                );
              })}
            </div>

            {pinError && <p style={{ color: 'var(--status-danger-text)', fontSize: '12px', marginBottom: '12px' }}>⚠ {pinError}</p>}

            {/* Numpad */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', maxWidth: '260px', margin: '0 auto 16px' }}>
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => (
                k === '' ? <div key={i} /> :
                <button key={i} onClick={() => handlePinKey(k === '⌫' ? 'del' : k)}
                  style={{ aspectRatio: '1', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: k === '⌫' ? '18px' : '20px', fontWeight: 600, color: 'var(--text-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.1s ease' }}
                  onMouseDown={e => e.currentTarget.style.background = 'var(--gold-bg)'}
                  onMouseUp={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                >{k}</button>
              ))}
            </div>

            <button onClick={() => { setSettingPin(false); setNewPin(''); setConfirmPin(''); setPinStep('new'); setPinError(''); }} className="btn btn-ghost btn-sm btn-full">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
