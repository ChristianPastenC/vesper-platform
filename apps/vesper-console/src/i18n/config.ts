import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import es from './locales/es.json';

// Define resources
const resources = {
  en: { translation: en },
  es: { translation: es }
};

// Initialize only once
if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: 'es', // Default to Spanish for now
      interpolation: {
        escapeValue: false // React already escapes by default
      }
    });
}

export default i18n;

if (typeof window !== 'undefined') {
  (window as any).i18n = i18n;
}
