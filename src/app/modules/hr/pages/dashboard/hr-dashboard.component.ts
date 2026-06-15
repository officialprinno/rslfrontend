import { DecimalPipe } from '@angular/common';
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

import { HrDashboard } from '../../../../core/models/hr.model';
import { HrService } from '../../../../core/services/hr.service';
import { formatDate } from '../../../../core/utils/format.util';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { HrNavComponent } from '../../components/hr-nav/hr-nav.component';
import {
  ALERT_SEVERITY_COLORS,
  COMPANY_DETAILS,
  employmentTypeLabel,
  formatHrAmount,
  PIE_COLORS,
} from '../../constants/hr.constants';

@Component({
  selector: 'app-hr-dashboard',
  imports: [
    DecimalPipe,
    RouterLink,
    PageHeaderComponent,
    HrNavComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './hr-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrDashboardComponent implements OnInit, OnDestroy {
  private readonly hr = inject(HrService);
  private refreshSub?: Subscription;

  readonly data = signal<HrDashboard | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly formatHrAmount = formatHrAmount;
  readonly formatDate = formatDate;
  readonly employmentTypeLabel = employmentTypeLabel;
  readonly alertSeverityColors = ALERT_SEVERITY_COLORS;
  readonly pieColors = PIE_COLORS;
  readonly company = COMPANY_DETAILS;

  ngOnInit(): void {
    this.load();
    this.refreshSub = interval(300_000).subscribe(() => this.load(true));
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  load(silent = false): void {
    if (!silent) {
      this.loading.set(true);
      this.error.set(false);
    }
    this.hr
      .getDashboard()
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

  hasAlerts(d: HrDashboard): boolean {
    return d.alerts.length > 0 || d.pending_leave_requests > 0;
  }
}
