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
import { handleListLoadError, resetListLoadState } from '../../../../core/utils/workspace-empty-state.util';
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
  readonly workspaceEmpty = signal(false);
  readonly saving = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly showModal = signal(false);
  readonly editingRfq = signal<RFQ | null>(null);
  readonly selectedSuppliers = signal<number[]>([]);

  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;
  readonly canAdd = () => canManageRFQ(this.auth);

  /**
   * Close = finish an active RFQ (stop quoting). Only when OPEN.
   * Not shown on Draft / Closed / Cancelled.
   */
  canClose(r: RFQ): boolean {
    return this.canAdd() && r.status === 'OPEN';
  }

  /**
   * Cancel = abandon RFQ.
   * - Draft: discard before sending
   * - Open: abort only if no supplier has been selected / PO generated
   * Hidden once Closed or Cancelled, or after a winner/PO exists.
   */
  canCancel(r: RFQ): boolean {
    if (!this.canAdd()) return false;
    if (r.status === 'DRAFT') return true;
    if (r.status === 'OPEN') {
      const invites = r.invited_suppliers ?? [];
      return !invites.some(
        (s) => s.response_status === 'SELECTED' || s.response_status === 'PO_GENERATED',
      );
    }
    return false;
  }

  readonly form = this.fb.group({
    requisition: [null as number | null, Validators.required],
    deadline: ['', Validators.required],
    notes: [''],
  });

  selectedPr(): PurchaseRequisition | null {
    const id = this.form.getRawValue().requisition;
    if (!id) return null;
    return this.approvedPrs().find((pr) => pr.id === id) ?? null;
  }

  approvedItems(pr: PurchaseRequisition) {
    return (pr.items ?? []).filter((item) => item.approved_for_purchase !== false);
  }

  modalTitle(): string {
    return this.editingRfq() ? 'Edit RFQ Draft' : 'New RFQ';
  }

  ngOnInit(): void {
    this.procurement.getRequisitions({ status: 'APPROVED', page_size: 100 }).subscribe((d) =>
      this.approvedPrs.set(d.results),
    );
    this.procurement.getSuppliers({ is_active: true, page_size: 100 }).subscribe((d) =>
      this.suppliers.set(d.results),
    );
    this.load();

    const prId = this.route.snapshot.queryParamMap.get('pr');
    const editId = this.route.snapshot.queryParamMap.get('edit');
    if (editId) {
      this.procurement.getRFQ(+editId).subscribe({
        next: (rfq) => {
          if (rfq.status === 'DRAFT') this.openEdit(rfq);
          else this.notification.error('Only draft RFQs can be edited.');
          void this.router.navigate([], { queryParams: { edit: null }, queryParamsHandling: 'merge' });
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
    } else if (prId) {
      this.form.patchValue({ requisition: +prId });
      this.showModal.set(true);
    }
  }

  supplierOptions() {
    return this.suppliers().map((s) => ({
      value: s.id,
      label: s.name,
      sublabel: `${s.email} · ${'★'.repeat(s.rating)}${'☆'.repeat(5 - s.rating)}`,
    }));
  }

  load(): void {
    this.loading.set(true);
    resetListLoadState(this.error, this.workspaceEmpty);
    this.procurement
      .getRFQs({ page: this.page(), page_size: this.pageSize(), ordering: '-created_at' })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.rfqs.set(d.results);
          this.total.set(d.count);
        },
        error: (e) => handleListLoadError(e, this.error, this.workspaceEmpty),
      });
  }

  openNew(): void {
    this.editingRfq.set(null);
    this.selectedSuppliers.set([]);
    this.form.reset({ requisition: null, deadline: '', notes: '' });
    this.form.controls.requisition.enable();
    this.showModal.set(true);
  }

  openEdit(r: RFQ): void {
    this.procurement.getRFQ(r.id).subscribe({
      next: (full) => {
        if (full.status !== 'DRAFT') {
          this.notification.error('Only draft RFQs can be edited.');
          return;
        }
        this.editingRfq.set(full);
        this.form.patchValue({
          requisition: full.requisition_id ?? full.requisition,
          deadline: full.deadline,
          notes: full.notes ?? '',
        });
        this.form.controls.requisition.disable();
        this.selectedSuppliers.set(
          (full.invited_suppliers ?? [])
            .map((s) => s.supplier)
            .filter((id): id is number => id != null),
        );
        this.showModal.set(true);
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingRfq.set(null);
    this.form.controls.requisition.enable();
  }

  saveDraft(): void {
    if (this.form.invalid) {
      this.notification.error('Select an approved PR and deadline.');
      return;
    }
    const raw = this.form.getRawValue();
    const editing = this.editingRfq();
    this.saving.set(true);

    if (editing) {
      this.procurement
        .updateRFQ(editing.id, {
          deadline: raw.deadline!,
          notes: raw.notes ?? '',
          supplier_ids: this.selectedSuppliers(),
        })
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe({
          next: () => {
            this.notification.success('RFQ draft updated');
            this.closeModal();
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      return;
    }

    this.procurement
      .createRFQ({
        requisition: raw.requisition!,
        deadline: raw.deadline!,
        supplier_ids: this.selectedSuppliers(),
        notes: raw.notes ?? '',
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: ({ message }) => {
          this.notification.success(message || 'RFQ saved as draft');
          this.closeModal();
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  private sendConfirmMessage(rfqNumber: string, invites: RFQ['invited_suppliers']): string {
    const lines = (invites ?? []).map((s) => {
      const name = s.supplier_name || 'Supplier';
      const email = (s.supplier_email || '').trim() || 'no email';
      return `• ${name} — ${email}`;
    });
    const list = lines.length ? lines.join('\n') : '• (no suppliers listed)';
    return (
      `Send ${rfqNumber} to these suppliers?\n\n` +
      `${list}\n\n` +
      `This will email them and open the RFQ.`
    );
  }

  sendToSuppliers(r: RFQ): void {
    if (!r.suppliers_count && !(r.invited_suppliers?.length > 0)) {
      this.notification.error('Add at least one supplier before sending. Edit the draft first.');
      return;
    }
    this.procurement.getRFQ(r.id).subscribe({
      next: (full) => {
        const invites = full.invited_suppliers ?? [];
        if (!invites.length) {
          this.notification.error('Add at least one supplier before sending. Edit the draft first.');
          return;
        }
        this.confirm
          .open({
            title: 'Send RFQ to Suppliers',
            message: this.sendConfirmMessage(full.rfq_number, invites),
            confirmLabel: 'Send',
          })
          .subscribe((ok) => {
            if (!ok) return;
            this.procurement.sendRfqEmails(full.id).subscribe({
              next: ({ message }) => {
                this.notification.success(message);
                this.load();
              },
              error: (e) => this.notification.error(getApiErrorMessage(e)),
            });
          });
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  closeRfq(r: RFQ): void {
    this.confirm
      .open({
        title: 'Close RFQ',
        message: `Close ${r.rfq_number}? You will stop accepting new quotations for this RFQ.`,
        confirmLabel: 'Close',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.procurement.closeRFQ(r.id).subscribe({
          next: () => {
            this.notification.success('RFQ closed');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }

  cancelRfq(r: RFQ): void {
    const isDraft = r.status === 'DRAFT';
    this.confirm
      .open({
        title: isDraft ? 'Cancel Draft RFQ' : 'Cancel RFQ',
        message: isDraft
          ? `Discard draft ${r.rfq_number}? It will be cancelled and cannot be sent.`
          : `Cancel ${r.rfq_number}? This voids the RFQ. Use Close instead if you only want to finish quoting.`,
        confirmLabel: 'Cancel RFQ',
        confirmDanger: true,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.procurement.cancelRFQ(r.id).subscribe({
          next: () => {
            this.notification.success('RFQ cancelled');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }
}
