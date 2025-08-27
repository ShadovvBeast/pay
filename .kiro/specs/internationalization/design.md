# Internationalization Design Document

## Overview

This design implements comprehensive internationalization (i18n) support for the SB0 Pay application using industry-standard libraries and best practices. The system will support Hebrew (default), English, Russian, and Arabic languages with proper RTL/LTR layout handling. Language selection is based on the user's `merchant_config.language` setting stored in the database.

## Architecture

### Frontend Architecture

The frontend will use `react-i18next` as the primary internationalization library, which is the most mature and widely-adopted i18n solution for React applications. The architecture follows these principles:

- **Translation Provider**: A context provider that wraps the entire application
- **Language Detection**: Custom hook that reads language from user's merchant config
- **Dynamic Loading**: Lazy loading of translation files to optimize bundle size
- **RTL Support**: CSS-in-JS solution using Tailwind CSS with RTL variants

### Backend Architecture

The backend requires minimal changes since user language is already available through the existing `/me` endpoint via `merchant_config.language`:

- **Static File Serving**: Translation JSON files served as static assets from the public directory
- **Existing API**: Use current `/me` endpoint to retrieve user language preferences
- **Language Updates**: Use existing user update endpoints to modify language preferences

## Components and Interfaces

### Frontend Components

#### 1. I18nProvider Component
```typescript
interface I18nProviderProps {
  children: React.ReactNode;
}

interface I18nContextValue {
  language: string;
  isRTL: boolean;
  changeLanguage: (lang: string) => Promise<void>;
  t: (key: string, options?: any) => string;
}
```

#### 2. useTranslation Hook
```typescript
interface UseTranslationReturn {
  t: (key: string, options?: any) => string;
  i18n: i18n;
  ready: boolean;
}
```

#### 3. LanguageDetector Service
```typescript
interface LanguageDetector {
  detect(): Promise<string>;
  cache(language: string): void;
}
```

### Backend Interfaces

#### 1. Translation File Structure
```typescript
interface TranslationFile {
  [key: string]: string | TranslationFile;
}
```

#### 2. User Data (Already Existing)
```typescript
// Already available from /me endpoint
interface User {
  merchantConfig: {
    language: string; // 'he' | 'en' | 'ru' | 'ar'
  }
}
```

## Data Models

### Translation File Organization

Translation files will be organized in a nested structure for maintainability:

```
frontend/public/locales/
├── he.json (Hebrew - Default)
├── en.json (English)
├── ru.json (Russian)
└── ar.json (Arabic)
```

### Translation Key Structure

```json
{
  "common": {
    "buttons": {
      "save": "שמור",
      "cancel": "ביטול",
      "submit": "שלח"
    },
    "messages": {
      "loading": "טוען...",
      "error": "שגיאה",
      "success": "הצלחה"
    }
  },
  "auth": {
    "login": {
      "title": "התחברות",
      "email": "אימייל",
      "password": "סיסמה"
    }
  },
  "dashboard": {
    "title": "לוח בקרה",
    "transactions": "עסקאות",
    "settings": "הגדרות"
  },
  "payment": {
    "amount": "סכום",
    "currency": "מטבע",
    "status": "סטטוס"
  }
}
```

### RTL Language Configuration

```typescript
const RTL_LANGUAGES = ['he', 'ar'];
const LTR_LANGUAGES = ['en', 'ru'];

interface LanguageConfig {
  code: string;
  name: string;
  direction: 'rtl' | 'ltr';
  locale: string;
}

const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  { code: 'he', name: 'עברית', direction: 'rtl', locale: 'he-IL' },
  { code: 'en', name: 'English', direction: 'ltr', locale: 'en-US' },
  { code: 'ru', name: 'Русский', direction: 'ltr', locale: 'ru-RU' },
  { code: 'ar', name: 'العربية', direction: 'rtl', locale: 'ar-SA' }
];
```

## Error Handling

### Translation Loading Errors

1. **Missing Translation Files**: Fallback to Hebrew (default language)
2. **Network Errors**: Use cached translations or show English fallback
3. **Invalid Language Codes**: Validate and default to Hebrew
4. **Missing Translation Keys**: Display the key name with a warning prefix

### Language Switching Errors

1. **API Failures**: Show error message and revert to previous language
2. **Invalid Language Selection**: Validate against supported languages list
3. **Database Update Failures**: Retry mechanism with exponential backoff

## Testing Strategy

### Unit Tests

1. **Translation Hook Tests**: Test `useTranslation` hook functionality
2. **Language Detection Tests**: Test language detection from merchant config
3. **RTL/LTR Layout Tests**: Test layout direction switching
4. **Translation Key Tests**: Test missing key handling and fallbacks

### Integration Tests

1. **Language Switching Flow**: Test complete language change workflow
2. **API Integration Tests**: Test backend language configuration endpoints
3. **Translation Loading Tests**: Test dynamic translation file loading
4. **RTL Layout Tests**: Test RTL layout rendering across components

### E2E Tests

1. **Multi-language User Journey**: Test complete user flows in different languages
2. **Registration Flow**: Ensure registration remains English-only
3. **Language Persistence**: Test language preference persistence across sessions
4. **Cross-browser RTL Testing**: Test RTL layouts across different browsers

## Implementation Details

### Frontend Implementation

#### 1. i18next Configuration
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';

i18n
  .use(Backend)
  .use(initReactI18next)
  .init({
    lng: 'he', // default language
    fallbackLng: 'he',
    debug: process.env.NODE_ENV === 'development',
    
    interpolation: {
      escapeValue: false,
    },
    
    backend: {
      loadPath: '/locales/{{lng}}.json',
    },
    
    react: {
      useSuspense: false,
    },
  });
```

#### 2. RTL Support with Tailwind CSS
```css
/* Add RTL variants to Tailwind config */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
  corePlugins: {
    // Enable RTL support
    direction: true,
  },
}
```

#### 3. Language Context Provider
```typescript
const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState('he');
  const [isRTL, setIsRTL] = useState(true);
  const { user } = useAuth(); // Get user from existing auth context
  
  useEffect(() => {
    if (user?.merchantConfig?.language) {
      const userLang = validateLanguage(user.merchantConfig.language);
      setLanguage(userLang);
      setIsRTL(RTL_LANGUAGES.includes(userLang));
      i18n.changeLanguage(userLang);
    }
  }, [user]);
  
  return (
    <I18nContext.Provider value={{ language, isRTL, changeLanguage }}>
      <div dir={isRTL ? 'rtl' : 'ltr'} className={isRTL ? 'rtl' : 'ltr'}>
        {children}
      </div>
    </I18nContext.Provider>
  );
};
```

### Backend Implementation

#### 1. Translation File Serving (Static Assets)
Translation files will be served as static assets from the `frontend/public/locales/` directory. No additional backend endpoints are needed since:

- User language is already available from the existing `/me` endpoint
- Language updates can use existing user profile update endpoints
- Translation files are served directly by the web server as static assets

#### 2. Language Validation (Frontend)
```typescript
const SUPPORTED_LANGUAGES = ['he', 'en', 'ru', 'ar'];

function validateLanguage(language: string): string {
  return SUPPORTED_LANGUAGES.includes(language) ? language : 'he';
}
```

## Performance Considerations

1. **Lazy Loading**: Translation files are loaded on-demand
2. **Caching**: Browser caching for translation files with proper cache headers
3. **Bundle Splitting**: i18n libraries are code-split to reduce initial bundle size
4. **Memory Management**: Unload unused translation files when switching languages

## Security Considerations

1. **Input Validation**: Validate language codes against whitelist
2. **XSS Prevention**: Escape user-provided content in translations
3. **CSRF Protection**: Use existing CSRF protection for language update endpoints
4. **Rate Limiting**: Implement rate limiting for language switching API calls