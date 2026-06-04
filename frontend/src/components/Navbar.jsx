import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Wallet, Shield, Key, LogOut, MessageSquare, ListCollapse, ArrowLeftRight } from 'lucide-react';
import NotificationBell from './NotificationBell.jsx';

const Navbar = () => {
  const { user, wallet, activeTab, setActiveTab, logout, switchUser, trades, systemSettings } = useAuth();

  if (!user) return null;

  const activeTradesCount = trades.filter(t => t.status === 'payment_pending' || t.status === 'paid' || t.status === 'disputed').length;

  const getKycBadge = () => {
    switch (user.kycStatus) {
      case 'approved':
        return <span className="badge badge-success"><Shield size={12} /> Verified</span>;
      case 'pending':
        return <span className="badge badge-pending"><Shield size={12} /> Pending Review</span>;
      default:
        return <span className="badge badge-danger"><Shield size={12} /> KYC Required</span>;
    }
  };

  return (
    <header className="glass-panel" style={{ borderRadius: '0px 0px 16px 16px', padding: '1rem 2rem', marginBottom: '2rem', borderTop: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Brand Logo & Tagline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #D4AF37, #10B981)',
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '800',
            color: '#080A10',
            fontSize: '1.25rem',
            boxShadow: '0 0 20px rgba(212, 175, 55, 0.2)'
          }}>
            ES
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '700', lineHeight: '1.2' }}>EthioSwap</h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>P2P Escrow Platform</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav style={{ display: 'flex', gap: '0.5rem' }}>
          {user.role !== 'admin' && (
            <>
              <button
                onClick={() => setActiveTab('listings')}
                className={`btn btn-secondary ${activeTab === 'listings' ? 'active-tab' : ''}`}
                style={{
                  background: activeTab === 'listings' ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                  borderColor: activeTab === 'listings' ? 'var(--primary)' : 'transparent'
                }}
              >
                <ArrowLeftRight size={16} /> Listings
              </button>
              <button
                onClick={() => setActiveTab('wallet')}
                className={`btn btn-secondary ${activeTab === 'wallet' ? 'active-tab' : ''}`}
                style={{
                  background: activeTab === 'wallet' ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                  borderColor: activeTab === 'wallet' ? 'var(--primary)' : 'transparent'
                }}
              >
                <Wallet size={16} /> Wallet
              </button>
              <button
                onClick={() => setActiveTab('trades')}
                className={`btn btn-secondary ${activeTab === 'trades' ? 'active-tab' : ''}`}
                style={{
                  background: activeTab === 'trades' ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                  borderColor: activeTab === 'trades' ? 'var(--primary)' : 'transparent',
                  position: 'relative'
                }}
              >
                <MessageSquare size={16} /> My Trades
                {activeTradesCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    background: 'var(--accent)',
                    color: 'white',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    fontSize: '0.7rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700'
                  }}>
                    {activeTradesCount}
                  </span>
                )}
              </button>
            </>
          )}

          {user.role === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`btn btn-secondary ${activeTab === 'admin' ? 'active-tab' : ''}`}
              style={{
                background: activeTab === 'admin' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                borderColor: activeTab === 'admin' ? 'var(--secondary)' : 'transparent'
              }}
            >
              <Key size={16} /> Admin Panel
            </button>
          )}
        </nav>

        {/* User Balance & Status Summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {wallet && user.role !== 'admin' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem', fontWeight: '600', color: 'var(--secondary)' }}>
                <Wallet size={14} /> ${(wallet.ethBalance ?? 0).toFixed(2)} USD
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                ≈ {Math.round(wallet.ethBalance * (systemSettings?.etbRatePerDollar ?? 190.0)).toLocaleString()} ETB
              </span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.4rem 0.8rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>@{user.username}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user.role}</span>
            </div>
            {getKycBadge()}
          </div>

          {/* Quick Demo Swapper */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(212,175,55,0.05)', padding: '0.3rem 0.6rem', borderRadius: '10px', border: '1px solid rgba(212,175,55,0.15)' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--primary)', marginRight: '0.2rem' }}>DEMO:</span>
            <button onClick={() => switchUser('buyer')} className="btn btn-secondary" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', background: user.username === 'buyer' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: user.username === 'buyer' ? '#080A10' : 'white' }}>Buyer</button>
            <button onClick={() => switchUser('seller')} className="btn btn-secondary" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', background: user.username === 'seller' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: user.username === 'seller' ? '#080A10' : 'white' }}>Seller</button>
            <button onClick={() => switchUser('admin')} className="btn btn-secondary" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', background: user.username === 'admin' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: user.username === 'admin' ? '#080A10' : 'white' }}>Admin</button>
          </div>

          <NotificationBell user={user} />

          <button onClick={logout} className="btn btn-secondary" style={{ padding: '0.5rem', color: 'var(--accent)' }} title="Logout">
            <LogOut size={16} />
          </button>
        </div>

      </div>
    </header>
  );
};

export default Navbar;

