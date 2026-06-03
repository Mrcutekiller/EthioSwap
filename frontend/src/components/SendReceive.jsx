import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Send, QrCode, Search, Copy, CheckCircle, User, ArrowRight } from 'lucide-react';

const SendReceive = ({ onClose }) => {
  const { user, sendInternalTransfer, createPaymentRequest } = useAuth();
  const { t } = useTranslation();
  const [mode, setMode] = useState('send'); // 'send' | 'receive' | 'request'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [requestUsername, setRequestUsername] = useState('');
  const [requestAmount, setRequestAmount] = useState('');

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) { setSearchResults([]); return; }
    const { data } = // await // supabase.from('users')
      .select('id, username, full_name, selected_avatar, avg_rating')
      .ilike('username', `%${query}%`)
      .neq('id', user.id)
      .limit(5);
    setSearchResults(data || []);
  };

  const handleSend = async () => {
    if (!selectedUser || !amount) return;
    setLoading(true);
    await sendInternalTransfer(selectedUser.username, parseFloat(amount), note);
    setLoading(false);
    setSelectedUser(null);
    setAmount('');
    setNote('');
  };

  const handleRequest = async () => {
    if (!requestUsername || !requestAmount) return;
    setLoading(true);
    await createPaymentRequest(requestUsername, parseFloat(requestAmount), note);
    setLoading(false);
    setRequestUsername('');
    setRequestAmount('');
    setNote('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Mode Tabs */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => setMode('send')} className={`btn ${mode === 'send' ? 'btn-gold' : 'btn-ghost'}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <Send size={16} /> {t('Send')}
        </button>
        <button onClick={() => setMode('receive')} className={`btn ${mode === 'receive' ? 'btn-gold' : 'btn-ghost'}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <QrCode size={16} /> {t('Receive')}
        </button>
        <button onClick={() => setMode('request')} className={`btn ${mode === 'request' ? 'btn-gold' : 'btn-ghost'}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <Search size={16} /> {t('Request Money')}
        </button>
      </div>

      {/* SEND MODE */}
      {mode === 'send' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {!selectedUser ? (
            <>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                <input type="text" className="input" style={{ paddingLeft: '40px', marginBottom: 0 }} placeholder={t('Search by username or phone')} value={searchQuery} onChange={e => handleSearch(e.target.value)} />
              </div>
              {searchResults.length > 0 && (
                <div className="card" style={{ padding: '4px' }}>
                  {searchResults.map(u => (
                    <div key={u.id} onClick={() => { setSelectedUser(u); setSearchQuery(''); setSearchResults([]); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '10px', cursor: 'pointer', transition: 'background 0.2s' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.1)' }}>
                        <img src={u.selected_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${u.username}`} style={{ width: '100%', height: '100%' }} alt="" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>@{u.username}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{u.full_name} • ⭐{(u.avg_rating || 0).toFixed(1)}</div>
                      </div>
                      <ArrowRight size={16} color="var(--text-3)" />
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.1)' }}>
                  <img src={selectedUser.selected_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedUser.username}`} style={{ width: '100%', height: '100%' }} alt="" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>@{selectedUser.username}</div>
                  <div style={{ fontSize: '11px', color: '#00d4a0' }}>✅ Verified</div>
                </div>
                <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>✕</button>
              </div>

              <input type="number" className="input" placeholder={t('Enter amount')} value={amount} onChange={e => setAmount(e.target.value)} />
              <input type="text" className="input" placeholder={t('Add note (optional)')} value={note} onChange={e => setNote(e.target.value)} />

              <div className="card" style={{ padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-3)' }}>Sending To:</span>
                  <span style={{ fontWeight: 600 }}>@{selectedUser.username} ✅</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-3)' }}>Amount:</span>
                  <span style={{ fontWeight: 600 }}>${amount || '0.00'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-3)' }}>Platform Fee:</span>
                  <span style={{ fontWeight: 600, color: '#00d4a0' }}>FREE 🎉</span>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ fontWeight: 700 }}>They Receive:</span>
                  <span style={{ fontWeight: 800, color: '#00d4a0' }}>${amount || '0.00'}</span>
                </div>
              </div>

              <button onClick={handleSend} disabled={!amount || loading} className="btn btn-gold btn-full" style={{ padding: '14px' }}>
                {loading ? 'Sending...' : t('Confirm Send')}
              </button>
            </>
          )}
        </div>
      )}

      {/* RECEIVE MODE */}
      {mode === 'receive' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', padding: '20px 0' }}>
          <div style={{ width: '160px', height: '160px', borderRadius: '16px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ width: '100%', height: '100%', background: 'var(--bg-elevated)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'var(--text-3)' }}>
              QR Code
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '4px' }}>Share your username</div>
            <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>@{user.username}</div>
          </div>
          <button onClick={() => { navigator.clipboard.writeText(user.username); }} className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Copy size={16} /> Copy Username
          </button>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', textAlign: 'center', maxWidth: '280px' }}>
            Internal transfers are instant and free! Min $1, max $500/day.
          </div>
        </div>
      )}

      {/* REQUEST MODE */}
      {mode === 'request' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input type="text" className="input" placeholder="Username to request from" value={requestUsername} onChange={e => setRequestUsername(e.target.value)} />
          <input type="number" className="input" placeholder={t('Enter amount')} value={requestAmount} onChange={e => setRequestAmount(e.target.value)} />
          <input type="text" className="input" placeholder={t('Add note (optional)')} value={note} onChange={e => setNote(e.target.value)} />
          <button onClick={handleRequest} disabled={!requestUsername || !requestAmount || loading} className="btn btn-gold btn-full" style={{ padding: '14px' }}>
            {loading ? 'Sending...' : t('Request Money')}
          </button>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', textAlign: 'center' }}>
            Request expires in 24 hours
          </div>
        </div>
      )}
    </div>
  );
};

export default SendReceive;
