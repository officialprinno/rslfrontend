import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { OperatorDashboard, OperatorDashboardOrder } from '../../../../core/models/production.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ProductionService } from '../../../../core/services/production.service';
import { formatDateTime, formatNumber } from '../../../../core/utils/format.util';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { ProductionNavComponent } from '../../components/production-nav/production-nav.component';

const WO_STATUS_LABELS: Record<string, string> = {
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  PAUSED: 'Paused',
  COMPLETED_PENDING: 'Awaiting Approval',
  PROD_APPROVED: 'Approved',
  WAITING_STORE: 'Waiting Store',
  INV_RECEIVED: 'Received',
  CLOSED: 'Closed',
};

@Component({
  selector: 'app-operator-dashboard',
  imports: [
    RouterLink,
    PageHeaderComponent,
    ProductionNavComponent,
    TableSkeletonComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './operator-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperatorDashboardComponent implements OnInit, OnDestroy {
  private readonly production = inject(ProductionService);
  private readonly auth = inject(AuthService);
  private refreshSub?: Subscription;

  readonly data = signal<OperatorDashboard | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly formatNumber = formatNumber;
  readonly formatDateTime = formatDateTime;
  readonly statusLabel = (status: string) => WO_STATUS_LABELS[status] ?? status.replace(/_/g, ' ');

  readonly greeting = computed(() => {
    const user = this.auth.getCurrentUser();
    if (!user) {
      return 'Operator';
    }
    return user.first_name || user.email;
  });

  ngOnInit(): void {
    this.load();
    this.refreshSub = interval(30_000).subscribe(() => this.load(true));
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  load(silent = false): void {
    if (!silent) {
      this.loading.set(true);
      this.error.set(false);
    }
    this.production
      .getOperatorDashboard()
      .pipe(
        finalize(() => {
          if (!silent) {
            this.loading.set(false);
          }
        }),
      )
      .subscribe({
        next: (d) => this.data.set(d),
        error: () => {
          if (!silent) {
            this.error.set(true);
          }
        },
      });
  }

  focusActionLabel(order: OperatorDashboardOrder): string {
    if (order.status === 'IN_PROGRESS') {
      return 'Continue Work';
    }
    if (order.status === 'PAUSED') {
      return 'Resume Work';
    }
    if (order.can_operator_start) {
      return 'Start Work';
    }
    return 'Open Work Order';
  }

  orderAccent(status: string): string {
    if (status === 'IN_PROGRESS') {
      return 'border-l-blue-500';
    }
    if (status === 'PAUSED') {
      return 'border-l-amber-500';
    }
    if (status === 'ASSIGNED') {
      return 'border-l-[#1B3A6B]';
    }
    return 'border-l-gray-300';
  }

  machineAccent(isBreakdown: boolean, status: string): string {
    if (isBreakdown || status === 'BREAKDOWN') {
      return 'border-l-red-500 bg-red-50';
    }
    if (status === 'MAINTENANCE') {
      return 'border-l-amber-500 bg-amber-50';
    }
    return 'border-l-emerald-500';
  }
}
