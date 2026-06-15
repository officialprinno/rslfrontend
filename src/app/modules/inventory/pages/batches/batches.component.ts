import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { Item, StockBatch, Warehouse } from '../../../../core/models/inventory.model';
import { Supplier } from '../../../../core/models/procurement.model';
import { AuthService } from '../../../../core/services/auth.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProcurementService } from '../../../../core/services/procurement.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { exportToExcel } from '../../../../core/utils/export.util';
import { formatCurrency, formatDate, formatNumber } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { InventoryNavComponent } from '../../components/inventory-nav/inventory-nav.component';
import { canAddAdjustment } from '../../utils/inventory-permissions.util';

@Component({
  selector: 'app-batches',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    InventoryNavComponent,
    ModalComponent,
    PaginationComponent,
    SearchableSelectComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './batches.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BatchesComponent implements OnInit {
  private readonly inventory = inject(InventoryService);
  private readonly procurement = inject(ProcurementService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly batches = signal<StockBatch[]>([]);
  readonly items = signal<Item[]>([]);
  readonly warehouses = signal<Warehouse[]>([]);
  readonly suppliers = signal<Supplier[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly saving = signal(false);
  readonly showModal = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);

  readonly formatDate = formatDate;
  readonly formatNumber = formatNumber;
  readonly formatCurrency = formatCurrency;
  readonly canAdd = () => canAddAdjustment(this.auth);

  readonly form = this.fb.group({
    item: [null as number | null, Validators.required],
    warehouse: [null as number | null, Validators.required],
    batch_number: ['', Validators.required],
    manufacture_date: [''],
    expiry_date: [''],
    supplier: [null as number | null],
    quantity: [1, [Validators.required, Validators.min(0.0001)]],
    unit_cost: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    this.inventory.getItems({ page_size: 200, has_batch_tracking: true }).subscribe((d) => this.items.set(d.results));
    this.inventory.getWarehouses().subscribe((w) => this.warehouses.set(w));
    this.procurement.getSuppliers({ page_size: 100 }).subscribe((d) => this.suppliers.set(d.results));
    this.load();
  }

  itemOptions(): SelectOption[] {
    return this.items().map((i) => ({ value: i.id, label: `${i.code} — ${i.name}` }));
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.inventory
      .getBatches({ page: this.page(), page_size: this.pageSize(), ordering: '-created_at' })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => { this.batches.set(d.results); this.total.set(d.count); },
        error: () => this.error.set(true),
      });
  }

  openNew(): void {
    this.form.reset({
      item: null, warehouse: null, batch_number: '', manufacture_date: '', expiry_date: '',
      supplier: null, quantity: 1, unit_cost: 0,
    });
    this.showModal.set(true);
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.inventory
      .createBatch({
        item: v.item!,
        warehouse: v.warehouse!,
        batch_number: v.batch_number!,
        manufacture_date: v.manufacture_date || null,
        expiry_date: v.expiry_date || null,
        supplier: v.supplier,
        quantity: v.quantity!,
        unit_cost: v.unit_cost!,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Batch created');
          this.showModal.set(false);
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  exportExcel(): void {
    exportToExcel('stock-batches', [
      { key: 'batch_number', label: 'Batch Number' },
      { key: 'item_name', label: 'Item' },
      { key: 'warehouse_name', label: 'Warehouse' },
      { key: 'quantity', label: 'Quantity', format: (r) => formatNumber(r.quantity) },
      { key: 'unit_cost', label: 'Unit Cost', format: (r) => formatCurrency(r.unit_cost) },
      { key: 'expiry_date', label: 'Expiry', format: (r) => r.expiry_date ? formatDate(r.expiry_date) : '—' },
    ], this.batches());
  }
}
