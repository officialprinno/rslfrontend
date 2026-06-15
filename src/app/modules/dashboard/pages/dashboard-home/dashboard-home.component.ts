import { ChangeDetectionStrategy, Component, effect, inject, OnInit, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { DashboardService } from '../../../../core/services/dashboard.service';
import { DepartmentContextService } from '../../../../core/services/department-context.service';
import { SalesService } from '../../../../core/services/sales.service';
import { MultiDeptDashboardData } from '../../../../core/models/auth.models';
import { SalesDashboardData } from '../../../../core/models/sales.model';
import { formatCurrency } from '../../../../core/utils/format.util';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import {
  DASHBOARD_STATS,
  QUICK_ACTIONS,
  RECENT_ACTIVITY,
} from '../../data/dashboard.data';
import { QuickAction, StatCard } from '../../models/dashboard.models';

@Component({
  selector: 'app-dashboard-home',
  imports: [SlicePipe, RouterLink, StatusBadgeComponent],
  templateUrl: './dashboard-home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardHomeComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly sales = inject(SalesService);
  private readonly dashboard = inject(DashboardService);
  private readonly deptContext = inject(DepartmentContextService);

  readonly stats = DASHBOARD_STATS;
  readonly quickActions = QUICK_ACTIONS;
  readonly recentActivity = RECENT_ACTIVITY;
  readonly salesData = signal<SalesDashboardData | null>(null);
  readonly multiDeptData = signal<MultiDeptDashboardData | null>(null);
  readonly multiDeptLoading = signal(false);
  readonly formatCurrency = formatCurrency;

  readonly showMultiDept = () =>
    this.auth.isMultiDepartment() ||
    (['procurement', 'sales', 'logistics'].filter((m) => this.auth.hasModuleAccess(m)).length >= 2);

  constructor() {
    effect(() => {
      const filter = this.deptContext.activeDepartment();
      if (this.showMultiDept()) {
        this.loadMultiDept(filter);
      }
    });
  }

  ngOnInit(): void {
    if (this.auth.hasModuleAccess('sales') && !this.showMultiDept()) {
      this.sales.getDashboard().subscribe({
        next: (data) => this.salesData.set(data),
        error: () => this.salesData.set(null),
      });
    }
    if (this.showMultiDept()) {
      this.loadMultiDept(this.deptContext.activeDepartment());
    }
  }

  greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  userName(): string {
    return this.auth.getCurrentUser()?.first_name ?? 'User';
  }

  todayDate(): string {
    return new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  maxWeeklyTotal(): number {
    const weeks = this.salesData()?.weekly_sales ?? [];
    return Math.max(...weeks.map((w) => +w.total), 1);
  }

  statIcon(card: StatCard): string {
    const icons: Record<StatCard['icon'], string> = {
      sales:
        'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      orders:
        'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      stock:
        'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      deliveries:
        'M8 17h8M8 17v-4m8 4v-4m-8 0h8M3 9h18l-2 8H5L3 9zm2-4h14l1 4H4l1-4z',
    };
    return icons[card.icon];
  }

  actionIcon(action: QuickAction): string {
    const icons: Record<QuickAction['icon'], string> = {
      quotation:
        'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      purchase:
        'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
      workorder:
        'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
      reports:
        'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    };
    return icons[action.icon];
  }

  modulePillClass(module: string): string {
    const map: Record<string, string> = {
      Sales: 'bg-blue-50 text-blue-700',
      Procurement: 'bg-indigo-50 text-indigo-700',
      Production: 'bg-amber-50 text-amber-700',
      Inventory: 'bg-emerald-50 text-emerald-700',
      Logistics: 'bg-purple-50 text-purple-700',
      Finance: 'bg-slate-50 text-slate-700',
      HR: 'bg-rose-50 text-rose-700',
    };
    return map[module] ?? 'bg-gray-100 text-gray-700';
  }

  private loadMultiDept(filter: string): void {
    this.multiDeptLoading.set(true);
    this.dashboard.getMultiDepartmentDashboard(filter).subscribe({
      next: (data) => {
        this.multiDeptData.set(data);
        this.multiDeptLoading.set(false);
      },
      error: () => {
        this.multiDeptData.set(null);
        this.multiDeptLoading.set(false);
      },
    });
  }
}
