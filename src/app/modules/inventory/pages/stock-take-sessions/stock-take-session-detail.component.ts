import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import {
  StockTakeSession,
  StockTakeSessionLine,
  StockTakeVarianceReview,
} from '../../../../core/models/inventory.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PromptDialogService } from '../../../../core/services/prompt-dialog.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatDateTime, formatNumber } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { InventoryNavComponent } from '../../components/inventory-nav/inventory-nav.component';
import {
  canGmApproveStockTakeSession,
  canSubmitStockTakeSession,
  canUploadStockTakeSession,
} from '../../utils/inventory-permissions.util';

@Component({
  selector: 'app-stock-take-session-detail',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    InventoryNavComponent,
    PaginationComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './stock-take-session-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockTakeSessionDetailComponent implements OnInit {
  private readonly inventory = inject(InventoryService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly prompt = inject(PromptDialogService);
  private readonly route = inject(ActivatedRoute);

  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly session = signal<StockTakeSession | null>(null);
  readonly lines = signal<StockTakeSessionLine[]>([]);
  readonly variance = signal<StockTakeVarianceReview | null>(null);
  readonly loading = signal(true);
  readonly linesLoading = signal(false);
  readonly varianceLoading = signal(false);
  readonly error = signal(false);
  readonly busy = signal(false);
  readonly totalLines = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(25);
  readonly showVariance = signal(false);

  readonly formatDateTime = formatDateTime;
  readonly formatNumber = formatNumber;
  readonly formatCurrency = formatCurrency;

  readonly canUpload = () => canUploadStockTakeSession(this.auth);
  readonly canSubmit = () => canSubmitStockTakeSession(this.auth);
  readonly canGm = () => canGmApproveStockTakeSession(this.auth);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error.set(true);
      this.loading.set(false);
      return;
    }
    this.loadSession(id);
  }

  sessionId(): number | null {
    const fromSession = this.session()?.id;
    if (fromSession) return fromSession;
    const raw = Number(this.route.snapshot.paramMap.get('id'));
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }

  loadSession(id?: number): void {
    const sid = id ?? this.sessionId();
    if (!sid) return;
    this.loading.set(true);
    this.error.set(false);
    this.inventory
      .getStockTakeSession(sid)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (s) => {
          this.session.set(s);
          this.loadLines();
        },
        error: () => this.error.set(true),
      });
  }

  loadLines(): void {
    const sid = this.sessionId();
    if (!sid) return;
    this.linesLoading.set(true);
    this.inventory
      .getStockTakeSessionLines(sid, {
        page: this.page(),
        page_size: this.pageSize(),
      })
      .pipe(finalize(() => this.linesLoading.set(false)))
      .subscribe({
        next: (d) => {
          this.lines.set(d.results);
          this.totalLines.set(d.count);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  loadVariance(): void {
    const sid = this.sessionId();
    if (!sid) return;
    this.showVariance.set(true);
    this.varianceLoading.set(true);
    this.inventory
      .getStockTakeVarianceReview(sid)
      .pipe(finalize(() => this.varianceLoading.set(false)))
      .subscribe({
        next: (v) => this.variance.set(v),
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  canExport(): boolean {
    const s = this.session()?.status;
    return !!s && !['DRAFT', 'COMPLETED', 'APPROVED', 'ADJUSTED'].includes(s);
  }

  canUploadCsv(): boolean {
    const s = this.session()?.status;
    return this.canUpload() && (s === 'COUNTING' || s === 'UPLOADED');
  }

  canMarkReviewed(): boolean {
    return this.canSubmit() && this.session()?.status === 'UPLOADED';
  }

  canSubmitGm(): boolean {
    return this.canSubmit() && this.session()?.status === 'REVIEWED';
  }

  canGmAct(): boolean {
    return this.canGm() && this.session()?.status === 'PENDING_GM_APPROVAL';
  }

  exportCsv(): void {
    const sid = this.sessionId();
    const session = this.session();
    if (!sid || !session) return;
    this.busy.set(true);
    this.inventory
      .exportStockTakeSessionCsv(sid)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${session.session_number}_count_sheet.csv`;
          a.click();
          URL.revokeObjectURL(url);
          this.notification.success('Blind count sheet downloaded');
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  pickFile(): void {
    this.fileInput()?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const sid = this.sessionId();
    if (!sid) return;
    this.busy.set(true);
    this.inventory
      .uploadStockTakeSessionCsv(sid, file)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (result) => {
          this.session.set(result.session);
          this.notification.success(
            result.upload.all_counted
              ? 'Upload complete — all lines counted; session reviewed'
              : `Uploaded ${result.upload.updated_count} line(s)`,
          );
          this.loadLines();
          if (this.showVariance()) this.loadVariance();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  markReviewed(): void {
    const sid = this.sessionId();
    if (!sid) return;
    this.busy.set(true);
    this.inventory
      .markStockTakeSessionReviewed(sid)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (s) => {
          this.session.set(s);
          this.notification.success('Marked reviewed');
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  submitForGm(): void {
    const sid = this.sessionId();
    if (!sid) return;
    this.busy.set(true);
    this.inventory
      .submitStockTakeSessionForGm(sid)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (s) => {
          this.session.set(s);
          this.notification.success('Submitted for GM approval');
          this.loadVariance();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  gmApprove(): void {
    const sid = this.sessionId();
    if (!sid) return;
    this.confirm
      .open({
        title: 'Approve stock take?',
        message:
          'This will post inventory adjustments and a journal entry for non-zero variances. This cannot be undone.',
        confirmLabel: 'Approve & Post',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.busy.set(true);
        this.inventory
          .gmApproveStockTakeSession(sid)
          .pipe(finalize(() => this.busy.set(false)))
          .subscribe({
            next: (s) => {
              this.session.set(s);
              this.notification.success('Approved — adjustments posted');
              this.loadLines();
              this.loadVariance();
            },
            error: (e) => this.notification.error(getApiErrorMessage(e)),
          });
      });
  }

  gmReject(): void {
    const sid = this.sessionId();
    if (!sid) return;
    this.prompt
      .open({
        title: 'Reject / request re-count',
        message:
          'Notes will be saved and the warehouse returned to COUNTING (outbound freeze re-applied).',
        label: 'Rejection notes',
        placeholder: 'Reason for re-count…',
        multiline: true,
        confirmLabel: 'Reject',
      })
      .subscribe((notes) => {
        if (notes === null) return;
        this.busy.set(true);
        this.inventory
          .gmRejectStockTakeSession(sid, notes)
          .pipe(finalize(() => this.busy.set(false)))
          .subscribe({
            next: (s) => {
              this.session.set(s);
              this.notification.success('Rejected — returned to counting');
            },
            error: (e) => this.notification.error(getApiErrorMessage(e)),
          });
      });
  }

  num(value: string | number | null | undefined): number {
    if (value === null || value === undefined || value === '') return 0;
    return Number(value);
  }
}
