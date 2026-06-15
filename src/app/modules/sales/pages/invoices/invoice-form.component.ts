import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { Currency, Item } from '../../../../core/models/inventory.model';
import { InvoiceFormData, SalesOrder } from '../../../../core/models/sales.model';
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
  selector: 'app-invoice-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    SalesNavComponent,
    SearchableSelectComponent,
  ],
  templateUrl: './invoice-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sales = inject(SalesService);
  private readonly inventory = inject(InventoryService);
  private readonly currencyService = inject(CurrencyService);
  private readonly notification = inject(NotificationService);

  readonly salesOrders = signal<SalesOrder[]>([]);
  readonly items = signal<Item[]>([]);
  readonly currencies = signal<Currency[]>([]);
  readonly saving = signal(false);
  readonly editId = signal<number | null>(null);
  readonly formatCurrency = formatCurrency;

  readonly form = this.fb.group({
    customer: [{ value: null as number | null, disabled: true }, Validators.required],
    sales_order: [null as number | null],
    currency: [null as number | null, Validators.required],
    exchange_rate: [1, Validators.required],
    invoice_date: [new Date().toISOString().slice(0, 10), Validators.required],
    due_date: ['', Validators.required],
    tra_receipt_number: [''],
    lineItems: this.fb.array([]),
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const soId = this.route.snapshot.queryParamMap.get('so');

    forkJoin({
      orders: this.sales.getSalesOrders({
        status: 'CONFIRMED,PROCESSING,PARTIAL,DELIVERED',
        page_size: 100,
      }),
      items: this.inventory.getItems({ page_size: 200, is_active: true }),
      currencies: this.currencyService.getCurrencies(),
    }).subscribe(({ orders, items, currencies }) => {
      this.salesOrders.set(orders.results);
      this.items.set(items.results);
      this.currencies.set(currencies);

      if (id) {
        this.editId.set(+id);
        this.loadInvoice(+id);
      } else {
        this.addLine();
        if (soId) {
          this.form.patchValue({ sales_order: +soId });
          this.onSalesOrderSelect(+soId);
        }
      }
    });
  }

  lineItems(): FormArray {
    return this.form.get('lineItems') as FormArray;
  }

  salesOrderOptions(): SelectOption[] {
    return this.salesOrders().map((so) => ({
      value: so.id,
      label: `${so.so_number} — ${so.customer_name}`,
    }));
  }

  loadInvoice(id: number): void {
    this.sales.getInvoice(id).subscribe({
      next: (inv) => {
        this.form.patchValue({
          customer: inv.customer_id,
          sales_order: inv.so_id,
          currency: inv.currency_id,
          exchange_rate: inv.exchange_rate,
          invoice_date: inv.invoice_date,
          due_date: inv.due_date,
          tra_receipt_number: inv.tra_receipt_number ?? '',
        });
        this.lineItems().clear();
        inv.items.forEach((l) =>
          this.lineItems().push(
            this.fb.group({
              item: [l.item, Validators.required],
              quantity: [l.quantity, Validators.required],
              unit_price: [l.unit_price, Validators.required],
              discount_percent: [l.discount_percent ?? 0],
              tax_rate: [l.tax_rate ?? 18],
            }),
          ),
        );
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  onSalesOrderSelect(soId: number | string | null): void {
    const id = typeof soId === 'number' ? soId : null;
    this.form.patchValue({ sales_order: id });
    if (!id) return;

    this.sales.getSalesOrder(id).subscribe({
      next: (so) => {
        this.form.patchValue({
          customer: so.customer_id,
          currency: so.currency_id,
          exchange_rate: so.exchange_rate,
        });
        this.lineItems().clear();
        so.items.forEach((l) =>
          this.lineItems().push(
            this.fb.group({
              item: [l.item, Validators.required],
              quantity: [l.quantity_ordered, Validators.required],
              unit_price: [l.unit_price, Validators.required],
              discount_percent: [l.discount_percent ?? 0],
              tax_rate: [so.apply_vat ? 18 : 0],
            }),
          ),
        );
        if (!this.form.value.due_date) {
          const due = new Date();
          due.setDate(due.getDate() + 30);
          this.form.patchValue({ due_date: due.toISOString().slice(0, 10) });
        }
      },
    });
  }

  addLine(): void {
    this.lineItems().push(
      this.fb.group({
        item: [null, Validators.required],
        quantity: [1, Validators.required],
        unit_price: [0, Validators.required],
        discount_percent: [0],
        tax_rate: [18],
      }),
    );
  }

  removeLine(i: number): void {
    this.lineItems().removeAt(i);
  }

  lineTotal(i: number): number {
    const row = this.lineItems().at(i).value;
    const gross = Number(row.quantity) * Number(row.unit_price);
    const net = gross - gross * (Number(row.discount_percent) / 100);
    return net + net * (Number(row.tax_rate) / 100);
  }

  subtotal(): number {
    return this.lineItems().controls.reduce((s, ctrl) => {
      const row = ctrl.value;
      const gross = Number(row.quantity) * Number(row.unit_price);
      return s + gross - gross * (Number(row.discount_percent) / 100);
    }, 0);
  }

  taxAmount(): number {
    return this.lineItems().controls.reduce((s, ctrl) => {
      const row = ctrl.value;
      const gross = Number(row.quantity) * Number(row.unit_price);
      const net = gross - gross * (Number(row.discount_percent) / 100);
      return s + net * (Number(row.tax_rate) / 100);
    }, 0);
  }

  grandTotal(): number {
    return this.subtotal() + this.taxAmount();
  }

  save(): void {
    if (this.form.invalid || !this.lineItems().length) {
      this.notification.error('Complete required fields and add items.');
      return;
    }
    const raw = this.form.getRawValue();
    const payload: InvoiceFormData = {
      customer: raw.customer!,
      sales_order: raw.sales_order,
      currency: raw.currency!,
      exchange_rate: Number(raw.exchange_rate),
      invoice_date: raw.invoice_date!,
      due_date: raw.due_date!,
      tra_receipt_number: raw.tra_receipt_number || undefined,
      items: (
        raw.lineItems as Array<{
          item: number | null;
          quantity: number;
          unit_price: number;
          discount_percent: number;
          tax_rate: number;
        }>
      ).map((l) => ({
        item: l.item!,
        quantity: Number(l.quantity),
        unit_price: Number(l.unit_price),
        discount_percent: Number(l.discount_percent),
        tax_rate: Number(l.tax_rate),
      })),
    };

    this.saving.set(true);
    const id = this.editId();
    const req$ = id ? this.sales.updateInvoice(id, payload) : this.sales.createInvoice(payload);
    req$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (inv) => {
        this.notification.success('Invoice saved');
        void this.router.navigate(['/sales/invoices', inv.id, 'view']);
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }
}
