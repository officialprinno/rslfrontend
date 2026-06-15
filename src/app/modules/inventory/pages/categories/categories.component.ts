import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { ApiResponse } from '../../../../core/models/auth.models';
import { Category, CategoryFormData } from '../../../../core/models/inventory.model';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { extractFieldErrors, getApiErrorMessage } from '../../../../core/utils/api.util';
import { exportToExcel } from '../../../../core/utils/export.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { InventoryNavComponent } from '../../components/inventory-nav/inventory-nav.component';
import { canManageCategories } from '../../utils/inventory-permissions.util';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-categories',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    InventoryNavComponent,
    ModalComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './categories.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesComponent implements OnInit {
  private readonly inventory = inject(InventoryService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly categories = signal<Category[]>([]);
  readonly itemCounts = signal<Record<number, number>>({});
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly saving = signal(false);
  readonly showModal = signal(false);
  readonly editing = signal<Category | null>(null);
  readonly fieldErrors = signal<Record<string, string>>({});

  readonly form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    parent: [null as number | null],
  });

  readonly canManage = () => canManageCategories(this.auth);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.inventory.getCategories().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (cats) => {
        this.categories.set(cats);
        this.loadItemCounts();
      },
      error: () => this.error.set(true),
    });
  }

  private loadItemCounts(): void {
    this.inventory.getItems({ page_size: 100 }).subscribe({
      next: (data) => {
        const counts: Record<number, number> = {};
        data.results.forEach((i) => {
          counts[i.category] = (counts[i.category] ?? 0) + 1;
        });
        this.itemCounts.set(counts);
      },
    });
  }

  itemCount(catId: number): number {
    return this.itemCounts()[catId] ?? 0;
  }

  openAdd(): void {
    this.editing.set(null);
    this.fieldErrors.set({});
    this.form.reset({ name: '', description: '', parent: null });
    this.showModal.set(true);
  }

  openEdit(cat: Category): void {
    this.editing.set(cat);
    this.fieldErrors.set({});
    this.form.patchValue({ name: cat.name, description: cat.description, parent: cat.parent });
    this.showModal.set(true);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
      this.notification.error('Please fill in all required fields.');
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const data: CategoryFormData = {
      name: (raw.name ?? '').trim(),
      description: raw.description ?? '',
      parent: raw.parent != null ? Number(raw.parent) : null,
    };
    const editing = this.editing();
    const req$ = editing
      ? this.inventory.updateCategory(editing.id, data)
      : this.inventory.createCategory(data);

    req$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.notification.success(editing ? 'Category updated' : 'Category created');
        this.showModal.set(false);
        this.load();
      },
      error: (err: unknown) => {
        const httpErr = err as { error?: ApiResponse<unknown> };
        if (httpErr.error?.errors) this.fieldErrors.set(extractFieldErrors(httpErr.error.errors));
        this.notification.error(getApiErrorMessage(err, 'Failed to save category'));
        this.cdr.markForCheck();
      },
    });
  }

  onDelete(cat: Category): void {
    this.confirm.open({
      title: 'Delete Category',
      message: `Delete "${cat.name}"?`,
      confirmLabel: 'Delete',
      confirmDanger: true,
    }).subscribe((ok) => {
      if (!ok) return;
      this.inventory.deleteCategory(cat.id).subscribe({
        next: () => { this.notification.success('Category deleted'); this.load(); },
        error: (e: Error) => this.notification.error(e.message),
      });
    });
  }

  exportExcel(): void {
    exportToExcel('item-categories', [
      { key: 'name', label: 'Name' },
      { key: 'parent_name', label: 'Parent' },
      { key: 'id', label: 'Items', format: (r) => this.itemCount(r.id) },
    ], this.categories());
  }

  modalTitle(): string {
    return this.editing() ? 'Edit Category' : 'Add Category';
  }
}
