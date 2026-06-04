import React, { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('EthioSwap Crash Captured:', error, errorInfo);
  }

  handleReset = () => {
    localStorage.removeItem('ethioswap_user');
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          width: '100%',
          background: '#0A0C12',
          backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(212,175,55,0.08) 0%, transparent 60%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#E2E8F0',
          textAlign: 'center'
        }}>
          <div style={{
            background: '#111318',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            width: '100%',
            maxWidth: '500px',
            padding: '40px 32px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'rgba(212, 175, 55, 0.1)',
              border: '1px solid rgba(212, 175, 55, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              marginBottom: '24px',
              boxShadow: '0 0 20px rgba(212, 175, 55, 0.1)'
            }}>
              ⚠️
            </div>

            <h2 style={{
              fontSize: '24px',
              fontWeight: 800,
              color: '#FFFFFF',
              marginBottom: '12px',
              letterSpacing: '-0.02em'
            }}>
              Something went wrong
            </h2>

            <p style={{
              fontSize: '14px',
              color: '#94A3B8',
              lineHeight: '1.6',
              marginBottom: '24px'
            }}>
              An unexpected crash occurred. This may be due to an out-of-sync session or missing data. 
            </p>

            {this.state.error && (
              <details style={{
                width: '100%',
                background: '#07080c',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '12px',
                padding: '12px',
                marginBottom: '28px',
                textAlign: 'left',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: '#f43f5e',
                overflowX: 'auto',
                boxSizing: 'border-box'
              }}>
                <summary style={{ cursor: 'pointer', color: '#94A3B8', fontWeight: 600, outline: 'none' }}>
                  Error details
                </summary>
                <div style={{ marginTop: '8px', whiteSpace: 'pre-wrap' }}>
                  {this.state.error.toString()}
                </div>
              </details>
            )}

            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: 'var(--gold, #d4af37)',
                  border: 'none',
                  color: '#0A0C12',
                  borderRadius: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = 0.9}
                onMouseLeave={e => e.currentTarget.style.opacity = 1}
              >
                Try Again
              </button>
              
              <button
                onClick={this.handleReset}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  borderRadius: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
              >
                Reset Session & Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
