import React, { useState, useEffect, useRef } from 'react';
import Logo from '../components/Logo.jsx';

const LandingPage = ({ onGetStarted, onSignIn, systemSettings }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [faqActiveIndex, setFaqActiveIndex] = useState(null);
  const [openModal, setOpenModal] = useState(null); // null | 'terms' | 'privacy' | 'escrow' | 'aml'
  const [activeMarketTab, setActiveMarketTab] = useState('buy'); // 'buy' | 'sell'

  // Rates loaded from Convex master settings
  const buyRate = systemSettings?.etbRatePerDollar ?? 190;
  const sellRate = systemSettings?.etbRatePerDollarSell ?? systemSettings?.etbRatePerDollar ?? 180;

  // Custom cursor position state
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [cursorHovered, setCursorHovered] = useState(false);

  // Parallax parallax offset for 3D phone
  const [phoneTilt, setPhoneTilt] = useState({ rx: 0, ry: 0 });

  // Intersection Observer scroll animation states
  const stepsRef = useRef(null);
  const [stepsVisible, setStepsVisible] = useState(false);

  // Check prefers-reduced-motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    setPrefersReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  // Track cursor coordinates
  useEffect(() => {
    if (prefersReducedMotion) return;
    const moveCursor = (e) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', moveCursor);
    return () => window.removeEventListener('mousemove', moveCursor);
  }, [prefersReducedMotion]);

  // Handle phone mouse parallax tilt
  const handlePhoneMouseMove = (e) => {
    if (prefersReducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const ry = ((x - centerX) / centerX) * 15; // max 15deg
    const rx = ((centerY - y) / centerY) * 15;
    setPhoneTilt({ rx, ry });
  };

  const handlePhoneMouseLeave = () => {
    setPhoneTilt({ rx: 0, ry: 0 });
  };

  // Intersection Observer trigger
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setStepsVisible(true);
        }
      });
    }, { threshold: 0.1 });

    if (stepsRef.current) observer.observe(stepsRef.current);
    return () => observer.disconnect();
  }, []);

  // Track scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) setScrolled(true);
      else setScrolled(false);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Custom card 3D tilt handler
  const handleCardMouseMove = (e) => {
    if (prefersReducedMotion) return;
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((centerY - y) / centerY) * 8; // max 8 deg
    const rotateY = ((x - centerX) / centerX) * 8;
    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    card.style.borderColor = 'rgba(245, 197, 24, 0.3)';
    card.style.boxShadow = '0 10px 30px rgba(245, 197, 24, 0.05)';
  };

  const handleCardMouseLeave = (e) => {
    const card = e.currentTarget;
    card.style.transform = `perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0px)`;
    card.style.borderColor = 'rgba(255, 255, 255, 0.07)';
    card.style.boxShadow = 'none';
  };

  // Live P2P Market mock orders
  const mockOrders = [
    { id: 1, name: 'Abebe_K', type: 'buy', amount: '500 USDT', rate: `${buyRate} ETB`, limits: '100 - 500 USDT', method: 'Telebirr' },
    { id: 2, name: 'Makeda_S', type: 'sell', amount: '1,200 USDT', rate: `${sellRate} ETB`, limits: '500 - 1200 USDT', method: 'CBE Transfer' },
    { id: 3, name: 'Biruk_G', type: 'buy', amount: '800 USDT', rate: `${buyRate} ETB`, limits: '200 - 800 USDT', method: 'Dashen Bank' },
    { id: 4, name: 'Selam_A', type: 'sell', amount: '350 USDT', rate: `${sellRate} ETB`, limits: '100 - 350 USDT', method: 'Telebirr' },
    { id: 5, name: 'Yohannes_T', type: 'buy', amount: '2,000 USDT', rate: `${buyRate} ETB`, limits: '500 - 2000 USDT', method: 'Awash Bank' }
  ];

  const faqItems = [
    {
      q: "How does the smart contract P2P Escrow lock safeguard my funds?",
      a: "When a buyer starts a trade, the corresponding USDT stable coin volume is immediately locked in the smart contract escrow. This ensures that the seller cannot move their assets until the transaction concludes. Funds are released exclusively to the buyer after the seller confirms payment, or after platform dispute mediaton."
    },
    {
      q: "What payment channels are supported for local fiat exchange?",
      a: "All direct peer-to-peer fiat payments are transferred directly between the participants' bank accounts. Supported institutions include the Commercial Bank of Ethiopia (CBE), Telebirr mobile wallet, Dashen Bank, and Awash Bank. Platform fees are completely free from fiat and processed entirely in secure on-chain USD assets."
    },
    {
      q: "Why is KYC document verification required for trading?",
      a: "EthioSwap strictly enforces mandatory KYC (National ID Card front/back and a live Face Selfie) to protect local merchants from bank account freezes and payment scams. Unverified accounts can explore live rates and browse order lists but are blocked from initiating deposits, withdrawals, or opening trades."
    },
    {
      q: "What blockchain networks can I use for deposits and withdrawals?",
      a: "To guarantee security and standard operations, we support standard On-Chain USD assets exclusively. Users can choose between Tron TRC20 and Ethereum ERC20 networks for secure deposits and withdrawals."
    },
    {
      q: "How are trade disputes handled if a user does not release funds?",
      a: "If a counterpart fails to complete their obligation or respond within the 30-minute timer window, either party can open an administrative dispute. EthioSwap arbitrators will examine uploaded bank receipt screenshots and transaction details, and manually resolve the trade fairly."
    }
  ];

  const getModalTitle = (type) => {
    switch (type) {
      case 'terms': return 'Terms of Service & User Agreement';
      case 'privacy': return 'Privacy Policy & Biometric Consent';
      case 'escrow': return 'Escrow Operations & Dispute Policy';
      case 'aml': return 'Anti-Money Laundering (AML) & KYC Rules';
      case 'about': return 'About EthioSwap P2P Platform';
      case 'download': return 'Download EthioSwap Mobile (Beta)';
      default: return '';
    }
  };

  const getModalBody = (type) => {
    switch (type) {
      case 'terms':
        return (
          <>
            <h4>1. Acceptance of Terms</h4>
            <p>By accessing EthioSwap, you agree to these Terms of Service. This platform operates a secure peer-to-peer (P2P) escrow service. Transactions here represent direct trades, and users must follow verified payment rules to maintain integrity.</p>
            <h4>2. P2P Escrow Service</h4>
            <p>EthioSwap facilitates the local purchase and sale of USDT stable coins in exchange for Ethiopian Birr (ETB). We provide smart-contract based escrow locking and administrator-led dispute resolution. We do not provide custody of fiat currencies; all ETB transfers occur directly peer-to-peer between the buyer's and seller's personal accounts.</p>
            <h4>3. Permitted On-Chain Standard</h4>
            <p>Our wallet handles standard On-Chain USDT deposits and withdrawals exclusively (supporting Tron TRC20 and Ethereum ERC20 networks). Deprecated third-party integrations like Bybit Pay, Telegram Wallets, and Binance Pay are not supported.</p>
          </>
        );
      case 'privacy':
        return (
          <>
            <h4>1. Scope of Privacy Policy</h4>
            <p>EthioSwap is committed to securing your personal information. This policy details how we collect, store, and process your personal credentials, government document uploads, and biometric configurations.</p>
            <h4>2. Personal Data & KYC</h4>
            <p>To create an active trading profile, the platform securely uploads scans of your National ID card (front and back) and a live face selfie photo for verification check analysis. All documents are encrypted and uploaded securely to our Convex Cloud storage database.</p>
            <h4>3. Biometric Security Protocols</h4>
            <p>Our mobile client supports biometric security protocols (such as Fingerprint lock or Face ID). All biometric lock credentials and PIN code calculations are stored exclusively within your device's secure hardware enclave. EthioSwap never transmits or accesses your biometric keys on our servers.</p>
          </>
        );
      case 'escrow':
        return (
          <>
            <h4>1. Escrow Lock Mechanism</h4>
            <p>When a buy order is initiated, the corresponding amount of seller's USDT is instantly locked in the escrow contract, preventing any withdrawal or movement. A payment window timer (typically 30 minutes) begins.</p>
            <h4>2. Buyer & Seller Obligations</h4>
            <p>The buyer must transfer the exact ETB amount to the seller's bank account or Telebirr within the window, clicking 'I Have Paid' and uploading proof. The seller must confirm the receipt of funds in their bank account or mobile wallet before clicking 'Release USD'.</p>
            <h4>3. Administrative Mediation</h4>
            <p>If either party opens a dispute, our Addis Ababa support team will examine transaction receipts and bank statements, and manually execute a secure release or refund.</p>
          </>
        );
      case 'aml':
        return (
          <>
            <h4>1. Anti-Money Laundering Compliance</h4>
            <p>EthioSwap complies with national anti-fraud and anti-money laundering (AML) guidelines to eliminate bad actors and protect the trading community.</p>
            <h4>2. Mandatory KYC Policy</h4>
            <p>Unverified accounts are permitted to browse P2P ads, and configure settings. However, they are strictly blocked from initiating deposits, withdrawals, posting ads, or opening active trades. Verification is mandatory to unlock transactions.</p>
          </>
        );
      case 'about':
        return (
          <>
            <h4>1. Our Mission</h4>
            <p>EthioSwap is built to bridge international digital assets and the local Ethiopian financial landscape. We provide secure, automated peer-to-peer (P2P) trading solutions tailored specifically for remote workers, freelancers, local merchants, and the diaspora community.</p>
            <h4>2. Addis Ababa Based Support</h4>
            <p>Our professional arbitration and support team is based directly in Addis Ababa to ensure rapid support, verified local bank checks, and highly secure dispute resolution for all community participants.</p>
            <h4>3. Safe & Compliant</h4>
            <p>By enforcing mandatory KYC check validations and leveraging secure automated smart-contract locks, we eliminate common P2P scams and safeguard your transactions.</p>
          </>
        );
      case 'download':
        return (
          <>
            <h4>1. Closed Beta Access</h4>
            <p>The EthioSwap native Android application is currently in closed beta to guarantee maximum safety, secure updates, and localized testing before its public release on the Google Play Store.</p>
            <h4>2. How to Download:</h4>
            <p>To request direct access to the latest verified APK file (v2.4.0) and secure installation keys, please contact our official administration support channel on Telegram:</p>
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
              <a 
                href="https://t.me/EthioSwap1" 
                target="_blank" 
                rel="noreferrer" 
                className="cta-btn-gold"
                style={{ height: '40px', fontSize: '14px', borderRadius: '8px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                💬 Connect with Telegram Support
              </a>
            </div>
          </>
        );
      default: return null;
    }
  };

  return (
    <div style={{ background: '#0a0a0a', color: '#c8c8c8', fontFamily: "'Inter', sans-serif", overflowX: 'hidden', position: 'relative' }}>
      
      {/* ── STYLE INJECTIONS ── */}
      <style>{`
        /* Custom fonts */
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital,wght@0,400;1,400&family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        
        .serif-title {
          font-family: 'Instrument Serif', serif;
          font-style: normal;
        }
        
        /* Custom cursor style */
        .cursor-trail {
          position: fixed;
          width: 8px;
          height: 8px;
          background: #f5c518;
          border-radius: 50%;
          pointer-events: none;
          z-index: 9999;
          transform: translate(-50%, -50%);
          transition: width 0.2s, height 0.2s, background-color 0.2s;
        }
        .cursor-trail.hovered {
          width: 40px;
          height: 40px;
          background: rgba(245, 197, 24, 0.15);
          border: 1px solid #f5c518;
        }

        /* Nav layout */
        .nav-floating {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 80px;
          background: transparent;
          backdrop-filter: none;
          z-index: 1000;
          transition: all 0.3s ease;
        }
        .nav-floating.scrolled {
          background: rgba(10, 10, 10, 0.85);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          height: 70px;
        }

        /* 3D phone showcase keyframes */
        @keyframes autoRotatePhone {
          0% { transform: perspective(1000px) rotateY(0deg); }
          100% { transform: perspective(1000px) rotateY(360deg); }
        }
        .phone-mockup-3d {
          animation: autoRotatePhone 20s linear infinite;
          transform-style: preserve-3d;
          transition: transform 0.1s ease;
        }
        .phone-mockup-3d:hover {
          animation-play-state: paused;
        }

        /* Floating chips orbit animations */
        @keyframes usdtOrbit {
          0% { transform: translate(-140px, -50px) translateZ(50px); z-index: 10; }
          50% { transform: translate(140px, 50px) translateZ(-50px); z-index: 1; }
          100% { transform: translate(-140px, -50px) translateZ(50px); z-index: 10; }
        }
        @keyframes etbOrbit {
          0% { transform: translate(140px, 60px) translateZ(-50px); z-index: 1; }
          50% { transform: translate(-140px, -60px) translateZ(50px); z-index: 10; }
          100% { transform: translate(140px, 60px) translateZ(-50px); z-index: 1; }
        }
        .orbit-chip-usdt {
          animation: usdtOrbit 12s ease-in-out infinite;
        }
        .orbit-chip-etb {
          animation: etbOrbit 12s ease-in-out infinite;
        }

        /* Infinite Marquee */
        @keyframes marqueeScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-inner {
          display: flex;
          width: max-content;
          animation: marqueeScroll 25s linear infinite;
        }
        .marquee-container:hover .marquee-inner {
          animation-play-state: paused;
        }

        /* Timeline stagger animations */
        .step-timeline-item {
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .step-timeline-item.visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* General layout styles */
        .cta-btn-gold {
          background: #f5c518;
          color: #0a0a0a;
          border: none;
          border-radius: 10px;
          padding: 0 24px;
          font-weight: 700;
          font-size: 16px;
          height: 48px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .cta-btn-gold:hover {
          background: #fcd34d;
          transform: translateY(-1px);
        }
        .cta-btn-outline {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.25);
          color: #f0f2f8;
          border-radius: 10px;
          padding: 0 24px;
          font-weight: 600;
          font-size: 16px;
          height: 48px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
        }
        .cta-btn-outline:hover {
          background: rgba(255,255,255,0.03);
          border-color: #f5c518;
        }
        .badge-live-pulse {
          width: 8px;
          height: 8px;
          background: #00d4a0;
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 10px #00d4a0;
        }
        @keyframes livePulse {
          0% { transform: scale(0.9); opacity: 0.5; }
          50% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0.5; }
        }
        .badge-live-pulse {
          animation: livePulse 1.8s ease-in-out infinite;
        }
        
        .market-tab-btn {
          padding: 12px 20px;
          background: transparent;
          border: none;
          color: #8b92a8;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          position: relative;
          transition: color 0.2s ease;
        }
        .market-tab-btn.active {
          color: #f5c518;
        }
        .market-tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: #f5c518;
        }
        
        .legal-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(5,5,5,0.85);
          backdrop-filter: blur(12px);
          z-index: 5000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .legal-modal-card {
          background: #111318;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          width: 100%;
          max-width: 580px;
          max-height: 80vh;
          overflow-y: auto;
          padding: 32px;
          position: relative;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        }
      `}</style>

      {/* ── CUSTOM CURSOR TRAIL ── */}
      {!prefersReducedMotion && (
        <div 
          className={`cursor-trail ${cursorHovered ? 'hovered' : ''}`}
          style={{ left: `${cursorPos.x}px`, top: `${cursorPos.y}px` }}
        />
      )}

      {/* ── FLOATING TOP HEADER NAVBAR ── */}
      <nav className={`nav-floating ${scrolled ? 'scrolled' : ''}`}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
          <Logo size={36} showText={true} />
          
          <ul style={{ display: 'flex', alignItems: 'center', gap: '28px', listStyle: 'none', margin: 0, padding: 0 }}>
            {['features', 'timeline', 'market', 'audience', 'download'].map(navId => (
              <li key={navId} className="desktop-only">
                <a 
                  href={`#${navId}`}
                  onMouseEnter={() => setCursorHovered(true)}
                  onMouseLeave={() => setCursorHovered(false)}
                  style={{
                    color: '#c8c8c8', textTransform: 'capitalize', textDecoration: 'none',
                    fontSize: '14px', fontWeight: 500, transition: 'color 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.color = '#f5c518'}
                  onMouseOut={e => e.currentTarget.style.color = '#c8c8c8'}
                >
                  {navId === 'timeline' ? 'How It Works' : navId === 'audience' ? 'Target Audience' : navId === 'download' ? 'Download APK' : navId}
                </a>
              </li>
            ))}
            <li style={{ marginLeft: '12px' }}>
              <button
                onClick={onSignIn}
                onMouseEnter={() => setCursorHovered(true)}
                onMouseLeave={() => setCursorHovered(false)}
                className="cta-btn-gold"
                style={{ height: '40px', fontSize: '14px', borderRadius: '8px' }}
              >
                Sign In
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* ── SPLIT LAYOUT HERO SECTION ── */}
      <header id="hero" style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        padding: '120px 24px 80px', position: 'relative', overflow: 'hidden'
      }}>
        {/* Subtle Animated Gold Grid Overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(245,197,24,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(245,197,24,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 1
        }} />

        {/* Soft teal glow depth spot */}
        <div style={{
          position: 'absolute', top: '30%', left: '10%', width: '450px', height: '450px',
          background: 'radial-gradient(circle, rgba(0,212,160,0.05) 0%, transparent 70%)',
          pointerEvents: 'none', zIndex: 1
        }} />

        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', zIndex: 2 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px', alignItems: 'center' }}>
            
            {/* LEFT SIDE (60%) */}
            <div style={{ flex: 1.5 }}>
              
              {/* Version badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: '#111318', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '50px', padding: '6px 16px', marginBottom: '24px'
              }}>
                <span className="badge-live-pulse" />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#00d4a0', letterSpacing: '0.08em' }}>ETHIOSWAP V2.4 BETA</span>
              </div>

              {/* Title heading in serif */}
              <h1 className="serif-title" style={{ fontSize: '56px', lineHeight: 1.1, color: '#f0f2f8', margin: '0 0 16px 0', fontWeight: 400 }}>
                Trade USD ($) & ETB.<br />
                <span style={{ color: '#f5c518' }}>Safe & Secure.</span>
              </h1>

              {/* Subtitle */}
              <p style={{ fontSize: '16px', color: '#c8c8c8', lineHeight: 1.7, maxWidth: '480px', margin: '0 0 32px 0' }}>
                Buy and sell USD stable assets for Ethiopian Birr — secured by smart contract escrow locks, validated by verified local bank transfers, protected by administrator arbitration.
              </p>

              {/* Side by side CTAs */}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '40px' }}>
                <button
                  onClick={onGetStarted}
                  onMouseEnter={() => setCursorHovered(true)}
                  onMouseLeave={() => setCursorHovered(false)}
                  className="cta-btn-gold"
                >
                  Create Account — It's Free
                </button>
                <a
                  href="#download"
                  onMouseEnter={() => setCursorHovered(true)}
                  onMouseLeave={() => setCursorHovered(false)}
                  className="cta-btn-outline"
                >
                  Download Android APK
                </a>
              </div>

              {/* Stat pills below */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {[
                  { n: '100%', l: 'Escrow Lock' },
                  { n: '< 15 Min', l: 'Avg Release' },
                  { n: '0.5%', l: 'Platform Fee' }
                ].map((st, i) => (
                  <div key={i} style={{
                    background: '#111318', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '10px', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '8px'
                  }}>
                    <strong style={{ color: '#f5c518', fontSize: '15px' }}>{st.n}</strong>
                    <span style={{ color: '#c8c8c8', fontSize: '12px' }}>{st.l}</span>
                  </div>
                ))}
              </div>

            </div>

            {/* RIGHT SIDE (40%) - 3D CSS perspective phone */}
            <div 
              onMouseMove={handlePhoneMouseMove}
              onMouseLeave={handlePhoneMouseLeave}
              style={{ flex: 1, display: 'flex', justifyContent: 'center', position: 'relative', height: '480px' }}
            >
              {/* Back ambient radial glow */}
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: '320px', height: '320px', background: 'radial-gradient(circle, rgba(0,212,160,0.12) 0%, transparent 70%)',
                zIndex: 1, pointerEvents: 'none'
              }} />

              {/* 3D phone mockup */}
              <div 
                className="phone-mockup-3d"
                style={{
                  width: '240px', height: '420px', background: '#111318',
                  border: '4px solid rgba(255, 255, 255, 0.12)', borderRadius: '32px',
                  boxShadow: '0 25px 60px rgba(0,0,0,0.7), 0 0 30px rgba(0, 212, 160, 0.1)',
                  position: 'absolute', zIndex: 3, top: '30px', padding: '16px',
                  display: 'flex', flexDirection: 'column', overflow: 'hidden',
                  transform: `perspective(1000px) rotateX(${phoneTilt.rx}deg) rotateY(${phoneTilt.ry}deg)`,
                }}
              >
                {/* Phone Notch */}
                <div style={{ width: '90px', height: '18px', background: '#000', borderRadius: '0 0 12px 12px', margin: '-16px auto 14px', flexShrink: 0 }} />

                {/* Inner mockup app view */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
                  
                  {/* Status row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8b92a8', fontSize: '10px' }}>
                    <span>EthioSwap Lock</span>
                    <span style={{ color: '#00d4a0' }}>● Live</span>
                  </div>

                  {/* Header widget */}
                  <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#8b92a8' }}>SECURED TRADING VOLUME</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#f5c518', marginTop: '4px' }}>$1,480.00</div>
                  </div>

                  {/* Lock graphic block */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <div style={{
                      width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(0, 212, 160, 0.1)',
                      border: '1px solid rgba(0, 212, 160, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '28px', boxShadow: '0 0 20px rgba(0, 212, 160, 0.15)'
                    }}>
                      🔒
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#00d4a0', letterSpacing: '0.04em' }}>ACTIVE ESCROW SECURED</span>
                  </div>

                  {/* Transaction rates box */}
                  <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px', marginTop: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#8b92a8', marginBottom: '4px' }}>
                      <span>Blockchain Ledger</span>
                      <span style={{ color: '#00d4a0' }}>TRC20 / ERC20</span>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#f5c518' }}>1 USD = {buyRate} ETB</div>
                  </div>

                </div>
              </div>

              {/* Floating orbiting data chips */}
              <div 
                className="orbit-chip-usdt"
                style={{
                  position: 'absolute', top: '160px', left: '50%',
                  background: '#111318', border: '1px solid rgba(0,212,160,0.3)',
                  borderRadius: '30px', padding: '6px 14px', fontSize: '12px', fontWeight: 700,
                  color: '#00d4a0', boxShadow: '0 4px 15px rgba(0, 212, 160, 0.1)', pointerEvents: 'none'
                }}
              >
                💵 USDT TRC20
              </div>

              <div 
                className="orbit-chip-etb"
                style={{
                  position: 'absolute', top: '240px', left: '50%',
                  background: '#111318', border: '1px solid rgba(245,197,24,0.3)',
                  borderRadius: '30px', padding: '6px 14px', fontSize: '12px', fontWeight: 700,
                  color: '#f5c518', boxShadow: '0 4px 15px rgba(245, 197, 24, 0.1)', pointerEvents: 'none'
                }}
              >
                🇪🇹 CBE / Telebirr
              </div>

            </div>

          </div>
        </div>
      </header>

      {/* ── TICKER / TRUST BAR ── */}
      <div 
        className="marquee-container"
        style={{
          background: '#0d0d0d', borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)', height: '44px',
          display: 'flex', alignItems: 'center', overflow: 'hidden', position: 'relative', zIndex: 10
        }}
      >
        <div className="marquee-inner">
          {[1, 2].map((setIndex) => (
            <div key={setIndex} style={{ display: 'flex', gap: '48px', paddingRight: '48px', alignItems: 'center', whiteSpace: 'nowrap' }}>
              {[
                'KYC VERIFIED', 'DASHEN BANK', 'AWASH BANK', 'CBE INTEGRATION',
                'TELEBIRR SUPPORTED', 'ADMIN DISPUTE ARBITRATION', 'USD & ETB TRADING', 'SECURE P2P ESCROW'
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '11px', letterSpacing: '0.15em', fontWeight: 700, color: '#b8960c' }}>
                  <span>•</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES GRID SECTION ── */}
      <section id="features" style={{ padding: '100px 24px', position: 'relative' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <span style={{ fontSize: '11px', color: '#00d4a0', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>ENTERPRISE FEATURES</span>
            <h2 className="serif-title" style={{ fontSize: '42px', color: '#fff', margin: '8px 0 16px 0', fontWeight: 400 }}>Re-engineered for Ethiopian Traders</h2>
            <p style={{ maxWidth: '560px', margin: '0 auto', fontSize: '14px', color: '#c8c8c8', lineHeight: 1.7 }}>
              Our P2P escrow platform combines decentralized security with familiar local payments to bring you the safest trading experience in the region.
            </p>
          </div>

          {/* Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {[
              { t: 'Smart Escrow Protection', d: "Before a buyer transfers ETB, the seller's USD ($) is automatically locked in the escrow smart contract. Funds are released only after payment is verified.", ic: '🔒' },
              { t: '100% Verified Users', d: "No anonymous trading. Every user must verify their account with a national ID or passport scan, along with a live face selfie match to eliminate fraud.", ic: '🛡️' },
              { t: 'Biometric App Lock', d: "Lock your wallet with your phone's native fingerprint scanner, face unlock, or a custom secure 6-digit PIN. Your keys stay protected on your device.", ic: '🔑' },
              { t: 'Flexible Bank Payouts', d: "Add and manage multiple local bank or mobile money accounts (including CBE, Telebirr, Dashen, Awash, HelloCash, and M-Pesa) to securely settle fiat transactions directly.", ic: '🏦' },
              { t: 'Trade Notification Center', d: "Receive real-time alerts whenever there's activity on your buy, sell, deposit, or withdrawal orders. Never miss a trade window or payment stage.", ic: '🔔' },
              { t: 'Cross-Device Sync', d: "Log in with the same credentials on the web browser and the native Android app. Balance, trade history, and KYC status sync instantly in real-time.", ic: '🔄' },
            ].map((ft, idx) => (
              <div
                key={idx}
                className="card-premium"
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                style={{
                  background: '#111318', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '16px', padding: '32px', cursor: 'default',
                  transition: 'transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1), border-color 0.2s, box-shadow 0.2s'
                }}
              >
                {/* Icon square */}
                <div style={{
                  width: '48px', height: '48px', borderRadius: '10px', background: '#1a1d23',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px', border: '1px solid rgba(255,255,255,0.04)', marginBottom: '20px'
                }}>
                  {ft.ic}
                </div>
                <h3 style={{ fontSize: '17px', color: '#fff', fontWeight: 500, margin: '0 0 10px 0' }}>{ft.t}</h3>
                <p style={{ fontSize: '14px', color: '#c8c8c8', lineHeight: 1.7, margin: 0 }}>{ft.d}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── HOW IT WORKS SECTION (TIMELINE) ── */}
      <section id="timeline" ref={stepsRef} style={{ padding: '100px 24px', background: '#0d0d0d', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <span style={{ fontSize: '11px', color: '#00d4a0', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>TIMELINE</span>
            <h2 className="serif-title" style={{ fontSize: '42px', color: '#fff', margin: '8px 0 16px 0', fontWeight: 400 }}>Simple 4-Step Trade Lifecycle</h2>
            <p style={{ maxWidth: '560px', margin: '0 auto', fontSize: '14px', color: '#c8c8c8', lineHeight: 1.7 }}>
              Trading USDT for local bank deposits has never been more straightforward. Here is how a standard trade works on EthioSwap.
            </p>
          </div>

          {/* Desktop horizontal / Mobile vertical steps timeline */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'space-between',
            position: 'relative', padding: '20px 0'
          }}>
            {[
              { step: '1', t: 'Create Account & KYC', d: 'Upload National ID or Passport scan alongside live face selfie. Verified in minutes.' },
              { step: '2', t: 'Deposit On-Chain USDT', d: 'Securely fund your wallet using standard TRC20 or ERC20 blockchain networks.' },
              { step: '3', t: 'Post or Find a Trade', d: 'Browse live P2P marketplace ads or publish your own custom price listings.' },
              { step: '4', t: 'Escrow Lock & Release', d: 'USDT is secured in automated smart contract escrow and released instantly on bank payment confirmation.' }
            ].map((step, idx) => (
              <div
                key={idx}
                className={`step-timeline-item ${stepsVisible ? 'visible' : ''}`}
                style={{
                  flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: '16px',
                  transitionDelay: `${idx * 150}ms`
                }}
              >
                {/* Circle step number & line */}
                <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #f5c518',
                    background: '#0a0a0a', color: '#f5c518', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontWeight: 700, fontSize: '14px', zIndex: 2
                  }}>
                    {step.step}
                  </div>
                  {idx < 3 && (
                    <div style={{
                      position: 'absolute', left: '36px', right: '-12px', height: '1px',
                      borderTop: '2px dashed rgba(245,197,24,0.3)', zIndex: 1, pointerEvents: 'none'
                    }} className="desktop-only" />
                  )}
                </div>

                <div>
                  <h4 style={{ fontSize: '15px', color: '#fff', fontWeight: 500, margin: '0 0 6px 0' }}>{step.t}</h4>
                  <p style={{ fontSize: '13px', color: '#c8c8c8', lineHeight: 1.6, margin: 0 }}>{step.d}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── LIVE P2P MARKET SECTION ── */}
      <section id="market" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px', marginBottom: '40px' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#00d4a0', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>REAL-TIME FEED</span>
              <h2 className="serif-title" style={{ fontSize: '42px', color: '#fff', margin: '8px 0 0 0', fontWeight: 400 }}>Live P2P Market Listings</h2>
            </div>
            
            {/* Filter Tabs */}
            <div style={{ display: 'flex', background: '#111318', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '30px', padding: '3px' }}>
              <button
                onClick={() => setActiveMarketTab('buy')}
                className={`market-tab-btn ${activeMarketTab === 'buy' ? 'active' : ''}`}
              >
                Buy USD
              </button>
              <button
                onClick={() => setActiveMarketTab('sell')}
                className={`market-tab-btn ${activeMarketTab === 'sell' ? 'active' : ''}`}
              >
                Sell USD
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="card-premium" style={{ background: '#111318', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)', padding: '24px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: '11px', color: '#8b92a8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px' }}>Trader</th>
                  <th style={{ padding: '12px 16px' }}>Available Volume</th>
                  <th style={{ padding: '12px 16px' }}>Exchange Rate</th>
                  <th style={{ padding: '12px 16px' }}>Min - Max Limits</th>
                  <th style={{ padding: '12px 16px' }}>Payment Method</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {mockOrders.filter(o => o.type === activeMarketTab).map((order) => (
                  <tr
                    key={order.id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '14px', transition: 'background-color 0.2s' }}
                    className="table-row-clickable"
                  >
                    <td style={{ padding: '16px', fontWeight: 600, color: '#fff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>
                          👤
                        </div>
                        @{order.name}
                      </div>
                    </td>
                    <td style={{ padding: '16px', color: '#00d4a0', fontWeight: 700 }}>{order.amount}</td>
                    <td style={{ padding: '16px', fontWeight: 600 }}>{order.rate}</td>
                    <td style={{ padding: '16px', color: '#c8c8c8' }}>{order.limits}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '6px' }}>
                        {order.method}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      {order.type === 'buy' ? (
                        <button onClick={onSignIn} className="cta-btn-gold" style={{ height: '32px', fontSize: '12px', borderRadius: '6px', padding: '0 16px', background: '#00d4a0', color: '#0d1117' }}>
                          Buy USD
                        </button>
                      ) : (
                        <button onClick={onSignIn} className="cta-btn-gold" style={{ height: '32px', fontSize: '12px', borderRadius: '6px', padding: '0 16px' }}>
                          Sell USD
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </section>

      {/* ── TARGET AUDIENCE SECTION ── */}
      <section id="audience" style={{ padding: '100px 24px', background: '#0d0d0d', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <span style={{ fontSize: '11px', color: '#00d4a0', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>TARGET AUDIENCE</span>
            <h2 className="serif-title" style={{ fontSize: '42px', color: '#fff', margin: '8px 0 16px 0', fontWeight: 400 }}>Who is EthioSwap Designed For?</h2>
            <p style={{ maxWidth: '560px', margin: '0 auto', fontSize: '14px', color: '#c8c8c8', lineHeight: 1.7 }}>
              Our secure escrow infrastructure offers tailor-made P2P trading features for remote workers, diaspora senders, and local merchants.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            
            {/* diaspora */}
            <div
              className="card-premium"
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              style={{
                background: '#111318', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '12px',
                transition: 'all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)'
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px', transition: 'transform 0.2s' }} className="target-icon">🌍</div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f5c518', margin: 0 }}>Diaspora & Remittance Senders</h3>
              <p style={{ fontSize: '13.5px', color: '#c8c8c8', lineHeight: 1.6, margin: 0 }}>
                Sending money back home? Buy or sell stable USDT peer-to-peer with verified counterparts at local market exchange rates under smart contract escrow safeguards.
              </p>
            </div>

            {/* freelancers */}
            <div
              className="card-premium"
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              style={{
                background: '#111318', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '12px',
                transition: 'all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)'
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px', transition: 'transform 0.2s' }} className="target-icon">💼</div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f5c518', margin: 0 }}>Freelancers & Remote Workers</h3>
              <p style={{ fontSize: '13.5px', color: '#c8c8c8', lineHeight: 1.6, margin: 0 }}>
                Receiving foreign currencies or USD from international freelance clients? Swap your on-chain assets and access your ETB instantly in major bank accounts.
              </p>
            </div>

            {/* local traders */}
            <div
              className="card-premium"
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              style={{
                background: '#111318', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '12px',
                transition: 'all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)'
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px', transition: 'transform 0.2s' }} className="target-icon">🤝</div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f5c518', margin: 0 }}>Local P2P Traders</h3>
              <p style={{ fontSize: '13.5px', color: '#c8c8c8', lineHeight: 1.6, margin: 0 }}>
                Exchange USDT peer-to-peer securely. Set custom listing rates, choose preferred bank transfer methods, and settle orders with direct admin dispute mediation.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ── DOWNLOAD APK SECTION ── */}
      <section id="download" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#00d4a0', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>MOBILE DOWNLOAD</span>
              <h2 className="serif-title" style={{ fontSize: '42px', color: '#fff', margin: '8px 0 16px 0', fontWeight: 400 }}>EthioSwap Android App Center</h2>
              <p style={{ fontSize: '14px', color: '#c8c8c8', lineHeight: 1.7, marginBottom: '24px' }}>
                Secure your wallet using native biometric lock parameters (Fingerprint or Face ID) and upload documents instantly using device cameras.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#111318', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#8b92a8' }}>Apk Version</div>
                  <strong style={{ color: '#fff', fontSize: '13px' }}>v2.4.0 (Beta)</strong>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#8b92a8' }}>File Size</div>
                  <strong style={{ color: '#fff', fontSize: '13px' }}>12.4 MB</strong>
                </div>
                <div style={{ gridColumn: 'span 2', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', marginTop: '6px' }}>
                  <div style={{ fontSize: '11px', color: '#8b92a8' }}>SHA-256 Checksum</div>
                  <div style={{ fontSize: '10px', color: '#f5c518', fontFamily: 'monospace', wordBreak: 'break-all' }}>4a2b9f8d7c6e5a4b3c2d1e0f9a8b7c6d5e4f3a2b1</div>
                </div>
              </div>

              <div style={{ marginTop: '24px' }}>
                <button 
                  onClick={() => setOpenModal('download')} 
                  className="cta-btn-gold"
                  onMouseEnter={() => setCursorHovered(true)}
                  onMouseLeave={() => setCursorHovered(false)}
                  style={{ border: 'none' }}
                >
                  📥 Download Android APK
                </button>
              </div>
            </div>

            {/* Installation Guide */}
            <div className="card-premium" style={{ background: '#111318', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '32px' }}>
              <h3 style={{ fontSize: '18px', color: '#fff', margin: '0 0 20px 0', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '12px' }}>APK Installation Guide</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { n: '1', t: 'Download the APK', d: 'Click the download button above or scan our verification QR code on your mobile browser.' },
                  { n: '2', t: 'Enable Unknown Sources', d: 'Go to Settings > Security > Install Unknown Apps on your device and allow permissions.' },
                  { n: '3', t: 'Install and Set App Lock', d: 'Launch the installer, complete setup, and register your fingerprint lock screen pin.' }
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '16px' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(245,197,24,0.1)',
                      color: '#f5c518', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '12px', flexShrink: 0
                    }}>
                      {item.n}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '14px', color: '#fff', fontWeight: 600, margin: '0 0 4px 0' }}>{item.t}</h4>
                      <p style={{ fontSize: '13px', color: '#c8c8c8', margin: 0, lineHeight: 1.5 }}>{item.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── FAQ ACCORDION SECTION ── */}
      <section id="faq" style={{ padding: '100px 24px', background: '#0d0d0d', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <span style={{ fontSize: '11px', color: '#00d4a0', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>HELP CENTER</span>
            <h2 className="serif-title" style={{ fontSize: '42px', color: '#fff', margin: '8px 0 0 0', fontWeight: 400 }}>Frequently Asked Questions</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {faqItems.map((item, index) => {
              const isActive = faqActiveIndex === index;
              return (
                <div
                  key={index}
                  style={{
                    background: '#111318', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '12px', overflow: 'hidden'
                  }}
                >
                  <button
                    onClick={() => setFaqActiveIndex(isActive ? null : index)}
                    style={{
                      width: '100%', padding: '18px 24px', background: 'transparent',
                      border: 'none', color: '#fff', fontSize: '15px', fontWeight: 600,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      cursor: 'pointer', textAlign: 'left'
                    }}
                  >
                    <span>{item.q}</span>
                    <span style={{ color: '#f5c518', fontSize: '18px' }}>{isActive ? '−' : '+'}</span>
                  </button>
                  <div style={{
                    maxHeight: isActive ? '200px' : '0px',
                    transition: 'max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    overflow: 'hidden'
                  }}>
                    <p style={{ padding: '0 24px 20px', margin: 0, fontSize: '13.5px', color: '#c8c8c8', lineHeight: 1.6 }}>
                      {item.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ── REDESIGNED 4-COLUMN FOOTER ── */}
      <footer style={{ background: '#080808', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '80px 24px 40px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '48px', marginBottom: '60px' }}>
            
            {/* Col 1 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Logo size={36} showText={true} />
              <p style={{ fontSize: '13px', color: '#c8c8c8', lineHeight: 1.6 }}>
                Safe. Verified. Ethiopian.<br />
                Ethiopia's premium peer-to-peer USD escrow exchange.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                {['✈️', '📸', '🎵'].map((soc, idx) => (
                  <button
                    key={idx}
                    className="btn-premium-ghost"
                    style={{
                      width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '16px', padding: 0
                    }}
                  >
                    {soc}
                  </button>
                ))}
              </div>
            </div>

            {/* Col 2 */}
            <div>
              <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '20px' }}>Product Links</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px' }}>
                <li><a href="#features" style={{ color: '#c8c8c8', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#f5c518'} onMouseOut={e => e.currentTarget.style.color = '#c8c8c8'}>Features</a></li>
                <li><a href="#timeline" style={{ color: '#c8c8c8', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#f5c518'} onMouseOut={e => e.currentTarget.style.color = '#c8c8c8'}>How It Works</a></li>
                <li><a href="#market" style={{ color: '#c8c8c8', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#f5c518'} onMouseOut={e => e.currentTarget.style.color = '#c8c8c8'}>Live P2P Market</a></li>
                <li><a href="#download" style={{ color: '#c8c8c8', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#f5c518'} onMouseOut={e => e.currentTarget.style.color = '#c8c8c8'}>Download App</a></li>
              </ul>
            </div>

            {/* Col 3 */}
            <div>
              <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '20px' }}>Company Links</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px' }}>
                <li>
                  <button 
                    onClick={() => setOpenModal('about')} 
                    style={{ background: 'none', border: 'none', color: '#c8c8c8', cursor: 'pointer', padding: 0, fontSize: 'inherit', textAlign: 'left', transition: 'color 0.2s', fontFamily: 'inherit' }}
                    onMouseOver={e => e.currentTarget.style.color = '#f5c518'}
                    onMouseOut={e => e.currentTarget.style.color = '#c8c8c8'}
                  >
                    About Us
                  </button>
                </li>
                <li><a href="#faq" style={{ color: '#c8c8c8', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#f5c518'} onMouseOut={e => e.currentTarget.style.color = '#c8c8c8'}>FAQ Help</a></li>
                <li><a href="https://t.me/EthioSwap1" target="_blank" rel="noreferrer" style={{ color: '#c8c8c8', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#f5c518'} onMouseOut={e => e.currentTarget.style.color = '#c8c8c8'}>Telegram Support 💬</a></li>
              </ul>
            </div>

            {/* Col 4 */}
            <div>
              <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '20px' }}>Legal Policy</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px' }}>
                {['terms', 'privacy', 'escrow', 'aml'].map((mKey) => (
                  <li key={mKey}>
                    <button
                      onClick={() => setOpenModal(mKey)}
                      style={{ background: 'none', border: 'none', color: '#c8c8c8', cursor: 'pointer', padding: 0, fontSize: 'inherit', textAlign: 'left', transition: 'color 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.color = '#f5c518'}
                      onMouseOut={e => e.currentTarget.style.color = '#c8c8c8'}
                    >
                      {mKey === 'terms' ? 'Terms of Service' : mKey === 'privacy' ? 'Privacy Policy' : mKey === 'escrow' ? 'Escrow dispute rules' : 'AML Compliance'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Bottom Bar */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap',
            gap: '16px', borderTop: '1px solid rgba(245,197,24,0.15)', paddingTop: '28px', fontSize: '13px', color: '#8b92a8'
          }}>
            <span>© 2026 EthioSwap. All rights reserved. Addis Ababa, Ethiopia.</span>
            <span style={{ color: '#f5c518', fontWeight: 600 }}>Secured by Smart Escrow Technology</span>
          </div>

        </div>
      </footer>

      {/* ── LEGAL ACCORDION MODALS OVERLAYS ── */}
      {openModal && (
        <div className="legal-modal-overlay" onClick={() => setOpenModal(null)}>
          <div className="legal-modal-card" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setOpenModal(null)}
              className="btn-premium-ghost"
              style={{ position: 'absolute', top: '20px', right: '20px', fontSize: '18px', padding: '6px' }}
            >
              ✕
            </button>
            <div style={{ marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '14px' }}>
              <h3 className="serif-title" style={{ fontSize: '24px', color: '#fff', fontWeight: 400, margin: 0 }}>
                {getModalTitle(openModal)}
              </h3>
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
