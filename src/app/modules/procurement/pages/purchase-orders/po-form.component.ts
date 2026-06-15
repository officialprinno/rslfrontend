import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { Currency, Item } from '../../../../core/models/inventory.model';
import { PaymentTerms, PurchaseOrder, Supplier } from '../../../../core/models/procurement.model';
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
import { PAYMENT_TERMS } from '../../constants/procurement.constants';

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
    apply_vat: [true],
    notes: [''],
    lineItems: this.fb.array([]),
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    forkJoin({
      items: this.inventory.getItems({ page_size: 200, is_active: true }),
      suppliers: this.procurement.getSuppliers({ page_size: 100, is_active: true }),
      currencies: this.currencyService.getCurrencies(),
    }).subscribe(({ items, suppliers, currencies }) => {
      this.items.set(items.results);
      this.suppliers.set(suppliers.results);
      this.currencies.set(currencies);
      if (id) {
        this.editId.set(+id);
        this.loadPo(+id);
      } else {
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
    return this.items().map((i) => ({ value: i.id, label: `${i.code} — ${i.name}` }));
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
          apply_vat: po.apply_vat,
          notes: po.notes,
        });
        this.lineItems().clear();
        po.items.forEach((l) =>
          this.lineItems().push(
            this.fb.group({
              item: [l.item, Validators.required],
              quantity_ordered: [l.quantity_ordered, Validators.required],
              unit_price: [l.unit_price, Validators.required],
              discount_percent: [l.discount_percent ?? 0],
            }),
          ),
        );
      },
    });
  }

  addLine(): void {
    this.lineItems().push(
      this.fb.group({
        item: [null, Validators.required],
        quantity_ordered: [1, Validators.required],
        unit_price: [0, Validators.required],
        discount_percent: [0],
      }),
    );
  }

  removeLine(i: number): void {
    this.lineItems().removeAt(i);
  }

  lineTotal(i: number): number {
    const row = this.lineItems().at(i).value;
    const gross = Number(row.quantity_ordered) * Number(row.unit_price);
    return gross - gross * (Number(row.discount_percent) / 100);
  }

  subtotal(): number {
    return this.lineItems().controls.reduce((s, _, i) => s + this.lineTotal(i), 0);
  }

  taxAmount(): number {
    return this.form.value.apply_vat ? this.subtotal() * 0.18 : 0;
  }

  grandTotal(): number {
    return this.subtotal() + this.taxAmount();
  }

  onItemSelect(i: number, value: number | string | null): void {
    const id = typeof value === 'number' ? value : null;
    this.lineItems().at(i).patchValue({ item: id });
    const item = this.items().find((x) => x.id === id);
    if (item) this.lineItems().at(i).patchValue({ unit_price: item.unit_cost });
  }

  saveDraft(): void {
    this.save(false);
  }

  submit(): void {
    this.confirm.open({ title: 'Submit PO', message: 'Submit for approval?', confirmLabel: 'Submit' })
      .subscribe((ok) => { if (ok) this.save(true); });
  }

  private save(submit: boolean): void {
    if (this.form.invalid || !this.lineItems().length) {
      this.notification.error('Complete required fields and add items.');
      return;
    }
    const raw = this.form.getRawValue();
    const payload = {
      supplier: raw.supplier!,
      quotation: raw.quotation,
      requisition: raw.requisition,
      currency: raw.currency!,
      exchange_rate: Number(raw.exchange_rate),
      order_date: raw.order_date!,
      expected_delivery: raw.expected_delivery || null,
      payment_terms: raw.payment_terms!,
      apply_vat: !!raw.apply_vat,
      notes: raw.notes ?? '',
      items: (raw.lineItems as Array<{
        item: number | null;
        quantity_ordered: number;
        unit_price: number;
        discount_percent: number;
      }>).map((l) => ({
        item: l.item!,
        quantity_ordered: Number(l.quantity_ordered),
        unit_price: Number(l.unit_price),
        discount_percent: Number(l.discount_percent),
      })),
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
}
