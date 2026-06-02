import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Copy, Share2, Users, DollarSign, Clock, CheckCircle, Info, MessageCircle, Send } from 'lucide-react';

const InviteEarn = ({ user, systemSettings }) => {
  const [inviteStats, setInviteStats] = useState(null);
  
  const isLive = systemSettings?.invite_earn_status === "active";
  const rewardAmount = systemSettings?.invite_reward_amount || 0.50;

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const { data: userData } = await supabase.from('users').select('referral_code, total_invites, successful_invites, pending_invites, total_invite_earnings, invite_earnings_month').eq('id', user.id).single();
      const { data: referrals } = await supabase.from('invite_rewards').select('*, invited:users!invited_user_id(username)').eq('inviter_user_id', user.id);
      
      if (userData) {
        setInviteStats({
          referralCode: userData.referral_code,
          totalInvited: userData.total_invites,
          activeFriends: userData.successful_invites,
          pendingFriends: userData.pending_invites,
          totalEarned: userData.total_invite_earnings,
          earningsMonth: userData.invite_earnings_month,
          referralList: referrals?.map(r => ({
            username: r.invited?.username,
            date: r.invite_date,
            status: r.reward_status,
            earned: r.reward_status === 'paid' ? r.reward_amount : 0
          })) || []
        });
      }
    };
    fetchStats();

    const sub = supabase.channel('invite-stats').on('postgres_changes', { event: '*', schema: 'public', table: 'invite_rewards', filter: `inviter_user_id=eq.${user.id}` }, fetchStats).subscribe();
    return () => sub.unsubscribe();
  }, [user]);

  const handleCopy = () => {
    if (inviteStats?.referralCode) {
      navigator.clipboard.writeText(inviteStats.referralCode);
      alert("Referral code copied to clipboard!");
    }
  };

  const shareText = `Join EthioSwap and start trading! Use my referral code: ${inviteStats?.referralCode}`;
  const shareUrl = window.location.origin;

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
  };

  const handleTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      
      {/* ─── HEADER SECTION ───────────────────────────────────── */}
      <div className="card" style={{ padding: '24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(245, 197, 24, 0.1) 0%, transparent 70%)', filter: 'blur(20px)' }} />
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(245, 197, 24, 0.1)', color: '#f5c518', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={32} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-1)' }}>🤝 INVITE & EARN</h2>
          {isLive ? (
            <p style={{ color: '#00d4a0', fontWeight: 700, fontSize: '15px' }}>Earn ${rewardAmount.toFixed(2)} for every friend! 🎉</p>
          ) : (
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '4px 12px', borderRadius: '99px', fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', border: '1px solid var(--border)' }}>
              🔒 COMING SOON
            </div>
          )}
        </div>

        {!isLive && (
          <div style={{ background: 'rgba(245, 197, 24, 0.05)', border: '1px dashed rgba(245, 197, 24, 0.3)', borderRadius: '16px', padding: '16px', marginBottom: '20px' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#f5c518', marginBottom: '4px' }}>This feature is almost ready!</p>
            <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: '1.5' }}>
              Invite friends and earn ${rewardAmount.toFixed(2)} for every friend who joins & trades
            </p>
          </div>
        )}

        <div style={{ textAlign: 'left', marginBottom: '20px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Your Referral Code</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1, background: 'var(--bg-base)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '14px', fontSize: '18px', fontWeight: 900, color: '#f5c518', letterSpacing: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {inviteStats?.referralCode || '—'}
            </div>
            <button onClick={handleCopy} className="btn btn-gold" style={{ padding: '0 20px', borderRadius: '12px' }}>
              <Copy size={18} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', fontWeight: 600 }}>Share via:</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <button onClick={handleWhatsApp} className="btn" style={{ background: '#25D366', color: '#fff', border: 'none', gap: '6px' }}>
              <MessageCircle size={16} /> WhatsApp
            </button>
            <button onClick={handleTelegram} className="btn" style={{ background: '#0088cc', color: '#fff', border: 'none', gap: '6px' }}>
              <Send size={16} /> Telegram
            </button>
            <button onClick={handleCopy} className="btn btn-ghost" style={{ border: '1px solid var(--border)', gap: '6px' }}>
              <Share2 size={16} /> Copy Link
            </button>
          </div>
        </div>

        {!isLive && (
          <div style={{ marginTop: '20px', padding: '12px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Info size={16} color="#ef4444" />
            <p style={{ fontSize: '11px', color: '#ef4444', textAlign: 'left', fontWeight: 600 }}>
              ⚠️ Rewards activate soon! Start sharing now so you don't miss out when it goes live!
            </p>
          </div>
        )}
      </div>

      {/* ─── STATS SECTION ────────────────────────────────────── */}
      <div className="card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '20px', color: 'var(--text-1)', textTransform: 'uppercase' }}>
          {isLive ? 'Your Earnings' : 'Your Stats (Locked 🔒)'}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div style={{ background: 'var(--bg-base)', borderRadius: '16px', padding: '16px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase' }}>Total Invited</span>
            <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-1)' }}>{inviteStats?.totalInvited || 0} <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>friends</span></div>
          </div>
          <div style={{ background: 'var(--bg-base)', borderRadius: '16px', padding: '16px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase' }}>Active Friends</span>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#00d4a0' }}>{inviteStats?.activeFriends || 0}</div>
          </div>
          <div style={{ background: 'var(--bg-base)', borderRadius: '16px', padding: '16px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase' }}>Pending Rewards</span>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#f5c518' }}>${((inviteStats?.pendingFriends || 0) * rewardAmount).toFixed(2)}</div>
          </div>
          <div style={{ background: 'var(--bg-base)', borderRadius: '16px', padding: '16px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase' }}>Total Earned</span>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#00d4a0' }}>${(inviteStats?.totalEarned || 0).toFixed(2)} 💰</div>
          </div>
        </div>

        {isLive && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>This Month:</span>
              <span style={{ fontSize: '14px', fontWeight: 700 }}>${(inviteStats?.earningsMonth || 0).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>Paid to Balance:</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#00d4a0' }}>${(inviteStats?.totalEarned || 0).toFixed(2)} ✅</span>
            </div>
          </div>
        )}

        <button onClick={handleWhatsApp} className="btn btn-gold btn-full" style={{ marginTop: '20px' }}>
          Invite friends now →
        </button>
      </div>

      {/* ─── REFERRALS LIST ───────────────────────────────────── */}
      {isLive && inviteStats?.referralList?.length > 0 && (
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '20px', color: 'var(--text-1)', textTransform: 'uppercase' }}>Your Referrals List</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {inviteStats.referralList.map((ref, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-base)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                    👤
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>{ref.username}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{new Date(ref.date).toLocaleDateString()}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                    {ref.status === 'paid' ? (
                      <span style={{ color: '#00d4a0', fontSize: '11px', fontWeight: 700 }}>✅ Active</span>
                    ) : (
                      <span style={{ color: '#f5c518', fontSize: '11px', fontWeight: 700 }}>⏳ Pending</span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: ref.status === 'paid' ? '#00d4a0' : 'var(--text-3)' }}>
                    {ref.status === 'paid' ? `+$${ref.earned.toFixed(2)}` : `$0.00`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── HOW IT WORKS ─────────────────────────────────────── */}
      <div className="card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '20px', color: 'var(--text-1)', textTransform: 'uppercase' }}>How it Works:</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { step: '1️⃣', text: 'Share your code' },
            { step: '2️⃣', text: 'Friend signs up with your code' },
            { step: '3️⃣', text: 'Friend completes first trade' },
            { step: '4️⃣', text: `You get $${rewardAmount.toFixed(2)} instantly! 💰` },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ fontSize: '18px' }}>{item.step}</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-2)' }}>{item.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InviteEarn;
