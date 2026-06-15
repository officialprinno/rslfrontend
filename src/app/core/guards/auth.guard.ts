import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { catchError, map, Observable, of } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { StorageService } from '../services/storage.service';
import { isTokenExpired } from '../utils/jwt.util';

export const authGuard: CanActivateFn = (): boolean | UrlTree | Observable<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const storage = inject(StorageService);
  const router = inject(Router);

  const token = storage.getToken();

  if (!token) {
    return router.createUrlTree(['/login']);
  }

  const redirectToLogin = (): Observable<UrlTree> =>
    of(router.createUrlTree(['/login']));

  const handleAuthError = catchError<boolean | UrlTree, Observable<UrlTree>>(() => {
    auth.logout();
    return redirectToLogin();
  });

  if (isTokenExpired(token)) {
    const refresh = storage.getRefreshToken();
    if (!refresh) {
      auth.logout();
      return router.createUrlTree(['/login']);
    }
    return auth.refreshToken().pipe(
      map((): boolean => true),
      handleAuthError,
    );
  }

  if (!auth.getCurrentUser()) {
    return auth.fetchCurrentUser().pipe(
      map((): boolean => true),
      handleAuthError,
    );
  }

  return true;
};
