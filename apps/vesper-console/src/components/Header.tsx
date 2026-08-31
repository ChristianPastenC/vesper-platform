import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../i18n/config';

interface HeaderProps {
  activeTab: 'dashboard' | 'console';
}

export const Header: React.FC<HeaderProps> = ({ activeTab }) => {
  const { t, i18n } = useTranslation();
  const [tenantName, setTenantName] = useState('');

  useEffect(() => {
    setTenantName(localStorage.getItem('sovereign_tenant_name') || 'Tenant');
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <header className="w-full h-auto md:h-16 py-4 md:py-0 border-b border-white/5 bg-slate-950/40 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between px-4 md:px-8 shrink-0 z-50 relative shadow-sm gap-4 md:gap-0">
      <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 w-full md:w-auto">
        <h1 className="text-lg md:text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 flex items-center gap-2 md:gap-3">
          <span className="bg-blue-500/10 text-blue-400 p-1.5 rounded-lg ring-1 ring-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 md:w-5 md:h-5">
              <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
            </svg>
          </span>
          <span className="hidden sm:inline">Sovereign Console</span>
        </h1>

        <div className="hidden md:block h-6 w-[1px] bg-white/10 mx-2"></div>

        <nav className="flex gap-1 overflow-x-auto w-full justify-center sm:justify-start">
          <a href="/dashboard" className={`text-xs md:text-sm font-semibold px-3 md:px-4 py-2 rounded-lg transition-all whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-white/10 text-white shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            {t('header.dashboard')}
          </a>
          <a href="/console" className={`text-xs md:text-sm font-semibold px-3 md:px-4 py-2 rounded-lg transition-all whitespace-nowrap ${activeTab === 'console' ? 'bg-white/10 text-white shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            {t('header.console')}
          </a>
        </nav>
      </div>

      <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto justify-between md:justify-end">

        {/* Modern Toggle Switch */}
        <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/5 shadow-inner">
          <button
            onClick={() => {
              i18n.changeLanguage('es');
              localStorage.setItem('i18nextLng', 'es');
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${i18n.language.startsWith('es')
                ? 'bg-blue-500/20 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                : 'text-slate-500 hover:text-slate-300'
              }`}
          >
            {t('header.lang_es')}
          </button>
          <button
            onClick={() => {
              i18n.changeLanguage('en');
              localStorage.setItem('i18nextLng', 'en');
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${i18n.language.startsWith('en')
                ? 'bg-blue-500/20 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                : 'text-slate-500 hover:text-slate-300'
              }`}
          >
            {t('header.lang_en')}
          </button>
        </div>

        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-black/20 rounded-xl border border-white/5 shadow-inner truncate max-w-[150px] md:max-w-none">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)] shrink-0"></span>
          <span className="text-xs text-slate-300 font-mono font-medium tracking-wide truncate">
            {tenantName || t('header.loading')}
          </span>
        </div>
        <button onClick={handleLogout} className="text-[10px] md:text-xs font-bold tracking-wide text-slate-500 hover:text-red-400 bg-transparent hover:bg-red-500/10 px-2.5 md:px-3 py-1.5 rounded-lg transition-colors ml-2 whitespace-nowrap">
          {t('header.logout')}
        </button>
      </div>
    </header>
  );
};
