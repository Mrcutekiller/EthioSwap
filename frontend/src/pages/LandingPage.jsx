import React, { useState, useEffect, useRef } from 'react';
import Logo from '../components/Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useQuery, useMutation } from "convex/react";
import { api } from "convex-api";
import { convex } from "../convexClient";

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
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f5c518" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <path d="M12 14v2M12 11v1" />
    </svg>
  ),
  sell: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f5c518" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <path d="M12 4l6 6M12 4L6 10" />
    </svg>
  ),
  send: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f5c518" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  receive: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f5c518" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="8 17 12 21 16 17" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" />
    </svg>
  ),
  exchange: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f5c518" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 3 21 3 21 8" />
      <line x1="4" y1="20" x2="21" y2="3" />
      <polyline points="8 21 3 21 3 16" />
      <line x1="3" y1="21" x2="20" y2="4" />
    </svg>
  ),
  rates: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f5c518" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
    </svg>
  ),
};

// ═══════════════════════════════════════════════════════════
// PREMIUM 3D PAPER MONEY — USD front / Ethiopian Birr back
// Click to flip. Floats with gentle animation.
// ═══════════════════════════════════════════════════════════

const PaperMoney3D = ({ size = 'lg', className = '' }) => {
  const [flipped, setFlipped] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Dimensions: real $100 bill ratio = 6.14" × 2.61" ≈ 2.35:1
  const dims = {
    lg: { w: 420, h: 178 },
    md: { w: 340, h: 145 },
    sm: { w: 260, h: 110 },
  }[size] || { w: 420, h: 178 };

  const { w, h } = dims;

  return (
    <div
      className={className}
      style={{
        width: `${w}px`,
        height: `${h}px`,
        perspective: '1200px',
        cursor: 'pointer',
        userSelect: 'none',
        filter: hovered
          ? 'drop-shadow(0 30px 60px rgba(0,0,0,0.75)) drop-shadow(0 0 40px rgba(245,197,24,0.25))'
          : 'drop-shadow(0 20px 40px rgba(0,0,0,0.6))',
        transition: 'filter 0.4s ease',
      }}
      onClick={() => setFlipped(f => !f)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Click to flip"
    >
      {/* 3D flip container */}
      <div style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        transformStyle: 'preserve-3d',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>

        {/* ── FRONT: US $100 Bill ── */}
        <div style={{
          position: 'absolute', inset: 0,
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1.5px solid rgba(255,255,255,0.12)',
          background: '#0d2217',
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.6)',
        }}>
          {/* Centered rotated container to show tall vertical USD image horizontally */}
          <div style={{
            position: 'absolute',
            width: `${h}px`,
            height: `${w}px`,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%) rotate(-90deg)',
            backgroundImage: 'url(/images/usd_100.jpg)',
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }} />
        </div>

        {/* ── BACK: Ethiopian Birr 200 Note ── */}
        <div style={{
          position: 'absolute', inset: 0,
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1.5px solid rgba(255,255,255,0.12)',
          background: '#1d1b24',
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.6)',
        }}>
          {/* Displaying the top half (Walia Ibex) of the double-note image */}
          <div style={{
            width: '100%',
            height: '100%',
            backgroundImage: 'url(/images/etb_200.jpg)',
            backgroundSize: '100% 200%',
            backgroundPosition: 'top center',
            backgroundRepeat: 'no-repeat',
          }} />
        </div>
      </div>

      {/* Flip hint */}
      <div style={{
        position: 'absolute', bottom: '-28px', left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '11px', color: 'rgba(245,197,24,0.7)',
        fontWeight: 700, letterSpacing: '0.1em', whiteSpace: 'nowrap',
        pointerEvents: 'none', fontFamily: 'sans-serif',
        background: 'rgba(0, 0, 0, 0.4)',
        padding: '4px 12px',
        borderRadius: '20px',
        border: '1px solid rgba(245,197,24,0.15)',
        backdropFilter: 'blur(5px)',
      }}>
        {flipped ? '← Click to see USD' : 'Click to see Birr →'}
      </div>
    </div>
  );
};

// Floating wrapper — adds the gentle up/down float + entry animation + scroll parallax
const FloatingBill = ({ size = 'lg', style = {}, prefersReducedMotion = false }) => {
  const containerRef = useRef(null);
  const [scrollY, setScrollY] = useState(0);

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

  // Subtle parallax translation and rotation based on scroll distance from center
  const translateY = prefersReducedMotion ? 0 : scrollY * 0.15; // float lag
  const rotateZ = prefersReducedMotion ? 0 : scrollY * -0.015; // gentle roll

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        transform: `translateY(${translateY}px) rotate(${rotateZ}deg)`,
        transition: 'transform 0.1s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        willChange: 'transform',
        ...style,
      }}
    >
      <style>{`
        @keyframes billFloat {
          0%, 100% { transform: translateY(0px) rotate(-1.5deg); }
          50%       { transform: translateY(-12px) rotate(1.5deg); }
        }
        @keyframes billEntry {
          from { opacity: 0; transform: translateY(40px) scale(0.92); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div style={{
        animation: prefersReducedMotion
          ? 'none'
          : 'billFloat 6s ease-in-out infinite, billEntry 0.8s cubic-bezier(0.16,1,0.3,1) both',
      }}>
        <PaperMoney3D size={size} />
      </div>
    </div>
  );
};

// Legacy stubs — no longer rendered but kept to avoid ref errors
const FallingBill = () => null;
const MoneyRain = () => null;
const Bill3D = () => null;
const PremiumUSDCard = () => null;



const LandingPage = ({ onGetStarted, onSignIn, systemSettings }) => {
  const { user } = useAuth();
  
  // Convex Data with manual fetching to prevent crashes if backend is missing
  const [stats, setStats] = useState({ traders: 0, volume: 0, avg: '—', scams: 0 });
  const [reviews, setReviews] = useState([]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, reviewsData] = await Promise.all([
          convex.query(api.stats.get).catch(() => null),
          convex.query(api.reviews.listApproved).catch(() => [])
        ]);
        if (statsData) setStats(statsData);
        if (reviewsData) setReviews(reviewsData);
      } catch (err) {
        console.warn("Convex data fetch failed in LandingPage", err);
      }
    };
    fetchData();
  }, []);

  const submitReviewMutation = useMutation(api.reviews.create);

  const buyRate = systemSettings?.etbRatePerDollar ?? 190.00;
  const sellRate = systemSettings?.etbRatePerDollarSell ?? systemSettings?.etbRatePerDollar ?? 186.00;
  
  const [scrolled, setScrolled] = useState(false);
   const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
   const [faqActiveIndex, setFaqActiveIndex] = useState(null);
   const [openModal, setOpenModal] = useState(null);

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

  // Sync live rate with database configuration
  useEffect(() => {
    setLiveRate(buyRate);
    setRateTimestamp(new Date().toLocaleTimeString());
  }, [buyRate]);

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
    card.style.borderColor = 'rgba(245, 197, 24, 0.3)';
    card.style.boxShadow = '0 0 0 1px rgba(245,197,24,0.3)';
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
      await submitReviewMutation({
        userId: user._id,
        username: user.username,
        rating: reviewRating,
        content: reviewContent.trim()
      });
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
    { q: "What happens if there's a dispute?", a: "Either party can open a dispute at any time. Our support team reviews chat history, payment receipts, and bank statements, then makes a fair decision." },
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

  const goalProgress = stats.traders ? Math.min((stats.traders / 200) * 100, 100) : 0;

  return (
    <div style={{ background: '#0a0a0a', color: '#c8c8c8', fontFamily: "'Inter', sans-serif", overflowX: 'hidden', position: 'relative' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap');
        
        :root {
          --gold: #f5c518;
          --gold-bright: #ffdf5e;
          --gold-muted: rgba(245, 197, 24, 0.1);
          --bg: #020203;
          --card: #0a0a0b;
          --card-hover: #111114;
          --border: rgba(255, 255, 255, 0.05);
          --border-bright: rgba(255, 255, 255, 0.1);
          --text-main: #ffffff;
          --text-dim: #8b92a8;
          --accent-green: #00d4a0;
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
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(245, 197, 24, 0.02) 100%);
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
          0%, 100% { transform: rotateY(var(--ry, 0deg)) translateY(0) rotateZ(0deg); } 
          50% { transform: rotateY(var(--ry, 0deg)) translateY(-20px) rotateZ(1deg); } 
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
          box-shadow: 0 4px 20px rgba(245, 197, 24, 0.3);
        }
        .btn-saas-primary:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 15px 40px rgba(245, 197, 24, 0.5);
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
          background: radial-gradient(circle at var(--x, 50%) var(--y, 50%), rgba(245,197,24,0.08) 0%, transparent 50%);
          opacity: 0;
          transition: opacity 0.3s;
        }
        .feature-card:hover {
          transform: translateY(-10px);
          border-color: rgba(245, 197, 24, 0.3);
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.6);
        }
        .feature-card:hover::before { opacity: 1; }

        /* Floating Glow Orbs */
        .orb {
          position: absolute;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(245,197,24,0.05) 0%, transparent 70%);
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
      `}</style>

      {!prefersReducedMotion && (
        <div className={`cursor-trail ${cursorHovered ? 'hovered' : ''}`} style={{ left: `${cursorPos.x}px`, top: `${cursorPos.y}px` }} />
      )}



      {/* ── NAVBAR ── */}
      <nav style={{
        position: 'fixed', top: width < 768 ? '10px' : '20px', left: '50%', transform: 'translateX(-50%)',
        width: width < 768 ? 'calc(100% - 24px)' : 'calc(100% - 48px)', maxWidth: '1200px', height: width < 768 ? '60px' : '72px',
        background: 'rgba(10, 10, 10, 0.7)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--border)', borderRadius: width < 768 ? '16px' : '24px', zIndex: 1000, transition: 'all 0.3s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: width < 768 ? '0 16px' : '0 32px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <Logo size={width < 768 ? 28 : 34} showText={true} />
        </div>
        
        {width > 1024 ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {[
                { id: 'trade', label: 'Trade', target: '#market' },
                { id: 'p2p', label: 'P2P', target: '#market' },
                { id: 'rates', label: 'Rates', target: '#market' },
                { id: 'invite', label: 'Invite & Earn', target: '#invite' },
              ].map(link => (
                <a key={link.id} href={link.target} className="nav-item-saas">{link.label}</a>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button onClick={onSignIn} style={{ background: 'transparent', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer', padding: '10px 20px', fontSize: '15px' }}>Log in</button>
              <button onClick={onGetStarted} className="btn-saas-primary" style={{ padding: '12px 24px', fontSize: '15px', borderRadius: '12px' }}>Get Started</button>
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
          animation: 'slideDownMenu 250ms ease-out' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
            <Logo size={36} showText={true} />
            <button onClick={() => setMobileMenuOpen(false)} style={{ background: 'none', border: 'none', color: '#f5c518', fontSize: '28px', cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, justifyContent: 'center' }}>
            {[
              { label: 'Features', target: '#features' }, 
              { label: 'How It Works', target: '#how-it-works' }, 
              { label: 'Live Rates', target: '#market' }, 
              { label: 'Why Us', target: '#why-us' }, 
              { label: 'FAQ', target: '#faq' }
            ].map((link, idx, arr) => (
              <div key={link.label}>
                <a href={link.target} onClick={() => setMobileMenuOpen(false)}
                  style={{ display: 'block', color: '#c8c8c8', textDecoration: 'none', fontSize: '20px', fontWeight: 600, padding: '20px 0', textAlign: 'center', transition: 'color 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.color = '#f5c518'} onMouseOut={e => e.currentTarget.style.color = '#c8c8c8'}>
                  {link.label}
                </a>
                {idx < arr.length - 1 && <div style={{ height: '1px', background: 'rgba(245, 197, 24, 0.15)', width: '100%' }} />}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 'auto', paddingBottom: '20px' }}>
            <button onClick={() => { setMobileMenuOpen(false); onSignIn(); }} className="cta-btn-gold" style={{ width: '100%', height: '48px', fontSize: '16px', borderRadius: '10px' }}>Sign In</button>
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
                background: 'rgba(245, 197, 24, 0.05)', 
                border: '1px solid rgba(245, 197, 24, 0.1)', 
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
                Swap dollars to<br />
                <span style={{ color: 'var(--gold)' }}>Birr</span> in <span style={{ color: 'var(--accent-green)' }}>seconds</span>
              </h1>

              <div style={{ height: '4px', width: '100px', background: 'var(--gold)', marginBottom: '32px', borderRadius: '2px', display: width < 1024 ? 'none' : 'block' }} />

              <p style={{ fontSize: width < 768 ? '16px' : '20px', color: 'var(--text-dim)', lineHeight: 1.6, maxWidth: width < 1024 ? '100%' : '580px', marginBottom: '32px' }}>
                Buy and sell USDT for Ethiopian Birr at the best live rates. Fast P2P trades, secure escrow, and instant local payouts.
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: width < 1024 ? 'center' : 'flex-start', marginBottom: '48px' }}>
                <button onClick={onGetStarted} className="btn-saas-primary" style={{ fontSize: width < 768 ? '16px' : '18px', padding: width < 768 ? '14px 32px' : '18px 44px' }}>
                  Start trading
                </button>
                <button onClick={() => document.getElementById('market')?.scrollIntoView({ behavior: 'smooth' })} 
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: '#fff', fontSize: width < 768 ? '16px' : '18px', padding: width < 768 ? '14px 32px' : '18px 44px', borderRadius: '14px', fontWeight: 700, cursor: 'pointer' }}>
                  View live rates
                </button>
              </div>

              {/* Stats Row */}
              <div style={{ display: 'flex', gap: width < 768 ? '24px' : '48px', flexWrap: 'wrap', justifyContent: width < 1024 ? 'center' : 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: width < 768 ? '20px' : '28px', fontWeight: 800, color: '#fff' }}>24K+</span>
                  <span style={{ fontSize: width < 768 ? '12px' : '14px', color: 'var(--text-dim)', fontWeight: 600 }}>Active traders</span>
                </div>
                <div style={{ width: '1px', height: '30px', background: 'var(--border)', alignSelf: 'center' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: width < 768 ? '20px' : '28px', fontWeight: 800, color: '#fff' }}>฿ 9.2M</span>
                  <span style={{ fontSize: width < 768 ? '12px' : '14px', color: 'var(--text-dim)', fontWeight: 600 }}>USDT traded</span>
                </div>
                <div style={{ width: '1px', height: '30px', background: 'var(--border)', alignSelf: 'center' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: width < 768 ? '20px' : '28px', fontWeight: 800, color: '#fff' }}>4.9★</span>
                  <span style={{ fontSize: width < 768 ? '12px' : '14px', color: 'var(--text-dim)', fontWeight: 600 }}>User rating</span>
                </div>
              </div>
            </div>

            {/* Right Side: 3D Paper Money — USD front / Birr back */}
            {width >= 1024 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '500px' }}>
                <FloatingBill size="lg" prefersReducedMotion={prefersReducedMotion} />
              </div>
            )}
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
            {/* Left Column: 3D Paper Money (alternating layout) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '500px', order: width < 1024 ? 2 : 1 }}>
              <FloatingBill size="lg" prefersReducedMotion={prefersReducedMotion} />
            </div>

            {/* Right Column: Secure Asset Card + Simple & Transparent Steps */}
            <div style={{ order: width < 1024 ? 1 : 2 }}>
              {/* Premium $ Secure Asset / USD Reserve Card */}
              <div className="premium-card" style={{
                background: 'linear-gradient(145deg, rgba(20,20,24,0.9) 0%, rgba(10,10,14,0.95) 100%)',
                border: '1px solid rgba(245,197,24,0.18)',
                borderRadius: '24px',
                padding: '28px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(20px)',
                marginBottom: '40px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', background: 'radial-gradient(circle, rgba(0,212,160,0.15) 0%, transparent 70%)', filter: 'blur(10px)', pointerEvents: 'none' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{
                    width: '64px', height: '64px',
                    borderRadius: '16px',
                    background: 'rgba(245,197,24,0.08)',
                    border: '1.5px solid var(--gold)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '32px', fontWeight: '900', color: 'var(--gold)',
                    boxShadow: '0 0 20px rgba(245,197,24,0.2)',
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
                <h2 className="serif-title" style={{ fontSize: width < 768 ? '36px' : '48px', color: '#fff', margin: '0 0 16px 0' }}>Simple & Transparent</h2>
                <p style={{ fontSize: '16px', color: 'var(--text-dim)' }}>Start your first trade in three easy steps.</p>
              </div>

              {/* Steps (Horizontal/Vertical Timeline) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {[
                  { step: '01', t: 'Create & Verify', d: 'ID verification in under 2 mins.', icon: '👤' },
                  { step: '02', t: 'Choose an Offer', d: 'Find the best local rates.', icon: '🔍' },
                  { step: '03', t: 'Trade Safely', d: 'Instant escrow settlement.', icon: '🛡️' },
                ].map((step, idx) => (
                  <div key={idx} className="reveal-on-scroll" style={{ display: 'flex', alignItems: 'center', gap: '20px', transitionDelay: `${idx * 150}ms` }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--bg)', border: '2px solid var(--gold)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0, boxShadow: '0 0 15px rgba(245, 197, 24, 0.1)' }}>
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
                  Why Choose <span style={{ color: 'var(--gold)' }}>EthioSwap</span>
                </h2>
                <p style={{ maxWidth: '600px', margin: width < 1024 ? '0 auto' : '0', fontSize: '18px', color: 'var(--text-dim)', lineHeight: 1.6 }}>
                  The most trusted platform for digital asset exchange in Ethiopia, built with security and speed at its core.
                </p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: width < 600 ? '1fr' : '1fr 1fr', gap: '20px' }}>
                {[
                  { t: 'Escrow Protection', d: 'Your funds are held securely.', ic: '🔒' },
                  { t: 'Verified Community', d: 'Trade with real people.', ic: '🛡️' },
                  { t: 'Instant Settlement', d: 'Fastest trade times.', ic: '⚡' },
                  { t: '24/7 Support', d: 'Always here to help.', ic: '🎧' },
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

            {/* Right side visual: 3D Paper Money (alternating layout) */}
            {width >= 1024 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '500px' }}>
                <FloatingBill size="lg" prefersReducedMotion={prefersReducedMotion} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Visual Connector: How It Works -> Features */}


      {/* ── FEATURED TRADE SECTIONS (Alternating) ── */}
      <section style={{ padding: '120px 24px', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* Feature 1: Spacer for Bill on Left, Text on Right */}
          <div className="reveal-on-scroll" style={{ 
            display: 'grid', 
            gridTemplateColumns: width < 1024 ? '1fr' : '1fr 1fr', 
            gap: '80px', 
            alignItems: 'center', 
            marginBottom: '160px' 
          }}>
            {/* Left side: Transfer flow visual */}
            <div style={{ display: width < 1024 ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', minHeight: '380px' }}>
              {[
                { from: '🇺🇸 USD Wallet', to: '→', color: 'var(--gold)', label: '$500.00 USDT' },
                { from: '⚡ Escrow Lock', to: '→', color: '#a78bfa', label: 'Secured instantly' },
                { from: '🇪🇹 ETB Transfer', to: '✓', color: 'var(--accent-green)', label: 'ETB 95,000 sent' },
              ].map((item, i) => (
                <div key={i} style={{ width: '100%', maxWidth: '320px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${item.color}22`, borderRadius: '14px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.3s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = item.color}
                  onMouseLeave={e => e.currentTarget.style.borderColor = `${item.color}22`}>
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '4px' }}>{item.from}</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: item.color, fontFamily: 'JetBrains Mono, monospace' }}>{item.label}</div>
                  </div>
                  <div style={{ fontSize: '20px', color: item.color, fontWeight: 800 }}>{item.to}</div>
                </div>
              ))}
            </div>

            <div>
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
          <div className="reveal-on-scroll" style={{ display: 'grid', gridTemplateColumns: width < 1024 ? '1fr' : '1fr 1fr', gap: '80px', alignItems: 'center' }}>
            <div className="floating" style={{ order: width < 1024 ? 2 : 1 }}>
              <div className="glass-panel" style={{ borderRadius: '32px', padding: '40px', position: 'relative' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '20px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px' }}>Success Rate</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent-green)' }}>99.8%</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '20px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px' }}>Avg. Speed</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--gold)' }}>12m</div>
                  </div>
                </div>
                <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>Security Protocol</span>
                    <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>Active</span>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ order: width < 1024 ? 1 : 2 }}>
              <div style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Unmatched Security</div>
              <h2 className="serif-title" style={{ fontSize: '48px', color: '#fff', marginBottom: '24px' }}>The Gold Standard of P2P Security</h2>
              <p style={{ fontSize: '18px', color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: '32px' }}>
                We use multi-layer security protocols and automated escrow systems to ensure your assets are protected at all times. Every transaction is monitored by our security engine.
              </p>
              <button onClick={onGetStarted} className="btn-saas-primary">Learn About Security</button>
            </div>
          </div>

        </div>
      </section>

      {/* Visual Connector: Features -> Market */}


      {/* ── LIVE CALCULATOR SECTION ── */}
      <section id="market" style={{ padding: '80px 24px', background: '#0d0d0d', borderTop: '1px solid rgba(255,255,255,0.05)', position: 'relative', zIndex: 10 }}>
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
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#f5c518', marginTop: '4px', fontFamily: 'JetBrains Mono, monospace' }}>1 USDT = {liveRate.toFixed(2)} ETB</div>
              <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px' }}>Last updated: {rateTimestamp}</div>
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
                  style={{ width: '100%', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px 60px 16px 16px', fontSize: '24px', fontWeight: 700, color: '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: 'JetBrains Mono, monospace' }}
                />
                <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', fontWeight: 700, color: '#f5c518' }}>
                  {calcMode === 'usd-to-etb' ? 'USDT' : 'ETB'}
                </span>
              </div>
            </div>

            {/* Arrow */}
            <div style={{ textAlign: 'center', margin: '8px 0' }}>
              <div style={{ display: 'inline-flex', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.2)', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#f5c518' }}>↕</div>
            </div>

            {/* Output */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '12px', color: '#8b92a8', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                You Receive ({calcMode === 'usd-to-etb' ? 'ETB' : 'USDT'})
              </label>
              <div style={{ background: '#0a0a0a', border: '1px solid rgba(0,212,160,0.2)', borderRadius: '12px', padding: '16px', minHeight: '56px', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '24px', fontWeight: 700, color: '#00d4a0', fontFamily: 'JetBrains Mono, monospace' }}>
                  {calcResult || '0.00'}
                </span>
                <span style={{ marginLeft: '8px', fontSize: '14px', fontWeight: 700, color: '#8b92a8' }}>
                  {calcMode === 'usd-to-etb' ? 'ETB' : 'USDT'}
                </span>
              </div>
            </div>

            {/* Quick Amounts */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '24px' }}>
              {(calcMode === 'usd-to-etb' ? [10, 50, 100, 500, 1000] : [1000, 5000, 10000, 50000, 100000]).map(amt => (
                <button key={amt} onClick={() => setCalcInput(String(amt))}
                  style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: '#c8c8c8', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'JetBrains Mono, monospace' }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = '#f5c518'; e.currentTarget.style.color = '#f5c518'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#c8c8c8'; }}>
                  {calcMode === 'usd-to-etb' ? '$' : 'Br'}{amt.toLocaleString()}
                </button>
              ))}
            </div>

            {/* Start Trading button (Item 4) */}
            <button onClick={onGetStarted} style={{
              width: '100%',
              height: '50px',
              background: '#f5c518',
              color: '#0a0a0a',
              border: 'none',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              boxShadow: '0 4px 15px rgba(245, 197, 24, 0.25)'
            }}>
              Start Trading at This Rate →
            </button>

            {/* Note */}
            <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: '#8b92a8' }}>
              Rate updates every 5 seconds • No hidden fees • 0.5% platform fee on trades
            </div>
          </div>
        </div>
      </section>

      {/* ── INVITE & EARN PROGRAM ── */}
      <section style={{ padding: '80px 24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
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
              <span style={{ color: '#f5c518', fontWeight: 700 }}>{goalProgress.toFixed(0)}%</span>
            </div>
            <div style={{ background: '#0a0a0a', borderRadius: '8px', height: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: `${goalProgress}%`, height: '100%', background: 'linear-gradient(90deg, #f5c518, #00d4a0)', borderRadius: '8px', transition: 'width 1s ease' }} />
            </div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#8b92a8', fontWeight: 600 }}>
              {stats.traders} / 200 verified traders
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST & SECURITY ── */}
      <section style={{ padding: '80px 24px', background: '#0d0d0d', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <span style={{ fontSize: '11px', color: '#00d4a0', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>TRUST & SECURITY</span>
            <h2 className="serif-title" style={{ fontSize: '42px', color: '#fff', margin: '8px 0 16px 0', fontWeight: 400 }}>Your Security is Our Priority</h2>
          </div>
          
          {/* 2x2 grid (Item 4) */}
          <div style={{ display: 'grid', gridTemplateColumns: width > 768 ? '1fr 1fr' : '1fr', gap: '20px' }}>
            {[
              { t: 'Escrow Lock', d: 'Every trade amount is locked in escrow before payment. Funds are cryptographically secured and can only be released by the platform.', ic: '🔐' },
              { t: 'Identity Verification', d: 'Mandatory KYC with National ID + live selfie. Every trader is a real, verified person. No anonymity, no fraud.', ic: '🪪' },
              { t: 'Dispute Resolution', d: 'Dedicated support team reviews evidence and resolves disputes fairly. Your funds are safe throughout.', ic: '⚖️' },
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

      {/* Visual Connector: Security -> Reviews */}


      {/* ── TESTIMONIALS / REVIEWS (Item 3) ── */}
      <section style={{ padding: '80px 24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <span style={{ fontSize: '11px', color: '#00d4a0', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>REVIEWS</span>
            <h2 className="serif-title" style={{ fontSize: '42px', color: '#fff', margin: '8px 0 16px 0', fontWeight: 400 }}>Trusted by Ethiopian Traders</h2>
            <p style={{ fontSize: '14px', color: '#c8c8c8', lineHeight: 1.7 }}>
              All reviews are posted by verified EthioSwap traders after completing real trades.
            </p>
          </div>

          {/* Leave a review button */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '48px' }}>
            {user ? (
              <button onClick={() => setShowReviewModal(true)} className="cta-btn-outline" style={{ border: '2px solid #f5c518', color: '#f5c518', fontWeight: 700 }}>
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
                          {Array.from({ length: rating }).map((_, i) => <span key={i} style={{ color: '#f5c518', fontSize: '15px' }}>★</span>)}
                          {Array.from({ length: 5 - rating }).map((_, i) => <span key={i} style={{ color: '#2a2a2a', fontSize: '15px' }}>★</span>)}
                        </>
                      );
                    })()}
                  </div>
                  <span style={{ fontSize: '40px', color: 'rgba(245,197,24,0.12)', fontFamily: 'Georgia, serif', lineHeight: 1, marginTop: '-8px' }}>"</span>
                </div>
                <p style={{ fontSize: '14px', color: '#c8c8c8', lineHeight: 1.7, margin: '0 0 20px 0', fontStyle: 'italic' }}>"{r.content}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(245,197,24,0.2), rgba(245,197,24,0.05))', border: '1px solid rgba(245,197,24,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f5c518', fontWeight: 800, fontSize: '16px', flexShrink: 0 }}>
                    {(r.username || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', color: '#fff', fontWeight: 700 }}>@{r.username}</div>
                    <div style={{ fontSize: '11px', color: '#8b92a8', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <span style={{ color: '#00d4a0', fontWeight: 700 }}>✓ Verified Trader</span>
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
                {['Features', 'How It Works', 'Market Rates', 'Security'].map(item => (
                  <li key={item}><a href={`#${item.toLowerCase().replace(/ /g, '-')}`} className="nav-item-saas" style={{ fontSize: '15px', textDecoration: 'none' }}>{item}</a></li>
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
              <a href="#" className="nav-item-saas" style={{ textDecoration: 'none' }}>Twitter</a>
              <a href="#" className="nav-item-saas" style={{ textDecoration: 'none' }}>Telegram</a>
              <a href="#" className="nav-item-saas" style={{ textDecoration: 'none' }}>Discord</a>
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
                <p style={{ fontSize: '15px', color: '#00d4a0', fontWeight: 700, marginTop: '16px' }}>
                  Your review is pending approval. Thank you!
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
                      <button key={star} type="button" onClick={() => setReviewRating(star)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '32px', padding: 0, color: star <= reviewRating ? '#f5c518' : '#3a3a3a' }}>★</button>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                    <span>Must be 20-300 characters</span>
                    <span>{reviewContent.length} / 300</span>
                  </div>
                </div>

                {reviewError && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '10px 12px', borderRadius: '8px', color: '#f87171', fontSize: '12px' }}>
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
