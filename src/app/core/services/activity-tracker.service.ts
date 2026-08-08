import { Injectable, OnDestroy, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';

import { AuthService } from './auth.service';
import { AuditService } from './audit.service';

/**
 * Records authenticated page visits for Super Admin activity logs.
 * Debounces identical paths so rapid redirects do not flood the API.
 */
@Injectable({ providedIn: 'root' })
export class ActivityTrackerService implements OnDestroy {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly audit = inject(AuditService);

  private sub: Subscription | null = null;
  private lastPath = '';
  private lastAt = 0;

  start(): void {
    if (this.sub) return;
    this.sub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.onNavigate(e.urlAfterRedirects || e.url));
  }

  stop(): void {
    this.sub?.unsubscribe();
    this.sub = null;
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private onNavigate(rawUrl: string): void {
    if (!this.auth.isAuthenticated()) return;
    const path = (rawUrl.split('?')[0] || '/').trim() || '/';
    if (path.startsWith('/login') || path.startsWith('/unauthorized')) return;

    const now = Date.now();
    if (path === this.lastPath && now - this.lastAt < 2500) return;
    this.lastPath = path;
    this.lastAt = now;

    const title = typeof document !== 'undefined' ? document.title : '';
    this.audit.recordPageView(path, title).subscribe({ error: () => undefined });
  }
}
