import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';

const truncateAddr = (addr) => {
  if (!addr || addr.length <= 8) return addr || '';
  return addr.slice(0, 4) + '...' + addr.slice(-3);
};

const DEFAULT_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bg1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="100%" stop-color="#06b6d4" />
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="50" fill="url(#bg1)" />
  <circle cx="50" cy="40" r="18" fill="#f8fafc" />
  <path d="M 25 85 C 25 72, 35 68, 50 68 C 65 68, 75 72, 75 85 Z" fill="#1e293b" />
</svg>`;

const getAvatarUrl = (svgString) => {
  if (!svgString) return '';
  if (svgString.startsWith('data:')) return svgString;
  if (svgString.startsWith('http://') || svgString.startsWith('https://')) return svgString;
  try {
    const base64 = window.btoa(unescape(encodeURIComponent(svgString)));
    return `data:image/svg+xml;base64,${base64}`;
  } catch (e) {
    return '';
  }
};

const ScanPage = ({ setPage }) => {
  const { user, wallet } = useAuth();
  const [tab, setTab] = useState('myqr');
  const [scannedUser, setScannedUser] = useState(null);
  const [sendAmount, setSendAmount] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const scannerRef = useRef(null);
  const scannerContainerRef = useRef(null);

  const balance = wallet?.ethBalance ?? 0;
  const qrValue = user ? `ethioswap://send?user=${user.username}` : '';

  const lookupUser = useCallback(async (username) => {
    setLookingUp(true);
    setScanError('');
    setScannedUser(null);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, full_name, profile_pic, trade_count, avg_rating, numeric_id')
        .eq('username', username)
        .single();

      if (error || !data) {
        setScanError('User not found');
      } else {
        setScannedUser(data);
      }
    } catch (err) {
      setScanError('Failed to look up user');
    } finally {
      setLookingUp(false);
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (scannerRef.current) return;
    setScanError('');
    setScannedUser(null);
    setScanning(true);

    try {
      const scanner = new Html5Qrcode('qr-scanner-region');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleScanResult(decodedText);
          stopScanner();
        },
        () => {}
      );
    } catch (err) {
      console.error('Scanner start failed:', err);
      setScanError('Camera access denied or not available. Try entering a username manually.');
      setScanning(false);
    }
  }, []);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {}
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  const handleScanResult = useCallback((decodedText) => {
    try {
      if (decodedText.startsWith('ethioswap://send?user=')) {
        const username = decodedText.split('user=')[1];
        if (username) {
          lookupUser(username);
        }
      } else {
        setScanError('Invalid QR code format');
      }
    } catch (err) {
      setScanError('Could not parse QR code');
    }
  }, [lookupUser]);

  const handleManualLookup = () => {
    const input = document.getElementById('manual-username-input');
    if (input && input.value.trim()) {
      lookupUser(input.value.trim().replace('@', ''));
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop();
          scannerRef.current.clear();
        } catch (e) {}
      }
    };
  }, []);

  const handleTabChange = (newTab) => {
    if (newTab !== 'scan' && scannerRef.current) {
      stopScanner();
    }
    setTab(newTab);
    setScannedUser(null);
    setScanError('');
  };

  const handleSend = () => {
    if (!scannedUser || !sendAmount) return;
    alert(`Sent $${Number(sendAmount).toFixed(2)} to @${scannedUser.username}`);
    setSendAmount('');
    setScannedUser(null);
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto' }}>
      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          onClick={() => handleTabChange('myqr')}
          style={{
            flex: 1, padding: '12px', borderRadius: '12px',
            background: tab === 'myqr' ? 'var(--teal)' : 'var(--surface)',
            color: tab === 'myqr' ? '#04342C' : 'var(--muted)',
            border: '1px solid var(--border)', fontWeight: 600, fontSize: '13px',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          My QR Code
        </button>
        <button
          onClick={() => handleTabChange('scan')}
          style={{
            flex: 1, padding: '12px', borderRadius: '12px',
            background: tab === 'scan' ? 'var(--teal)' : 'var(--surface)',
            color: tab === 'scan' ? '#04342C' : 'var(--muted)',
            border: '1px solid var(--border)', fontWeight: 600, fontSize: '13px',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          Scan QR
        </button>
      </div>

      {/* My QR Code Tab */}
      {tab === 'myqr' && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '16px', padding: '32px 24px', textAlign: 'center',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
            My QR Code
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px' }}>
            Others can scan this to send you ETH/ETB
          </p>

          <div style={{
            display: 'inline-block', padding: '16px', background: '#fff',
            borderRadius: '16px', marginBottom: '20px',
          }}>
            <QRCodeSVG
              value={qrValue}
              size={200}
              level="H"
              includeMargin={false}
            />
          </div>

          <div style={{
            padding: '12px 16px', background: 'var(--surface2)',
            borderRadius: '12px', marginBottom: '16px',
          }}>
            <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>Your Username</p>
            <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
              @{user?.username || 'unknown'}
            </p>
          </div>

          <div style={{ padding: '12px 16px', background: 'var(--surface2)', borderRadius: '12px' }}>
            <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>Trading ID</p>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
              #{user?.numeric_id || '0000'}
            </p>
          </div>

          <button
            onClick={() => {
              navigator.clipboard?.writeText(qrValue).then(() => {
                alert('QR link copied to clipboard!');
              }).catch(() => {});
            }}
            style={{
              width: '100%', marginTop: '20px', padding: '14px',
              background: 'rgba(0,200,150,0.1)', color: 'var(--teal)',
              borderRadius: '12px', border: '1px solid rgba(0,200,150,0.3)',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            📋 Copy QR Link
          </button>
        </div>
      )}

      {/* Scan QR Tab */}
      {tab === 'scan' && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '16px', padding: '24px',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px', textAlign: 'center' }}>
            Scan QR Code
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '20px', textAlign: 'center' }}>
            Scan another user's QR code to send them ETH/ETB
          </p>

          {/* Camera Scanner */}
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <div
              id="qr-scanner-region"
              ref={scannerContainerRef}
              style={{
                width: '100%', minHeight: scanning ? '250px' : '0',
                borderRadius: '12px', overflow: 'hidden',
                display: scanning ? 'block' : 'none',
              }}
            />
            {!scanning && (
              <div style={{
                width: '100%', height: '200px',
                border: '2px dashed var(--border)', borderRadius: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--surface2)',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <i className="ti ti-camera" style={{ fontSize: '32px', color: 'var(--muted)', opacity: 0.4, display: 'block', marginBottom: '8px' }}></i>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Camera will activate here</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            {!scanning ? (
              <button
                onClick={startScanner}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px',
                  background: 'var(--teal)', color: '#04342C',
                  fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer',
                }}
              >
                📷 Start Camera
              </button>
            ) : (
              <button
                onClick={stopScanner}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px',
                  background: '#FF4D4D', color: '#fff',
                  fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer',
                }}
              >
                ⏹ Stop Scanner
              </button>
            )}
          </div>

          {/* OR Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
            <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
          </div>

          {/* Manual Username Entry */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              Enter Username Manually
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="manual-username-input"
                type="text"
                placeholder="Enter username"
                style={{
                  flex: 1, padding: '12px 16px',
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: '12px', color: 'var(--text)', fontSize: '14px',
                  outline: 'none',
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleManualLookup(); }}
              />
              <button
                onClick={handleManualLookup}
                style={{
                  padding: '12px 20px', borderRadius: '12px',
                  background: 'var(--teal)', color: '#04342C',
                  fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer',
                }}
              >
                Lookup
              </button>
            </div>
          </div>

          {/* Loading */}
          {lookingUp && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{
                width: '32px', height: '32px', border: '3px solid var(--border)',
                borderTopColor: 'var(--teal)', borderRadius: '50%',
                animation: 'spin 1s linear infinite', margin: '0 auto 12px',
              }}></div>
              <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Looking up user...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Scan Error */}
          {scanError && (
            <div style={{
              padding: '12px 16px', background: 'rgba(255,77,77,0.08)',
              border: '1px solid rgba(255,77,77,0.2)', borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ fontSize: '13px', color: '#FF4D4D', fontWeight: 600 }}>{scanError}</p>
            </div>
          )}

          {/* Scanned User Profile */}
          {scannedUser && (
            <div style={{
              padding: '20px', background: 'var(--surface2)',
              borderRadius: '16px', border: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  overflow: 'hidden', border: '2px solid var(--teal)', flexShrink: 0,
                }}>
                  <img
                    src={scannedUser.profile_pic || getAvatarUrl(DEFAULT_AVATAR_SVG)}
                    alt={scannedUser.username}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>
                    {scannedUser.full_name || scannedUser.username}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--muted)' }}>@{scannedUser.username}</p>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      ⭐ {(scannedUser.avg_rating || 5.0).toFixed(1)}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      {scannedUser.trade_count || 0} trades
                    </span>
                  </div>
                </div>
              </div>

              {/* Send Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    Amount (USD)
                  </label>
                  <input
                    type="number"
                    placeholder="$0.00"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    style={{
                      width: '100%', padding: '14px 16px',
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: '12px', color: 'var(--gold)', fontSize: '20px',
                      fontWeight: 600, textAlign: 'center', fontFamily: 'var(--font-mono)',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!sendAmount || Number(sendAmount) <= 0 || Number(sendAmount) > balance}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '12px',
                    background: (!sendAmount || Number(sendAmount) <= 0 || Number(sendAmount) > balance)
                      ? 'rgba(255,255,255,0.05)' : 'var(--teal)',
                    color: (!sendAmount || Number(sendAmount) <= 0 || Number(sendAmount) > balance)
                      ? 'var(--muted)' : '#04342C',
                    fontSize: '15px', fontWeight: 600, border: 'none',
                    cursor: (!sendAmount || Number(sendAmount) <= 0 || Number(sendAmount) > balance) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  Send to @{scannedUser.username}
                </button>
                <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--muted)' }}>
                  Available: ${Number(balance).toFixed(2)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScanPage;
