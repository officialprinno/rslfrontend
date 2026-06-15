import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { ReorderSuggestion } from '../../../../core/models/inventory.model';
import { AuthService } from '../../../../core/services/auth.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { exportToExcel } from '../../../../core/utils/export.util';
import { formatCurrency, formatNumber } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { InventoryNavComponent } from '../../components/inventory-nav/inventory-nav.component';
import { canGovernInventory } from '../../utils/inventory-permissions.util';

@Component({
  selector: 'app-purchase-requisitions',
  imports: [
    RouterLink,
    PageHeaderComponent,
    InventoryNavComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './purchase-requisitions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseRequisitionsComponent implements OnInit {
  private readonly inventory = inject(InventoryService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);

  readonly suggestions = signal<ReorderSuggestion[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly creatingPr = signal(false);
  readonly canCreatePr = () => canGovernInventory(this.auth);

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

  priorityClass(priority: string): string {
    const map: Record<string, string> = {
      CRITICAL: 'bg-red-100 text-red-800',
      HIGH: 'bg-orange-100 text-orange-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      LOW: 'bg-gray-100 text-gray-600',
    };
    return map[priority] ?? 'bg-gray-100 text-gray-600';
  }

  exportExcel(): void {
    exportToExcel('purchase-requisitions', [
      { key: 'item_code', label: 'Item Code' },
      { key: 'item_name', label: 'Item Name' },
      { key: 'warehouse_name', label: 'Warehouse' },
      { key: 'suggested_quantity', label: 'Suggested Qty', format: (r) => formatNumber(r.suggested_quantity) },
      { key: 'estimated_cost', label: 'Est. Cost', format: (r) => formatCurrency(r.estimated_cost) },
      { key: 'priority', label: 'Priority' },
    ], this.suggestions());
  }

  createSuggestedPr(): void {
    if (!this.canCreatePr() || !this.suggestions().length) {
      return;
    }
    this.creatingPr.set(true);
    this.inventory
      .createSuggestedPurchaseRequisition(['CRITICAL', 'HIGH'])
      .pipe(finalize(() => this.creatingPr.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Purchase requisition draft created from low-stock suggestions');
        },
        error: (err) =>
          this.notification.error(getApiErrorMessage(err, 'Failed to create purchase requisition')),
      });
  }
}
