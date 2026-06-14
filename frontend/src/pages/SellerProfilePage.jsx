import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase';

const truncateAddr = (addr) => {
  if (!addr || addr.length <= 8) return addr || '';
  return addr.slice(0, 4) + '...' + addr.slice(-3);
};

const DEFAULT_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bg1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="100%" stop-color="#06b6d4" />
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="50" fill="url(#bg1)" />
  <circle cx="50" cy="40" r="18" fill="#f8fafc" />
  <path d="M 25 85 C 25 72, 35 68, 50 68 C 65 68, 75 72, 75 85 Z" fill="#1e293b" />
</svg>`;

const getAvatarUrl = (svgString) => {
  if (!svgString) return '';
  if (svgString.startsWith('data:')) return svgString;
  if (svgString.startsWith('http://') || svgString.startsWith('https://')) return svgString;
  try {
    const base64 = window.btoa(unescape(encodeURIComponent(svgString)));
    return `data:image/svg+xml;base64,${base64}`;
  } catch (e) {
    return '';
  }
};

const SellerProfilePage = ({ sellerId, setPage }) => {
  const { user: currentUser } = useAuth();
  const [seller, setSeller] = useState(null);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    if (!sellerId) return;
    supabase.from('users').select('*').eq('id', sellerId).single().then(({ data }) => setSeller(data));
    supabase.from('reviews').select('*').eq('user_id', sellerId).order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setReviews(data);
    });
  }, [sellerId]);

  if (!seller) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
        <p style={{ fontSize: '14px', color: 'var(--muted)' }}>Loading trader profile...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const fullName = seller.full_name || seller.username || 'Trader';
  const joinDate = seller.joined_at ? new Date(seller.joined_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently';
  const userAvatar = seller.profile_pic || getAvatarUrl(DEFAULT_AVATAR_SVG);

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      {/* Back Button */}
      <button
        onClick={() => setPage('p2p')}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px',
          background: 'none', border: 'none', color: 'var(--teal)', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
        }}
      >
        <i className="ti ti-arrow-left" style={{ fontSize: '16px' }}></i>
        Back to Trade
      </button>

      {/* Profile Card */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px',
        padding: '24px', textAlign: 'center', marginBottom: '20px',
      }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden',
          border: '2px solid var(--teal)',
          margin: '0 auto 16px',
        }}>
          <img
            src={userAvatar}
            alt={seller.username}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>{fullName}</h2>
        <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '8px' }}>@{seller.username || 'user'}</p>
        <p style={{ fontSize: '13px', color: 'var(--teal)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
          #{seller.numeric_id || '0000'}
        </p>
        <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
          {seller.country ? `📍 ${seller.country}` : ''} {seller.city ? `, ${seller.city}` : ''} · Joined {joinDate}
        </p>

        {/* Rating */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '16px', padding: '12px', background: 'var(--surface2)', borderRadius: '12px' }}>
          <i className="ti ti-star-filled" style={{ fontSize: '20px', color: 'var(--teal)' }}></i>
          <span style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text)' }}>{(seller.avg_rating ?? 5.0).toFixed(1)}</span>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>({seller.total_ratings || 0} reviews)</span>
        </div>
      </div>

      {/* Trade Stats */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px',
        padding: '20px', marginBottom: '20px',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>Trade Statistics</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ padding: '12px', background: 'var(--surface2)', borderRadius: '12px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>Total Trades</p>
            <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>{seller.trade_count || 0}</p>
          </div>
          <div style={{ padding: '12px', background: 'var(--surface2)', borderRadius: '12px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>Total Volume</p>
            <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>${(seller.total_volume || 0).toLocaleString()}</p>
          </div>
          <div style={{ padding: '12px', background: 'var(--surface2)', borderRadius: '12px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>Avg Rating</p>
            <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--gold)' }}>⭐ {(seller.avg_rating ?? 5.0).toFixed(1)}</p>
          </div>
          <div style={{ padding: '12px', background: 'var(--surface2)', borderRadius: '12px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>Member Since</p>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{joinDate}</p>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px',
        padding: '20px', marginBottom: '80px',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>Reviews</h3>
        {reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <i className="ti ti-message" style={{ fontSize: '32px', color: 'var(--muted)', opacity: 0.3, display: 'block', marginBottom: '8px' }}></i>
            <p style={{ fontSize: '13px', color: 'var(--muted)' }}>No reviews yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {reviews.map((review) => (
              <div key={review.id} style={{ padding: '12px', background: 'var(--surface2)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} style={{ color: i < (review.rating || 5) ? '#F5A623' : '#3a3a3a', fontSize: '14px' }}>★</span>
                  ))}
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5 }}>{review.content}</p>
                <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>
                  {review.created_at ? new Date(review.created_at).toLocaleDateString() : 'Recently'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fixed Start Trade Button */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px',
        background: 'rgba(11,14,26,0.95)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border)', zIndex: 50,
      }}>
        <button
          style={{
            width: '100%', maxWidth: '640px', margin: '0 auto', display: 'block',
            padding: '14px', height: '48px',
            background: 'var(--teal)', color: '#04342C',
            borderRadius: '12px', fontSize: '15px', fontWeight: 600,
            border: 'none', cursor: 'pointer',
          }}
        >
          Start Trade
        </button>
      </div>
    </div>
  );
};

export default SellerProfilePage;
