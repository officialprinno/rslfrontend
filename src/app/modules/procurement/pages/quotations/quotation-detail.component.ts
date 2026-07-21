import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { SupplierQuotation } from '../../../../core/models/procurement.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProcurementService } from '../../../../core/services/procurement.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatDate } from '../../../../core/utils/format.util';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { ProcurementNavComponent } from '../../components/procurement-nav/procurement-nav.component';

type PreviewKind = 'pdf' | 'image' | 'unsupported';

@Component({
  selector: 'app-quotation-detail',
  imports: [
    RouterLink,
    PageHeaderComponent,
    ProcurementNavComponent,
    StatusBadgeComponent,
    TableSkeletonComponent,
    ErrorStateComponent,
    ModalComponent,
  ],
  templateUrl: './quotation-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuotationDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly procurement = inject(ProcurementService);
  private readonly notification = inject(NotificationService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly quotation = signal<SupplierQuotation | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly openingFile = signal(false);
  readonly showPreview = signal(false);
  readonly previewTitle = signal('');
  readonly previewKind = signal<PreviewKind>('unsupported');
  readonly safePreviewUrl = signal<SafeResourceUrl | null>(null);

  private blobUrl: string | null = null;

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error.set(true);
      this.loading.set(false);
      return;
    }
    this.load(id);
  }

  ngOnDestroy(): void {
    this.closePreview(false);
  }

  load(id = Number(this.route.snapshot.paramMap.get('id'))): void {
    this.loading.set(true);
    this.error.set(false);
    this.procurement
      .getQuotation(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (q) => this.quotation.set(q),
        error: () => this.error.set(true),
      });
  }

  statusFor(q: SupplierQuotation): string {
    return q.display_status ?? q.status;
  }

  statusLabel(q: SupplierQuotation): string {
    return q.display_status_label ?? q.status;
  }

  lineTotal(qty: number, price: number): number {
    return Number(qty) * Number(price);
  }

  itemsTotal(q: SupplierQuotation): number {
    return (q.items ?? []).reduce((sum, line) => sum + this.lineTotal(line.quantity, line.unit_price), 0);
  }

  viewPdf(q: SupplierQuotation): void {
    if (!q.has_quotation_file) return;

    this.openingFile.set(true);
    this.procurement
      .getQuotationArchiveFile(q.id, 'inline')
      .pipe(finalize(() => this.openingFile.set(false)))
      .subscribe({
        next: (blob) => this.openPreview(blob, q.quotation_file_name || 'quotation.pdf'),
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  downloadPdf(q: SupplierQuotation): void {
    if (!q.has_quotation_file) return;
    this.openingFile.set(true);
    this.procurement
      .getQuotationArchiveFile(q.id, 'attachment')
      .pipe(finalize(() => this.openingFile.set(false)))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = q.quotation_file_name || 'quotation.pdf';
          a.click();
          URL.revokeObjectURL(url);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  private previewKindFor(filename: string): PreviewKind {
    const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
    if (ext === '.pdf') return 'pdf';
    if (['.jpg', '.jpeg', '.png'].includes(ext)) return 'image';
    return 'unsupported';
  }

  private openPreview(blob: Blob, filename: string): void {
    this.closePreview(false);
    const url = URL.createObjectURL(blob);
    this.blobUrl = url;
    this.previewTitle.set(filename);
    this.previewKind.set(this.previewKindFor(filename));
    this.safePreviewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
    this.showPreview.set(true);
  }

  closePreview(revoke = true): void {
    if (revoke && this.blobUrl) URL.revokeObjectURL(this.blobUrl);
    this.blobUrl = null;
    this.safePreviewUrl.set(null);
    this.showPreview.set(false);
    this.previewTitle.set('');
    this.previewKind.set('unsupported');
  }
}
