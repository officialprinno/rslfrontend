import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { Customer, CustomerPayment, Invoice, PaymentFormData, PaymentMethod } from '../../../../core/models/sales.model';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SalesService } from '../../../../core/services/sales.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatDate } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { SalesNavComponent } from '../../components/sales-nav/sales-nav.component';
import { PAYMENT_METHODS } from '../../constants/sales.constants';
import { canRecordPayment } from '../../utils/sales-permissions.util';

@Component({
  selector: 'app-payments-list',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    SalesNavComponent,
    PaginationComponent,
    ModalComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './payments-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentsListComponent implements OnInit {
  private readonly sales = inject(SalesService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly payments = signal<CustomerPayment[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly invoices = signal<Invoice[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly showRecord = signal(false);
  readonly search = signal('');

  readonly paymentMethods = PAYMENT_METHODS;
  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly canRecord = () => canRecordPayment(this.auth);

  readonly recordForm = this.fb.group({
    customer: [null as number | null, Validators.required],
    invoice: [null as number | null, Validators.required],
    amount: [0, Validators.required],
    payment_date: [new Date().toISOString().slice(0, 10), Validators.required],
    payment_method: ['BANK_TRANSFER' as PaymentMethod, Validators.required],
    reference_number: [''],
    bank_name: [''],
    notes: [''],
  });

  ngOnInit(): void {
    this.sales.getCustomers({ page_size: 100 }).subscribe((d) => this.customers.set(d.results));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const params: Record<string, string | number> = {
      page: this.page(),
      page_size: 10,
      ordering: '-payment_date',
    };
    if (this.search()) params['search'] = this.search();

    this.sales
      .getPayments(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.payments.set(d.results);
          this.total.set(d.count);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  openRecord(): void {
    this.recordForm.reset({
      payment_date: new Date().toISOString().slice(0, 10),
      payment_method: 'BANK_TRANSFER',
    });
    this.invoices.set([]);
    this.showRecord.set(true);
  }

  onCustomerSelect(customerId: number | null): void {
    this.recordForm.patchValue({ customer: customerId, invoice: null, amount: 0 });
    if (!customerId) {
      this.invoices.set([]);
      return;
    }
    this.sales
      .getInvoices({ customer: customerId, page_size: 100 })
      .subscribe((d) => this.invoices.set(d.results.filter((i) => i.balance > 0)));
  }

  onInvoiceSelect(invoiceId: number | null): void {
    this.recordForm.patchValue({ invoice: invoiceId });
    const inv = this.invoices().find((i) => i.id === invoiceId);
    if (inv) {
      this.recordForm.patchValue({ amount: Number(inv.balance) });
    }
  }

  savePayment(): void {
    if (this.recordForm.invalid) {
      this.notification.error('Complete all required fields.');
      return;
    }
    const raw = this.recordForm.getRawValue();
    const payload: PaymentFormData = {
      customer: raw.customer!,
      invoice: raw.invoice!,
      amount: Number(raw.amount),
      payment_date: raw.payment_date!,
      payment_method: raw.payment_method!,
      reference_number: raw.reference_number ?? '',
      bank_name: raw.bank_name ?? '',
      notes: raw.notes ?? '',
    };
    this.saving.set(true);
    this.sales
      .recordPayment(payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Payment recorded');
          this.showRecord.set(false);
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }
}
