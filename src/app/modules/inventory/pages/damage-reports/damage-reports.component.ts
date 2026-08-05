import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { ApiResponse } from '../../../../core/models/auth.models';
import {
  DamageReport,
  DamageReportFormData,
  DamageType,
  Item,
  Warehouse,
} from '../../../../core/models/inventory.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { extractFieldErrors, getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatDateTime, formatNumber } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { InventoryNavComponent } from '../../components/inventory-nav/inventory-nav.component';
import {
  canCreateDamageReport,
  canGmApproveDamageReport,
  canResolveDamageReport,
} from '../../utils/inventory-permissions.util';

@Component({
  selector: 'app-damage-reports',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    InventoryNavComponent,
    ModalComponent,
    PaginationComponent,
    StatusBadgeComponent,
    SearchableSelectComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './damage-reports.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DamageReportsComponent implements OnInit {
  private readonly inventory = inject(InventoryService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);

  readonly reports = signal<DamageReport[]>([]);
  readonly items = signal<Item[]>([]);
  readonly warehouses = signal<Warehouse[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly saving = signal(false);
  readonly showModal = signal(false);
  readonly showDetailModal = signal(false);
  readonly detailLoading = signal(false);
  readonly detailReport = signal<DamageReport | null>(null);
  readonly viewedAttachmentIds = signal<Set<number>>(new Set());
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly fieldErrors = signal<Record<string, string>>({});
  readonly selectedFiles = signal<File[]>([]);
  readonly batchNumbersInput = signal('');
  readonly serialNumbersInput = signal('');

  readonly formatDateTime = formatDateTime;
  readonly formatNumber = formatNumber;
  readonly formatCurrency = formatCurrency;
  readonly Number = Number;

  readonly damageTypes: { value: DamageType; label: string }[] = [
    { value: 'DAMAGED', label: 'Damaged' },
    { value: 'EXPIRED', label: 'Expired' },
    { value: 'LOST', label: 'Lost' },
    { value: 'QUALITY_REJECT', label: 'Quality Reject' },
    { value: 'OTHER', label: 'Other' },
  ];

  readonly form = this.fb.group({
    item: [null as number | null, Validators.required],
    warehouse: [null as number | null, Validators.required],
    damage_type: ['DAMAGED' as DamageType, Validators.required],
    quantity_affected: [1, [Validators.required, Validators.min(0.0001)]],
    description: ['', Validators.required],
  });

  readonly canAdd = () => canCreateDamageReport(this.auth);
  readonly canResolve = () => canResolveDamageReport(this.auth);
  readonly canGmApprove = () => canGmApproveDamageReport(this.auth);

  ngOnInit(): void {
    this.inventory.getItems({ page_size: 100 }).subscribe((d) => this.items.set(d.results));
    this.inventory.getWarehouses().subscribe((w) => this.warehouses.set(w));
    this.load(() => this.openFromQueryParams());
  }

  itemOptions(): SelectOption[] {
    return this.items().map((i) => ({
      value: i.id,
      label: `${i.code} — ${i.name}`,
      sublabel: i.category_name,
    }));
  }

  selectedItem(): Item | undefined {
    const id = this.form.controls.item.value;
    return id ? this.items().find((i) => i.id === id) : undefined;
  }

  private parseListInput(raw: string): string[] {
    return raw
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  load(afterLoad?: () => void): void {
    this.loading.set(true);
    this.error.set(false);
    const status = this.route.snapshot.queryParamMap.get('status') || undefined;
    this.inventory
      .getDamageReports({
        page: this.page(),
        page_size: this.pageSize(),
        ordering: '-created_at',
        ...(status ? { status } : {}),
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => {
          this.reports.set(data.results);
          this.total.set(data.count);
          afterLoad?.();
        },
        error: () => this.error.set(true),
      });
  }

  private openFromQueryParams(): void {
    const id = Number(this.route.snapshot.queryParamMap.get('id'));
    if (!id) {
      return;
    }
    const match = this.reports().find((r) => r.id === id);
    if (match) {
      this.openDetail(match);
      return;
    }
    this.inventory.getDamageReport(id).subscribe({
      next: (report) => this.openDetail(report),
      error: () => undefined,
    });
  }

  openNew(): void {
    this.fieldErrors.set({});
    this.selectedFiles.set([]);
    this.batchNumbersInput.set('');
    this.serialNumbersInput.set('');
    this.form.reset({
      item: null,
      warehouse: null,
      damage_type: 'DAMAGED',
      quantity_affected: 1,
      description: '',
    });
    this.showModal.set(true);
  }

  onItemSelected(value: number | string | null): void {
    const id =
      typeof value === 'number'
        ? value
        : typeof value === 'string' && value
          ? Number(value)
          : null;
    this.form.controls.item.setValue(Number.isFinite(id) ? id : null);
    this.form.controls.item.markAsTouched();
    this.form.controls.item.updateValueAndValidity();
    this.cdr.markForCheck();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFiles.set(input.files ? Array.from(input.files) : []);
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    const item = this.selectedItem();
    const batchNumbers = this.parseListInput(this.batchNumbersInput());
    const serialNumbers = this.parseListInput(this.serialNumbersInput());

    if (item?.has_batch_tracking && !batchNumbers.length) {
      this.notification.error('Batch number(s) are required for this item.');
      return;
    }
    if (item?.has_serial_number && !serialNumbers.length) {
      this.notification.error('Serial number(s) are required for this item.');
      return;
    }

    if (this.form.invalid) {
      const missing: string[] = [];
      if (this.form.controls.item.invalid) missing.push('item');
      if (this.form.controls.warehouse.invalid) missing.push('warehouse');
      if (this.form.controls.description.invalid) missing.push('description');
      if (this.form.controls.quantity_affected.invalid) missing.push('quantity');
      this.cdr.markForCheck();
      this.notification.error(
        missing.length
          ? `Complete required fields: ${missing.join(', ')}.`
          : 'Complete all required fields.',
      );
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const data: DamageReportFormData = {
      item: Number(raw.item),
      warehouse: Number(raw.warehouse),
      damage_type: raw.damage_type ?? 'DAMAGED',
      quantity_affected: Number(raw.quantity_affected),
      description: (raw.description ?? '').trim(),
      batch_numbers: batchNumbers.length ? batchNumbers : undefined,
      serial_numbers: serialNumbers.length ? serialNumbers : undefined,
      attachments: this.selectedFiles(),
    };
    this.inventory
      .createDamageReport(data)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Damage report submitted — awaiting GM approval');
          this.showModal.set(false);
          this.load();
        },
        error: (err: unknown) => {
          const httpErr = err as { error?: ApiResponse<unknown> };
          if (httpErr.error?.errors) this.fieldErrors.set(extractFieldErrors(httpErr.error.errors));
          this.notification.error(getApiErrorMessage(err, 'Failed to file damage report'));
          this.cdr.markForCheck();
        },
      });
  }

  resolve(
    report: DamageReport,
    resolution: 'REVIEWED' | 'WRITTEN_OFF' | 'RECOVERED',
  ): void {
    const labels = {
      REVIEWED: 'Mark as reviewed',
      WRITTEN_OFF: 'Write off frozen stock',
      RECOVERED: 'Return stock to available',
    };
    this.confirm
      .open({
        title: labels[resolution],
        message: `${labels[resolution]} for ${report.report_number}?`,
        confirmLabel: 'Confirm',
        confirmDanger: resolution === 'WRITTEN_OFF',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.inventory.resolveDamageReport(report.id, resolution).subscribe({
          next: () => {
            this.notification.success('Damage report updated');
            this.load();
          },
          error: (e: unknown) =>
            this.notification.error(getApiErrorMessage(e, 'Resolution failed')),
        });
      });
  }

  isResolvable(report: DamageReport): boolean {
    return report.status === 'FROZEN' || report.status === 'PENDING' || report.status === 'REVIEWED';
  }

  openDetail(report: DamageReport): void {
    this.detailReport.set(null);
    this.viewedAttachmentIds.set(new Set());
    this.showDetailModal.set(true);
    this.detailLoading.set(true);
    this.inventory
      .getDamageReport(report.id)
      .pipe(finalize(() => this.detailLoading.set(false)))
      .subscribe({
        next: (full) => {
          this.detailReport.set(full);
          const autoViewed = new Set<number>();
          for (const att of full.attachments ?? []) {
            if (this.isImageAttachment(att)) autoViewed.add(att.id);
          }
          this.viewedAttachmentIds.set(autoViewed);
        },
        error: (e) => {
          this.notification.error(getApiErrorMessage(e, 'Failed to load report'));
          this.showDetailModal.set(false);
        },
      });
  }

  closeDetail(): void {
    this.showDetailModal.set(false);
    this.detailReport.set(null);
    this.viewedAttachmentIds.set(new Set());
  }

  isImageAttachment(att: { file_url: string | null; file: string }): boolean {
    const url = (att.file_url || att.file || '').toLowerCase();
    return /\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i.test(url);
  }

  isPdfAttachment(att: { file_url: string | null; file: string }): boolean {
    const url = (att.file_url || att.file || '').toLowerCase();
    return url.endsWith('.pdf');
  }

  attachmentUrl(att: { file_url: string | null; file: string }): string {
    return att.file_url || att.file;
  }

  markAttachmentViewed(id: number): void {
    this.viewedAttachmentIds.update((current) => new Set([...current, id]));
  }

  openAttachment(att: { id: number; file_url: string | null; file: string }): void {
    const url = this.attachmentUrl(att);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    this.markAttachmentViewed(att.id);
  }

  allAttachmentsReviewed(): boolean {
    const report = this.detailReport();
    const attachments = report?.attachments ?? [];
    if (!attachments.length) return true;
    const viewed = this.viewedAttachmentIds();
    return attachments.every((att) => viewed.has(att.id));
  }

  canGmActOnDetail(): boolean {
    const report = this.detailReport();
    if (!report || report.status !== 'PENDING_GM') return false;
    return report.can_gm_approve || this.canGmApprove();
  }

  gmApproveFromDetail(): void {
    const report = this.detailReport();
    if (!report || !this.canGmActOnDetail() || !this.allAttachmentsReviewed()) return;
    this.gmApprove(report, () => this.closeDetail());
  }

  gmRejectFromDetail(): void {
    const report = this.detailReport();
    if (!report || !this.canGmActOnDetail()) return;
    this.gmReject(report, () => this.closeDetail());
  }

  stockImpactClass(report: DamageReport): string {
    if (report.status === 'WRITTEN_OFF') {
      return 'bg-gray-100 text-gray-700';
    }
    if (report.status === 'PENDING_GM' || report.status === 'REJECTED') {
      return 'bg-amber-50 text-amber-800';
    }
    if (report.status === 'FROZEN' || report.status === 'PENDING' || report.status === 'REVIEWED') {
      return 'bg-blue-50 text-blue-800';
    }
    if (report.status === 'RECOVERED') {
      return 'bg-green-50 text-green-800';
    }
    return 'bg-gray-50 text-gray-700';
  }

  gmApprove(report: DamageReport, onSuccess?: () => void): void {
    this.confirm
      .open({
        title: 'Approve damage report',
        message: `Approve ${report.report_number} and freeze ${report.quantity_affected} units of ${report.item_code}?`,
        confirmLabel: 'Approve & Freeze',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.inventory.gmApproveDamageReport(report.id).subscribe({
          next: () => {
            this.notification.success('Approved — stock frozen (status: Frozen)');
            onSuccess?.();
            this.load();
          },
          error: (e: unknown) =>
            this.notification.error(getApiErrorMessage(e, 'GM approval failed')),
        });
      });
  }

  gmReject(report: DamageReport, onSuccess?: () => void): void {
    this.confirm
      .open({
        title: 'Reject damage report',
        message: `Reject ${report.report_number}? Stock will not be frozen.`,
        confirmLabel: 'Reject',
        confirmDanger: true,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.inventory.gmRejectDamageReport(report.id).subscribe({
          next: () => {
            this.notification.success('Damage report rejected');
            onSuccess?.();
            this.load();
          },
          error: (e: unknown) =>
            this.notification.error(getApiErrorMessage(e, 'Rejection failed')),
        });
      });
  }

  onPageChange(p: number): void {
    this.page.set(p);
    this.load();
  }

  onPageSizeChange(s: number): void {
    this.pageSize.set(s);
    this.page.set(1);
    this.load();
  }
}
