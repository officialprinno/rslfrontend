import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { SecurityDashboard, SecurityLocation } from '../../../../../core/models/security.model';
import { SecurityService } from '../../../../../core/services/security.service';
import { formatDateTime } from '../../../../../core/utils/format.util';
import { ErrorStateComponent } from '../../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../../shared/components/page-header/page-header.component';
import { TableSkeletonComponent } from '../../../../../shared/components/table-skeleton/table-skeleton.component';
import { LocationTabsComponent } from '../../../components/location-tabs/location-tabs.component';
import { SecurityNavComponent } from '../../../components/security-nav/security-nav.component';

@Component({
  selector: 'app-security-dashboard',
  imports: [
    PageHeaderComponent,
    SecurityNavComponent,
    LocationTabsComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './security-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecurityDashboardComponent implements OnInit, OnDestroy {
  private readonly security = inject(SecurityService);
  private refreshSub?: Subscription;

  readonly data = signal<SecurityDashboard | null>(null);
  readonly locations = signal<SecurityLocation[]>([]);
  readonly locationTabs = signal<{ id: number | null; label: string; icon: string }[]>([
    { id: null, label: 'All Locations', icon: '🌐' },
  ]);
  readonly selectedLocation = signal<number | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly formatDateTime = formatDateTime;

  ngOnInit(): void {
    this.security.getLocations().subscribe((locs) => {
      this.locations.set(locs);
      this.locationTabs.set([
        { id: null, label: 'All Locations', icon: '🌐' },
        ...locs.map((l) => ({ id: l.id, label: l.name, icon: l.icon })),
      ]);
    });
    this.load();
    this.refreshSub = interval(60000).subscribe(() => this.load(false));
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  onLocationChange(id: number | null): void {
    this.selectedLocation.set(id);
    this.load();
  }

  load(showLoading = true): void {
    if (showLoading) this.loading.set(true);
    this.security
      .getSecurityDashboard(this.selectedLocation() ?? undefined)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.data.set(d);
          this.error.set(false);
        },
        error: () => this.error.set(true),
      });
  }
}
