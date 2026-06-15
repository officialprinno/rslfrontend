import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { EmployeeListItem } from '../../../../core/models/hr.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { DepartmentsService } from '../../../../core/services/departments.service';
import { HrService } from '../../../../core/services/hr.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { exportToExcel } from '../../../../core/utils/export.util';
import { formatDate } from '../../../../core/utils/format.util';
import { Department } from '../../../../core/models/procurement.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { HrNavComponent } from '../../components/hr-nav/hr-nav.component';
import {
  EMPLOYEE_STATUSES,
  EMPLOYMENT_TYPES,
  employmentTypeLabel,
  formatHrAmount,
  maskSalary,
} from '../../constants/hr.constants';
import {
  canActivateEmployee,
  canDeactivateEmployee,
  canManageEmployees,
  canViewSalary,
} from '../../utils/hr-permissions.util';

@Component({
  selector: 'app-employees-list',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    HrNavComponent,
    PaginationComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './employees-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeesListComponent implements OnInit {
  private readonly hr = inject(HrService);
  private readonly departments = inject(DepartmentsService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly employees = signal<EmployeeListItem[]>([]);
  readonly deptOptions = signal<Department[]>([]);
  readonly loading = signal(true);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly search = signal('');
  readonly departmentFilter = signal<number | ''>('');
  readonly statusFilter = signal('');
  readonly typeFilter = signal('');

  readonly employmentTypes = EMPLOYMENT_TYPES;
  readonly statusOptions = EMPLOYEE_STATUSES;
  readonly formatDate = formatDate;
  readonly employmentTypeLabel = employmentTypeLabel;
  readonly canAdd = () => canManageEmployees(this.auth);
  readonly canDeactivate = () => canDeactivateEmployee(this.auth);
  readonly canActivate = () => canActivateEmployee(this.auth);
  readonly showSalary = () => canViewSalary(this.auth);

  ngOnInit(): void {
    this.departments.getDepartments().subscribe((d) => this.deptOptions.set(d));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const params: Record<string, string | number | boolean> = {
      page: this.page(),
      page_size: 15,
      ordering: 'employee_number',
    };
    if (this.search()) params['search'] = this.search();
    if (this.departmentFilter()) params['department'] = this.departmentFilter() as number;
    if (this.statusFilter()) params['status'] = this.statusFilter();
    if (this.typeFilter()) params['employment_type'] = this.typeFilter();

    this.hr
      .getEmployees(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.employees.set(d.results);
          this.total.set(d.count);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  displaySalary(emp: EmployeeListItem): string {
    if (!this.showSalary()) return maskSalary(emp.basic_salary);
    return formatHrAmount(emp.basic_salary, emp.currency_code);
  }

  deactivate(emp: EmployeeListItem): void {
    this.confirm
      .open({
        title: 'Deactivate Employee',
        message: `Deactivate ${emp.full_name} (${emp.employee_number})? Their status will be set to inactive.`,
        confirmLabel: 'Deactivate',
        confirmDanger: true,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.hr.deactivateEmployee(emp.id).subscribe({
          next: () => {
            this.notification.success('Employee deactivated');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }

  activate(emp: EmployeeListItem): void {
    this.confirm
      .open({
        title: 'Activate Employee',
        message: `Activate ${emp.full_name} (${emp.employee_number})? They will be included in payroll and attendance.`,
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

  exportExcel(): void {
    exportToExcel('employees', [
      { key: 'employee_number', label: 'Employee No.' },
      { key: 'full_name', label: 'Full Name' },
      { key: 'department_name', label: 'Department' },
      { key: 'job_title', label: 'Job Title' },
      { key: 'employment_type', label: 'Employment Type' },
      { key: 'phone', label: 'Phone' },
      { key: 'national_id', label: 'National ID' },
      { key: 'status', label: 'Status' },
      { key: 'contract_end', label: 'Contract End' },
    ], this.employees().map((e) => ({
      ...e,
      employment_type: employmentTypeLabel(e.employment_type),
      basic_salary: this.showSalary() ? e.basic_salary : maskSalary(e.basic_salary),
    })));
  }
}
