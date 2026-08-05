import { effect, inject, untracked } from '@angular/core';

import { CompanyContextService } from '../../../core/services/company-context.service';
import { DashboardCacheService } from '../services/dashboard-cache.service';

/**
 * Reload dashboard data when the user switches company workspace.
 * Clears cached dashboard responses so stale company data never appears.
 *
 * IMPORTANT: `onReload` must not register signal dependencies on this effect.
 * Department dashboards call loaders that read/write `actionCenter`, `data`,
 * warehouse filters, etc. Tracking those caused an infinite reload loop
 * (load → set actionCenter → effect re-runs → load → …).
 */
export function setupDashboardCompanyReload(onReload: () => void): void {
  const companyContext = inject(CompanyContextService);
  const cache = inject(DashboardCacheService);
  let lastScope: string | null = null;

  effect(() => {
    const active = companyContext.activeCompany();
    if (!active) {
      lastScope = null;
      return;
    }

    const scope = active.id === 'consolidated' ? 'consolidated' : String(active.id);

    untracked(() => {
      cache.setCompanyScope(scope);
      if (scope === lastScope) {
        return;
      }
      lastScope = scope;
      onReload();
    });
  });
}
