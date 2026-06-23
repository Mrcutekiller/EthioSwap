import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const TradeDetailPage = ({ listing, onBack, onStartTrade }) => {
  const { user, systemSettings } = useAuth();
  const [tradeAmount, setTradeAmount] = useState('');
  const [selectedPaymentAccount, setSelectedPaymentAccount] = useState(null);
  const [error, setError] = useState('');

  const isBuyType = listing.type === 'sell';
  const standardRate = listing.type === 'buy'
    ? (systemSettings?.etbRatePerDollarSell ?? 190)
    : (systemSettings?.etbRatePerDollar ?? 190);
  const effectiveRate = listing.custom_rate_etb || standardRate;

  useEffect(() => {
    if (listing) {
      if (listing.type === 'buy' && user?.payment_accounts?.length > 0) {
        setSelectedPaymentAccount(user.payment_accounts[0]);
      } else if (listing.type === 'sell' && listing?.payment_accounts?.length > 0) {
        setSelectedPaymentAccount(listing.payment_accounts[0]);
      }
    }
  }, [listing, user]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    });
  };

  const handleStartTrade = () => {
    setError('');
    const amt = parseFloat(tradeAmount);
    if (isNaN(amt) || amt < 0.01) {
      setError('Minimum $0.01');
      return;
    }
    if (amt > listing.amount_eth) {
      setError(`Max available $${listing.amount_eth}`);
      return;
    }

    const totalEtb = amt * effectiveRate;
    if (totalEtb < listing.min_limit_etb || totalEtb > listing.max_limit_etb) {
      setError(`Total must be ${listing.min_limit_etb} - ${listing.max_limit_etb} ETB`);
      return;
    }

    if ((listing.type === 'buy' && !selectedPaymentAccount) ||
        (listing.type === 'sell' && !selectedPaymentAccount)) {
      setError('Please select payment account');
      return;
    }

    onStartTrade(listing.id, amt, selectedPaymentAccount);
  };

  return (
    <div style={{
      background: '#0a0e1a',
      minHeight: '100vh',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 0'
      }}>
        <button onClick={onBack} style={{
          background: 'transparent',
          border: 'none',
          color: '#fff',
          fontSize: '20px',
          cursor: 'pointer'
        }}>
          ← Back
        </button>
        <span style={{
          fontWeight: 700,
          color: isBuyType ? '#00C896' : '#F5A623',
          fontSize: '16px'
        }}>
          {isBuyType ? 'Buy USD' : 'Sell USD'}
        </span>
        <div style={{ width: '40px' }} />
      </div>

      {/* Seller Info */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #F5A623, #FFE082)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: 800,
            color: '#0a0e1a'
          }}>
            {(listing.seller_name || 'U').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontWeight: 700,
                color: '#fff',
                fontSize: '16px'
              }}>
                @{listing.seller_name || 'Anonymous'}
              </span>
              {(listing.seller_kyc_status === 'verified' || listing.seller_kyc_status === 'approved') && (
                <span style={{
                  background: 'rgba(0,200,150,0.12)',
                  color: '#00C896',
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  border: '1px solid rgba(0,200,150,0.2)'
                }}>
                  ✓ Verified
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                ★ {(listing.sellerAverageRating || 5.0).toFixed(1)}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                ({listing.sellerTotalTrades || 0} trades)
              </span>
              <span style={{ fontSize: '12px', color: '#00C896' }}>
                👍 {(listing.sellerPositivePercentage || 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Trade Info */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
        <h4 style={{ color: '#fff', margin: '0 0 12px' }}>Trade Details</h4>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>Exchange Rate</span>
          <span style={{ fontSize: '15px', fontWeight: 700, color: isBuyType ? '#00C896' : '#F5A623' }}>
            {effectiveRate.toFixed(2)} ETB / $1
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>Available</span>
          <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
            ${listing.amount_eth.toFixed(2)} USD
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>Limit</span>
          <span style={{ fontSize: '14px', color: '#fff' }}>
            {listing.min_limit_etb.toLocaleString()} - {listing.max_limit_etb.toLocaleString()} ETB
          </span>
        </div>
      </div>

      {/* Amount Input */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
        <h4 style={{ color: '#fff', margin: '0 0 12px' }}>Amount</h4>
        <input
          type="number"
          step="0.01"
          placeholder="Enter amount in USD"
          value={tradeAmount}
          onChange={(e) => setTradeAmount(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: '#141827',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '10px',
            color: '#fff',
            fontSize: '16px',
            fontWeight: 700,
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
        {tradeAmount && !isNaN(parseFloat(tradeAmount)) && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            background: 'rgba(0,200,150,0.05)',
            borderRadius: '8px',
            border: '1px solid rgba(0,200,150,0.1)'
          }}>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>You Pay / Receive</span>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#F5A623', marginTop: '4px' }}>
              {Math.round(parseFloat(tradeAmount) * effectiveRate).toLocaleString()} ETB
            </div>
          </div>
        )}
        {error && (
          <div style={{
            color: '#EF4444',
            fontSize: '12px',
            marginTop: '12px'
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Payment Methods */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
        <h4 style={{ color: '#fff', margin: '0 0 12px' }}>Payment Methods</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(listing.type === 'buy' ? user?.payment_accounts : listing?.payment_accounts)?.map((acc, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedPaymentAccount(acc)}
              style={{
                padding: '12px',
                borderRadius: '10px',
                border: selectedPaymentAccount?.id === acc.id
                  ? '2px solid #F5A623'
                  : '1px solid rgba(255,255,255,0.06)',
                background: selectedPaymentAccount?.id === acc.id
                  ? 'rgba(245,166,35,0.08)'
                  : 'transparent',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }} onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(acc.bankName || acc.method);
                  }}>
                    🏦 {acc.bankName || acc.method} (tap to copy)
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '4px', cursor: 'pointer' }} onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(acc.holderName || acc.holder || 'Account Holder');
                  }}>
                    👤 {acc.holderName || acc.holder || 'Account Holder'} (tap to copy)
                  </div>
                  {(acc.accountNumber || acc.account) && (
                    <div style={{
                      fontSize: '12px',
                      color: '#F5A623',
                      marginTop: '4px',
                      cursor: 'pointer'
                    }} onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(acc.accountNumber || acc.account);
                    }}>
                      📋 {acc.accountNumber || acc.account} (tap to copy)
                    </div>
                  )}
                </div>
                {selectedPaymentAccount?.id === acc.id && (
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#F5A623',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    color: '#0a0e1a',
                    fontWeight: 800
                  }}>✓</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Terms */}
      {(listing.description || listing.payment_window || listing.allow_third_party !== undefined) && (
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <h4 style={{ color: '#fff', margin: '0 0 12px' }}>Trade Terms</h4>
          {listing.description && (
            <p style={{ color: '#fff', fontSize: '13px', margin: '0 0 12px' }}>
              {listing.description}
            </p>
          )}
          <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
            ⏱️ Payment Window: {listing.payment_window || 15} minutes
          </div>
          <div style={{
            fontSize: '12px',
            color: listing.allow_third_party ? '#00C896' : '#EF4444',
            marginTop: '4px'
          }}>
            {listing.allow_third_party ? '✓ Third Party Allowed' : '✕ No Third Party'}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ marginTop: 'auto', display: 'flex', gap: '12px', paddingBottom: '20px' }}>
        <button
          onClick={onBack}
          style={{
            flex: 1,
            height: '50px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleStartTrade}
          style={{
            flex: 2,
            height: '50px',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, #F5A623, #FFE082)',
            color: '#0a0e1a',
            fontSize: '14px',
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          {isBuyType ? 'Buy Now' : 'Sell Now'}
        </button>
      </div>
    </div>
  );
};

export default TradeDetailPage;
