import React from 'react';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from './AuthLayout';
import { LoginForm } from './LoginForm';
import '../../i18n/config';

export const LoginPage: React.FC = () => {
  const { t } = useTranslation();

  const icon = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
      <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
    </svg>
  );

  const footer = (
    <p className="text-slate-400 text-sm">
      {t('auth.login.no_account')} {' '}
      <a href="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
        {t('auth.login.register_link')}
      </a>
    </p>
  );

  return (
    <AuthLayout
      titleKey="auth.login.title"
      subtitleKey="auth.login.subtitle"
      icon={icon}
      footer={footer}
    >
      <LoginForm />
    </AuthLayout>
  );
};
