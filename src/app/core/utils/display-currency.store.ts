import { signal } from '@angular/core';

import { CurrencyCode } from '../models/preferences.models';

/** Finance rate meaning: 1 unit of foreign currency = rate TZS. */
export type ExchangeRateMap = Record<string, number>;

const BASE_CURRENCY: CurrencyCode = 'TZS';

const displayCodeSignal = signal<CurrencyCode>(
  (typeof localStorage !== 'undefined'
    ? (localStorage.getItem('rsl_currency') as CurrencyCode)
    : null) || BASE_CURRENCY,
);

const ratesSignal = signal<ExchangeRateMap>({
  TZS: 1,
  USD: 0,
  EUR: 0,
});

/** Bumped whenever display currency or rates change — read inside formatCurrency for OnPush. */
export const displayCurrencyRevision = signal(0);

export function getDisplayCurrencyCode(): CurrencyCode {
  return displayCodeSignal();
}

export function getExchangeRates(): ExchangeRateMap {
  return ratesSignal();
}

export function setDisplayCurrencyCode(code: CurrencyCode): void {
  displayCodeSignal.set(code);
  displayCurrencyRevision.update((n) => n + 1);
}

export function setExchangeRates(rates: ExchangeRateMap): void {
  const tzs = Number(rates['TZS'] ?? 1) || 1;
  ratesSignal.set({
    ...rates,
    TZS: tzs,
  });
  displayCurrencyRevision.update((n) => n + 1);
}

export function rateToTzs(code: string): number {
  const normalized = (code || BASE_CURRENCY).toUpperCase();
  if (normalized === BASE_CURRENCY) return 1;
  const rate = Number(ratesSignal()[normalized] ?? 0);
  return rate > 0 ? rate : 0;
}

/**
 * Convert amount from one currency to another via TZS base.
 * Returns null when a required Finance rate is missing.
 */
export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
): number | null {
  const from = (fromCurrency || BASE_CURRENCY).toUpperCase();
  const to = (toCurrency || BASE_CURRENCY).toUpperCase();
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value)) return 0;
  if (from === to) return value;

  const fromRate = rateToTzs(from);
  const toRate = rateToTzs(to);
  if (from !== BASE_CURRENCY && fromRate <= 0) return null;
  if (to !== BASE_CURRENCY && toRate <= 0) return null;

  const inTzs = from === BASE_CURRENCY ? value : value * fromRate;
  if (to === BASE_CURRENCY) return inTzs;
  return inTzs / toRate;
}

export function formatAmountLabel(amount: number, code: string): string {
  const formatted = new Intl.NumberFormat('en-TZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${code} ${formatted}`;
}
