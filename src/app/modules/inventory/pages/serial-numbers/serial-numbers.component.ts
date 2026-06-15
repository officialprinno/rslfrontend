import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { Item, ItemSerialNumber, Warehouse } from '../../../../core/models/inventory.model';
import { AuthService } from '../../../../core/services/auth.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { exportToExcel } from '../../../../core/utils/export.util';
import { formatDate, formatDateTime } from '../../../../core/utils/format.util';
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
  selector: 'app-serial-numbers',
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
  templateUrl: './serial-numbers.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SerialNumbersComponent implements OnInit {
  private readonly inventory = inject(InventoryService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly serials = signal<ItemSerialNumber[]>([]);
  readonly items = signal<Item[]>([]);
  readonly warehouses = signal<Warehouse[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly saving = signal(false);
  readonly showModal = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);

  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;
  readonly canAdd = () => canAddAdjustment(this.auth);

  readonly form = this.fb.group({
    item: [null as number | null, Validators.required],
    warehouse: [null as number | null, Validators.required],
    serial_number: ['', Validators.required],
    manufacturer_serial: [''],
    purchase_date: [''],
    warranty_date: [''],
    status: ['IN_STOCK', Validators.required],
  });

  ngOnInit(): void {
    this.inventory.getItems({ page_size: 200, has_serial_number: true }).subscribe((d) => this.items.set(d.results));
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
      .getSerialNumbers({ page: this.page(), page_size: this.pageSize(), ordering: '-created_at' })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => { this.serials.set(d.results); this.total.set(d.count); },
        error: () => this.error.set(true),
      });
  }

  openNew(): void {
    this.form.reset({
      item: null, warehouse: null, serial_number: '', manufacturer_serial: '',
      purchase_date: '', warranty_date: '', status: 'IN_STOCK',
    });
    this.showModal.set(true);
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.inventory
      .createSerialNumber({
        item: v.item!,
        warehouse: v.warehouse!,
        serial_number: v.serial_number!,
        manufacturer_serial: v.manufacturer_serial ?? '',
        purchase_date: v.purchase_date || null,
        warranty_date: v.warranty_date || null,
        status: v.status!,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Serial number registered');
          this.showModal.set(false);
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  exportExcel(): void {
    exportToExcel('serial-numbers', [
      { key: 'serial_number', label: 'Serial Number' },
      { key: 'item_code', label: 'Item Code' },
      { key: 'warehouse_name', label: 'Warehouse' },
      { key: 'status', label: 'Status' },
      { key: 'purchase_date', label: 'Purchase Date', format: (r) => r.purchase_date ? formatDate(r.purchase_date) : '—' },
    ], this.serials());
  }
}
