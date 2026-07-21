export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type AccountCategory =
  | 'ASSETS'
  | 'LIABILITIES'
  | 'EQUITY'
  | 'REVENUE'
  | 'COST_OF_SALES'
  | 'OPERATING_EXPENSES'
  | 'FINANCE_COSTS'
  | 'CONTROL_ACCOUNTS'
  | 'Assets'
  | 'Liabilities'
  | 'Equity'
  | 'Revenue'
  | 'Cost of Sales'
  | 'Operating Expenses'
  | 'Finance Costs'
  | 'Control Accounts'
  | (string & {});
export type BalanceType = 'DEBIT' | 'CREDIT';
export type JournalReferenceType = 'INVOICE' | 'PAYMENT' | 'PAYROLL' | 'MANUAL';
export type JournalStatus = 'DRAFT' | 'POSTED' | 'REVERSED';
export type BudgetPeriod = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
export type BudgetStatus = 'UNDER' | 'NEAR_LIMIT' | 'EXCEEDED';
export type ReconciliationStatus = 'DRAFT' | 'COMPLETED';

export interface Account {
  id: number;
  account_code: string;
  code?: string;
  account_name: string;
  name?: string;
  account_type: AccountType;
  category?: AccountCategory | '';
  category_display?: string;
  subcategory?: string;
  normal_balance?: BalanceType | '';
  normal_balance_display?: string;
  parent: number | null;
  parent_id: number | null;
  parent_code?: string | null;
  parent_name: string | null;
  description: string;
  display_label?: string;
  is_parent_account?: boolean;
  is_system?: boolean;
  allow_manual_entry?: boolean;
  balance: string;
  balance_type: BalanceType;
  is_active: boolean;
  children?: Account[];
}

export interface AccountFormData {
  account_code?: string;
  code?: string;
  account_name: string;
  name?: string;
  account_type: AccountType;
  category?: AccountCategory | '';
  subcategory?: string;
  normal_balance?: BalanceType | '';
  parent: number | null;
  parent_account?: number | null;
  description: string;
  is_active: boolean;
}

export interface ChartOfAccountsImportResult {
  created: number;
  updated: number;
  skipped: number;
}

export interface ChartOfAccountsCategoryGroup {
  category: string;
  category_display: string;
  accounts: ChartOfAccount[];
}

export interface ChartOfAccount {
  id: number;
  code: string;
  name: string;
  category: AccountCategory;
  category_display?: string;
  subcategory?: string | null;
  subcategory_display?: string | null;
  normal_balance: BalanceType;
  normal_balance_display?: string;
  is_active: boolean;
  is_system: boolean;
  allow_manual_entry: boolean;
  description?: string | null;
  parent_account: number | null;
  display_label?: string;
  gl_account_id?: number | null;
  balance?: string;
  balance_type?: BalanceType;
  created_at?: string;
  updated_at?: string;
}

export interface ChartOfAccountFormData {
  code?: string;
  name: string;
  category: AccountCategory;
  subcategory?: string | null;
  normal_balance?: BalanceType;
  parent_account?: number | null;
  description?: string;
  is_active?: boolean;
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
  reference: string;
  bank_account?: number | null;
  proof_document?: File | null;
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
  code: string;
  rate: string;
  applicable_to: 'SALES' | 'PURCHASE' | 'PAYROLL' | string;
  description: string;
  liability_account: number | null;
  liability_account_code?: string | null;
  liability_account_name?: string | null;
  expense_account: number | null;
  expense_account_code?: string | null;
  expense_account_name?: string | null;
  receivable_account: number | null;
  receivable_account_code?: string | null;
  receivable_account_name?: string | null;
  show_in_summary: boolean;
  is_system: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TaxSummaryTab {
  id: string;
  kind: 'builtin' | 'custom' | 'settings';
  label: string;
  tax_setting_id: number | null;
  code?: string;
  rate?: string;
}

export interface TaxSettingSummaryEntry {
  date: string;
  journal_number: string;
  account_code: string;
  account_role: 'LIABILITY' | 'EXPENSE' | 'RECEIVABLE' | string;
  description: string;
  debit: string;
  credit: string;
}

export interface TaxSettingSummary {
  tax_setting_id: number;
  code: string;
  name: string;
  rate: string;
  applicable_to: string;
  month: number;
  year: number;
  liability_account_id: number | null;
  liability_account_code: string | null;
  liability_account_name: string | null;
  expense_account_id: number | null;
  expense_account_code: string | null;
  receivable_account_id: number | null;
  receivable_account_code: string | null;
  total_liability: string;
  total_expense: string;
  total_receivable: string;
  net_payable: string;
  entries: TaxSettingSummaryEntry[];
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

export interface FinanceProcurementAlert {
  id: number;
  audience: string;
  title: string;
  body: string;
  reference_type: string;
  reference_id: number | null;
  po_number?: string | null;
  po_id?: number | null;
  supplier_name?: string | null;
  committed_amount_tzs?: string | null;
  is_resolved: boolean;
  created_at: string;
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
  procurement_alerts_count?: number;
  procurement_alerts?: FinanceProcurementAlert[];
  pending_invoice_approvals_count?: number;
  pending_invoice_received_count?: number;
  pending_invoice_sent_count?: number;
  staff_payments_pending_hod?: number;
  staff_payments_pending_gm?: number;
  staff_payments_pending_finance?: number;
  staff_payments_pending_payment?: number;
  staff_payments_pending_liquidation?: number;
  staff_payments_liquidation_overdue?: number;
  monthly_chart: MonthlyFinance[];
  revenue_breakdown: RevenueBreakdown[];
  recent_transactions: JournalEntry[];
}

export type InventoryFinanceWorkflowStatus =
  | 'RECEIVED'
  | 'COSTING_IN_PROGRESS'
  | 'PRICING_IN_PROGRESS'
  | 'PENDING_FINANCE_APPROVAL'
  | 'READY_FOR_SALE';

export type InventoryFinanceApprovalStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type InventoryPricingMethod = 'FIXED' | 'MARKUP' | 'MARGIN';
export type InventoryCostMethod = 'FIFO' | 'WEIGHTED_AVERAGE' | 'STANDARD_COST';

export interface InventoryPriceVersion {
  id: number;
  workflow: number;
  item: number;
  version_number: number;
  approval_status: InventoryFinanceApprovalStatus;
  pricing_method: InventoryPricingMethod;
  selling_unit_price: string;
  wholesale_price: string;
  retail_price: string;
  dealer_price: string;
  customer_price: string;
  promotional_price: string;
  markup_percent: string;
  margin_percent: string;
  effective_date: string;
  expiration_date: string | null;
  prepared_by: number | null;
  prepared_by_name: string | null;
  approved_by: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryFinanceWorkflow {
  id: number;
  company: number | null;
  grn: number;
  grn_number: string;
  grn_item: number;
  item: number;
  item_code: string;
  item_name: string;
  unit_of_measure?: string;
  warehouse: number;
  warehouse_name: string;
  quantity_received: string;
  workflow_status: InventoryFinanceWorkflowStatus;
  approval_status: InventoryFinanceApprovalStatus;
  cost_method: InventoryCostMethod;
  purchase_cost: string;
  purchase_vat: string;
  freight: string;
  insurance: string;
  import_duty: string;
  clearing_charges: string;
  transportation: string;
  handling_charges: string;
  other_landed_costs: string;
  unit_cost: string;
  total_cost: string;
  po_id?: number | null;
  po_number?: string | null;
  po_apply_vat?: boolean;
  po_subtotal?: string | number;
  po_tax_amount?: string | number;
  po_total?: string | number;
  goods_value_ex_vat?: string | number;
  capitalize_purchase_vat_in_inventory?: boolean;
  vat_included_in_landed_cost?: boolean;
  landed_cost_ex_vat?: string | number;
  current_landed_cost?: string | number;
  received_at: string;
  costing_completed_at: string | null;
  pricing_completed_at: string | null;
  approved_by: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  approval_reason: string;
  price_versions: InventoryPriceVersion[];
  created_at: string;
  updated_at: string;
}

export interface InventoryCostingInput {
  cost_method: InventoryCostMethod;
  purchase_cost: number | string;
  purchase_vat?: number | string;
  freight?: number | string;
  insurance?: number | string;
  import_duty?: number | string;
  clearing_charges?: number | string;
  transportation?: number | string;
  handling_charges?: number | string;
  other_landed_costs?: number | string;
}

export interface FinanceInventoryCostingSettings {
  id: number;
  company: number;
  capitalize_purchase_vat_in_inventory: boolean;
  updated_at: string;
}

export interface InventoryPricingInput {
  pricing_method: InventoryPricingMethod;
  selling_unit_price: number | string;
  wholesale_price?: number | string;
  retail_price?: number | string;
  dealer_price?: number | string;
  customer_price?: number | string;
  promotional_price?: number | string;
  markup_percent?: number | string;
  margin_percent?: number | string;
  effective_date?: string;
  expiration_date?: string | null;
  notes?: string;
}

export interface InventoryFinanceDashboard {
  pending_received: number;
  costing_in_progress: number;
  pending_finance_approval: number;
  ready_for_sale: number;
  total_finance_hold: string;
  total_inventory_value: string;
}

export interface InventoryValuationSummary {
  company_id: number | null;
  total_quantity: string;
  total_finance_hold: string;
  total_available: string;
  total_inventory_value: string;
}

export interface WarehouseValuationSummary {
  warehouse_id: number;
  warehouse_name: string;
  total_quantity: string;
  total_available: string;
  total_finance_hold: string;
  total_inventory_value: string;
  average_cost: string;
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

export type BillStatus = 'DRAFT' | 'OPEN' | 'PARTIAL' | 'PAID' | 'VOID';
export type BillTaxTreatment = 'EXCLUSIVE' | 'INCLUSIVE';
export type BillTaxLevel = 'TRANSACTION' | 'LINE';
export type BillPaymentTerms = 'DUE_ON_RECEIPT' | 'NET_15' | 'NET_30' | 'NET_60';
export type BillPaymentMethod = 'BANK' | 'CASH' | 'MOBILE' | 'CHEQUE';

export interface FinanceVendor {
  id: number;
  name: string;
  display_name?: string;
  registration_number: string;
  tin_number: string;
  vat_number: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  currency: number;
  currency_code: string;
  payment_terms: string;
  is_active: boolean;
}

export interface FinanceVendorFormData {
  name: string;
  registration_number?: string;
  tin_number?: string;
  vat_number?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  currency: number;
  payment_terms: string;
}

export interface FinanceCustomer {
  id: number;
  name: string;
  display_name?: string;
  email: string;
  phone: string;
  tin_number: string;
  address: string;
  is_active: boolean;
}

export interface FinanceCustomerFormData {
  name: string;
  email?: string;
  phone?: string;
  tin_number?: string;
  address?: string;
}

export interface BillLineFormData {
  item?: number | null;
  description: string;
  account: number;
  quantity: number;
  rate: number;
  tax?: number | null;
  customer?: number | null;
  line_order?: number;
  attachmentFile?: File | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
}

export interface BillLine extends BillLineFormData {
  id: number;
  item_code?: string | null;
  item_name?: string | null;
  unit_of_measure?: string | null;
  account_code?: string;
  account_name?: string;
  tax_name?: string | null;
  tax_rate?: string | null;
  customer_name?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  amount: string;
}

export interface BillPayment {
  id: number;
  amount: string;
  payment_date: string;
  payment_method: BillPaymentMethod;
  reference: string;
  bank_account: number | null;
  bank_account_name?: string | null;
  notes: string;
  recorded_by_name?: string | null;
  created_at: string;
}

export interface Bill {
  id: number;
  bill_number: string;
  vendor_bill_number: string;
  vendor: number;
  vendor_name: string;
  order_number: string;
  bill_date: string;
  due_date: string | null;
  payment_terms: BillPaymentTerms;
  accounts_payable: number | null;
  accounts_payable_code?: string | null;
  accounts_payable_name?: string | null;
  subject: string;
  currency: number;
  currency_code: string;
  tax_treatment: BillTaxTreatment;
  tax_level: BillTaxLevel;
  transaction_tax: number | null;
  transaction_tax_name?: string | null;
  subtotal: string;
  discount_percent: string;
  discount_amount: string;
  adjustment: string;
  tax_amount: string;
  total_amount: string;
  amount_paid: string;
  balance_due: string;
  status: BillStatus;
  notes: string;
  payment_proof_url?: string | null;
  payment_proof_name?: string | null;
  lines: BillLine[];
  payments: BillPayment[];
  created_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillFormData {
  vendor_bill_number: string;
  vendor: number;
  order_number: string;
  bill_date: string;
  due_date: string;
  payment_terms: BillPaymentTerms;
  accounts_payable: number | null;
  subject: string;
  currency: number;
  tax_treatment: BillTaxTreatment;
  tax_level: BillTaxLevel;
  transaction_tax: number | null;
  discount_percent: number;
  discount_amount: number;
  adjustment: number;
  notes: string;
  lines: BillLineFormData[];
  save_as: 'draft' | 'open';
}

export interface RecordBillPaymentData {
  amount: number;
  payment_date: string;
  payment_method: BillPaymentMethod;
  reference?: string;
  bank_account?: number | null;
  notes?: string;
}

export type RecurringBillFrequency = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
export type RecurringBillStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED';

export interface RecurringBillLineFormData {
  item?: number | null;
  description: string;
  account: number;
  quantity: number;
  rate: number;
  tax?: number | null;
  customer?: number | null;
  line_order?: number;
}

export interface RecurringBillLine extends RecurringBillLineFormData {
  id: number;
  unit_of_measure?: string | null;
  account_code?: string;
  account_name?: string;
  customer_name?: string | null;
}

export interface RecurringBillGeneratedBill {
  id: number;
  bill_number: string;
  bill_date: string;
  due_date: string | null;
  vendor_name: string;
  currency_code: string;
  total_amount: string;
  status: BillStatus;
  recurring_run_date: string | null;
  created_at: string;
}

export interface RecurringBill {
  id: number;
  name: string;
  vendor: number;
  vendor_name: string;
  vendor_bill_number: string;
  order_number: string;
  payment_terms: BillPaymentTerms;
  accounts_payable: number | null;
  subject: string;
  currency: number;
  currency_code: string;
  tax_treatment: BillTaxTreatment;
  tax_level: BillTaxLevel;
  transaction_tax: number | null;
  discount_percent: string;
  discount_amount: string;
  adjustment: string;
  notes: string;
  frequency: RecurringBillFrequency;
  day_of_month: number | null;
  start_date: string;
  end_date: string | null;
  next_run_date: string;
  last_run_date: string | null;
  auto_open: boolean;
  status: RecurringBillStatus;
  bills_generated_count: number;
  payment_proof_url?: string | null;
  payment_proof_name?: string | null;
  lines: RecurringBillLine[];
  generated_bills: RecurringBillGeneratedBill[];
  created_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecurringBillFormData {
  name: string;
  vendor: number;
  vendor_bill_number: string;
  order_number: string;
  payment_terms: BillPaymentTerms;
  accounts_payable: number | null;
  subject: string;
  currency: number;
  tax_treatment: BillTaxTreatment;
  tax_level: BillTaxLevel;
  transaction_tax: number | null;
  discount_percent: number;
  discount_amount: number;
  adjustment: number;
  notes: string;
  frequency: RecurringBillFrequency;
  day_of_month: number | null;
  start_date: string;
  end_date: string | null;
  auto_open: boolean;
  status?: RecurringBillStatus;
  lines: RecurringBillLineFormData[];
}

export type FinanceDocumentApprovalStatus =
  | 'NOT_SUBMITTED'
  | 'PENDING_FINANCE_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'PENDING_ISSUE'
  | 'ISSUED'
  | 'SENT_TO_CUSTOMER';

export interface FinanceDocumentApprovalFields {
  approval_status?: FinanceDocumentApprovalStatus;
  approved_by?: number | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  submitted_by?: number | null;
  submitted_by_name?: string | null;
  submitted_at?: string | null;
  rejection_reason?: string;
  can_submit_for_finance_approval?: boolean;
  can_finance_approve?: boolean;
}

export interface FinanceApprovalQueueItem {
  id: number;
  invoice_number: string;
  doc_type: 'invoice_received' | 'invoice_sent';
  company_code: string | null;
  company_name: string | null;
  counterparty_name: string;
  invoice_date: string | null;
  total_amount: string;
  currency_code: string;
  approval_status: FinanceDocumentApprovalStatus;
  submitted_at: string | null;
  submitted_by_name: string | null;
  three_way_matched?: boolean;
  has_invoice_document?: boolean;
  purchase_order_number?: string;
  sales_order_number?: string | null;
  status?: string;
  lifecycle_stage?: 'pending_issue' | 'issued' | 'sent_to_customer';
  invoice_sent_at?: string | null;
  approved_at?: string | null;
  approved_by_name?: string | null;
}

export interface FinanceInvoiceAttachment {
  id: string;
  label: string;
  file_name: string;
  url: string;
  category: string;
}

export interface FinanceSupplierInvoicePayment {
  id: number;
  amount: string;
  payment_date: string;
  payment_method: string;
  reference: string;
  bank: string;
  recorded_by_name: string | null;
}

export interface FinanceInvoiceDetail<TInvoice = unknown> {
  doc_type: 'invoice_received' | 'invoice_sent';
  invoice: TInvoice;
  attachments: FinanceInvoiceAttachment[];
  payments?: FinanceSupplierInvoicePayment[];
  payment_proofs?: unknown[];
}

export interface FinanceApprovalQueue {
  invoice_received: Record<string, FinanceApprovalQueueItem[]>;
  invoice_sent: Record<string, FinanceApprovalQueueItem[]>;
  counts: {
    pending_received: number;
    pending_sent: number;
    pending_total: number;
    approved_received?: number;
    approved_sent?: number;
    approved_total?: number;
    sent_to_customer?: number;
  };
  status_filter?: 'pending' | 'approved' | 'sent';
  can_approve: boolean;
}
