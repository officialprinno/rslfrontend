import { DecimalPipe, SlicePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { InventoryDashboard, Warehouse } from '../../../../core/models/inventory.model';
import { AuthService } from '../../../../core/services/auth.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { WarehouseContextService } from '../../../../core/services/warehouse-context.service';
import { formatCurrency, formatDateTime, formatNumber } from '../../../../core/utils/format.util';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { InventoryNavComponent } from '../../components/inventory-nav/inventory-nav.component';
import { ProcurementBadgeComponent } from '../../components/procurement-badge/procurement-badge.component';
import { isStoreOperationsRole } from '../../utils/inventory-permissions.util';

const PIE_COLORS = ['#1B3A6B', '#2E6DB4', '#4A90D9', '#7EB3E8', '#F0A500', '#2E86AB'];

@Component({
  selector: 'app-inventory-dashboard',
  imports: [
    DecimalPipe,
    SlicePipe,
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    InventoryNavComponent,
    ProcurementBadgeComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './inventory-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryDashboardComponent implements OnInit, OnDestroy {
  private readonly inventory = inject(InventoryService);
  private readonly auth = inject(AuthService);
  readonly warehouseContext = inject(WarehouseContextService);
  private refreshSub?: Subscription;

  readonly data = signal<InventoryDashboard | null>(null);
  readonly warehouses = signal<Warehouse[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly formatCurrency = formatCurrency;
  readonly formatNumber = formatNumber;
  readonly formatDateTime = formatDateTime;
  readonly pieColors = PIE_COLORS;

  readonly isStoreRole = () => isStoreOperationsRole(this.auth);

  readonly quickActions = [
    { label: 'Receive Stock', route: '/inventory/grn', desc: 'Goods receipt (GRN)' },
    { label: 'Issue Stock', route: '/inventory/gin', desc: 'Goods issue note (GIN)' },
    { label: 'Transfer Stock', route: '/inventory/transfers', desc: 'Inter-warehouse transfer' },
    { label: 'Count Inventory', route: '/inventory/stock-take', desc: 'Physical stock take' },
    { label: 'View Movements', route: '/inventory/movements', desc: 'Stock movement ledger' },
  ];

  ngOnInit(): void {
    this.inventory.getWarehouses().subscribe((w) => this.warehouses.set(w));
    this.load();
    this.refreshSub = interval(300_000).subscribe(() => this.load(true));
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  onWarehouseChange(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    const whId = raw ? Number(raw) : null;
    this.warehouseContext.setWarehouse(whId);
    this.load();
  }

  load(silent = false): void {
    if (!silent) {
      this.loading.set(true);
      this.error.set(false);
    }
    const warehouseId = this.warehouseContext.activeWarehouseId();
    this.inventory
      .getDashboard(warehouseId)
      .pipe(finalize(() => { if (!silent) this.loading.set(false); }))
      .subscribe({
        next: (d) => this.data.set(d),
        error: () => { if (!silent) this.error.set(true); },
      });
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
}
