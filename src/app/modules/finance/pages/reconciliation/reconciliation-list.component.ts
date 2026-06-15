import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { Reconciliation } from '../../../../core/models/finance.model';
import { AuthService } from '../../../../core/services/auth.service';
import { FinanceService } from '../../../../core/services/finance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDate } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { FinanceNavComponent } from '../../components/finance-nav/finance-nav.component';
import { formatAccountingAmount } from '../../constants/finance.constants';
import { canReconcile, canViewFinance } from '../../utils/finance-permissions.util';

@Component({
  selector: 'app-reconciliation-list',
  imports: [
    RouterLink,
    PageHeaderComponent,
    FinanceNavComponent,
    PaginationComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './reconciliation-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReconciliationListComponent implements OnInit {
  private readonly finance = inject(FinanceService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);

  readonly reconciliations = signal<Reconciliation[]>([]);
  readonly loading = signal(true);
  readonly total = signal(0);
  readonly page = signal(1);

  readonly formatAccountingAmount = formatAccountingAmount;
  readonly formatDate = formatDate;
  readonly canView = () => canViewFinance(this.auth);
  readonly canReconcile = () => canReconcile(this.auth);
  readonly hasDifference = (value: string) => Number(value) !== 0;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.finance
      .getReconciliations({ page: this.page(), page_size: 10 })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.reconciliations.set(d.results);
          this.total.set(d.count);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  statusLabel(status: string): string {
    return status === 'COMPLETED' ? 'Completed' : 'Draft';
  }
}
