import { HttpParams } from '@angular/common/http';

import {
  DashboardApiEnvelope,
  DashboardApiParams,
  DateRangeValue,
} from '../models/dashboard.types';

/** True when the API returned the Phase 6 `{ summary, charts, activity }` envelope. */
export function isDashboardEnvelope(
  value: unknown,
): value is DashboardApiEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    'summary' in value &&
    'charts' in value &&
    'activity' in value
  );
}

/**
 * Flatten a dashboard API envelope into the legacy flat shape used by dashboard components.
 * Pass-through when the response is already flat (older APIs).
 */
export function flattenDashboard<T>(response: T | DashboardApiEnvelope): T {
  if (!isDashboardEnvelope(response)) {
    return response as T;
  }

  const activity =
    response.activity && typeof response.activity === 'object' && !Array.isArray(response.activity)
      ? (response.activity as Record<string, unknown>)
      : Array.isArray(response.activity)
        ? { recent_activities: response.activity }
        : {};

  return {
    ...(response.summary as Record<string, unknown>),
    ...(response.charts as Record<string, unknown>),
    ...activity,
    meta: response.meta,
  } as T;
}

/** Build HTTP query params for dashboard APIs from date range and optional filters. */
export function dashboardHttpParams(
  range?: DateRangeValue | null,
  extra?: DashboardApiParams,
): HttpParams {
  let params = new HttpParams();
  if (range?.startDate) {
    params = params.set('start_date', range.startDate);
  }
  if (range?.endDate) {
    params = params.set('end_date', range.endDate);
  }
  if (extra?.company_id != null) {
    params = params.set('company_id', String(extra.company_id));
  }
  if (extra?.warehouse != null) {
    params = params.set('warehouse', String(extra.warehouse));
  }
  if (extra?.department) {
    params = params.set('department', extra.department);
  }
  return params;
}
