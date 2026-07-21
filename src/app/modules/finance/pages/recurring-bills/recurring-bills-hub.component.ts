import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { RecurringBill } from '../../../../core/models/finance.model';
import { FinanceService } from '../../../../core/services/finance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatDate } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { FinanceNavComponent } from '../../components/finance-nav/finance-nav.component';
import { RECURRING_BILL_FREQUENCIES } from '../../constants/finance.constants';

@Component({
  selector: 'app-recurring-bills-hub',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    FinanceNavComponent,
    PaginationComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './recurring-bills-hub.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecurringBillsHubComponent implements OnInit {
  private readonly finance = inject(FinanceService);
  private readonly notification = inject(NotificationService);

  readonly profiles = signal<RecurringBill[]>([]);
  readonly loading = signal(true);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly statusFilter = signal('');
  readonly search = signal('');

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly frequencies = RECURRING_BILL_FREQUENCIES;

  readonly lifecycleSteps = [
    { icon: '🛍️', title: 'Routine Purchase', desc: 'Recurring expense with the same vendor' },
    { icon: '📄', title: 'Create Profile', desc: 'Set vendor, lines, and schedule' },
    { icon: '🔖', title: 'Bill Generated', desc: 'System creates the bill on the due date' },
    { icon: '💵', title: 'Record Payment', desc: 'Pay and reconcile like any other bill' },
  ];

  frequencyLabel(value: string): string {
    return this.frequencies.find((f) => f.value === value)?.label ?? value;
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const params: Record<string, string | number> = {
      page: this.page(),
      page_size: 15,
    };
    if (this.statusFilter()) params['status'] = this.statusFilter();
    if (this.search()) params['search'] = this.search();

    this.finance
      .getRecurringBills(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.profiles.set(d.results);
          this.total.set(d.count);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }
}
