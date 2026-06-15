import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import { Category, Item, Stock, StockStatus, StockSummary } from '../../../../core/models/inventory.model';
import { InventoryService } from '../../../../core/services/inventory.service';
import { exportToExcel } from '../../../../core/utils/export.util';
import { formatCurrency, formatNumber } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { InventoryNavComponent } from '../../components/inventory-nav/inventory-nav.component';
import { StockStatusBadgeComponent } from '../../components/stock-status-badge/stock-status-badge.component';
import { deriveStockStatus } from '../../utils/stock.util';

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
  ],
  templateUrl: './stock-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockOverviewComponent implements OnInit {
  private readonly inventory = inject(InventoryService);
  private readonly route = inject(ActivatedRoute);

  readonly stock = signal<Stock[]>([]);
  readonly summary = signal<StockSummary | null>(null);
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
  readonly statusFilter = signal<'ALL' | StockStatus>('ALL');

  readonly formatCurrency = formatCurrency;
  readonly formatNumber = formatNumber;

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
    this.load();
  }

  private summaryParams(): Record<string, string | number | boolean> {
    const params: Record<string, string | number | boolean> = {};
    if (this.warehouseFilter()) params['warehouse'] = this.warehouseFilter() as number;
    return params;
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);

    const params: Record<string, string | number | boolean> = {
      page: this.page(),
      page_size: this.pageSize(),
    };
    if (this.search()) params['search'] = this.search();
    if (this.warehouseFilter()) params['warehouse'] = this.warehouseFilter() as number;
    if (this.statusFilter() === 'LOW_STOCK') params['low_stock'] = true;

    forkJoin({
      stockPage: this.inventory.getStock(params),
      summary: this.inventory.getStockSummary(this.summaryParams()),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ stockPage, summary }) => {
          let rows = stockPage.results;

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
          }

          this.stock.set(rows);
          this.total.set(stockPage.count);
          this.summary.set(summary);
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

  exportExcel(): void {
    exportToExcel('stock-overview', [
      { key: 'item_code', label: 'Code' },
      { key: 'item_name', label: 'Item' },
      { key: 'warehouse_name', label: 'Warehouse' },
      { key: 'quantity_on_hand', label: 'Qty on Hand' },
      { key: 'quantity_available', label: 'Qty Available' },
      { key: 'total_value', label: 'Total Value', format: (r) => formatCurrency(r.total_value ?? 0) },
    ], this.stock());
  }
}
