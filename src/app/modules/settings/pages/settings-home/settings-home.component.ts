import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { ROLES } from '../../../../core/constants/roles.constants';
import { AuthService } from '../../../../core/services/auth.service';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-settings-home',
  imports: [RouterLink, PageHeaderComponent, TranslatePipe],
  template: `
    <div class="page-container">
      <app-page-header
        [title]="'settings.title' | translate"
        [subtitle]="'settings.subtitle' | translate"
      />
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <a routerLink="/settings/preferences" class="card p-5 hover:shadow-md transition-shadow group">
          <h3 class="font-semibold group-hover:text-[#1B3A6B]">{{ 'settings.preferences_title' | translate }}</h3>
          <p class="text-sm text-[var(--text-secondary)] mt-2">
            {{ 'settings.preferences_subtitle' | translate }}
          </p>
        </a>
        @if (isSuperAdmin()) {
          <a routerLink="/settings/admin" class="card p-5 hover:shadow-md transition-shadow group">
            <h3 class="font-semibold group-hover:text-[#1B3A6B]">{{ 'settings.admin_title' | translate }}</h3>
            <p class="text-sm text-[var(--text-secondary)] mt-2">
              {{ 'settings.system_admin_card' | translate }}
            </p>
          </a>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsHomeComponent {
  private readonly auth = inject(AuthService);

  isSuperAdmin(): boolean {
    return this.auth.hasRole(ROLES.SUPER_ADMIN);
  }
}
