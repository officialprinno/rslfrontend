import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { ApiResponse } from '../../../../core/models/auth.models';
import { Category, Currency, Item, ItemFormData } from '../../../../core/models/inventory.model';
import { CurrencyService } from '../../../../core/services/currency.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { extractFieldErrors } from '../../../../core/utils/api.util';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { generateItemCode, DIMENSION_UNITS, ITEM_TYPES, ITEM_TYPE_LABELS, ITEM_USAGE_OPTIONS, UNITS_OF_MEASURE, WEIGHT_UNITS } from '../../constants/inventory.constants';

@Component({
  selector: 'app-item-form-modal',
  imports: [FormsModule, ReactiveFormsModule, ModalComponent],
  templateUrl: './item-form-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly inventory = inject(InventoryService);
  private readonly currencyService = inject(CurrencyService);
  private readonly notification = inject(NotificationService);

  readonly open = input(false);
  readonly item = input<Item | null>(null);
  readonly categories = input<Category[]>([]);

  readonly closed = output<void>();
  readonly saved = output<Item>();

  readonly loading = signal(false);
  readonly fieldErrors = signal<Record<string, string>>({});
  readonly currencies = signal<Currency[]>([]);
  readonly categoriesList = signal<Category[]>([]);

  readonly itemTypes = ITEM_TYPES;
  readonly itemUsageOptions = ITEM_USAGE_OPTIONS;
  readonly units = UNITS_OF_MEASURE;
  readonly dimensionUnits = DIMENSION_UNITS;
  readonly weightUnits = WEIGHT_UNITS;
  readonly itemTypeLabel = (t: ItemFormData['item_type']) => ITEM_TYPE_LABELS[t];

  readonly form = this.fb.nonNullable.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    description: [''],
    category: [null as number | null, Validators.required],
    item_type: ['TRADED' as ItemFormData['item_type'], Validators.required],
    item_usage: ['BOTH' as ItemFormData['item_usage'], Validators.required],
    unit_of_measure: ['pieces', Validators.required],
    has_serial_number: [false],
    has_expiry_date: [false],
    reorder_level: [0, [Validators.required, Validators.min(0)]],
    currency: [null as number | null, Validators.required],
    unit_cost: [0, [Validators.required, Validators.min(0)]],
    length: [null as number | null, [Validators.min(0)]],
    width: [null as number | null, [Validators.min(0)]],
    height: [null as number | null, [Validators.min(0)]],
    thickness: [null as number | null, [Validators.min(0)]],
    diameter: [null as number | null, [Validators.min(0)]],
    dimension_unit: ['m'],
    weight_per_unit: [null as number | null, [Validators.min(0)]],
    weight_unit: ['Kg'],
    is_active: [true],
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        this.loadCurrencies();
        this.loadCategories();
        this.patchForm();
      }
    });
  }

  private loadCategories(): void {
    this.inventory.getCategories({ is_active: true }).subscribe({
      next: (data) => this.categoriesList.set(data),
      error: () => this.notification.error('Failed to load categories'),
    });
  }

  private loadCurrencies(): void {
    this.currencyService.getCurrencies().subscribe({
      next: (data) => {
        this.currencies.set(data);
        const defaultCurrency = data.find((c) => c.is_default) ?? data[0];
        if (!this.item() && defaultCurrency) {
          this.form.patchValue({ currency: defaultCurrency.id });
        }
      },
      error: () => this.notification.error('Failed to load currencies'),
    });
  }

  private patchForm(): void {
    this.fieldErrors.set({});
    const editing = this.item();
    if (editing) {
      this.form.patchValue({
        code: editing.code,
        name: editing.name,
        description: editing.description,
        category: editing.category,
        item_type: editing.item_type,
        item_usage: editing.item_usage ?? 'BOTH',
        unit_of_measure: editing.unit_of_measure,
        has_serial_number: editing.has_serial_number,
        has_expiry_date: editing.has_expiry_date,
        reorder_level: editing.reorder_level,
        currency: editing.currency,
        unit_cost: editing.unit_cost,
        length: editing.length ?? null,
        width: editing.width ?? null,
        height: editing.height ?? null,
        thickness: editing.thickness ?? null,
        diameter: editing.diameter ?? null,
        dimension_unit: editing.dimension_unit || 'm',
        weight_per_unit: editing.weight_per_unit ?? null,
        weight_unit: editing.weight_unit || 'Kg',
        is_active: editing.is_active,
      });
    } else {
      this.form.reset({
        code: generateItemCode(),
        name: '',
        description: '',
        category: null,
        item_type: 'TRADED',
        item_usage: 'BOTH',
        unit_of_measure: 'pieces',
        has_serial_number: false,
        has_expiry_date: false,
        reorder_level: 0,
        currency: null,
        unit_cost: 0,
        length: null,
        width: null,
        height: null,
        thickness: null,
        diameter: null,
        dimension_unit: 'm',
        weight_per_unit: null,
        weight_unit: 'Kg',
        is_active: true,
      });
    }
  }

  title(): string {
    return this.item() ? 'Edit Item' : 'Add Item';
  }

  onClose(): void {
    this.closed.emit();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.fieldErrors.set({});
    const raw = this.form.getRawValue();
    const optionalNum = (v: number | null | undefined) =>
      v === null || v === undefined || v === ('' as unknown as number) ? null : Number(v);
    const data: ItemFormData = {
      ...raw,
      category: Number(raw.category),
      currency: Number(raw.currency),
      reorder_level: Number(raw.reorder_level),
      unit_cost: Number(raw.unit_cost),
      length: optionalNum(raw.length),
      width: optionalNum(raw.width),
      height: optionalNum(raw.height),
      thickness: optionalNum(raw.thickness),
      diameter: optionalNum(raw.diameter),
      dimension_unit: raw.dimension_unit || 'm',
      weight_per_unit: optionalNum(raw.weight_per_unit),
      weight_unit: raw.weight_unit || 'Kg',
    };
    const editing = this.item();
    const request$ = editing
      ? this.inventory.updateItem(editing.id, data)
      : this.inventory.createItem(data);

    request$
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (saved) => {
          this.notification.success(editing ? 'Item updated successfully' : 'Item created successfully');
          this.saved.emit(saved);
          this.closed.emit();
        },
        error: (err: { error?: ApiResponse<unknown>; message?: string }) => {
          if (err.error?.errors) {
            this.fieldErrors.set(extractFieldErrors(err.error.errors));
          }
          this.notification.error(err.error?.message ?? err.message ?? 'Failed to save item');
        },
      });
  }

  fieldError(field: string): string | null {
    const api = this.fieldErrors()[field];
    if (api) return api;
    const control = this.form.get(field);
    if (control?.touched && control.errors?.['required']) return 'This field is required';
    if (control?.touched && control.errors?.['min']) return 'Value must be 0 or greater';
    return null;
  }
}
