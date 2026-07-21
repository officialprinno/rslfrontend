import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environments';
import { dashboardHttpParams } from '../../shared/dashboard';
import { DashboardCacheService } from '../../shared/dashboard/services/dashboard-cache.service';
import { DateRangeValue } from '../../shared/dashboard/models/dashboard.types';
import { MultiDeptDashboardData } from '../models/auth.models';
import { fetchCachedDashboard } from '../utils/dashboard-fetch.util';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly dashCache = inject(DashboardCacheService);
  private readonly baseUrl = `${environment.apiUrl}/core/dashboard/multi-department`;

  getMultiDepartmentDashboard(
    department = 'all',
    range?: DateRangeValue | null,
    bypassCache = false,
  ): Observable<MultiDeptDashboardData> {
    const params = dashboardHttpParams(range, { department });
    return fetchCachedDashboard<MultiDeptDashboardData>(
      this.http,
      this.dashCache,
      `${this.baseUrl}/`,
      params,
      bypassCache,
    );
  }
}
