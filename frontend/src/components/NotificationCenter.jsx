import React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const notifIcons = {
  trade_opened:    { icon: '🔄', bg: 'rgba(200,150,44,0.08)', color: 'var(--gold-light)' },
  trade_paid:      { icon: '💳', bg: 'rgba(200,150,44,0.08)', color: 'var(--gold-light)' },
  trade_completed: { icon: '✅', bg: 'var(--status-success-bg)', color: 'var(--status-success-text)' },
  deposit:         { icon: '⬇️', bg: 'var(--status-success-bg)', color: 'var(--status-success-text)' },
  withdrawal:      { icon: '⬆️', bg: 'var(--status-info-bg)', color: 'var(--status-info-text)' },
  dispute:         { icon: '⚠️', bg: 'var(--status-danger-bg)', color: 'var(--status-danger-text)' },
  kyc_submitted:   { icon: '🛡️', bg: 'var(--gold-bg)', color: 'var(--gold-light)' },
  kyc_update:      { icon: '🛡️', bg: 'var(--gold-bg)', color: 'var(--gold-light)' },
  kyc_submission:  { icon: '📋', bg: 'var(--gold-bg)', color: 'var(--gold-light)' },
  welcome:         { icon: '👋', bg: 'var(--gold-bg)', color: 'var(--gold-light)' },
  transfer:        { icon: '💰', bg: 'var(--status-success-bg)', color: 'var(--status-success-text)' },
  price_alert:     { icon: '📈', bg: 'var(--status-info-bg)', color: 'var(--status-info-text)' },
  payment_request: { icon: '📩', bg: 'var(--gold-bg)', color: 'var(--gold-light)' },
  badge_upgrade:   { icon: '🏆', bg: 'var(--gold-bg)', color: 'var(--gold-light)' },
  streak_broken:   { icon: '🔥', bg: 'var(--status-warning-bg)', color: 'var(--status-warning-text)' },
  leaderboard:     { icon: '🏆', bg: 'var(--gold-bg)', color: 'var(--gold-light)' },
  escrow_reminder: { icon: '⏰', bg: 'var(--status-warning-bg)', color: 'var(--status-warning-text)' },
  dispute_opened:  { icon: '⚠️', bg: 'var(--status-danger-bg)', color: 'var(--status-danger-text)' },
  default:         { icon: '🔔', bg: 'var(--bg-elevated)', color: 'var(--text-2)' },
};

const NotificationCenter = ({ userId, isOpen, onClose }) => {
  const notifications = useQuery(api.notifications.listForUser, userId ? { userId } : "skip") || [];
  const mutateMarkAllRead = useMutation(api.notifications.markAllRead);
  const mutateMarkAsRead = useMutation(api.notifications.markAsRead);

  const markAllRead = async () => {
    if (!userId) return;
    try {
      await mutateMarkAllRead({ userId });
    } catch (e) {
      console.error('Failed to mark all notifications read:', e);
    }
  };

  const markOneRead = async (notifId) => {
    try {
      await mutateMarkAsRead({ id: notifId });
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const formatTime = (iso) => {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  if (!isOpen) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100 }} />
      <div style={{ position: 'fixed', top: 'calc(var(--top-bar-h, 60px) + 8px)', right: '8px', width: '340px', maxWidth: 'calc(100vw - 16px)', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', zIndex: 200, boxShadow: 'var(--shadow-lg)', animation: 'slideDown 0.2s ease', overflow: 'hidden', maxHeight: '80dvh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Notifications</h3>
            {unreadCount > 0 && <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{unreadCount} unread</span>}
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} style={{ background: 'none', border: '1px solid var(--border-active)', color: 'var(--gold-light)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', padding: '4px 8px', borderRadius: '6px' }}>
              Mark all read
            </button>
          )}
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {notifications.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔔</div>
              <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>No notifications yet</p>
            </div>
          ) : (
            notifications.map(n => {
              const style = notifIcons[n.type] || notifIcons.default;
              return (
                <div key={n._id} onClick={() => markOneRead(n._id)}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 16px', background: n.isRead ? 'transparent' : 'rgba(200,150,44,0.03)', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s ease' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                  onMouseLeave={e => e.currentTarget.style.background = n.isRead ? 'transparent' : 'rgba(200,150,44,0.03)'}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: style.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                    {style.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-1)', lineHeight: '1.4', fontWeight: n.isRead ? 400 : 500, marginBottom: '2px' }}>
                      {n.message}
                    </p>
                    <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{formatTime(n.createdAt)}</span>
                  </div>
                  {!n.isRead && (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--gold)', flexShrink: 0, marginTop: '4px' }} />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};

export { NotificationCenter };

export const useNotifCount = (userId) => {
  const notifications = useQuery(api.notifications.listForUser, userId ? { userId } : "skip") || [];
  return notifications.filter(n => !n.isRead).length;
};
