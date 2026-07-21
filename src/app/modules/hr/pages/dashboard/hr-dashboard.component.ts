import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { finalize } from 'rxjs/operators';

import { HrDashboard } from '../../../../core/models/hr.model';
import { HrService } from '../../../../core/services/hr.service';
import { formatDate } from '../../../../core/utils/format.util';
import {
  ActivityFeedComponent,
  ApprovalQueueComponent,
  ChartCardComponent,
  DashboardApprovalItem,
  DashboardInsight,
  DashboardLayoutComponent,
  DashboardSectionComponent,
  DateRangeValue,
  InsightBannerComponent,
  KpiCardComponent,
  setupDashboardCompanyReload,
} from '../../../../shared/dashboard';
import { HrNavComponent } from '../../components/hr-nav/hr-nav.component';
import {
  COMPANY_DETAILS,
  employmentTypeLabel,
  PIE_COLORS,
} from '../../constants/hr.constants';

@Component({
  selector: 'app-hr-dashboard',
  imports: [
    DecimalPipe,
    HrNavComponent,
    DashboardLayoutComponent,
    InsightBannerComponent,
    KpiCardComponent,
    ChartCardComponent,
    DashboardSectionComponent,
    ApprovalQueueComponent,
    ActivityFeedComponent,
  ],
  templateUrl: './hr-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrDashboardComponent implements OnInit {
  private readonly hr = inject(HrService);

  constructor() {
    setupDashboardCompanyReload(() => {
      this.data.set(null);
      this.load(false, true);
    });
  }

  readonly data = signal<HrDashboard | null>(null);
  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly error = signal(false);
  readonly lastUpdated = signal<Date | null>(null);
  readonly dateRange = signal<DateRangeValue | null>(null);

  readonly formatDate = formatDate;
  readonly employmentTypeLabel = employmentTypeLabel;
  readonly pieColors = PIE_COLORS;
  readonly company = COMPANY_DETAILS;

  readonly dashboardSubtitle = computed(
    () => `${this.company.name} · TIN ${this.company.tin}`,
  );

  readonly insights = computed((): DashboardInsight[] => {
    const d = this.data();
    if (!d) return [];
    const items: DashboardInsight[] = [];

    if (d.pending_leave_requests > 0) {
      items.push({
        id: 'pending-leave',
        message: `${d.pending_leave_requests} leave request(s) pending approval`,
        tone: 'warning',
        route: '/hr/leave',
      });
    }
    for (const alert of d.alerts.slice(0, 3)) {
      items.push({
        id: `alert-${alert.type}-${alert.employee_id}`,
        message: `${alert.employee_name}: ${alert.message}`,
        tone: alert.severity === 'HIGH' ? 'danger' : 'warning',
        route: ['/hr/employees', String(alert.employee_id), 'view'],
      });
    }
    if (!items.length) {
      items.push({
        id: 'summary',
        message: `${d.present_today} of ${d.total_employees} employees present today · ${d.on_leave_today} on leave`,
        tone: 'success',
      });
    }
    return items.slice(0, 6);
  });

  readonly approvalQueueItems = computed((): DashboardApprovalItem[] => {
    const d = this.data();
    if (!d) return [];
    const items: DashboardApprovalItem[] = [];

    if (d.pending_leave_requests > 0) {
      items.push({
        id: 'pending-leave',
        title: 'Pending Leave Requests',
        subtitle: 'Awaiting HOD or HR approval',
        amount: String(d.pending_leave_requests),
        priority: 'high',
        route: '/hr/leave',
      });
    }
    if ((d.pending_gm_leave_requests ?? 0) > 0) {
      items.push({
        id: 'gm-leave',
        title: 'GM Leave Approvals',
        subtitle: 'Leave requests awaiting GM sign-off',
        amount: String(d.pending_gm_leave_requests),
        priority: 'high',
        route: '/hr/leave',
        queryParams: { status: 'PENDING_GM' },
      });
    }
    return items;
  });

  readonly upcomingEventItems = computed(() => {
    const events = this.data()?.upcoming_events ?? [];
    return events.map((event, i) => ({
      id: `event-${i}-${event.title}`,
      title: event.title,
      subtitle: event.type,
      timestamp: formatDate(event.date),
      tone: 'info' as const,
    }));
  });

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
    this.hr
      .getDashboard(this.dateRange(), bypassCache)
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

  maxDeptCount(): number {
    const items = this.data()?.employees_by_department ?? [];
    return Math.max(...items.map((d) => d.count), 1);
  }

  totalEmploymentTypes(): number {
    const items = this.data()?.employment_type_breakdown ?? [];
    return items.reduce((sum, item) => sum + item.count, 0) || 1;
  }

  pieGradient(): string {
    const items = this.data()?.employment_type_breakdown ?? [];
    if (!items.length) return 'conic-gradient(#e5e7eb 0deg 360deg)';
    let angle = 0;
    const total = this.totalEmploymentTypes();
    const stops = items.map((item, i) => {
      const slice = (item.count / total) * 360;
      const start = angle;
      angle += slice;
      return `${PIE_COLORS[i % PIE_COLORS.length]} ${start}deg ${angle}deg`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }

  typePercent(count: number): number {
    return (count / this.totalEmploymentTypes()) * 100;
  }
}
