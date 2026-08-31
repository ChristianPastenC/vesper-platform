import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '../../i18n/config';

export const LoginForm: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loadingState, setLoadingState] = useState<'idle' | 'pinging' | 'authenticating'>('pinging');

  useEffect(() => {
    const ping = async () => {
      try {
        await fetch(`${import.meta.env.PUBLIC_API_URL || 'http://127.0.0.1:8081'}/api/v1/support/ping`);
      } catch (e) {
      } finally {
        setLoadingState('idle');
      }
    };
    ping();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    setLoadingState('authenticating');

    try {
      const res = await fetch(`${import.meta.env.PUBLIC_API_URL || 'http://127.0.0.1:8081'}/api/v1/b2b/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) throw new Error('Invalid credentials');

      const data = await res.json();
      localStorage.setItem('sovereign_session_token', data.token);
      localStorage.setItem('sovereign_tenant_id', data.tenant_id);
      localStorage.setItem('sovereign_tenant_name', data.name);

      window.location.href = '/dashboard';
    } catch (err) {
      setError(true);
      setLoadingState('idle');
    }
  };

  const getButtonText = () => {
    if (loadingState === 'pinging') return t('auth.login.connecting');
    if (loadingState === 'authenticating') return t('auth.login.authenticating');
    return t('auth.login.submit');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl text-center shadow-inner">
          {t('auth.login.invalid')}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-xs font-bold tracking-wide text-slate-300 uppercase">
          {t('auth.login.email')}
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner"
          placeholder={t('auth.register.email_ph')}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-xs font-bold tracking-wide text-slate-300 uppercase">
          {t('auth.login.password')}
        </label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loadingState !== 'idle'}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] transform hover:-translate-y-0.5 active:translate-y-0 mt-8"
      >
        <span className="tracking-wide">{getButtonText()}</span>
        {loadingState !== 'idle' && (
          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
      </button>
    </form>
  );
};
