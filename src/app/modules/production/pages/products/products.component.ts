import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { Item } from '../../../../core/models/inventory.model';
import { Product, ProductFormData, ProductSpecifications } from '../../../../core/models/production.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProductionService } from '../../../../core/services/production.service';
import { extractFieldErrors, getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatNumber } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { ProductionNavComponent } from '../../components/production-nav/production-nav.component';
import { DEFAULT_SPECS } from '../../constants/production.constants';
import { canDeleteAnything, canManageProducts } from '../../utils/production-permissions.util';

interface CustomSpecField {
  key: string;
  label: string;
  value: string;
}

@Component({
  selector: 'app-products',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    ProductionNavComponent,
    PaginationComponent,
    ModalComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
    SearchableSelectComponent,
  ],
  templateUrl: './products.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsComponent implements OnInit {
  private readonly production = inject(ProductionService);
  private readonly inventory = inject(InventoryService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly fb = inject(FormBuilder);

  readonly products = signal<Product[]>([]);
  readonly manufacturedItems = signal<Item[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly saving = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly search = signal('');
  readonly statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  readonly showForm = signal(false);
  readonly editing = signal<Product | null>(null);
  readonly fieldErrors = signal<Record<string, string>>({});
  readonly customSpecs = signal<CustomSpecField[]>([]);
  readonly specValues = signal<Record<string, string>>({});

  readonly defaultSpecs = DEFAULT_SPECS;
  readonly formatNumber = formatNumber;
  readonly canAdd = () => canManageProducts(this.auth);
  readonly canDelete = () => canDeleteAnything(this.auth);

  readonly form = this.fb.group({
    item: [null as number | null, Validators.required],
    name: ['', Validators.required],
    standard_output: [1, [Validators.required, Validators.min(0.0001)]],
    unit_of_measure: ['', Validators.required],
    is_active: [true],
  });

  ngOnInit(): void {
    this.loadManufacturedItems();
    this.load();
  }

  private loadManufacturedItems(): void {
    this.inventory
      .getItems({
        page_size: 500,
        is_active: true,
        item_type: 'MANUFACTURED',
        without_production_product: true,
      })
      .subscribe({
        next: (d) => this.manufacturedItems.set(d.results),
        error: () => this.manufacturedItems.set([]),
      });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    const params: Record<string, string | number | boolean> = {
      page: this.page(),
      page_size: this.pageSize(),
      ordering: 'name',
    };
    if (this.search()) params['search'] = this.search();
    if (this.statusFilter() === 'active') params['is_active'] = true;
    if (this.statusFilter() === 'inactive') params['is_active'] = false;

    this.production
      .getProducts(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.products.set(d.results);
          this.total.set(d.count);
        },
        error: () => this.error.set(true),
      });
  }

  itemOptions(): SelectOption[] {
    return this.manufacturedItems().map((i) => ({
      value: i.id,
      label: `${i.code} — ${i.name}`,
      sublabel: i.unit_of_measure,
    }));
  }

  hasAvailableItems(): boolean {
    return this.itemOptions().length > 0;
  }

  specsSummary(specs: ProductSpecifications): string {
    const parts: string[] = [];
    for (const spec of this.defaultSpecs) {
      const val = specs[spec.key];
      if (val) parts.push(`${spec.label.split(' ')[0]}: ${val}`);
    }
    const defaultKeys = new Set(this.defaultSpecs.map((s) => s.key));
    for (const [key, val] of Object.entries(specs)) {
      if (!defaultKeys.has(key) && val) {
        parts.push(`${key}: ${val}`);
      }
    }
    return parts.length ? parts.join(' · ') : '—';
  }

  openAdd(): void {
    this.editing.set(null);
    this.fieldErrors.set({});
    this.customSpecs.set([]);
    this.specValues.set({});
    this.form.reset({
      item: null,
      name: '',
      standard_output: 1,
      unit_of_measure: '',
      is_active: true,
    });
    this.form.controls.item.enable();
    this.loadManufacturedItems();
    this.showForm.set(true);
  }

  openEdit(p: Product): void {
    this.editing.set(p);
    this.fieldErrors.set({});
    const defaultKeys = new Set(this.defaultSpecs.map((s) => s.key));
    const custom: CustomSpecField[] = [];
    for (const [key, val] of Object.entries(p.specifications ?? {})) {
      if (!defaultKeys.has(key) && val) {
        custom.push({ key, label: key, value: val });
      }
    }
    this.customSpecs.set(custom);
    const specMap: Record<string, string> = {};
    for (const spec of this.defaultSpecs) {
      const val = p.specifications?.[spec.key];
      if (val) specMap[spec.key] = val;
    }
    this.specValues.set(specMap);
    this.form.patchValue({
      item: p.item_id,
      name: p.name,
      standard_output: p.standard_output,
      unit_of_measure: p.unit_of_measure,
      is_active: p.is_active,
    });
    this.form.controls.item.disable();
    this.showForm.set(true);
  }

  updateSpecValue(key: string, value: string): void {
    this.specValues.update((vals) => ({ ...vals, [key]: value }));
  }

  onItemSelect(itemId: number | string | null): void {
    if (itemId === null || itemId === '') return;
    const id = Number(itemId);
    const item = this.manufacturedItems().find((i) => i.id === id);
    this.form.patchValue({
      item: id,
      unit_of_measure: item?.unit_of_measure ?? this.form.value.unit_of_measure,
      name: this.form.value.name || item?.name || '',
    });
  }

  addCustomSpec(): void {
    this.customSpecs.update((fields) => [...fields, { key: '', label: '', value: '' }]);
  }

  removeCustomSpec(index: number): void {
    this.customSpecs.update((fields) => fields.filter((_, i) => i !== index));
  }

  updateCustomSpec(index: number, field: 'key' | 'value', val: string): void {
    this.customSpecs.update((fields) =>
      fields.map((f, i) => (i === index ? { ...f, [field]: val, label: field === 'key' ? val : f.label } : f)),
    );
  }

  buildSpecifications(): ProductSpecifications {
    const specs: ProductSpecifications = {};
    const vals = this.specValues();
    for (const spec of this.defaultSpecs) {
      const val = vals[spec.key]?.trim();
      if (val) specs[spec.key] = val;
    }
    for (const custom of this.customSpecs()) {
      if (custom.key.trim() && custom.value.trim()) {
        specs[custom.key.trim()] = custom.value.trim();
      }
    }
    return specs;
  }

  private missingFieldMessage(): string | null {
    const missing: string[] = [];
    if (!this.editing() && !this.form.controls.item.value) {
      missing.push('manufactured inventory item');
    }
    if (this.form.controls.name.invalid) missing.push('product name');
    if (this.form.controls.standard_output.invalid) missing.push('standard output');
    if (this.form.controls.unit_of_measure.invalid) missing.push('unit of measure');
    if (!missing.length) return null;
    return `Please complete: ${missing.join(', ')}.`;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (!this.editing() && !this.hasAvailableItems()) {
        this.notification.error(
          'No manufactured inventory items are available. Create one in Inventory (type: Manufactured) first.',
        );
        return;
      }
      this.notification.error(this.missingFieldMessage() ?? 'Please complete all required fields.');
      return;
    }
    const raw = this.form.getRawValue();
    const data: ProductFormData = {
      item: raw.item!,
      name: (raw.name ?? '').trim(),
      specifications: this.buildSpecifications(),
      standard_output: Number(raw.standard_output),
      unit_of_measure: (raw.unit_of_measure ?? '').trim(),
      is_active: raw.is_active ?? true,
    };
    this.saving.set(true);
    const edit = this.editing();
    const req$ = edit
      ? this.production.updateProduct(edit.id, data)
      : this.production.createProduct(data);
    req$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.notification.success(edit ? 'Product updated' : 'Product created');
        this.showForm.set(false);
        this.load();
        this.loadManufacturedItems();
      },
      error: (err) => {
        const httpErr = err as { error?: { errors?: unknown } };
        if (httpErr.error?.errors) this.fieldErrors.set(extractFieldErrors(httpErr.error.errors as never));
        this.notification.error(getApiErrorMessage(err, 'Failed to save product'));
      },
    });
  }

  onDelete(p: Product): void {
    this.confirm
      .open({
        title: 'Delete Product',
        message: `Deactivate "${p.name}"?`,
        confirmLabel: 'Delete',
        confirmDanger: true,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.production.deleteProduct(p.id).subscribe({
          next: () => {
            this.notification.success('Product deactivated');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e, 'Delete failed')),
        });
      });
  }
}
