import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { Item, StockTransfer, Warehouse } from '../../../../core/models/inventory.model';
import { AuthService } from '../../../../core/services/auth.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { exportToExcel } from '../../../../core/utils/export.util';
import { formatDateTime, formatNumber } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { InventoryNavComponent } from '../../components/inventory-nav/inventory-nav.component';
import { canAddAdjustment, canApproveAdjustment } from '../../utils/inventory-permissions.util';

@Component({
  selector: 'app-transfers-list',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    InventoryNavComponent,
    ModalComponent,
    PaginationComponent,
    StatusBadgeComponent,
    SearchableSelectComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './transfers-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransfersListComponent implements OnInit {
  private readonly inventory = inject(InventoryService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly transfers = signal<StockTransfer[]>([]);
  readonly items = signal<Item[]>([]);
  readonly warehouses = signal<Warehouse[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly saving = signal(false);
  readonly showModal = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);

  readonly formatDateTime = formatDateTime;
  readonly formatNumber = formatNumber;
  readonly canAdd = () => canAddAdjustment(this.auth);
  readonly canApprove = () => canApproveAdjustment(this.auth);

  readonly form = this.fb.group({
    source_warehouse: [null as number | null, Validators.required],
    destination_warehouse: [null as number | null, Validators.required],
    notes: [''],
    item: [null as number | null, Validators.required],
    quantity: [1, [Validators.required, Validators.min(0.0001)]],
  });

  ngOnInit(): void {
    this.inventory.getItems({ page_size: 200 }).subscribe((d) => this.items.set(d.results));
    this.inventory.getWarehouses().subscribe((w) => this.warehouses.set(w));
    this.load();
  }

  itemOptions(): SelectOption[] {
    return this.items().map((i) => ({ value: i.id, label: `${i.code} — ${i.name}` }));
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.inventory
      .getTransfers({ page: this.page(), page_size: this.pageSize(), ordering: '-created_at' })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => { this.transfers.set(d.results); this.total.set(d.count); },
        error: () => this.error.set(true),
      });
  }

  openNew(): void {
    this.form.reset({ source_warehouse: null, destination_warehouse: null, notes: '', item: null, quantity: 1 });
    this.showModal.set(true);
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    if (v.source_warehouse === v.destination_warehouse) {
      this.notification.error('Source and destination warehouses must be different');
      return;
    }
    this.saving.set(true);
    this.inventory
      .createTransfer({
        source_warehouse: v.source_warehouse!,
        destination_warehouse: v.destination_warehouse!,
        notes: v.notes ?? '',
        lines: [{ item: v.item!, quantity: v.quantity! }],
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Stock transfer created');
          this.showModal.set(false);
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  approve(transfer: StockTransfer): void {
    this.inventory.approveTransfer(transfer.id).subscribe({
      next: () => { this.notification.success('Transfer approved'); this.load(); },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  complete(transfer: StockTransfer): void {
    this.inventory.completeTransfer(transfer.id).subscribe({
      next: () => { this.notification.success('Transfer completed'); this.load(); },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  reject(transfer: StockTransfer): void {
    this.inventory.rejectTransfer(transfer.id).subscribe({
      next: () => { this.notification.success('Transfer rejected'); this.load(); },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  exportExcel(): void {
    exportToExcel('stock-transfers', [
      { key: 'transfer_number', label: 'Transfer Number' },
      { key: 'source_warehouse_name', label: 'Source' },
      { key: 'destination_warehouse_name', label: 'Destination' },
      { key: 'status', label: 'Status' },
      { key: 'requested_by_name', label: 'Requested By' },
      { key: 'created_at', label: 'Date', format: (r) => formatDateTime(r.created_at) },
    ], this.transfers());
  }
}
