import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environments';
import { ApiResponse } from '../models/auth.models';
import { PaginatedData } from '../models/paginated.model';
import { unwrapApi } from '../utils/api.util';

export interface CompanyOption {
  id: number;
  code: string;
  name: string;
  company_type: string;
  brand_color: string;
  is_active: boolean;
}

@Injectable({ providedIn: 'root' })
export class CompaniesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/core/companies`;

  listCompanies(): Observable<CompanyOption[]> {
    return this.http.get<ApiResponse<CompanyOption[] | PaginatedData<CompanyOption>>>(`${this.url}/`).pipe(
      unwrapApi(),
      map((data) => (Array.isArray(data) ? data : data.results ?? [])),
    );
  }
}
