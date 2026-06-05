import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { ArrowDownLeft, ArrowUpRight, Repeat, Send, Download, Search, Calendar, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import EmptyState from '../components/EmptyState.jsx';

const TransactionHistory = () => {
  const { user, myDepositReqs, myWithdrawalReqs } = useAuth();
  const { t } = useTranslation();
  
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTx, setSelectedTx] = useState(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Unified transactions list, mapped dynamically from Convex data
  const transactions = useMemo(() => {
    if (!user) return [];
    
    const deposits = (myDepositReqs || []).map(tx => ({
      id: tx._id || tx.id,
      type: 'deposit',
      amount_usd: tx.amountUsd || tx.amountUSD || 0,
      status: tx.status === 'approved' ? 'completed' : tx.status,
      created_at: tx.createdAt,
      note: tx.senderReference || tx.adminNote || 'Deposit',
      tx_hash: tx._id || tx.id,
      from: tx.walletType || 'External Account',
      to: user.fullName || user.username || 'My Wallet',
      platform_fee: 0,
    }));

    const withdrawals = (myWithdrawalReqs || []).map(tx => ({
      id: tx._id || tx.id,
      type: 'withdrawal',
      amount_usd: tx.amountUSD || 0,
      status: tx.status === 'completed' || tx.status === 'approved' ? 'completed' : tx.status,
      created_at: tx.createdAt,
      note: tx.adminNote || 'Withdrawal',
      tx_hash: tx.walletAddress || tx._id || tx.id,
      from: user.fullName || user.username || 'My Wallet',
      to: tx.walletAddress || tx.walletType || 'External Destination',
      platform_fee: 0,
    }));

    // Combine and sort by date descending
    let combined = [...deposits, ...withdrawals].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    // Apply Type Filter
    if (filterType !== 'all') {
      combined = combined.filter(tx => tx.type === filterType);
    }

    // Apply Search Filter
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      combined = combined.filter(tx => 
        tx.tx_hash?.toLowerCase().includes(q) || 
        tx.note?.toLowerCase().includes(q) ||
        tx.id?.toLowerCase().includes(q)
      );
    }

    // Apply Date Range Filter
    if (dateRange.start) {
      combined = combined.filter(tx => new Date(tx.created_at) >= new Date(dateRange.start));
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      combined = combined.filter(tx => new Date(tx.created_at) <= endDate);
    }

    return combined;
  }, [user, myDepositReqs, myWithdrawalReqs, filterType, searchTerm, dateRange]);

  // Dynamic monthly summary calculations
  const summary = useMemo(() => {
    const now = new Date();
    const thisMonth = transactions.filter(tx => {
      const txDate = new Date(tx.created_at);
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    });

    const totalIn = thisMonth
      .filter(tx => ['deposit', 'receive', 'referral_earn'].includes(tx.type))
      .reduce((sum, tx) => sum + (tx.amount_usd || 0), 0);
    
    const totalOut = thisMonth
      .filter(tx => ['withdrawal', 'send'].includes(tx.type))
      .reduce((sum, tx) => sum + (tx.amount_usd || 0), 0);

    return { in: totalIn, out: totalOut };
  }, [transactions]);

  // Professional PDF Invoice Exporter
  const downloadReceipt = (tx) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(28, 25, 23);
    doc.text('EthioSwap Receipt', 20, 25);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120, 113, 108);
    doc.text('Official Transaction Document', 20, 32);
    doc.text('Website: ethioswap.qzz.io', 20, 37);
    doc.text('TIN: 0048392019', 20, 42);
    
    // Separator line
    doc.setDrawColor(231, 229, 228);
    doc.setLineWidth(0.5);
    doc.line(20, 48, 190, 48);
    
    // Meta Rows
    doc.setFontSize(11);
    doc.setTextColor(68, 64, 60);
    
    doc.setFont("helvetica", "bold");
    doc.text('Receipt No:', 20, 58);
    doc.setFont("helvetica", "normal");
    doc.text(`REC-${tx.id.substring(0, 8).toUpperCase()}`, 60, 58);
    
    doc.setFont("helvetica", "bold");
    doc.text('Date & Time:', 20, 66);
    doc.setFont("helvetica", "normal");
    doc.text(new Date(tx.created_at).toLocaleString(), 60, 66);
    
    doc.setFont("helvetica", "bold");
    doc.text('Type:', 20, 74);
    doc.setFont("helvetica", "normal");
    doc.text(tx.type.toUpperCase(), 60, 74);
    
    doc.setFont("helvetica", "bold");
    doc.text('Status:', 20, 82);
    doc.setFont("helvetica", "normal");
    doc.text(tx.status.toUpperCase(), 60, 82);
    
    // Separator
    doc.line(20, 90, 190, 90);
    
    // Routing details
    doc.setFont("helvetica", "bold");
    doc.text('From:', 20, 100);
    doc.setFont("helvetica", "normal");
    doc.text(tx.from, 60, 100);
    
    doc.setFont("helvetica", "bold");
    doc.text('To:', 20, 108);
    doc.setFont("helvetica", "normal");
    doc.text(tx.to, 60, 108);
    
    // Separator
    doc.line(20, 116, 190, 116);
    
    // Subtotals
    doc.setFont("helvetica", "bold");
    doc.text('Subtotal:', 20, 126);
    doc.setFont("helvetica", "normal");
    doc.text(`$${tx.amount_usd.toFixed(2)} USD`, 60, 126);
    
    doc.setFont("helvetica", "bold");
    doc.text('Fees:', 20, 134);
    doc.setFont("helvetica", "normal");
    doc.text('$0.00 USD', 60, 134);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(4, 120, 87); // Green text
    doc.text('Total Net:', 20, 144);
    doc.text(`$${tx.amount_usd.toFixed(2)} USD`, 60, 144);
    
    // Separator
    doc.setDrawColor(231, 229, 228);
    doc.line(20, 152, 190, 152);
    
    // Signatures
    doc.setFontSize(10);
    doc.setTextColor(120, 113, 108);
    doc.text('Authorized Signature:', 120, 165);
    
    // Handwritten-style script rendering for Biruk Fikru
    doc.setFont("times", "italic");
    doc.setFontSize(14);
    doc.setTextColor(29, 78, 216); // Blue ink
    doc.text('Biruk Fikru', 120, 175);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 113, 108);
    doc.text('CEO, EthioSwap', 120, 181);
    
    // Secure stamp
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(5, 150, 105);
    doc.text('[ SECURED BY ETHIOSWAP ]', 20, 175);
    
    doc.save(`EthioSwap_Receipt_${tx.id.substring(0, 8)}.pdf`);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'deposit': return <ArrowDownLeft color="#00d4a0" />;
      case 'withdrawal': return <ArrowUpRight color="#ef4444" />;
      case 'trade': return <Repeat color="#3b82f6" />;
      case 'send': return <Send color="#f59e0b" />;
      case 'receive': return <ArrowDownLeft color="#00d4a0" />;
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
        {transactions.length === 0 ? (
          <EmptyState 
            icon="💸"
            title="No Transactions Found"
            subtitle="It looks like you haven't made any transactions yet or none match your filters."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {transactions.map(tx => (
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
                  <div style={{ fontSize: '15px', fontWeight: 800, color: tx.type === 'deposit' ? '#00d4a0' : '#fff' }}>
                    {tx.type === 'deposit' ? '+' : '-'}${tx.amount_usd.toFixed(2)}
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

      {/* ─── TRANSACTION DETAIL RECEIPT MODAL ─────────────────────────── */}
      {selectedTx && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(8px)',
          padding: '20px',
        }} onClick={() => setSelectedTx(null)}>
          <div className="premium-glow" style={{
            background: '#fafaf9', // Light paper background
            color: '#1c1917', // Dark text
            maxWidth: '380px',
            width: '100%',
            borderRadius: '24px',
            padding: '32px 24px',
            position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(245, 197, 24, 0.15)',
            border: '2px solid #f5c518',
            fontFamily: "'Inter', sans-serif",
            overflow: 'hidden',
          }} onClick={e => e.stopPropagation()}>
            
            {/* Dashed edge receipt border at top/bottom (decoration) */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '8px',
              background: 'repeating-linear-gradient(90deg, #1c1917 0, #1c1917 4px, transparent 4px, transparent 8px)',
              opacity: 0.1,
            }} />

            {/* Close button */}
            <button onClick={() => setSelectedTx(null)} style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(0,0,0,0.05)',
              border: 'none',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              color: '#44403c',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
            }}>✕</button>

            {/* Logo & Name */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '24px' }}>🛡️</span>
                <span style={{ fontWeight: 900, fontSize: '22px', color: '#1c1917', letterSpacing: '-0.02em' }}>EthioSwap</span>
              </div>
              <div style={{ fontSize: '11px', color: '#685e52', letterSpacing: '0.05em', fontWeight: 600 }}>OFFICIAL TRANSACTION RECEIPT</div>
              <div style={{ fontSize: '12px', color: '#a78bfa', fontWeight: 700, marginTop: '2px' }}>ethioswap.qzz.io</div>
              <div style={{ fontSize: '11px', color: '#78716c', marginTop: '2px' }}>TIN: 0048392019</div>
            </div>

            {/* Separator */}
            <div style={{ borderTop: '2px dashed #e7e5e4', margin: '16px 0' }} />

            {/* Transaction metadata */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#44403c' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#78716c' }}>Receipt No</span>
                <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#1c1917' }}>REC-{selectedTx.id.substring(0, 8).toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#78716c' }}>Date</span>
                <span style={{ fontWeight: 600, color: '#1c1917' }}>{new Date(selectedTx.created_at).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#78716c' }}>Status</span>
                <span style={{
                  fontWeight: 800,
                  fontSize: '10px',
                  color: selectedTx.status === 'completed' ? '#047857' : '#b45309',
                  background: selectedTx.status === 'completed' ? '#d1fae5' : '#fef3c7',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  textTransform: 'uppercase',
                }}>{selectedTx.status}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#78716c' }}>Type</span>
                <span style={{ fontWeight: 700, color: '#1c1917', textTransform: 'uppercase' }}>{selectedTx.type}</span>
              </div>
            </div>

            {/* Separator */}
            <div style={{ borderTop: '2px dashed #e7e5e4', margin: '16px 0' }} />

            {/* Transfer Path */}
            <div style={{ background: '#f5f5f4', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#78716c' }}>From</span>
                <span style={{ fontWeight: 700, color: '#1c1917', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedTx.from}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#78716c' }}>To</span>
                <span style={{ fontWeight: 700, color: '#1c1917', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedTx.to}</span>
              </div>
            </div>

            {/* Separator */}
            <div style={{ borderTop: '2px dashed #e7e5e4', margin: '16px 0' }} />

            {/* Financials */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#44403c' }}>
                <span>Amount</span>
                <span style={{ fontWeight: 600 }}>${(selectedTx.amount_usd || 0).toFixed(2)} USD</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#44403c' }}>
                <span>Fee</span>
                <span style={{ fontWeight: 600 }}>$0.00 USD</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '16px', color: '#1c1917', marginTop: '4px' }}>
                <span>Total Net</span>
                <span style={{ color: '#047857', fontFamily: 'JetBrains Mono, monospace' }}>${(selectedTx.amount_usd || 0).toFixed(2)} USD</span>
              </div>
            </div>

            {/* Separator */}
            <div style={{ borderTop: '2px dashed #e7e5e4', margin: '16px 0' }} />

            {/* Signature & Secure Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              {/* Official Stamp Decoration */}
              <div style={{
                border: '2px solid #059669',
                borderRadius: '8px',
                padding: '4px 8px',
                color: '#059669',
                fontSize: '9px',
                fontWeight: 900,
                transform: 'rotate(-10deg)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                userSelect: 'none',
              }}>
                🔒 SECURED
              </div>

              {/* Biruk Fikru Signature */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ position: 'relative', height: '35px', width: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="100" height="35" viewBox="0 0 120 40" style={{ opacity: 0.85 }}>
                    <path d="M10,25 C25,20 30,5 35,8 C40,10 32,35 38,33 C44,31 48,15 52,17 C56,19 52,30 58,29 C64,28 68,18 72,19 C76,20 72,30 78,28 C84,26 90,10 95,12 C100,14 90,30 102,28" fill="none" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div style={{ borderTop: '1px solid #d1d5db', width: '110px', textAlign: 'center', fontSize: '9px', color: '#78716c', paddingTop: '4px', fontWeight: 600 }}>
                  Biruk Fikru
                </div>
              </div>
            </div>

            {/* Actions (Download / Close) */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => downloadReceipt(selectedTx)} style={{
                flex: 1,
                padding: '12px',
                background: '#f5c518',
                color: '#1c1917',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}>Download PDF</button>
              <button onClick={() => setSelectedTx(null)} style={{
                flex: 1,
                padding: '12px',
                background: '#e7e5e4',
                color: '#44403c',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}>Close</button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
