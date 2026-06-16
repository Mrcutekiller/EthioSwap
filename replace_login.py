import re, sys

NEW_LOGIN_FORM = r"""const LoginForm = ({ onToggle, onBackToHome, externalError }) => {
  const { login, verifyLoginOtp, loading, error, signInWithGoogle, sendPasswordResetEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [resetLinkSent, setResetLinkSent] = useState(false);
  const [localError, setLocalError] = useState('');
  const [otpState, setOtpState] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpRefs] = useState(() => Array.from({ length: 6 }, () => React.createRef()));
  const [countdown, setCountdown] = useState(300);
  const [canResend, setCanResend] = useState(false);

  const displayError = localError || externalError || error;

  useEffect(() => {
    if (!otpState) return;
    setCountdown(300);
    setCanResend(false);
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(interval); setCanResend(true); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [otpState]);

  const formatCountdown = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!email || !password) { setLocalError('Please enter both email and password.'); return; }
    const result = await login(email, password);
    if (result?.status === 'otp_required') {
      setOtpState(result);
      setOtpCode('');
      setTimeout(() => otpRefs[0]?.current?.focus(), 150);
    }
  };

  const handleOtpInput = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const chars = Array.from({ length: 6 }, (_, i) => otpCode[i] || '');
    chars[index] = digit;
    const newCode = chars.join('');
    setOtpCode(newCode);
    if (digit && index < 5) otpRefs[index + 1]?.current?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (otpCode[index]) {
        const chars = Array.from({ length: 6 }, (_, i) => otpCode[i] || '');
        chars[index] = '';
        setOtpCode(chars.join(''));
      } else if (index > 0) {
        otpRefs[index - 1]?.current?.focus();
        const chars = Array.from({ length: 6 }, (_, i) => otpCode[i] || '');
        chars[index - 1] = '';
        setOtpCode(chars.join(''));
      }
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const padded = pasted.padEnd(6, '');
    setOtpCode(padded);
    if (pasted.length === 6) { setTimeout(() => handleVerifyOtp(pasted), 50); }
    else { otpRefs[Math.min(pasted.length, 5)]?.current?.focus(); }
  };

  const handleVerifyOtp = async (code) => {
    const finalCode = code !== undefined ? code : otpCode;
    setLocalError('');
    if (finalCode.replace(/\s/g, '').length < 6) { setLocalError('Please enter the full 6-digit code.'); return; }
    await verifyLoginOtp(otpState.userId, otpState.email, otpState.password, finalCode.replace(/\s/g, ''));
  };

  const handleResend = async () => {
    setLocalError('');
    setOtpCode('');
    const result = await login(otpState.email, otpState.password);
    if (result?.status === 'otp_required') {
      setOtpState(result);
      setTimeout(() => otpRefs[0]?.current?.focus(), 150);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!email) { setLocalError('Please enter your email address.'); return; }
    const success = await sendPasswordResetEmail(email);
    if (success) setResetLinkSent(true);
  };

  // OTP Verification Screen
  if (otpState) {
    return (
      <div style={{ minHeight: '100vh', width: '100%', background: '#0A0E1A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflowY: 'auto' }}>
        <style>{`
          @keyframes otpPulse { 0%,100%{box-shadow:0 0 0 0 rgba(245,166,35,0.4)} 50%{box-shadow:0 0 0 14px rgba(245,166,35,0)} }
          .otp-digit{width:48px;height:58px;border-radius:12px;border:1.5px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);color:#fff;font-size:24px;font-weight:800;text-align:center;outline:none;transition:border-color 0.2s,box-shadow 0.2s;caret-color:#F5A623;font-family:'Courier New',monospace;}
          .otp-digit:focus{border-color:#F5A623;box-shadow:0 0 0 3px rgba(245,166,35,0.18);}
          .otp-digit.filled{border-color:rgba(245,166,35,0.5);background:rgba(245,166,35,0.07);}
        `}</style>
        <div style={{ position: 'absolute', top: '10%', left: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(245,166,35,0.1) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(40px)' }} />
        <div style={{ width: '100%', maxWidth: '400px', zIndex: 1 }}>
          <button type="button" onClick={() => { setOtpState(null); setOtpCode(''); setLocalError(''); }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50px', color: '#fff', padding: '8px 18px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '28px' }}>
            <i className="ti ti-arrow-left" style={{ fontSize: '13px' }}></i> Back to Sign In
          </button>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '36px 28px', textAlign: 'center' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)', color: '#F5A623', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '36px', animation: 'otpPulse 2s infinite' }}>
              <i className="ti ti-shield-lock"></i>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>Check Your Email</h2>
            <p style={{ fontSize: '14px', color: '#8B8FA3', lineHeight: '1.6', marginBottom: '28px' }}>
              We sent a 6-digit security code to<br />
              <strong style={{ color: '#F5A623' }}>{otpState.email}</strong>
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '20px' }} onPaste={handleOtpPaste}>
              {Array.from({ length: 6 }).map((_, i) => (
                <input
                  key={i}
                  ref={otpRefs[i]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className={`otp-digit${otpCode[i] ? ' filled' : ''}`}
                  value={otpCode[i] || ''}
                  onChange={e => handleOtpInput(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                />
              ))}
            </div>
            <div style={{ fontSize: '13px', color: '#8B8FA3', marginBottom: '20px' }}>
              {countdown > 0
                ? <span>Code expires in <strong style={{ color: countdown < 60 ? '#EF4444' : '#fff' }}>{formatCountdown(countdown)}</strong></span>
                : <span style={{ color: '#EF4444' }}>Code has expired — request a new one below</span>
              }
            </div>
            {displayError && (
              <div style={{ fontSize: '13px', color: '#EF4444', fontWeight: 600, padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', textAlign: 'left' }}>
                <i className="ti ti-alert-triangle" style={{ fontSize: '15px', flexShrink: 0 }}></i>
                <span>{displayError}</span>
              </div>
            )}
            <button type="button" onClick={() => handleVerifyOtp()} disabled={loading || otpCode.replace(/\s/g,'').length < 6}
              style={{ width: '100%', height: '52px', fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: otpCode.replace(/\s/g,'').length < 6 ? 'rgba(245,166,35,0.3)' : 'linear-gradient(135deg, #F5A623 0%, #FFE082 100%)', color: '#0A0C12', border: 'none', borderRadius: '14px', cursor: loading || otpCode.replace(/\s/g,'').length < 6 ? 'not-allowed' : 'pointer', marginBottom: '16px' }}>
              {loading ? 'Verifying...' : <><i className="ti ti-shield-check" style={{ fontSize: '18px' }}></i>&nbsp;Verify &amp; Sign In</>}
            </button>
            <button type="button" onClick={handleResend} disabled={!canResend || loading}
              style={{ fontSize: '13px', fontWeight: 700, color: canResend ? '#F5A623' : '#5A6275', background: 'none', border: 'none', cursor: canResend ? 'pointer' : 'not-allowed', padding: '8px', textDecoration: canResend ? 'underline' : 'none' }}>
              {canResend ? "Didn't receive it? Resend code" : `Resend available in ${formatCountdown(countdown)}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: '#0A0E1A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflowY: 'auto' }}>
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(245,166,35,0.12) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(40px)' }} />
      <div style={{ width: '100%', maxWidth: '420px', zIndex: 1 }}>
        {onBackToHome && (
          <button type="button" onClick={isForgotMode ? () => setIsForgotMode(false) : onBackToHome} style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50px', color: '#fff', padding: '8px 18px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '28px' }}>
            <i className="ti ti-arrow-left" style={{ fontSize: '13px' }}></i> Back
          </button>
        )}
        {isForgotMode ? (
          resetLinkSent ? (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(245,166,35,0.1)', color: '#F5A623', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '32px' }}><i className="ti ti-mail"></i></div>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>Check Your Email</h2>
              <p style={{ fontSize: '14px', color: '#8B8FA3', lineHeight: '1.6', marginBottom: '24px' }}>We sent a reset link to <strong style={{ color: '#fff' }}>{email}</strong>.</p>
              <button type="button" onClick={() => { setIsForgotMode(false); setResetLinkSent(false); setEmail(''); }} style={{ width: '100%', height: '48px', background: 'linear-gradient(135deg, #F5A623 0%, #FFE082 100%)', color: '#0A0C12', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}>Back to Sign In</button>
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '32px 24px' }}>
              <h2 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '6px', textAlign: 'center', color: '#fff' }}>Reset Password</h2>
              <p style={{ fontSize: '14px', color: '#8B8FA3', marginBottom: '28px', textAlign: 'center' }}>Enter your email to receive a recovery link</p>
              <form onSubmit={handleResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ position: 'relative' }}>
                  <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '14px 16px 14px 44px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} required />
                  <i className="ti ti-mail" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B8FA3', fontSize: '18px' }}></i>
                </div>
                {displayError && (<div style={{ fontSize: '13px', color: '#EF4444', fontWeight: 600, padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><i className="ti ti-alert-triangle" style={{ fontSize: '15px' }}></i><span>{displayError}</span></div>)}
                <button type="submit" disabled={loading} style={{ height: '52px', fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #F5A623 0%, #FFE082 100%)', color: '#0A0C12', border: 'none', borderRadius: '14px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>{loading ? 'Sending...' : 'Send Reset Link'}</button>
              </form>
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button type="button" onClick={() => setIsForgotMode(false)} style={{ fontSize: '14px', fontWeight: 700, color: '#F5A623', background: 'none', border: 'none', cursor: 'pointer' }}>Back to Sign In</button>
              </div>
            </div>
          )
        ) : (
          <>
            <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '6px', textAlign: 'center', color: '#fff' }}>Welcome Back</h2>
            <p style={{ fontSize: '14px', color: '#8B8FA3', marginBottom: '28px', textAlign: 'center' }}>Sign in to your EthioSwap wallet</p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ position: 'relative' }}>
                <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '14px 16px 14px 44px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                <i className="ti ti-mail" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B8FA3', fontSize: '18px' }}></i>
              </div>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '14px 44px 14px 44px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                <i className="ti ti-lock" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B8FA3', fontSize: '18px' }}></i>
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8B8FA3', cursor: 'pointer', padding: '4px' }}><i className={showPassword ? 'ti ti-eye-off' : 'ti ti-eye'} style={{ fontSize: '18px' }}></i></button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-4px' }}>
                <button type="button" onClick={() => { setIsForgotMode(true); setLocalError(''); setResetLinkSent(false); }} style={{ background: 'none', border: 'none', color: '#F5A623', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: '4px 0' }}>Forgot Password?</button>
              </div>
              {displayError && (<div style={{ fontSize: '13px', color: '#EF4444', fontWeight: 600, padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><i className="ti ti-alert-triangle" style={{ fontSize: '15px' }}></i><span>{displayError}</span></div>)}
              <button type="submit" disabled={loading} style={{ height: '52px', fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #F5A623 0%, #FFE082 100%)', color: '#0A0C12', border: 'none', borderRadius: '14px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>{loading ? 'Sending code...' : 'Sign In'}</button>
            </form>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
              <span style={{ fontSize: '12px', color: '#8B8FA3', fontWeight: 600 }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            </div>
            <button type="button" onClick={signInWithGoogle} disabled={loading}
              style={{ width: '100%', height: '52px', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s, border-color 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}>
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: '10px' }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <span style={{ fontSize: '14px', color: '#8B8FA3' }}>Don't have an account? </span>
              <button type="button" onClick={onToggle} style={{ fontSize: '14px', fontWeight: 700, color: '#F5A623', background: 'none', border: 'none', cursor: 'pointer' }}>Sign Up</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

"""

content = open('frontend/src/App.jsx', encoding='utf-8').read()
start_marker = 'const LoginForm = ({ onToggle, onBackToHome, externalError }) => {'
end_marker = '\nconst SignupWizard'
start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx)
if start_idx == -1 or end_idx == -1:
    print(f'ERROR: markers not found. start={start_idx}, end={end_idx}')
    sys.exit(1)
new_content = content[:start_idx] + NEW_LOGIN_FORM + content[end_idx+1:]
open('frontend/src/App.jsx', 'w', encoding='utf-8').write(new_content)
print(f'Done. Total lines: {len(new_content.splitlines())}')
