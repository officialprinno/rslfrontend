import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { APAgingRow, APSummary } from '../../../../core/models/finance.model';
import { AuthService } from '../../../../core/services/auth.service';
import { FinanceService } from '../../../../core/services/finance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { FinanceNavComponent } from '../../components/finance-nav/finance-nav.component';
import { formatAccountingAmount } from '../../constants/finance.constants';
import { canViewFinance } from '../../utils/finance-permissions.util';

@Component({
  selector: 'app-payables',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    FinanceNavComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './payables.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayablesComponent implements OnInit {
  private readonly finance = inject(FinanceService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);

  readonly data = signal<APSummary | null>(null);
  readonly loading = signal(true);
  readonly search = signal('');
  readonly bucketFilter = signal('');

  readonly formatAccountingAmount = formatAccountingAmount;
  readonly canView = () => canViewFinance(this.auth);

  readonly filteredAging = computed(() => {
    const rows = this.data()?.aging ?? [];
    const q = this.search().trim().toLowerCase();
    const bucket = this.bucketFilter();
    return rows.filter((row) => {
      if (q && !row.supplier_name.toLowerCase().includes(q)) return false;
      if (!bucket) return true;
      return Number(row[bucket as keyof APAgingRow] ?? 0) > 0;
    });
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.finance
      .getPayables()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => this.data.set(d),
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  agingClass(bucket: keyof APAgingRow): string {
    const map: Partial<Record<keyof APAgingRow, string>> = {
      current: 'text-green-700',
      days_1_30: 'text-gray-800',
      days_31_60: 'text-amber-600',
      days_61_90: 'text-orange-600 font-medium',
      days_90_plus: 'text-red-600 font-semibold',
      total_outstanding: 'font-semibold text-[#1B3A6B]',
    };
    return map[bucket] ?? '';
  }
}
