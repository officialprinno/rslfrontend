import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { Item, StockTake, Warehouse } from '../../../../core/models/inventory.model';
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
  selector: 'app-stock-take',
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
  templateUrl: './stock-take.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockTakeComponent implements OnInit {
  private readonly inventory = inject(InventoryService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly stockTakes = signal<StockTake[]>([]);
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
    warehouse: [null as number | null, Validators.required],
    notes: [''],
    item: [null as number | null, Validators.required],
    system_quantity: [0, Validators.required],
    physical_quantity: [0, Validators.required],
    reason: [''],
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
      .getStockTakes({ page: this.page(), page_size: this.pageSize(), ordering: '-created_at' })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => { this.stockTakes.set(d.results); this.total.set(d.count); },
        error: () => this.error.set(true),
      });
  }

  openNew(): void {
    this.form.reset({ warehouse: null, notes: '', item: null, system_quantity: 0, physical_quantity: 0, reason: '' });
    this.showModal.set(true);
  }

  onItemOrWarehouseChange(): void {
    const itemId = this.form.controls.item.value;
    const warehouseId = this.form.controls.warehouse.value;
    if (!itemId || !warehouseId) return;
    this.inventory.getStock({ item: itemId, warehouse: warehouseId, page_size: 1 }).subscribe({
      next: (d) => {
        const qty = d.results[0]?.quantity_on_hand ?? 0;
        this.form.controls.system_quantity.setValue(qty);
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.inventory
      .createStockTake({
        warehouse: v.warehouse!,
        notes: v.notes ?? '',
        lines: [{
          item: v.item!,
          system_quantity: v.system_quantity!,
          physical_quantity: v.physical_quantity!,
          reason: v.reason ?? '',
        }],
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Stock take submitted');
          this.showModal.set(false);
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  approve(take: StockTake): void {
    this.inventory.approveStockTake(take.id).subscribe({
      next: () => { this.notification.success('Stock take approved'); this.load(); },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  reject(take: StockTake): void {
    this.inventory.rejectStockTake(take.id).subscribe({
      next: () => { this.notification.success('Stock take rejected'); this.load(); },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  exportExcel(): void {
    exportToExcel('stock-takes', [
      { key: 'take_number', label: 'Take Number' },
      { key: 'warehouse_name', label: 'Warehouse' },
      { key: 'status', label: 'Status' },
      { key: 'conducted_by_name', label: 'Conducted By' },
      { key: 'created_at', label: 'Date', format: (r) => formatDateTime(r.created_at) },
    ], this.stockTakes());
  }
}
