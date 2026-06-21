import React, { useRef } from 'react';
import Logo from './Logo.jsx';

/**
 * BillReceipt — Professional, multi-step, printable receipt
 * Props:
 *   trade        — trade object
 *   user         — current user object
 *   systemSettings — system settings object (for rates)
 *   onClose      — close handler
 */
const BillReceipt = ({ trade, user, systemSettings, onClose }) => {
  const receiptRef = useRef(null);

  const rate = trade?.rate || systemSettings?.etbRatePerDollar || 190;
  const amountUSD = parseFloat(trade?.amount_usd || trade?.amount_eth || 0).toFixed(2);
  const amountETB = parseFloat(trade?.amount_etb || amountUSD * rate).toFixed(2);
  const feeUSD = parseFloat(trade?.fee_eth || 0).toFixed(2);

  const tradeDate = trade?.created_at
    ? new Date(trade.created_at).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })
    : new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });

  const completedDate = trade?.completed_at
    ? new Date(trade.completed_at).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })
    : tradeDate;

  const isUserBuyer = trade?.buyer_id === user?.id;
  const partnerName = isUserBuyer ? (trade?.seller_name || 'Counterparty') : (trade?.buyer_name || 'Counterparty');
  const tradeRefId = trade?.id ? `TXN-${trade.id.substring(0, 8).toUpperCase()}` : `TXN-XXXXXXXX`;

  const handlePrint = () => {
    const printContent = receiptRef.current?.innerHTML;
    if (!printContent) return;
    const printWindow = window.open('', '', 'width=820,height=1000');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>EthioSwap Receipt ${tradeRefId}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { background: #fff; color: #0a0a0a; font-family: 'Inter', sans-serif; }
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(8px)', zIndex: 300,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '16px', animation: 'fadeIn 0.25s ease-out',
  };

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: '100%', maxWidth: '520px', maxHeight: '92dvh', overflowY: 'auto',
        background: '#0B0E1A', borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(245,166,35,0.05)',
        animation: 'slideUp 0.32s cubic-bezier(0.32, 0.94, 0.6, 1)',
      }}>
        {/* Modal top bar (not printed) */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#F5A623' }}>📄 Transaction Receipt</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handlePrint} style={{
              background: '#F5A623', border: 'none', color: '#0a0a0a',
              padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            }}>🖨️ Print / PDF</button>
            <button onClick={onClose} style={{
              width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}>✕</button>
          </div>
        </div>

        {/* Printable receipt content */}
        <div ref={receiptRef} style={{ padding: '0', fontFamily: 'Inter, sans-serif', color: '#0a0a0a' }}>
          {/* ── BRAND HEADER ─────────────────────────────────────── */}
          <div style={{
            background: 'linear-gradient(135deg, #0B0E1A 0%, #141827 100%)',
            padding: '28px 28px 20px',
            textAlign: 'center',
            borderBottom: '3px solid #F5A623',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #F5A623, #E8930A)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '22px', fontWeight: 900, color: '#0a0a0a',
                boxShadow: '0 4px 16px rgba(245,166,35,0.35)',
              }}>₿</div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#F5A623', letterSpacing: '0.04em', lineHeight: 1 }}>
                  ETHIOSWAP
                </div>
                <div style={{ fontSize: '10px', color: '#00C896', fontWeight: 600, letterSpacing: '0.1em', marginTop: '2px' }}>
                  PEER-TO-PEER USDT EXCHANGE
                </div>
              </div>
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '6px' }}>
              Ethiopia's First P2P Digital Asset Platform
            </div>
          </div>

          {/* ── TRANSACTION STATUS BADGE ─────────────────────────── */}
          <div style={{
            background: '#F5A623', padding: '12px 28px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ fontWeight: 800, fontSize: '13px', color: '#0a0a0a', letterSpacing: '0.03em' }}>
              OFFICIAL TRANSACTION RECEIPT
            </div>
            <div style={{
              background: '#0a0a0a', borderRadius: '6px',
              padding: '4px 10px', fontSize: '11px', fontWeight: 700, color: '#F5A623',
            }}>
              {trade?.status?.toUpperCase() || 'COMPLETED'}
            </div>
          </div>

          {/* ── RECEIPT BODY ────────────────────────────────────── */}
          <div style={{ padding: '24px 28px', background: '#fff' }}>

            {/* Reference & Date */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px dashed #e2e8f0' }}>
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reference</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0a0a0a', fontFamily: 'JetBrains Mono, monospace', marginTop: '2px' }}>{tradeRefId}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completed</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#0a0a0a', marginTop: '2px' }}>{completedDate}</div>
              </div>
            </div>

            {/* Trade Summary */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#F5A623', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                Transaction Summary
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: 'Trade Type', value: isUserBuyer ? '📈 Bought USDT' : '📉 Sold USDT' },
                  { label: 'USD Amount', value: `$${amountUSD} USD`, bold: true, color: '#0a0a0a' },
                  { label: 'ETB Equivalent', value: `${parseFloat(amountETB).toLocaleString()} ETB`, bold: true, color: '#00C896' },
                  { label: 'Exchange Rate', value: `${parseFloat(rate).toFixed(2)} ETB / $1`, color: '#F5A623' },
                  { label: 'Platform Fee', value: parseFloat(feeUSD) > 0 ? `$${feeUSD} USD` : 'Free (0%)', color: '#10B981' },
                  { label: 'Payment Method', value: trade?.payment_method || 'Bank Transfer' },
                ].map(({ label, value, bold, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>{label}</span>
                    <span style={{ fontSize: '13px', fontWeight: bold ? 700 : 600, color: color || '#0a0a0a' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Two-column Parties */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              {[
                { title: isUserBuyer ? 'Buyer (You)' : 'Seller (You)', name: user?.username || 'You', role: isUserBuyer ? 'Buyer' : 'Seller', color: '#F5A623' },
                { title: isUserBuyer ? 'Seller' : 'Buyer', name: partnerName, role: isUserBuyer ? 'Seller' : 'Buyer', color: '#00C896' },
              ].map(({ title, name, role, color }) => (
                <div key={title} style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', border: `1px solid ${color}30` }}>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{title}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0a0a0a' }}>@{name}</div>
                  <div style={{ display: 'inline-block', marginTop: '4px', background: `${color}20`, color, fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', letterSpacing: '0.05em' }}>
                    {role}
                  </div>
                </div>
              ))}
            </div>

            {/* Steps / Timeline */}
            <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '14px', marginBottom: '20px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                ✅ Transaction Timeline
              </div>
              {[
                { step: '1', label: 'Listing Matched', desc: `Trade initiated on EthioSwap P2P marketplace`, time: tradeDate },
                { step: '2', label: 'Escrow Locked', desc: `$${amountUSD} USD locked in secure escrow vault`, time: tradeDate },
                { step: '3', label: 'ETB Payment Confirmed', desc: `${parseFloat(amountETB).toLocaleString()} ETB confirmed by seller`, time: completedDate },
                { step: '4', label: 'Escrow Released', desc: `Funds released. Transaction complete.`, time: completedDate },
              ].map(({ step, label, desc, time }) => (
                <div key={step} style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'flex-start' }}>
                  <div style={{ width: '20px', height: '20px', background: '#10B981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 900, color: '#fff', flexShrink: 0, marginTop: '1px' }}>
                    ✓
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#065f46' }}>{label}</div>
                    <div style={{ fontSize: '10.5px', color: '#374151' }}>{desc}</div>
                    <div style={{ fontSize: '9.5px', color: '#9ca3af', marginTop: '1px', fontFamily: 'JetBrains Mono, monospace' }}>{time}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Important note */}
            <div style={{ background: '#fff7ed', borderRadius: '10px', padding: '12px', marginBottom: '24px', border: '1px solid #fdba74' }}>
              <div style={{ fontSize: '10.5px', color: '#9a3412', fontWeight: 600, lineHeight: 1.5 }}>
                ⚠️ <strong>Keep this receipt for your records.</strong> This receipt serves as proof of your peer-to-peer USDT transaction on EthioSwap. EthioSwap is not a financial institution; it provides a secure escrow infrastructure for direct trades between users.
              </div>
            </div>

            {/* Two-column signature block */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', paddingTop: '20px', borderTop: '2px solid #e2e8f0' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ height: '40px', borderBottom: '1.5px solid #0a0a0a', marginBottom: '6px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '4px' }}>
                  <span style={{ fontSize: '14px', fontFamily: 'Georgia, serif', color: '#0a0a0a', fontStyle: 'italic' }}>Mrcute</span>
                </div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Platform Admin</div>
                <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '2px' }}>EthioSwap</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ height: '40px', borderBottom: '1.5px solid #0a0a0a', marginBottom: '6px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '4px' }}>
                  <span style={{ fontSize: '14px', fontFamily: 'Georgia, serif', color: '#0a0a0a', fontStyle: 'italic' }}>Biruk Fikru</span>
                </div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Founder & CEO</div>
                <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '2px' }}>EthioSwap</div>
              </div>
            </div>
          </div>

          {/* ── FOOTER ──────────────────────────────────────────── */}
          <div style={{ background: '#141827', padding: '16px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
              EthioSwap · Ethiopia's Premier P2P USDT Exchange Platform<br />
              This is a system-generated receipt. For support, contact us via the app.<br />
              <span style={{ color: '#F5A623', fontWeight: 600 }}>www.ethioswap.qzz.io</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillReceipt;
