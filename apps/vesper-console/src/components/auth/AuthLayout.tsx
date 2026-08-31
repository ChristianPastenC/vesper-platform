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
