import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { ArrowDownLeft, ArrowUpRight, Repeat, Send, Download, Search, Filter, Calendar, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import EmptyState from '../components/EmptyState.jsx';

const TransactionHistory = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [summary, setSummary] = useState({ in: 0, out: 0 });
  const [selectedTx, setSelectedTx] = useState(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    if (!user) return;
    fetchTransactions();
  }, [user, filterType]);

  const fetchTransactions = async () => {
    setLoading(true);
    // Mocked for Convex migration
    const data = [];
    if (data) {
      setTransactions(data);
      calculateSummary(data);
    }
    setLoading(false);
  };

  const calculateSummary = (data) => {
    const now = new Date();
    const thisMonth = data.filter(tx => {
      const txDate = new Date(tx.created_at);
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    });

    const totalIn = thisMonth
      .filter(tx => ['deposit', 'receive', 'referral_earn'].includes(tx.type))
      .reduce((sum, tx) => sum + (tx.amount_usd || 0), 0);
    
    const totalOut = thisMonth
      .filter(tx => ['withdrawal', 'send'].includes(tx.type))
      .reduce((sum, tx) => sum + (tx.amount_usd || 0), 0);

    setSummary({ in: totalIn, out: totalOut });
  };

  const downloadReceipt = (tx) => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text('EthioSwap Receipt', 20, 20);
    doc.setFontSize(12);
    doc.text(`Transaction ID: ${tx.id}`, 20, 40);
    doc.text(`Date: ${new Date(tx.created_at).toLocaleString()}`, 20, 50);
    doc.text(`Type: ${tx.type.toUpperCase()}`, 20, 60);
    doc.text(`Amount: $${tx.amount_usd.toFixed(2)}`, 20, 70);
    doc.text(`Fees: $${(tx.platform_fee || 0).toFixed(2)}`, 20, 80);
    doc.text(`Net Amount: $${(tx.net_amount || tx.amount_usd).toFixed(2)}`, 20, 90);
    doc.text(`Status: ${tx.status.toUpperCase()}`, 20, 100);
    doc.save(`EthioSwap_Receipt_${tx.id.substring(0, 8)}.pdf`);
  };

  const filteredTxs = transactions.filter(tx => 
    tx.tx_hash?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    tx.note?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getIcon = (type) => {
    switch (type) {
      case 'deposit': return <ArrowDownLeft color="#00d4a0" />;
      case 'withdrawal': return <ArrowUpRight color="#ef4444" />;
      case 'trade': return <Repeat color="#3b82f6" />;
      case 'send': return <Send color="#f59e0b" />;
      case 'receive': return <ArrowDownLeft color="#00d4a0" />;
      case 'referral_earn': return <Download color="#a855f7" />;
      default: return <FileText />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      
      {/* ─── SUMMARY CARD ─────────────────────────────────────── */}
      <div className="card glass-card" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(245, 197, 24, 0.05) 0%, rgba(0, 212, 160, 0.05) 100%)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '16px' }}>This Month</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Total In 📥</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#00d4a0' }}>+${summary.in.toFixed(2)}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Total Out 📤</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#ef4444' }}>-${summary.out.toFixed(2)}</div>
          </div>
          <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '20px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Net Balance</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#fff' }}>${(summary.in - summary.out).toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* ─── FILTERS ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input 
            type="text" 
            placeholder="Search by hash or note..." 
            className="input" 
            style={{ paddingLeft: '40px', marginBottom: 0 }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="input" 
          style={{ width: 'auto', marginBottom: 0 }}
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="deposit">Deposits</option>
          <option value="withdrawal">Withdrawals</option>
          <option value="trade">Trades</option>
          <option value="send">Sent</option>
          <option value="receive">Received</option>
          <option value="referral_earn">Referrals</option>
        </select>
      </div>

      {/* Date range filters */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <Calendar size={14} color="var(--text-3)" />
        <input type="date" className="input" style={{ width: 'auto', marginBottom: 0, fontSize: '12px' }} value={dateRange.start} onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))} />
        <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>to</span>
        <input type="date" className="input" style={{ width: 'auto', marginBottom: 0, fontSize: '12px' }} value={dateRange.end} onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))} />
        {(dateRange.start || dateRange.end) && (
          <button onClick={() => setDateRange({ start: '', end: '' })} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '12px' }}>Clear</button>
        )}
      </div>

      {/* ─── TRANSACTION LIST ─────────────────────────────────── */}
      <div className="card" style={{ padding: '8px' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Loading history...</div>
        ) : filteredTxs.length === 0 ? (
          <EmptyState 
            icon="💸"
            title="No Transactions Found"
            subtitle="It looks like you haven't made any transactions yet or none match your filters."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {filteredTxs.map(tx => (
              <div 
                key={tx.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px', 
                  padding: '16px', 
                  borderRadius: '12px', 
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setSelectedTx(tx)}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {getIcon(tx.type)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{t(tx.type.charAt(0).toUpperCase() + tx.type.slice(1))}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{new Date(tx.created_at).toLocaleString()}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: ['deposit', 'receive', 'referral_earn'].includes(tx.type) ? '#00d4a0' : '#fff' }}>
                    {['deposit', 'receive', 'referral_earn'].includes(tx.type) ? '+' : '-'}${tx.amount_usd.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: tx.status === 'completed' ? '#00d4a0' : '#f5c518' }}>
                    {tx.status.toUpperCase()}
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); downloadReceipt(tx); }} 
                  style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '4px' }}
                >
                  <Download size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── TRANSACTION DETAIL MODAL ─────────────────────────── */}
      {selectedTx && (
        <div className="modal-overlay" onClick={() => setSelectedTx(null)}>
          <div className="card glass-card" style={{ maxWidth: '440px', width: '90%', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Transaction Details</h3>
              <button onClick={() => setSelectedTx(null)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>Type</span>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{selectedTx.type.toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>Amount</span>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>${(selectedTx.amount_usd || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>Platform Fee</span>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>${(selectedTx.platform_fee || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>Net Amount</span>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>${(selectedTx.net_amount || selectedTx.amount_usd || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>Status</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: selectedTx.status === 'completed' ? '#00d4a0' : '#f5c518', background: selectedTx.status === 'completed' ? 'rgba(0,212,160,0.1)' : 'rgba(245,197,24,0.1)', padding: '2px 8px', borderRadius: '6px' }}>{selectedTx.status.toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>Date</span>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{new Date(selectedTx.created_at).toLocaleString()}</span>
              </div>
              {selectedTx.tx_hash && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>TX Hash</span>
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-2)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedTx.tx_hash}</span>
                </div>
              )}
              {selectedTx.note && (
                <div style={{ padding: '10px 0' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>Note</span>
                  <div style={{ fontSize: '13px', marginTop: '4px' }}>{selectedTx.note}</div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              {selectedTx.tx_hash && (
                <button onClick={() => { navigator.clipboard.writeText(selectedTx.tx_hash); }} className="btn btn-ghost" style={{ flex: 1 }}>Copy Hash</button>
              )}
              <button onClick={() => downloadReceipt(selectedTx)} className="btn btn-gold" style={{ flex: 1 }}>Download Receipt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
