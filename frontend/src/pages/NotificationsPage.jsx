import React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from 'convex-api';
import { useAuth } from '../context/AuthContext.jsx';

const truncateAddr = (addr) => {
  if (!addr || addr.length <= 8) return addr || '';
  return addr.slice(0, 4) + '...' + addr.slice(-3);
};

const NotificationsPage = ({ setPage }) => {
  const { user } = useAuth();
  const notifications = useQuery(api.notifications.listForUser, user?._id ? { userId: user._id } : "skip") || [];
  const mutateMarkAllRead = useMutation(api.notifications.markAllRead);
  const mutateMarkAsRead = useMutation(api.notifications.markAsRead);

  const markAllRead = async () => {
    if (!user?._id) return;
    try { await mutateMarkAllRead({ userId: user._id }); } catch (e) { console.error(e); }
  };

  const markOneRead = async (notifId) => {
    try { await mutateMarkAsRead({ id: notifId }); } catch (e) { console.error(e); }
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

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text)' }}>Notifications</h1>
          {unreadCount > 0 && <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{unreadCount} unread</span>}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--teal)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <i className="ti ti-bell" style={{ fontSize: '48px', color: 'var(--teal)', opacity: 0.3, display: 'block', marginBottom: '16px' }}></i>
          <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>No notifications</p>
          <p style={{ fontSize: '13px', color: 'var(--muted)' }}>You're all caught up!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {notifications.map(n => {
            const isReceived = n.type === 'deposit' || n.type === 'transfer' || n.type === 'trade_completed';
            return (
              <div
                key={n._id}
                onClick={() => { markOneRead(n._id); setPage('transactions'); }}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderLeft: n.isRead ? '3px solid transparent' : '3px solid var(--teal)',
                  borderRadius: '16px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = n.isRead ? '1px solid var(--border)' : '1px solid var(--border)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: isReceived ? 'rgba(0,200,150,0.12)' : 'rgba(255,77,77,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                    {isReceived ? '💰' : '📤'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{n.title || 'Notification'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Account ID: {user?.id || 'ES-XXXXXXX'}</div>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--muted)', flexShrink: 0 }}>{formatTime(n.createdAt)}</span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '8px' }}>{n.message}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className={`status-pill status-pill-${isReceived ? 'received' : 'sent'}`}>
                    {isReceived ? 'Received' : 'Sent'}
                  </span>
                  <button onClick={e => { e.stopPropagation(); setPage('transactions'); }} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px 12px', fontSize: '12px', fontWeight: 600, color: 'var(--teal)', cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--teal)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
