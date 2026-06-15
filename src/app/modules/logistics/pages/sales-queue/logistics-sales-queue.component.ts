import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import {
  LogisticsSalesOrder,
  LogisticsSalesOrderDetail,
  LogisticsSalesQueue,
} from '../../../../core/models/logistics.model';
import { LogisticsService } from '../../../../core/services/logistics.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { LoSoOrderDetailComponent } from '../../components/lo-so-order-detail/lo-so-order-detail.component';
import { LoSoWorkflowPanelComponent } from '../../components/lo-so-workflow-panel/lo-so-workflow-panel.component';
import { LogisticsNavComponent } from '../../components/logistics-nav/logistics-nav.component';

@Component({
  selector: 'app-logistics-sales-queue',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    LogisticsNavComponent,
    LoSoOrderDetailComponent,
    LoSoWorkflowPanelComponent,
    StatusBadgeComponent,
    TableSkeletonComponent,
    ErrorStateComponent,
  ],
  templateUrl: './logistics-sales-queue.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogisticsSalesQueueComponent implements OnInit {
  private readonly logistics = inject(LogisticsService);
  private readonly notification = inject(NotificationService);

  readonly orders = signal<LogisticsSalesOrder[]>([]);
  readonly selectedId = signal<number | null>(null);
  readonly selectedDetail = signal<LogisticsSalesOrderDetail | null>(null);
  readonly loading = signal(true);
  readonly loadingDetail = signal(false);
  readonly error = signal(false);
  readonly queue = signal<LogisticsSalesQueue>('delivery_cost');

  readonly queueTabs: { label: string; value: LogisticsSalesQueue }[] = [
    { label: 'Delivery Cost', value: 'delivery_cost' },
    { label: 'Dispatch', value: 'dispatch' },
    { label: 'In Transit', value: 'in_transit' },
    { label: 'All', value: 'all' },
  ];

  ngOnInit(): void {
    this.load();
  }

  setQueue(value: LogisticsSalesQueue): void {
    this.queue.set(value);
    this.selectedId.set(null);
    this.selectedDetail.set(null);
    this.load();
  }

  selectOrder(order: LogisticsSalesOrder): void {
    this.selectedId.set(order.id);
    this.loadOrderDetail(order.id);
  }

  loadOrderDetail(id: number): void {
    this.loadingDetail.set(true);
    this.logistics
      .getSalesOrderForLogistics(id)
      .pipe(finalize(() => this.loadingDetail.set(false)))
      .subscribe({
        next: (detail) => this.selectedDetail.set(detail),
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.logistics
      .getSalesOrderQueue(this.queue())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => {
          this.orders.set(data.results);
          const currentId = this.selectedId();
          if (currentId) {
            const stillListed = data.results.some((o) => o.id === currentId);
            if (stillListed) {
              this.loadOrderDetail(currentId);
            } else {
              this.selectedId.set(null);
              this.selectedDetail.set(null);
            }
          } else if (this.queue() === 'in_transit' && data.results.length === 1) {
            this.selectOrder(data.results[0]);
          }
        },
        error: (e) => {
          this.error.set(true);
          this.notification.error(getApiErrorMessage(e));
        },
      });
  }

  onWorkflowRefresh(): void {
    this.load();
  }
}
