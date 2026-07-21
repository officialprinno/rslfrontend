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

  /** Prefer system default (TZS), then explicit TZS, then first active currency. */
  resolveDefault(currencies: Currency[]): Currency | undefined {
    if (!currencies.length) return undefined;
    return (
      currencies.find((c) => c.is_default) ??
      currencies.find((c) => c.code === 'TZS') ??
      currencies[0]
    );
  }

  defaultCurrencyId(currencies: Currency[]): number | null {
    return this.resolveDefault(currencies)?.id ?? null;
  }

  getCurrencies(): Observable<Currency[]> {
    return this.http
      .get<ApiResponse<PaginatedData<Currency>>>(`${this.baseUrl}/`, {
        params: buildHttpParams({ is_active: true, page_size: 50 }),
      })
      .pipe(
        unwrapApi(),
        map((data) => this.sortCurrencies(data.results)),
      );
  }

  publishRates(
    rates: Array<{ currency_id: number; exchange_rate: number }>,
  ): Observable<Currency[]> {
    return this.http
      .post<ApiResponse<Currency[]>>(`${this.baseUrl}/publish-rates/`, { rates })
      .pipe(unwrapApi());
  }

  private sortCurrencies(currencies: Currency[]): Currency[] {
    return [...currencies].sort((a, b) => {
      if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
      if (a.code === 'TZS') return -1;
      if (b.code === 'TZS') return 1;
      return a.code.localeCompare(b.code);
    });
  }
}
