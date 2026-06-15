import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { ReorderPriority, ReorderSuggestion } from '../../../../core/models/inventory.model';
import { InventoryService } from '../../../../core/services/inventory.service';
import { exportToExcel } from '../../../../core/utils/export.util';
import { formatCurrency, formatNumber } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { InventoryNavComponent } from '../../components/inventory-nav/inventory-nav.component';

@Component({
  selector: 'app-reorder',
  imports: [
    RouterLink,
    PageHeaderComponent,
    InventoryNavComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './reorder.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReorderComponent implements OnInit {
  private readonly inventory = inject(InventoryService);

  readonly suggestions = signal<ReorderSuggestion[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly formatNumber = formatNumber;
  readonly formatCurrency = formatCurrency;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.inventory
      .getReorderSuggestions()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (s) => this.suggestions.set(s),
        error: () => this.error.set(true),
      });
  }

  priorityBadgeClass(priority: ReorderPriority): string {
    const map: Record<ReorderPriority, string> = {
      CRITICAL: 'bg-red-100 text-red-800',
      HIGH: 'bg-orange-100 text-orange-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      LOW: 'bg-gray-100 text-gray-600',
    };
    return map[priority];
  }

  exportExcel(): void {
    exportToExcel('reorder-suggestions', [
      { key: 'item_code', label: 'Item Code' },
      { key: 'item_name', label: 'Item Name' },
      { key: 'warehouse_name', label: 'Warehouse' },
      { key: 'current_stock', label: 'Current Stock', format: (r) => formatNumber(r.current_stock) },
      { key: 'reorder_level', label: 'Reorder Level', format: (r) => formatNumber(r.reorder_level) },
      { key: 'suggested_quantity', label: 'Suggested Qty', format: (r) => formatNumber(r.suggested_quantity) },
      { key: 'estimated_cost', label: 'Est. Cost', format: (r) => formatCurrency(r.estimated_cost) },
      { key: 'priority', label: 'Priority' },
    ], this.suggestions());
  }
}
