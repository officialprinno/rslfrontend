import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { PurchaseRequisition, RFQ, Supplier } from '../../../../core/models/procurement.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProcurementService } from '../../../../core/services/procurement.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDate, formatDateTime } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { MultiSelectComponent } from '../../components/multi-select/multi-select.component';
import { ProcurementNavComponent } from '../../components/procurement-nav/procurement-nav.component';
import { canManageRFQ } from '../../utils/procurement-permissions.util';

@Component({
  selector: 'app-rfq-list',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    ProcurementNavComponent,
    PaginationComponent,
    ModalComponent,
    MultiSelectComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './rfq-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RfqListComponent implements OnInit {
  private readonly procurement = inject(ProcurementService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly rfqs = signal<RFQ[]>([]);
  readonly approvedPrs = signal<PurchaseRequisition[]>([]);
  readonly suppliers = signal<Supplier[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly saving = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly showModal = signal(false);
  readonly selectedSuppliers = signal<number[]>([]);

  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;
  readonly canAdd = () => canManageRFQ(this.auth);

  readonly form = this.fb.group({
    requisition: [null as number | null, Validators.required],
    deadline: ['', Validators.required],
    notes: [''],
  });

  ngOnInit(): void {
    const prId = this.route.snapshot.queryParamMap.get('pr');
    if (prId) {
      this.form.patchValue({ requisition: +prId });
      this.showModal.set(true);
    }
    this.procurement.getRequisitions({ status: 'APPROVED', page_size: 100 }).subscribe((d) =>
      this.approvedPrs.set(d.results),
    );
    this.procurement.getSuppliers({ is_active: true, page_size: 100 }).subscribe((d) =>
      this.suppliers.set(d.results),
    );
    this.load();
  }

  supplierOptions() {
    return this.suppliers().map((s) => ({
      value: s.id,
      label: s.name,
      sublabel: `${'★'.repeat(s.rating)}${'☆'.repeat(5 - s.rating)}`,
    }));
  }

  load(): void {
    this.loading.set(true);
    this.procurement
      .getRFQs({ page: this.page(), page_size: this.pageSize(), ordering: '-created_at' })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => { this.rfqs.set(d.results); this.total.set(d.count); },
        error: () => this.error.set(true),
      });
  }

  openNew(): void {
    this.selectedSuppliers.set([]);
    this.form.reset({ requisition: null, deadline: '', notes: '' });
    this.showModal.set(true);
  }

  onSubmit(): void {
    if (this.form.invalid || !this.selectedSuppliers().length) {
      this.notification.error('Select PR, deadline, and at least one supplier.');
      return;
    }
    const raw = this.form.getRawValue();
    this.saving.set(true);
    this.procurement
      .createRFQ({
        requisition: raw.requisition!,
        deadline: raw.deadline!,
        supplier_ids: this.selectedSuppliers(),
        notes: raw.notes ?? '',
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('RFQ created');
          this.showModal.set(false);
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  closeRfq(r: RFQ): void {
    this.confirm.open({ title: 'Close RFQ', message: `Close ${r.rfq_number}?`, confirmLabel: 'Close' })
      .subscribe((ok) => {
        if (!ok) return;
        this.procurement.closeRFQ(r.id).subscribe({
          next: () => { this.notification.success('RFQ closed'); this.load(); },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }

  cancelRfq(r: RFQ): void {
    this.procurement.cancelRFQ(r.id).subscribe({
      next: () => { this.notification.success('RFQ cancelled'); this.load(); },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }
}
