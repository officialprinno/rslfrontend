import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { GovernanceDashboardData, ProcurementDashboardData } from '../../../../core/models/procurement.model';
import { AuthService } from '../../../../core/services/auth.service';
import { CompanyContextService } from '../../../../core/services/company-context.service';
import { ProcurementService } from '../../../../core/services/procurement.service';
import { formatCurrency, formatDateTime } from '../../../../core/utils/format.util';
import {
  ActivityFeedComponent,
  ApprovalQueueComponent,
  ChartCardComponent,
  DashboardInsight,
  DashboardApprovalItem,
  DashboardLayoutComponent,
  DashboardSectionComponent,
  DashboardTableComponent,
  DateRangeValue,
  InsightBannerComponent,
  KpiCardComponent,
  setupDashboardCompanyReload,
} from '../../../../shared/dashboard';
import { ProcurementNavComponent } from '../../components/procurement-nav/procurement-nav.component';
import { canGmFinancialReview, canReleasePayment } from '../../utils/procurement-permissions.util';

@Component({
  selector: 'app-procurement-dashboard',
  imports: [
    RouterLink,
    ProcurementNavComponent,
    DashboardLayoutComponent,
    InsightBannerComponent,
    KpiCardComponent,
    ChartCardComponent,
    DashboardSectionComponent,
    ApprovalQueueComponent,
    ActivityFeedComponent,
    DashboardTableComponent,
  ],
  templateUrl: './procurement-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProcurementDashboardComponent implements OnInit {
  private readonly procurement = inject(ProcurementService);
  private readonly companyContext = inject(CompanyContextService);
  private readonly auth = inject(AuthService);

  constructor() {
    setupDashboardCompanyReload(() => {
      this.data.set(null);
      this.governance.set(null);
      this.load(false, true);
      if (this.showGovernance()) {
        this.procurement.getGovernanceDashboard().subscribe({
          next: (g) => this.governance.set(g),
          error: () => this.governance.set(null),
        });
      }
    });
  }

  readonly data = signal<ProcurementDashboardData | null>(null);
  readonly governance = signal<GovernanceDashboardData | null>(null);
  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly error = signal(false);
  readonly lastUpdated = signal<Date | null>(null);
  readonly dateRange = signal<DateRangeValue | null>(null);

  readonly formatCurrency = formatCurrency;
  readonly formatDateTime = formatDateTime;
  readonly canFinance = () => canReleasePayment(this.auth);
  readonly showGovernance = () => canGmFinancialReview(this.auth) || canReleasePayment(this.auth);

  readonly dashboardSubtitle = computed(() => {
    const company = this.companyContext.activeCompany()?.name;
    return company
      ? `${company} — Shared Procurement & Supplier Management`
      : 'Rock Solutions — Shared Procurement & Supplier Management';
  });

  readonly insights = computed((): DashboardInsight[] => {
    const d = this.data();
    if (!d) return [];
    const g = this.governance();
    const items: DashboardInsight[] = [];

    if (d.pending_requisitions > 0) {
      items.push({
        id: 'pending-requisitions',
        message: `${d.pending_requisitions} requisition(s) awaiting review`,
        tone: 'warning',
        route: '/procurement/requisitions',
        queryParams: { status: 'PENDING' },
      });
    }
    if (d.pending_po_approvals > 0) {
      items.push({
        id: 'pending-po-approvals',
        message: `${d.pending_po_approvals} PO approval(s) pending`,
        tone: 'accent',
        route: '/procurement/purchase-orders',
      });
    }
    if (d.pending_grn > 0) {
      items.push({
        id: 'pending-grn',
        message: `${d.pending_grn} GRN(s) need processing`,
        tone: 'info',
        route: '/procurement/grn',
        queryParams: { status: 'DRAFT' },
      });
    }
    if (d.overdue_invoices > 0) {
      items.push({
        id: 'overdue-invoices',
        message: `${d.overdue_invoices} overdue supplier invoice(s)`,
        tone: 'danger',
        route: '/procurement/invoices',
      });
    }
    if (g?.overdue_emergency_pos) {
      items.push({
        id: 'overdue-emergency',
        message: `${g.overdue_emergency_pos} overdue emergency PO(s)`,
        tone: 'danger',
        route: '/procurement/purchase-orders',
      });
    }
    if (g?.pending_gm_po_approvals) {
      items.push({
        id: 'gm-po-queue',
        message: `${g.pending_gm_po_approvals} PO(s) awaiting GM approval`,
        tone: 'warning',
        route: '/procurement/purchase-orders',
        queryParams: { status: 'PENDING' },
      });
    }
    if (!items.length) {
      items.push({
        id: 'all-clear',
        message: `Monthly spend ${formatCurrency(d.monthly_spend, 'TZS')} across ${d.monthly_po_count} PO(s)`,
        tone: 'success',
      });
    }
    return items.slice(0, 6);
  });

  readonly approvalQueueItems = computed((): DashboardApprovalItem[] => {
    const g = this.governance();
    if (!g) return [];
    const items: DashboardApprovalItem[] = [
      {
        id: 'gm-po',
        title: 'GM PO Approvals',
        subtitle: 'Purchase orders above approval threshold',
        amount: String(g.pending_gm_po_approvals),
        priority: g.pending_gm_po_approvals > 0 ? 'high' : 'low',
        route: '/procurement/purchase-orders',
        queryParams: { status: 'PENDING' },
      },
      {
        id: 'gm-payment',
        title: 'GM Payment Reviews',
        subtitle: 'Payment releases awaiting GM sign-off',
        amount: String(g.pending_gm_payment_reviews),
        priority: g.pending_gm_payment_reviews > 0 ? 'high' : 'low',
        route: '/finance/payment-requests',
        queryParams: { status: 'PENDING_GM' },
      },
    ];
    if (this.canFinance()) {
      items.push({
        id: 'finance-payment',
        title: 'Finance Payment Reviews',
        subtitle: 'Payment requests awaiting finance verification',
        amount: String(g.pending_finance_payment_reviews),
        priority: g.pending_finance_payment_reviews > 0 ? 'medium' : 'low',
        route: '/finance/payment-requests',
        queryParams: { status: 'PENDING_FINANCE' },
      });
    }
    items.push({
      id: 'emergency-po',
      title: 'Overdue Emergency POs',
      subtitle: 'Emergency orders past expected delivery',
      amount: String(g.overdue_emergency_pos),
      priority: g.overdue_emergency_pos > 0 ? 'high' : 'low',
      route: '/procurement/purchase-orders',
    });
    return items;
  });

  readonly governanceAlerts = computed(() => {
    const g = this.governance();
    if (!g?.alerts.length) return [];
    return g.alerts.map((alert) => ({
      id: alert.id,
      title: alert.title,
      subtitle: alert.body,
      timestamp: formatDateTime(alert.created_at),
      tone: 'warning' as const,
    }));
  });

  readonly activityTableRows = computed(() => {
    const d = this.data();
    if (!d) return [];
    return d.recent_activities.map((a) => ({
      id: `${a.type}-${a.reference}-${a.created_at}`,
      type: this.activityLabel(a.type),
      reference: a.reference,
      status: a.status,
      detail: a.detail,
      amount: a.amount ? formatCurrency(a.amount, 'TZS') : '—',
      when: formatDateTime(a.created_at),
      _type: a.type,
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

  readonly quickActions = [
    { label: 'New Requisition', route: '/procurement/requisitions/new' },
    { label: 'Create RFQ', route: '/procurement/rfq' },
    { label: 'New Purchase Order', route: '/procurement/purchase-orders/new' },
    { label: 'Record GRN', route: '/procurement/grn/new' },
    { label: 'Add Supplier', route: '/procurement/suppliers' },
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
    this.procurement
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
    if (this.showGovernance()) {
      this.procurement.getGovernanceDashboard().subscribe({
        next: (g) => this.governance.set(g),
        error: () => this.governance.set(null),
      });
    }
  }

  onDateRangeChange(range: DateRangeValue): void {
    this.dateRange.set(range);
    this.load(true);
  }

  maxMonthlySpend(): number {
    const months = this.data()?.monthly_chart ?? [];
    return Math.max(...months.map((m) => +m.spend), 1);
  }

  activityLabel(type: string): string {
    const labels: Record<string, string> = {
      REQUISITION: 'Requisition',
      PURCHASE_ORDER: 'Purchase Order',
      GRN: 'Goods Received',
    };
    return labels[type] ?? type;
  }

  activityRoute(type: string): string {
    const routes: Record<string, string> = {
      REQUISITION: '/procurement/requisitions',
      PURCHASE_ORDER: '/procurement/purchase-orders',
      GRN: '/procurement/grn',
    };
    return routes[type] ?? '/procurement';
  }

  activityRowLink = (row: { _type: string }): string[] => [this.activityRoute(row._type)];
}
