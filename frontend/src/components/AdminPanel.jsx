import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from '../context/AuthContext.jsx';
import Logo from './Logo.jsx';

/* ── Tiny inline icon ──────────────────────────────────────── */
const Ic = ({ d, size = 18, strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

/* ── Animated counter hook ─────────────────────────────────── */
const useCounter = (target, duration = 900) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) { setVal(0); return; }
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setVal(target * ease);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
};

/* ── Metric card component ─────────────────────────────────── */
const MetricCard = ({ icon, label, value, sub, color = 'gold', prefix = '', suffix = '', className = '' }) => {
  const colorMap = {
    gold:   { card: 'metric-card-gold',   icon: 'metric-icon-gold',   text: 'var(--gold-light)' },
    teal:   { card: 'metric-card-teal',   icon: 'metric-icon-teal',   text: 'var(--teal-light)' },
    indigo: { card: 'metric-card-indigo', icon: 'metric-icon-indigo', text: 'var(--indigo-light)' },
    danger: { card: 'metric-card-danger', icon: 'metric-icon-danger', text: 'var(--status-danger-text)' },
  };
  const c = colorMap[color] || colorMap.gold;
  return (
    <div className={`metric-card ${c.card} ${className}`}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div className={`metric-icon ${c.icon}`}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>{label}</div>
          <div style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '-0.04em', color: c.text, lineHeight: 1 }}>
            {prefix}{typeof value === 'number' ? value.toFixed(value < 100 ? 2 : 0) : value}{suffix}
          </div>
          {sub && <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '3px' }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
};

/* ── Status badge ──────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const m = {
    pending:  { cls: 'badge-warning', label: '⏳ Pending' },
    approved: { cls: 'badge-success', label: '✓ Approved' },
    rejected: { cls: 'badge-danger',  label: '✗ Rejected' },
    open:     { cls: 'badge-gold',    label: '● Open' },
    closed:   { cls: 'badge-neutral', label: '✓ Closed' },
  }[status] || { cls: 'badge-neutral', label: status };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
};

/* ── Wallet type meta ──────────────────────────────────────── */
const WALLET_META = {
  binance:  { label: 'Binance Pay',    icon: '🔶', color: '#F0B90B' },
  bybit:    { label: 'Bybit',          icon: '🟡', color: '#F7A600' },
  telegram: { label: 'Telegram Wallet',icon: '✈️', color: '#2AABEE' },
  other:    { label: 'Other',          icon: '💳', color: '#8B92A8' },
};

/* ── Lazy KYC Images Viewer ─────────────────────────────────── */
const KycImages = ({ userId, getImageUrl }) => {
  const images = useQuery(api.admin.getUserKycImages, { userId });

  if (images === undefined) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
        {[1, 2, 3].map((_, i) => (
          <div key={i}>
            <div style={{ fontSize: '9px', color: 'var(--text-3)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>Loading…</div>
            <div className="skeleton" style={{ height: '80px', border: '1px solid var(--border)' }} />
          </div>
        ))}
      </div>
    );
  }

  const items = [
    { l: 'ID Front', src: images?.kycIdFront },
    { l: 'ID Back',  src: images?.kycIdBack },
    { l: 'Selfie',   src: images?.kycSelfie },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
      {items.map(img => (
        <div key={img.l}>
          <div style={{ fontSize: '9px', color: 'var(--text-3)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>{img.l}</div>
          {img.src ? (
            <a href={getImageUrl(img.src)} target="_blank" rel="noreferrer">
              <img src={getImageUrl(img.src)} alt={img.l} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)', transition: 'transform 0.15s ease' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
            </a>
          ) : (
            <div style={{ height: '80px', background: 'var(--bg-elevated)', border: '1px dashed var(--border)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'var(--text-3)' }}>No Image</div>
          )}
        </div>
      ))}
    </div>
  );
};

/* ── Lazy Deposit Screenshot Viewer ─────────────────────────── */
const DepositScreenshot = ({ requestId, getImageUrl }) => {
  const screenshotUrl = useQuery(api.depositRequests.getDepositScreenshot, { requestId });

  if (screenshotUrl === undefined) {
    return (
      <div className="skeleton" style={{ width: '100%', height: '140px', border: '1px solid var(--border)' }} />
    );
  }

  if (!screenshotUrl) return null;

  return (
    <a href={getImageUrl(screenshotUrl)} target="_blank" rel="noreferrer" style={{ width: '100%', display: 'block' }}>
      <img src={getImageUrl(screenshotUrl)} alt="Proof" style={{ width: '100%', maxHeight: '140px', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-base)', transition: 'transform 0.15s ease' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.01)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
    </a>
  );
};

/* ══════════════════════════════════════════════════════════════
   ADMIN PANEL
══════════════════════════════════════════════════════════════ */
const AdminPanel = ({ user }) => {
  const { approveDepositRequest, rejectDepositRequest, allDepositReqs } = useAuth();

  const [activeTab,   setActiveTab]   = useState('overview');
  const [period,      setPeriod]      = useState('week');
  const [alertMsg,    setAlertMsg]    = useState(null);
  const [alertType,   setAlertType]   = useState('success');
  const [savingSettings, setSavingSettings] = useState(false);
  const [selectedTicket,    setSelectedTicket]    = useState(null);
  const [supportReplyText,  setSupportReplyText]  = useState('');
  const [withdrawAddress,   setWithdrawAddress]   = useState('');
  const [withdrawingEarnings, setWithdrawingEarnings] = useState(false);
  const chatEndRef = useRef(null);

  const showAlert = (msg, type = 'success') => {
    setAlertMsg(msg); setAlertType(type);
    setTimeout(() => setAlertMsg(null), 3500);
  };

  // ── Convex ─────────────────────────────────────────────────
  const settings            = useQuery(api.settings.get);
  const updateSettings      = useMutation(api.settings.update);
  const allUsersList        = useQuery(api.users.listAll);
  const revenue             = useQuery(api.admin.getRevenue, { period });
  const adminEarnings       = useQuery(api.admin.getAdminEarnings, user ? { adminId: user.id } : 'skip');
  const kycQueue            = useQuery(api.admin.getKycQueue)        ?? [];
  const disputes            = useQuery(api.admin.getDisputes)        ?? [];
  const supportTickets      = useQuery(api.support.listAll)          ?? [];

  const kycAction           = useMutation(api.users.kycAction);
  const disputeRelease      = useMutation(api.trades.adminReleaseEscrow);
  const disputeRefund       = useMutation(api.trades.adminRefundSeller);
  const supportReply        = useMutation(api.support.replyTicket);
  const closeTicket         = useMutation(api.support.closeTicket);
  const convexWithdraw      = useMutation(api.users.withdrawETH);
  const warnUserMutation      = useMutation(api.admin.warnUser);
  const toggleSuspendMutation = useMutation(api.admin.toggleSuspendUser);
  const removeUserMutation    = useMutation(api.admin.removeUser);

  // ── Settings state ──────────────────────────────────────────
  const [etbRate,          setEtbRate]         = useState('');
  const [etbRateSell,      setEtbRateSell]     = useState('');
  const [commissionValue,  setCommissionValue]  = useState('0.5');

  useEffect(() => {
    if (settings) {
      setEtbRate(settings.etbRatePerDollar);
      setEtbRateSell(settings.etbRatePerDollarSell ?? settings.etbRatePerDollar ?? 186.0);
      setCommissionValue(settings.commissionValue?.toString() || '0.5');
    }
  }, [settings]);

  // ── KYC state ────────────────────────────────────────────────
  const [rejectionReasons, setRejectionReasons] = useState({});

  // ── Deposit state ────────────────────────────────────────────
  const [depositRejectNotes, setDepositRejectNotes] = useState({});
  const pendingDeposits = allDepositReqs.filter(r => r.status === 'pending');

  // ── Admin Action states ──────────────────────────────────────
  const [warnUserId, setWarnUserId] = useState(null);
  const [warnMessage, setWarnMessage] = useState('');
  const [warnLoading, setWarnLoading] = useState(false);

  // ── Support ──────────────────────────────────────────────────
  useEffect(() => {
    if (selectedTicket) {
      const updated = supportTickets.find(t => t.id === selectedTicket.id);
      if (updated) setSelectedTicket(updated);
    }
  }, [supportTickets]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [selectedTicket?.messages]);

  // ── Earnings chart max ────────────────────────────────────────
  const chartMax = revenue?.chartData ? Math.max(...revenue.chartData.map(d => d.volumeUSD), 1) : 1;
  const feeChartMax = revenue?.chartData ? Math.max(...revenue.chartData.map(d => d.feeUSD || 0.001), 0.001) : 0.001;

  // ── Nav tabs ─────────────────────────────────────────────────
  const navTabs = [
    { id: 'overview',  em: '📊', title: 'Stats',    badge: 0 },
    { id: 'earnings',  em: '💰', title: 'Earnings', badge: 0 },
    { id: 'kyc',       em: '🛡️', title: 'KYC',     badge: kycQueue.length },
    { id: 'deposits',  em: '💵', title: 'Deposits', badge: pendingDeposits.length },
    { id: 'disputes',  em: '⚖️', title: 'Disputes', badge: disputes.length },
    { id: 'support',   em: '💬', title: 'Support',  badge: supportTickets.filter(t => t.status === 'open').length },
    { id: 'users',     em: '👥', title: 'Users',    badge: 0 },
    { id: 'settings',  em: '⚙️', title: 'Config',  badge: 0 },
  ];

  // ── Admin User Management Handlers ───────────────────────────
  const handleWarnUser = async (e) => {
    e.preventDefault();
    if (!warnUserId || !warnMessage.trim()) return;
    setWarnLoading(true);
    try {
      await warnUserMutation({ userId: warnUserId, message: warnMessage });
      showAlert("⚠️ Warning sent successfully.");
      setWarnUserId(null);
      setWarnMessage('');
    } catch (err) {
      showAlert("Error sending warning: " + err.message, "error");
    } finally {
      setWarnLoading(false);
    }
  };

  const handleToggleSuspend = async (userId, currentSuspended) => {
    const actionText = currentSuspended ? "activate (unpush)" : "suspend (push)";
    if (!window.confirm(`Are you sure you want to ${actionText} this user?`)) return;
    try {
      await toggleSuspendMutation({ userId, isSuspended: !currentSuspended });
      showAlert(`User ${currentSuspended ? 'activated' : 'suspended'} successfully.`);
    } catch (err) {
      showAlert("Error updating user status: " + err.message, "error");
    }
  };

  const handleRemoveUser = async (userId, username) => {
    if (!window.confirm(`⚠️ WARNING! Are you absolutely sure you want to completely REMOVE @${username}?\nThis will permanently delete their account and listings. This action is IRREVERSIBLE!`)) return;
    try {
      await removeUserMutation({ userId });
      showAlert("User removed successfully.");
    } catch (err) {
      showAlert("Error removing user: " + err.message, "error");
    }
  };

  // ── Handlers ─────────────────────────────────────────────────
  const handleKYC = async (userId, approve) => {
    const reason = rejectionReasons[userId] || '';
    if (!approve && !reason.trim()) { showAlert('Enter rejection reason first.', 'error'); return; }
    try {
      await kycAction({ adminId: user.id, userId, approve, reason });
      showAlert(approve ? '✓ KYC Approved!' : 'KYC Rejected.');
      setRejectionReasons(p => ({ ...p, [userId]: '' }));
    } catch (e) { showAlert(e.message, 'error'); }
  };

  const handleDispute = async (tradeId, action) => {
    if (!window.confirm(`Force ${action === 'release' ? 'RELEASE to Buyer' : 'REFUND to Seller'}? This is irreversible.`)) return;
    try {
      if (action === 'release') await disputeRelease({ tradeId, adminId: user.id });
      else                      await disputeRefund({ tradeId, adminId: user.id });
      showAlert(`Dispute resolved: ${action}`);
    } catch (e) { showAlert(e.message, 'error'); }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault(); setSavingSettings(true);
    try {
      await updateSettings({ 
        etbRatePerDollar: parseFloat(etbRate), 
        etbRatePerDollarSell: parseFloat(etbRateSell), 
        commissionType: 'percentage', 
        commissionValue: parseFloat(commissionValue) 
      });
      showAlert('✓ Settings saved!');
    } catch (e) { showAlert(e.message, 'error'); }
    finally { setSavingSettings(false); }
  };

  const handleSupportReply = async (e) => {
    e.preventDefault();
    if (!supportReplyText.trim() || !selectedTicket) return;
    try {
      await supportReply({ ticketId: selectedTicket.id, adminId: user.id, message: supportReplyText });
      setSupportReplyText('');
    } catch (e) { showAlert(e.message, 'error'); }
  };

  const handleApproveDeposit = async (id) => {
    await approveDepositRequest(id, 'Approved');
    showAlert('✓ Wallet credited!');
  };

  const handleRejectDeposit = async (id) => {
    const note = depositRejectNotes[id] || '';
    if (!note.trim()) { showAlert('Enter rejection reason.', 'error'); return; }
    await rejectDepositRequest(id, note);
    showAlert('Deposit rejected.');
    setDepositRejectNotes(p => ({ ...p, [id]: '' }));
  };

  const handleWithdrawEarnings = async (e) => {
    e.preventDefault();
    if (!withdrawAddress.trim()) { showAlert('Enter your Binance deposit address.', 'error'); return; }
    const available = adminEarnings?.walletBalance ?? 0;
    if (available <= 0) { showAlert('No balance to withdraw.', 'error'); return; }
    setWithdrawingEarnings(true);
    try {
      await convexWithdraw({ userId: user.id, amountETH: available, destinationAddress: withdrawAddress });
      showAlert(`✓ Withdrawal of $${available.toFixed(2)} USD sent to Binance!`);
      setWithdrawAddress('');
    } catch (e) { showAlert(e.message, 'error'); }
    finally { setWithdrawingEarnings(false); }
  };

  const handleLogout = () => { localStorage.removeItem('ethioswap_user'); window.location.reload(); };

  const cs = { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px' };

  /* ── Metrics shortcuts ─────────────────────────────────────── */
  const m = revenue?.metrics;
  const rate = settings?.etbRatePerDollar ?? 190;

  const getImageUrl = (src) => {
    if (!src) return '';
    if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) return src;
    return `http://localhost:5000${src}`;
  };

  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const liveTotalUsers = allUsersList?.length ?? 0;
  const liveNewUsersThisWeek = allUsersList?.filter(u => new Date(u.joinedAt).getTime() >= oneWeekAgo).length ?? 0;
  
  const approvedDeposits = allDepositReqs?.filter(r => r.status === 'approved') ?? [];
  const liveTotalDeposit = approvedDeposits.reduce((s, r) => s + r.amountUSD, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeIn 0.3s ease' }}>

      {/* Toast */}
      {alertMsg && (
        <div style={{
          position: 'fixed', top: '70px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 500, padding: '10px 18px', whiteSpace: 'nowrap',
          background: alertType === 'error' ? 'var(--status-danger-bg)' : 'var(--status-success-bg)',
          border: `1px solid ${alertType === 'error' ? 'var(--status-danger-border)' : 'var(--status-success-border)'}`,
          borderRadius: '10px', fontSize: '13px', fontWeight: 600,
          color: alertType === 'error' ? 'var(--status-danger-text)' : 'var(--status-success-text)',
          animation: 'slideDown 0.2s ease', boxShadow: 'var(--shadow-md)',
        }}>
          {alertMsg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Logo size={28} showText={false} />
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, background: 'linear-gradient(90deg,var(--gold-light),#fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Admin Panel
          </h2>
          <p style={{ fontSize: '10px', color: 'var(--text-3)', margin: 0 }}>EthioSwap Control Center</p>
        </div>
        <button onClick={handleLogout} style={{ padding: '7px 12px', background: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', color: 'var(--status-danger-text)', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
          Logout
        </button>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '4px', gap: '2px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
        {navTabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex: '0 0 auto', minWidth: '54px', padding: '8px 5px', borderRadius: '10px',
            border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
            background: activeTab === t.id
              ? t.id === 'earnings' ? 'linear-gradient(135deg,rgba(0,212,170,0.15),rgba(0,212,170,0.05))'
              : 'linear-gradient(135deg,rgba(200,150,44,0.18),rgba(200,150,44,0.05))'
              : 'transparent',
            color: activeTab === t.id
              ? t.id === 'earnings' ? 'var(--teal-light)' : 'var(--gold-light)'
              : 'var(--text-3)',
            transition: 'all 0.15s ease', position: 'relative',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
          }}>
            <span style={{ fontSize: '15px', lineHeight: 1 }}>{t.em}</span>
            <span style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.title}</span>
            {t.badge > 0 && (
              <span className="badge-pulse" style={{
                position: 'absolute', top: '2px', right: '4px',
                background: '#EF4444', color: 'white', borderRadius: '99px',
                fontSize: '8px', fontWeight: 700, minWidth: '13px', height: '13px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══ OVERVIEW ══════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Rate hero */}
          <div className="fade-in-1" style={{
            background: 'linear-gradient(135deg, rgba(200,150,44,0.16) 0%, rgba(200,150,44,0.04) 100%)',
            border: '1px solid rgba(200,150,44,0.3)', borderRadius: '18px', padding: '18px',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '130px', height: '130px', background: 'radial-gradient(circle, rgba(200,150,44,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ fontSize: '10px', color: 'var(--gold-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>💱 Platform P2P Exchange Rates</div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>Buy Price (User Buys $)</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-1)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                  $1 = <span className="gradient-text-gold">{settings?.etbRatePerDollar ?? '—'} ETB</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>Sell Price (User Sells $)</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-1)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                  $1 = <span className="gradient-text-gold">{settings?.etbRatePerDollarSell ?? settings?.etbRatePerDollar ?? '—'} ETB</span>
                </div>
              </div>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>Tap ⚙️ Config to edit rates anytime.</div>
          </div>

          {/* Period selector */}
          <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '3px', gap: '2px' }}>
            {[{id:'today',l:'Today'},{id:'week',l:'Week'},{id:'month',l:'Month'},{id:'all',l:'All'}].map(t => (
              <button key={t.id} onClick={() => setPeriod(t.id)} style={{
                flex: 1, padding: '7px', borderRadius: '7px', border: 'none', fontFamily: 'var(--font)',
                fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease',
                background: period === t.id ? 'var(--bg-elevated)' : 'transparent',
                color: period === t.id ? 'var(--gold-light)' : 'var(--text-3)',
              }}>{t.l}</button>
            ))}
          </div>

          {/* 8 metric cards in 2×4 grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div className="metric-card metric-card-gold fade-in-1">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <div className="metric-icon metric-icon-gold">👥</div>
                <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>Total Users</div>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--gold-light)', letterSpacing: '-0.04em', lineHeight: 1 }}>{liveTotalUsers}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '4px' }}>+{liveNewUsersThisWeek} this week</div>
            </div>

            <div className="metric-card metric-card-teal fade-in-2">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <div className="metric-icon metric-icon-teal">📈</div>
                <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>New This Week</div>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--teal-light)', letterSpacing: '-0.04em', lineHeight: 1 }}>{liveNewUsersThisWeek}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '4px' }}>joined last 7 days</div>
            </div>

            <div className="metric-card metric-card-gold fade-in-3">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <div className="metric-icon metric-icon-gold">⬇️</div>
                <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>Total Deposits</div>
              </div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--gold-light)', letterSpacing: '-0.04em', lineHeight: 1 }}>
                ${liveTotalDeposit.toFixed(2)}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '4px' }}>≈ {Math.round(liveTotalDeposit * rate).toLocaleString()} ETB</div>
            </div>

            <div className="metric-card metric-card-teal fade-in-4">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <div className="metric-icon metric-icon-teal">🔄</div>
                <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>P2P Volume</div>
              </div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--teal-light)', letterSpacing: '-0.04em', lineHeight: 1 }}>
                ${(m?.totalUSD ?? 0).toFixed(2)}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '4px' }}>all trades completed</div>
            </div>

            <div className="metric-card metric-card-indigo fade-in-5">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <div className="metric-icon metric-icon-indigo">🛒</div>
                <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>Total Buys</div>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--indigo-light)', letterSpacing: '-0.04em', lineHeight: 1 }}>{m?.buyCount ?? 0}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '4px' }}>completed trades</div>
            </div>

            <div className="metric-card metric-card-indigo fade-in-6">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <div className="metric-icon metric-icon-indigo">🏷️</div>
                <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>Total Sells</div>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--indigo-light)', letterSpacing: '-0.04em', lineHeight: 1 }}>{m?.sellCount ?? 0}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '4px' }}>listings filled</div>
            </div>
          </div>

          {/* Earnings preview */}
          <div className="earnings-hero fade-in-6" onClick={() => setActiveTab('earnings')} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--teal-light)', marginBottom: '6px' }}>💰 My Earnings</div>
                <div style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>
                  <span className="gradient-text-teal">${(m?.totalMyProfit ?? 0).toFixed(2)}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>
                  +${(m?.feesThisWeek ?? 0).toFixed(2)} this week
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', background: 'rgba(0,212,170,0.15)', color: 'var(--teal-light)', borderRadius: '99px', border: '1px solid rgba(0,212,170,0.25)' }}>
                  Tap to withdraw →
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>to Binance</div>
              </div>
            </div>
          </div>

          {/* Volume bar chart */}
          <div style={cs}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '12px' }}>7-Day Volume</div>
            {revenue?.chartData ? (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '80px' }}>
                {revenue.chartData.map((d, i) => {
                  const h = Math.max((d.volumeUSD / chartMax) * 100, 5);
                  const isLast = i === revenue.chartData.length - 1;
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                      <div title={`$${d.volumeUSD.toFixed(0)} · Fee: $${(d.feeUSD||0).toFixed(2)}`} style={{
                        width: '100%', height: `${h}%`, minHeight: '4px',
                        background: isLast
                          ? 'linear-gradient(180deg, var(--gold-light), var(--gold))'
                          : 'linear-gradient(180deg, rgba(200,150,44,0.4), rgba(200,150,44,0.15))',
                        borderRadius: '4px 4px 0 0', transition: 'height 0.5s cubic-bezier(0.34,1.56,0.64,1)',
                        position: 'relative', overflow: 'hidden',
                      }}>
                        {isLast && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)', animation: 'shimmer 2s infinite' }} />}
                      </div>
                      <span style={{ fontSize: '8px', color: 'var(--text-3)' }}>{d.day}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="skeleton" style={{ height: '80px' }} />
            )}
          </div>

          {/* Pending deposits alert */}
          {pendingDeposits.length > 0 && (
            <div style={{ ...cs, borderColor: 'rgba(251,191,36,0.25)', background: 'rgba(251,191,36,0.03)', cursor: 'pointer' }} onClick={() => setActiveTab('deposits')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--status-warning-text)' }}>
                  💵 {pendingDeposits.length} pending deposit request{pendingDeposits.length > 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold-light)' }}>Review →</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ EARNINGS ══════════════════════════════════════════ */}
      {activeTab === 'earnings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Earnings hero */}
          <div className="earnings-hero fade-in-1">
            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--teal-light)', marginBottom: '8px' }}>
              💰 Total Commission Earned
            </div>
            <div style={{ fontSize: '40px', fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1 }}>
              <span className="gradient-text-teal">${(m?.totalMyProfit ?? 0).toFixed(2)}</span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '6px' }}>
              ≈ {Math.round((m?.totalMyProfit ?? 0) * rate).toLocaleString()} ETB
            </div>
          </div>

          {/* Breakdown cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { label: 'This Week',  value: m?.feesThisWeek ?? 0,     icon: '📅' },
              { label: 'All Time',   value: m?.totalMyProfit ?? 0,    icon: '♾️' },
              { label: 'Wallet $',   value: adminEarnings?.walletBalance ?? 0, icon: '💳' },
              { label: 'Commission', value: settings?.commissionValue ?? 0.5,  icon: '⚙️', suffix: '%' },
            ].map((card, i) => (
              <div key={i} className="metric-card metric-card-teal fade-in-1">
                <div style={{ fontSize: '18px', marginBottom: '4px' }}>{card.icon}</div>
                <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '2px' }}>{card.label}</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--teal-light)', letterSpacing: '-0.03em' }}>
                  {card.suffix ? `${card.value}${card.suffix}` : `$${Number(card.value).toFixed(2)}`}
                </div>
              </div>
            ))}
          </div>

          {/* Withdraw to Binance */}
          <div style={{ ...cs, borderColor: 'rgba(240,185,11,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(240,185,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>🔶</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>Withdraw to Binance</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Send your earnings to your Binance USD account</div>
              </div>
            </div>

            {/* How to get Binance address guide */}
            <div style={{ background: 'rgba(240,185,11,0.06)', border: '1px solid rgba(240,185,11,0.15)', borderRadius: '10px', padding: '12px', marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#F0B90B', marginBottom: '6px' }}>📖 How to find your Binance deposit address:</div>
              <ol style={{ fontSize: '11px', color: 'var(--text-2)', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px', lineHeight: 1.5 }}>
                <li>Open Binance app → Wallet → Deposit</li>
                <li>Select <strong>USDT</strong> (or USD) → Network: <strong>TRC20</strong></li>
                <li>Copy your deposit address below</li>
                <li>Paste it here and click Withdraw</li>
              </ol>
            </div>

            <form onSubmit={handleWithdrawEarnings} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Binance Deposit Address (TRC20 / ERC20)</label>
                <input
                  className="input"
                  type="text"
                  placeholder="T… or 0x… (paste your Binance address)"
                  value={withdrawAddress}
                  onChange={e => setWithdrawAddress(e.target.value)}
                />
              </div>
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-2)' }}>Available to withdraw:</span>
                <span style={{ fontWeight: 800, color: 'var(--teal-light)', fontSize: '16px' }}>
                  ${(adminEarnings?.walletBalance ?? 0).toFixed(2)} USD
                </span>
              </div>
              <button type="submit" disabled={withdrawingEarnings || !adminEarnings?.walletBalance} className="btn btn-teal btn-full" style={{ padding: '14px', fontSize: '14px' }}>
                {withdrawingEarnings ? '⏳ Sending…' : '💸 Withdraw All Earnings to Binance'}
              </button>
            </form>
          </div>

          {/* Alternative: sell on Binance */}
          <div style={{ ...cs, borderColor: 'rgba(99,102,241,0.2)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--indigo-light)', marginBottom: '8px' }}>🔄 Prefer to convert to ETB?</div>
            <p style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
              After withdrawing to Binance, you can sell your USDT there for ETB using Binance P2P:
              <br />1. Go to Binance → P2P Trading
              <br />2. Select USDT → ETB → post a sell order
              <br />3. Buyers will send you ETB directly to your bank
            </p>
          </div>
        </div>
      )}

      {/* ══ KYC ══════════════════════════════════════════════ */}
      {activeTab === 'kyc' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>
            {kycQueue.length} pending verification{kycQueue.length !== 1 ? 's' : ''}
          </div>

          {kycQueue.length === 0 ? (
            <div style={{ ...cs, textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>✅</div>
              <p style={{ color: 'var(--text-3)', fontSize: '14px' }}>All KYC cleared!</p>
            </div>
          ) : kycQueue.map(u => (
            <div key={u.id} style={{ ...cs, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <div className="avatar" style={{ width: '44px', height: '44px', fontSize: '18px' }}>
                  {(u.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>@{u.username}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>📞 {u.phone}</div>
                </div>
                <span className="badge badge-warning">⏳ Pending</span>
              </div>

              <div style={{ background: 'var(--bg-elevated)', borderRadius: '10px', padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '12px' }}>
                {[
                  { l: 'Full Name', v: u.kycData?.name },
                  { l: 'Age',       v: u.kycData?.age },
                  { l: 'ID Type',   v: u.kycData?.idType },
                  { l: 'Address',   v: u.kycData?.address },
                  { l: 'KYC Phone', v: u.kycData?.phone || u.phone, span: 2 },
                ].map(f => (
                  <div key={f.l} style={{ gridColumn: f.span === 2 ? 'span 2' : undefined }}>
                    <div style={{ color: 'var(--text-3)', fontSize: '10px', marginBottom: '2px' }}>{f.l}</div>
                    <div style={{ fontWeight: 600, color: f.v ? 'var(--text-1)' : 'var(--text-3)', fontStyle: f.v ? 'normal' : 'italic' }}>
                      {f.v || 'Not provided'}
                    </div>
                  </div>
                ))}
              </div>

              <KycImages userId={u.id} getImageUrl={getImageUrl} />

              <input
                type="text"
                value={rejectionReasons[u.id] || ''}
                onChange={e => setRejectionReasons(p => ({ ...p, [u.id]: e.target.value }))}
                placeholder="Rejection reason (required only if rejecting)…"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '13px', fontFamily: 'var(--font)', outline: 'none' }}
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => handleKYC(u.id, true)}  className="btn btn-success" style={{ flex: 1, padding: '13px' }}>✓ Approve</button>
                <button onClick={() => handleKYC(u.id, false)} className="btn btn-danger"  style={{ flex: 1, padding: '13px' }}>✗ Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ DEPOSITS ══════════════════════════════════════════ */}
      {activeTab === 'deposits' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>Deposit Requests</div>
            <span className="badge badge-warning">{pendingDeposits.length} pending</span>
          </div>

          {allDepositReqs.length === 0 ? (
            <div style={{ ...cs, textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>💵</div>
              <p style={{ color: 'var(--text-3)', fontSize: '14px' }}>No deposit requests yet</p>
            </div>
          ) : allDepositReqs.map(req => {
            const meta = WALLET_META[req.walletType] || WALLET_META.other;
            const isPending = req.status === 'pending';
            return (
              <div key={req.id} style={{
                ...cs, display: 'flex', flexDirection: 'column', gap: '12px',
                borderColor: isPending ? 'rgba(251,191,36,0.25)' : 'var(--border)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                      {meta.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>@{req.username}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{meta.label}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--gold-light)' }}>${req.amountUSD.toFixed(2)}</div>
                    <StatusBadge status={req.status} />
                  </div>
                </div>

                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-3)' }}>Reference:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{req.senderReference || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-3)' }}>Submitted:</span>
                    <span style={{ color: 'var(--text-2)' }}>{new Date(req.createdAt).toLocaleString('en-ET', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                  {req.adminNote && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ color: 'var(--text-3)' }}>Note:</span>
                      <span style={{ color: req.status === 'rejected' ? 'var(--status-danger-text)' : 'var(--status-success-text)', fontWeight: 600 }}>{req.adminNote}</span>
                    </div>
                  )}
                </div>

                {req.hasScreenshot && (
                  <DepositScreenshot requestId={req.id} getImageUrl={getImageUrl} />
                )}

                {isPending && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button onClick={() => handleApproveDeposit(req.id)} className="btn btn-success btn-full" style={{ padding: '12px', fontWeight: 700 }}>
                      ✓ Approve & Credit ${req.amountUSD.toFixed(2)} USD
                    </button>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="text" value={depositRejectNotes[req.id] || ''} onChange={e => setDepositRejectNotes(p => ({ ...p, [req.id]: e.target.value }))} placeholder="Rejection reason…" style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '12px', fontFamily: 'var(--font)', outline: 'none' }} />
                      <button onClick={() => handleRejectDeposit(req.id)} className="btn btn-danger" style={{ padding: '10px 14px', flexShrink: 0 }}>Reject</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══ DISPUTES ══════════════════════════════════════════ */}
      {activeTab === 'disputes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {disputes.length === 0 ? (
            <div style={{ ...cs, textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>⚖️</div>
              <p style={{ color: 'var(--text-3)', fontSize: '14px' }}>No active disputes</p>
            </div>
          ) : disputes.map(d => (
            <div key={d.id} style={{ ...cs, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>@{d.buyerName} ↔ @{d.sellerName}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>${parseFloat(d.amountETH).toFixed(2)} USD</div>
                </div>
                <span className="badge badge-danger">⚠ Disputed</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => handleDispute(d.id, 'release')} className="btn btn-success" style={{ flex: 1 }}>Release to Buyer</button>
                <button onClick={() => handleDispute(d.id, 'refund')}  className="btn btn-danger"  style={{ flex: 1 }}>Refund Seller</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ SUPPORT ══════════════════════════════════════════ */}
      {activeTab === 'support' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {!selectedTicket ? (
            <>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>Support Conversations</div>
              {supportTickets.length === 0 ? (
                <div style={{ ...cs, textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>No tickets</div>
              ) : supportTickets.map(t => {
                const lastMsg = t.messages[t.messages.length - 1];
                return (
                  <div key={t.id} onClick={() => setSelectedTicket(t)} style={{ ...cs, cursor: 'pointer', borderColor: t.status === 'open' ? 'rgba(200,150,44,0.2)' : 'var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px' }}>@{t.username || 'User'}</span>
                      <StatusBadge status={t.status} />
                    </div>
                    {lastMsg && <div style={{ fontSize: '12px', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lastMsg.senderName}: {lastMsg.message}</div>}
                  </div>
                );
              })}
            </>
          ) : (
            <div style={{ border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>@{selectedTicket.username}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>Support chat</div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {selectedTicket.status === 'open' && (
                    <button onClick={() => closeTicket({ ticketId: selectedTicket.id }).then(() => { showAlert('Resolved.'); setSelectedTicket(null); })} style={{ padding: '6px 10px', background: 'var(--status-success-bg)', border: 'none', color: 'var(--status-success-text)', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>✓ Resolve</button>
                  )}
                  <button onClick={() => setSelectedTicket(null)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
              </div>

              <div style={{ padding: '14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '280px', maxHeight: '380px', background: 'var(--bg-surface)' }}>
                {selectedTicket.messages.map((msg, i) => {
                  const isAdmin = msg.senderId === user.id || msg.senderId === 'usr_admin';
                  return (
                    <div key={i} style={{ alignSelf: isAdmin ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
                      <div style={{ fontSize: '9px', color: 'var(--text-3)', marginBottom: '3px', textAlign: isAdmin ? 'right' : 'left' }}>{msg.senderName}</div>
                      <div style={{ padding: '10px 13px', borderRadius: isAdmin ? '14px 14px 3px 14px' : '14px 14px 14px 3px', background: isAdmin ? 'linear-gradient(135deg,var(--gold),var(--gold-light))' : 'var(--bg-elevated)', border: isAdmin ? 'none' : '1px solid var(--border)', color: isAdmin ? '#0A0C12' : 'var(--text-1)', fontSize: '13px', lineHeight: '1.45' }}>
                        {msg.message}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {selectedTicket.status === 'open' ? (
                <form onSubmit={handleSupportReply} style={{ display: 'flex', padding: '10px', borderTop: '1px solid var(--border)', gap: '8px', background: 'var(--bg-surface)' }}>
                  <input type="text" value={supportReplyText} onChange={e => setSupportReplyText(e.target.value)} placeholder="Reply…" style={{ flex: 1, padding: '10px 13px', borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '13px', fontFamily: 'var(--font)', outline: 'none' }} />
                  <button type="submit" className="btn btn-gold" style={{ padding: '10px 16px' }}>Send ➤</button>
                </form>
              ) : (
                <div style={{ padding: '12px', textAlign: 'center', background: 'var(--bg-elevated)', fontSize: '12px', color: 'var(--text-3)', borderTop: '1px solid var(--border)' }}>🔒 Resolved</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ USERS ═════════════════════════════════════════════ */}
      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>
            All Users ({allUsersList?.length ?? 0})
          </div>
          {!allUsersList ? (
            <div className="skeleton" style={{ height: '200px' }} />
          ) : allUsersList.map(u => (
            <div key={u._id} style={{ ...cs, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                <div className="avatar" style={{ width: '40px', height: '40px', fontSize: '16px', background: u.role === 'admin' ? 'linear-gradient(135deg,var(--gold),var(--gold-light))' : 'var(--gold-bg)', color: u.role === 'admin' ? '#0A0C12' : 'var(--gold-light)' }}>
                  {(u.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{u.username}</span>
                    {u.role === 'admin' && <span style={{ fontSize: '9px', fontWeight: 800, background: 'var(--gold-bg)', color: 'var(--gold-light)', padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase' }}>Admin</span>}
                    {u.isSuspended && <span style={{ fontSize: '9px', fontWeight: 800, background: 'var(--status-danger-bg)', color: 'var(--status-danger-text)', padding: '1px 5px', borderRadius: '4px', border: '1px solid var(--status-danger-border)' }}>🚫 Suspended</span>}
                    {u.warnings && u.warnings.length > 0 && <span style={{ fontSize: '9px', fontWeight: 800, background: 'rgba(251,191,36,0.1)', color: 'var(--status-warning-text)', padding: '1px 5px', borderRadius: '4px', border: '1px solid var(--status-warning-border)' }}>⚠️ {u.warnings.length} Warn</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{u.phone}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold-light)' }}>${(u.ethBalance || 0).toFixed(2)}</div>
                  <div style={{ fontSize: '10px', fontWeight: 600, marginTop: '2px', color: u.kycStatus === 'approved' ? 'var(--status-success-text)' : u.kycStatus === 'pending' ? 'var(--status-warning-text)' : 'var(--text-3)' }}>
                    {u.kycStatus === 'approved' ? '✓ Verified' : u.kycStatus === 'pending' ? '⏳ Pending' : '✗ Unverified'}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {u.role !== 'admin' && (
                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '10px', justifyContent: 'flex-end', width: '100%', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => setWarnUserId(u._id.toString())} 
                    style={{ 
                      background: 'rgba(251,191,36,0.06)', 
                      border: '1px solid var(--status-warning-border)', 
                      color: 'var(--status-warning-text)', 
                      borderRadius: '8px', 
                      padding: '5px 12px', 
                      fontSize: '11px', 
                      fontWeight: 700, 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontFamily: 'var(--font)'
                    }}
                  >
                    ⚠️ Warn
                  </button>
                  <button 
                    onClick={() => handleToggleSuspend(u._id.toString(), !!u.isSuspended)} 
                    style={{ 
                      background: u.isSuspended ? 'rgba(0,212,170,0.07)' : 'rgba(248,113,113,0.07)', 
                      border: u.isSuspended ? '1px solid rgba(0,212,170,0.2)' : '1px solid rgba(248,113,113,0.2)', 
                      color: u.isSuspended ? 'var(--teal-light)' : 'var(--status-danger-text)', 
                      borderRadius: '8px', 
                      padding: '5px 12px', 
                      fontSize: '11px', 
                      fontWeight: 700, 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontFamily: 'var(--font)'
                    }}
                  >
                    {u.isSuspended ? '✅ Unpush (Activate)' : '🚫 Push (Suspend)'}
                  </button>
                  <button 
                    onClick={() => handleRemoveUser(u._id.toString(), u.username)} 
                    style={{ 
                      background: 'rgba(248,113,113,0.12)', 
                      border: '1px solid rgba(248,113,113,0.3)', 
                      color: 'var(--status-danger-text)', 
                      borderRadius: '8px', 
                      padding: '5px 10px', 
                      fontSize: '11px', 
                      fontWeight: 700, 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      fontFamily: 'var(--font)'
                    }}
                    title="Remove User Permanently"
                  >
                    🗑️ Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ══ SETTINGS ══════════════════════════════════════════ */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Rate inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'linear-gradient(135deg,rgba(200,150,44,0.12),rgba(200,150,44,0.02))', border: '1px solid rgba(200,150,44,0.25)', borderRadius: '18px', padding: '18px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold-light)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>💱 Exchange Rates (USD/ETB)</div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Buy Price (User Buys $)</label>
                <div style={{ position: 'relative' }}>
                  <input type="number" step="0.01" value={etbRate} onChange={e => setEtbRate(e.target.value)} style={{ width: '100%', padding: '10px 10px 10px 42px', background: 'rgba(10,12,18,0.6)', border: '1px solid rgba(200,150,44,0.4)', borderRadius: '10px', color: 'var(--text-1)', fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font)', outline: 'none' }} />
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: 700, color: 'var(--gold-light)' }}>ETB</span>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '4px' }}>Current: {settings?.etbRatePerDollar ?? '—'}</div>
              </div>

              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Sell Price (User Sells $)</label>
                <div style={{ position: 'relative' }}>
                  <input type="number" step="0.01" value={etbRateSell} onChange={e => setEtbRateSell(e.target.value)} style={{ width: '100%', padding: '10px 10px 10px 42px', background: 'rgba(10,12,18,0.6)', border: '1px solid rgba(200,150,44,0.4)', borderRadius: '10px', color: 'var(--text-1)', fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font)', outline: 'none' }} />
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: 700, color: 'var(--gold-light)' }}>ETB</span>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '4px' }}>Current: {settings?.etbRatePerDollarSell ?? settings?.etbRatePerDollar ?? '—'}</div>
              </div>
            </div>
          </div>

          <div style={cs}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', marginBottom: '10px' }}>Platform Commission (%)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              {[0.5, 1, 1.5, 2, 2.5, 3, 4, 5].map(opt => (
                <button key={opt} type="button" onClick={() => setCommissionValue(opt.toString())} style={{ padding: '8px 14px', borderRadius: '8px', border: `1px solid ${commissionValue === opt.toString() ? 'var(--gold)' : 'var(--border)'}`, background: commissionValue === opt.toString() ? 'var(--gold-bg)' : 'var(--bg-elevated)', color: commissionValue === opt.toString() ? 'var(--gold-light)' : 'var(--text-2)', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  {opt}%
                </button>
              ))}
            </div>
            <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-3)' }}>Fee on $10 trade:</span>
                <span style={{ color: 'var(--status-danger-text)', fontWeight: 600 }}>${(10 * parseFloat(commissionValue || 0) / 100).toFixed(3)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700 }}>Buyer gets:</span>
                <span style={{ fontWeight: 800, color: 'var(--gold-light)', fontSize: '14px' }}>${(10 - 10 * parseFloat(commissionValue || 0) / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <button type="submit" disabled={savingSettings} className="btn btn-gold btn-full btn-lg">
            {savingSettings ? '⏳ Saving…' : '💾 Save Settings'}
          </button>
        </form>
      )}

      {/* ══ WARN USER MODAL ══════════════════════════════════ */}
      {warnUserId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(8px)' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-1)' }}>⚠️ Issue Official User Warning</h3>
              <button onClick={() => { setWarnUserId(null); setWarnMessage(''); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', fontSize: '18px', cursor: 'pointer' }}>×</button>
            </div>
            
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-3)', lineHeight: '1.5' }}>
              This warning will be recorded on the user's profile and displayed prominently at the top of their dashboard in real-time.
            </p>

            <form onSubmit={handleWarnUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase' }}>Warning Message</label>
                <textarea 
                  value={warnMessage} 
                  onChange={e => setWarnMessage(e.target.value)} 
                  placeholder="Specify violation (e.g. offensive chat, failure to pay, suspicious behavior)..." 
                  rows={4}
                  required
                  style={{ 
                    width: '100%', 
                    padding: '12px 14px', 
                    borderRadius: '12px', 
                    background: 'var(--bg-elevated)', 
                    border: '1px solid var(--border)', 
                    color: 'var(--text-1)', 
                    fontSize: '13px', 
                    fontFamily: 'var(--font)', 
                    outline: 'none',
                    resize: 'none'
                  }} 
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="button" onClick={() => { setWarnUserId(null); setWarnMessage(''); }} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancel</button>
                <button type="submit" disabled={warnLoading} className="btn btn-gold" style={{ flex: 1, padding: '12px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  {warnLoading ? '⏳ Sending…' : '⚠️ Send Warning'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
