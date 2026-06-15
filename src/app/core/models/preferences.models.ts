export type CurrencyCode = 'TZS' | 'USD' | 'EUR';
export type AppLanguage = 'en' | 'sw';
export type AppTheme = 'dark' | 'light';

export interface UserPreferences {
  language: AppLanguage;
  theme: AppTheme;
}
