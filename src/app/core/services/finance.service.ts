import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environments';
import { ApiResponse } from '../models/auth.models';
import {
  Account,
  AccountFormData,
  APSummary,
  ARSummary,
  BalanceSheet,
  BankAccount,
  BankAccountFormData,
  Budget,
  BudgetFormData,
  BudgetSummaryRow,
  CashFlowStatement,
  CustomerStatement,
  FinanceDashboard,
  IncomeStatement,
  JournalEntry,
  JournalEntryFormData,
  LedgerEntry,
  NSSFSummary,
  PAYESummary,
  Reconciliation,
  SupplierPaymentFormData,
  TaxSetting,
  UpcomingPayment,
  VATSummary,
} from '../models/finance.model';
import { ListParams, PaginatedData } from '../models/paginated.model';
import { buildHttpParams, unwrapApi } from '../utils/api.util';

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/finance`;

  getDashboard(): Observable<FinanceDashboard> {
    return this.http
      .get<ApiResponse<FinanceDashboard>>(`${this.baseUrl}/dashboard/`)
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
    return this.http
      .post<ApiResponse<{ id: number; amount: string }>>(
        `${this.baseUrl}/payables/payments/`,
        data,
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

  getTaxSettings(): Observable<TaxSetting[]> {
    return this.http
      .get<ApiResponse<TaxSetting[]>>(`${this.baseUrl}/tax/settings/`)
      .pipe(unwrapApi());
  }

  updateTaxSetting(id: number, data: Partial<TaxSetting>): Observable<TaxSetting> {
    return this.http
      .patch<ApiResponse<TaxSetting>>(`${this.baseUrl}/tax-settings/${id}/`, data)
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
}
