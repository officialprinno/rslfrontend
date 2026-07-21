import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, finalize } from 'rxjs';

import { Category, Item, Stock, StockOverviewSummary, StockReservationBreakdown, StockStatus } from '../../../../core/models/inventory.model';
import { CompanyContextService } from '../../../../core/services/company-context.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { exportToExcel } from '../../../../core/utils/export.util';
import { formatCurrency, formatNumber } from '../../../../core/utils/format.util';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { InventoryNavComponent } from '../../components/inventory-nav/inventory-nav.component';
import { StockReservedBreakdownModalComponent } from '../../components/stock-reserved-breakdown-modal/stock-reserved-breakdown-modal.component';
import { StockStatusBadgeComponent } from '../../components/stock-status-badge/stock-status-badge.component';
import { deriveStockStatus } from '../../utils/stock.util';
import { isSteinCompany } from '../../utils/inventory-permissions.util';

@Component({
  selector: 'app-stock-overview',
  imports: [
    FormsModule,
    PageHeaderComponent,
    InventoryNavComponent,
    PaginationComponent,
    StockStatusBadgeComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
    StockReservedBreakdownModalComponent,
  ],
  templateUrl: './stock-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockOverviewComponent implements OnInit {
  private readonly inventory = inject(InventoryService);
  private readonly notification = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly companyCtx = inject(CompanyContextService);

  readonly showWip = () => isSteinCompany(this.companyCtx);

  readonly stock = signal<Stock[]>([]);
  readonly summary = signal<StockOverviewSummary | null>(null);
  readonly warehouses = signal<{ id: number; name: string }[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly items = signal<Item[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);

  readonly search = signal('');
  readonly warehouseFilter = signal<number | ''>('');
  readonly categoryFilter = signal<number | ''>('');
  readonly statusFilter = signal<'ALL' | StockStatus | 'FROZEN'>('ALL');

  readonly reservedModalOpen = signal(false);
  readonly reservedLoading = signal(false);
  readonly reservedBreakdown = signal<StockReservationBreakdown | null>(null);

  readonly formatCurrency = formatCurrency;
  readonly formatNumber = formatNumber;

  totalQty(row: Stock): number {
    if (row.quantity_total != null) return Number(row.quantity_total);
    return (
      Number(row.quantity_on_hand ?? 0)
      + Number(row.quantity_frozen ?? 0)
      + Number(row.quantity_wip ?? 0)
    );
  }

  ngOnInit(): void {
    const wh = this.route.snapshot.queryParamMap.get('warehouse');
    if (wh) this.warehouseFilter.set(Number(wh));
    const status = this.route.snapshot.queryParamMap.get('status');
    if (status === 'LOW_STOCK' || status === 'OUT_OF_STOCK' || status === 'IN_STOCK') {
      this.statusFilter.set(status);
    }

    this.inventory.getWarehouses().subscribe((w) =>
      this.warehouses.set(w.map((x) => ({ id: x.id, name: x.name }))),
    );
    this.inventory.getCategories().subscribe((c) => this.categories.set(c));
    this.inventory.getItems({ page_size: 100 }).subscribe((d) => this.items.set(d.results));

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        if (e.urlAfterRedirects.includes('/inventory/stock')) {
          this.load();
        }
      });

    this.load();
  }

  private overviewParams(): Record<string, string | number | boolean> {
    const params: Record<string, string | number | boolean> = {
      page: this.page(),
      page_size: this.pageSize(),
    };
    if (this.search()) params['search'] = this.search();
    if (this.warehouseFilter()) params['warehouse'] = this.warehouseFilter() as number;
    if (this.statusFilter() === 'LOW_STOCK') params['low_stock'] = true;
    return params;
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);

    this.inventory
      .getStockOverview(this.overviewParams())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => {
          let rows = data.results;

          if (this.categoryFilter()) {
            const catItems = new Set(
              this.items().filter((i) => i.category === this.categoryFilter()).map((i) => i.id),
            );
            rows = rows.filter((r) => catItems.has(r.item));
          }
          if (this.statusFilter() === 'OUT_OF_STOCK') {
            rows = rows.filter((r) => r.status === 'OUT_OF_STOCK');
          } else if (this.statusFilter() === 'LOW_STOCK') {
            rows = rows.filter((r) => r.status === 'LOW_STOCK');
          } else if (this.statusFilter() === 'IN_STOCK') {
            rows = rows.filter((r) => r.status === 'IN_STOCK');
          } else if (this.statusFilter() === 'FROZEN') {
            rows = rows.filter((r) => Number(r.quantity_frozen ?? 0) > 0);
          }

          this.stock.set(rows);
          this.total.set(data.count);
          this.summary.set(data.summary);
        },
        error: () => this.error.set(true),
      });
  }

  qtyClass(row: Stock): string {
    const st = row.status ?? deriveStockStatus(row.quantity_available, row.reorder_level);
    if (st === 'OUT_OF_STOCK') return 'text-red-600 font-bold';
    if (st === 'LOW_STOCK') return 'text-orange-600 font-semibold';
    return 'text-green-700 font-semibold';
  }

  frozenClass(row: Stock): string {
    return Number(row.quantity_frozen ?? 0) > 0
      ? 'text-blue-700 font-semibold'
      : 'text-gray-500';
  }

  onSearch(): void {
    this.page.set(1);
    this.load();
  }

  onPageChange(p: number): void {
    this.page.set(p);
    this.load();
  }

  onPageSizeChange(s: number): void {
    this.pageSize.set(s);
    this.page.set(1);
    this.load();
  }

  openReservedBreakdown(row: Stock): void {
    if (Number(row.quantity_reserved ?? 0) <= 0) {
      return;
    }
    this.reservedModalOpen.set(true);
    this.reservedLoading.set(true);
    this.reservedBreakdown.set(null);
    this.inventory.getStockReservationBreakdown(row.id).subscribe({
      next: (data) => {
        this.reservedBreakdown.set(data);
        this.reservedLoading.set(false);
      },
      error: (err) => {
        this.reservedLoading.set(false);
        this.reservedModalOpen.set(false);
        this.notification.error(getApiErrorMessage(err, 'Failed to load reserved stock details'));
      },
    });
  }

  closeReservedBreakdown(): void {
    this.reservedModalOpen.set(false);
    this.reservedBreakdown.set(null);
  }

  onReservedStockReturned(): void {
    this.closeReservedBreakdown();
    this.load();
  }

  exportExcel(): void {
    exportToExcel('stock-overview', [
      { key: 'item_code', label: 'Code' },
      { key: 'item_name', label: 'Item' },
      { key: 'warehouse_name', label: 'Warehouse' },
      { key: 'quantity_on_hand', label: 'Qty on Hand' },
      { key: 'quantity_reserved', label: 'Qty Reserved' },
      { key: 'quantity_frozen', label: 'Qty Frozen' },
      { key: 'quantity_total', label: 'Total Qty' },
      { key: 'quantity_available', label: 'Qty Available' },
      { key: 'total_value', label: 'Total Value', format: (r) => formatCurrency(r.total_value ?? 0) },
    ], this.stock());
  }
}
