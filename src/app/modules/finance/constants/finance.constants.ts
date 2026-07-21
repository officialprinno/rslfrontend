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

export const ACCOUNT_CATEGORIES = [
  { value: 'ASSETS', label: 'Assets', normalBalance: 'DEBIT' },
  { value: 'LIABILITIES', label: 'Liabilities', normalBalance: 'CREDIT' },
  { value: 'EQUITY', label: 'Equity', normalBalance: 'CREDIT' },
  { value: 'REVENUE', label: 'Revenue', normalBalance: 'CREDIT' },
  { value: 'COST_OF_SALES', label: 'Cost of Sales', normalBalance: 'DEBIT' },
  { value: 'OPERATING_EXPENSES', label: 'Operating Expenses', normalBalance: 'DEBIT' },
  { value: 'FINANCE_COSTS', label: 'Finance Costs', normalBalance: 'DEBIT' },
  { value: 'CONTROL_ACCOUNTS', label: 'Control Accounts', normalBalance: 'DEBIT' },
] as const;

export const ADD_NEW_CATEGORY = '__NEW__';

export function categoryLabel(value: string): string {
  const known = ACCOUNT_CATEGORIES.find((c) => c.value === value);
  if (known) return known.label;
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function normalizeCategoryInput(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_]/g, '')
    .toUpperCase();
}

export const ADD_NEW_SUBCATEGORY = '__NEW_SUB__';

export const ACCOUNT_SUBCATEGORIES: Record<string, readonly { value: string; label: string }[]> = {
  ASSETS: [
    { value: 'CASH', label: 'Cash' },
    { value: 'BANK', label: 'Bank' },
    { value: 'CURRENT_ASSETS', label: 'Current Assets' },
    { value: 'INVENTORY', label: 'Inventory' },
    { value: 'FIXED_ASSETS', label: 'Fixed Assets' },
    { value: 'TAX', label: 'Tax' },
  ],
  LIABILITIES: [
    { value: 'CURRENT', label: 'Current Liabilities' },
    { value: 'LONG_TERM', label: 'Long Term Liabilities' },
  ],
  EQUITY: [{ value: 'EQUITY', label: 'Equity' }],
  REVENUE: [
    { value: 'SALES', label: 'Sales' },
    { value: 'OTHER_INCOME', label: 'Other Income' },
  ],
  COST_OF_SALES: [{ value: 'COS', label: 'Cost of Sales' }],
  OPERATING_EXPENSES: [
    { value: 'PERSONNEL', label: 'Personnel' },
    { value: 'ADMINISTRATION', label: 'Administration' },
    { value: 'TRANSPORT', label: 'Transport' },
    { value: 'PROFESSIONAL', label: 'Professional' },
    { value: 'FINANCE', label: 'Finance' },
  ],
  FINANCE_COSTS: [{ value: 'FINANCE', label: 'Finance' }],
  CONTROL_ACCOUNTS: [{ value: 'CONTROL', label: 'Control' }],
};

export function subcategoryLabel(value: string): string {
  for (const subs of Object.values(ACCOUNT_SUBCATEGORIES)) {
    const known = subs.find((s) => s.value === value);
    if (known) return known.label;
  }
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function normalizeSubcategoryInput(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_]/g, '')
    .toUpperCase();
}

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

export const BILL_PAYMENT_TERMS = [
  { value: 'DUE_ON_RECEIPT', label: 'Due on Receipt' },
  { value: 'NET_15', label: 'Net 15' },
  { value: 'NET_30', label: 'Net 30' },
  { value: 'NET_60', label: 'Net 60' },
] as const;

export const BILL_TAX_TREATMENTS = [
  { value: 'EXCLUSIVE', label: 'Tax Exclusive' },
  { value: 'INCLUSIVE', label: 'Tax Inclusive' },
] as const;

export const BILL_TAX_LEVELS = [
  { value: 'TRANSACTION', label: 'At Transaction Level' },
  { value: 'LINE', label: 'At Line Level' },
] as const;

export const BILL_PAYMENT_METHODS = [
  { value: 'BANK', label: 'Bank Transfer' },
  { value: 'CASH', label: 'Cash' },
  { value: 'MOBILE', label: 'Mobile Money' },
  { value: 'CHEQUE', label: 'Cheque' },
] as const;

export const RECURRING_BILL_FREQUENCIES = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUAL', label: 'Annual' },
] as const;

export const RECURRING_BILL_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'COMPLETED', label: 'Completed' },
] as const;
