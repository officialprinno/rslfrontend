import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { DepartmentRequest, DeptRequestDepartment, Item, Warehouse } from '../../../../core/models/inventory.model';
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
import { DEPT_REQUEST_DEPARTMENTS } from '../../constants/inventory.constants';
import { canAddAdjustment, canApproveAdjustment } from '../../utils/inventory-permissions.util';

@Component({
  selector: 'app-dept-requests',
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
  templateUrl: './dept-requests.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeptRequestsComponent implements OnInit {
  private readonly inventory = inject(InventoryService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly requests = signal<DepartmentRequest[]>([]);
  readonly items = signal<Item[]>([]);
  readonly warehouses = signal<Warehouse[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly saving = signal(false);
  readonly showModal = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly departments = DEPT_REQUEST_DEPARTMENTS;

  readonly formatDateTime = formatDateTime;
  readonly formatNumber = formatNumber;
  readonly canAdd = () => canAddAdjustment(this.auth);
  readonly canApprove = () => canApproveAdjustment(this.auth);

  readonly form = this.fb.group({
    department: ['PRODUCTION' as DeptRequestDepartment, Validators.required],
    warehouse: [null as number | null, Validators.required],
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
      .getDepartmentRequests({ page: this.page(), page_size: this.pageSize(), ordering: '-created_at' })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => { this.requests.set(d.results); this.total.set(d.count); },
        error: () => this.error.set(true),
      });
  }

  openNew(): void {
    this.form.reset({ department: 'PRODUCTION', warehouse: null, notes: '', item: null, quantity: 1 });
    this.showModal.set(true);
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.inventory
      .createDepartmentRequest({
        department: v.department!,
        warehouse: v.warehouse!,
        notes: v.notes ?? '',
        submit: true,
        lines: [{ item: v.item!, quantity: v.quantity! }],
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Department request created');
          this.showModal.set(false);
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  approve(req: DepartmentRequest): void {
    this.inventory.approveDepartmentRequest(req.id).subscribe({
      next: () => { this.notification.success('Request approved'); this.load(); },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  issue(req: DepartmentRequest): void {
    this.inventory.issueDepartmentRequest(req.id).subscribe({
      next: () => { this.notification.success('Stock issued'); this.load(); },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  reject(req: DepartmentRequest): void {
    this.inventory.rejectDepartmentRequest(req.id).subscribe({
      next: () => { this.notification.success('Request rejected'); this.load(); },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  exportExcel(): void {
    exportToExcel('department-requests', [
      { key: 'request_number', label: 'Request Number' },
      { key: 'department', label: 'Department' },
      { key: 'warehouse_name', label: 'Warehouse' },
      { key: 'status', label: 'Status' },
      { key: 'requested_by_name', label: 'Requested By' },
    ], this.requests());
  }
}
