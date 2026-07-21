import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  UntypedFormArray,
  UntypedFormBuilder,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import {
  CreditNoteLineFormData,
  CreditNoteType,
  Invoice,
  InvoiceItem,
  StagedCreditNoteFormData,
} from '../../../../core/models/sales.model';
import { Warehouse } from '../../../../core/models/inventory.model';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SalesService } from '../../../../core/services/sales.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency } from '../../../../core/utils/format.util';
import {
  SearchableSelectComponent,
  SelectOption,
} from '../../../../shared/components/searchable-select/searchable-select.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { SalesNavComponent } from '../../components/sales-nav/sales-nav.component';

@Component({
  selector: 'app-credit-note-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    SearchableSelectComponent,
    PageHeaderComponent,
    SalesNavComponent,
  ],
  templateUrl: './credit-note-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreditNoteFormComponent implements OnInit {
  private readonly fb = inject(UntypedFormBuilder);
  private readonly sales = inject(SalesService);
  private readonly inventory = inject(InventoryService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);

  readonly invoices = signal<Invoice[]>([]);
  readonly warehouses = signal<Warehouse[]>([]);
  readonly selectedInvoice = signal<Invoice | null>(null);
  readonly loadingInvoice = signal(false);
  readonly saving = signal(false);
  readonly formatCurrency = formatCurrency;

  readonly invoiceOptions = computed<SelectOption[]>(() =>
    this.invoices().map((invoice) => ({
      value: invoice.id,
      label: invoice.invoice_number,
      sublabel: `${invoice.customer_name} · ${formatCurrency(invoice.total_amount, invoice.currency_code)}`,
    })),
  );
  readonly warehouseOptions = computed<SelectOption[]>(() =>
    this.warehouses().map((warehouse) => ({
      value: warehouse.id,
      label: warehouse.name,
      sublabel: warehouse.location,
    })),
  );

  readonly form = this.fb.group({
    invoice: [null as number | null, Validators.required],
    credit_note_type: ['SALES_RETURN' as CreditNoteType, Validators.required],
    warehouse: [null as number | null],
    reason: ['', [Validators.required, Validators.maxLength(2000)]],
    notes: [''],
    lines: this.fb.array([]),
  });

  get lines(): UntypedFormArray {
    return this.form.get('lines') as UntypedFormArray;
  }

  get invoiceControl() {
    return this.form.get('invoice')!;
  }

  get creditNoteTypeControl() {
    return this.form.get('credit_note_type')!;
  }

  get warehouseControl() {
    return this.form.get('warehouse')!;
  }

  ngOnInit(): void {
    this.sales.getInvoices({ page_size: 100, ordering: '-created_at' }).subscribe({
      next: (data) => this.invoices.set(data.results),
      error: (error) => this.notification.error(getApiErrorMessage(error)),
    });
    this.inventory.getWarehouses().subscribe({
      next: (warehouses) => this.warehouses.set(warehouses),
      error: (error) => this.notification.error(getApiErrorMessage(error)),
    });
  }

  selectInvoice(value: number | string | null): void {
    const id = Number(value);
    this.invoiceControl.setValue(id || null);
    this.selectedInvoice.set(null);
    this.lines.clear();
    if (!id) return;
    this.loadingInvoice.set(true);
    this.sales
      .getInvoice(id)
      .pipe(finalize(() => this.loadingInvoice.set(false)))
      .subscribe({
        next: (invoice) => {
          this.selectedInvoice.set(invoice);
          this.buildLines(invoice.items);
        },
        error: (error) => this.notification.error(getApiErrorMessage(error)),
      });
  }

  changeType(value: CreditNoteType): void {
    this.creditNoteTypeControl.setValue(value);
    const full = value === 'FULL_CANCELLATION';
    for (const control of this.lines.controls) {
      control.get('selected')?.setValue(full);
      if (full) {
        control.get('quantity')?.setValue(control.get('invoice_quantity')?.value);
      }
    }
  }

  private buildLines(items: InvoiceItem[]): void {
    const full = this.creditNoteTypeControl.value === 'FULL_CANCELLATION';
    for (const item of items) {
      this.lines.push(
        this.fb.group({
          selected: [full],
          invoice_item: [item.id],
          item_name: [item.item_name || item.item_code || `Item ${item.item}`],
          item_code: [item.item_code || ''],
          unit_of_measure: [item.unit_of_measure || 'unit'],
          invoice_quantity: [Number(item.quantity)],
          quantity: [Number(item.quantity), [Validators.required, Validators.min(0.0001)]],
          unit_price: [Number(item.unit_price)],
          original_discount: [Number(item.discount_percent || 0)],
          original_tax: [Number(item.tax_rate || 0)],
          adjusted_unit_price: [null as number | null],
          discount_percent: [0],
          tax_rate: [0],
          reason: [''],
        }),
      );
    }
  }

  lineAmounts(index: number): { net: number; tax: number; gross: number } {
    const row = this.lines.at(index).getRawValue();
    const type = this.creditNoteTypeControl.value as CreditNoteType;
    const quantity = Number(row.quantity || 0);
    const price = Number(row.unit_price || 0);
    const originalDiscount = Number(row.original_discount || 0);
    const originalTax = Number(row.original_tax || 0);
    const discounted = price * (1 - originalDiscount / 100);
    const originalNet = discounted * quantity;
    let net = originalNet;
    let taxRate = originalTax;
    if (type === 'PRICE_ADJUSTMENT') {
      net = Math.max(0, price - Number(row.adjusted_unit_price || 0)) *
        (1 - originalDiscount / 100) * quantity;
    } else if (type === 'DISCOUNT') {
      net = originalNet * Number(row.discount_percent || 0) / 100;
    } else if (type === 'TAX_ADJUSTMENT') {
      net = 0;
      taxRate = Math.max(0, originalTax - Number(row.tax_rate || 0));
    }
    const tax = type === 'TAX_ADJUSTMENT' ? originalNet * taxRate / 100 : net * taxRate / 100;
    return {
      net: this.roundMoney(net),
      tax: this.roundMoney(tax),
      gross: this.roundMoney(net + tax),
    };
  }

  total(kind: 'net' | 'tax' | 'gross'): number {
    return this.lines.controls.reduce(
      (sum, control, index) =>
        control.get('selected')?.value ? sum + this.lineAmounts(index)[kind] : sum,
      0,
    );
  }

  save(): void {
    const raw = this.form.getRawValue() as {
      invoice: number | null;
      credit_note_type: CreditNoteType;
      warehouse: number | null;
      reason: string;
      notes: string;
      lines: Array<Record<string, unknown>>;
    };
    const type = raw.credit_note_type;
    const selected = raw.lines.filter((line) => Boolean(line['selected']));
    if (this.form.invalid || !raw.invoice || !raw.reason?.trim() || !selected.length) {
      this.notification.error('Select an invoice, type, reason and at least one line.');
      return;
    }
    if (type === 'SALES_RETURN' && !raw.warehouse) {
      this.notification.error('Select a receiving warehouse for the sales return.');
      return;
    }

    const lines: CreditNoteLineFormData[] = selected.map((line) => ({
      invoice_item: Number(line['invoice_item']),
      quantity: Number(line['quantity']),
      reason: String(line['reason'] || ''),
      ...(type === 'PRICE_ADJUSTMENT'
        ? { adjusted_unit_price: Number(line['adjusted_unit_price']) }
        : {}),
      ...(type === 'DISCOUNT' ? { discount_percent: Number(line['discount_percent']) } : {}),
      ...(type === 'TAX_ADJUSTMENT' ? { tax_rate: Number(line['tax_rate']) } : {}),
    }));
    const payload: StagedCreditNoteFormData = {
      invoice: raw.invoice,
      credit_note_type: type,
      warehouse: type === 'SALES_RETURN' ? raw.warehouse : null,
      reason: raw.reason.trim(),
      notes: raw.notes || '',
      lines,
    };
    this.saving.set(true);
    this.sales
      .createCreditNote(payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (creditNote) => {
          this.notification.success('Credit note draft created');
          void this.router.navigate(['/sales/credit-notes', creditNote.id, 'view']);
        },
        error: (error) => this.notification.error(getApiErrorMessage(error)),
      });
  }

  isFullCancellation(): boolean {
    return this.creditNoteTypeControl.value === 'FULL_CANCELLATION';
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
