import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { Reconciliation } from '../../../../core/models/finance.model';
import { AuthService } from '../../../../core/services/auth.service';
import { FinanceService } from '../../../../core/services/finance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDate } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { FinanceNavComponent } from '../../components/finance-nav/finance-nav.component';
import { formatAccountingAmount } from '../../constants/finance.constants';
import { canReconcile, canViewFinance } from '../../utils/finance-permissions.util';

@Component({
  selector: 'app-reconciliation-detail',
  imports: [
    RouterLink,
    PageHeaderComponent,
    FinanceNavComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './reconciliation-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReconciliationDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly finance = inject(FinanceService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);

  readonly reconciliation = signal<Reconciliation | null>(null);
  readonly loading = signal(true);
  readonly completing = signal(false);

  readonly formatAccountingAmount = formatAccountingAmount;
  readonly formatDate = formatDate;
  readonly canView = () => canViewFinance(this.auth);
  readonly canReconcile = () => canReconcile(this.auth);

  readonly difference = computed(() => Number(this.reconciliation()?.summary.difference ?? 0));
  readonly canComplete = computed(
    () =>
      this.canReconcile() &&
      this.reconciliation()?.status === 'DRAFT' &&
      this.difference() === 0,
  );

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) return;
    this.load(id);
  }

  load(id: number): void {
    this.loading.set(true);
    this.finance
      .getReconciliation(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (r) => this.reconciliation.set(r),
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  complete(): void {
    const rec = this.reconciliation();
    if (!rec || !this.canComplete()) return;
    this.completing.set(true);
    this.finance
      .completeReconciliation(rec.id)
      .pipe(finalize(() => this.completing.set(false)))
      .subscribe({
        next: (updated) => {
          this.notification.success('Reconciliation completed');
          this.reconciliation.set(updated);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }
}
