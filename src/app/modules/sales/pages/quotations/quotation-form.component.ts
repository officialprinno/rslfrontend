import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';

import { Currency, Item } from '../../../../core/models/inventory.model';
import {
  Customer,
  InvoicePaymentTerm,
  PaymentTerms,
  QuotationFormData,
  QuotationStatus,
  SODeliveryMethod,
} from '../../../../core/models/sales.model';
import { CurrencyService } from '../../../../core/services/currency.service';
import { CompanyContextService } from '../../../../core/services/company-context.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SalesService } from '../../../../core/services/sales.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency } from '../../../../core/utils/format.util';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { SearchableSelectComponent, SelectOption, SelectOptionGroup } from '../../../../shared/components/searchable-select/searchable-select.component';
import { SalesNavComponent } from '../../components/sales-nav/sales-nav.component';
import {
  DEFAULT_QUOTATION_TERMS,
  DELIVERY_METHODS,
  INVOICE_PAYMENT_TERMS,
  invoiceModeForCustomerTerms,
  PAYMENT_TERMS,
  paymentTermsLabel,
  quotationIsEditable,
} from '../../constants/sales.constants';
import {
  formatExchangeRateLabel,
  isForeignCurrency,
  resolveExchangeRateForCurrency,
} from '../../utils/sales-currency.util';
import {
  buildSalesLineItemGroups,
  findSalesLineItem,
  isSalesLineReadyItem,
} from '../../utils/sales-line-items.util';
import {
  customerPricesMap,
  customerUnitPrice,
  detectLinePriceSource,
  LinePriceSource,
  resolveLineUnitPrice,
  sellingUnitPrice,
} from '../../utils/sales-customer-price.util';
import {
  ItemWarehouseAvailability,
  normalizeEntityId,
  warehouseAvailabilityLabel,
} from '../../utils/sales-stock.util';

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
  private readonly companyContext = inject(CompanyContextService);
  private readonly notification = inject(NotificationService);

  readonly items = signal<Item[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly currencies = signal<Currency[]>([]);
  readonly stockByWarehouse = signal<Map<number, ItemWarehouseAvailability[]>>(new Map());
  readonly customerPricesByItem = signal<Map<number, number>>(new Map());
  readonly selectedCustomer = signal<Customer | null>(null);
  readonly saving = signal(false);
  readonly editId = signal<number | null>(null);
  readonly editStatus = signal<QuotationStatus | null>(null);
  readonly selectedCurrencyCode = signal('TZS');
  readonly formatCurrency = formatCurrency;
  readonly isForeignCurrency = isForeignCurrency;
  readonly formatExchangeRateLabel = formatExchangeRateLabel;

  readonly deliveryMethods = DELIVERY_METHODS;
  readonly paymentModes = INVOICE_PAYMENT_TERMS;
  readonly customerPaymentTerms = PAYMENT_TERMS;
  readonly paymentTermsLabel = paymentTermsLabel;

  readonly form = this.fb.group({
    customer: [null as number | null, Validators.required],
    currency: [null as number | null, Validators.required],
    exchange_rate: [1, Validators.required],
    valid_until: ['', Validators.required],
    delivery_method: [null as string | null, Validators.required],
    payment_term: [null as string | null, Validators.required],
    customer_payment_terms: ['' as string, Validators.required],
    custom_payment_term_days: [null as number | null],
    deposit_percent: [0],
    apply_vat: [true],
    notes: [''],
    terms_conditions: [DEFAULT_QUOTATION_TERMS],
    lineItems: this.fb.array([]),
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    forkJoin({
      items: this.inventory.getSalesLineItems(),
      customers: this.sales.getCustomers({ page_size: 100, is_active: true }),
      currencies: this.currencyService.getCurrencies(),
      stock: this.inventory.getAvailableStockByItemWarehouse(),
    }).subscribe(({ items, customers, currencies, stock }) => {
      this.items.set(items);
      this.customers.set(customers.results);
      this.currencies.set(currencies);
      this.stockByWarehouse.set(stock);
      if (id) {
        this.editId.set(+id);
        this.loadQuotation(+id);
      } else {
        const defaultValid = new Date();
        defaultValid.setDate(defaultValid.getDate() + 30);
        this.form.patchValue({ valid_until: defaultValid.toISOString().slice(0, 10) });
        this.addLine();
      }
      this.form.controls.currency.valueChanges.subscribe((id) =>
        this.applyMasterExchangeRate(typeof id === 'number' ? id : null),
      );
    });
  }

  showExchangeRate(): boolean {
    return isForeignCurrency(this.selectedCurrencyCode());
  }

  private updateSelectedCurrencyCode(currencyId: number | null): void {
    const currency = this.currencies().find((c) => c.id === currencyId);
    this.selectedCurrencyCode.set(currency?.code ?? 'TZS');
  }

  private applyMasterExchangeRate(currencyId: number | null): void {
    this.updateSelectedCurrencyCode(currencyId);
    this.form.patchValue(
      { exchange_rate: resolveExchangeRateForCurrency(currencyId, this.currencies()) },
      { emitEvent: false },
    );
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

  itemOptionGroups(): SelectOptionGroup[] {
    return buildSalesLineItemGroups(this.items(), this.selectedCurrencyCode());
  }

  isLineSalesReady(i: number): boolean {
    const itemId = normalizeEntityId(this.lineItems().at(i).value.item);
    return isSalesLineReadyItem(findSalesLineItem(this.items(), itemId));
  }

  lineUnit(i: number): string {
    const itemId = normalizeEntityId(this.lineItems().at(i).value.item);
    return findSalesLineItem(this.items(), itemId)?.unit_of_measure || 'unit';
  }

  private applyLineWarehouseValidators(i: number): void {
    const line = this.lineItems().at(i);
    const wh = line.get('fulfillment_warehouse');
    if (!wh) return;
    if (this.isLineSalesReady(i)) {
      wh.setValidators([Validators.required]);
    } else {
      wh.clearValidators();
    }
    wh.updateValueAndValidity({ emitEvent: false });
  }

  warehouseOptionsForItem(itemId: number | string | null): ItemWarehouseAvailability[] {
    const id = normalizeEntityId(itemId);
    if (!id) return [];
    return this.stockByWarehouse().get(id) ?? [];
  }

  compareWarehouseIds = (a: unknown, b: unknown): boolean =>
    normalizeEntityId(a as number | string | null) === normalizeEntityId(b as number | string | null);

  warehouseLabel(row: ItemWarehouseAvailability): string {
    return warehouseAvailabilityLabel(row);
  }

  lineStockAvailable(i: number): number {
    const row = this.lineItems().at(i).value;
    const itemId = normalizeEntityId(row.item);
    const whId = normalizeEntityId(row.fulfillment_warehouse);
    if (!itemId) return 0;
    if (whId) {
      const match = this.warehouseOptionsForItem(itemId).find((w) => w.warehouseId === whId);
      return match?.quantityAvailable ?? 0;
    }
    return Number(row.stock_available ?? 0);
  }

  lineStockShortfall(i: number): number {
    const row = this.lineItems().at(i).value;
    const qty = Number(row.quantity ?? 0);
    return Math.max(qty - this.lineStockAvailable(i), 0);
  }

  hasStockShortfall(): boolean {
    return this.lineItems().controls.some((_, i) => this.lineStockShortfall(i) > 0);
  }

  stockAvailable(itemId: number | string | null, lineStock?: number | null): number {
    if (lineStock != null) return Number(lineStock);
    const id = normalizeEntityId(itemId);
    if (!id) return 0;
    const rows = this.warehouseOptionsForItem(id);
    return rows.reduce((sum, row) => sum + row.quantityAvailable, 0);
  }

  loadQuotation(id: number): void {
    this.sales.getQuotation(id).subscribe({
      next: (q) => {
        if (!quotationIsEditable(q)) {
          this.notification.error('Only draft quotations can be edited.');
          void this.router.navigate(['/sales/quotations', id, 'view']);
          return;
        }
        this.editStatus.set(q.status);
        const customer = this.customers().find((c) => c.id === q.customer) ?? null;
        const terms = q.customer_payment_terms || customer?.payment_terms || '';
        const customMatch = /^NET_(\d+)$/.exec(terms);
        const isCustom = !!terms && !PAYMENT_TERMS.some((term) => term.value === terms);
        this.selectedCustomer.set(customer);
        this.form.patchValue({
          customer: q.customer,
          currency: q.currency,
          exchange_rate: q.exchange_rate,
          valid_until: q.valid_until,
          delivery_method: q.delivery_method || null,
          payment_term: q.payment_term || null,
          customer_payment_terms: isCustom ? 'CUSTOM' : terms,
          custom_payment_term_days: isCustom && customMatch ? Number(customMatch[1]) : null,
          deposit_percent: q.deposit_percent ?? 0,
          apply_vat: q.apply_vat,
          notes: q.notes,
          terms_conditions: q.terms_conditions,
        });
        this.updateSelectedCurrencyCode(q.currency);
        this.sales
          .getCustomerPrices({ customer: q.customer, page_size: 500, is_active: true })
          .subscribe({
            next: (data) => {
              this.customerPricesByItem.set(customerPricesMap(data.results));
              this.populateQuotationLines(q.items, q.apply_vat);
            },
            error: () => {
              this.customerPricesByItem.set(new Map());
              this.populateQuotationLines(q.items, q.apply_vat);
            },
          });
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  private populateQuotationLines(
    items: {
      item: number;
      description?: string;
      quantity: number;
      unit_price: number;
      discount_percent?: number;
      tax_rate?: number;
      fulfillment_warehouse?: number | null;
      warehouse_id?: number | null;
    }[],
    applyVat: boolean,
  ): void {
    this.lineItems().clear();
    items.forEach((l) => {
      const catalogItem = findSalesLineItem(this.items(), l.item);
      const special = customerUnitPrice(l.item, this.customerPricesByItem());
      this.lineItems().push(
        this.fb.group({
          item: [l.item, Validators.required],
          description: [l.description ?? ''],
          quantity: [l.quantity, Validators.required],
          unit_price: [l.unit_price, Validators.required],
          price_source: [
            detectLinePriceSource(l.unit_price, catalogItem, special) as LinePriceSource,
          ],
          discount_percent: [l.discount_percent ?? 0],
          tax_rate: [l.tax_rate ?? (applyVat ? 18 : 0)],
          vat_enabled: [(l.tax_rate ?? (applyVat ? 18 : 0)) > 0],
          fulfillment_warehouse: [
            normalizeEntityId(l.fulfillment_warehouse ?? l.warehouse_id),
            Validators.required,
          ],
          stock_available: [
            this.lineWarehouseAvailable(
              l.item,
              l.fulfillment_warehouse ?? l.warehouse_id ?? null,
            ),
          ],
        }),
      );
    });
    this.lineItems().controls.forEach((_, i) => this.applyLineWarehouseValidators(i));
  }

  onCustomerSelect(value: number | string | null): void {
    const id = typeof value === 'number' ? value : null;
    this.form.patchValue({ customer: id });
    const customer = this.customers().find((c) => c.id === id);
    this.selectedCustomer.set(customer ?? null);
    if (customer) {
      const terms = customer.payment_terms === 'IMMEDIATE' ? 'CASH' : customer.payment_terms;
      this.form.patchValue({
        currency: customer.currency,
        customer_payment_terms: terms,
        custom_payment_term_days: null,
        payment_term: invoiceModeForCustomerTerms(terms),
      });
      this.applyMasterExchangeRate(customer.currency);
    }
    this.loadCustomerPrices(id);
  }

  onCustomerPaymentTermsChange(value: string): void {
    this.form.patchValue({
      customer_payment_terms: value,
      custom_payment_term_days: value === 'CUSTOM' ? this.form.controls.custom_payment_term_days.value : null,
    });
    this.form.patchValue({
      payment_term: value === 'CUSTOM' ? 'POSTPAID' : invoiceModeForCustomerTerms(value),
    });
  }

  resolvedCustomerPaymentTerms(): PaymentTerms {
    const selected = this.form.controls.customer_payment_terms.value || '';
    if (selected !== 'CUSTOM') return selected as PaymentTerms;
    const days = Number(this.form.controls.custom_payment_term_days.value);
    return Number.isInteger(days) && days > 0 && days <= 365
      ? (`NET_${days}` as PaymentTerms)
      : '';
  }

  private loadCustomerPrices(customerId: number | null): void {
    if (!customerId) {
      this.customerPricesByItem.set(new Map());
      this.refreshLinePricesAfterCustomerChange();
      return;
    }
    this.sales.getCustomerPrices({ customer: customerId, page_size: 500, is_active: true }).subscribe({
      next: (data) => {
        this.customerPricesByItem.set(customerPricesMap(data.results));
        this.refreshLinePricesAfterCustomerChange();
      },
      error: () => this.customerPricesByItem.set(new Map()),
    });
  }

  private refreshLinePricesAfterCustomerChange(): void {
    this.lineItems().controls.forEach((ctrl, i) => {
      const source = (ctrl.value.price_source as LinePriceSource) || 'selling';
      if (source === 'customer' && !this.hasCustomerPrice(i)) {
        ctrl.patchValue({ price_source: 'selling' }, { emitEvent: false });
        this.applyPriceSource(i, 'selling');
      } else {
        this.applyPriceSource(i, source);
      }
    });
  }

  hasCustomerPrice(i: number): boolean {
    const itemId = normalizeEntityId(this.lineItems().at(i).value.item);
    return customerUnitPrice(itemId, this.customerPricesByItem()) != null;
  }

  customerPriceForLine(i: number): number | null {
    const itemId = normalizeEntityId(this.lineItems().at(i).value.item);
    return customerUnitPrice(itemId, this.customerPricesByItem());
  }

  onPriceSourceChange(i: number, source: LinePriceSource | string): void {
    const next = source === 'customer' ? 'customer' : 'selling';
    this.lineItems().at(i).patchValue({ price_source: next }, { emitEvent: false });
    this.applyPriceSource(i, next);
  }

  private applyPriceSource(i: number, source: LinePriceSource): void {
    const line = this.lineItems().at(i);
    const itemId = normalizeEntityId(line.value.item);
    const item = findSalesLineItem(this.items(), itemId);
    if (!itemId || !isSalesLineReadyItem(item)) return;
    line.patchValue(
      {
        unit_price: resolveLineUnitPrice(source, item, this.customerPriceForLine(i)),
      },
      { emitEvent: false },
    );
  }

  addLine(): void {
    this.lineItems().push(
      this.fb.group({
        item: [null, Validators.required],
        description: [''],
        quantity: [1, Validators.required],
        unit_price: [0, Validators.required],
        price_source: ['selling' as LinePriceSource],
        discount_percent: [0],
        tax_rate: [18],
        vat_enabled: [true],
        fulfillment_warehouse: [null as number | null, Validators.required],
        stock_available: [null as number | null],
      }),
    );
  }

  removeLine(i: number): void {
    this.lineItems().removeAt(i);
  }

  onItemSelect(i: number, value: number | string | null): void {
    const id = normalizeEntityId(value);
    const item = findSalesLineItem(this.items(), id);
    const line = this.lineItems().at(i);
    if (isSalesLineReadyItem(item)) {
      const options = this.warehouseOptionsForItem(id);
      const autoWarehouse = options.length === 1 ? options[0].warehouseId : null;
      line.patchValue({
        item: id,
        fulfillment_warehouse: autoWarehouse,
        stock_available: autoWarehouse ? options[0].quantityAvailable : null,
        price_source: 'selling',
        unit_price: sellingUnitPrice(item),
      });
    } else {
      line.patchValue({
        item: id,
        fulfillment_warehouse: null,
        stock_available: null,
        price_source: 'selling',
        unit_price: 0,
      });
    }
    this.applyLineWarehouseValidators(i);
  }

  onWarehouseLineChange(i: number): void {
    const control = this.lineItems().at(i);
    const row = control.value;
    const whId = normalizeEntityId(row.fulfillment_warehouse);
    const itemId = normalizeEntityId(row.item);
    const match = this.warehouseOptionsForItem(itemId).find((w) => w.warehouseId === whId);
    control.patchValue(
      {
        fulfillment_warehouse: whId,
        stock_available: match?.quantityAvailable ?? 0,
      },
      { emitEvent: false },
    );
  }

  private lineWarehouseAvailable(itemId: number | string | null, warehouseId: number | string | null): number | null {
    const item = normalizeEntityId(itemId);
    const warehouse = normalizeEntityId(warehouseId);
    if (!item || !warehouse) return null;
    return (
      this.warehouseOptionsForItem(item).find((w) => w.warehouseId === warehouse)
        ?.quantityAvailable ?? null
    );
  }

  onVatToggle(i: number, checked: boolean): void {
    this.lineItems().at(i).patchValue({ vat_enabled: checked, tax_rate: checked ? 18 : 0 });
  }

  lineNetTotal(i: number): number {
    const row = this.lineItems().at(i).value;
    const gross = Number(row.quantity) * Number(row.unit_price);
    return gross - gross * (Number(row.discount_percent) / 100);
  }

  lineVatAmount(i: number): number {
    return this.lineNetTotal(i) * (Number(this.lineItems().at(i).value.tax_rate ?? 0) / 100);
  }

  lineTotal(i: number): number {
    return this.lineNetTotal(i) + this.lineVatAmount(i);
  }

  subtotal(): number {
    return this.lineItems().controls.reduce((sum, ctrl) => {
      const row = ctrl.value;
      const gross = Number(row.quantity) * Number(row.unit_price);
      return sum + (gross - gross * (Number(row.discount_percent) / 100));
    }, 0);
  }

  taxAmount(): number {
    return this.lineItems().controls.reduce((sum, ctrl) => {
      const row = ctrl.value;
      const gross = Number(row.quantity) * Number(row.unit_price);
      const net = gross - gross * (Number(row.discount_percent) / 100);
      return sum + net * (Number(row.tax_rate ?? 0) / 100);
    }, 0);
  }

  grandTotal(): number {
    return this.subtotal() + this.taxAmount();
  }

  canSendOnSave(): boolean {
    return !this.editId() || quotationIsEditable({ status: this.editStatus() ?? '' });
  }

  paymentModeHint(): string {
    const term = this.form.controls.payment_term.value;
    return this.paymentModes.find((t) => t.value === term)?.hint ?? '';
  }

  showDepositPercent(): boolean {
    return this.form.controls.payment_term.value === 'PARTIAL_PAYMENT';
  }

  outstandingShortfallTotal(): number {
    return this.lineItems().controls.reduce((sum, _, i) => sum + this.lineStockShortfall(i), 0);
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
    if (!this.companyContext.headerValue() || this.companyContext.isConsolidated()) {
      this.notification.error('Select Rock Solutions Stein or Supply in the header before saving.');
      return;
    }
    const raw = this.form.getRawValue();
    const customerTerms = this.resolvedCustomerPaymentTerms();
    if (!customerTerms) {
      this.notification.error('Select customer payment terms or enter custom net days.');
      return;
    }
    if (raw.payment_term === 'PARTIAL_PAYMENT') {
      const depositPercent = Number(raw.deposit_percent ?? 0);
      if (!Number.isFinite(depositPercent) || depositPercent <= 0 || depositPercent > 100) {
        this.notification.error('Enter a deposit percentage between 0.01 and 100 for partial payment.');
        return;
      }
    }
    const lineItems = raw.lineItems as Array<{
      item: number | null;
      description: string;
      quantity: number;
      unit_price: number;
      discount_percent: number;
      tax_rate: number;
      vat_enabled: boolean;
      fulfillment_warehouse: number | null;
    }>;
    if (
      lineItems.some((l) => {
        const item = findSalesLineItem(this.items(), l.item);
        return isSalesLineReadyItem(item) && !l.fulfillment_warehouse;
      })
    ) {
      this.notification.error('Select a warehouse for each ready-for-sale line item.');
      return;
    }
    const notReadyLines = lineItems.filter((l) => {
      const item = findSalesLineItem(this.items(), l.item);
      return l.item && !isSalesLineReadyItem(item);
    });
    if (notReadyLines.length) {
      this.notification.error(
        'Some items are not ready for sale yet. Remove them or wait for Finance to approve pricing and stock.',
      );
      return;
    }
    const payload: QuotationFormData = {
      customer: raw.customer!,
      currency: raw.currency!,
      exchange_rate: Number(raw.exchange_rate),
      valid_until: raw.valid_until!,
      delivery_method: raw.delivery_method! as SODeliveryMethod,
      payment_term: raw.payment_term! as InvoicePaymentTerm,
      customer_payment_terms: customerTerms,
      deposit_percent: raw.payment_term === 'PARTIAL_PAYMENT' ? Number(raw.deposit_percent ?? 0) : 0,
      apply_vat: this.taxAmount() > 0,
      delivery_cost: 0,
      notes: raw.notes ?? '',
      terms_conditions: raw.terms_conditions ?? '',
      items: lineItems.map((l) => ({
        item: l.item!,
        description: l.description ?? '',
        quantity: Number(l.quantity),
        unit_price: Number(l.unit_price),
        discount_percent: Number(l.discount_percent),
        tax_rate: Number(l.tax_rate ?? 0),
        fulfillment_warehouse: l.fulfillment_warehouse!,
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
