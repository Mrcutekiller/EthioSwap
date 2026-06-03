import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Megaphone, X, ChevronRight, Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

const Announcements = ({ user }) => {
  const [announcement, setAnnouncement] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const { i18n } = useTranslation();

  useEffect(() => {
    const fetchLatest = async () => {
      const { data } = // await supabase
        .from('announcements')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data) {
        // Check if user has already read this
        if (user) {
          const { data: read } = // await supabase
            .from('announcement_reads')
            .select('*')
            .eq('announcement_id', data.id)
            .eq('user_id', user.id)
            .single();
          
          if (!read) setAnnouncement(data);
        } else {
          setAnnouncement(data);
        }
      }
    };
    fetchLatest();
  }, [user]);

  const handleDismiss = async () => {
    setDismissed(true);
    if (user && announcement) {
      // await // supabase.from('announcement_reads').insert([{
        announcement_id: announcement.id,
        user_id: user.id
      }]);
    }
  };

  if (!announcement || dismissed) return null;

  const isAmharic = i18n.language === 'am';
  const title = isAmharic ? announcement.title_am : announcement.title_en;
  const body = isAmharic ? announcement.body_am : announcement.body_en;

  const colors = {
    info: { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.2)', icon: <Info size={18} color="#3b82f6" />, text: '#3b82f6' },
    warning: { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)', icon: <AlertTriangle size={18} color="#f59e0b" />, text: '#f59e0b' },
    success: { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)', icon: <CheckCircle size={18} color="#10b981" />, text: '#10b981' },
    urgent: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)', icon: <AlertCircle size={18} color="#ef4444" />, text: '#ef4444' },
  };

  const style = colors[announcement.type] || colors.info;

  return (
    <div className="fade-in-1" style={{ 
      background: style.bg, 
      border: `1px solid ${style.border}`, 
      borderRadius: '16px', 
      padding: '16px', 
      marginBottom: '20px',
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
      position: 'relative'
    }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {style.icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', marginBottom: '2px' }}>{title}</div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>{body}</div>
      </div>
      <button onClick={handleDismiss} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '4px' }}>
        <X size={18} />
      </button>
    </div>
  );
};

export default Announcements;
