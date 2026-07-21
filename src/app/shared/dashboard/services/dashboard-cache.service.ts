import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, finalize, of, shareReplay, tap } from 'rxjs';

const DEFAULT_TTL_MS = 60_000;

interface CacheEntry {
  data: unknown;
  expires: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardCacheService {
  private readonly store = new Map<string, CacheEntry>();
  private readonly pending = new Map<string, Observable<unknown>>();
  private companyScope = 'none';

  /** Update active company scope — invalidates cache when scope changes. */
  setCompanyScope(scope: string): void {
    const next = scope || 'none';
    if (this.companyScope !== next) {
      this.companyScope = next;
      this.invalidate();
    }
  }

  /** Build a stable cache key from URL, query params, and company scope. */
  cacheKey(url: string, params?: HttpParams | Record<string, string>): string {
    let qs = '';
    if (params instanceof HttpParams) {
      qs = params.toString();
    } else if (params && Object.keys(params).length) {
      qs = new URLSearchParams(params).toString();
    }
    const base = qs ? `${url}?${qs}` : url;
    return `co:${this.companyScope}|${base}`;
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set(key: string, data: unknown, ttlMs = DEFAULT_TTL_MS): void {
    this.store.set(key, { data, expires: Date.now() + ttlMs });
  }

  invalidate(prefix?: string): void {
    if (!prefix) {
      this.store.clear();
      return;
    }
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Return cached data or run `factory`, deduplicating concurrent requests for the same key.
   */
  getOrFetch<T>(
    key: string,
    factory: () => Observable<T>,
    options?: { bypassCache?: boolean; ttlMs?: number },
  ): Observable<T> {
    const bypass = options?.bypassCache ?? false;
    const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;

    if (!bypass) {
      const cached = this.get<T>(key);
      if (cached) {
        return of(cached);
      }
      const inflight = this.pending.get(key);
      if (inflight) {
        return inflight as Observable<T>;
      }
    }

    const request$ = factory().pipe(
      tap((data) => {
        if (!bypass) {
          this.set(key, data, ttlMs);
        }
      }),
      shareReplay(1),
      finalize(() => this.pending.delete(key)),
    );

    if (!bypass) {
      this.pending.set(key, request$);
    }
    return request$;
  }
}
