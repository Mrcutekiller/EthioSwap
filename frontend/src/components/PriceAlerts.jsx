import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Bell, BellOff, Trash2, Plus } from 'lucide-react';

const PriceAlerts = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { createPriceAlert, deletePriceAlert, togglePriceAlert } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [condition, setCondition] = useState('above');
  const [currentRate, setCurrentRate] = useState(null);

  useEffect(() => {
    fetchAlerts();
    fetchCurrentRate();
  }, []);

  const fetchAlerts = async () => {
    // Mocked for Convex migration
    const data = [];
    if (data) setAlerts(data);
  };

  const fetchCurrentRate = async () => {
    // Mocked for Convex migration
    const data = { usdt_etb_rate: 0 };
    if (data) setCurrentRate(data.usdt_etb_rate);
  };

  const handleCreate = async () => {
    if (!targetPrice) return;
    await createPriceAlert(parseFloat(targetPrice), condition);
    setTargetPrice('');
    setShowForm(false);
    fetchAlerts();
  };

  const handleDelete = async (id) => {
    await deletePriceAlert(id);
    fetchAlerts();
  };

  const handleToggle = async (id, isActive) => {
    await togglePriceAlert(id, isActive);
    fetchAlerts();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800 }}>{t('Price Alerts')}</h2>
        <button onClick={() => setShowForm(true)} className="btn btn-gold" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
          <Plus size={16} /> {t('Set Alert')}
        </button>
      </div>

      {/* Current Rate */}
      <div className="card glass-card" style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '4px' }}>Current USDT/ETB Rate</div>
        <div style={{ fontSize: '28px', fontWeight: 900, fontFamily: 'JetBrains Mono, monospace' }}>{currentRate?.toFixed(2) || '---'}</div>
      </div>

      {/* Active Alerts */}
      <div>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-3)', marginBottom: '12px' }}>MY ALERTS</h3>
        {alerts.length === 0 ? (
          <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-3)' }}>
            <BellOff size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <p>No alerts set yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {alerts.map(alert => (
              <div key={alert.id} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>
                    USDT {alert.condition === 'above' ? '↑' : '↓'} {alert.target_price} ETB
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>
                    {alert.is_triggered ? `Triggered ${new Date(alert.triggered_at).toLocaleDateString()}` : alert.is_active ? 'Active' : 'Paused'}
                  </div>
                </div>
                <button onClick={() => handleToggle(alert.id, alert.is_active)} style={{ background: 'none', border: 'none', color: alert.is_active ? '#00C896' : 'var(--text-3)', cursor: 'pointer', padding: '4px' }}>
                  {alert.is_active ? <Bell size={18} /> : <BellOff size={18} />}
                </button>
                <button onClick={() => handleDelete(alert.id)} style={{ background: 'none', border: 'none', color: '#FF4D4D', cursor: 'pointer', padding: '4px' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Alert Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="card glass-card" style={{ maxWidth: '400px', width: '90%', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>Create Price Alert</h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button onClick={() => setCondition('above')} className={`btn ${condition === 'above' ? 'btn-gold' : 'btn-ghost'}`} style={{ flex: 1 }}>Above ↑</button>
              <button onClick={() => setCondition('below')} className={`btn ${condition === 'below' ? 'btn-gold' : 'btn-ghost'}`} style={{ flex: 1 }}>Below ↓</button>
            </div>
            <input type="number" className="input" placeholder="Target price in ETB" value={targetPrice} onChange={e => setTargetPrice(e.target.value)} style={{ marginBottom: '16px' }} />
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '16px' }}>
              Alert me when 1 USDT is {condition} {targetPrice || '___'} ETB
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowForm(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
              <button onClick={handleCreate} className="btn btn-gold" style={{ flex: 1 }}>Create Alert</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceAlerts;
