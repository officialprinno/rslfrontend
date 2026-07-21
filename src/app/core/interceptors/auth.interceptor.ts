import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { CompanyContextService } from '../services/company-context.service';
import { StorageService } from '../services/storage.service';

const AUTH_URLS = ['/auth/login/', '/auth/refresh/', '/auth/logout/'];

function isAuthEndpoint(url: string): boolean {
  return AUTH_URLS.some((path) => url.includes(path));
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const storage = inject(StorageService);
  const companyContext = inject(CompanyContextService);

  const token = storage.getToken();
  const headers: Record<string, string> = {};

  if (token && !isAuthEndpoint(req.url)) {
    headers['Authorization'] = `Bearer ${token}`;
    const companyHeader = companyContext.headerValue();
    if (companyHeader) {
      headers['X-Company-ID'] = companyHeader;
    }
  }

  const authReq =
    Object.keys(headers).length > 0 ? req.clone({ setHeaders: headers }) : req;

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
            const retryHeaders: Record<string, string> = {
              Authorization: `Bearer ${tokens.access}`,
            };
            const companyHeader = companyContext.headerValue();
            if (companyHeader) {
              retryHeaders['X-Company-ID'] = companyHeader;
            }
            const retryReq = req.clone({ setHeaders: retryHeaders });
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
