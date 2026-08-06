import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { Role } from '../../../../core/models/auth.models';
import { EmployeeListItem } from '../../../../core/models/hr.model';
import { Department } from '../../../../core/models/procurement.model';
import { CompaniesService, CompanyOption } from '../../../../core/services/companies.service';
import { DepartmentsService } from '../../../../core/services/departments.service';
import { HrService } from '../../../../core/services/hr.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { UsersService } from '../../../../core/services/users.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { SettingsAdminNavComponent } from '../../components/settings-admin-nav/settings-admin-nav.component';

interface AssignmentRow {
  department: number | '';
  role: number | '';
  is_primary: boolean;
}

interface CompanyRow {
  company: number;
  default_company: boolean;
  selected: boolean;
}

type CompanyScope = 'SUPPLY' | 'STEIN' | 'BOTH';

@Component({
  selector: 'app-user-create',
  imports: [FormsModule, RouterLink, PageHeaderComponent, SettingsAdminNavComponent],
  templateUrl: './user-create.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserCreateComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly users = inject(UsersService);
  private readonly hr = inject(HrService);
  private readonly departments = inject(DepartmentsService);
  private readonly companies = inject(CompaniesService);
  private readonly notification = inject(NotificationService);

  readonly saving = signal(false);
  readonly loadingPreview = signal(false);
  readonly deptOptions = signal<Department[]>([]);
  readonly rolesByDept = signal<Record<number, Role[]>>({});
  readonly employeesWithoutAccounts = signal<EmployeeListItem[]>([]);
  readonly companyOptions = signal<CompanyOption[]>([]);
  readonly assignments = signal<AssignmentRow[]>([{ department: '', role: '', is_primary: true }]);
  readonly companyRows = signal<CompanyRow[]>([]);
  readonly companyScope = signal<CompanyScope>('BOTH');

  readonly selectedEmployeeId = signal<number | ''>('');
  readonly email = signal('');
  readonly password = signal('');
  readonly firstName = signal('');
  readonly lastName = signal('');
  readonly phone = signal('');
  readonly isActive = signal(true);
  readonly provisionFromEmployee = signal(true);

  ngOnInit(): void {
    this.departments.getDepartments().subscribe((departments) => this.deptOptions.set(departments));
    this.companies.listCompanies().subscribe((companies) => {
      this.companyOptions.set(companies);
      this.applyCompanyScope('BOTH');
    });
    this.hr.getEmployeesWithoutAccounts().subscribe((employees) => {
      this.employeesWithoutAccounts.set(employees);
      const preselect = this.route.snapshot.queryParamMap.get('employee');
      if (preselect) {
        this.selectedEmployeeId.set(+preselect);
        this.onEmployeeSelected(+preselect);
      }
    });
  }

  addAssignment(): void {
    this.assignments.update((rows) => [...rows, { department: '', role: '', is_primary: false }]);
  }

  removeAssignment(index: number): void {
    this.assignments.update((rows) => rows.filter((_, i) => i !== index));
  }

  onDepartmentChange(index: number, deptId: number | ''): void {
    this.assignments.update((rows) => {
      const next = [...rows];
      next[index] = { ...next[index], department: deptId, role: '' };
      return next;
    });
    if (deptId) {
      this.loadRolesForDepartment(deptId);
    }
  }

  onRoleChange(index: number, roleId: number | ''): void {
    this.assignments.update((rows) => {
      const next = [...rows];
      next[index] = { ...next[index], role: roleId };
      return next;
    });
  }

  setPrimary(index: number): void {
    this.assignments.update((rows) =>
      rows.map((row, i) => ({ ...row, is_primary: i === index })),
    );
  }

  rolesFor(deptId: number | ''): Role[] {
    if (!deptId) return [];
    return this.rolesByDept()[deptId] ?? [];
  }

  onEmployeeSelected(employeeId: number | ''): void {
    this.selectedEmployeeId.set(employeeId);
    if (!employeeId) {
      this.provisionFromEmployee.set(false);
      this.applyCompanyScope(this.companyScope());
      return;
    }
    this.provisionFromEmployee.set(true);
    this.loadingPreview.set(true);
    this.users
      .getProvisioningPreview(+employeeId)
      .pipe(finalize(() => this.loadingPreview.set(false)))
      .subscribe({
        next: (preview) => {
          const emp = preview.employee;
          this.firstName.set(emp.first_name);
          this.lastName.set(emp.last_name);
          this.phone.set(emp.phone ?? '');
          this.email.set(emp.work_email || emp.personal_email || '');

          const deptId = emp.department;
          this.assignments.set([{ department: deptId, role: '', is_primary: true }]);
          this.loadRolesForDepartment(deptId);

          const suggested = preview.suggested_companies ?? emp.suggested_user_companies ?? [];
          const allCompanies = this.companyOptions();
          this.companyRows.set(
            allCompanies.map((c) => {
              const match = suggested.find((s) => s.company_id === c.id);
              return {
                company: c.id,
                default_company: match?.default_company ?? false,
                selected: Boolean(match),
              };
            }),
          );
          if (!this.companyRows().some((r) => r.default_company)) {
            const firstSelected = this.companyRows().find((r) => r.selected);
            if (firstSelected) {
              this.setDefaultCompany(firstSelected.company);
            }
          }
          this.companyScope.set(this.detectScopeFromRows(this.companyRows()));
        },
        error: (err) => this.notification.error(getApiErrorMessage(err)),
      });
  }

  onScopeChange(scope: CompanyScope): void {
    this.applyCompanyScope(scope);
  }

  toggleCompany(companyId: number, selected: boolean): void {
    this.companyRows.update((rows) =>
      rows.map((row) => {
        if (row.company !== companyId) return row;
        return { ...row, selected, default_company: selected ? row.default_company : false };
      }),
    );
    const selectedRows = this.companyRows().filter((r) => r.selected);
    if (selectedRows.length && !selectedRows.some((r) => r.default_company)) {
      this.setDefaultCompany(selectedRows[0].company);
    }
  }

  setDefaultCompany(companyId: number): void {
    this.companyRows.update((rows) =>
      rows.map((row) => ({
        ...row,
        default_company: row.selected && row.company === companyId,
      })),
    );
  }

  private applyCompanyScope(scope: CompanyScope): void {
    this.companyScope.set(scope);
    const options = this.companyOptions();
    const supply = options.find((c) => c.code?.toUpperCase() === 'SUPPLY');
    const stein = options.find((c) => c.code?.toUpperCase() === 'STEIN');
    const selectedIds = new Set<number>();

    if (scope === 'SUPPLY' || scope === 'BOTH') {
      if (supply) selectedIds.add(supply.id);
    }
    if (scope === 'STEIN' || scope === 'BOTH') {
      if (stein) selectedIds.add(stein.id);
    }
    if (!selectedIds.size) {
      for (const c of options) {
        selectedIds.add(c.id);
      }
    }

    const previousDefault = this.companyRows().find((r) => r.default_company && selectedIds.has(r.company));
    const fallbackDefault = previousDefault?.company ?? Array.from(selectedIds)[0] ?? null;

    this.companyRows.set(
      options.map((c) => ({
        company: c.id,
        selected: selectedIds.has(c.id),
        default_company: fallbackDefault != null && c.id === fallbackDefault,
      })),
    );
  }

  private detectScopeFromRows(rows: CompanyRow[]): CompanyScope {
    const selected = rows.filter((r) => r.selected);
    if (!selected.length) return 'BOTH';

    const selectedCodes = new Set(
      selected
        .map((row) => this.companyOptions().find((c) => c.id === row.company)?.code?.toUpperCase())
        .filter((code): code is string => Boolean(code)),
    );

    const hasSupply = selectedCodes.has('SUPPLY');
    const hasStein = selectedCodes.has('STEIN');

    if (hasSupply && hasStein) return 'BOTH';
    if (hasStein) return 'STEIN';
    return 'SUPPLY';
  }

  companyName(companyId: number): string {
    return this.companyOptions().find((c) => c.id === companyId)?.name ?? 'Company';
  }

  submit(): void {
    if (!this.email().trim() || !this.password() || !this.firstName().trim() || !this.lastName().trim()) {
      this.notification.error('Email, password, first name, and last name are required.');
      return;
    }

    const payloadAssignments = this.assignments()
      .filter((r) => r.department && r.role)
      .map((r) => ({
        department: Number(r.department),
        role: Number(r.role),
        is_primary: r.is_primary,
      }));

    if (!payloadAssignments.length) {
      this.notification.error('Add at least one department and role assignment.');
      return;
    }

    const companyAssignments = this.companyRows()
      .filter((r) => r.selected)
      .map((r) => ({ company: r.company, default_company: r.default_company }));

    if (!companyAssignments.length) {
      this.notification.error('Select at least one accessible company.');
      return;
    }
    if (!companyAssignments.some((r) => r.default_company)) {
      companyAssignments[0].default_company = true;
    }

    const employeeId = this.selectedEmployeeId();
    const primaryRole = payloadAssignments.find((a) => a.is_primary) ?? payloadAssignments[0];

    this.saving.set(true);

    const req$ = employeeId
      ? this.users.createUserFromEmployee({
        employee: +employeeId,
        email: this.email().trim(),
        password: this.password(),
        role: primaryRole.role,
        is_active: this.isActive(),
        department_assignments: payloadAssignments,
        company_assignments: companyAssignments,
      })
      : this.users.createUser({
        email: this.email().trim(),
        password: this.password(),
        first_name: this.firstName().trim(),
        last_name: this.lastName().trim(),
        phone: this.phone().trim(),
        is_active: this.isActive(),
        is_multi_department: payloadAssignments.length > 1,
        department_assignments: payloadAssignments,
        company_assignments: companyAssignments,
      });

    req$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (user) => {
        this.notification.success(employeeId ? 'Account created from employee' : 'User created');
        void this.router.navigate(['/settings/users', user.id, 'edit']);
      },
      error: (err) => this.notification.error(getApiErrorMessage(err, 'Failed to create user')),
    });
  }

  private loadRolesForDepartment(deptId: number): void {
    if (this.rolesByDept()[deptId]) return;
    this.users.getRoles(deptId).subscribe((roles) => {
      this.rolesByDept.update((map) => ({ ...map, [deptId]: roles }));
    });
  }
}
