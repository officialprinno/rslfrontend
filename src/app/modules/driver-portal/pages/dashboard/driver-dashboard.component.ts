import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { DriverDashboard, DriverProfile } from '../../../../core/models/driver-portal.model';
import { DriverPortalService } from '../../../../core/services/driver-portal.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { DriverPortalNavComponent } from '../../components/driver-portal-nav/driver-portal-nav.component';
import { AVAILABILITY_LABELS } from '../../constants/driver-portal.constants';

@Component({
  selector: 'app-driver-dashboard',
  imports: [
    RouterLink,
    PageHeaderComponent,
    DriverPortalNavComponent,
    StatusBadgeComponent,
    TableSkeletonComponent,
    ErrorStateComponent,
    DecimalPipe,
  ],
  templateUrl: './driver-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverDashboardComponent implements OnInit {
  private readonly portal = inject(DriverPortalService);
  private readonly notification = inject(NotificationService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly dashboard = signal<DriverDashboard | null>(null);
  readonly profile = signal<DriverProfile | null>(null);
  readonly availLabels = AVAILABILITY_LABELS;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.portal
      .getDashboard()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => this.dashboard.set(d),
        error: (e) => {
          this.error.set(true);
          this.notification.error(getApiErrorMessage(e));
        },
      });
    this.portal.getProfile().subscribe({
      next: (p) => this.profile.set(p),
    });
  }
}
