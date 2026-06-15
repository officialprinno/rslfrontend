import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ApiResponse } from '../models/auth.models';
import { NotificationService } from '../services/notification.service';

function extractErrorMessage(error: HttpErrorResponse): string {
  const body = error.error as ApiResponse<unknown> | { message?: string; detail?: string } | null;

  if (body && typeof body === 'object') {
    if ('message' in body && body.message) {
      return body.message;
    }
    if ('detail' in body && body.detail) {
      return String(body.detail);
    }
    if ('errors' in body && body.errors) {
      if (Array.isArray(body.errors)) {
        return body.errors.join(', ');
      }
      const firstKey = Object.keys(body.errors)[0];
      const messages = (body.errors as Record<string, string[]>)[firstKey];
      if (messages?.length) {
        return messages[0];
      }
    }
  }

  switch (error.status) {
    case 0:
      return 'Unable to reach the server. Check your connection.';
    case 404:
      return 'The requested resource was not found.';
    case 500:
      return 'A server error occurred. Please try again later.';
    default:
      return error.message || 'An unexpected error occurred.';
  }
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notification = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        return throwError(() => error);
      }

      if (error.status === 403) {
        notification.error(extractErrorMessage(error));
        return throwError(() => error);
      }

      const message = extractErrorMessage(error);
      notification.error(message);
      return throwError(() => error);
    }),
  );
};
