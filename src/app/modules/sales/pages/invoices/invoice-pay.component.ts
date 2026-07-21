import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { PublicInvoice } from '../../../../core/models/sales.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { SalesService } from '../../../../core/services/sales.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatDate } from '../../../../core/utils/format.util';
import { printDocument } from '../../../../core/utils/sales-pdf.util';
import { QrCodeComponent } from '../../../../shared/components/qr-code/qr-code.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { COMPANY_DETAILS, PAYMENT_METHODS } from '../../constants/sales.constants';
import { formatExchangeRateLabel, isForeignCurrency } from '../../utils/sales-currency.util';

@Component({
  selector: 'app-invoice-pay',
  imports: [FormsModule, QrCodeComponent, StatusBadgeComponent],
  templateUrl: './invoice-pay.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoicePayComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly sales = inject(SalesService);
  private readonly notification = inject(NotificationService);

  readonly invoice = signal<PublicInvoice | null>(null);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly submitted = signal(false);
  readonly company = COMPANY_DETAILS;
  readonly paymentMethods = PAYMENT_METHODS;
  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly formatExchangeRateLabel = formatExchangeRateLabel;
  readonly isForeignCurrency = isForeignCurrency;

  readonly isPaid = computed(() => {
    const inv = this.invoice();
    if (!inv) return false;
    return inv.status === 'PAID' || Number(inv.amount_due ?? 0) <= 0;
  });

  readonly pageTitle = computed(() =>
    this.isPaid() ? 'Invoice & Payment Receipt' : 'Customer Invoice & Payment Portal',
  );

  paymentForm = {
    amount: 0,
    payment_method: 'BANK_TRANSFER',
    reference_number: '',
    proof_notes: '',
    customer_reply_message: '',
    customer_email: '',
  };
  selectedFile: File | null = null;

  private token = '';

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) {
      this.error.set('Invalid invoice link.');
      this.loading.set(false);
      return;
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.sales
      .getInvoiceByToken(this.token)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (inv) => {
          this.invoice.set(inv);
          this.paymentForm.amount = Number(inv.amount_due ?? 0);
        },
        error: (e) =>
          this.error.set(getApiErrorMessage(e, 'Invoice not found or link has expired.')),
      });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  submitPayment(): void {
    const inv = this.invoice();
    if (!inv || this.submitting() || this.submitted()) return;

    const reference = this.paymentForm.reference_number.trim();
    if (!reference) {
      this.notification.error('Payment reference number is required.');
      return;
    }
    const amount = Number(this.paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      this.notification.error('Enter a valid payment amount.');
      return;
    }

    this.submitting.set(true);
    this.sales
      .submitInvoicePaymentProof(this.token, {
        amount,
        payment_method: this.paymentForm.payment_method,
        reference_number: reference,
        proof_notes: this.paymentForm.proof_notes.trim(),
        customer_reply_message: this.paymentForm.customer_reply_message.trim(),
        customer_email: this.paymentForm.customer_email.trim(),
        proof_file: this.selectedFile ?? undefined,
      })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: ({ data, message }) => {
          this.invoice.set(data.invoice);
          this.submitted.set(true);
          this.notification.success(message);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  printReceipt(): void {
    printDocument('invoice-public-print');
  }
}
