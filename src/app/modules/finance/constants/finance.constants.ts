export const COMPANY_DETAILS = {
  name: 'Rock Solutions Limited',
  tin: '127-950-695',
  vat: '40022138R',
  address: 'Plot 252 Block L, Misungwi, Mwanza',
};

export const ACCOUNT_TYPES = [
  { value: 'ASSET', label: 'Asset', codeRange: '1000–1999', prefix: '1' },
  { value: 'LIABILITY', label: 'Liability', codeRange: '2000–2999', prefix: '2' },
  { value: 'EQUITY', label: 'Equity', codeRange: '3000–3999', prefix: '3' },
  { value: 'REVENUE', label: 'Revenue', codeRange: '4000–4999', prefix: '4' },
  { value: 'EXPENSE', label: 'Expense', codeRange: '5000–5999', prefix: '5' },
] as const;

export function accountTypeCodeRange(type: string): string {
  return ACCOUNT_TYPES.find((t) => t.value === type)?.codeRange ?? '';
}

export const JE_REFERENCE_TYPES = [
  { value: 'INVOICE', label: 'Invoice', color: 'blue' },
  { value: 'PAYMENT', label: 'Payment', color: 'green' },
  { value: 'PAYROLL', label: 'Payroll', color: 'purple' },
  { value: 'MANUAL', label: 'Manual', color: 'gray' },
] as const;

export const JE_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'gray',
  POSTED: 'green',
  REVERSED: 'red',
};

export const PAYMENT_METHODS = [
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'CASH', label: 'Cash' },
  { value: 'MOBILE', label: 'Mobile Money' },
];

export const BUDGET_PERIODS = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUAL', label: 'Annual' },
];

export const BUDGET_STATUS_COLORS: Record<string, string> = {
  UNDER: 'green',
  NEAR_LIMIT: 'orange',
  EXCEEDED: 'red',
};

export const VAT_RATE = 18;
export const NSSF_RATE = 10;

export function maskAccountNumber(num: string): string {
  if (num.length <= 4) return num;
  return `****${num.slice(-4)}`;
}

export function formatAccountingAmount(amount: string | number, code = 'TZS'): string {
  const value = Number(amount ?? 0);
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat('en-TZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(abs);
  const prefix = value < 0 ? `(${code} ${formatted})` : `${code} ${formatted}`;
  return prefix;
}

export function isNegativeAmount(amount: string | number): boolean {
  return Number(amount) < 0;
}
