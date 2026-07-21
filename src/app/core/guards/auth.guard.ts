import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { catchError, map, Observable, of, timeout } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { StorageService } from '../services/storage.service';
import { isTokenExpired } from '../utils/jwt.util';

const AUTH_TIMEOUT_MS = 12_000;

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

export const authGuard: CanActivateFn = (): boolean | UrlTree | Observable<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const storage = inject(StorageService);
  const router = inject(Router);

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
      auth.refreshToken().pipe(map((): boolean => true)),
      redirectToLogin(router, auth),
    );
  }

  if (!auth.getCurrentUser()) {
    return guardWithTimeout(
      auth.fetchCurrentUser().pipe(map((): boolean => true)),
      redirectToLogin(router, auth),
    );
  }

  return true;
};
