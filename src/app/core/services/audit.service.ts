import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environments';
import { ApiResponse } from '../models/auth.models';
import { AuditLogEntry, AuditLogListParams } from '../models/audit.model';
import { PaginatedData } from '../models/paginated.model';
import { buildHttpParams, unwrapApi } from '../utils/api.util';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/core/audit-logs`;

  list(params: AuditLogListParams = {}): Observable<PaginatedData<AuditLogEntry>> {
    return this.http
      .get<ApiResponse<PaginatedData<AuditLogEntry>>>(`${this.baseUrl}/`, {
        params: buildHttpParams(params as Record<string, string | number | boolean>),
      })
      .pipe(unwrapApi());
  }

  recordPageView(path: string, title = '', referrer = ''): Observable<{ recorded: boolean }> {
    return this.http
      .post<ApiResponse<{ recorded: boolean }>>(`${this.baseUrl}/page-view/`, {
        path,
        title,
        referrer,
      })
      .pipe(unwrapApi());
  }
}
