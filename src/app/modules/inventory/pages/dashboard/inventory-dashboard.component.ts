import { DecimalPipe, KeyValuePipe, SlicePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { InventoryDashboard, MovementType, Warehouse } from '../../../../core/models/inventory.model';
import { PurchaseOrder } from '../../../../core/models/procurement.model';
import { AuthService } from '../../../../core/services/auth.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { CompanyContextService } from '../../../../core/services/company-context.service';
import { ProcurementService } from '../../../../core/services/procurement.service';
import { WarehouseContextService } from '../../../../core/services/warehouse-context.service';
import { formatCurrency, formatDate, formatDateTime, formatNumber } from '../../../../core/utils/format.util';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import {
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
import { InventoryNavComponent } from '../../components/inventory-nav/inventory-nav.component';
import { MovementTypeBadgeComponent } from '../../components/movement-type-badge/movement-type-badge.component';
import { ProcurementBadgeComponent } from '../../components/procurement-badge/procurement-badge.component';
import {
  isWarehouseOperationsRole,
  canViewInventoryPurchaseOrders,
  warehouseManagerLabel,
} from '../../utils/inventory-permissions.util';
import { canManageGRN } from '../../../procurement/utils/procurement-permissions.util';

const PIE_COLORS = ['#1B3A6B', '#2E6DB4', '#4A90D9', '#7EB3E8', '#F0A500', '#2E86AB'];

@Component({
  selector: 'app-inventory-dashboard',
  imports: [
    DecimalPipe,
    KeyValuePipe,
    SlicePipe,
    FormsModule,
    RouterLink,
    InventoryNavComponent,
    ProcurementBadgeComponent,
    DashboardLayoutComponent,
    InsightBannerComponent,
    KpiCardComponent,
    ChartCardComponent,
    DashboardSectionComponent,
    MovementTypeBadgeComponent,
    ApprovalQueueComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './inventory-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryDashboardComponent implements OnInit {
  private readonly inventory = inject(InventoryService);
  private readonly procurement = inject(ProcurementService);
  private readonly auth = inject(AuthService);
  readonly warehouseContext = inject(WarehouseContextService);
  readonly companyContext = inject(CompanyContextService);

  constructor() {
    setupDashboardCompanyReload(() => {
      this.data.set(null);
      this.receivablePos.set([]);
      this.load(false, true);
      if (this.showReceivablePos()) {
        this.loadReceivablePos();
      }
    });
  }

  readonly data = signal<InventoryDashboard | null>(null);
  readonly warehouses = signal<Warehouse[]>([]);
  readonly receivablePos = signal<PurchaseOrder[]>([]);
  readonly receivablePosLoading = signal(false);
  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly error = signal(false);
  readonly lastUpdated = signal<Date | null>(null);
  readonly dateRange = signal<DateRangeValue | null>(null);

  readonly formatCurrency = formatCurrency;
  readonly formatNumber = formatNumber;
  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;
  readonly pieColors = PIE_COLORS;

  readonly isWarehouseRole = () => isWarehouseOperationsRole(this.auth, this.companyContext);
  readonly showReceivablePos = () => canViewInventoryPurchaseOrders(this.auth, this.companyContext);
  readonly canReceiveGoods = () => canManageGRN(this.auth, this.companyContext);
  readonly warehouseManagerLabel = () => warehouseManagerLabel(this.companyContext);

  readonly dashboardTitle = computed(() =>
    this.isWarehouseRole() ? 'Warehouse Operations Dashboard' : 'Inventory Dashboard',
  );

  readonly dashboardSubtitle = computed(() => {
    const code = this.companyContext.activeCompany()?.code;
    if (code === 'STEIN') {
      return 'Rock Solutions Stein — Manufacturing Inventory & Factory Warehouse';
    }
    if (code === 'SUPPLY') {
      return 'Rock Solutions Supply — Commercial Inventory & Warehouse Operations';
    }
    return 'Rock Solutions Limited — Inventory & Warehouse Control';
  });

  readonly insights = computed((): DashboardInsight[] => {
    const d = this.data();
    if (!d) return [];
    const items: DashboardInsight[] = [];

    if (d.out_of_stock_count > 0) {
      items.push({
        id: 'out-of-stock',
        message: `${d.out_of_stock_count} item(s) out of stock — immediate action required`,
        tone: 'danger',
        route: '/inventory/stock',
        queryParams: { status: 'OUT_OF_STOCK' },
      });
    }
    if (d.low_stock_count > 0) {
      items.push({
        id: 'low-stock',
        message: `${d.low_stock_count} item(s) below reorder level`,
        tone: 'warning',
        route: '/inventory/stock',
        queryParams: { status: 'LOW_STOCK' },
      });
    }
    if (d.pending_grn > 0) {
      items.push({
        id: 'pending-grn',
        message: `${d.pending_grn} GRN(s) awaiting stock confirmation`,
        tone: 'info',
        route: '/inventory/grn',
      });
    }
    if (d.pending_department_requests > 0) {
      items.push({
        id: 'dept-requests',
        message: `${d.pending_department_requests} department request(s) awaiting approval`,
        tone: 'accent',
        route: '/inventory/department-requests',
      });
    }
    if (!items.length && d.inventory_health_score != null) {
      items.push({
        id: 'health',
        message: `Inventory health ${d.inventory_health_score}% · ${formatCurrency(d.total_inventory_value)} total value`,
        tone: d.inventory_health_score >= 80 ? 'success' : 'warning',
      });
    }
    return items.slice(0, 6);
  });

  readonly approvalQueueItems = computed((): DashboardApprovalItem[] => {
    const d = this.data();
    if (!d) return [];
    const items: DashboardApprovalItem[] = [];

    if (d.low_stock_count > 0) {
      items.push({
        id: 'low-stock',
        title: 'Low Stock Alert',
        subtitle: 'Items below reorder level',
        amount: String(d.low_stock_count),
        priority: 'high',
        route: '/inventory/stock',
        queryParams: { status: 'LOW_STOCK' },
      });
    }
    if (d.out_of_stock_count > 0) {
      items.push({
        id: 'out-of-stock',
        title: 'Out of Stock',
        subtitle: 'Immediate action required',
        amount: String(d.out_of_stock_count),
        priority: 'high',
        route: '/inventory/stock',
        queryParams: { status: 'OUT_OF_STOCK' },
      });
    }
    if (d.pending_grn > 0) {
      items.push({
        id: 'pending-grn',
        title: 'Pending GRN',
        subtitle: 'Awaiting stock confirmation',
        amount: String(d.pending_grn),
        priority: 'medium',
        route: '/inventory/grn',
      });
    }
    if (d.pending_department_requests > 0) {
      items.push({
        id: 'dept-requests',
        title: 'Dept Requests',
        subtitle: 'Awaiting approval',
        amount: String(d.pending_department_requests),
        priority: 'medium',
        route: '/inventory/department-requests',
      });
    }
    return items;
  });

  readonly warehouseQuickActions = [
    { label: 'Receive Stock', route: '/inventory/grn', desc: 'Goods receipt (GRN)' },
    { label: 'Issue Stock', route: '/inventory/gin', desc: 'Goods issue note (GIN)' },
    { label: 'Transfer Stock', route: '/inventory/transfers', desc: 'Inter-warehouse transfer' },
    { label: 'Count Inventory', route: '/inventory/stock-take', desc: 'Monthly warehouse stock take' },
    { label: 'View Movements', route: '/inventory/movements', desc: 'Stock movement ledger' },
  ];

  ngOnInit(): void {
    this.inventory.getWarehouses().subscribe((w) => this.warehouses.set(w));
  }

  onWarehouseChange(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    const whId = raw ? Number(raw) : null;
    this.warehouseContext.setWarehouse(whId);
    this.load();
  }

  load(silent = false, bypassCache = false): void {
    if (silent) {
      this.refreshing.set(true);
    } else {
      this.loading.set(true);
    }
    this.error.set(false);
    const warehouseId = this.warehouseContext.activeWarehouseId();
    this.inventory
      .getDashboard(warehouseId, this.dateRange(), bypassCache)
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

  loadReceivablePos(silent = false): void {
    if (!silent) {
      this.receivablePosLoading.set(true);
    }
    this.procurement
      .getReceivablePurchaseOrders(8)
      .pipe(finalize(() => { if (!silent) this.receivablePosLoading.set(false); }))
      .subscribe({
        next: (pos) => this.receivablePos.set(pos),
        error: () => this.receivablePos.set([]),
      });
  }

  onRefresh(): void {
    this.load(true, true);
    if (this.showReceivablePos()) {
      this.loadReceivablePos(true);
    }
  }

  onDateRangeChange(range: DateRangeValue): void {
    this.dateRange.set(range);
    this.load(true);
  }

  isReceivable(status: string): boolean {
    return ['APPROVED', 'SENT', 'PARTIAL', 'AWAITING_DELIVERY'].includes(status);
  }

  maxMonthlyValue(): number {
    const months = this.data()?.monthly_chart ?? [];
    return Math.max(...months.map((m) => Math.max(+m.stock_in, +m.stock_out)), 1);
  }

  totalCategoryValue(): number {
    const items = this.data()?.value_by_category ?? [];
    return items.reduce((sum, c) => sum + +c.value, 0);
  }

  categoryPercent(value: number): number {
    const total = this.totalCategoryValue();
    return total > 0 ? (+value / total) * 100 : 0;
  }

  utilCapPct(pct: number | null): number {
    if (pct === null) return 0;
    return Math.min(pct, 100);
  }

  pieGradient(): string {
    const items = this.data()?.value_by_category ?? [];
    const total = this.totalCategoryValue();
    if (!total || !items.length) {
      return 'conic-gradient(#e5e7eb 0deg 360deg)';
    }
    let angle = 0;
    const stops: string[] = [];
    items.forEach((item, i) => {
      const pct = (+item.value / total) * 360;
      const color = this.pieColors[i % this.pieColors.length];
      stops.push(`${color} ${angle}deg ${angle + pct}deg`);
      angle += pct;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }

  activityLabel(type: string): string {
    const labels: Record<string, string> = {
      IN: 'Stock In',
      OUT: 'Stock Out',
      TRANSFER: 'Transfer',
      ADJUSTMENT: 'Adjustment',
      PRODUCTION_CONSUMPTION: 'Production Use',
      PRODUCTION_OUTPUT: 'Production Output',
    };
    return labels[type] ?? type;
  }

  readonly activityItems = computed(() => {
    const d = this.data();
    if (!d?.recent_activities?.length) return [];
    return d.recent_activities.map((a) => ({
      ...a,
      movementType: this.toMovementType(a.type),
    }));
  });

  toMovementType(type: string): MovementType {
    const allowed: MovementType[] = [
      'IN',
      'OUT',
      'TRANSFER',
      'ADJUSTMENT',
      'PRODUCTION_CONSUMPTION',
      'PRODUCTION_OUTPUT',
    ];
    return allowed.includes(type as MovementType) ? (type as MovementType) : 'OUT';
  }

  quantityTone(type: string): string {
    if (type === 'IN' || type === 'PRODUCTION_OUTPUT') return 'text-emerald-700';
    if (type === 'OUT' || type === 'PRODUCTION_CONSUMPTION') return 'text-red-600';
    return 'text-gray-900';
  }

  activityRoute(activity: {
    reference_type: string;
    entity_id: number | null;
    id: number;
  }): string[] {
    const entityId = activity.entity_id;
    if (activity.reference_type === 'SALES_ORDER' && entityId) {
      return ['/sales/orders', String(entityId), 'view'];
    }
    if (activity.reference_type === 'GRN' && entityId) {
      return ['/inventory/grn', String(entityId), 'view'];
    }
    if (activity.reference_type === 'WORK_ORDER' && entityId) {
      return ['/production/work-orders', String(entityId), 'view'];
    }
    if (activity.reference_type === 'ADJUSTMENT' && entityId) {
      return ['/inventory/adjustments'];
    }
    if (activity.reference_type === 'TRANSFER' && entityId) {
      return ['/inventory/transfers'];
    }
    if (activity.reference_type === 'DEPT_REQUEST' && entityId) {
      return ['/inventory/department-requests'];
    }
    return ['/inventory/movements'];
  }

  activityViewEnabled(activity: { reference_type: string; entity_id: number | null }): boolean {
    if (activity.reference_type === 'MANUAL' || !activity.reference_type) {
      return false;
    }
    if (['SALES_ORDER', 'GRN', 'WORK_ORDER'].includes(activity.reference_type)) {
      return activity.entity_id != null;
    }
    return true;
  }
}
