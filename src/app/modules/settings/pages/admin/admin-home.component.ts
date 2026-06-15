import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ROLES } from '../../../../core/constants/roles.constants';
import { AuthService } from '../../../../core/services/auth.service';
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
        subtitle="Super Admin — users, roles, and permissions"
      />

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <a routerLink="/settings/users" class="card p-5 hover:shadow-md transition-shadow group">
          <h3 class="font-semibold text-gray-900 group-hover:text-[#1B3A6B]">Users</h3>
          <p class="text-sm text-gray-500 mt-2">
            Create, edit, and deactivate all user accounts in the system.
          </p>
        </a>

        <a routerLink="/settings/users/new" class="card p-5 hover:shadow-md transition-shadow group">
          <h3 class="font-semibold text-gray-900 group-hover:text-[#1B3A6B]">User Administration</h3>
          <p class="text-sm text-gray-500 mt-2">
            Create users, assign departments and roles, reset passwords, and preview effective permissions.
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
export class AdminHomeComponent {
  private readonly auth = inject(AuthService);

  readonly isSuperAdmin = () => this.auth.hasRole(ROLES.SUPER_ADMIN);
}
