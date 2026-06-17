import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { ArrowDownLeft, ArrowUpRight, Repeat, Send, Download, Search, Calendar, FileText, Star, TrendingUp } from 'lucide-react';
import jsPDF from 'jspdf';
import EmptyState from '../components/EmptyState.jsx';

const TransactionHistory = () => {
  const { user, myDepositReqs, myWithdrawalReqs, systemSettings } = useAuth();
  const { t } = useTranslation();

  const [activeHistoryTab, setActiveHistoryTab] = useState('p2p');
  
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTx, setSelectedTx] = useState(null);
  const [selectedP2pTx, setSelectedP2pTx] = useState(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const [p2pFilterStatus, setP2pFilterStatus] = useState('all');
  const [p2pFilterType, setP2pFilterType] = useState('all');
  const [p2pDateRange, setP2pDateRange] = useState({ start: '', end: '' });

  const [ratingTrade, setRatingTrade] = useState(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingError, setRatingError] = useState('');

  const [p2pTradesRaw, setP2pTradesRaw] = useState([]);

  useEffect(() => {
    if (!user?.id) return;
    const fetchTrades = async () => {
      const { data } = await supabase
        .from('trades')
        .select('*')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
      setP2pTradesRaw(data || []);
    };
    fetchTrades();
  }, [user?.id]);

  const p2pTrades = useMemo(() => {
    let list = p2pTradesRaw.map(t => {
      const isBuyer = user?.id === t.buyer_id;
      return {
        ...t,
        isBuyer,
        tradeType: isBuyer ? 'buy' : 'sell',
        counterparty: isBuyer ? t.seller_name : t.buyer_name,
        buyerId: t.buyer_id,
        sellerId: t.seller_id,
        buyerName: t.buyer_name,
        sellerName: t.seller_name,
        amountEth: t.amount_eth,
        createdAt: t.created_at,
        _id: t.id,
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (p2pFilterStatus !== 'all') {
      list = list.filter(t => t.status === p2pFilterStatus);
    }
    if (p2pFilterType !== 'all') {
      list = list.filter(t => t.tradeType === p2pFilterType);
    }
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

  const transactions = useMemo(() => {
    if (!user) return [];
    const deposits = (myDepositReqs || []).map(tx => ({
      id: tx.id,
      type: 'deposit',
      amount_usd: tx.amount_usd || 0,
      status: tx.status === 'approved' ? 'completed' : tx.status,
      created_at: tx.created_at,
      note: tx.sender_reference || tx.admin_note || 'Deposit',
      tx_hash: tx.id,
      from: tx.wallet_type || 'External Account',
      to: user.full_name || user.username || 'My Wallet',
      platform_fee: 0,
    }));
    const withdrawals = (myWithdrawalReqs || []).map(tx => ({
      id: tx.id,
      type: 'withdrawal',
      amount_usd: tx.amount_usd || 0,
      status: tx.status === 'completed' || tx.status === 'approved' ? 'completed' : tx.status,
      created_at: tx.created_at,
      note: tx.admin_note || 'Withdrawal',
      tx_hash: tx.destination_address || tx.id,
      from: user.full_name || user.username || 'My Wallet',
      to: tx.destination_address || tx.wallet_type || 'External Destination',
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

  const walletSummary = useMemo(() => {
    const totalIn = transactions
      .filter(tx => tx.type === 'deposit' && tx.status === 'completed')
      .reduce((sum, tx) => sum + tx.amount_usd, 0);
    const totalOut = transactions
      .filter(tx => tx.type === 'withdrawal' && tx.status === 'completed')
      .reduce((sum, tx) => sum + tx.amount_usd, 0);
    return { in: totalIn, out: totalOut };
  }, [transactions]);

  const completedP2pTrades = useMemo(() => {
    return p2pTradesRaw.filter(t => t.status === 'completed');
  }, [p2pTradesRaw]);

  const p2pStats = useMemo(() => {
    const totalTrades = completedP2pTrades.length;
    const usdtBought = completedP2pTrades
      .filter(t => t.buyer_id === user?.id)
      .reduce((sum, t) => sum + (t.amount_eth || 0), 0);
    const usdtSold = completedP2pTrades
      .filter(t => t.seller_id === user?.id)
      .reduce((sum, t) => sum + (t.amount_eth || 0), 0);
    return {
      totalTrades,
      usdtBought,
      usdtSold,
      avgRating: user?.averageRating || 5.0,
    };
  }, [completedP2pTrades, user?.id, user?.averageRating]);

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
      const date = new Date(t.created_at);
      const m = date.getMonth();
      const y = date.getFullYear();
      const match = months.find(item => item.monthNum === m && item.year === y);
      if (match) {
        match.volume += (t.amount_eth || 0);
      }
    });
    return months;
  }, [completedP2pTrades]);

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
      <div className="premium-dashboard-card" style={{ padding: '20px', borderRadius: '16px', background: '#141827', border: '1px solid #1E2640' }}>
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

  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    setRatingError('');
    if (!ratingTrade) return;
    try {
      await supabase.from('trade_ratings').insert({
        trade_id: ratingTrade._id,
        rater_id: user.id,
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

  const downloadReceipt = (tx) => {
    const doc = new jsPDF();
    const feePercent = systemSettings?.depositFeePercent ?? 5;
    const fee = tx.type === 'deposit' ? tx.amount_usd * feePercent / 100 : 0;
    const net = Math.max(0, tx.amount_usd - fee);
    
    // Header
    doc.setFillColor(10, 12, 24);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(245, 166, 35);
    doc.text('EthioSwap', 20, 22);
    doc.setFontSize(9);
    doc.setTextColor(180, 180, 180);
    doc.text('OFFICIAL TRANSACTION RECEIPT', 20, 32);
    doc.setTextColor(140, 140, 140);
    doc.text('ethioswap.qzz.io  ·  MrCute Finance Platform', 110, 22);
    doc.text('Powered by Supabase & EthioSwap Ltd.', 110, 30);

    // Divider
    doc.setDrawColor(245, 166, 35);
    doc.setLineWidth(0.8);
    doc.line(20, 44, 190, 44);

    // Info block
    doc.setTextColor(68, 64, 60);
    doc.setFontSize(10);
    const rows = [
      ['Receipt No', `REC-${tx.id.substring(0, 8).toUpperCase()}`],
      ['Date & Time', new Date(tx.created_at).toLocaleString()],
      ['Account Name', user?.full_name || user?.username || 'EthioSwap User'],
      ['Type', tx.type.toUpperCase()],
      ['Status', tx.status.toUpperCase()],
    ];
    let y = 54;
    rows.forEach(([label, val]) => {
      doc.setFont('helvetica', 'bold'); doc.text(label + ':', 20, y);
      doc.setFont('helvetica', 'normal'); doc.text(val, 75, y);
      y += 8;
    });

    doc.setDrawColor(220, 218, 215);
    doc.setLineWidth(0.4);
    doc.line(20, y + 2, 190, y + 2); y += 10;

    // From / To
    doc.setFont('helvetica', 'bold'); doc.text('From:', 20, y);
    doc.setFont('helvetica', 'normal'); doc.text(String(tx.from || 'External'), 75, y); y += 8;
    doc.setFont('helvetica', 'bold'); doc.text('To:', 20, y);
    doc.setFont('helvetica', 'normal'); doc.text(String(tx.to || 'My Wallet'), 75, y); y += 10;

    doc.line(20, y, 190, y); y += 8;

    // Amounts
    doc.setFont('helvetica', 'normal');
    doc.text('Amount:', 20, y); doc.text(`$${tx.amount_usd.toFixed(2)} USD`, 75, y); y += 8;
    doc.text(`Platform Fee (${tx.type === 'deposit' ? feePercent + '%' : '0%'}):`, 20, y);
    doc.text(fee > 0 ? `-$${fee.toFixed(2)} USD` : 'FREE ✓', 75, y); y += 10;

    doc.setDrawColor(245, 166, 35); doc.line(20, y, 190, y); y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(4, 120, 87);
    doc.text('TOTAL NET:', 20, y);
    doc.text(`$${net.toFixed(2)} USD`, 75, y); y += 16;

    // Signature section
    doc.setDrawColor(220, 218, 215); doc.setLineWidth(0.4);
    doc.line(20, y, 190, y); y += 10;

    doc.setFontSize(9); doc.setTextColor(120, 113, 108); doc.setFont('helvetica', 'normal');
    doc.text('[ SECURED BY ETHIOSWAP  ✓ ]', 20, y + 4);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(68, 64, 60);
    doc.text('Authorized Signature:', 120, y);
    doc.setFont('times', 'italic'); doc.setFontSize(15); doc.setTextColor(29, 78, 216);
    doc.text('Biruk Fikru', 120, y + 10);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120, 113, 108);
    doc.text('CEO & Founder, EthioSwap  ·  MrCute', 120, y + 17);

    // Footer
    doc.setFillColor(245, 166, 35); doc.rect(0, 280, 210, 17, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(10, 12, 24);
    doc.text('EthioSwap  —  Your Trusted Ethiopian Crypto Exchange  —  ethioswap.qzz.io', 20, 290);
    
    doc.save(`EthioSwap_Receipt_${tx.id.substring(0, 8)}.pdf`);
  };

  const downloadP2PReceipt = (trade) => {
    const doc = new jsPDF();
    const isFree = systemSettings?.isP2pFreePeriod !== false;
    const commissionPct = isFree ? 0 : (systemSettings?.commissionValue ?? 1);
    const fee = trade.amountEth * commissionPct / 100;
    const net = Math.max(0, trade.amountEth - fee);
    const totalEtb = trade.amountEth * (trade.rate || 190);

    // Header
    doc.setFillColor(10, 12, 24);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(245, 166, 35);
    doc.text('EthioSwap', 20, 22);
    doc.setFontSize(9); doc.setTextColor(180, 180, 180);
    doc.text('OFFICIAL P2P TRADE RECEIPT', 20, 32);
    doc.setTextColor(140, 140, 140);
    doc.text('ethioswap.qzz.io  ·  MrCute Finance Platform', 110, 22);
    doc.text('Powered by Supabase & EthioSwap Ltd.', 110, 30);

    doc.setDrawColor(245, 166, 35); doc.setLineWidth(0.8);
    doc.line(20, 44, 190, 44);

    doc.setTextColor(68, 64, 60); doc.setFontSize(10);
    const tradeType = trade.tradeType?.toUpperCase() || 'P2P TRADE';
    const counterparty = trade.counterparty || 'Unknown';
    const rows = [
      ['Receipt No', `P2P-${trade._id.substring(0, 8).toUpperCase()}`],
      ['Date & Time', new Date(trade.createdAt).toLocaleString()],
      ['Account Name', user?.full_name || user?.username || 'EthioSwap User'],
      ['Trade Type', tradeType],
      ['Status', (trade.status || 'pending').toUpperCase()],
    ];
    let y = 54;
    rows.forEach(([label, val]) => {
      doc.setFont('helvetica', 'bold'); doc.text(label + ':', 20, y);
      doc.setFont('helvetica', 'normal'); doc.text(val, 75, y);
      y += 8;
    });

    doc.setDrawColor(220, 218, 215); doc.setLineWidth(0.4);
    doc.line(20, y + 2, 190, y + 2); y += 10;

    doc.setFont('helvetica', 'bold'); doc.text('Buyer:', 20, y);
    doc.setFont('helvetica', 'normal'); doc.text(`@${trade.buyerName || 'buyer'}`, 75, y); y += 8;
    doc.setFont('helvetica', 'bold'); doc.text('Seller:', 20, y);
    doc.setFont('helvetica', 'normal'); doc.text(`@${trade.sellerName || 'seller'}`, 75, y); y += 8;
    doc.setFont('helvetica', 'bold'); doc.text('Trade Partner:', 20, y);
    doc.setFont('helvetica', 'normal'); doc.text(`@${counterparty}`, 75, y); y += 10;

    doc.line(20, y, 190, y); y += 8;

    doc.setFont('helvetica', 'normal');
    doc.text('Amount (USDT):', 20, y); doc.text(`$${trade.amountEth.toFixed(2)} USDT`, 75, y); y += 8;
    doc.text('Rate:', 20, y); doc.text(`${trade.rate || 190} ETB / $1`, 75, y); y += 8;
    doc.text('Total (ETB):', 20, y); doc.text(`${totalEtb.toFixed(0)} ETB`, 75, y); y += 8;
    doc.text(`Platform Fee (${isFree ? 'FREE PERIOD' : commissionPct + '%'}):`, 20, y);
    doc.text(isFree ? 'FREE ✓' : `-$${fee.toFixed(2)} USDT`, 75, y); y += 10;

    doc.setDrawColor(245, 166, 35); doc.line(20, y, 190, y); y += 8;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(4, 120, 87);
    doc.text('NET RECEIVED:', 20, y);
    doc.text(`$${net.toFixed(2)} USDT`, 75, y); y += 16;

    doc.setDrawColor(220, 218, 215); doc.setLineWidth(0.4);
    doc.line(20, y, 190, y); y += 10;
    doc.setFontSize(9); doc.setTextColor(120, 113, 108); doc.setFont('helvetica', 'normal');
    doc.text('[ SECURED BY ETHIOSWAP  ✓ ]', 20, y + 4);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(68, 64, 60);
    doc.text('Authorized Signature:', 120, y);
    doc.setFont('times', 'italic'); doc.setFontSize(15); doc.setTextColor(29, 78, 216);
    doc.text('Biruk Fikru', 120, y + 10);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120, 113, 108);
    doc.text('CEO & Founder, EthioSwap  ·  MrCute', 120, y + 17);

    doc.setFillColor(245, 166, 35); doc.rect(0, 280, 210, 17, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(10, 12, 24);
    doc.text('EthioSwap  —  Your Trusted Ethiopian Crypto Exchange  —  ethioswap.qzz.io', 20, 290);

    doc.save(`EthioSwap_P2P_Receipt_${trade._id.substring(0, 8)}.pdf`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      <style>{`
        @keyframes hist-fade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .hist-row { animation: hist-fade 0.3s ease both; }
        .hist-row:hover { background: rgba(255,255,255,0.04) !important; border-color: rgba(255,255,255,0.08) !important; }
        .tx-tab-btn { transition: all 0.2s ease !important; }
        .tx-tab-btn:hover { opacity: 0.85; }
        .filter-select:focus { border-color: rgba(245,166,35,0.3) !important; outline: none; }
      `}</style>
      
      <div style={{ background: '#141827', border: '1px solid #1E2640', borderRadius: '20px', padding: '6px', display: 'flex', gap: '6px' }}>
        <button onClick={() => setActiveHistoryTab('p2p')} className="tx-tab-btn" style={{ flex: 1, padding: '14px', borderRadius: '14px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', fontFamily: 'inherit', transition: 'all 0.2s ease', background: activeHistoryTab === 'p2p' ? '#F5A623' : 'transparent', color: activeHistoryTab === 'p2p' ? '#04342C' : '#8A9BB8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: activeHistoryTab === 'p2p' ? '0 4px 16px rgba(245,166,35,0.25)' : 'none' }}>
          🤝 P2P Trade History
        </button>
        <button onClick={() => setActiveHistoryTab('wallet')} className="tx-tab-btn" style={{ flex: 1, padding: '14px', borderRadius: '14px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', fontFamily: 'inherit', transition: 'all 0.2s ease', background: activeHistoryTab === 'wallet' ? '#00C896' : 'transparent', color: activeHistoryTab === 'wallet' ? '#04342C' : '#8A9BB8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: activeHistoryTab === 'wallet' ? '0 4px 16px rgba(0,200,150,0.25)' : 'none' }}>
          💳 Wallet Transactions
        </button>
      </div>

      {activeHistoryTab === 'p2p' ? (
        <>
          <div style={{ background: 'linear-gradient(135deg, rgba(245,166,35,0.06) 0%, rgba(0,200,150,0.04) 100%)', border: '1px solid rgba(245,166,35,0.12)', borderRadius: '18px', padding: '24px' }}>
            <h3 style={{ fontSize: '11px', fontWeight: 600, color: '#8A9BB8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '18px' }}>P2P Trading Portfolio</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#8A9BB8', marginBottom: '6px', fontWeight: 600 }}>Trades Done</div>
                <div style={{ fontSize: '26px', fontWeight: 600, color: '#fff', fontFamily: "'JetBrains Mono', monospace" }}>{p2pStats.totalTrades}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#8A9BB8', marginBottom: '6px', fontWeight: 600 }}>Total Bought</div>
                <div style={{ fontSize: '22px', fontWeight: 600, color: '#00C896', fontFamily: "'JetBrains Mono', monospace" }}>+${p2pStats.usdtBought.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#8A9BB8', marginBottom: '6px', fontWeight: 600 }}>Total Sold</div>
                <div style={{ fontSize: '22px', fontWeight: 600, color: '#FF4D4D', fontFamily: "'JetBrains Mono', monospace" }}>-${p2pStats.usdtSold.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#8A9BB8', marginBottom: '6px', fontWeight: 600 }}>Avg Rating</div>
                <div style={{ fontSize: '22px', fontWeight: 600, color: '#F5A623', fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {p2pStats.avgRating.toFixed(1)} <Star size={16} fill="#F5A623" stroke="none" />
                </div>
              </div>
            </div>
          </div>

          {renderVolumeChart()}

          <div style={{ background: '#141827', border: '1px solid #1E2640', borderRadius: '14px', padding: '14px 16px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <select className="filter-select" style={{ flex: 1, minWidth: '130px', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#fff', fontSize: '12px', fontFamily: 'inherit', fontWeight: 600 }} value={p2pFilterStatus} onChange={e => setP2pFilterStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="disputed">Disputed</option>
            </select>
            <select className="filter-select" style={{ flex: 1, minWidth: '130px', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#fff', fontSize: '12px', fontFamily: 'inherit', fontWeight: 600 }} value={p2pFilterType} onChange={e => setP2pFilterType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="buy">Buy Trades</option>
              <option value="sell">Sell Trades</option>
            </select>
            <input type="date" style={{ flex: 1, minWidth: '130px', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#fff', fontSize: '12px', fontFamily: 'inherit' }} value={p2pDateRange.start} onChange={e => setP2pDateRange(p => ({ ...p, start: e.target.value }))} />
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>→</span>
            <input type="date" style={{ flex: 1, minWidth: '130px', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#fff', fontSize: '12px', fontFamily: 'inherit' }} value={p2pDateRange.end} onChange={e => setP2pDateRange(p => ({ ...p, end: e.target.value }))} />
            
            <button onClick={handleExportCSV} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '10px', color: '#F5A623', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s ease', whiteSpace: 'nowrap' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,166,35,0.18)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,166,35,0.1)'; }}
            >
              <Download size={13} /> Export CSV
            </button>
          </div>

          <div style={{ background: '#141827', border: '1px solid #1E2640', borderRadius: '18px', overflow: 'hidden' }}>
            {p2pTrades.length === 0 ? (
              <EmptyState icon="🤝" title="No Trades Found" subtitle="You haven't participated in any trades yet matching these filters." />
            ) : (
              <>
                <table className="desktop-only" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1E2640', background: '#141827' }}>
                      <th style={{ padding: '16px', fontSize: '11px', color: '#8A9BB8', textTransform: 'uppercase', fontWeight: 600 }}>Date</th>
                      <th style={{ padding: '16px', fontSize: '11px', color: '#8A9BB8', textTransform: 'uppercase', fontWeight: 600 }}>Type</th>
                      <th style={{ padding: '16px', fontSize: '11px', color: '#8A9BB8', textTransform: 'uppercase', fontWeight: 600 }}>Amount</th>
                      <th style={{ padding: '16px', fontSize: '11px', color: '#8A9BB8', textTransform: 'uppercase', fontWeight: 600 }}>Rate</th>
                      <th style={{ padding: '16px', fontSize: '11px', color: '#8A9BB8', textTransform: 'uppercase', fontWeight: 600 }}>Total</th>
                      <th style={{ padding: '16px', fontSize: '11px', color: '#8A9BB8', textTransform: 'uppercase', fontWeight: 600 }}>Partner</th>
                      <th style={{ padding: '16px', fontSize: '11px', color: '#8A9BB8', textTransform: 'uppercase', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '16px', fontSize: '11px', color: '#8A9BB8', textTransform: 'uppercase', fontWeight: 600 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p2pTrades.map(t => {
                      const totalEtb = t.amountEth * (t.rate || 190);
                      return (
                        <tr key={t._id} style={{ borderBottom: '1px solid #1E2640' }}>
                          <td style={{ padding: '16px', fontSize: '13px' }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                          <td style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: t.tradeType === 'buy' ? '#00C896' : '#FF4D4D' }}>
                            {t.tradeType.toUpperCase()}
                          </td>
                          <td style={{ padding: '16px', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace' }}>${t.amountEth.toFixed(2)}</td>
                          <td style={{ padding: '16px', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace' }}>{t.rate?.toFixed(2) || '---'} ETB</td>
                          <td style={{ padding: '16px', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{totalEtb.toFixed(2)} ETB</td>
                          <td style={{ padding: '16px', fontSize: '13px', fontWeight: 600 }}>@{t.counterparty || 'user'}</td>
                          <td style={{ padding: '16px', fontSize: '12px' }}>
                            <span style={{
                              fontWeight: 600, fontSize: '10px', padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase',
                              color: t.status === 'completed' ? '#00C896' : t.status === 'cancelled' ? '#FF4D4D' : '#F5A623',
                              background: t.status === 'completed' ? 'rgba(0,200,150,0.12)' : t.status === 'cancelled' ? 'rgba(255,77,77,0.12)' : 'rgba(245,166,35,0.12)'
                            }}>{t.status}</span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                              <button onClick={() => setSelectedP2pTx(t)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '8px', color: '#F5A623', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s ease', whiteSpace: 'nowrap' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,166,35,0.16)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,166,35,0.08)'; }}
                              >
                                <FileText size={11} /> View
                              </button>
                              {t.ratingGiven ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#F5A623', fontWeight: 600 }}>
                                  {t.ratingGiven} <Star size={12} fill="#F5A623" stroke="none" />
                                </span>
                              ) : t.status === 'completed' ? (
                                <button onClick={() => setRatingTrade(t)} className="btn btn-sm btn-gold" style={{ padding: '4px 8px', fontSize: '11px' }}>
                                  Rate
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}>
                  {p2pTrades.map(t => {
                    const totalEtb = t.amountEth * (t.rate || 190);
                    return (
                      <div key={t._id} style={{ padding: '16px', background: '#1A1F32', borderRadius: '12px', border: '1px solid #1E2640', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: '#8A9BB8' }}>{new Date(t.createdAt).toLocaleDateString()}</span>
                          <span style={{
                            fontWeight: 600, fontSize: '10px', padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase',
                            color: t.status === 'completed' ? '#00C896' : t.status === 'cancelled' ? '#FF4D4D' : '#F5A623',
                            background: t.status === 'completed' ? 'rgba(0,200,150,0.12)' : t.status === 'cancelled' ? 'rgba(255,77,77,0.12)' : 'rgba(245,166,35,0.12)'
                          }}>{t.status}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: t.tradeType === 'buy' ? '#00C896' : '#FF4D4D' }}>
                            {t.tradeType.toUpperCase()}
                          </span>
                          <span style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>${t.amountEth.toFixed(2)} USDT</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#8A9BB8' }}>
                          <span>Rate: {t.rate || '---'} ETB</span>
                          <span>Total: <b>{totalEtb.toFixed(0)} ETB</b></span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1E2640', paddingTop: '8px' }}>
                          <span style={{ fontSize: '12px' }}>Partner: <b>@{t.counterparty}</b></span>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <button onClick={() => setSelectedP2pTx(t)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '8px', color: '#F5A623', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                              <FileText size={11} /> View
                            </button>
                            {t.ratingGiven ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#F5A623', fontWeight: 600, fontSize: '12px' }}>
                                {t.ratingGiven} <Star size={12} fill="#F5A623" stroke="none" />
                              </span>
                            ) : t.status === 'completed' ? (
                              <button onClick={() => setRatingTrade(t)} className="btn btn-sm btn-gold" style={{ padding: '4px 8px', fontSize: '11px' }}>
                                Rate
                              </button>
                            ) : null}
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
          <div style={{ background: 'linear-gradient(135deg, rgba(0,200,150,0.06) 0%, rgba(245,166,35,0.04) 100%)', border: '1px solid rgba(0,200,150,0.12)', borderRadius: '18px', padding: '24px' }}>
            <h3 style={{ fontSize: '11px', fontWeight: 600, color: '#8A9BB8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '18px' }}>Wallet Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#8A9BB8', marginBottom: '6px', fontWeight: 600 }}>Total In</div>
                <div style={{ fontSize: '22px', fontWeight: 600, color: '#00C896', fontFamily: "'JetBrains Mono', monospace" }}>+${walletSummary.in.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#8A9BB8', marginBottom: '6px', fontWeight: 600 }}>Total Out</div>
                <div style={{ fontSize: '22px', fontWeight: 600, color: '#FF4D4D', fontFamily: "'JetBrains Mono', monospace" }}>-${walletSummary.out.toFixed(2)}</div>
              </div>
              <div style={{ borderLeft: '1px solid #1E2640', paddingLeft: '20px' }}>
                <div style={{ fontSize: '11px', color: '#8A9BB8', marginBottom: '6px', fontWeight: 600 }}>Net Balance</div>
                <div style={{ fontSize: '22px', fontWeight: 600, color: '#fff', fontFamily: "'JetBrains Mono', monospace" }}>${(walletSummary.in - walletSummary.out).toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div style={{ background: '#141827', border: '1px solid #1E2640', borderRadius: '14px', padding: '14px 16px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 2, minWidth: '180px', position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
              <input type="text" placeholder="Search by hash or note..." style={{ width: '100%', paddingLeft: '36px', paddingRight: '12px', paddingTop: '9px', paddingBottom: '9px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#fff', fontSize: '12px', fontFamily: 'inherit', outline: 'none' }} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <select className="filter-select" style={{ flex: 1, minWidth: '130px', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#fff', fontSize: '12px', fontFamily: 'inherit', fontWeight: 600 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="deposit">Deposits</option>
              <option value="withdrawal">Withdrawals</option>
            </select>
            <input type="date" style={{ flex: 1, minWidth: '130px', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#fff', fontSize: '12px', fontFamily: 'inherit' }} value={dateRange.start} onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))} />
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>→</span>
            <input type="date" style={{ flex: 1, minWidth: '130px', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#fff', fontSize: '12px', fontFamily: 'inherit' }} value={dateRange.end} onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))} />
          </div>

          <div style={{ background: '#141827', border: '1px solid #1E2640', borderRadius: '18px', padding: '12px' }}>
            {transactions.length === 0 ? (
              <EmptyState icon="💸" title="No Transactions Found" subtitle="It looks like you haven't made any deposits or withdrawals yet matching your filters." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {transactions.map(tx => (
                  <div key={tx.id} className="hist-row" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 16px', borderRadius: '12px', background: '#1A1F32', border: '1px solid #1E2640', cursor: 'pointer', transition: 'all 0.2s ease' }} onClick={() => setSelectedTx(tx)}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: tx.type === 'deposit' ? 'rgba(0,200,150,0.12)' : 'rgba(255,77,77,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {tx.type === 'deposit' ? <ArrowDownLeft color="#00C896" size={20} /> : <ArrowUpRight color="#FF4D4D" size={20} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{tx.type === 'deposit' ? 'Deposit Received' : 'Withdrawal Sent'}</div>
                      <div style={{ fontSize: '11px', color: '#8A9BB8', marginTop: '2px' }}>{new Date(tx.created_at).toLocaleString()}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: tx.type === 'deposit' ? '#00C896' : '#FF4D4D', fontFamily: "'JetBrains Mono', monospace" }}>
                        {tx.type === 'deposit' ? '+' : '-'}${tx.amount_usd.toFixed(2)}
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        <span style={{ fontSize: '9px', fontWeight: 600, padding: '2px 7px', borderRadius: '99px', textTransform: 'uppercase', background: tx.status === 'completed' ? 'rgba(0,200,150,0.12)' : 'rgba(245,166,35,0.12)', color: tx.status === 'completed' ? '#00C896' : '#F5A623' }}>
                          {tx.status}
                        </span>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); downloadReceipt(tx); }} style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.15)', borderRadius: '8px', color: '#F5A623', cursor: 'pointer', padding: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', flexShrink: 0 }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,166,35,0.15)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,166,35,0.08)'; }}
                    >
                      <Download size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {ratingTrade && (
        <div className="overlay modal-center" style={{ zIndex: 1100 }}>
          <div className="modal-box" style={{ maxWidth: '360px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Rate Your Partner</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '16px' }}>
              How was your experience trading with <b>@{ratingTrade.counterparty}</b>?
            </p>
            <form onSubmit={handleRatingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button type="button" key={star} onClick={() => setRatingStars(star)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                    <Star size={24} fill={star <= ratingStars ? 'var(--gold)' : 'none'} stroke={star <= ratingStars ? 'var(--gold)' : 'var(--text-3)'} />
                  </button>
                ))}
              </div>
              <textarea placeholder="Write a short comment (optional)..." className="input" style={{ width: '100%', height: '80px', fontSize: '13px' }} value={ratingComment} onChange={e => setRatingComment(e.target.value)} />
              {ratingError && <div style={{ color: 'var(--status-danger-text)', fontSize: '12px' }}>{ratingError}</div>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setRatingTrade(null)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-gold" style={{ flex: 1 }}>Submit Rating</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Premium Transaction Receipt Modal ── */}
      {selectedTx && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(12px)', padding: '20px', overflowY: 'auto' }} onClick={() => setSelectedTx(null)}>
          <div style={{ background: '#fff', color: '#1c1917', maxWidth: '400px', width: '100%', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(245,166,35,0.3)', fontFamily: "'Inter', sans-serif", position: 'relative' }} onClick={e => e.stopPropagation()}>
            {/* Header Band */}
            <div style={{ background: 'linear-gradient(135deg, #0a0c18 0%, #141827 100%)', padding: '24px 24px 20px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(245,166,35,0.08)', filter: 'blur(20px)' }} />
              <button onClick={() => setSelectedTx(null)} style={{ position: 'absolute', top: '14px', right: '14px', background: 'rgba(255,255,255,0.08)', border: 'none', width: '28px', height: '28px', borderRadius: '50%', color: '#fff', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🛡️</div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '18px', color: '#F5A623', letterSpacing: '-0.02em' }}>EthioSwap</div>
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.12em' }}>OFFICIAL TRANSACTION RECEIPT</div>
                </div>
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>ethioswap.qzz.io  ·  MrCute Finance Platform</div>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 24px 24px', background: '#fff' }}>
              {/* Receipt details */}
              <div style={{ borderBottom: '2px dashed #e7e5e4', paddingBottom: '14px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '12px', color: '#44403c' }}>
                {[['Receipt No', `REC-${selectedTx.id.substring(0, 8).toUpperCase()}`], ['Date & Time', new Date(selectedTx.created_at).toLocaleString()], ['Account Name', user?.full_name || user?.username || 'User'], ['Transaction Type', selectedTx.type?.toUpperCase()]].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#78716c' }}>{k}</span>
                    <span style={{ fontWeight: 700, fontFamily: k === 'Receipt No' ? 'monospace' : 'inherit', fontSize: k === 'Receipt No' ? '11px' : '12px' }}>{v}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#78716c' }}>Status</span>
                  <span style={{ fontWeight: 800, fontSize: '10px', color: selectedTx.status === 'completed' || selectedTx.status === 'approved' ? '#047857' : '#d97706', background: selectedTx.status === 'completed' || selectedTx.status === 'approved' ? '#d1fae5' : '#fef3c7', padding: '2px 10px', borderRadius: '99px', textTransform: 'uppercase' }}>{selectedTx.status}</span>
                </div>
              </div>

              {/* From / To */}
              <div style={{ background: '#f5f5f4', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#78716c', fontWeight: 600 }}>FROM</span>
                  <span style={{ fontWeight: 700, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedTx.from}</span>
                </div>
                <div style={{ height: 1, background: '#e7e5e4' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#78716c', fontWeight: 600 }}>TO</span>
                  <span style={{ fontWeight: 700, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedTx.to}</span>
                </div>
              </div>

              {/* Fee breakdown */}
              <div style={{ background: '#f5f5f4', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#78716c' }}>Amount</span>
                  <span style={{ fontWeight: 600 }}>${selectedTx.amount_usd.toFixed(2)} USD</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#78716c' }}>Platform Fee</span>
                  <span style={{ fontWeight: 700, color: '#059669' }}>FREE ✓</span>
                </div>
                <div style={{ height: 1, background: '#e7e5e4' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '16px', color: '#1c1917' }}>
                  <span>TOTAL NET</span>
                  <span style={{ color: '#047857' }}>${selectedTx.amount_usd.toFixed(2)} USD</span>
                </div>
              </div>

              {/* Signature footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '8px', paddingTop: '14px', borderTop: '2px dashed #e7e5e4' }}>
                <div style={{ display: 'flex', flex: 1 }}>
                  <div style={{ border: '2px solid #059669', borderRadius: '8px', padding: '5px 10px', color: '#059669', fontSize: '9px', fontWeight: 900, letterSpacing: '0.06em', display: 'inline-block', height: 'fit-content' }}>SECURED ✓</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Georgia', serif", fontSize: '18px', color: '#1d4ed8', fontStyle: 'italic', lineHeight: 1, marginBottom: '4px' }}>Biruk Fikru</div>
                  <div style={{ height: '1px', background: '#d1d5db', marginBottom: '4px', width: '120px' }} />
                  <div style={{ fontSize: '9px', color: '#78716c', fontWeight: 600 }}>CEO & Founder, EthioSwap</div>
                  <div style={{ fontSize: '8px', color: '#a8a29e' }}>MrCute Finance Platform</div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button onClick={() => downloadReceipt(selectedTx)} style={{ flex: 1, padding: '13px', background: 'linear-gradient(135deg, #F5A623, #FFD966)', color: '#1c1917', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s ease' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <Download size={14} /> Download PDF
                </button>
                <button onClick={() => setSelectedTx(null)} style={{ flex: 1, padding: '13px', background: '#f5f5f4', color: '#44403c', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── P2P Trade Receipt Modal ── */}
      {selectedP2pTx && (() => {
        const t = selectedP2pTx;
        const isFree = systemSettings?.isP2pFreePeriod !== false;
        const commPct = isFree ? 0 : (systemSettings?.commissionValue ?? 1);
        const fee = t.amountEth * commPct / 100;
        const net = Math.max(0, t.amountEth - fee);
        const totalEtb = t.amountEth * (t.rate || 190);
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(12px)', padding: '20px', overflowY: 'auto' }} onClick={() => setSelectedP2pTx(null)}>
            <div style={{ background: '#fff', color: '#1c1917', maxWidth: '400px', width: '100%', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,200,150,0.3)', fontFamily: "'Inter', sans-serif" }} onClick={e => e.stopPropagation()}>
              {/* Header Band */}
              <div style={{ background: 'linear-gradient(135deg, #0a0c18 0%, #141827 100%)', padding: '24px 24px 20px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(0,200,150,0.08)', filter: 'blur(20px)' }} />
                <button onClick={() => setSelectedP2pTx(null)} style={{ position: 'absolute', top: '14px', right: '14px', background: 'rgba(255,255,255,0.08)', border: 'none', width: '28px', height: '28px', borderRadius: '50%', color: '#fff', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(0,200,150,0.15)', border: '1px solid rgba(0,200,150,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🤝</div>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '18px', color: '#00C896', letterSpacing: '-0.02em' }}>EthioSwap</div>
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.12em' }}>OFFICIAL P2P TRADE RECEIPT</div>
                  </div>
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>ethioswap.qzz.io  ·  MrCute Finance Platform</div>
              </div>

              {/* Body */}
              <div style={{ padding: '20px 24px 24px' }}>
                {/* Trade details */}
                <div style={{ borderBottom: '2px dashed #e7e5e4', paddingBottom: '14px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '12px', color: '#44403c' }}>
                  {[
                    ['Receipt No', `P2P-${t._id.substring(0, 8).toUpperCase()}`],
                    ['Date & Time', new Date(t.createdAt).toLocaleString()],
                    ['Account Name', user?.full_name || user?.username || 'User'],
                    ['Trade Type', t.tradeType?.toUpperCase()],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#78716c' }}>{k}</span>
                      <span style={{ fontWeight: 700, fontFamily: k === 'Receipt No' ? 'monospace' : 'inherit', color: k === 'Trade Type' ? (t.tradeType === 'buy' ? '#047857' : '#b91c1c') : '#1c1917' }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#78716c' }}>Status</span>
                    <span style={{ fontWeight: 800, fontSize: '10px', color: t.status === 'completed' ? '#047857' : '#d97706', background: t.status === 'completed' ? '#d1fae5' : '#fef3c7', padding: '2px 10px', borderRadius: '99px', textTransform: 'uppercase' }}>{t.status}</span>
                  </div>
                </div>

                {/* Buyer / Seller */}
                <div style={{ background: '#f5f5f4', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#78716c', fontWeight: 600 }}>BUYER</span>
                    <span style={{ fontWeight: 700 }}>@{t.buyerName || 'buyer'}</span>
                  </div>
                  <div style={{ height: 1, background: '#e7e5e4' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#78716c', fontWeight: 600 }}>SELLER</span>
                    <span style={{ fontWeight: 700 }}>@{t.sellerName || 'seller'}</span>
                  </div>
                  <div style={{ height: 1, background: '#e7e5e4' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#78716c', fontWeight: 600 }}>TRADE PARTNER</span>
                    <span style={{ fontWeight: 700, color: '#047857' }}>@{t.counterparty}</span>
                  </div>
                </div>

                {/* Amounts */}
                <div style={{ background: '#f5f5f4', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#78716c' }}>Amount (USDT)</span>
                    <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>${t.amountEth.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#78716c' }}>Exchange Rate</span>
                    <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{t.rate || 190} ETB / $1</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#78716c' }}>Total (ETB)</span>
                    <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{totalEtb.toFixed(0)} ETB</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#78716c' }}>Platform Fee</span>
                    <span style={{ fontWeight: 700, color: '#059669' }}>{isFree ? 'FREE ✓ (0%)' : `-$${fee.toFixed(2)} USDT (${commPct}%)`}</span>
                  </div>
                  <div style={{ height: 1, background: '#e7e5e4' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '16px', color: '#1c1917' }}>
                    <span>NET RECEIVED</span>
                    <span style={{ color: '#047857', fontFamily: 'monospace' }}>${net.toFixed(2)} USDT</span>
                  </div>
                </div>

                {/* Signature */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '14px', borderTop: '2px dashed #e7e5e4' }}>
                  <div style={{ border: '2px solid #059669', borderRadius: '8px', padding: '5px 10px', color: '#059669', fontSize: '9px', fontWeight: 900, letterSpacing: '0.06em', height: 'fit-content' }}>SECURED ✓</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Georgia', serif", fontSize: '18px', color: '#1d4ed8', fontStyle: 'italic', lineHeight: 1, marginBottom: '4px' }}>Biruk Fikru</div>
                    <div style={{ height: '1px', background: '#d1d5db', marginBottom: '4px', width: '120px' }} />
                    <div style={{ fontSize: '9px', color: '#78716c', fontWeight: 600 }}>CEO & Founder, EthioSwap</div>
                    <div style={{ fontSize: '8px', color: '#a8a29e' }}>MrCute Finance Platform</div>
                  </div>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button onClick={() => downloadP2PReceipt(t)} style={{ flex: 1, padding: '13px', background: 'linear-gradient(135deg, #00C896, #00e6ad)', color: '#023026', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <Download size={14} /> Download PDF
                  </button>
                  <button onClick={() => setSelectedP2pTx(null)} style={{ flex: 1, padding: '13px', background: '#f5f5f4', color: '#44403c', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>Close</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      
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