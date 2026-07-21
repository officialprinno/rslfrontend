import { SlicePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { ComplianceAlert, LogisticsDashboard } from '../../../../core/models/logistics.model';
import { LogisticsService } from '../../../../core/services/logistics.service';
import { formatCurrency, formatDateTime } from '../../../../core/utils/format.util';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import {
  ActivityFeedComponent,
  ChartCardComponent,
  DashboardInsight,
  DashboardLayoutComponent,
  DashboardSectionComponent,
  DashboardTableComponent,
  DashboardTone,
  DateRangeValue,
  InsightBannerComponent,
  KpiCardComponent,
  setupDashboardCompanyReload,
} from '../../../../shared/dashboard';
import { LogisticsNavComponent } from '../../components/logistics-nav/logistics-nav.component';

@Component({
  selector: 'app-logistics-dashboard',
  imports: [
    SlicePipe,
    RouterLink,
    LogisticsNavComponent,
    DashboardLayoutComponent,
    InsightBannerComponent,
    KpiCardComponent,
    ChartCardComponent,
    DashboardSectionComponent,
    ActivityFeedComponent,
    DashboardTableComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './logistics-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogisticsDashboardComponent implements OnInit {
  private readonly logistics = inject(LogisticsService);

  constructor() {
    setupDashboardCompanyReload(() => {
      this.data.set(null);
      this.load(false, true);
    });
  }

  readonly data = signal<LogisticsDashboard | null>(null);
  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly error = signal(false);
  readonly lastUpdated = signal<Date | null>(null);
  readonly dateRange = signal<DateRangeValue | null>(null);

  readonly formatCurrency = formatCurrency;
  readonly formatDateTime = formatDateTime;

  readonly insights = computed((): DashboardInsight[] => {
    const d = this.data();
    if (!d) return [];
    const items: DashboardInsight[] = [];

    const expired = d.compliance_alerts.filter((a) => a.severity === 'EXPIRED').length;
    const expiring = d.compliance_alerts.filter((a) => a.severity !== 'EXPIRED').length;

    if (expired > 0) {
      items.push({
        id: 'compliance-expired',
        message: `${expired} compliance item(s) expired — vehicles or drivers`,
        tone: 'danger',
        route: '/logistics/vehicles',
      });
    }
    if (expiring > 0) {
      items.push({
        id: 'compliance-soon',
        message: `${expiring} compliance item(s) expiring soon`,
        tone: 'warning',
        route: '/logistics/vehicles',
      });
    }
    if (d.pending_orders > 0) {
      items.push({
        id: 'pending-orders',
        message: `${d.pending_orders} order(s) pending dispatch`,
        tone: 'info',
        route: '/logistics/sales-queue',
      });
    }
    if (!items.length) {
      items.push({
        id: 'summary',
        message: `${d.active_deliveries} active delivery(ies) · ${d.vehicles_available} vehicle(s) available`,
        tone: 'success',
      });
    }
    return items.slice(0, 6);
  });

  readonly complianceFeedItems = computed(() => {
    const alerts = this.data()?.compliance_alerts ?? [];
    return alerts.map((alert, i) => ({
      id: `${alert.type}-${alert.name}-${i}`,
      title: `${this.alertTypeLabel(alert.type)} — ${alert.name}`,
      subtitle: `Expires ${alert.expiry_date.slice(0, 10)} · ${alert.days_remaining}d remaining`,
      tone: (alert.severity === 'EXPIRED' ? 'danger' : 'warning') as DashboardTone,
    }));
  });

  readonly activityColumns = [
    { key: 'type', label: 'Type' },
    { key: 'reference', label: 'Reference' },
    { key: 'status', label: 'Status' },
    { key: 'detail', label: 'Detail' },
    { key: 'amount', label: 'Amount', align: 'right' as const },
    { key: 'when', label: 'When' },
  ];

  readonly activityTableRows = computed(() => {
    const d = this.data();
    if (!d?.recent_activities?.length) return [];
    return d.recent_activities.map((a) => ({
      id: `${a.type}-${a.entity_id}`,
      type: this.activityLabel(a.type),
      reference: a.reference,
      status: a.status,
      detail: a.detail,
      amount: a.amount ? formatCurrency(+a.amount) : '—',
      when: formatDateTime(a.created_at),
      _type: a.type,
      _entityId: a.entity_id,
    }));
  });

  activityRowLink = (row: { _type: string; _entityId: number }): string[] =>
    this.activityRoute(row._type, row._entityId);

  ngOnInit(): void {
    /* initial load handled by setupDashboardCompanyReload */
  }

  load(silent = false, bypassCache = false): void {
    if (silent) {
      this.refreshing.set(true);
    } else {
      this.loading.set(true);
    }
    this.error.set(false);
    this.logistics
      .getLogisticsDashboard(this.dateRange(), bypassCache)
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.refreshing.set(false);
        }),
      )
      .subscribe({
        next: (d) => {
          this.data.set(d);
          this.lastUpdated.set(new Date());
        },
        error: () => this.error.set(true),
      });
  }

  onRefresh(): void {
    this.load(true, true);
  }

  onDateRangeChange(range: DateRangeValue): void {
    this.dateRange.set(range);
    this.load(true);
  }

  maxWeeklyDeliveries(): number {
    const weeks = this.data()?.weekly_deliveries ?? [];
    return Math.max(...weeks.map((w) => w.count), 1);
  }

  maxWeeklyFuel(): number {
    const weeks = this.data()?.weekly_fuel_costs ?? [];
    return Math.max(...weeks.map((w) => +w.total), 1);
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

  activityLabel(type: string): string {
    const labels: Record<string, string> = {
      DELIVERY_ORDER: 'Delivery',
      FUEL: 'Fuel Record',
    };
    return labels[type] ?? type;
  }

  activityRoute(type: string, entityId: number): string[] {
    const routes: Record<string, string[]> = {
      DELIVERY_ORDER: ['/logistics/deliveries', String(entityId), 'view'],
      FUEL: ['/logistics/fuel'],
    };
    return routes[type] ?? ['/logistics/deliveries'];
  }
}
