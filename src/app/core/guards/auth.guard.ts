import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { catchError, map, Observable, of, timeout } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { StorageService } from '../services/storage.service';
import { isTokenExpired } from '../utils/jwt.util';

const AUTH_TIMEOUT_MS = 12_000;
const CHANGE_PASSWORD_ROUTE = '/settings/change-password';

function redirectToLogin(router: Router, auth: AuthService): UrlTree {
  auth.logout();
  return router.createUrlTree(['/login']);
}

function guardWithTimeout(
  source: Observable<boolean | UrlTree>,
  fallback: UrlTree,
): Observable<boolean | UrlTree> {
  return source.pipe(
    timeout(AUTH_TIMEOUT_MS),
    catchError(() => of(fallback)),
  );
}

function enforcePasswordPolicy(auth: AuthService, router: Router, url: string): boolean | UrlTree {
  if (!auth.isPasswordChangeOverdue()) {
    return true;
  }
  if (url.startsWith(CHANGE_PASSWORD_ROUTE)) {
    return true;
  }
  return router.createUrlTree([CHANGE_PASSWORD_ROUTE]);
}

export const authGuard: CanActivateFn = (
  _route,
  state,
): boolean | UrlTree | Observable<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const storage = inject(StorageService);
  const router = inject(Router);
  const currentUrl = state.url || '/';

  const token = storage.getToken();

  if (!token) {
    return router.createUrlTree(['/login']);
  }

  if (isTokenExpired(token)) {
    const refresh = storage.getRefreshToken();
    if (!refresh) {
      return redirectToLogin(router, auth);
    }
    return guardWithTimeout(
      auth.refreshToken().pipe(map(() => enforcePasswordPolicy(auth, router, currentUrl))),
      redirectToLogin(router, auth),
    );
  }

  if (!auth.getCurrentUser()) {
    return guardWithTimeout(
      auth.fetchCurrentUser().pipe(map(() => enforcePasswordPolicy(auth, router, currentUrl))),
      redirectToLogin(router, auth),
    );
  }

  return enforcePasswordPolicy(auth, router, currentUrl);
};
