import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import {
  APAgingRow,
  APSummary,
  BankAccount,
  UpcomingPayment,
} from '../../../../core/models/finance.model';
import { AuthService } from '../../../../core/services/auth.service';
import { FinanceService } from '../../../../core/services/finance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDate } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { FinanceNavComponent } from '../../components/finance-nav/finance-nav.component';
import { formatAccountingAmount, PAYMENT_METHODS } from '../../constants/finance.constants';
import { canMakePayment, canViewFinance } from '../../utils/finance-permissions.util';

@Component({
  selector: 'app-payables',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    FinanceNavComponent,
    ModalComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './payables.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayablesComponent implements OnInit {
  private readonly finance = inject(FinanceService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly data = signal<APSummary | null>(null);
  readonly upcoming = signal<UpcomingPayment[]>([]);
  readonly bankAccounts = signal<BankAccount[]>([]);
  readonly loading = signal(true);
  readonly upcomingLoading = signal(true);
  readonly saving = signal(false);
  readonly showPay = signal(false);
  readonly paying = signal<UpcomingPayment | null>(null);
  readonly search = signal('');
  readonly bucketFilter = signal('');
  readonly upcomingDays = signal(14);

  readonly paymentMethods = PAYMENT_METHODS;
  readonly formatAccountingAmount = formatAccountingAmount;
  readonly formatDate = formatDate;
  readonly canView = () => canViewFinance(this.auth);
  readonly canPay = () => canMakePayment(this.auth);

  readonly payForm = this.fb.group({
    amount: [0, Validators.required],
    payment_date: [new Date().toISOString().slice(0, 10), Validators.required],
    payment_method: ['BANK_TRANSFER', Validators.required],
    reference: [''],
    bank_account: [null as number | null],
  });

  readonly filteredAging = computed(() => {
    const rows = this.data()?.aging ?? [];
    const q = this.search().trim().toLowerCase();
    const bucket = this.bucketFilter();
    return rows.filter((row) => {
      if (q && !row.supplier_name.toLowerCase().includes(q)) return false;
      if (!bucket) return true;
      return Number(row[bucket as keyof APAgingRow] ?? 0) > 0;
    });
  });

  ngOnInit(): void {
    this.load();
    this.loadUpcoming();
    this.finance.getBankAccounts().subscribe((accounts) => this.bankAccounts.set(accounts));
  }

  load(): void {
    this.loading.set(true);
    this.finance
      .getPayables()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => this.data.set(d),
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  loadUpcoming(): void {
    this.upcomingLoading.set(true);
    this.finance
      .getUpcomingPayments(this.upcomingDays())
      .pipe(finalize(() => this.upcomingLoading.set(false)))
      .subscribe({
        next: (rows) => this.upcoming.set(rows),
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  agingClass(bucket: keyof APAgingRow): string {
    const map: Partial<Record<keyof APAgingRow, string>> = {
      current: 'text-green-700',
      days_1_30: 'text-gray-800',
      days_31_60: 'text-amber-600',
      days_61_90: 'text-orange-600 font-medium',
      days_90_plus: 'text-red-600 font-semibold',
      total_outstanding: 'font-semibold text-[#1B3A6B]',
    };
    return map[bucket] ?? '';
  }

  isDueSoon(dueDate: string): boolean {
    const due = new Date(dueDate);
    const today = new Date();
    const diff = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  }

  isOverdue(dueDate: string): boolean {
    return new Date(dueDate) < new Date();
  }

  openPay(payment: UpcomingPayment): void {
    if (!payment.three_way_matched) {
      this.notification.error('3-way match required before payment.');
      return;
    }
    this.paying.set(payment);
    this.payForm.patchValue({
      amount: Number(payment.amount),
      payment_date: new Date().toISOString().slice(0, 10),
      payment_method: 'BANK_TRANSFER',
      reference: '',
      bank_account: this.bankAccounts()[0]?.id ?? null,
    });
    this.showPay.set(true);
  }

  submitPayment(): void {
    const payment = this.paying();
    if (!payment || this.payForm.invalid) {
      this.notification.error('Complete all required fields.');
      return;
    }
    if (!payment.three_way_matched) {
      this.notification.error('3-way match required — PO, GRN, and invoice amounts must match.');
      return;
    }
    const raw = this.payForm.getRawValue();
    this.saving.set(true);
    this.finance
      .makeSupplierPayment({
        invoice: payment.invoice_id,
        amount: Number(raw.amount),
        payment_date: raw.payment_date!,
        payment_method: raw.payment_method!,
        reference: raw.reference ?? '',
        bank_account: raw.bank_account,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Supplier payment recorded');
          this.showPay.set(false);
          this.load();
          this.loadUpcoming();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }
}
