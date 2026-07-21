import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { SupplierOrderTracking, SupplierTrackingStatus } from '../../../../core/models/inventory.model';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDate, formatDateTime } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { EnterpriseDataTableComponent } from '../../../../shared/components/enterprise-data-table/enterprise-data-table.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { InventoryNavComponent } from '../../components/inventory-nav/inventory-nav.component';

@Component({
  selector: 'app-order-tracking',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    InventoryNavComponent,
    ModalComponent,
    PaginationComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
    EnterpriseDataTableComponent,
  ],
  templateUrl: './order-tracking.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderTrackingComponent implements OnInit {
  private readonly inventory = inject(InventoryService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly rows = signal<SupplierOrderTracking[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly saving = signal(false);
  readonly showModal = signal(false);
  readonly selected = signal<SupplierOrderTracking | null>(null);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly statusFilter = signal('');
  readonly search = signal('');
  readonly portalUrl = signal('');

  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;

  /** Full status catalog for filters, manual updates, and in-app guidance. */
  readonly trackingStatusCatalog: {
    value: SupplierTrackingStatus;
    label: string;
    description: string;
    supplierCanSet: boolean;
    grnRequired?: boolean;
  }[] = [
    {
      value: 'AWAITING',
      label: 'Awaiting',
      description: 'No supplier response yet. Use only if you need to reset or correct the record.',
      supplierCanSet: false,
    },
    {
      value: 'ACKNOWLEDGED',
      label: 'Acknowledged',
      description: 'Supplier confirmed they received the PO and will fulfil it.',
      supplierCanSet: true,
    },
    {
      value: 'MANUFACTURING',
      label: 'Manufacturing',
      description: 'Items are being manufactured or prepared by the supplier.',
      supplierCanSet: true,
    },
    {
      value: 'PRODUCTION',
      label: 'Production',
      description: 'Order is in active production before dispatch.',
      supplierCanSet: true,
    },
    {
      value: 'DISPATCHED',
      label: 'Dispatched',
      description: 'Goods have left the supplier and are on the way.',
      supplierCanSet: true,
    },
    {
      value: 'IN_TRANSIT',
      label: 'In Transit',
      description: 'Shipment is en route to your site or warehouse.',
      supplierCanSet: true,
    },
    {
      value: 'DELAYED',
      label: 'Delayed',
      description: 'Delivery or production is behind the expected schedule.',
      supplierCanSet: true,
    },
    {
      value: 'DELIVERED',
      label: 'Delivered',
      description:
        'Goods have arrived at your site. This is the final step — GRN can only be created after Delivered is set.',
      supplierCanSet: false,
      grnRequired: true,
    },
  ];

  readonly statusOptions: { value: SupplierTrackingStatus | ''; label: string }[] = [
    { value: '', label: 'All statuses' },
    ...this.trackingStatusCatalog.map((s) => ({ value: s.value, label: s.label })),
    { value: 'CUSTOM', label: 'Custom (typed status)' },
  ];

  readonly supplierStatusOptions = this.trackingStatusCatalog.filter((s) => s.supplierCanSet);

  readonly staffOnlyStatusOptions = this.trackingStatusCatalog.filter((s) => !s.supplierCanSet);

  /** All statuses inventory staff may set manually in the Update dialog. */
  readonly manualStatusOptions = this.trackingStatusCatalog;

  statusMeta(status: SupplierTrackingStatus | null | undefined) {
    return this.trackingStatusCatalog.find((s) => s.value === status) ?? null;
  }

  readonly form = this.fb.group({
    statusInputMode: ['preset' as 'preset' | 'custom', Validators.required],
    status: ['ACKNOWLEDGED' as SupplierTrackingStatus, Validators.required],
    manual_status_label: [''],
    dispatch_date: [''],
    eta_date: [''],
    quantity_dispatched: [null as number | null],
    carrier: [''],
    tracking_number: [''],
    supplier_notes: [''],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    const params: Record<string, string | number> = {
      page: this.page(),
      page_size: this.pageSize(),
    };
    if (this.statusFilter()) params['status'] = this.statusFilter();
    if (this.search().trim()) params['search'] = this.search().trim();

    this.inventory
      .getOrderTracking(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => {
          this.rows.set(data.results);
          this.total.set(data.count);
        },
        error: () => this.error.set(true),
      });
  }

  onPageChange(p: number): void {
    this.page.set(p);
    this.load();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.load();
  }

  openEdit(row: SupplierOrderTracking): void {
    this.selected.set(row);
    this.portalUrl.set('');
    const isCustom = row.status === 'CUSTOM' && !!row.manual_status_label;
    this.form.reset({
      statusInputMode: isCustom ? 'custom' : 'preset',
      status: isCustom ? 'AWAITING' : row.status,
      manual_status_label: row.manual_status_label ?? '',
      dispatch_date: row.dispatch_date ?? '',
      eta_date: row.eta_date ?? '',
      quantity_dispatched: row.quantity_dispatched,
      carrier: row.carrier,
      tracking_number: row.tracking_number,
      supplier_notes: row.supplier_notes,
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selected.set(null);
    this.portalUrl.set('');
  }

  save(): void {
    const row = this.selected();
    if (!row || this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.error('Please complete required fields.');
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    const useCustom = v.statusInputMode === 'custom';
    const customLabel = (v.manual_status_label ?? '').trim();
    if (useCustom && !customLabel) {
      this.saving.set(false);
      this.notification.error('Type the custom status or switch to standard status list.');
      return;
    }
    this.inventory
      .updateOrderTracking(row.id, {
        status: useCustom ? 'CUSTOM' : (v.status ?? undefined),
        manual_status_label: useCustom ? customLabel : '',
        dispatch_date: v.dispatch_date || null,
        eta_date: v.eta_date || null,
        quantity_dispatched: v.quantity_dispatched,
        carrier: v.carrier ?? '',
        tracking_number: v.tracking_number ?? '',
        supplier_notes: v.supplier_notes ?? '',
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Tracking updated');
          this.closeModal();
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  regenerateLink(): void {
    const row = this.selected();
    if (!row || this.saving()) return;
    this.saving.set(true);
    this.inventory
      .regenerateOrderTrackingToken(row.id)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (data) => {
          this.portalUrl.set(data.portal_url);
          this.notification.success('New supplier portal link generated');
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  emailSupplier(row: SupplierOrderTracking): void {
    if (this.saving()) return;
    if (!row.supplier_email) {
      this.notification.error('Supplier has no email address on file.');
      return;
    }
    this.saving.set(true);
    this.inventory
      .sendOrderTrackingStatusRequest(row.id)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (data) => {
          this.notification.success(`Status request sent to ${data.email}`);
          if (this.selected()?.id === row.id && data.portal_url) {
            this.portalUrl.set(data.portal_url);
          }
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  emailSelectedSupplier(): void {
    const row = this.selected();
    if (!row) return;
    this.emailSupplier(row);
  }
}
