import React from 'react';
import { useTranslation } from 'react-i18next';
import '../../i18n/config';

interface AuthLayoutProps {
  titleKey: string;
  subtitleKey: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ titleKey, subtitleKey, icon, children, footer }) => {
  const { t, i18n } = useTranslation();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">

      {/* Home Link */}
      <a href="/" className="absolute top-6 left-6 z-50 flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-4.28 9.22a.75.75 0 000 1.06l3 3a.75.75 0 101.06-1.06l-1.72-1.72h5.69a.75.75 0 000-1.5h-5.69l1.72-1.72a.75.75 0 00-1.06-1.06l-3 3z" clipRule="evenodd" />
        </svg>
        <span className="text-sm font-bold">Home</span>
      </a>

      {/* Language Switcher for Auth Pages */}
      <div className="absolute top-6 right-6 z-50">
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
      </div>

      {/* Ambient glowing backgrounds */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>

      <div className="max-w-md w-full bg-slate-900/40 backdrop-blur-2xl ring-1 ring-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>

        <div className="p-10 relative z-10">
          <div className="flex items-center justify-center mb-8">
            <div className="bg-blue-500/10 text-blue-400 p-4 rounded-2xl ring-1 ring-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
              {icon}
            </div>
          </div>

          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 text-center mb-3">
            {t(titleKey as any)}
          </h2>
          <p className="text-slate-400 text-center mb-10 text-sm leading-relaxed">
            {t(subtitleKey as any)}
          </p>

          {children}

          <div className="mt-8 text-center">
            {footer}
          </div>
        </div>
      </div>
    </main>
  );
};
