import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import {
  InventorySalesOrder,
  InventorySalesOrderDetail,
} from '../../../../core/models/inventory.model';
import { InventoryService } from '../../../../core/services/inventory.service';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { InvSoPickupPanelComponent } from '../../components/inv-so-pickup-panel/inv-so-pickup-panel.component';
import { InventoryNavComponent } from '../../components/inventory-nav/inventory-nav.component';

@Component({
  selector: 'app-inventory-sales-pickup-queue',
  imports: [
    RouterLink,
    PageHeaderComponent,
    InventoryNavComponent,
    InvSoPickupPanelComponent,
    StatusBadgeComponent,
    TableSkeletonComponent,
    ErrorStateComponent,
  ],
  templateUrl: './inventory-sales-pickup-queue.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventorySalesPickupQueueComponent implements OnInit {
  private readonly inventory = inject(InventoryService);

  readonly orders = signal<InventorySalesOrder[]>([]);
  readonly selectedId = signal<number | null>(null);
  readonly selectedDetail = signal<InventorySalesOrderDetail | null>(null);
  readonly loading = signal(true);
  readonly loadingDetail = signal(false);
  readonly error = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.inventory
      .getSalesOrdersForStockVerification('pickup')
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => this.orders.set(data.results),
        error: () => this.error.set(true),
      });
  }

  selectOrder(order: InventorySalesOrder): void {
    this.selectedId.set(order.id);
    this.loadingDetail.set(true);
    this.inventory
      .getSalesOrderForStockVerification(order.id)
      .pipe(finalize(() => this.loadingDetail.set(false)))
      .subscribe({
        next: (detail) => this.selectedDetail.set(detail),
        error: () => {
          this.selectedId.set(null);
          this.selectedDetail.set(null);
        },
      });
  }

  onWorkflowRefresh(): void {
    this.selectedId.set(null);
    this.selectedDetail.set(null);
    this.load();
  }
}
