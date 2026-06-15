import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AppLanguage, AppTheme } from '../../../../core/models/preferences.models';
import { NotificationService } from '../../../../core/services/notification.service';
import { PreferencesService } from '../../../../core/services/preferences.service';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-user-preferences',
  imports: [RouterLink, TranslatePipe, PageHeaderComponent],
  template: `
    <div class="page-container">
      <app-page-header
        [title]="'settings.preferences_title' | translate"
        [subtitle]="'settings.preferences_subtitle' | translate"
      >
        <a routerLink="/settings" class="btn-secondary">{{ 'common.back' | translate }}</a>
      </app-page-header>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div class="card p-5 space-y-4">
          <h2 class="section-title">{{ 'settings.localization' | translate }}</h2>
          <div>
            <label class="input-label">{{ 'common.language' | translate }}</label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              @for (lang of languages; track lang) {
                <button
                  type="button"
                  class="flex items-center gap-3 p-4 rounded-xl border transition-all text-left"
                  [style.border-color]="preferences.language() === lang ? 'var(--color-primary-500)' : 'var(--border-color)'"
                  [class.bg-[var(--hover-bg)]]="preferences.language() === lang"
                  (click)="setLanguage(lang)"
                >
                  <span class="text-xl">{{ preferences.languageFlag(lang) }}</span>
                  <span class="font-medium">{{ 'common.lang.' + lang | translate }}</span>
                </button>
              }
            </div>
          </div>
        </div>

        <div class="card p-5 space-y-4">
          <h2 class="section-title">{{ 'settings.appearance' | translate }}</h2>
          <div>
            <label class="input-label">{{ 'common.theme.title' | translate }}</label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              @for (theme of themes; track theme) {
                <button
                  type="button"
                  class="flex items-center gap-3 p-4 rounded-xl border transition-all text-left"
                  [style.border-color]="preferences.theme() === theme ? 'var(--color-primary-500)' : 'var(--border-color)'"
                  [class.bg-[var(--hover-bg)]]="preferences.theme() === theme"
                  (click)="setTheme(theme)"
                >
                  <span class="text-xl">{{ theme === 'dark' ? '🌙' : '☀️' }}</span>
                  <span class="font-medium">{{ 'common.theme.' + theme | translate }}</span>
                </button>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserPreferencesComponent {
  private readonly notification = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  readonly preferences = inject(PreferencesService);

  readonly languages: AppLanguage[] = ['en', 'sw'];
  readonly themes: AppTheme[] = ['light', 'dark'];

  setLanguage(lang: AppLanguage): void {
    this.preferences.setLanguage(lang);
    document.documentElement.lang = lang;
    this.notification.success(this.translate.instant('settings.preferences_saved'));
  }

  setTheme(theme: AppTheme): void {
    this.preferences.setTheme(theme);
    this.notification.success(this.translate.instant('settings.preferences_saved'));
  }
}
