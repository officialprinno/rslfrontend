import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { RouteAccessData } from '../models/auth.models';
import { AuthService } from '../services/auth.service';
import { CompanyContextService } from '../services/company-context.service';
import { shouldHideProcurementModule } from '../../modules/inventory/utils/inventory-permissions.util';

/** Blocks warehouse receivers (storekeeper / inventory officer) from the Procurement UI. */
export const procurementModuleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const companyCtx = inject(CompanyContextService);

  if (shouldHideProcurementModule(auth, companyCtx)) {
    return router.createUrlTree(['/inventory/dashboard']);
  }

  const data = route.data as RouteAccessData;
  const module = data.module;
  const action = data.action ?? 'read';

  if (module && !auth.hasPermission(module, action)) {
    return router.createUrlTree(['/unauthorized']);
  }

  return true;
};
