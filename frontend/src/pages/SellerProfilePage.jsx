import React from 'react';
import { useQuery } from 'convex/react';
import { api } from 'convex-api';
import { useAuth } from '../context/AuthContext.jsx';

const truncateAddr = (addr) => {
  if (!addr || addr.length <= 8) return addr || '';
  return addr.slice(0, 4) + '...' + addr.slice(-3);
};

const SellerProfilePage = ({ sellerId, setPage }) => {
  const { user: currentUser } = useAuth();
  const seller = useQuery(api.users.get, sellerId ? { id: sellerId } : "skip");

  if (!seller) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
        <p style={{ fontSize: '14px', color: 'var(--muted)' }}>Loading trader profile...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const fullName = seller.fullName || seller.username || 'Trader';
  const initials = fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const joinDate = seller.joinedAt ? new Date(seller.joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently';

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
          width: '80px', height: '80px', borderRadius: '50%', background: 'var(--teal)', color: '#04342C',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '24px',
          margin: '0 auto 16px',
        }}>
          {initials}
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>{fullName}</h2>
        <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '8px' }}>@{seller.username || 'user'}</p>
        <p style={{ fontSize: '13px', color: 'var(--teal)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
          {seller.id || 'ES-XXXXXXX'}
        </p>
        <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
          {seller.country ? `📍 ${seller.country}` : ''} {seller.city ? `, ${seller.city}` : ''} · Joined {joinDate}
        </p>

        {/* Rating */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '16px', padding: '12px', background: 'var(--surface2)', borderRadius: '12px' }}>
          <i className="ti ti-star-filled" style={{ fontSize: '20px', color: 'var(--teal)' }}></i>
          <span style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text)' }}>{(seller.averageRating ?? 5.0).toFixed(1)}</span>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>({seller.total_ratings || 0} reviews)</span>
        </div>
      </div>

      {/* Active Listings placeholder */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px',
        padding: '20px', marginBottom: '80px',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>Active Listings</h3>
        <div style={{ textAlign: 'center', padding: '32px 16px' }}>
          <i className="ti ti-list" style={{ fontSize: '32px', color: 'var(--muted)', opacity: 0.3, display: 'block', marginBottom: '8px' }}></i>
          <p style={{ fontSize: '13px', color: 'var(--muted)' }}>No active listings from this trader</p>
        </div>
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
