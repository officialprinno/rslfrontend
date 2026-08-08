import {
  convertAmount,
  displayCurrencyRevision,
  formatAmountLabel,
  getDisplayCurrencyCode,
} from './display-currency.store';

export interface FormatCurrencyOptions {
  /**
   * When true, skip display-currency conversion and show the amount in
   * ``amountCurrency`` as-is (use for locked document-native figures when needed).
   */
  native?: boolean;
}

/**
 * Format a money amount for UI.
 *
 * ``amountCurrency`` is the currency the amount is denominated in (default TZS —
 * company base / inventory price book). Amounts are converted to the navbar
 * display currency using Finance exchange rates (1 foreign = X TZS).
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  amountCurrency: string = 'TZS',
  options?: FormatCurrencyOptions,
): string {
  // Track display currency / rate changes inside templates (OnPush-safe).
  displayCurrencyRevision();

  const value = Number(amount ?? 0);
  const source = (amountCurrency || 'TZS').toUpperCase();

  if (options?.native) {
    return formatAmountLabel(Number.isFinite(value) ? value : 0, source);
  }

  const display = getDisplayCurrencyCode();
  const converted = convertAmount(Number.isFinite(value) ? value : 0, source, display);
  if (converted == null) {
    // Rate missing — show original with source code so Finance can publish rates.
    return formatAmountLabel(Number.isFinite(value) ? value : 0, source);
  }
  return formatAmountLabel(converted, display);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${formatDate(value)} ${hours}:${minutes}`;
}

export function formatNumber(value: number | string | null | undefined, decimals = 2): string {
  const num = Number(value ?? 0);
  return new Intl.NumberFormat('en-TZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(num);
}
