import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { finalize } from 'rxjs/operators';

import { DriverProfile } from '../../../../core/models/driver-portal.model';
import { DriverPortalService } from '../../../../core/services/driver-portal.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDate } from '../../../../core/utils/format.util';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { DriverPortalNavComponent } from '../../components/driver-portal-nav/driver-portal-nav.component';

@Component({
  selector: 'app-driver-profile',
  imports: [
    PageHeaderComponent,
    DriverPortalNavComponent,
    StatusBadgeComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './driver-profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverProfileComponent implements OnInit {
  private readonly portal = inject(DriverPortalService);
  private readonly notification = inject(NotificationService);

  readonly profile = signal<DriverProfile | null>(null);
  readonly loading = signal(true);
  readonly formatDate = formatDate;

  ngOnInit(): void {
    this.portal
      .getProfile()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (p) => this.profile.set(p),
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }
}
