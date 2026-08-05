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

import { DeptApprovalsData } from '../../../../core/models/dept-approvals.models';
import { FinanceDashboard } from '../../../../core/models/finance.model';
import { GovernanceDashboardData } from '../../../../core/models/procurement.model';
import { DashboardService } from '../../../../core/services/dashboard.service';
import { FinanceService } from '../../../../core/services/finance.service';
import { ProcurementService } from '../../../../core/services/procurement.service';
import { formatDate } from '../../../../core/utils/format.util';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import {
  ActivityFeedComponent,
  ApprovalQueueComponent,
  ChartCardComponent,
  DashboardApprovalItem,
  DashboardInsight,
  DashboardLayoutComponent,
  DashboardSectionComponent,
  DateRangeValue,
  DeptActionCenterComponent,
  InsightBannerComponent,
  KpiCardComponent,
  setupDashboardCompanyReload,
} from '../../../../shared/dashboard';
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
    FinanceNavComponent,
    DashboardLayoutComponent,
    InsightBannerComponent,
    KpiCardComponent,
    ChartCardComponent,
    DashboardSectionComponent,
    ApprovalQueueComponent,
    ActivityFeedComponent,
    StatusBadgeComponent,
    DeptActionCenterComponent,
  ],
  templateUrl: './finance-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceDashboardComponent implements OnInit {
  private readonly finance = inject(FinanceService);
  private readonly procurement = inject(ProcurementService);
  private readonly dashboardApi = inject(DashboardService);

  constructor() {
    setupDashboardCompanyReload(() => {
      this.data.set(null);
      this.governance.set(null);
      this.load(false, true);
      this.loadGovernance();
      this.loadActionCenter(true);
    });
  }

  readonly data = signal<FinanceDashboard | null>(null);
  readonly governance = signal<GovernanceDashboardData | null>(null);
  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly error = signal(false);
  readonly lastUpdated = signal<Date | null>(null);
  readonly dateRange = signal<DateRangeValue | null>(null);
  readonly actionCenter = signal<DeptApprovalsData | null>(null);
  readonly actionCenterLoading = signal(false);
  readonly actionCenterRefreshing = signal(false);

  readonly formatAccountingAmount = formatAccountingAmount;
  readonly formatDate = formatDate;
  readonly isNegativeAmount = isNegativeAmount;
  readonly pieColors = PIE_COLORS;
  readonly company = COMPANY_DETAILS;

  readonly dashboardSubtitle = computed(
    () => `${this.company.name} · TIN ${this.company.tin}`,
  );

  readonly insights = computed((): DashboardInsight[] => {
    const d = this.data();
    if (!d) return [];
    const g = this.governance();
    const items: DashboardInsight[] = [];

    if (d.overdue_receivables_count > 0) {
      items.push({
        id: 'overdue-ar',
        message: `${d.overdue_receivables_count} overdue receivable(s) — ${formatAccountingAmount(d.overdue_receivables_amount)} outstanding`,
        tone: 'danger',
        route: '/finance/receivables',
      });
    }
    if (d.overdue_payables_count > 0) {
      items.push({
        id: 'overdue-ap',
        message: `${d.overdue_payables_count} overdue payable(s) — ${formatAccountingAmount(d.overdue_payables_amount)} due`,
        tone: 'warning',
        route: '/finance/payables',
      });
    }
    if (d.budgets_exceeded > 0) {
      items.push({
        id: 'budgets',
        message: `${d.budgets_exceeded} budget(s) exceeded — review variances`,
        tone: 'warning',
        route: '/finance/budgets',
      });
    }
    if (d.unreconciled_transactions > 0) {
      items.push({
        id: 'reconciliation',
        message: `${d.unreconciled_transactions} unreconciled bank transaction(s)`,
        tone: 'info',
        route: '/finance/reconciliation',
      });
    }
    if ((g?.pending_finance_payment_reviews ?? 0) > 0) {
      items.push({
        id: 'payment-reviews',
        message: `${g!.pending_finance_payment_reviews} supplier payment request(s) awaiting finance review`,
        tone: 'accent',
        route: '/finance/payment-requests',
        queryParams: { status: 'PENDING_FINANCE' },
      });
    }
    if ((d.pending_invoice_approvals_count ?? 0) > 0) {
      items.push({
        id: 'invoice-approvals',
        message: `${d.pending_invoice_sent_count ?? d.pending_invoice_approvals_count} sales invoice(s) awaiting issue`,
        tone: 'accent',
        route: '/finance/approval-queue',
        queryParams: { tab: 'sent', status: 'pending' },
      });
    }
    if ((d.procurement_alerts_count ?? 0) > 0) {
      items.push({
        id: 'procurement-pos',
        message: `${d.procurement_alerts_count} approved purchase order(s) awaiting finance review`,
        tone: 'accent',
        route: '/finance/purchase-orders',
      });
    }
    const staffFinance =
      (d.staff_payments_pending_finance ?? 0) + (d.staff_payments_pending_payment ?? 0);
    if (staffFinance > 0) {
      items.push({
        id: 'staff-payments-finance',
        message: `${staffFinance} staff payment request(s) awaiting Finance action`,
        tone: 'accent',
        route: '/finance/staff-payment-requests/finance',
      });
    }
    if ((d.staff_payments_pending_gm ?? 0) > 0) {
      items.push({
        id: 'staff-payments-gm',
        message: `${d.staff_payments_pending_gm} staff payment request(s) awaiting GM approval`,
        tone: 'warning',
        route: '/finance/staff-payment-requests/gm',
      });
    }
    if ((d.staff_payments_liquidation_overdue ?? 0) > 0) {
      items.push({
        id: 'staff-liquidation-overdue',
        message: `${d.staff_payments_liquidation_overdue} advance liquidation(s) past deadline`,
        tone: 'danger',
        route: '/finance/staff-payment-requests/liquidation',
      });
    }
    if (!items.length) {
      items.push({
        id: 'summary',
        message: `Net profit ${formatAccountingAmount(d.net_profit_month)} this month · Cash & bank ${formatAccountingAmount(d.cash_and_bank)}`,
        tone: isNegativeAmount(d.net_profit_month) ? 'warning' : 'success',
      });
    }
    return items.slice(0, 6);
  });

  readonly approvalQueueItems = computed((): DashboardApprovalItem[] => {
    const d = this.data();
    if (!d) return [];
    const g = this.governance();
    const items: DashboardApprovalItem[] = [];

    if (d.overdue_receivables_count > 0) {
      items.push({
        id: 'overdue-ar',
        title: 'Overdue Receivables',
        subtitle: formatAccountingAmount(d.overdue_receivables_amount) + ' outstanding',
        amount: String(d.overdue_receivables_count),
        priority: 'high',
        route: '/finance/receivables',
      });
    }
    if (d.overdue_payables_count > 0) {
      items.push({
        id: 'overdue-ap',
        title: 'Overdue Payables',
        subtitle: formatAccountingAmount(d.overdue_payables_amount) + ' due',
        amount: String(d.overdue_payables_count),
        priority: 'high',
        route: '/finance/payables',
      });
    }
    if (d.budgets_exceeded > 0) {
      items.push({
        id: 'budgets',
        title: 'Budgets Exceeded',
        subtitle: 'Review budget variances',
        amount: String(d.budgets_exceeded),
        priority: 'medium',
        route: '/finance/budgets',
      });
    }
    if (d.unreconciled_transactions > 0) {
      items.push({
        id: 'reconciliation',
        title: 'Unreconciled Transactions',
        subtitle: 'Bank reconciliation pending',
        amount: String(d.unreconciled_transactions),
        priority: 'medium',
        route: '/finance/reconciliation',
      });
    }
    if ((g?.pending_finance_payment_reviews ?? 0) > 0) {
      items.push({
        id: 'payment-reviews',
        title: 'Supplier Payment Requests',
        subtitle: 'Verify PO vs invoice from procurement',
        amount: String(g!.pending_finance_payment_reviews),
        priority: 'high',
        route: '/finance/payment-requests',
        queryParams: { status: 'PENDING_FINANCE' },
      });
    }
    if ((d.pending_invoice_approvals_count ?? 0) > 0) {
      items.push({
        id: 'invoice-approvals',
        title: 'Invoice Document Approvals',
        subtitle: 'Finance HOD approval required before AR/AP',
        amount: String(d.pending_invoice_approvals_count),
        priority: 'high',
        route: '/finance/approval-queue',
        queryParams: { status: 'pending' },
      });
    }
    if ((d.procurement_alerts_count ?? 0) > 0) {
      items.push({
        id: 'procurement-pos',
        title: 'Approved Purchase Orders',
        subtitle: 'Budget commitments awaiting review',
        amount: String(d.procurement_alerts_count),
        priority: 'medium',
        route: '/finance/purchase-orders',
      });
    }
    if ((d.staff_payments_pending_finance ?? 0) > 0) {
      items.push({
        id: 'staff-finance',
        title: 'Staff Payments — Finance',
        subtitle: 'Approve GL account and disburse',
        amount: String(d.staff_payments_pending_finance),
        priority: 'high',
        route: '/finance/staff-payment-requests/finance',
      });
    }
    if ((d.staff_payments_pending_payment ?? 0) > 0) {
      items.push({
        id: 'staff-payment',
        title: 'Staff Payments — Disburse',
        subtitle: 'Approved requests ready to mark paid',
        amount: String(d.staff_payments_pending_payment),
        priority: 'high',
        route: '/finance/staff-payment-requests/payment',
      });
    }
    if ((d.staff_payments_pending_gm ?? 0) > 0) {
      items.push({
        id: 'staff-gm',
        title: 'Staff Payments — GM',
        subtitle: 'Escalated or HOD/Finance submissions',
        amount: String(d.staff_payments_pending_gm),
        priority: 'high',
        route: '/finance/staff-payment-requests/gm',
      });
    }
    if ((d.staff_payments_pending_hod ?? 0) > 0) {
      items.push({
        id: 'staff-hod',
        title: 'Staff Payments — HOD',
        subtitle: 'Department approval queue',
        amount: String(d.staff_payments_pending_hod),
        priority: 'medium',
        route: '/finance/staff-payment-requests/hod',
      });
    }
    if ((d.staff_payments_pending_liquidation ?? 0) > 0) {
      items.push({
        id: 'staff-liquidation',
        title: 'Advance Liquidations',
        subtitle: 'Pending submission or Finance review',
        amount: String(d.staff_payments_pending_liquidation),
        priority: 'medium',
        route: '/finance/staff-payment-requests/liquidation',
      });
    }
    return items;
  });

  readonly procurementAlertItems = computed(() => {
    const alerts = this.data()?.procurement_alerts ?? [];
    return alerts.map((alert) => ({
      id: alert.id,
      title: alert.title,
      subtitle: [alert.body, alert.supplier_name].filter(Boolean).join(' · '),
      tone: 'accent' as const,
      route: alert.po_id
        ? ['/finance/purchase-orders', String(alert.po_id)]
        : '/finance/purchase-orders',
    }));
  });

  readonly quickActions = [
    { label: 'Sales Orders', route: '/finance/sales-orders' },
    { label: 'Journal Entries', route: '/finance/journal-entries' },
    { label: 'Receivables', route: '/finance/receivables' },
    { label: 'Payables', route: '/finance/payables' },
    { label: 'Bank Reconciliation', route: '/finance/reconciliation' },
    { label: 'Payment Requests', route: '/finance/payment-requests' },
    { label: 'Staff Payments', route: '/finance/staff-payment-requests' },
  ];

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
    this.finance
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
    this.dashboardApi.getDeptApprovals('finance', bypassCache).subscribe({
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
    this.loadGovernance();
    this.loadActionCenter(true);
  }

  onDateRangeChange(range: DateRangeValue): void {
    this.dateRange.set(range);
    this.load(true);
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

  loadGovernance(): void {
    this.procurement.getGovernanceDashboard().subscribe({
      next: (g) => this.governance.set(g),
      error: () => this.governance.set(null),
    });
  }
}
