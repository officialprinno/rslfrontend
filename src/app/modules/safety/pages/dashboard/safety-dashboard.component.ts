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

import { SafetyAlert, SafetyDashboard } from '../../../../core/models/safety.model';
import { SafetyService } from '../../../../core/services/safety.service';
import { formatDateTime } from '../../../../core/utils/format.util';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
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
    PageHeaderComponent,
    SafetyNavComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './safety-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SafetyDashboardComponent implements OnInit, OnDestroy {
  private readonly safety = inject(SafetyService);
  private refreshSub?: Subscription;

  readonly data = signal<SafetyDashboard | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly formatDateTime = formatDateTime;
  readonly incidentTypeLabel = incidentTypeLabel;
  readonly alertColors = ALERT_COLORS;
  readonly typeColor = (t: string) => INCIDENT_TYPE_COLORS[t] ?? 'badge-gray';
  readonly severityColor = (s: string) =>
    SEVERITY_COLORS[s as keyof typeof SEVERITY_COLORS] ?? 'badge-gray';
  readonly statusColor = (s: string) => INCIDENT_STATUS_COLORS[s] ?? 'badge-gray';

  ngOnInit(): void {
    this.load();
    this.refreshSub = interval(120_000).subscribe(() => this.load(true));
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  load(silent = false): void {
    if (!silent) {
      this.loading.set(true);
      this.error.set(false);
    }
    this.safety
      .getDashboard()
      .pipe(
        finalize(() => {
          if (!silent) this.loading.set(false);
        }),
      )
      .subscribe({
        next: (d) => this.data.set(d),
        error: () => {
          if (!silent) this.error.set(true);
        },
      });
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
