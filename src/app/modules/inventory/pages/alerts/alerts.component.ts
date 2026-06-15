import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { Stock, StockAlert } from '../../../../core/models/inventory.model';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { exportToExcel } from '../../../../core/utils/export.util';
import { formatDateTime, formatNumber } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { AlertTypeBadgeComponent } from '../../components/alert-type-badge/alert-type-badge.component';
import { InventoryNavComponent } from '../../components/inventory-nav/inventory-nav.component';

@Component({
  selector: 'app-alerts',
  imports: [
    FormsModule,
    PageHeaderComponent,
    InventoryNavComponent,
    AlertTypeBadgeComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './alerts.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertsComponent implements OnInit {
  private readonly inventory = inject(InventoryService);
  private readonly notification = inject(NotificationService);

  readonly alerts = signal<StockAlert[]>([]);
  readonly stockMap = signal<Map<string, Stock>>(new Map());
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly filterRead = signal<'all' | 'unread'>('all');

  readonly unreadCount = computed(() => this.alerts().filter((a) => !a.is_read).length);

  readonly formatDateTime = formatDateTime;
  readonly formatNumber = formatNumber;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    const params = this.filterRead() === 'unread' ? { is_read: false } : {};

    this.inventory
      .getAlerts(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (alerts) => {
          this.alerts.set(alerts);
          this.inventory.getAllStock().subscribe((stock) => {
            const map = new Map<string, Stock>();
            stock.forEach((s) => map.set(`${s.item}-${s.warehouse}`, s));
            this.stockMap.set(map);
          });
        },
        error: () => this.error.set(true),
      });
  }

  stockInfo(alert: StockAlert): { qty: number; reorder: number } {
    const key = `${alert.item}-${alert.warehouse}`;
    const s = this.stockMap().get(key);
    return { qty: s?.quantity_available ?? 0, reorder: s?.reorder_level ?? 0 };
  }

  markRead(alert: StockAlert): void {
    this.inventory.markAlertRead(alert.id).subscribe({
      next: () => {
        this.notification.success('Alert marked as read');
        this.load();
      },
      error: (e: Error) => this.notification.error(e.message),
    });
  }

  exportExcel(): void {
    exportToExcel('stock-alerts', [
      { key: 'created_at', label: 'Date', format: (r) => formatDateTime(r.created_at) },
      { key: 'alert_type', label: 'Type' },
      { key: 'item_name', label: 'Item' },
      { key: 'message', label: 'Message' },
    ], this.alerts());
  }
}
