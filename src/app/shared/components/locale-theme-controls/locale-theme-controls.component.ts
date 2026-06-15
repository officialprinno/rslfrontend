import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { AppLanguage, AppTheme } from '../../../core/models/preferences.models';
import { PreferencesService } from '../../../core/services/preferences.service';

@Component({
  selector: 'app-locale-theme-controls',
  imports: [TranslatePipe],
  template: `
    <div class="flex items-center gap-1">
      <div class="relative">
        <button
          type="button"
          class="btn-secondary !px-2.5 !py-1.5 text-xs !rounded-lg"
          (click)="langOpen.set(!langOpen()); themeOpen.set(false)"
          [attr.aria-expanded]="langOpen()"
          [attr.aria-label]="'common.language' | translate"
        >
          {{ preferences.languageFlag(preferences.language()) }}
          <span class="hidden sm:inline">{{ preferences.language() === 'en' ? 'EN' : 'SW' }}</span>
        </button>
        @if (langOpen()) {
          <div class="dropdown-menu !min-w-[10rem]" role="menu">
            @for (lang of languages; track lang) {
              <button
                type="button"
                class="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--hover-bg)] transition-colors"
                [class.font-semibold]="preferences.language() === lang"
                (click)="selectLanguage(lang)"
                role="menuitem"
              >
                <span>{{ preferences.languageFlag(lang) }}</span>
                <span>{{ 'common.lang.' + lang | translate }}</span>
              </button>
            }
          </div>
        }
      </div>

      <div class="relative">
        <button
          type="button"
          class="btn-secondary !px-2.5 !py-1.5 text-xs !rounded-lg"
          (click)="themeOpen.set(!themeOpen()); langOpen.set(false)"
          [attr.aria-expanded]="themeOpen()"
          [attr.aria-label]="'common.theme.title' | translate"
        >
          {{ preferences.theme() === 'dark' ? '🌙' : '☀️' }}
        </button>
        @if (themeOpen()) {
          <div class="dropdown-menu !min-w-[10rem]" role="menu">
            @for (theme of themes; track theme) {
              <button
                type="button"
                class="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--hover-bg)] transition-colors"
                [class.font-semibold]="preferences.theme() === theme"
                (click)="selectTheme(theme)"
                role="menuitem"
              >
                <span>{{ theme === 'dark' ? '🌙' : '☀️' }}</span>
                <span>{{ 'common.theme.' + theme | translate }}</span>
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocaleThemeControlsComponent {
  readonly preferences = inject(PreferencesService);

  readonly languages: AppLanguage[] = ['en', 'sw'];
  readonly themes: AppTheme[] = ['light', 'dark'];

  readonly langOpen = signal(false);
  readonly themeOpen = signal(false);

  selectLanguage(lang: AppLanguage): void {
    this.preferences.setLanguage(lang);
    this.langOpen.set(false);
    document.documentElement.lang = lang;
  }

  selectTheme(theme: AppTheme): void {
    this.preferences.setTheme(theme);
    this.themeOpen.set(false);
  }
}
