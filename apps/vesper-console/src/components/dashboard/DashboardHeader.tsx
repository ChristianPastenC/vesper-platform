import React from 'react';
import { useTranslation } from 'react-i18next';
import '../../i18n/config';

export const DashboardHeader: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="mb-8">
      <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-2">
        {t('dashboard.title')}
      </h1>
      <p className="text-slate-400">
        {t('dashboard.subtitle')}
      </p>
    </div>
  );
};
