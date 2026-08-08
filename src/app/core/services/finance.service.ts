import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { dashboardHttpParams } from '../../shared/dashboard';
import { DashboardCacheService } from '../../shared/dashboard/services/dashboard-cache.service';
import { DateRangeValue } from '../../shared/dashboard/models/dashboard.types';

import { environment } from '../../environments/environments';
import { ApiResponse } from '../models/auth.models';
import {
  Account,
  AccountFormData,
  ChartOfAccount,
  ChartOfAccountFormData,
  ChartOfAccountsCategoryGroup,
  ChartOfAccountsImportResult,
  APSummary,
  ARSummary,
  BalanceSheet,
  BankAccount,
  BankAccountFormData,
  Bill,
  BillFormData,
  BillLine,
  Budget,
  BudgetFormData,
  BudgetSummaryRow,
  CashFlowStatement,
  CustomerStatement,
  FinanceCustomer,
  FinanceCustomerFormData,
  FinanceDashboard,
  InventoryCostingInput,
  InventoryFinanceDashboard,
  FinanceInventoryCostingSettings,
  InventoryFinanceWorkflow,
  InventoryPricingInput,
  InventoryPriceVersion,
  InventoryValuationSummary,
  OpeningBalancePricingImportResult,
  OpeningBalancePricingImportRowError,
  FinanceVendor,
  FinanceVendorFormData,
  IncomeStatement,
  JournalEntry,
  JournalEntryFormData,
  LedgerEntry,
  NSSFSummary,
  PAYESummary,
  RecordBillPaymentData,
  RecurringBill,
  RecurringBillFormData,
  Reconciliation,
  SupplierPaymentFormData,
  TaxSetting,
  TaxSettingSummary,
  TaxSummaryTab,
  UpcomingPayment,
  VATSummary,
  WarehouseValuationSummary,
  FinanceApprovalQueue,
  FinanceInvoiceDetail,
} from '../models/finance.model';
import { Invoice } from '../models/sales.model';
import { SupplierInvoice } from '../models/procurement.model';
import { ListParams, PaginatedData } from '../models/paginated.model';
import { buildHttpParams, unwrapApi, unwrapApiWithMessage, unwrapApiWithMeta } from '../utils/api.util';
import { fetchCachedDashboard } from '../utils/dashboard-fetch.util';

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private readonly http = inject(HttpClient);
  private readonly dashCache = inject(DashboardCacheService);
  private readonly baseUrl = `${environment.apiUrl}/finance`;

  getDashboard(range?: DateRangeValue | null, bypassCache = false): Observable<FinanceDashboard> {
    const url = `${this.baseUrl}/dashboard/`;
    const params = dashboardHttpParams(range);
    return fetchCachedDashboard<FinanceDashboard>(
      this.http,
      this.dashCache,
      url,
      params,
      bypassCache,
    );
  }

  getInventoryFinanceDashboard(): Observable<InventoryFinanceDashboard> {
    return this.http
      .get<ApiResponse<InventoryFinanceDashboard>>(`${this.baseUrl}/inventory-dashboard/`)
      .pipe(unwrapApi());
  }

  getInventoryWorkflows(params: ListParams = {}): Observable<PaginatedData<InventoryFinanceWorkflow>> {
    return this.http
      .get<ApiResponse<PaginatedData<InventoryFinanceWorkflow>>>(
        `${this.baseUrl}/inventory-workflows/`,
        { params: buildHttpParams({ page_size: 50, ordering: '-received_at', ...params }) },
      )
      .pipe(unwrapApi());
  }

  downloadOpeningBalancePricingTemplate(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/inventory-workflows/opening-balance-pricing-template/`, {
      responseType: 'blob',
    });
  }

  importOpeningBalancePricing(
    file: File,
    autoApprove = false,
  ): Observable<{
    data: OpeningBalancePricingImportResult;
    message: string;
    warning?: string | null;
    warnings?: unknown[] | null;
  }> {
    const form = new FormData();
    form.append('file', file);
    form.append('auto_approve', autoApprove ? 'true' : 'false');
    return this.http
      .post<ApiResponse<OpeningBalancePricingImportResult>>(
        `${this.baseUrl}/inventory-workflows/import-opening-balance-pricing/`,
        form,
      )
      .pipe(unwrapApiWithMeta());
  }

  downloadOpeningBalancePricingFailures(failedRows: OpeningBalancePricingImportRowError[]): Observable<Blob> {
    return this.http.post(
      `${this.baseUrl}/inventory-workflows/opening-balance-pricing-failures/`,
      { failed_rows: failedRows },
      { responseType: 'blob' },
    );
  }

  getInventoryWorkflow(id: number): Observable<InventoryFinanceWorkflow> {
    return this.http
      .get<ApiResponse<InventoryFinanceWorkflow>>(`${this.baseUrl}/inventory-workflows/${id}/`)
      .pipe(unwrapApi());
  }

  submitInventoryCosting(id: number, data: InventoryCostingInput): Observable<InventoryFinanceWorkflow> {
    return this.http
      .post<ApiResponse<InventoryFinanceWorkflow>>(
        `${this.baseUrl}/inventory-workflows/${id}/costing/`,
        data,
      )
      .pipe(unwrapApi());
  }

  prepareInventoryPricing(id: number, data: InventoryPricingInput): Observable<InventoryPriceVersion> {
    return this.http
      .post<ApiResponse<InventoryPriceVersion>>(
        `${this.baseUrl}/inventory-workflows/${id}/pricing/`,
        data,
      )
      .pipe(unwrapApi());
  }

  approveInventoryWorkflow(id: number, reason = ''): Observable<InventoryFinanceWorkflow> {
    return this.http
      .post<ApiResponse<InventoryFinanceWorkflow>>(
        `${this.baseUrl}/inventory-workflows/${id}/approve/`,
        { reason },
      )
      .pipe(unwrapApi());
  }

  getCurrentApprovedPrice(id: number): Observable<InventoryPriceVersion | null> {
    return this.http
      .get<ApiResponse<InventoryPriceVersion | null>>(
        `${this.baseUrl}/inventory-workflows/${id}/current-approved-price/`,
      )
      .pipe(unwrapApi());
  }

  getInventoryPriceHistory(id: number): Observable<InventoryPriceVersion[]> {
    return this.http
      .get<ApiResponse<InventoryPriceVersion[]>>(
        `${this.baseUrl}/inventory-workflows/${id}/price-history/`,
      )
      .pipe(unwrapApi());
  }

  getInventoryCostingSettings(): Observable<FinanceInventoryCostingSettings> {
    return this.http
      .get<ApiResponse<FinanceInventoryCostingSettings>>(`${this.baseUrl}/inventory-costing-settings/`)
      .pipe(unwrapApi());
  }

  updateInventoryCostingSettings(
    capitalizePurchaseVatInInventory: boolean,
  ): Observable<FinanceInventoryCostingSettings> {
    return this.http
      .patch<ApiResponse<FinanceInventoryCostingSettings>>(
        `${this.baseUrl}/inventory-costing-settings/current/`,
        { capitalize_purchase_vat_in_inventory: capitalizePurchaseVatInInventory },
      )
      .pipe(unwrapApi());
  }

  getInventoryValuationSummary(): Observable<InventoryValuationSummary> {
    return this.http
      .get<ApiResponse<InventoryValuationSummary>>(`${this.baseUrl}/inventory-valuations/`)
      .pipe(unwrapApi());
  }

  getWarehouseValuations(): Observable<WarehouseValuationSummary[]> {
    return this.http
      .get<ApiResponse<WarehouseValuationSummary[]>>(`${this.baseUrl}/warehouse-valuations/`)
      .pipe(unwrapApi());
  }

  getChartOfAccounts(params: ListParams = {}): Observable<PaginatedData<ChartOfAccount>> {
    return this.http
      .get<ApiResponse<PaginatedData<ChartOfAccount>>>(`${this.baseUrl}/chart-of-accounts/`, {
        params: buildHttpParams({ page_size: 100, ...params }),
      })
      .pipe(unwrapApi());
  }

  getChartOfAccount(id: number): Observable<ChartOfAccount> {
    return this.http
      .get<ApiResponse<ChartOfAccount>>(`${this.baseUrl}/chart-of-accounts/${id}/`)
      .pipe(unwrapApi());
  }

  createChartOfAccount(data: ChartOfAccountFormData): Observable<ChartOfAccount> {
    return this.http
      .post<ApiResponse<ChartOfAccount>>(`${this.baseUrl}/chart-of-accounts/`, data)
      .pipe(unwrapApi());
  }

  updateChartOfAccount(
    id: number,
    data: Partial<ChartOfAccountFormData>,
  ): Observable<ChartOfAccount> {
    return this.http
      .patch<ApiResponse<ChartOfAccount>>(`${this.baseUrl}/chart-of-accounts/${id}/`, data)
      .pipe(unwrapApi());
  }

  getChartOfAccountLedger(chartId: number, params: ListParams = {}): Observable<LedgerEntry[]> {
    return this.http
      .get<ApiResponse<LedgerEntry[]>>(`${this.baseUrl}/chart-of-accounts/${chartId}/ledger/`, {
        params: buildHttpParams(params),
      })
      .pipe(unwrapApi());
  }

  getNextChartAccountCode(params: {
    category: string;
    subcategory?: string | null;
    parent_account?: number | null;
  }): Observable<{ code: string; category: string; subcategory?: string | null }> {
    const query: Record<string, string> = { category: params.category };
    if (params.subcategory) query['subcategory'] = params.subcategory;
    if (params.parent_account != null) query['parent_account'] = String(params.parent_account);
    return this.http
      .get<ApiResponse<{ code: string; category: string; subcategory?: string | null }>>(
        `${this.baseUrl}/chart-of-accounts/next-code/`,
        { params: buildHttpParams(query) },
      )
      .pipe(unwrapApi());
  }

  getAccounts(params: ListParams = {}): Observable<Account[] | PaginatedData<Account>> {
    return this.http
      .get<ApiResponse<Account[] | PaginatedData<Account>>>(`${this.baseUrl}/accounts/`, {
        params: buildHttpParams({ page_size: 500, ...params }),
      })
      .pipe(unwrapApi());
  }

  getAccount(id: number): Observable<Account> {
    return this.http
      .get<ApiResponse<Account>>(`${this.baseUrl}/accounts/${id}/`)
      .pipe(unwrapApi());
  }

  getNextAccountCode(
    accountType: string,
    parentId?: number | null,
  ): Observable<{ account_code: string; account_type: string }> {
    return this.http
      .get<ApiResponse<{ account_code: string; account_type: string }>>(
        `${this.baseUrl}/accounts/next-code/`,
        {
          params: buildHttpParams({
            account_type: accountType,
            ...(parentId ? { parent: parentId } : {}),
          }),
        },
      )
      .pipe(unwrapApi());
  }

  createAccount(data: AccountFormData): Observable<Account> {
    return this.http
      .post<ApiResponse<Account>>(`${this.baseUrl}/accounts/`, data)
      .pipe(unwrapApi());
  }

  updateAccount(id: number, data: Partial<AccountFormData>): Observable<Account> {
    return this.http
      .patch<ApiResponse<Account>>(`${this.baseUrl}/accounts/${id}/`, data)
      .pipe(unwrapApi());
  }

  getAccountLedger(id: number, params: ListParams = {}): Observable<LedgerEntry[]> {
    return this.http
      .get<ApiResponse<LedgerEntry[]>>(`${this.baseUrl}/accounts/${id}/ledger/`, {
        params: buildHttpParams(params),
      })
      .pipe(unwrapApi());
  }

  importChartOfAccounts(): Observable<ChartOfAccountsImportResult> {
    return this.http
      .post<ApiResponse<ChartOfAccountsImportResult>>(
        `${this.baseUrl}/chart-of-accounts/import/`,
        {},
      )
      .pipe(unwrapApi());
  }

  exportChartOfAccounts(params: ListParams = {}): Observable<unknown[]> {
    return this.http
      .get<ApiResponse<unknown[]>>(`${this.baseUrl}/chart-of-accounts/export/`, {
        params: buildHttpParams(params),
      })
      .pipe(unwrapApi());
  }

  searchChartOfAccounts(query: string, params: ListParams = {}): Observable<ChartOfAccount[]> {
    return this.http
      .get<ApiResponse<ChartOfAccount[] | PaginatedData<ChartOfAccount>>>(
        `${this.baseUrl}/chart-of-accounts/search/`,
        { params: buildHttpParams({ q: query, ...params }) },
      )
      .pipe(
        unwrapApi(),
        map((data) => (Array.isArray(data) ? data : data.results)),
      );
  }

  getChartOfAccountsByCategory(params: ListParams = {}): Observable<ChartOfAccountsCategoryGroup[]> {
    return this.http
      .get<ApiResponse<ChartOfAccountsCategoryGroup[]>>(
        `${this.baseUrl}/chart-of-accounts/by-category/`,
        { params: buildHttpParams(params) },
      )
      .pipe(unwrapApi());
  }

  getJournalEntries(params: ListParams = {}): Observable<PaginatedData<JournalEntry>> {
    return this.http
      .get<ApiResponse<PaginatedData<JournalEntry>>>(`${this.baseUrl}/journal-entries/`, {
        params: buildHttpParams({ page_size: 20, ...params }),
      })
      .pipe(unwrapApi());
  }

  getJournalEntry(id: number): Observable<JournalEntry> {
    return this.http
      .get<ApiResponse<JournalEntry>>(`${this.baseUrl}/journal-entries/${id}/`)
      .pipe(unwrapApi());
  }

  createJournalEntry(data: JournalEntryFormData): Observable<JournalEntry> {
    return this.http
      .post<ApiResponse<JournalEntry>>(`${this.baseUrl}/journal-entries/`, data)
      .pipe(unwrapApi());
  }

  updateJournalEntry(id: number, data: JournalEntryFormData): Observable<JournalEntry> {
    return this.http
      .patch<ApiResponse<JournalEntry>>(`${this.baseUrl}/journal-entries/${id}/`, data)
      .pipe(unwrapApi());
  }

  postJournalEntry(id: number): Observable<JournalEntry> {
    return this.http
      .post<ApiResponse<JournalEntry>>(`${this.baseUrl}/journal-entries/${id}/post/`, {})
      .pipe(unwrapApi());
  }

  reverseJournalEntry(id: number): Observable<JournalEntry> {
    return this.http
      .post<ApiResponse<JournalEntry>>(`${this.baseUrl}/journal-entries/${id}/reverse/`, {})
      .pipe(unwrapApi());
  }

  getReceivables(params: ListParams = {}): Observable<ARSummary> {
    return this.http
      .get<ApiResponse<ARSummary>>(`${this.baseUrl}/receivables/`, {
        params: buildHttpParams(params),
      })
      .pipe(unwrapApi());
  }

  getCustomerStatement(
    customerId: number,
    dateFrom?: string,
    dateTo?: string,
  ): Observable<CustomerStatement> {
    return this.http
      .get<ApiResponse<CustomerStatement>>(
        `${this.baseUrl}/receivables/${customerId}/statement/`,
        { params: buildHttpParams({ date_from: dateFrom, date_to: dateTo }) },
      )
      .pipe(unwrapApi());
  }

  getPayables(params: ListParams = {}): Observable<APSummary> {
    return this.http
      .get<ApiResponse<APSummary>>(`${this.baseUrl}/payables/`, {
        params: buildHttpParams(params),
      })
      .pipe(unwrapApi());
  }

  getUpcomingPayments(days = 14): Observable<UpcomingPayment[]> {
    return this.http
      .get<ApiResponse<UpcomingPayment[]>>(`${this.baseUrl}/payables/upcoming/`, {
        params: buildHttpParams({ days }),
      })
      .pipe(unwrapApi());
  }

  makeSupplierPayment(data: SupplierPaymentFormData): Observable<{ id: number; amount: string }> {
    const form = new FormData();
    form.append('invoice', String(data.invoice));
    form.append('amount', String(data.amount));
    form.append('payment_date', data.payment_date);
    form.append('payment_method', data.payment_method);
    form.append('reference', data.reference);
    if (data.bank_account != null) {
      form.append('bank_account', String(data.bank_account));
    }
    if (data.proof_document) {
      form.append('proof_document', data.proof_document);
    }
    return this.http
      .post<ApiResponse<{ id: number; amount: string }>>(
        `${this.baseUrl}/payables/payments/`,
        form,
      )
      .pipe(unwrapApi());
  }

  getBankAccounts(params: ListParams = {}): Observable<BankAccount[]> {
    return this.http
      .get<ApiResponse<PaginatedData<BankAccount>>>(`${this.baseUrl}/bank-accounts/`, {
        params: buildHttpParams({ page_size: 50, ...params }),
      })
      .pipe(unwrapApi(), map((data) => (Array.isArray(data) ? data : data.results)));
  }

  createBankAccount(data: BankAccountFormData): Observable<BankAccount> {
    return this.http
      .post<ApiResponse<BankAccount>>(`${this.baseUrl}/bank-accounts/`, data)
      .pipe(unwrapApi());
  }

  updateBankAccount(id: number, data: Partial<BankAccountFormData>): Observable<BankAccount> {
    return this.http
      .patch<ApiResponse<BankAccount>>(`${this.baseUrl}/bank-accounts/${id}/`, data)
      .pipe(unwrapApi());
  }

  getReconciliations(params: ListParams = {}): Observable<PaginatedData<Reconciliation>> {
    return this.http
      .get<ApiResponse<PaginatedData<Reconciliation>>>(`${this.baseUrl}/reconciliations/`, {
        params: buildHttpParams({ page_size: 20, ...params }),
      })
      .pipe(unwrapApi());
  }

  getReconciliation(id: number): Observable<Reconciliation> {
    return this.http
      .get<ApiResponse<Reconciliation>>(`${this.baseUrl}/reconciliations/${id}/`)
      .pipe(unwrapApi());
  }

  createReconciliation(data: Partial<Reconciliation>): Observable<Reconciliation> {
    return this.http
      .post<ApiResponse<Reconciliation>>(`${this.baseUrl}/reconciliations/`, data)
      .pipe(unwrapApi());
  }

  updateReconciliation(id: number, data: Partial<Reconciliation>): Observable<Reconciliation> {
    return this.http
      .patch<ApiResponse<Reconciliation>>(`${this.baseUrl}/reconciliations/${id}/`, data)
      .pipe(unwrapApi());
  }

  completeReconciliation(id: number): Observable<Reconciliation> {
    return this.http
      .post<ApiResponse<Reconciliation>>(`${this.baseUrl}/reconciliations/${id}/complete/`, {})
      .pipe(unwrapApi());
  }

  getBudgets(params: ListParams = {}): Observable<PaginatedData<Budget>> {
    return this.http
      .get<ApiResponse<PaginatedData<Budget>>>(`${this.baseUrl}/budgets/`, {
        params: buildHttpParams({ page_size: 50, ...params }),
      })
      .pipe(unwrapApi());
  }

  createBudget(data: BudgetFormData): Observable<Budget> {
    return this.http
      .post<ApiResponse<Budget>>(`${this.baseUrl}/budgets/`, data)
      .pipe(unwrapApi());
  }

  updateBudget(id: number, data: Partial<BudgetFormData>): Observable<Budget> {
    return this.http
      .patch<ApiResponse<Budget>>(`${this.baseUrl}/budgets/${id}/`, data)
      .pipe(unwrapApi());
  }

  getBudgetSummary(financialYear?: number): Observable<BudgetSummaryRow[]> {
    return this.http
      .get<ApiResponse<BudgetSummaryRow[]>>(`${this.baseUrl}/budgets/summary/`, {
        params: buildHttpParams(
          financialYear ? { financial_year: financialYear } : {},
        ),
      })
      .pipe(unwrapApi());
  }

  getVATSummary(month: number, year: number): Observable<VATSummary> {
    return this.http
      .get<ApiResponse<VATSummary>>(`${this.baseUrl}/tax/vat/`, {
        params: buildHttpParams({ month, year }),
      })
      .pipe(unwrapApi());
  }

  getPAYESummary(month: number, year: number): Observable<PAYESummary> {
    return this.http
      .get<ApiResponse<PAYESummary>>(`${this.baseUrl}/tax/paye/`, {
        params: buildHttpParams({ month, year }),
      })
      .pipe(unwrapApi());
  }

  getNSSFSummary(month: number, year: number): Observable<NSSFSummary> {
    return this.http
      .get<ApiResponse<NSSFSummary>>(`${this.baseUrl}/tax/nssf/`, {
        params: buildHttpParams({ month, year }),
      })
      .pipe(unwrapApi());
  }

  getTaxSummaryTabs(): Observable<TaxSummaryTab[]> {
    return this.http
      .get<ApiResponse<TaxSummaryTab[]>>(`${this.baseUrl}/tax/tabs/`)
      .pipe(unwrapApi());
  }

  getTaxSettingSummary(
    taxSettingId: number,
    month: number,
    year: number,
  ): Observable<TaxSettingSummary> {
    return this.http
      .get<ApiResponse<TaxSettingSummary>>(`${this.baseUrl}/tax/custom/${taxSettingId}/`, {
        params: buildHttpParams({ month, year }),
      })
      .pipe(unwrapApi());
  }

  getTaxSettings(): Observable<TaxSetting[]> {
    return this.http
      .get<ApiResponse<TaxSetting[]>>(`${this.baseUrl}/tax/settings/`)
      .pipe(unwrapApi());
  }

  /** Full list for Tax Settings management (includes inactive). */
  listTaxSettings(params: ListParams = {}): Observable<TaxSetting[]> {
    return this.http
      .get<ApiResponse<PaginatedData<TaxSetting> | TaxSetting[]>>(
        `${this.baseUrl}/tax-settings/`,
        { params: buildHttpParams({ page_size: 200, ...params }) },
      )
      .pipe(
        unwrapApi(),
        map((data) => (Array.isArray(data) ? data : data.results ?? [])),
      );
  }

  createTaxSetting(data: Partial<TaxSetting>): Observable<TaxSetting> {
    return this.http
      .post<ApiResponse<TaxSetting>>(`${this.baseUrl}/tax-settings/`, data)
      .pipe(unwrapApi());
  }

  updateTaxSetting(id: number, data: Partial<TaxSetting>): Observable<TaxSetting> {
    return this.http
      .patch<ApiResponse<TaxSetting>>(`${this.baseUrl}/tax-settings/${id}/`, data)
      .pipe(unwrapApi());
  }

  deactivateTaxSetting(id: number): Observable<unknown> {
    return this.http
      .delete<ApiResponse<unknown>>(`${this.baseUrl}/tax-settings/${id}/`)
      .pipe(unwrapApi());
  }

  getIncomeStatement(dateFrom: string, dateTo: string): Observable<IncomeStatement> {
    return this.http
      .get<ApiResponse<IncomeStatement>>(`${this.baseUrl}/reports/income-statement/`, {
        params: buildHttpParams({ date_from: dateFrom, date_to: dateTo }),
      })
      .pipe(unwrapApi());
  }

  getBalanceSheet(asOfDate: string): Observable<BalanceSheet> {
    return this.http
      .get<ApiResponse<BalanceSheet>>(`${this.baseUrl}/reports/balance-sheet/`, {
        params: buildHttpParams({ as_of_date: asOfDate }),
      })
      .pipe(unwrapApi());
  }

  getCashFlowStatement(dateFrom: string, dateTo: string): Observable<CashFlowStatement> {
    return this.http
      .get<ApiResponse<CashFlowStatement>>(`${this.baseUrl}/reports/cash-flow/`, {
        params: buildHttpParams({ date_from: dateFrom, date_to: dateTo }),
      })
      .pipe(unwrapApi());
  }

  getGeneralLedger(params: ListParams): Observable<LedgerEntry[]> {
    return this.http
      .get<ApiResponse<LedgerEntry[]>>(`${this.baseUrl}/reports/general-ledger/`, {
        params: buildHttpParams(params),
      })
      .pipe(unwrapApi());
  }

  getVendors(params: ListParams = {}): Observable<PaginatedData<FinanceVendor>> {
    return this.http
      .get<ApiResponse<PaginatedData<FinanceVendor>>>(`${this.baseUrl}/vendors/`, {
        params: buildHttpParams({ page_size: 50, ...params }),
      })
      .pipe(unwrapApi());
  }

  createVendor(data: FinanceVendorFormData): Observable<{ data: FinanceVendor; message: string }> {
    return this.http
      .post<ApiResponse<FinanceVendor>>(`${this.baseUrl}/vendors/`, data)
      .pipe(unwrapApiWithMessage());
  }

  getCustomers(params: ListParams = {}): Observable<PaginatedData<FinanceCustomer>> {
    return this.http
      .get<ApiResponse<PaginatedData<FinanceCustomer>>>(`${this.baseUrl}/customers/`, {
        params: buildHttpParams({ page_size: 50, ...params }),
      })
      .pipe(unwrapApi());
  }

  createCustomer(data: FinanceCustomerFormData): Observable<{ data: FinanceCustomer; message: string }> {
    return this.http
      .post<ApiResponse<FinanceCustomer>>(`${this.baseUrl}/customers/`, data)
      .pipe(unwrapApiWithMessage());
  }

  uploadBillLineAttachment(billId: number, lineId: number, file: File): Observable<BillLine> {
    const formData = new FormData();
    formData.append('attachment', file);
    return this.http
      .post<ApiResponse<BillLine>>(
        `${this.baseUrl}/bills/${billId}/lines/${lineId}/attachment/`,
        formData,
      )
      .pipe(unwrapApi());
  }

  uploadBillPaymentProof(billId: number, file: File): Observable<Bill> {
    const formData = new FormData();
    formData.append('payment_proof', file);
    return this.http
      .post<ApiResponse<Bill>>(`${this.baseUrl}/bills/${billId}/payment-proof/`, formData)
      .pipe(unwrapApi());
  }

  getBills(params: ListParams = {}): Observable<PaginatedData<Bill>> {
    return this.http
      .get<ApiResponse<PaginatedData<Bill>>>(`${this.baseUrl}/bills/`, {
        params: buildHttpParams({ page_size: 20, ordering: '-bill_date', ...params }),
      })
      .pipe(unwrapApi());
  }

  getBill(id: number): Observable<Bill> {
    return this.http.get<ApiResponse<Bill>>(`${this.baseUrl}/bills/${id}/`).pipe(unwrapApi());
  }

  createBill(data: BillFormData): Observable<Bill> {
    return this.http
      .post<ApiResponse<Bill>>(`${this.baseUrl}/bills/`, data)
      .pipe(unwrapApi());
  }

  updateBill(id: number, data: BillFormData): Observable<Bill> {
    return this.http
      .put<ApiResponse<Bill>>(`${this.baseUrl}/bills/${id}/`, data)
      .pipe(unwrapApi());
  }

  openBill(id: number): Observable<Bill> {
    return this.http
      .post<ApiResponse<Bill>>(`${this.baseUrl}/bills/${id}/open/`, {})
      .pipe(unwrapApi());
  }

  recordBillPayment(id: number, data: RecordBillPaymentData): Observable<Bill> {
    return this.http
      .post<ApiResponse<Bill>>(`${this.baseUrl}/bills/${id}/record-payment/`, data)
      .pipe(unwrapApi());
  }

  getRecurringBills(params: ListParams = {}): Observable<PaginatedData<RecurringBill>> {
    return this.http
      .get<ApiResponse<PaginatedData<RecurringBill>>>(`${this.baseUrl}/recurring-bills/`, {
        params: buildHttpParams({ page_size: 20, ordering: 'name', ...params }),
      })
      .pipe(unwrapApi());
  }

  getRecurringBill(id: number): Observable<RecurringBill> {
    return this.http
      .get<ApiResponse<RecurringBill>>(`${this.baseUrl}/recurring-bills/${id}/`)
      .pipe(unwrapApi());
  }

  createRecurringBill(data: RecurringBillFormData): Observable<RecurringBill> {
    return this.http
      .post<ApiResponse<RecurringBill>>(`${this.baseUrl}/recurring-bills/`, data)
      .pipe(unwrapApi());
  }

  updateRecurringBill(id: number, data: RecurringBillFormData): Observable<RecurringBill> {
    return this.http
      .put<ApiResponse<RecurringBill>>(`${this.baseUrl}/recurring-bills/${id}/`, data)
      .pipe(unwrapApi());
  }

  pauseRecurringBill(id: number): Observable<RecurringBill> {
    return this.http
      .post<ApiResponse<RecurringBill>>(`${this.baseUrl}/recurring-bills/${id}/pause/`, {})
      .pipe(unwrapApi());
  }

  resumeRecurringBill(id: number): Observable<RecurringBill> {
    return this.http
      .post<ApiResponse<RecurringBill>>(`${this.baseUrl}/recurring-bills/${id}/resume/`, {})
      .pipe(unwrapApi());
  }

  generateRecurringBillNow(id: number): Observable<{ bill: Bill; profile: RecurringBill }> {
    return this.http
      .post<ApiResponse<{ bill: Bill; profile: RecurringBill }>>(
        `${this.baseUrl}/recurring-bills/${id}/generate-now/`,
        {},
      )
      .pipe(unwrapApi());
  }

  uploadRecurringBillPaymentProof(id: number, file: File): Observable<RecurringBill> {
    const formData = new FormData();
    formData.append('payment_proof', file);
    return this.http
      .post<ApiResponse<RecurringBill>>(
        `${this.baseUrl}/recurring-bills/${id}/payment-proof/`,
        formData,
      )
      .pipe(unwrapApi());
  }

  getApprovalQueue(
    status: 'pending' | 'approved' | 'sent' = 'pending',
  ): Observable<FinanceApprovalQueue> {
    return this.http
      .get<ApiResponse<FinanceApprovalQueue>>(`${this.baseUrl}/approval-queue/`, {
        params: buildHttpParams({ status }),
      })
      .pipe(unwrapApi());
  }

  getInvoiceReceivedDetail(id: number): Observable<FinanceInvoiceDetail<SupplierInvoice>> {
    return this.http
      .get<ApiResponse<FinanceInvoiceDetail<SupplierInvoice>>>(
        `${this.baseUrl}/approval-queue/invoice-received/${id}/`,
      )
      .pipe(unwrapApi());
  }

  getInvoiceSentDetail(id: number): Observable<FinanceInvoiceDetail<Invoice>> {
    return this.http
      .get<ApiResponse<FinanceInvoiceDetail<Invoice>>>(
        `${this.baseUrl}/approval-queue/invoice-sent/${id}/`,
      )
      .pipe(unwrapApi());
  }

  approveInvoiceReceived(id: number): Observable<{ data: unknown; message: string }> {
    return this.http
      .post<ApiResponse<unknown>>(
        `${this.baseUrl}/approval-queue/invoice-received/${id}/approve/`,
        {},
      )
      .pipe(unwrapApiWithMessage());
  }

  rejectInvoiceReceived(id: number, reason: string): Observable<{ data: unknown; message: string }> {
    return this.http
      .post<ApiResponse<unknown>>(
        `${this.baseUrl}/approval-queue/invoice-received/${id}/reject/`,
        { reason },
      )
      .pipe(unwrapApiWithMessage());
  }

  approveInvoiceSent(id: number): Observable<{ data: unknown; message: string }> {
    return this.http
      .post<ApiResponse<unknown>>(
        `${this.baseUrl}/approval-queue/invoice-sent/${id}/approve/`,
        {},
      )
      .pipe(unwrapApiWithMessage());
  }

  rejectInvoiceSent(id: number, reason: string): Observable<{ data: unknown; message: string }> {
    return this.http
      .post<ApiResponse<unknown>>(
        `${this.baseUrl}/approval-queue/invoice-sent/${id}/reject/`,
        { reason },
      )
      .pipe(unwrapApiWithMessage());
  }
}
