import React from 'react';

const EmptyState = ({ icon = '🔍', title, subtitle, ctaText, ctaAction }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    textAlign: 'center',
    background: 'rgba(255, 255, 255, 0.02)',
    backdropFilter: 'blur(10px)',
    border: '1px dashed rgba(212, 175, 55, 0.15)',
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
    maxWidth: '420px',
    margin: '20px auto',
    transition: 'all 0.3s ease',
  }} className="glass-empty-state">
    <div style={{
      width: '72px',
      height: '72px',
      borderRadius: '20px',
      background: 'rgba(212, 175, 55, 0.05)',
      border: '1px solid rgba(212, 175, 55, 0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '32px',
      marginBottom: '20px',
      boxShadow: '0 0 20px rgba(212, 175, 55, 0.05)'
    }}>
      {icon}
    </div>
    <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: '#ffffff', letterSpacing: '-0.01em' }}>{title}</h3>
    <p style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: '1.5', maxWidth: '320px', marginBottom: '24px' }}>{subtitle}</p>
    {ctaText && (
      <button 
        onClick={ctaAction} 
        className="btn-gold" 
        style={{ 
          padding: '10px 24px',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 700,
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--font)'
        }}
      >
        {ctaText}
      </button>
    )}
  </div>
);

export default EmptyState;