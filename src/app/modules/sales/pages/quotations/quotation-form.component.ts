import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';

import { Currency, Item } from '../../../../core/models/inventory.model';
import { Customer, QuotationFormData, QuotationStatus } from '../../../../core/models/sales.model';
import { CurrencyService } from '../../../../core/services/currency.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SalesService } from '../../../../core/services/sales.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency } from '../../../../core/utils/format.util';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';
import { SalesNavComponent } from '../../components/sales-nav/sales-nav.component';
import { DEFAULT_QUOTATION_TERMS } from '../../constants/sales.constants';

@Component({
  selector: 'app-quotation-form',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    SalesNavComponent,
    SearchableSelectComponent,
  ],
  templateUrl: './quotation-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuotationFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sales = inject(SalesService);
  private readonly inventory = inject(InventoryService);
  private readonly currencyService = inject(CurrencyService);
  private readonly notification = inject(NotificationService);

  readonly items = signal<Item[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly currencies = signal<Currency[]>([]);
  readonly saving = signal(false);
  readonly editId = signal<number | null>(null);
  readonly editStatus = signal<QuotationStatus | null>(null);
  readonly formatCurrency = formatCurrency;

  readonly form = this.fb.group({
    customer: [null as number | null, Validators.required],
    currency: [null as number | null, Validators.required],
    exchange_rate: [1, Validators.required],
    valid_until: ['', Validators.required],
    apply_vat: [true],
    delivery_cost: [0, Validators.min(0)],
    notes: [''],
    terms_conditions: [DEFAULT_QUOTATION_TERMS],
    lineItems: this.fb.array([]),
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    forkJoin({
      items: this.inventory.getItems({ page_size: 500, is_active: true }),
      customers: this.sales.getCustomers({ page_size: 100, is_active: true }),
      currencies: this.currencyService.getCurrencies(),
    }).subscribe(({ items, customers, currencies }) => {
      this.items.set(
        items.results.filter((i) => i.item_type === 'TRADED' || i.item_type === 'MANUFACTURED'),
      );
      this.customers.set(customers.results);
      this.currencies.set(currencies);
      if (id) {
        this.editId.set(+id);
        this.loadQuotation(+id);
      } else {
        const defaultValid = new Date();
        defaultValid.setDate(defaultValid.getDate() + 30);
        this.form.patchValue({ valid_until: defaultValid.toISOString().slice(0, 10) });
        this.addLine();
      }
    });
  }

  lineItems(): FormArray {
    return this.form.get('lineItems') as FormArray;
  }

  customerOptions(): SelectOption[] {
    return this.customers().map((c) => ({
      value: c.id,
      label: c.name,
      sublabel: c.mine_name,
    }));
  }

  itemOptions(): SelectOption[] {
    return this.items().map((i) => ({ value: i.id, label: `${i.code} — ${i.name}` }));
  }

  loadQuotation(id: number): void {
    this.sales.getQuotation(id).subscribe({
      next: (q) => {
        const editable =
          q.status === 'DRAFT' ||
          ((q.status === 'SENT' || q.status === 'ACCEPTED') && !q.has_sales_order);
        if (!editable) {
          this.notification.error('This quotation cannot be edited.');
          void this.router.navigate(['/sales/quotations', id, 'view']);
          return;
        }
        this.editStatus.set(q.status);
        this.form.patchValue({
          customer: q.customer,
          currency: q.currency,
          exchange_rate: q.exchange_rate,
          valid_until: q.valid_until,
          apply_vat: q.apply_vat,
          delivery_cost: q.delivery_cost ?? 0,
          notes: q.notes,
          terms_conditions: q.terms_conditions,
        });
        this.lineItems().clear();
        q.items.forEach((l) =>
          this.lineItems().push(
            this.fb.group({
              item: [l.item, Validators.required],
              description: [l.description ?? ''],
              quantity: [l.quantity, Validators.required],
              unit_price: [l.unit_price, Validators.required],
              discount_percent: [l.discount_percent ?? 0],
            }),
          ),
        );
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  onCustomerSelect(value: number | string | null): void {
    const id = typeof value === 'number' ? value : null;
    this.form.patchValue({ customer: id });
    const customer = this.customers().find((c) => c.id === id);
    if (customer) {
      this.form.patchValue({ currency: customer.currency });
    }
  }

  addLine(): void {
    this.lineItems().push(
      this.fb.group({
        item: [null, Validators.required],
        description: [''],
        quantity: [1, Validators.required],
        unit_price: [0, Validators.required],
        discount_percent: [0],
      }),
    );
  }

  removeLine(i: number): void {
    this.lineItems().removeAt(i);
  }

  onItemSelect(i: number, value: number | string | null): void {
    const id = typeof value === 'number' ? value : null;
    this.lineItems().at(i).patchValue({ item: id });
    const item = this.items().find((x) => x.id === id);
    if (item) this.lineItems().at(i).patchValue({ unit_price: item.selling_price });
  }

  lineTotal(i: number): number {
    const row = this.lineItems().at(i).value;
    const gross = Number(row.quantity) * Number(row.unit_price);
    return gross - gross * (Number(row.discount_percent) / 100);
  }

  subtotal(): number {
    return this.lineItems().controls.reduce((s, _, i) => s + this.lineTotal(i), 0);
  }

  taxAmount(): number {
    return this.form.value.apply_vat ? this.subtotal() * 0.18 : 0;
  }

  deliveryCostAmount(): number {
    return Number(this.form.value.delivery_cost ?? 0);
  }

  grandTotal(): number {
    return this.subtotal() + this.taxAmount() + Number(this.form.value.delivery_cost ?? 0);
  }

  canSendOnSave(): boolean {
    return !this.editId() || this.editStatus() === 'DRAFT';
  }

  saveDraft(): void {
    this.save(false);
  }

  saveAndSend(): void {
    this.save(true);
  }

  private save(send: boolean): void {
    if (this.form.invalid || !this.lineItems().length) {
      this.form.markAllAsTouched();
      this.notification.error('Complete required fields and add items.');
      return;
    }
    const raw = this.form.getRawValue();
    const payload: QuotationFormData = {
      customer: raw.customer!,
      currency: raw.currency!,
      exchange_rate: Number(raw.exchange_rate),
      valid_until: raw.valid_until!,
      apply_vat: !!raw.apply_vat,
      delivery_cost: Number(raw.delivery_cost ?? 0),
      notes: raw.notes ?? '',
      terms_conditions: raw.terms_conditions ?? '',
      items: (
        raw.lineItems as Array<{
          item: number | null;
          description: string;
          quantity: number;
          unit_price: number;
          discount_percent: number;
        }>
      ).map((l) => ({
        item: l.item!,
        description: l.description ?? '',
        quantity: Number(l.quantity),
        unit_price: Number(l.unit_price),
        discount_percent: Number(l.discount_percent),
      })),
    };
    this.saving.set(true);
    const id = this.editId();
    const save$ = id
      ? this.sales.updateQuotation(id, payload)
      : this.sales.createQuotation(payload);
    save$
      .pipe(
        switchMap((q) => (send ? this.sales.sendQuotation(q.id) : of(q))),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (q) => {
          this.notification.success(send ? 'Quotation saved and sent' : 'Draft saved');
          void this.router.navigate(['/sales/quotations', q.id, 'view']);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }
}
