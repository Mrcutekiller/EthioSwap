import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Shield, Lock, Unlock, AlertTriangle, Send, CheckCircle, ExternalLink, RefreshCw, Key, Bell } from 'lucide-react';

const NETWORKS = [
  { id: 'TRC20', label: 'Bybit / Binance USDT (TRC20)', badge: 'Recommended • Fast & Low Fee', icon: '⚡' },
  { id: 'ERC20', label: 'Ethereum USDT (ERC20)', badge: 'Cold Storage / Ledger', icon: '⛓️' },
  { id: 'BEP20', label: 'Binance Smart Chain (BEP20)', badge: 'BSC Network', icon: '🟡' },
  { id: 'BYBIT_UID', label: 'Bybit Account UID / Internal', badge: 'Bybit Direct', icon: '🟡' },
  { id: 'BINANCE_PAY', label: 'Binance Pay ID / Email', badge: 'Binance Direct', icon: '🪙' },
];

const GuardianSecurityModal = ({ isOpen, onClose }) => {
  const { user, triggerEmergencyLock, unlockEmergencyAccount, updateEmergencyEvacAddress, updateUser } = useAuth();

  const [evacAddress, setEvacAddress] = useState(user?.emergency_evac_address || '');
  const [evacNetwork, setEvacNetwork] = useState(user?.emergency_evac_network || 'TRC20');
  const [antiPhishing, setAntiPhishing] = useState(user?.anti_phishing_code || '');
  const [whitelistMode, setWhitelistMode] = useState(!!user?.whitelist_only_mode);
  const [savingSettings, setSavingSettings] = useState(false);
  const [panicLoading, setPanicLoading] = useState(false);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockPin, setUnlockPin] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);
  const [confirmPanicMode, setConfirmPanicMode] = useState(null); // 'lock_only' | 'evacuate'

  if (!isOpen || !user) return null;

  const isLocked = !!user.is_security_locked;
  const balance = Number(user.eth_balance || 0);

  const showStatus = (text, type = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleSaveEvacSettings = async (e) => {
    e.preventDefault();
    if (!evacAddress.trim()) {
      showStatus('Please enter your Bybit or emergency wallet address', 'error');
      return;
    }
    setSavingSettings(true);
    try {
      await updateEmergencyEvacAddress({
        address: evacAddress.trim(),
        network: evacNetwork,
        autoEvacuate: true,
      });
      await updateUser({
        anti_phishing_code: antiPhishing.trim() || null,
        whitelist_only_mode: whitelistMode,
      });
      showStatus('✓ Guardian settings saved! 48-Hour Security Timelock is active.');
    } catch (err) {
      showStatus(err.message || 'Failed to save settings', 'error');
    }
    setSavingSettings(false);
  };

  const handleExecutePanic = async (autoEvacuate = false) => {
    setPanicLoading(true);
    try {
      if (autoEvacuate && (!evacAddress || evacAddress.trim().length < 4)) {
        throw new Error('Please configure and save your Emergency Bybit Address first before evacuating.');
      }
      await triggerEmergencyLock(
        autoEvacuate ? 'emergency_evacuation_by_user' : 'panic_lockdown_by_user',
        autoEvacuate
      );
      setConfirmPanicMode(null);
      showStatus(
        autoEvacuate
          ? `🚨 LOCKDOWN ENGAGED! $${balance.toFixed(2)} USD swept to your Bybit address (${evacAddress}).`
          : '🔒 LOCKDOWN ENGAGED! All withdrawals and outgoing transfers are frozen.',
        'warning'
      );
    } catch (err) {
      showStatus(err.message || 'Panic trigger failed', 'error');
    }
    setPanicLoading(false);
  };

  const handleUnlockAccount = async () => {
    setUnlockLoading(true);
    try {
      await unlockEmergencyAccount('user_security_verification');
      setUnlockPin('');
      showStatus('✓ Account lockdown safely released. Normal access restored.');
    } catch (err) {
      showStatus(err.message || 'Unlock failed', 'error');
    }
    setUnlockLoading(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100000,
      background: 'rgba(5, 7, 15, 0.85)', backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div style={{
        background: '#0D111E', border: isLocked ? '1.5px solid #EF4444' : '1px solid rgba(255,255,255,0.1)',
        borderRadius: '24px', width: '100%', maxWidth: '640px', maxHeight: '92vh',
        overflowY: 'auto', padding: '28px', position: 'relative',
        boxShadow: isLocked ? '0 0 60px rgba(239, 68, 68, 0.25)' : '0 24px 60px rgba(0,0,0,0.6)',
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '20px', right: '20px',
            background: 'rgba(255,255,255,0.06)', border: 'none', color: '#8A9BB8',
            width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
            fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ✕
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '16px',
            background: isLocked ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            border: isLocked ? '1px solid #EF4444' : '1px solid #10B981',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px',
          }}>
            {isLocked ? '🚨' : '🛡️'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>
                Guardian Anti-Hack & Emergency Vault
              </h2>
              <span style={{
                fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '100px',
                background: isLocked ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                color: isLocked ? '#EF4444' : '#10B981',
              }}>
                {isLocked ? 'LOCKDOWN ENGAGED' : 'CHAIN ACTIVE'}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#8A9BB8', margin: '3px 0 0 0' }}>
              Autonomous circuit breaker, Bybit emergency fund evacuation, and real-time alerts.
            </p>
          </div>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div style={{
            marginBottom: '16px', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 600,
            background: statusMessage.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : statusMessage.type === 'warning' ? 'rgba(245, 166, 35, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            border: `1px solid ${statusMessage.type === 'error' ? '#EF4444' : statusMessage.type === 'warning' ? '#F5A623' : '#10B981'}`,
            color: statusMessage.type === 'error' ? '#EF4444' : statusMessage.type === 'warning' ? '#F5A623' : '#10B981',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <span>{statusMessage.type === 'error' ? '⚠️' : statusMessage.type === 'warning' ? '🚨' : '✓'}</span>
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* ── Active Lockdown Notice ─────────────────────────────────── */}
        {isLocked ? (
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)', border: '1.5px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '16px', padding: '20px', marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ fontSize: '20px' }}>🔒</span>
              <strong style={{ color: '#EF4444', fontSize: '15px' }}>Your Account is in Protective Lockdown</strong>
            </div>
            <p style={{ fontSize: '13px', color: '#FECACA', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              All withdrawal requests, internal transfers, and trade releases are strictly blocked. If funds were evacuated, they have been swept to your registered Bybit address.
            </p>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={handleUnlockAccount}
                disabled={unlockLoading}
                style={{
                  background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff',
                  border: 'none', borderRadius: '10px', padding: '10px 20px',
                  fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <Unlock size={15} />
                {unlockLoading ? 'Releasing Lock…' : 'Release Lockdown (Restore Access)'}
              </button>
            </div>
          </div>
        ) : null}

        {/* ── 1-CLICK PANIC BUTTON (THE EMERGENCY KILL SWITCH) ────── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(185, 28, 28, 0.05))',
          border: '1.5px solid rgba(239, 68, 68, 0.35)',
          borderRadius: '18px', padding: '20px', marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🚨</span>
              <span style={{ fontWeight: 800, fontSize: '14px', color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Emergency Panic Button (Kill Switch)
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#8A9BB8' }}>Available: ${balance.toFixed(2)} USD</span>
          </div>
          <p style={{ fontSize: '12px', color: '#c8cde0', margin: '0 0 16px 0', lineHeight: 1.5 }}>
            If you suspect your device, session, or account has been compromised, trigger emergency protocol immediately.
          </p>

          {confirmPanicMode ? (
            <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '12px', padding: '14px', border: '1px solid #EF4444' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                ⚠️ Confirm {confirmPanicMode === 'evacuate' ? 'Emergency Evacuation to Bybit' : 'Account Freeze'}?
              </div>
              <p style={{ fontSize: '12px', color: '#FECACA', marginBottom: '14px' }}>
                {confirmPanicMode === 'evacuate'
                  ? `This will immediately lock your account and sweep all available balance ($${balance.toFixed(2)} USD) to your emergency address: ${evacAddress || '[No address set]'}.`
                  : 'This will instantly freeze all outgoing withdrawals and transfers from your account.'}
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  disabled={panicLoading}
                  onClick={() => handleExecutePanic(confirmPanicMode === 'evacuate')}
                  style={{
                    background: '#EF4444', color: '#fff', border: 'none', borderRadius: '8px',
                    padding: '8px 18px', fontWeight: 800, fontSize: '12px', cursor: 'pointer',
                  }}
                >
                  {panicLoading ? 'Executing…' : 'YES, EXECUTE NOW'}
                </button>
                <button
                  onClick={() => setConfirmPanicMode(null)}
                  style={{
                    background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none', borderRadius: '8px',
                    padding: '8px 14px', fontSize: '12px', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                disabled={isLocked}
                onClick={() => setConfirmPanicMode('lock_only')}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#EF4444', borderRadius: '12px', padding: '12px', fontWeight: 700,
                  fontSize: '12px', cursor: isLocked ? 'not-allowed' : 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                }}
              >
                <Lock size={18} />
                <span>Freeze Account Only</span>
                <span style={{ fontSize: '10px', color: '#8A9BB8', fontWeight: 400 }}>Blocks all withdrawals</span>
              </button>

              <button
                disabled={isLocked}
                onClick={() => setConfirmPanicMode('evacuate')}
                style={{
                  background: 'linear-gradient(135deg, #EF4444, #B91C1C)', border: 'none',
                  color: '#fff', borderRadius: '12px', padding: '12px', fontWeight: 800,
                  fontSize: '12px', cursor: isLocked ? 'not-allowed' : 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)',
                }}
              >
                <Send size={18} />
                <span>⚡ Freeze & Evacuate to Bybit</span>
                <span style={{ fontSize: '10px', color: '#FECACA', fontWeight: 500 }}>Sweeps 100% balance safely</span>
              </button>
            </div>
          )}
        </div>

        {/* ── Emergency Bybit Evacuation Settings ─────────────────────── */}
        <form onSubmit={handleSaveEvacSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🟡</span>
            <span>Configure Emergency Bybit / Binance Evacuation Address</span>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#8A9BB8', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
              Evacuation Network
            </label>
            <select
              value={evacNetwork}
              onChange={e => setEvacNetwork(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff',
                fontSize: '13px', outline: 'none', boxSizing: 'border-box',
              }}
            >
              {NETWORKS.map(net => (
                <option key={net.id} value={net.id} style={{ background: '#0D111E', color: '#fff' }}>
                  {net.label} ({net.badge})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#8A9BB8', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
              Emergency Deposit Address or Bybit UID
            </label>
            <input
              type="text"
              value={evacAddress}
              onChange={e => setEvacAddress(e.target.value)}
              placeholder="e.g. Bybit USDT TRC20 (T...) or Bybit UID: 1849201"
              style={{
                width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff',
                fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace',
              }}
            />
            <span style={{ fontSize: '11px', color: '#8A9BB8', marginTop: '4px', display: 'block' }}>
              🔒 Protected by <strong>48-Hour Security Timelock</strong>. Attackers cannot divert this address immediately.
            </span>
          </div>

          {/* ── Security Suggestions & Toggles ────────────────────────── */}
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px',
          }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#F5A623', textTransform: 'uppercase' }}>
              💡 Guardian Security Suggestions
            </div>

            {/* Toggle 1: Whitelist Only */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Whitelist-Only Withdrawals</div>
                <div style={{ fontSize: '11px', color: '#8A9BB8' }}>Only permit withdrawals to your verified emergency address</div>
              </div>
              <input
                type="checkbox"
                checked={whitelistMode}
                onChange={e => setWhitelistMode(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10B981' }}
              />
            </div>

            {/* Suggestion 2: Anti-Phishing */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>Anti-Phishing Secret Phrase</div>
              <div style={{ fontSize: '11px', color: '#8A9BB8', marginBottom: '8px' }}>A secret word included in all genuine EthioSwap Telegram alerts and security notices</div>
              <input
                type="text"
                value={antiPhishing}
                onChange={e => setAntiPhishing(e.target.value)}
                placeholder="e.g. MySecretVault2026"
                style={{
                  width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff',
                  fontSize: '12px', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Suggestion 3: Telegram Bot Alerts */}
            <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(42, 171, 238, 0.08)', border: '1px solid rgba(42, 171, 238, 0.2)', fontSize: '12px', color: '#2AABEE' }}>
              📲 <strong>Telegram Bot Security:</strong> Link your Telegram via <code>/login</code> in <a href="https://t.me/ethioswap_bot" target="_blank" rel="noopener noreferrer" style={{ color: '#2AABEE', fontWeight: 700 }}>@EthioSwapBot</a> to receive instantaneous push alerts if a login or withdrawal occurs!
            </div>
          </div>

          <button
            type="submit"
            disabled={savingSettings}
            style={{
              padding: '12px 20px', background: 'linear-gradient(135deg, #10B981, #059669)',
              color: '#fff', fontWeight: 800, fontSize: '13px', borderRadius: '12px',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            <CheckCircle size={16} />
            {savingSettings ? 'Saving Protection Settings…' : 'Save Guardian Settings & Activate Timelock'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default GuardianSecurityModal;
