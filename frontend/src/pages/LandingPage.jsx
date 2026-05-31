import React, { useState, useEffect } from 'react';
import Logo from '../components/Logo.jsx';

const LandingPage = ({ onGetStarted, onSignIn, systemSettings }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [faqActiveIndex, setFaqActiveIndex] = useState(null);
  const [openModal, setOpenModal] = useState(null); // null | 'terms' | 'privacy' | 'escrow' | 'aml'

  // Calculator states
  const [calcMode, setCalcMode] = useState('buy'); // 'buy' | 'sell'
  const [calcAmount, setCalcAmount] = useState(100); // default 100 USD
  const [calcPercent, setCalcPercent] = useState(2); // default 2.0%

  const buyRate = systemSettings?.etbRatePerDollar ?? 194;
  const sellRate = systemSettings?.etbRatePerDollarSell ?? systemSettings?.etbRatePerDollar ?? 190;

  // Simulated live P2P trades feed
  const [tradesFeed, setTradesFeed] = useState([
    { id: '1', username: 'Abebe_K', type: 'buy', amountUSD: 50, amountETB: 9700, method: 'Telebirr', time: '2m ago' },
    { id: '2', username: 'Makeda_S', type: 'sell', amountUSD: 120, amountETB: 22800, method: 'CBE Transfer', time: '5m ago' },
    { id: '3', username: 'Biruk_G', type: 'buy', amountUSD: 80, amountETB: 15520, method: 'Dashen Bank', time: '8m ago' },
    { id: '4', username: 'Selam_A', type: 'sell', amountUSD: 30, amountETB: 5700, method: 'Telebirr', time: '12m ago' }
  ]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) setScrolled(true);
      else setScrolled(false);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update mock trade simulator feed
  useEffect(() => {
    const names = ['Abebe_K', 'Makeda_S', 'Biruk_G', 'Selam_A', 'Yohannes_T', 'Tsion_M', 'Dawit_F', 'Tigist_L', 'Almaz_W', 'Kebede_H', 'Aster_B', 'Fasil_Y'];
    const methods = ['Telebirr', 'CBE Transfer', 'Dashen Bank', 'Awash Bank', 'Wegagen Bank'];
    const types = ['buy', 'sell'];
    
    const interval = setInterval(() => {
      const randomName = names[Math.floor(Math.random() * names.length)];
      const randomMethod = methods[Math.floor(Math.random() * methods.length)];
      const randomType = types[Math.floor(Math.random() * types.length)];
      
      // Amount in USD and calculate ETB using live P2P rates
      const amountUSD = Math.floor(Math.random() * 200 + 10); // $10 to $210 USD
      const currentRate = randomType === 'buy' ? buyRate : sellRate;
      const amountETB = amountUSD * currentRate;
      
      const newTrade = {
        id: String(Date.now()),
        username: randomName,
        type: randomType,
        amountUSD,
        amountETB,
        method: randomMethod,
        time: 'Just now'
      };
      
      setTradesFeed(prev => {
        const updated = prev.map(t => {
          if (t.time === 'Just now') return { ...t, time: '5s ago' };
          if (t.time === '5s ago') return { ...t, time: '10s ago' };
          if (t.time === '10s ago') return { ...t, time: '15s ago' };
          if (t.time === '15s ago') return { ...t, time: '20s ago' };
          if (t.time.includes('s ago')) {
            const sec = parseInt(t.time) + 5;
            return { ...t, time: `${sec}s ago` };
          }
          return t;
        });
        return [newTrade, ...updated.slice(0, 3)];
      });
    }, 5000);
    
    return () => clearInterval(interval);
  }, [buyRate, sellRate]);

  const faqItems = [
    {
      q: "How does the P2P Escrow contract protect me?",
      a: "When a trade begins, the seller's USD ($) is instantly locked in the smart contract escrow. This ensures that the seller cannot run away with the funds once you pay. The USD is only released to the buyer after the buyer marks it as paid and the seller confirms the receipt of Birr in their bank account. If the seller refuses to release after getting paid, the buyer can open a dispute."
    },
    {
      q: "What bank accounts and payment options are supported?",
      a: "We support Commercial Bank of Ethiopia (CBE) direct transfers, Telebirr mobile money transfers, Dashen Bank, Awash Bank, and Wegagen Bank. When setting up a trade or ad listing, you can specify your preferred payment methods."
    },
    {
      q: "Why do I need to complete KYC verification before trading?",
      a: "To eliminate scams and protect local traders, EthioSwap requires all active buyers and sellers to undergo KYC verification. You must submit your name, phone number, age, a scan of your National ID or Passport, and complete a live face selfie. Unverified users can browse listings and check rates, but cannot open buy/sell trades."
    },
    {
      q: "How does the Custom Commission system work?",
      a: "In the settings panel, sellers can choose their preferred commission rate (from 1.0% to 5.0%+). When another user buys from your listing, the system automatically calculates and cuts this commission, sending the fee to the admin's wallet while the rest of the trade is released to the buyer."
    },
    {
      q: "What happens if there is a dispute during a trade?",
      a: "If the payment is sent but the seller does not release the USD, or if the buyer claims to have paid but didn't, either party can click 'Open Dispute' after the 30-minute timer expires. This locks the escrow and alerts our support team. An administrator will examine bank screenshots, transaction logs, and SMS receipts, and manually resolve the trade."
    }
  ];

  const getModalTitle = (type) => {
    switch (type) {
      case 'terms': return 'Terms of Service & User Agreement';
      case 'privacy': return 'Privacy Policy & Biometric Consent';
      case 'escrow': return 'Escrow Operations & Dispute Policy';
      case 'aml': return 'Anti-Money Laundering (AML) & KYC Rules';
      default: return '';
    }
  };

  const getModalBody = (type) => {
    switch (type) {
      case 'terms':
        return (
          <>
            <h4>1. Acceptance of Terms</h4>
            <p>
              By accessing or using EthioSwap, you agree to comply with and be bound by these Terms of Service. This platform operates as a Sepolia Ethereum testnet peer-to-peer (P2P) escrow service. Transactions here represent simulated trades for testing purposes, but users must strictly follow payment and transfer rules to maintain platform integrity.
            </p>
            <h4>2. Description of Service</h4>
            <p>
              EthioSwap facilitates the local purchase and sale of USD stable assets in exchange for Ethiopian Birr (ETB). We provide smart-contract based escrow locking and administrator-led dispute resolution. We do not provide custody of fiat currencies; all ETB transfers occur directly between the buyer's and seller's personal accounts.
            </p>
            <h4>3. Supported Payment Methods</h4>
            <p>
              All fiat transactions must utilize verified personal payment methods, including:
            </p>
            <ul>
              <li>Commercial Bank of Ethiopia (CBE) Mobile/Internet Banking</li>
              <li>Telebirr Mobile Wallet Transfer</li>
              <li>Dashen Bank & Awash Bank Direct Transfers</li>
              <li>Wegagen Bank Mobile Banking</li>
            </ul>
            <p>
              Using third-party accounts or sending payments under a name that does not match your verified EthioSwap identity is strictly prohibited.
            </p>
            <h4>4. Commission and Fees</h4>
            <p>
              Sellers define their commission fee within the permitted ranges (e.g. 1% to 5%+). Upon trade completion, the system automatically calculates the commission and routes the commission amount to the admin wallet. Standard blockchain gas fees also apply for Sepolia testnet operations.
            </p>
            <h4>5. Liability & Governing Law</h4>
            <p>
              As a testnet platform, EthioSwap is provided "as is" without warranty. Users are responsible for verifying payment confirmation messages prior to releasing any assets. Disputes will be handled fairly by platform arbitrators based in Addis Ababa, Ethiopia.
            </p>
          </>
        );
      case 'privacy':
        return (
          <>
            <h4>1. Scope of Privacy Policy</h4>
            <p>
              EthioSwap is committed to securing your personal information. This Privacy Policy details how we collect, store, and process your personal credentials, government document uploads, and biometric configuration.
            </p>
            <h4>2. Personal Data Collection</h4>
            <p>
              To create an active trading profile, the platform collects:
            </p>
            <ul>
              <li>Your full name, age, gender, and contact phone number.</li>
              <li>High-resolution uploads of your National ID card (front and back) or Passport data page.</li>
              <li>A live face selfie photo captured via your device's camera for verification mapping.</li>
            </ul>
            <h4>3. Biometric and Local Security Data</h4>
            <p>
              Our mobile APK client supports biometric security protocols (such as Fingerprint lock or Face ID). <strong>Important:</strong> All biometric lock credentials and PIN code calculations are stored exclusively within your device's secure hardware enclave (Keystore). EthioSwap never transmits, stores, or accesses your biometric keys on our servers.
            </p>
            <h4>4. Data Protection & Sharing</h4>
            <p>
              All submitted government documents and selfie captures are uploaded securely via HTTPS to our Convex Cloud storage database. Access is strictly restricted to platform administrators for KYC review. We never sell, lease, or share your identity records with third parties unless required by binding national law.
            </p>
          </>
        );
      case 'escrow':
        return (
          <>
            <h4>1. Escrow Lock Mechanism</h4>
            <p>
              EthioSwap operates a secure, mandatory escrow model. When a buyer initiates a buy order from a seller's listing:
            </p>
            <ul>
              <li>The seller's USD ($) corresponding to the trade amount is instantly deducted from their balance and locked in the escrow contract.</li>
              <li>The seller cannot withdraw or move these funds while the trade is active.</li>
              <li>A payment window timer (typically 30 minutes) begins.</li>
            </ul>
            <h4>2. Buyer Obligations</h4>
            <p>
              The buyer must transfer the exact ETB amount to the seller's designated account within the payment window. Once paid, the buyer must click <strong>"I Have Paid Seller"</strong> and upload a screenshot proof of transfer (CBE receipt or Telebirr SMS). Marking a trade as paid without sending funds is considered fraud and will result in account termination.
            </p>
            <h4>3. Seller Obligations</h4>
            <p>
              The seller must check their bank balance or Telebirr wallet to confirm the exact fiat amount has arrived. The seller must never rely on buyer-provided screenshots alone. Upon receipt of funds, the seller is obligated to click <strong>"Release USD"</strong> immediately.
            </p>
            <h4>4. Dispute Arbitration</h4>
            <p>
              If the payment window expires and the seller has not released the USD, or if the buyer has not paid but refuses to cancel, either party can open an official dispute.
            </p>
            <p>
              EthioSwap administrators will examine both parties' statements, chat transcripts, and verified bank statements. The admin has full authority to release the escrowed USD to the buyer or refund it to the seller based on verified facts. The admin's decision is final.
            </p>
          </>
        );
      case 'aml':
        return (
          <>
            <h4>1. Anti-Money Laundering Compliance</h4>
            <p>
              EthioSwap complies with national anti-fraud and anti-money laundering (AML) guidelines. P2P platforms can be targeted for illicit transactions, and our strict verification safeguards protect our community.
            </p>
            <h4>2. Mandatory KYC Policy</h4>
            <p>
              <strong>"Look but don't touch" rule:</strong> Unverified accounts are permitted to browse the landing page, view active P2P ads, and configure settings. However, they are strictly blocked from posting ads, initiating deposits, opening buy/sell trades, or accessing wallet functions. Full account verification is mandatory to unlock any trade operations.
            </p>
            <h4>3. Identity Validation & Reject Protocol</h4>
            <p>
              All submitted KYC documents are manually reviewed by the admin panel queue. In case of rejection, the admin will provide a detailed rejection reason (e.g. "Blurry ID image" or "Name mismatch"). This reason is sent immediately to the user via their Notification Center, and they must correct and resubmit their documents.
            </p>
            <h4>4. Account Limits & Suspicions</h4>
            <p>
              The platform reserves the right to freeze accounts showing suspicious behavior, such as mismatching payment names, multiple accounts registered under one ID, or rapid high-volume transfers. Admin notifications will be issued to resolve such cases.
            </p>
          </>
        );
      default: return null;
    }
  };

  return (
    <div className="landing-page">
      {/* ── HEADER FLOATING NAVIGATION ── */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="landing-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%', padding: 0 }}>
          <div className="landing-nav-logo">
            <Logo size={36} showText={true} />
          </div>

          <ul className="landing-nav-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#who-is-it-for">Who It's For</a></li>
            <li><a href="#how-it-works">How It Works</a></li>
            <li><a href="#live-p2p">Live P2P</a></li>
            <li><a href="#about-us">About Us</a></li>
            <li><a href="#faq">FAQ</a></li>
            <li><a href="#download">Download App</a></li>
            <li style={{ marginLeft: '12px' }}>
              <button onClick={onSignIn} className="landing-nav-cta">
                Sign In
              </button>
            </li>
          </ul>

          {/* Hamburger Menu button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="landing-hamburger"
            aria-label="Toggle Menu"
          >
            <span style={{ transform: mobileMenuOpen ? 'translateY(7px) rotate(45deg)' : 'none', transition: 'transform 0.3s ease' }}></span>
            <span style={{ opacity: mobileMenuOpen ? 0 : 1, transition: 'opacity 0.3s ease' }}></span>
            <span style={{ transform: mobileMenuOpen ? 'translateY(-7px) rotate(-45deg)' : 'none', transition: 'transform 0.3s ease' }}></span>
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="landing-mobile-menu">
          <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
          <a href="#who-is-it-for" onClick={() => setMobileMenuOpen(false)}>Who It's For</a>
          <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
          <a href="#live-p2p" onClick={() => setMobileMenuOpen(false)}>Live P2P</a>
          <a href="#about-us" onClick={() => setMobileMenuOpen(false)}>About Us</a>
          <a href="#faq" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
          <a href="#download" onClick={() => setMobileMenuOpen(false)}>Download</a>
          <button onClick={() => { setMobileMenuOpen(false); onSignIn(); }} className="btn btn-gold btn-full" style={{ marginTop: '10px' }}>
            Sign In
          </button>
        </div>
      )}

      {/* ── HERO SECTION ── */}
      <header id="hero" className="landing-hero-section">
        <div className="landing-hero-bg">
          <div className="landing-hero-gradient-1"></div>
        </div>
        <div className="landing-container">
          <div className="landing-hero-content">
            <div className="landing-hero-badge">
              <span className="dot"></span>
              <span>EthioSwap v2.4 Beta</span>
            </div>
            <h1 className="landing-hero-title">
              Trade USD ($) & ETB.<br />
              <span className="gold-text">Safe & Secure.</span>
            </h1>
            <p className="landing-hero-sub">
              Buy and sell USD stable assets for Ethiopian Birr — secured by escrow, verified by real ID, protected by admin oversight. No crypto knowledge required.
            </p>
            <div className="landing-hero-ctas">
              <button onClick={onGetStarted} className="btn btn-gold btn-lg">
                Create Account — It's Free
              </button>
              <a href="#download" className="btn btn-outline btn-lg">
                📥 Download Android APK
              </a>
            </div>
            <div className="landing-hero-stats">
              <div className="landing-hero-stat">
                <span className="number">100%</span>
                <span className="label">Escrow Protected</span>
              </div>
              <div className="landing-hero-stat">
                <span className="number">&lt; 15 Min</span>
                <span className="label">Avg. Release Speed</span>
              </div>
              <div className="landing-hero-stat">
                <span className="number">0%</span>
                <span className="label">Commission Option</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── SCROLLING TICKER TAPE ── */}
      <div className="landing-ticker-wrap">
        <div className="landing-ticker">
          <div className="landing-ticker-item"><span className="ticker-dot"></span> CBE INTEGRATION</div>
          <div className="landing-ticker-item"><span className="ticker-dot"></span> TELEBIRR SUPPORTED</div>
          <div className="landing-ticker-item"><span className="ticker-dot"></span> SECURE P2P ESCROW</div>
          <div className="landing-ticker-item"><span className="ticker-dot"></span> 100% KYC VERIFIED</div>
          <div className="landing-ticker-item"><span className="ticker-dot"></span> DASHEN BANK</div>
          <div className="landing-ticker-item"><span className="ticker-dot"></span> AWASH BANK</div>
          <div className="landing-ticker-item"><span className="ticker-dot"></span> ADMIN DISPUTE ARBITRATION</div>
          <div className="landing-ticker-item"><span className="ticker-dot"></span> USD & ETB TRADING</div>
          {/* Duplicate set for infinite scroll */}
          <div className="landing-ticker-item"><span className="ticker-dot"></span> CBE INTEGRATION</div>
          <div className="landing-ticker-item"><span className="ticker-dot"></span> TELEBIRR SUPPORTED</div>
          <div className="landing-ticker-item"><span className="ticker-dot"></span> SECURE P2P ESCROW</div>
          <div className="landing-ticker-item"><span className="ticker-dot"></span> 100% KYC VERIFIED</div>
          <div className="landing-ticker-item"><span className="ticker-dot"></span> DASHEN BANK</div>
          <div className="landing-ticker-item"><span className="ticker-dot"></span> AWASH BANK</div>
          <div className="landing-ticker-item"><span className="ticker-dot"></span> ADMIN DISPUTE ARBITRATION</div>
          <div className="landing-ticker-item"><span className="ticker-dot"></span> USD & ETB TRADING</div>
        </div>
      </div>

      {/* ── FEATURES GRID SECTION ── */}
      <section id="features" className="landing-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-eyebrow">Enterprise Features</span>
            <h2>Re-engineered for Ethiopian Traders</h2>
            <p>Our P2P escrow platform combines decentralized security with familiar local payments to bring you the safest trading experience in the region.</p>
          </div>
          <div className="landing-features-grid">
            <div className="landing-feature-card">
              <div className="landing-feature-icon">🔒</div>
              <h3>Smart Escrow Protection</h3>
              <p>Before a buyer transfers ETB, the seller's USD ($) is automatically locked in the escrow smart contract. Funds are released only after payment is verified.</p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">🛡️</div>
              <h3>100% Verified Users</h3>
              <p>No anonymous trading. Every user must verify their account with a national ID or passport scan, along with a live face selfie match to eliminate fraud.</p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">🔑</div>
              <h3>Biometric App Lock</h3>
              <p>Lock your wallet with your phone's native fingerprint scanner, face unlock, or a custom secure 6-digit PIN. Your keys stay protected on your device.</p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">💸</div>
              <h3>Commission Settings</h3>
              <p>Sellers can customize commission fees (from 1.0% to 5.0%+) directly in the admin panel and preview earnings. Trades automatically deduct and send fees to admin wallet.</p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">🔔</div>
              <h3>Trade Notification Center</h3>
              <p>Receive real-time alerts whenever there's activity on your buy, sell, deposit, or withdrawal orders. Never miss a trade window or payment stage.</p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">🔄</div>
              <h3>Cross-Device Sync</h3>
              <p>Log in with the same credentials on the web browser and the native Android app. Balance, trade history, and KYC status sync instantly in real-time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── TARGET AUDIENCE SECTION (WHO IS IT FOR) ── */}
      <section id="who-is-it-for" className="landing-section" style={{ background: 'rgba(255,255,255,0.01)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-eyebrow" style={{ color: 'var(--teal-light)' }}>Target Audience</span>
            <h2>Who is EthioSwap Designed For?</h2>
            <p>Whether you're sending funds back home, receiving international freelance income, or trading peer-to-peer, EthioSwap has a custom-built solution for you.</p>
          </div>
          <div className="landing-features-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
            <div className="landing-feature-card" style={{ borderLeft: '4px solid var(--gold)', paddingLeft: '20px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🌍</div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>Ethiopian Diaspora & Families</h3>
              <p style={{ fontSize: '13.5px', lineHeight: 1.6 }}>Send money to your family in Ethiopia instantly and securely. Exchange your USD/Crypto directly at the most competitive local peer-to-peer exchange rates, bypassing high bank fees and unreliable transfer agents.</p>
            </div>
            <div className="landing-feature-card" style={{ borderLeft: '4px solid var(--teal)', paddingLeft: '20px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>💻</div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>Local Freelancers & Remote Workers</h3>
              <p style={{ fontSize: '13.5px', lineHeight: 1.6 }}>Earning in foreign currencies or digital assets online? Swap your USD or stable coin earnings to Ethiopian Birr (ETB) instantly. Receive funds directly into your Commercial Bank of Ethiopia (CBE) account or Telebirr wallet.</p>
            </div>
            <div className="landing-feature-card" style={{ borderLeft: '4px solid var(--indigo)', paddingLeft: '20px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📈</div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>P2P Escrow Merchants & Traders</h3>
              <p style={{ fontSize: '13.5px', lineHeight: 1.6 }}>Become a liquidity provider. Post buy/sell listings, set your custom exchange rate parameters, configure your seller commission percentage, and earn consistent profits securely using our automated escrow smart contract.</p>
            </div>
            <div className="landing-feature-card" style={{ borderLeft: '4px solid var(--text-1)', paddingLeft: '20px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🛡️</div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>Regular Digital Asset Buyers</h3>
              <p style={{ fontSize: '13.5px', lineHeight: 1.6 }}>Acquire stable coin assets securely using local payment channels. Avoid the risk of getting scammed in Telegram groups. Our 100% verified users and mandatory smart contract escrow keep your capital secure throughout every trade.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS SECTION ── */}
      <section id="how-it-works" className="landing-section" style={{ background: 'rgba(255,255,255,0.01)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-eyebrow">P2P Process</span>
            <h2>Simple 4-Step Trade Lifecycle</h2>
            <p>Trading USD for ETB has never been more straightforward. Here is how a standard trade works on EthioSwap.</p>
          </div>
          <div className="landing-steps-grid">
            <div className="landing-step-card">
              <div className="landing-step-number">1</div>
              <h3>Create Ad or Browse</h3>
              <p>Sellers post a listing with their custom commission, or buyers choose from available P2P listings on the marketplace.</p>
            </div>
            <div className="landing-step-card">
              <div className="landing-step-number">2</div>
              <h3>USD Locked in Escrow</h3>
              <p>When a trade starts, the seller's USD is automatically locked in escrow. The trade room starts an active payment timer.</p>
            </div>
            <div className="landing-step-card">
              <div className="landing-step-number">3</div>
              <h3>Local ETB Transfer</h3>
              <p>The buyer sends ETB to the seller's bank account or Telebirr number and uploads the transaction receipt.</p>
            </div>
            <div className="landing-step-card">
              <div className="landing-step-number">4</div>
              <h3>USD Release</h3>
              <p>The seller confirms receipt of the ETB in their banking app, clicks release, and the locked USD transfers directly to the buyer.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE ACTIVITY & CALCULATOR ── */}
      <section id="live-p2p" className="landing-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-eyebrow">Realtime Activity</span>
            <h2>Live P2P Feed & Swap Estimator</h2>
            <p>Watch simulated testnet trades execute in real-time and calculate swap rates instantly.</p>
          </div>
          <div className="landing-market-grid">
            {/* Live Trade Simulator */}
            <div className="landing-market-card">
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px', borderLeft: '3px solid var(--gold)', paddingLeft: '12px' }}>Live P2P Activity Feed</h3>
              <div className="landing-feed-container">
                {tradesFeed.map((trade) => (
                  <div key={trade.id} className="landing-feed-item">
                    <div className="header">
                      <span className="user">👤 {trade.username}</span>
                      <span className={`action ${trade.type}`}>
                        {trade.type === 'buy' ? 'BUYING USD' : 'SELLING USD'}
                      </span>
                    </div>
                    <div className="body">
                      <strong>${trade.amountUSD} USD</strong> for{' '}
                      <strong style={{ color: 'var(--text-1)' }}>
                        {trade.amountETB.toLocaleString()} ETB
                      </strong>
                    </div>
                    <div className="footer">
                      <span>🏦 {trade.method}</span>
                      <span>{trade.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Swap Fee Calculator */}
            <div className="landing-market-card">
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px', borderLeft: '3px solid var(--gold)', paddingLeft: '12px' }}>Swap Estimator & Fee Preview</h3>
              <div className="landing-calc-tabs">
                <button
                  onClick={() => setCalcMode('buy')}
                  className={`landing-calc-tab ${calcMode === 'buy' ? 'active' : ''}`}
                >
                  Buy USD
                </button>
                <button
                  onClick={() => setCalcMode('sell')}
                  className={`landing-calc-tab ${calcMode === 'sell' ? 'active' : ''}`}
                >
                  Sell USD
                </button>
              </div>
              <div className="landing-calc-form">
                <div className="input-group">
                  <label className="input-label">Trade Amount (USD $)</label>
                  <input
                    type="number"
                    className="input"
                    value={calcAmount}
                    onChange={(e) => setCalcAmount(Number(e.target.value))}
                    min="1"
                    placeholder="Enter USD amount"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Commission (Seller's Cut)</label>
                  <select
                    className="input"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-1)' }}
                    value={calcPercent}
                    onChange={(e) => setCalcPercent(Number(e.target.value))}
                  >
                    <option value="1">1.0% Commission</option>
                    <option value="1.5">1.5% Commission</option>
                    <option value="2">2.0% Commission (Recommended)</option>
                    <option value="2.5">2.5% Commission</option>
                    <option value="3">3.0% Commission</option>
                    <option value="4">4.0% Commission</option>
                    <option value="5">5.0% Commission</option>
                  </select>
                </div>
                
                <div className="landing-calc-results">
                  <div className="landing-calc-row">
                    <span>P2P Exchange Rate:</span>
                    <span>1 USD = {calcMode === 'buy' ? buyRate : sellRate} ETB</span>
                  </div>
                  <div className="landing-calc-row">
                    <span>Base P2P Swap Value:</span>
                    <span>{(calcAmount * (calcMode === 'buy' ? buyRate : sellRate)).toLocaleString()} ETB</span>
                  </div>
                  <div className="landing-calc-row">
                    <span>{calcPercent}% Platform/Seller Fee:</span>
                    <span>
                      {((calcAmount * (calcMode === 'buy' ? buyRate : sellRate)) * (calcPercent / 100)).toLocaleString()} ETB
                    </span>
                  </div>
                  <div className="landing-calc-row highlight">
                    <span>{calcMode === 'buy' ? 'Total ETB You Pay' : 'Total ETB You Receive'}:</span>
                    <span>
                      {calcMode === 'buy'
                        ? ((calcAmount * buyRate) * (1 + calcPercent / 100)).toLocaleString()
                        : ((calcAmount * sellRate) * (1 - calcPercent / 100)).toLocaleString()}{' '}
                      ETB
                    </span>
                  </div>
                </div>
                
                <button onClick={onGetStarted} className="btn btn-gold btn-full btn-lg" style={{ marginTop: '10px' }}>
                  Start Trading Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ABOUT US SECTION ── */}
      <section id="about-us" className="landing-section" style={{ background: 'rgba(255,255,255,0.01)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="landing-container">
          <div className="landing-about-grid">
            <div className="landing-about-text">
              <span className="landing-section-eyebrow">Addis Ababa, Ethiopia</span>
              <h2>Pioneering Trust in Local Digital Assets</h2>
              <p>
                EthioSwap was founded in Addis Ababa with a simple vision: to make P2P USD trading accessible, secure, and fully customized for the Ethiopian market. By leveraging modern web apps, PWA technology, and Convex Cloud backend architectures, we provide local traders with a safe alternative to risky Telegram group trading.
              </p>
              <p>
                We support direct bank transfers for major institutions across the country, including the Commercial Bank of Ethiopia (CBE), Telebirr mobile wallet, Dashen Bank, Awash Bank, and Wegagen Bank. Our automated escrow contract acts as a neutral third-party, ensuring both buyers and sellers fulfill their end of the trade.
              </p>
              <button onClick={onGetStarted} className="btn btn-gold" style={{ marginTop: '12px' }}>
                Join Our Trading Community
              </button>
            </div>
            <div className="landing-about-stats-card">
              <div className="landing-about-stats-list">
                <div className="landing-about-stat-item">
                  <span className="landing-about-stat-val">10,000+</span>
                  <span className="landing-about-stat-lbl">Simulated Trades Completed</span>
                </div>
                <div className="landing-about-stat-item">
                  <span className="landing-about-stat-val">CBE & Telebirr</span>
                  <span className="landing-about-stat-lbl">Supported Channels</span>
                </div>
                <div className="landing-about-stat-item">
                  <span className="landing-about-stat-val">0% Scam Rate</span>
                  <span className="landing-about-stat-lbl">Due to Escrow & Mandatory KYC</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── UNIFIED Account Sync ── */}
      <section className="landing-section">
        <div className="landing-container">
          <div className="landing-unified-inner">
            <div className="landing-unified-grid">
              <div style={{ textAlign: 'left' }}>
                <span className="landing-section-eyebrow">Unified Account Sync</span>
                <h2 style={{ fontSize: '32px', marginBottom: '20px' }}>Trade on the Web, Continue on the App</h2>
                <p style={{ marginBottom: '30px' }}>
                  Your EthioSwap account is fully synchronized in real-time. Start a transaction on your computer web browser, go outside, and complete your trade from your mobile phone using our native APK. All balances, P2P chats, KYC statuses, and trade history are instantly updated across both platforms.
                </p>
                <a href="#download" className="btn btn-gold">
                  Go to Download Center
                </a>
              </div>
              <div className="landing-sync-list">
                <div className="landing-sync-card">
                  <span className="landing-sync-icon">💻</span>
                  <div className="landing-sync-text">
                    <h4>Web App Access</h4>
                    <p>Fully functional browser client with desktop P2P support, real-time rates, and secure Convex database integrations.</p>
                  </div>
                </div>
                <div className="landing-sync-card">
                  <span className="landing-sync-icon">📱</span>
                  <div className="landing-sync-text">
                    <h4>Android APK Client</h4>
                    <p>Install the lightweight PWA wrapper on your Android device. Features camera ID scanning and local biometric app protection.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ SECTION ── */}
      <section id="faq" className="landing-section" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-eyebrow">Help & FAQ</span>
            <h2>Frequently Asked Questions</h2>
            <p>Everything you need to know about trading, security, and verification on EthioSwap.</p>
          </div>
          <div className="landing-faq-accordion">
            {faqItems.map((item, index) => (
              <div
                key={index}
                className={`landing-faq-item ${faqActiveIndex === index ? 'active' : ''}`}
              >
                <button
                  onClick={() => setFaqActiveIndex(faqActiveIndex === index ? null : index)}
                  className="landing-faq-trigger"
                >
                  <span>{item.q}</span>
                  <span className="landing-faq-icon">+</span>
                </button>
                <div className="landing-faq-content">
                  <p>{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DOWNLOAD CENTER ── */}
      <section id="download" className="landing-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-eyebrow">Mobile Trading</span>
            <h2>EthioSwap Android App Center</h2>
            <p>Take your P2P exchange with you. Secure your wallet using native fingerprint and face ID lock screen parameters.</p>
          </div>
          <div className="landing-download-layout">
            <div className="landing-download-card">
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>Android Client (APK)</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '16px' }}>
                Download our official mobile app directly. Run secure PWA wrapping, fast camera uploads, and biometric hardware authentication.
              </p>
              
              <div className="landing-download-meta">
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Version</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-1)' }}>v2.4.0-beta</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Size</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-1)' }}>12.4 MB</div>
                </div>
                <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '4px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>SHA-256 Checksum</div>
                  <div style={{ fontSize: '11px', color: 'var(--gold-light)', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                    4a2b9f8d7c6b5a4e3d2c1b0a9f8e7d6c5b4a3c2b1a0d9e8f7a6b5c4d3e2f1a0b
                  </div>
                </div>
              </div>
              
              <a 
                href="/ethioswap.apk" 
                download 
                className="btn btn-gold btn-full btn-lg" 
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}
              >
                <span>📥 Download EthioSwap APK</span>
              </a>
              
              <div className="landing-download-qr">
                <div className="landing-download-qr-box">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150&data=${encodeURIComponent(window.location.origin + '/#download')}`} 
                    alt="Scan to Download" 
                    style={{ width: '88px', height: '88px', display: 'block', borderRadius: '4px' }} 
                  />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: '600' }}>Scan QR Code to Download</span>
              </div>
            </div>
            
            <div className="landing-guide-card">
              <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                APK Installation Guide
              </h3>
              <div className="landing-guide-steps">
                <div className="landing-guide-step">
                  <span className="landing-guide-badge">1</span>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>Download the APK file</h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-2)' }}>
                      Click the "Download EthioSwap APK" button above or scan the QR code using your smartphone camera.
                    </p>
                  </div>
                </div>
                <div className="landing-guide-step">
                  <span className="landing-guide-badge">2</span>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>Enable Unknown Sources</h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-2)' }}>
                      Go to your Android Settings &gt; Security (or Privacy) &gt; Install Unknown Apps, and toggle permission for your mobile browser.
                    </p>
                  </div>
                </div>
                <div className="landing-guide-step">
                  <span className="landing-guide-badge">3</span>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>Install and Launch</h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-2)' }}>
                      Open the downloaded `.apk` file from your device Downloads manager, tap Install, then launch and set up your biometric lock.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-top">
            <div className="landing-footer-brand">
              <Logo size={36} showText={true} />
              <p>
                Ethiopia's premium peer-to-peer USD escrow exchange. Trade stable USD ($) safely using local bank transfers and mobile wallets.
              </p>
              <div className="landing-social-links">
                <a href="https://t.me/ethioswap_p2p" target="_blank" rel="noreferrer" className="landing-social-link">
                  ✈️
                </a>
                <a href="https://twitter.com/ethioswap" target="_blank" rel="noreferrer" className="landing-social-link">
                  🐦
                </a>
                <a href="https://github.com/ethioswap" target="_blank" rel="noreferrer" className="landing-social-link">
                  🐱
                </a>
              </div>
            </div>
            
            <div className="landing-footer-col">
              <h4>Marketplace</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#how-it-works">How It Works</a></li>
                <li><a href="#live-p2p">Live P2P Trades</a></li>
                <li><a href="#download">Download APK</a></li>
              </ul>
            </div>
            
            <div className="landing-footer-col">
              <h4>Company</h4>
              <ul>
                <li><a href="#about-us">About Us</a></li>
                <li><a href="#faq">FAQ Help</a></li>
                <li><a href="https://t.me/your_telegram_here" target="_blank" rel="noreferrer">Telegram Support 💬</a></li>
              </ul>
            </div>
            
            <div className="landing-footer-col">
              <h4>Legal & Compliance</h4>
              <ul>
                <li>
                  <button onClick={() => setOpenModal('terms')} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'var(--text-2)', cursor: 'pointer', textAlign: 'left' }}>
                    Terms of Service
                  </button>
                </li>
                <li>
                  <button onClick={() => setOpenModal('privacy')} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'var(--text-2)', cursor: 'pointer', textAlign: 'left' }}>
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button onClick={() => setOpenModal('escrow')} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'var(--text-2)', cursor: 'pointer', textAlign: 'left' }}>
                    Escrow & Dispute Rules
                  </button>
                </li>
                <li>
                  <button onClick={() => setOpenModal('aml')} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'var(--text-2)', cursor: 'pointer', textAlign: 'left' }}>
                    AML Policy
                  </button>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="landing-footer-bottom">
            <span>&copy; {new Date().getFullYear()} EthioSwap. All rights reserved. Addis Ababa, Ethiopia.</span>
            <span>Powered by Convex Cloud.</span>
          </div>
        </div>
      </footer>

      {/* ── LEGAL MODALS overlay ── */}
      {openModal && (
        <div className="landing-modal-overlay" onClick={() => setOpenModal(null)}>
          <div className="landing-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="landing-modal-close" onClick={() => setOpenModal(null)}>
              &times;
            </button>
            <div className="landing-modal-header">
              <h3>{getModalTitle(openModal)}</h3>
            </div>
            <div className="landing-modal-body">
              {getModalBody(openModal)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
