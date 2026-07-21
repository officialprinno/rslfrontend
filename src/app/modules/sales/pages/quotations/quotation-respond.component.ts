import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { Quotation, QuotationCustomerResponse, QuotationDocument } from '../../../../core/models/sales.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { SalesService } from '../../../../core/services/sales.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { downloadBlob } from '../../../../core/utils/download.util';
import { formatDateTime } from '../../../../core/utils/format.util';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { QuotationDocumentComponent } from '../../components/quotation-document/quotation-document.component';

@Component({
  selector: 'app-quotation-respond',
  imports: [FormsModule, ModalComponent, QuotationDocumentComponent],
  templateUrl: './quotation-respond.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuotationRespondComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly sales = inject(SalesService);
  private readonly notification = inject(NotificationService);

  readonly quotation = signal<Quotation | null>(null);
  readonly document = signal<QuotationDocument | null>(null);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly exporting = signal(false);
  readonly error = signal<string | null>(null);
  readonly submitted = signal(false);
  readonly showFeedbackModal = signal(false);
  readonly pendingResponse = signal<QuotationCustomerResponse | null>(null);

  readonly formatDateTime = formatDateTime;
  readonly token = signal('');
  feedbackNotes = '';

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token') ?? '';
    this.token.set(token);
    if (!token) {
      this.error.set('Invalid quotation link.');
      this.loading.set(false);
      return;
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    const token = this.token();
    this.sales
      .getQuotationByToken(token)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (q) => {
          this.quotation.set(q);
          this.sales.getQuotationDocumentByToken(token).subscribe({
            next: (doc) => this.document.set(doc),
            error: () => {},
          });
        },
        error: (e) => this.error.set(getApiErrorMessage(e, 'Quotation not found or link has expired.')),
      });
  }

  startResponse(response: QuotationCustomerResponse): void {
    if (this.submitting() || this.submitted()) return;
    if (response === 'ACCEPTED') {
      this.respond('ACCEPTED');
      return;
    }
    this.pendingResponse.set(response);
    this.feedbackNotes = '';
    this.showFeedbackModal.set(true);
  }

  submitFeedback(): void {
    const response = this.pendingResponse();
    if (!response) return;
    const notes = this.feedbackNotes.trim();
    if (!notes) {
      this.notification.error('Please describe your requested changes or reason for declining.');
      return;
    }
    this.showFeedbackModal.set(false);
    this.respond(response, notes);
  }

  closeFeedbackModal(): void {
    this.showFeedbackModal.set(false);
    this.pendingResponse.set(null);
    this.feedbackNotes = '';
  }

  feedbackModalTitle(): string {
    return this.pendingResponse() === 'REVISION'
      ? 'Request Revision'
      : 'Decline Quotation';
  }

  feedbackModalHint(): string {
    return this.pendingResponse() === 'REVISION'
      ? 'Describe the changes or suggestions you would like on this quotation.'
      : 'Please tell us why you are declining this quotation.';
  }

  private respond(response: QuotationCustomerResponse, notes = ''): void {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.sales
      .respondToQuotation(this.token(), response, notes)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (q) => {
          this.quotation.set(q);
          this.submitted.set(true);
          const labels: Record<QuotationCustomerResponse, string> = {
            ACCEPTED: 'Quotation accepted. Thank you!',
            REJECTED: 'Quotation declined.',
            REVISION: 'Revision request submitted.',
          };
          this.notification.success(labels[response]);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  downloadPdf(): void {
    const q = this.quotation();
    if (!q) return;
    this.exporting.set(true);
    this.sales
      .downloadQuotationPdfByToken(this.token())
      .pipe(finalize(() => this.exporting.set(false)))
      .subscribe({
        next: (blob) => downloadBlob(blob, `${q.quotation_number}.pdf`),
        error: (e) => this.notification.error(getApiErrorMessage(e, 'Failed to download PDF')),
      });
  }

  alreadyResponded(q: Quotation): boolean {
    return !!q.customer_response || !!q.customer_responded_at;
  }

  canRespond(q: Quotation): boolean {
    if (this.alreadyResponded(q)) return false;
    return ['WAITING_CUSTOMER', 'SENT', 'QUOTATION_SENT'].includes(q.status);
  }

  responseLabel(response?: string | null): string {
    const map: Record<string, string> = {
      ACCEPTED: 'Accepted',
      REJECTED: 'Rejected',
      REVISION: 'Revision Requested',
    };
    return response ? (map[response] ?? response) : '—';
  }

  responseBadgeClass(response?: string | null): string {
    if (response === 'ACCEPTED') return 'bg-emerald-50 border-emerald-200 text-emerald-900';
    if (response === 'REVISION') return 'bg-amber-50 border-amber-200 text-amber-900';
    if (response === 'REJECTED') return 'bg-red-50 border-red-200 text-red-900';
    return 'bg-gray-50 border-gray-200 text-gray-800';
  }
}
