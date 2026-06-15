import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';

import { Item } from '../../../../core/models/inventory.model';
import { BOMFormData, Product } from '../../../../core/models/production.model';
import { AuthService } from '../../../../core/services/auth.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProductionService } from '../../../../core/services/production.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatNumber } from '../../../../core/utils/format.util';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';
import { ProductionNavComponent } from '../../components/production-nav/production-nav.component';
import { canActivateBOM, canManageBOM } from '../../utils/production-permissions.util';

@Component({
  selector: 'app-bom-form',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    ProductionNavComponent,
    SearchableSelectComponent,
  ],
  templateUrl: './bom-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BomFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly production = inject(ProductionService);
  private readonly inventory = inject(InventoryService);
  private readonly notification = inject(NotificationService);
  private readonly auth = inject(AuthService);

  readonly products = signal<Product[]>([]);
  readonly rawMaterials = signal<Item[]>([]);
  readonly saving = signal(false);
  readonly editId = signal<number | null>(null);
  readonly bomStatus = signal<string>('DRAFT');

  readonly formatCurrency = formatCurrency;
  readonly formatNumber = formatNumber;
  readonly canSave = () => canManageBOM(this.auth);
  readonly canActivate = () => canActivateBOM(this.auth);

  readonly form = this.fb.group({
    product: [null as number | null, Validators.required],
    version: ['1.0', Validators.required],
    notes: [''],
    items: this.fb.array([]),
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    forkJoin({
      products: this.production.getProducts({ page_size: 100, is_active: true }),
      materials: this.inventory.getItems({ page_size: 500, is_active: true, item_type: 'RAW_MATERIAL' }),
    }).subscribe(({ products, materials }) => {
      this.products.set(products.results);
      this.rawMaterials.set(materials.results);
      if (id) {
        this.editId.set(+id);
        this.loadBOM(+id);
      } else {
        this.addComponent();
      }
    });
  }

  items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  productOptions(): SelectOption[] {
    return this.products().map((p) => ({
      value: p.id,
      label: p.name,
      sublabel: p.item_code,
    }));
  }

  materialOptions(excludeIndex?: number): SelectOption[] {
    const usedIds = new Set(
      this.items()
        .controls.map((c, i) => (i === excludeIndex ? null : c.value.item))
        .filter(Boolean),
    );
    return this.rawMaterials()
      .filter((m) => !usedIds.has(m.id))
      .map((m) => ({
        value: m.id,
        label: `${m.code} — ${m.name}`,
        sublabel: `${m.unit_of_measure} · ${formatCurrency(m.unit_cost)}`,
      }));
  }

  loadBOM(id: number): void {
    this.production.getBOM(id).subscribe({
      next: (bom) => {
        if (bom.status === 'ACTIVE') {
          this.notification.error('Active BOMs cannot be edited. Duplicate to create a new version.');
          void this.router.navigate(['/production/bom']);
          return;
        }
        this.bomStatus.set(bom.status);
        this.form.patchValue({
          product: bom.product_id,
          version: bom.version,
          notes: bom.notes,
        });
        this.items().clear();
        bom.items.forEach((item) => this.addComponent(item.item, item.quantity_required, item.wastage_percent, item.notes));
        if (!bom.items.length) this.addComponent();
      },
      error: (e) => {
        this.notification.error(getApiErrorMessage(e, 'Failed to load BOM'));
        void this.router.navigate(['/production/bom']);
      },
    });
  }

  addComponent(itemId?: number, qty = 1, wastage = 0, notes = ''): void {
    this.items().push(
      this.fb.group({
        item: [itemId ?? null, Validators.required],
        quantity_required: [qty, [Validators.required, Validators.min(0.0001)]],
        wastage_percent: [wastage, [Validators.required, Validators.min(0), Validators.max(100)]],
        notes: [notes],
      }),
    );
  }

  removeComponent(index: number): void {
    if (this.items().length <= 1) {
      this.notification.error('BOM must have at least one component.');
      return;
    }
    this.items().removeAt(index);
  }

  onProductSelect(productId: number | string | null): void {
    this.form.controls.product.setValue(productId as number | null);
  }

  onMaterialSelect(index: number, itemId: number | string | null): void {
    this.items().at(index).patchValue({ item: itemId });
  }

  effectiveQty(index: number): number {
    const line = this.items().at(index).value;
    const qty = Number(line.quantity_required ?? 0);
    const wastage = Number(line.wastage_percent ?? 0);
    return qty * (1 + wastage / 100);
  }

  unitCost(index: number): number {
    const itemId = this.items().at(index).value.item;
    const material = this.rawMaterials().find((m) => m.id === itemId);
    return material?.unit_cost ?? 0;
  }

  lineCost(index: number): number {
    return this.effectiveQty(index) * this.unitCost(index);
  }

  totalMaterialCost(): number {
    return this.items().controls.reduce((sum, _, i) => sum + this.lineCost(i), 0);
  }

  buildPayload(): BOMFormData {
    const raw = this.form.getRawValue();
    return {
      product: raw.product!,
      version: (raw.version ?? '').trim(),
      notes: raw.notes ?? '',
      items: this.items().controls.map((c) => ({
        item: c.value.item,
        quantity_required: Number(c.value.quantity_required),
        wastage_percent: Number(c.value.wastage_percent),
        notes: c.value.notes ?? '',
      })),
    };
  }

  saveDraft(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.error('Please complete all required fields.');
      return;
    }
    this.saving.set(true);
    const payload = this.buildPayload();
    const editId = this.editId();
    const req$ = editId
      ? this.production.updateBOM(editId, payload)
      : this.production.createBOM(payload);

    req$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (bom) => {
        this.notification.success(editId ? 'BOM saved' : 'BOM created as draft');
        if (!editId) {
          this.editId.set(bom.id);
          void this.router.navigate(['/production/bom', bom.id, 'edit'], { replaceUrl: true });
        }
      },
      error: (e) => this.notification.error(getApiErrorMessage(e, 'Failed to save BOM')),
    });
  }

  saveAndActivate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.error('Please complete all required fields.');
      return;
    }
    if (!this.canActivate()) {
      this.notification.error('You do not have permission to activate BOMs.');
      return;
    }
    this.saving.set(true);
    const payload = this.buildPayload();
    const editId = this.editId();
    const save$ = editId
      ? this.production.updateBOM(editId, payload)
      : this.production.createBOM(payload);

    save$
      .pipe(
        switchMap((bom) => this.production.activateBOM(bom.id)),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.notification.success('BOM activated');
          void this.router.navigate(['/production/bom']);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e, 'Failed to activate BOM')),
      });
  }
}
