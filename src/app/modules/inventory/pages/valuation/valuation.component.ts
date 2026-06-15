import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { ValuationMethod, ValuationReport } from '../../../../core/models/inventory.model';
import { InventoryService } from '../../../../core/services/inventory.service';
import { exportToExcel } from '../../../../core/utils/export.util';
import { formatCurrency, formatNumber } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { InventoryNavComponent } from '../../components/inventory-nav/inventory-nav.component';
import { VALUATION_METHODS } from '../../constants/inventory.constants';

@Component({
  selector: 'app-valuation',
  imports: [
    FormsModule,
    PageHeaderComponent,
    InventoryNavComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './valuation.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ValuationComponent implements OnInit {
  private readonly inventory = inject(InventoryService);

  readonly report = signal<ValuationReport | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly method = signal<ValuationMethod>('WEIGHTED_AVERAGE');
  readonly methods = VALUATION_METHODS;

  readonly formatCurrency = formatCurrency;
  readonly formatNumber = formatNumber;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.inventory
      .getValuation(this.method())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (r) => this.report.set(r),
        error: () => this.error.set(true),
      });
  }

  onMethodChange(value: ValuationMethod): void {
    this.method.set(value);
    this.load();
  }

  exportExcel(): void {
    const r = this.report();
    if (!r) return;
    exportToExcel(`inventory-valuation-${r.method.toLowerCase()}`, [
      { key: 'item_code', label: 'Item Code' },
      { key: 'item_name', label: 'Item Name' },
      { key: 'category', label: 'Category' },
      { key: 'warehouse', label: 'Warehouse' },
      { key: 'quantity', label: 'Quantity', format: (row) => formatNumber(row.quantity) },
      { key: 'unit_cost', label: 'Unit Cost', format: (row) => formatCurrency(row.unit_cost) },
      { key: 'total_value', label: 'Total Value', format: (row) => formatCurrency(row.total_value) },
    ], r.items);
  }
}
