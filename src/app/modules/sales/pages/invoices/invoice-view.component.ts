import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { Invoice, PaymentFormData, PaymentMethod } from '../../../../core/models/sales.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SalesService } from '../../../../core/services/sales.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatDate } from '../../../../core/utils/format.util';
import { exportInvoicePdf, printDocument } from '../../../../core/utils/sales-pdf.util';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { SalesNavComponent } from '../../components/sales-nav/sales-nav.component';
import { WorkflowStepperComponent } from '../../components/workflow-stepper/workflow-stepper.component';
import { COMPANY_DETAILS, PAYMENT_METHODS, WORKFLOW_STEPS } from '../../constants/sales.constants';
import { canManageInvoice, canRecordPayment } from '../../utils/sales-permissions.util';

@Component({
  selector: 'app-invoice-view',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    SalesNavComponent,
    WorkflowStepperComponent,
    StatusBadgeComponent,
    TableSkeletonComponent,
    ErrorStateComponent,
    ModalComponent,
  ],
  templateUrl: './invoice-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly sales = inject(SalesService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly fb = inject(FormBuilder);

  readonly invoice = signal<Invoice | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly showPayment = signal(false);
  readonly savingPayment = signal(false);
  readonly invoiceSteps = WORKFLOW_STEPS.invoice;
  readonly company = COMPANY_DETAILS;
  readonly paymentMethods = PAYMENT_METHODS;

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly canManage = () => canManageInvoice(this.auth);
  readonly canPay = () => canRecordPayment(this.auth);

  readonly paymentForm = this.fb.group({
    amount: [0, Validators.required],
    payment_date: [new Date().toISOString().slice(0, 10), Validators.required],
    payment_method: ['BANK_TRANSFER' as PaymentMethod, Validators.required],
    reference_number: [''],
    bank_name: [''],
    notes: [''],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.sales
      .getInvoice(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (inv) => this.invoice.set(inv),
        error: (e) => {
          this.error.set(true);
          this.notification.error(getApiErrorMessage(e));
        },
      });
  }

  workflowIndex(status: string): number {
    const map: Record<string, number> = {
      DRAFT: 0,
      SENT: 1,
      PARTIAL: 2,
      PAID: 3,
      OVERDUE: 1,
    };
    return map[status] ?? 0;
  }

  issue(): void {
    const inv = this.invoice();
    if (!inv) return;
    this.confirm
      .open({
        title: 'Issue Invoice',
        message: 'Issue this invoice and assign a TRA receipt number?',
        confirmLabel: 'Issue',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.sales.issueInvoice(inv.id).subscribe({
          next: () => {
            this.notification.success('Invoice issued');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }

  send(): void {
    const inv = this.invoice();
    if (!inv) return;
    this.sales.sendInvoice(inv.id).subscribe({
      next: () => {
        this.notification.success('Invoice sent to customer');
        this.load();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  openPayment(): void {
    const inv = this.invoice();
    if (!inv) return;
    this.paymentForm.patchValue({ amount: Number(inv.balance) });
    this.showPayment.set(true);
  }

  submitPayment(): void {
    const inv = this.invoice();
    if (!inv || this.paymentForm.invalid) return;
    const raw = this.paymentForm.getRawValue();
    const payload: PaymentFormData = {
      customer: inv.customer_id,
      invoice: inv.id,
      amount: Number(raw.amount),
      payment_date: raw.payment_date!,
      payment_method: raw.payment_method!,
      reference_number: raw.reference_number ?? '',
      bank_name: raw.bank_name ?? '',
      notes: raw.notes ?? '',
    };
    this.savingPayment.set(true);
    this.sales
      .recordPayment(payload)
      .pipe(finalize(() => this.savingPayment.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Payment recorded');
          this.showPayment.set(false);
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  printInvoice(): void {
    printDocument('invoice-print-area');
  }

  exportPdf(): void {
    const inv = this.invoice();
    if (inv) exportInvoicePdf(inv);
  }
}
