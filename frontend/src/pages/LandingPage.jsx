import React, { useState, useEffect, useRef } from 'react';
import Logo from '../components/Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase';
import MarketRates from '../components/MarketRates.jsx';

// Animated Count-Up component using Intersection Observer
const AnimatedCounter = ({ value, duration = 1000, prefix = "", suffix = "", isDecimal = false }) => {
  const [count, setCount] = useState(0);
  const elementRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    if (elementRef.current) observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      setCount(value);
      return;
    }

    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const currentVal = progress * numValue;
      setCount(isDecimal ? currentVal.toFixed(1) : Math.floor(currentVal));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(value); // Ensure exact final value
      }
    };
    window.requestAnimationFrame(step);
  }, [visible, value, duration, isDecimal]);

  return (
    <span ref={elementRef}>
      {prefix}
      {typeof count === 'number' ? count.toLocaleString() : count}
      {suffix}
    </span>
  );
};

// Helper for relative time string
function getRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now - date;
  if (isNaN(diffMs)) return '';
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// Gold SVG icons for features
const FeatureIcons = {
  buy: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <path d="M12 14v2M12 11v1" />
    </svg>
  ),
  sell: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <path d="M12 4l6 6M12 4L6 10" />
    </svg>
  ),
  send: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  receive: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="8 17 12 21 16 17" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" />
    </svg>
  ),
  exchange: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 3 21 3 21 8" />
      <line x1="4" y1="20" x2="21" y2="3" />
      <polyline points="8 21 3 21 3 16" />
      <line x1="3" y1="21" x2="20" y2="4" />
    </svg>
  ),
  rates: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
    </svg>
  ),
};

// ═══════════════════════════════════════════════════════════
// PREMIUM 3D PAPER MONEY — USD front / Ethiopian Birr back
// Click to flip. Floats with gentle animation.
// ═══════════════════════════════════════════════════════════
// PREMIUM 3D PAPER MONEY & MULTI-VIEW FORENSIC INSPECTION
// Modes supported:
//  • standard: click-to-flip USD ↔ ETB with realistic 3D paper physics
//  • 360: interactive 360° orbital rotation (drag or auto-spin) with specular reflection
//  • exploded: 4-layer 3D exploded architectural deconstruction (Hologram, Banknote, Smart Contract Escrow, Settlement Rail)
//  • xray: forensic UV-A 365nm inspection with sweeping laser, glowing fluorescent Lion of Judah & security thread
// ═══════════════════════════════════════════════════════════

export const PaperMoney3D = ({
  size = 'lg',
  className = '',
  viewMode = 'standard',
  dragAngle = 0,
  flipped = false,
  onFlip = () => {},
  isDragging = false,
  onStartDrag = () => {},
}) => {
  const [hovered, setHovered] = useState(false);
  const [localFlipped, setLocalFlipped] = useState(false);

  const isCardFlipped = flipped !== undefined ? flipped : localFlipped;
  const handleCardClick = () => {
    if (viewMode === '360') return; // in 360 mode, drag or rotation reveals both sides
    if (onFlip) onFlip();
    setLocalFlipped(f => !f);
  };

  // Dimensions: real $100 bill ratio (vertical format)
  const dims = {
    lg: { w: 182, h: 426 },
    md: { w: 148, h: 346 },
    sm: { w: 114, h: 268 },
  }[size] || { w: 182, h: 426 };

  const { w, h } = dims;
  const isMobile = size === 'sm';

  // Dynamic filter and transform based on viewMode
  let containerFilter = hovered
    ? 'drop-shadow(0 32px 64px rgba(0,0,0,0.8)) drop-shadow(0 0 45px rgba(245,166,35,0.3))'
    : 'drop-shadow(0 22px 42px rgba(0,0,0,0.65))';

  if (viewMode === 'xray') {
    containerFilter = 'drop-shadow(0 0 50px rgba(124, 58, 237, 0.5)) drop-shadow(0 0 35px rgba(0, 230, 255, 0.45))';
  } else if (viewMode === 'exploded') {
    containerFilter = 'drop-shadow(0 35px 70px rgba(0,0,0,0.85)) drop-shadow(0 0 50px rgba(245,166,35,0.22))';
  }

  // 360 reflection offset
  const sheenOffset = ((dragAngle % 180 + 180) % 180) / 180 * 200 - 50;

  return (
    <div
      className={className}
      style={{
        width: `${w}px`,
        height: `${h}px`,
        perspective: viewMode === 'exploded' ? '1800px' : '1300px',
        cursor: viewMode === '360' ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
        userSelect: 'none',
        position: 'relative',
        filter: containerFilter,
        transition: 'filter 0.4s ease',
      }}
      onClick={handleCardClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={viewMode === '360' ? 'Click and drag left/right to rotate 360°' : 'Click to flip banknote'}
    >
      {/* ── MODE 1 & 2: STANDARD FLIP & 360° ORBITAL VIEW ── */}
      {viewMode !== 'exploded' && (
        <div
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            transformStyle: 'preserve-3d',
            transform: viewMode === '360'
              ? `rotateY(${dragAngle}deg) rotateX(${Math.sin((dragAngle * Math.PI) / 180) * 5}deg)`
              : isCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transition: viewMode === '360' && !isDragging
              ? 'none'
              : 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* FRONT: US $100 Note */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              borderRadius: '12px',
              overflow: 'hidden',
              border: viewMode === 'xray' ? '2px solid #00ffcc' : '1.5px solid rgba(255,255,255,0.14)',
              background: '#0d2217',
              boxShadow: 'inset 0 0 25px rgba(0,0,0,0.7)',
              filter: viewMode === 'xray' ? 'invert(0.88) hue-rotate(180deg) contrast(1.8) saturate(2.2) brightness(0.95)' : 'none',
              transition: 'filter 0.5s ease, border-color 0.5s ease',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundImage: 'url(/images/usd_100.jpg)',
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            />

            {/* Specular sheen on 360 rotation */}
            {viewMode === '360' && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.35) 48%, rgba(245,166,35,0.4) 52%, transparent 70%)',
                  transform: `translateX(${sheenOffset}%)`,
                  pointerEvents: 'none',
                  mixBlendMode: 'overlay',
                }}
              />
            )}
          </div>

          {/* BACK: Ethiopian Birr 200 Note */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              borderRadius: '12px',
              overflow: 'hidden',
              border: viewMode === 'xray' ? '2px solid #00ffcc' : '1.5px solid rgba(255,255,255,0.14)',
              background: '#1d1b24',
              boxShadow: 'inset 0 0 25px rgba(0,0,0,0.7)',
              filter: viewMode === 'xray' ? 'invert(0.88) hue-rotate(180deg) contrast(1.8) saturate(2.2) brightness(0.95)' : 'none',
              transition: 'filter 0.5s ease, border-color 0.5s ease',
            }}
          >
            <div
              style={{
                position: 'absolute',
                width: `${h}px`,
                height: `${w}px`,
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%) rotate(90deg)',
                backgroundImage: 'url(/images/etb_200.jpg)',
                backgroundSize: '100% 200%',
                backgroundPosition: 'top center',
                backgroundRepeat: 'no-repeat',
              }}
            />

            {/* Specular sheen on 360 rotation */}
            {viewMode === '360' && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.35) 48%, rgba(245,166,35,0.4) 52%, transparent 70%)',
                  transform: `translateX(${-sheenOffset}%)`,
                  pointerEvents: 'none',
                  mixBlendMode: 'overlay',
                }}
              />
            )}
          </div>

          {/* X-RAY FORENSIC OVERLAYS */}
          {viewMode === 'xray' && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: '12px', overflow: 'hidden' }}>
              {/* Sweeping Laser Scanline */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: 'linear-gradient(90deg, transparent, #00ffcc 20%, #ffffff 50%, #00ffcc 80%, transparent)',
                  boxShadow: '0 0 16px #00ffcc, 0 0 32px #00e5ff',
                  animation: 'xrayScanline 3.2s ease-in-out infinite',
                  zIndex: 20,
                }}
              />

              {/* Glowing Fluorescent Security Ribbon */}
              <div
                style={{
                  position: 'absolute',
                  left: '26%',
                  top: 0,
                  bottom: 0,
                  width: '7px',
                  background: 'linear-gradient(180deg, #39ff14, #00ffcc, #39ff14)',
                  boxShadow: '0 0 14px #39ff14, 0 0 28px rgba(57,255,20,0.6)',
                  opacity: 0.92,
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{
                  writingMode: 'vertical-rl',
                  fontSize: '8px',
                  fontWeight: 900,
                  color: '#000',
                  letterSpacing: '3px',
                  fontFamily: 'monospace',
                }}>
                  ETHIOSWAP 100 SECURE
                </span>
              </div>

              {/* Hidden Fluorescent Lion of Judah Watermark in Center */}
              <div
                style={{
                  position: 'absolute',
                  top: '42%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: isMobile ? '64px' : '90px',
                  height: isMobile ? '64px' : '90px',
                  borderRadius: '50%',
                  border: '2px dashed #39ff14',
                  boxShadow: '0 0 24px rgba(57, 255, 20, 0.7), inset 0 0 16px rgba(57, 255, 20, 0.4)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 12,
                  animation: 'uvPhosphorPulse 2s ease-in-out infinite',
                  background: 'rgba(57, 255, 20, 0.12)',
                }}
              >
                <span style={{ fontSize: isMobile ? '24px' : '36px' }}>🦁</span>
                <span style={{ fontSize: '7px', fontWeight: 800, color: '#39ff14', letterSpacing: '1px', fontFamily: 'monospace' }}>
                  UV WATERMARK
                </span>
              </div>

              {/* Fluorescent Denomination 100/200 Stamp */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  right: '12px',
                  fontSize: '18px',
                  fontWeight: 900,
                  color: '#39ff14',
                  textShadow: '0 0 10px #39ff14, 0 0 20px #00ffcc',
                  fontFamily: 'JetBrains Mono, monospace',
                  zIndex: 15,
                }}
              >
                100 / 200
              </div>

              {/* HUD Forensic Bracket Readouts */}
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '8px',
                  color: '#00ffcc',
                  lineHeight: 1.4,
                  textShadow: '0 0 6px #00ffcc',
                  zIndex: 16,
                }}
              >
                <div>[UV-A 365nm]</div>
                <div>PASS: 100%</div>
              </div>

              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '8px',
                  color: '#39ff14',
                  lineHeight: 1.4,
                  textShadow: '0 0 6px #39ff14',
                  textAlign: 'right',
                  zIndex: 16,
                }}
              >
                <div>ESCROW LOCK</div>
                <div>VERIFIED</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODE 3: EXPLODED 3D ARCHITECTURAL VIEW ── */}
      {viewMode === 'exploded' && (
        <div
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            transformStyle: 'preserve-3d',
            transform: 'perspective(1600px) rotateY(-28deg) rotateX(16deg) rotateZ(-3deg)',
            transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Corner Blueprint Laser Connector Lines */}
          <div
            style={{
              position: 'absolute',
              top: '5%',
              bottom: '5%',
              left: '4%',
              width: '1px',
              borderLeft: '1.5px dashed rgba(245, 166, 35, 0.45)',
              transform: 'translateZ(-90px)',
              pointerEvents: 'none',
              transformStyle: 'preserve-3d',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '5%',
              bottom: '5%',
              right: '4%',
              width: '1px',
              borderLeft: '1.5px dashed rgba(245, 166, 35, 0.45)',
              transform: 'translateZ(-90px)',
              pointerEvents: 'none',
              transformStyle: 'preserve-3d',
            }}
          />

          {/* ── LAYER 4 (Back Z: -85px): Multi-Bank Settlement Rail ── */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '12px',
              transform: `translateZ(${isMobile ? -55 : -85}px)`,
              background: 'linear-gradient(145deg, #181924, #0b0c12)',
              border: '1.5px solid rgba(255, 255, 255, 0.16)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
              overflow: 'hidden',
              padding: '16px 12px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.6s ease',
            }}
          >
            <div style={{
              fontSize: '10px',
              fontWeight: 800,
              color: 'var(--gold)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span>🏦</span> LAYER 4: FIAT SETTLEMENT
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              background: 'rgba(0,0,0,0.4)',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ fontSize: '11px', color: '#fff', fontWeight: 700 }}>Direct Ethiopian Banks</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {['Telebirr', 'CBE', 'Dashen', 'Awash'].map(bank => (
                  <span key={bank} style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    background: 'rgba(245,166,35,0.15)',
                    color: 'var(--gold)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: '1px solid rgba(245,166,35,0.3)',
                  }}>
                    {bank}
                  </span>
                ))}
              </div>
            </div>

            <div style={{
              fontSize: '9px',
              color: 'var(--text-dim)',
              lineHeight: 1.4,
              borderTop: '1px solid rgba(255,255,255,0.08)',
              paddingTop: '8px',
            }}>
              100% P2P direct transfer with automated receipt validation & instant bank release.
            </div>
          </div>

          {/* Floating HUD Tag for Layer 4 */}
          <div
            style={{
              position: 'absolute',
              right: isMobile ? '-100px' : '-140px',
              bottom: '15%',
              transform: `translateZ(${isMobile ? -55 : -85}px)`,
              background: 'rgba(10, 12, 18, 0.85)',
              border: '1px solid rgba(245, 166, 35, 0.3)',
              borderRadius: '8px',
              padding: '6px 10px',
              pointerEvents: 'none',
              backdropFilter: 'blur(8px)',
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--gold)' }}>L4: Multi-Bank Rail</div>
            <div style={{ fontSize: '8px', color: 'var(--text-dim)' }}>Instant Birr settlement</div>
          </div>

          {/* ── LAYER 3 (Z: -28px): Smart Contract Escrow Mesh ── */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '12px',
              transform: `translateZ(${isMobile ? -18 : -28}px)`,
              background: 'linear-gradient(145deg, rgba(3, 25, 20, 0.94), rgba(4, 14, 18, 0.96))',
              border: '1.5px solid rgba(0, 200, 150, 0.65)',
              boxShadow: '0 0 30px rgba(0,200,150,0.25), inset 0 0 20px rgba(0,200,150,0.15)',
              overflow: 'hidden',
              padding: '14px 10px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.6s ease',
            }}
          >
            <div style={{
              fontSize: '10px',
              fontWeight: 800,
              color: 'var(--accent-green)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span>🔒</span> LAYER 3: ESCROW CORE
            </div>

            {/* Matrix Circuit Pattern Overlay */}
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '9px',
              color: 'rgba(0, 200, 150, 0.85)',
              background: 'rgba(0,0,0,0.5)',
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid rgba(0,200,150,0.2)',
              lineHeight: 1.5,
            }}>
              <div>STATUS: LOCKED</div>
              <div>SIGS: 2/2 MULTISIG</div>
              <div style={{ color: '#fff', fontSize: '8px' }}>HASH: 0x8F92...71B4</div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '9px',
              color: 'var(--accent-green)',
              fontWeight: 700,
            }}>
              <span>TRC-20 / ERC-20</span>
              <span>100% COLLATERAL</span>
            </div>
          </div>

          {/* Floating HUD Tag for Layer 3 */}
          <div
            style={{
              position: 'absolute',
              left: isMobile ? '-105px' : '-150px',
              top: '40%',
              transform: `translateZ(${isMobile ? -18 : -28}px)`,
              background: 'rgba(3, 20, 16, 0.9)',
              border: '1px solid rgba(0, 200, 150, 0.4)',
              borderRadius: '8px',
              padding: '6px 10px',
              pointerEvents: 'none',
              backdropFilter: 'blur(8px)',
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--accent-green)' }}>L3: Escrow Smart Lock</div>
            <div style={{ fontSize: '8px', color: 'var(--text-dim)' }}>Non-custodial collateral</div>
          </div>

          {/* ── LAYER 2 (Z: +28px): Legal Tender Banknote Paper ── */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '12px',
              transform: `translateZ(${isMobile ? 18 : 28}px)`,
              overflow: 'hidden',
              border: '1.5px solid rgba(255,255,255,0.18)',
              background: '#0d2217',
              boxShadow: '0 25px 45px rgba(0,0,0,0.85), inset 0 0 20px rgba(0,0,0,0.6)',
              transition: 'transform 0.6s ease',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundImage: isCardFlipped ? 'none' : 'url(/images/usd_100.jpg)',
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            />
            {isCardFlipped && (
              <div
                style={{
                  position: 'absolute',
                  width: `${h}px`,
                  height: `${w}px`,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%) rotate(90deg)',
                  backgroundImage: 'url(/images/etb_200.jpg)',
                  backgroundSize: '100% 200%',
                  backgroundPosition: 'top center',
                  backgroundRepeat: 'no-repeat',
                }}
              />
            )}
          </div>

          {/* Floating HUD Tag for Layer 2 */}
          <div
            style={{
              position: 'absolute',
              right: isMobile ? '-105px' : '-145px',
              top: '25%',
              transform: `translateZ(${isMobile ? 18 : 28}px)`,
              background: 'rgba(12, 16, 20, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '6px 10px',
              pointerEvents: 'none',
              backdropFilter: 'blur(8px)',
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#ffffff' }}>L2: Legal Tender Note</div>
            <div style={{ fontSize: '8px', color: 'var(--text-dim)' }}>US $100 / ETB 200 paper</div>
          </div>

          {/* ── LAYER 1 (Foreground Z: +85px): Holographic Security Shield ── */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '12px',
              transform: `translateZ(${isMobile ? 55 : 85}px)`,
              background: 'linear-gradient(135deg, rgba(245,166,35,0.12), rgba(0,200,150,0.08) 50%, rgba(124,58,237,0.12))',
              border: '2px solid rgba(245, 166, 35, 0.75)',
              boxShadow: '0 0 35px rgba(245,166,35,0.35), inset 0 0 25px rgba(255,255,255,0.15)',
              backdropFilter: 'blur(3px)',
              overflow: 'hidden',
              padding: '16px 12px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.6s ease',
            }}
          >
            <div style={{
              fontSize: '10px',
              fontWeight: 800,
              color: 'var(--gold)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>✨</span> LAYER 1: HOLO-SEAL
              </span>
              <span style={{ fontSize: '8px', color: '#fff', background: 'var(--gold)', color: '#000', padding: '1px 5px', borderRadius: '3px', fontWeight: 800 }}>
                AUTHENTIC
              </span>
            </div>

            {/* Central Holographic Emblem */}
            <div style={{
              margin: 'auto 0',
              textAlign: 'center',
              padding: '14px 6px',
              borderRadius: '8px',
              background: 'rgba(0,0,0,0.35)',
              border: '1px dashed rgba(245,166,35,0.4)',
            }}>
              <div style={{ fontSize: isMobile ? '24px' : '32px', marginBottom: '4px' }}>🛡️</div>
              <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--gold)', letterSpacing: '0.08em' }}>
                ETHIOSWAP VERIFIED
              </div>
              <div style={{ fontSize: '8px', color: '#fff', opacity: 0.8, letterSpacing: '0.05em' }}>
                ANTI-COUNTERFEIT SHIELD
              </div>
            </div>

            <div style={{
              fontSize: '8px',
              color: 'rgba(255,255,255,0.8)',
              fontFamily: 'monospace',
              letterSpacing: '1px',
              textAlign: 'center',
            }}>
              ID: #ES-2026-X992 • 100% COLLATERAL
            </div>
          </div>

          {/* Floating HUD Tag for Layer 1 */}
          <div
            style={{
              position: 'absolute',
              left: isMobile ? '-105px' : '-150px',
              top: '12%',
              transform: `translateZ(${isMobile ? 55 : 85}px)`,
              background: 'rgba(20, 16, 8, 0.92)',
              border: '1px solid rgba(245, 166, 35, 0.5)',
              borderRadius: '8px',
              padding: '6px 10px',
              pointerEvents: 'none',
              backdropFilter: 'blur(8px)',
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--gold)' }}>L1: Hologram Shield</div>
            <div style={{ fontSize: '8px', color: 'var(--text-dim)' }}>Tamper-evident seal</div>
          </div>
        </div>
      )}

      {/* Flip hint only in standard mode */}
      {viewMode === 'standard' && (
        <div
          style={{
            position: 'absolute',
            bottom: '-28px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '11px',
            color: 'rgba(245,166,35,0.7)',
            fontWeight: 700,
            letterSpacing: '0.1em',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            fontFamily: 'sans-serif',
            background: 'rgba(0, 0, 0, 0.4)',
            padding: '4px 12px',
            borderRadius: '20px',
            border: '1px solid rgba(245,166,35,0.15)',
            backdropFilter: 'blur(5px)',
          }}
        >
          {isCardFlipped ? '← Click to see USD' : 'Click to see Birr →'}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// FLOATING BILL WRAPPER & INTERACTIVE VIEW COMMAND TERMINAL
// Provides /explodedview, /360view, and /Xray view controller
// ═══════════════════════════════════════════════════════════
export const FloatingBill = ({
  size = 'lg',
  style = {},
  prefersReducedMotion = false,
  interactive = false,
  mode = 'standard',
}) => {
  const containerRef = useRef(null);
  const [scrollY, setScrollY] = useState(0);

  // View modes: 'standard' | '360' | 'exploded' | 'xray'
  const [viewMode, setViewMode] = useState(mode);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setViewMode(mode);
  }, [mode]);

  // 360 Rotation state
  const [dragAngle, setDragAngle] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);

  // Terminal command input & summon feedback
  const [commandInput, setCommandInput] = useState('');
  const [summonFeedback, setSummonFeedback] = useState(null);

  // Scroll parallax for standard mode
  useEffect(() => {
    if (prefersReducedMotion) return;
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const elementCenter = rect.top + rect.height / 2;
            const distance = elementCenter - viewportHeight / 2;
            setScrollY(distance);
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [prefersReducedMotion]);

  // Continuous auto-spin when in 360 view and not actively dragging
  useEffect(() => {
    if (viewMode !== '360' || isDragging || prefersReducedMotion) return;
    let rafId;
    const tick = () => {
      setDragAngle(prev => (prev + 0.6) % 360);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [viewMode, isDragging, prefersReducedMotion]);

  // Mouse & Touch Drag Scrubbing in 360 Mode
  const handleMouseDown = (e) => {
    if (viewMode !== '360') return;
    setIsDragging(true);
    setStartX(e.clientX);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || viewMode !== '360') return;
    const delta = (e.clientX - startX) * 0.9;
    setDragAngle(prev => (prev + delta) % 360);
    setStartX(e.clientX);
  };

  const handleMouseUp = () => {
    if (isDragging) setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (viewMode !== '360') return;
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || viewMode !== '360') return;
    const delta = (e.touches[0].clientX - startX) * 0.9;
    setDragAngle(prev => (prev + delta) % 360);
    setStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (isDragging) setIsDragging(false);
  };

  // Switch mode with feedback
  const activateMode = (modeName) => {
    setViewMode(modeName);
    const labels = {
      standard: '⚡ Default Banknote View',
      '360': '🔄 /360view: Panoramic 3D Orbital Inspection',
      exploded: '💥 /explodedview: 4-Layer Security Deconstruction',
      xray: '🔬 /Xray: Forensic UV-A 365nm Fluorescence Scan',
    };
    setSummonFeedback(labels[modeName] || `Activated ${modeName}`);
    setTimeout(() => setSummonFeedback(null), 3000);
  };

  // Summon by slash command typing (e.g. /explodedview, /360view, /xray)
  const handleCommandSubmit = (e) => {
    e.preventDefault();
    const cleanCmd = commandInput.trim().toLowerCase();
    if (cleanCmd === '/explodedview' || cleanCmd === 'explodedview' || cleanCmd === 'exploded') {
      activateMode('exploded');
    } else if (cleanCmd === '/360view' || cleanCmd === '360view' || cleanCmd === '360') {
      activateMode('360');
    } else if (cleanCmd === '/xray' || cleanCmd === 'xray' || cleanCmd === '/x-ray') {
      activateMode('xray');
    } else if (cleanCmd === '/standard' || cleanCmd === 'standard' || cleanCmd === 'default') {
      activateMode('standard');
    } else {
      setSummonFeedback(`Unknown command. Try /explodedview, /360view, or /Xray`);
      setTimeout(() => setSummonFeedback(null), 3000);
    }
    setCommandInput('');
  };

  const translateY = prefersReducedMotion ? 0 : scrollY * 0.12;
  const rotateZ = prefersReducedMotion ? 0 : scrollY * -0.012;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        width: '100%',
        ...style,
      }}
    >
      {/* 3D Banknote Showcase Canvas */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{
          transform: viewMode === 'standard'
            ? `translateY(${translateY}px) rotate(${rotateZ}deg)`
            : 'none',
          transition: 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          willChange: 'transform',
          animation: (prefersReducedMotion || viewMode !== 'standard')
            ? 'none'
            : 'billFloat 6s ease-in-out infinite, billEntry 0.8s cubic-bezier(0.16,1,0.3,1) both',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          paddingBottom: interactive ? '32px' : '10px',
        }}
      >
        <PaperMoney3D
          size={size}
          viewMode={viewMode}
          dragAngle={dragAngle}
          flipped={flipped}
          onFlip={() => setFlipped(f => !f)}
          isDragging={isDragging}
        />
      </div>

      {/* ── INTERACTIVE VIEW CONTROLLER & SUMMON CONSOLE ── */}
      {interactive && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            maxWidth: '380px',
            marginTop: '8px',
            zIndex: 40,
          }}
        >
          {/* Summoning Notification Toast */}
          {summonFeedback && (
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(245,166,35,0.2), rgba(0,200,150,0.2))',
                border: '1px solid var(--gold)',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 700,
                padding: '6px 14px',
                borderRadius: '20px',
                backdropFilter: 'blur(10px)',
                textAlign: 'center',
                boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                animation: 'billEntry 0.3s ease-out',
              }}
            >
              {summonFeedback}
            </div>
          )}

          {/* Mode Switcher Buttons */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(15, 17, 24, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '30px',
              padding: '4px',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
              gap: '4px',
              width: '100%',
              justifyContent: 'space-between',
            }}
          >
            {[
              { id: 'standard', label: 'Default', icon: '⚡' },
              { id: '360', label: '/360view', icon: '🔄' },
              { id: 'exploded', label: '/explodedview', icon: '💥' },
              { id: 'xray', label: '/Xray', icon: '🔬' },
            ].map(btn => {
              const active = viewMode === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => activateMode(btn.id)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    padding: '8px 6px',
                    borderRadius: '22px',
                    border: active ? '1px solid rgba(245,166,35,0.6)' : '1px solid transparent',
                    background: active
                      ? 'linear-gradient(135deg, rgba(245,166,35,0.25), rgba(245,166,35,0.1))'
                      : 'transparent',
                    color: active ? '#ffffff' : 'var(--text-dim)',
                    fontSize: '11px',
                    fontWeight: active ? 800 : 600,
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    whiteSpace: 'nowrap',
                    boxShadow: active ? '0 0 14px rgba(245,166,35,0.25)' : 'none',
                  }}
                  onMouseOver={e => {
                    if (!active) {
                      e.currentTarget.style.color = '#fff';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    }
                  }}
                  onMouseOut={e => {
                    if (!active) {
                      e.currentTarget.style.color = 'var(--text-dim)';
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <span style={{ fontSize: '13px' }}>{btn.icon}</span>
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </div>

          {/* Summon Console Terminal Input */}
          <form
            onSubmit={handleCommandSubmit}
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              background: 'rgba(8, 10, 14, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '24px',
              padding: '4px 6px 4px 12px',
              backdropFilter: 'blur(8px)',
              boxSizing: 'border-box',
            }}
          >
            <span style={{ color: 'var(--gold)', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', marginRight: '6px', fontWeight: 700 }}>
              &gt;
            </span>
            <input
              type="text"
              value={commandInput}
              onChange={e => setCommandInput(e.target.value)}
              placeholder="Summon /explodedview, /360view, /Xray..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '11px',
                outline: 'none',
                fontFamily: 'Inter, sans-serif',
              }}
            />
            <button
              type="submit"
              style={{
                background: 'rgba(245, 166, 35, 0.15)',
                border: '1px solid rgba(245, 166, 35, 0.3)',
                color: 'var(--gold)',
                fontSize: '10px',
                fontWeight: 800,
                borderRadius: '16px',
                padding: '4px 10px',
                cursor: 'pointer',
                letterSpacing: '0.05em',
                transition: 'background 0.2s',
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(245, 166, 35, 0.3)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(245, 166, 35, 0.15)'}
            >
              Summon
            </button>
          </form>

          {/* Quick Clickable Command Chips */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '10px',
              color: 'var(--text-dim)',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <span>Click to summon:</span>
            {[
              { cmd: 'exploded', label: '/explodedview' },
              { cmd: '360', label: '/360view' },
              { cmd: 'xray', label: '/Xray' },
            ].map(chip => (
              <span
                key={chip.cmd}
                onClick={() => activateMode(chip.cmd)}
                style={{
                  color: 'var(--gold)',
                  fontFamily: 'JetBrains Mono, monospace',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: 'rgba(245, 166, 35, 0.08)',
                  border: '1px solid rgba(245, 166, 35, 0.18)',
                  transition: 'all 0.2s',
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = 'rgba(245, 166, 35, 0.2)';
                  e.currentTarget.style.borderColor = 'var(--gold)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = 'rgba(245, 166, 35, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(245, 166, 35, 0.18)';
                }}
              >
                {chip.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Legacy stubs — no longer rendered but kept to avoid ref errors
const FallingBill = () => null;
const MoneyRain = () => null;
const Bill3D = () => null;
const PremiumUSDCard = () => null;

export const AutoScrollingBills = ({ direction = 'up', speed = '20s', size = 'md' }) => {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const billSize = width < 768 ? 'sm' : size;

  // Dimensions
  const dims = {
    lg: { w: 178, h: 420 },
    md: { w: 145, h: 340 },
    sm: { w: 110, h: 260 },
  }[billSize] || { w: 145, h: 340 };

  const { w, h } = dims;

  return (
    <div style={{
      height: width < 768 ? '300px' : '450px',
      overflow: 'hidden',
      position: 'relative',
      width: '100%',
      maxWidth: `${w + 40}px`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      margin: '0 auto',
      maskImage: 'linear-gradient(to bottom, transparent, white 15%, white 85%, transparent)',
      WebkitMaskImage: 'linear-gradient(to bottom, transparent, white 15%, white 85%, transparent)',
    }}>
      <style>{`
        @keyframes scrollUp {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        @keyframes scrollDown {
          0% { transform: translateY(-50%); }
          100% { transform: translateY(0); }
        }
        .scroll-container-up {
          display: flex;
          flex-direction: column;
          gap: 20px;
          animation: scrollUp ${speed} linear infinite;
        }
        .scroll-container-down {
          display: flex;
          flex-direction: column;
          gap: 20px;
          animation: scrollDown ${speed} linear infinite;
        }
        .scroll-container-up:hover, .scroll-container-down:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className={direction === 'up' ? 'scroll-container-up' : 'scroll-container-down'}>
        {[1, 2, 3, 4, 1, 2, 3, 4].map((id, index) => {
          const isUSD = id % 2 === 1;
          return (
            <div key={index} style={{
              width: `${w}px`,
              height: `${h}px`,
              position: 'relative',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1.5px solid rgba(255,255,255,0.12)',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              background: isUSD ? '#0d2217' : '#1d1b24',
              flexShrink: 0,
              cursor: 'pointer',
              transition: 'transform 0.3s ease, border-color 0.3s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.05) rotate(1deg)';
              e.currentTarget.style.borderColor = 'var(--gold)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
            }}
            >
              {isUSD ? (
                <div style={{
                  width: '100%',
                  height: '100%',
                  backgroundImage: 'url(/images/usd_100.jpg)',
                  backgroundSize: '100% 100%',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }} />
              ) : (
                <div style={{
                  position: 'absolute',
                  width: `${h}px`,
                  height: `${w}px`,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%) rotate(90deg)',
                  backgroundImage: 'url(/images/etb_200.jpg)',
                  backgroundSize: '100% 200%',
                  backgroundPosition: 'top center',
                  backgroundRepeat: 'no-repeat',
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const LandingPage = ({ onGetStarted, onSignIn, systemSettings }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ traders: 0, deposited: 0, traded: 0, avg: '0.0', scams: 0 });
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      const [usersRes, depositsRes, tradesRes, reviewsRes] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('deposit_requests').select('amount_usd').eq('status', 'approved'),
        supabase.from('trades').select('amount_eth, amount_usd').eq('status', 'completed'),
        supabase.from('reviews').select('*').eq('is_approved', true),
      ]);
      const totalDeposited = (depositsRes.data || []).reduce((s, r) => s + (r.amount_usd || 0), 0);
      const totalTraded = (tradesRes.data || []).reduce((s, r) => s + (r.amount_eth || r.amount_usd || 0), 0);
      setStats({
        traders: usersRes.count || 0,
        deposited: totalDeposited,
        traded: totalTraded,
        avg: '4.8',
        scams: 0
      });
      setReviews(reviewsRes.data || []);
    };

    loadData();

    // Set up real-time listeners for instant statistics updates
    const tradesChannel = supabase
      .channel('landing-page-trades')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, loadData)
      .subscribe();

    const depositsChannel = supabase
      .channel('landing-page-deposits')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deposit_requests' }, loadData)
      .subscribe();

    const usersChannel = supabase
      .channel('landing-page-users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, loadData)
      .subscribe();

    return () => {
      supabase.removeChannel(tradesChannel);
      supabase.removeChannel(depositsChannel);
      supabase.removeChannel(usersChannel);
    };
  }, []);

  const buyRate = systemSettings?.etbRatePerDollar ?? 190.00;
  const sellRate = systemSettings?.etbRatePerDollarSell ?? systemSettings?.etbRatePerDollar ?? 186.00;
  
  const [scrolled, setScrolled] = useState(false);
   const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
   const [faqActiveIndex, setFaqActiveIndex] = useState(null);
   const [openModal, setOpenModal] = useState(null);
   const [lang, setLang] = useState('en'); // 'en' | 'am'

   // Calculator state
   const [calcMode, setCalcMode] = useState('usd-to-etb');
   const [calcInput, setCalcInput] = useState('');

   // Reviews state
   const [showReviewModal, setShowReviewModal] = useState(false);
   const [reviewRating, setReviewRating] = useState(5);
   const [reviewContent, setReviewContent] = useState('');
   const [reviewError, setReviewError] = useState('');
   const [reviewSuccess, setReviewSuccess] = useState(false);
   const [submitLoading, setSubmitLoading] = useState(false);

   // Rate prediction state (simple 7-day moving average)
   const [rateForecast, setRateForecast] = useState(null);
   const [showStickyBar, setShowStickyBar] = useState(false);
   const [userReferralCode, setUserReferralCode] = useState('');

  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [cursorHovered, setCursorHovered] = useState(false);
  const stepsRef = useRef(null);
  const [stepsVisible, setStepsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [liveRate, setLiveRate] = useState(buyRate);
  const [rateTimestamp, setRateTimestamp] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    setPrefersReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const moveCursor = (e) => setCursorPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', moveCursor);
    return () => window.removeEventListener('mousemove', moveCursor);
  }, [prefersReducedMotion]);

  const [scrollProgress, setScrollProgress] = useState(0);

  // Scroll reveal observer
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Smooth scroll for anchor links with offset for fixed navbar
  useEffect(() => {
    const handleAnchorClick = (e) => {
      const href = e.currentTarget.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const targetId = href.slice(1);
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          const navHeight = width < 768 ? 70 : 85;
          const elementPosition = targetElement.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - navHeight;
          window.scrollTo({
            top: Math.max(0, offsetPosition),
            behavior: 'smooth'
          });
        }
      }
    };

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', handleAnchorClick);
    });

    return () => {
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.removeEventListener('click', handleAnchorClick);
      });
    };
  }, [width]);

  // Sync live rate with database configuration
  useEffect(() => {
    setLiveRate(buyRate);
    setRateTimestamp(new Date().toLocaleTimeString());
  }, [buyRate]);

  // Fetch rate history for prediction widget + referral code for logged-in user
  useEffect(() => {
    const fetchRateAndReferral = async () => {
      try {
        const { data: rates } = await supabase
          .from('p2p_rate_history')
          .select('rate_etb, recorded_at')
          .order('recorded_at', { ascending: false })
          .limit(30);
        if (rates && rates.length >= 3) {
          const vals = rates.map(r => r.rate_etb);
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
          const recent = vals.slice(0, 7).reduce((a, b) => a + b, 0) / Math.min(vals.length, 7);
          const trend = recent - avg;
          setRateForecast({
            current: vals[0],
            predicted7d: +(vals[0] + trend * 0.6).toFixed(2),
            trend: trend > 0.5 ? 'up' : trend < -0.5 ? 'down' : 'stable',
            confidence: Math.min(95, 60 + rates.length),
          });
        }
      } catch (_) {}

      // Load referral code for logged-in user
      if (user?.id) {
        try {
          const { data } = await supabase.from('users').select('referral_code').eq('id', user.id).single();
          if (data?.referral_code) setUserReferralCode(data.referral_code);
        } catch (_) {}
      }
    };
    fetchRateAndReferral();
  }, [user]);

  // Show sticky CTA after scrolling 40% down page
  useEffect(() => {
    const handleStickyBar = () => setShowStickyBar(window.scrollY > window.innerHeight * 0.6);
    window.addEventListener('scroll', handleStickyBar, { passive: true });
    return () => window.removeEventListener('scroll', handleStickyBar);
  }, []);

  // SEO meta tags
  useEffect(() => {
    document.title = 'EthioSwap — Buy & Sell USDT for Ethiopian Birr | Secure P2P Exchange';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.content = 'EthioSwap is Ethiopia\'s most trusted P2P USDT exchange. Buy and sell USD for ETB using Telebirr, CBE, and more. 100% escrow protected, KYC verified.';
    let og = document.querySelector('meta[property="og:title"]');
    if (!og) { og = document.createElement('meta'); og.setAttribute('property', 'og:title'); document.head.appendChild(og); }
    og.content = 'EthioSwap — Ethiopia\'s #1 P2P USDT Exchange';
  }, []);

  // Track scroll progress for 3D Bill movement
  useEffect(() => {
    const handleScrollProgress = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = window.scrollY / totalHeight;
      setScrollProgress(progress);
    };
    window.addEventListener('scroll', handleScrollProgress);
    return () => window.removeEventListener('scroll', handleScrollProgress);
  }, []);

  // Intersection Observer for steps timeline
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if (entry.isIntersecting) setStepsVisible(true); });
    }, { threshold: 0.1 });
    if (stepsRef.current) observer.observe(stepsRef.current);
    return () => observer.disconnect();
  }, []);

  // Scroll listener for sticky header bottom border
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCardMouseMove = (e) => {
    if (prefersReducedMotion) return;
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((centerY - y) / centerY) * 6; // max 6deg
    const rotateY = ((x - centerX) / centerX) * 6; // max 6deg
    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    card.style.borderColor = 'rgba(245, 166, 35, 0.3)';
    card.style.boxShadow = '0 0 0 1px rgba(245,166,35,0.3)';
  };

  const handleCardMouseLeave = (e) => {
    const card = e.currentTarget;
    card.style.transform = `perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0px)`;
    card.style.borderColor = 'rgba(255, 255, 255, 0.07)';
    card.style.boxShadow = 'none';
  };

  const calcResult = calcInput
    ? calcMode === 'usd-to-etb'
      ? (parseFloat(calcInput) * liveRate).toFixed(2)
      : (parseFloat(calcInput) / liveRate).toFixed(4)
    : '';

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setReviewError('');
    if (reviewContent.trim().length < 20) {
      setReviewError('Review content must be at least 20 characters.');
      return;
    }
    if (reviewContent.trim().length > 300) {
      setReviewError('Review content must be under 300 characters.');
      return;
    }
    setSubmitLoading(true);
    try {
      const newReview = {
        user_id: user.id,
        username: user.username,
        rating: reviewRating,
        content: reviewContent.trim(),
        is_approved: true,
        created_at: new Date().toISOString()
      };
      const { error } = await supabase.from('reviews').insert(newReview);
      if (error) throw error;
      setReviews(prev => [newReview, ...prev]);
      setReviewSuccess(true);
      setReviewContent('');
      setReviewRating(5);
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const faqItems = [
    { q: "How does the escrow system protect my money?", a: "When a buyer starts a trade, the seller's USDT is immediately locked in our secure escrow. The seller cannot move those funds until the buyer confirms payment and the seller verifies receipt. If there's a dispute, our admin team reviews evidence and resolves it fairly." },
    { q: "What payment methods can I use?", a: "You can trade using Telebirr, CBE (Commercial Bank of Ethiopia), Dashen Bank, Awash Bank, and HelloCash. All fiat transfers happen directly between users — we never touch your Birr." },
    { q: "Why do I need to verify my identity (KYC)?", a: "KYC verification (National ID + live selfie) protects you from fraud. Only verified users can trade, which means every counterparty on the platform is a real, identified person. Unverified users cannot trade." },
    { q: "What networks are supported for crypto deposits?", a: "We support TRC20 (Tron) and ERC20 (Ethereum) networks for USDT deposits and withdrawals. TRC20 is recommended for lower fees." },
    { q: "How fast are trades completed?", a: "Most trades are completed in under 15 minutes. The buyer has a 30-minute window to send payment. The seller then confirms receipt and releases the USDT instantly." },
    { q: "What happens if there's a dispute?", a: "Either party can open a dispute at any time. Our support team reviews chat history, payment receipts, and bank statements, then makes a decision based on the evidence." },
    { q: "What happens if a user tries to scam me with a fake receipt or fraud?", a: "If a buyer scams you with a fake payment receipt/bill or a seller acts fraudulently, report it to our team immediately. We will investigate, return the locked USDT to the rightful owner (the seller), and permanently ban the scammer from EthioSwap." },
  ];

  const getModalTitle = (type) => {
    switch (type) {
      case 'terms': return 'Terms of Service';
      case 'privacy': return 'Privacy Policy';
      case 'escrow': return 'Escrow Operations & Dispute Policy';
      case 'aml': return 'Anti-Money Laundering & KYC Rules';
      case 'about': return 'About EthioSwap';
      default: return '';
    }
  };

  const getModalBody = (type) => {
    switch (type) {
      case 'terms': return (
        <>
          <h4>1. Acceptance of Terms</h4>
          <p>By accessing EthioSwap, you agree to these Terms of Service. This platform provides a peer-to-peer escrow service for trading USDT stablecoins and Ethiopian Birr.</p>
          <h4>2. Escrow Service</h4>
          <p>EthioSwap facilitates the purchase and sale of USDT in exchange for Ethiopian Birr (ETB). We provide escrow locking and administrator-led dispute resolution. All ETB transfers occur directly between users.</p>
        </>
      );
      case 'privacy': return (
        <>
          <h4>1. Data Collection</h4>
          <p>EthioSwap collects your personal information, government document uploads, and biometric data for KYC verification purposes.</p>
          <h4>2. KYC Data</h4>
          <p>To create an active trading profile, the platform uploads scans of your National ID card (front and back) and a live face selfie. All documents are encrypted and stored securely.</p>
        </>
      );
      case 'escrow': return (
        <>
          <h4>1. Escrow Lock</h4>
          <p>When a trade is initiated, the seller's USDT is instantly locked in escrow, preventing withdrawal. A 30-minute payment window begins.</p>
          <h4>2. Dispute Resolution</h4>
          <p>If either party opens a dispute, our support team examines transaction receipts and bank statements, then executes a fair release or refund.</p>
        </>
      );
      case 'aml': return (
        <>
          <h4>1. Compliance</h4>
          <p>EthioSwap complies with anti-money laundering (AML) guidelines to protect the trading community.</p>
          <h4>2. Mandatory KYC</h4>
          <p>Verification is mandatory. Unverified accounts are blocked from initiating trades, deposits, or withdrawals.</p>
        </>
      );
      case 'about': return (
        <>
          <h4>1. Our Mission</h4>
          <p>EthioSwap bridges international digital assets and the local Ethiopian financial landscape. We provide secure, automated P2P trading for remote workers, freelancers, merchants, and the diaspora.</p>
          <h4>2. Built for Ethiopia</h4>
          <p>By enforcing KYC and leveraging escrow, we eliminate common P2P scams and safeguard your transactions.</p>
        </>
      );
      default: return null;
    }
  };


  const t = (en, am) => lang === 'am' ? am : en;

  return (
    <div style={{ background: '#0a0a0a', color: '#c8c8c8', fontFamily: "'Inter', sans-serif", overflowX: 'hidden', position: 'relative' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap');
        
        :root {
          --gold: #F5A623;
          --gold-bright: #ffdf5e;
          --gold-muted: rgba(245, 166, 35, 0.1);
          --bg: #020203;
          --card: #0a0a0b;
          --card-hover: #111114;
          --border: rgba(255, 255, 255, 0.05);
          --border-bright: rgba(255, 255, 255, 0.1);
          --text-main: #ffffff;
          --text-dim: #8b92a8;
          --accent-green: #00C896;
          --glass-bg: rgba(10, 10, 12, 0.7);
        }

        body { 
          font-family: 'Inter', sans-serif; 
          background: var(--bg); 
          color: var(--text-main);
          margin: 0;
          overflow-x: hidden;
        }

        .serif-title { 
          font-family: 'Plus Jakarta Sans', sans-serif; 
          font-weight: 800; 
          letter-spacing: -0.04em; 
        }

        /* Glassmorphism Fintech Style */
        .glass-panel {
          background: var(--glass-bg);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid var(--border);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
        }

        .premium-card {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, transparent 100%);
          border: 1px solid var(--border);
          border-radius: 24px;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .premium-card:hover {
          border-color: var(--gold-muted);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(245, 166, 35, 0.02) 100%);
          transform: translateY(-8px);
        }

        /* Floating elements */
        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .floating { animation: float-slow 6s ease-in-out infinite; }

        /* Smooth reveal on scroll */
        .reveal-on-scroll {
          opacity: 0;
          transform: translateY(40px);
          transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-on-scroll.active {
          opacity: 1;
          transform: translateY(0);
        }

        /* Curved transition */
        .section-curve {
          position: absolute;
          left: 0;
          width: 100%;
          height: 100px;
          background: var(--bg);
          clip-path: ellipse(60% 100% at 50% 100%);
          z-index: 5;
        }

        /* 3D Bill Animation */
        .bill-scene { perspective: 2000px; width: 100%; height: 100%; }
        .bill-card { 
          position: relative; 
          width: 100%; 
          height: 100%; 
          transform-style: preserve-3d; 
          will-change: transform; 
          animation: billFloat 4s ease-in-out infinite; 
        }
        .bill-face { 
          position: absolute; 
          inset: 0; 
          width: 100%; 
          height: 100%; 
          backface-visibility: hidden; 
          border-radius: 16px; 
          overflow: hidden; 
          background-size: cover; 
          background-position: center; 
          box-shadow: 0 40px 80px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.08) inset; 
        }
        .bill-dollar { background-image: url('/images/dollar-front.jpg'); }
        .bill-birr { background-image: url('/images/birr-back.jpg'); transform: rotateY(180deg); }
        
        @keyframes billFloat { 
          0%, 100% { transform: translateY(0px) rotate(-1.5deg); } 
          50% { transform: translateY(-12px) rotate(1.5deg); } 
        }

        @keyframes billEntry {
          from { opacity: 0; transform: translateY(40px) scale(0.92); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes xrayScanline {
          0% { top: 0%; opacity: 0.85; }
          50% { top: 96%; opacity: 1; filter: drop-shadow(0 0 12px #00ffcc); }
          100% { top: 0%; opacity: 0.85; }
        }

        @keyframes uvPhosphorPulse {
          0%, 100% { opacity: 0.78; transform: translate(-50%, -50%) scale(0.97); filter: drop-shadow(0 0 8px #39ff14); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.03); filter: drop-shadow(0 0 22px #39ff14) drop-shadow(0 0 35px #00ffcc); }
        }

        /* SaaS Layout Animations */
        @keyframes revealUp { 
          from { opacity: 0; transform: translateY(30px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        .reveal { animation: revealUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        .btn-saas-primary {
          background: linear-gradient(135deg, var(--gold) 0%, var(--gold-bright) 100%);
          color: #000;
          font-weight: 800;
          padding: 16px 36px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 20px rgba(245, 166, 35, 0.3);
        }
        .btn-saas-primary:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 15px 40px rgba(245, 166, 35, 0.5);
        }
        
        .nav-item-saas {
          color: var(--text-dim);
          font-weight: 600;
          font-size: 15px;
          text-decoration: none;
          transition: all 0.3s ease;
          padding: 8px 12px;
          border-radius: 8px;
        }
        .nav-item-saas:hover { 
          color: var(--text-main);
          background: rgba(255, 255, 255, 0.03);
        }

        /* Feature Grid */
        .feature-card {
          padding: 40px;
          border-radius: 24px;
          background: linear-gradient(180deg, rgba(20,20,20,0.8) 0%, rgba(10,10,10,0.8) 100%);
          border: 1px solid var(--border);
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
        }
        .feature-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at var(--x, 50%) var(--y, 50%), rgba(245,166,35,0.08) 0%, transparent 50%);
          opacity: 0;
          transition: opacity 0.3s;
        }
        .feature-card:hover {
          transform: translateY(-10px);
          border-color: rgba(245, 166, 35, 0.3);
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.6);
        }
        .feature-card:hover::before { opacity: 1; }

        /* Floating Glow Orbs */
        .orb {
          position: absolute;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(245,166,35,0.05) 0%, transparent 70%);
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
        }

        /* Ticker Marquee */
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        /* Floating Glow Visual Connectors */
        .section-glow {
          position: absolute;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, var(--gold-muted) 0%, transparent 70%);
          filter: blur(100px);
          opacity: 0.3;
          pointer-events: none;
          z-index: 0;
        }

        @keyframes cardGlowPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        .card-glow-pulse { animation: cardGlowPulse 4s ease-in-out infinite; }

        /* Sticky CTA bar */
        .sticky-cta-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 900;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          background: rgba(7, 8, 16, 0.96);
          backdrop-filter: blur(24px);
          border-top: 1px solid rgba(245,166,35,0.2);
          gap: 12px;
          transform: translateY(100%);
          transition: transform 0.4s cubic-bezier(0.16,1,0.3,1);
        }
        .sticky-cta-bar.visible { transform: translateY(0); }

        @keyframes pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(0,200,150,0.4); }
          50% { opacity: 0.85; box-shadow: 0 0 0 6px rgba(0,200,150,0); }
        }
      `}</style>

      {/* ── STICKY MOBILE CTA BAR ── */}
      {width < 768 && (
        <div className={`sticky-cta-bar${showStickyBar ? ' visible' : ''}`}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Ready to trade?</div>
            <div style={{ fontSize: '11px', color: 'rgba(160,175,210,0.7)' }}>Live rate: 1 USD = {liveRate.toFixed(2)} ETB</div>
          </div>
          <button onClick={onGetStarted} style={{ background: 'linear-gradient(135deg, #F5A623, #D88E10)', color: '#0A0C12', fontWeight: 800, fontSize: '14px', padding: '12px 24px', borderRadius: '12px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Start Trading →
          </button>
        </div>
      )}

      {!prefersReducedMotion && (
        <div className={`cursor-trail ${cursorHovered ? 'hovered' : ''}`} style={{ left: `${cursorPos.x}px`, top: `${cursorPos.y}px` }} />
      )}



      {/* ── NAVBAR ── */}
      <nav style={{
        position: 'fixed', top: width < 768 ? '10px' : '20px', left: '50%', transform: 'translateX(-50%)',
        width: width < 768 ? 'calc(100% - 24px)' : 'calc(100% - 48px)', maxWidth: '1360px', height: width < 768 ? '60px' : '72px',
        background: 'rgba(10, 10, 10, 0.82)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid var(--border)', borderRadius: width < 768 ? '16px' : '24px', zIndex: 1000, transition: 'all 0.3s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: width < 768 ? '0 16px' : '0 28px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <Logo size={width < 768 ? 28 : 34} showText={true} />
        </div>
        
        {width > 1080 ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'nowrap' }}>
              {[
                { id: 'trade', label: 'Trade', target: '#hero' },
                { id: 'how-it-works', label: 'How It Works', target: '#how-it-works' },
                { id: 'features', label: 'Features', target: '#features' },
                { id: 'funded', label: 'Funded Accounts', target: '#funded-accounts', isNew: true },
                { id: 'security', label: 'Security', target: '#security' },
                { id: 'reviews', label: 'Reviews', target: '#reviews' },
                { id: 'faq', label: 'FAQ', target: '#faq' },
              ].map(link => (
                <a
                  key={link.id}
                  href={link.target}
                  className="nav-item-saas"
                  style={{
                    fontSize: '13.5px',
                    padding: '7px 11px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    position: 'relative'
                  }}
                >
                  {link.label}
                  {link.isNew && (
                    <span style={{
                      background: 'linear-gradient(135deg, #F5A623, #D88E10)',
                      color: '#0A0C12',
                      fontSize: '9px',
                      fontWeight: 800,
                      padding: '2px 5px',
                      borderRadius: '5px',
                      lineHeight: 1,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase'
                    }}>
                      NEW
                    </span>
                  )}
                </a>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
              <a
                href="https://t.me/EthioSwap_bot"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(0, 136, 204, 0.15)',
                  border: '1px solid rgba(0, 136, 204, 0.45)',
                  color: '#38bdf8',
                  fontSize: '13px',
                  fontWeight: 700,
                  padding: '7px 12px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                }}
              >
                <span>✈️</span> @EthioSwap_bot
              </a>
              <button onClick={onSignIn} style={{ background: 'transparent', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer', padding: '8px 14px', fontSize: '14px' }}>Log in</button>
              <button onClick={onGetStarted} className="btn-saas-primary" style={{ padding: '10px 20px', fontSize: '14px', borderRadius: '12px' }}>Get Started</button>
            </div>
          </>
        ) : (
          <button onClick={() => setMobileMenuOpen(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
        )}
      </nav>

      {/* ── MOBILE MENU OVERLAY (Item 16) ── */}
      {mobileMenuOpen && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          background: '#0a0a0a', 
          zIndex: 9999, 
          display: 'flex', 
          flexDirection: 'column', 
          padding: '24px', 
          overflowY: 'auto',
          animation: 'slideDownMenu 250ms ease-out' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <Logo size={34} showText={true} />
            <button onClick={() => setMobileMenuOpen(false)} style={{ background: 'none', border: 'none', color: '#F5A623', fontSize: '28px', cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
            {[
              { label: 'Trade & P2P', target: '#hero', icon: 'ti-arrows-left-right' },
              { label: 'Telegram Bot (@EthioSwap_bot)', target: 'https://t.me/EthioSwap_bot', icon: 'ti-brand-telegram', isExternal: true, isNew: true },
              { label: 'How It Works', target: '#how-it-works', icon: 'ti-list-numbers' }, 
              { label: 'Features & Security', target: '#features', icon: 'ti-shield-check' }, 
              { label: 'Funded Accounts & Brokers', target: '#funded-accounts', icon: 'ti-trending-up', isNew: true }, 
              { label: 'Trust & Escrow', target: '#security', icon: 'ti-lock' }, 
              { label: 'Trader Reviews', target: '#reviews', icon: 'ti-star' }, 
              { label: 'FAQ', target: '#faq', icon: 'ti-help' }
            ].map((link, idx, arr) => (
              <div key={link.label}>
                <a href={link.target} onClick={() => setMobileMenuOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#c8c8c8', textDecoration: 'none', fontSize: '17px', fontWeight: 600, padding: '15px 8px', transition: 'color 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.color = '#F5A623'} onMouseOut={e => e.currentTarget.style.color = '#c8c8c8'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className={`ti ${link.icon}`} style={{ color: '#F5A623', fontSize: '18px' }} />
                    <span>{link.label}</span>
                  </div>
                  {link.isNew && (
                    <span style={{
                      background: 'linear-gradient(135deg, #F5A623, #D88E10)',
                      color: '#0A0C12',
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '3px 7px',
                      borderRadius: '6px'
                    }}>
                      NEW
                    </span>
                  )}
                </a>
                {idx < arr.length - 1 && <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.05)', width: '100%' }} />}
              </div>
            ))}
          </div>
          <div style={{ marginTop: '24px', paddingBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button onClick={() => { setMobileMenuOpen(false); onSignIn(); }} className="cta-btn-gold" style={{ width: '100%', height: '48px', fontSize: '16px', borderRadius: '10px' }}>Sign In</button>
            <button onClick={() => { setMobileMenuOpen(false); onGetStarted(); }} style={{ width: '100%', height: '44px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: '#fff', fontSize: '15px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Get Started</button>
          </div>
        </div>
      )}

      {/* ── HERO SECTION ── */}
      <header id="hero" style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', padding: width < 768 ? '100px 16px 40px' : '120px 24px 60px', position: 'relative', overflow: 'hidden' }}>
        <div className="orb" style={{ top: '-100px', left: '-100px', width: '800px', height: '800px' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />

        <div style={{ maxWidth: '1300px', margin: '0 auto', width: '100%', zIndex: 10, position: 'relative' }}>
          <div className="reveal" style={{ display: 'grid', gridTemplateColumns: width < 1024 ? '1fr' : '1.1fr 0.9fr', gap: width < 1024 ? '40px' : '80px', alignItems: 'center' }}>
            
            {/* Left Content */}
            <div style={{ textAlign: width < 1024 ? 'center' : 'left' }}>
              <div style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '10px', 
                background: 'rgba(245, 166, 35, 0.05)', 
                border: '1px solid rgba(245, 166, 35, 0.1)', 
                borderRadius: '50px', 
                padding: '8px 20px', 
                marginBottom: '24px',
                maxWidth: '100%',
                boxSizing: 'border-box'
              }}>
                <span style={{ width: '8px', height: '8px', background: 'var(--gold)', borderRadius: '50%', boxShadow: '0 0 10px var(--gold)', flexShrink: 0 }} />
                <span style={{ fontSize: width < 768 ? '11px' : '13px', fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1.2 }}>Ethiopia's trusted USDT ↔ ETB exchange</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', opacity: 0.8 }}>
                <div style={{ height: '1px', width: '30px', background: 'var(--gold)' }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gold)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Secure P2P Ecosystem</span>
              </div>

              <h1 className="serif-title" style={{ fontSize: width < 768 ? '42px' : '82px', lineHeight: 1.1, color: '#ffffff', margin: '0 0 20px 0', fontWeight: 800 }}>
                Swap USD to<br />
                <span style={{ color: 'var(--gold)' }}>ETB</span> with <span style={{ color: 'var(--accent-green)' }}>Trust</span>
              </h1>

              <div style={{ height: '4px', width: '100px', background: 'var(--gold)', marginBottom: '32px', borderRadius: '2px', display: width < 1024 ? 'none' : 'block' }} />

              <p style={{ fontSize: width < 768 ? '16px' : '20px', color: 'var(--text-dim)', lineHeight: 1.6, maxWidth: width < 1024 ? '100%' : '580px', marginBottom: '32px' }}>
                Access the most secure P2P platform in Ethiopia. Trade USDT for Ethiopian Birr instantly at premium rates with multi-bank support and 100% collateralized escrow.
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: width < 1024 ? 'center' : 'flex-start', marginBottom: '48px' }}>
                <button onClick={onGetStarted} className="btn-saas-primary" style={{ fontSize: width < 768 ? '16px' : '18px', padding: width < 768 ? '14px 28px' : '18px 36px' }}>
                  Start trading
                </button>
                <a
                  href="https://t.me/EthioSwap_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: 'linear-gradient(135deg, #0088cc, #0288d1)',
                    color: '#ffffff',
                    fontSize: width < 768 ? '15px' : '17px',
                    padding: width < 768 ? '14px 24px' : '18px 32px',
                    borderRadius: '14px',
                    fontWeight: 800,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 8px 24px rgba(0, 136, 204, 0.35)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <span style={{ fontSize: '18px' }}>✈️</span> Trade on Telegram (@EthioSwap_bot)
                </a>
                <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} 
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: '#fff', fontSize: width < 768 ? '16px' : '18px', padding: width < 768 ? '14px 28px' : '18px 36px', borderRadius: '14px', fontWeight: 700, cursor: 'pointer' }}>
                  How It Works
                </button>
              </div>

              {/* Stats Row */}
              <div style={{ display: 'flex', gap: width < 768 ? '20px' : '36px', flexWrap: 'wrap', justifyContent: width < 1024 ? 'center' : 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: width < 768 ? '20px' : '26px', fontWeight: 800, color: '#fff', fontFamily: 'JetBrains Mono, monospace' }}>
                    <AnimatedCounter value={stats.traders} suffix="+" />
                  </span>
                  <span style={{ fontSize: width < 768 ? '11px' : '13px', color: 'var(--text-dim)', fontWeight: 600 }}>Active traders</span>
                </div>
                <div style={{ width: '1px', height: '24px', background: 'var(--border)', alignSelf: 'center' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: width < 768 ? '20px' : '26px', fontWeight: 800, color: '#fff', fontFamily: 'JetBrains Mono, monospace' }}>
                    <AnimatedCounter value={stats.deposited} prefix="$" />
                  </span>
                  <span style={{ fontSize: width < 768 ? '11px' : '13px', color: 'var(--text-dim)', fontWeight: 600 }}>USDT Deposited</span>
                </div>
                <div style={{ width: '1px', height: '24px', background: 'var(--border)', alignSelf: 'center' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: width < 768 ? '20px' : '26px', fontWeight: 800, color: '#fff', fontFamily: 'JetBrains Mono, monospace' }}>
                    <AnimatedCounter value={stats.traded} prefix="$" />
                  </span>
                  <span style={{ fontSize: width < 768 ? '11px' : '13px', color: 'var(--text-dim)', fontWeight: 600 }}>USDT Traded</span>
                </div>
                <div style={{ width: '1px', height: '24px', background: 'var(--border)', alignSelf: 'center' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: width < 768 ? '20px' : '26px', fontWeight: 800, color: '#fff', fontFamily: 'JetBrains Mono, monospace' }}>
                    <AnimatedCounter value={stats.avg} suffix="★" isDecimal={true} />
                  </span>
                  <span style={{ fontSize: width < 768 ? '11px' : '13px', color: 'var(--text-dim)', fontWeight: 600 }}>User rating</span>
                </div>
              </div>
            </div>

            {/* Right Side: 3D Paper Money (Hero default) */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: width < 768 ? '300px' : '500px',
              marginTop: width < 1024 ? '32px' : '0',
            }}>
              <FloatingBill size={width < 768 ? 'sm' : 'lg'} prefersReducedMotion={prefersReducedMotion} mode="standard" interactive={false} />
            </div>
          </div>
        </div>
      </header>

      {/* Visual Connector: Hero -> Why Us */}


      {/* ── HOW IT WORKS TIMELINE (Page 2 of sketch) ── */}
      <section id="how-it-works" style={{ padding: '120px 24px', background: 'rgba(255,255,255,0.01)', position: 'relative', zIndex: 10 }}>
        <div className="section-glow" style={{ top: '20%', left: '5%' }} />
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="reveal-on-scroll" style={{ 
            display: 'grid', 
            gridTemplateColumns: width < 1024 ? '1fr' : '1fr 1fr', 
            gap: '80px', 
            alignItems: 'center' 
          }}>
            {/* Left Column: /360view 3D Panoramic Bilateral Inspection */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center', 
              minHeight: width < 768 ? '360px' : '520px',
              order: width < 1024 ? 2 : 1,
              marginTop: width < 1024 ? '32px' : '0',
              position: 'relative',
            }}>
              <FloatingBill
                size={width < 768 ? 'sm' : 'lg'}
                prefersReducedMotion={prefersReducedMotion}
                mode="360"
              />
            </div>

            {/* Right Column: Secure Asset Card + Simple & Transparent Steps */}
            <div style={{ order: width < 1024 ? 1 : 2 }}>
              {/* Premium $ Secure Asset / USD Reserve Card */}
              <div className="premium-card" style={{
                background: 'linear-gradient(145deg, rgba(20,20,24,0.9) 0%, rgba(10,10,14,0.95) 100%)',
                border: '1px solid rgba(245,166,35,0.18)',
                borderRadius: '24px',
                padding: '28px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(20px)',
                marginBottom: '40px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', background: 'radial-gradient(circle, rgba(0,200,150,0.15) 0%, transparent 70%)', filter: 'blur(10px)', pointerEvents: 'none' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{
                    width: '64px', height: '64px',
                    borderRadius: '16px',
                    background: 'rgba(245,166,35,0.08)',
                    border: '1.5px solid var(--gold)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '32px', fontWeight: '900', color: 'var(--gold)',
                    boxShadow: '0 0 20px rgba(245,166,35,0.2)',
                    flexShrink: 0
                  }}>
                    $
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>SECURE ASSETS</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '2px' }}>USD Reserve & Escrow</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.4 }}>Every trade is held in secure, fully collateralized escrow.</div>
                  </div>
                </div>
              </div>

              {/* Title & Timeline Header */}
              <div style={{ textAlign: width < 1024 ? 'center' : 'left', marginBottom: '32px' }}>
                <h2 className="serif-title" style={{ fontSize: width < 768 ? '36px' : '48px', color: '#fff', margin: '0 0 16px 0' }}>How It Works</h2>
                <p style={{ fontSize: '16px', color: 'var(--text-dim)' }}>Three simple steps to secure your first USDT exchange.</p>
              </div>

              {/* Steps (Horizontal/Vertical Timeline) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {[
                  { step: '01', t: 'Create & Verify Account', d: 'Complete quick verification to secure your profile.', icon: '👤' },
                  { step: '02', t: 'Select a P2P Listing', d: 'Compare live market rates and pick your preferred bank method.', icon: '🔍' },
                  { step: '03', t: 'Complete the Trade', d: 'Escrow automatically secures the transaction until funds arrive.', icon: '🛡️' },
                ].map((step, idx) => (
                  <div key={idx} className="reveal-on-scroll" style={{ display: 'flex', alignItems: 'center', gap: '20px', transitionDelay: `${idx * 150}ms` }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--bg)', border: '2px solid var(--gold)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0, boxShadow: '0 0 15px rgba(245, 166, 35, 0.1)' }}>
                      {step.icon}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '18px', color: '#fff', fontWeight: 700, marginBottom: '4px' }}>{step.t}</h3>
                      <p style={{ fontSize: '14px', color: 'var(--text-dim)', margin: 0 }}>{step.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US SECTION (Page 3 of sketch) ── */}
      <section id="why-us" style={{ padding: '120px 24px', position: 'relative', zIndex: 10 }}>
        <div className="section-glow" style={{ top: '-100px', right: '10%' }} />
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="reveal-on-scroll" style={{ 
            display: 'grid', 
            gridTemplateColumns: width < 1024 ? '1fr' : '1.2fr 0.8fr', 
            gap: '80px', 
            alignItems: 'center' 
          }}>
            {/* Left side - why choose content (4 feature cards in 2x2 grid) */}
            <div>
              <div className="reveal-on-scroll" style={{ textAlign: width < 1024 ? 'center' : 'left', marginBottom: '40px' }}>
                <h2 className="serif-title" style={{ fontSize: width < 768 ? '36px' : '56px', color: '#fff', margin: '0 0 20px 0' }}>
                  Why Trade on <span style={{ color: 'var(--gold)' }}>EthioSwap</span>
                </h2>
                <p style={{ maxWidth: '600px', margin: width < 1024 ? '0 auto' : '0', fontSize: '18px', color: 'var(--text-dim)', lineHeight: 1.6 }}>
                  Ethiopia's premier fiat-to-USDT exchange, engineered for speed, reliability, and absolute security.
                </p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: width < 600 ? '1fr' : '1fr 1fr', gap: '20px' }}>
                {[
                  { t: 'Escrow Protection', d: 'USDT is locked in automated multi-sig escrow until payment is confirmed.', ic: '🔒' },
                  { t: 'Verified Community', d: 'Mandatory KYC verification ensures you only trade with verified, trusted members.', ic: '🛡️' },
                  { t: 'Instant Settlement', d: 'Our automated transaction matching enables fast swaps and real-time payouts.', ic: '⚡' },
                  { t: 'Dedicated 24/7 Support', d: 'Around-the-clock dispute resolution and technical support for your peace of mind.', ic: '🎧' },
                ].map((ft, idx) => (
                  <div key={idx} className="premium-card reveal-on-scroll" style={{ padding: '24px', transitionDelay: `${idx * 100}ms` }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--gold-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', border: '1px solid var(--gold)', marginBottom: '16px' }}>
                      {ft.ic}
                    </div>
                    <h3 style={{ fontSize: '18px', color: '#fff', fontWeight: 700, margin: '0 0 8px 0' }}>{ft.t}</h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-dim)', lineHeight: 1.4, margin: 0 }}>{ft.d}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right side visual: /explodedview 4-Layer Security Architecture */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center', 
              minHeight: width < 768 ? '440px' : '560px',
              marginTop: width < 1024 ? '32px' : '0',
              position: 'relative',
            }}>
              <FloatingBill 
                size={width < 768 ? 'sm' : 'lg'} 
                prefersReducedMotion={prefersReducedMotion} 
                mode="exploded" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* Visual Connector: How It Works -> Features */}


      {/* ── FEATURED TRADE SECTIONS (Alternating) ── */}
      <section id="features" style={{ padding: '120px 24px', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* Feature 1: Spacer for Bill on Left, Text on Right */}
          <div className="reveal-on-scroll" style={{ 
            display: 'grid', 
            gridTemplateColumns: width < 1024 ? '1fr' : '1fr 1fr', 
            gap: width < 768 ? '40px' : '80px', 
            alignItems: 'center', 
            marginBottom: width < 768 ? '80px' : '160px' 
          }}>
            {/* Left side: Scrolling bills */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: width < 768 ? '320px' : '380px', order: width < 1024 ? 2 : 1 }}>
              <AutoScrollingBills direction="up" speed="18s" size="md" />
            </div>

            <div style={{ order: width < 1024 ? 1 : 2 }}>
              <div style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Lightning Fast</div>
              <h2 className="serif-title" style={{ fontSize: '48px', color: '#fff', marginBottom: '24px' }}>Instant Peer-to-Peer Transfers</h2>
              <p style={{ fontSize: '18px', color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: '32px' }}>
                Transfer digital assets to any EthioSwap user instantly. No waiting for blockchain confirmations when trading internally.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {['Zero internal fees', 'Real-time notifications', 'Multi-bank support'].map(item => (
                  <li key={item} style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#fff', fontWeight: 600 }}>
                    <span style={{ color: 'var(--accent-green)' }}>✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Feature 2: Right Text, Left Card */}
          <div className="reveal-on-scroll" style={{ 
            display: 'grid', 
            gridTemplateColumns: width < 1024 ? '1fr' : '1fr 1fr', 
            gap: width < 768 ? '40px' : '80px', 
            alignItems: 'center' 
          }}>
            {/* Left side visual: /Xray Forensic UV-A 365nm Scan */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              minHeight: width < 768 ? '360px' : '520px', 
              order: width < 1024 ? 2 : 1,
              position: 'relative',
            }}>
              <FloatingBill 
                size={width < 768 ? 'sm' : 'lg'} 
                prefersReducedMotion={prefersReducedMotion} 
                mode="xray" 
              />
            </div>
            <div style={{ order: width < 1024 ? 1 : 2 }}>
              <div style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Unmatched Security</div>
              <h2 className="serif-title" style={{ fontSize: '48px', color: '#fff', marginBottom: '24px' }}>The Gold Standard of P2P Security</h2>
              <p style={{ fontSize: '18px', color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: '32px' }}>
                We use multi-layer security protocols and automated escrow systems to ensure your assets are protected at all times. Every transaction is monitored by our security engine.
              </p>
              <button onClick={() => {
                const sec = document.getElementById('security');
                if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }} className="btn-saas-primary">Learn About Security</button>
            </div>
          </div>

        </div>
      </section>

      {/* Visual Connector: Features -> Market */}




      {/* ── TRUST & SECURITY ── */}
      <section id="security" style={{ padding: '80px 24px', background: '#0d0d0d', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <span style={{ fontSize: '11px', color: '#00C896', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>TRUST & SECURITY</span>
            <h2 className="serif-title" style={{ fontSize: '42px', color: '#fff', margin: '8px 0 16px 0', fontWeight: 400 }}>Your Security is Our Priority</h2>
          </div>
          
          {/* 2x2 grid (Item 4) */}
          <div style={{ display: 'grid', gridTemplateColumns: width > 768 ? '1fr 1fr' : '1fr', gap: '20px' }}>
            {[
              { t: 'Escrow Lock', d: 'Every trade amount is locked in escrow before payment. Funds are cryptographically secured and can only be released by the platform.', ic: '🔐' },
              { t: 'Identity Verification', d: 'Mandatory KYC with National ID + live selfie. Every trader is a real, verified person. No anonymity, no fraud.', ic: '🪪' },
              { t: 'Dispute Resolution', d: 'Dedicated support team reviews evidence and resolves disputes fairly. Your funds are safe throughout.', ic: '⚖️' },
              { t: '2FA & PIN Lock', d: 'Secure your account with two-factor authentication and a secure 6-digit PIN lock. Your keys stay on your device.', ic: '🔑' },
            ].map((ft, idx) => (
              <div key={idx} className="trust-card" style={{ background: '#141827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '28px', transition: 'transform 0.2s, border-color 0.2s' }}>
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>{ft.ic}</div>
                <h3 style={{ fontSize: '16px', color: '#fff', fontWeight: 600, margin: '0 0 8px 0' }}>{ft.t}</h3>
                <p style={{ fontSize: '13px', color: '#c8c8c8', lineHeight: 1.6, margin: 0 }}>{ft.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Visual Connector: Security -> Reviews */}


      {/* ── TESTIMONIALS / REVIEWS (Item 3) ── */}
      <section id="reviews" style={{ padding: '80px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <span style={{ fontSize: '11px', color: '#00C896', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>REVIEWS</span>
            <h2 className="serif-title" style={{ fontSize: '42px', color: '#fff', margin: '8px 0 16px 0', fontWeight: 400 }}>Trusted by Ethiopian Traders</h2>
            <p style={{ fontSize: '14px', color: '#c8c8c8', lineHeight: 1.7 }}>
              All reviews are posted by verified EthioSwap traders after completing real trades.
            </p>
          </div>

          {/* Leave a review button */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '48px' }}>
            {user ? (
              <button onClick={() => setShowReviewModal(true)} className="cta-btn-outline" style={{ border: '2px solid #F5A623', color: '#F5A623', fontWeight: 700 }}>
                Write a Review
              </button>
            ) : (
              <button onClick={onSignIn} className="cta-btn-outline" style={{ border: '1px solid rgba(255,255,255,0.2)' }}>
                Sign in to leave a review
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {reviews.map((r, idx) => (
              <div key={r.id || idx} className="review-card testimonial-card">
                {/* Quotation mark decoration */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {(() => {
                      const rating = Math.max(0, Math.min(5, Math.round(Number(r.rating) || 5)));
                      return (
                        <>
                          {Array.from({ length: rating }).map((_, i) => <span key={i} style={{ color: '#F5A623', fontSize: '15px' }}>★</span>)}
                          {Array.from({ length: 5 - rating }).map((_, i) => <span key={i} style={{ color: '#2a2a2a', fontSize: '15px' }}>★</span>)}
                        </>
                      );
                    })()}
                  </div>
                  <span style={{ fontSize: '40px', color: 'rgba(245,166,35,0.12)', fontFamily: 'Georgia, serif', lineHeight: 1, marginTop: '-8px' }}>"</span>
                </div>
                <p style={{ fontSize: '14px', color: '#c8c8c8', lineHeight: 1.7, margin: '0 0 20px 0', fontStyle: 'italic' }}>"{r.content}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(245,166,35,0.2), rgba(245,166,35,0.05))', border: '1px solid rgba(245,166,35,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5A623', fontWeight: 800, fontSize: '16px', flexShrink: 0 }}>
                    {(r.username || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', color: '#fff', fontWeight: 700 }}>@{r.username}</div>
                    <div style={{ fontSize: '11px', color: '#8b92a8', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <span style={{ color: '#00C896', fontWeight: 700 }}>✓ Verified Trader</span>
                      <span>•</span>
                      <span>{getRelativeTime(r.createdAt || r.created_at || r._creationTime)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FUNDED ACCOUNTS SECTION ── */}
      <section id="funded-accounts" style={{ padding: '120px 24px', background: 'linear-gradient(180deg, #070810 0%, #0B0D1A 60%, #0a0a0f 100%)', borderTop: '1px solid rgba(245,166,35,0.08)', position: 'relative', overflow: 'hidden', zIndex: 10 }}>
        {/* Premium background layers */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse 900px 600px at 15% 30%, rgba(245,166,35,0.05) 0%, transparent 60%), radial-gradient(ellipse 700px 500px at 85% 70%, rgba(108,92,231,0.06) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(245,166,35,0.3), rgba(108,92,231,0.3), transparent)' }} />
        {/* Subtle grid overlay */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none', maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)' }} />

        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

          {/* ── Section Header ── */}
          <div className="reveal-on-scroll" style={{ textAlign: 'center', marginBottom: '80px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'linear-gradient(135deg, rgba(245,166,35,0.08), rgba(245,166,35,0.04))', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '50px', padding: '10px 24px', marginBottom: '28px', backdropFilter: 'blur(10px)' }}>
              <span style={{ fontSize: '16px' }}>📈</span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#F5A623', letterSpacing: '0.12em', textTransform: 'uppercase' }}>NEW — Prop Trading for Ethiopians</span>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00C896', boxShadow: '0 0 8px #00C896', animation: 'pulse 2s infinite' }} />
            </div>
            <h2 className="serif-title" style={{ fontSize: width < 768 ? '38px' : '62px', color: '#fff', margin: '0 0 24px 0', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              Buy{' '}<span style={{ background: 'linear-gradient(135deg, #F5A623, #FFD700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Funded Accounts</span>
              <br />
              <span style={{ background: 'linear-gradient(135deg, #00C896, #00E5B0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>From Ethiopia</span>
            </h2>
            <p style={{ fontSize: width < 768 ? '15px' : '18px', color: 'rgba(180,190,220,0.8)', maxWidth: '640px', margin: '0 auto', lineHeight: 1.75 }}>
              Access the world's top prop trading firms — FTMO, The5ers, Topstep, and 10+ more — directly from Ethiopia.
              Pay with your EthioSwap wallet. Fully automatic. No gatekeeping.
            </p>
          </div>

          {/* ── How It Works — 3 Steps ── */}
          <div className="reveal-on-scroll" style={{ display: 'grid', gridTemplateColumns: width < 768 ? '1fr' : 'repeat(3, 1fr)', gap: '16px', marginBottom: '80px' }}>
            {[
              { step: '01', icon: '🔍', title: 'Browse & Choose', desc: 'Search 13+ top prop firms verified to work in Ethiopia. Filter by account size, price, and trading style.' },
              { step: '02', icon: '💳', title: 'Pay Instantly', desc: 'Enter your name, father\'s name, and email. Pay from your EthioSwap USDT wallet — no bank transfer needed.' },
              { step: '03', icon: '🚀', title: 'Get Credentials', desc: 'We purchase the account on your behalf. Login credentials delivered to your email within 24 hours.' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'linear-gradient(145deg, rgba(18,22,38,0.95), rgba(10,12,22,0.98))', border: '1px solid rgba(245,166,35,0.1)', borderRadius: '24px', padding: '32px 28px', position: 'relative', overflow: 'hidden', transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)', cursor: 'default' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,166,35,0.3)'; e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 20px 60px rgba(245,166,35,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(245,166,35,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                {/* Step number watermark */}
                <div style={{ position: 'absolute', top: '-16px', right: '20px', fontSize: '80px', fontWeight: 900, color: 'rgba(245,166,35,0.04)', fontFamily: 'JetBrains Mono, monospace', pointerEvents: 'none', lineHeight: 1 }}>{s.step}</div>
                {/* Top accent line */}
                <div style={{ position: 'absolute', top: 0, left: '28px', right: '28px', height: '2px', background: 'linear-gradient(90deg, transparent, rgba(245,166,35,0.4), transparent)', borderRadius: '0 0 4px 4px' }} />
                <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(245,166,35,0.12), rgba(245,166,35,0.04))', border: '1px solid rgba(245,166,35,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', marginBottom: '20px' }}>{s.icon}</div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(245,166,35,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Step {s.step}</div>
                <h3 style={{ fontSize: '19px', fontWeight: 700, color: '#fff', margin: '0 0 12px 0' }}>{s.title}</h3>
                <p style={{ fontSize: '14px', color: 'rgba(160,175,210,0.8)', lineHeight: 1.7, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>

          {/* ── 🇪🇹 Firms That Accept Ethiopian Traders ── */}
          <div className="reveal-on-scroll" style={{ marginBottom: '80px' }}>
            {/* Sub-section header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '4px', height: '44px', background: 'linear-gradient(180deg, #F5A623, rgba(245,166,35,0.1))', borderRadius: '4px' }} />
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(245,166,35,0.7)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>🇪🇹 Verified for Ethiopian Traders</div>
                  <div style={{ fontSize: width < 768 ? '22px' : '28px', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>Firms That Accept Ethiopian Traders</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.2)', borderRadius: '50px', padding: '8px 18px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#00C896', boxShadow: '0 0 8px #00C896' }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#00C896' }}>10+ Firms Active</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: width < 480 ? '1fr 1fr' : width < 768 ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)', gap: '14px' }}>
              {[
                { name: 'FTMO', emoji: '🏆', color: '#F5A623', size: '$10K–$200K', badge: 'Most Popular' },
                { name: 'The5ers', emoji: '🌍', color: '#00C896', size: '$5K–$100K', badge: 'Best Value' },
                { name: 'Topstep', emoji: '📊', color: '#6C5CE7', size: '$50K–$150K', badge: 'Futures' },
                { name: 'E8 Funding', emoji: '⚡', color: '#E056FD', size: '$25K–$250K', badge: 'High Capital' },
                { name: 'FunderPro', emoji: '💎', color: '#4EC9F0', size: '$10K–$200K', badge: 'Fast Payout' },
                { name: 'Alpha Capital', emoji: '🔥', color: '#FF4D6D', size: '$10K–$100K', badge: 'Low Rules' },
                { name: 'City Traders', emoji: '🏙️', color: '#43E97B', size: '$5K–$100K', badge: 'Beginner' },
                { name: 'Funded Next', emoji: '🚀', color: '#F7971E', size: '$10K–$200K', badge: 'Stellar Plan' },
                { name: 'Maven Trading', emoji: '📈', color: '#00C896', size: '$25K–$100K', badge: 'Pro Desk' },
                { name: 'GFT', emoji: '💰', color: '#F5A623', size: '$10K–$100K', badge: 'Crypto OK' },
              ].map((firm, i) => (
                <div key={i}
                  onClick={onGetStarted}
                  style={{ background: 'linear-gradient(145deg, rgba(14,18,32,0.95), rgba(10,12,22,0.98))', border: `1px solid rgba(${firm.color === '#F5A623' ? '245,166,35' : firm.color === '#00C896' ? '0,200,150' : firm.color === '#6C5CE7' ? '108,92,231' : '255,255,255'},0.12)`, borderRadius: '18px', padding: '20px 14px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)', position: 'relative', overflow: 'hidden' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = firm.color + '45'; e.currentTarget.style.transform = 'translateY(-5px) scale(1.02)'; e.currentTarget.style.boxShadow = `0 16px 40px ${firm.color}12`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  {/* Glow layer */}
                  <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 0%, ${firm.color}08 0%, transparent 60%)`, pointerEvents: 'none' }} />
                  <div style={{ fontSize: '28px', marginBottom: '10px', position: 'relative' }}>{firm.emoji}</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff', marginBottom: '5px', position: 'relative' }}>{firm.name}</div>
                  <div style={{ fontSize: '10px', color: firm.color, fontWeight: 700, marginBottom: '8px', position: 'relative' }}>{firm.size}</div>
                  <div style={{ display: 'inline-block', background: firm.color + '15', border: `1px solid ${firm.color}25`, borderRadius: '20px', padding: '2px 8px', fontSize: '9px', fontWeight: 700, color: firm.color, textTransform: 'uppercase', letterSpacing: '0.05em', position: 'relative' }}>{firm.badge}</div>
                  {/* Ethiopian verified badge */}
                  <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '11px' }}>🇪🇹</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Deposit to Forex & Synthetic Brokers ── */}
          <div className="reveal-on-scroll" style={{ marginBottom: '80px' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(0,200,150,0.05) 0%, rgba(10,14,28,0.98) 50%, rgba(0,200,150,0.03) 100%)', border: '1px solid rgba(0,200,150,0.18)', borderRadius: '28px', padding: width < 768 ? '28px 20px' : '44px 48px', position: 'relative', overflow: 'hidden' }}>
              {/* Decorative corner accent */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #00C896, rgba(0,200,150,0.3), transparent)' }} />
              <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(0,200,150,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '28px', marginBottom: '36px' }}>
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, rgba(0,200,150,0.12), rgba(0,200,150,0.05))', border: '1px solid rgba(0,200,150,0.28)', borderRadius: '30px', padding: '6px 16px', marginBottom: '18px' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#00C896', boxShadow: '0 0 10px rgba(0,200,150,0.8)', animation: 'pulse 2s infinite' }} />
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#00C896', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Direct Broker Funding</span>
                  </div>
                  <h3 style={{ fontSize: width < 768 ? '22px' : '32px', fontWeight: 800, color: '#fff', margin: '0 0 14px 0', lineHeight: 1.2, letterSpacing: '-0.01em' }}>Deposit to Forex &amp; Synthetic<br />Brokers from Ethiopia</h3>
                  <p style={{ fontSize: '15px', color: 'rgba(160,175,210,0.8)', margin: 0, maxWidth: '560px', lineHeight: 1.75 }}>
                    Can't fund your Exness, Deriv, or XM account with local bank cards? We bridge the gap — deposit directly from your EthioSwap USDT wallet and we execute it for you.
                  </p>
                  {/* Key stats row */}
                  <div style={{ display: 'flex', gap: '24px', marginTop: '24px', flexWrap: 'wrap' }}>
                    {[['1–3 hrs', 'Deposit Speed'], ['6 Brokers', 'Supported'], ['USDT', 'Payment Method']].map(([val, lbl]) => (
                      <div key={lbl}>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#00C896', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{val}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(160,175,210,0.6)', marginTop: '3px', fontWeight: 600 }}>{lbl}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={onGetStarted} style={{ background: 'linear-gradient(135deg, #00C896 0%, #00A87A 100%)', color: '#05140F', fontWeight: 800, fontSize: '15px', padding: '16px 32px', borderRadius: '16px', border: 'none', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)', display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,200,150,0.2)', flexShrink: 0, alignSelf: 'flex-start' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,200,150,0.35)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,200,150,0.2)'; }}
                >
                  <span>🏦</span> Deposit to Broker
                </button>
              </div>

              {/* Broker cards grid */}
              <div style={{ display: 'grid', gridTemplateColumns: width < 480 ? '1fr 1fr' : width < 768 ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)', gap: '12px' }}>
                {[
                  { name: 'Exness', abbr: 'EX', color: '#FFB800', desc: 'MT4 / MT5', status: 'Active' },
                  { name: 'Deriv', abbr: 'DV', color: '#FF444F', desc: 'Synthetics', status: 'Active' },
                  { name: 'XM Global', abbr: 'XM', color: '#E0E0E0', desc: 'Micro / Std', status: 'Active' },
                  { name: 'JustMarkets', abbr: 'JM', color: '#4A90D9', desc: '1:3000 Lev.', status: 'Active' },
                  { name: 'HFM', abbr: 'HF', color: '#FF7A29', desc: 'Cent Accts', status: 'Active' },
                  { name: 'IC Markets', abbr: 'IC', color: '#00D68F', desc: 'Raw ECN', status: 'Active' },
                ].map((b, i) => (
                  <div key={i} style={{ background: 'rgba(6,9,20,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '18px 12px', textAlign: 'center', transition: 'all 0.25s ease', position: 'relative', overflow: 'hidden' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = b.color + '35'; e.currentTarget.style.background = b.color + '08'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(6,9,20,0.8)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    {/* Broker avatar */}
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `linear-gradient(135deg, ${b.color}22, ${b.color}08)`, border: `1px solid ${b.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: '13px', fontWeight: 900, color: b.color, fontFamily: 'JetBrains Mono, monospace' }}>{b.abbr}</div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#fff', marginBottom: '3px' }}>{b.name}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(160,175,210,0.6)', marginBottom: '8px' }}>{b.desc}</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(0,200,150,0.1)', borderRadius: '20px', padding: '2px 8px' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#00C896' }} />
                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#00C896' }}>{b.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Key Benefits ── */}
          <div className="reveal-on-scroll" style={{ display: 'grid', gridTemplateColumns: width < 768 ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '14px', marginBottom: '80px' }}>
            {[
              { icon: '⚡', label: 'Instant Payment', desc: 'Pay from your USDT wallet, zero bank friction', color: '#F5A623' },
              { icon: '🔒', label: 'Auto Processing', desc: 'No admin approval — fully automated pipeline', color: '#6C5CE7' },
              { icon: '🇪🇹', label: 'Ethiopia Friendly', desc: 'Every firm on our list accepts ET traders', color: '#00C896' },
              { icon: '📧', label: '24hr Delivery', desc: 'Credentials sent directly to your inbox', color: '#E056FD' },
            ].map((b, i) => (
              <div key={i} style={{ background: 'linear-gradient(145deg, rgba(14,18,32,0.95), rgba(10,12,22,0.98))', border: `1px solid ${b.color}15`, borderRadius: '20px', padding: '24px 18px', textAlign: 'center', transition: 'all 0.3s ease', position: 'relative', overflow: 'hidden' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = b.color + '35'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 12px 32px ${b.color}10`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = b.color + '15'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '60%', height: '1px', background: `linear-gradient(90deg, transparent, ${b.color}50, transparent)` }} />
                <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: `${b.color}10`, border: `1px solid ${b.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 14px' }}>{b.icon}</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>{b.label}</div>
                <div style={{ fontSize: '12px', color: 'rgba(160,175,210,0.65)', lineHeight: 1.5 }}>{b.desc}</div>
              </div>
            ))}
          </div>

          {/* ── Transparent Fee Structure ── */}
          <div className="reveal-on-scroll">
            <div style={{ background: 'linear-gradient(135deg, rgba(245,166,35,0.05) 0%, rgba(10,12,24,0.98) 40%, rgba(108,92,231,0.04) 100%)', border: '1px solid rgba(245,166,35,0.15)', borderRadius: '28px', padding: width < 768 ? '32px 24px' : '48px 56px', position: 'relative', overflow: 'hidden' }}>
              {/* Top decorative line */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #F5A623, rgba(108,92,231,0.8), transparent)' }} />
              <div style={{ position: 'absolute', bottom: '-100px', right: '-100px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(245,166,35,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '40px' }}>
                {/* Left: Text + Breakdown */}
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '30px', padding: '6px 16px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '14px' }}>💡</span>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#F5A623', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Transparent Fee Structure</span>
                  </div>
                  <h3 style={{ fontSize: width < 768 ? '24px' : '32px', fontWeight: 800, color: '#fff', margin: '0 0 14px 0', lineHeight: 1.2 }}>No Hidden Charges.<br /><span style={{ color: '#F5A623' }}>Only 3% Service Fee.</span></h3>
                  <p style={{ fontSize: '15px', color: 'rgba(160,175,210,0.75)', margin: '0 0 32px 0', lineHeight: 1.7, maxWidth: '480px' }}>
                    A flat <strong style={{ color: '#F5A623' }}>3% service fee</strong> is added on top of the firm's listed plan price. Automatically collected and sent to the EthioSwap admin wallet. What you see is what you pay.
                  </p>

                  {/* Visual fee breakdown */}
                  <div style={{ background: 'rgba(8,10,20,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '24px', maxWidth: '420px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(160,175,210,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '20px' }}>Fee Breakdown — Example</div>
                    {[
                      { label: 'FTMO $100K Plan Price', value: '$499', color: 'rgba(255,255,255,0.9)', bar: 94 },
                      { label: 'EthioSwap Service Fee (3%)', value: '+$15', color: '#FF6B6B', bar: 6 },
                      { label: 'You Pay Total', value: '$514', color: '#F5A623', bar: 100, bold: true },
                    ].map((row) => (
                      <div key={row.label} style={{ marginBottom: row.bold ? 0 : '16px', paddingTop: row.bold ? '16px' : 0, borderTop: row.bold ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '12px', color: row.bold ? 'rgba(220,230,255,0.9)' : 'rgba(160,175,210,0.65)', fontWeight: row.bold ? 700 : 500 }}>{row.label}</span>
                          <span style={{ fontSize: row.bold ? '18px' : '15px', fontWeight: 800, color: row.color, fontFamily: 'JetBrains Mono, monospace' }}>{row.value}</span>
                        </div>
                        {!row.bold && (
                          <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${row.bar}%`, background: row.color === '#FF6B6B' ? 'linear-gradient(90deg, #FF6B6B, #FF4444)' : 'linear-gradient(90deg, #F5A623, #FFD700)', borderRadius: '4px', opacity: 0.8 }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: CTA + Badges */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: width < 768 ? 'flex-start' : 'center', justifyContent: 'center', gap: '16px', minWidth: '200px' }}>
                  <button onClick={onGetStarted} style={{ background: 'linear-gradient(135deg, #F5A623 0%, #D88E10 100%)', color: '#0A0C12', fontWeight: 800, fontSize: '16px', padding: '18px 36px', borderRadius: '16px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)', boxShadow: '0 4px 20px rgba(245,166,35,0.25)', letterSpacing: '-0.01em' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(245,166,35,0.4)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(245,166,35,0.25)'; }}
                  >
                    Browse All Firms →
                  </button>
                  {/* Trust badges */}
                  {[['🔒', 'No hidden charges'], ['✅', 'Auto fee collection'], ['📊', 'Real-time pricing']].map(([ico, lbl]) => (
                    <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '14px' }}>{ico}</span>
                      <span style={{ fontSize: '13px', color: 'rgba(160,175,210,0.65)', fontWeight: 500 }}>{lbl}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── AI RATE PREDICTION WIDGET ── */}
      {rateForecast && (
        <section style={{ padding: '80px 24px', background: 'linear-gradient(180deg, #0a0a0f 0%, #070810 100%)', position: 'relative', overflow: 'hidden', zIndex: 10 }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse 600px 400px at 50% 50%, rgba(108,92,231,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <div className="reveal-on-scroll" style={{ background: 'linear-gradient(135deg, rgba(108,92,231,0.06), rgba(10,12,24,0.98), rgba(0,200,150,0.04))', border: '1px solid rgba(108,92,231,0.2)', borderRadius: '28px', padding: width < 768 ? '28px 20px' : '44px 52px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #6C5CE7, #00C896, transparent)' }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '32px' }}>
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(108,92,231,0.1)', border: '1px solid rgba(108,92,231,0.25)', borderRadius: '30px', padding: '6px 16px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '14px' }}>🤖</span>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#6C5CE7', textTransform: 'uppercase', letterSpacing: '0.1em' }}>AI Rate Forecast</span>
                    <span style={{ fontSize: '9px', background: '#6C5CE7', color: '#fff', padding: '1px 6px', borderRadius: '10px', fontWeight: 700 }}>BETA</span>
                  </div>
                  <h3 style={{ fontSize: width < 768 ? '22px' : '28px', fontWeight: 800, color: '#fff', margin: '0 0 10px 0', lineHeight: 1.2 }}>7-Day Rate Forecast</h3>
                  <p style={{ fontSize: '14px', color: 'rgba(160,175,210,0.7)', margin: '0 0 24px 0', lineHeight: 1.6 }}>
                    Based on EthioSwap P2P trade history. Simple moving average model with {rateForecast.confidence}% data confidence.
                  </p>
                  <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'rgba(160,175,210,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Current Rate</div>
                      <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{rateForecast.current?.toFixed(2)}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(160,175,210,0.5)', marginTop: '3px' }}>ETB per USD</div>
                    </div>
                    <div style={{ width: '1px', background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '11px', color: 'rgba(160,175,210,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Predicted (7d)</div>
                      <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1, color: rateForecast.trend === 'up' ? '#FF6B6B' : rateForecast.trend === 'down' ? '#00C896' : '#F5A623' }}>
                        {rateForecast.predicted7d}
                      </div>
                      <div style={{ fontSize: '11px', marginTop: '3px', color: rateForecast.trend === 'up' ? '#FF6B6B' : rateForecast.trend === 'down' ? '#00C896' : '#F5A623', fontWeight: 700 }}>
                        {rateForecast.trend === 'up' ? '↑ ETB depreciating' : rateForecast.trend === 'down' ? '↓ ETB strengthening' : '→ Stable'}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Visual bar chart */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(160,175,210,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Trend Signal</div>
                  {[['Buy Signal', rateForecast.trend === 'down' ? 92 : 45, '#00C896'], ['Sell Signal', rateForecast.trend === 'up' ? 88 : 35, '#FF6B6B'], ['Hold Signal', rateForecast.trend === 'stable' ? 80 : 50, '#F5A623']].map(([label, val, color]) => (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: 'rgba(160,175,210,0.7)' }}>{label}</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color, fontFamily: 'JetBrains Mono' }}>{val}%</span>
                      </div>
                      <div style={{ height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${val}%`, background: color, borderRadius: '5px', transition: 'width 1s ease' }} />
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: '8px', fontSize: '10px', color: 'rgba(160,175,210,0.35)', fontStyle: 'italic' }}>
                    ⚠️ Prediction only. Not financial advice.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── REFERRAL PROGRAM BANNER ── */}
      <section style={{ padding: '80px 24px', background: '#07080E', position: 'relative', overflow: 'hidden', zIndex: 10 }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse 800px 400px at 20% 50%, rgba(0,200,150,0.05) 0%, transparent 60%), radial-gradient(ellipse 600px 400px at 80% 50%, rgba(245,166,35,0.04) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div className="reveal-on-scroll" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '32px', background: 'linear-gradient(135deg, rgba(0,200,150,0.06), rgba(10,12,24,0.98), rgba(245,166,35,0.04))', border: '1px solid rgba(0,200,150,0.15)', borderRadius: '28px', padding: width < 768 ? '28px 20px' : '40px 52px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #00C896, rgba(245,166,35,0.5), transparent)' }} />
            <div style={{ flex: 1, minWidth: '260px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.25)', borderRadius: '30px', padding: '6px 16px', marginBottom: '18px' }}>
                <span style={{ fontSize: '14px' }}>🎁</span>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#00C896', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Referral Program</span>
              </div>
              <h3 style={{ fontSize: width < 768 ? '22px' : '30px', fontWeight: 800, color: '#fff', margin: '0 0 12px 0', lineHeight: 1.2 }}>
                Earn Cash for Every Friend<br />
                <span style={{ color: '#00C896' }}>You Bring to EthioSwap</span>
              </h3>
              <p style={{ fontSize: '15px', color: 'rgba(160,175,210,0.75)', margin: '0 0 20px 0', lineHeight: 1.7, maxWidth: '460px' }}>
                Share your unique referral link. When your friend completes their first trade, you automatically earn <strong style={{ color: '#00C896' }}>0.2% of their trade volume</strong> — deposited directly into your wallet.
              </p>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                {[['0.2%', 'Commission per trade'], ['Up to $5', 'Per referral cap'], ['Auto', 'Instant wallet credit']].map(([val, lbl]) => (
                  <div key={lbl}>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#F5A623', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{val}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(160,175,210,0.55)', marginTop: '3px', fontWeight: 600 }}>{lbl}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '220px' }}>
              {user && userReferralCode ? (
                <>
                  <div style={{ background: 'rgba(8,10,20,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px 18px' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(160,175,210,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Your Referral Code</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#F5A623', fontFamily: 'JetBrains Mono', letterSpacing: '0.08em' }}>{userReferralCode}</div>
                  </div>
                  <button
                    onClick={() => { navigator.clipboard.writeText(`https://ethioswap.qzz.io/?ref=${userReferralCode}`); }}
                    style={{ background: 'linear-gradient(135deg, #00C896, #00A87A)', color: '#05140F', fontWeight: 800, fontSize: '14px', padding: '14px 24px', borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,200,150,0.3)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    📋 Copy Referral Link
                  </button>
                </>
              ) : (
                <button onClick={onGetStarted} style={{ background: 'linear-gradient(135deg, #00C896, #00A87A)', color: '#05140F', fontWeight: 800, fontSize: '15px', padding: '16px 32px', borderRadius: '14px', border: 'none', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 20px rgba(0,200,150,0.2)' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,200,150,0.35)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,200,150,0.2)'; }}
                >
                  🎁 Get My Referral Link
                </button>
              )}
              <div style={{ fontSize: '11px', color: 'rgba(160,175,210,0.4)', textAlign: 'center' }}>No limit on referrals • Instant payout</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ SECTION ── */}
      <section id="faq" style={{ padding: '120px 24px', background: 'var(--bg)', position: 'relative', zIndex: 10 }}>
        <div className="section-curve" style={{ bottom: '-50px' }} />
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="reveal-on-scroll" style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 className="serif-title" style={{ fontSize: width < 768 ? '36px' : '48px', color: '#fff', margin: '0 0 16px 0' }}>Common Questions</h2>
            <p style={{ fontSize: '18px', color: 'var(--text-dim)' }}>Everything you need to know about trading on EthioSwap.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {faqItems.map((item, index) => {
              const isActive = faqActiveIndex === index;
              return (
                <div key={index} className="reveal-on-scroll" style={{ 
                  background: isActive ? 'rgba(255,255,255,0.03)' : 'transparent', 
                  border: '1px solid var(--border)',
                  borderRadius: '16px', 
                  overflow: 'hidden',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  transitionDelay: `${index * 50}ms`
                }}>
                  <button onClick={() => setFaqActiveIndex(isActive ? null : index)}
                    style={{ width: '100%', padding: '24px', background: 'transparent', border: 'none', color: '#fff', fontSize: '16px', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left' }}>
                    <span>{item.q}</span>
                    <span style={{ 
                      color: 'var(--gold)', 
                      fontSize: '24px', 
                      transform: isActive ? 'rotate(45deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s ease'
                    }}>+</span>
                  </button>
                  <div style={{ maxHeight: isActive ? '300px' : '0px', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', overflow: 'hidden' }}>
                    <p style={{ padding: '0 24px 24px', margin: 0, fontSize: '15px', color: 'var(--text-dim)', lineHeight: 1.6 }}>{item.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Visual Connector: FAQ -> CTA */}


      {/* ── FINAL CTA ── */}
      <section style={{ padding: '120px 24px', textAlign: 'center', position: 'relative' }}>
        <div className="glass-card" style={{ maxWidth: '1000px', margin: '0 auto', padding: '80px 40px', borderRadius: '32px', position: 'relative', overflow: 'hidden' }}>
          <div className="orb" style={{ top: '-250px', left: '-250px', opacity: 0.5 }} />
          {/* Large horizontal USD background note decoration */}
          <div style={{
            position: 'absolute',
            width: width < 768 ? '260px' : '380px',
            height: width < 768 ? '600px' : '900px',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(85deg)',
            backgroundImage: 'url(/images/usd_100.jpg)',
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: width < 768 ? 0.05 : 0.08,
            pointerEvents: 'none',
            zIndex: 0,
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 className="serif-title" style={{ fontSize: width < 768 ? '36px' : '56px', color: '#fff', margin: '0 0 24px 0' }}>
              Join the Future of<br />Trading in Ethiopia
            </h2>
            <p style={{ fontSize: '20px', color: 'var(--text-dim)', maxWidth: '600px', margin: '0 auto 48px' }}>
              Secure your first USDT trade today with 0% fees for the first week.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={onGetStarted} className="btn-saas-primary" style={{ fontSize: '20px', padding: '18px 40px' }}>
                Create Your Account
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#000', borderTop: '1px solid var(--border)', padding: '100px 24px 60px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '64px', marginBottom: '80px' }}>
            <div style={{ gridColumn: width > 1024 ? 'span 2' : 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <span style={{ fontSize: '32px' }}>🛡️</span>
                <span style={{ fontWeight: 800, fontSize: '24px', color: '#fff', letterSpacing: '-0.02em' }}>EthioSwap</span>
              </div>
              <p style={{ fontSize: '16px', color: 'var(--text-dim)', lineHeight: 1.6, maxWidth: '320px' }}>
                Ethiopia's most trusted peer-to-peer digital asset marketplace. Secure, fast, and local.
              </p>
            </div>
            <div>
              <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '24px' }}>Product</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { label: 'Features', target: '#features' },
                  { label: 'How It Works', target: '#how-it-works' },
                  { label: 'Market Rates', target: '#market' },
                  { label: 'Security', target: '#security' }
                ].map(item => (
                  <li key={item.label}><a href={item.target} className="nav-item-saas" style={{ fontSize: '15px', textDecoration: 'none' }}>{item.label}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '24px' }}>Support</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {['Help Center', 'Community', 'Contact Us', 'Status'].map(item => (
                  <li key={item}><a href="#" className="nav-item-saas" style={{ fontSize: '15px', textDecoration: 'none' }}>{item}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '24px' }}>Legal</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map(item => (
                  <li key={item}><a href="#" className="nav-item-saas" style={{ fontSize: '15px', textDecoration: 'none' }}>{item}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px', fontSize: '14px', color: 'var(--text-dim)' }}>
            <p>© 2026 EthioSwap. All rights reserved. Built with ❤️ for Ethiopia.</p>
            <div style={{ display: 'flex', gap: '24px' }}>
              <a href="https://www.tiktok.com/@ethioswap0?_r=1&_t=ZS-96qWnCZbcRN" target="_blank" rel="noopener noreferrer" className="nav-item-saas" style={{ textDecoration: 'none' }}>TikTok</a>
              <a href="https://www.instagram.com/ethioswap" target="_blank" rel="noopener noreferrer" className="nav-item-saas" style={{ textDecoration: 'none' }}>Instagram</a>
              <a href="https://t.me/EthioSwap_bot" target="_blank" rel="noopener noreferrer" className="nav-item-saas" style={{ textDecoration: 'none', color: '#38bdf8', fontWeight: 700 }}>✈️ Telegram Bot (@EthioSwap_bot)</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ── WRITE A REVIEW MODAL (Item 3) ── */}
      {showReviewModal && (
        <div className="legal-modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="legal-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <button onClick={() => setShowReviewModal(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#c8c8c8', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            <div style={{ marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '14px' }}>
              <h3 className="serif-title" style={{ fontSize: '22px', color: '#fff', margin: 0 }}>Write a Review</h3>
            </div>
            
            {reviewSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <span style={{ fontSize: '48px' }}>🎉</span>
                <p style={{ fontSize: '15px', color: '#00C896', fontWeight: 700, marginTop: '16px' }}>
                  Your review has been posted successfully. Thank you!
                </p>
                <button onClick={() => { setShowReviewModal(false); setReviewSuccess(false); }} className="cta-btn-gold" style={{ marginTop: '24px', height: '40px', fontSize: '14px', borderRadius: '8px' }}>
                  Close Window
                </button>
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#8b92a8', display: 'block', marginBottom: '8px' }}>Rating</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button key={star} type="button" onClick={() => setReviewRating(star)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '32px', padding: 0, color: star <= reviewRating ? '#F5A623' : '#3a3a3a' }}>★</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#8b92a8', display: 'block', marginBottom: '8px' }}>Review Message (min 20 characters)</label>
                  <textarea
                    required
                    rows={4}
                    value={reviewContent}
                    onChange={e => setReviewContent(e.target.value)}
                    placeholder="Tell others about your trading experience on EthioSwap..."
                    style={{ width: '100%', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px', fontSize: '14px', color: '#fff', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8A9BB8', marginTop: '4px' }}>
                    <span>Must be 20-300 characters</span>
                    <span>{reviewContent.length} / 300</span>
                  </div>
                </div>

                {reviewError && (
                  <div style={{ background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.2)', padding: '10px 12px', borderRadius: '8px', color: '#FF4D4D', fontSize: '12px' }}>
                    ⚠️ {reviewError}
                  </div>
                )}

                <button type="submit" disabled={submitLoading} className="cta-btn-gold" style={{ width: '100%', height: '44px', fontSize: '15px', borderRadius: '8px' }}>
                  {submitLoading ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── LEGAL MODALS ── */}
      {openModal && (
        <div className="legal-modal-overlay" onClick={() => setOpenModal(null)}>
          <div className="legal-modal-card" onClick={e => e.stopPropagation()}>
            <button onClick={() => setOpenModal(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#c8c8c8', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            <div style={{ marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '14px' }}>
              <h3 className="serif-title" style={{ fontSize: '24px', color: '#fff', fontWeight: 400, margin: 0 }}>{getModalTitle(openModal)}</h3>
            </div>
            <div style={{ fontSize: '14px', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {getModalBody(openModal)}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LandingPage;
