import { DecimalPipe, SlicePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { ComplianceAlert, LogisticsDashboard } from '../../../../core/models/logistics.model';
import { LogisticsService } from '../../../../core/services/logistics.service';
import { formatCurrency, formatDateTime } from '../../../../core/utils/format.util';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { LogisticsNavComponent } from '../../components/logistics-nav/logistics-nav.component';

@Component({
  selector: 'app-logistics-dashboard',
  imports: [
    DecimalPipe,
    SlicePipe,
    RouterLink,
    PageHeaderComponent,
    LogisticsNavComponent,
    StatusBadgeComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './logistics-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogisticsDashboardComponent implements OnInit, OnDestroy {
  private readonly logistics = inject(LogisticsService);
  private refreshSub?: Subscription;

  readonly data = signal<LogisticsDashboard | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly formatCurrency = formatCurrency;
  readonly formatDateTime = formatDateTime;

  ngOnInit(): void {
    this.load();
    this.refreshSub = interval(60_000).subscribe(() => this.load(true));
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  load(silent = false): void {
    if (!silent) {
      this.loading.set(true);
      this.error.set(false);
    }
    this.logistics
      .getLogisticsDashboard()
      .pipe(finalize(() => {
        if (!silent) this.loading.set(false);
      }))
      .subscribe({
        next: (d) => this.data.set(d),
        error: () => {
          if (!silent) this.error.set(true);
        },
      });
  }

  maxWeeklyDeliveries(): number {
    const weeks = this.data()?.weekly_deliveries ?? [];
    return Math.max(...weeks.map((w) => w.count), 1);
  }

  maxWeeklyFuel(): number {
    const weeks = this.data()?.weekly_fuel_costs ?? [];
    return Math.max(...weeks.map((w) => +w.total), 1);
  }

  alertClass(alert: ComplianceAlert): string {
    return alert.severity === 'EXPIRED'
      ? 'bg-red-50 border-red-200 text-red-800'
      : 'bg-orange-50 border-orange-200 text-orange-800';
  }

  alertTypeLabel(type: ComplianceAlert['type']): string {
    const map: Record<ComplianceAlert['type'], string> = {
      INSURANCE: 'Insurance',
      LICENCE: 'Road Licence',
      SERVICE: 'Service Due',
      DRIVER_LICENCE: 'Driver Licence',
      MEDICAL: 'Medical Certificate',
    };
    return map[type] ?? type;
  }
}
