import { useTranslation } from 'react-i18next';
import { useProfile } from '../../hooks/useProfile';

export const usePreferencesList = () => {
  const { themeMode, toggleThemeMode, language, toggleLanguage } = useProfile();
  const { t } = useTranslation();

  const getThemeLabel = (mode: string) => {
    if (mode === 'light') return t('shared_ui.themeLight', 'Light');
    if (mode === 'dark') return t('shared_ui.themeDark', 'Dark');
    return t('shared_ui.themeSystem', 'System');
  };

  const getLanguageLabel = (lang: string) => {
    return lang === 'en' ? 'English' : 'Español';
  };

  return {
    themeMode,
    toggleThemeMode,
    language,
    toggleLanguage,
    themeLabel: getThemeLabel(themeMode),
    languageLabel: getLanguageLabel(language),
    t,
  };
};
