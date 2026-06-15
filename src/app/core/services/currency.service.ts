import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environments';
import { ApiResponse } from '../models/auth.models';
import { Currency } from '../models/inventory.model';
import { PaginatedData } from '../models/paginated.model';
import { buildHttpParams, unwrapApi } from '../utils/api.util';

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/core/currencies`;

  getCurrencies(): Observable<Currency[]> {
    return this.http
      .get<ApiResponse<PaginatedData<Currency>>>(`${this.baseUrl}/`, {
        params: buildHttpParams({ is_active: true, page_size: 50 }),
      })
      .pipe(
        unwrapApi(),
        map((data) => data.results),
      );
  }
}
