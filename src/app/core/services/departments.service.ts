import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environments';
import { ApiResponse } from '../models/auth.models';
import { PaginatedData } from '../models/paginated.model';
import { Department } from '../models/procurement.model';
import { buildHttpParams, unwrapApi } from '../utils/api.util';

@Injectable({ providedIn: 'root' })
export class DepartmentsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/auth/departments`;

  getDepartments(): Observable<Department[]> {
    return this.http
      .get<ApiResponse<PaginatedData<Department>>>(`${this.baseUrl}/`, {
        params: buildHttpParams({ is_active: true, page_size: 100 }),
      })
      .pipe(
        unwrapApi(),
        map((data) => data.results),
      );
  }
}
