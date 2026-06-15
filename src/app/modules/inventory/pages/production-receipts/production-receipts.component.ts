import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { ProductionReceiptQueueItem, Warehouse } from '../../../../core/models/inventory.model';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDateTime, formatNumber } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { InventoryNavComponent } from '../../components/inventory-nav/inventory-nav.component';
import { ProcurementBadgeComponent } from '../../components/procurement-badge/procurement-badge.component';

@Component({
  selector: 'app-production-receipts',
  imports: [
    FormsModule,
    PageHeaderComponent,
    InventoryNavComponent,
    ProcurementBadgeComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
    ModalComponent,
  ],
  templateUrl: './production-receipts.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductionReceiptsComponent implements OnInit {
  private readonly inventory = inject(InventoryService);
  private readonly notification = inject(NotificationService);

  readonly queue = signal<ProductionReceiptQueueItem[]>([]);
  readonly warehouses = signal<Warehouse[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly receiving = signal(false);
  readonly selected = signal<ProductionReceiptQueueItem | null>(null);
  readonly showModal = signal(false);

  readonly warehouseId = signal<number | null>(null);
  readonly quantityReceived = signal(0);
  readonly batchNumber = signal('');
  readonly notes = signal('');

  readonly formatDateTime = formatDateTime;
  readonly formatNumber = formatNumber;

  ngOnInit(): void {
    this.inventory.getWarehouses().subscribe((wh) => this.warehouses.set(wh));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.inventory
      .getProductionReceiptQueue()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (rows) => this.queue.set(rows),
        error: (err) => {
          this.error.set(true);
          this.notification.error(getApiErrorMessage(err, 'Failed to load production receipts'));
        },
      });
  }

  openReceive(row: ProductionReceiptQueueItem): void {
    this.selected.set(row);
    this.quantityReceived.set(+row.pending_receipt.quantity || +row.quantity_produced);
    this.batchNumber.set(row.pending_receipt.batch_number || '');
    this.notes.set('');
    this.warehouseId.set(this.warehouses()[0]?.id ?? null);
    this.showModal.set(true);
  }

  confirmReceive(): void {
    const row = this.selected();
    const wh = this.warehouseId();
    if (!row || !wh) return;
    this.receiving.set(true);
    this.inventory
      .receiveProductionReceipt(row.id, {
        warehouse: wh,
        quantity_received: this.quantityReceived(),
        batch_number: this.batchNumber(),
        notes: this.notes(),
      })
      .pipe(finalize(() => this.receiving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success(`${row.wo_number} received into inventory`);
          this.showModal.set(false);
          this.load();
        },
        error: (err) =>
          this.notification.error(getApiErrorMessage(err, 'Failed to receive finished goods')),
      });
  }
}
