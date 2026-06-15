import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { EmployeeListItem } from '../../../../core/models/hr.model';
import { Department } from '../../../../core/models/procurement.model';
import {
  PPEIssuance,
  PPEItem,
  PPERequest,
  PPERequestFormData,
  PPERoleRequirement,
} from '../../../../core/models/safety.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { DepartmentsService } from '../../../../core/services/departments.service';
import { HrService } from '../../../../core/services/hr.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SafetyService } from '../../../../core/services/safety.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDate, formatDateTime } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { SearchableSelectComponent } from '../../../../shared/components/searchable-select/searchable-select.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { WorkflowStepperComponent } from '../../../procurement/components/workflow-stepper/workflow-stepper.component';
import { SafetyNavComponent } from '../../components/safety-nav/safety-nav.component';
import {
  PPE_REQUEST_STATUS_COLORS,
  PPE_TYPE_COLORS,
  PPE_TYPES,
  PPE_WORKFLOW_STEPS,
  ppeRequestStatusLabel,
  ppeRequestWorkflowIndex,
  ppeStockStatus,
  ppeTypeLabel,
} from '../../constants/safety.constants';
import {
  canIssuePPE,
  canRequestPPE,
  canReviewPPEStore,
} from '../../utils/safety-permissions.util';

@Component({
  selector: 'app-ppe-management',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    SafetyNavComponent,
    ModalComponent,
    PaginationComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
    SearchableSelectComponent,
    WorkflowStepperComponent,
  ],
  templateUrl: './ppe-management.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PpeManagementComponent implements OnInit {
  private readonly safety = inject(SafetyService);
  private readonly hr = inject(HrService);
  private readonly departments = inject(DepartmentsService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly fb = inject(FormBuilder);

  readonly activeTab = signal<'inventory' | 'issuances' | 'requests' | 'requirements'>('inventory');
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly saving = signal(false);

  readonly inventory = signal<PPEItem[]>([]);
  readonly issuances = signal<PPEIssuance[]>([]);
  readonly requirements = signal<PPERoleRequirement[]>([]);
  readonly requests = signal<PPERequest[]>([]);
  readonly employees = signal<EmployeeListItem[]>([]);
  readonly deptOptions = signal<Department[]>([]);

  readonly requestTotal = signal(0);
  readonly requestPage = signal(1);
  readonly requestStatusFilter = signal('');
  readonly pendingStoreOnly = signal(false);

  readonly issuanceTotal = signal(0);
  readonly issuancePage = signal(1);
  readonly issuancePageSize = signal(15);
  readonly issuanceSearch = signal('');
  readonly issuanceTypeFilter = signal('');
  readonly issuanceDeptFilter = signal<number | ''>('');
  readonly issuanceDateFrom = signal('');
  readonly issuanceDateTo = signal('');

  readonly showIssue = signal(false);
  readonly showReturn = signal(false);
  readonly showRequest = signal(false);
  readonly showRequestDetail = signal(false);
  readonly returning = signal<PPEIssuance | null>(null);
  readonly selectedRequest = signal<PPERequest | null>(null);
  readonly storeReviewNotes = signal('');
  readonly useNewPpeItem = signal(false);

  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;
  readonly ppeTypeLabel = ppeTypeLabel;
  readonly ppeRequestStatusLabel = ppeRequestStatusLabel;
  readonly ppeStockStatus = ppeStockStatus;
  readonly typeColor = (t: string) => PPE_TYPE_COLORS[t] ?? 'badge-gray';
  readonly requestStatusColor = (s: string) => PPE_REQUEST_STATUS_COLORS[s] ?? 'badge-gray';
  readonly workflowSteps = PPE_WORKFLOW_STEPS;
  readonly ppeTypes = PPE_TYPES;
  readonly canIssue = () => canIssuePPE(this.auth);
  readonly canRequest = () => canRequestPPE(this.auth);
  readonly canStoreReview = () => canReviewPPEStore(this.auth);

  readonly issueForm = this.fb.group({
    employee: [null as number | null, Validators.required],
    ppe_item: [null as number | null, Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
    issue_date: [new Date().toISOString().slice(0, 10), Validators.required],
    expected_return: [''],
    condition_issued: ['NEW' as 'NEW' | 'GOOD' | 'FAIR', Validators.required],
    notes: [''],
  });

  readonly requestForm = this.fb.group({
    employee: [null as number | null, Validators.required],
    ppe_item: [null as number | null],
    new_ppe_type: ['UNIFORM'],
    new_ppe_name: [''],
    new_ppe_standard: [''],
    quantity: [1, [Validators.required, Validators.min(1)]],
    priority: ['NORMAL' as 'NORMAL' | 'URGENT', Validators.required],
    reason: ['', Validators.required],
  });

  readonly returnForm = this.fb.group({
    actual_return: [new Date().toISOString().slice(0, 10), Validators.required],
    condition_returned: ['GOOD' as 'GOOD' | 'FAIR' | 'DAMAGED' | 'LOST', Validators.required],
    notes: [''],
  });

  ngOnInit(): void {
    this.hr.getEmployees({ page_size: 500, status: 'ACTIVE' }).subscribe((d) => this.employees.set(d.results));
    this.departments.getDepartments().subscribe((d) => this.deptOptions.set(d));
    this.loadTab();
  }

  setTab(tab: 'inventory' | 'issuances' | 'requests' | 'requirements'): void {
    this.activeTab.set(tab);
    this.loadTab();
  }

  loadTab(): void {
    switch (this.activeTab()) {
      case 'inventory':
        this.loadInventory();
        break;
      case 'issuances':
        this.loadIssuances();
        break;
      case 'requests':
        this.loadRequests();
        break;
      case 'requirements':
        this.loadRequirements();
        break;
    }
  }

  loadInventory(): void {
    this.loading.set(true);
    this.error.set(false);
    this.safety
      .getPPEItems()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => this.inventory.set(items),
        error: () => this.error.set(true),
      });
  }

  loadIssuances(): void {
    this.loading.set(true);
    this.error.set(false);
    const params: Record<string, string | number> = {
      page: this.issuancePage(),
      page_size: this.issuancePageSize(),
      ordering: '-issue_date',
    };
    if (this.issuanceSearch()) params['search'] = this.issuanceSearch();
    if (this.issuanceTypeFilter()) params['ppe_type'] = this.issuanceTypeFilter();
    if (this.issuanceDeptFilter()) params['department'] = this.issuanceDeptFilter() as number;
    if (this.issuanceDateFrom()) params['date_from'] = this.issuanceDateFrom();
    if (this.issuanceDateTo()) params['date_to'] = this.issuanceDateTo();

    this.safety
      .getPPEIssuances(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.issuances.set(d.results);
          this.issuanceTotal.set(d.count);
        },
        error: () => this.error.set(true),
      });
  }

  loadRequests(): void {
    this.loading.set(true);
    this.error.set(false);
    const params: Record<string, string | number | boolean> = {
      page: this.requestPage(),
      page_size: 15,
      ordering: '-created_at',
    };
    if (this.requestStatusFilter()) params['status'] = this.requestStatusFilter();
    if (this.pendingStoreOnly()) params['pending_store'] = true;

    this.safety
      .getPPERequests(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.requests.set(d.results);
          this.requestTotal.set(d.count);
        },
        error: () => this.error.set(true),
      });
  }

  loadRequirements(): void {
    this.loading.set(true);
    this.error.set(false);
    this.safety
      .getPPERequirements()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => this.requirements.set(items),
        error: () => this.error.set(true),
      });
  }

  employeeOptions() {
    return this.employees().map((e) => ({
      value: e.id,
      label: e.full_name,
      sublabel: `${e.employee_number} · ${e.department_name}`,
    }));
  }

  setIssueEmployee(value: number | string | null): void {
    this.issueForm.controls.employee.setValue(typeof value === 'number' ? value : null);
  }

  setRequestEmployee(value: number | string | null): void {
    this.requestForm.controls.employee.setValue(typeof value === 'number' ? value : null);
  }

  openRequest(): void {
    this.useNewPpeItem.set(false);
    this.requestForm.reset({
      employee: null,
      ppe_item: null,
      new_ppe_type: 'UNIFORM',
      new_ppe_name: '',
      new_ppe_standard: '',
      quantity: 1,
      priority: 'NORMAL',
      reason: '',
    });
    if (!this.inventory().length) {
      this.safety.getPPEItems().subscribe((items) => this.inventory.set(items));
    }
    this.showRequest.set(true);
  }

  toggleNewPpeItem(useNew: boolean): void {
    this.useNewPpeItem.set(useNew);
    if (useNew) {
      this.requestForm.controls.ppe_item.setValue(null);
      this.requestForm.controls.new_ppe_name.setValidators([Validators.required]);
    } else {
      this.requestForm.controls.ppe_item.setValidators([Validators.required]);
      this.requestForm.controls.new_ppe_name.clearValidators();
    }
    this.requestForm.controls.ppe_item.updateValueAndValidity();
    this.requestForm.controls.new_ppe_name.updateValueAndValidity();
  }

  onCreateRequest(submit = false): void {
    const useNew = this.useNewPpeItem();
    if (useNew) {
      this.requestForm.controls.ppe_item.clearValidators();
      this.requestForm.controls.new_ppe_name.setValidators([Validators.required]);
    } else {
      this.requestForm.controls.ppe_item.setValidators([Validators.required]);
      this.requestForm.controls.new_ppe_name.clearValidators();
    }
    this.requestForm.controls.ppe_item.updateValueAndValidity();
    this.requestForm.controls.new_ppe_name.updateValueAndValidity();

    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      this.notification.error('Please complete all required fields.');
      return;
    }
    const raw = this.requestForm.getRawValue();
    const payload: PPERequestFormData = {
      employee: raw.employee!,
      quantity: raw.quantity ?? 1,
      priority: raw.priority!,
      reason: raw.reason ?? '',
    };
    if (useNew) {
      payload.new_ppe_item = {
        ppe_type: raw.new_ppe_type!,
        name: raw.new_ppe_name!.trim(),
        safety_standard: raw.new_ppe_standard?.trim() || undefined,
      };
    } else {
      payload.ppe_item = raw.ppe_item!;
    }
    this.saving.set(true);
    this.safety
      .createPPERequest(payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (req) => {
          const done = () => {
            this.showRequest.set(false);
            this.loadRequests();
            this.loadInventory();
          };
          if (submit) {
            this.safety.submitPPERequest(req.id).subscribe({
              next: () => {
                this.notification.success(
                  req.requested_new_item
                    ? 'New PPE item added and request sent to Store Keeper'
                    : 'PPE request submitted to Store Keeper',
                );
                done();
              },
              error: (e) => this.notification.error(getApiErrorMessage(e)),
            });
          } else {
            this.notification.success(
              req.requested_new_item
                ? 'New PPE item saved — submit when ready'
                : 'PPE request saved as draft',
            );
            done();
          }
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  openRequestDetail(req: PPERequest): void {
    this.selectedRequest.set(req);
    this.storeReviewNotes.set('');
    this.showRequestDetail.set(true);
  }

  workflowIndex(req: PPERequest): number {
    return ppeRequestWorkflowIndex(req.status);
  }

  storeReview(available: boolean): void {
    const req = this.selectedRequest();
    if (!req) return;
    const msg = available
      ? 'Confirm PPE is available in stock and ready for issuance?'
      : 'Confirm PPE is NOT available? This will send a request to Procurement.';
    this.confirm.open({ title: 'Store Review', message: msg }).subscribe((ok) => {
      if (!ok) return;
      this.saving.set(true);
      this.safety
        .storeReviewPPERequest(req.id, {
          stock_available: available,
          notes: this.storeReviewNotes(),
        })
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe({
          next: (updated) => {
            this.notification.success(
              available ? 'Stock confirmed — ready for issuance' : 'Sent to Procurement',
            );
            this.selectedRequest.set(updated);
            this.loadRequests();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
    });
  }

  markStockReceived(): void {
    const req = this.selectedRequest();
    if (!req) return;
    this.saving.set(true);
    this.safety
      .markPPEStockReceived(req.id, { notes: this.storeReviewNotes() })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (updated) => {
          this.notification.success('Stock received at store');
          this.selectedRequest.set(updated);
          this.loadRequests();
          this.loadInventory();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  confirmReady(): void {
    const req = this.selectedRequest();
    if (!req) return;
    this.saving.set(true);
    this.safety
      .confirmPPEReady(req.id)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (updated) => {
          this.notification.success('PPE ready for issuance');
          this.selectedRequest.set(updated);
          this.loadRequests();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  issueFromRequest(): void {
    const req = this.selectedRequest();
    if (!req) return;
    this.saving.set(true);
    this.safety
      .issuePPERequest(req.id)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: ({ request }) => {
          this.notification.success('PPE issued successfully');
          this.selectedRequest.set(request);
          this.loadRequests();
          this.loadInventory();
          this.loadIssuances();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  submitExistingRequest(req: PPERequest): void {
    this.saving.set(true);
    this.safety
      .submitPPERequest(req.id)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Request submitted to Store Keeper');
          this.loadRequests();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  selectedPpeItem(): PPEItem | undefined {
    const id = this.issueForm.controls.ppe_item.value;
    return this.inventory().find((i) => i.id === id);
  }

  openIssue(item?: PPEItem): void {
    this.issueForm.reset({
      employee: null,
      ppe_item: item?.id ?? null,
      quantity: 1,
      issue_date: new Date().toISOString().slice(0, 10),
      expected_return: '',
      condition_issued: 'NEW',
      notes: '',
    });
    if (!this.inventory().length) {
      this.safety.getPPEItems().subscribe((items) => this.inventory.set(items));
    }
    this.showIssue.set(true);
  }

  onIssue(): void {
    if (this.issueForm.invalid) {
      this.issueForm.markAllAsTouched();
      this.notification.error('Please complete all required fields.');
      return;
    }
    const raw = this.issueForm.getRawValue();
    const ppeItem = this.selectedPpeItem();
    if (ppeItem && ppeItem.stock_on_hand < (raw.quantity ?? 1)) {
      this.notification.error('Insufficient stock for this PPE item.');
      return;
    }
    this.saving.set(true);
    this.safety
      .issuePPE({
        employee: raw.employee!,
        ppe_item: raw.ppe_item!,
        quantity: raw.quantity ?? 1,
        issue_date: raw.issue_date!,
        expected_return: raw.expected_return || null,
        condition_issued: raw.condition_issued!,
        notes: raw.notes ?? '',
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('PPE issued');
          this.showIssue.set(false);
          if (this.activeTab() === 'inventory') this.loadInventory();
          else if (this.activeTab() === 'issuances') this.loadIssuances();
          else {
            this.loadInventory();
            this.loadIssuances();
          }
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  openReturn(issuance: PPEIssuance): void {
    this.returning.set(issuance);
    this.returnForm.reset({
      actual_return: new Date().toISOString().slice(0, 10),
      condition_returned: 'GOOD',
      notes: '',
    });
    this.showReturn.set(true);
  }

  onReturn(): void {
    const issuance = this.returning();
    if (!issuance) return;
    const raw = this.returnForm.getRawValue();
    if (
      (raw.condition_returned === 'DAMAGED' || raw.condition_returned === 'LOST') &&
      !(raw.notes ?? '').trim()
    ) {
      this.notification.error('Notes are required for damaged or lost PPE.');
      return;
    }
    this.saving.set(true);
    this.safety
      .returnPPE(issuance.id, {
        condition_returned: raw.condition_returned!,
        actual_return: raw.actual_return!,
        notes: raw.notes ?? '',
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('PPE returned');
          this.showReturn.set(false);
          this.loadIssuances();
          this.loadInventory();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  isReturnOverdue(issuance: PPEIssuance): boolean {
    if (!issuance.expected_return || issuance.actual_return) return false;
    return new Date(issuance.expected_return) < new Date(new Date().toDateString());
  }

  conditionColor(condition: string | null): string {
    if (!condition) return 'badge-gray';
    if (condition === 'DAMAGED' || condition === 'LOST') return 'badge-red';
    if (condition === 'FAIR') return 'badge-orange';
    if (condition === 'NEW' || condition === 'GOOD') return 'badge-green';
    return 'badge-gray';
  }

  ppeTypeOptions(): string[] {
    const types = new Set(this.inventory().map((i) => i.ppe_type));
    for (const i of this.issuances()) types.add(i.ppe_type);
    return Array.from(types).sort();
  }
}
