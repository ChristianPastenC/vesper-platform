import React from 'react';
import { useTranslation } from 'react-i18next';
import '../../i18n/config';

export const SecurityPosture: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div
      className="bg-slate-900/40 backdrop-blur-xl ring-1 ring-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden group hover:ring-white/20 transition-all duration-300"
    >
      <div
        className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity"
      >
      </div>
      <div className="relative z-10">
        <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5 text-purple-400"
          ><path
            fillRule="evenodd"
            d="M11.828 2.25c-.916 0-1.699.663-1.85 1.567l-.091.549a3.375 3.375 0 0 1-2.42 2.42l-.548.091c-.904.15-1.568.934-1.568 1.85v.802c0 .946.15 1.875.44 2.76.28.852.706 1.638 1.253 2.316.58.718 1.272 1.332 2.053 1.808a10.638 10.638 0 0 0 2.731 1.2c.441.135.917.135 1.358 0a10.638 10.638 0 0 0 2.73-1.2c.782-.476 1.474-1.09 2.054-1.808.547-.678.973-1.464 1.253-2.316a8.91 8.91 0 0 0 .44-2.76v-.802c0-.916-.664-1.7-1.568-1.85l-.548-.092a3.375 3.375 0 0 1-2.42-2.42l-.091-.548c-.151-.904-.934-1.568-1.85-1.568h-.802Z"
            clipRule="evenodd"></path></svg
          >
          {t('dashboard.security.title')}
        </h2>

        <div className="space-y-3">
          <div
            className="bg-black/20 border border-white/5 p-3 rounded-xl flex items-start gap-3 hover:bg-white/5 transition-colors"
          >
            <div className="mt-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]">
              </div>
            </div>
            <div>
              <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-widest mb-1">
                {t('dashboard.security.zero_disk')}
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {t('dashboard.security.zero_disk_desc')}
              </p>
            </div>
          </div>

          <div
            className="bg-black/20 border border-white/5 p-3 rounded-xl flex items-start gap-3 hover:bg-white/5 transition-colors"
          >
            <div className="mt-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]">
              </div>
            </div>
            <div>
              <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-widest mb-1">
                {t('dashboard.security.zeroize')}
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {t('dashboard.security.zeroize_desc').split('SecureZeroMemory')[0]}
                <code className="text-emerald-400/80">SecureZeroMemory</code>
                {t('dashboard.security.zeroize_desc').split('SecureZeroMemory')[1]}
              </p>
            </div>
          </div>

          <div
            className="bg-black/20 border border-white/5 p-3 rounded-xl flex items-start gap-3 hover:bg-white/5 transition-colors"
          >
            <div className="mt-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]">
              </div>
            </div>
            <div>
              <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-widest mb-1">
                {t('dashboard.security.dpop')}
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {t('dashboard.security.dpop_desc')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
