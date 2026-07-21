import { effect, inject } from '@angular/core';

import { CompanyContextService } from '../../../core/services/company-context.service';
import { DashboardCacheService } from '../services/dashboard-cache.service';

/**
 * Reload dashboard data when the user switches company workspace.
 * Clears cached dashboard responses so stale company data never appears.
 */
export function setupDashboardCompanyReload(onReload: () => void): void {
  const companyContext = inject(CompanyContextService);
  const cache = inject(DashboardCacheService);

  effect(() => {
    const active = companyContext.activeCompany();
    if (!active) {
      return;
    }
    cache.setCompanyScope(companyContext.headerValue() ?? 'none');
    onReload();
  });
}
