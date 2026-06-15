import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { ROLES } from '../constants/roles.constants';
import { AuthService } from '../services/auth.service';

/** Restrict route to Super Admin only. */
export const superAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.hasRole(ROLES.SUPER_ADMIN)) {
    return true;
  }
  return router.createUrlTree(['/unauthorized']);
};
