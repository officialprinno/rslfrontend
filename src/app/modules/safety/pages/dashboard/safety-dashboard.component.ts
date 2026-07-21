import { DecimalPipe, SlicePipe } from '@angular/common';
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

import { SafetyAlert, SafetyDashboard } from '../../../../core/models/safety.model';
import { SafetyService } from '../../../../core/services/safety.service';
import { formatDateTime } from '../../../../core/utils/format.util';
import {
  ChartCardComponent,
  ChartCardDeferredComponent,
  DashboardInsight,
  DashboardLayoutComponent,
  DashboardSectionComponent,
  DateRangeValue,
  InsightBannerComponent,
  KpiCardComponent,
  setupDashboardCompanyReload,
} from '../../../../shared/dashboard';
import { SafetyNavComponent } from '../../components/safety-nav/safety-nav.component';
import {
  ALERT_COLORS,
  INCIDENT_STATUS_COLORS,
  INCIDENT_TYPE_COLORS,
  INSPECTION_TYPES,
  SEVERITY_COLORS,
  incidentTypeLabel,
} from '../../constants/safety.constants';

@Component({
  selector: 'app-safety-dashboard',
  imports: [
    DecimalPipe,
    SlicePipe,
    RouterLink,
    SafetyNavComponent,
    DashboardLayoutComponent,
    InsightBannerComponent,
    KpiCardComponent,
    ChartCardDeferredComponent,
    ChartCardComponent,
    DashboardSectionComponent,
  ],
  templateUrl: './safety-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SafetyDashboardComponent implements OnInit {
  private readonly safety = inject(SafetyService);

  constructor() {
    setupDashboardCompanyReload(() => {
      this.data.set(null);
      this.load(false, true);
    });
  }

  readonly data = signal<SafetyDashboard | null>(null);
  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly error = signal(false);
  readonly lastUpdated = signal<Date | null>(null);
  readonly dateRange = signal<DateRangeValue | null>(null);

  readonly formatDateTime = formatDateTime;
  readonly incidentTypeLabel = incidentTypeLabel;
  readonly alertColors = ALERT_COLORS;
  readonly typeColor = (t: string) => INCIDENT_TYPE_COLORS[t] ?? 'badge-gray';
  readonly severityColor = (s: string) =>
    SEVERITY_COLORS[s as keyof typeof SEVERITY_COLORS] ?? 'badge-gray';
  readonly statusColor = (s: string) => INCIDENT_STATUS_COLORS[s] ?? 'badge-gray';

  readonly insights = computed((): DashboardInsight[] => {
    const d = this.data();
    if (!d) return [];
    const items: DashboardInsight[] = [];

    for (const alert of this.criticalAlerts(d)) {
      items.push({
        id: `critical-${alert.reference_id}`,
        message: alert.message,
        tone: 'danger',
        route: this.alertRoute(alert),
      });
    }
    if (d.open_incidents > 0) {
      items.push({
        id: 'open-incidents',
        message: `${d.open_incidents} open incident(s) in selected period`,
        tone: 'warning',
        route: '/safety/incidents',
      });
    }
    if (d.ppe_low_stock > 0) {
      items.push({
        id: 'ppe-low',
        message: `${d.ppe_low_stock} PPE item(s) below reorder level`,
        tone: 'warning',
        route: '/safety/ppe',
      });
    }
    if (!items.length) {
      items.push({
        id: 'safety-score',
        message: `Safety score ${d.safety_score}/100 · ${d.days_without_incident} days without incident`,
        tone: d.safety_score >= 80 ? 'success' : 'info',
      });
    }
    return items.slice(0, 6);
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
    this.safety
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

  maxChartValue(): number {
    const months = this.data()?.incidents_chart ?? [];
    return Math.max(...months.map((m) => Math.max(m.accidents, m.near_miss)), 1);
  }

  safetyGaugeGradient(score: number): string {
    const clamped = Math.min(100, Math.max(0, score));
    const angle = (clamped / 100) * 360;
    const color = clamped >= 80 ? '#10b981' : clamped >= 60 ? '#f59e0b' : '#ef4444';
    return `conic-gradient(${color} 0deg ${angle}deg, #e5e7eb ${angle}deg 360deg)`;
  }

  inspectionTypeLabel(type: string): string {
    return INSPECTION_TYPES.find((t) => t.value === type)?.label ?? type.replace(/_/g, ' ');
  }

  hasCriticalAlerts(d: SafetyDashboard): boolean {
    return d.alerts.some((a) => a.type === 'OPEN_CRITICAL');
  }

  criticalAlerts(d: SafetyDashboard): SafetyAlert[] {
    return d.alerts.filter((a) => a.type === 'OPEN_CRITICAL');
  }

  alertRoute(alert: SafetyAlert): string[] {
    switch (alert.type) {
      case 'EXPIRED_PERMIT':
        return ['/safety/permits', String(alert.reference_id), 'view'];
      case 'OVERDUE_INSPECTION':
        return ['/safety/inspections'];
      case 'OPEN_CRITICAL':
        return ['/safety/incidents', String(alert.reference_id), 'view'];
      case 'PPE_LOW':
        return ['/safety/ppe'];
      case 'TRAINING_DUE':
        return ['/safety/training'];
      default:
        return ['/safety/dashboard'];
    }
  }
}
