import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiResponse } from '../models/auth.models';
import { ListParams } from '../models/paginated.model';

export function buildHttpParams(params: ListParams): HttpParams {
  let httpParams = new HttpParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      httpParams = httpParams.set(key, String(value));
    }
  });
  return httpParams;
}

/** Unwrap legacy double-nested list responses (pagination envelope inside data). */
function isNestedEnvelope(value: unknown): value is { success: true; data: unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    'data' in value &&
    (value as { success: unknown }).success === true
  );
}

function unwrapPayload<T>(payload: T): T {
  if (isNestedEnvelope(payload)) {
    return unwrapPayload(payload.data as T);
  }
  return payload;
}

export function unwrapApi<T>(): (source: Observable<ApiResponse<T>>) => Observable<T> {
  return (source) =>
    source.pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || 'Request failed');
        }
        return unwrapPayload(response.data);
      }),
    );
}

export function unwrapApiOrThrow<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new Error(response.message || 'Request failed');
  }
  return response.data;
}

function flattenApiErrors(
  errors: ApiResponse<unknown>['errors'],
  prefix = '',
): string[] {
  if (!errors) return [];
  if (Array.isArray(errors)) {
    return errors.flatMap((entry, index) => {
      if (typeof entry === 'string') {
        return prefix ? [`${prefix}: ${entry}`] : [entry];
      }
      return flattenApiErrors(entry as ApiResponse<unknown>['errors'], `${prefix}[${index}]`);
    });
  }
  return Object.entries(errors).flatMap(([key, messages]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (!messages?.length) return [];
    if (typeof messages[0] === 'string') {
      return messages.map((message) => (path ? `${path}: ${message}` : message));
    }
    return flattenApiErrors(messages as ApiResponse<unknown>['errors'], path);
  });
}

export function getApiErrorMessage(
  err: unknown,
  fallback = 'Request failed',
): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as ApiResponse<unknown> | { message?: string; detail?: string } | null;
    if (body && typeof body === 'object') {
      if ('errors' in body && body.errors) {
        const flat = flattenApiErrors(body.errors);
        if (flat.length) return flat[0];
      }
      if ('message' in body && body.message && body.message !== 'An error occurred') {
        return body.message;
      }
      if ('message' in body && body.message) return body.message;
      if ('detail' in body && body.detail) return String(body.detail);
    }
    return err.message || fallback;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}

export function extractFieldErrors(errors: ApiResponse<unknown>['errors']): Record<string, string> {
  if (!errors || Array.isArray(errors)) return {};
  const result: Record<string, string> = {};
  Object.entries(errors).forEach(([key, messages]) => {
    if (messages?.length) result[key] = messages[0];
  });
  return result;
}
