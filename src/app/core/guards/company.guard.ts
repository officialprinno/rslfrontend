import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { CompanyContextService } from '../services/company-context.service';

/** Block app routes until a multi-company user has chosen an active workspace. */
export const companyGuard: CanActivateFn = (): boolean | UrlTree => {
  const auth = inject(AuthService);
  const companyContext = inject(CompanyContextService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return true;
  }

  const companies = companyContext.companies();
  if (companies.length <= 1) {
    return true;
  }

  if (companyContext.selectionRequired() || !companyContext.activeCompany()) {
    return router.createUrlTree(['/login'], { queryParams: { workspace: '1' } });
  }

  return true;
};
