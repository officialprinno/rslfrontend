export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type BalanceType = 'DEBIT' | 'CREDIT';
export type JournalReferenceType = 'INVOICE' | 'PAYMENT' | 'PAYROLL' | 'MANUAL';
export type JournalStatus = 'DRAFT' | 'POSTED' | 'REVERSED';
export type BudgetPeriod = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
export type BudgetStatus = 'UNDER' | 'NEAR_LIMIT' | 'EXCEEDED';
export type ReconciliationStatus = 'DRAFT' | 'COMPLETED';

export interface Account {
  id: number;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  parent: number | null;
  parent_id: number | null;
  parent_name: string | null;
  description: string;
  balance: string;
  balance_type: BalanceType;
  is_active: boolean;
  children?: Account[];
}

export interface AccountFormData {
  account_code?: string;
  account_name: string;
  account_type: AccountType;
  parent: number | null;
  description: string;
  is_active: boolean;
}

export interface LedgerEntry {
  date: string;
  je_number: string;
  description: string;
  debit: string;
  credit: string;
  balance: string;
}

export interface JELine {
  id?: number;
  account: number;
  account_id?: number;
  account_code?: string;
  account_name?: string;
  description: string;
  department: number | null;
  department_id?: number | null;
  department_name?: string | null;
  debit_amount: number | string;
  credit_amount: number | string;
}

export interface JournalEntry {
  id: number;
  je_number: string;
  date: string;
  reference_type: JournalReferenceType;
  reference_id: string;
  description: string;
  currency: number;
  currency_id: number;
  currency_code: string;
  exchange_rate: number | string;
  total_debit: string;
  total_credit: string;
  is_balanced?: boolean;
  status: JournalStatus;
  lines: JELine[];
  posted_by: number | null;
  posted_by_name: string | null;
  posted_at: string | null;
  created_by?: number;
  created_by_name?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface JournalEntryFormData {
  date: string;
  reference_type: JournalReferenceType;
  reference_id: string;
  description: string;
  currency: number;
  exchange_rate: number;
  lines: JELine[];
}

export interface ARAgingRow {
  customer_id: number;
  customer_name: string;
  total_invoiced: string;
  total_paid: string;
  current: string;
  days_1_30: string;
  days_31_60: string;
  days_61_90: string;
  days_90_plus: string;
  total_outstanding: string;
}

export interface ARSummary {
  summary: {
    total_outstanding: string;
    current: string;
    days_1_30: string;
    days_31_60: string;
    days_61_90: string;
    days_90_plus: string;
  };
  aging: ARAgingRow[];
}

export interface APAgingRow {
  supplier_id: number;
  supplier_name: string;
  total_invoiced: string;
  total_paid: string;
  current: string;
  days_1_30: string;
  days_31_60: string;
  days_61_90: string;
  days_90_plus: string;
  total_outstanding: string;
}

export interface APSummary {
  summary: {
    total_outstanding: string;
    current: string;
    days_1_30: string;
    days_31_60: string;
    days_61_90: string;
    days_90_plus: string;
  };
  aging: APAgingRow[];
}

export interface CustomerStatement {
  customer_id: number;
  customer_name: string;
  date_from: string | null;
  date_to: string | null;
  opening_balance: string;
  closing_balance: string;
  transactions: {
    date: string;
    reference: string;
    description: string;
    debit: string;
    credit: string;
    balance: string;
  }[];
}

export interface UpcomingPayment {
  invoice_id: number;
  invoice_number: string;
  supplier_id: number;
  supplier_name: string;
  due_date: string;
  amount: string;
  payment_method: string;
  three_way_matched: boolean;
}

export interface SupplierPaymentFormData {
  invoice: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference?: string;
  bank_account?: number | null;
}

export interface BankAccount {
  id: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  currency: number;
  currency_id: number;
  currency_code: string;
  opening_balance: string;
  current_balance: string;
  gl_account: number;
  gl_account_id: number;
  gl_account_name: string;
  last_reconciled: string | null;
  is_active: boolean;
}

export interface BankAccountFormData {
  bank_name: string;
  account_number: string;
  account_name: string;
  currency: number;
  gl_account: number;
  opening_balance: number;
  is_active: boolean;
}

export interface ReconciliationSummary {
  system_balance: string;
  bank_balance: string;
  difference: string;
  unmatched_system: number;
  unmatched_bank: number;
}

export interface BankStatementLine {
  id?: number;
  date: string;
  description: string;
  deposit: number | string;
  withdrawal: number | string;
  is_matched: boolean;
}

export interface Reconciliation {
  id: number;
  bank_account: number;
  bank_account_name: string;
  bank_account_number: string;
  period_month: number;
  period_year: number;
  period_label: string;
  opening_balance: string;
  closing_balance: string;
  status: ReconciliationStatus;
  statement_lines: BankStatementLine[];
  matches: { id?: number; journal_line: JELine; is_matched: boolean }[];
  summary: ReconciliationSummary;
  reconciled_by: number | null;
  reconciled_by_name: string | null;
  reconciled_at: string | null;
  notes: string;
}

export interface Budget {
  id: number;
  name: string;
  department: number;
  department_id: number;
  department_name: string;
  account: number;
  account_id: number;
  account_name: string;
  financial_year: number;
  period: BudgetPeriod;
  amount_budgeted: string;
  amount_actual: string;
  variance: string;
  variance_percent: string;
  status: BudgetStatus;
  notes: string;
  is_active: boolean;
}

export interface BudgetFormData {
  name: string;
  department: number;
  account: number;
  financial_year: number;
  period: BudgetPeriod;
  amount_budgeted: number;
  notes: string;
}

export interface BudgetSummaryRow {
  department_id: number;
  department_name: string;
  total_budgeted: string;
  total_actual: string;
  top_expenses: { account: string; amount: string }[];
}

export interface VATTransaction {
  date: string;
  type: 'INPUT' | 'OUTPUT';
  reference: string;
  net_amount: string;
  vat_amount: string;
  rate: string;
}

export interface VATSummary {
  month: number;
  year: number;
  output_vat: string;
  input_vat: string;
  net_vat_payable: string;
  is_locked: boolean;
  transactions: VATTransaction[];
}

export interface PAYEEntry {
  employee: string;
  gross: string;
  taxable_income: string;
  paye_amount: string;
  cumulative_ytd: string;
}

export interface PAYESummary {
  month: number;
  year: number;
  total_paye: string;
  entries: PAYEEntry[];
}

export interface NSSFSummary {
  month: number;
  year: number;
  total_employee: string;
  total_employer: string;
  total_nssf: string;
  entries: unknown[];
}

export interface TaxSetting {
  id: number;
  name: string;
  rate: string;
  applicable_to: string;
  description: string;
  is_active: boolean;
}

export interface MonthlyFinance {
  month: string;
  revenue: string;
  expenses: string;
}

export interface RevenueBreakdown {
  category: string;
  amount: string;
}

export interface FinanceDashboard {
  revenue_month: string;
  expenses_month: string;
  net_profit_month: string;
  accounts_receivable: string;
  accounts_payable: string;
  cash_and_bank: string;
  overdue_receivables_count: number;
  overdue_receivables_amount: string;
  overdue_payables_count: number;
  overdue_payables_amount: string;
  budgets_exceeded: number;
  unreconciled_transactions: number;
  monthly_chart: MonthlyFinance[];
  revenue_breakdown: RevenueBreakdown[];
  recent_transactions: JournalEntry[];
}

export interface ExpenseLine {
  code: string;
  name: string;
  amount: string;
}

export interface IncomeStatement {
  period_from: string;
  period_to: string;
  trading_revenue: string;
  manufacturing_revenue: string;
  total_revenue: string;
  opening_inventory: string;
  purchases: string;
  closing_inventory: string;
  total_cogs: string;
  gross_profit: string;
  gross_margin_percent: string;
  expenses: ExpenseLine[];
  total_expenses: string;
  net_profit: string;
  net_margin_percent: string;
}

export interface AssetLine {
  code: string;
  name: string;
  amount: string;
}

export interface BalanceSheet {
  as_of_date: string;
  current_assets: AssetLine[];
  total_current_assets: string;
  fixed_assets: AssetLine[];
  total_fixed_assets: string;
  total_assets: string;
  current_liabilities: AssetLine[];
  total_liabilities: string;
  equity: AssetLine[];
  total_equity: string;
  total_liabilities_equity: string;
  is_balanced: boolean;
}

export interface CashFlowStatement {
  period_from: string;
  period_to: string;
  operating_inflows: string;
  operating_outflows: string;
  net_cash_flow: string;
}
