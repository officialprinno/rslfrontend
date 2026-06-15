import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import {
  Account,
  APSummary,
  ARSummary,
  BalanceSheet,
  CashFlowStatement,
  IncomeStatement,
  LedgerEntry,
} from '../../../../core/models/finance.model';
import { FinanceService } from '../../../../core/services/finance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import {
  exportBalanceSheetPdf,
  exportCashFlowPdf,
  exportGeneralLedgerPdf,
  exportIncomeStatementPdf,
} from '../../../../core/utils/finance-pdf.util';
import { formatDate } from '../../../../core/utils/format.util';
import { formatAccountingAmount } from '../../constants/finance.constants';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { FinanceNavComponent } from '../../components/finance-nav/finance-nav.component';

type ReportId =
  | 'income-statement'
  | 'balance-sheet'
  | 'cash-flow'
  | 'general-ledger'
  | 'receivables'
  | 'payables';

interface ReportCard {
  id: ReportId;
  title: string;
  description: string;
  periodType: 'range' | 'asOf' | 'none';
}

@Component({
  selector: 'app-finance-reports',
  imports: [
    FormsModule,
    PageHeaderComponent,
    FinanceNavComponent,
    TableSkeletonComponent,
    ErrorStateComponent,
  ],
  templateUrl: './reports.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsComponent implements OnInit {
  private readonly finance = inject(FinanceService);
  private readonly notification = inject(NotificationService);

  readonly loading = signal(false);
  readonly error = signal(false);
  readonly activeReport = signal<ReportId | null>(null);

  readonly incomeStatement = signal<IncomeStatement | null>(null);
  readonly balanceSheet = signal<BalanceSheet | null>(null);
  readonly cashFlow = signal<CashFlowStatement | null>(null);
  readonly generalLedger = signal<LedgerEntry[] | null>(null);
  readonly receivables = signal<ARSummary | null>(null);
  readonly payables = signal<APSummary | null>(null);

  readonly accounts = signal<Account[]>([]);
  readonly formatAmount = formatAccountingAmount;
  readonly formatDate = formatDate;

  dateFrom = this.firstDayOfMonth(new Date());
  dateTo = this.todayIso();
  asOfDate = this.todayIso();
  selectedAccountId: number | null = null;

  readonly reportCards: ReportCard[] = [
    {
      id: 'income-statement',
      title: 'Income Statement',
      description: 'Revenue, COGS, expenses and net profit for a period',
      periodType: 'range',
    },
    {
      id: 'balance-sheet',
      title: 'Balance Sheet',
      description: 'Assets, liabilities and equity as of a date',
      periodType: 'asOf',
    },
    {
      id: 'cash-flow',
      title: 'Cash Flow Statement',
      description: 'Operating cash inflows and outflows',
      periodType: 'range',
    },
    {
      id: 'general-ledger',
      title: 'General Ledger',
      description: 'Account-level transaction detail',
      periodType: 'range',
    },
    {
      id: 'receivables',
      title: 'Receivables Aging',
      description: 'Outstanding customer balances by aging bucket',
      periodType: 'none',
    },
    {
      id: 'payables',
      title: 'Payables Aging',
      description: 'Outstanding supplier balances by aging bucket',
      periodType: 'none',
    },
  ];

  ngOnInit(): void {
    this.finance.getAccounts().subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : data.results;
        this.accounts.set(list);
        if (list.length && !this.selectedAccountId) {
          this.selectedAccountId = list[0].id;
        }
      },
    });
  }

  generateReport(id: ReportId): void {
    this.activeReport.set(id);
    this.loading.set(true);
    this.error.set(false);
    this.clearReportData(id);

    const onError = (e: unknown) => {
      this.error.set(true);
      this.notification.error(getApiErrorMessage(e));
    };
    const stopLoading = () => this.loading.set(false);

    switch (id) {
      case 'income-statement':
        this.finance
          .getIncomeStatement(this.dateFrom, this.dateTo)
          .pipe(finalize(stopLoading))
          .subscribe({
            next: (data) => this.incomeStatement.set(data),
            error: onError,
          });
        break;
      case 'balance-sheet':
        this.finance
          .getBalanceSheet(this.asOfDate)
          .pipe(finalize(stopLoading))
          .subscribe({
            next: (data) => this.balanceSheet.set(data),
            error: onError,
          });
        break;
      case 'cash-flow':
        this.finance
          .getCashFlowStatement(this.dateFrom, this.dateTo)
          .pipe(finalize(stopLoading))
          .subscribe({
            next: (data) => this.cashFlow.set(data),
            error: onError,
          });
        break;
      case 'general-ledger':
        if (!this.selectedAccountId) {
          this.loading.set(false);
          this.notification.error('Select an account for the general ledger report.');
          return;
        }
        this.finance
          .getGeneralLedger({
            account: this.selectedAccountId,
            date_from: this.dateFrom,
            date_to: this.dateTo,
          })
          .pipe(finalize(stopLoading))
          .subscribe({
            next: (data) => this.generalLedger.set(data),
            error: onError,
          });
        break;
      case 'receivables':
        this.finance
          .getReceivables()
          .pipe(finalize(stopLoading))
          .subscribe({
            next: (data) => this.receivables.set(data),
            error: onError,
          });
        break;
      case 'payables':
        this.finance
          .getPayables()
          .pipe(finalize(stopLoading))
          .subscribe({
            next: (data) => this.payables.set(data),
            error: onError,
          });
        break;
    }
  }

  exportPdf(id: ReportId): void {
    switch (id) {
      case 'income-statement': {
        const data = this.incomeStatement();
        if (data) exportIncomeStatementPdf(data);
        break;
      }
      case 'balance-sheet': {
        const data = this.balanceSheet();
        if (data) exportBalanceSheetPdf(data);
        break;
      }
      case 'cash-flow': {
        const data = this.cashFlow();
        if (data) exportCashFlowPdf(data);
        break;
      }
      case 'general-ledger': {
        const data = this.generalLedger();
        const account = this.accounts().find((a) => a.id === this.selectedAccountId);
        if (data && account) {
          exportGeneralLedgerPdf(
            data,
            `${account.account_code} — ${account.account_name}`,
            this.dateFrom,
            this.dateTo,
          );
        }
        break;
      }
      default:
        this.notification.error('PDF export is not available for this report.');
    }
  }

  selectedAccountLabel(): string {
    const account = this.accounts().find((a) => a.id === this.selectedAccountId);
    return account ? `${account.account_code} — ${account.account_name}` : '—';
  }

  private clearReportData(id: ReportId): void {
    if (id === 'income-statement') this.incomeStatement.set(null);
    if (id === 'balance-sheet') this.balanceSheet.set(null);
    if (id === 'cash-flow') this.cashFlow.set(null);
    if (id === 'general-ledger') this.generalLedger.set(null);
    if (id === 'receivables') this.receivables.set(null);
    if (id === 'payables') this.payables.set(null);
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private firstDayOfMonth(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
  }
}
