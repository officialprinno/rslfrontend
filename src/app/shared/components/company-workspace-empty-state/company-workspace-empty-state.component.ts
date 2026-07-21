import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import {
  buildWorkspaceEmptyMessage,
  buildWorkspaceEmptyTitle,
  siblingCompanyNames,
} from '../../../core/utils/workspace-empty-state.util';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { WorkspaceResetService } from '../../../core/services/workspace-reset.service';

/**
 * Shared empty state for company-scoped list views across all departments.
 * Use moduleName for display (e.g. "Purchase Orders"). Company name is read from app state.
 */
@Component({
  selector: 'app-company-workspace-empty-state',
  imports: [RouterLink],
  template: `
    <div class="py-16 px-6 text-center">
      <div
        class="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-[#EEF4FB] border border-[#D6E4F5]"
      >
        <svg
          class="w-8 h-8 text-[#1B3A6B]/40"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      </div>
      <h3 class="text-base font-semibold text-gray-900 mb-1">{{ heading() }}</h3>
      <p class="text-sm text-gray-500 max-w-md mx-auto mb-6 leading-relaxed">{{ body() }}</p>
      <div class="flex flex-wrap items-center justify-center gap-3">
        @if (backLink()) {
          <a [routerLink]="backLink()!" class="btn-secondary">{{ backLabel() }}</a>
        }
        @if (actionLabel()) {
          <button type="button" (click)="actionClick.emit()" class="btn-primary">
            {{ actionLabel() }}
          </button>
        }
        @if (showSwitchCompany() && switchOptions().length) {
          @for (option of switchOptions(); track option.id) {
            <button type="button" class="btn-ghost text-sm" (click)="switchCompany(option.id)">
              Switch to {{ option.name }}
            </button>
          }
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyWorkspaceEmptyStateComponent {
  private readonly companyContext = inject(CompanyContextService);
  private readonly workspaceReset = inject(WorkspaceResetService);
  private readonly router = inject(Router);

  /** Display name, e.g. "Purchase Orders", "Employees", "Deliveries". */
  readonly moduleName = input('');
  /** Lowercase plural alias — converted to title case when moduleName is omitted. */
  readonly recordLabel = input('');
  readonly actionLabel = input<string>('');
  readonly backLink = input<string | null>(null);
  readonly backLabel = input('Back to list');
  readonly showSwitchCompany = input(true);

  readonly actionClick = output<void>();
  readonly companySwitched = output<void>();

  readonly resolvedModuleName = computed(() => {
    const explicit = this.moduleName().trim();
    if (explicit) return explicit;
    const legacy = this.recordLabel().trim();
    if (!legacy) return 'Records';
    return legacy
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  });

  readonly heading = computed(() => {
    const companyName = this.companyContext.activeCompany()?.name ?? 'this company';
    return buildWorkspaceEmptyTitle(this.resolvedModuleName(), companyName);
  });

  readonly body = computed(() => {
    const active = this.companyContext.activeCompany();
    const companyName = active?.name ?? 'this company';
    const siblings = siblingCompanyNames(this.companyContext.companies(), active);
    return buildWorkspaceEmptyMessage(this.resolvedModuleName(), companyName, siblings);
  });

  readonly switchOptions = computed(() => {
    const active = this.companyContext.activeCompany();
    if (!active || active.id === 'consolidated') {
      return this.companyContext
        .companies()
        .map((c) => ({ id: c.company_id, name: c.company_name }));
    }
    return this.companyContext
      .companies()
      .filter((c) => c.company_id !== active.id)
      .map((c) => ({ id: c.company_id, name: c.company_name }));
  });

  switchCompany(companyId: number): void {
    this.workspaceReset.resetForCompanySwitch();
    this.companyContext.setCompany(companyId);
    this.companyContext.confirmWorkspaceSelection();
    this.companySwitched.emit();
    void this.router.navigateByUrl(this.router.url);
  }
}
