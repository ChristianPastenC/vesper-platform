import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../i18n/config';

export const RegisterForm: React.FC = () => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.PUBLIC_API_URL || 'http://127.0.0.1:8081'}/api/v1/b2b/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        throw new Error(res.status === 400 ? 'invalid' : 'server');
      }

      const data = await res.json();
      sessionStorage.setItem('sovereign_session_token', data.token);
      sessionStorage.setItem('sovereign_tenant_id', data.tenant_id);
      sessionStorage.setItem('sovereign_tenant_name', data.name);

      window.location.href = '/dashboard';
    } catch (err: any) {
      if (err instanceof TypeError || err.message === 'Failed to fetch') {
        setErrorMsg('Network error or CORS issue. Server unreachable.');
      } else if (err.message === 'invalid') {
        setErrorMsg(t('auth.register.error'));
      } else {
        setErrorMsg('Server error. Please try again later.');
      }
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl text-center shadow-inner">
          {errorMsg}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="name" className="block text-xs font-bold tracking-wide text-slate-300 uppercase">
          {t('auth.register.name')}
        </label>
        <input
          type="text"
          id="name"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner"
          placeholder={t('auth.register.name_ph')}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-xs font-bold tracking-wide text-slate-300 uppercase">
          {t('auth.register.email')}
        </label>
        <input
          type="email"
          id="email"
          name="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner"
          placeholder={t('auth.register.email_ph')}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-xs font-bold tracking-wide text-slate-300 uppercase">
          {t('auth.register.password')}
        </label>
        <input
          type="password"
          id="password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] transform hover:-translate-y-0.5 active:translate-y-0 mt-8"
      >
        <span className="tracking-wide">
          {loading ? t('auth.register.registering') : t('auth.register.submit')}
        </span>
        {loading && (
          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
      </button>
    </form>
  );
};
