import React, { useState } from 'react';
import Logo from './Logo.jsx';

/**
 * AppLockScreen
 * Shows a lock screen when the user is away for 5+ minutes.
 * Supports: PIN (6-digit) only.
 */
const AppLockScreen = ({ user, savedPin, onUnlock }) => {
  const isSetupMode = !savedPin;
  const [setupStep, setSetupStep] = useState('enter'); // 'enter' | 'confirm'
  const [firstPin, setFirstPin] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);

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
        if (isSetupMode) {
          if (setupStep === 'enter') {
            setFirstPin(newPin);
            setPin('');
            setSetupStep('confirm');
          } else {
            if (newPin === firstPin) {
              localStorage.setItem('ethioswap_lock_pin', newPin);
              localStorage.setItem('ethioswap_lock_method', 'pin');
              onUnlock();
            } else {
              setError('PINs do not match. Start over.');
              triggerShake();
              setPin('');
              setFirstPin('');
              setSetupStep('enter');
            }
          }
        } else {
          if (newPin === savedPin) {
            onUnlock();
          } else {
            setError('Incorrect PIN. Try again.');
            triggerShake();
            setPin('');
          }
        }
      }, 150);
    }
  };

  const getInitials = (name) => (name || 'U').substring(0, 2).toUpperCase();

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '60px 24px 40px', overflow: 'hidden' }}>

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
      <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '4px' }}>
        {isSetupMode ? 'Secure your wallet' : `Welcome back, ${user?.username}`}
      </p>
      <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '40px', textAlign: 'center' }}>
        {isSetupMode
          ? (setupStep === 'enter' ? 'Set a secure 6-digit PIN code' : 'Re-enter your 6-digit PIN to confirm')
          : 'Verify to unlock your wallet'}
      </p>

      {/* PIN Lock Grid */}
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
      </div>

    </div>
  );
};

export default AppLockScreen;
