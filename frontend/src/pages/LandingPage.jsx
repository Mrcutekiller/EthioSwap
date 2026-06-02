import React, { useState, useEffect, useRef } from 'react';
import Logo from '../components/Logo.jsx';
import { supabase, isSupabaseConfigured } from '../supabaseClient';

const LandingPage = ({ onGetStarted, onSignIn, systemSettings }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [faqActiveIndex, setFaqActiveIndex] = useState(null);
  const [openModal, setOpenModal] = useState(null);

  // Calculator state
  const [calcMode, setCalcMode] = useState('usd-to-etb');
  const [calcInput, setCalcInput] = useState('');

  // Reviews state
  const [reviews, setReviews] = useState([]);

  const buyRate = systemSettings?.etbRatePerDollar ?? 157.50;
  const sellRate = systemSettings?.etbRatePerDollarSell ?? systemSettings?.etbRatePerDollar ?? 155.80;

  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [cursorHovered, setCursorHovered] = useState(false);
  const [phoneTilt, setPhoneTilt] = useState({ rx: 0, ry: 0 });
  const stepsRef = useRef(null);
  const [stepsVisible, setStepsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const [liveStats, setLiveStats] = useState({ users: 1247, volume: 2840000, rating: 4.8, scams: 0 });
  const [liveListings, setLiveListings] = useState([]);
  const [inviteProgress, setInviteProgress] = useState(73);
  const [liveRate, setLiveRate] = useState(buyRate);

  useEffect(() => {
    setPrefersReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const moveCursor = (e) => setCursorPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', moveCursor);
    return () => window.removeEventListener('mousemove', moveCursor);
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const fetchStats = async () => {
      try {
        const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
        if (count) setLiveStats(prev => ({ ...prev, users: count }));
      } catch {}
    };
    const fetchListings = async () => {
      try {
        const { data } = await supabase.from('p2p_listings').select('*').eq('status', 'active').limit(10);
        if (data?.length) setLiveListings(data);
      } catch {}
    };
    fetchStats();
    fetchListings();
    const fetchReviews = async () => {
      try {
        const { data } = await supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(10);
        if (data) setReviews(data);
      } catch {}
    };
    fetchReviews();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveRate(prev => {
        const delta = (Math.random() - 0.5) * 0.6;
        return Math.round((prev + delta) * 100) / 100;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePhoneMouseMove = (e) => {
    if (prefersReducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const ry = ((x - centerX) / centerX) * 15;
    const rx = ((centerY - y) / centerY) * 15;
    setPhoneTilt({ rx, ry });
  };

  const handlePhoneMouseLeave = () => setPhoneTilt({ rx: 0, ry: 0 });

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if (entry.isIntersecting) setStepsVisible(true); });
    }, { threshold: 0.1 });
    if (stepsRef.current) observer.observe(stepsRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
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
    const rotateX = ((centerY - y) / centerY) * 8;
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

  const calcResult = calcInput
    ? calcMode === 'usd-to-etb'
      ? (parseFloat(calcInput) * liveRate).toFixed(2)
      : (parseFloat(calcInput) / liveRate).toFixed(4)
    : '';

  const faqItems = [
    { q: "How does the escrow system protect my money?", a: "When a buyer starts a trade, the seller's USDT is immediately locked in our secure escrow. The seller cannot move those funds until the buyer confirms payment and the seller verifies receipt. If there's a dispute, our admin team in Addis Ababa reviews evidence and resolves it fairly." },
    { q: "What payment methods can I use?", a: "You can trade using Telebirr, CBE (Commercial Bank of Ethiopia), Dashen Bank, Awash Bank, and HelloCash. All fiat transfers happen directly between users — we never touch your birr." },
    { q: "Why do I need to verify my identity (KYC)?", a: "KYC verification (National ID + live selfie) protects you from fraud and scam artists. Only verified users can trade, which means every counterparty on the platform is a real, identified person. Unverified users can browse rates but cannot trade." },
    { q: "What networks are supported for crypto deposits?", a: "We support TRC20 (Tron) and ERC20 (Ethereum) networks for USDT deposits and withdrawals. TRC20 is recommended for lower fees." },
    { q: "How fast are trades completed?", a: "Most trades are completed in under 15 minutes. The buyer has a 30-minute window to send payment and mark as paid. The seller then confirms receipt and releases the USDT instantly." },
    { q: "What happens if there's a dispute?", a: "Either party can open a dispute at any time. Our support team reviews chat history, payment receipts, and bank statements, then makes a fair decision. Escrow funds are held safely throughout." },
    { q: "Is EthioSwap available on mobile?", a: "Yes! EthioSwap works on both web browsers and our native Android app. Your account, wallet, and trade history sync instantly across devices. The Android APK is available for download in closed beta." },
    { q: "How much does it cost to trade?", a: "EthioSwap charges a small 0.5% platform fee on completed trades. There are no hidden fees, no deposit fees, and no withdrawal fees. You only pay when you successfully trade." },
  ];

  const testimonials = [
    { name: 'Daniel M.', role: 'Freelance Designer', text: 'I receive USD from clients in the US and convert to birr through EthioSwap. The escrow makes me feel safe — I never worry about getting scammed. Completed over 50 trades with zero issues.', rating: 5 },
    { name: 'Hana T.', role: 'Small Business Owner', text: 'Best P2P platform in Ethiopia. The rates are better than any bank, and I can trade right from my phone. KYC verification was quick and easy. Highly recommend for anyone doing cross-border payments.', rating: 5 },
    { name: 'Yusuf A.', role: 'Diaspora — Dubai', text: 'I send money home to my family in Addis using EthioSwap. Much faster and cheaper than traditional remittance services. The escrow gives my family peace of mind too.', rating: 5 },
  ];

  const getModalTitle = (type) => {
    switch (type) {
      case 'terms': return 'Terms of Service';
      case 'privacy': return 'Privacy Policy';
      case 'escrow': return 'Escrow Operations & Dispute Policy';
      case 'aml': return 'Anti-Money Laundering & KYC Rules';
      case 'about': return 'About EthioSwap';
      case 'download': return 'Download EthioSwap';
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
          <h4>3. Supported Networks</h4>
          <p>Our wallet handles standard On-Chain USDT deposits and withdrawals exclusively (supporting Tron TRC20 and Ethereum ERC20 networks).</p>
        </>
      );
      case 'privacy': return (
        <>
          <h4>1. Data Collection</h4>
          <p>EthioSwap collects your personal information, government document uploads, and biometric data for KYC verification purposes.</p>
          <h4>2. KYC Data</h4>
          <p>To create an active trading profile, the platform uploads scans of your National ID card (front and back) and a live face selfie. All documents are encrypted and stored securely.</p>
          <h4>3. Biometric Security</h4>
          <p>Biometric credentials (fingerprint/Face ID) are stored exclusively within your device's secure hardware. EthioSwap never accesses your biometric data.</p>
        </>
      );
      case 'escrow': return (
        <>
          <h4>1. Escrow Lock</h4>
          <p>When a trade is initiated, the seller's USDT is instantly locked in escrow, preventing withdrawal. A 30-minute payment window begins.</p>
          <h4>2. Payment & Release</h4>
          <p>The buyer transfers ETB to the seller's bank account, clicks 'I Have Paid', and uploads proof. The seller confirms receipt before releasing USDT.</p>
          <h4>3. Dispute Resolution</h4>
          <p>If either party opens a dispute, our support team examines transaction receipts and bank statements, then executes a fair release or refund.</p>
        </>
      );
      case 'aml': return (
        <>
          <h4>1. Compliance</h4>
          <p>EthioSwap complies with anti-money laundering (AML) guidelines to protect the trading community.</p>
          <h4>2. Mandatory KYC</h4>
          <p>Unverified accounts can browse P2P ads and configure settings, but are blocked from initiating trades, deposits, or withdrawals. Verification is mandatory.</p>
        </>
      );
      case 'about': return (
        <>
          <h4>1. Our Mission</h4>
          <p>EthioSwap bridges international digital assets and the local Ethiopian financial landscape. We provide secure, automated P2P trading for remote workers, freelancers, merchants, and the diaspora.</p>
          <h4>2. Based in Addis Ababa</h4>
          <p>Our support and arbitration team is based in Addis Ababa to ensure rapid support and secure dispute resolution.</p>
          <h4>3. Built for Ethiopia</h4>
          <p>By enforcing KYC and leveraging escrow, we eliminate common P2P scams and safeguard your transactions.</p>
        </>
      );
      case 'download': return (
        <>
          <h4>1. Android Beta</h4>
          <p>The EthioSwap Android app is currently in closed beta. Contact our Telegram support for access to the latest APK.</p>
          <h4>2. Get the APK</h4>
          <p>To request the verified APK file, contact our official support channel on Telegram:</p>
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
            <a href="https://t.me/EthioSwap1" target="_blank" rel="noreferrer" className="cta-btn-gold" style={{ height: '40px', fontSize: '14px', borderRadius: '8px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              Contact Telegram Support
            </a>
          </div>
        </>
      );
      default: return null;
    }
  };

  return (
    <div style={{ background: '#0a0a0a', color: '#c8c8c8', fontFamily: "'Inter', sans-serif", overflowX: 'hidden', position: 'relative' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        .serif-title { font-family: 'Playfair Display', serif; font-weight: 700; }
        .cursor-trail { position: fixed; width: 8px; height: 8px; background: #f5c518; border-radius: 50%; pointer-events: none; z-index: 9999; transform: translate(-50%, -50%); transition: width 0.2s, height 0.2s, background-color 0.2s; }
        .cursor-trail.hovered { width: 40px; height: 40px; background: rgba(245, 197, 24, 0.15); border: 1px solid #f5c518; }
        .nav-floating { position: fixed; top: 0; left: 0; right: 0; height: 80px; background: transparent; backdrop-filter: none; z-index: 1000; transition: all 0.3s ease; }
        .nav-floating.scrolled { background: rgba(10, 10, 10, 0.85); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255, 255, 255, 0.05); height: 70px; }
        @keyframes autoRotatePhone { 0% { transform: perspective(1000px) rotateY(0deg); } 100% { transform: perspective(1000px) rotateY(360deg); } }
        @keyframes slideDownMenu { 0% { transform: translateY(-100%); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        .phone-mockup-3d { animation: autoRotatePhone 20s linear infinite; transform-style: preserve-3d; transition: transform 0.1s ease; }
        .phone-mockup-3d:hover { animation-play-state: paused; }
        @keyframes usdtOrbit { 0% { transform: translate(-140px, -50px) translateZ(50px); z-index: 10; } 50% { transform: translate(140px, 50px) translateZ(-50px); z-index: 1; } 100% { transform: translate(-140px, -50px) translateZ(50px); z-index: 10; } }
        @keyframes etbOrbit { 0% { transform: translate(140px, 60px) translateZ(-50px); z-index: 1; } 50% { transform: translate(-140px, -60px) translateZ(50px); z-index: 10; } 100% { transform: translate(140px, 60px) translateZ(-50px); z-index: 1; } }
        .orbit-chip-usdt { animation: usdtOrbit 12s ease-in-out infinite; }
        .orbit-chip-etb { animation: etbOrbit 12s ease-in-out infinite; }
        @keyframes marqueeScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .marquee-inner { display: flex; width: max-content; animation: marqueeScroll 25s linear infinite; }
        .marquee-container:hover .marquee-inner { animation-play-state: paused; }
        .step-timeline-item { opacity: 0; transform: translateY(30px); transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        .step-timeline-item.visible { opacity: 1; transform: translateY(0); }
        .cta-btn-gold { background: #f5c518; color: #0a0a0a; border: none; border-radius: 10px; padding: 0 24px; font-weight: 700; font-size: 16px; height: 48px; cursor: pointer; transition: all 0.2s ease; display: inline-flex; align-items: center; justify-content: center; }
        .cta-btn-gold:hover { background: #fcd34d; transform: translateY(-1px); }
        .cta-btn-outline { background: transparent; border: 1px solid rgba(255,255,255,0.25); color: #f0f2f8; border-radius: 10px; padding: 0 24px; font-weight: 600; font-size: 16px; height: 48px; cursor: pointer; transition: all 0.2s ease; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; }
        .cta-btn-outline:hover { background: rgba(255,255,255,0.03); border-color: #f5c518; }
        .badge-live-pulse { width: 8px; height: 8px; background: #00d4a0; border-radius: 50%; display: inline-block; box-shadow: 0 0 10px #00d4a0; }
        @keyframes livePulse { 0% { transform: scale(0.9); opacity: 0.5; } 50% { transform: scale(1.3); opacity: 1; } 100% { transform: scale(0.9); opacity: 0.5; } }
        .badge-live-pulse { animation: livePulse 1.8s ease-in-out infinite; }
        .market-tab-btn { padding: 12px 20px; background: transparent; border: none; color: #8b92a8; font-size: 15px; font-weight: 600; cursor: pointer; position: relative; transition: color 0.2s ease; }
        .market-tab-btn.active { color: #f5c518; }
        .market-tab-btn.active::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: #f5c518; }
        .legal-modal-overlay { position: fixed; inset: 0; background: rgba(5,5,5,0.85); backdrop-filter: blur(12px); z-index: 5000; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .legal-modal-card { background: #111318; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; width: 100%; max-width: 580px; max-height: 80vh; overflow-y: auto; padding: 32px; position: relative; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
        @keyframes countUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .stat-number { animation: countUp 0.6s ease-out; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
        .testimonial-card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .testimonial-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.3); }
        .trust-card { transition: transform 0.2s ease, border-color 0.2s ease; }
        .trust-card:hover { transform: translateY(-2px); border-color: rgba(245, 197, 24, 0.3); }
      `}</style>

      {!prefersReducedMotion && (
        <div className={`cursor-trail ${cursorHovered ? 'hovered' : ''}`} style={{ left: `${cursorPos.x}px`, top: `${cursorPos.y}px` }} />
      )}

      {/* ── NAVBAR ── */}
      <nav className={`nav-floating ${scrolled ? 'scrolled' : ''}`} style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: scrolled ? '64px' : '80px',
        background: scrolled ? 'rgba(10, 10, 10, 0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none', WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255, 255, 255, 0.07)' : 'none', zIndex: 1000, transition: 'all 0.3s ease'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
          <Logo size={36} showText={true} />
          {width > 1024 && (
            <>
              <ul style={{ display: 'flex', alignItems: 'center', gap: '24px', listStyle: 'none', margin: 0, padding: 0 }}>
                {[
                  { id: 'features', label: 'Features', target: '#features' },
                  { id: 'how-it-works', label: 'How It Works', target: '#how-it-works' },
                  { id: 'market', label: 'Live Rates', target: '#market' },
                  { id: 'why-us', label: 'Why Us', target: '#why-us' },
                  { id: 'faq', label: 'FAQ', target: '#faq' },
                ].map(link => (
                  <li key={link.id}>
                    <a href={link.target} onMouseEnter={() => setCursorHovered(true)} onMouseLeave={() => setCursorHovered(false)}
                      style={{ color: '#c8c8c8', textDecoration: 'none', fontSize: '14px', fontWeight: 500, transition: 'color 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.color = '#f5c518'} onMouseOut={e => e.currentTarget.style.color = '#c8c8c8'}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
              <button onClick={onSignIn} onMouseEnter={() => setCursorHovered(true)} onMouseLeave={() => setCursorHovered(false)}
                className="cta-btn-gold" style={{ height: '36px', fontSize: '14px', padding: '0 16px', borderRadius: '8px' }}>
                Sign In
              </button>
            </>
          )}
          {width >= 768 && width <= 1024 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <ul style={{ display: 'flex', alignItems: 'center', gap: '18px', listStyle: 'none', margin: 0, padding: 0 }}>
                {[{ id: 'market', label: 'Live Rates', target: '#market' }, { id: 'how-it-works', label: 'How It Works', target: '#how-it-works' }].map(link => (
                  <li key={link.id}>
                    <a href={link.target} style={{ color: '#c8c8c8', textDecoration: 'none', fontSize: '13px', fontWeight: 500, transition: 'color 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.color = '#f5c518'} onMouseOut={e => e.currentTarget.style.color = '#c8c8c8'}>
                      {link.label}
                    </a>
                  </li>
                ))}
                <li>
                  <button onClick={() => setMobileMenuOpen(true)} style={{ background: 'none', border: 'none', color: '#c8c8c8', cursor: 'pointer', fontSize: '18px', fontWeight: 700, padding: 0 }}
                    onMouseOver={e => e.currentTarget.style.color = '#f5c518'} onMouseOut={e => e.currentTarget.style.color = '#c8c8c8'}>
                    ···
                  </button>
                </li>
              </ul>
              <button onClick={onSignIn} className="cta-btn-gold" style={{ height: '36px', fontSize: '13px', padding: '0 12px', borderRadius: '8px' }}>Sign In</button>
            </div>
          )}
          {width < 768 && (
            <button onClick={() => setMobileMenuOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '5px', padding: '8px' }}>
              <div style={{ width: '24px', height: '2px', background: '#f5c518', borderRadius: '2px' }} />
              <div style={{ width: '24px', height: '2px', background: '#f5c518', borderRadius: '2px' }} />
              <div style={{ width: '24px', height: '2px', background: '#f5c518', borderRadius: '2px' }} />
            </button>
          )}
        </div>
      </nav>

      {/* ── MOBILE MENU ── */}
      {mobileMenuOpen && (
        <div style={{ position: 'fixed', inset: 0, background: '#0a0a0a', zIndex: 9999, display: 'flex', flexDirection: 'column', padding: '24px', animation: 'slideDownMenu 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
            <Logo size={36} showText={true} />
            <button onClick={() => setMobileMenuOpen(false)} style={{ background: 'none', border: 'none', color: '#f5c518', fontSize: '28px', cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[{ label: 'Features', target: '#features' }, { label: 'How It Works', target: '#how-it-works' }, { label: 'Live Rates', target: '#market' }, { label: 'Why Us', target: '#why-us' }, { label: 'FAQ', target: '#faq' }].map((link, idx, arr) => (
              <div key={link.label}>
                <a href={link.target} onClick={() => setMobileMenuOpen(false)}
                  style={{ display: 'block', color: '#c8c8c8', textDecoration: 'none', fontSize: '18px', fontWeight: 600, padding: '16px 0', textAlign: 'center', transition: 'color 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.color = '#f5c518'} onMouseOut={e => e.currentTarget.style.color = '#c8c8c8'}>
                  {link.label}
                </a>
                {idx < arr.length - 1 && <div style={{ height: '1px', background: 'rgba(245, 197, 24, 0.15)', width: '80px', margin: '0 auto' }} />}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 'auto', paddingBottom: '20px' }}>
            <button onClick={() => { setMobileMenuOpen(false); onSignIn(); }} className="cta-btn-gold" style={{ width: '100%', height: '48px', fontSize: '16px', borderRadius: '10px' }}>Sign In</button>
          </div>
        </div>
      )}

      {/* ── HERO SECTION ── */}
      <header id="hero" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '120px 24px 80px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(245,197,24,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(245,197,24,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 1 }} />
        <div style={{ position: 'absolute', top: '30%', left: '10%', width: '450px', height: '450px', background: 'radial-gradient(circle, rgba(0,212,160,0.05) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 1 }} />

        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', zIndex: 2 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px', alignItems: 'center' }}>

            <div style={{ flex: 1.5 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#111318', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '50px', padding: '6px 16px', marginBottom: '24px' }}>
                <span className="badge-live-pulse" />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#00d4a0', letterSpacing: '0.08em' }}>ETHIOSWAP v2.4</span>
              </div>

              <h1 className="serif-title" style={{ fontSize: width < 768 ? '36px' : '58px', lineHeight: 1.1, color: '#ffffff', margin: '0 0 16px 0', fontWeight: 700 }}>
                Ethiopia's Safest Way to<br />
                Buy & Sell <span style={{ color: '#f5c518' }}>USDT</span>
              </h1>

              <p style={{ fontSize: '16px', color: '#c8c8c8', lineHeight: 1.7, maxWidth: '480px', margin: '0 0 24px 0' }}>
                Peer-to-peer USDT trading secured by escrow, verified by real ID, and protected by admin oversight. Trade with confidence — your money is safe.
              </p>

              {/* Live Rate Ticker */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: '#111318', border: '1px solid rgba(0,212,160,0.2)', borderRadius: '12px', padding: '10px 20px', marginBottom: '28px' }}>
                <span className="badge-live-pulse" />
                <span style={{ fontSize: '13px', color: '#8b92a8', fontWeight: 600 }}>Live Rate:</span>
                <span style={{ fontSize: '18px', color: '#00d4a0', fontWeight: 800 }}>1 USDT = {liveRate} ETB</span>
              </div>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '32px' }}>
                <button onClick={onGetStarted} onMouseEnter={() => setCursorHovered(true)} onMouseLeave={() => setCursorHovered(false)}
                  className="cta-btn-gold" style={{ height: '48px', borderRadius: '10px' }}>
                  Create Free Account
                </button>
                <a href="#market" onMouseEnter={() => setCursorHovered(true)} onMouseLeave={() => setCursorHovered(false)}
                  className="cta-btn-outline" style={{ height: '48px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  View Live Rates
                </a>
              </div>

              {/* Trust Badges */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', background: '#111318', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '50px', padding: '8px 20px', fontSize: '12px', color: '#c8c8c8', fontWeight: 600 }}>
                <span>🔒 Escrow Protected</span>
                <span style={{ color: '#f5c518' }}>•</span>
                <span>🛡️ KYC Verified</span>
                <span style={{ color: '#f5c518' }}>•</span>
                <span>⭐ 4.8 Rating</span>
              </div>
            </div>

            {/* 3D Phone Mockup */}
            <div onMouseMove={handlePhoneMouseMove} onMouseLeave={handlePhoneMouseLeave}
              style={{ flex: 1, display: 'flex', justifyContent: 'center', position: 'relative', height: '480px' }}>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '320px', height: '320px', background: 'radial-gradient(circle, rgba(0,212,160,0.12) 0%, transparent 70%)', zIndex: 1, pointerEvents: 'none' }} />
              <div className="phone-mockup-3d" style={{
                width: '240px', height: '420px', background: '#111318', border: '4px solid rgba(255, 255, 255, 0.12)', borderRadius: '32px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.7), 0 0 30px rgba(0, 212, 160, 0.1)', position: 'absolute', zIndex: 3, top: '30px', padding: '16px',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                transform: `perspective(1000px) rotateX(${phoneTilt.rx}deg) rotateY(${phoneTilt.ry}deg)`,
              }}>
                <div style={{ width: '90px', height: '18px', background: '#000', borderRadius: '0 0 12px 12px', margin: '-16px auto 14px', flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8b92a8', fontSize: '10px' }}>
                    <span>EthioSwap</span>
                    <span style={{ color: '#00d4a0' }}>● Live</span>
                  </div>
                  <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#8b92a8' }}>TRADING VOLUME</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#f5c518', marginTop: '4px' }}>$2.8M+</div>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(0, 212, 160, 0.1)', border: '1px solid rgba(0, 212, 160, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', boxShadow: '0 0 20px rgba(0, 212, 160, 0.15)' }}>
                      🔒
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#00d4a0', letterSpacing: '0.04em' }}>ESCROW SECURED</span>
                  </div>
                  <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px', marginTop: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#8b92a8', marginBottom: '4px' }}>
                      <span>Best Buy Rate</span>
                      <span style={{ color: '#00d4a0' }}>TRC20 / ERC20</span>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#f5c518' }}>1 USDT = {liveRate} ETB</div>
                  </div>
                </div>
              </div>
              <div className="orbit-chip-usdt" style={{
                position: 'absolute', top: '160px', left: '50%', background: '#111318', border: '1px solid rgba(0,212,160,0.3)',
                borderRadius: '30px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, color: '#00d4a0', boxShadow: '0 4px 15px rgba(0, 212, 160, 0.1)', pointerEvents: 'none'
              }}>
                💵 USDT TRC20
              </div>
              <div className="orbit-chip-etb" style={{
                position: 'absolute', top: '240px', left: '50%', background: '#111318', border: '1px solid rgba(245,197,24,0.3)',
                borderRadius: '30px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, color: '#f5c518', boxShadow: '0 4px 15px rgba(245, 197, 24, 0.1)', pointerEvents: 'none'
              }}>
                🇪🇹 CBE / Telebirr
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── LIVE STATS BAR ── */}
      <div style={{ background: '#0d0d0d', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '32px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '24px' }}>
          {[
            { label: 'Verified Traders', value: liveStats.users.toLocaleString(), icon: '👥' },
            { label: 'Volume Traded', value: `$${(liveStats.volume / 1000000).toFixed(1)}M`, icon: '📊' },
            { label: 'Average Rating', value: `${liveStats.rating}★`, icon: '⭐' },
            { label: 'Scam Reports', value: `${liveStats.scams}`, icon: '🛡️' },
          ].map((stat, idx) => (
            <div key={idx} style={{ textAlign: 'center', minWidth: '140px' }}>
              <div style={{ fontSize: '24px', marginBottom: '4px' }}>{stat.icon}</div>
              <div className="stat-number" style={{ fontSize: '28px', fontWeight: 800, color: '#f5c518', fontFamily: "'Playfair Display', serif" }}>{stat.value}</div>
              <div style={{ fontSize: '12px', color: '#8b92a8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES SECTION ── */}
      <section id="features" style={{ padding: '100px 24px', position: 'relative' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <span style={{ fontSize: '11px', color: '#00d4a0', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>WHAT YOU CAN DO</span>
            <h2 className="serif-title" style={{ fontSize: '42px', color: '#fff', margin: '8px 0 16px 0', fontWeight: 400 }}>Everything You Need to Trade</h2>
            <p style={{ maxWidth: '560px', margin: '0 auto', fontSize: '14px', color: '#c8c8c8', lineHeight: 1.7 }}>
              From buying your first USDT to sending money home — EthioSwap has you covered with secure, instant, peer-to-peer trading.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {[
              { t: 'Buy USDT', d: 'Purchase USDT from verified sellers using Telebirr, CBE, Dashen Bank, or Awash Bank. Funds are held in escrow until you confirm payment.', ic: '💵' },
              { t: 'Sell USDT', d: 'List your USDT for sale at your preferred rate. Receive ETB directly to your bank account with buyer verification.', ic: '📈' },
              { t: 'Send Money', d: 'Send USDT to any EthioSwap user instantly with zero fees. Perfect for splitting bills or sending to friends and family.', ic: '📤' },
              { t: 'Receive Money', d: 'Share your wallet address to receive USDT from anyone, anywhere in the world. Supports TRC20 and ERC20 networks.', ic: '📥' },
              { t: 'Deposit & Withdraw', d: 'Fund your wallet with on-chain USDT deposits (TRC20/ERC20) and withdraw to external wallets anytime.', ic: '🔄' },
              { t: 'Track Live Rates', d: 'Monitor real-time USDT/ETB exchange rates, market trends, and best buy/sell offers from verified traders.', ic: '📊' },
            ].map((ft, idx) => (
              <div key={idx} className="card-premium" onMouseMove={handleCardMouseMove} onMouseLeave={handleCardMouseLeave}
                style={{ background: '#111318', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '32px', cursor: 'default', transition: 'transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1), border-color 0.2s, box-shadow 0.2s' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#1a1d23', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', border: '1px solid rgba(255,255,255,0.04)', marginBottom: '20px' }}>{ft.ic}</div>
                <h3 style={{ fontSize: '17px', color: '#fff', fontWeight: 600, margin: '0 0 10px 0' }}>{ft.t}</h3>
                <p style={{ fontSize: '14px', color: '#c8c8c8', lineHeight: 1.7, margin: 0 }}>{ft.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" ref={stepsRef} style={{ padding: '100px 24px', background: '#0d0d0d', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <span style={{ fontSize: '11px', color: '#00d4a0', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>HOW IT WORKS</span>
            <h2 className="serif-title" style={{ fontSize: '42px', color: '#fff', margin: '8px 0 16px 0', fontWeight: 400 }}>Start Trading in 3 Simple Steps</h2>
            <p style={{ maxWidth: '560px', margin: '0 auto', fontSize: '14px', color: '#c8c8c8', lineHeight: 1.7 }}>
              Getting started with EthioSwap is quick and easy. No crypto knowledge required.
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'center', position: 'relative', padding: '20px 0' }}>
            {[
              { step: '1', t: 'Create Account', d: 'Sign up for free and verify your identity with a National ID and live selfie. Takes just a few minutes.' },
              { step: '2', t: 'Find a Trade', d: 'Browse live P2P listings or create your own. Filter by payment method, rate, and trade limits.' },
              { step: '3', t: 'Trade Safely', d: 'USDT is locked in escrow. Send payment, confirm, and receive your funds. Admin support is always available.' },
            ].map((step, idx) => (
              <div key={idx} className={`step-timeline-item ${stepsVisible ? 'visible' : ''}`}
                style={{ flex: '1 1 280px', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '16px', transitionDelay: `${idx * 150}ms` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid #f5c518', background: '#0a0a0a', color: '#f5c518', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '20px', zIndex: 2 }}>
                    {step.step}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <h4 style={{ fontSize: '18px', color: '#fff', fontWeight: 600, margin: '0 0 8px 0' }}>{step.t}</h4>
                  <p style={{ fontSize: '14px', color: '#c8c8c8', lineHeight: 1.6, margin: 0 }}>{step.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY US SECTION ── */}
      <section id="why-us" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <span style={{ fontSize: '11px', color: '#00d4a0', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>WHY ETHIOPIANS CHOOSE US</span>
            <h2 className="serif-title" style={{ fontSize: '42px', color: '#fff', margin: '8px 0 16px 0', fontWeight: 400 }}>Built for Ethiopia, by Ethiopians</h2>
            <p style={{ maxWidth: '560px', margin: '0 auto', fontSize: '14px', color: '#c8c8c8', lineHeight: 1.7 }}>
              We understand the unique challenges of trading in Ethiopia. That's why we built a platform that works the way you need it to.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {[
              { t: 'Escrow Protection', d: 'Every trade is protected by automated escrow. Your USDT is locked until payment is verified. No trust required — the system guarantees safety.', ic: '🔒' },
              { t: 'Real Identity (KYC)', d: 'Every trader is verified with a National ID and live selfie. No anonymous accounts, no fake profiles. You always know who you are trading with.', ic: '🛡️' },
              { t: 'Trader Ratings', d: 'See a trader\'s history, rating, and badge level before trading. Top-rated traders earn elite status through consistent, honest trading.', ic: '⭐' },
              { t: 'Best Rates', d: 'Competitive P2P rates that beat banks and traditional exchange services. Set your own price or accept the best available offer.', ic: '💰' },
              { t: 'Instant Settlement', d: 'Trades complete in minutes, not days. Escrow releases instantly once payment is confirmed. No waiting for bank processing.', ic: '⚡' },
              { t: 'Made for Ethiopia', d: 'Supports Telebirr, CBE, Dashen, Awash, and HelloCash. Local support team in Addis Ababa. Available in English and Amharic.', ic: '🇪🇹' },
            ].map((ft, idx) => (
              <div key={idx} className="trust-card" onMouseMove={handleCardMouseMove} onMouseLeave={handleCardMouseLeave}
                style={{ background: '#111318', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '32px', cursor: 'default', transition: 'transform 0.2s, border-color 0.2s' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(245,197,24,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', border: '1px solid rgba(245,197,24,0.15)', marginBottom: '20px' }}>{ft.ic}</div>
                <h3 style={{ fontSize: '17px', color: '#fff', fontWeight: 600, margin: '0 0 10px 0' }}>{ft.t}</h3>
                <p style={{ fontSize: '14px', color: '#c8c8c8', lineHeight: 1.7, margin: 0 }}>{ft.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE CALCULATOR ── */}
      <section id="market" style={{ padding: '100px 24px', background: '#0d0d0d', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge-live-pulse" />
              <span style={{ fontSize: '11px', color: '#00d4a0', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>LIVE EXCHANGE RATE</span>
            </div>
            <h2 className="serif-title" style={{ fontSize: '42px', color: '#fff', margin: '8px 0 16px 0', fontWeight: 400 }}>USDT ↔ ETB Calculator</h2>
            <p style={{ fontSize: '14px', color: '#c8c8c8', lineHeight: 1.7 }}>
              Convert between USDT and Ethiopian Birr at the live market rate. See how much you'll get instantly.
            </p>
          </div>

          <div style={{ background: '#111318', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '32px' }}>
            {/* Live Rate Display */}
            <div style={{ textAlign: 'center', marginBottom: '28px', padding: '16px', background: 'rgba(0,212,160,0.05)', borderRadius: '12px', border: '1px solid rgba(0,212,160,0.15)' }}>
              <span style={{ fontSize: '12px', color: '#8b92a8', fontWeight: 600 }}>Current Rate</span>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#f5c518', marginTop: '4px' }}>1 USDT = {liveRate} ETB</div>
            </div>

            {/* Mode Toggle */}
            <div style={{ display: 'flex', background: '#0a0a0a', borderRadius: '12px', padding: '4px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <button onClick={() => { setCalcMode('usd-to-etb'); setCalcInput(''); }}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s',
                  background: calcMode === 'usd-to-etb' ? '#f5c518' : 'transparent',
                  color: calcMode === 'usd-to-etb' ? '#0a0a0a' : '#8b92a8' }}>
                USDT → ETB
              </button>
              <button onClick={() => { setCalcMode('etb-to-usd'); setCalcInput(''); }}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s',
                  background: calcMode === 'etb-to-usd' ? '#f5c518' : 'transparent',
                  color: calcMode === 'etb-to-usd' ? '#0a0a0a' : '#8b92a8' }}>
                ETB → USDT
              </button>
            </div>

            {/* Input */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', color: '#8b92a8', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                You Send ({calcMode === 'usd-to-etb' ? 'USDT' : 'ETB'})
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  value={calcInput}
                  onChange={e => setCalcInput(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="any"
                  style={{ width: '100%', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px 60px 16px 16px', fontSize: '24px', fontWeight: 700, color: '#fff', outline: 'none', boxSizing: 'border-box' }}
                />
                <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', fontWeight: 700, color: '#f5c518' }}>
                  {calcMode === 'usd-to-etb' ? 'USDT' : 'ETB'}
                </span>
              </div>
            </div>

            {/* Arrow */}
            <div style={{ textAlign: 'center', margin: '8px 0' }}>
              <div style={{ display: 'inline-flex', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.2)', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>↕</div>
            </div>

            {/* Output */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '12px', color: '#8b92a8', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                You Receive ({calcMode === 'usd-to-etb' ? 'ETB' : 'USDT'})
              </label>
              <div style={{ background: '#0a0a0a', border: '1px solid rgba(0,212,160,0.2)', borderRadius: '12px', padding: '16px', minHeight: '56px', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '24px', fontWeight: 700, color: '#00d4a0' }}>
                  {calcResult || '0.00'}
                </span>
                <span style={{ marginLeft: '8px', fontSize: '14px', fontWeight: 700, color: '#8b92a8' }}>
                  {calcMode === 'usd-to-etb' ? 'ETB' : 'USDT'}
                </span>
              </div>
            </div>

            {/* Quick Amounts */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {(calcMode === 'usd-to-etb' ? [10, 50, 100, 500, 1000] : [1000, 5000, 10000, 50000, 100000]).map(amt => (
                <button key={amt} onClick={() => setCalcInput(String(amt))}
                  style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: '#c8c8c8', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = '#f5c518'; e.currentTarget.style.color = '#f5c518'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#c8c8c8'; }}>
                  {calcMode === 'usd-to-etb' ? '$' : 'Br'}{amt.toLocaleString()}
                </button>
              ))}
            </div>

            {/* Note */}
            <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: '#8b92a8' }}>
              Rate updates every 5 seconds • 0.5% platform fee on trades
            </div>
          </div>
        </div>
      </section>

      {/* ── INVITE & EARN COMING SOON ── */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', color: '#f5c518', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, background: 'rgba(245,197,24,0.1)', padding: '4px 12px', borderRadius: '20px' }}>COMING SOON</span>
          <h2 className="serif-title" style={{ fontSize: '36px', color: '#fff', margin: '16px 0 12px 0', fontWeight: 400 }}>Invite & Earn Program</h2>
          <p style={{ fontSize: '16px', color: '#c8c8c8', lineHeight: 1.7, marginBottom: '8px', maxWidth: '560px', margin: '0 auto 8px' }}>
            Invite your friends to EthioSwap and earn <span style={{ color: '#f5c518', fontWeight: 700 }}>$0.50 USDT</span> for every user who completes their first trade after signing up with your referral code.
          </p>
          <p style={{ fontSize: '13px', color: '#8b92a8', marginBottom: '32px' }}>
            The more you invite, the more you earn. Start sharing your referral code today.
          </p>
          <div style={{ background: '#111318', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '32px', maxWidth: '480px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px', color: '#c8c8c8' }}>
              <span>Community Goal</span>
              <span style={{ color: '#f5c518', fontWeight: 700 }}>{inviteProgress}%</span>
            </div>
            <div style={{ background: '#0a0a0a', borderRadius: '8px', height: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: `${inviteProgress}%`, height: '100%', background: 'linear-gradient(90deg, #f5c518, #00d4a0)', borderRadius: '8px', transition: 'width 1s ease' }} />
            </div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#8b92a8' }}>
              We're building toward 200 verified traders to unlock rewards for everyone.
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST & SECURITY ── */}
      <section style={{ padding: '100px 24px', background: '#0d0d0d', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <span style={{ fontSize: '11px', color: '#00d4a0', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>TRUST & SECURITY</span>
            <h2 className="serif-title" style={{ fontSize: '42px', color: '#fff', margin: '8px 0 16px 0', fontWeight: 400 }}>Your Security is Our Priority</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
            {[
              { t: 'Escrow Lock', d: 'Every trade amount is locked in escrow before payment. Funds are cryptographically secured and can only be released by the platform.', ic: '🔐' },
              { t: 'Identity Verification', d: 'Mandatory KYC with National ID + live selfie. Every trader is a real, verified person. No anonymity, no fraud.', ic: '🪪' },
              { t: 'Dispute Resolution', d: 'Dedicated support team in Addis Ababa reviews evidence and resolves disputes fairly. Your funds are safe throughout.', ic: '⚖️' },
              { t: '2FA & Biometric Lock', d: 'Secure your account with two-factor authentication, fingerprint lock, or Face ID. Your keys stay on your device.', ic: '🔑' },
            ].map((ft, idx) => (
              <div key={idx} className="trust-card" style={{ background: '#111318', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '28px', transition: 'transform 0.2s, border-color 0.2s' }}>
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>{ft.ic}</div>
                <h3 style={{ fontSize: '16px', color: '#fff', fontWeight: 600, margin: '0 0 8px 0' }}>{ft.t}</h3>
                <p style={{ fontSize: '13px', color: '#c8c8c8', lineHeight: 1.6, margin: 0 }}>{ft.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS / REVIEWS ── */}
      <section style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <span style={{ fontSize: '11px', color: '#00d4a0', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>REVIEWS</span>
            <h2 className="serif-title" style={{ fontSize: '42px', color: '#fff', margin: '8px 0 16px 0', fontWeight: 400 }}>Trusted by Ethiopian Traders</h2>
            <p style={{ fontSize: '14px', color: '#c8c8c8', lineHeight: 1.7 }}>
              {reviews.length > 0 ? `See what ${reviews.length}+ traders are saying about EthioSwap.` : 'Be the first to share your experience with EthioSwap!'}
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {reviews.length > 0 ? reviews.slice(0, 6).map((r, idx) => (
              <div key={r.id || idx} className="testimonial-card" style={{ background: '#111318', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '32px' }}>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
                  {Array.from({ length: r.rating }).map((_, i) => <span key={i} style={{ color: '#f5c518', fontSize: '16px' }}>★</span>)}
                  {Array.from({ length: 5 - r.rating }).map((_, i) => <span key={i} style={{ color: '#3a3a3a', fontSize: '16px' }}>★</span>)}
                </div>
                <p style={{ fontSize: '14px', color: '#c8c8c8', lineHeight: 1.7, margin: '0 0 20px 0', fontStyle: 'italic' }}>"{r.content}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f5c518', fontWeight: 700, fontSize: '14px' }}>
                    {(r.username || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', color: '#fff', fontWeight: 600 }}>@{r.username}</div>
                    <div style={{ fontSize: '11px', color: '#8b92a8' }}>{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</div>
                  </div>
                </div>
              </div>
            )) : (
              <>
                {[
                  { name: 'Daniel M.', role: 'Freelance Designer', text: 'I receive USD from clients in the US and convert to birr through EthioSwap. The escrow makes me feel safe — I never worry about getting scammed. Completed over 50 trades with zero issues.', rating: 5 },
                  { name: 'Hana T.', role: 'Small Business Owner', text: 'Best P2P platform in Ethiopia. The rates are better than any bank, and I can trade right from my phone. KYC verification was quick and easy. Highly recommend for anyone doing cross-border payments.', rating: 5 },
                  { name: 'Yusuf A.', role: 'Diaspora — Dubai', text: 'I send money home to my family in Addis using EthioSwap. Much faster and cheaper than traditional remittance services. The escrow gives my family peace of mind too.', rating: 5 },
                ].map((t, idx) => (
                  <div key={idx} className="testimonial-card" style={{ background: '#111318', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '32px' }}>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
                      {Array.from({ length: t.rating }).map((_, i) => <span key={i} style={{ color: '#f5c518', fontSize: '16px' }}>★</span>)}
                    </div>
                    <p style={{ fontSize: '14px', color: '#c8c8c8', lineHeight: 1.7, margin: '0 0 20px 0', fontStyle: 'italic' }}>"{t.text}"</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f5c518', fontWeight: 700, fontSize: '14px' }}>
                        {t.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', color: '#fff', fontWeight: 600 }}>{t.name}</div>
                        <div style={{ fontSize: '12px', color: '#8b92a8' }}>{t.role}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
          {reviews.length > 0 && (
            <div style={{ textAlign: 'center', marginTop: '32px' }}>
              <p style={{ fontSize: '13px', color: '#8b92a8' }}>
                Want to share your experience? <button onClick={onSignIn} style={{ background: 'none', border: 'none', color: '#f5c518', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}>Sign in</button> and write a review from your profile.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{ padding: '100px 24px', background: '#0d0d0d', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <span style={{ fontSize: '11px', color: '#00d4a0', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>FAQ</span>
            <h2 className="serif-title" style={{ fontSize: '42px', color: '#fff', margin: '8px 0 0 0', fontWeight: 400 }}>Frequently Asked Questions</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {faqItems.map((item, index) => {
              const isActive = faqActiveIndex === index;
              return (
                <div key={index} style={{ background: '#111318', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
                  <button onClick={() => setFaqActiveIndex(isActive ? null : index)}
                    style={{ width: '100%', padding: '18px 24px', background: 'transparent', border: 'none', color: '#fff', fontSize: '15px', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left' }}>
                    <span>{item.q}</span>
                    <span style={{ color: '#f5c518', fontSize: '18px', flexShrink: 0, marginLeft: '12px' }}>{isActive ? '−' : '+'}</span>
                  </button>
                  <div style={{ maxHeight: isActive ? '200px' : '0px', transition: 'max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1)', overflow: 'hidden' }}>
                    <p style={{ padding: '0 24px 20px', margin: 0, fontSize: '13.5px', color: '#c8c8c8', lineHeight: 1.6 }}>{item.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding: '100px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(245,197,24,0.06) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '700px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <h2 className="serif-title" style={{ fontSize: width < 768 ? '32px' : '48px', color: '#fff', margin: '0 0 16px 0', fontWeight: 700 }}>
            Ready to Start Trading?
          </h2>
          <p style={{ fontSize: '16px', color: '#c8c8c8', lineHeight: 1.7, marginBottom: '32px' }}>
            Join thousands of Ethiopians already trading USDT safely on EthioSwap. Create your free account in minutes.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '24px' }}>
            <button onClick={onGetStarted} className="cta-btn-gold" style={{ height: '52px', fontSize: '17px', borderRadius: '12px', padding: '0 32px' }}>
              Create Free Account
            </button>
            <a href="#market" className="cta-btn-outline" style={{ height: '52px', fontSize: '17px', borderRadius: '12px', padding: '0 32px' }}>
              View Live Rates
            </a>
          </div>
          <div style={{ fontSize: '13px', color: '#8b92a8' }}>
            <span style={{ color: '#00d4a0', fontWeight: 700 }}>{liveStats.users.toLocaleString()}</span> traders already joined
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#080808', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '80px 24px 40px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '48px', marginBottom: '60px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Logo size={36} showText={true} />
              <p style={{ fontSize: '13px', color: '#c8c8c8', lineHeight: 1.6 }}>
                Ethiopia's safest peer-to-peer USDT exchange. Buy, sell, and trade with confidence.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <a href="https://t.me/EthioSwap1" target="_blank" rel="noreferrer"
                  style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', textDecoration: 'none' }}>✈️</a>
                <a href="#" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', textDecoration: 'none' }}>📸</a>
                <a href="#" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', textDecoration: 'none' }}>🎵</a>
              </div>
            </div>
            <div>
              <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '20px' }}>Product</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px' }}>
                <li><a href="#features" style={{ color: '#c8c8c8', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#f5c518'} onMouseOut={e => e.currentTarget.style.color = '#c8c8c8'}>Features</a></li>
                <li><a href="#how-it-works" style={{ color: '#c8c8c8', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#f5c518'} onMouseOut={e => e.currentTarget.style.color = '#c8c8c8'}>How It Works</a></li>
                <li><a href="#market" style={{ color: '#c8c8c8', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#f5c518'} onMouseOut={e => e.currentTarget.style.color = '#c8c8c8'}>Live P2P Market</a></li>
                <li><a href="#why-us" style={{ color: '#c8c8c8', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#f5c518'} onMouseOut={e => e.currentTarget.style.color = '#c8c8c8'}>Why Us</a></li>
              </ul>
            </div>
            <div>
              <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '20px' }}>Support</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px' }}>
                <li><a href="#faq" style={{ color: '#c8c8c8', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#f5c518'} onMouseOut={e => e.currentTarget.style.color = '#c8c8c8'}>FAQ</a></li>
                <li><a href="https://t.me/EthioSwap1" target="_blank" rel="noreferrer" style={{ color: '#c8c8c8', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#f5c518'} onMouseOut={e => e.currentTarget.style.color = '#c8c8c8'}>Telegram Support</a></li>
                <li>
                  <button onClick={() => setOpenModal('about')} style={{ background: 'none', border: 'none', color: '#c8c8c8', cursor: 'pointer', padding: 0, fontSize: 'inherit', textAlign: 'left', transition: 'color 0.2s', fontFamily: 'inherit' }}
                    onMouseOver={e => e.currentTarget.style.color = '#f5c518'} onMouseOut={e => e.currentTarget.style.color = '#c8c8c8'}>About Us</button>
                </li>
              </ul>
            </div>
            <div>
              <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '20px' }}>Legal</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px' }}>
                {['terms', 'privacy', 'escrow', 'aml'].map((mKey) => (
                  <li key={mKey}>
                    <button onClick={() => setOpenModal(mKey)} style={{ background: 'none', border: 'none', color: '#c8c8c8', cursor: 'pointer', padding: 0, fontSize: 'inherit', textAlign: 'left', transition: 'color 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.color = '#f5c518'} onMouseOut={e => e.currentTarget.style.color = '#c8c8c8'}>
                      {mKey === 'terms' ? 'Terms of Service' : mKey === 'privacy' ? 'Privacy Policy' : mKey === 'escrow' ? 'Escrow Rules' : 'AML Compliance'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Disclaimer */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '20px 0', marginBottom: '28px' }}>
            <p style={{ fontSize: '11px', color: '#8b92a8', lineHeight: 1.6, textAlign: 'center', margin: 0 }}>
              Disclaimer: EthioSwap is a peer-to-peer trading platform. We do not provide financial advice. Cryptocurrency trading involves risk. Users are responsible for compliance with local regulations. All trades are between verified individuals. Escrow protection applies to trades made through the platform.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: '#8b92a8' }}>
            <span>© 2026 EthioSwap. All rights reserved. Addis Ababa, Ethiopia.</span>
            <span style={{ color: '#f5c518', fontWeight: 600 }}>Secured by Escrow Technology</span>
          </div>
        </div>
      </footer>

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
