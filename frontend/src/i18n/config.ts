import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';

// Supported languages configuration
export const SUPPORTED_LANGUAGES = ['he', 'en', 'ru', 'ar'] as const;
export const RTL_LANGUAGES = ['he', 'ar'] as const;
export const DEFAULT_LANGUAGE = 'he';

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  direction: 'rtl' | 'ltr';
  locale: string;
}

export const LANGUAGE_CONFIGS: LanguageConfig[] = [
  { code: 'he', name: 'עברית', direction: 'rtl', locale: 'he-IL' },
  { code: 'en', name: 'English', direction: 'ltr', locale: 'en-US' },
  { code: 'ru', name: 'Русский', direction: 'ltr', locale: 'ru-RU' },
  { code: 'ar', name: 'العربية', direction: 'rtl', locale: 'ar-SA' }
];

// Validate language code against supported languages
export function validateLanguage(language: string): SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(language as SupportedLanguage) 
    ? (language as SupportedLanguage) 
    : DEFAULT_LANGUAGE;
}

// Check if language is RTL
export function isRTLLanguage(language: string): boolean {
  return RTL_LANGUAGES.includes(language as typeof RTL_LANGUAGES[number]);
}

// Initialize i18next
i18n
  .use(Backend)
  .use(initReactI18next)
  .init({
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    debug: process.env.NODE_ENV === 'development',
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    backend: {
      loadPath: '/locales/{{lng}}.json',
    },
    
    react: {
      useSuspense: false, // Disable suspense for better error handling
    },
    
    // Load translations immediately
    initImmediate: false,
  });

export default i18n;