import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Info, AlertTriangle, MessageSquare, ShieldCheck } from 'lucide-react';

const NotificationBell = ({ user }) => {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Fetch initial notifications
    const fetchNotifications = async () => {
      // Mocked for Convex migration
      const data = [];
      
      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    };

    fetchNotifications();
  }, [user]);

  const markAsRead = async (id) => {
    // Mocked for Convex migration
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    // Mocked for Convex migration
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const deleteNotification = async (id) => {
    // Mocked for Convex migration
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type) => {
    switch (type) {
      case 'deposit': return <Info size={16} className="text-teal" />;
      case 'withdrawal': return <Info size={16} className="text-gold" />;
      case 'trade': return <MessageSquare size={16} className="text-blue" />;
      case 'kyc': return <ShieldCheck size={16} className="text-teal" />;
      case 'security': return <AlertTriangle size={16} className="text-red" />;
      default: return <Bell size={16} className="text-muted" />;
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          background: 'none',
          border: 'none',
          color: unreadCount > 0 ? '#f5c518' : '#8b92a8',
          cursor: 'pointer',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'all 0.2s'
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            background: '#ef4444',
            color: 'white',
            borderRadius: '50%',
            width: '16px',
            height: '16px',
            fontSize: '10px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #0d1117'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div 
            onClick={() => setShowDropdown(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 1000 }}
          />
          <div style={{
            position: 'absolute',
            top: '44px',
            right: '0',
            width: '320px',
            background: '#111318',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            zIndex: 1001,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            maxHeight: '480px'
          }}>
            <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800 }}>Notifications</h4>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  style={{ background: 'none', border: 'none', color: '#f5c518', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#4e5567' }}>
                  <Bell size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
                  <p style={{ fontSize: '13px' }}>No notifications yet</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div 
                    key={n.id}
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      background: n.is_read ? 'transparent' : 'rgba(245,197,24,0.03)',
                      display: 'flex',
                      gap: '12px',
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                    onClick={() => markAsRead(n.id)}
                  >
                    <div style={{ marginTop: '2px' }}>{getIcon(n.type)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: n.is_read ? 600 : 800, color: '#fff', marginBottom: '2px' }}>{n.title}</div>
                      <div style={{ fontSize: '12px', color: '#8b92a8', lineHeight: 1.4 }}>{n.body}</div>
                      <div style={{ fontSize: '10px', color: '#4e5567', marginTop: '6px' }}>
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    {!n.is_read && (
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f5c518', marginTop: '6px' }} />
                    )}
                  </div>
                ))
              )}
            </div>

            <div style={{ padding: '12px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <button 
                onClick={() => setShowDropdown(false)}
                style={{ background: 'none', border: 'none', color: '#8b92a8', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
