import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { SecurityLocation, Visitor } from '../../../../../core/models/security.model';
import { SecurityService } from '../../../../../core/services/security.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../../core/utils/api.util';
import { formatDateTime } from '../../../../../core/utils/format.util';
import { exportToExcel } from '../../../../../core/utils/export.util';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../../shared/components/pagination/pagination.component';
import { TableSkeletonComponent } from '../../../../../shared/components/table-skeleton/table-skeleton.component';
import { LocationTabsComponent } from '../../../components/location-tabs/location-tabs.component';
import { SecurityNavComponent } from '../../../components/security-nav/security-nav.component';
import { VISITOR_PURPOSES, VISITOR_STATUSES, locationBadge } from '../../../constants/security.constants';
import { canOperateSecurity } from '../../../utils/security-permissions.util';
import { AuthService } from '../../../../../core/services/auth.service';

@Component({
  selector: 'app-visitors-list',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    SecurityNavComponent,
    LocationTabsComponent,
    PaginationComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './visitors-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisitorsListComponent implements OnInit {
  private readonly security = inject(SecurityService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  readonly router = inject(Router);

  readonly visitors = signal<Visitor[]>([]);
  readonly locations = signal<SecurityLocation[]>([]);
  readonly locationTabs = signal<{ id: number | null; label: string; icon: string }[]>([]);
  readonly loading = signal(true);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly search = signal('');
  readonly statusFilter = signal('');
  readonly onSite = signal(true);
  readonly selectedLocation = signal<number | null>(null);

  readonly purposes = VISITOR_PURPOSES;
  readonly formatDateTime = formatDateTime;
  readonly statusColor = (s: string) => VISITOR_STATUSES[s] ?? 'badge-gray';
  readonly locationBadge = locationBadge;
  readonly canOperate = () => canOperateSecurity(this.auth);

  ngOnInit(): void {
    this.security.getLocations().subscribe((locs) => {
      this.locations.set(locs);
      this.locationTabs.set([
        { id: null, label: 'All Locations', icon: '🌐' },
        ...locs.map((l) => ({ id: l.id, label: l.name, icon: l.icon })),
      ]);
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const params: Record<string, string | number | boolean> = {
      page: this.page(),
      page_size: 15,
      ordering: '-created_at',
    };
    if (this.search()) params['search'] = this.search();
    if (this.statusFilter()) params['status'] = this.statusFilter();
    if (this.onSite()) params['on_site'] = 'true';
    if (this.selectedLocation()) params['location'] = this.selectedLocation()!;

    this.security
      .getVisitors(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.visitors.set(d.results);
          this.total.set(d.count);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  signIn(v: Visitor): void {
    this.security.signInVisitor(v.id).subscribe({
      next: () => {
        this.notification.success('Visitor signed in');
        this.load();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  signOut(v: Visitor): void {
    this.security.signOutVisitor(v.id).subscribe({
      next: () => {
        this.notification.success('Visitor signed out');
        this.load();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  export(): void {
    exportToExcel(
      'visitors',
      [
        { key: 'visitor_number', label: 'Number' },
        { key: 'full_name', label: 'Name' },
        { key: 'company', label: 'Company' },
        { key: 'location_name', label: 'Location' },
        { key: 'status', label: 'Status' },
        { key: 'actual_time_in', label: 'Time In' },
      ],
      this.visitors(),
    );
  }
}
