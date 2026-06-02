import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Trophy, Award, TrendingUp, Users, Search, ChevronRight } from 'lucide-react';

const Leaderboard = ({ user }) => {
  const [category, setCategory] = useState('trades'); // 'trades' | 'volume' | 'referrals'
  const [leaderboardData, setLeaderboardData] = useState(undefined);

  const categories = [
    { id: 'trades', label: 'Top Traders', icon: <TrendingUp size={18} />, color: '#00d4a0' },
    { id: 'volume', label: 'Top Volume', icon: <Award size={18} />, color: '#3b82f6' },
    { id: 'referrals', label: 'Top Referrers', icon: <Users size={18} />, color: '#f5c518' },
  ];

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLeaderboardData(undefined);
      let query = supabase.from('users').select('*');
      
      if (category === 'trades') {
        query = query.order('total_trades', { ascending: false });
      } else if (category === 'volume') {
        // Mock volume sorting using total_trades or a dedicated field if available
        query = query.order('total_trades', { ascending: false });
      } else if (category === 'referrals') {
        query = query.order('successful_invites', { ascending: false });
      }

      const { data } = await query.limit(10);
      
      if (data) {
        setLeaderboardData(data.map((u, i) => ({
          id: u.id,
          username: u.username,
          rank: i + 1,
          avatar: u.selected_avatar,
          isVerified: u.is_verified_trader,
          badge: u.badge_level,
          score: category === 'trades' ? u.total_trades : (category === 'volume' ? u.total_trades * 10 : u.successful_invites)
        })));
      } else {
        setLeaderboardData([]);
      }
    };

    fetchLeaderboard();
  }, [category]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      
      {/* ─── HEADER SECTION ───────────────────────────────────── */}
      <div className="card" style={{ padding: '24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-50px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(245, 197, 24, 0.1) 0%, transparent 70%)', filter: 'blur(20px)', pointerEvents: 'none' }} />
        <Trophy size={48} style={{ color: '#f5c518', marginBottom: '12px' }} />
        <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#fff', marginBottom: '4px' }}>Monthly Hall of Fame</h2>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>Compete for the top spots and win exclusive rewards!</p>
      </div>

      {/* ─── CATEGORY SELECTOR ─────────────────────────────────── */}
      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '16px', padding: '6px', gap: '6px' }}>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              background: category === cat.id ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: category === cat.id ? cat.color : 'rgba(255,255,255,0.5)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* ─── LEADERBOARD LIST ───────────────────────────────────── */}
      <div className="card" style={{ padding: '8px' }}>
        {leaderboardData === undefined ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Loading rankings...</div>
        ) : leaderboardData.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>No data available for this month.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {leaderboardData.map((entry, i) => {
              const isCurrentUser = entry.id === user?.id;
              
              return (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    borderRadius: '12px',
                    background: isCurrentUser ? 'rgba(245, 197, 24, 0.08)' : 'transparent',
                    border: isCurrentUser ? '1px solid rgba(245, 197, 24, 0.2)' : '1px solid transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ 
                    width: '32px', 
                    fontSize: '18px', 
                    fontWeight: 900, 
                    color: i === 0 ? '#f5c518' : (i === 1 ? '#cbd5e1' : (i === 2 ? '#92400e' : 'rgba(255,255,255,0.3)')),
                    textAlign: 'center'
                  }}>
                    {i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : entry.rank))}
                  </div>
                  
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <img 
                      src={entry.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${entry.username}`} 
                      alt="Avatar" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      @{entry.username}
                      {entry.isVerified && <span style={{ color: '#00d4a0', fontSize: '12px' }}>✅</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {entry.badge ? `${entry.badge} Trader` : 'Newcomer'}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: categories.find(c => c.id === category).color }}>
                      {entry.score}
                    </div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                      {category === 'trades' ? 'Trades' : (category === 'volume' ? 'Volume' : 'Referrals')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── REWARDS INFO ─────────────────────────────────────── */}
      <div className="card" style={{ padding: '20px', background: 'rgba(245, 197, 24, 0.03)', border: '1px dashed rgba(245, 197, 24, 0.2)' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#f5c518', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🎁 Monthly Top 3 Rewards
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'flex', justifyContent: 'space-between' }}>
            <span>🥇 1st Place</span>
            <span style={{ fontWeight: 700, color: '#fff' }}>"Top Trader" Badge + 500 Pts</span>
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'flex', justifyContent: 'space-between' }}>
            <span>🥈 2nd Place</span>
            <span style={{ fontWeight: 700, color: '#fff' }}>300 Loyalty Points</span>
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'flex', justifyContent: 'space-between' }}>
            <span>🥉 3rd Place</span>
            <span style={{ fontWeight: 700, color: '#fff' }}>150 Loyalty Points</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Leaderboard;
