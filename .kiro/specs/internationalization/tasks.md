# Implementation Plan

- [x] 1. Set up i18n infrastructure and dependencies






  - Install react-i18next and i18next dependencies in frontend
  - Configure i18next with proper settings for Hebrew default, fallback language, and static file loading
  - Create basic translation file structure in frontend/public/locales/
  - _Requirements: 3.1, 3.2_

- [x] 2. Create translation files for all supported languages





  - Create he.json (Hebrew) translation file with comprehensive key structure
  - Create en.json (English) translation file with all keys translated
  - Create ru.json (Russian) translation file with all keys translated  
  - Create ar.json (Arabic) translation file with all keys translated
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.1, 6.2_

- [-] 3. Implement language detection and context provider




  - Create I18nProvider component that reads language from user's merchant_config
  - Implement useTranslation hook wrapper for easy component usage
  - Integrate with existing auth context to get user language preference
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 4. Configure RTL layout support with Tailwind CSS
  - Update Tailwind configuration to support RTL variants
  - Add RTL-specific CSS utilities and direction classes
  - Create responsive layout components that adapt to text direction
  - Test RTL layout rendering with Hebrew and Arabic content
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 5. Replace hardcoded strings in authentication components
  - Update login form with translation keys for labels and validation messages
  - Update registration form to remain English-only as specified
  - Replace error messages in auth components with translated versions
  - Add proper form validation message translations
  - _Requirements: 2.1, 2.3, 4.1, 4.2, 4.3_

- [ ] 6. Replace hardcoded strings in dashboard and main UI components
  - Update Dashboard component with translation keys for all text elements
  - Replace navigation menu items with translated versions
  - Update Settings component with translated labels and descriptions
  - Add translated button text throughout the application
  - _Requirements: 2.1, 2.2_

- [ ] 7. Replace hardcoded strings in payment and transaction components
  - Update payment forms with translated labels and placeholders
  - Replace transaction status messages with translated versions
  - Update TransactionHistory component with translated column headers and data
  - Add proper currency and date formatting based on user locale
  - _Requirements: 2.1, 2.5_

- [ ] 8. Implement error handling and fallback mechanisms
  - Add error handling for missing translation keys with fallback to Hebrew
  - Implement graceful degradation when translation files fail to load
  - Add development-mode warnings for missing translation keys
  - Create fallback mechanism for unsupported language codes
  - _Requirements: 3.4, 6.4_

- [ ] 9. Add pluralization and interpolation support
  - Implement proper plural forms for each supported language
  - Add variable interpolation support for dynamic content in translations
  - Test pluralization rules for Hebrew, English, Russian, and Arabic
  - Create helper functions for complex translation scenarios
  - _Requirements: 6.3, 6.4_

- [ ] 10. Create comprehensive test suite for i18n functionality
  - Write unit tests for I18nProvider component and language detection
  - Create tests for RTL/LTR layout switching functionality
  - Add integration tests for translation loading and fallback behavior
  - Write tests for pluralization and interpolation features
  - _Requirements: 1.1, 1.3, 1.4, 5.5_

- [ ] 11. Optimize performance and implement lazy loading
  - Implement lazy loading of translation files to reduce initial bundle size
  - Add proper caching headers for translation files
  - Optimize translation file loading with error retry mechanisms
  - Test performance impact of i18n implementation across different devices
  - _Requirements: 3.3_

- [ ] 12. Integration testing and final validation
  - Test complete language switching workflow from user settings
  - Validate that all UI components properly respond to language changes
  - Test RTL layout behavior across all major components
  - Verify registration form remains English-only while rest of app translates
  - _Requirements: 1.5, 4.1, 5.5_