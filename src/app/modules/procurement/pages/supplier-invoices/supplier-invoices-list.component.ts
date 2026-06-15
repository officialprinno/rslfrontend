import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { Currency } from '../../../../core/models/inventory.model';
import {
  GoodsReceivedNote,
  PurchaseOrder,
  Supplier,
  SupplierInvoice,
} from '../../../../core/models/procurement.model';
import { AuthService } from '../../../../core/services/auth.service';
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
import { WorkflowStepperComponent } from '../../components/workflow-stepper/workflow-stepper.component';
import { PAYMENT_METHODS, WORKFLOW_STEPS } from '../../constants/procurement.constants';
import { canManagePO, canPayInvoice } from '../../utils/procurement-permissions.util';

@Component({
  selector: 'app-supplier-invoices-list',
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
    WorkflowStepperComponent,
  ],
  templateUrl: './supplier-invoices-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierInvoicesListComponent implements OnInit {
  private readonly procurement = inject(ProcurementService);
  private readonly currencyService = inject(CurrencyService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly invoices = signal<SupplierInvoice[]>([]);
  readonly suppliers = signal<Supplier[]>([]);
  readonly pos = signal<PurchaseOrder[]>([]);
  readonly grns = signal<GoodsReceivedNote[]>([]);
  readonly currencies = signal<Currency[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly showRecord = signal(false);
  readonly showView = signal(false);
  readonly showPay = signal(false);
  readonly viewing = signal<SupplierInvoice | null>(null);
  readonly paying = signal<SupplierInvoice | null>(null);

  readonly invoiceSteps = WORKFLOW_STEPS.invoice;
  readonly paymentMethods = PAYMENT_METHODS;
  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly canRecord = () => canManagePO(this.auth);
  readonly canPay = () => canPayInvoice(this.auth);

  readonly recordForm = this.fb.group({
    invoice_number: ['', Validators.required],
    supplier: [null as number | null, Validators.required],
    purchase_order: [null as number | null, Validators.required],
    grn: [null as number | null, Validators.required],
    invoice_date: ['', Validators.required],
    due_date: ['', Validators.required],
    currency: [null as number | null, Validators.required],
    exchange_rate: [1],
    subtotal: [0, Validators.required],
    tax_amount: [0],
    total_amount: [0, Validators.required],
    notes: [''],
  });

  readonly payForm = this.fb.group({
    amount: [0, Validators.required],
    payment_date: [new Date().toISOString().slice(0, 10), Validators.required],
    payment_method: ['Bank Transfer', Validators.required],
    reference: [''],
    bank: [''],
  });

  ngOnInit(): void {
    this.currencyService.getCurrencies().subscribe((c) => this.currencies.set(c));
    this.procurement.getSuppliers({ page_size: 100 }).subscribe((d) => this.suppliers.set(d.results));
    this.procurement.getPurchaseOrders({ page_size: 100 }).subscribe((d) => this.pos.set(d.results));
    this.procurement.getGRNs({ status: 'CONFIRMED', page_size: 100 }).subscribe((d) => this.grns.set(d.results));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.procurement
      .getSupplierInvoices({ page: this.page(), page_size: 10 })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => { this.invoices.set(d.results); this.total.set(d.count); },
      });
  }

  isOverdue(inv: SupplierInvoice): boolean {
    return new Date(inv.due_date) < new Date() && inv.status !== 'PAID';
  }

  openRecord(): void {
    this.recordForm.reset({
      invoice_date: new Date().toISOString().slice(0, 10),
      currency: this.currencies()[0]?.id ?? null,
      exchange_rate: 1,
    });
    this.showRecord.set(true);
  }

  onPoSelect(poId: number | null): void {
    const po = this.pos().find((p) => p.id === poId);
    if (po) {
      this.recordForm.patchValue({
        supplier: po.supplier,
        subtotal: po.subtotal,
        tax_amount: po.tax_amount,
        total_amount: po.total_amount,
        currency: po.currency,
      });
    }
  }

  saveInvoice(): void {
    if (this.recordForm.invalid) {
      this.notification.error('Complete all required fields.');
      return;
    }
    const raw = this.recordForm.getRawValue();
    this.saving.set(true);
    this.procurement
      .createSupplierInvoice({
        invoice_number: raw.invoice_number!,
        supplier: raw.supplier!,
        purchase_order: raw.purchase_order!,
        grn: raw.grn!,
        invoice_date: raw.invoice_date!,
        due_date: raw.due_date!,
        currency: raw.currency!,
        exchange_rate: Number(raw.exchange_rate),
        subtotal: Number(raw.subtotal),
        tax_amount: Number(raw.tax_amount),
        total_amount: Number(raw.total_amount),
        notes: raw.notes ?? '',
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => { this.notification.success('Invoice recorded'); this.showRecord.set(false); this.load(); },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  viewInvoice(inv: SupplierInvoice): void {
    this.procurement.getSupplierInvoice(inv.id).subscribe({
      next: (full) => { this.viewing.set(full); this.showView.set(true); },
    });
  }

  matchInvoice(inv: SupplierInvoice): void {
    this.procurement.matchInvoice(inv.id).subscribe({
      next: (result) => {
        this.notification.success(result.three_way_matched ? '3-way match successful' : 'Discrepancy found');
        this.load();
        if (this.viewing()?.id === inv.id) this.viewing.set(result);
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  openPay(inv: SupplierInvoice): void {
    this.paying.set(inv);
    this.payForm.patchValue({ amount: Number(inv.balance) });
    this.showPay.set(true);
  }

  submitPayment(): void {
    const inv = this.paying();
    if (!inv || this.payForm.invalid) return;
    const raw = this.payForm.getRawValue();
    this.procurement
      .payInvoice(inv.id, {
        amount: Number(raw.amount),
        payment_date: raw.payment_date!,
        payment_method: raw.payment_method!,
        reference: raw.reference ?? '',
        bank: raw.bank ?? '',
      })
      .subscribe({
        next: () => {
          this.notification.success('Payment recorded');
          this.showPay.set(false);
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }
}
