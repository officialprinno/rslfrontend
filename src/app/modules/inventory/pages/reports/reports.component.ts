import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { InventoryService } from '../../../../core/services/inventory.service';
import { exportToExcel } from '../../../../core/utils/export.util';
import { formatCurrency, formatDateTime, formatNumber } from '../../../../core/utils/format.util';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { InventoryNavComponent } from '../../components/inventory-nav/inventory-nav.component';

interface ReportCard {
  title: string;
  description: string;
  route: string;
  exportable: boolean;
  exportKey: 'stock' | 'movements' | 'valuation' | 'reorder' | 'gin' | 'internal' | 'cost' | 'audit' | null;
}

@Component({
  selector: 'app-reports',
  imports: [RouterLink, PageHeaderComponent, InventoryNavComponent],
  templateUrl: './reports.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsComponent {
  private readonly inventory = inject(InventoryService);

  readonly exporting = signal<string | null>(null);

  readonly cards: ReportCard[] = [
    { title: 'Stock Overview', description: 'Current stock levels by item and warehouse', route: '/inventory/stock', exportable: true, exportKey: 'stock' },
    { title: 'Stock Movements', description: 'Inbound, outbound, and transfer history', route: '/inventory/movements', exportable: true, exportKey: 'movements' },
    { title: 'Inventory Valuation', description: 'Value by category, warehouse, and costing method', route: '/inventory/valuation', exportable: true, exportKey: 'valuation' },
    { title: 'Reorder Suggestions', description: 'Items below reorder level with priority', route: '/inventory/reorder', exportable: true, exportKey: 'reorder' },
    { title: 'Goods Issue Notes', description: 'Department stock issues and approvals', route: '/inventory/gin', exportable: true, exportKey: 'gin' },
    { title: 'Goods Received Notes', description: 'Inbound receipts from procurement', route: '/inventory/grn', exportable: false, exportKey: null },
    {
      title: 'Internal Consumption',
      description: 'Department usage, most consumed items, and monthly trends',
      route: '/inventory/my-requests',
      exportable: true,
      exportKey: 'internal',
    },
    {
      title: 'Cost Allocation',
      description: 'Internal consumption cost by department',
      route: '/inventory/department-requests',
      exportable: true,
      exportKey: 'cost',
    },
    {
      title: 'Inventory Audit Trail',
      description: 'Immutable activity log for inventory changes',
      route: '/inventory/movements',
      exportable: true,
      exportKey: 'audit',
    },
  ];

  exportReport(key: NonNullable<ReportCard['exportKey']>): void {
    this.exporting.set(key);
    const done = () => this.exporting.set(null);

    if (key === 'stock') {
      this.inventory.getStock({ page_size: 500 })
        .pipe(finalize(done))
        .subscribe((d) => exportToExcel('stock-report', [
          { key: 'item_code', label: 'Item Code' },
          { key: 'item_name', label: 'Item' },
          { key: 'warehouse_name', label: 'Warehouse' },
          { key: 'quantity_on_hand', label: 'Quantity', format: (r) => formatNumber(r.quantity_on_hand) },
        ], d.results));
      return;
    }

    if (key === 'movements') {
      this.inventory.getMovements({ page_size: 500, ordering: '-created_at' })
        .pipe(finalize(done))
        .subscribe((d) => exportToExcel('movements-report', [
          { key: 'created_at', label: 'Date', format: (r) => formatDateTime(r.created_at) },
          { key: 'item_name', label: 'Item' },
          { key: 'movement_type', label: 'Type' },
          { key: 'quantity', label: 'Quantity', format: (r) => formatNumber(r.quantity) },
        ], d.results));
      return;
    }

    if (key === 'valuation') {
      this.inventory.getValuation('WEIGHTED_AVERAGE')
        .pipe(finalize(done))
        .subscribe((r) => exportToExcel('valuation-report', [
          { key: 'item_code', label: 'Item Code' },
          { key: 'item_name', label: 'Item' },
          { key: 'total_value', label: 'Value', format: (row) => formatCurrency(row.total_value) },
        ], r.items));
      return;
    }

    if (key === 'reorder') {
      this.inventory.getReorderSuggestions()
        .pipe(finalize(done))
        .subscribe((s) => exportToExcel('reorder-report', [
          { key: 'item_code', label: 'Item Code' },
          { key: 'priority', label: 'Priority' },
          { key: 'suggested_quantity', label: 'Suggested Qty', format: (r) => formatNumber(r.suggested_quantity) },
        ], s));
      return;
    }

    if (key === 'gin') {
      this.inventory.getGINs({ page_size: 500 })
        .pipe(finalize(done))
        .subscribe((d) => exportToExcel('gin-report', [
          { key: 'gin_number', label: 'GIN Number' },
          { key: 'department', label: 'Department' },
          { key: 'status', label: 'Status' },
        ], d.results));
      return;
    }

    if (key === 'internal') {
      this.inventory.getInternalConsumptionReport()
        .pipe(finalize(done))
        .subscribe((r) => exportToExcel('internal-consumption-report', [
          { key: 'item_code', label: 'Item Code' },
          { key: 'item_name', label: 'Item' },
          { key: 'quantity', label: 'Qty', format: (row) => formatNumber(row.quantity) },
          { key: 'total_cost', label: 'Cost', format: (row) => formatCurrency(row.total_cost) },
          { key: 'request_count', label: 'Requests' },
        ], r.most_consumed_items));
      return;
    }

    if (key === 'cost') {
      this.inventory.getCostAllocationReport()
        .pipe(finalize(done))
        .subscribe((r) => exportToExcel('cost-allocation-report', [
          { key: 'department', label: 'Department' },
          { key: 'consumption_cost', label: 'Cost', format: (row) => formatCurrency(row.consumption_cost) },
          { key: 'request_count', label: 'Requests' },
          { key: 'share_percent', label: 'Share %' },
        ], r.allocations));
      return;
    }

    if (key === 'audit') {
      this.inventory.getInventoryAuditLogs({ page_size: 500, ordering: '-created_at' })
        .pipe(finalize(done))
        .subscribe((d) => exportToExcel('inventory-audit-log', [
          { key: 'created_at', label: 'Date', format: (row) => formatDateTime(row.created_at) },
          { key: 'action', label: 'Action' },
          { key: 'record_id', label: 'Record' },
          { key: 'user_name', label: 'User' },
        ], d.results));
    }
  }
}
