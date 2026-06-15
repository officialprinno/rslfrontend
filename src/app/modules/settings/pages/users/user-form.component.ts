import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { Permission, Role, User, UserDepartmentWrite } from '../../../../core/models/auth.models';
import { Department } from '../../../../core/models/procurement.model';
import { DepartmentsService } from '../../../../core/services/departments.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  UsersService,
} from '../../../../core/services/users.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { SettingsAdminNavComponent } from '../../components/settings-admin-nav/settings-admin-nav.component';

interface AssignmentRow {
  department: number | '';
  role: number | '';
  is_primary: boolean;
}

@Component({
  selector: 'app-user-form',
  imports: [FormsModule, RouterLink, PageHeaderComponent, SettingsAdminNavComponent],
  templateUrl: './user-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly users = inject(UsersService);
  private readonly departments = inject(DepartmentsService);
  private readonly notification = inject(NotificationService);

  readonly userId = Number(this.route.snapshot.paramMap.get('id'));
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly user = signal<User | null>(null);
  readonly deptOptions = signal<Department[]>([]);
  readonly rolesByDept = signal<Record<number, Role[]>>({});
  readonly assignments = signal<AssignmentRow[]>([]);
  readonly previewPermissions = signal<Permission[]>([]);

  readonly permissionModules = PERMISSION_MODULES;
  readonly permissionActions = PERMISSION_ACTIONS;

  readonly matrix = computed(() => this.users.buildPermissionMatrix(this.previewPermissions()));

  readonly firstName = signal('');
  readonly lastName = signal('');
  readonly phone = signal('');
  readonly isActive = signal(true);
  readonly newPassword = signal('');
  readonly resettingPassword = signal(false);

  ngOnInit(): void {
    forkJoin({
      user: this.users.getUser(this.userId),
      departments: this.departments.getDepartments(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ user, departments }) => {
          this.user.set(user);
          this.deptOptions.set(departments);
          this.firstName.set(user.first_name);
          this.lastName.set(user.last_name);
          this.phone.set(user.phone ?? '');
          this.isActive.set(user.is_active);
          this.previewPermissions.set(user.permissions ?? []);
          const rows: AssignmentRow[] = (user.departments ?? []).map((d) => ({
            department: d.department_id,
            role: d.role_id,
            is_primary: d.is_primary,
          }));
          this.assignments.set(rows.length ? rows : [{ department: '', role: '', is_primary: true }]);
          for (const row of rows) {
            if (row.department) {
              this.loadRolesForDepartment(row.department);
            }
          }
        },
        error: (err) => this.notification.error(getApiErrorMessage(err, 'Failed to load user')),
      });
  }

  addAssignment(): void {
    this.assignments.update((rows) => [...rows, { department: '', role: '', is_primary: false }]);
  }

  removeAssignment(index: number): void {
    this.assignments.update((rows) => rows.filter((_, i) => i !== index));
    this.refreshPreview();
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
    this.refreshPreview();
  }

  onRoleChange(index: number, roleId: number | ''): void {
    this.assignments.update((rows) => {
      const next = [...rows];
      next[index] = { ...next[index], role: roleId };
      return next;
    });
    this.refreshPreview();
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

  resetPassword(): void {
    const password = this.newPassword().trim();
    if (!password) {
      this.notification.error('Enter a new password.');
      return;
    }
    this.resettingPassword.set(true);
    this.users
      .resetPassword(this.userId, password)
      .pipe(finalize(() => this.resettingPassword.set(false)))
      .subscribe({
        next: () => {
          this.newPassword.set('');
          this.notification.success('Password reset successfully');
        },
        error: (err) => this.notification.error(getApiErrorMessage(err, 'Failed to reset password')),
      });
  }

  save(): void {
    const payloadAssignments: UserDepartmentWrite[] = this.assignments()
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
      .updateUser(this.userId, {
        first_name: this.firstName(),
        last_name: this.lastName(),
        phone: this.phone(),
        is_active: this.isActive(),
        is_multi_department: payloadAssignments.length > 1,
        department_assignments: payloadAssignments,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (updated) => {
          this.user.set(updated);
          this.previewPermissions.set(updated.permissions ?? []);
          this.notification.success('User updated. They must re-login to refresh JWT permissions.');
        },
        error: (err) => this.notification.error(getApiErrorMessage(err, 'Failed to save user')),
      });
  }

  private loadRolesForDepartment(deptId: number): void {
    if (this.rolesByDept()[deptId]) return;
    this.users.getRoles(deptId).subscribe((roles) => {
      this.rolesByDept.update((map) => ({ ...map, [deptId]: roles }));
      this.refreshPreview();
    });
  }

  private refreshPreview(): void {
    const perms: Permission[] = [];
    for (const row of this.assignments()) {
      if (!row.department || !row.role) continue;
      const roles = this.rolesByDept()[row.department] ?? [];
      const role = roles.find((r) => r.id === row.role);
      for (const p of role?.permissions ?? []) {
        if (p.is_active !== false) {
          perms.push(p);
        }
      }
    }
    this.previewPermissions.set(perms);
  }
}
