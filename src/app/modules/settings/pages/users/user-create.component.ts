import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { Role } from '../../../../core/models/auth.models';
import { Department } from '../../../../core/models/procurement.model';
import { DepartmentsService } from '../../../../core/services/departments.service';
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

@Component({
  selector: 'app-user-create',
  imports: [FormsModule, RouterLink, PageHeaderComponent, SettingsAdminNavComponent],
  templateUrl: './user-create.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserCreateComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly users = inject(UsersService);
  private readonly departments = inject(DepartmentsService);
  private readonly notification = inject(NotificationService);

  readonly saving = signal(false);
  readonly deptOptions = signal<Department[]>([]);
  readonly rolesByDept = signal<Record<number, Role[]>>({});
  readonly assignments = signal<AssignmentRow[]>([
    { department: '', role: '', is_primary: true },
  ]);

  readonly email = signal('');
  readonly password = signal('');
  readonly firstName = signal('');
  readonly lastName = signal('');
  readonly phone = signal('');
  readonly isActive = signal(true);

  ngOnInit(): void {
    this.departments.getDepartments().subscribe((departments) => this.deptOptions.set(departments));
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
      this.notification.error('Add at least one department assignment.');
      return;
    }

    this.saving.set(true);
    this.users
      .createUser({
        email: this.email().trim(),
        password: this.password(),
        first_name: this.firstName().trim(),
        last_name: this.lastName().trim(),
        phone: this.phone().trim(),
        is_active: this.isActive(),
        is_multi_department: payloadAssignments.length > 1,
        department_assignments: payloadAssignments,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (user) => {
          this.notification.success('User created successfully');
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
