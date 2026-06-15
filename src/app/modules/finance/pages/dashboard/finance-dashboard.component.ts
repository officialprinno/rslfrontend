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

import { FinanceDashboard } from '../../../../core/models/finance.model';
import { FinanceService } from '../../../../core/services/finance.service';
import { formatDate } from '../../../../core/utils/format.util';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { FinanceNavComponent } from '../../components/finance-nav/finance-nav.component';
import {
  COMPANY_DETAILS,
  formatAccountingAmount,
  isNegativeAmount,
} from '../../constants/finance.constants';

const PIE_COLORS = ['#1B3A6B', '#2E6DB4', '#4A90D9', '#7EB3E8', '#A8D0F0', '#C5E0F7'];

@Component({
  selector: 'app-finance-dashboard',
  imports: [
    DecimalPipe,
    SlicePipe,
    RouterLink,
    PageHeaderComponent,
    FinanceNavComponent,
    StatusBadgeComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './finance-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceDashboardComponent implements OnInit, OnDestroy {
  private readonly finance = inject(FinanceService);
  private refreshSub?: Subscription;

  readonly data = signal<FinanceDashboard | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly formatAccountingAmount = formatAccountingAmount;
  readonly formatDate = formatDate;
  readonly isNegativeAmount = isNegativeAmount;
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
    this.finance
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

  maxMonthlyValue(): number {
    const months = this.data()?.monthly_chart ?? [];
    return Math.max(
      ...months.map((m) => Math.max(+m.revenue, +m.expenses)),
      1,
    );
  }

  totalRevenueBreakdown(): number {
    const items = this.data()?.revenue_breakdown ?? [];
    return items.reduce((sum, item) => sum + Number(item.amount), 0) || 1;
  }

  pieGradient(): string {
    const items = this.data()?.revenue_breakdown ?? [];
    if (!items.length) return 'conic-gradient(#e5e7eb 0deg 360deg)';
    let angle = 0;
    const total = this.totalRevenueBreakdown();
    const stops = items.map((item, i) => {
      const slice = (Number(item.amount) / total) * 360;
      const start = angle;
      angle += slice;
      return `${PIE_COLORS[i % PIE_COLORS.length]} ${start}deg ${angle}deg`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }

  breakdownPercent(amount: string): number {
    return (Number(amount) / this.totalRevenueBreakdown()) * 100;
  }

  hasAlerts(d: FinanceDashboard): boolean {
    return (
      d.overdue_receivables_count > 0 ||
      d.overdue_payables_count > 0 ||
      d.budgets_exceeded > 0 ||
      d.unreconciled_transactions > 0
    );
  }
}
