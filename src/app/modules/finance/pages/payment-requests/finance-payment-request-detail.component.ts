import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { PaymentRelease, PurchaseOrder } from '../../../../core/models/procurement.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProcurementService } from '../../../../core/services/procurement.service';
import { PromptDialogService } from '../../../../core/services/prompt-dialog.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatDate, formatDateTime } from '../../../../core/utils/format.util';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { OpenFileComponent } from '../../../../shared/components/open-file/open-file.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import {
  canExecutePaymentRelease,
  canFinanceVerifyPayment,
  canGmApprovePaymentRelease,
} from '../../../procurement/utils/procurement-permissions.util';
import { FinanceNavComponent } from '../../components/finance-nav/finance-nav.component';

@Component({
  selector: 'app-finance-payment-request-detail',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    FinanceNavComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
    OpenFileComponent,
  ],
  templateUrl: './finance-payment-request-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancePaymentRequestDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly procurement = inject(ProcurementService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly promptDialog = inject(PromptDialogService);

  readonly release = signal<PaymentRelease | null>(null);
  readonly po = signal<PurchaseOrder | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;
  readonly canVerify = () => canFinanceVerifyPayment(this.auth);
  readonly canGm = () => canGmApprovePaymentRelease(this.auth);
  readonly canExecute = () => canExecutePaymentRelease(this.auth);

  financeNotes = '';
  paymentMethod = 'Bank Transfer';
  paymentReference = '';
  paymentDate = new Date().toISOString().slice(0, 10);
  paymentEvidence: File | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(+id);
  }

  load(id: number): void {
    this.loading.set(true);
    this.procurement
      .getPaymentRelease(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (r) => {
          this.release.set(r);
          this.procurement.getPurchaseOrder(r.purchase_order).subscribe({
            next: (p) => this.po.set(p),
            error: () => this.po.set(null),
          });
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  financeVerify(sendToGm: boolean): void {
    const r = this.release();
    if (!r) return;
    const overThreshold = r.gm_approval_required === true;
    const title = sendToGm || overThreshold ? 'Verify & Send to GM' : 'Approve for Payment';
    const message =
      sendToGm || overThreshold
        ? `Confirm PO ${r.po_number} matches invoice ${r.invoice_number} and send to GM for approval?`
        : `Confirm PO ${r.po_number} matches invoice ${r.invoice_number} and approve for payment without GM review?`;
    this.confirm
      .open({ title, message })
      .subscribe((ok) => {
        if (!ok) return;
        this.saving.set(true);
        this.procurement
          .financeVerifyPaymentRelease(r.id, this.financeNotes, sendToGm)
          .pipe(finalize(() => this.saving.set(false)))
          .subscribe({
            next: (updated) => {
              this.notification.success(
                sendToGm || overThreshold
                  ? 'Verified — sent to GM for approval'
                  : 'Verified — approved for payment execution',
              );
              this.release.set(updated);
            },
            error: (e) => this.notification.error(getApiErrorMessage(e)),
          });
      });
  }

  gmSkipped(): boolean {
    const r = this.release();
    return !!r?.finance_reviewed_at && r.status === 'APPROVED' && !r.gm_reviewed_at;
  }

  gmReview(approved: boolean): void {
    const r = this.release();
    if (!r) return;
    if (!approved) {
      this.promptDialog.open({
        title: 'Reject Payment Request',
        message: `Provide a reason for rejecting payment to ${r.supplier_name}.`,
        label: 'Rejection reason',
        placeholder: 'Explain why this payment request is being rejected',
        required: true,
        multiline: true,
        confirmLabel: 'Reject Payment',
      }).subscribe((reason) => {
        if (!reason?.trim()) return;
        this.submitGmReview(false, reason.trim());
      });
      return;
    }
    this.confirm
      .open({
        title: 'Approve Payment',
        message: `Approve payment of ${this.formatCurrency(r.amount_in_tzs, 'TZS')} to ${r.supplier_name}?`,
      })
      .subscribe((ok) => {
        if (ok) this.submitGmReview(true, '');
      });
  }

  private submitGmReview(approved: boolean, notes: string): void {
    const r = this.release()!;
    this.saving.set(true);
    this.procurement
      .gmReviewPaymentRelease(r.id, approved, notes)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (updated) => {
          this.notification.success(approved ? 'Payment approved — finance notified' : 'Payment rejected');
          this.release.set(updated);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  onEvidenceSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.paymentEvidence = input.files?.[0] ?? null;
  }

  executePayment(): void {
    const r = this.release();
    if (!r || !this.paymentReference.trim()) {
      this.notification.error('Payment reference is required');
      return;
    }
    this.confirm
      .open({
        title: 'Record Supplier Payment',
        message: `Confirm payment of ${this.formatCurrency(r.amount_in_tzs, 'TZS')} to ${r.supplier_name}?`,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.saving.set(true);
        this.procurement
          .executePaymentRelease(r.id, {
            payment_method: this.paymentMethod,
            payment_reference: this.paymentReference.trim(),
            payment_date: this.paymentDate,
            payment_evidence: this.paymentEvidence ?? undefined,
          })
          .pipe(finalize(() => this.saving.set(false)))
          .subscribe({
            next: (updated) => {
              this.notification.success('Payment recorded — supplier marked as paid');
              this.release.set(updated);
            },
            error: (e) => this.notification.error(getApiErrorMessage(e)),
          });
      });
  }

  amountMatchesPo(): boolean | null {
    const r = this.release();
    if (!r) return null;
    const expected = Number(
      r.expected_stage_amount ??
        (r.stage === 'FULL'
          ? r.po_total ?? this.po()?.total_amount ?? 0
          : 0),
    );
    const payment = Number(r.amount);
    if (!expected || !payment) return null;
    const diff = Math.abs(payment - expected) / Math.max(expected, payment);
    return diff <= 0.02;
  }

  expectedAmountLabel(): string {
    const stage = this.release()?.stage;
    if (stage === 'ADVANCE') return 'configured advance';
    if (stage === 'FINAL') return 'remaining PO balance';
    return 'PO total';
  }
}
