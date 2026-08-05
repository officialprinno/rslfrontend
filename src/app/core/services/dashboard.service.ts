import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environments';
import { dashboardHttpParams } from '../../shared/dashboard';
import { DashboardCacheService } from '../../shared/dashboard/services/dashboard-cache.service';
import { DateRangeValue } from '../../shared/dashboard/models/dashboard.types';
import { ApiResponse, MultiDeptDashboardData } from '../models/auth.models';
import { DeptActionDepartment, DeptApprovalsData } from '../models/dept-approvals.models';
import { GmApprovalsData } from '../models/gm-approvals.models';
import { unwrapApi } from '../utils/api.util';
import { fetchCachedDashboard } from '../utils/dashboard-fetch.util';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly dashCache = inject(DashboardCacheService);
  private readonly baseUrl = `${environment.apiUrl}/core/dashboard/multi-department`;
  private readonly gmApprovalsUrl = `${environment.apiUrl}/core/dashboard/gm-approvals`;
  private readonly deptApprovalsUrl = `${environment.apiUrl}/core/dashboard/dept-approvals`;

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

  /** Pending approvals waiting on General Manager only. */
  getGmApprovals(bypassCache = false): Observable<GmApprovalsData> {
    const params = dashboardHttpParams(null);
    return fetchCachedDashboard<GmApprovalsData>(
      this.http,
      this.dashCache,
      `${this.gmApprovalsUrl}/`,
      params,
      bypassCache,
    );
  }

  /** Uncached refresh for Action Center after approve actions. */
  refreshGmApprovals(): Observable<GmApprovalsData> {
    return this.http
      .get<ApiResponse<GmApprovalsData>>(`${this.gmApprovalsUrl}/`)
      .pipe(unwrapApi());
  }

  /** Pending verify/confirm/approve queues for a department dashboard. */
  getDeptApprovals(
    department: DeptActionDepartment,
    bypassCache = false,
  ): Observable<DeptApprovalsData> {
    const params = dashboardHttpParams(null, { department });
    return fetchCachedDashboard<DeptApprovalsData>(
      this.http,
      this.dashCache,
      `${this.deptApprovalsUrl}/`,
      params,
      bypassCache,
    );
  }
}
