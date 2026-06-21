import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import Logo from './Logo';

export default function BrandedReceipt({
  txType = 'BUY USDT', // 'BUY USDT' | 'SELL USDT' | 'DEPOSIT' | 'WITHDRAW'
  status = 'COMPLETED', // 'COMPLETED' | 'PENDING' | 'CANCELLED'
  dateTime = new Date().toISOString(),
  refId = '',
  fromName = '',
  fromId = '',
  toName = '',
  toId = '',
  amountSent = '',
  amountReceived = '',
  rate = '', // only for P2P
  fee = '', // only for deposit/withdraw
  paymentMethod = '',
  network = '',
  txHash = '',
  onClose,
  showActions = true,
}) {
  const receiptRef = useRef(null);

  const formattedDate = () => {
    try {
      return new Date(dateTime).toLocaleString();
    } catch (e) {
      return dateTime;
    }
  };

  const getStatusColor = () => {
    if (status === 'COMPLETED') return '#00C896'; // Teal/Green
    if (status === 'PENDING') return '#F5A623'; // Gold/Yellow
    return '#FF4D4D'; // Red for Cancelled
  };

  const getStatusIcon = () => {
    if (status === 'COMPLETED') return '✓';
    if (status === 'PENDING') return '⏳';
    return '✗';
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSharePNG = async () => {
    if (!receiptRef.current) return;
    try {
      // Temporarily hide buttons to ensure clean PNG capture
      const actionButtons = receiptRef.current.querySelector('.receipt-actions');
      if (actionButtons) actionButtons.style.display = 'none';

      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: '#0B0E1A',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false
      });

      if (actionButtons) actionButtons.style.display = 'flex';

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `EthioSwap_Receipt_${refId || 'transaction'}.png`;
      link.click();
    } catch (err) {
      console.error("Failed to generate PNG receipt:", err);
      alert("Failed to export PNG. Please try again.");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '16px' }}>
      {/* Dynamic CSS for print view */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt-area, #printable-receipt-area * {
            visibility: visible;
          }
          #printable-receipt-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            background: #0B0E1A !important;
            color: #FFFFFF !important;
            border: none !important;
          }
          .receipt-actions {
            display: none !important;
          }
        }
      `}</style>

      <div 
        id="printable-receipt-area"
        ref={receiptRef}
        style={{
          width: '100%',
          maxWidth: '520px',
          background: '#0B0E1A',
          border: '1px solid rgba(245, 166, 35, 0.25)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          color: '#FFFFFF',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
      >
        {/* BRANDED HEADER */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
            <Logo size={42} />
          </div>
          <h1 style={{ margin: '0 0 2px 0', fontSize: '24px', fontWeight: 800, color: '#F5A623', letterSpacing: '0.05em' }}>ETHIOSWAP</h1>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#00C896', textTransform: 'uppercase', letterSpacing: '0.1em' }}>P2P USDT Exchange Platform</span>
          <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, #F5A623, transparent)', margin: '16px 0 0 0' }} />
        </div>

        {/* RECEIPT TITLE & STATUS */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#F5A623', margin: '0 0 12px 0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>TRANSACTION RECEIPT</h2>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#8A9BB8', textTransform: 'uppercase' }}>Type:</span>
            <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#FFFFFF' }}>{txType}</span>
          </div>

          <div style={{ 
            background: `${getStatusColor()}15`, 
            border: `1px solid ${getStatusColor()}40`, 
            borderRadius: '99px', 
            padding: '6px 16px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: getStatusColor(),
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            boxShadow: `0 0 12px ${getStatusColor()}08`
          }}>
            <span>{getStatusIcon()}</span>
            <span>{status}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '16px', fontSize: '11px', color: '#8A9BB8' }}>
            <div>Date: {formattedDate()}</div>
            {refId && <div style={{ fontFamily: 'monospace' }}>Reference ID: {refId}</div>}
          </div>
        </div>

        {/* DETAILS SECTION */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#F5A623', borderBottom: '1px solid rgba(245, 166, 35, 0.2)', paddingBottom: '6px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Transaction Details
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {fromName && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                <span style={{ color: '#8A9BB8' }}>FROM:</span>
                <span style={{ fontWeight: 700, color: '#FFFFFF' }}>
                  {fromName} {fromId && <span style={{ fontSize: '10px', color: '#8A9BB8', fontWeight: 400 }}>({fromId.substring(0, 8)}...)</span>}
                </span>
              </div>
            )}
            {toName && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                <span style={{ color: '#8A9BB8' }}>TO:</span>
                <span style={{ fontWeight: 700, color: '#FFFFFF' }}>
                  {toName} {toId && <span style={{ fontSize: '10px', color: '#8A9BB8', fontWeight: 400 }}>({toId.substring(0, 8)}...)</span>}
                </span>
              </div>
            )}

            {amountSent && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '8px' }}>
                <span style={{ color: '#8A9BB8' }}>AMOUNT SENT:</span>
                <span style={{ fontWeight: 800, color: '#F5A623', fontSize: '14px' }}>{amountSent}</span>
              </div>
            )}
            {amountReceived && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: '#8A9BB8' }}>AMOUNT RECEIVED:</span>
                <span style={{ fontWeight: 800, color: '#00C896', fontSize: '14px' }}>{amountReceived}</span>
              </div>
            )}

            {rate && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                <span style={{ color: '#8A9BB8' }}>RATE:</span>
                <span style={{ fontWeight: 700, color: '#FFFFFF' }}>{rate}</span>
              </div>
            )}
            {fee && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                <span style={{ color: '#8A9BB8' }}>Network Fee:</span>
                <span style={{ fontWeight: 700, color: '#FF4D4D' }}>{fee}</span>
              </div>
            )}

            {paymentMethod && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px', borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '8px' }}>
                <span style={{ color: '#8A9BB8' }}>Payment Method:</span>
                <span style={{ fontWeight: 600, color: '#FFFFFF' }}>{paymentMethod}</span>
              </div>
            )}

            {network && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                <span style={{ color: '#8A9BB8' }}>Network:</span>
                <span style={{ fontWeight: 600, color: '#FFFFFF' }}>{network}</span>
              </div>
            )}

            {txHash && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '8px' }}>
                <span style={{ color: '#8A9BB8' }}>Transaction Hash:</span>
                <a 
                  href={`https://etherscan.io/tx/${txHash}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={{ color: '#00C896', textDecoration: 'underline', fontFamily: 'monospace', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {txHash}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* TRANSACTION TIMELINE */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#F5A623', borderBottom: '1px solid rgba(245, 166, 35, 0.2)', paddingBottom: '6px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Transaction Timeline
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
            {[
              { icon: '🔍', label: 'Listing Matched', desc: 'Trade initiated on EthioSwap P2P marketplace' },
              { icon: '🔒', label: 'Escrow Locked', desc: `${amountSent || 'Funds'} locked in secure escrow vault` },
              { icon: '💸', label: 'ETB Payment Confirmed', desc: 'Seller confirmed local Birr transfer received' },
              { icon: '✅', label: 'Escrow Released', desc: 'Funds released. Transaction complete.' },
            ].map(({ icon, label, desc }, stepIdx) => (
              <div key={label} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', position: 'relative', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(0,200,150,0.12)', border: '1.5px solid #00C896', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', zIndex: 1 }}>
                    {icon}
                  </div>
                  {stepIdx < 3 && <div style={{ width: '1.5px', flex: 1, background: 'rgba(0,200,150,0.2)', minHeight: '10px' }} />}
                </div>
                <div style={{ paddingTop: '3px', paddingBottom: stepIdx < 3 ? '0' : '0' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#00C896' }}>{label}</div>
                  <div style={{ fontSize: '10.5px', color: '#8A9BB8', marginTop: '1px' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CONFIRMATION SECTION */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#F5A623', borderBottom: '1px solid rgba(245, 166, 35, 0.2)', paddingBottom: '6px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Confirmation Details
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '10px', padding: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#00C896', fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(0, 200, 150, 0.15)', border: '1px solid #00C896', fontSize: '10px' }}>✓</span>
              <span>All parties confirmed</span>
            </div>
            <div style={{ fontSize: '11.5px', color: '#8A9BB8', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
              <div>Time Completed: {formattedDate()}</div>
              {fromName && <div>Seller: {fromName} {fromId && <span style={{ fontFamily: 'monospace', fontSize: '10.5px' }}>({fromId})</span>}</div>}
              {toName && <div>Buyer: {toName} {toId && <span style={{ fontFamily: 'monospace', fontSize: '10.5px' }}>({toId})</span>}</div>}
            </div>
          </div>
        </div>

        {/* AUTHORIZED SIGNATURE */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#F5A623', borderBottom: '1px solid rgba(245, 166, 35, 0.2)', paddingBottom: '6px', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Authorized Signature
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '8px', textAlign: 'center', fontSize: '11px', color: '#8A9BB8' }}>
            Processed & escrow-secured by EthioSwap
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '12px' }}>
            {/* Left signature */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ fontFamily: '"Brush Script MT", cursive, sans-serif', fontSize: '20px', color: '#F5A623', fontStyle: 'italic', height: '24px', lineHeight: '24px', marginBottom: '4px' }}>
                Mrcute
              </div>
              <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.2)', marginBottom: '4px' }} />
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#FFFFFF' }}>Mrcute</div>
              <div style={{ fontSize: '9px', color: '#8A9BB8' }}>Developer & Lead</div>
              <div style={{ fontSize: '8px', color: '#8A9BB8', marginTop: '2px' }}>Date: {new Date(dateTime).toLocaleDateString()}</div>
            </div>

            {/* Right signature */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ fontFamily: '"Brush Script MT", cursive, sans-serif', fontSize: '20px', color: '#F5A623', fontStyle: 'italic', height: '24px', lineHeight: '24px', marginBottom: '4px' }}>
                Biruk Fikru
              </div>
              <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.2)', marginBottom: '4px' }} />
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#FFFFFF' }}>Biruk Fikru</div>
              <div style={{ fontSize: '9px', color: '#8A9BB8' }}>Founder, EthioSwap</div>
              <div style={{ fontSize: '8px', color: '#8A9BB8', marginTop: '2px' }}>Date: {new Date(dateTime).toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        {/* BRANDED FOOTER */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '6px', fontSize: '11px', color: '#8A9BB8', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '16px' }}>
          <div>This is an official EthioSwap transaction receipt. Keep for your records.</div>
          <div style={{ fontWeight: 600 }}>Questions? Support: <a href="mailto:support@ethioswap.com" style={{ color: '#00C896', textDecoration: 'none' }}>support@ethioswap.com</a></div>
          <div style={{ color: '#F5A623', fontWeight: 700, letterSpacing: '0.04em', fontSize: '10px', marginTop: '2px' }}>www.ethioswap.qzz.io</div>
          <div style={{ fontSize: '9.5px', color: '#8A9BB8', marginTop: '2px' }}>© {new Date().getFullYear()} EthioSwap. All rights reserved.</div>
        </div>

        {/* ACTION BUTTONS (Hidden in print and PNG export) */}
        {showActions && (
          <div className="receipt-actions no-print" style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
            <button 
              type="button" 
              onClick={handlePrint}
              style={{
                flex: 1, height: '38px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px',
                fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            >
              🖨️ Print / PDF
            </button>
            <button 
              type="button" 
              onClick={handleSharePNG}
              style={{
                flex: 1, height: '38px', borderRadius: '8px', background: 'rgba(0, 200, 150, 0.15)',
                border: '1px solid rgba(0, 200, 150, 0.3)', color: '#00C896', fontSize: '12px',
                fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0, 200, 150, 0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0, 200, 150, 0.15)'}
            >
              📸 Share as PNG
            </button>
            {onClose && (
              <button 
                type="button" 
                onClick={onClose}
                style={{
                  height: '38px', padding: '0 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px',
                  fontWeight: 600, cursor: 'pointer'
                }}
              >
                Close
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
