import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { ArrowDownLeft, ArrowUpRight, Repeat, Send, Download, Search, Calendar, FileText, Star, TrendingUp, X } from 'lucide-react';
import jsPDF from 'jspdf';
import EmptyState from '../components/EmptyState.jsx';

const parsePaymentMethod = (pm) => {
  if (!pm) return { type: 'N/A' };
  if (typeof pm === 'object') return pm;
  try {
    if (pm.startsWith('{') || pm.startsWith('[')) {
      return JSON.parse(pm);
    }
  } catch (e) {
    // Ignore and fallback
  }
  return { type: pm };
};

const getStatusDetails = (status) => {
  const s = String(status).toLowerCase();
  if (s === 'completed' || s === 'approved') {
    return {
      label: '✓ Completed',
      color: '#F5A623', // Gold
      bg: 'rgba(245, 166, 35, 0.12)'
    };
  }
  if (s === 'cancelled' || s === 'rejected' || s === 'failed') {
    return {
      label: '✗ Cancelled',
      color: '#FF4D4D', // Red
      bg: 'rgba(255, 77, 77, 0.12)'
    };
  }
  // Pending / Paid / Disputed
  return {
    label: '⏳ Pending',
    color: '#FFC107', // Yellow
    bg: 'rgba(255, 193, 7, 0.12)'
  };
};

const TransactionHistory = () => {
  const { user, myDepositReqs, myWithdrawalReqs, systemSettings } = useAuth();
  const { t } = useTranslation();

  const [activeHistoryTab, setActiveHistoryTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedTx, setSelectedTx] = useState(null);
  
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

  // Combined Portfolio stats
  const stats = useMemo(() => {
    const totalDeposited = (myDepositReqs || [])
      .filter(tx => tx.status === 'approved' || tx.status === 'completed')
      .reduce((sum, tx) => sum + (tx.amount_usd || 0), 0);

    const totalWithdrawn = (myWithdrawalReqs || [])
      .filter(tx => tx.status === 'completed' || tx.status === 'approved')
      .reduce((sum, tx) => sum + (tx.amount_usd || 0), 0);

    const completedTrades = p2pTradesRaw.filter(t => t.status === 'completed');
    const usdtBought = completedTrades
      .filter(t => t.buyer_id === user?.id)
      .reduce((sum, t) => sum + (t.amount_eth || 0), 0);

    const usdtSold = completedTrades
      .filter(t => t.seller_id === user?.id)
      .reduce((sum, t) => sum + (t.amount_eth || 0), 0);

    return {
      deposited: totalDeposited,
      withdrawn: totalWithdrawn,
      bought: usdtBought,
      sold: usdtSold,
      tradesCount: completedTrades.length,
      avgRating: user?.averageRating || 5.0
    };
  }, [p2pTradesRaw, myDepositReqs, myWithdrawalReqs, user?.id, user?.averageRating]);

  // Combined Transaction List
  const combinedList = useMemo(() => {
    // 1. P2P Trades mapping
    const p2pList = p2pTradesRaw.map(t => {
      const isBuyer = user?.id === t.buyer_id;
      return {
        id: `p2p-${t.id}`,
        realId: t.id,
        source: 'p2p',
        type: isBuyer ? 'buy' : 'sell',
        counterparty: isBuyer ? t.seller_name : t.buyer_name,
        amountUsdt: t.amount_eth || 0,
        rate: t.rate || 0,
        amountEtb: (t.amount_eth || 0) * (t.rate || 0),
        createdAt: t.created_at,
        status: t.status,
        original: t,
        paymentMethod: t.payment_method,
        ratingGiven: t.ratingGiven
      };
    });

    // 2. Deposits mapping
    const deposits = (myDepositReqs || []).map(tx => ({
      id: `deposit-${tx.id}`,
      realId: tx.id,
      source: 'wallet',
      type: 'deposit',
      counterparty: 'EthioSwap',
      amountUsdt: tx.amount_usd || 0,
      rate: null,
      amountEtb: null,
      createdAt: tx.created_at,
      status: tx.status === 'approved' ? 'completed' : tx.status,
      original: tx,
      paymentMethod: tx.wallet_type,
      ratingGiven: null
    }));

    // 3. Withdrawals mapping
    const withdrawals = (myWithdrawalReqs || []).map(tx => ({
      id: `withdrawal-${tx.id}`,
      realId: tx.id,
      source: 'wallet',
      type: 'withdrawal',
      counterparty: 'EthioSwap',
      amountUsdt: tx.amount_usd || 0,
      rate: null,
      amountEtb: null,
      createdAt: tx.created_at,
      status: (tx.status === 'completed' || tx.status === 'approved') ? 'completed' : tx.status,
      original: tx,
      paymentMethod: tx.wallet_type,
      ratingGiven: null
    }));

    // Merge and sort chronologically descending
    return [...p2pList, ...deposits, ...withdrawals].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [p2pTradesRaw, myDepositReqs, myWithdrawalReqs, user?.id]);

  // Filtered Transaction List
  const filteredList = useMemo(() => {
    let list = combinedList;

    // 1. Tab filters
    if (activeHistoryTab === 'buys') {
      list = list.filter(item => item.type === 'buy');
    } else if (activeHistoryTab === 'sells') {
      list = list.filter(item => item.type === 'sell');
    } else if (activeHistoryTab === 'deposits') {
      list = list.filter(item => item.type === 'deposit');
    } else if (activeHistoryTab === 'withdrawals') {
      list = list.filter(item => item.type === 'withdrawal');
    }

    // 2. Search filters
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      list = list.filter(item => 
        item.realId.toLowerCase().includes(q) ||
        item.counterparty.toLowerCase().includes(q) ||
        (item.paymentMethod && String(item.paymentMethod).toLowerCase().includes(q))
      );
    }

    // 3. Date range filters
    if (dateRange.start) {
      list = list.filter(item => new Date(item.createdAt) >= new Date(dateRange.start));
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      list = list.filter(item => new Date(item.createdAt) <= endDate);
    }

    return list;
  }, [combinedList, activeHistoryTab, searchTerm, dateRange]);

  // CSV Exporter for visible/filtered list
  const handleExportCSV = () => {
    const headers = ['Date', 'Type', 'Source', 'Amount (USDT)', 'Rate (ETB/USDT)', 'Total (ETB)', 'Partner', 'Status'];
    const rows = filteredList.map(item => [
      new Date(item.createdAt).toLocaleDateString() + ' ' + new Date(item.createdAt).toLocaleTimeString(),
      item.type.toUpperCase(),
      item.source.toUpperCase(),
      item.amountUsdt.toFixed(2),
      item.rate ? item.rate.toFixed(2) : 'N/A',
      item.amountEtb ? item.amountEtb.toFixed(2) : 'N/A',
      item.counterparty,
      item.status.toUpperCase()
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `EthioSwap_History_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit trade rating
  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    setRatingError('');
    if (!ratingTrade) return;
    try {
      await supabase.from('trade_ratings').insert({
        trade_id: ratingTrade.realId,
        rater_id: user.id,
        rating: ratingStars,
        comment: ratingComment,
      });
      
      // Update rating locally on the trade item
      setP2pTradesRaw(prev => prev.map(t => t.id === ratingTrade.realId ? { ...t, ratingGiven: ratingStars } : t));
      
      setRatingTrade(null);
      setRatingComment('');
      setRatingStars(5);
    } catch (err) {
      setRatingError(err instanceof Error ? err.message : 'Error submitting rating');
    }
  };

  // Premium PDF Receipt Downloader
  const downloadReceipt = (item) => {
    const doc = new jsPDF();
    const isP2p = item.source === 'p2p';
    
    // Fill background with #0B0E1A
    doc.setFillColor(11, 14, 26);
    doc.rect(0, 0, 210, 297, 'F');
    
    // Header section
    doc.setFillColor(20, 24, 39); // Card surface #141827
    doc.rect(15, 15, 180, 35, 'F');
    doc.setDrawColor(245, 166, 35); // Gold border
    doc.setLineWidth(1);
    doc.rect(15, 15, 180, 35, 'D');
    
    // Brand title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(245, 166, 35); // Gold
    doc.text('EthioSwap', 25, 32);
    
    doc.setFontSize(9);
    doc.setTextColor(138, 155, 184); // Muted
    const typeLabel = item.type === 'buy' ? 'P2P USDT PURCHASE' :
                      item.type === 'sell' ? 'P2P USDT SALE' :
                      item.type === 'deposit' ? 'WALLET DEPOSIT' : 'WALLET WITHDRAWAL';
    doc.text(`OFFICIAL TRANSACTION RECEIPT · ${typeLabel}`, 25, 42);
    
    doc.setFontSize(8);
    doc.setTextColor(0, 200, 150); // Teal
    doc.text('ethioswap.qzz.io', 145, 32);
    doc.setTextColor(138, 155, 184);
    doc.text('MrCute Finance Platform', 145, 40);

    // Details box background
    doc.setFillColor(20, 24, 39);
    doc.rect(15, 58, 180, 120, 'F');
    doc.rect(15, 58, 180, 120, 'D');

    doc.setFontSize(10);
    doc.setTextColor(245, 166, 35); // Gold headers
    doc.text('TRANSACTION DETAILS', 25, 68);
    
    doc.setDrawColor(30, 38, 64);
    doc.setLineWidth(0.5);
    doc.line(25, 72, 185, 72);

    // Rows of data
    let y = 80;
    const drawRow = (label, val, valColor = [255, 255, 255]) => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(138, 155, 184);
      doc.text(label + ':', 25, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(valColor[0], valColor[1], valColor[2]);
      doc.text(String(val), 75, y);
      y += 10;
    };

    const statusInfo = getStatusDetails(item.status);
    const statusColor = item.status === 'completed' || item.status === 'approved' ? [245, 166, 35] :
                        item.status === 'cancelled' || item.status === 'rejected' ? [255, 77, 77] : [255, 193, 7];

    drawRow('Transaction ID', item.realId.toUpperCase());
    drawRow('Date & Time', new Date(item.createdAt).toLocaleString());
    drawRow('Type', typeLabel);
    drawRow('Status', statusInfo.label, statusColor);

    let fromAddr = '';
    let toAddr = '';
    if (isP2p) {
      fromAddr = item.type === 'buy' ? `@${item.original.seller_name}` : `@${item.original.buyer_name}`;
      toAddr = item.type === 'buy' ? `@${item.original.buyer_name}` : `@${item.original.seller_name}`;
    } else {
      fromAddr = item.type === 'deposit' ? 'External Source' : 'EthioSwap Wallet';
      toAddr = item.type === 'deposit' ? 'EthioSwap Wallet' : (item.original.destination_address || 'External Address');
    }

    drawRow('From', fromAddr);
    drawRow('To', toAddr);
    drawRow('Amount (USDT)', `$${item.amountUsdt.toFixed(2)} USDT`, [0, 200, 150]);

    if (isP2p) {
      drawRow('Exchange Rate', `${item.rate} ETB / $1`);
      drawRow('Total Paid', `${item.amountEtb.toFixed(2)} ETB`, [245, 166, 35]);
    }

    // Payment method
    let paymentText = 'N/A';
    if (item.paymentMethod) {
      const pm = parsePaymentMethod(item.paymentMethod);
      if (pm.bankName) {
        paymentText = `${pm.bankName} - ${pm.accountNumber} (${pm.accountHolder})`;
      } else {
        paymentText = String(item.paymentMethod);
      }
    }
    drawRow('Payment Method', paymentText);

    // Signatures
    doc.setDrawColor(245, 166, 35);
    doc.line(15, 195, 195, 195);

    doc.setFontSize(9);
    doc.setTextColor(138, 155, 184);
    doc.text('AUTHORIZED BY:', 20, 210);

    // Mrcute signature
    doc.setFont('times', 'italic');
    doc.setFontSize(16);
    doc.setTextColor(245, 166, 35); // Gold
    doc.text('Mrcute', 25, 225);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(138, 155, 184);
    doc.text('Platform Administrator', 25, 232);

    // Biruk Fikru signature
    doc.setFont('times', 'italic');
    doc.setFontSize(16);
    doc.setTextColor(0, 200, 150); // Teal
    doc.text('Biruk Fikru', 125, 225);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(138, 155, 184);
    doc.text('Founder, EthioSwap', 125, 232);

    // Footer bar
    doc.setFillColor(245, 166, 35);
    doc.rect(0, 280, 210, 17, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(11, 14, 26);
    doc.text('EthioSwap  —  Your Trusted Ethiopian Crypto Exchange  —  ethioswap.qzz.io', 20, 290);
    
    doc.save(`EthioSwap_Receipt_${item.realId.substring(0, 8)}.pdf`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      <style>{`
        @keyframes hist-fade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .hist-row { animation: hist-fade 0.3s ease both; transition: all 0.2s ease; }
        .hist-row:hover { background: rgba(255,255,255,0.04) !important; border-color: rgba(255,255,255,0.08) !important; }
        .tx-tab-btn { transition: all 0.2s ease !important; }
        .tx-tab-btn:hover { opacity: 0.85; }
        .filter-select:focus { border-color: rgba(245,166,35,0.3) !important; outline: none; }
      `}</style>
      
      {/* ── Premium Metrics Dashboard ── */}
      <div style={{ background: 'linear-gradient(135deg, rgba(245,166,35,0.06) 0%, rgba(0,200,150,0.04) 100%)', border: '1px solid rgba(245,166,35,0.12)', borderRadius: '18px', padding: '24px' }}>
        <h3 style={{ fontSize: '11px', fontWeight: 600, color: '#8A9BB8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '18px' }}>Portfolio Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#8A9BB8', marginBottom: '6px', fontWeight: 600 }}>Total Deposited</div>
            <div style={{ fontSize: '22px', fontWeight: 600, color: '#00C896', fontFamily: "'JetBrains Mono', monospace" }}>+${stats.deposited.toFixed(2)}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#8A9BB8', marginBottom: '6px', fontWeight: 600 }}>Total Withdrawn</div>
            <div style={{ fontSize: '22px', fontWeight: 600, color: '#FF4D4D', fontFamily: "'JetBrains Mono', monospace" }}>-${stats.withdrawn.toFixed(2)}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#8A9BB8', marginBottom: '6px', fontWeight: 600 }}>P2P Bought</div>
            <div style={{ fontSize: '22px', fontWeight: 600, color: '#00C896', fontFamily: "'JetBrains Mono', monospace" }}>+${stats.bought.toFixed(2)}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#8A9BB8', marginBottom: '6px', fontWeight: 600 }}>P2P Sold</div>
            <div style={{ fontSize: '22px', fontWeight: 600, color: '#F5A623', fontFamily: "'JetBrains Mono', monospace" }}>-${stats.sold.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* ── Tabs Navigation ── */}
      <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #1E2640', paddingBottom: '8px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {['all', 'buys', 'sells', 'deposits', 'withdrawals'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveHistoryTab(tab)}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              background: activeHistoryTab === tab ? 'rgba(245, 166, 35, 0.12)' : 'transparent',
              color: activeHistoryTab === tab ? '#F5A623' : '#8A9BB8',
              fontWeight: 700,
              fontSize: '12px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              borderBottom: activeHistoryTab === tab ? '2px solid #F5A623' : '2px solid transparent',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit'
            }}
          >
            {tab === 'all' && 'All History'}
            {tab === 'buys' && '📥 Buys'}
            {tab === 'sells' && '📤 Sells'}
            {tab === 'deposits' && '💳 Deposits'}
            {tab === 'withdrawals' && '💸 Withdrawals'}
          </button>
        ))}
      </div>

      {/* ── Filters & Search ── */}
      <div style={{ background: '#141827', border: '1px solid #1E2640', borderRadius: '14px', padding: '14px 16px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 2, minWidth: '180px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
          <input 
            type="text" 
            placeholder="Search ID, counterparty or bank..." 
            style={{ width: '100%', paddingLeft: '36px', paddingRight: '12px', paddingTop: '9px', paddingBottom: '9px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#fff', fontSize: '12px', fontFamily: 'inherit', outline: 'none' }} 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
        
        <input 
          type="date" 
          style={{ flex: 1, minWidth: '130px', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#fff', fontSize: '12px', fontFamily: 'inherit' }} 
          value={dateRange.start} 
          onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))} 
        />
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>→</span>
        <input 
          type="date" 
          style={{ flex: 1, minWidth: '130px', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#fff', fontSize: '12px', fontFamily: 'inherit' }} 
          value={dateRange.end} 
          onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))} 
        />
        
        <button 
          onClick={handleExportCSV} 
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '10px', color: '#F5A623', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s ease', whiteSpace: 'nowrap' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,166,35,0.18)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,166,35,0.1)'; }}
        >
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* ── Transaction List ── */}
      <div style={{ background: '#141827', border: '1px solid #1E2640', borderRadius: '18px', overflow: 'hidden' }}>
        {filteredList.length === 0 ? (
          <EmptyState icon="📜" title="No Transactions" subtitle="No transactions found matching your filters." />
        ) : (
          <>
            {/* Desktop Table */}
            <table className="desktop-only" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1E2640', background: '#0D1117' }}>
                  <th style={{ padding: '16px', fontSize: '11px', color: '#8A9BB8', textTransform: 'uppercase', fontWeight: 700 }}>Type</th>
                  <th style={{ padding: '16px', fontSize: '11px', color: '#8A9BB8', textTransform: 'uppercase', fontWeight: 700 }}>Date & Time</th>
                  <th style={{ padding: '16px', fontSize: '11px', color: '#8A9BB8', textTransform: 'uppercase', fontWeight: 700 }}>Partner</th>
                  <th style={{ padding: '16px', fontSize: '11px', color: '#8A9BB8', textTransform: 'uppercase', fontWeight: 700 }}>USDT Amount</th>
                  <th style={{ padding: '16px', fontSize: '11px', color: '#8A9BB8', textTransform: 'uppercase', fontWeight: 700 }}>ETB / Rate</th>
                  <th style={{ padding: '16px', fontSize: '11px', color: '#8A9BB8', textTransform: 'uppercase', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '16px', fontSize: '11px', color: '#8A9BB8', textTransform: 'uppercase', fontWeight: 700 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map(item => {
                  const statusInfo = getStatusDetails(item.status);
                  const isP2p = item.source === 'p2p';
                  const isIncoming = item.type === 'buy' || item.type === 'deposit';
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #1E2640' }}>
                      <td style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '8px', 
                          background: isIncoming ? 'rgba(0, 200, 150, 0.1)' : 'rgba(255, 77, 77, 0.1)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {isIncoming ? <ArrowDownLeft color="#00C896" size={16} /> : <ArrowUpRight color="#FF4D4D" size={16} />}
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff', textTransform: 'uppercase' }}>
                          {item.type}
                        </span>
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', color: '#8A9BB8' }}>
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                        {isP2p ? `@${item.counterparty}` : item.counterparty}
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: isIncoming ? '#00C896' : '#FF4D4D' }}>
                        {isIncoming ? '+' : '-'}${item.amountUsdt.toFixed(2)} USDT
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: '#fff' }}>
                        {isP2p ? (
                          <div>
                            <div style={{ fontWeight: 700, color: '#F5A623' }}>{item.amountEtb.toFixed(0)} ETB</div>
                            <div style={{ fontSize: '11px', color: '#8A9BB8' }}>@{item.rate} ETB/$</div>
                          </div>
                        ) : (
                          <span style={{ color: '#8A9BB8' }}>N/A</span>
                        )}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          fontWeight: 800, fontSize: '10px', padding: '3px 8px', borderRadius: '12px', textTransform: 'uppercase',
                          color: statusInfo.color,
                          background: statusInfo.bg
                        }}>{statusInfo.label}</span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button onClick={() => setSelectedTx(item)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '8px', color: '#F5A623', fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease', fontFamily: 'inherit' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,166,35,0.16)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,166,35,0.08)'; }}
                          >
                            <FileText size={12} /> View Receipt
                          </button>
                          {isP2p && item.status === 'completed' && !item.ratingGiven && (
                            <button onClick={() => setRatingTrade(item)} style={{ padding: '6px 12px', background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.2)', borderRadius: '8px', color: '#00C896', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                              Rate Partner
                            </button>
                          )}
                          {isP2p && item.ratingGiven && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#F5A623', fontSize: '12px', fontWeight: 700, paddingLeft: '4px' }}>
                              {item.ratingGiven} <Star size={12} fill="#F5A623" stroke="none" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile Card List */}
            <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}>
              {filteredList.map(item => {
                const statusInfo = getStatusDetails(item.status);
                const isP2p = item.source === 'p2p';
                const isIncoming = item.type === 'buy' || item.type === 'deposit';
                return (
                  <div key={item.id} style={{ padding: '16px', background: '#1A1F32', borderRadius: '12px', border: '1px solid #1E2640', display: 'flex', flexDirection: 'column', gap: '10px' }} className="hist-row">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ 
                          width: '28px', 
                          height: '28px', 
                          borderRadius: '6px', 
                          background: isIncoming ? 'rgba(0, 200, 150, 0.1)' : 'rgba(255, 77, 77, 0.1)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center' 
                        }}>
                          {isIncoming ? <ArrowDownLeft color="#00C896" size={14} /> : <ArrowUpRight color="#FF4D4D" size={14} />}
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff', textTransform: 'uppercase' }}>
                          {item.type}
                        </span>
                      </div>
                      <span style={{
                        fontWeight: 800, fontSize: '9px', padding: '2px 6px', borderRadius: '8px', textTransform: 'uppercase',
                        color: statusInfo.color,
                        background: statusInfo.bg
                      }}>{statusInfo.label}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '12px', color: '#8A9BB8' }}>
                        Partner: <b style={{ color: '#fff' }}>{isP2p ? `@${item.counterparty}` : item.counterparty}</b>
                      </span>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: isIncoming ? '#00C896' : '#FF4D4D', fontFamily: 'JetBrains Mono, monospace' }}>
                        {isIncoming ? '+' : '-'}${item.amountUsdt.toFixed(2)} USDT
                      </span>
                    </div>

                    {isP2p && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8A9BB8' }}>
                        <span>Rate: {item.rate} ETB</span>
                        <span>Total: <b style={{ color: '#F5A623' }}>{item.amountEtb.toFixed(0)} ETB</b></span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1E2640', paddingTop: '8px', marginTop: '2px' }}>
                      <span style={{ fontSize: '10px', color: '#8A9BB8' }}>
                        {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button onClick={() => setSelectedTx(item)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '8px', color: '#F5A623', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                          <FileText size={11} /> View
                        </button>
                        {isP2p && item.status === 'completed' && !item.ratingGiven && (
                          <button onClick={() => setRatingTrade(item)} style={{ padding: '5px 10px', background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.2)', borderRadius: '8px', color: '#00C896', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                            Rate
                          </button>
                        )}
                        {isP2p && item.ratingGiven && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#F5A623', fontSize: '11px', fontWeight: 700 }}>
                            {item.ratingGiven} <Star size={11} fill="#F5A623" stroke="none" />
                          </span>
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

      {/* ── Partner Rating Modal ── */}
      {ratingTrade && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(8px)', padding: '16px' }}>
          <div style={{ background: '#141827', border: '1px solid #1E2640', padding: '24px', borderRadius: '20px', width: '100%', maxWidth: '360px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '8px', color: '#fff' }}>Rate Your Partner</h3>
            <p style={{ fontSize: '12px', color: '#8A9BB8', marginBottom: '16px' }}>
              How was your experience trading with <b>@{ratingTrade.counterparty}</b>?
            </p>
            <form onSubmit={handleRatingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button type="button" key={star} onClick={() => setRatingStars(star)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                    <Star size={24} fill={star <= ratingStars ? '#F5A623' : 'none'} stroke={star <= ratingStars ? '#F5A623' : '#8A9BB8'} />
                  </button>
                ))}
              </div>
              <textarea 
                placeholder="Write a short comment (optional)..." 
                style={{ width: '100%', height: '80px', fontSize: '13px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px', color: '#fff', outline: 'none', resize: 'none', fontFamily: 'inherit' }} 
                value={ratingComment} 
                onChange={e => setRatingComment(e.target.value)} 
              />
              {ratingError && <div style={{ color: '#FF4D4D', fontSize: '12px' }}>{ratingError}</div>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setRatingTrade(null)} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', color: '#8A9BB8', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '10px', background: '#F5A623', border: 'none', borderRadius: '10px', color: '#000', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}>Submit Rating</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Premium Universal Transaction Receipt Modal ── */}
      {selectedTx && (() => {
        const isP2p = selectedTx.source === 'p2p';
        const typeLabel = selectedTx.type === 'buy' ? 'P2P USDT PURCHASE' :
                          selectedTx.type === 'sell' ? 'P2P USDT SALE' :
                          selectedTx.type === 'deposit' ? 'WALLET DEPOSIT' : 'WALLET WITHDRAWAL';
        const statusInfo = getStatusDetails(selectedTx.status);

        let fromAddr = '';
        let toAddr = '';
        if (isP2p) {
          fromAddr = selectedTx.type === 'buy' ? `@${selectedTx.original.seller_name}` : `@${selectedTx.original.buyer_name}`;
          toAddr = selectedTx.type === 'buy' ? `@${selectedTx.original.buyer_name}` : `@${selectedTx.original.seller_name}`;
        } else {
          fromAddr = selectedTx.type === 'deposit' ? 'External Source' : 'EthioSwap Wallet';
          toAddr = selectedTx.type === 'deposit' ? 'EthioSwap Wallet' : (selectedTx.original.destination_address || 'External Address');
        }

        let paymentText = 'N/A';
        if (selectedTx.paymentMethod) {
          const pm = parsePaymentMethod(selectedTx.paymentMethod);
          if (pm.bankName) {
            paymentText = `${pm.bankName} - ${pm.accountNumber} (${pm.accountHolder})`;
          } else {
            paymentText = String(selectedTx.paymentMethod);
          }
        }

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,14,26,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)', padding: '20px', overflowY: 'auto' }} onClick={() => setSelectedTx(null)}>
            <div style={{ background: '#141827', border: '1px solid #1E2640', color: '#fff', maxWidth: '440px', width: '100%', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(245,166,35,0.25)', fontFamily: "inherit" }} onClick={e => e.stopPropagation()}>
              
              {/* Header Band */}
              <div style={{ background: '#0D1117', borderBottom: '1px solid #1E2640', padding: '24px 24px 20px', position: 'relative' }}>
                <button onClick={() => setSelectedTx(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.05)', border: 'none', width: '28px', height: '28px', borderRadius: '50%', color: '#8A9BB8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #F5A623, #FFE082)', color: '#0A0C12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '15px' }}>E</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '18px', color: '#F5A623', letterSpacing: '-0.02em' }}>EthioSwap</div>
                    <div style={{ fontSize: '9px', color: '#8A9BB8', fontWeight: 600, letterSpacing: '0.12em' }}>OFFICIAL TRANSACTION RECEIPT</div>
                  </div>
                </div>
                <div style={{ fontSize: '10px', color: '#8A9BB8', marginTop: '4px' }}>ethioswap.qzz.io  ·  MrCute Finance Platform</div>
              </div>

              {/* Body */}
              <div style={{ padding: '20px 24px 24px' }}>
                {/* Details Table */}
                <div style={{ borderBottom: '1px dashed #1E2640', paddingBottom: '14px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  {[
                    ['Receipt ID', selectedTx.realId.substring(0, 12).toUpperCase() + '...'],
                    ['Date & Time', new Date(selectedTx.createdAt).toLocaleString()],
                    ['Type', typeLabel],
                    ['From', fromAddr],
                    ['To', toAddr]
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#8A9BB8' }}>{k}</span>
                      <span style={{ fontWeight: 700, color: '#fff' }}>{v}</span>
                    </div>
                  ))}
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#8A9BB8' }}>Status</span>
                    <span style={{ fontWeight: 800, fontSize: '10px', color: statusInfo.color, background: statusInfo.bg, padding: '3px 10px', borderRadius: '99px' }}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                {/* Amounts */}
                <div style={{ background: '#0D1117', border: '1px solid #1E2640', borderRadius: '16px', padding: '14px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#8A9BB8' }}>Amount (USDT)</span>
                    <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#00C896' }}>
                      ${selectedTx.amountUsdt.toFixed(2)} USDT
                    </span>
                  </div>
                  {isP2p && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#8A9BB8' }}>Exchange Rate</span>
                        <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#fff' }}>
                          {selectedTx.rate} ETB / $1
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#8A9BB8' }}>Total Paid (ETB)</span>
                        <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#F5A623' }}>
                          {selectedTx.amountEtb.toFixed(2)} ETB
                        </span>
                      </div>
                    </>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#8A9BB8' }}>Payment Method</span>
                    <span style={{ fontWeight: 700, color: '#fff', fontSize: '12px', textAlign: 'right', maxWidth: '65%' }}>
                      {paymentText}
                    </span>
                  </div>
                </div>

                {/* Signature footer */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '14px', borderTop: '1px dashed #1E2640', marginBottom: '20px' }}>
                  <span style={{ fontSize: '10px', color: '#8A9BB8', fontWeight: 600 }}>AUTHORIZED BY:</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontFamily: "'Georgia', serif", fontSize: '18px', color: '#F5A623', fontStyle: 'italic', lineHeight: 1, marginBottom: '2px' }}>Mrcute</div>
                      <div style={{ fontSize: '9px', color: '#8A9BB8' }}>Platform Administrator</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'Georgia', serif", fontSize: '18px', color: '#00C896', fontStyle: 'italic', lineHeight: 1, marginBottom: '2px' }}>Biruk Fikru</div>
                      <div style={{ fontSize: '9px', color: '#8A9BB8' }}>Founder, EthioSwap</div>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => downloadReceipt(selectedTx)} style={{ flex: 1, padding: '12px', background: '#F5A623', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s ease', fontFamily: 'inherit' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    <Download size={14} /> Download PDF
                  </button>
                  <button onClick={() => setSelectedTx(null)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid #1E2640', color: '#8A9BB8', borderRadius: '12px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Close
                  </button>
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