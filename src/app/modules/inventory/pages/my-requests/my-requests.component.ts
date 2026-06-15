import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import {
  DepartmentRequest,
  DeptRequestDepartment,
  Item,
  Warehouse,
} from '../../../../core/models/inventory.model';
import { AuthService } from '../../../../core/services/auth.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { exportToExcel } from '../../../../core/utils/export.util';
import { formatCurrency, formatDateTime, formatNumber } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import {
  DEPT_REQUEST_DEPARTMENTS,
  DEPT_REQUEST_PRIORITIES,
} from '../../constants/inventory.constants';

@Component({
  selector: 'app-my-requests',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    ModalComponent,
    PaginationComponent,
    StatusBadgeComponent,
    SearchableSelectComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './my-requests.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyRequestsComponent implements OnInit {
  private readonly inventory = inject(InventoryService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly requests = signal<DepartmentRequest[]>([]);
  readonly items = signal<Item[]>([]);
  readonly warehouses = signal<Warehouse[]>([]);
  readonly stockMap = signal<Record<string, number>>({});
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly saving = signal(false);
  readonly showModal = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly departments = DEPT_REQUEST_DEPARTMENTS;
  readonly priorities = DEPT_REQUEST_PRIORITIES;

  readonly formatDateTime = formatDateTime;
  readonly formatNumber = formatNumber;
  readonly formatCurrency = formatCurrency;

  readonly form = this.fb.group({
    department: ['ADMINISTRATION' as DeptRequestDepartment, Validators.required],
    warehouse: [null as number | null, Validators.required],
    priority: ['MEDIUM' as const, Validators.required],
    purpose: ['', Validators.required],
    needed_by_date: [''],
    notes: [''],
    item: [null as number | null, Validators.required],
    quantity: [1, [Validators.required, Validators.min(0.0001)]],
  });

  ngOnInit(): void {
    this.inventory.getItems({ page_size: 300, internal_use: true }).subscribe((d) => this.items.set(d.results));
    this.inventory.getWarehouses().subscribe((w) => this.warehouses.set(w));
    this.inventory.getStock({ page_size: 500 }).subscribe((d) => {
      const map: Record<string, number> = {};
      for (const s of d.results) {
        map[`${s.item}-${s.warehouse}`] = +s.quantity_available;
      }
      this.stockMap.set(map);
    });
    this.load();
  }

  itemOptions(): SelectOption[] {
    return this.items().map((i) => ({
      value: i.id,
      label: `${i.code} — ${i.name}`,
      sublabel: i.item_usage === 'FOR_SALE' ? undefined : `${i.unit_of_measure} · ${i.item_usage ?? 'BOTH'}`,
    }));
  }

  warehouseOptions(): SelectOption[] {
    return this.warehouses().map((w) => ({ value: w.id, label: w.name }));
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  onWarehouseChange(value: number | string | null): void {
    this.form.controls.warehouse.setValue(value != null ? Number(value) : null);
    this.form.controls.warehouse.markAsTouched();
  }

  onItemChange(value: number | string | null): void {
    this.form.controls.item.setValue(value != null ? Number(value) : null);
    this.form.controls.item.markAsTouched();
  }

  fieldTouched(field: string): boolean {
    const control = this.form.get(field);
    return !!(control?.invalid && control.touched);
  }

  fieldError(field: string): string | null {
    const control = this.form.get(field);
    if (!control?.touched || !control.errors) return null;
    if (control.errors['required']) return 'This field is required';
    if (control.errors['min']) return 'Quantity must be greater than zero';
    return null;
  }

  availableStock(): number | null {
    const itemId = this.form.value.item;
    const whId = this.form.value.warehouse;
    if (!itemId || !whId) return null;
    return this.stockMap()[`${itemId}-${whId}`] ?? 0;
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.inventory
      .getDepartmentRequests({
        page: this.page(),
        page_size: this.pageSize(),
        scope: 'my',
        ordering: '-created_at',
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.requests.set(d.results);
          this.total.set(d.count);
        },
        error: () => this.error.set(true),
      });
  }

  openNew(): void {
    this.form.reset({
      department: 'ADMINISTRATION',
      warehouse: null,
      priority: 'MEDIUM',
      purpose: '',
      needed_by_date: '',
      notes: '',
      item: null,
      quantity: 1,
    });
    this.showModal.set(true);
  }

  saveDraft(): void {
    if (!this.validateDraft()) return;
    this.persist(false);
  }

  submitRequest(): void {
    if (!this.validateSubmit()) return;
    this.persist(true);
  }

  private validateDraft(): boolean {
    let ok = true;
    if (!this.form.controls.warehouse.value) {
      this.form.controls.warehouse.markAsTouched();
      ok = false;
    }
    if (!this.form.controls.item.value) {
      this.form.controls.item.markAsTouched();
      ok = false;
    }
    if (!ok) {
      this.notification.error('Select a warehouse and item to save a draft');
    }
    return ok;
  }

  private validateSubmit(): boolean {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.error('Please complete all required fields');
      return false;
    }
    return true;
  }

  private persist(submit: boolean): void {
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.inventory
      .createDepartmentRequest({
        department: v.department!,
        warehouse: v.warehouse!,
        priority: v.priority!,
        purpose: v.purpose ?? '',
        needed_by_date: v.needed_by_date || null,
        notes: v.notes ?? '',
        submit,
        lines: [{ item: v.item!, quantity: v.quantity! }],
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success(submit ? 'Request submitted' : 'Draft saved');
          this.showModal.set(false);
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  submitDraft(req: DepartmentRequest): void {
    this.inventory.submitDepartmentRequest(req.id).subscribe({
      next: () => {
        this.notification.success('Request submitted');
        this.load();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  cancelDraft(req: DepartmentRequest): void {
    this.inventory.cancelDepartmentRequest(req.id).subscribe({
      next: () => {
        this.notification.success('Draft cancelled');
        this.load();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  exportExcel(): void {
    exportToExcel(
      'my-requests',
      [
        { key: 'request_number', label: 'Request #' },
        { key: 'department', label: 'Department' },
        { key: 'priority', label: 'Priority' },
        { key: 'status', label: 'Status' },
        { key: 'purpose', label: 'Purpose' },
      ],
      this.requests(),
    );
  }

  statusSteps(status: string): { label: string; done: boolean; active: boolean }[] {
    const order = ['DRAFT', 'SUBMITTED', 'APPROVED', 'ISSUED'];
    const normalized =
      status === 'PENDING' ? 'SUBMITTED' : status === 'PARTIALLY_ISSUED' ? 'ISSUED' : status;
    const idx = order.indexOf(normalized);
    return order.map((step, i) => ({
      label: step,
      done: idx > i || normalized === 'ISSUED' || normalized === 'PARTIALLY_ISSUED',
      active: idx === i,
    }));
  }
}
