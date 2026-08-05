import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { finalize } from 'rxjs/operators';

import { DeptApprovalsData } from '../../../../core/models/dept-approvals.models';
import { SalesDashboardData } from '../../../../core/models/sales.model';
import { DashboardService } from '../../../../core/services/dashboard.service';
import { SalesService } from '../../../../core/services/sales.service';
import { formatCurrency, formatDateTime } from '../../../../core/utils/format.util';
import {
  DashboardInsight,
  DashboardLayoutComponent,
  DashboardSectionComponent,
  DashboardTableComponent,
  DateRangeValue,
  DeptActionCenterComponent,
  InsightBannerComponent,
  KpiCardComponent,
  setupDashboardCompanyReload,
} from '../../../../shared/dashboard';
import { SalesNavComponent } from '../../components/sales-nav/sales-nav.component';

@Component({
  selector: 'app-sales-dashboard',
  imports: [
    SalesNavComponent,
    DashboardLayoutComponent,
    InsightBannerComponent,
    KpiCardComponent,
    DashboardSectionComponent,
    DashboardTableComponent,
    DeptActionCenterComponent,
  ],
  templateUrl: './sales-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesDashboardComponent implements OnInit {
  private readonly sales = inject(SalesService);
  private readonly dashboardApi = inject(DashboardService);

  constructor() {
    setupDashboardCompanyReload(() => {
      this.data.set(null);
      this.load(false, true);
      this.loadActionCenter(true);
    });
  }

  readonly data = signal<SalesDashboardData | null>(null);
  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly error = signal(false);
  readonly lastUpdated = signal<Date | null>(null);
  readonly dateRange = signal<DateRangeValue | null>(null);
  readonly actionCenter = signal<DeptApprovalsData | null>(null);
  readonly actionCenterLoading = signal(false);
  readonly actionCenterRefreshing = signal(false);

  readonly formatCurrency = formatCurrency;
  readonly formatDateTime = formatDateTime;

  readonly activityColumns = [
    { key: 'type', label: 'Type' },
    { key: 'reference', label: 'Reference' },
    { key: 'status', label: 'Status' },
    { key: 'detail', label: 'Customer' },
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
      amount: a.amount ? formatCurrency(a.amount, 'TZS') : '—',
      when: formatDateTime(a.created_at),
      _type: a.type,
      _entityId: a.entity_id,
    }));
  });

  activityRowLink = (row: { _type: string; _entityId: number }): string[] =>
    this.activityRoute(row._type, row._entityId);

  readonly insights = computed((): DashboardInsight[] => {
    const d = this.data();
    if (!d) return [];
    const items: DashboardInsight[] = [];

    if (d.overdue_invoices_count > 0) {
      items.push({
        id: 'overdue-invoices',
        message: `${d.overdue_invoices_count} overdue invoice(s) need collection`,
        tone: 'danger',
        route: '/sales/invoices',
      });
    }
    if ((d.pending_so_approvals ?? 0) > 0) {
      items.push({
        id: 'pending-so',
        message: `${d.pending_so_approvals} sales order(s) awaiting approval`,
        tone: 'warning',
        route: '/sales/orders',
      });
    }
    if ((d.awaiting_payment_count ?? 0) > 0) {
      items.push({
        id: 'awaiting-payment',
        message: `${d.awaiting_payment_count} order(s) awaiting payment`,
        tone: 'info',
        route: '/sales/orders',
        queryParams: { status: 'AWAITING_PAYMENT' },
      });
    }
    if (!items.length) {
      items.push({
        id: 'summary',
        message: `Monthly revenue ${formatCurrency(d.monthly_revenue ?? '0', 'TZS')} · ${d.quotation_conversion_rate}% quotation conversion`,
        tone: 'success',
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
    this.sales
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

  loadActionCenter(bypassCache = false): void {
    const hasData = !!this.actionCenter();
    this.actionCenterLoading.set(!hasData);
    this.actionCenterRefreshing.set(hasData);
    this.dashboardApi.getDeptApprovals('sales', bypassCache).subscribe({
      next: (data) => {
        this.actionCenter.set(data?.allowed ? data : null);
        this.actionCenterLoading.set(false);
        this.actionCenterRefreshing.set(false);
      },
      error: () => {
        this.actionCenter.set(null);
        this.actionCenterLoading.set(false);
        this.actionCenterRefreshing.set(false);
      },
    });
  }

  onRefresh(): void {
    this.load(true, true);
    this.loadActionCenter(true);
  }

  onDateRangeChange(range: DateRangeValue): void {
    this.dateRange.set(range);
    this.load(true);
  }

  activityLabel(type: string): string {
    const labels: Record<string, string> = {
      SALES_ORDER: 'Sales Order',
      QUOTATION: 'Quotation',
      INVOICE: 'Invoice',
    };
    return labels[type] ?? type;
  }

  activityRoute(type: string, entityId: number): string[] {
    const routes: Record<string, string[]> = {
      SALES_ORDER: ['/sales/orders', String(entityId), 'view'],
      QUOTATION: ['/sales/quotations', String(entityId), 'view'],
      INVOICE: ['/sales/invoices', String(entityId), 'view'],
    };
    return routes[type] ?? ['/sales/orders'];
  }
}
