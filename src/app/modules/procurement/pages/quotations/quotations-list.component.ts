import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { Currency } from '../../../../core/models/inventory.model';
import { RFQ, Supplier, SupplierQuotation } from '../../../../core/models/procurement.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { CurrencyService } from '../../../../core/services/currency.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProcurementService } from '../../../../core/services/procurement.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatDate } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { ProcurementNavComponent } from '../../components/procurement-nav/procurement-nav.component';
import { canManageRFQ } from '../../utils/procurement-permissions.util';

@Component({
  selector: 'app-quotations-list',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    ProcurementNavComponent,
    PaginationComponent,
    ModalComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './quotations-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuotationsListComponent implements OnInit {
  private readonly procurement = inject(ProcurementService);
  private readonly currencyService = inject(CurrencyService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly quotations = signal<SupplierQuotation[]>([]);
  readonly rfqs = signal<RFQ[]>([]);
  readonly suppliers = signal<Supplier[]>([]);
  readonly currencies = signal<Currency[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly showModal = signal(false);

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly canAdd = () => canManageRFQ(this.auth);

  readonly form = this.fb.group({
    quotation_number: ['', Validators.required],
    rfq: [null as number | null, Validators.required],
    supplier: [null as number | null, Validators.required],
    quotation_date: ['', Validators.required],
    valid_until: ['', Validators.required],
    currency: [null as number | null, Validators.required],
    exchange_rate: [1, Validators.required],
    delivery_days: [7, Validators.required],
    notes: [''],
    items: this.fb.array([]),
  });

  ngOnInit(): void {
    this.currencyService.getCurrencies().subscribe((c) => {
      this.currencies.set(c);
      if (!this.form.controls.currency.value && c.length) {
        this.form.patchValue({ currency: c[0].id });
      }
    });
    this.procurement.getRFQs({ status: 'OPEN', page_size: 100 }).subscribe((d) => this.rfqs.set(d.results));
    this.procurement.getSuppliers({ is_active: true, page_size: 100 }).subscribe((d) => this.suppliers.set(d.results));
    this.form.controls.rfq.valueChanges.subscribe((rfqId) => this.onRfqChange(rfqId));
    this.load();
  }

  itemsArray(): FormArray {
    return this.form.get('items') as FormArray;
  }

  load(): void {
    this.loading.set(true);
    this.procurement
      .getQuotations({ page: this.page(), page_size: 10 })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => { this.quotations.set(d.results); this.total.set(d.count); },
      });
  }

  isExpired(date: string): boolean {
    return new Date(date) < new Date();
  }

  onRfqChange(rfqId: number | null): void {
    this.itemsArray().clear();
    if (!rfqId) return;
    this.procurement.getRFQ(rfqId).subscribe({
      next: (rfq) => {
        if (!rfq.items?.length) {
          this.notification.error('This RFQ has no line items. Choose another RFQ or update the requisition.');
          return;
        }
        rfq.items.forEach((item) => {
          const itemId = item.item_id ?? item.item;
          this.itemsArray().push(
            this.fb.group({
              item: [itemId, Validators.required],
              item_label: [`${item.item_code ?? ''} — ${item.item_name ?? 'Item'}`.trim()],
              quantity: [item.quantity_requested, [Validators.required, Validators.min(0.0001)]],
              unit_price: [item.unit_cost_estimate ?? 0, [Validators.required, Validators.min(0)]],
            }),
          );
        });
        this.cdr.markForCheck();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  lineTotal(i: number): number {
    const row = this.itemsArray().at(i).value;
    return Number(row.quantity) * Number(row.unit_price);
  }

  grandTotal(): number {
    return this.itemsArray().controls.reduce((s, _, i) => s + this.lineTotal(i), 0);
  }

  openRecord(): void {
    this.form.reset({
      quotation_number: '',
      rfq: null,
      supplier: null,
      quotation_date: new Date().toISOString().slice(0, 10),
      valid_until: '',
      currency: this.currencies()[0]?.id ?? null,
      exchange_rate: 1,
      delivery_days: 7,
      notes: '',
    });
    this.itemsArray().clear();
    this.showModal.set(true);
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (!this.itemsArray().length) {
      this.notification.error('Select an RFQ to load quotation line items.');
      return;
    }
    if (this.form.invalid) {
      this.notification.error('Complete all required fields and enter quantity and unit price for each item.');
      return;
    }
    const raw = this.form.getRawValue();
    this.saving.set(true);
    this.procurement
      .createQuotation({
        quotation_number: raw.quotation_number!,
        rfq: raw.rfq!,
        supplier: raw.supplier!,
        quotation_date: raw.quotation_date!,
        valid_until: raw.valid_until!,
        currency: raw.currency!,
        exchange_rate: Number(raw.exchange_rate),
        delivery_days: Number(raw.delivery_days),
        notes: raw.notes ?? '',
        items: (raw.items as Array<{ item: number; quantity: number; unit_price: number }>).map((l) => ({
          item: l.item,
          quantity: Number(l.quantity),
          unit_price: Number(l.unit_price),
        })),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => { this.notification.success('Quotation recorded'); this.showModal.set(false); this.load(); },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  select(q: SupplierQuotation): void {
    this.confirm.open({ title: 'Select Quotation', message: `Select ${q.quotation_number}?`, confirmLabel: 'Select' })
      .subscribe((ok) => {
        if (!ok) return;
        this.procurement.selectQuotation(q.id).subscribe({
          next: () => this.notification.success('Quotation selected'),
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }

  reject(q: SupplierQuotation): void {
    this.procurement.rejectQuotation(q.id).subscribe({
      next: () => { this.notification.success('Quotation rejected'); this.load(); },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }
}
