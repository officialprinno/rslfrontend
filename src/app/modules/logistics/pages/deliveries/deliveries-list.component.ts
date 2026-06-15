import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { DeliveryOrder } from '../../../../core/models/logistics.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { LogisticsService } from '../../../../core/services/logistics.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDate } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { LogisticsNavComponent } from '../../components/logistics-nav/logistics-nav.component';
import {
  canManageDeliveries,
  canStartTrip,
} from '../../utils/logistics-permissions.util';

@Component({
  selector: 'app-deliveries-list',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    LogisticsNavComponent,
    PaginationComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './deliveries-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveriesListComponent implements OnInit {
  private readonly logistics = inject(LogisticsService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly deliveries = signal<DeliveryOrder[]>([]);
  readonly loading = signal(true);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly search = signal('');
  readonly statusFilter = signal('');
  readonly dateFrom = signal('');
  readonly dateAfter = signal('');
  readonly overdueOnly = signal(false);

  readonly formatDate = formatDate;
  readonly canAdd = () => canManageDeliveries(this.auth);
  readonly canStart = () => canStartTrip(this.auth);
  readonly canManage = () => canManageDeliveries(this.auth);

  readonly statusOptions = ['SCHEDULED', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'CANCELLED'];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const params: Record<string, string | number | boolean> = {
      page: this.page(),
      page_size: 10,
      ordering: '-scheduled_date',
    };
    if (this.search()) params['search'] = this.search();
    if (this.statusFilter()) params['status'] = this.statusFilter();
    if (this.dateFrom()) params['date_from'] = this.dateFrom();
    if (this.dateAfter()) params['date_after'] = this.dateAfter();
    if (this.overdueOnly()) params['overdue'] = true;

    this.logistics
      .getDeliveryOrders(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.deliveries.set(d.results);
          this.total.set(d.count);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  isOverdue(d: DeliveryOrder): boolean {
    if (d.status !== 'SCHEDULED' && d.status !== 'IN_TRANSIT') return false;
    const scheduled = new Date(d.scheduled_date);
    const now = new Date();
    return scheduled.getTime() < now.getTime();
  }

  rowClass(d: DeliveryOrder): string {
    return this.isOverdue(d) ? '!bg-red-50' : '';
  }

  startTrip(d: DeliveryOrder): void {
    this.confirm
      .open({
        title: 'Start Trip',
        message: `Start trip for ${d.do_number}? Vehicle and driver must be assigned.`,
        confirmLabel: 'Start Trip',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.logistics.startTrip(d.id).subscribe({
          next: () => {
            this.notification.success('Trip started');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }

  cancelDelivery(d: DeliveryOrder): void {
    this.confirm
      .open({
        title: 'Cancel Delivery',
        message: `Cancel ${d.do_number}?`,
        confirmLabel: 'Cancel Delivery',
        confirmDanger: true,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.logistics.cancelDeliveryOrder(d.id).subscribe({
          next: () => {
            this.notification.success('Delivery cancelled');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }
}
