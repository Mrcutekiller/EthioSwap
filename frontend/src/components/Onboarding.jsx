import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Shield, TrendingUp, Star, Rocket, ChevronRight } from 'lucide-react';

const Onboarding = ({ onComplete }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [lang, setLang] = useState(i18n.language || 'en');

  const screens = [
    {
      icon: '🎉',
      title: t('Welcome to EthioSwap!'),
      subtitle: t('Buy & Sell USDT safely in Ethiopia'),
      color: '#f5c518'
    },
    {
      icon: <Shield size={36} color="#4f46e5" />,
      title: t('Safe P2P Trading'),
      subtitle: t('Our escrow system protects your money'),
      color: '#4f46e5'
    },
    {
      icon: <TrendingUp size={36} color="#00d4a0" />,
      title: t('Best Rates in Ethiopia'),
      subtitle: t('Trade directly with other Ethiopians'),
      color: '#00d4a0'
    },
    {
      icon: <Star size={36} color="#f59e0b" />,
      title: t('Trusted Traders Only'),
      subtitle: t('All traders are KYC verified'),
      color: '#f59e0b'
    },
    {
      icon: <Rocket size={36} color="#ef4444" />,
      title: t('Ready to Start!'),
      subtitle: t('Complete your KYC to unlock all features'),
      color: '#ef4444'
    }
  ];

  const handleComplete = async () => {
    if (user) {
      await supabase.from('users').update({ onboarding_completed: true }).eq('id', user.id);
    }
    onComplete();
  };

  const handleLanguageSelect = async (newLang) => {
    setLang(newLang);
    i18n.changeLanguage(newLang);
    localStorage.setItem('ethioswap_language', newLang);
    if (user) {
      await supabase.from('users').update({ preferred_language: newLang }).eq('id', user.id);
    }
  };

  if (step === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg-base)' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
          <h1 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px' }}>Welcome to EthioSwap!</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '24px' }}>Choose your language / ቋንቋ ይምረጡ</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={() => handleLanguageSelect('en')} className={`btn ${lang === 'en' ? 'btn-gold' : 'btn-ghost'}`} style={{ padding: '12px 32px', fontSize: '16px' }}>English</button>
            <button onClick={() => handleLanguageSelect('am')} className={`btn ${lang === 'am' ? 'btn-gold' : 'btn-ghost'}`} style={{ padding: '12px 32px', fontSize: '16px' }}>አማርኛ</button>
          </div>
        </div>
        <button onClick={() => setStep(1)} className="btn btn-gold btn-full" style={{ maxWidth: '320px', padding: '14px' }}>
          {t('Next')} <ChevronRight size={18} />
        </button>
        <button onClick={handleComplete} style={{ marginTop: '12px', background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '13px' }}>
          {t('Skip')}
        </button>
      </div>
    );
  }

  if (step <= 4) {
    const screen = screens[step - 1];
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg-base)' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: `${screen.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '40px' }}>
            {typeof screen.icon === 'string' ? screen.icon : screen.icon}
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px' }}>{screen.title}</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: '1.6' }}>{screen.subtitle}</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '32px', marginBottom: '32px' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ width: i === step ? '24px' : '8px', height: '8px', borderRadius: '4px', background: i === step ? screen.color : 'var(--border)', transition: 'all 0.3s' }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '320px' }}>
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="btn btn-ghost" style={{ flex: 1 }}>{t('Back')}</button>
          )}
          <button onClick={() => step < 5 ? setStep(step + 1) : handleComplete()} className="btn btn-gold" style={{ flex: 1 }}>
            {step < 5 ? t('Next') : t('Create Account')}
          </button>
        </div>
        <button onClick={handleComplete} style={{ marginTop: '12px', background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '13px' }}>
          {t('Skip')}
        </button>
      </div>
    );
  }

  return null;
};

export default Onboarding;
