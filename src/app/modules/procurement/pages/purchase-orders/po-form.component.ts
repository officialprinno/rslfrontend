import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { Currency, Item } from '../../../../core/models/inventory.model';
import { PaymentTerms, PaymentMode, POItem, PRLineType, PurchaseOrder, Supplier } from '../../../../core/models/procurement.model';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { CurrencyService } from '../../../../core/services/currency.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProcurementService } from '../../../../core/services/procurement.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency } from '../../../../core/utils/format.util';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';
import { ProcurementNavComponent } from '../../components/procurement-nav/procurement-nav.component';
import { PAYMENT_MODES, PAYMENT_TERMS } from '../../constants/procurement.constants';

const LINE_TYPE_OPTIONS: Array<{ value: PRLineType; label: string }> = [
  { value: 'INVENTORY', label: 'Inventory item' },
  { value: 'MANUAL', label: 'Manual entry' },
];

@Component({
  selector: 'app-po-form',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    ProcurementNavComponent,
    SearchableSelectComponent,
  ],
  templateUrl: './po-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PoFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly procurement = inject(ProcurementService);
  private readonly inventory = inject(InventoryService);
  private readonly currencyService = inject(CurrencyService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly items = signal<Item[]>([]);
  readonly suppliers = signal<Supplier[]>([]);
  readonly currencies = signal<Currency[]>([]);
  readonly saving = signal(false);
  readonly editId = signal<number | null>(null);
  readonly paymentTerms = PAYMENT_TERMS;
  readonly paymentModes = PAYMENT_MODES;
  readonly lineTypeOptions = LINE_TYPE_OPTIONS;
  readonly formatCurrency = formatCurrency;

  readonly form = this.fb.group({
    supplier: [null as number | null, Validators.required],
    quotation: [null as number | null],
    requisition: [null as number | null],
    currency: [null as number | null, Validators.required],
    exchange_rate: [1, Validators.required],
    order_date: [new Date().toISOString().slice(0, 10), Validators.required],
    expected_delivery: [''],
    payment_terms: ['NET_30' as PaymentTerms],
    payment_mode: ['POSTPAID' as PaymentMode],
    advance_percent: [0],
    notes: [''],
    lineItems: this.fb.array([]),
  });

  showAdvancePercent(): boolean {
    return this.form.controls.payment_mode.value === 'PARTIAL';
  }

  isStandardPaymentTerm(value: PaymentTerms | null): boolean {
    return !!value && this.paymentTerms.some((term) => term.value === value);
  }

  paymentTermLabel(value: PaymentTerms): string {
    const custom = /^NET_(\d{1,3})$/.exec(value);
    return custom ? `Net ${Number(custom[1])}` : value;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.form.controls.currency.valueChanges.subscribe((currencyId) => {
      if (this.editId()) return;
      const currency = this.currencies().find((row) => row.id === currencyId);
      if (currency) {
        this.form.controls.exchange_rate.setValue(
          currency.is_default || currency.code === 'TZS'
            ? 1
            : Number(currency.exchange_rate),
        );
      }
    });
    forkJoin({
      items: this.inventory.getAllItems({ is_active: true }),
      suppliers: this.procurement.getSuppliers({ page_size: 100, is_active: true }),
      currencies: this.currencyService.getCurrencies(),
    }).subscribe(({ items, suppliers, currencies }) => {
      this.items.set(items);
      this.suppliers.set(suppliers.results);
      this.currencies.set(currencies);
      if (id) {
        this.editId.set(+id);
        this.loadPo(+id);
      } else {
        const defaultCurrency = this.currencyService.resolveDefault(currencies);
        this.form.patchValue({
          currency: defaultCurrency?.id ?? null,
          exchange_rate: defaultCurrency?.code === 'TZS' ? 1 : defaultCurrency?.exchange_rate ?? 1,
        });
        this.addLine();
      }
    });
  }

  lineItems(): FormArray {
    return this.form.get('lineItems') as FormArray;
  }

  supplierOptions(): SelectOption[] {
    return this.suppliers().map((s) => ({ value: s.id, label: s.name }));
  }

  itemOptions(): SelectOption[] {
    return this.items().map((i) => ({
      value: i.id,
      label: `${i.code} — ${i.name}`,
      sublabel: `Unit: ${i.unit_of_measure || '—'}`,
      code: i.code,
      name: i.name,
    }));
  }

  isInventoryLine(i: number): boolean {
    return (this.lineItems().at(i).value.line_type as PRLineType) !== 'MANUAL';
  }

  lineUnit(i: number): string {
    const row = this.lineItems().at(i).value;
    const fromForm = String(row.unit_of_measure ?? '').trim();
    if (fromForm) return fromForm;
    const itemId = typeof row.item === 'number' ? row.item : null;
    return this.items().find((item) => item.id === itemId)?.unit_of_measure || 'unit';
  }

  loadPo(id: number): void {
    this.procurement.getPurchaseOrder(id).subscribe({
      next: (po: PurchaseOrder) => {
        this.form.patchValue({
          supplier: po.supplier,
          quotation: po.quotation,
          requisition: po.requisition,
          currency: po.currency,
          exchange_rate: po.exchange_rate,
          order_date: po.order_date,
          expected_delivery: po.expected_delivery ?? '',
          payment_terms: po.payment_terms,
          payment_mode: po.payment_mode ?? 'POSTPAID',
          advance_percent: Number(po.advance_percent ?? 0),
          notes: po.notes,
        });
        this.lineItems().clear();
        po.items.forEach((l) => this.lineItems().push(this.createLine(l)));
      },
    });
  }

  createLine(line?: POItem) {
    const lineType: PRLineType =
      line?.line_type ?? (line?.item ? 'INVENTORY' : line?.description ? 'MANUAL' : 'INVENTORY');
    const taxRate = Number(line?.tax_rate ?? 18);
    return this.fb.group({
      line_type: [lineType, Validators.required],
      item: [line?.item ?? null],
      description: [line?.description ?? ''],
      unit_of_measure: [line?.unit_of_measure ?? ''],
      quantity_ordered: [line?.quantity_ordered ?? 1, [Validators.required, Validators.min(0.0001)]],
      unit_price: [line?.unit_price ?? 0, Validators.required],
      discount_percent: [line?.discount_percent ?? 0],
      tax_rate: [taxRate],
      vat_enabled: [taxRate > 0],
    });
  }

  addLine(): void {
    this.lineItems().push(this.createLine());
  }

  removeLine(i: number): void {
    this.lineItems().removeAt(i);
  }

  onLineTypeChange(i: number, lineType: PRLineType): void {
    this.lineItems().at(i).patchValue({
      line_type: lineType,
      item: null,
      description: '',
      unit_of_measure: '',
    });
  }

  onVatToggle(i: number, checked: boolean): void {
    this.lineItems().at(i).patchValue({ vat_enabled: checked, tax_rate: checked ? 18 : 0 });
  }

  lineNetTotal(i: number): number {
    const row = this.lineItems().at(i).value;
    const gross = Number(row.quantity_ordered ?? 0) * Number(row.unit_price ?? 0);
    return gross - gross * (Number(row.discount_percent ?? 0) / 100);
  }

  lineVatAmount(i: number): number {
    return this.lineNetTotal(i) * (Number(this.lineItems().at(i).value.tax_rate ?? 0) / 100);
  }

  lineTotal(i: number): number {
    return this.lineNetTotal(i) + this.lineVatAmount(i);
  }

  subtotal(): number {
    return this.lineItems().controls.reduce((s, _, i) => s + this.lineNetTotal(i), 0);
  }

  taxAmount(): number {
    return this.lineItems().controls.reduce((s, _, i) => s + this.lineVatAmount(i), 0);
  }

  grandTotal(): number {
    return this.subtotal() + this.taxAmount();
  }

  onItemSelect(i: number, value: number | string | null): void {
    const id = typeof value === 'number' ? value : null;
    this.lineItems().at(i).patchValue({ item: id });
    const item = this.items().find((x) => x.id === id);
    if (item) {
      this.lineItems().at(i).patchValue({
        unit_price: item.unit_cost,
        unit_of_measure: item.unit_of_measure,
      });
    }
  }

  saveDraft(): void {
    this.save(false);
  }

  submit(): void {
    this.confirm.open({ title: 'Submit PO', message: 'Submit for approval?', confirmLabel: 'Submit' })
      .subscribe((ok) => { if (ok) this.save(true); });
  }

  private save(submit: boolean): void {
    const lineErrors = this.validateLines();
    if (lineErrors) {
      this.notification.error(lineErrors);
      return;
    }
    if (this.form.invalid || !this.lineItems().length) {
      this.form.markAllAsTouched();
      this.notification.error('Complete required fields and add items.');
      return;
    }
    const raw = this.form.getRawValue();
    const partial = raw.payment_mode === 'PARTIAL';
    const advancePercent = partial ? Number(raw.advance_percent ?? 0) : 0;
    if (partial && (!advancePercent || advancePercent <= 0 || advancePercent > 100)) {
      this.notification.error('Enter an advance percentage between 1 and 100 for partial payment.');
      return;
    }
    const items = (raw.lineItems as Array<{
      line_type: PRLineType;
      item: number | null;
      description: string;
      unit_of_measure: string;
      quantity_ordered: number;
      unit_price: number;
      discount_percent: number;
      tax_rate: number;
    }>).map((l) => ({
      line_type: l.line_type,
      item: l.line_type === 'INVENTORY' ? l.item : null,
      description: l.line_type === 'MANUAL' ? (l.description || '').trim() : '',
      unit_of_measure: (l.unit_of_measure || '').trim(),
      quantity_ordered: Number(l.quantity_ordered),
      unit_price: Number(l.unit_price),
      discount_percent: Number(l.discount_percent),
      tax_rate: Number(l.tax_rate ?? 0),
    }));
    const payload = {
      supplier: raw.supplier!,
      quotation: raw.quotation,
      requisition: raw.requisition,
      currency: raw.currency!,
      exchange_rate: Number(raw.exchange_rate),
      order_date: raw.order_date!,
      expected_delivery: raw.expected_delivery || null,
      payment_terms: raw.payment_terms!,
      payment_mode: raw.payment_mode!,
      advance_percent: advancePercent,
      apply_vat: items.some((l) => l.tax_rate > 0),
      notes: raw.notes ?? '',
      items,
    };
    this.saving.set(true);
    const id = this.editId();
    const req$ = id
      ? this.procurement.updatePurchaseOrder(id, payload)
      : this.procurement.createPurchaseOrder(payload);
    req$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (po) => {
        const done = () => {
          this.notification.success(submit ? 'PO submitted' : 'Draft saved');
          void this.router.navigate(['/procurement/purchase-orders']);
        };
        if (submit) {
          this.procurement.submitPurchaseOrder(po.id).subscribe({ next: done, error: (e) => this.notification.error(getApiErrorMessage(e)) });
        } else done();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  private validateLines(): string | null {
    if (!this.lineItems().length) {
      return 'Add at least one item.';
    }
    for (let i = 0; i < this.lineItems().length; i++) {
      const line = this.lineItems().at(i).value as {
        line_type: PRLineType;
        item: number | null;
        description: string;
      };
      if (line.line_type === 'MANUAL') {
        if (!line.description?.trim()) {
          return `Line ${i + 1}: enter a description for the manual item.`;
        }
      } else if (!line.item) {
        return `Line ${i + 1}: select an inventory item or switch to manual entry.`;
      }
    }
    return null;
  }
}
