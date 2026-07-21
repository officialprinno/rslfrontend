import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { LeaveBalance, LeaveRequest, LeaveType } from '../../../../core/models/hr.model';
import { AuthService } from '../../../../core/services/auth.service';
import { HrService } from '../../../../core/services/hr.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDate } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';

interface MyEmployeeProfile {
  id: number;
  full_name: string;
  department_name: string;
  is_hod: boolean;
}

@Component({
  selector: 'app-my-leave',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    ModalComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './my-leave.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyLeaveComponent implements OnInit {
  private readonly hr = inject(HrService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly showApply = signal(false);
  readonly requests = signal<LeaveRequest[]>([]);
  readonly balances = signal<LeaveBalance[]>([]);
  readonly leaveTypes = signal<LeaveType[]>([]);
  readonly profile = signal<MyEmployeeProfile | null>(null);
  readonly userEmail = () => this.auth.getCurrentUser()?.email ?? '';

  readonly formatDate = formatDate;

  readonly applyForm = this.fb.group({
    leave_type: [null as number | null, Validators.required],
    start_date: ['', Validators.required],
    end_date: ['', Validators.required],
    reason: ['', Validators.required],
  });

  ngOnInit(): void {
    this.hr.getMyEmployeeProfile().subscribe({
      next: (data) => {
        this.profile.set(data);
        if (!data) {
          this.loading.set(false);
          return;
        }
        this.hr.getLeaveTypes({ page_size: 50, is_active: true }).subscribe({
          next: (d) => this.leaveTypes.set(d.results),
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
        this.load(data.id);
      },
      error: (e) => {
        this.loading.set(false);
        this.notification.error(getApiErrorMessage(e));
      },
    });
  }

  load(employeeId?: number): void {
    const id = employeeId ?? this.profile()?.id;
    if (!id) return;
    this.loading.set(true);
    this.hr
      .getLeaveRequests({ employee: id, page_size: 50 })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => this.requests.set(d.results),
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
    this.hr.getLeaveBalances(id).subscribe({
      next: (data) => this.balances.set(data as LeaveBalance[]),
      error: () => this.balances.set([]),
    });
  }

  openApply(): void {
    this.applyForm.reset({
      leave_type: null,
      start_date: '',
      end_date: '',
      reason: '',
    });
    this.showApply.set(true);
  }

  submitApply(): void {
    const employeeId = this.profile()?.id;
    if (!employeeId) {
      this.notification.error('Your account is not linked to an employee record.');
      return;
    }
    if (this.applyForm.invalid) {
      this.notification.error('Complete all required fields.');
      return;
    }
    const raw = this.applyForm.getRawValue();
    this.saving.set(true);
    this.hr
      .createLeaveRequest({
        employee: employeeId,
        leave_type: raw.leave_type!,
        start_date: raw.start_date!,
        end_date: raw.end_date!,
        reason: raw.reason!,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (req) => {
          const msg =
            req.approval_route === 'GM'
              ? 'Leave submitted — pending General Manager approval.'
              : 'Leave submitted — pending HR approval.';
          this.notification.success(msg);
          this.showApply.set(false);
          this.load(employeeId);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  leaveStatusLabel(req: LeaveRequest): string {
    return req.status_label ?? req.status;
  }
}
