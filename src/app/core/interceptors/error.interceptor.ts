import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { SKIP_ERROR_TOAST } from '../http/http-contexts';
import { NotificationService } from '../services/notification.service';
import { getApiErrorMessage } from '../utils/api.util';
import { isRecordNotInWorkspaceError } from '../utils/workspace-empty-state.util';

function extractErrorMessage(error: HttpErrorResponse): string {
  return getApiErrorMessage(error);
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notification = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        return throwError(() => error);
      }

      if (req.context.get(SKIP_ERROR_TOAST)) {
        return throwError(() => error);
      }

      if (error.status === 403) {
        notification.error(extractErrorMessage(error));
        return throwError(() => error);
      }

      if (isRecordNotInWorkspaceError(error)) {
        return throwError(() => error);
      }

      const message = extractErrorMessage(error);
      notification.error(message);
      return throwError(() => error);
    }),
  );
};
