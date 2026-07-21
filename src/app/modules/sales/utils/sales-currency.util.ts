/** Base / functional currency for Rock Solutions Supply. */
export const BASE_CURRENCY_CODE = 'TZS';

export function isForeignCurrency(currencyCode?: string | null): boolean {
  return !!currencyCode && currencyCode.toUpperCase() !== BASE_CURRENCY_CODE;
}

/** Human-readable exchange rate line, e.g. "1 USD = 2,650.00 TZS". */
export function formatExchangeRateLabel(
  exchangeRate: number | string | null | undefined,
  currencyCode?: string | null,
): string {
  if (!isForeignCurrency(currencyCode)) {
    return '';
  }
  const rate = Number(exchangeRate ?? 0);
  if (!rate || Number.isNaN(rate)) {
    return '';
  }
  const formatted = rate.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
  return `1 ${currencyCode!.toUpperCase()} = ${formatted} ${BASE_CURRENCY_CODE}`;
}

export function resolveExchangeRateForCurrency(
  currencyId: number | null | undefined,
  currencies: Array<{ id: number; code: string; exchange_rate?: number }>,
): number {
  if (!currencyId) {
    return 1;
  }
  const currency = currencies.find((c) => c.id === currencyId);
  if (!currency || !isForeignCurrency(currency.code)) {
    return 1;
  }
  return Number(currency.exchange_rate ?? 1);
}
