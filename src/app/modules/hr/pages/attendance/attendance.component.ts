import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import {
  Attendance,
  AttendanceBulkRecord,
  AttendanceStatus,
  EmployeeOption,
  MonthlyAttendanceSummary,
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
import { ATTENDANCE_STATUS_COLORS } from '../../constants/hr.constants';
import { canMarkAttendance } from '../../utils/hr-permissions.util';

interface DailyAttendanceRow {
  employee: EmployeeOption;
  record: Attendance | null;
  selected: boolean;
  status: AttendanceStatus;
}

@Component({
  selector: 'app-attendance',
  imports: [
    FormsModule,
    PageHeaderComponent,
    HrNavComponent,
    ModalComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './attendance.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceComponent implements OnInit {
  private readonly hr = inject(HrService);
  private readonly departmentsService = inject(DepartmentsService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);

  readonly viewMode = signal<'daily' | 'monthly'>('daily');
  readonly selectedDate = signal(new Date().toISOString().slice(0, 10));
  readonly summaryMonth = signal(new Date().getMonth() + 1);
  readonly summaryYear = signal(new Date().getFullYear());
  readonly departmentFilter = signal<number | ''>('');
  readonly statusFilter = signal('');
  readonly search = signal('');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly showBulk = signal(false);
  readonly bulkStatus = signal<AttendanceStatus>('PRESENT');

  readonly employees = signal<EmployeeOption[]>([]);
  readonly attendance = signal<Attendance[]>([]);
  readonly monthlySummary = signal<MonthlyAttendanceSummary[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly dailyRows = signal<DailyAttendanceRow[]>([]);

  readonly formatDate = formatDate;
  readonly statusColors = ATTENDANCE_STATUS_COLORS;
  readonly canMark = () => canMarkAttendance(this.auth);

  readonly attendanceStatuses: { value: AttendanceStatus; label: string }[] = [
    { value: 'PRESENT', label: 'Present' },
    { value: 'ABSENT', label: 'Absent' },
    { value: 'LATE', label: 'Late' },
    { value: 'HALF_DAY', label: 'Half Day' },
    { value: 'LEAVE', label: 'Leave' },
  ];

  readonly months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  readonly filteredDailyRows = computed(() => {
    const q = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    return this.dailyRows().filter((row) => {
      if (q && !row.employee.full_name.toLowerCase().includes(q)) return false;
      if (status && row.status !== status) return false;
      return true;
    });
  });

  readonly filteredMonthly = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.monthlySummary().filter((row) => {
      if (q && !row.employee_name.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  readonly selectedCount = computed(() => this.dailyRows().filter((r) => r.selected).length);

  ngOnInit(): void {
    this.departmentsService.getDepartments().subscribe((d) => this.departments.set(d));
    this.loadEmployees();
    this.load();
  }

  loadEmployees(): void {
    const params: Record<string, string | number> = { status: 'ACTIVE', page_size: 500 };
    if (this.departmentFilter()) params['department'] = this.departmentFilter() as number;
    this.hr.getEmployees(params).subscribe({
      next: (d) => this.employees.set(d.results),
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  load(): void {
    if (this.viewMode() === 'daily') {
      this.loadDaily();
    } else {
      this.loadMonthly();
    }
  }

  setViewMode(mode: 'daily' | 'monthly'): void {
    this.viewMode.set(mode);
    this.load();
  }

  loadDaily(): void {
    this.loading.set(true);
    const empParams: Record<string, string | number> = { status: 'ACTIVE', page_size: 500 };
    const attParams: Record<string, string | number> = {
      date: this.selectedDate(),
      page_size: 500,
    };
    if (this.departmentFilter()) {
      empParams['department'] = this.departmentFilter() as number;
      attParams['department'] = this.departmentFilter() as number;
    }

    forkJoin({
      employees: this.hr.getEmployees(empParams),
      attendance: this.hr.getAttendance(attParams),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ employees, attendance }) => {
          this.employees.set(employees.results);
          this.attendance.set(attendance.results);
          this.buildDailyRows(attendance.results);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  loadMonthly(): void {
    this.loading.set(true);
    this.hr
      .getMonthlyAttendanceSummary(this.summaryMonth(), this.summaryYear())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (rows) => this.monthlySummary.set(rows),
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  onDepartmentChange(): void {
    this.loadEmployees();
    this.load();
  }

  buildDailyRows(records: Attendance[]): void {
    const map = new Map(records.map((r) => [r.employee, r]));
    const rows: DailyAttendanceRow[] = this.employees().map((emp) => {
      const record = map.get(emp.id) ?? null;
      return {
        employee: emp,
        record,
        selected: false,
        status: record?.status ?? 'PRESENT',
      };
    });
    this.dailyRows.set(rows);
  }

  toggleRow(employeeId: number, selected: boolean): void {
    this.dailyRows.update((rows) =>
      rows.map((r) => (r.employee.id === employeeId ? { ...r, selected } : r)),
    );
  }

  toggleAll(selected: boolean): void {
    this.dailyRows.update((rows) => rows.map((r) => ({ ...r, selected })));
  }

  updateRowStatus(employeeId: number, status: AttendanceStatus): void {
    this.dailyRows.update((rows) =>
      rows.map((r) => (r.employee.id === employeeId ? { ...r, status } : r)),
    );
  }

  openBulkMark(): void {
    const selected = this.dailyRows().filter((r) => r.selected);
    if (!selected.length) {
      this.notification.error('Select at least one employee.');
      return;
    }
    this.bulkStatus.set('PRESENT');
    this.showBulk.set(true);
  }

  submitBulkMark(): void {
    const selected = this.dailyRows().filter((r) => r.selected);
    const records: AttendanceBulkRecord[] = selected.map((row) => ({
      employee: row.employee.id,
      date: this.selectedDate(),
      status: this.bulkStatus(),
    }));
    this.saving.set(true);
    this.hr
      .bulkMarkAttendance(records)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Attendance saved');
          this.showBulk.set(false);
          this.loadDaily();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  saveSingleRow(row: DailyAttendanceRow): void {
    if (!this.canMark()) return;
    this.saving.set(true);
    this.hr
      .bulkMarkAttendance([
        {
          employee: row.employee.id,
          date: this.selectedDate(),
          status: row.status,
        },
      ])
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success(`Attendance saved for ${row.employee.full_name}`);
          this.loadDaily();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  statusBadgeClass(status: string): string {
    const color = this.statusColors[status] ?? 'gray';
    const map: Record<string, string> = {
      green: 'badge-approved',
      red: 'badge-rejected',
      orange: 'badge-partial',
      yellow: 'badge-pending',
      blue: 'badge-confirmed',
      gray: 'badge-draft',
    };
    return map[color] ?? 'badge-draft';
  }
}
