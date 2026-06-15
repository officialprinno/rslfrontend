import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';

import { APP_ROUTE_ACCESS } from '../config/route-access.config';
import { PermissionAction, RouteAccessData } from '../models/auth.models';
import { AuthService } from '../services/auth.service';

function checkAccess(
  auth: AuthService,
  router: Router,
  module: string | undefined,
  action: PermissionAction,
  routeKey?: string,
): boolean | ReturnType<Router['createUrlTree']> {
  if (routeKey === 'dashboard' || module === 'dashboard') {
    if (auth.canAccessMainDashboard()) {
      return true;
    }
    return router.createUrlTree([auth.getDefaultHomeRoute()]);
  }

  if (!module) {
    return true;
  }

  if (auth.hasPermission(module, action)) {
    return true;
  }

  return router.createUrlTree(['/unauthorized']);
}

/** Guard lazy-loaded module trees using route `data` or the URL segment. */
export const moduleAccessGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const data = route.data as RouteAccessData;

  const segment = state.url.split('/').filter(Boolean)[0] ?? '';
  const routeConfig = APP_ROUTE_ACCESS[segment];
  const module =
    data.module ??
    (routeConfig && routeConfig !== 'dashboard' ? routeConfig.module : undefined);
  const action =
    data.action ??
    (routeConfig && routeConfig !== 'dashboard' ? routeConfig.action : 'read');

  return checkAccess(auth, router, module, action, segment);
};

/** Match routes only when the user may access that module section. */
export const moduleCanMatch: CanMatchFn = (route, segments) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const segment = segments[0]?.path ?? '';
  const routeConfig = APP_ROUTE_ACCESS[segment];

  if (!routeConfig) {
    return true;
  }

  if (routeConfig === 'dashboard') {
    return auth.canAccessMainDashboard();
  }

  return (
    checkAccess(auth, router, routeConfig.module, routeConfig.action, segment) === true
  );
};

/** Redirect `/` to the user's appropriate home page. */
export const homeRedirectGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const home = auth.getDefaultHomeRoute();
  if (home === '/dashboard') {
    return true;
  }
  return router.createUrlTree([home]);
};
