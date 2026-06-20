import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Bell, Check, Trash2, Eye, X } from 'lucide-react';

const getNotificationTheme = (title = '', message = '', type = '') => {
  const t = (title || '').toLowerCase();
  const m = (message || '').toLowerCase();
  const ty = (type || '').toLowerCase();

  // 1. Payment received from [user]
  if (m.includes('payment received') || t.includes('payment received')) {
    return {
      icon: '🪙',
      bg: 'rgba(245, 166, 35, 0.12)',
      color: '#F5A623',
      label: 'Payment Received'
    };
  }
  // 2. Your deposit of X USDT confirmed
  if ((m.includes('deposit') && (m.includes('confirm') || m.includes('received') || m.includes('success'))) || t.includes('deposit confirmed') || m.includes('deposit received')) {
    return {
      icon: '✅',
      bg: 'rgba(0, 200, 150, 0.12)',
      color: '#00C896',
      label: 'Deposit Confirmed'
    };
  }
  // 3. Withdrawal pending — arrives in ~5 mins
  if (m.includes('withdrawal pending') || m.includes('withdrawal processing') || t.includes('withdrawal pending')) {
    return {
      icon: '⏳',
      bg: 'rgba(255, 193, 7, 0.12)',
      color: '#FFC107',
      label: 'Withdrawal Pending'
    };
  }
  // 4. Trade cancelled by [user]
  if (m.includes('cancelled') || t.includes('cancelled') || m.includes('cancel')) {
    return {
      icon: '❌',
      bg: 'rgba(255, 77, 77, 0.12)',
      color: '#FF4D4D',
      label: 'Trade Cancelled'
    };
  }
  // 5. Rate alert: Rate on your listing changed
  if (m.includes('rate alert') || m.includes('rate on your listing') || t.includes('rate alert') || m.includes('rate changed')) {
    return {
      icon: '📈',
      bg: 'rgba(0, 200, 150, 0.12)',
      color: '#00C896',
      label: 'Rate Alert'
    };
  }

  // Fallbacks based on type
  if (ty === 'deposit') {
    return { icon: '📥', bg: 'rgba(0,200,150,0.12)', color: '#00C896' };
  }
  if (ty === 'withdrawal') {
    return { icon: '📤', bg: 'rgba(255,77,77,0.12)', color: '#FF4D4D' };
  }
  if (ty.includes('trade')) {
    return { icon: '🔄', bg: 'rgba(245,166,35,0.12)', color: '#F5A623' };
  }
  if (ty.includes('kyc')) {
    return { icon: '🛡️', bg: 'rgba(245,166,35,0.12)', color: '#F5A623' };
  }
  return {
    icon: '🔔',
    bg: 'rgba(138, 155, 184, 0.12)',
    color: '#8A9BB8'
  };
};

const NotificationCenter = ({ userId, isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!userId || !isOpen) return;
    const fetchNotifs = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      setNotifications(data || []);
    };
    fetchNotifs();
  }, [userId, isOpen]);

  const markAllRead = async () => {
    if (!userId) return;
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error('Failed to mark all notifications read:', e);
    }
  };

  const markOneRead = async (notifId) => {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    }
  };

  const dismissNotification = async (e, notifId) => {
    e.stopPropagation();
    try {
      await supabase.from('notifications').delete().eq('id', notifId);
      setNotifications(prev => prev.filter(n => n.id !== notifId));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleView = (e, notif) => {
    e.stopPropagation();
    markOneRead(notif.id);
    window.dispatchEvent(new CustomEvent('ethioswap_navigate', { detail: 'history' }));
    onClose();
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

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

  // Render only the last 5 notifications
  const visibleNotifications = notifications.slice(0, 5);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 998, background: 'rgba(11, 14, 26, 0.4)', backdropFilter: 'blur(4px)' }} />
      <div style={{ 
        position: 'fixed', 
        top: 'calc(var(--top-bar-h, 72px) + 8px)', 
        right: '16px', 
        width: '360px', 
        maxWidth: 'calc(100vw - 32px)', 
        background: '#141827', 
        border: '1px solid #1E2640', 
        borderRadius: '20px', 
        zIndex: 999, 
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(245, 166, 35, 0.15)', 
        animation: 'slideDown 0.2s ease', 
        overflow: 'hidden', 
        maxHeight: '80dvh', 
        display: 'flex', 
        flexDirection: 'column' 
      }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #1E2640', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0D1117' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={16} color="#F5A623" /> Notifications
            </h3>
            {unreadCount > 0 && <span style={{ fontSize: '11px', color: '#8A9BB8', fontWeight: 600, marginTop: '2px', display: 'block' }}>{unreadCount} unread</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)', color: '#F5A623', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: '4px 8px', borderRadius: '6px', transition: 'all 0.2s' }}>
                Mark all read
              </button>
            )}
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#8A9BB8', padding: '4px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} />
            </button>
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
          {visibleNotifications.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}>🔔</div>
              <p style={{ fontSize: '13px', color: '#8A9BB8', margin: 0, fontWeight: 500 }}>No notifications yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {visibleNotifications.map(n => {
                const theme = getNotificationTheme(n.title, n.message, n.type);
                return (
                  <div key={n.id} onClick={() => markOneRead(n.id)}
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      gap: '10px', 
                      padding: '12px', 
                      background: n.is_read ? 'rgba(255,255,255,0.01)' : 'rgba(245,166,35,0.03)', 
                      border: '1px solid #1E2640',
                      borderRadius: '12px', 
                      cursor: 'pointer', 
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'rgba(245,166,35,0.3)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#1E2640';
                      e.currentTarget.style.background = n.is_read ? 'rgba(255,255,255,0.01)' : 'rgba(245,166,35,0.03)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '8px', 
                        background: theme.bg, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '16px', 
                        flexShrink: 0 
                      }}>
                        {theme.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: theme.color }}>
                            {n.title || theme.label || 'System Notification'}
                          </span>
                          <span style={{ fontSize: '10px', color: '#8A9BB8', flexShrink: 0 }}>{formatTime(n.created_at)}</span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#fff', lineHeight: '1.4', fontWeight: n.is_read ? 400 : 600, margin: 0 }}>
                          {n.message}
                        </p>
                      </div>
                      {!n.is_read && (
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F5A623', flexShrink: 0, marginTop: '4px' }} />
                      )}
                    </div>
                    
                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '8px', marginTop: '2px' }}>
                      <button 
                        onClick={(e) => handleView(e, n)} 
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '4px', 
                          padding: '4px 10px', 
                          background: 'rgba(0, 200, 150, 0.1)', 
                          border: '1px solid rgba(0, 200, 150, 0.2)', 
                          borderRadius: '6px', 
                          color: '#00C896', 
                          fontSize: '11px', 
                          fontWeight: 700, 
                          cursor: 'pointer',
                          fontFamily: 'inherit'
                        }}
                      >
                        <Eye size={11} /> View
                      </button>
                      <button 
                        onClick={(e) => dismissNotification(e, n.id)} 
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '4px', 
                          padding: '4px 10px', 
                          background: 'rgba(255, 77, 77, 0.08)', 
                          border: '1px solid rgba(255, 77, 77, 0.15)', 
                          borderRadius: '6px', 
                          color: '#FF4D4D', 
                          fontSize: '11px', 
                          fontWeight: 700, 
                          cursor: 'pointer',
                          fontFamily: 'inherit'
                        }}
                      >
                        <Trash2 size={11} /> Dismiss
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {notifications.length > 5 && (
          <div style={{ padding: '12px', textAlign: 'center', background: '#0D1117', borderTop: '1px solid #1E2640' }}>
            <button 
              onClick={() => { window.dispatchEvent(new CustomEvent('ethioswap_navigate', { detail: 'notifications' })); onClose(); }}
              style={{ background: 'none', border: 'none', color: '#8A9BB8', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              onMouseEnter={e => e.currentTarget.style.color = '#F5A623'}
              onMouseLeave={e => e.currentTarget.style.color = '#8A9BB8'}
            >
              See all notifications ({notifications.length})
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export { NotificationCenter };

export const useNotifCount = (userId) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!userId) {
      setCount(0);
      return;
    }
    const fetchCount = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      setCount(data?.length || 0);
    };
    fetchCount();
  }, [userId]);
  return count;
};