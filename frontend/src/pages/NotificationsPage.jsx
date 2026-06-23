import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  Eye, 
  Inbox, 
  Info,
  ArrowDownLeft, 
  ArrowUpRight, 
  HelpCircle, 
  Clock,
  EyeOff,
  Filter,
  RefreshCw,
  TrendingUp,
  Circle
} from 'lucide-react';

const getNotificationConfig = (type, title = '', message = '') => {
  const t = (title || '').toLowerCase();
  const m = (message || '').toLowerCase();
  const ty = (type || '').toLowerCase();

  // Receives / Deposits / incoming transfers
  if (
    ty.includes('received') || 
    ty === 'deposit_approved' || 
    ty === 'deposit' ||
    ty.includes('deposit_confirmed') ||
    t.includes('received') || 
    t.includes('deposit confirmed') ||
    t.includes('deposit successfully') ||
    m.includes('deposit of')
  ) {
    return {
      icon: ArrowDownLeft,
      color: '#00C896', // green
      bg: 'rgba(0, 200, 150, 0.06)',
      border: 'rgba(0, 200, 150, 0.2)',
      glow: 'rgba(0, 200, 150, 0.15)',
      gradient: 'linear-gradient(135deg, rgba(20, 24, 39, 0.95) 0%, rgba(0, 200, 150, 0.05) 100%)',
      label: 'Deposit/Received'
    };
  }

  // Sent / Withdrawals / outgoing transfers
  if (
    ty.includes('sent') || 
    ty === 'withdrawal' || 
    ty === 'withdrawal_approved' ||
    ty === 'withdrawal_rejected' ||
    t.includes('sent') || 
    t.includes('withdrawal') ||
    m.includes('withdrawal of')
  ) {
    return {
      icon: ArrowUpRight,
      color: '#FF4D4D', // red
      bg: 'rgba(255, 77, 77, 0.06)',
      border: 'rgba(255, 77, 77, 0.2)',
      glow: 'rgba(255, 77, 77, 0.15)',
      gradient: 'linear-gradient(135deg, rgba(20, 24, 39, 0.95) 0%, rgba(255, 77, 77, 0.05) 100%)',
      label: 'Withdrawal/Sent'
    };
  }

  // Trades & Disputes
  if (
    ty.includes('trade') || 
    ty.includes('dispute') || 
    t.includes('trade') || 
    t.includes('escrow') ||
    t.includes('dispute') || 
    m.includes('trade') ||
    m.includes('dispute')
  ) {
    return {
      icon: Bell,
      color: '#F5A623', // gold/orange
      bg: 'rgba(245, 166, 35, 0.06)',
      border: 'rgba(245, 166, 35, 0.2)',
      glow: 'rgba(245, 166, 35, 0.15)',
      gradient: 'linear-gradient(135deg, rgba(20, 24, 39, 0.95) 0%, rgba(245, 166, 35, 0.05) 100%)',
      label: 'Trade/Dispute'
    };
  }

  // KYC & Account verification
  if (ty.includes('kyc') || t.includes('kyc') || m.includes('kyc')) {
    return {
      icon: HelpCircle,
      color: '#3B82F6', // blue
      bg: 'rgba(59, 130, 246, 0.06)',
      border: 'rgba(59, 130, 246, 0.2)',
      glow: 'rgba(59, 130, 246, 0.15)',
      gradient: 'linear-gradient(135deg, rgba(20, 24, 39, 0.95) 0%, rgba(59, 130, 246, 0.05) 100%)',
      label: 'Security/KYC'
    };
  }

  // Fallback System
  return {
    icon: Info,
    color: '#8A9BB8',
    bg: 'rgba(138, 155, 184, 0.06)',
    border: 'rgba(138, 155, 184, 0.2)',
    glow: 'rgba(138, 155, 184, 0.15)',
    gradient: 'linear-gradient(135deg, rgba(20, 24, 39, 0.95) 0%, rgba(138, 155, 184, 0.03) 100%)',
    label: 'System'
  };
};

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

const NotificationsPage = ({ setPage }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all'); // all, unread, read
  const [typeFilter, setTypeFilter] = useState('all'); // all, trades, wallets, system
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const fetchNotifs = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setNotifications(data || []);
    };

    fetchNotifs();

    // Subscribe to real-time notification changes
    const channel = supabase
      .channel(`public:notifications-page:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifs();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const handleRefresh = async () => {
    if (!user?.id) return;
    setIsRefreshing(true);
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setNotifications(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleRead = async (e, notif) => {
    e.stopPropagation();
    try {
      const newReadState = !notif.is_read;
      await supabase
        .from('notifications')
        .update({ is_read: newReadState })
        .eq('id', notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: newReadState } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const deleteNotification = async (e, notifId) => {
    e.stopPropagation();
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notifId);
      setNotifications(prev => prev.filter(n => n.id !== notifId));
    } catch (e) {
      console.error(e);
    }
  };

  const clearAllNotifications = async () => {
    if (!user?.id) return;
    const confirmClear = window.confirm("Are you sure you want to delete all notifications? This action cannot be undone.");
    if (!confirmClear) return;
    
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);
      setNotifications([]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotifClick = async (n) => {
    if (!n.is_read) {
      try {
        await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
        setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, is_read: true } : item));
      } catch (e) {
        console.error(e);
      }
    }

    if (n.trade_id) {
      window.dispatchEvent(new CustomEvent('ethioswap_navigate', { detail: { page: 'tradeRoom', tradeId: n.trade_id } }));
    } else if (n.type === 'withdrawal' || n.type === 'deposit' || n.type?.includes('transfer') || n.type?.includes('deposit_approved') || n.type?.includes('withdrawal_approved')) {
      setPage('transactions');
    } else if (n.type?.includes('kyc')) {
      setPage('profile');
    } else {
      setPage('transactions');
    }
  };

  // Counting for filters
  const totalCount = notifications.length;
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const readCount = notifications.filter(n => n.is_read).length;

  const filteredNotifications = notifications.filter(n => {
    // 1. Status Filter
    if (statusFilter === 'unread' && n.is_read) return false;
    if (statusFilter === 'read' && !n.is_read) return false;

    // 2. Type Filter
    const t = (n.title || '').toLowerCase();
    const m = (n.message || '').toLowerCase();
    const ty = (n.type || '').toLowerCase();

    const isTrade = ty.includes('trade') || ty.includes('dispute') || t.includes('trade') || t.includes('dispute') || m.includes('trade') || m.includes('dispute');
    const isWallet = ty === 'deposit' || ty === 'withdrawal' || ty.includes('transfer') || ty.includes('deposit_') || ty.includes('withdrawal_');

    if (typeFilter === 'trades') return isTrade;
    if (typeFilter === 'wallets') return isWallet;
    if (typeFilter === 'system') return !isTrade && !isWallet;

    return true;
  });

  return (
    <div className="np-container">
      {/* Header Panel */}
      <div className="np-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '42px', 
            height: '42px', 
            borderRadius: '12px', 
            background: 'rgba(245, 166, 35, 0.1)', 
            border: '1px solid rgba(245, 166, 35, 0.2)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            position: 'relative'
          }}>
            <Bell size={20} color="#F5A623" />
            {unreadCount > 0 && (
              <span style={{ 
                position: 'absolute', 
                top: '-3px', 
                right: '-3px', 
                width: '10px', 
                height: '10px', 
                borderRadius: '50%', 
                background: '#F5A623', 
                border: '2px solid #0D1117',
                boxShadow: '0 0 8px #F5A623'
              }} />
            )}
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', margin: 0 }}>Notifications</h1>
            <p style={{ fontSize: '12px', color: '#8A9BB8', margin: '2px 0 0 0' }}>
              {unreadCount > 0 ? `${unreadCount} unread alerts` : 'All caught up!'}
            </p>
          </div>
        </div>

        <div className="np-header-actions">
          {/* Refresh Button */}
          <button 
            onClick={handleRefresh}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid #1E2640',
              color: '#8A9BB8',
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(245, 166, 35, 0.3)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#1E2640'}
            title="Refresh List"
          >
            <RefreshCw size={15} className={isRefreshing ? 'spin' : ''} style={{ transition: 'transform 0.5s ease', transform: isRefreshing ? 'rotate(360deg)' : 'none' }} />
          </button>

          {/* Mark All Read */}
          {unreadCount > 0 && (
            <button 
              onClick={markAllRead} 
              style={{ 
                background: 'rgba(0, 200, 150, 0.1)', 
                border: '1px solid rgba(0, 200, 150, 0.25)', 
                color: '#00C896', 
                fontSize: '12px', 
                fontWeight: 700, 
                padding: '8px 12px', 
                borderRadius: '10px', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(0, 200, 150, 0.15)';
                e.currentTarget.style.borderColor = '#00C896';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(0, 200, 150, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(0, 200, 150, 0.25)';
              }}
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          )}

          {/* Clear All */}
          {totalCount > 0 && (
            <button 
              onClick={clearAllNotifications} 
              style={{ 
                background: 'rgba(255, 77, 77, 0.08)', 
                border: '1px solid rgba(255, 77, 77, 0.2)', 
                color: '#FF4D4D', 
                fontSize: '12px', 
                fontWeight: 700, 
                padding: '8px 12px', 
                borderRadius: '10px', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255, 77, 77, 0.15)';
                e.currentTarget.style.borderColor = '#FF4D4D';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255, 77, 77, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(255, 77, 77, 0.2)';
              }}
            >
              <Trash2 size={14} />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Filter Bars Panel */}
      <div className="np-filters-card">
        {/* Status Filters */}
        <div className="np-filter-row">
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#8A9BB8', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={12} /> Status:
          </span>
          <div className="np-filter-buttons">
            {[
              { id: 'all', label: 'All', count: totalCount },
              { id: 'unread', label: 'Unread', count: unreadCount },
              { id: 'read', label: 'Read', count: readCount }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  background: statusFilter === tab.id ? 'rgba(245, 166, 35, 0.12)' : 'transparent',
                  border: '1px solid',
                  borderColor: statusFilter === tab.id ? '#F5A623' : 'transparent',
                  borderRadius: '8px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: statusFilter === tab.id ? '#F5A623' : '#8A9BB8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s'
                }}
              >
                {tab.label}
                <span style={{
                  fontSize: '10px',
                  background: statusFilter === tab.id ? '#F5A623' : '#1E2640',
                  color: statusFilter === tab.id ? '#000' : '#8A9BB8',
                  padding: '1px 6px',
                  borderRadius: '6px',
                  fontWeight: 800
                }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: '#1E2640' }} />

        {/* Type Filters */}
        <div className="np-filter-row">
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#8A9BB8', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={12} /> Category:
          </span>
          <div className="np-filter-buttons">
            {[
              { id: 'all', label: 'All Types' },
              { id: 'trades', label: 'Trades' },
              { id: 'wallets', label: 'Wallet/Transfers' },
              { id: 'system', label: 'System' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id)}
                style={{
                  background: typeFilter === tab.id ? '#1E2640' : 'transparent',
                  border: '1px solid',
                  borderColor: typeFilter === tab.id ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  borderRadius: '8px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: typeFilter === tab.id ? '#fff' : '#8A9BB8',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div style={{ 
          background: '#0D1117', 
          border: '1px solid #1E2640', 
          borderRadius: '16px', 
          padding: '60px 20px',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
        }}>
          <Inbox size={48} color="#8A9BB8" style={{ opacity: 0.3, display: 'block', margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: '0 0 6px 0' }}>No notifications found</h3>
          <p style={{ fontSize: '13px', color: '#8A9BB8', margin: 0, maxWidth: '280px', marginLeft: 'auto', marginRight: 'auto' }}>
            {totalCount === 0 
              ? "You're all caught up! When events occur, they'll show up here in real time." 
              : "Try changing your filter settings to see other alerts."}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredNotifications.map(n => {
            const config = getNotificationConfig(n.type, n.title, n.message);
            const IconComponent = config.icon;
            
            return (
              <div
                key={n.id}
                onClick={() => handleNotifClick(n)}
                className="np-card"
                style={{
                  background: config.gradient,
                  border: `1px solid ${config.border}`,
                  borderLeft: `4px solid ${config.color}`,
                  boxShadow: n.is_read ? 'none' : config.glow
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = config.color;
                  e.currentTarget.style.boxShadow = `0 6px 24px ${config.glow}`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.borderColor = config.border;
                  e.currentTarget.style.boxShadow = n.is_read ? 'none' : config.glow;
                }}
              >
                {/* Visual Glow Dot for Unread */}
                {!n.is_read && (
                  <span style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: config.color,
                    boxShadow: `0 0 10px ${config.color}`
                  }} />
                )}

                {/* Left Icon Panel */}
                <div style={{ 
                  width: '42px', 
                  height: '42px', 
                  borderRadius: '12px', 
                  background: config.bg, 
                  border: `1px solid ${config.border}`,
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <IconComponent size={20} color={config.color} />
                </div>

                {/* Content Panel */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: 800, 
                      color: config.color, 
                      textTransform: 'uppercase', 
                      background: config.bg,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      letterSpacing: '0.5px'
                    }}>
                      {config.label}
                    </span>
                    <span style={{ fontSize: '11px', color: '#8A9BB8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      {formatTime(n.created_at)}
                    </span>
                  </div>

                  <h3 style={{ 
                    fontSize: '14px', 
                    fontWeight: n.is_read ? 600 : 750, 
                    color: '#fff', 
                    margin: '0 0 4px 0',
                    lineHeight: '1.4'
                  }}>
                    {n.title || 'Notification'}
                  </h3>
                  
                  <p style={{ 
                    fontSize: '13px', 
                    color: n.is_read ? '#8A9BB8' : '#B2C0D6', 
                    lineHeight: '1.5',
                    margin: '0 0 12px 0',
                    fontWeight: n.is_read ? 400 : 500
                  }}>
                    {n.message}
                  </p>

                  {/* Footer Actions inside card */}
                  <div className="np-card-footer">
                    {n.trade_id ? (
                      <span style={{ fontSize: '11px', color: '#8A9BB8', background: '#1A1F32', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', alignSelf: 'flex-start' }}>
                        Trade: #{n.trade_id.slice(0, 8)}
                      </span>
                    ) : <div />}

                    <div className="np-card-actions">
                      {/* Mark Read/Unread */}
                      <button
                        onClick={(e) => toggleRead(e, n)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid #1E2640',
                          color: '#8A9BB8',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.color = '#fff';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.color = '#8A9BB8';
                          e.currentTarget.style.borderColor = '#1E2640';
                        }}
                        title={n.is_read ? "Mark as Unread" : "Mark as Read"}
                      >
                        {n.is_read ? <EyeOff size={12} /> : <Eye size={12} />}
                        {n.is_read ? 'Mark Unread' : 'Mark Read'}
                      </button>

                      {/* Delete notification */}
                      <button
                        onClick={(e) => deleteNotification(e, n.id)}
                        style={{
                          background: 'rgba(255, 77, 77, 0.05)',
                          border: '1px solid rgba(255, 77, 77, 0.15)',
                          color: '#FF4D4D',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(255, 77, 77, 0.1)';
                          e.currentTarget.style.borderColor = '#FF4D4D';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'rgba(255, 77, 77, 0.05)',
                          e.currentTarget.style.borderColor = 'rgba(255, 77, 77, 0.15)'
                        }}
                        title="Dismiss Notification"
                      >
                        <Trash2 size={12} />
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .np-container { max-width: 680px; margin: 0 auto; padding: 0 16px 60px 16px; }
        .np-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; background: #0D1117; border: 1px solid #1E2640; border-radius: 16px; padding: 16px 20px; boxShadow: 0 4px 20px rgba(0, 0, 0, 0.15); }
        .np-header-actions { display: flex; align-items: center; gap: 8px; }
        .np-filters-card { background: #0D1117; border: 1px solid #1E2640; border-radius: 16px; padding: 12px 16px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 12px; }
        .np-filter-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .np-filter-buttons { display: flex; gap: 4px; }
        .np-card { border-radius: 16px; padding: 16px 20px; cursor: pointer; position: relative; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); display: flex; gap: 16px; align-items: flex-start; }
        .np-card-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
        .np-card-actions { display: flex; gap: 6px; }

        @media (max-width: 640px) {
          .np-container { padding: 0 8px 40px 8px; }
          .np-header { flex-direction: column; align-items: stretch; gap: 14px; padding: 14px 16px; }
          .np-header-actions { justify-content: flex-end; }
          .np-filter-row { flex-direction: column; align-items: flex-start; gap: 8px; }
          .np-filter-buttons { width: 100%; overflow-x: auto; white-space: nowrap; padding-bottom: 4px; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
          .np-filter-buttons::-webkit-scrollbar { display: none; }
          .np-card { padding: 12px 14px; gap: 10px; }
          .np-card-footer { flex-direction: column; align-items: stretch; gap: 8px; }
          .np-card-actions { width: 100%; justify-content: flex-end; }
        }
      `}</style>
    </div>
  );
};

export default NotificationsPage;
