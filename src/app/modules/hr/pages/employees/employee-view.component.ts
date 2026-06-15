import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import {
  Appraisal,
  Attendance,
  DisciplinaryRecord,
  Employee,
  LeaveRequest,
  Payslip,
} from '../../../../core/models/hr.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { HrService } from '../../../../core/services/hr.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDate } from '../../../../core/utils/format.util';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { HrNavComponent } from '../../components/hr-nav/hr-nav.component';
import {
  ATTENDANCE_CALENDAR_CLASSES,
  ATTENDANCE_STATUS_COLORS,
  employmentTypeLabel,
  formatHrAmount,
  maskSalary,
} from '../../constants/hr.constants';
import { canActivateEmployee, canManageEmployees, canViewSalary } from '../../utils/hr-permissions.util';

type ViewTab =
  | 'profile'
  | 'attendance'
  | 'leave'
  | 'payroll'
  | 'appraisals'
  | 'documents'
  | 'disciplinary';

interface CalendarDay {
  day: number;
  date: string;
  status: string | null;
  inMonth: boolean;
}

@Component({
  selector: 'app-employee-view',
  imports: [
    RouterLink,
    PageHeaderComponent,
    HrNavComponent,
    StatusBadgeComponent,
    TableSkeletonComponent,
    ErrorStateComponent,
  ],
  templateUrl: './employee-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly hr = inject(HrService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly employee = signal<Employee | null>(null);
  readonly attendance = signal<Attendance[]>([]);
  readonly leaveRequests = signal<LeaveRequest[]>([]);
  readonly payslips = signal<Payslip[]>([]);
  readonly appraisals = signal<Appraisal[]>([]);
  readonly disciplinary = signal<DisciplinaryRecord[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly activeTab = signal<ViewTab>('profile');
  readonly calMonth = signal(new Date().getMonth() + 1);
  readonly calYear = signal(new Date().getFullYear());

  readonly formatDate = formatDate;
  readonly employmentTypeLabel = employmentTypeLabel;
  readonly attendanceCalendarClasses = ATTENDANCE_CALENDAR_CLASSES;
  readonly attendanceLegend = Object.keys(ATTENDANCE_STATUS_COLORS);
  readonly canEdit = () => canManageEmployees(this.auth);
  readonly canActivate = () => canActivateEmployee(this.auth);
  readonly showSalary = () => canViewSalary(this.auth);

  readonly tabs: { id: ViewTab; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'leave', label: 'Leave' },
    { id: 'payroll', label: 'Payroll History' },
    { id: 'appraisals', label: 'Appraisals' },
    { id: 'documents', label: 'Documents' },
    { id: 'disciplinary', label: 'Disciplinary' },
  ];

  readonly calendarDays = computed(() => this.buildCalendar());

  readonly monthLabel = computed(() => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return `${months[this.calMonth() - 1]} ${this.calYear()}`;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    const id = +this.route.snapshot.paramMap.get('id')!;
    forkJoin({
      employee: this.hr.getEmployee(id),
      attendance: this.hr.getAttendance({
        employee: id,
        month: this.calMonth(),
        year: this.calYear(),
        page_size: 100,
      }),
      leave: this.hr.getLeaveRequests({ employee: id, page_size: 50 }),
      payslips: this.hr.getEmployeePayslips(id),
      appraisals: this.hr.getAppraisals({ employee: id, page_size: 50 }),
      disciplinary: this.hr.getDisciplinaryRecords({ employee: id, page_size: 50 }),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ employee, attendance, leave, payslips, appraisals, disciplinary }) => {
          this.employee.set(employee);
          this.attendance.set(attendance.results);
          this.leaveRequests.set(leave.results);
          this.payslips.set(payslips);
          this.appraisals.set(appraisals.results);
          this.disciplinary.set(disciplinary.results);
        },
        error: (e) => {
          this.error.set(true);
          this.notification.error(getApiErrorMessage(e));
        },
      });
  }

  setTab(tab: ViewTab): void {
    this.activeTab.set(tab);
  }

  activateEmployee(): void {
    const emp = this.employee();
    if (!emp) return;
    this.confirm
      .open({
        title: 'Activate Employee',
        message: `Activate ${emp.full_name}? They will be included in payroll and attendance.`,
        confirmLabel: 'Activate',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.hr.activateEmployee(emp.id).subscribe({
          next: () => {
            this.notification.success('Employee activated');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }

  prevMonth(): void {
    if (this.calMonth() === 1) {
      this.calMonth.set(12);
      this.calYear.update((y) => y - 1);
    } else {
      this.calMonth.update((m) => m - 1);
    }
    this.reloadAttendance();
  }

  nextMonth(): void {
    if (this.calMonth() === 12) {
      this.calMonth.set(1);
      this.calYear.update((y) => y + 1);
    } else {
      this.calMonth.update((m) => m + 1);
    }
    this.reloadAttendance();
  }

  displaySalary(amount: string, code?: string): string {
    if (!this.showSalary()) return maskSalary(amount);
    return formatHrAmount(amount, code);
  }

  private reloadAttendance(): void {
    const emp = this.employee();
    if (!emp) return;
    this.hr
      .getAttendance({
        employee: emp.id,
        month: this.calMonth(),
        year: this.calYear(),
        page_size: 100,
      })
      .subscribe({
        next: (d) => this.attendance.set(d.results),
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  private buildCalendar(): CalendarDay[] {
    const year = this.calYear();
    const month = this.calMonth();
    const first = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0).getDate();
    const startPad = first.getDay();
    const attMap = new Map(this.attendance().map((a) => [a.date, a.status]));
    const days: CalendarDay[] = [];

    for (let i = 0; i < startPad; i++) {
      days.push({ day: 0, date: '', status: null, inMonth: false });
    }
    for (let d = 1; d <= lastDay; d++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, date, status: attMap.get(date) ?? null, inMonth: true });
    }
    return days;
  }
}
