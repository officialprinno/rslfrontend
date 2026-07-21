import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { DriverInternalRoute } from '../../../../core/models/internal-route.model';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { DriverPortalService } from '../../../../core/services/driver-portal.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDate, formatDateTime } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { DriverPortalNavComponent } from '../../components/driver-portal-nav/driver-portal-nav.component';

@Component({
  selector: 'app-driver-internal-routes',
  imports: [
    FormsModule,
    PageHeaderComponent,
    DriverPortalNavComponent,
    StatusBadgeComponent,
    TableSkeletonComponent,
    ErrorStateComponent,
    EmptyStateComponent,
  ],
  templateUrl: './driver-internal-routes.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverInternalRoutesComponent implements OnInit {
  private readonly portal = inject(DriverPortalService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly routes = signal<DriverInternalRoute[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly actionId = signal<number | null>(null);
  readonly showCompleted = signal(false);

  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;

  readonly activeRoute = computed(() =>
    this.routes().find((r) => r.status === 'IN_PROGRESS') ?? null,
  );

  readonly plannedRoutes = computed(() =>
    this.routes().filter((r) => r.status === 'PLANNED'),
  );

  readonly completedRoutes = computed(() =>
    this.routes().filter((r) => r.status === 'COMPLETED' || r.status === 'CANCELLED'),
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.portal
      .getInternalRoutes()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (routes) => this.routes.set(routes),
        error: (e) => {
          this.error.set(true);
          this.notification.error(getApiErrorMessage(e));
        },
      });
  }

  originDisplay(route: DriverInternalRoute): string {
    return route.origin_name || route.origin_label || '—';
  }

  destinationDisplay(route: DriverInternalRoute): string {
    return route.destination_name || route.destination_label || '—';
  }

  startRoute(route: DriverInternalRoute): void {
    if (!route.can_start) return;
    this.confirm
      .open({
        title: 'Start Route',
        message: `Start route ${route.route_number}?`,
        confirmLabel: 'Start',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.actionId.set(route.id);
        this.portal.startInternalRoute(route.id).subscribe({
          next: () => {
            this.notification.success('Route started');
            this.actionId.set(null);
            this.load();
          },
          error: (e) => {
            this.actionId.set(null);
            this.notification.error(getApiErrorMessage(e));
          },
        });
      });
  }

  completeRoute(route: DriverInternalRoute): void {
    if (!route.can_complete) return;
    this.confirm
      .open({
        title: 'Complete Route',
        message: `Mark route ${route.route_number} as completed?`,
        confirmLabel: 'Complete',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.actionId.set(route.id);
        this.portal.completeInternalRoute(route.id).subscribe({
          next: () => {
            this.notification.success('Route completed');
            this.actionId.set(null);
            this.load();
          },
          error: (e) => {
            this.actionId.set(null);
            this.notification.error(getApiErrorMessage(e));
          },
        });
      });
  }
}
