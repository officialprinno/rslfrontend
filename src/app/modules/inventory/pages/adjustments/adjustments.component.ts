import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { ApiResponse } from '../../../../core/models/auth.models';
import {
  AdjustmentFormData,
  AdjustmentType,
  Item,
  StockAdjustment,
  Warehouse,
} from '../../../../core/models/inventory.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { extractFieldErrors, getApiErrorMessage } from '../../../../core/utils/api.util';
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
  selector: 'app-adjustments',
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
  templateUrl: './adjustments.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdjustmentsComponent implements OnInit {
  private readonly inventory = inject(InventoryService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly adjustments = signal<StockAdjustment[]>([]);
  readonly items = signal<Item[]>([]);
  readonly warehouses = signal<Warehouse[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly saving = signal(false);
  readonly showModal = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly fieldErrors = signal<Record<string, string>>({});

  readonly formatDateTime = formatDateTime;
  readonly formatNumber = formatNumber;

  readonly form = this.fb.group({
    item: [null as number | null, Validators.required],
    warehouse: [null as number | null, Validators.required],
    adjustment_type: ['INCREASE' as AdjustmentType, Validators.required],
    quantity: [1, [Validators.required, Validators.min(0.0001)]],
    reason: ['', Validators.required],
  });

  readonly canAdd = () => canAddAdjustment(this.auth);
  readonly canApprove = () => canApproveAdjustment(this.auth);

  ngOnInit(): void {
    this.inventory.getItems({ page_size: 100 }).subscribe((d) => this.items.set(d.results));
    this.inventory.getWarehouses().subscribe((w) => this.warehouses.set(w));
    this.load();
  }

  itemOptions(): SelectOption[] {
    return this.items().map((i) => ({
      value: i.id,
      label: `${i.code} — ${i.name}`,
      sublabel: i.category_name,
    }));
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.inventory
      .getAdjustments({ page: this.page(), page_size: this.pageSize(), ordering: '-created_at' })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => {
          this.adjustments.set(data.results);
          this.total.set(data.count);
        },
        error: () => this.error.set(true),
      });
  }

  openNew(): void {
    this.fieldErrors.set({});
    this.inventory.getItems({ page_size: 100, is_active: true }).subscribe((d) => this.items.set(d.results));
    this.inventory.getWarehouses({ is_active: true }).subscribe((w) => this.warehouses.set(w));
    this.form.reset({ item: null, warehouse: null, adjustment_type: 'INCREASE', quantity: 1, reason: '' });
    this.showModal.set(true);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
      this.notification.error('Please select an item, warehouse, and enter a reason.');
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const data: AdjustmentFormData = {
      item: raw.item != null ? Number(raw.item) : null,
      warehouse: raw.warehouse != null ? Number(raw.warehouse) : null,
      adjustment_type: raw.adjustment_type ?? 'INCREASE',
      quantity: Number(raw.quantity),
      reason: (raw.reason ?? '').trim(),
    };
    this.inventory
      .createAdjustment(data)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Adjustment submitted for approval');
          this.showModal.set(false);
          this.load();
        },
        error: (err: unknown) => {
          const httpErr = err as { error?: ApiResponse<unknown> };
          if (httpErr.error?.errors) this.fieldErrors.set(extractFieldErrors(httpErr.error.errors));
          this.notification.error(getApiErrorMessage(err, 'Failed to create adjustment'));
          this.cdr.markForCheck();
        },
      });
  }

  approve(adj: StockAdjustment): void {
    this.confirm.open({
      title: 'Approve Adjustment',
      message: `Approve ${adj.adjustment_type} of ${formatNumber(adj.quantity)} for ${adj.item_name}?`,
      confirmLabel: 'Approve',
    }).subscribe((ok) => {
      if (!ok) return;
      this.inventory.approveAdjustment(adj.id).subscribe({
        next: () => { this.notification.success('Adjustment approved'); this.load(); },
        error: (e: Error) => this.notification.error(e.message),
      });
    });
  }

  reject(adj: StockAdjustment): void {
    this.confirm.open({
      title: 'Reject Adjustment',
      message: `Reject adjustment for ${adj.item_name}?`,
      confirmLabel: 'Reject',
      confirmDanger: true,
    }).subscribe((ok) => {
      if (!ok) return;
      this.inventory.rejectAdjustment(adj.id).subscribe({
        next: () => { this.notification.success('Adjustment rejected'); this.load(); },
        error: (e: Error) => this.notification.error(e.message),
      });
    });
  }

  typeBadgeClass(type: AdjustmentType): string {
    return type === 'INCREASE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700';
  }

  exportExcel(): void {
    exportToExcel('stock-adjustments', [
      { key: 'created_at', label: 'Date', format: (r) => formatDateTime(r.created_at) },
      { key: 'item_name', label: 'Item' },
      { key: 'adjustment_type', label: 'Type' },
      { key: 'status', label: 'Status' },
    ], this.adjustments());
  }

  onItemSelected(value: number | string | null): void {
    const id = typeof value === 'number' ? value : typeof value === 'string' && value ? Number(value) : null;
    this.form.controls.item.setValue(Number.isFinite(id) ? id : null);
    this.form.controls.item.markAsTouched();
    this.cdr.markForCheck();
  }
}
