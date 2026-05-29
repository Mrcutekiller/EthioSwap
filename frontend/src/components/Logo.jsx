import React from 'react';

const Logo = ({ size = 32, showText = true }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D4AF37" />
            <stop offset="50%" stopColor="#F3E5AB" />
            <stop offset="100%" stopColor="#AA7C11" />
          </linearGradient>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E2330" />
            <stop offset="100%" stopColor="#0B0D13" />
          </linearGradient>
        </defs>
        
        {/* Shield background */}
        <path d="M50 8 L85 24 V52 C85 71 70 85 50 90 C30 85 15 71 15 52 V24 L50 8 Z" fill="url(#bgGrad)" stroke="url(#goldGrad)" strokeWidth="5" />
        
        {/* Exchange lines */}
        <path d="M35 42 L65 42 M65 42 L55 34 M65 42 L55 50" stroke="url(#goldGrad)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M65 58 L35 58 M35 58 L45 50 M35 58 L45 66" stroke="url(#goldGrad)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {showText && (
        <span style={{ 
          fontWeight: 800, 
          fontSize: '18px', 
          letterSpacing: '-0.02em', 
          background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', 
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          EthioSwap
        </span>
      )}
    </div>
  );
};

export default Logo;
