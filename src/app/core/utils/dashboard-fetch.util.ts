import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { DashboardCacheService } from '../../shared/dashboard/services/dashboard-cache.service';
import { DashboardApiEnvelope } from '../../shared/dashboard/models/dashboard.types';
import { flattenDashboard } from '../../shared/dashboard/utils/dashboard-response.util';
import { ApiResponse } from '../models/auth.models';
import { unwrapApi } from './api.util';

/** Cached GET for module dashboard APIs (Phase 7). */
export function fetchCachedDashboard<T>(
  http: HttpClient,
  cache: DashboardCacheService,
  url: string,
  params: HttpParams,
  bypassCache = false,
): Observable<T> {
  const key = cache.cacheKey(url, params);
  return cache.getOrFetch(
    key,
    () =>
      http
        .get<ApiResponse<T | DashboardApiEnvelope>>(url, { params })
        .pipe(unwrapApi(), map((data) => flattenDashboard<T>(data))),
    { bypassCache },
  );
}
