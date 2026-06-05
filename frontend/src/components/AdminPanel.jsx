import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from './Logo.jsx';
import { useQuery, useMutation } from "convex/react";
import { api } from "convex-api";
import { notify } from '../lib/notify';

/* ── Tiny inline icon ──────────────────────────────────────── */
const Ic = ({ d, size = 18, strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

/* ── Status badge with colored dot ────────────────────────── */
const StatusBadge = ({ status }) => {
  const map = {
    completed: { bg: 'rgba(0, 212, 160, 0.1)', color: '#00d4a0', label: 'Completed' },
    approved: { bg: 'rgba(0, 212, 160, 0.1)', color: '#00d4a0', label: 'Approved' },
    pending: { bg: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', label: 'Pending' },
    failed: { bg: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', label: 'Failed' },
    rejected: { bg: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', label: 'Rejected' },
    cancelled: { bg: 'rgba(255, 255, 255, 0.05)', color: '#8b92a8', label: 'Cancelled' },
    open: { bg: 'rgba(0, 212, 160, 0.1)', color: '#00d4a0', label: 'Open' },
    closed: { bg: 'rgba(255, 255, 255, 0.05)', color: '#8b92a8', label: 'Closed' }
  };
  const s = status?.toLowerCase() || '';
  const item = map[s] || { bg: 'rgba(255, 255, 255, 0.05)', color: '#8b92a8', label: status };
  return (
    <span className="pill-badge" style={{ backgroundColor: item.bg, color: item.color }}>
      <span className="pill-badge-dot" style={{ backgroundColor: item.color }} />
      {item.label}
    </span>
  );
};

/* ── Wallet type meta ──────────────────────────────────────── */
const WALLET_META = {
  binance:  { label: 'Binance Pay',    icon: '🔶', color: '#F0B90B' },
  bybit:    { label: 'Bybit',          icon: '🟡', color: '#F7A600' },
  telegram: { label: 'Telegram Wallet',icon: '✈️', color: '#2AABEE' },
  other:    { label: 'Other',          icon: '💳', color: '#8B92A8' },
};

/* ── Lazy KYC Images Viewer ─────────────────────────────────── */
const KycImages = ({ userId, getImageUrl, onImageClick, kycIdFront, kycIdBack, kycSelfie, kycDocument }) => {
  const hasDirectDocs = kycIdFront || kycIdBack || kycSelfie || kycDocument;
  const user = useQuery(api.users.get, { id: userId });
  const loading = !user && !hasDirectDocs;

  const front = kycIdFront || user?.kycIdFront;
  const back = kycIdBack || user?.kycIdBack || kycDocument || user?.kycDocument;
  const selfie = kycSelfie || user?.kycSelfie;

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {[1, 2].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: '180px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)' }} />
        ))}
      </div>
    );
  }

  const handleImageClick = (src) => {
    if (onImageClick && src) {
      onImageClick(getImageUrl(src));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Visual side-by-side comparison for front & selfie */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        {/* ID Document Display Box */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#8b92a8' }}>ID Card (Front)</div>
          {front ? (
            <div onClick={() => handleImageClick(front)} style={{ cursor: 'pointer', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#0a0c12', position: 'relative' }}>
              <img src={getImageUrl(front)} alt="ID Front" style={{ width: '100%', height: '150px', objectFit: 'contain', display: 'block', transition: 'all 0.2s ease' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
              <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', padding: '4px', borderRadius: '4px', color: '#fff', fontSize: '10px' }}>🔍 Zoom</div>
            </div>
          ) : (
            <div style={{ height: '150px', background: '#0a0c12', border: '1px dashed rgba(255,255,255,0.07)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#4e5567' }}>Not Uploaded</div>
          )}
        </div>

        {/* Live Selfie Display Box */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#8b92a8' }}>Live Selfie Photo</div>
          {selfie ? (
            <div onClick={() => handleImageClick(selfie)} style={{ cursor: 'pointer', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#0a0c12', position: 'relative' }}>
              <img src={getImageUrl(selfie)} alt="Live Selfie" style={{ width: '100%', height: '150px', objectFit: 'contain', display: 'block', transition: 'all 0.2s ease' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
              <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', padding: '4px', borderRadius: '4px', color: '#fff', fontSize: '10px' }}>🔍 Zoom</div>
            </div>
          ) : (
            <div style={{ height: '150px', background: '#0a0c12', border: '1px dashed rgba(255,255,255,0.07)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#4e5567' }}>Not Uploaded</div>
          )}
        </div>
      </div>

      {/* Back Document row if exists */}
      {back && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#8b92a8' }}>ID Card (Back / Supporting Doc)</div>
          <div onClick={() => handleImageClick(back)} style={{ cursor: 'pointer', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#0a0c12', position: 'relative' }}>
            <img src={getImageUrl(back)} alt="ID Back" style={{ width: '100%', height: '140px', objectFit: 'contain', display: 'block', transition: 'all 0.2s ease' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
            <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', padding: '4px', borderRadius: '4px', color: '#fff', fontSize: '10px' }}>🔍 Zoom</div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Lazy Deposit Screenshot Viewer ─────────────────────────── */
const DepositScreenshot = ({ requestId, getImageUrl, onImageClick }) => {
  const deposit = useQuery(api.depositRequests.get, { id: requestId });
  const screenshotUrl = deposit?.screenshotUrl;

  if (deposit === undefined) {
    return (
      <div className="skeleton" style={{ width: '100%', height: '140px', border: '1px solid rgba(255,255,255,0.07)' }} />
    );
  }

  if (!screenshotUrl) return null;

  return (
    <div onClick={() => onImageClick && onImageClick(getImageUrl(screenshotUrl))} style={{ width: '100%', display: 'block', cursor: 'pointer' }}>
      <img src={getImageUrl(screenshotUrl)} alt="Proof of Deposit" style={{ width: '100%', maxHeight: '160px', objectFit: 'contain', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)', background: '#0a0c12', transition: 'transform 0.15s ease' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.01)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
    </div>
  );
};

/* ── Invite Helper Components ────────────────────────────── */
const InviteStatusCard = ({ user, settings, showAlert }) => {
  const updateSettings = useMutation(api.systemSettings.update);
  const manualUnlock = async () => {
    if (window.confirm("Are you sure you want to manually unlock the Invite & Earn program for ALL users?")) {
      try {
        await updateSettings({ id: settings._id, updates: { inviteEarnStatus: 'active' } });
        showAlert("✓ Program unlocked successfully!");
      } catch (e) { showAlert(e.message, "error"); }
    }
  };
  return (
    <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Program Status</h3>
        <span className="pill-badge" style={{ 
          background: settings?.inviteEarnStatus === 'active' ? 'rgba(0, 212, 160, 0.1)' : 'rgba(244, 63, 94, 0.1)', 
          color: settings?.inviteEarnStatus === 'active' ? '#00d4a0' : '#f43f5e' 
        }}>
          <span className="pill-badge-dot" style={{ background: settings?.inviteEarnStatus === 'active' ? '#00d4a0' : '#f43f5e' }} />
          {settings?.inviteEarnStatus?.toUpperCase() || 'LOCKED'}
        </span>
      </div>

      {settings?.inviteEarnStatus !== 'active' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: '#8b92a8' }}>Progress to Auto-Unlock</span>
            <span style={{ fontWeight: 700 }}>{settings?.currentVerifiedUsers || 0} / {settings?.inviteUnlockTarget || 200} users</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ 
              width: `${Math.min(100, ((settings?.currentVerifiedUsers || 0) / (settings?.inviteUnlockTarget || 200)) * 100)}%`, 
              height: '100%', 
              background: '#00d4a0',
              transition: 'width 0.5s ease'
            }} />
          </div>
          <p style={{ fontSize: '12px', color: '#4e5567', fontStyle: 'italic' }}>
            ⚠️ Auto-unlocks at {settings?.inviteUnlockTarget || 200} verified & active users.
          </p>
          <button 
            onClick={manualUnlock}
            className="btn-premium-danger" 
            style={{ marginTop: '10px' }}
          >
            🔓 MANUALLY UNLOCK NOW
          </button>
        </div>
      )}
    </div>
  );
};

const InviteGlobalStatsCard = ({ user }) => {
  const stats = useQuery(api.inviteRewards.getStats);

  return (
    <div className="card-premium">
      <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 600 }}>Global Stats</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ background: '#0a0c12', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontSize: '11px', color: '#8b92a8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Total Invites Made</div>
          <div style={{ fontSize: '20px', fontWeight: 700 }}>{stats?.totalInvites || 0}</div>
        </div>
        <div style={{ background: '#0a0c12', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontSize: '11px', color: '#8b92a8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Total Rewards Paid</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#00d4a0' }}>${stats?.totalRewardsPaid?.toFixed(2) || '0.00'}</div>
        </div>
        <div style={{ background: '#0a0c12', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontSize: '11px', color: '#8b92a8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Active Referrals</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#00d4a0' }}>{stats?.totalActive || 0}</div>
        </div>
        <div style={{ background: '#0a0c12', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontSize: '11px', color: '#8b92a8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Pending Referrals</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#fbbf24' }}>{stats?.totalPending || 0}</div>
        </div>
      </div>
    </div>
  );
};

const TopInvitersTable = ({ user }) => {
  const topInviters = useQuery(api.inviteRewards.listTopInviters, { limit: 5 }) || [];

  return (
    <div className="card-premium">
      <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 600 }}>Top Inviters This Month</h3>
      <table className="table-premium">
        <thead>
          <tr>
            <th>Rank</th>
            <th>User</th>
            <th>Invites</th>
            <th>Earned</th>
          </tr>
        </thead>
        <tbody>
          {topInviters.map((inv, i) => (
            <tr key={i}>
              <td>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
              <td style={{ fontWeight: 600 }}>@{inv.username}</td>
              <td>{inv.successfulInvites || 0}</td>
              <td style={{ color: '#00d4a0', fontWeight: 700 }}>${(inv.totalInviteEarnings || 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const InviteSettingsCard = ({ settings, updateSettings }) => {
  return (
    <div className="card-premium">
      <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 600 }}>Reward Settings</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', color: '#8b92a8' }}>Reward Per Invite (USD)</label>
          <input 
            type="number" 
            step="0.01" 
            className="input-premium" 
            value={settings?.inviteRewardAmount || 0.50} 
            onChange={async (e) => await updateSettings({ id: settings._id, updates: { inviteRewardAmount: parseFloat(e.target.value) } })}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', color: '#8b92a8' }}>Min Trade to Qualify (USD)</label>
          <input 
            type="number" 
            className="input-premium" 
            defaultValue="10.00"
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', color: '#8b92a8' }}>P2P Commission (%)</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="number" 
              step="0.1" 
              className="input-premium" 
              value={settings?.p2pCommission || 0} 
              onChange={async (e) => await updateSettings({ id: settings._id, updates: { p2pCommission: parseFloat(e.target.value) } })}
            />
            <button 
              onClick={async () => await updateSettings({ id: settings._id, updates: { isP2pFreePeriod: !settings?.isP2pFreePeriod } })}
              className={settings?.isP2pFreePeriod ? "btn-premium-primary" : "btn-premium-ghost"}
              style={{ whiteSpace: 'nowrap' }}
            >
              {settings?.isP2pFreePeriod ? "Free Period ON" : "Free Period OFF"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   ADMIN PANEL MAIN REDESIGNED COMPONENT
   ══════════════════════════════════════════════════════════════ */
const AdminPanel = ({ user }) => {
  const { 
    approveDepositRequest, 
    rejectDepositRequest, 
    allDepositReqs,
    allWithdrawalReqs,
    approveWithdrawalRequest,
    rejectWithdrawalRequest
  } = useAuth();

  const [activeTab,   setActiveTab]   = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar toggle
  const [chartType,   setChartType]   = useState('volume'); // 'volume' | 'users'
  const [period,      setPeriod]      = useState('week');
  const [hoveredIdx,  setHoveredIdx]  = useState(null);
  const [alertMsg,    setAlertMsg]    = useState(null);
  const [alertType,   setAlertType]   = useState('success');
  const [savingSettings, setSavingSettings] = useState(false);
  const [activeLightboxImage, setActiveLightboxImage] = useState(null);
  const [selectedTicket,    setSelectedTicket]    = useState(null);
  const [supportReplyText,  setSupportReplyText]  = useState('');
  const [withdrawAddress,   setWithdrawAddress]   = useState('');
  const [withdrawAmount,    setWithdrawAmount]    = useState('');
  const [withdrawingEarnings, setWithdrawingEarnings] = useState(false);
  
  // Slide-over Drawers States
  const [selectedUserDetailId, setSelectedUserDetailId] = useState(null);
  const [selectedDepositDetailId, setSelectedDepositDetailId] = useState(null);
  const [selectedWithdrawDetailId, setSelectedWithdrawDetailId] = useState(null);
  const [selectedKycDetailId, setSelectedKycDetailId] = useState(null);
  
  // Tabs inside User Drawer
  const [userDrawerTab, setUserDrawerTab] = useState('profile'); // 'profile' | 'transactions' | 'kyc' | 'activity'

  // Messaging Popups & Composer states
  const [messageComposerUserId, setMessageComposerUserId] = useState(null);
  const [messageComposerUsername, setMessageComposerUsername] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [warnMessage, setWarnMessage] = useState('');
  const [warnLoading, setWarnLoading] = useState(false);

  // Verification Resubmission Reason popup
  const [resubmitUserId, setResubmitUserId] = useState(null);
  const [resubmitReason, setResubmitReason] = useState('');
  const [submittingResubmit, setSubmittingResubmit] = useState(false);

  // Search, Filters & Sorting states for tables
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilterKyc, setUserFilterKyc]     = useState('all');
  const [userFilterBan, setUserFilterBan]     = useState('all');

  const [depositSearchQuery, setDepositSearchQuery] = useState('');
  const [depositFilterStatus, setDepositFilterStatus] = useState('all');
  const [depositSortField, setDepositSortField] = useState('createdAt');
  const [depositSortOrder, setDepositSortOrder] = useState('desc');
  const [depositCurrentPage, setDepositCurrentPage] = useState(1);

  const [withdrawSearchQuery, setWithdrawSearchQuery] = useState('');
  const [withdrawFilterStatus, setWithdrawFilterStatus] = useState('all');
  const [withdrawSortField, setWithdrawSortField] = useState('createdAt');
  const [withdrawSortOrder, setWithdrawSortOrder] = useState('desc');
  const [withdrawCurrentPage, setWithdrawCurrentPage] = useState(1);

  const [kycSearchQuery, setKycSearchQuery] = useState('');
  const [kycFilterStatus, setKycFilterStatus] = useState('all');

  const [reviewFilterStatus, setReviewFilterStatus] = useState('all');

  const [logsSearchQuery, setLogsSearchQuery] = useState('');

  const chatEndRef = useRef(null);

  const showAlert = (msg, type = 'success') => {
    setAlertMsg(msg); setAlertType(type);
    setTimeout(() => setAlertMsg(null), 3500);
  };

  // ── Convex Data Fetching ──────────────────────────────────
  const settings = useQuery(api.systemSettings.get);
  const allUsersList = useQuery(api.users.listAll) || [];
  const kycQueue = useQuery(api.users.listKycQueue) || [];
  const auditLogs = useQuery(api.adminAuditLogs.list) || [];
  const disputes = useQuery(api.trades.listDisputed) || [];
  const supportTickets = useQuery(api.supportTickets.listAll) || [];
  const allReviews = useQuery(api.reviews.listAll) || [];

  // Mutations
  const updateSettingsMutation = useMutation(api.systemSettings.update);
  const addAuditLog = useMutation(api.adminAuditLogs.insert);
  const updateUserStatus = useMutation(api.users.updateStatus);
  const updateKycStatus = useMutation(api.users.updateKycStatus);
  const removeUserMutation = useMutation(api.users.remove);
  const addWarningMutation = useMutation(api.users.addWarning);
  const replyToTicket = useMutation(api.supportTickets.reply);
  const closeTicket = useMutation(api.supportTickets.close);
  const approveReviewMutation = useMutation(api.reviews.approve);
  const removeReviewMutation = useMutation(api.reviews.remove);

  const [adminEarnings, setAdminEarnings] = useState(null);

  useEffect(() => {
    if (settings) {
      setAdminEarnings({ walletBalance: settings.collectedFeesETH || 0 });
    }
  }, [settings]);

  const [selectedUserTxs, setSelectedUserTxs] = useState([]);
  const userTxs = useQuery(api.trades.listForUser, selectedUserDetailId ? { userId: selectedUserDetailId } : "skip");
  
  useEffect(() => {
    if (userTxs) setSelectedUserTxs(userTxs);
  }, [userTxs]);

  // ── Settings state ──────────────────────────────────────────
  const [etbRate,          setEtbRate]         = useState('');
  const [etbRateSell,      setEtbRateSell]     = useState('');
  const [commissionValue,  setCommissionValue]  = useState('1.0');
  const [depositFee,       setDepositFee]       = useState('1.0');
  const [withdrawFee,      setWithdrawFee]      = useState('1.0');
  const [minDeposit,       setMinDeposit]       = useState('5');
  const [minWithdraw,      setMinWithdraw]      = useState('5');
  const [maxDailyWithdraw, setMaxDailyWithdraw] = useState('1000');
  const [pointsPerTrade,   setPointsPerTrade]   = useState('10');
  const [referralPoints,   setReferralPoints]   = useState('50');
  const [isLeaderboard,    setIsLeaderboard]    = useState(true);

  useEffect(() => {
    if (settings) {
      setEtbRate(settings.etbRatePerDollar);
      setEtbRateSell(settings.etbRatePerDollarSell ?? settings.etbRatePerDollar ?? 186.0);
      setCommissionValue(settings.commissionValue?.toString() || '1.0');
      setDepositFee(settings.depositFeePercent?.toString() || '1.0');
      setWithdrawFee(settings.withdrawalFeePercent?.toString() || '1.0');
      setMinDeposit(settings.minDepositUSD?.toString() || '5');
      setMinWithdraw(settings.minWithdrawalUSD?.toString() || '5');
      setMaxDailyWithdraw(settings.maxDailyWithdrawalUSD?.toString() || '1000');
      setPointsPerTrade(settings.pointsPerTrade?.toString() || '10');
      setReferralPoints(settings.referralBonusPoints?.toString() || '50');
      setIsLeaderboard(settings.isLeaderboardEnabled ?? true);
    }
  }, [settings]);

  // ── Support auto-refresh ──────────────────────────────────────
  useEffect(() => {
    if (selectedTicket) {
      const updated = supportTickets.find(t => t._id === selectedTicket._id);
      if (updated) setSelectedTicket(updated);
    }
  }, [supportTickets]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [selectedTicket?.messages]);

  // ── Nav tabs definition ──────────────────────────────────────
  const pendingDeposits = (allDepositReqs || []).filter(r => r.status === 'pending');
  const pendingWithdrawals = (allWithdrawalReqs || []).filter(r => r.status === 'pending');

  const navTabs = [
    { id: 'overview',  icon: 'ti-layout-dashboard', title: 'Dashboard',    badge: 0 },
    { id: 'users',     icon: 'ti-users',            title: 'Users',        badge: 0 },
    { id: 'kyc',       icon: 'ti-id-badge',         title: 'KYC',          badge: kycQueue.length },
    { id: 'trades',    icon: 'ti-arrows-right-left',title: 'Trades',       badge: 0 },
    { id: 'deposits',  icon: 'ti-credit-card',      title: 'Deposits',     badge: pendingDeposits.length },
    { id: 'withdrawals',icon: 'ti-wallet',           title: 'Withdrawals',  badge: pendingWithdrawals.length },
    { id: 'listings',  icon: 'ti-list-search',      title: 'Listings',     badge: 0 },
    { id: 'reviews',   icon: 'ti-star',             title: 'Reviews',      badge: 0 },
    { id: 'disputes',  icon: 'ti-alert-triangle',   title: 'Disputes',     badge: disputes.length },
    { id: 'support',   icon: 'ti-messages',         title: 'Support',      badge: supportTickets.filter(t => t.status === 'open' && t.messages && t.messages.length > 0 && t.messages[t.messages.length - 1].senderId !== user?.id && t.messages[t.messages.length - 1].senderId !== 'usr_admin').length },
    { id: 'earnings',  icon: 'ti-chart-line',       title: 'Exchange Rates', badge: 0 },
    { id: 'settings',  icon: 'ti-settings',         title: 'System Settings', badge: 0 },
    { id: 'logs',      icon: 'ti-history',           title: 'Audit Logs',    badge: 0 },
  ];

  // ── Admin User Handlers ─────────────────────────────────────
  const handleWarnUserSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserDetailId || !warnMessage.trim()) return;
    setWarnLoading(true);
    try {
      await addWarningMutation({ id: selectedUserDetailId, message: warnMessage });
      
      // Add audit log
      await addAuditLog({
        adminId: user._id,
        adminUsername: user.username,
        action: 'warn_user',
        targetId: selectedUserDetailId,
        details: `Issued warning: ${warnMessage}`
      });

      showAlert("⚠️ User warning has been issued successfully.");
      setWarnMessage('');
    } catch (err) {
      showAlert("Error sending warning: " + err.message, "error");
    } finally {
      setWarnLoading(false);
    }
  };

  const handleToggleSuspend = async (userId, currentSuspended) => {
    const actionText = currentSuspended ? "activate" : "suspend";
    if (!window.confirm(`Are you sure you want to ${actionText} this user?`)) return;
    try {
      await updateUserStatus({ id: userId, isSuspended: !currentSuspended });
      
      await addAuditLog({
        adminId: user._id,
        adminUsername: user.username,
        action: currentSuspended ? 'unsuspend_user' : 'suspend_user',
        targetId: userId,
        details: `${currentSuspended ? 'Unsuspended' : 'Suspended'} user account`
      });

      showAlert(`User account successfully ${currentSuspended ? 'activated' : 'suspended'}.`);
    } catch (err) {
      showAlert("Error updating user status: " + err.message, "error");
    }
  };

  const handleRemoveUser = async (userId, username) => {
    if (userId === user._id) {
      showAlert("❌ Safety Guard: You cannot delete your own administrator account.", "error");
      return false;
    }
    if (!window.confirm(`⚠️ WARNING! Are you absolutely sure you want to completely REMOVE @${username}?\nThis will permanently delete their account and listings. This action is IRREVERSIBLE!`)) return false;
    try {
      await removeUserMutation({ id: userId });
      
      await addAuditLog({
        adminId: user._id,
        adminUsername: user.username,
        action: 'remove_user',
        details: `Permanently removed user: @${username}`
      });

      showAlert("User account permanently removed.");
      return true;
    } catch (err) {
      showAlert("Error removing user: " + err.message, "error");
      return false;
    }
  };
  const handleWithdrawal = async (requestId, approve) => {
    try {
      if (approve) {
        await approveWithdrawalRequest(requestId);
        showAlert('✓ Withdrawal approved and processed!');
      } else {
        const note = prompt('Please specify a rejection reason:');
        if (note === null) return;
        if (!note.trim()) { showAlert('Rejection reason is required.', 'error'); return; }
        await rejectWithdrawalRequest(requestId, note);
        showAlert('Withdrawal rejected and refunded.');
      }
      setSelectedWithdrawDetailId(null);
    } catch (e) { showAlert(e.message, 'error'); }
  };

  const handleKYC = async (userId, approve) => {
    try {
      if (approve) {
        await updateKycStatus({ id: userId, status: 'approved' });
        showAlert('✓ KYC verification has been approved!');
      } else {
        const reason = prompt('Please specify rejection reason:');
        if (reason === null) return;
        if (!reason.trim()) { showAlert('Rejection reason is required.', 'error'); return; }
        await updateKycStatus({ id: userId, status: 'rejected', rejectionReason: reason });
        showAlert('KYC submission has been rejected.');
      }
      setSelectedKycDetailId(null);
    } catch (e) { showAlert(e.message, 'error'); }
  };

  const handleResubmitRequest = async (e) => {
    e.preventDefault();
    if (!resubmitUserId || !resubmitReason.trim()) return;
    setSubmittingResubmit(true);
    try {
      await updateKycStatus({ id: resubmitUserId, status: 'none', rejectionReason: resubmitReason });
      showAlert('⚠ Resubmission request processed successfully.');
      setResubmitUserId(null);
      setResubmitReason('');
      setSelectedKycDetailId(null);
    } catch (err) {
      showAlert('Error requesting resubmission: ' + err.message, 'error');
    } finally {
      setSubmittingResubmit(false);
    }
  };

  const handleSendMessageSubmit = async (e) => {
    e.preventDefault();
    if (!messageComposerUserId || !messageBody.trim()) return;
    setSendingMessage(true);
    try {
      // Mocked for Convex migration
      const ticket = null; 
      let ticketId = ticket?.id;
      
      if (!ticketId) {
        // Mocked creation
        ticketId = "new-ticket-id";
      }

      const currentTicket = { messages: [] };
      const newMessage = {
        senderId: user.id,
        message: messageSubject.trim() ? `[Subject: ${messageSubject.trim()}]\n\n${messageBody}` : messageBody,
        timestamp: new Date().toISOString()
      };
      
      // Mocked update
      console.log('Would update ticket with messages:', [...(currentTicket?.messages || []), newMessage]);
      
      showAlert('✓ Direct message sent to user!');
      setMessageComposerUserId(null);
      setMessageSubject('');
      setMessageBody('');
    } catch (err) {
      showAlert('Error sending message: ' + err.message, 'error');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleApproveReview = async (reviewId) => {
    try {
      await approveReviewMutation({ id: reviewId });
      showAlert('✓ Review approved successfully!');
    } catch (err) {
      showAlert('Error approving review: ' + err.message, 'error');
    }
  };

  const handleRejectReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to reject and delete this review?')) return;
    try {
      await removeReviewMutation({ id: reviewId });
      showAlert('Review rejected and deleted.');
    } catch (e) { showAlert(e.message, 'error'); }
  };

  const handleDispute = async (tradeId, action) => {
    if (!window.confirm(`Force ${action === 'release' ? 'RELEASE to Buyer' : 'REFUND to Seller'}? This is irreversible.`)) return;
    try {
      // Mocked for Convex migration
      console.log('Would resolve dispute for trade:', tradeId, action);
      showAlert(`Dispute resolved: ${action}`);
    } catch (e) { showAlert(e.message, 'error'); }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!settings?._id) {
      showAlert('Error: Settings document not found.', 'error');
      return;
    }
    setSavingSettings(true);
    try {
      await updateSettingsMutation({
        id: settings._id,
        updates: {
          etbRatePerDollar: parseFloat(etbRate) || 190.0,
          etbRatePerDollarSell: parseFloat(etbRateSell) || 186.0,
          commissionValue: parseFloat(commissionValue) || 1.0,
          depositFeePercent: parseFloat(depositFee) || 1.0,
          withdrawalFeePercent: parseFloat(withdrawFee) || 1.0,
          minDepositUSD: parseFloat(minDeposit) || 5,
          minWithdrawalUSD: parseFloat(minWithdraw) || 10,
          maxDailyWithdrawalUSD: parseFloat(maxDailyWithdraw) || 1000,
          pointsPerTrade: parseFloat(pointsPerTrade) || 10,
          referralBonusPoints: parseFloat(referralPoints) || 50,
          isLeaderboardEnabled: !!isLeaderboard,
        }
      });
      showAlert('✓ Settings saved successfully!');
    } catch (e) { showAlert(e.message, 'error'); }
    finally { setSavingSettings(false); }
  };

  const handleSupportReply = async (e) => {
    e.preventDefault();
    if (!supportReplyText.trim() || !selectedTicket) return;
    try {
      await replyToTicket({
        id: selectedTicket._id,
        senderId: user?._id || 'usr_admin',
        text: supportReplyText.trim()
      });
      setSupportReplyText('');
    } catch (e) { showAlert(e.message, 'error'); }
  };
  const handleApproveDeposit = async (id) => {
    if (!window.confirm('Approve this deposit request and credit funds to user balance?')) return;
    try {
      await approveDepositRequest(id);
      showAlert('✓ Deposit approved and wallet credited!');
      setSelectedDepositDetailId(null);
    } catch (err) { showAlert(err.message, 'error'); }
  };

  const handleRejectDeposit = async (id) => {
    const reason = prompt('Please specify a rejection reason:');
    if (reason === null) return;
    if (!reason.trim()) { showAlert('Rejection reason is required.', 'error'); return; }
    try {
      await rejectDepositRequest(id, reason);
      showAlert('Deposit request rejected.');
      setSelectedDepositDetailId(null);
    } catch (err) { showAlert(err.message, 'error'); }
  };

  const handleWithdrawEarnings = async (e) => {
    e.preventDefault();
    if (!withdrawAddress.trim()) { showAlert('Enter your Binance deposit address.', 'error'); return; }
    const available = adminEarnings?.walletBalance ?? 0;
    if (available <= 0) { showAlert('No balance available to withdraw.', 'error'); return; }

    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) { showAlert('Enter a valid amount to withdraw.', 'error'); return; }
    if (amt > available) { showAlert(`Insufficient balance. Maximum is $${available.toFixed(2)} USD.`, 'error'); return; }

    setWithdrawingEarnings(true);
    try {
      // Mocked for Convex migration
      console.log('Would request admin withdrawal:', { amt, withdrawAddress });
      showAlert(`✓ Withdrawal of $${amt.toFixed(2)} USD requested!`);
      setWithdrawAddress('');
      setWithdrawAmount('');
    } catch (e) { showAlert(e.message, 'error'); }
    finally { setWithdrawingEarnings(false); }
  };

  const cs = { background: '#111318', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '24px' };
  const rate = settings?.etbRatePerDollar ?? 190;

  const getImageUrl = (src) => {
    if (!src) return '';
    if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) return src;
    // Fallback for local development or missing base URL
    const baseUrl = import.meta.env.VITE_API_URL || '';
    return `${baseUrl}${src}`;
  };

  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const liveTotalUsers = allUsersList?.length ?? 0;
  const liveNewUsersThisWeek = allUsersList?.filter(u => new Date(u.joinedAt).getTime() >= oneWeekAgo).length ?? 0;
  
  const approvedDeposits = allDepositReqs?.filter(r => r.status === 'approved') ?? [];
  const liveTotalDeposit = approvedDeposits.reduce((s, r) => s + (r.amountUSD ?? r.amountUsd ?? 0), 0);

  // ── Bezier Chart Calculations ──────────────────────────────
  const totalMyProfit = settings?.collectedFeesETH ?? 0;
  const approvedDepositsThisWeek = allDepositReqs?.filter(r => 
    r.status === 'approved' && 
    new Date(r.createdAt).getTime() >= oneWeekAgo
  ) ?? [];
  const depositFeePercent = settings?.depositFeePercent ?? 1.0;
  const depositFeesThisWeek = approvedDepositsThisWeek.reduce((s, r) => s + (r.amountUSD ?? r.amountUsd ?? 0) * (depositFeePercent / 100), 0);

  const m = {
    totalMyProfit,
    feesThisWeek: depositFeesThisWeek,
    buyCount: allDepositReqs?.filter(r => r.status === 'approved').length ?? 0,
    sellCount: allWithdrawalReqs?.filter(r => r.status === 'approved').length ?? 0
  };
  const realVolume = liveTotalDeposit || 150.0;
  const realUsers = liveTotalUsers || 12;
  
  const volumeFactors = [0.10, 0.14, 0.12, 0.19, 0.15, 0.22, 0.18];
  const userFactors = [0.4, 0.48, 0.58, 0.65, 0.76, 0.88, 1.0];
  
  const chartPoints = chartType === 'volume' 
    ? volumeFactors.map(f => realVolume * f)
    : userFactors.map(f => Math.max(1, Math.round(realUsers * f)));

  const svgWidth = 600;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 30;
  const chartMaxVal = Math.max(...chartPoints, 1);
  
  const points = chartPoints.map((val, i) => {
    const x = paddingX + (i * (svgWidth - paddingX * 2) / (chartPoints.length - 1));
    const y = svgHeight - paddingY - (val * (svgHeight - paddingY * 2) / chartMaxVal);
    return { x, y, val };
  });
  
  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cpX1 = prev.x + (p.x - prev.x) / 2;
    const cpY1 = prev.y;
    const cpX2 = prev.x + (p.x - prev.x) / 2;
    const cpY2 = p.y;
    return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`;
  }, '');
  
  const areaD = points.length > 0 
    ? `${pathD} L ${points[points.length - 1].x} ${svgHeight - paddingY} L ${points[0].x} ${svgHeight - paddingY} Z`
    : '';

  // ── CSV Exporters ──────────────────────────────────────────
  const handleExportDepositsCSV = () => {
    const headers = ["#", "User", "Amount (USD)", "Amount (ETB)", "Method", "Date", "Status"];
    const rows = (allDepositReqs || []).map((req, idx) => [
      idx + 1,
      `@${req.username}`,
      (req.amountUSD ?? req.amountUsd ?? 0).toFixed(2),
      Math.round(req.amountUSD * rate),
      req.walletType,
      new Date(req.createdAt).toLocaleString(),
      req.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ethioswap_deposits_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportWithdrawalsCSV = () => {
    const headers = ["#", "User", "Amount (USD)", "Amount (ETB)", "Destination", "Date", "Status"];
    const rows = (allWithdrawalReqs || []).map((req, idx) => [
      idx + 1,
      `@${req.username}`,
      (req.amountUSD ?? req.amountUsd ?? 0).toFixed(2),
      Math.round(req.amountUSD * rate),
      req.destinationAddress || 'N/A',
      new Date(req.createdAt).toLocaleString(),
      req.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ethioswap_withdrawals_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLogout = () => { localStorage.removeItem('ethioswap_user'); window.location.reload(); };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-page)] text-[var(--text-primary)] font-[var(--font-body)]">
      
      {/* ── STYLE INJECTIONS ── */}
      <style>{`
        @keyframes pulse-gold {
          0% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(255, 215, 0, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0); }
        }
        .pulse-badge { animation: pulse-gold 2s infinite; }
        .sidebar-nav::-webkit-scrollbar { width: 4px; }
        .sidebar-nav::-webkit-scrollbar-track { background: transparent; }
        .sidebar-nav::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
        .nav-item-active {
          color: var(--bg-page) !important;
          background: linear-gradient(90deg, var(--gold), #f0b800);
          font-weight: 700;
        }
        .nav-item-active i { color: var(--bg-page) !important; }
        .bento-card { position: relative; overflow: hidden; }
        .bento-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-image: url('https://images.unsplash.com/photo-1777886290011-324d49520e93?auto=format&w=600&q=80&fit=crop');
          background-size: cover;
          opacity: 0.05;
          z-index: 0;
        }
        @media (max-width: 1024px) {
          .admin-sidebar {
            position: fixed !important;
            left: -240px;
            top: 0; bottom: 0;
            z-index: 1000 !important;
            transition: left 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .admin-sidebar.open { left: 0 !important; }
          .mobile-only { display: flex !important; }
          .desktop-only { display: none !important; }
        }
        .mobile-only { display: none; }

        /* Tailwind-Compat Utilities for AdminPanel */
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .flex-1 { flex: 1 1 0%; }
        .flex-shrink-0 { flex-shrink: 0; }
        .h-screen { height: 100vh; }
        .overflow-hidden { overflow: hidden; }
        .overflow-y-auto { overflow-y: auto; }
        .min-w-0 { min-width: 0; }
        .items-center { align-items: center; }
        .justify-between { justify-content: space-between; }
        .w-full { width: 100%; }
        .text-left { text-align: left; }
        .text-center { text-align: center; }
        .text-white { color: #ffffff; }
        .ml-auto { margin-left: auto; }
        .mb-2 { margin-bottom: 0.5rem; }
        .mb-4 { margin-bottom: 1rem; }
        .mt-2 { margin-top: 0.5rem; }
        .mt-auto { margin-top: auto; }
        .p-2 { padding: 0.5rem; }
        .p-3 { padding: 0.75rem; }
        .p-4 { padding: 1rem; }
        .p-5 { padding: 1.25rem; }
        .p-6 { padding: 1.5rem; }
        .p-8 { padding: 2rem; }
        .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
        .px-5 { padding-left: 1.25rem; padding-right: 1.25rem; }
        .px-8 { padding-left: 2rem; padding-right: 2rem; }
        .py-1\\.5 { padding-top: 0.375rem; padding-bottom: 0.375rem; }
        .py-2\\.5 { padding-top: 0.625rem; padding-bottom: 0.625rem; }
        .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
        .pb-4 { padding-bottom: 1rem; }
        .border-b { border-bottom: 1px solid var(--border); }
        .border { border: 1px solid var(--border); }
        .border-2 { border: 2px solid var(--border); }
        .rounded-lg { border-radius: var(--radius-md); }
        .rounded-2xl { border-radius: var(--radius-lg); }
        .rounded-3xl { border-radius: var(--radius-xl); }
        .rounded-full { border-radius: 9999px; }
        .gap-2 { gap: 0.5rem; }
        .gap-3 { gap: 0.75rem; }
        .gap-4 { gap: 1rem; }
        .gap-5 { gap: 1.25rem; }
        .gap-6 { gap: 1.5rem; }
        .space-y-0\\.5 > * + * { margin-top: 0.125rem; }

        /* Grids */
        .grid { display: grid; }
        .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
        @media (min-width: 768px) {
          .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (min-width: 1024px) {
          .lg\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        }

        /* Dimension helpers */
        .w-6 { width: 24px; height: 24px; }
        .w-9 { width: 36px; height: 36px; }
        .w-12 { width: 48px; height: 48px; }
        .h-6 { height: 24px; }
        .h-9 { height: 36px; }
        .h-12 { height: 48px; }
        .h-\\[72px\\] { height: 72px; }

        /* Backgrounds, borders, text color with variable names */
        .bg-white\\/5:hover { background-color: rgba(255, 255, 255, 0.05); }
        .hover\\:bg-white\\/5:hover { background-color: rgba(255, 255, 255, 0.05); }
        .bg-\\[var\\(--bg-surface-hover\\)\\] { background-color: var(--bg-surface-hover); }
        .border-\\[var\\(--border-hover\\)\\] { border-color: var(--border-hover); }
        .text-\\[var\\(--text-secondary\\)\\] { color: var(--text-secondary); }
        .text-\\[var\\(--text-primary\\)\\] { color: var(--text-primary); }
        .bg-\\[var\\(--gold\\)\\]\\/10 { background-color: rgba(255, 215, 0, 0.1); }
        .text-\\[var\\(--gold\\)\\] { color: var(--gold); }
        .bg-\\[var\\(--teal\\)\\]\\/10 { background-color: rgba(0, 212, 160, 0.1); }
        .text-\\[var\\(--teal\\)\\] { color: var(--teal); }
        .bg-orange-500\\/10 { background-color: rgba(249, 115, 22, 0.1); }
        .text-orange-400 { color: #fb923c; }
        .bg-red-500\\/5 { background-color: rgba(239, 68, 68, 0.05); }
        .border-2.border-\\[var\\(--gold\\)\\] { border: 2px solid var(--gold); }
        .text-\\[var\\(--text-muted\\)\\] { color: var(--text-muted); }
      `}</style>

      {/* Toast Alert — Premium Slide-In */}
      {alertMsg && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px',
          zIndex: 9999,
          animation: 'slideInLeft 0.3s ease',
          maxWidth: '380px',
          minWidth: '260px',
        }}>
          <div style={{
            background: '#1a1d26',
            border: `1px solid ${alertType === 'error' ? 'rgba(244,63,94,0.4)' : 'rgba(0,212,160,0.4)'}`,
            borderLeft: `4px solid ${alertType === 'error' ? '#f43f5e' : '#00d4a0'}`,
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '13px',
            fontWeight: 600,
            color: alertType === 'error' ? '#f43f5e' : '#00d4a0',
            boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${alertType === 'error' ? 'rgba(244,63,94,0.1)' : 'rgba(0,212,160,0.1)'}`,
          }}>
            <span style={{ fontSize: '18px', flexShrink: 0 }}>
              {alertType === 'error' ? '✗' : '✓'}
            </span>
            <span style={{ flex: 1, lineHeight: 1.4 }}>{alertMsg}</span>
          </div>
        </div>
      )}

      {/* ── FIXED LEFT SIDEBAR ── */}
      {isSidebarOpen && (
        <div 
          className="sidebar-backdrop"
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 999,
            display: 'none'
          }} 
        />
      )}
      <aside 
        className={`admin-sidebar ${isSidebarOpen ? 'open' : ''}`}
        style={{
          width: '240px',
          flexShrink: 0,
          background: '#0a0c12',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        {/* Logo area */}
        <div className="p-5 pb-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 font-[var(--font-heading)] text-lg font-bold text-[var(--gold)]">
              <i className="ti ti-shield-check text-xl"></i>
              EthioSwap Admin
            </div>
            <div className="mt-1 inline-block text-[10px] font-bold text-[var(--teal)] bg-[var(--teal)]/10 border border-[var(--teal)]/30 px-1.5 py-0.5 rounded">
              COMMAND CENTER
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="mobile-only text-[var(--text-secondary)] text-xl">✕</button>
        </div>

        <div className="p-4 flex items-center gap-3 border-b border-[var(--border)]">
          <img src="https://i.pravatar.cc/36?u=admin_ethioswap" className="w-9 h-9 rounded-full border-2 border-[var(--gold)]" alt="Admin" />
          <div className="min-w-0">
            <div className="text-[13px] font-bold truncate">@admin_ethioswap</div>
            <div className="text-[11px] text-[var(--gold)]">Super Admin</div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto py-3 sidebar-nav custom-scrollbar">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-muted)] px-5 mb-2">Management</div>
          <div className="space-y-0.5">
            {navTabs.map(t => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { setActiveTab(t.id); if (t.id !== 'logs') setLogsSearchQuery(''); setIsSidebarOpen(false); }}
                  className={`flex items-center gap-3 px-5 py-2.5 text-[13px] w-full text-left transition-all group ${isActive ? 'nav-item-active rounded-r-lg mr-4' : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]'}`}
                >
                  <i className={`ti ${t.icon} text-[17px] ${isActive ? '' : 'group-hover:text-[var(--text-primary)]'}`}></i>
                  <span className={isActive ? 'font-bold' : 'font-medium'}>{t.title}</span>
                  {t.badge > 0 && (
                    <span className="ml-auto bg-[var(--error)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{t.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="mt-auto border-t border-[var(--border)] p-2">
          <button onClick={() => { if(window.confirm('Sign out of admin?')) window.location.reload(); }} className="flex items-center gap-3 px-5 py-3 text-[13px] font-bold text-[var(--error)] hover:bg-red-500/5 transition-all w-full text-left">
            <i className="ti ti-logout text-[17px]"></i>
            Sign Out
          </button>
        </div>
      </aside>

      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-[1000] lg:hidden backdrop-blur-sm" />}

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 flex flex-col min-w-0">
        
        <header className="h-[72px] flex-shrink-0 flex items-center justify-between px-8 border-b border-[var(--border)] bg-[var(--bg-page)]">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="mobile-only text-[var(--teal)] text-2xl">☰</button>
            <div>
              <h2 className="text-xl font-bold font-[var(--font-heading)]">
                {navTabs.find(t => t.id === activeTab)?.title || 'Admin'} <span className="text-[var(--gold)]">Center</span>
              </h2>
              <div className="text-xs text-[var(--text-muted)] font-medium mt-0.5">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · Platform Health: Optimal
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5 desktop-only">
            <div className="flex items-center gap-2 bg-[var(--bg-surface-hover)] border border-[var(--border-hover)] px-3 py-1.5 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--teal)] notif-pulse"></div>
              <span className="text-xs font-bold text-[var(--teal)]">Live</span>
            </div>
            <div className="relative w-9 h-9 flex items-center justify-center bg-[var(--bg-surface-hover)] border border-[var(--border-hover)] rounded-lg cursor-pointer hover:border-[var(--gold)]/40 transition-all">
              <i className="ti ti-bell text-[var(--text-secondary)] text-lg"></i>
              <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-[var(--error)] border border-[var(--bg-page)]"></span>
            </div>
            <div className="flex items-center gap-2.5 bg-[var(--bg-surface-hover)] border border-[var(--border-hover)] px-3 py-1.5 rounded-lg">
              <img src="https://i.pravatar.cc/24?u=admin_ethioswap" className="w-6 h-6 rounded-full border border-[var(--gold)]" alt="Admin" />
              <span className="text-[13px] font-bold">Admin</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

          {/* ════ OVERVIEW / STATS DASHBOARD PAGE ════ */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.25s ease' }}>
              
              {/* Rate hero banner */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(0,212,160,0.12) 0%, rgba(0,212,160,0.02) 100%)',
                border: '1px solid rgba(0,212,160,0.25)', borderRadius: '14px', padding: '20px 24px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '130px', height: '130px', background: 'radial-gradient(circle, rgba(0,212,160,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div>
                  <div style={{ fontSize: '11px', color: '#00d4a0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>💱 Live Platform Exchange Rates</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#f0f2f8', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span>Buy: <strong style={{ color: '#00d4a0' }}>$1 = {settings?.etbRatePerDollar ?? '—'} ETB</strong></span>
                    <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
                    <span>Sell: <strong style={{ color: '#00d4a0' }}>$1 = {settings?.etbRatePerDollarSell ?? settings?.etbRatePerDollar ?? '—'} ETB</strong></span>
                  </div>
                </div>
                <button onClick={() => setActiveTab('settings')} className="btn-premium-secondary" style={{ padding: '8px 14px', fontSize: '12px' }}>
                  Edit in Config →
                </button>
              </div>

              {/* Segmented Pill Period Control */}
              <div style={{ display: 'flex', background: '#111318', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '30px', padding: '4px', width: '320px', gap: '2px' }}>
                {[{id:'today',l:'Today'},{id:'week',l:'Week'},{id:'month',l:'Month'},{id:'all',l:'All'}].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setPeriod(t.id)}
                    className="segmented-btn"
                    style={{
                      borderRadius: '30px',
                      background: period === t.id ? '#00d4a0' : 'transparent',
                      color: period === t.id ? '#0d1117' : '#8b92a8',
                    }}
                  >
                    {t.l}
                  </button>
                ))}
              </div>

              {/* Redesigned Bento Grid Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* 1. Volume */}
                <div className="bento-card p-6 rounded-3xl bg-[var(--bg-surface-hover)] border border-[var(--border-hover)] group hover:border-[var(--gold)]/30 transition-all duration-500">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-2xl bg-[var(--gold)]/10 text-[var(--gold)]">
                        <i className="ti ti-coins text-2xl"></i>
                      </div>
                      <img src="https://cdn.jsdelivr.net/npm/game-icons-transparent@latest/svgs/viscious-speed/abstract-100.svg" className="w-12 h-12 opacity-20 filter invert group-hover:opacity-40 transition-opacity" style={{ color: 'var(--gold)' }} alt="abstract" />
                    </div>
                    <p className="text-[var(--text-secondary)] text-sm font-medium mb-1 uppercase tracking-tight">Total Volume</p>
                    <h3 className="text-3xl font-extrabold font-[var(--font-heading)] leading-none">${realVolume.toFixed(2)}</h3>
                    <p className="text-[var(--teal)] text-[10px] font-bold mt-2 flex items-center gap-1 uppercase">
                      <i className="ti ti-trending-up"></i> +12.5% <span className="text-[var(--text-muted)] font-medium">Filtered</span>
                    </p>
                  </div>
                </div>

                {/* 2. Users */}
                <div className="bento-card p-6 rounded-3xl bg-[var(--bg-surface-hover)] border border-[var(--border-hover)] group hover:border-[var(--gold)]/30 transition-all duration-500">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-2xl bg-[var(--teal)]/10 text-[var(--teal)]">
                        <i className="ti ti-users text-2xl"></i>
                      </div>
                      <img src="https://cdn.jsdelivr.net/npm/game-icons-transparent@latest/svgs/viscious-speed/abstract-111.svg" className="w-12 h-12 opacity-20 filter invert group-hover:opacity-40 transition-opacity" style={{ color: 'var(--teal)' }} alt="abstract" />
                    </div>
                    <p className="text-[var(--text-secondary)] text-sm font-medium mb-1 uppercase tracking-tight">Active Users</p>
                    <h3 className="text-3xl font-extrabold font-[var(--font-heading)] leading-none">{liveTotalUsers}</h3>
                    <p className="text-[var(--teal)] text-[10px] font-bold mt-2 flex items-center gap-1 uppercase">
                      <i className="ti ti-trending-up"></i> +8.2% <span className="text-[var(--text-muted)] font-medium">Growth</span>
                    </p>
                  </div>
                </div>

                {/* 3. Disputes */}
                <div className="bento-card p-6 rounded-3xl bg-[var(--bg-surface-hover)] border border-[var(--border-hover)] group hover:border-[var(--gold)]/30 transition-all duration-500">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-400">
                        <i className="ti ti-gavel text-2xl"></i>
                      </div>
                      <img src="https://cdn.jsdelivr.net/npm/game-icons-transparent@latest/svgs/lorc/spiral-arrow.svg" className="w-12 h-12 opacity-20 filter invert group-hover:opacity-40 transition-opacity" style={{ color: 'var(--warning)' }} alt="abstract" />
                    </div>
                    <p className="text-[var(--text-secondary)] text-sm font-medium mb-1 uppercase tracking-tight">Open Disputes</p>
                    <h3 className="text-3xl font-extrabold font-[var(--font-heading)] leading-none">{disputes.length}</h3>
                    <p className="text-red-400 text-[10px] font-bold mt-2 flex items-center gap-1 uppercase">
                      <i className="ti ti-alert-circle"></i> Requires Action
                    </p>
                  </div>
                </div>

                {/* 4. Escrow */}
                <div className="bento-card p-6 rounded-3xl bg-[var(--bg-surface-hover)] border border-[var(--border-hover)] group hover:border-[var(--gold)]/30 transition-all duration-500">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-2xl bg-[var(--gold)]/10 text-[var(--gold)]">
                        <i className="ti ti-lock text-2xl"></i>
                      </div>
                      <img src="https://cdn.jsdelivr.net/npm/game-icons-transparent@latest/svgs/lorc/steelwing-emblem.svg" className="w-12 h-12 opacity-20 filter invert group-hover:opacity-40 transition-opacity" style={{ color: 'var(--gold)' }} alt="abstract" />
                    </div>
                    <p className="text-[var(--text-secondary)] text-sm font-medium mb-1 uppercase tracking-tight">Value Locked</p>
                    <h3 className="text-3xl font-extrabold font-[var(--font-heading)] leading-none">${(adminEarnings?.walletLocked ?? 0).toFixed(2)}</h3>
                    <p className="text-[var(--text-muted)] text-[10px] font-bold mt-2 flex items-center gap-1 uppercase">
                      <i className="ti ti-shield-check"></i> Fully Insured
                    </p>
                  </div>
                </div>

              </div>

              {/* Glowing Performance Trends Chart Card */}
              <div className="card-premium" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Platform Performance Trends</h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#8b92a8' }}>Visualizing core analytics indices</p>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', background: '#0a0c12', padding: '3px', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px' }}>
                    <button
                      onClick={() => setChartType('volume')}
                      style={{
                        padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                        fontFamily: 'var(--font)', fontSize: '11px', fontWeight: 700,
                        background: chartType === 'volume' ? 'rgba(0, 212, 160, 0.15)' : 'transparent',
                        color: chartType === 'volume' ? '#00d4a0' : '#8b92a8',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      Volume
                    </button>
                    <button
                      onClick={() => setChartType('users')}
                      style={{
                        padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                        fontFamily: 'var(--font)', fontSize: '11px', fontWeight: 700,
                        background: chartType === 'users' ? 'rgba(0, 212, 160, 0.15)' : 'transparent',
                        color: chartType === 'users' ? '#00d4a0' : '#8b92a8',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      User Growth
                    </button>
                  </div>
                </div>

                {/* SVG Canvas with hovering elements */}
                <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height="100%" style={{ overflow: 'visible', display: 'block' }}>
                    <defs>
                      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#00d4a0" floodOpacity="0.25" />
                      </filter>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00d4a0" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#00d4a0" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Grid Lines */}
                    {[0.25, 0.5, 0.75].map((ratio, idx) => {
                      const y = paddingY + ratio * (svgHeight - paddingY * 2);
                      return (
                        <line
                          key={idx}
                          x1={paddingX}
                          y1={y}
                          x2={svgWidth - paddingX}
                          y2={y}
                          stroke="rgba(255,255,255,0.03)"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                      );
                    })}

                    {/* Fill Area */}
                    {areaD && <path d={areaD} fill="url(#areaGradient)" />}

                    {/* Main Line */}
                    {pathD && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#00d4a0"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        filter="url(#glow)"
                      />
                    )}

                    {/* Point circles & dynamic hover tooltips */}
                    {points.map((p, idx) => {
                      const isHovered = hoveredIdx === idx;
                      const showTooltip = isHovered || (hoveredIdx === null && idx === points.length - 1);
                      const isMainPoint = idx === points.length - 1;

                      return (
                        <g key={idx}>
                          {/* Vertical cursor grid line */}
                          <line
                            x1={p.x}
                            y1={paddingY}
                            x2={p.x}
                            y2={svgHeight - paddingY}
                            stroke={isHovered ? "rgba(0, 212, 160, 0.15)" : "rgba(255, 255, 255, 0.015)"}
                            strokeWidth="1.5"
                            strokeDasharray={isHovered ? "3 3" : "none"}
                          />
                          
                          {/* Outer pulse */}
                          {(isHovered || (hoveredIdx === null && isMainPoint)) && (
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r="8"
                              fill="#00d4a0"
                              opacity="0.25"
                            />
                          )}

                          {/* Interactive circle point */}
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={isHovered || (hoveredIdx === null && isMainPoint) ? "5.5" : "3.5"}
                            fill="#00d4a0"
                            stroke="#111318"
                            strokeWidth="2"
                          />

                          {/* Hover Tooltip Box */}
                          {showTooltip && (
                            <g style={{ pointerEvents: 'none' }}>
                              <rect
                                x={p.x - 35}
                                y={p.y - 32}
                                width="70"
                                height="20"
                                rx="6"
                                fill="#0a0c12"
                                stroke="rgba(0, 212, 160, 0.4)"
                                strokeWidth="1"
                              />
                              <text
                                x={p.x}
                                y={p.y - 18}
                                fontSize="9"
                                fontWeight="700"
                                textAnchor="middle"
                                fill="#f0f2f8"
                              >
                                {chartType === 'volume' ? `$${p.val.toFixed(1)}` : `${p.val} usr`}
                              </text>
                            </g>
                          )}

                          {/* Big trigger area for clean hover */}
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="20"
                            fill="transparent"
                            style={{ cursor: 'pointer', pointerEvents: 'all' }}
                            onMouseEnter={() => setHoveredIdx(idx)}
                            onMouseLeave={() => setHoveredIdx(null)}
                          />
                        </g>
                      );
                    })}

                    {/* X-Axis labels */}
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
                      const x = paddingX + (idx * (svgWidth - paddingX * 2) / 6);
                      return (
                        <text
                          key={idx}
                          x={x}
                          y={svgHeight - 8}
                          fontSize="10"
                          fontWeight="500"
                          fill="#4e5567"
                          textAnchor="middle"
                        >
                          {day}
                        </text>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Floating Bottom Sticky Bar */}
              <div className="floating-bottom-bar" style={{
                position: 'fixed',
                bottom: '24px',
                left: '268px',
                right: '28px',
                background: 'rgba(17, 19, 24, 0.85)',
                border: '1px solid rgba(0, 212, 160, 0.25)',
                borderRadius: '50px',
                padding: '12px 28px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(16px)',
                zIndex: 499
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '18px' }}>💰</span>
                  <div style={{ fontSize: '14px' }}>
                    <span style={{ color: '#8b92a8' }}>Platform Earnings Pool: </span>
                    <strong style={{ color: '#00d4a0', fontSize: '15px' }}>${(adminEarnings?.walletBalance ?? 0).toFixed(2)} USD</strong>
                    <span style={{ color: '#4e5567', marginLeft: '8px' }}>({(m?.feesThisWeek ?? 0) >= 0 ? `+$${(m?.feesThisWeek ?? 0).toFixed(2)} this week` : ''})</span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('earnings')}
                  className="btn-premium-primary"
                  style={{ borderRadius: '50px', padding: '8px 20px', fontSize: '12px' }}
                >
                  Withdraw to Binance →
                </button>
              </div>

            </div>
          )}

          {/* ════ EARNINGS BREAKDOWN & WITHDRAWALS SCREEN ════ */}
          {activeTab === 'earnings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.25s ease' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <div className="card-premium" style={{ borderLeft: '3px solid #00d4a0' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#8b92a8', textTransform: 'uppercase', marginBottom: '6px' }}>Cumulative Commission Earned</div>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: '#00d4a0' }}>${(m?.totalMyProfit ?? 0).toFixed(2)}</div>
                  <div style={{ fontSize: '13px', color: '#4e5567', marginTop: '6px' }}>
                    ≈ {Math.round((m?.totalMyProfit ?? 0) * rate).toLocaleString()} ETB processed
                  </div>
                </div>

                <div className="card-premium">
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#8b92a8', textTransform: 'uppercase', marginBottom: '6px' }}>withdrawable available balance</div>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: '#00d4a0' }}>${(adminEarnings?.walletBalance ?? 0).toFixed(2)}</div>
                  <div style={{ fontSize: '13px', color: '#4e5567', marginTop: '6px' }}>Available on-chain USDT pool</div>
                </div>
              </div>

              {/* Sub-grid metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
                {[
                  { label: 'Earned This Week', v: `$${(m?.feesThisWeek ?? 0).toFixed(2)}`, em: '📅' },
                  { label: 'All-Time Profit', v: `$${(m?.totalMyProfit ?? 0).toFixed(2)}`, em: '♾️' },
                  { label: 'Commission Rate', v: `${settings?.commissionValue ?? 1.0}%`, em: '⚙️' },
                  { label: 'Locked in Escrow', v: `$${(adminEarnings?.walletLocked ?? 0).toFixed(2)}`, em: '🔒' }
                ].map((item, idx) => (
                  <div key={idx} style={{ background: '#111318', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ fontSize: '16px', marginBottom: '4px' }}>{item.em}</div>
                    <div style={{ fontSize: '11px', color: '#8b92a8', textTransform: 'uppercase', marginBottom: '2px' }}>{item.label}</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#f0f2f8' }}>{item.v}</div>
                  </div>
                ))}
              </div>

              {/* Withdraw to Binance card */}
              <div className="card-premium" style={{ maxWidth: '640px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(240,185,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🔶</div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Withdraw Platform Earnings to Binance</h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#8b92a8' }}>Transfer on-chain profit directly using Tron TRC20 / ERC20</p>
                  </div>
                </div>

                <form onSubmit={handleWithdrawEarnings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#8b92a8' }}>Binance Deposit Address</label>
                    <input
                      className="input-premium"
                      type="text"
                      placeholder="T… or 0x… (paste TRC20 or ERC20 deposit address)"
                      value={withdrawAddress}
                      onChange={e => setWithdrawAddress(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#8b92a8' }}>Amount to Withdraw ($ USD)</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span style={{ position: 'absolute', left: '14px', color: '#4e5567', fontWeight: 600 }}>$</span>
                      <input
                        className="input-premium"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        style={{ paddingLeft: '28px' }}
                        value={withdrawAmount}
                        onChange={e => setWithdrawAmount(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setWithdrawAmount((adminEarnings?.walletBalance ?? 0).toFixed(2))}
                        style={{
                          position: 'absolute', right: '8px', background: 'rgba(0,212,160,0.12)', color: '#00d4a0',
                          border: '1px solid rgba(0,212,160,0.25)', borderRadius: '6px', padding: '4px 10px', fontSize: '11px',
                          fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)'
                        }}
                      >
                        MAX
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={withdrawingEarnings || !(adminEarnings?.walletBalance > 0)}
                    className="btn-premium-primary"
                    style={{ padding: '14px', fontSize: '14px' }}
                  >
                    {withdrawingEarnings ? '⏳ Processing Withdrawal…' : '💸 Withdraw Earnings to Binance'}
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* ════ DEPOSITS REDESIGNED UNIFIED TABLE PAGE ════ */}
          {activeTab === 'deposits' && (() => {
            // Filter
            const filteredDeposits = (allDepositReqs || []).filter(req => {
              const matchesSearch = !depositSearchQuery || 
                req.username?.toLowerCase().includes(depositSearchQuery.toLowerCase()) ||
                req.senderReference?.toLowerCase().includes(depositSearchQuery.toLowerCase()) ||
                req._id?.toString().toLowerCase().includes(depositSearchQuery.toLowerCase());
              
              const statusMap = {
                completed: 'approved',
                pending: 'pending',
                failed: 'rejected',
                cancelled: 'cancelled'
              };
              const targetStatus = statusMap[depositFilterStatus];
              const matchesStatus = depositFilterStatus === 'all' || req.status === targetStatus;

              return matchesSearch && matchesStatus;
            });

            // Sort
            const sortedDeposits = [...filteredDeposits].sort((a, b) => {
              let fieldA = a[depositSortField] || '';
              let fieldB = b[depositSortField] || '';
              if (typeof fieldA === 'string') fieldA = fieldA.toLowerCase();
              if (typeof fieldB === 'string') fieldB = fieldB.toLowerCase();
              
              if (fieldA < fieldB) return depositSortOrder === 'asc' ? -1 : 1;
              if (fieldA > fieldB) return depositSortOrder === 'asc' ? 1 : -1;
              return 0;
            });

            // Paginate (20 entries per page)
            const pageSize = 20;
            const totalPages = Math.max(1, Math.ceil(sortedDeposits.length / pageSize));
            const paginatedDeposits = sortedDeposits.slice((depositCurrentPage - 1) * pageSize, depositCurrentPage * pageSize);

            const handleHeaderClick = (field) => {
              if (depositSortField === field) {
                setDepositSortOrder(p => p === 'asc' ? 'desc' : 'asc');
              } else {
                setDepositSortField(field);
                setDepositSortOrder('desc');
              }
            };

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.25s ease' }} className="card-premium">
                
                {/* Header Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>USDT On-chain Deposit Request Pool</h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#8b92a8' }}>Displays both automated on-chain deposits and history</p>
                  </div>
                  <button onClick={handleExportDepositsCSV} className="btn-premium-secondary" style={{ padding: '8px 14px', fontSize: '12px' }}>
                    📥 Export CSV
                  </button>
                </div>

                {/* Filters Row */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', background: '#0a0c12', borderRadius: '12px', padding: '12px' }}>
                  <input
                    type="text"
                    value={depositSearchQuery}
                    onChange={e => { setDepositSearchQuery(e.target.value); setDepositCurrentPage(1); }}
                    className="input-premium"
                    placeholder="🔍 Search by username, reference TxID..."
                    style={{ flex: 2, minWidth: '220px' }}
                  />
                  <select
                    value={depositFilterStatus}
                    onChange={e => { setDepositFilterStatus(e.target.value); setDepositCurrentPage(1); }}
                    className="select-premium"
                    style={{ flex: 1, minWidth: '150px' }}
                  >
                    <option value="all">🌐 All Statuses</option>
                    <option value="pending">⏳ Pending Only</option>
                    <option value="completed">✓ Completed (Approved)</option>
                    <option value="failed">✗ Failed (Rejected)</option>
                  </select>
                </div>

                {/* Table Layout */}
                <div style={{ overflowX: 'auto' }}>
                  <table className="table-premium">
                    <thead>
                      <tr>
                        <th style={{ cursor: 'pointer' }} onClick={() => handleHeaderClick('id')}># {depositSortField === 'id' ? (depositSortOrder === 'asc' ? '▲' : '▼') : ''}</th>
                        <th style={{ cursor: 'pointer' }} onClick={() => handleHeaderClick('username')}>User {depositSortField === 'username' ? (depositSortOrder === 'asc' ? '▲' : '▼') : ''}</th>
                        <th style={{ cursor: 'pointer' }} onClick={() => handleHeaderClick('amountUSD')}>Amount (USD) {depositSortField === 'amountUSD' ? (depositSortOrder === 'asc' ? '▲' : '▼') : ''}</th>
                        <th>Amount (ETB)</th>
                        <th>Network Method</th>
                        <th style={{ cursor: 'pointer' }} onClick={() => handleHeaderClick('createdAt')}>Date & Time {depositSortField === 'createdAt' ? (depositSortOrder === 'asc' ? '▲' : '▼') : ''}</th>
                        <th style={{ cursor: 'pointer' }} onClick={() => handleHeaderClick('status')}>Status {depositSortField === 'status' ? (depositSortOrder === 'asc' ? '▲' : '▼') : ''}</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedDeposits.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#4e5567' }}>
                            No deposit transactions matching criteria
                          </td>
                        </tr>
                      ) : paginatedDeposits.map((req, idx) => {
                        const globalIndex = (depositCurrentPage - 1) * pageSize + idx + 1;
                        return (
                          <tr
                            key={req._id}
                            onClick={() => setSelectedDepositDetailId(req._id)}
                            className="table-row-clickable"
                          >
                            <td style={{ fontWeight: 600 }}>{globalIndex}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0, 212, 160, 0.1)', color: '#00d4a0',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700
                                }}>
                                  {(req.username || 'U').charAt(0).toUpperCase()}
                                </div>
                                <span style={{ fontWeight: 600 }}>@{req.username}</span>
                              </div>
                            </td>
                            <td style={{ color: '#00d4a0', fontWeight: 700 }}>${(req.amountUSD ?? req.amountUsd ?? 0).toFixed(2)}</td>
                            <td style={{ color: '#8b92a8' }}>{Math.round(req.amountUSD * rate).toLocaleString()} ETB</td>
                            <td>
                              <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                {req.walletType?.toUpperCase() || 'USDT'}
                              </span>
                            </td>
                            <td style={{ color: '#8b92a8', fontSize: '13px' }}>
                              {new Date(req.createdAt).toLocaleString()}
                            </td>
                            <td>
                              <StatusBadge status={req.status} />
                            </td>
                            <td onClick={e => e.stopPropagation()}>
                              {req.status === 'pending' ? (
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button onClick={() => handleApproveDeposit(req._id)} className="btn-premium-primary" style={{ padding: '6px 12px', fontSize: '11px' }}>
                                    ✓ Approve
                                  </button>
                                  <button onClick={() => handleRejectDeposit(req._id)} className="btn-premium-danger" style={{ padding: '6px 12px', fontSize: '11px' }}>
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <button onClick={() => setSelectedDepositDetailId(req._id)} className="btn-premium-ghost" style={{ padding: '6px 10px', fontSize: '11px' }}>
                                  View Details
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination bottom */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                  <span style={{ fontSize: '13px', color: '#8b92a8' }}>
                    Showing {Math.min(sortedDeposits.length, (depositCurrentPage - 1) * pageSize + 1)}–{Math.min(sortedDeposits.length, depositCurrentPage * pageSize)} of {sortedDeposits.length}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      disabled={depositCurrentPage === 1}
                      onClick={() => setDepositCurrentPage(p => p - 1)}
                      className="btn-premium-ghost"
                      style={{ padding: '6px 14px' }}
                    >
                      ← Prev
                    </button>
                    <button
                      disabled={depositCurrentPage === totalPages}
                      onClick={() => setDepositCurrentPage(p => p + 1)}
                      className="btn-premium-ghost"
                      style={{ padding: '6px 14px' }}
                    >
                      Next →
                    </button>
                  </div>
                </div>

              </div>
            );
          })()}

          {/* ════ WITHDRAWALS REDESIGNED UNIFIED TABLE PAGE ════ */}
          {activeTab === 'withdrawals' && (() => {
            const filteredWithdrawals = (allWithdrawalReqs || []).filter(req => {
              const matchesSearch = !withdrawSearchQuery || 
                req.username?.toLowerCase().includes(withdrawSearchQuery.toLowerCase()) ||
                req.destinationAddress?.toLowerCase().includes(withdrawSearchQuery.toLowerCase()) ||
                req._id?.toString().toLowerCase().includes(withdrawSearchQuery.toLowerCase());
              
              const statusMap = {
                completed: 'approved',
                pending: 'pending',
                failed: 'rejected',
                cancelled: 'cancelled'
              };
              const targetStatus = statusMap[withdrawFilterStatus];
              const matchesStatus = withdrawFilterStatus === 'all' || req.status === targetStatus;

              return matchesSearch && matchesStatus;
            });

            const sortedWithdrawals = [...filteredWithdrawals].sort((a, b) => {
              let fieldA = a[withdrawSortField] || '';
              let fieldB = b[withdrawSortField] || '';
              if (typeof fieldA === 'string') fieldA = fieldA.toLowerCase();
              if (typeof fieldB === 'string') fieldB = fieldB.toLowerCase();
              
              if (fieldA < fieldB) return withdrawSortOrder === 'asc' ? -1 : 1;
              if (fieldA > fieldB) return withdrawSortOrder === 'asc' ? 1 : -1;
              return 0;
            });

            const pageSize = 20;
            const totalPages = Math.max(1, Math.ceil(sortedWithdrawals.length / pageSize));
            const paginatedWithdrawals = sortedWithdrawals.slice((withdrawCurrentPage - 1) * pageSize, withdrawCurrentPage * pageSize);

            const handleHeaderClick = (field) => {
              if (withdrawSortField === field) {
                setWithdrawSortOrder(p => p === 'asc' ? 'desc' : 'asc');
              } else {
                setWithdrawSortField(field);
                setWithdrawSortOrder('desc');
              }
            };

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.25s ease' }} className="card-premium">
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>USDT On-chain Withdrawal Requests Pool</h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#8b92a8' }}>Displays pending releases, completed transfers, and rejections</p>
                  </div>
                  <button onClick={handleExportWithdrawalsCSV} className="btn-premium-secondary" style={{ padding: '8px 14px', fontSize: '12px' }}>
                    📥 Export CSV
                  </button>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', background: '#0a0c12', borderRadius: '12px', padding: '12px' }}>
                  <input
                    type="text"
                    value={withdrawSearchQuery}
                    onChange={e => { setWithdrawSearchQuery(e.target.value); setWithdrawCurrentPage(1); }}
                    className="input-premium"
                    placeholder="🔍 Search by username, destination account..."
                    style={{ flex: 2, minWidth: '220px' }}
                  />
                  <select
                    value={withdrawFilterStatus}
                    onChange={e => { setWithdrawFilterStatus(e.target.value); setWithdrawCurrentPage(1); }}
                    className="select-premium"
                    style={{ flex: 1, minWidth: '150px' }}
                  >
                    <option value="all">🌐 All Statuses</option>
                    <option value="pending">⏳ Pending Only</option>
                    <option value="completed">✓ Completed (Approved)</option>
                    <option value="failed">✗ Failed (Rejected)</option>
                  </select>
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table className="table-premium">
                    <thead>
                      <tr>
                        <th style={{ cursor: 'pointer' }} onClick={() => handleHeaderClick('id')}># {withdrawSortField === 'id' ? (withdrawSortOrder === 'asc' ? '▲' : '▼') : ''}</th>
                        <th style={{ cursor: 'pointer' }} onClick={() => handleHeaderClick('username')}>User {withdrawSortField === 'username' ? (withdrawSortOrder === 'asc' ? '▲' : '▼') : ''}</th>
                        <th style={{ cursor: 'pointer' }} onClick={() => handleHeaderClick('amountUSD')}>Amount (USD) {withdrawSortField === 'amountUSD' ? (withdrawSortOrder === 'asc' ? '▲' : '▼') : ''}</th>
                        <th>Amount (ETB)</th>
                        <th>Destination Wallet</th>
                        <th style={{ cursor: 'pointer' }} onClick={() => handleHeaderClick('createdAt')}>Date & Time {withdrawSortField === 'createdAt' ? (withdrawSortOrder === 'asc' ? '▲' : '▼') : ''}</th>
                        <th style={{ cursor: 'pointer' }} onClick={() => handleHeaderClick('status')}>Status {withdrawSortField === 'status' ? (withdrawSortOrder === 'asc' ? '▲' : '▼') : ''}</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedWithdrawals.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#4e5567' }}>
                            No withdrawal transactions matching criteria
                          </td>
                        </tr>
                      ) : paginatedWithdrawals.map((req, idx) => {
                        const globalIndex = (withdrawCurrentPage - 1) * pageSize + idx + 1;
                        return (
                          <tr
                            key={req._id}
                            onClick={() => setSelectedWithdrawDetailId(req._id)}
                            className="table-row-clickable"
                          >
                            <td style={{ fontWeight: 600 }}>{globalIndex}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0, 212, 160, 0.1)', color: '#00d4a0',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700
                                }}>
                                  {(req.username || 'U').charAt(0).toUpperCase()}
                                </div>
                                <span style={{ fontWeight: 600 }}>@{req.username}</span>
                              </div>
                            </td>
                            <td style={{ color: '#00d4a0', fontWeight: 700 }}>${(req.amountUSD ?? req.amountUsd ?? 0).toFixed(2)}</td>
                            <td style={{ color: '#8b92a8' }}>{Math.round(req.amountUSD * rate).toLocaleString()} ETB</td>
                            <td>
                              <span style={{ fontSize: '11px', fontFamily: 'monospace', background: 'rgba(255,255,255,0.03)', padding: '4px 8px', borderRadius: '6px', color: '#00d4a0' }}>
                                {req.destinationAddress ? `${req.destinationAddress.substring(0, 8)}...${req.destinationAddress.substring(req.destinationAddress.length - 8)}` : 'N/A'}
                              </span>
                            </td>
                            <td style={{ color: '#8b92a8', fontSize: '13px' }}>
                              {new Date(req.createdAt).toLocaleString()}
                            </td>
                            <td>
                              <StatusBadge status={req.status} />
                            </td>
                            <td onClick={e => e.stopPropagation()}>
                              {req.status === 'pending' ? (
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button onClick={() => handleWithdrawal(req._id, true)} className="btn-premium-primary" style={{ padding: '6px 12px', fontSize: '11px' }}>
                                    ✓ Approve
                                  </button>
                                  <button onClick={() => handleWithdrawal(req._id, false)} className="btn-premium-danger" style={{ padding: '6px 12px', fontSize: '11px' }}>
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <button onClick={() => setSelectedWithdrawDetailId(req._id)} className="btn-premium-ghost" style={{ padding: '6px 10px', fontSize: '11px' }}>
                                  View Details
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                  <span style={{ fontSize: '13px', color: '#8b92a8' }}>
                    Showing {Math.min(sortedWithdrawals.length, (withdrawCurrentPage - 1) * pageSize + 1)}–{Math.min(sortedWithdrawals.length, withdrawCurrentPage * pageSize)} of {sortedWithdrawals.length}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      disabled={withdrawCurrentPage === 1}
                      onClick={() => setWithdrawCurrentPage(p => p - 1)}
                      className="btn-premium-ghost"
                      style={{ padding: '6px 14px' }}
                    >
                      ← Prev
                    </button>
                    <button
                      disabled={withdrawCurrentPage === totalPages}
                      onClick={() => setWithdrawCurrentPage(p => p + 1)}
                      className="btn-premium-ghost"
                      style={{ padding: '6px 14px' }}
                    >
                      Next →
                    </button>
                  </div>
                </div>

              </div>
            );
          })()}

          {/* ════ KYC SUBMISSIONS AND ID VERIFICATION SCREEN ════ */}
          {activeTab === 'kyc' && (() => {
            const filteredKyc = (allUsersList || []).filter(u => {
              // We want to list users who either have a pending KYC or completed KYC history
              const matchesSearch = !kycSearchQuery || 
                u.username?.toLowerCase().includes(kycSearchQuery.toLowerCase()) ||
                u.fullName?.toLowerCase().includes(kycSearchQuery.toLowerCase()) ||
                u.email?.toLowerCase().includes(kycSearchQuery.toLowerCase());
              
              const matchesStatus = kycFilterStatus === 'all' ||
                (kycFilterStatus === 'pending' && u.kycStatus === 'pending') ||
                (kycFilterStatus === 'approved' && u.kycStatus === 'approved') ||
                (kycFilterStatus === 'rejected' && u.kycStatus === 'rejected');
              
              // Only users who have uploaded something (kycStatus exists and is not none)
              const hasUploaded = u.kycStatus && u.kycStatus !== 'none';
              
              return matchesSearch && matchesStatus && hasUploaded;
            });

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.25s ease' }} className="card-premium">
                
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Identity Verification Center (KYC)</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#8b92a8' }}>Validate user registration forms, check side-by-side uploads, or reset KYC credentials</p>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', background: '#0a0c12', borderRadius: '12px', padding: '12px' }}>
                  <input
                    type="text"
                    value={kycSearchQuery}
                    onChange={e => setKycSearchQuery(e.target.value)}
                    className="input-premium"
                    placeholder="🔍 Search users by username, email, full name..."
                    style={{ flex: 2, minWidth: '220px' }}
                  />
                  <select
                    value={kycFilterStatus}
                    onChange={e => setKycFilterStatus(e.target.value)}
                    className="select-premium"
                    style={{ flex: 1, minWidth: '150px' }}
                  >
                    <option value="all">🌐 All Verification Statuses</option>
                    <option value="pending">⏳ Pending Approval Only</option>
                    <option value="approved">✓ Approved (Verified)</option>
                    <option value="rejected">✗ Rejected Submissions</option>
                  </select>
                </div>

                {/* KYC Submission Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table className="table-premium">
                    <thead>
                      <tr>
                        <th>User Profile</th>
                        <th>Full Name</th>
                        <th>Age</th>
                        <th>Document ID Number</th>
                        <th>Submission Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredKyc.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#4e5567' }}>
                            No identity verification submissions matching criteria
                          </td>
                        </tr>
                      ) : filteredKyc.map(u => (
                        <tr
                          key={u._id}
                          onClick={() => setSelectedKycDetailId(u._id)}
                          className="table-row-clickable"
                        >
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0, 212, 160, 0.1)', color: '#00d4a0',
                                display: 'flex', alignItems: 'center', justifycontent: 'center', fontSize: '12px', fontWeight: 700, paddingLeft: '9px', paddingTop: '3px'
                              }}>
                                {(u.username || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 600 }}>@{u.username}</span>
                                <span style={{ fontSize: '10px', color: '#8b92a8' }}>{u.email || u.phone}</span>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontWeight: 500 }}>{u.kycData?.name || u.fullName || 'Not Specified'}</td>
                          <td style={{ color: '#8b92a8' }}>{u.kycData?.age || 'N/A'}</td>
                          <td>
                            <span style={{ fontSize: '12px', fontFamily: 'monospace', background: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: '6px' }}>
                              {u.kycData?.idNumber || 'ETH-' + u._id.substring(0, 8).toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <StatusBadge status={u.kycStatus} />
                          </td>
                          <td onClick={e => e.stopPropagation()}>
                            <button onClick={() => setSelectedKycDetailId(u._id)} className="btn-premium-ghost" style={{ padding: '6px 12px', fontSize: '12px' }}>
                              Visual Checking →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            );
          })()}

          {/* ════ P2P DISPUTES SCREEN ════ */}
          {activeTab === 'disputes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.25s ease' }} className="card-premium">
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Active Escrow Trade Disputes</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#8b92a8' }}>Mediate blocked escrows: force release funds to buyer or refund seller</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {disputes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#4e5567' }}>
                    ⚖️ All disputes cleared. Excellent platform compliance!
                  </div>
                ) : disputes.map(trade => (
                  <div key={trade._id} style={{ background: '#0a0c12', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#f43f5e' }}>⚖️ Dispute on Trade #{trade._id.substring(0, 8).toUpperCase()}</div>
                        <div style={{ fontSize: '12px', color: '#8b92a8', marginTop: '2px' }}>
                          Seller: <strong>@{trade.sellerUsername}</strong> | Buyer: <strong>@{trade.buyerUsername}</strong>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#00d4a0' }}>${(trade.amountUSD ?? trade.amountUsd ?? 0).toFixed(2)} USD</div>
                        <span style={{ fontSize: '10px', background: 'rgba(244,63,94,0.1)', color: '#f43f5e', padding: '2px 6px', borderRadius: '4px', marginTop: '4px', display: 'inline-block' }}>DISPUTED</span>
                      </div>
                    </div>

                    <div style={{ background: '#111318', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <span style={{ color: '#8b92a8' }}>Fiat Amount:</span>
                        <div style={{ fontWeight: 600, color: '#f0f2f8', marginTop: '2px' }}>{trade.amountETB} ETB</div>
                      </div>
                      <div>
                        <span style={{ color: '#8b92a8' }}>Created:</span>
                        <div style={{ fontWeight: 600, color: '#f0f2f8', marginTop: '2px' }}>{new Date(trade.createdAt).toLocaleString()}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => handleDispute(trade._id, 'release')} className="btn-premium-primary" style={{ flex: 1 }}>
                        ✓ Force Release to Buyer (@{trade.buyerUsername})
                      </button>
                      <button onClick={() => handleDispute(trade._id, 'refund')} className="btn-premium-danger" style={{ flex: 1 }}>
                        ✗ Force Refund to Seller (@{trade.sellerUsername})
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════ SUPPORT TICKETS MEDIATION SCREEN ════ */}
          {activeTab === 'support' && (
            <div style={{ display: 'flex', gap: '20px', minHeight: '520px', animation: 'fadeIn 0.25s ease' }}>
              
              {/* Left Column: Tickets list */}
              <div className="card-premium" style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '16px', flexShrink: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#8b92a8', textTransform: 'uppercase' }}>
                  💬 Support Tickets ({supportTickets.length})
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {supportTickets.length === 0 ? (
                    <div style={{ color: '#4e5567', textAlign: 'center', padding: '20px' }}>No support requests</div>
                  ) : supportTickets.map(t => {
                    const isSelected = selectedTicket?._id === t._id;
                    const hasMessages = t.messages && t.messages.length > 0;
                    const lastMsg = hasMessages ? t.messages[t.messages.length - 1] : null;
                    const isUnreadByAdmin = lastMsg && lastMsg.senderId !== user?.id && lastMsg.senderId !== 'usr_admin' && t.status === 'open';

                    return (
                      <div
                        key={t._id}
                        onClick={() => setSelectedTicket(t)}
                        style={{
                          background: isSelected ? 'rgba(0, 212, 160, 0.08)' : '#0a0c12',
                          border: isSelected ? '1px solid #00d4a0' : '1px solid rgba(255,255,255,0.06)',
                          borderRadius: '10px', padding: '12px', cursor: 'pointer', transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '13px' }}>@{t.username}</span>
                          <span style={{ fontSize: '9px', textTransform: 'uppercase', color: t.status === 'open' ? '#00d4a0' : '#8b92a8', fontWeight: 700 }}>
                            {t.status}
                          </span>
                        </div>
                        {lastMsg && (
                          <div style={{ fontSize: '11px', color: isUnreadByAdmin ? '#00d4a0' : '#8b92a8', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: isUnreadByAdmin ? 700 : 400 }}>
                            {isUnreadByAdmin ? '✉️ ' : ''}{lastMsg.message}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Active Conversation */}
              <div className="card-premium" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {selectedTicket ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                    
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '14px', marginBottom: '14px' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '15px' }}>Support Chat with @{selectedTicket.username}</h4>
                        <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#8b92a8' }}>Ticket Status: <strong style={{ color: '#00d4a0' }}>{selectedTicket.status.toUpperCase()}</strong></p>
                      </div>
                      {selectedTicket.status === 'open' && (
                        <button
                          onClick={async () => {
                            if (!window.confirm("Close this support ticket?")) return;
                            await closeTicket({ id: selectedTicket._id });
                            showAlert("Support ticket closed.");
                          }}
                          className="btn-premium-ghost"
                          style={{ color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)', padding: '6px 12px' }}
                        >
                          Close Ticket
                        </button>
                      )}
                    </div>

                    {/* Messages Body */}
                    <div style={{ flex: 1, overflowY: 'auto', background: '#0a0c12', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '300px' }}>
                      {(!selectedTicket.messages || selectedTicket.messages.length === 0) ? (
                        <div style={{ color: '#4e5567', textAlign: 'center', marginTop: '40px' }}>No messages in this session</div>
                      ) : selectedTicket.messages.map((msg, i) => {
                        const isAdmin = msg.senderId === user?.id || msg.senderId === 'usr_admin';
                        return (
                          <div
                            key={i}
                            style={{
                              alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                              maxWidth: '75%',
                              background: isAdmin ? '#00d4a0' : 'rgba(255,255,255,0.04)',
                              color: isAdmin ? '#0d1117' : '#f0f2f8',
                              padding: '10px 14px',
                              borderRadius: isAdmin ? '12px 12px 0 12px' : '12px 12px 12px 0',
                              border: isAdmin ? 'none' : '1px solid rgba(255,255,255,0.06)'
                            }}
                          >
                            <div style={{ fontSize: '9px', opacity: 0.7, marginBottom: '2px', fontWeight: 700 }}>
                              {isAdmin ? 'EthioSwap Support' : `@${selectedTicket.username}`}
                            </div>
                            <div style={{ fontSize: '13px', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{msg.message}</div>
                            <div style={{ fontSize: '8px', opacity: 0.5, textAlign: 'right', marginTop: '4px' }}>
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Input Composer */}
                    {selectedTicket.status === 'open' ? (
                      <form onSubmit={handleSupportReply} style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                        <input
                          type="text"
                          value={supportReplyText}
                          onChange={e => setSupportReplyText(e.target.value)}
                          className="input-premium"
                          placeholder="Type administrative reply..."
                          style={{ flex: 1 }}
                        />
                        <button type="submit" className="btn-premium-primary">
                          Send Reply
                        </button>
                      </form>
                    ) : (
                      <div style={{ textAlign: 'center', color: '#4e5567', fontSize: '12px', marginTop: '14px', padding: '8px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        🔒 This conversation is closed. Reopen manually if user files follow-up dispute.
                      </div>
                    )}

                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#4e5567', fontSize: '14px' }}>
                    Select a conversation ticket from the list on the left to review chat histories
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ════ INVITE & EARN MANAGEMENT ════ */}
          {activeTab === 'invite' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.25s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>🤝 Invite & Earn Control</h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#8b92a8' }}>Manage referral program and rewards</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                <InviteStatusCard user={user} settings={settings} showAlert={showAlert} />
                <InviteGlobalStatsCard user={user} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                <TopInvitersTable user={user} />
                <InviteSettingsCard settings={settings} updateSettings={updateSettingsMutation} />
              </div>
            </div>
          )}

          {/* ════ MEMBERS DIRECTORY SCREEN (USERS) ════ */}
          {activeTab === 'users' && (() => {
            const filteredUsers = (allUsersList || []).filter(u => {
              const query = userSearchQuery.toLowerCase().trim();
              const matchesSearch = !query || 
                u.username?.toLowerCase().includes(query) ||
                u.email?.toLowerCase().includes(query) ||
                u.phone?.toLowerCase().includes(query) ||
                u.id?.toString().toLowerCase().includes(query);
                
              const isVerified = u.kycStatus === 'approved';
              const matchesKyc = userFilterKyc === 'all' ||
                (userFilterKyc === 'verified' && isVerified) ||
                (userFilterKyc === 'unverified' && !isVerified);
                
              const isBanned = !!u.isSuspended;
              const matchesBan = userFilterBan === 'all' ||
                (userFilterBan === 'banned' && isBanned) ||
                (userFilterBan === 'active' && !isBanned);
                
              return matchesSearch && matchesKyc && matchesBan;
            });

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.25s ease' }} className="card-premium">
                
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>EthioSwap Members Directory</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#8b92a8' }}>Administrative oversight, financial summaries, and account moderation</p>
                </div>

                {/* Filters Row */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', background: '#0a0c12', borderRadius: '12px', padding: '12px' }}>
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={e => setUserSearchQuery(e.target.value)}
                    className="input-premium"
                    placeholder="🔍 Search users by username, email, phone number, ID..."
                    style={{ flex: 2, minWidth: '220px' }}
                  />
                  <select
                    value={userFilterKyc}
                    onChange={e => setUserFilterKyc(e.target.value)}
                    className="select-premium"
                    style={{ flex: 1, minWidth: '150px' }}
                  >
                    <option value="all">🌐 All Verification Statuses</option>
                    <option value="verified">✓ Verified Only</option>
                    <option value="unverified">✗ Unverified Only</option>
                  </select>
                  <select
                    value={userFilterBan}
                    onChange={e => setUserFilterBan(e.target.value)}
                    className="select-premium"
                    style={{ flex: 1, minWidth: '150px' }}
                  >
                    <option value="all">🛡️ All Activity Statuses</option>
                    <option value="active">✅ Active Accounts Only</option>
                    <option value="banned">🚫 Banned / Suspended Accounts</option>
                  </select>
                </div>

                {/* Members Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table className="table-premium">
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th>Email / Contact</th>
                        <th>KYC Status</th>
                        <th>Registration Date</th>
                        <th>USD Balance</th>
                        <th>Acc Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#4e5567' }}>
                            No users registered in this directory matching filters
                          </td>
                        </tr>
                      ) : filteredUsers.map(u => {
                        const isMe = u._id === user?._id;
                        return (
                          <tr
                            key={u._id}
                            onClick={() => {
                              setSelectedUserDetailId(u._id);
                              setUserDrawerTab('profile'); // Reset drawer sub-tabs
                            }}
                            className="table-row-clickable"
                          >
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0, 212, 160, 0.1)', color: '#00d4a0',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700
                              }}>
                                {(u.username || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 600 }}>@{u.username}</span>
                                {u.role === 'admin' && <span style={{ fontSize: '9px', fontWeight: 800, background: 'rgba(240,185,11,0.15)', color: '#F0B90B', padding: '1px 4px', borderRadius: '4px', width: 'fit-content', marginTop: '2px' }}>ADMIN</span>}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '13px' }}>{u.email || 'No email'}</span>
                              <span style={{ fontSize: '11px', color: '#8b92a8' }}>{u.phone}</span>
                            </div>
                          </td>
                          <td>
                            <StatusBadge status={u.kycStatus} />
                          </td>
                          <td style={{ color: '#8b92a8', fontSize: '13px' }}>
                            {new Date(u.joinedAt).toLocaleDateString()}
                          </td>
                          <td style={{ color: '#00d4a0', fontWeight: 700 }}>
                            ${(u.ethBalance || 0).toFixed(2)}
                          </td>
                          <td>
                            {u.isSuspended ? (
                              <span style={{ fontSize: '12px', background: 'rgba(244,63,94,0.1)', color: '#f43f5e', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(244,63,94,0.2)' }}>
                                🚫 BANNED
                              </span>
                            ) : (
                              <span style={{ fontSize: '12px', background: 'rgba(0,212,160,0.1)', color: '#00d4a0', padding: '2px 8px', borderRadius: '4px' }}>
                                Active
                              </span>
                            )}
                          </td>
                          <td onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => {
                                setSelectedUserDetailId(u._id);
                                setUserDrawerTab('profile');
                              }}
                              className="btn-premium-ghost"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                            >
                              Manage User →
                            </button>
                            {!isMe && (
                              <button
                                onClick={async () => {
                                  if (await handleRemoveUser(u._id, u.username)) {
                                    // Refresh or update local state if needed
                                  }
                                }}
                                className="btn-premium-danger"
                                style={{ padding: '6px 10px', fontSize: '12px', background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)' }}
                                title="Permanently Delete Account"
                              >
                                🗑️
                              </button>
                            )}
                          </td>
                        </tr>
                      ); })}
                    </tbody>
                  </table>
                </div>

              </div>
            );
          })()}

          {/* ════ SYSTEM AUDIT LOGS SCREEN ════ */}
          {activeTab === 'logs' && (() => {
            const filteredLogs = auditLogs.filter(log => {
              const query = logsSearchQuery.toLowerCase().trim();
              return !query || 
                log.adminUsername?.toLowerCase().includes(query) ||
                log.action?.toLowerCase().includes(query) ||
                log.targetName?.toLowerCase().includes(query) ||
                log.details?.toLowerCase().includes(query);
            });

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.25s ease' }} className="card-premium">
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>System Administrative Audit Logs</h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#8b92a8' }}>Real-time logs of administrative moderation operations</p>
                  </div>
                  <span className="pill-badge" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#8b92a8' }}>
                    {filteredLogs.length} events logged
                  </span>
                </div>

                {/* Filter */}
                <input
                  type="text"
                  value={logsSearchQuery}
                  onChange={e => setLogsSearchQuery(e.target.value)}
                  className="input-premium"
                  placeholder="🔍 Filter audit logs by administrator, action, target username, description..."
                />

                <div style={{ overflowX: 'auto' }}>
                  <table className="table-premium">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Admin Account</th>
                        <th>Action Performed</th>
                        <th>Target Member</th>
                        <th>Moderation Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#4e5567' }}>
                            No administrative audit records logged yet
                          </td>
                        </tr>
                      ) : filteredLogs.map(log => {
                        let tagBg = 'rgba(255,255,255,0.04)';
                        let tagColor = '#8b92a8';
                        const act = log.action?.toLowerCase();
                        if (act.includes('approve') || act.includes('unban') || act.includes('unsuspend')) {
                          tagBg = 'rgba(0, 212, 160, 0.1)'; tagColor = '#00d4a0';
                        } else if (act.includes('reject') || act.includes('ban') || act.includes('suspend') || act.includes('remove')) {
                          tagBg = 'rgba(244, 63, 94, 0.1)'; tagColor = '#f43f5e';
                        } else if (act.includes('warn')) {
                          tagBg = 'rgba(251, 191, 36, 0.1)'; tagColor = '#fbbf24';
                        }

                        return (
                          <tr key={log._id}>
                            <td style={{ color: '#8b92a8', fontSize: '13px', whiteSpace: 'nowrap' }}>
                              {new Date(log.createdAt).toLocaleString()}
                            </td>
                            <td style={{ fontWeight: 600 }}>@{log.adminUsername}</td>
                            <td>
                              <span style={{
                                padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700,
                                textTransform: 'uppercase', backgroundColor: tagBg, color: tagColor
                              }}>
                                {log.action?.replace('_', ' ')}
                              </span>
                            </td>
                            <td style={{ fontWeight: 600, color: '#00d4a0' }}>@{log.targetName}</td>
                            <td style={{ color: '#8b92a8', minWidth: '200px' }}>{log.details}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>
            );
          })()}

          {/* ════ REVIEWS MANAGEMENT PAGE per Item #12 ════ */}
          {activeTab === 'reviews' && (() => {
            const filteredReviews = allReviews.filter(r => {
              if (reviewFilterStatus === 'pending') return !r.isApproved;
              if (reviewFilterStatus === 'approved') return r.isApproved;
              return true;
            });

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.25s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>⭐ Review Management</h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#8b92a8' }}>Moderate verified trader reviews for the landing page</p>
                  </div>
                </div>

                <div className="card-premium">
                  <div style={{ display: 'flex', background: '#0a0c12', borderRadius: '12px', padding: '4px', width: 'fit-content', gap: '4px', marginBottom: '24px' }}>
                    {[{id:'all',l:'All'},{id:'pending',l:'Pending'},{id:'approved',l:'Approved'}].map(s => (
                      <button
                        key={s.id}
                        onClick={() => setReviewFilterStatus(s.id)}
                        style={{
                          padding: '8px 20px',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: 'var(--font)',
                          fontSize: '12px',
                          fontWeight: 700,
                          background: reviewFilterStatus === s.id ? 'var(--gold)' : 'transparent',
                          color: reviewFilterStatus === s.id ? '#0d1117' : '#8b92a8',
                          minWidth: '100px',
                          transition: 'all 0.2s'
                        }}
                      >
                        {s.l}
                      </button>
                    ))}
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="table-premium">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>User</th>
                          <th>Rating</th>
                          <th>Review Text</th>
                          <th>Date</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReviews.length === 0 ? (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#4e5567' }}>No reviews found</td>
                          </tr>
                        ) : filteredReviews.map((rev, idx) => (
                          <tr key={rev._id} className="table-row-clickable" onClick={() => setSelectedUserDetailId(rev.userId)}>
                            <td style={{ fontWeight: 600 }}>{idx + 1}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  width: '28px', height: '28px', borderRadius: '50%', background: 'var(--gold)', color: '#000',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800
                                }}>
                                  {(rev.username || 'U').charAt(0).toUpperCase()}
                                </div>
                                <span style={{ fontWeight: 600 }}>@{rev.username}</span>
                              </div>
                            </td>
                            <td style={{ color: 'var(--gold)', letterSpacing: '2px' }}>
                              {(() => {
                                const rating = Math.max(0, Math.min(5, Math.round(Number(rev.rating) || 5)));
                                return '★'.repeat(rating) + '☆'.repeat(5 - rating);
                              })()}
                            </td>
                            <td style={{ maxWidth: '300px', fontSize: '13px', fontStyle: 'italic', color: 'var(--text-1)' }}>
                              "{rev.content}"
                            </td>
                            <td style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                              {(() => {
                                const dateVal = rev.createdAt || rev.created_at || rev._creationTime;
                                if (!dateVal) return 'N/A';
                                const d = new Date(dateVal);
                                return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
                              })()}
                            </td>
                            <td>
                              <StatusBadge status={rev.isApproved ? 'approved' : 'pending'} />
                            </td>
                            <td onClick={e => e.stopPropagation()}>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                {!rev.isApproved && (
                                  <button 
                                    onClick={() => handleApproveReview(rev._id)} 
                                    className="btn-premium-primary" 
                                    style={{ padding: '6px 12px', fontSize: '11px', background: '#00d4a0', color: '#000' }}
                                  >
                                    ✓ Approve
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleRejectReview(rev._id)} 
                                  className="btn-premium-danger" 
                                  style={{ padding: '6px 12px', fontSize: '11px' }}
                                >
                                  ✗ Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ════ CONFIGURATION / SYSTEM SETTINGS SCREEN ════ */}
          {activeTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.25s ease' }} className="card-premium">
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>System Configuration Settings</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#8b92a8' }}>Configure trading fees, platform percentages, and reward systems</p>
              </div>

              <form onSubmit={handleSaveSettings} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', maxWidth: '900px' }}>
                {/* Column 1: Exchange & Fees */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#00d4a0', textTransform: 'uppercase' }}>💱 Exchange Rates & Commissions</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#8b92a8' }}>Buying Rate ($1 ETB)</label>
                    <input type="number" step="0.01" className="input-premium" value={etbRate} onChange={e => setEtbRate(e.target.value)} required />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#8b92a8' }}>Selling Rate ($1 ETB)</label>
                    <input type="number" step="0.01" className="input-premium" value={etbRateSell} onChange={e => setEtbRateSell(e.target.value)} required />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#8b92a8' }}>Escrow Fee (%)</label>
                    <input type="number" step="0.01" className="input-premium" value={commissionValue} onChange={e => setCommissionValue(e.target.value)} required />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#8b92a8' }}>Deposit Fee (%)</label>
                    <input type="number" step="0.01" className="input-premium" value={depositFee} onChange={e => setDepositFee(e.target.value)} required />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#8b92a8' }}>Withdrawal Fee (%)</label>
                    <input type="number" step="0.01" className="input-premium" value={withdrawFee} onChange={e => setWithdrawFee(e.target.value)} required />
                  </div>
                </div>

                {/* Column 2: Limits & Rewards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#f5c518', textTransform: 'uppercase' }}>🎁 Limits & Reward Settings</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#8b92a8' }}>Min Deposit ($)</label>
                      <input type="number" className="input-premium" value={minDeposit} onChange={e => setMinDeposit(e.target.value)} required />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#8b92a8' }}>Min Withdraw ($)</label>
                      <input type="number" className="input-premium" value={minWithdraw} onChange={e => setMinWithdraw(e.target.value)} required />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#8b92a8' }}>Max Daily Withdraw ($)</label>
                    <input type="number" className="input-premium" value={maxDailyWithdraw} onChange={e => setMaxDailyWithdraw(e.target.value)} required />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#8b92a8' }}>Points per Trade</label>
                    <input type="number" className="input-premium" value={pointsPerTrade} onChange={e => setPointsPerTrade(e.target.value)} required />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#8b92a8' }}>Referral Points</label>
                    <input type="number" className="input-premium" value={referralPoints} onChange={e => setReferralPoints(e.target.value)} required />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                    <input type="checkbox" checked={isLeaderboard} onChange={e => setIsLeaderboard(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#00d4a0' }} />
                    <label style={{ fontSize: '13px', fontWeight: 600 }}>Enable Monthly Leaderboard</label>
                  </div>
                </div>

                <button type="submit" disabled={savingSettings} className="btn-premium-primary" style={{ gridColumn: 'span 2', padding: '16px', fontSize: '15px' }}>
                  {savingSettings ? '⏳ Saving System Configuration...' : '💾 Commit System Changes'}
                </button>
              </form>
            </div>
          )}
        </div>

      {/* ══════════════════════════════════════════════════════════
         SLIDE-OVER DRAWER OVERLAYS (RIGHT SIDE PANELS)
         ══════════════════════════════════════════════════════════ */}

      {/* ── 1. DEPOSIT REQUEST DETAILS DRAWER ── */}
      {selectedDepositDetailId && (() => {
        const req = allDepositReqs?.find(r => r._id === selectedDepositDetailId);
        if (!req) return null;
        return (
          <>
            <div className="drawer-backdrop" onClick={() => setSelectedDepositDetailId(null)} />
            <div className="drawer-content">
              {/* Header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>📥 Deposit Request Details</h3>
                  <span style={{ fontSize: '11px', color: '#8b92a8' }}>ID: {req._id}</span>
                </div>
                <button onClick={() => setSelectedDepositDetailId(null)} className="btn-premium-ghost" style={{ padding: '6px' }}>✕</button>
              </div>

              {/* Scrollable details */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: '#0a0c12', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,212,160,0.1)', color: '#00d4a0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700
                  }}>
                    {(req.username || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>@{req.username}</div>
                    <span style={{ fontSize: '11px', color: '#8b92a8' }}>Depositor Account</span>
                  </div>
                </div>

                <div className="card-premium" style={{ background: '#0a0c12', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#8b92a8' }}>Amount (USD):</span>
                    <strong style={{ color: '#00d4a0' }}>${(req.amountUSD ?? req.amountUsd ?? 0).toFixed(2)} USD</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#8b92a8' }}>Amount (ETB value):</span>
                    <strong style={{ color: '#f0f2f8' }}>{Math.round(req.amountUSD * rate).toLocaleString()} ETB</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#8b92a8' }}>Deposit Method:</span>
                    <strong style={{ color: '#f0f2f8' }}>{req.walletType?.toUpperCase()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#8b92a8' }}>TxID / Reference:</span>
                    <strong style={{ color: '#00d4a0', fontFamily: 'monospace' }}>{req.senderReference || 'No hash reference'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#8b92a8' }}>Submitted at:</span>
                    <span style={{ color: '#8b92a8' }}>{new Date(req.createdAt).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#8b92a8' }}>Transaction Status:</span>
                    <StatusBadge status={req.status} />
                  </div>
                </div>

                {/* Proof screenshot */}
                {req.hasScreenshot && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#8b92a8' }}>Uploaded Receipt Proof Image:</div>
                    <DepositScreenshot requestId={req._id} getImageUrl={getImageUrl} onImageClick={setActiveLightboxImage} />
                  </div>
                )}
              </div>

              {/* Approve/Reject footer if pending */}
              {req.status === 'pending' && (
                <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: '10px' }}>
                  <button onClick={() => handleApproveDeposit(req._id)} className="btn-premium-primary" style={{ flex: 1 }}>
                    ✓ Approve & Credit Funds
                  </button>
                  <button onClick={() => handleRejectDeposit(req._id)} className="btn-premium-danger" style={{ flex: 1 }}>
                    Reject
                  </button>
                </div>
              )}
            </div>
          </>
        );
      })()}

      {/* ── 2. WITHDRAWAL REQUEST DETAILS DRAWER ── */}
      {selectedWithdrawDetailId && (() => {
        const req = allWithdrawalReqs?.find(r => r._id === selectedWithdrawDetailId);
        if (!req) return null;
        return (
          <>
            <div className="drawer-backdrop" onClick={() => setSelectedWithdrawDetailId(null)} />
            <div className="drawer-content">
              {/* Header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>📤 Withdrawal Request Details</h3>
                  <span style={{ fontSize: '11px', color: '#8b92a8' }}>ID: {req._id}</span>
                </div>
                <button onClick={() => setSelectedWithdrawDetailId(null)} className="btn-premium-ghost" style={{ padding: '6px' }}>✕</button>
              </div>

              {/* Scrollable details */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: '#0a0c12', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,212,160,0.1)', color: '#00d4a0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700
                  }}>
                    {(req.username || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>@{req.username}</div>
                    <span style={{ fontSize: '11px', color: '#8b92a8' }}>Requester Member</span>
                  </div>
                </div>

                <div className="card-premium" style={{ background: '#0a0c12', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#8b92a8' }}>Amount (USD):</span>
                    <strong style={{ color: '#f43f5e' }}>-${(req.amountUSD ?? req.amountUsd ?? 0).toFixed(2)} USD</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#8b92a8' }}>Amount (ETB value):</span>
                    <strong style={{ color: '#f0f2f8' }}>{Math.round(req.amountUSD * rate).toLocaleString()} ETB</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#8b92a8' }}>Withdraw Network:</span>
                    <strong style={{ color: '#f0f2f8' }}>{req.walletType?.toUpperCase() || 'USDT'}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}>
                    <span style={{ color: '#8b92a8' }}>Destination Address:</span>
                    <span style={{ color: '#00d4a0', fontFamily: 'monospace', background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', wordBreak: 'break-all', display: 'block', marginTop: '4px' }}>
                      {req.destinationAddress || 'N/A'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#8b92a8' }}>Submitted at:</span>
                    <span style={{ color: '#8b92a8' }}>{new Date(req.createdAt).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#8b92a8' }}>Transaction Status:</span>
                    <StatusBadge status={req.status} />
                  </div>
                </div>
              </div>

              {/* Approve/Reject footer if pending */}
              {req.status === 'pending' && (
                <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: '10px' }}>
                  <button onClick={() => handleWithdrawal(req._id, true)} className="btn-premium-primary" style={{ flex: 1 }}>
                    ✓ Approve & Process
                  </button>
                  <button onClick={() => handleWithdrawal(req._id, false)} className="btn-premium-danger" style={{ flex: 1 }}>
                    Reject
                  </button>
                </div>
              )}
            </div>
          </>
        );
      })()}

      {/* ── 3. KYC SUBMISSIONS DETAILS DRAWER ── */}
      {selectedKycDetailId && (() => {
        const u = allUsersList?.find(userRecord => userRecord._id === selectedKycDetailId);
        if (!u) return null;
        return (
          <>
            <div className="drawer-backdrop" onClick={() => setSelectedKycDetailId(null)} />
            <div className="drawer-content">
              {/* Header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>🛡️ KYC Document Checking</h3>
                  <span style={{ fontSize: '11px', color: '#8b92a8' }}>User Account ID: {u._id}</span>
                </div>
                <button onClick={() => setSelectedKycDetailId(null)} className="btn-premium-ghost" style={{ padding: '6px' }}>✕</button>
              </div>

              {/* Scrollable container */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Visual side-by-side comparison */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#00d4a0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>📁 Uploaded Verification Documents</div>
                  <KycImages 
                    userId={u._id} 
                    getImageUrl={getImageUrl} 
                    onImageClick={setActiveLightboxImage} 
                    kycIdFront={u.kycIdFront}
                    kycIdBack={u.kycIdBack}
                    kycSelfie={u.kycSelfie}
                    kycDocument={u.kycDocument}
                  />
                </div>

                {/* Form fields section */}
                <div className="card-premium" style={{ background: '#0a0c12', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#00d4a0', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '6px' }}>
                    📝 Auto-Extracted Registration Fields
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#8b92a8' }}>Full Name:</span>
                    <strong style={{ color: '#f0f2f8' }}>{u.kycData?.name || u.fullName || 'Not Specified'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#8b92a8' }}>Date of Birth / Age:</span>
                    <strong style={{ color: '#f0f2f8' }}>{u.kycData?.age || 'Not Provided'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#8b92a8' }}>Document Type:</span>
                    <strong style={{ color: '#f0f2f8' }}>{u.kycData?.idType || 'ID Card'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#8b92a8' }}>ID Card Number:</span>
                    <strong style={{ color: '#00d4a0', fontFamily: 'monospace' }}>
                      {u.kycData?.idNumber || 'ETH-' + u._id.substring(0, 8).toUpperCase()}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#8b92a8' }}>Join Date:</span>
                    <span style={{ color: '#8b92a8' }}>{new Date(u.joinedAt).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#8b92a8' }}>Submission Status:</span>
                    <StatusBadge status={u.kycStatus} />
                  </div>
                </div>

                {/* Profile contact card */}
                <div className="card-premium" style={{ background: '#0a0c12', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#8b92a8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>📞 Member Profile Contact</div>
                  <div style={{ fontSize: '13px' }}><span style={{ color: '#8b92a8' }}>Email:</span> <span style={{ color: '#f0f2f8', fontWeight: 600 }}>{u.email || 'N/A'}</span></div>
                  <div style={{ fontSize: '13px' }}><span style={{ color: '#8b92a8' }}>Phone:</span> <span style={{ color: '#f0f2f8', fontWeight: 600 }}>{u.phone}</span></div>
                </div>

                {/* Administrative Actions toolbar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#8b92a8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🛠️ Direct Moderation Commands</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setMessageComposerUserId(u._id);
                        setMessageComposerUsername(u.username);
                      }}
                      className="btn-premium-ghost"
                      style={{ border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      💬 Send Message
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUserDetailId(u._id);
                        setSelectedKycDetailId(null);
                        setUserDrawerTab('activity');
                      }}
                      className="btn-premium-ghost"
                      style={{ border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      ⚠️ Warn User
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      onClick={() => handleToggleSuspend(u._id, !!u.isSuspended)}
                      className="btn-premium-ghost"
                      style={{ border: '1px solid rgba(255,255,255,0.07)', color: u.isSuspended ? '#00d4a0' : '#f43f5e' }}
                    >
                      {u.isSuspended ? '✅ Unban User' : '🚫 Ban User'}
                    </button>
                    <button
                      onClick={async () => {
                        if (await handleRemoveUser(u._id, u.username)) {
                          setSelectedKycDetailId(null);
                        }
                      }}
                      className="btn-premium-ghost"
                      style={{ border: '1px solid rgba(255,255,255,0.07)', color: '#f43f5e' }}
                    >
                      🗑️ Remove User
                    </button>
                  </div>
                </div>

              </div>

              {/* KYC Decisions Toolbar */}
              <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => handleKYC(u._id, true)} className="btn-premium-primary" style={{ flex: 1 }}>
                    ✓ Approve KYC
                  </button>
                  <button onClick={() => handleKYC(u._id, false)} className="btn-premium-danger" style={{ flex: 1 }}>
                    ✗ Reject KYC
                  </button>
                </div>
                <button
                  onClick={() => setResubmitUserId(u._id)}
                  className="btn-premium-warning"
                  style={{ width: '100%' }}
                >
                  ⚠ Request Resubmission
                </button>
              </div>

            </div>
          </>
        );
      })()}

      {/* ── 4. COMPLETE USER DIRECTORY & MODERATION DRAWER ── */}
      {selectedUserDetailId && (() => {
        const u = allUsersList?.find(userRecord => userRecord._id === selectedUserDetailId);
        if (!u) return null;

        const isMe = u._id === user?._id;
        const totalBal = (u.ethBalance || 0) + (u.ethLocked || 0);
        const etbVal = totalBal * rate;

        // Dynamic Calculations
        const uDeposits = (allDepositReqs || []).filter(r => (r.userId === u._id || r.username === u.username) && r.status === 'approved');
        const uWithdrawals = (allWithdrawalReqs || []).filter(r => (r.userId === u._id || r.username === u.username) && r.status === 'approved');
        const sumDeposits = uDeposits.reduce((s, r) => s + r.amountUSD, 0);
        const sumWithdrawals = uWithdrawals.reduce((s, r) => s + r.amountUSD, 0);

        return (
          <>
            <div className="drawer-backdrop" onClick={() => setSelectedUserDetailId(null)} />
            <div className="drawer-content" style={{ 
              width: width < 768 ? '100%' : '520px',
              height: '100vh',
              right: 0,
              top: 0,
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box'
            }}>
              
              {/* Header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>👤 Member Profile Administration</h3>
                  <span style={{ fontSize: '11px', color: '#8b92a8' }}>Join Date: {new Date(u.joinedAt).toLocaleDateString()}</span>
                </div>
                <button onClick={() => setSelectedUserDetailId(null)} className="btn-premium-ghost" style={{ padding: '6px' }}>✕</button>
              </div>

              {/* Sub tabs inside drawer */}
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#0a0c12', padding: '2px', flexShrink: 0, overflowX: 'auto' }}>
                {[
                  { id: 'profile', l: 'Profile Summary' },
                  { id: 'transactions', l: 'Transactions' },
                  { id: 'kyc', l: 'KYC Document' },
                  { id: 'invites', l: 'Invites' },
                  { id: 'activity', l: 'Actions / Warnings' }
                ].map(tb => (
                  <button
                    key={tb.id}
                    onClick={() => setUserDrawerTab(tb.id)}
                    style={{
                      flex: 1, padding: '10px 8px', border: 'none', background: 'transparent',
                      color: userDrawerTab === tb.id ? '#00d4a0' : '#8b92a8',
                      fontSize: '11px', fontWeight: userDrawerTab === tb.id ? 700 : 500,
                      cursor: 'pointer', borderBottom: userDrawerTab === tb.id ? '2px solid #00d4a0' : '2px solid transparent',
                      transition: 'all 0.15s ease', whiteSpace: 'nowrap'
                    }}
                  >
                    {tb.l}
                  </button>
                ))}
              </div>

              {/* Scrollable details */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* ── TAB 1: Profile Summary ── */}
                {userDrawerTab === 'profile' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#0a0c12', borderRadius: '12px', padding: '16px' }}>
                      <div style={{
                        width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(0, 212, 160, 0.1)', color: '#00d4a0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, overflow: 'hidden', flexShrink: 0
                      }}>
                        {u.kycSelfie && u.kycSelfie.startsWith('http') ? (
                          <img src={u.kycSelfie} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          (u.username || 'U').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{u.username}</span>
                          {u.gender && <span style={{ fontSize: '9px', fontWeight: 700, background: 'rgba(0,212,160,0.1)', color: '#00d4a0', padding: '2px 6px', borderRadius: '4px' }}>{u.gender}</span>}
                          {u.isSuspended && <span style={{ fontSize: '9px', fontWeight: 800, background: 'rgba(244,63,94,0.15)', color: '#f43f5e', padding: '2px 6px', borderRadius: '4px' }}>BANNED</span>}
                        </div>
                        <span style={{ fontSize: '11px', color: '#8b92a8', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>Ref: {u._id}</span>
                      </div>
                    </div>

                    {/* Financial Summary */}
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#8b92a8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>💳 Account Financial Balance Summary</div>
                      <div style={{ display: 'grid', gridTemplateColumns: width < 480 ? '1fr' : '1fr 1fr', gap: '10px' }}>
                        <div style={{ background: '#0a0c12', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ fontSize: '10px', color: '#8b92a8', textTransform: 'uppercase' }}>Available USD</div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: '#00d4a0', marginTop: '2px' }}>${(u.ethBalance || 0).toFixed(2)}</div>
                        </div>
                        <div style={{ background: '#0a0c12', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ fontSize: '10px', color: '#8b92a8', textTransform: 'uppercase' }}>Locked Escrow</div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: '#fbbf24', marginTop: '2px' }}>${(u.ethLocked || 0).toFixed(2)}</div>
                        </div>
                        <div style={{ background: '#0a0c12', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ fontSize: '10px', color: '#8b92a8', textTransform: 'uppercase' }}>Total Deposited</div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: '#00d4a0', marginTop: '2px' }}>${sumDeposits.toFixed(2)}</div>
                        </div>
                        <div style={{ background: '#0a0c12', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ fontSize: '10px', color: '#8b92a8', textTransform: 'uppercase' }}>Total Withdrawn</div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: '#f43f5e', marginTop: '2px' }}>${sumWithdrawals.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Member Details */}
                    <div className="card-premium" style={{ background: '#0a0c12', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', gap: '12px' }}>
                        <span style={{ color: '#8b92a8', whiteSpace: 'nowrap' }}>Full Name:</span>
                        <span style={{ color: '#f0f2f8', fontWeight: 600, textAlign: 'right' }}>{u.fullName || u.kycData?.name || 'Not specified'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', gap: '12px' }}>
                        <span style={{ color: '#8b92a8', whiteSpace: 'nowrap' }}>Email Address:</span>
                        <span style={{ color: '#f0f2f8', fontWeight: 600, textAlign: 'right', wordBreak: 'break-all' }}>{u.email || 'Not specified'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', gap: '12px' }}>
                        <span style={{ color: '#8b92a8', whiteSpace: 'nowrap' }}>Phone Contact:</span>
                        <span style={{ color: '#f0f2f8', fontWeight: 600, textAlign: 'right' }}>{u.phone}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', gap: '12px', alignItems: 'center' }}>
                        <span style={{ color: '#8b92a8', whiteSpace: 'nowrap' }}>KYC Status Badge:</span>
                        <StatusBadge status={u.kycStatus} />
                      </div>
                    </div>

                    {/* Address block */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#8b92a8' }}>On-chain TRC20 / ERC20 wallet address:</span>
                      <div style={{ display: 'flex', gap: '8px', background: '#0a0c12', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '10px', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#00d4a0', wordBreak: 'break-all', flex: 1 }}>{u.ethAddress}</span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(u.ethAddress); showAlert('✓ Address copied!'); }}
                          style={{ border: 'none', background: 'rgba(255,255,255,0.05)', color: '#8b92a8', borderRadius: '4px', cursor: 'pointer', padding: '6px 10px', fontSize: '11px', flexShrink: 0 }}
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── TAB 2: User Transaction History ── */}
                {userDrawerTab === 'transactions' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ fontSize: '11px', color: '#8b92a8', fontWeight: 700, textTransform: 'uppercase' }}>Cumulative Transactions Recorded</div>
                    <div style={{ maxHeight: '420px', overflowY: 'auto', background: '#0a0c12', borderRadius: '12px' }}>
                      {selectedUserTxs.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: '#4e5567', fontSize: '13px' }}>
                          No deposit or withdrawal transactions found for this user.
                        </div>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', color: '#8b92a8' }}>
                              <th style={{ padding: '10px', textAlign: 'left' }}>Date</th>
                              <th style={{ padding: '10px', textAlign: 'left' }}>Type</th>
                              <th style={{ padding: '10px', textAlign: 'right' }}>Amount</th>
                              <th style={{ padding: '10px', textAlign: 'left' }}>Note</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedUserTxs.map(tx => {
                              const isDep = tx.type === 'deposit';
                              return (
                                <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                  <td style={{ padding: '10px', color: '#8b92a8' }}>{new Date(tx.createdAt).toLocaleDateString()}</td>
                                  <td style={{ padding: '10px', fontWeight: 700, color: isDep ? '#00d4a0' : '#f43f5e' }}>
                                    {tx.type?.toUpperCase()}
                                  </td>
                                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: isDep ? '#00d4a0' : '#f43f5e' }}>
                                    {isDep ? '+' : '-'}${(tx.amountUSD ?? tx.amountUsd ?? 0).toFixed(2)}
                                  </td>
                                  <td style={{ padding: '10px', color: '#8b92a8', fontSize: '11px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tx.note}>
                                    {tx.note}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {/* ── TAB 3: KYC Documents Tab ── */}
                {userDrawerTab === 'kyc' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ fontSize: '11px', color: '#8b92a8', fontWeight: 700, textTransform: 'uppercase' }}>Identity Documents Verification Check</div>
                    {u.kycStatus === 'none' ? (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#4e5567', background: '#0a0c12', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.06)' }}>
                        🪪 Identity files have not been uploaded by this user yet.
                      </div>
                    ) : (
                      <>
                        <KycImages 
                          userId={u._id} 
                          getImageUrl={getImageUrl} 
                          onImageClick={setActiveLightboxImage} 
                          kycIdFront={u.kycIdFront}
                          kycIdBack={u.kycIdBack}
                          kycSelfie={u.kycSelfie}
                          kycDocument={u.kycDocument}
                        />
                        <div className="card-premium" style={{ background: '#0a0c12', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: '#8b92a8', fontWeight: 700, textTransform: 'uppercase' }}>Verification fields</span>
                          <div style={{ fontSize: '12px' }}><span style={{ color: '#8b92a8' }}>Document Type:</span> <strong style={{ color: '#f0f2f8' }}>{u.kycData?.idType || 'ID Card'}</strong></div>
                          <div style={{ fontSize: '12px' }}><span style={{ color: '#8b92a8' }}>ID card fields name:</span> <strong style={{ color: '#f0f2f8' }}>{u.kycData?.name || u.fullName || 'Not specified'}</strong></div>
                          <div style={{ fontSize: '12px' }}><span style={{ color: '#8b92a8' }}>ID number fields:</span> <strong style={{ color: '#00d4a0', fontFamily: 'monospace' }}>{u.kycData?.idNumber || 'ETH-' + u._id.substring(0, 8).toUpperCase()}</strong></div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ── TAB: Invites ── */}
                {userDrawerTab === 'invites' && (() => {
                  const [uStats, setUStats] = useState(null);
                  React.useEffect(() => {
                    if (u?._id) {
                      // Mocked for Convex migration
                      setUStats({ totalInvited: 0, activeFriends: 0, pendingFriends: 0, totalEarned: 0, earningsMonth: 0, referralList: [] });
                    }
                  }, [u?._id]);
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#8b92a8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Invite Stats</div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div style={{ background: '#0a0c12', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ fontSize: '10px', color: '#8b92a8', textTransform: 'uppercase' }}>Total Invited</div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: '#f0f2f8', marginTop: '2px' }}>{uStats?.totalInvited || 0} friends</div>
                        </div>
                        <div style={{ background: '#0a0c12', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ fontSize: '10px', color: '#8b92a8', textTransform: 'uppercase' }}>Active Friends</div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: '#00d4a0', marginTop: '2px' }}>{uStats?.activeFriends || 0}</div>
                        </div>
                        <div style={{ background: '#0a0c12', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ fontSize: '10px', color: '#8b92a8', textTransform: 'uppercase' }}>Pending Friends</div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: '#fbbf24', marginTop: '2px' }}>{uStats?.pendingFriends || 0}</div>
                        </div>
                        <div style={{ background: '#0a0c12', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ fontSize: '10px', color: '#8b92a8', textTransform: 'uppercase' }}>Total Earned</div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: '#00d4a0', marginTop: '2px' }}>${(uStats?.totalEarned || 0).toFixed(2)} 💰</div>
                        </div>
                      </div>

                      <div className="card-premium" style={{ background: '#0a0c12', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: '#8b92a8' }}>Referral Code:</span>
                          <strong style={{ color: '#f5c518', letterSpacing: '1px' }}>{u.referral_code || u.referralCode || '—'}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: '#8b92a8' }}>Referred By:</span>
                          <strong style={{ color: '#f0f2f8' }}>{u.referred_by || 'Organic'}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: '#8b92a8' }}>This Month Earned:</span>
                          <strong style={{ color: '#00d4a0' }}>${(uStats?.earningsMonth || 0).toFixed(2)}</strong>
                        </div>
                      </div>

                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#8b92a8', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '10px' }}>Referral List</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(!uStats?.referralList || uStats.referralList.length === 0) ? (
                          <div style={{ textAlign: 'center', padding: '20px', color: '#4e5567', fontSize: '13px' }}>No referrals yet</div>
                        ) : uStats.referralList.map((ref, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#0a0c12', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>👤</div>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 600 }}>@{ref.username}</div>
                                <div style={{ fontSize: '10px', color: '#4e5567' }}>{new Date(ref.date).toLocaleDateString()}</div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: ref.status === 'paid' ? '#00d4a0' : '#fbbf24' }}>
                                {ref.status === 'paid' ? '✓ ACTIVE' : '⏳ PENDING'}
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: ref.status === 'paid' ? '#00d4a0' : '#8b92a8' }}>
                                ${(ref.earned ?? 0).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button className="btn-premium-ghost" style={{ flex: 1, border: '1px solid rgba(255,255,255,0.07)', fontSize: '12px' }}>Export CSV</button>
                        <button className="btn-premium-danger" style={{ flex: 1, background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)', fontSize: '12px' }}>Flag for Review</button>
                      </div>
                    </div>
                  );
                })()}

                {/* ── TAB 4: Actions & Warnings Log ── */}
                {userDrawerTab === 'activity' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Issue user warning form */}
                    <div className="card-premium" style={{ background: '#0a0c12', padding: '16px' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#fbbf24' }}>⚠️ Issue Official User Warning</h4>
                      <form onSubmit={handleWarnUserSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <textarea
                          className="input-premium"
                          rows={3}
                          placeholder="Provide detailed violation warning reason..."
                          value={warnMessage}
                          onChange={e => setWarnMessage(e.target.value)}
                          required
                        />
                        <button type="submit" disabled={warnLoading} className="btn-premium-warning" style={{ alignSelf: 'flex-end', padding: '8px 14px' }}>
                          {warnLoading ? 'Sending…' : 'Send Warning'}
                        </button>
                      </form>
                    </div>

                    {/* Warnings List history */}
                    <div>
                      <div style={{ fontSize: '11px', color: '#8b92a8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Active User Warning Logs</div>
                      {(!u.warnings || u.warnings.length === 0) ? (
                        <div style={{ color: '#4e5567', fontStyle: 'italic', fontSize: '12px' }}>✓ This account has clean record. No warnings issued.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {u.warnings.map((w, idx) => (
                            <div key={idx} style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fbbf24', fontWeight: 600, fontSize: '11px' }}>
                                <span>⚠️ Warning #{idx + 1}</span>
                                <span>{w.timestamp ? new Date(w.timestamp).toLocaleDateString() : ''}</span>
                              </div>
                              <p style={{ margin: '4px 0 0 0', color: '#f0f2f8' }}>{w.message}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Administrative controls drawer footer */}
              {!isMe && (
                <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: '8px', background: '#0a0c12' }}>
                  
                  {/* Row 1: messaging & audit log navigations */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setMessageComposerUserId(u._id);
                        setMessageComposerUsername(u.username);
                      }}
                      className="btn-premium-ghost"
                      style={{ flex: 1, border: '1px solid rgba(255,255,255,0.07)', fontSize: '12px' }}
                    >
                      💬 Send Direct Message
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUserDetailId(null);
                        setLogsSearchQuery(u.username);
                        setActiveTab('logs');
                      }}
                      className="btn-premium-ghost"
                      style={{ flex: 1, border: '1px solid rgba(255,255,255,0.07)', fontSize: '12px' }}
                    >
                      📜 View Audit Logs
                    </button>
                  </div>

                  {/* Row 2: critical restrictions */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleToggleSuspend(u._id, !!u.isSuspended)}
                      className="btn-premium-ghost"
                      style={{ flex: 1, border: '1px solid rgba(255,255,255,0.07)', fontSize: '12px', color: u.isSuspended ? '#00d4a0' : '#f43f5e' }}
                    >
                      {u.isSuspended ? '✅ Activate (Unban)' : '🚫 Suspend Account (Ban)'}
                    </button>
                    
                    <button
                      onClick={async () => {
                        if (await handleRemoveUser(u._id, u.username)) {
                          setSelectedUserDetailId(null);
                        }
                      }}
                      className="btn-premium-danger"
                      style={{ flex: 1, fontSize: '12px' }}
                    >
                      🗑️ Delete User
                    </button>
                  </div>

                </div>
              )}
            </div>
          </>
        );
      })()}


      {/* ══════════════════════════════════════════════════════════
         MODAL POPUPS (CENTERED BLUR BACKDROP)
         ══════════════════════════════════════════════════════════ */}

      {/* ── 1. KYC REQUEST RESUBMISSION POPUP MODAL ── */}
      {resubmitUserId && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#fbbf24' }}>⚠ Request KYC Resubmission</h3>
              <button onClick={() => setResubmitUserId(null)} style={{ background: 'transparent', border: 'none', color: '#8b92a8', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>
            
            <p style={{ fontSize: '12px', color: '#8b92a8', lineHeight: 1.5, margin: '0 0 14px 0' }}>
              This will reset the user's KYC verification status to **Unverified (None)** and allow them to upload clearer document copies.
            </p>

            <form onSubmit={handleResubmitRequest} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#8b92a8', textTransform: 'uppercase' }}>Instruction Message to User</label>
                <textarea
                  className="input-premium"
                  rows={4}
                  placeholder="Specify why documents are rejected (e.g. Blurry ID front card, selfie facial features are dark/unclear, document names mismatch)..."
                  value={resubmitReason}
                  onChange={e => setResubmitReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setResubmitUserId(null)} className="btn-premium-ghost" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" disabled={submittingResubmit} className="btn-premium-warning" style={{ flex: 1 }}>
                  {submittingResubmit ? 'Sending…' : 'Request Resubmission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 2. INLINE DIRECT MESSAGE COMPOSER MODAL ── */}
      {messageComposerUserId && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>💬 Compose Direct Message</h3>
              <button onClick={() => setMessageComposerUserId(null)} style={{ background: 'transparent', border: 'none', color: '#8b92a8', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSendMessageSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#8b92a8', textTransform: 'uppercase' }}>Recipient Account</label>
                <input
                  type="text"
                  className="input-premium"
                  value={`@${messageComposerUsername}`}
                  disabled
                  style={{ opacity: 0.6 }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#8b92a8', textTransform: 'uppercase' }}>Message Subject (Optional)</label>
                <input
                  type="text"
                  className="input-premium"
                  placeholder="e.g. Account security updates, trade notification..."
                  value={messageSubject}
                  onChange={e => setMessageSubject(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#8b92a8', textTransform: 'uppercase' }}>Message Content</label>
                <textarea
                  className="input-premium"
                  rows={5}
                  placeholder="Type message text here..."
                  value={messageBody}
                  onChange={e => setMessageBody(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setMessageComposerUserId(null)} className="btn-premium-ghost" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" disabled={sendingMessage} className="btn-premium-primary" style={{ flex: 1 }}>
                  {sendingMessage ? 'Sending…' : '✉️ Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 3. FULL-SCREEN RECEIPT/ID LIGHTBOX VIEWER ── */}
      {activeLightboxImage && (
        <div 
          onClick={() => setActiveLightboxImage(null)}
          style={{ 
            position: 'fixed', inset: 0, background: 'rgba(5, 7, 12, 0.92)', zIndex: 4000, 
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', 
            backdropFilter: 'blur(10px)', animation: 'fadeIn 0.2s ease-out', cursor: 'zoom-out'
          }}
        >
          <img 
            src={activeLightboxImage} 
            alt="Enlarged Visual Document Proof" 
            style={{ 
              maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', 
              borderRadius: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.8)', 
              animation: 'modalScale 0.25s cubic-bezier(0.16, 1, 0.3, 1)' 
            }} 
          />
          <div style={{ position: 'absolute', top: '24px', right: '24px', color: '#8b92a8', fontSize: '20px', fontWeight: 'bold' }}>✕ Close Preview</div>
        </div>
      )}

      </main>
    </div>
  );
};

export default AdminPanel;

