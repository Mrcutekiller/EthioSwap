import React, { useState, useEffect, useRef } from 'react';
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from '../context/AuthContext.jsx';

const TradeRoom = () => {
  const { user, trades, setError, setSuccess } = useAuth();
  const [selectedTradeId, setSelectedTradeId] = useState(null);
  const [message, setMessage] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [timerAlert, setTimerAlert] = useState(false);
  
  const chatEndRef = useRef(null);

  // Convex Mutations
  const convexSendMessage = useMutation(api.trades.sendMessage);
  const convexMarkPaid = useMutation(api.trades.markPaid);
  const convexReleaseEscrow = useMutation(api.trades.releaseEscrow);
  const convexOpenDispute = useMutation(api.trades.openDispute);
  const convexCancelTrade = useMutation(api.trades.cancelTrade);

  // Find currently active trade
  const activeTrade = trades.find(t => t.id === selectedTradeId);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTrade?.chat]);

  // Helper to compress and convert File/Blob to compressed base64 JPEG
  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1000;
        const MAX_HEIGHT = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to JPEG with 0.7 quality to stay well below Convex's 1MB limit
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressedDataUrl);
      };
      img.onerror = (err) => reject(new Error("Failed to load image for compression"));
    };
    reader.onerror = (err) => reject(err);
  });

  // Countdown timer logic
  useEffect(() => {
    if (!activeTrade || (activeTrade.status !== 'payment_pending' && activeTrade.status !== 'paid')) {
      setTimeRemaining('');
      setTimerAlert(false);
      return;
    }

    const updateTimer = async () => {
      const expires = new Date(activeTrade.timerExpiresAt).getTime();
      const now = new Date().getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setTimeRemaining('00:00 - Expired');
        setTimerAlert(true);
        // Auto flag dispute if timer expired
        if (activeTrade.status === 'paid' || activeTrade.status === 'payment_pending') {
          try {
            await convexOpenDispute({
              tradeId: activeTrade.id,
              userId: 'system',
              reason: 'Timer expired.'
            });
          } catch (e) {
            console.error("Auto-dispute trigger failed", e);
          }
        }
        return;
      }

      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      const mm = minutes.toString().padStart(2, '0');
      const ss = seconds.toString().padStart(2, '0');
      setTimeRemaining(`${mm}:${ss}`);
      setTimerAlert(minutes < 5);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeTrade, convexOpenDispute]);

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      await convexSendMessage({
        tradeId: activeTrade.id,
        senderId: user.id,
        message: message.trim()
      });
      setMessage('');
    } catch (err) {
      setError("Failed to send message.");
    }
  };

  // Buyer marks as paid
  const handleMarkPaid = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      alert("You must upload a receipt screenshot as proof of payment.");
      return;
    }

    try {
      const proofBase64 = await toBase64(uploadFile);
      await convexMarkPaid({
        tradeId: activeTrade.id,
        buyerId: user.id,
        proofUrl: proofBase64
      });
      setSuccess("Marked as paid! Wait for seller release.");
      setUploadFile(null);
    } catch (err) {
      setError(err.message);
    }
  };

  // Seller releases ETH
  const handleReleaseEscrow = async () => {
    const confirmRelease = window.confirm("⚠️ WARNING!\nAre you absolutely sure you received the correct ETB amount in your bank account?\n\nReleasing escrow is permanent, irreversible, and cannot be refunded by the platform. Click OK to release.");
    if (!confirmRelease) return;

    try {
      await convexReleaseEscrow({
        tradeId: activeTrade.id,
        sellerId: user.id
      });
      setSuccess("USD released to Buyer!");
    } catch (err) {
      setError(err.message);
    }
  };

  // Open Dispute
  const handleOpenDispute = async () => {
    const reason = prompt("Describe the issue for the Admin (e.g. 'I paid but seller is offline', 'Buyer uploaded fake receipt'):");
    if (reason === null) return;

    try {
      await convexOpenDispute({
        tradeId: activeTrade.id,
        userId: user.id,
        reason: reason || "Unresponsive party."
      });
      setSuccess("Dispute opened. Admin notified.");
    } catch (err) {
      setError(err.message);
    }
  };

  // Buyer cancels
  const handleCancelTrade = async () => {
    const confirmCancel = window.confirm("Are you sure you want to cancel this trade? If you have already paid the seller, do NOT cancel.");
    if (!confirmCancel) return;

    try {
      await convexCancelTrade({
        tradeId: activeTrade.id,
        buyerId: user.id
      });
      setSuccess("Trade cancelled.");
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="badge badge-success">✓ Completed</span>;
      case 'payment_pending':
        return <span className="badge badge-pending">⏳ Payment Pending</span>;
      case 'paid':
        return <span className="badge badge-info">💸 Paid & Waiting</span>;
      case 'disputed':
        return <span className="badge badge-danger">⚖️ Disputed</span>;
      default:
        return <span className="badge badge-secondary" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>Cancelled</span>;
    }
  };

  const tradeSteps = [
    { label: 'Open Trade', status: 'any' },
    { label: 'Pay Seller', status: 'payment_pending' },
    { label: 'Confirm Payment', status: 'paid' },
    { label: 'USD Released', status: 'completed' }
  ];

  const currentStep = activeTrade ? (
    activeTrade.status === 'payment_pending' ? 1 :
    activeTrade.status === 'paid' ? 2 :
    activeTrade.status === 'completed' ? 3 : 0
  ) : 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem', height: 'calc(100vh - 180px)', minHeight: '600px', padding: '0 1rem' }}>
      
      {/* LEFT COLUMN: Active Trades List */}
      <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto' }}>
        <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>Your P2P Trades</h3>
        
        {trades.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 1rem', fontSize: '0.85rem' }}>
            No active or past trades. Start a buy listing trade!
          </div>
        ) : (
          trades.map(t => {
            const isBuyer = t.buyerId === user.id;
            const partnerName = isBuyer ? t.sellerName : t.buyerName;

            return (
              <div 
                key={t.id} 
                onClick={() => setSelectedTradeId(t.id)}
                className="glass-card"
                style={{
                  cursor: 'pointer',
                  padding: '1rem',
                  borderColor: selectedTradeId === t.id ? 'var(--primary)' : 'var(--border-color)',
                  background: selectedTradeId === t.id ? 'rgba(255,255,255,0.03)' : 'transparent',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>@{partnerName}</span>
                  {getStatusBadge(t.status)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span>${parseFloat(t.amountETH).toFixed(2)} USD</span>
                  <span>{Math.round(t.amountETB).toLocaleString()} ETB</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* RIGHT COLUMN: Active Trade Room */}
      {activeTrade ? (
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* Progress Stepper */}
          <div style={{ padding: '20px 24px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {tradeSteps.map((s, i) => (
              <React.Fragment key={i}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: currentStep >= i ? 'var(--gold)' : 'var(--bg-base)', border: `2px solid ${currentStep >= i ? 'var(--gold)' : 'var(--border)'}`, color: currentStep >= i ? '#0A0C12' : 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800 }}>
                    {currentStep > i ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: currentStep === i ? 700 : 500, color: currentStep === i ? 'var(--text-1)' : 'var(--text-3)' }}>{s.label}</span>
                </div>
                {i < tradeSteps.length - 1 && <div style={{ flex: 1, height: '2px', background: currentStep > i ? 'var(--gold)' : 'var(--border)', margin: '0 16px' }} />}
              </React.Fragment>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', flex: 1, overflow: 'hidden' }}>
            {/* Chat Room / Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRight: '1px solid var(--border-color)' }}>
              
              {/* Header info */}
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem' }}>Trade with @{user.id === activeTrade.buyerId ? activeTrade.sellerName : activeTrade.buyerName}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Order ID: {activeTrade.id}</span>
                </div>
                
                {/* Countdown clock */}
                {timeRemaining && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: timerAlert ? 'var(--accent)' : 'var(--primary)', fontWeight: '700', fontSize: '1.1rem' }}>
                    <span className={timerAlert ? 'animate-pulse-slow' : ''}>⏱</span>
                    <span>{timeRemaining}</span>
                  </div>
                )}
              </div>

              {/* Chat Messages */}
              <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.1)' }}>
                {/* Guidance Tip Based on Status */}
                <div style={{ background: 'var(--gold-bg)', border: '1px solid var(--border-active)', borderRadius: '10px', padding: '12px 16px', fontSize: '12px', color: 'var(--gold-light)', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ fontSize: '16px' }}>💡</span>
                  <div>
                    {activeTrade.status === 'payment_pending' && user.id === activeTrade.buyerId && (
                      <p><strong>Step 1:</strong> Transfer the ETB amount to the seller's account. Use the chat below to ask for bank details if not provided. Once sent, upload the receipt screenshot in the sidebar.</p>
                    )}
                    {activeTrade.status === 'payment_pending' && user.id === activeTrade.sellerId && (
                      <p><strong>Step 1:</strong> The buyer is preparing your payment. You can provide your bank details in the chat. <strong>Wait for the buyer</strong> to upload a receipt before checking your bank account.</p>
                    )}
                    {activeTrade.status === 'paid' && user.id === activeTrade.buyerId && (
                      <p><strong>Step 2:</strong> You have marked the trade as paid. The seller is now verifying the transaction in their bank app. Once they confirm, your USD will be released.</p>
                    )}
                    {activeTrade.status === 'paid' && user.id === activeTrade.sellerId && (
                      <p><strong>Step 2:</strong> The buyer has uploaded a receipt. <strong>Open your bank app</strong> and verify the exact amount has arrived. Once verified, click the release button in the sidebar.</p>
                    )}
                    {activeTrade.status === 'completed' && (
                      <p><strong>Success:</strong> This trade is finalized. The USD has been moved to the buyer's wallet. Thank you for trading securely on EthioSwap!</p>
                    )}
                  </div>
                </div>

                {activeTrade.chat.map((msg, idx) => {
                  const isSystem = msg.senderId === 'system';
                  const isSelf = msg.senderId === user.id;

                  if (isSystem) {
                    return (
                      <div key={idx} style={{ alignSelf: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.5rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '80%', textAlign: 'center' }}>
                        {msg.message}
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={idx} 
                      style={{
                        alignSelf: isSelf ? 'flex-end' : 'flex-start',
                        maxWidth: '65%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isSelf ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>
                        {isSelf ? 'You' : `@${activeTrade.buyerId === msg.senderId ? activeTrade.buyerName : activeTrade.sellerName}`}
                      </span>
                      <div 
                        style={{
                          background: isSelf ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                          color: isSelf ? '#080A10' : '#ffffff',
                          padding: '0.6rem 0.9rem',
                          borderRadius: '12px',
                          borderBottomRightRadius: isSelf ? '0px' : '12px',
                          borderBottomLeftRadius: isSelf ? '12px' : '0px',
                          fontSize: '0.9rem',
                          border: isSelf ? 'none' : '1px solid var(--border-color)',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}
                      >
                        {msg.message}
                      </div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Input Bar */}
              {activeTrade.status !== 'completed' && activeTrade.status !== 'cancelled' && (
                <form onSubmit={handleSendMessage} style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem', background: 'var(--bg-color)' }}>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="Type message to trade partner..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem' }}>➤</button>
                </form>
              )}
            </div>

            {/* Action sidebar */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Escrow Specs</h4>
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Trading:</span>
                    <strong>${parseFloat(activeTrade.amountETH).toFixed(2)} USD</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Total ETB:</span>
                    <strong>{activeTrade.amountETB.toLocaleString()} ETB</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                    <span>{getStatusBadge(activeTrade.status)}</span>
                  </div>
                </div>
              </div>

              {/* Partner Info */}
              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Partner Info</h4>
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ color: 'var(--primary)' }}>📞</span>
                    <span>Phone: {user.id === activeTrade.buyerId ? activeTrade.sellerPhone : activeTrade.buyerPhone}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                    📞 Call your trade partner directly if they are unresponsive.
                  </div>
                </div>
              </div>

              {/* Payout Payment details */}
              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Payout details</h4>
                {activeTrade.selectedPaymentAccount ? (
                  <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', border: '1px solid rgba(200,150,44,0.3)', background: 'var(--gold-bg)', padding: '12px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--gold-light)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {user.id === activeTrade.buyerId ? "⚠️ Send Birr to this account:" : "💰 Expecting Payment on your account:"}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '20px' }}>
                        {activeTrade.selectedPaymentAccount.bankName.includes("Telebirr") ? "📱" : "🏦"}
                      </span>
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--text-1)' }}>
                          {activeTrade.selectedPaymentAccount.bankName}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '3px' }}>
                          Number: <strong style={{ color: 'white', fontFamily: 'monospace', letterSpacing: '0.02em', fontSize: '12.5px' }}>{activeTrade.selectedPaymentAccount.accountNumber}</strong>
                        </div>
                        <div style={{ fontSize: '12.5px', color: 'var(--text-2)', marginTop: '2px' }}>
                          Name: <strong>{activeTrade.selectedPaymentAccount.holderName}</strong>
                        </div>
                      </div>
                    </div>
                    {user.id === activeTrade.buyerId && (
                      <button 
                        type="button" 
                        onClick={() => {
                          navigator.clipboard.writeText(activeTrade.selectedPaymentAccount.accountNumber);
                          alert("Account number copied to clipboard.");
                        }} 
                        className="btn btn-sm btn-outline" 
                        style={{ width: '100%', marginTop: '6px', fontSize: '11px', padding: '6px' }}
                      >
                        📋 Copy Account Number
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--accent)', margin: 0, lineHeight: 1.4 }}>
                      ⚠️ No bank profile was pre-selected. Seller, please supply your bank details in the chat so the buyer can transfer the money.
                    </p>
                  </div>
                )}
              </div>

              {/* Buyer Payment Screen (Upload Proof) */}
              {user.id === activeTrade.buyerId && activeTrade.status === 'payment_pending' && (
                <div>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Upload Payment Proof</h4>
                  <form onSubmit={handleMarkPaid} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Transfer <strong>{activeTrade.amountETB.toLocaleString()} ETB</strong> via CBE/Telebirr, then upload screenshot receipt.
                    </p>
                    
                    <div style={{
                      border: '1px dashed var(--border-color)',
                      borderRadius: '8px',
                      padding: '1rem',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: uploadFile ? 'rgba(16,185,129,0.05)' : 'transparent',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}>
                      <input 
                        type="file" 
                        accept="image/*"
                        id="upload-screenshot" 
                        style={{ display: 'none' }} 
                        onChange={(e) => setUploadFile(e.target.files[0])}
                      />
                      <label htmlFor="upload-screenshot" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                         <span style={{ fontSize: '20px', color: uploadFile ? 'var(--secondary)' : 'var(--text-muted)' }}>📤</span>
                        <span style={{ fontSize: '0.75rem', color: uploadFile ? 'white' : 'var(--text-secondary)' }}>
                          {uploadFile ? uploadFile.name : 'Select Screenshot'}
                        </span>
                      </label>
                    </div>

                    <button type="submit" className="btn btn-success" style={{ width: '100%' }}>
                      ✓ I Have Paid Seller
                    </button>

                    <button type="button" onClick={handleCancelTrade} className="btn btn-secondary" style={{ width: '100%', color: 'var(--accent)' }}>
                      Cancel Trade
                    </button>
                  </form>
                </div>
              )}

              {/* Display proof of payment if uploaded */}
              {activeTrade.proofUrl && (
                <div>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Payment Evidence</h4>
                  <div className="glass-card" style={{ padding: '0.5rem', textAlign: 'center' }}>
                    <a href={activeTrade.proofUrl} target="_blank" rel="noreferrer">
                      <img 
                        src={activeTrade.proofUrl} 
                        alt="Payment Receipt" 
                        style={{ width: '100%', borderRadius: '8px', maxHeight: '180px', objectFit: 'contain', cursor: 'zoom-in', border: '1px solid var(--border-color)' }}
                      />
                    </a>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.4rem' }}>
                      Click image to expand proof receipt
                    </span>
                  </div>
                </div>
              )}

              {/* Seller Action Panel */}
              {user.id === activeTrade.sellerId && activeTrade.status === 'paid' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div className="badge-pulse" style={{ background: 'var(--gold-bg)', border: '1px solid var(--gold)', borderRadius: '12px', padding: '12px', textAlign: 'center', animation: 'pulse-ring 2s ease-in-out infinite' }}>
                    <div style={{ fontWeight: 800, color: 'var(--gold-light)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      🔔 Payment Reminder
                    </div>
                    <p style={{ fontSize: '11.5px', color: 'var(--text-2)', margin: '4px 0 0', lineHeight: 1.4 }}>
                      The buyer has sent the Birr. Check your bank app now and confirm receipt of <strong>{activeTrade.amountETB.toLocaleString()} ETB</strong> before releasing.
                    </p>
                  </div>
                  <button onClick={handleReleaseEscrow} className="btn btn-teal glow-teal btn-full" style={{ width: '100%', padding: '12px', fontWeight: 800 }}>
                    ✓ Release USD Escrow
                  </button>
                </div>
              )}

              {/* Dispute Trigger */}
              {(activeTrade.status === 'paid' || activeTrade.status === 'payment_pending') && (
                <div>
                  <button 
                    type="button"
                    onClick={handleOpenDispute} 
                    className="btn btn-secondary" 
                    style={{ width: '100%', borderColor: 'rgba(239,68,68,0.3)', color: 'var(--accent)' }}
                  >
                    ⚠ Open Dispute
                  </button>
                </div>
              )}

              {/* Status Notices */}
              {activeTrade.status === 'completed' && (
                <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '8px', padding: '1rem', fontSize: '0.8rem', color: 'var(--secondary)', textAlign: 'center' }}>
                  <strong>Escrow Released</strong>
                  <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>The USD has been sent to the buyer's balance. Gas-free transaction completed.</p>
                </div>
              )}

              {activeTrade.status === 'cancelled' && (
                <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  <strong>Trade Cancelled</strong>
                  <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>This trade was cancelled. Any locked funds have been returned to the seller's balance.</p>
                </div>
              )}

              {activeTrade.status === 'disputed' && (
                <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '8px', padding: '1rem', fontSize: '0.8rem', color: 'var(--accent)', textAlign: 'center' }}>
                  <strong>Dispute Under Review</strong>
                  <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Admin is reviewing the trade logs and payment screenshot. Support will resolve this shortly.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>💬</div>
          <h3>Select a P2P Trade</h3>
          <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Select a trade from the sidebar to open the escrow room, chat with your partner, and view payment details.</p>
        </div>
      )}
    </div>
  );
};

export default TradeRoom;
