import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from 'convex/react';
import { api } from 'convex-api';
import { ArrowDownLeft, ArrowUpRight, Repeat, Send, Download, Search, Calendar, FileText, Star, TrendingUp } from 'lucide-react';
import jsPDF from 'jspdf';
import EmptyState from '../components/EmptyState.jsx';

const TransactionHistory = () => {
  const { user, myDepositReqs, myWithdrawalReqs } = useAuth();
  const { t } = useTranslation();

  const [activeHistoryTab, setActiveHistoryTab] = useState('p2p'); // 'p2p' | 'wallet'
  
  // Wallet Transactions Filters
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTx, setSelectedTx] = useState(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // P2P Trade History Filters
  const [p2pFilterStatus, setP2pFilterStatus] = useState('all'); // 'all' | 'completed' | 'cancelled' | 'disputed'
  const [p2pFilterType, setP2pFilterType] = useState('all'); // 'all' | 'buy' | 'sell'
  const [p2pDateRange, setP2pDateRange] = useState({ start: '', end: '' });

  // Rating Modal state
  const [ratingTrade, setRatingTrade] = useState(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingError, setRatingError] = useState('');

  // Fetch P2P trades from Convex
  const p2pTradesRaw = useQuery(api.trades.listForUser, { userId: user?.id }) || [];
  const submitRatingMutation = useMutation(api.trades.submitTradeRating);

  // Map and sort P2P trades
  const p2pTrades = useMemo(() => {
    let list = p2pTradesRaw.map(t => {
      const isBuyer = user?.id === t.buyerId;
      return {
        ...t,
        isBuyer,
        tradeType: isBuyer ? 'buy' : 'sell',
        counterparty: isBuyer ? t.sellerName : t.buyerName,
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply Status Filter
    if (p2pFilterStatus !== 'all') {
      list = list.filter(t => t.status === p2pFilterStatus);
    }

    // Apply Type Filter
    if (p2pFilterType !== 'all') {
      list = list.filter(t => t.tradeType === p2pFilterType);
    }

    // Apply Date Range Filter
    if (p2pDateRange.start) {
      list = list.filter(t => new Date(t.createdAt) >= new Date(p2pDateRange.start));
    }
    if (p2pDateRange.end) {
      const endDate = new Date(p2pDateRange.end);
      endDate.setHours(23, 59, 59, 999);
      list = list.filter(t => new Date(t.createdAt) <= endDate);
    }

    return list;
  }, [p2pTradesRaw, p2pFilterStatus, p2pFilterType, p2pDateRange, user?.id]);

  // Unified wallet transactions list (mapped from Convex)
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

    let combined = [...deposits, ...withdrawals].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    if (filterType !== 'all') {
      combined = combined.filter(tx => tx.type === filterType);
    }

    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      combined = combined.filter(tx => 
        tx.tx_hash?.toLowerCase().includes(q) || 
        tx.note?.toLowerCase().includes(q) ||
        tx.id?.toLowerCase().includes(q)
      );
    }

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

  // Wallet summary
  const walletSummary = useMemo(() => {
    const totalIn = transactions
      .filter(tx => tx.type === 'deposit' && tx.status === 'completed')
      .reduce((sum, tx) => sum + tx.amount_usd, 0);
    
    const totalOut = transactions
      .filter(tx => tx.type === 'withdrawal' && tx.status === 'completed')
      .reduce((sum, tx) => sum + tx.amount_usd, 0);

    return { in: totalIn, out: totalOut };
  }, [transactions]);

  // P2P Trade Summary stats
  const completedP2pTrades = useMemo(() => {
    return p2pTradesRaw.filter(t => t.status === 'completed');
  }, [p2pTradesRaw]);

  const p2pStats = useMemo(() => {
    const totalTrades = completedP2pTrades.length;
    
    const usdtBought = completedP2pTrades
      .filter(t => t.buyerId === user?.id)
      .reduce((sum, t) => sum + (t.amountEth || 0), 0);

    const usdtSold = completedP2pTrades
      .filter(t => t.sellerId === user?.id)
      .reduce((sum, t) => sum + (t.amountEth || 0), 0);

    return {
      totalTrades,
      usdtBought,
      usdtSold,
      avgRating: user?.averageRating || 5.0,
    };
  }, [completedP2pTrades, user?.id, user?.averageRating]);

  // Monthly trading volume chart (last 6 months)
  const chartData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleDateString('default', { month: 'short' }),
        year: d.getFullYear(),
        monthNum: d.getMonth(),
        volume: 0,
      });
    }

    completedP2pTrades.forEach(t => {
      const date = new Date(t.createdAt);
      const m = date.getMonth();
      const y = date.getFullYear();
      const match = months.find(item => item.monthNum === m && item.year === y);
      if (match) {
        match.volume += (t.amountEth || 0);
      }
    });

    return months;
  }, [completedP2pTrades]);

  // Render SVG volume chart
  const renderVolumeChart = () => {
    const width = 500;
    const height = 150;
    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const volumes = chartData.map(d => d.volume);
    const maxVal = Math.max(...volumes, 10);
    const step = chartWidth / (chartData.length - 1);

    const points = chartData.map((d, i) => {
      const x = padding + i * step;
      const y = height - padding - (d.volume / maxVal) * chartHeight;
      return { x, y, label: d.label, volume: d.volume };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const areaPath = points.length > 0
      ? `${linePath} L${points[points.length - 1].x},${height - padding} L${points[0].x},${height - padding} Z`
      : '';

    return (
      <div className="premium-dashboard-card" style={{ padding: '20px', borderRadius: '16px', background: '#111318', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Monthly Trading Volume (USDT)
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '150px', display: 'block' }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.2"/>
              <stop offset="100%" stopColor="var(--gold)" stopOpacity="0"/>
            </linearGradient>
          </defs>
          
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          <line x1={padding} y1={height/2} x2={width - padding} y2={height/2} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

          {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}
          {linePath && <path d={linePath} fill="none" stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}

          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="4.5" fill="var(--gold)" stroke="var(--bg-surface)" strokeWidth="1.5" />
              <text x={p.x} y={p.y - 8} textAnchor="middle" fill="#fff" fontSize="9" fontWeight="800" fontFamily="JetBrains Mono, monospace">
                {p.volume > 0 ? `$${p.volume.toFixed(0)}` : ''}
              </text>
              <text x={p.x} y={height - 4} textAnchor="middle" fill="var(--text-secondary)" fontSize="9" fontWeight="700">
                {p.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  // CSV Exporter
  const handleExportCSV = () => {
    const headers = ['Date', 'Type', 'Amount (USDT)', 'Rate (ETB/USDT)', 'Total (ETB)', 'Counterparty', 'Status', 'Rating Given'];
    const rows = p2pTrades.map(t => {
      const totalEtb = t.amountEth * (t.rate || 190);
      return [
        new Date(t.createdAt).toLocaleDateString(),
        t.tradeType.toUpperCase(),
        t.amountEth,
        t.rate || '',
        totalEtb.toFixed(2),
        t.counterparty || '',
        t.status,
        t.ratingGiven || 'Not Rated'
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `EthioSwap_P2P_Trade_History_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit P2P Trade rating
  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    setRatingError('');
    if (!ratingTrade) return;

    try {
      await submitRatingMutation({
        tradeId: ratingTrade._id,
        rating: ratingStars,
        comment: ratingComment,
      });
      setRatingTrade(null);
      setRatingComment('');
      setRatingStars(5);
    } catch (err) {
      setRatingError(err instanceof Error ? err.message : 'Error submitting rating');
    }
  };

  // Professional PDF Invoice Exporter
  const downloadReceipt = (tx) => {
    const doc = new jsPDF();
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
    
    doc.setDrawColor(231, 229, 228);
    doc.setLineWidth(0.5);
    doc.line(20, 48, 190, 48);
    
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
    
    doc.line(20, 90, 190, 90);
    
    doc.setFont("helvetica", "bold");
    doc.text('From:', 20, 100);
    doc.setFont("helvetica", "normal");
    doc.text(tx.from, 60, 100);
    
    doc.setFont("helvetica", "bold");
    doc.text('To:', 20, 108);
    doc.setFont("helvetica", "normal");
    doc.text(tx.to, 60, 108);
    
    doc.line(20, 116, 190, 116);
    
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
    doc.setTextColor(4, 120, 87);
    doc.text('Total Net:', 20, 144);
    doc.text(`$${tx.amount_usd.toFixed(2)} USD`, 60, 144);
    
    doc.setDrawColor(231, 229, 228);
    doc.line(20, 152, 190, 152);
    
    doc.setFontSize(10);
    doc.setTextColor(120, 113, 108);
    doc.text('Authorized Signature:', 120, 165);
    
    doc.setFont("times", "italic");
    doc.setFontSize(14);
    doc.setTextColor(29, 78, 216);
    doc.text('Biruk Fikru', 120, 175);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 113, 108);
    doc.text('CEO, EthioSwap', 120, 181);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(5, 150, 105);
    doc.text('[ SECURED BY ETHIOSWAP ]', 20, 175);
    
    doc.save(`EthioSwap_Receipt_${tx.id.substring(0, 8)}.pdf`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      
      {/* ─── Tabs segment ─── */}
      <div style={{ display: 'flex', background: '#111318', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '4px', gap: '4px' }}>
        <button onClick={() => setActiveHistoryTab('p2p')} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '13px', background: activeHistoryTab === 'p2p' ? 'var(--gold)' : 'transparent', color: activeHistoryTab === 'p2p' ? '#000' : 'var(--text-secondary)' }}>
          🤝 P2P Trades History
        </button>
        <button onClick={() => setActiveHistoryTab('wallet')} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '13px', background: activeHistoryTab === 'wallet' ? 'var(--gold)' : 'transparent', color: activeHistoryTab === 'wallet' ? '#000' : 'var(--text-secondary)' }}>
          💳 Wallet Transactions
        </button>
      </div>

      {activeHistoryTab === 'p2p' ? (
        <>
          {/* P2P Trades Summary Header */}
          <div className="card glass-card" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(245, 197, 24, 0.05) 0%, rgba(0, 212, 160, 0.05) 100%)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '16px' }}>P2P Trading Portfolio</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Trades Completed</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#fff' }}>{p2pStats.totalTrades}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total USDT Bought</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#00d4a0' }}>+${p2pStats.usdtBought.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total USDT Sold</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#ef4444' }}>-${p2pStats.usdtSold.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Average Rating</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {p2pStats.avgRating.toFixed(1)} <Star size={16} fill="var(--gold)" stroke="none" />
                </div>
              </div>
            </div>
          </div>

          {/* SVG volume chart */}
          {renderVolumeChart()}

          {/* P2P Filters and Export */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <select className="input" style={{ width: 'auto', marginBottom: 0 }} value={p2pFilterStatus} onChange={e => setP2pFilterStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="disputed">Disputed</option>
            </select>
            <select className="input" style={{ width: 'auto', marginBottom: 0 }} value={p2pFilterType} onChange={e => setP2pFilterType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="buy">Buy Trades</option>
              <option value="sell">Sell Trades</option>
            </select>
            <input type="date" className="input" style={{ width: 'auto', marginBottom: 0, fontSize: '12px' }} value={p2pDateRange.start} onChange={e => setP2pDateRange(p => ({ ...p, start: e.target.value }))} />
            <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>to</span>
            <input type="date" className="input" style={{ width: 'auto', marginBottom: 0, fontSize: '12px' }} value={p2pDateRange.end} onChange={e => setP2pDateRange(p => ({ ...p, end: e.target.value }))} />
            
            <button onClick={handleExportCSV} className="btn btn-ghost" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '10px 14px' }}>
              <Download size={14} /> Export CSV
            </button>
          </div>

          {/* P2P Trades list (responsive table/cards) */}
          <div className="card" style={{ padding: '0px', overflowX: 'auto' }}>
            {p2pTrades.length === 0 ? (
              <EmptyState icon="🤝" title="No Trades Found" subtitle="You haven't participated in any trades yet matching these filters." />
            ) : (
              <>
                {/* Desktop View Table */}
                <table className="desktop-only" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
                      <th style={{ padding: '16px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Date</th>
                      <th style={{ padding: '16px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Type</th>
                      <th style={{ padding: '16px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Amount</th>
                      <th style={{ padding: '16px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Rate</th>
                      <th style={{ padding: '16px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total</th>
                      <th style={{ padding: '16px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Partner</th>
                      <th style={{ padding: '16px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Status</th>
                      <th style={{ padding: '16px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Rating Given</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p2pTrades.map(t => {
                      const totalEtb = t.amountEth * (t.rate || 190);
                      return (
                        <tr key={t._id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '16px', fontSize: '13px' }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                          <td style={{ padding: '16px', fontSize: '13px', fontWeight: 800, color: t.tradeType === 'buy' ? '#00d4a0' : '#ef4444' }}>
                            {t.tradeType.toUpperCase()}
                          </td>
                          <td style={{ padding: '16px', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace' }}>${t.amountEth.toFixed(2)}</td>
                          <td style={{ padding: '16px', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace' }}>{t.rate?.toFixed(2) || '---'} ETB</td>
                          <td style={{ padding: '16px', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{totalEtb.toFixed(2)} ETB</td>
                          <td style={{ padding: '16px', fontSize: '13px', fontWeight: 600 }}>@{t.counterparty || 'user'}</td>
                          <td style={{ padding: '16px', fontSize: '12px' }}>
                            <span style={{
                              fontWeight: 800, fontSize: '10px', padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase',
                              color: t.status === 'completed' ? '#00d4a0' : t.status === 'cancelled' ? '#ef4444' : '#f5c518',
                              background: t.status === 'completed' ? 'rgba(0,212,160,0.1)' : t.status === 'cancelled' ? 'rgba(239,68,68,0.1)' : 'rgba(245,197,24,0.1)'
                            }}>{t.status}</span>
                          </td>
                          <td style={{ padding: '16px', fontSize: '13px' }}>
                            {t.ratingGiven ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--gold)', fontWeight: 700 }}>
                                {t.ratingGiven} <Star size={12} fill="var(--gold)" stroke="none" />
                              </span>
                            ) : t.status === 'completed' ? (
                              <button onClick={() => setRatingTrade(t)} className="btn btn-sm btn-gold" style={{ padding: '4px 8px', fontSize: '11px' }}>
                                Rate
                              </button>
                            ) : (
                              <span style={{ color: 'var(--text-3)' }}>---</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Mobile View Cards */}
                <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}>
                  {p2pTrades.map(t => {
                    const totalEtb = t.amountEth * (t.rate || 190);
                    return (
                      <div key={t._id} style={{ padding: '16px', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{new Date(t.createdAt).toLocaleDateString()}</span>
                          <span style={{
                            fontWeight: 800, fontSize: '10px', padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase',
                            color: t.status === 'completed' ? '#00d4a0' : t.status === 'cancelled' ? '#ef4444' : '#f5c518',
                            background: t.status === 'completed' ? 'rgba(0,212,160,0.1)' : t.status === 'cancelled' ? 'rgba(239,68,68,0.1)' : 'rgba(245,197,24,0.1)'
                          }}>{t.status}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: t.tradeType === 'buy' ? '#00d4a0' : '#ef4444' }}>
                            {t.tradeType.toUpperCase()}
                          </span>
                          <span style={{ fontSize: '16px', fontWeight: 900, fontFamily: 'JetBrains Mono, monospace' }}>${t.amountEth.toFixed(2)} USDT</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          <span>Rate: {t.rate || '---'} ETB</span>
                          <span>Total: <b>{totalEtb.toFixed(0)} ETB</b></span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '8px' }}>
                          <span>Partner: <b>@{t.counterparty}</b></span>
                          <div>
                            {t.ratingGiven ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--gold)', fontWeight: 700, fontSize: '12px' }}>
                                {t.ratingGiven} <Star size={12} fill="var(--gold)" stroke="none" />
                              </span>
                            ) : t.status === 'completed' ? (
                              <button onClick={() => setRatingTrade(t)} className="btn btn-sm btn-gold" style={{ padding: '4px 8px', fontSize: '11px' }}>
                                Rate Trade
                              </button>
                            ) : (
                              <span style={{ color: 'var(--text-3)' }}>---</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Wallet Transactions Summary Header */}
          <div className="card glass-card" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(245, 197, 24, 0.05) 0%, rgba(0, 212, 160, 0.05) 100%)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '16px' }}>This Month</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total In 📥</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#00d4a0' }}>+${walletSummary.in.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total Out 📤</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#ef4444' }}>-${walletSummary.out.toFixed(2)}</div>
              </div>
              <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '20px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Net Balance</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#fff' }}>${(walletSummary.in - walletSummary.out).toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Wallet Filters */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
              <input type="text" placeholder="Search by hash or note..." className="input" style={{ paddingLeft: '40px', marginBottom: 0 }} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <select className="input" style={{ width: 'auto', marginBottom: 0 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="deposit">Deposits</option>
              <option value="withdrawal">Withdrawals</option>
            </select>
            <input type="date" className="input" style={{ width: 'auto', marginBottom: 0, fontSize: '12px' }} value={dateRange.start} onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))} />
            <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>to</span>
            <input type="date" className="input" style={{ width: 'auto', marginBottom: 0, fontSize: '12px' }} value={dateRange.end} onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))} />
          </div>

          {/* Wallet List */}
          <div className="card" style={{ padding: '8px' }}>
            {transactions.length === 0 ? (
              <EmptyState icon="💸" title="No Transactions Found" subtitle="It looks like you haven't made any deposits or withdrawals yet matching your filters." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {transactions.map(tx => (
                  <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s ease' }} onClick={() => setSelectedTx(tx)}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {tx.type === 'deposit' ? <ArrowDownLeft color="#00d4a0" /> : <ArrowUpRight color="#ef4444" />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700 }}>{tx.type.toUpperCase()}</div>
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
                    <button onClick={(e) => { e.stopPropagation(); downloadReceipt(tx); }} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '4px' }}>
                      <Download size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── P2P TRADE RATING MODAL ─── */}
      {ratingTrade && (
        <div className="overlay modal-center" style={{ zIndex: 1100 }}>
          <div className="modal-box" style={{ maxWidth: '360px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Rate Your Partner</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '16px' }}>
              How was your experience trading with <b>@{ratingTrade.counterparty}</b>?
            </p>

            <form onSubmit={handleRatingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Star selector */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button type="button" key={star} onClick={() => setRatingStars(star)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                    <Star size={24} fill={star <= ratingStars ? 'var(--gold)' : 'none'} stroke={star <= ratingStars ? 'var(--gold)' : 'var(--text-3)'} />
                  </button>
                ))}
              </div>

              {/* Comment */}
              <textarea placeholder="Write a short comment (optional)..." className="input" style={{ width: '100%', height: '80px', fontSize: '13px' }} value={ratingComment} onChange={e => setRatingComment(e.target.value)} />
              
              {ratingError && <div style={{ color: 'var(--status-danger-text)', fontSize: '12px' }}>⚠️ {ratingError}</div>}

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setRatingTrade(null)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-gold" style={{ flex: 1 }}>Submit Rating</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── WALLET TRANSACTION DETAIL MODAL ─── */}
      {selectedTx && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)', padding: '20px' }} onClick={() => setSelectedTx(null)}>
          <div className="premium-glow" style={{ background: '#fafaf9', color: '#1c1917', maxWidth: '380px', width: '100%', borderRadius: '24px', padding: '32px 24px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(245, 197, 24, 0.15)', border: '2px solid #f5c518', fontFamily: "'Inter', sans-serif" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedTx(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(0,0,0,0.05)', border: 'none', width: '28px', height: '28px', borderRadius: '50%', color: '#44403c', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>✕</button>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '24px' }}>🛡️</span>
                <span style={{ fontWeight: 900, fontSize: '22px', color: '#1c1917' }}>EthioSwap</span>
              </div>
              <div style={{ fontSize: '11px', color: '#685e52', fontWeight: 600 }}>OFFICIAL TRANSACTION RECEIPT</div>
            </div>
            <div style={{ borderTop: '2px dashed #e7e5e4', margin: '16px 0' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#44403c' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#78716c' }}>Receipt No</span><span style={{ fontWeight: 700, fontFamily: 'monospace' }}>REC-{selectedTx.id.substring(0, 8).toUpperCase()}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#78716c' }}>Date</span><span style={{ fontWeight: 600 }}>{new Date(selectedTx.created_at).toLocaleString()}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#78716c' }}>Status</span><span style={{ fontWeight: 800, fontSize: '10px', color: '#047857', background: '#d1fae5', padding: '2px 8px', borderRadius: '12px' }}>{selectedTx.status}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#78716c' }}>Type</span><span style={{ fontWeight: 700, textTransform: 'uppercase' }}>{selectedTx.type}</span></div>
            </div>
            <div style={{ borderTop: '2px dashed #e7e5e4', margin: '16px 0' }} />
            <div style={{ background: '#f5f5f4', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#78716c' }}>From</span><span style={{ fontWeight: 700, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedTx.from}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#78716c' }}>To</span><span style={{ fontWeight: 700, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedTx.to}</span></div>
            </div>
            <div style={{ borderTop: '2px dashed #e7e5e4', margin: '16px 0' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Amount</span><span>${selectedTx.amount_usd.toFixed(2)} USD</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '16px', color: '#1c1917' }}><span>Total Net</span><span style={{ color: '#047857' }}>${selectedTx.amount_usd.toFixed(2)} USD</span></div>
            </div>
            <div style={{ borderTop: '2px dashed #e7e5e4', margin: '16px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ border: '2px solid #059669', borderRadius: '8px', padding: '4px 8px', color: '#059669', fontSize: '9px', fontWeight: 900 }}>🔒 SECURED</div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ borderTop: '1px solid #d1d5db', width: '110px', textAlign: 'center', fontSize: '9px', color: '#78716c', paddingTop: '4px' }}>Biruk Fikru</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => downloadReceipt(selectedTx)} style={{ flex: 1, padding: '12px', background: '#f5c518', color: '#1c1917', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}>Download PDF</button>
              <button onClick={() => setSelectedTx(null)} style={{ flex: 1, padding: '12px', background: '#e7e5e4', color: '#44403c', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .desktop-only {
          display: table;
        }
        .mobile-only {
          display: none;
        }
        @media (max-width: 768px) {
          .desktop-only {
            display: none;
          }
          .mobile-only {
            display: flex;
          }
        }
      `}</style>
    </div>
  );
};

export default TransactionHistory;
