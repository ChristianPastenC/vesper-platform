import React from 'react';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from './AuthLayout';
import { RegisterForm } from './RegisterForm';
import '../../i18n/config';

export const RegisterPage: React.FC = () => {
  const { t } = useTranslation();

  const icon = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
      <path fillRule="evenodd" d="M3 2.25a.75.75 0 000 1.5v16.5h-.75a.75.75 0 000 1.5H21a.75.75 0 000-1.5h-.75V3.75a.75.75 0 000-1.5H3ZM5.25 3.75h12v16.5h-12V3.75ZM8.25 7.5a.75.75 0 000 1.5h6a.75.75 0 000-1.5h-6Zm0 3.75a.75.75 0 000 1.5h6a.75.75 0 000-1.5h-6Zm0 3.75a.75.75 0 000 1.5h6a.75.75 0 000-1.5h-6Z" clipRule="evenodd" />
    </svg>
  );

  const footer = (
    <p className="text-slate-400 text-sm">
      {t('auth.register.has_account')} {' '}
      <a href="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
        {t('auth.register.login_link')}
      </a>
    </p>
  );

  return (
    <AuthLayout
      titleKey="auth.register.title"
      subtitleKey="auth.register.subtitle"
      icon={icon}
      footer={footer}
    >
      <RegisterForm />
    </AuthLayout>
  );
};
