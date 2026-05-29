import React, { useState, useEffect, useRef } from 'react';
import Logo from './Logo.jsx';

/**
 * AppLockScreen
 * Shows a lock screen when the user is away for 5+ minutes.
 * Supports: PIN (6-digit), Password text, and WebAuthn biometric (fingerprint/FaceID).
 */
const AppLockScreen = ({ user, lockMethod, savedPin, onUnlock }) => {
  const [mode, setMode] = useState(lockMethod || 'pin'); // 'pin' | 'password' | 'biometric'
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef(null);

  // Check WebAuthn availability on mount
  useEffect(() => {
    const checkBiometric = async () => {
      if (window.PublicKeyCredential) {
        try {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setBiometricAvailable(available);
          // Auto-trigger biometric if that's the preferred method
          if (available && lockMethod === 'biometric') {
            setTimeout(handleBiometric, 500);
          }
        } catch {
          setBiometricAvailable(false);
        }
      }
    };
    checkBiometric();
  }, []);

  // Shake animation on error
  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  // PIN logic
  const handlePinKey = (key) => {
    setError('');
    if (key === 'del') {
      setPin(p => p.slice(0, -1));
      return;
    }
    if (pin.length >= 6) return;
    const newPin = pin + key;
    setPin(newPin);

    if (newPin.length === 6) {
      setTimeout(() => {
        if (newPin === (savedPin || '123456')) {
          onUnlock();
        } else {
          setError('Incorrect PIN. Try again.');
          triggerShake();
          setPin('');
        }
      }, 150);
    }
  };

  // Password logic
  const handlePasswordCheck = (e) => {
    e.preventDefault();
    const stored = localStorage.getItem('ethioswap_lock_password') || '123456';
    if (password === stored) {
      onUnlock();
    } else {
      setError('Incorrect password.');
      triggerShake();
      setPassword('');
    }
  };

  // WebAuthn biometric
  const handleBiometric = async () => {
    setBiometricLoading(true);
    setError('');
    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Try to get a stored credential ID
      const storedCredId = localStorage.getItem('ethioswap_webauthn_credId');

      const assertionOptions = {
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: 'required',
          ...(storedCredId ? { allowCredentials: [{ type: 'public-key', id: Uint8Array.from(atob(storedCredId), c => c.charCodeAt(0)) }] } : {})
        }
      };

      await navigator.credentials.get(assertionOptions);
      onUnlock();
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Biometric verification cancelled. Use PIN instead.');
      } else {
        setError('Biometric not set up yet. Use PIN or password.');
      }
      setMode('pin');
    } finally {
      setBiometricLoading(false);
    }
  };

  const getInitials = (name) => (name || 'U').substring(0, 2).toUpperCase();

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', maxWidth: '480px', margin: '0 auto', padding: '60px 24px 40px', overflow: 'hidden' }}>

      {/* Background glow */}
      <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(200,150,44,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Logo */}
      <div style={{ marginBottom: '48px' }}>
        <Logo size={32} />
      </div>

      {/* User Avatar */}
      <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--gold-bg)', border: '2px solid var(--border-active)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: 800, color: 'var(--gold-light)', marginBottom: '12px', boxShadow: 'var(--shadow-gold)' }}>
        {getInitials(user?.username)}
      </div>
      <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '4px' }}>Welcome back, {user?.username}</p>
      <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '40px' }}>Verify to unlock your wallet</p>

      {/* PIN Mode */}
      {mode === 'pin' && (
        <div style={{ width: '100%', maxWidth: '280px', animation: shaking ? 'shake 0.4s ease' : 'none' }}>
          <style>{`@keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }`}</style>

          {/* PIN dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '32px' }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ width: '14px', height: '14px', borderRadius: '50%', background: i < pin.length ? 'var(--gold)' : 'transparent', border: `2px solid ${i < pin.length ? 'var(--gold)' : 'var(--border-hover)'}`, boxShadow: i < pin.length ? 'var(--shadow-gold)' : 'none', transition: 'all 0.15s ease' }} />
            ))}
          </div>

          {error && <p style={{ textAlign: 'center', color: 'var(--status-danger-text)', fontSize: '13px', marginBottom: '16px' }}>⚠ {error}</p>}

          {/* Numpad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
            {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => (
              k === '' ? <div key={i} /> :
              <button key={i} onClick={() => handlePinKey(k === '⌫' ? 'del' : k)}
                style={{ aspectRatio: '1', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '14px', fontSize: k === '⌫' ? '20px' : '22px', fontWeight: 600, color: 'var(--text-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.1s ease', WebkitTapHighlightColor: 'transparent' }}
                onMouseDown={e => e.currentTarget.style.background = 'var(--gold-bg)'}
                onMouseUp={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                onTouchStart={e => e.currentTarget.style.background = 'var(--gold-bg)'}
                onTouchEnd={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
              >{k}</button>
            ))}
          </div>

          {/* Alternatives */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '24px' }}>
            {biometricAvailable && (
              <button onClick={handleBiometric} style={{ background: 'none', border: 'none', color: 'var(--gold-light)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                👆 Use Biometric
              </button>
            )}
            <button onClick={() => { setMode('password'); setError(''); setPin(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font)' }}>
              Use Password
            </button>
          </div>
        </div>
      )}

      {/* Biometric Mode */}
      {mode === 'biometric' && (
        <div style={{ textAlign: 'center', width: '100%', maxWidth: '280px' }}>
          <button onClick={handleBiometric} disabled={biometricLoading}
            style={{ width: '80px', height: '80px', background: biometricLoading ? 'var(--bg-elevated)' : 'var(--gold-bg)', border: `2px solid ${biometricLoading ? 'var(--border)' : 'var(--border-active)'}`, borderRadius: '50%', fontSize: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', transition: 'all 0.2s ease', animation: biometricLoading ? 'pulse 1.5s infinite' : 'none' }}>
            {biometricLoading ? '⌛' : '👆'}
          </button>
          <p style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '24px' }}>
            {biometricLoading ? 'Verifying...' : 'Tap to verify with fingerprint or face'}
          </p>
          {error && <p style={{ color: 'var(--status-danger-text)', fontSize: '13px', marginBottom: '16px' }}>⚠ {error}</p>}
          <button onClick={() => { setMode('pin'); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font)' }}>
            Use PIN instead
          </button>
        </div>
      )}

      {/* Password Mode */}
      {mode === 'password' && (
        <div style={{ width: '100%', maxWidth: '300px' }}>
          <form onSubmit={handlePasswordCheck}>
            <div style={{ marginBottom: '16px' }}>
              <input
                ref={inputRef}
                type="password"
                className="input"
                placeholder="Enter your password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                autoFocus
                style={{ textAlign: 'center', fontSize: '18px', letterSpacing: '0.1em', animation: shaking ? 'shake 0.4s ease' : 'none' }}
              />
            </div>
            {error && <p style={{ textAlign: 'center', color: 'var(--status-danger-text)', fontSize: '13px', marginBottom: '12px' }}>⚠ {error}</p>}
            <button type="submit" className="btn btn-gold btn-full" style={{ marginBottom: '12px' }}>Unlock</button>
            <button type="button" onClick={() => { setMode('pin'); setError(''); setPassword(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font)', width: '100%', textAlign: 'center' }}>
              Use PIN instead
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AppLockScreen;
