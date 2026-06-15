import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  canCreatePR,
  canDeleteAnything,
} from '../../utils/procurement-permissions.util';

@Component({
  selector: 'app-requisitions-list',
  imports: [
    FormsModule,
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
  readonly router = inject(Router);

  readonly requisitions = signal<PurchaseRequisition[]>([]);
  readonly deptList = signal<Department[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
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

  readonly priorities = PR_PRIORITIES;
  readonly prSteps = WORKFLOW_STEPS.pr;
  readonly formatCurrency = formatCurrency;
  readonly formatDateTime = formatDateTime;

  readonly canAdd = () => canCreatePR(this.auth);
  readonly canApprove = () => canApprovePR(this.auth);
  readonly canDelete = () => canDeleteAnything(this.auth);

  ngOnInit(): void {
    this.departments.getDepartments().subscribe((d) => this.deptList.set(d));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
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
        error: () => this.error.set(true),
      });
  }

  openView(pr: PurchaseRequisition): void {
    this.procurement.getRequisition(pr.id).subscribe({
      next: (full) => {
        this.viewing.set(full);
        this.showView.set(true);
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  submit(pr: PurchaseRequisition): void {
    this.confirm.open({
      title: 'Submit Requisition',
      message: `Submit ${pr.pr_number} for approval?`,
      confirmLabel: 'Submit',
    }).subscribe((ok) => {
      if (!ok) return;
      this.procurement.submitRequisition(pr.id).subscribe({
        next: () => { this.notification.success('Requisition submitted'); this.load(); this.showView.set(false); },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
    });
  }

  approve(pr: PurchaseRequisition): void {
    this.procurement.approveRequisition(pr.id).subscribe({
      next: () => { this.notification.success('Requisition approved'); this.load(); this.showView.set(false); },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  reject(pr: PurchaseRequisition): void {
    const reason = prompt('Rejection reason:');
    if (!reason?.trim()) return;
    this.procurement.rejectRequisition(pr.id, reason.trim()).subscribe({
      next: () => { this.notification.success('Requisition rejected'); this.load(); this.showView.set(false); },
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
