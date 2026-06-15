import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { DriverTrip } from '../../../../core/models/driver-portal.model';
import { DriverPortalService } from '../../../../core/services/driver-portal.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDateTime } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { DriverPortalNavComponent } from '../../components/driver-portal-nav/driver-portal-nav.component';

@Component({
  selector: 'app-driver-trips-list',
  imports: [
    RouterLink,
    FormsModule,
    PageHeaderComponent,
    DriverPortalNavComponent,
    StatusBadgeComponent,
    TableSkeletonComponent,
    ErrorStateComponent,
    EmptyStateComponent,
  ],
  templateUrl: './driver-trips-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverTripsListComponent implements OnInit {
  private readonly portal = inject(DriverPortalService);
  private readonly route = inject(ActivatedRoute);
  private readonly notification = inject(NotificationService);

  readonly trips = signal<DriverTrip[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly statusFilter = signal('all');
  readonly search = signal('');
  readonly formatDateTime = formatDateTime;

  ngOnInit(): void {
    const status = this.route.snapshot.queryParamMap.get('status');
    if (status) this.statusFilter.set(status);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    const status = this.statusFilter();
    this.portal
      .getDeliveries({
        status: status === 'all' ? undefined : status,
        search: this.search() || undefined,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (t) => this.trips.set(t),
        error: (e) => {
          this.error.set(true);
          this.notification.error(getApiErrorMessage(e));
        },
      });
  }
}
