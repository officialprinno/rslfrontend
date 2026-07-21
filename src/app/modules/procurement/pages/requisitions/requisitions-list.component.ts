import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { Department, PurchaseRequisition } from '../../../../core/models/procurement.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { DepartmentsService } from '../../../../core/services/departments.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProcurementService } from '../../../../core/services/procurement.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { exportToExcel } from '../../../../core/utils/export.util';
import { formatCurrency, formatDateTime } from '../../../../core/utils/format.util';
import { handleListLoadError, resetListLoadState } from '../../../../core/utils/workspace-empty-state.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { PriorityBadgeComponent } from '../../components/priority-badge/priority-badge.component';
import { ProcurementNavComponent } from '../../components/procurement-nav/procurement-nav.component';
import { WorkflowStepperComponent } from '../../components/workflow-stepper/workflow-stepper.component';
import { PR_PRIORITIES, WORKFLOW_STEPS } from '../../constants/procurement.constants';
import {
  canApprovePR,
  canCancelPR,
  canCreatePR,
  canDeleteAnything,
  canEditPR,
  canGmOverridePR,
  canRejectPR,
  canRevisePR,
} from '../../utils/procurement-permissions.util';

@Component({
  selector: 'app-requisitions-list',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    ProcurementNavComponent,
    PaginationComponent,
    ModalComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
    PriorityBadgeComponent,
    WorkflowStepperComponent,
  ],
  templateUrl: './requisitions-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequisitionsListComponent implements OnInit {
  private readonly procurement = inject(ProcurementService);
  private readonly departments = inject(DepartmentsService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly fb = inject(FormBuilder);
  readonly router = inject(Router);

  readonly requisitions = signal<PurchaseRequisition[]>([]);
  readonly deptList = signal<Department[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly workspaceEmpty = signal(false);
  readonly saving = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly search = signal('');
  readonly deptFilter = signal<number | ''>('');
  readonly priorityFilter = signal('');
  readonly statusFilter = signal('');
  readonly dateFrom = signal('');
  readonly dateAfter = signal('');
  readonly viewing = signal<PurchaseRequisition | null>(null);
  readonly showView = signal(false);
  readonly showReject = signal(false);
  readonly rejecting = signal<PurchaseRequisition | null>(null);
  readonly selectedItemIds = signal<number[]>([]);

  readonly rejectForm = this.fb.group({
    reason: ['', [Validators.required, Validators.minLength(3)]],
  });

  readonly priorities = PR_PRIORITIES;
  readonly prSteps = WORKFLOW_STEPS.pr;
  readonly formatCurrency = formatCurrency;
  readonly formatDateTime = formatDateTime;

  lineEstCost(item: { quantity_requested: number; unit_cost_estimate: number }): number {
    return Number(item.quantity_requested ?? 0) * Number(item.unit_cost_estimate ?? 0);
  }

  lineVat(item: {
    quantity_requested: number;
    unit_cost_estimate: number;
    tax_rate?: number;
  }): number {
    return this.lineEstCost(item) * (Number(item.tax_rate ?? 0) / 100);
  }

  requisitionEstCost(pr: PurchaseRequisition): number {
    const items = this.visibleItems(pr);
    return items.reduce((sum, item) => sum + this.lineEstCost(item), 0);
  }

  requisitionVat(pr: PurchaseRequisition): number {
    const items = this.visibleItems(pr);
    return items.reduce((sum, item) => sum + this.lineVat(item), 0);
  }

  selectedEstCost(pr: PurchaseRequisition): number {
    return (pr.items ?? [])
      .filter((item) => item.id != null && this.selectedItemIds().includes(item.id!))
      .reduce((sum, item) => sum + this.lineEstCost(item), 0);
  }

  selectedVat(pr: PurchaseRequisition): number {
    return (pr.items ?? [])
      .filter((item) => item.id != null && this.selectedItemIds().includes(item.id!))
      .reduce((sum, item) => sum + this.lineVat(item), 0);
  }

  selectedTotal(pr: PurchaseRequisition): number {
    return this.selectedEstCost(pr) + this.selectedVat(pr);
  }

  visibleItems(pr: PurchaseRequisition) {
    if (pr.status === 'APPROVED') {
      return (pr.items ?? []).filter((item) => item.approved_for_purchase !== false);
    }
    return pr.items ?? [];
  }

  isItemSelected(itemId: number | undefined): boolean {
    if (itemId == null) return false;
    return this.selectedItemIds().includes(itemId);
  }

  toggleItem(itemId: number | undefined, checked: boolean): void {
    if (itemId == null) return;
    const current = this.selectedItemIds();
    if (checked) {
      if (!current.includes(itemId)) this.selectedItemIds.set([...current, itemId]);
    } else {
      this.selectedItemIds.set(current.filter((id) => id !== itemId));
    }
  }

  selectAllItems(pr: PurchaseRequisition): void {
    this.selectedItemIds.set(
      (pr.items ?? []).map((item) => item.id!).filter((id) => id != null),
    );
  }

  readonly canAdd = () => canCreatePR(this.auth);
  readonly canEdit = (pr: PurchaseRequisition) => canEditPR(this.auth, pr);
  readonly canCancel = (pr: PurchaseRequisition) => canCancelPR(this.auth, pr);
  readonly canRevise = (pr: PurchaseRequisition) => canRevisePR(this.auth, pr);
  readonly canApprove = (pr?: PurchaseRequisition | null) => canApprovePR(this.auth);
  readonly canGmOverride = (pr?: PurchaseRequisition | null) => canGmOverridePR(this.auth, pr);
  readonly canReject = () => canRejectPR(this.auth);
  readonly canDelete = () => canDeleteAnything(this.auth);

  ngOnInit(): void {
    this.departments.getDepartments().subscribe((d) => this.deptList.set(d));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    resetListLoadState(this.error, this.workspaceEmpty);
    const params: Record<string, string | number> = {
      page: this.page(),
      page_size: this.pageSize(),
      ordering: '-created_at',
    };
    if (this.search()) params['search'] = this.search();
    if (this.deptFilter()) params['department'] = this.deptFilter() as number;
    if (this.priorityFilter()) params['priority'] = this.priorityFilter();
    if (this.statusFilter()) params['status'] = this.statusFilter();
    if (this.dateFrom()) params['date_from'] = this.dateFrom();
    if (this.dateAfter()) params['date_after'] = this.dateAfter();

    this.procurement
      .getRequisitions(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => {
          this.requisitions.set(data.results);
          this.total.set(data.count);
        },
        error: (e) => handleListLoadError(e, this.error, this.workspaceEmpty),
      });
  }

  openView(pr: PurchaseRequisition): void {
    this.procurement.getRequisition(pr.id).subscribe({
      next: (full) => {
        this.viewing.set(full);
        this.selectAllItems(full);
        this.showView.set(true);
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  submit(pr: PurchaseRequisition): void {
    this.confirm.open({
      title: 'Submit Requisition',
      message: `Submit ${pr.pr_number} for approval? You will not be able to edit until you cancel it back to draft.`,
      confirmLabel: 'Submit',
    }).subscribe((ok) => {
      if (!ok) return;
      this.procurement.submitRequisition(pr.id).subscribe({
        next: () => { this.notification.success('Requisition submitted'); this.load(); this.showView.set(false); },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
    });
  }

  cancelPending(pr: PurchaseRequisition): void {
    this.confirm.open({
      title: 'Cancel Submission',
      message: `Cancel ${pr.pr_number} and return it to draft so you can edit and resubmit?`,
      confirmLabel: 'Cancel to Draft',
    }).subscribe((ok) => {
      if (!ok) return;
      this.procurement.cancelRequisition(pr.id).subscribe({
        next: () => {
          this.notification.success('Returned to draft — you can edit and resubmit');
          this.load();
          this.showView.set(false);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
    });
  }

  reviseRejected(pr: PurchaseRequisition): void {
    this.confirm.open({
      title: 'Revise Requisition',
      message: `Return ${pr.pr_number} to draft so you can address the approver feedback?`,
      confirmLabel: 'Revise',
    }).subscribe((ok) => {
      if (!ok) return;
      this.procurement.reviseRequisition(pr.id).subscribe({
        next: (updated) => {
          this.notification.success('Returned to draft for revision');
          this.load();
          this.showView.set(false);
          void this.router.navigate(['/procurement/requisitions', updated.id, 'edit']);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
    });
  }

  gmOverride(pr: PurchaseRequisition): void {
    const itemIds = this.selectedItemIds();
    if (!itemIds.length) {
      this.notification.error('Select at least one item to approve for purchase.');
      return;
    }
    this.confirm.open({
      title: 'GM Override Approval',
      message: `Approve ${pr.pr_number} via GM override with ${itemIds.length} selected item(s)?`,
      confirmLabel: 'Override & Approve',
    }).subscribe((ok) => {
      if (!ok) return;
      this.procurement.gmOverrideRequisition(pr.id, itemIds).subscribe({
        next: () => {
          this.notification.success('Requisition approved via GM override');
          this.load();
          this.showView.set(false);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
    });
  }

  approve(pr: PurchaseRequisition): void {
    const itemIds = this.selectedItemIds();
    if (!itemIds.length) {
      this.notification.error('Select at least one item to approve for purchase.');
      return;
    }
    this.confirm.open({
      title: 'Approve Requisition',
      message: `Approve ${pr.pr_number} with ${itemIds.length} selected item(s)? Only selected items will be used for RFQ.`,
      confirmLabel: 'Approve',
    }).subscribe((ok) => {
      if (!ok) return;
      this.procurement.approveRequisition(pr.id, itemIds).subscribe({
        next: () => { this.notification.success('Requisition approved'); this.load(); this.showView.set(false); },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
    });
  }

  reject(pr: PurchaseRequisition): void {
    this.rejecting.set(pr);
    this.rejectForm.reset({ reason: '' });
    this.showReject.set(true);
  }

  confirmReject(): void {
    const pr = this.rejecting();
    if (!pr || this.rejectForm.invalid) {
      this.rejectForm.markAllAsTouched();
      this.notification.error('Please enter a rejection reason (at least 3 characters).');
      return;
    }
    const reason = this.rejectForm.getRawValue().reason!.trim();
    this.saving.set(true);
    this.procurement
      .rejectRequisition(pr.id, reason)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Requisition rejected');
          this.showReject.set(false);
          this.showView.set(false);
          this.rejecting.set(null);
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  deletePr(pr: PurchaseRequisition): void {
    this.confirm.open({ title: 'Delete', message: `Delete ${pr.pr_number}?`, confirmDanger: true, confirmLabel: 'Delete' })
      .subscribe((ok) => {
        if (!ok) return;
        this.procurement.deleteRequisition(pr.id).subscribe({
          next: () => { this.notification.success('Deleted'); this.load(); },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }

  workflowIndex(status: string): number {
    const map: Record<string, number> = { DRAFT: 0, PENDING: 1, APPROVED: 2, REJECTED: 1 };
    return map[status] ?? 0;
  }

  exportExcel(): void {
    exportToExcel('purchase-requisitions', [
      { key: 'pr_number', label: 'PR Number' },
      { key: 'department_name', label: 'Department' },
      { key: 'status', label: 'Status' },
    ], this.requisitions());
  }

  createRfq(pr: PurchaseRequisition): void {
    void this.router.navigate(['/procurement/rfq'], { queryParams: { pr: pr.id } });
  }
}
