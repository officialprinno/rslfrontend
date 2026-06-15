import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable, catchError, map, of } from 'rxjs';

import { environment } from '../../environments/environments';
import { ApiResponse } from '../models/auth.models';
import { AppLanguage, AppTheme, CurrencyCode } from '../models/preferences.models';
import { ThemeService } from './theme.service';

const CURRENCY_KEY = 'rsl_currency';
const LANGUAGE_KEY = 'rsl_language';

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly http = inject(HttpClient);
  private readonly translate = inject(TranslateService);
  private readonly themeService = inject(ThemeService);

  private readonly preferencesUrl = `${environment.apiUrl}/auth/users/me/preferences/`;

  private readonly currencySignal = signal<CurrencyCode>(
    (localStorage.getItem(CURRENCY_KEY) as CurrencyCode) || 'TZS',
  );
  private readonly languageSignal = signal<AppLanguage>(
    (localStorage.getItem(LANGUAGE_KEY) as AppLanguage) === 'sw' ? 'sw' : 'en',
  );
  private readonly themeSignal = signal<AppTheme>(this.themeService.readStored());

  readonly currency = this.currencySignal.asReadonly();
  readonly language = this.languageSignal.asReadonly();
  readonly theme = this.themeSignal.asReadonly();

  readonly currencies: CurrencyCode[] = ['TZS', 'USD', 'EUR'];

  /** Load translations before the app renders. */
  bootstrap() {
    const lang = this.languageSignal();
    const theme = this.themeSignal();
    this.themeService.apply(theme);
    this.translate.setFallbackLang('en');
    document.documentElement.lang = lang;
    return this.translate.use(lang);
  }

  setCurrency(code: CurrencyCode): void {
    this.currencySignal.set(code);
    localStorage.setItem(CURRENCY_KEY, code);
  }

  setLanguage(lang: AppLanguage, persistRemote = true): void {
    this.languageSignal.set(lang);
    localStorage.setItem(LANGUAGE_KEY, lang);
    this.translate.use(lang);
    document.documentElement.lang = lang;
    if (persistRemote) {
      this.saveRemote({ language: lang }).subscribe();
    }
  }

  setTheme(theme: AppTheme, persistRemote = true): void {
    this.themeSignal.set(theme);
    this.themeService.apply(theme);
    if (persistRemote) {
      this.saveRemote({ theme }).subscribe();
    }
  }

  applyFromProfile(language?: string | null, theme?: string | null): void {
    if (language === 'en' || language === 'sw') {
      this.setLanguage(language, false);
    }
    if (theme === 'dark' || theme === 'light') {
      this.setTheme(theme, false);
    }
  }

  languageLabel(lang: AppLanguage): string {
    return lang === 'en' ? 'English' : 'Kiswahili';
  }

  languageFlag(lang: AppLanguage): string {
    return lang === 'en' ? '🇺🇸' : '🇹🇿';
  }

  private saveRemote(payload: Partial<{ language: AppLanguage; theme: AppTheme }>): Observable<void> {
    return this.http.patch<ApiResponse<unknown>>(this.preferencesUrl, payload).pipe(
      map(() => undefined),
      catchError(() => of(undefined)),
    );
  }
}
