import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { Currency, Item } from '../../../../core/models/inventory.model';
import { Customer, Quotation, SalesOrder, SOFormData } from '../../../../core/models/sales.model';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { CurrencyService } from '../../../../core/services/currency.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SalesService } from '../../../../core/services/sales.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency } from '../../../../core/utils/format.util';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import {
  SearchableSelectComponent,
  SelectOption,
} from '../../../../shared/components/searchable-select/searchable-select.component';
import { SalesNavComponent } from '../../components/sales-nav/sales-nav.component';

@Component({
  selector: 'app-so-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    SalesNavComponent,
    SearchableSelectComponent,
  ],
  templateUrl: './so-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SoFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sales = inject(SalesService);
  private readonly inventory = inject(InventoryService);
  private readonly currencyService = inject(CurrencyService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly customers = signal<Customer[]>([]);
  readonly quotations = signal<Quotation[]>([]);
  readonly items = signal<Item[]>([]);
  readonly currencies = signal<Currency[]>([]);
  readonly stockMap = signal<Map<number, number>>(new Map());
  readonly selectedCustomer = signal<Customer | null>(null);
  readonly saving = signal(false);
  readonly editId = signal<number | null>(null);
  readonly formatCurrency = formatCurrency;

  readonly form = this.fb.group({
    customer: [null as number | null, Validators.required],
    quotation: [null as number | null],
    lpo_number: [''],
    lpo_date: [''],
    currency: [null as number | null, Validators.required],
    exchange_rate: [1, Validators.required],
    delivery_date: ['', Validators.required],
    delivery_address: [''],
    requested_delivery_location: [''],
    apply_vat: [true],
    notes: [''],
    lineItems: this.fb.array([]),
  });

  readonly creditWarning = computed(() => {
    const customer = this.selectedCustomer();
    if (!customer || !customer.credit_limit) return null;
    const outstanding = Number(customer.outstanding_balance ?? customer.credit_balance ?? 0);
    const projected = outstanding + this.grandTotal();
    if (projected > Number(customer.credit_limit)) {
      return {
        limit: customer.credit_limit,
        projected,
        outstanding,
      };
    }
    return null;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const quotationId = this.route.snapshot.queryParamMap.get('quotation');

    forkJoin({
      customers: this.sales.getCustomers({ page_size: 100, is_active: true }),
      quotations: this.sales.getQuotations({ status: 'ACCEPTED', page_size: 100 }),
      items: this.inventory.getItems({ page_size: 200, is_active: true }),
      currencies: this.currencyService.getCurrencies(),
      stock: this.inventory.getStockQuantitiesByItem(),
    }).subscribe(({ customers, quotations, items, currencies, stock }) => {
      this.customers.set(customers.results);
      this.quotations.set(quotations.results);
      this.items.set(items.results);
      this.currencies.set(currencies);
      this.stockMap.set(stock);

      if (id) {
        this.editId.set(+id);
        this.loadOrder(+id);
      } else {
        this.addLine();
        if (quotationId) {
          this.form.patchValue({ quotation: +quotationId });
          this.onQuotationSelect(+quotationId);
        }
      }
    });
  }

  lineItems(): FormArray {
    return this.form.get('lineItems') as FormArray;
  }

  customerOptions(): SelectOption[] {
    return this.customers().map((c) => ({ value: c.id, label: c.name }));
  }

  quotationOptions(): SelectOption[] {
    return this.quotations().map((q) => ({
      value: q.id,
      label: `${q.quotation_number} — ${q.customer_name}`,
    }));
  }

  itemOptions(): SelectOption[] {
    return this.items().map((i) => ({ value: i.id, label: `${i.code} — ${i.name}` }));
  }

  stockAvailable(itemId: number | null, lineStock?: number | null): number {
    if (lineStock != null) return lineStock;
    if (!itemId) return 0;
    return this.stockMap().get(itemId) ?? 0;
  }

  loadOrder(id: number): void {
    this.sales.getSalesOrder(id).subscribe({
      next: (so: SalesOrder) => {
        this.form.patchValue({
          customer: so.customer,
          quotation: so.quotation,
          lpo_number: so.lpo_number ?? '',
          lpo_date: so.lpo_date ?? '',
          currency: so.currency,
          exchange_rate: so.exchange_rate,
          delivery_date: so.delivery_date,
          delivery_address: so.delivery_address ?? '',
          requested_delivery_location: so.requested_delivery_location ?? so.delivery_address ?? '',
          apply_vat: so.apply_vat,
          notes: so.notes ?? '',
        });
        this.onCustomerSelect(so.customer);
        this.lineItems().clear();
        so.items.forEach((l) =>
          this.lineItems().push(
            this.fb.group({
              item: [l.item, Validators.required],
              quantity_ordered: [l.quantity_ordered, Validators.required],
              unit_price: [l.unit_price, Validators.required],
              discount_percent: [l.discount_percent ?? 0],
              stock_available: [l.stock_available ?? null],
            }),
          ),
        );
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  onCustomerSelect(customerId: number | string | null): void {
    const id = typeof customerId === 'number' ? customerId : null;
    this.form.patchValue({ customer: id });
    const customer = this.customers().find((c) => c.id === id) ?? null;
    this.selectedCustomer.set(customer);
    if (customer) {
      this.form.patchValue({
        currency: customer.currency_id ?? customer.currency,
        delivery_address: customer.address ?? '',
      });
    }
  }

  onQuotationSelect(quotationId: number | string | null): void {
    const id = typeof quotationId === 'number' ? quotationId : null;
    this.form.patchValue({ quotation: id });
    if (!id) return;
    this.sales.getQuotation(id).subscribe({
      next: (q) => {
        this.form.patchValue({
          customer: q.customer_id,
          currency: q.currency_id,
          exchange_rate: q.exchange_rate,
          apply_vat: q.apply_vat,
          notes: q.notes ?? '',
        });
        this.onCustomerSelect(q.customer_id);
        this.lineItems().clear();
        q.items.forEach((l) => {
          const itemId = l.item_id ?? l.item;
          this.lineItems().push(
            this.fb.group({
              item: [itemId, Validators.required],
              quantity_ordered: [l.quantity, Validators.required],
              unit_price: [l.unit_price, Validators.required],
              discount_percent: [l.discount_percent ?? 0],
              stock_available: [this.stockMap().get(itemId) ?? null],
            }),
          );
        });
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
        stock_available: [null as number | null],
      }),
    );
  }

  removeLine(i: number): void {
    this.lineItems().removeAt(i);
  }

  onItemSelect(i: number, value: number | string | null): void {
    const id = typeof value === 'number' ? value : null;
    const available = id ? this.stockMap().get(id) ?? 0 : null;
    this.lineItems().at(i).patchValue({ item: id, stock_available: available });
    const item = this.items().find((x) => x.id === id);
    if (item) {
      this.lineItems().at(i).patchValue({ unit_price: item.selling_price ?? item.unit_cost ?? 0 });
    }
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

  hasStockIssue(): boolean {
    return this.lineItems().controls.some((ctrl, i) => {
      const v = ctrl.value;
      const available = this.stockAvailable(v.item, v.stock_available);
      return Number(v.quantity_ordered) > available;
    });
  }

  saveDraft(): void {
    this.save(false);
  }

  confirmOrder(): void {
    if (this.hasStockIssue()) {
      this.notification.error('One or more line items exceed available stock.');
      return;
    }
    const warning = this.creditWarning();
    const message = warning
      ? `This order will exceed the customer's credit limit (${formatCurrency(warning.limit)}). Confirm anyway?`
      : 'Confirm this sales order?';
    this.confirm
      .open({ title: 'Confirm Sales Order', message, confirmLabel: 'Confirm Order' })
      .subscribe((ok) => {
        if (ok) this.save(true);
      });
  }

  private save(confirm: boolean): void {
    if (this.form.invalid || !this.lineItems().length) {
      this.notification.error('Complete required fields and add items.');
      return;
    }
    const raw = this.form.getRawValue();
    const payload: SOFormData = {
      customer: raw.customer!,
      quotation: raw.quotation,
      lpo_number: raw.lpo_number || undefined,
      lpo_date: raw.lpo_date || undefined,
      currency: raw.currency!,
      exchange_rate: Number(raw.exchange_rate),
      delivery_date: raw.delivery_date!,
      delivery_address: raw.delivery_address ?? '',
      requested_delivery_location: raw.requested_delivery_location ?? raw.delivery_address ?? '',
      apply_vat: !!raw.apply_vat,
      notes: raw.notes ?? '',
      items: (
        raw.lineItems as Array<{
          item: number | null;
          quantity_ordered: number;
          unit_price: number;
          discount_percent: number;
        }>
      ).map((l) => ({
        item: l.item!,
        quantity_ordered: Number(l.quantity_ordered),
        unit_price: Number(l.unit_price),
        discount_percent: Number(l.discount_percent),
      })),
    };

    this.saving.set(true);
    const id = this.editId();
    const req$ = id ? this.sales.updateSalesOrder(id, payload) : this.sales.createSalesOrder(payload);
    req$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (so) => {
        const done = () => {
          this.notification.success(confirm ? 'Sales order confirmed' : 'Draft saved');
          void this.router.navigate(['/sales/orders', so.id, 'view']);
        };
        if (confirm) {
          this.sales.confirmSalesOrder(so.id).subscribe({
            next: done,
            error: (e) => this.notification.error(getApiErrorMessage(e)),
          });
        } else {
          done();
        }
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }
}
