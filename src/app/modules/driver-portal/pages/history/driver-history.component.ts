import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { DriverTrip } from '../../../../core/models/driver-portal.model';
import { DriverPortalService } from '../../../../core/services/driver-portal.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDateTime } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { DriverPortalNavComponent } from '../../components/driver-portal-nav/driver-portal-nav.component';

@Component({
  selector: 'app-driver-history',
  imports: [
    RouterLink,
    PageHeaderComponent,
    DriverPortalNavComponent,
    StatusBadgeComponent,
    TableSkeletonComponent,
    EmptyStateComponent,
  ],
  templateUrl: './driver-history.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverHistoryComponent implements OnInit {
  private readonly portal = inject(DriverPortalService);
  private readonly notification = inject(NotificationService);

  readonly trips = signal<DriverTrip[]>([]);
  readonly loading = signal(true);
  readonly formatDateTime = formatDateTime;

  ngOnInit(): void {
    this.portal.getHistory().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (t) => this.trips.set(t),
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }
}
