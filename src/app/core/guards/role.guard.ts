import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { PermissionAction, RouteAccessData } from '../models/auth.models';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const data = route.data as RouteAccessData;
  const requiredRoles = data.roles;
  const module = data.module;
  const action = data.action ?? 'read';

  if (requiredRoles?.length) {
    const hasRole = requiredRoles.some((role) => auth.hasRole(role));
    if (!hasRole) {
      return router.createUrlTree(['/unauthorized']);
    }
  }

  if (module) {
    if (!auth.hasPermission(module, action)) {
      return router.createUrlTree(['/unauthorized']);
    }
  }

  return true;
};
