import React from 'react';

const Logo = ({ size = 32, showText = true }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <img 
        src="/favicon.png" 
        alt="EthioSwap Logo" 
        style={{ 
          width: size, 
          height: size, 
          objectFit: 'contain',
          borderRadius: '8px'
        }} 
      />
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
