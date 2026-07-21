import { ChangeDetectionStrategy, Component, computed, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import {
  InventoryValuationSummary,
  WarehouseValuationSummary,
} from '../../../../core/models/finance.model';
import { FinanceService } from '../../../../core/services/finance.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { formatCurrency, formatNumber } from '../../../../core/utils/format.util';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { FinanceNavComponent } from '../../components/finance-nav/finance-nav.component';

@Component({
  selector: 'app-inventory-finance-valuations',
  imports: [FormsModule, FinanceNavComponent, PageHeaderComponent, EmptyStateComponent, ErrorStateComponent, PaginationComponent, TableSkeletonComponent],
  template: `
    <app-page-header
      title="Inventory Valuation"
      subtitle="Finance-owned valuation summary using unit cost only, with finance-held quantities separated from saleable stock."
      [hasActions]="false"
    />

    <app-finance-nav />

    @if (error()) {
      <app-error-state
        title="Unable to load valuation"
        message="The valuation service did not return data for the active company workspace."
        (retry)="load()"
      />
    } @else {
      @if (summary(); as summary) {
        <section class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <article class="card p-5 border border-gray-200">
            <p class="text-xs uppercase tracking-[0.18em] text-gray-500">Total Quantity</p>
            <p class="text-3xl font-semibold text-gray-900 mt-2">{{ formatNumber(summary.total_quantity, 4) }}</p>
          </article>
          <article class="card p-5 border border-amber-100 bg-amber-50/60">
            <p class="text-xs uppercase tracking-[0.18em] text-amber-700">Finance Hold</p>
            <p class="text-3xl font-semibold text-gray-900 mt-2">{{ formatNumber(summary.total_finance_hold, 4) }}</p>
          </article>
          <article class="card p-5 border border-emerald-100 bg-emerald-50/60">
            <p class="text-xs uppercase tracking-[0.18em] text-emerald-700">Ready For Sale</p>
            <p class="text-3xl font-semibold text-gray-900 mt-2">{{ formatNumber(summary.total_available, 4) }}</p>
          </article>
          <article class="card p-5 border border-sky-100 bg-sky-50/70">
            <p class="text-xs uppercase tracking-[0.18em] text-sky-700">Inventory Assets</p>
            <p class="text-2xl font-semibold text-gray-900 mt-2">{{ formatCurrency(summary.total_inventory_value) }}</p>
          </article>
        </section>
      }

      <section class="card p-5 mb-6 border border-gray-200">
        <div class="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          <div>
            <p class="text-sm font-semibold text-gray-900">Warehouse valuation breakdown</p>
            <p class="text-sm text-gray-500">Search warehouses and sort by quantity, finance hold, or inventory value.</p>
          </div>
          <div class="flex flex-col sm:flex-row gap-3 lg:w-auto w-full">
            <input
              [(ngModel)]="searchTerm"
              placeholder="Search warehouse"
              class="input-field min-w-[16rem]"
            />
            <select [(ngModel)]="sortKey" class="input-field min-w-56" (ngModelChange)="page.set(1)">
              <option value="warehouse_name">Warehouse A-Z</option>
              <option value="-total_inventory_value">Highest inventory value</option>
              <option value="-total_finance_hold">Highest finance hold</option>
              <option value="-total_quantity">Highest stock quantity</option>
            </select>
          </div>
        </div>
      </section>

      <section class="card p-0 overflow-hidden">
        @if (loading()) {
          <div class="p-5">
            <app-table-skeleton [rows]="6" [cols]="6" />
          </div>
        } @else if (!filteredWarehouses().length) {
          <app-empty-state
            [title]="searchTerm.trim() ? 'No warehouse matches this search' : 'No warehouse valuation rows'"
            [message]="searchTerm.trim() ? 'Try a different warehouse name or clear the search filter.' : 'Warehouse summaries will appear after inventory exists in the selected company workspace.'"
            moduleName="Inventory Valuation"
            (companySwitched)="load()"
          />
        } @else {
          <div class="overflow-x-auto">
            <table class="enterprise-table w-full">
              <thead>
                <tr>
                  <th class="table-th">Warehouse</th>
                  <th class="table-th">Total Qty</th>
                  <th class="table-th">Ready Qty</th>
                  <th class="table-th">Finance Hold Qty</th>
                  <th class="table-th">Average Cost</th>
                  <th class="table-th">Inventory Value</th>
                </tr>
              </thead>
              <tbody>
                @for (row of pagedWarehouses(); track row.warehouse_id) {
                  <tr class="table-row">
                    <td class="table-td font-medium text-gray-900">{{ row.warehouse_name }}</td>
                    <td class="table-td">{{ formatNumber(row.total_quantity, 4) }}</td>
                    <td class="table-td">{{ formatNumber(row.total_available, 4) }}</td>
                    <td class="table-td">{{ formatNumber(row.total_finance_hold, 4) }}</td>
                    <td class="table-td">{{ formatCurrency(row.average_cost) }}</td>
                    <td class="table-td">{{ formatCurrency(row.total_inventory_value) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <app-pagination
            [page]="page()"
            [pageSize]="pageSize()"
            [total]="filteredWarehouses().length"
            (pageChange)="page.set($event)"
            (pageSizeChange)="setPageSize($event)"
          />
        }
      </section>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryFinanceValuationsComponent implements OnInit {
  private readonly finance = inject(FinanceService);

  readonly summary = signal<InventoryValuationSummary | null>(null);
  readonly warehouses = signal<WarehouseValuationSummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly page = signal(1);
  readonly pageSize = signal(10);

  readonly formatCurrency = formatCurrency;
  readonly formatNumber = formatNumber;
  searchTerm = '';
  sortKey: 'warehouse_name' | '-total_inventory_value' | '-total_finance_hold' | '-total_quantity' = 'warehouse_name';
  readonly filteredWarehouses = computed(() => {
    const query = this.searchTerm.trim().toLowerCase();
    const rows = this.warehouses().filter((row) =>
      !query || row.warehouse_name.toLowerCase().includes(query),
    );
    return [...rows].sort((left, right) => this.compareRows(left, right));
  });
  readonly pagedWarehouses = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filteredWarehouses().slice(start, start + this.pageSize());
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    forkJoin({
      summary: this.finance.getInventoryValuationSummary(),
      warehouses: this.finance.getWarehouseValuations(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ summary, warehouses }) => {
          this.summary.set(summary);
          this.warehouses.set(warehouses);
          this.page.set(1);
        },
        error: () => this.error.set(true),
      });
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
  }

  private compareRows(left: WarehouseValuationSummary, right: WarehouseValuationSummary): number {
    switch (this.sortKey) {
      case '-total_inventory_value':
        return Number(right.total_inventory_value) - Number(left.total_inventory_value);
      case '-total_finance_hold':
        return Number(right.total_finance_hold) - Number(left.total_finance_hold);
      case '-total_quantity':
        return Number(right.total_quantity) - Number(left.total_quantity);
      default:
        return left.warehouse_name.localeCompare(right.warehouse_name);
    }
  }
}
