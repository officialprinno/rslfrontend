import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environments';
import { ApiResponse, MultiDeptDashboardData } from '../models/auth.models';
import { unwrapApi } from '../utils/api.util';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/core/dashboard/multi-department`;

  getMultiDepartmentDashboard(department = 'all'): Observable<MultiDeptDashboardData> {
    return this.http
      .get<ApiResponse<MultiDeptDashboardData>>(`${this.baseUrl}/`, {
        params: { department },
      })
      .pipe(unwrapApi());
  }
}
