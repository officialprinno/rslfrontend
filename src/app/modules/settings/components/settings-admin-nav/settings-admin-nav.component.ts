import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { ROLES } from '../../../../core/constants/roles.constants';

@Component({
  selector: 'app-settings-admin-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `
    @if (isSuperAdmin()) {
      <nav class="flex flex-wrap gap-1 p-1 bg-gray-100 rounded-xl mb-6 overflow-x-auto">
        @for (tab of tabs; track tab.route) {
          <a
            [routerLink]="tab.route"
            routerLinkActive="!bg-white !text-[#1B3A6B] !shadow-sm"
            class="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 whitespace-nowrap transition-all hover:text-gray-900"
          >
            {{ tab.label }}
          </a>
        }
      </nav>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsAdminNavComponent {
  private readonly auth = inject(AuthService);

  readonly tabs = [
    { label: 'Admin Home', route: '/settings/admin' },
    { label: 'Users', route: '/settings/users' },
    { label: 'Roles', route: '/settings/roles' },
    { label: 'Permissions', route: '/settings/permissions' },
  ];

  isSuperAdmin(): boolean {
    return this.auth.hasRole(ROLES.SUPER_ADMIN);
  }
}
