import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { SupplierQuotation } from '../../../../core/models/procurement.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProcurementService } from '../../../../core/services/procurement.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatDate } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { EnterpriseDataTableComponent } from '../../../../shared/components/enterprise-data-table/enterprise-data-table.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { ProcurementNavComponent } from '../../components/procurement-nav/procurement-nav.component';

type PreviewKind = 'pdf' | 'image' | 'unsupported';

@Component({
  selector: 'app-quotations-list',
  imports: [
    RouterLink,
    PageHeaderComponent,
    ProcurementNavComponent,
    PaginationComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
    EnterpriseDataTableComponent,
    ModalComponent,
  ],
  templateUrl: './quotations-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuotationsListComponent implements OnInit, OnDestroy {
  private readonly procurement = inject(ProcurementService);
  private readonly notification = inject(NotificationService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly quotations = signal<SupplierQuotation[]>([]);
  readonly loading = signal(true);
  readonly openingFile = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly showPreview = signal(false);
  readonly previewTitle = signal('');
  readonly previewKind = signal<PreviewKind>('unsupported');
  readonly safePreviewUrl = signal<SafeResourceUrl | null>(null);

  private blobUrl: string | null = null;

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.closePreview(false);
  }

  load(): void {
    this.loading.set(true);
    this.procurement
      .getQuotations({ page: this.page(), page_size: 10, ordering: '-created_at' })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.quotations.set(d.results);
          this.total.set(d.count);
        },
      });
  }

  statusFor(q: SupplierQuotation): string {
    return q.display_status ?? q.status;
  }

  statusLabel(q: SupplierQuotation): string {
    return q.display_status_label ?? q.status;
  }

  isExpired(date: string): boolean {
    return new Date(date) < new Date();
  }

  viewPdf(q: SupplierQuotation, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
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
