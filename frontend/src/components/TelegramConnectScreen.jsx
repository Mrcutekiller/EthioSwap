import React from 'react';

const TelegramConnectScreen = ({
  flow,
  tgLinkCode,
  tgDeepLink,
  tgSecondsLeft,
  tgLinking,
  tgLinked,
  codeCopied,
  setCodeCopied,
  displayError,
  handleResendTelegramCode,
  onBack,
}) => {
  const formatCountdown = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleCopy = () => {
    if (tgLinkCode) {
      navigator.clipboard.writeText(tgLinkCode).then(() => {
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
      });
    }
  };

  if (tgLinked) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center', padding: '32px 0' }}>
        <div style={{ fontSize: '64px' }}>✅</div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#10B981', margin: 0 }}>Telegram Connected!</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>Your account is now active. Logging you in…</p>
        <div style={{ width: '32px', height: '32px', border: '3px solid #10B981', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        style={{
          alignSelf: 'flex-start',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '50px',
          color: '#FFFFFF',
          padding: '8px 18px',
          fontSize: '12px',
          fontWeight: '700',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontFamily: 'var(--font)',
          transition: 'all 0.2s ease',
        }}
      >
        <i className="ti ti-arrow-left" /> Back
      </button>

      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '8px', color: '#2AABEE' }}>
          <i className="ti ti-brand-telegram" />
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 6px' }}>Connect Telegram</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.6, margin: 0 }}>
          Send the code below to <b>@EthioSwap_Bot</b> on Telegram to activate your account.
        </p>
      </div>

      {/* Steps */}
      <div style={{
        background: 'rgba(42,171,238,0.06)',
        border: '1px solid rgba(42,171,238,0.20)',
        borderRadius: '14px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        <div style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: 600, marginBottom: '4px' }}>
          How to connect:
        </div>
        {[
          { n: 1, text: 'Click "Open Telegram Bot" below' },
          { n: 2, text: 'The bot opens with the code pre-filled — tap Send' },
          { n: 3, text: 'Your account activates instantly!' },
        ].map(({ n, text }) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: 'var(--text-2)' }}>
            <div style={{
              width: '22px', height: '22px', borderRadius: '50%',
              background: 'rgba(42,171,238,0.2)', color: '#2AABEE',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 800, flexShrink: 0,
            }}>{n}</div>
            <span>{text}</span>
          </div>
        ))}
      </div>

      {/* Code block */}
      {tgLinking ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '12px', padding: '24px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
        }}>
          <div style={{ width: '20px', height: '20px', border: '2px solid #2AABEE', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>Generating your code…</span>
        </div>
      ) : tgLinkCode ? (
        <div style={{
          background: 'rgba(245,166,35,0.04)',
          border: '1px solid rgba(245,166,35,0.25)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}>
          {/* The 6-digit code */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              fontFamily: 'monospace',
              fontSize: '36px',
              fontWeight: 900,
              letterSpacing: '8px',
              color: '#F5A623',
              textShadow: '0 0 20px rgba(245,166,35,0.4)',
              userSelect: 'all',
            }}>
              {tgLinkCode}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              title="Copy code"
              style={{
                background: codeCopied ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.08)',
                border: `1px solid ${codeCopied ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.2)'}`,
                borderRadius: '10px',
                color: codeCopied ? '#10B981' : 'var(--text-2)',
                width: '38px', height: '38px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: '16px', flexShrink: 0,
                transition: 'all 0.2s ease',
              }}
            >
              <i className={codeCopied ? 'ti ti-check' : 'ti ti-copy'} />
            </button>
          </div>

          {/* Countdown */}
          {tgSecondsLeft > 0 ? (
            <div style={{
              fontSize: '12px',
              color: tgSecondsLeft < 60 ? '#F59E0B' : 'var(--text-3)',
              fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <i className="ti ti-clock" style={{ fontSize: '13px' }} />
              Valid for {formatCountdown(tgSecondsLeft)}
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: '#EF4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: '13px' }} />
              Code expired — generate a new one
            </div>
          )}
        </div>
      ) : (
        <div style={{
          textAlign: 'center', padding: '20px',
          background: 'rgba(255,77,77,0.06)',
          border: '1px solid rgba(255,77,77,0.2)',
          borderRadius: '14px',
        }}>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
            No code yet — click below to generate one.
          </p>
        </div>
      )}

      {/* Open bot CTA */}
      {tgLinkCode && tgSecondsLeft > 0 && (
        <a
          href={tgDeepLink || `https://t.me/EthioSwap_Bot?start=${tgLinkCode}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            height: '52px',
            background: 'linear-gradient(135deg, #2AABEE 0%, #229ED9 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '14px',
            fontSize: '15px',
            fontWeight: 800,
            textDecoration: 'none',
            boxShadow: '0 8px 30px rgba(42,171,238,0.3)',
            transition: 'all 0.2s ease',
          }}
        >
          <i className="ti ti-brand-telegram" style={{ fontSize: '20px' }} />
          Open Telegram Bot
        </a>
      )}

      {/* Resend / Generate */}
      <div style={{ textAlign: 'center' }}>
        <button
          type="button"
          disabled={tgLinking}
          onClick={handleResendTelegramCode}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--gold-light)',
            fontSize: '13px',
            fontWeight: 700,
            cursor: tgLinking ? 'not-allowed' : 'pointer',
            textDecoration: 'underline',
            fontFamily: 'var(--font)',
            opacity: tgLinking ? 0.6 : 1,
          }}
        >
          {tgLinking ? 'Generating…' : tgSecondsLeft > 0 ? 'Generate new code' : '🔄 Generate new code'}
        </button>
      </div>

      {/* Error */}
      {displayError && (
        <div style={{
          fontSize: '13px', color: 'var(--status-danger-text)', fontWeight: 600,
          padding: '12px 14px',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '12px',
          display: 'flex', alignItems: 'center', gap: '8px', lineHeight: 1.4,
        }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: '15px', color: '#EF4444' }} />
          <span>{displayError}</span>
        </div>
      )}

      {/* Waiting pulse */}
      {tgLinkCode && tgSecondsLeft > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          padding: '10px',
          background: 'rgba(16,185,129,0.06)',
          border: '1px solid rgba(16,185,129,0.15)',
          borderRadius: '10px',
        }}>
          <div style={{
            width: '8px', height: '8px',
            background: '#10B981',
            borderRadius: '50%',
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
          <span style={{ fontSize: '12px', color: '#10B981', fontWeight: 600 }}>
            Waiting for you to send the code to the bot…
          </span>
        </div>
      )}
    </div>
  );
};

export default TelegramConnectScreen;
