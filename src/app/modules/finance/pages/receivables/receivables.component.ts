import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { ARAgingRow, ARSummary, CustomerStatement } from '../../../../core/models/finance.model';
import { AuthService } from '../../../../core/services/auth.service';
import { FinanceService } from '../../../../core/services/finance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { exportToExcel } from '../../../../core/utils/export.util';
import { formatDate } from '../../../../core/utils/format.util';
import { printDocument } from '../../../../core/utils/sales-pdf.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { FinanceNavComponent } from '../../components/finance-nav/finance-nav.component';
import { COMPANY_DETAILS, formatAccountingAmount } from '../../constants/finance.constants';
import { canViewFinance } from '../../utils/finance-permissions.util';

@Component({
  selector: 'app-receivables',
  imports: [
    FormsModule,
    PageHeaderComponent,
    FinanceNavComponent,
    ModalComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './receivables.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReceivablesComponent implements OnInit {
  private readonly finance = inject(FinanceService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);

  readonly data = signal<ARSummary | null>(null);
  readonly loading = signal(true);
  readonly statementLoading = signal(false);
  readonly showStatement = signal(false);
  readonly statement = signal<CustomerStatement | null>(null);
  readonly statementCustomer = signal<ARAgingRow | null>(null);
  readonly search = signal('');
  readonly bucketFilter = signal('');

  readonly statementDateFrom = signal('');
  readonly statementDateTo = signal(new Date().toISOString().slice(0, 10));

  readonly formatAccountingAmount = formatAccountingAmount;
  readonly formatDate = formatDate;
  readonly company = COMPANY_DETAILS;
  readonly canView = () => canViewFinance(this.auth);

  readonly filteredAging = computed(() => {
    const rows = this.data()?.aging ?? [];
    const q = this.search().trim().toLowerCase();
    const bucket = this.bucketFilter();
    return rows.filter((row) => {
      if (q && !row.customer_name.toLowerCase().includes(q)) return false;
      if (!bucket) return true;
      return Number(row[bucket as keyof ARAgingRow] ?? 0) > 0;
    });
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.finance
      .getReceivables()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => this.data.set(d),
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  agingClass(bucket: keyof ARAgingRow): string {
    const map: Partial<Record<keyof ARAgingRow, string>> = {
      current: 'text-green-700',
      days_1_30: 'text-gray-800',
      days_31_60: 'text-amber-600',
      days_61_90: 'text-orange-600 font-medium',
      days_90_plus: 'text-red-600 font-semibold',
      total_outstanding: 'font-semibold text-[#1B3A6B]',
    };
    return map[bucket] ?? '';
  }

  exportExcel(): void {
    const rows = this.filteredAging();
    exportToExcel('accounts-receivable-aging', [
      { key: 'customer_name', label: 'Customer' },
      { key: 'current', label: 'Current' },
      { key: 'days_1_30', label: '1-30 Days' },
      { key: 'days_31_60', label: '31-60 Days' },
      { key: 'days_61_90', label: '61-90 Days' },
      { key: 'days_90_plus', label: '90+ Days' },
      { key: 'total_outstanding', label: 'Total Outstanding' },
    ], rows);
  }

  openStatement(row: ARAgingRow): void {
    this.statementCustomer.set(row);
    this.statementDateFrom.set('');
    this.statementDateTo.set(new Date().toISOString().slice(0, 10));
    this.fetchStatement(row.customer_id);
  }

  fetchStatement(customerId: number): void {
    this.statementLoading.set(true);
    this.finance
      .getCustomerStatement(
        customerId,
        this.statementDateFrom() || undefined,
        this.statementDateTo() || undefined,
      )
      .pipe(finalize(() => this.statementLoading.set(false)))
      .subscribe({
        next: (stmt) => {
          this.statement.set(stmt);
          this.showStatement.set(true);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  refreshStatement(): void {
    const row = this.statementCustomer();
    if (row) this.fetchStatement(row.customer_id);
  }

  printStatement(): void {
    printDocument('customer-statement-print');
  }
}
