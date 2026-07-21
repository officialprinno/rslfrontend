import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { QuotationDocument, QuotationVerification } from '../../../../core/models/sales.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { SalesService } from '../../../../core/services/sales.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { downloadBlob } from '../../../../core/utils/download.util';
import { formatCurrency, formatDate } from '../../../../core/utils/format.util';
import { QrCodeComponent } from '../../../../shared/components/qr-code/qr-code.component';
import { QuotationDocumentComponent } from '../../components/quotation-document/quotation-document.component';

@Component({
  selector: 'app-quotation-verify',
  imports: [RouterLink, QrCodeComponent, QuotationDocumentComponent],
  templateUrl: './quotation-verify.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuotationVerifyComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly sales = inject(SalesService);
  private readonly notification = inject(NotificationService);

  readonly verification = signal<QuotationVerification | null>(null);
  readonly document = signal<QuotationDocument | null>(null);
  readonly loading = signal(true);
  readonly exporting = signal(false);
  readonly error = signal<string | null>(null);
  readonly showDocument = signal(false);

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;

  readonly token = signal('');

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token') ?? '';
    this.token.set(token);
    if (!token) {
      this.error.set('Invalid verification link.');
      this.loading.set(false);
      return;
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.sales
      .verifyQuotationByToken(this.token())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (v) => this.verification.set(v),
        error: (e) => this.error.set(getApiErrorMessage(e, 'Quotation could not be verified.')),
      });
  }

  viewDocument(): void {
    if (this.document()) {
      this.showDocument.set(true);
      return;
    }
    this.sales.getQuotationDocumentByToken(this.token()).subscribe({
      next: (doc) => {
        this.document.set(doc);
        this.showDocument.set(true);
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  downloadPdf(): void {
    const v = this.verification();
    if (!v) return;
    this.exporting.set(true);
    this.sales
      .downloadQuotationPdfByToken(this.token())
      .pipe(finalize(() => this.exporting.set(false)))
      .subscribe({
        next: (blob) => downloadBlob(blob, `${v.quotation_number}.pdf`),
        error: (e) => this.notification.error(getApiErrorMessage(e, 'Failed to download PDF')),
      });
  }
}
