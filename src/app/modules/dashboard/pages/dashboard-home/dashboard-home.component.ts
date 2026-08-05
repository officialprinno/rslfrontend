import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ROLES } from '../../../../core/constants/roles.constants';
import { AuthService } from '../../../../core/services/auth.service';
import { CompanyContextService } from '../../../../core/services/company-context.service';
import { DashboardService } from '../../../../core/services/dashboard.service';
import { DepartmentContextService } from '../../../../core/services/department-context.service';
import { SalesService } from '../../../../core/services/sales.service';
import { MultiDeptDashboardData } from '../../../../core/models/auth.models';
import { GmApprovalsData } from '../../../../core/models/gm-approvals.models';
import { SalesDashboardData } from '../../../../core/models/sales.model';
import { formatCurrency } from '../../../../core/utils/format.util';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import {
  ChartCardComponent,
  DashboardInsight,
  DashboardLayoutComponent,
  DashboardSectionComponent,
  InsightBannerComponent,
  KpiCardComponent,
  setupDashboardCompanyReload,
} from '../../../../shared/dashboard';
import { GmActionCenterComponent } from '../../components/gm-action-center/gm-action-center.component';
import {
  DASHBOARD_STATS,
  QUICK_ACTIONS,
  RECENT_ACTIVITY,
} from '../../data/dashboard.data';
import { QuickAction, StatCard } from '../../models/dashboard.models';

@Component({
  selector: 'app-dashboard-home',
  imports: [
    SlicePipe,
    RouterLink,
    StatusBadgeComponent,
    DashboardLayoutComponent,
    InsightBannerComponent,
    KpiCardComponent,
    ChartCardComponent,
    DashboardSectionComponent,
    GmActionCenterComponent,
  ],
  templateUrl: './dashboard-home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardHomeComponent {
  private readonly auth = inject(AuthService);
  private readonly sales = inject(SalesService);
  private readonly dashboard = inject(DashboardService);
  readonly deptContext = inject(DepartmentContextService);
  readonly companyContext = inject(CompanyContextService);

  constructor() {
    effect(() => {
      const filter = this.deptContext.activeDepartment();
      if (this.showMultiDept()) {
        this.loadMultiDept(filter);
      }
    });

    effect(() => {
      // Reload GM queue when company workspace changes.
      this.companyContext.activeCompany();
      if (this.showGmActionCenter()) {
        this.loadGmApprovals(true);
      }
    });

    setupDashboardCompanyReload(() => {
      this.multiDeptData.set(null);
      this.salesData.set(null);
      if (this.showMultiDept()) {
        this.loadMultiDept(this.deptContext.activeDepartment(), true);
      } else if (this.auth.hasModuleAccess('sales')) {
        this.sales.getDashboard(undefined, true).subscribe({
          next: (data) => this.salesData.set(data),
          error: () => this.salesData.set(null),
        });
      }
    });
  }

  readonly stats = DASHBOARD_STATS;
  readonly quickActions = QUICK_ACTIONS;
  readonly recentActivity = RECENT_ACTIVITY;
  readonly salesData = signal<SalesDashboardData | null>(null);
  readonly multiDeptData = signal<MultiDeptDashboardData | null>(null);
  readonly multiDeptLoading = signal(false);
  readonly gmApprovals = signal<GmApprovalsData | null>(null);
  readonly gmApprovalsLoading = signal(false);
  readonly gmApprovalsRefreshing = signal(false);
  readonly refreshing = signal(false);
  readonly lastUpdated = signal<Date | null>(null);
  readonly formatCurrency = formatCurrency;

  /** Action Center is for General Manager only (not Super Admin support view clutter). */
  readonly showGmActionCenter = () => this.auth.hasRole(ROLES.GENERAL_MANAGER);

  readonly showMultiDept = () =>
    this.auth.isMultiDepartment() ||
    (['procurement', 'sales', 'logistics'].filter((m) => this.auth.hasModuleAccess(m)).length >= 2);

  readonly dashboardTitle = computed(() => `${this.greeting()}, ${this.userName()}`);

  readonly dashboardSubtitle = computed(() =>
    this.showMultiDept()
      ? 'Unified operations overview across procurement, sales, logistics, and inventory'
      : "Operations overview for Rock Solutions Limited — sales, inventory, and deliveries at a glance",
  );

  readonly salesInsights = computed((): DashboardInsight[] => {
    const sd = this.salesData();
    if (!sd || this.showMultiDept()) return [];
    const items: DashboardInsight[] = [];
    if (sd.overdue_invoices_count > 0) {
      items.push({
        id: 'overdue',
        message: `${sd.overdue_invoices_count} overdue invoice(s)`,
        tone: 'danger',
        route: '/sales/invoices',
      });
    }
    if (sd.pending_so_approvals > 0) {
      items.push({
        id: 'pending-so',
        message: `${sd.pending_so_approvals} sales order(s) awaiting approval`,
        tone: 'warning',
        route: '/sales/orders',
      });
    }
    if (!items.length) {
      items.push({
        id: 'conversion',
        message: `Quotation conversion ${sd.quotation_conversion_rate}% this month`,
        tone: 'success',
      });
    }
    return items;
  });

  readonly hasFinanceAccess = () => this.auth.hasModuleAccess('finance');

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

  statKpiIcon(card: StatCard): 'revenue' | 'document' | 'inventory' | 'delivery' {
    const map: Record<StatCard['icon'], 'revenue' | 'document' | 'inventory' | 'delivery'> = {
      sales: 'revenue',
      orders: 'document',
      stock: 'inventory',
      deliveries: 'delivery',
    };
    return map[card.icon];
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

  onRefresh(): void {
    if (this.showMultiDept()) {
      this.loadMultiDept(this.deptContext.activeDepartment(), true);
    } else if (this.auth.hasModuleAccess('sales')) {
      this.salesData.set(null);
      this.sales.getDashboard(undefined, true).subscribe({
        next: (data) => this.salesData.set(data),
        error: () => this.salesData.set(null),
      });
    }
    if (this.showGmActionCenter()) {
      this.loadGmApprovals(true);
    }
  }

  loadMultiDept(filter: string, bypassCache = false): void {
    this.multiDeptLoading.set(true);
    this.refreshing.set(true);
    this.dashboard.getMultiDepartmentDashboard(filter, undefined, bypassCache).subscribe({
      next: (data) => {
        this.multiDeptData.set(data);
        this.multiDeptLoading.set(false);
        this.refreshing.set(false);
        this.lastUpdated.set(new Date());
      },
      error: () => {
        this.multiDeptData.set(null);
        this.multiDeptLoading.set(false);
        this.refreshing.set(false);
      },
    });
  }

  loadGmApprovals(bypassCache = false): void {
    if (!this.showGmActionCenter()) {
      this.gmApprovals.set(null);
      return;
    }
    const hasData = !!this.gmApprovals();
    this.gmApprovalsLoading.set(!hasData);
    this.gmApprovalsRefreshing.set(hasData);
    this.dashboard.getGmApprovals(bypassCache).subscribe({
      next: (data) => {
        this.gmApprovals.set(data?.allowed ? data : null);
        this.gmApprovalsLoading.set(false);
        this.gmApprovalsRefreshing.set(false);
      },
      error: () => {
        this.gmApprovals.set(null);
        this.gmApprovalsLoading.set(false);
        this.gmApprovalsRefreshing.set(false);
      },
    });
  }
}
