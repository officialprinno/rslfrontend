import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import {
  EmployeeLeaveBalances,
  EmployeeOption,
  LeaveCalendarEntry,
  LeaveRequest,
  LeaveType,
} from '../../../../core/models/hr.model';
import { Department } from '../../../../core/models/procurement.model';
import { AuthService } from '../../../../core/services/auth.service';
import { DepartmentsService } from '../../../../core/services/departments.service';
import { HrService } from '../../../../core/services/hr.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDate } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { HrNavComponent } from '../../components/hr-nav/hr-nav.component';
import { LEAVE_TYPE_COLORS } from '../../constants/hr.constants';
import { canApplyLeave, canApproveLeave } from '../../utils/hr-permissions.util';

@Component({
  selector: 'app-leave',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    HrNavComponent,
    ModalComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './leave.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaveComponent implements OnInit {
  private readonly hr = inject(HrService);
  private readonly departmentsService = inject(DepartmentsService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly activeTab = signal<'requests' | 'balances' | 'calendar'>('requests');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly statusFilter = signal('');
  readonly departmentFilter = signal<number | ''>('');
  readonly calendarMonth = signal(new Date().getMonth() + 1);
  readonly calendarYear = signal(new Date().getFullYear());

  readonly requests = signal<LeaveRequest[]>([]);
  readonly balances = signal<EmployeeLeaveBalances[]>([]);
  readonly calendar = signal<LeaveCalendarEntry[]>([]);
  readonly leaveTypes = signal<LeaveType[]>([]);
  readonly employees = signal<EmployeeOption[]>([]);
  readonly departments = signal<Department[]>([]);

  readonly showApply = signal(false);
  readonly showApprove = signal(false);
  readonly showReject = signal(false);
  readonly selectedRequest = signal<LeaveRequest | null>(null);

  readonly formatDate = formatDate;
  readonly leaveTypeColors = LEAVE_TYPE_COLORS;
  readonly canApply = () => canApplyLeave(this.auth);
  readonly canApprove = () => canApproveLeave(this.auth);

  readonly applyForm = this.fb.group({
    employee: [null as number | null, Validators.required],
    leave_type: [null as number | null, Validators.required],
    start_date: ['', Validators.required],
    end_date: ['', Validators.required],
    reason: ['', Validators.required],
  });

  readonly rejectForm = this.fb.group({
    reason: ['', Validators.required],
  });

  readonly months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  ngOnInit(): void {
    this.departmentsService.getDepartments().subscribe((d) => this.departments.set(d));
    this.hr.getLeaveTypes({ page_size: 50, is_active: true }).subscribe({
      next: (d) => this.leaveTypes.set(d.results),
    });
    this.hr.getEmployees({ page_size: 500, status: 'ACTIVE' }).subscribe({
      next: (d) => this.employees.set(d.results),
    });
    this.loadTab();
  }

  setTab(tab: 'requests' | 'balances' | 'calendar'): void {
    this.activeTab.set(tab);
    this.loadTab();
  }

  loadTab(): void {
    const tab = this.activeTab();
    if (tab === 'requests') this.loadRequests();
    else if (tab === 'balances') this.loadBalances();
    else this.loadCalendar();
  }

  loadRequests(): void {
    this.loading.set(true);
    const params: Record<string, string | number> = { page_size: 100 };
    if (this.statusFilter()) params['status'] = this.statusFilter();
    if (this.departmentFilter()) params['department'] = this.departmentFilter() as number;

    this.hr
      .getLeaveRequests(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => this.requests.set(d.results),
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  loadBalances(): void {
    this.loading.set(true);
    this.hr
      .getLeaveBalances()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => this.balances.set(data as EmployeeLeaveBalances[]),
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  loadCalendar(): void {
    this.loading.set(true);
    this.hr
      .getLeaveCalendar(this.calendarMonth(), this.calendarYear())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => this.calendar.set(data),
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  openApply(): void {
    this.applyForm.reset({
      employee: null,
      leave_type: null,
      start_date: '',
      end_date: '',
      reason: '',
    });
    this.showApply.set(true);
  }

  submitApply(): void {
    if (this.applyForm.invalid) {
      this.notification.error('Complete all required fields.');
      return;
    }
    const raw = this.applyForm.getRawValue();
    this.saving.set(true);
    this.hr
      .createLeaveRequest({
        employee: raw.employee!,
        leave_type: raw.leave_type!,
        start_date: raw.start_date!,
        end_date: raw.end_date!,
        reason: raw.reason!,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Leave request submitted');
          this.showApply.set(false);
          this.loadRequests();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  openApprove(req: LeaveRequest): void {
    this.selectedRequest.set(req);
    this.showApprove.set(true);
  }

  confirmApprove(): void {
    const req = this.selectedRequest();
    if (!req) return;
    this.saving.set(true);
    this.hr
      .approveLeaveRequest(req.id)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Leave approved');
          this.showApprove.set(false);
          this.loadRequests();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  openReject(req: LeaveRequest): void {
    this.selectedRequest.set(req);
    this.rejectForm.reset({ reason: '' });
    this.showReject.set(true);
  }

  confirmReject(): void {
    const req = this.selectedRequest();
    if (!req || this.rejectForm.invalid) {
      this.notification.error('Rejection reason is required.');
      return;
    }
    this.saving.set(true);
    this.hr
      .rejectLeaveRequest(req.id, this.rejectForm.getRawValue().reason!)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Leave rejected');
          this.showReject.set(false);
          this.loadRequests();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  leaveTypeColor(code: string): string {
    return this.leaveTypeColors[code] ?? 'gray';
  }
}
