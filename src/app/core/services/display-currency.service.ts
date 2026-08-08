import { Injectable, inject } from '@angular/core';
import { catchError, of, tap } from 'rxjs';

import { CurrencyCode } from '../models/preferences.models';
import {
  convertAmount,
  formatAmountLabel,
  getDisplayCurrencyCode,
  setDisplayCurrencyCode,
  setExchangeRates,
} from '../utils/display-currency.store';
import { CurrencyService } from './currency.service';
import { PreferencesService } from './preferences.service';

/**
 * Keeps navbar display currency in sync with Finance-published exchange rates.
 * Inventory / master amounts are stored in TZS; UI converts for viewing only.
 */
@Injectable({ providedIn: 'root' })
export class DisplayCurrencyService {
  private readonly currencies = inject(CurrencyService);
  private readonly preferences = inject(PreferencesService);

  /** Load / refresh Finance rates into the display converter. */
  refreshRates(): void {
    this.currencies
      .getCurrencies()
      .pipe(
        tap((rows) => {
          const map: Record<string, number> = { TZS: 1 };
          for (const row of rows) {
            const code = (row.code || '').toUpperCase();
            const rate = Number(row.exchange_rate ?? 0);
            map[code] = code === 'TZS' || row.is_default ? 1 : rate;
          }
          setExchangeRates(map);
        }),
        catchError(() => of([])),
      )
      .subscribe();
  }

  syncFromPreferences(): void {
    setDisplayCurrencyCode(this.preferences.currency());
  }

  setDisplayCurrency(code: CurrencyCode): void {
    this.preferences.setCurrency(code);
    setDisplayCurrencyCode(code);
  }

  displayCode(): CurrencyCode {
    return getDisplayCurrencyCode();
  }

  /** Convert a base/source amount into the current display currency. */
  toDisplay(amount: number | string | null | undefined, amountCurrency = 'TZS'): number {
    const converted = convertAmount(Number(amount ?? 0), amountCurrency, this.displayCode());
    return converted ?? Number(amount ?? 0);
  }

  format(amount: number | string | null | undefined, amountCurrency = 'TZS'): string {
    const display = this.displayCode();
    const converted = convertAmount(Number(amount ?? 0), amountCurrency, display);
    if (converted == null) {
      return formatAmountLabel(Number(amount ?? 0), (amountCurrency || 'TZS').toUpperCase());
    }
    return formatAmountLabel(converted, display);
  }
}
