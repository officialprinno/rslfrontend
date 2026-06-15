import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { Item, MovementType, StockMovement } from '../../../../core/models/inventory.model';
import { InventoryService } from '../../../../core/services/inventory.service';
import { exportToExcel } from '../../../../core/utils/export.util';
import { formatCurrency, formatDateTime, formatNumber } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { InventoryNavComponent } from '../../components/inventory-nav/inventory-nav.component';
import { MovementTypeBadgeComponent } from '../../components/movement-type-badge/movement-type-badge.component';

@Component({
  selector: 'app-movements',
  imports: [
    FormsModule,
    PageHeaderComponent,
    InventoryNavComponent,
    PaginationComponent,
    MovementTypeBadgeComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './movements.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovementsComponent implements OnInit {
  private readonly inventory = inject(InventoryService);

  readonly movements = signal<StockMovement[]>([]);
  readonly items = signal<Item[]>([]);
  readonly warehouses = signal<{ id: number; name: string }[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);

  readonly dateFrom = signal('');
  readonly dateTo = signal('');
  readonly itemFilter = signal<number | ''>('');
  readonly warehouseFilter = signal<number | ''>('');
  readonly typeFilter = signal<MovementType | ''>('');
  readonly refTypeFilter = signal('');

  readonly movementTypes: MovementType[] = ['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT'];
  readonly refTypes = ['GRN', 'SALES_ORDER', 'WORK_ORDER', 'TRANSFER', 'ADJUSTMENT', 'MANUAL'];

  readonly formatDateTime = formatDateTime;
  readonly formatCurrency = formatCurrency;
  readonly formatNumber = formatNumber;

  ngOnInit(): void {
    this.inventory.getItems({ page_size: 100 }).subscribe((d) => this.items.set(d.results));
    this.inventory.getWarehouses().subscribe((w) => this.warehouses.set(w.map((x) => ({ id: x.id, name: x.name }))));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    const params: Record<string, string | number> = {
      page: this.page(),
      page_size: this.pageSize(),
      ordering: '-created_at',
    };
    if (this.itemFilter()) params['item'] = this.itemFilter() as number;
    if (this.warehouseFilter()) params['warehouse'] = this.warehouseFilter() as number;
    if (this.typeFilter()) params['movement_type'] = this.typeFilter() as string;
    if (this.refTypeFilter()) params['reference_type'] = this.refTypeFilter();
    if (this.dateFrom()) params['date_from'] = this.dateFrom();
    if (this.dateTo()) params['date_after'] = this.dateTo();

    this.inventory.getMovements(params).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (data) => {
        this.movements.set(data.results);
        this.total.set(data.count);
      },
      error: () => this.error.set(true),
    });
  }

  qtyDisplay(m: StockMovement): string {
    const prefix = m.movement_type === 'IN' ? '+' : m.movement_type === 'OUT' ? '-' : '';
    return `${prefix}${formatNumber(m.quantity)}`;
  }

  qtyClass(m: StockMovement): string {
    if (m.movement_type === 'IN') return 'text-green-700 font-semibold';
    if (m.movement_type === 'OUT') return 'text-red-600 font-semibold';
    return 'text-gray-800 font-medium';
  }

  onSearch(): void {
    this.page.set(1);
    this.load();
  }

  exportExcel(): void {
    exportToExcel('stock-movements', [
      { key: 'created_at', label: 'Date', format: (r) => formatDateTime(r.created_at) },
      { key: 'item_code', label: 'Code' },
      { key: 'item_name', label: 'Item' },
      { key: 'movement_type', label: 'Type' },
      { key: 'quantity', label: 'Qty' },
    ], this.movements());
  }
}
