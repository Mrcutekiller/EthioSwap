import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';

/* ─── Service catalogue ─────────────────────────────────────────── */
const PLATFORMS = [
  { id: 'telegram', label: 'Telegram', emoji: '✈️', color: '#2AABEE', glow: 'rgba(42,171,238,0.25)' },
  { id: 'tiktok',   label: 'TikTok',   emoji: '🎵', color: '#FF0050', glow: 'rgba(255,0,80,0.22)'   },
  { id: 'instagram',label: 'Instagram',emoji: '📸', color: '#E1306C', glow: 'rgba(225,48,108,0.22)' },
];

const SERVICES = {
  telegram: [
    {
      id: 'tg_premium_1m',
      type: 'premium',
      label: 'Telegram Premium',
      subtitle: '1 Month',
      icon: '⭐',
      price_usd: 4.99,
      description: 'Full Telegram Premium for 1 month — no ads, larger uploads, exclusive stickers & more.',
      inputType: 'username',
      inputPlaceholder: '@your_telegram_username',
    },
    {
      id: 'tg_premium_3m',
      type: 'premium',
      label: 'Telegram Premium',
      subtitle: '3 Months',
      icon: '⭐⭐',
      price_usd: 13.99,
      description: 'Full Telegram Premium for 3 months — best value for heavy users.',
      inputType: 'username',
      inputPlaceholder: '@your_telegram_username',
    },
    {
      id: 'tg_members',
      type: 'members',
      label: 'Channel Members',
      subtitle: 'Real & Active',
      icon: '👥',
      price_usd: 2.5,
      unit: '1,000',
      minQty: 1,
      maxQty: 100,
      description: 'Add real-looking members to your Telegram channel or group.',
      inputType: 'link',
      inputPlaceholder: 'https://t.me/your_channel',
    },
    {
      id: 'tg_views',
      type: 'views',
      label: 'Post Views',
      subtitle: 'Fast Delivery',
      icon: '👁️',
      price_usd: 0.8,
      unit: '1,000',
      minQty: 1,
      maxQty: 500,
      description: 'Boost your Telegram posts with high-quality views.',
      inputType: 'link',
      inputPlaceholder: 'https://t.me/your_channel/123',
    },
  ],
  tiktok: [
    {
      id: 'tt_views',
      type: 'views',
      label: 'Video Views',
      subtitle: 'Fast Delivery',
      icon: '▶️',
      price_usd: 0.5,
      unit: '1,000',
      minQty: 1,
      maxQty: 1000,
      description: 'Skyrocket your TikTok video views to boost the algorithm.',
      inputType: 'link',
      inputPlaceholder: 'https://www.tiktok.com/@user/video/...',
    },
    {
      id: 'tt_followers',
      type: 'followers',
      label: 'Followers',
      subtitle: 'Real-Looking',
      icon: '❤️',
      price_usd: 3.0,
      unit: '1,000',
      minQty: 1,
      maxQty: 200,
      description: 'Grow your TikTok following with real-looking accounts.',
      inputType: 'link',
      inputPlaceholder: 'https://www.tiktok.com/@yourusername',
    },
    {
      id: 'tt_likes',
      type: 'likes',
      label: 'Video Likes',
      subtitle: 'High Quality',
      icon: '👍',
      price_usd: 1.0,
      unit: '1,000',
      minQty: 1,
      maxQty: 500,
      description: 'Get more likes on your TikTok videos instantly.',
      inputType: 'link',
      inputPlaceholder: 'https://www.tiktok.com/@user/video/...',
    },
    {
      id: 'tt_comments',
      type: 'comments',
      label: 'Comments',
      subtitle: 'Custom Text',
      icon: '💬',
      price_usd: 5.0,
      unit: '10',
      minQty: 1,
      maxQty: 100,
      description: 'Get custom comments on your TikTok post (you provide the text).',
      inputType: 'link',
      inputPlaceholder: 'https://www.tiktok.com/@user/video/...',
      hasComment: true,
    },
  ],
  instagram: [
    {
      id: 'ig_views',
      type: 'views',
      label: 'Reel / Post Views',
      subtitle: 'Instant Start',
      icon: '▶️',
      price_usd: 0.6,
      unit: '1,000',
      minQty: 1,
      maxQty: 1000,
      description: 'Boost Instagram Reels or post views to go viral faster.',
      inputType: 'link',
      inputPlaceholder: 'https://www.instagram.com/p/abc123/',
    },
    {
      id: 'ig_followers',
      type: 'followers',
      label: 'Followers',
      subtitle: 'Real-Looking',
      icon: '❤️',
      price_usd: 3.5,
      unit: '1,000',
      minQty: 1,
      maxQty: 200,
      description: 'Grow your Instagram audience with quality followers.',
      inputType: 'link',
      inputPlaceholder: 'https://www.instagram.com/yourusername/',
    },
    {
      id: 'ig_likes',
      type: 'likes',
      label: 'Post Likes',
      subtitle: 'High Retention',
      icon: '👍',
      price_usd: 1.2,
      unit: '1,000',
      minQty: 1,
      maxQty: 500,
      description: 'Increase likes on any Instagram post or Reel.',
      inputType: 'link',
      inputPlaceholder: 'https://www.instagram.com/p/abc123/',
    },
    {
      id: 'ig_comments',
      type: 'comments',
      label: 'Comments',
      subtitle: 'Custom Text',
      icon: '💬',
      price_usd: 6.0,
      unit: '10',
      minQty: 1,
      maxQty: 100,
      description: 'Add custom comments to any Instagram post.',
      inputType: 'link',
      inputPlaceholder: 'https://www.instagram.com/p/abc123/',
      hasComment: true,
    },
  ],
};

/* ─── Helpers ────────────────────────────────────────────────────── */
const USD_TO_ETB = 145;
const formatUSD  = (n) => `$${Number(n).toFixed(2)}`;
const formatETB  = (n) => `${Math.round(n).toLocaleString()} ETB`;

/* ─── Sub-components ─────────────────────────────────────────────── */

const PlatformTab = ({ platform, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 20px',
      borderRadius: '12px',
      border: active ? `1.5px solid ${platform.color}` : '1.5px solid rgba(255,255,255,0.07)',
      background: active ? `${platform.color}18` : 'rgba(255,255,255,0.03)',
      color: active ? platform.color : '#8A9BB8',
      fontWeight: active ? 700 : 500,
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      boxShadow: active ? `0 0 18px ${platform.glow}` : 'none',
    }}
  >
    <span style={{ fontSize: '18px' }}>{platform.emoji}</span>
    {platform.label}
  </button>
);

const ServiceCard = ({ service, platform, onClick }) => (
  <div
    onClick={() => onClick(service)}
    style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '18px',
      padding: '24px',
      cursor: 'pointer',
      transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
      position: 'relative',
      overflow: 'hidden',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.border = `1px solid ${platform.color}55`;
      e.currentTarget.style.boxShadow = `0 8px 32px ${platform.glow}`;
      e.currentTarget.style.transform = 'translateY(-3px)';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.border = '1px solid rgba(255,255,255,0.07)';
      e.currentTarget.style.boxShadow = 'none';
      e.currentTarget.style.transform = 'translateY(0)';
    }}
  >
    <div style={{
      position: 'absolute', top: '-40px', right: '-40px',
      width: '120px', height: '120px', borderRadius: '50%',
      background: platform.glow, filter: 'blur(40px)', pointerEvents: 'none',
    }} />

    <div style={{ fontSize: '32px', marginBottom: '12px' }}>{service.icon}</div>
    <div style={{ fontWeight: 700, fontSize: '16px', color: '#fff', marginBottom: '2px' }}>{service.label}</div>
    <div style={{ fontSize: '12px', color: '#8A9BB8', marginBottom: '16px' }}>{service.subtitle}</div>
    <div style={{ fontSize: '13px', color: 'rgba(200,210,230,0.7)', lineHeight: 1.5, marginBottom: '20px' }}>
      {service.description}
    </div>

    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: '18px', fontWeight: 800, color: platform.color }}>
          {formatUSD(service.price_usd)}
          {service.unit && <span style={{ fontSize: '12px', color: '#8A9BB8', fontWeight: 500 }}>/{service.unit}</span>}
        </div>
        <div style={{ fontSize: '11px', color: '#8A9BB8' }}>
          ≈ {formatETB(service.price_usd * USD_TO_ETB)}{service.unit ? `/${service.unit}` : ''}
        </div>
      </div>
      <button style={{
        background: `linear-gradient(135deg, ${platform.color}, ${platform.color}cc)`,
        color: '#fff', border: 'none', borderRadius: '10px',
        padding: '8px 20px', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
      }}>
        Order →
      </button>
    </div>
  </div>
);

const OrderModal = ({ service, platform, onClose, onSubmit, loading }) => {
  const [qty, setQty]         = useState(service.minQty || 1);
  const [target, setTarget]   = useState('');
  const [comment, setComment] = useState('');
  const [payMethod, setPayMethod] = useState('wallet');

  const totalUSD = service.unit ? service.price_usd * qty : service.price_usd;
  const totalETB = Math.round(totalUSD * USD_TO_ETB);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ service, qty, target, comment, payMethod, totalUSD, totalETB });
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0D1117', border: `1px solid ${platform.color}44`,
          borderRadius: '24px', padding: '32px', maxWidth: '480px', width: '100%',
          boxShadow: `0 24px 80px ${platform.glow}, 0 0 0 1px ${platform.color}22`,
          position: 'relative', overflowY: 'auto', maxHeight: '90vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'none', border: 'none', color: '#8A9BB8',
            fontSize: '20px', cursor: 'pointer',
          }}
        >✕</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <span style={{ fontSize: '32px' }}>{service.icon}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '18px', color: '#fff' }}>{service.label}</div>
            <div style={{ fontSize: '13px', color: platform.color }}>{platform.label} • {service.subtitle}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#8A9BB8', display: 'block', marginBottom: '6px' }}>
              {service.inputType === 'username' ? 'Telegram Username' : 'URL / Link'}
            </label>
            <input
              required
              value={target}
              onChange={e => setTarget(e.target.value)}
              placeholder={service.inputPlaceholder}
              style={{
                width: '100%', padding: '12px 14px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', color: '#fff', fontSize: '14px', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {service.unit && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#8A9BB8', display: 'block', marginBottom: '6px' }}>
                Quantity (units of {service.unit})
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button type="button" onClick={() => setQty(q => Math.max(service.minQty || 1, q - 1))}
                  style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '20px', cursor: 'pointer' }}>−</button>
                <input
                  type="number"
                  min={service.minQty || 1}
                  max={service.maxQty || 999}
                  value={qty}
                  onChange={e => setQty(Math.max(service.minQty || 1, Math.min(service.maxQty || 999, Number(e.target.value))))}
                  style={{
                    flex: 1, padding: '10px', textAlign: 'center',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px', color: '#fff', fontSize: '16px', fontWeight: 700, outline: 'none',
                  }}
                />
                <button type="button" onClick={() => setQty(q => Math.min(service.maxQty || 999, q + 1))}
                  style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '20px', cursor: 'pointer' }}>+</button>
              </div>
              <div style={{ fontSize: '11px', color: '#8A9BB8', marginTop: '6px' }}>
                {(qty * parseInt(service.unit.replace(/,/g, ''))).toLocaleString()} {service.type} total
              </div>
            </div>
          )}

          {service.hasComment && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#8A9BB8', display: 'block', marginBottom: '6px' }}>
                Comment Text (one per line)
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Enter your custom comment(s)..."
                style={{
                  width: '100%', padding: '12px 14px', resize: 'none',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px', color: '#fff', fontSize: '13px', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#8A9BB8', display: 'block', marginBottom: '8px' }}>
              Payment Method
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[{ id: 'wallet', label: '💰 USDT Wallet', desc: 'From your balance' }, { id: 'telebirr', label: '📱 Telebirr / CBE', desc: 'Pay in ETB' }].map(m => (
                <button key={m.id} type="button"
                  onClick={() => setPayMethod(m.id)}
                  style={{
                    flex: 1, padding: '10px 12px', borderRadius: '10px',
                    border: payMethod === m.id ? `1.5px solid ${platform.color}` : '1px solid rgba(255,255,255,0.08)',
                    background: payMethod === m.id ? `${platform.color}18` : 'rgba(255,255,255,0.03)',
                    color: payMethod === m.id ? platform.color : '#8A9BB8',
                    cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                    textAlign: 'left',
                  }}
                >
                  <div>{m.label}</div>
                  <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '2px' }}>{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '12px', padding: '14px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: '13px', color: '#8A9BB8' }}>Order Total</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: platform.color }}>{formatUSD(totalUSD)}</div>
              <div style={{ fontSize: '11px', color: '#8A9BB8' }}>≈ {formatETB(totalETB)}</div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              height: '52px', fontWeight: 800, fontSize: '15px', borderRadius: '14px', border: 'none',
              background: `linear-gradient(135deg, ${platform.color}, ${platform.color}cc)`,
              color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              boxShadow: `0 8px 24px ${platform.glow}`,
            }}
          >
            {loading ? 'Placing Order…' : `Place Order — ${formatUSD(totalUSD)}`}
          </button>
        </form>
      </div>
    </div>
  );
};

const STATUS_COLORS = {
  pending:    '#F5A623',
  processing: '#3B82F6',
  completed:  '#10B981',
  cancelled:  '#EF4444',
};

const OrderRow = ({ order }) => {
  const plat = PLATFORMS.find(p => p.id === order.platform) || PLATFORMS[0];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '14px 16px', borderRadius: '12px',
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
    }}>
      <span style={{ fontSize: '22px' }}>{order.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '14px', color: '#E5E7EB', marginBottom: '2px' }}>{order.service_label}</div>
        <div style={{ fontSize: '11px', color: '#8A9BB8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.target}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: plat.color }}>{formatUSD(order.total_usd)}</div>
        <div style={{
          fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', marginTop: '4px',
          background: `${STATUS_COLORS[order.status] || '#8A9BB8'}22`,
          color: STATUS_COLORS[order.status] || '#8A9BB8',
          display: 'inline-block',
        }}>{order.status}</div>
      </div>
    </div>
  );
};

/* ─── Main Page ──────────────────────────────────────────────────── */
const SocialServicesPage = () => {
  const { user } = useAuth();
  const [activePlatform, setActivePlatform]   = useState('telegram');
  const [selectedService, setSelectedService] = useState(null);
  const [orderLoading, setOrderLoading]       = useState(false);
  const [orders, setOrders]                   = useState([]);
  const [toast, setToast]                     = useState(null);
  const [ordersLoading, setOrdersLoading]     = useState(false);

  const platform = PLATFORMS.find(p => p.id === activePlatform);
  const services = SERVICES[activePlatform] || [];

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadOrders = async () => {
    if (!user?.id) return;
    setOrdersLoading(true);
    try {
      const { data, error } = await supabase
        .from('social_service_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (!error && data) setOrders(data);
    } catch (_) {}
    setOrdersLoading(false);
  };

  useEffect(() => { loadOrders(); }, [user?.id]);

  const handleOrderSubmit = async ({ service, qty, target, comment, payMethod, totalUSD, totalETB }) => {
    setOrderLoading(true);
    try {
      const { error } = await supabase.from('social_service_orders').insert({
        user_id:       user.id,
        platform:      activePlatform,
        service_id:    service.id,
        service_label: `${service.label} – ${service.subtitle}`,
        icon:          service.icon,
        target,
        comment:       comment || null,
        qty:           service.unit ? qty : 1,
        unit:          service.unit || null,
        total_usd:     totalUSD,
        total_etb:     totalETB,
        pay_method:    payMethod,
        status:        'pending',
      });
      if (error) throw error;
      setSelectedService(null);
      showToast('🎉 Order placed! Our team will process it within 1–24 hours.');
      loadOrders();
    } catch (err) {
      showToast(`❌ ${err.message || 'Failed to place order. Try again.'}`, 'error');
    }
    setOrderLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', color: '#E5E7EB', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 2000,
          background: toast.type === 'error' ? '#1a0808' : '#081a10',
          border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`,
          color: toast.type === 'error' ? '#EF4444' : '#10B981',
          padding: '14px 20px', borderRadius: '14px', fontSize: '14px', fontWeight: 600,
          maxWidth: '380px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'slideIn 0.3s ease',
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#fff', margin: '0 0 8px 0' }}>
          Social Media Services
        </h1>
        <p style={{ fontSize: '15px', color: '#8A9BB8', margin: 0 }}>
          Boost your presence on Telegram, TikTok & Instagram — pay with USDT or ETB.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '32px' }}>
        {PLATFORMS.map(p => (
          <PlatformTab
            key={p.id}
            platform={p}
            active={activePlatform === p.id}
            onClick={() => setActivePlatform(p.id)}
          />
        ))}
      </div>

      <div style={{
        background: `linear-gradient(120deg, ${platform.color}12 0%, transparent 100%)`,
        border: `1px solid ${platform.color}33`,
        borderRadius: '16px', padding: '18px 22px', marginBottom: '28px',
        display: 'flex', alignItems: 'center', gap: '14px',
      }}>
        <span style={{ fontSize: '36px' }}>{platform.emoji}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '16px', color: platform.color }}>{platform.label} Services</div>
          <div style={{ fontSize: '13px', color: '#8A9BB8' }}>
            Select a service below, enter your link or username, choose quantity and pay.
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '20px',
        marginBottom: '48px',
      }}>
        {services.map(svc => (
          <ServiceCard
            key={svc.id}
            service={svc}
            platform={platform}
            onClick={setSelectedService}
          />
        ))}
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>My Orders</h2>
          <button
            onClick={loadOrders}
            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px 14px', color: '#8A9BB8', fontSize: '12px', cursor: 'pointer' }}
          >
            {ordersLoading ? 'Loading…' : '↻ Refresh'}
          </button>
        </div>

        {orders.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '48px 24px',
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '16px', color: '#8A9BB8', fontSize: '14px',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
            No orders yet. Place your first order above!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {orders.map(o => <OrderRow key={o.id} order={o} />)}
          </div>
        )}
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px', marginTop: '40px',
      }}>
        {[
          { icon: '⚡', title: 'Fast Delivery', desc: 'Most orders start within 1 hour' },
          { icon: '🔒', title: 'Secure & Private', desc: 'We never ask for your password' },
          { icon: '💳', title: 'ETB or USDT', desc: 'Pay in your preferred currency' },
          { icon: '🛡️', title: 'Refund Policy', desc: '100% refund if order fails' },
        ].map(card => (
          <div key={card.title} style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '14px', padding: '18px 20px',
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{card.icon}</div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#fff', marginBottom: '4px' }}>{card.title}</div>
            <div style={{ fontSize: '12px', color: '#8A9BB8' }}>{card.desc}</div>
          </div>
        ))}
      </div>

      {selectedService && (
        <OrderModal
          service={selectedService}
          platform={platform}
          onClose={() => setSelectedService(null)}
          onSubmit={handleOrderSubmit}
          loading={orderLoading}
        />
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default SocialServicesPage;
