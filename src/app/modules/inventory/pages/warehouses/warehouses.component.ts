import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import { ApiResponse } from '../../../../core/models/auth.models';
import { Stock, Warehouse, WarehouseFormData } from '../../../../core/models/inventory.model';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { UsersService } from '../../../../core/services/users.service';
import { extractFieldErrors } from '../../../../core/utils/api.util';
import { formatCurrency } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { InventoryNavComponent } from '../../components/inventory-nav/inventory-nav.component';

interface WarehouseCard extends Warehouse {
  itemCount: number;
  stockValue: number;
}

@Component({
  selector: 'app-warehouses',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    InventoryNavComponent,
    ModalComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
    ErrorStateComponent,
  ],
  templateUrl: './warehouses.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WarehousesComponent implements OnInit {
  private readonly inventory = inject(InventoryService);
  private readonly usersService = inject(UsersService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly warehouses = signal<WarehouseCard[]>([]);
  readonly userOptions = signal<{ id: number; full_name: string }[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly saving = signal(false);
  readonly showModal = signal(false);
  readonly editing = signal<Warehouse | null>(null);
  readonly fieldErrors = signal<Record<string, string>>({});

  readonly formatCurrency = formatCurrency;

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    location: [''],
    manager: [null as number | null],
    is_active: [true],
  });

  ngOnInit(): void {
    this.usersService.getUsers().subscribe((u) => this.userOptions.set(u));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    forkJoin({
      warehouses: this.inventory.getWarehouses(),
      stock: this.inventory.getAllStock(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ warehouses, stock }) => {
          const stats = this.aggregateByWarehouse(stock);
          this.warehouses.set(
            warehouses.map((w) => ({
              ...w,
              itemCount: stats.get(w.id)?.count ?? 0,
              stockValue: stats.get(w.id)?.value ?? 0,
            })),
          );
        },
        error: () => this.error.set(true),
      });
  }

  private aggregateByWarehouse(stock: Stock[]): Map<number, { count: number; value: number }> {
    const map = new Map<number, { count: number; value: number }>();
    stock.forEach((s) => {
      const current = map.get(s.warehouse) ?? { count: 0, value: 0 };
      current.count += 1;
      current.value += s.total_value ?? 0;
      map.set(s.warehouse, current);
    });
    return map;
  }

  openAdd(): void {
    this.editing.set(null);
    this.form.reset({ name: '', location: '', manager: null, is_active: true });
    this.showModal.set(true);
  }

  openEdit(w: Warehouse): void {
    this.editing.set(w);
    this.form.patchValue({ name: w.name, location: w.location, manager: w.manager, is_active: w.is_active });
    this.showModal.set(true);
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const data = this.form.getRawValue() as WarehouseFormData;
    const editing = this.editing();
    const req$ = editing
      ? this.inventory.updateWarehouse(editing.id, data)
      : this.inventory.createWarehouse(data);

    req$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.notification.success(editing ? 'Warehouse updated' : 'Warehouse created');
        this.showModal.set(false);
        this.load();
      },
      error: (err: { error?: ApiResponse<unknown> }) => {
        if (err.error?.errors) this.fieldErrors.set(extractFieldErrors(err.error.errors));
        this.notification.error(err.error?.message ?? 'Failed to save warehouse');
      },
    });
  }

  modalTitle(): string {
    return this.editing() ? 'Edit Warehouse' : 'Add Warehouse';
  }
}
