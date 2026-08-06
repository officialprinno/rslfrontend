import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { ROLES } from '../constants/roles.constants';
import { RouteAccessData } from '../models/auth.models';
import { AuthService } from '../services/auth.service';

export const reportsAccessGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.hasRole(ROLES.SUPER_ADMIN) || auth.hasRole(ROLES.GENERAL_MANAGER)) {
    return true;
  }

  const data = route.data as RouteAccessData;
  const module = data.module;
  const action = data.action ?? 'read';

  if (module && auth.hasPermission(module, action)) {
    return true;
  }

  return router.createUrlTree(['/unauthorized']);
};
