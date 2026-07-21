import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { EmployeeListItem } from '../../../../core/models/hr.model';
import { UsersService } from '../../../../core/services/users.service';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { SettingsAdminNavComponent } from '../../components/settings-admin-nav/settings-admin-nav.component';

@Component({
  selector: 'app-admin-home',
  imports: [RouterLink, PageHeaderComponent, SettingsAdminNavComponent],
  template: `
    <div class="page-container">
      <app-settings-admin-nav />
      <app-page-header
        title="System Administration"
        subtitle="Super Admin — users, roles, and employee account provisioning"
      />

      @if (pendingCount() > 0) {
        <div class="card p-5 mb-6 border-l-4 border-l-amber-500">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 class="font-semibold text-gray-900">Pending Employee Accounts</h3>
              <p class="text-sm text-gray-600 mt-1">
                {{ pendingCount() }} employee(s) registered by HR without a system login.
              </p>
            </div>
            <a routerLink="/admin/users/create" class="btn-primary">Create Account</a>
          </div>
          <div class="mt-4 overflow-x-auto">
            <table class="data-table w-full text-sm">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Working Company</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (emp of pendingEmployees(); track emp.id) {
                  <tr>
                    <td>{{ emp.full_name }}<br /><span class="text-gray-500">{{ emp.employee_number }}</span></td>
                    <td>{{ emp.department_name }}</td>
                    <td>{{ emp.primary_working_company_name ?? emp.working_company_scope }}</td>
                    <td>{{ emp.status }}</td>
                    <td>
                      <a
                        [routerLink]="['/admin/users/create']"
                        [queryParams]="{ employee: emp.id }"
                        class="text-[#1B3A6B] hover:underline"
                      >
                        Create account
                      </a>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <a routerLink="/settings/users" class="card p-5 hover:shadow-md transition-shadow group">
          <h3 class="font-semibold text-gray-900 group-hover:text-[#1B3A6B]">Users</h3>
          <p class="text-sm text-gray-500 mt-2">
            View, edit, and deactivate all user accounts in the system.
          </p>
        </a>

        <a routerLink="/admin/users/create" class="card p-5 hover:shadow-md transition-shadow group">
          <h3 class="font-semibold text-gray-900 group-hover:text-[#1B3A6B]">Create System Account</h3>
          <p class="text-sm text-gray-500 mt-2">
            Select an existing employee, assign role and company access, and activate their login.
          </p>
        </a>

        <a routerLink="/settings/roles" class="card p-5 hover:shadow-md transition-shadow group">
          <h3 class="font-semibold text-gray-900 group-hover:text-[#1B3A6B]">Roles</h3>
          <p class="text-sm text-gray-500 mt-2">
            Manage department and cross-department roles and their permission sets.
          </p>
        </a>

        <a routerLink="/settings/permissions" class="card p-5 hover:shadow-md transition-shadow group">
          <h3 class="font-semibold text-gray-900 group-hover:text-[#1B3A6B]">Permissions</h3>
          <p class="text-sm text-gray-500 mt-2">
            View and manage module/action permissions assigned to each role.
          </p>
        </a>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminHomeComponent implements OnInit {
  private readonly users = inject(UsersService);

  readonly pendingCount = signal(0);
  readonly pendingEmployees = signal<EmployeeListItem[]>([]);

  ngOnInit(): void {
    this.users.getPendingEmployeeAccounts().subscribe((data) => {
      this.pendingCount.set(data.count);
      this.pendingEmployees.set(data.results);
    });
  }
}
