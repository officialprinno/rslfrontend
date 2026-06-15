import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { StorageService } from '../services/storage.service';

const AUTH_URLS = ['/auth/login/', '/auth/refresh/', '/auth/logout/'];

function isAuthEndpoint(url: string): boolean {
  return AUTH_URLS.some((path) => url.includes(path));
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const storage = inject(StorageService);

  const token = storage.getToken();
  const authReq =
    token && !isAuthEndpoint(req.url)
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isAuthEndpoint(req.url)) {
        const refresh = storage.getRefreshToken();
        if (!refresh) {
          auth.logout();
          return throwError(() => error);
        }
        return auth.refreshToken().pipe(
          switchMap((tokens) => {
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${tokens.access}` },
            });
            return next(retryReq);
          }),
          catchError((refreshError) => {
            auth.logout();
            return throwError(() => refreshError);
          }),
        );
      }

      return throwError(() => error);
    }),
  );
};
