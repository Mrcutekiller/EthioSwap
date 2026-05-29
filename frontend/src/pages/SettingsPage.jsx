import React, { useState, useEffect } from 'react';

/* ── Interactive 3x3 SVG Pattern Lock Drawing Grid ──────────────── */
const PatternLock = ({ onPatternComplete, error, isSetup, step }) => {
  const [activeDots, setActiveDots] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPos, setCurrentPos] = useState(null);
  const containerRef = React.useRef(null);

  const dots = [
    { id: 0, x: 40, y: 40 },
    { id: 1, x: 140, y: 40 },
    { id: 2, x: 240, y: 40 },
    { id: 3, x: 40, y: 140 },
    { id: 4, x: 140, y: 140 },
    { id: 5, x: 240, y: 140 },
    { id: 6, x: 40, y: 240 },
    { id: 7, x: 140, y: 240 },
    { id: 8, x: 240, y: 240 },
  ];

  const handleStart = (id) => {
    setIsDrawing(true);
    setActiveDots([id]);
  };

  const checkDotCollision = (clientX, clientY) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    setCurrentPos({ x, y });

    for (const dot of dots) {
      const dx = x - dot.x;
      const dy = y - dot.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 24) {
        if (!activeDots.includes(dot.id)) {
          setActiveDots((prev) => [...prev, dot.id]);
        }
      }
    }
  };

  const handleMove = (e) => {
    if (!isDrawing) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    checkDotCollision(clientX, clientY);
  };

  const handleEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setCurrentPos(null);
    if (activeDots.length >= 3) {
      onPatternComplete(activeDots.join('-'));
    } else if (activeDots.length > 0) {
      setActiveDots([]);
    }
  };

  React.useEffect(() => {
    if (error) {
      const t = setTimeout(() => setActiveDots([]), 850);
      return () => clearTimeout(t);
    }
  }, [error]);

  React.useEffect(() => {
    setActiveDots([]);
  }, [step]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMove}
      onTouchMove={handleMove}
      onMouseUp={handleEnd}
      onTouchEnd={handleEnd}
      onMouseLeave={handleEnd}
      style={{
        position: 'relative',
        width: '280px',
        height: '280px',
        background: 'rgba(255,255,255,0.015)',
        border: '1px solid var(--border)',
        borderRadius: '24px',
        margin: '0 auto 20px',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        {activeDots.map((dotId, index) => {
          if (index === 0) return null;
          const prevDot = dots[activeDots[index - 1]];
          const currDot = dots[dotId];
          return (
            <line
              key={index}
              x1={prevDot.x}
              y1={prevDot.y}
              x2={currDot.x}
              y2={currDot.y}
              stroke={error ? 'var(--status-danger-text)' : 'var(--gold)'}
              strokeWidth="4"
              strokeLinecap="round"
              style={{ filter: error ? 'none' : 'drop-shadow(0 0 5px var(--gold))' }}
            />
          );
        })}

        {isDrawing && activeDots.length > 0 && currentPos && (
          <line
            x1={dots[activeDots[activeDots.length - 1]].x}
            y1={dots[activeDots[activeDots.length - 1]].y}
            x2={currentPos.x}
            y2={currentPos.y}
            stroke="rgba(200,150,44,0.45)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}
      </svg>

      {dots.map((dot) => {
        const isActive = activeDots.includes(dot.id);
        return (
          <div
            key={dot.id}
            onMouseDown={() => handleStart(dot.id)}
            onTouchStart={() => handleStart(dot.id)}
            style={{
              position: 'absolute',
              left: `${dot.x - 22}px`,
              top: `${dot.y - 22}px`,
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: `2px solid ${
                  isActive
                    ? error
                      ? 'var(--status-danger-text)'
                      : 'var(--gold)'
                    : 'var(--border-hover)'
                }`,
                background: isActive
                  ? error
                    ? 'rgba(239,68,68,0.1)'
                    : 'var(--gold-bg)'
                  : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                transform: isActive ? 'scale(1.15)' : 'scale(1)',
                boxShadow: isActive && !error ? 'var(--shadow-gold)' : 'none',
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: isActive
                    ? error
                      ? 'var(--status-danger-text)'
                      : 'var(--gold-light)'
                    : 'rgba(255,255,255,0.2)',
                  transition: 'all 0.15s ease',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const SettingsPage = ({ user, onLogout, onLockMethodChange, onPinChange }) => {
  const [lockMethod, setLockMethod] = useState(localStorage.getItem('ethioswap_lock_method') || 'pin');
  const [lockEnabled, setLockEnabled] = useState(localStorage.getItem('ethioswap_lock_enabled') !== 'false');

  const toggleLockEnabled = () => {
    const next = !lockEnabled;
    setLockEnabled(next);
    localStorage.setItem('ethioswap_lock_enabled', next ? 'true' : 'false');
  };
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
  const [settingPattern, setSettingPattern] = useState(false);
  const [patternStep, setPatternStep] = useState('new');
  const [firstPattern, setFirstPattern] = useState('');
  const [patternError, setPatternError] = useState('');

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

  const handlePatternComplete = (patternString) => {
    setPatternError('');
    if (patternStep === 'new') {
      setFirstPattern(patternString);
      setPatternStep('confirm');
    } else {
      if (patternString === firstPattern) {
        localStorage.setItem('ethioswap_lock_pattern', patternString);
        localStorage.setItem('ethioswap_lock_method', 'pattern');
        setLockMethod('pattern');
        if (onLockMethodChange) onLockMethodChange('pattern');
        setPinSuccess('Pattern lock set successfully!');
        setSettingPattern(false);
        setFirstPattern(''); setPatternStep('new');
      } else {
        setPatternError('Patterns do not match. Try again.');
      }
    }
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
        <div className="section-title">App Lock Screen Protection</div>
        <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '14px' }}>
          Protect your wallet from unauthorized access on this device.
        </p>

        {/* Lock Screen Toggle Switch */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '14px' }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>Passcode Lock Protection</div>
            <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px', lineHeight: 1.4 }}>Lock the app immediately on startup and after 5 minutes of idle time.</div>
          </div>
          <div
            onClick={toggleLockEnabled}
            style={{ width: '44px', height: '26px', borderRadius: '13px', background: lockEnabled ? 'var(--gold)' : 'rgba(255,255,255,0.06)', border: `1px solid ${lockEnabled ? 'var(--gold)' : 'var(--border)'}`, cursor: 'pointer', position: 'relative', transition: 'all 0.2s ease', flexShrink: 0 }}
          >
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: lockEnabled ? '20px' : '2px', transition: 'left 0.2s ease', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
          </div>
        </div>

        {lockEnabled ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeInUp 0.2s ease' }}>
            {/* Lock method selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '4px' }}>
              {[
                { id: 'pin',       icon: '🔢', label: 'PIN Code',            desc: '6-digit numeric PIN' },
                { id: 'pattern',   icon: '🎨', label: 'Pattern Lock',         desc: '3x3 drawing grid pattern' },
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
              <button onClick={() => { setSettingPin(true); setPinStep('new'); setNewPin(''); setConfirmPin(''); setPinError(''); }} className="btn btn-ghost btn-sm btn-full" style={{ padding: '10px' }}>
                {localStorage.getItem('ethioswap_lock_pin') ? '🔄 Change PIN' : '+ Set PIN'}
              </button>
            )}
            {lockMethod === 'pattern' && (
              <button onClick={() => { setSettingPattern(true); setPatternStep('new'); setFirstPattern(''); setPatternError(''); }} className="btn btn-ghost btn-sm btn-full" style={{ padding: '10px' }}>
                {localStorage.getItem('ethioswap_lock_pattern') ? '🔄 Change Pattern' : '+ Set Pattern'}
              </button>
            )}
            {lockMethod === 'biometric' && biometricAvailable && !biometricRegistered && (
              <button onClick={registerBiometric} disabled={biometricLoading} className="btn btn-gold btn-sm btn-full" style={{ padding: '10px' }}>
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
          </div>
        ) : (
          <div style={{ background: 'var(--gold-bg)', border: '1px dashed var(--border-active)', borderRadius: '10px', padding: '14px', textAlign: 'center', fontSize: '12px', color: 'var(--gold-light)', fontStyle: 'italic', animation: 'fadeInUp 0.2s ease' }}>
            💡 Lock screen security is completely disabled. You will not be prompted to authenticate.
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

      {/* SET PATTERN SHEET */}
      {settingPattern && (
        <div className="overlay modal-center">
          <div className="modal-box" style={{ textAlign: 'center', maxWidth: '320px', padding: '24px 20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-1)' }}>
              {patternStep === 'new' ? 'Draw New Pattern' : 'Confirm Pattern'}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '24px' }}>
              {patternStep === 'new' ? 'Connect at least 3 dots to set a secure pattern' : 'Draw the pattern again to confirm and save'}
            </p>

            <PatternLock
              onPatternComplete={handlePatternComplete}
              error={!!patternError}
              step={patternStep}
            />

            {patternError && <p style={{ color: 'var(--status-danger-text)', fontSize: '12px', marginBottom: '16px', fontWeight: 500 }}>⚠ {patternError}</p>}

            <button onClick={() => { setSettingPattern(false); setFirstPattern(''); setPatternStep('new'); setPatternError(''); }} className="btn btn-ghost btn-sm btn-full" style={{ padding: '10px' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
