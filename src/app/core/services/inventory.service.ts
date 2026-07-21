import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { environment } from '../../environments/environments';
import { mergeSalesLineItemLists } from '../../modules/sales/utils/sales-line-items.util';
import { dashboardHttpParams } from '../../shared/dashboard';
import { DashboardCacheService } from '../../shared/dashboard/services/dashboard-cache.service';
import { DateRangeValue } from '../../shared/dashboard/models/dashboard.types';
import { ApiResponse } from '../models/auth.models';
import {
  AdjustmentFormData,
  BatchFormData,
  Category,
  CategoryFormData,
  CostAllocationReport,
  DamageReport,
  DamageReportFormData,
  DepartmentRequest,
  DepartmentRequestFormData,
  GinFormData,
  GoodsIssueNote,
  InternalConsumptionReport,
  InventoryAuditLog,
  InventoryDashboard,
  InventorySalesOrder,
  InventorySalesOrderDetail,
  InventorySalesStockQueue,
  MasterInventorySeedPreview,
  MasterInventorySeedResult,
  Item,
  ItemFormData,
  ItemSerialNumber,
  ProductionReceiptQueueItem,
  ReorderSuggestion,
  SerialNumberFormData,
  Stock,
  StockReservationBreakdown,
  StockAdjustment,
  StockAlert,
  StockBatch,
  StockMovement,
  StockOverviewPage,
  StockSummary,
  StockTake,
  StockTakeCsvUploadResult,
  StockTakeFormData,
  StockTakeSession,
  StockTakeSessionLine,
  StockTakeSessionPreview,
  StockTakeSettings,
  StockTakeVarianceReview,
  StockTakeWarehouseOption,
  StockTakeWarehousePickerPayload,
  StockTransfer,
  SupplierOrderTracking,
  SupplierOrderTrackingUpdate,
  SupplierPortalRespondData,
  SupplierPortalTracking,
  TransferFormData,
  ValuationMethod,
  ValuationReport,
  Warehouse,
  WarehouseFormData,
} from '../models/inventory.model';
import { ListParams, PaginatedData } from '../models/paginated.model';
import { SOStockCheck } from '../models/sales.model';
import { buildHttpParams, unwrapApi, unwrapApiWithMessage } from '../utils/api.util';
import { fetchCachedDashboard } from '../utils/dashboard-fetch.util';
import { aggregateAvailableStockByItem, aggregateStockByItem } from '../../modules/inventory/utils/stock.util';
import { groupAvailableStockByItemWarehouse, ItemWarehouseAvailability } from '../../modules/sales/utils/sales-stock.util';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly http = inject(HttpClient);
  private readonly dashCache = inject(DashboardCacheService);
  private readonly baseUrl = `${environment.apiUrl}/inventory`;
  private readonly supplierBaseUrl = `${environment.apiUrl}/supplier`;

  getDashboard(
    warehouseId?: number | null,
    range?: DateRangeValue | null,
    bypassCache = false,
  ): Observable<InventoryDashboard> {
    const url = `${this.baseUrl}/dashboard/`;
    const params = dashboardHttpParams(range, {
      warehouse: warehouseId ?? undefined,
    });
    return fetchCachedDashboard<InventoryDashboard>(
      this.http,
      this.dashCache,
      url,
      params,
      bypassCache,
    );
  }

  getMasterSeedPreview(): Observable<MasterInventorySeedPreview> {
    return this.http
      .get<ApiResponse<MasterInventorySeedPreview>>(`${this.baseUrl}/seed/master/`)
      .pipe(unwrapApi());
  }

  seedMasterInventory(update = false): Observable<MasterInventorySeedResult> {
    return this.http
      .post<ApiResponse<MasterInventorySeedResult>>(`${this.baseUrl}/seed/master/`, { update })
      .pipe(unwrapApi());
  }

  getCategories(params: ListParams = {}): Observable<Category[]> {
    return this.http
      .get<ApiResponse<PaginatedData<Category>>>(`${this.baseUrl}/categories/`, {
        params: buildHttpParams({ page_size: 200, ...params }),
      })
      .pipe(
        unwrapApi(),
        map((data) => data.results),
      );
  }

  createCategory(data: CategoryFormData): Observable<Category> {
    return this.http
      .post<ApiResponse<Category>>(`${this.baseUrl}/categories/`, data)
      .pipe(unwrapApi());
  }

  updateCategory(id: number, data: CategoryFormData): Observable<Category> {
    return this.http
      .patch<ApiResponse<Category>>(`${this.baseUrl}/categories/${id}/`, data)
      .pipe(unwrapApi());
  }

  deleteCategory(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<null>>(`${this.baseUrl}/categories/${id}/`)
      .pipe(map(() => undefined));
  }

  getItems(params: ListParams = {}): Observable<PaginatedData<Item>> {
    return this.http
      .get<ApiResponse<PaginatedData<Item>>>(`${this.baseUrl}/items/`, {
        params: buildHttpParams(params),
      })
      .pipe(unwrapApi());
  }

  /** Ready + not-ready commercial stock for quotation / sales order line pickers. */
  getSalesLineItems(): Observable<Item[]> {
    const base = { page_size: 500, is_active: true };
    return forkJoin({
      ready: this.getItems({ ...base, for_sales: true }),
      stock: this.getItems({ ...base, for_sales_lines: true }),
    }).pipe(
      map(({ ready, stock }) => mergeSalesLineItemLists(ready.results, stock.results)),
    );
  }

  getItem(id: number): Observable<Item> {
    return this.http
      .get<ApiResponse<Item>>(`${this.baseUrl}/items/${id}/`)
      .pipe(unwrapApi());
  }

  createItem(data: ItemFormData): Observable<Item> {
    return this.http
      .post<ApiResponse<Item>>(`${this.baseUrl}/items/`, data)
      .pipe(unwrapApi());
  }

  updateItem(id: number, data: ItemFormData): Observable<Item> {
    return this.http
      .patch<ApiResponse<Item>>(`${this.baseUrl}/items/${id}/`, data)
      .pipe(unwrapApi());
  }

  deleteItem(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<null>>(`${this.baseUrl}/items/${id}/`)
      .pipe(map(() => undefined));
  }

  getWarehouses(params: ListParams = {}): Observable<Warehouse[]> {
    return this.http
      .get<ApiResponse<PaginatedData<Warehouse>>>(`${this.baseUrl}/warehouses/`, {
        params: buildHttpParams({ page_size: 100, ...params }),
      })
      .pipe(
        unwrapApi(),
        map((data) => data.results),
      );
  }

  createWarehouse(data: WarehouseFormData): Observable<Warehouse> {
    return this.http
      .post<ApiResponse<Warehouse>>(`${this.baseUrl}/warehouses/`, data)
      .pipe(unwrapApi());
  }

  updateWarehouse(id: number, data: WarehouseFormData): Observable<Warehouse> {
    return this.http
      .patch<ApiResponse<Warehouse>>(`${this.baseUrl}/warehouses/${id}/`, data)
      .pipe(unwrapApi());
  }

  getStock(params: ListParams = {}): Observable<PaginatedData<Stock>> {
    return this.http
      .get<ApiResponse<PaginatedData<Stock>>>(`${this.baseUrl}/stock/`, {
        params: buildHttpParams(params),
      })
      .pipe(unwrapApi());
  }

  getAllStock(params: ListParams = {}): Observable<Stock[]> {
    const pageSize = 200;
    const fetchPage = (page: number, acc: Stock[]): Observable<Stock[]> =>
      this.getStock({ page_size: pageSize, page, ...params }).pipe(
        switchMap((data) => {
          const merged = acc.concat(data.results);
          return data.next ? fetchPage(page + 1, merged) : of(merged);
        }),
      );
    return fetchPage(1, []);
  }

  getStockSummary(params: ListParams = {}): Observable<StockSummary> {
    return this.http
      .get<ApiResponse<StockSummary>>(`${this.baseUrl}/stock/summary/`, {
        params: buildHttpParams(params),
      })
      .pipe(unwrapApi());
  }

  getStockOverview(params: ListParams = {}): Observable<StockOverviewPage> {
    return this.http
      .get<ApiResponse<StockOverviewPage>>(`${this.baseUrl}/stock-overview/`, {
        params: buildHttpParams(params),
      })
      .pipe(unwrapApi());
  }

  reserveStock(stockId: number, quantity: number, notes = ''): Observable<Stock> {
    return this.http
      .post<ApiResponse<Stock>>(`${this.baseUrl}/stock/${stockId}/reserve/`, { quantity, notes })
      .pipe(unwrapApi());
  }

  releaseStock(stockId: number, quantity: number, notes = ''): Observable<Stock> {
    return this.http
      .post<ApiResponse<Stock>>(`${this.baseUrl}/stock/${stockId}/release/`, { quantity, notes })
      .pipe(unwrapApi());
  }

  /** Return reserved qty that is not linked to any active sales order line. */
  releaseUnallocatedReservedStock(
    stockId: number,
    notes = '',
  ): Observable<{
    stock: Stock;
    breakdown: StockReservationBreakdown;
    released_qty: string | number;
  }> {
    return this.http
      .post<
        ApiResponse<{
          stock: Stock;
          breakdown: StockReservationBreakdown;
          released_qty: string | number;
        }>
      >(`${this.baseUrl}/stock/${stockId}/release-unallocated/`, { notes })
      .pipe(unwrapApi());
  }

  getStockReservationBreakdown(stockId: number): Observable<StockReservationBreakdown> {
    return this.http
      .get<ApiResponse<StockReservationBreakdown>>(
        `${this.baseUrl}/stock/${stockId}/reservation-breakdown/`,
      )
      .pipe(unwrapApi());
  }

  getStockQuantitiesByItem(): Observable<Map<number, number>> {
    return this.getAllStock().pipe(map((stocks) => aggregateStockByItem(stocks)));
  }

  /** Available stock per item for the active company (respects X-Company-ID header). */
  getAvailableStockQuantitiesByItem(): Observable<Map<number, number>> {
    return this.getAllStock().pipe(map((stocks) => aggregateAvailableStockByItem(stocks)));
  }

  /** Available stock per item broken down by warehouse. */
  getAvailableStockByItemWarehouse(): Observable<Map<number, ItemWarehouseAvailability[]>> {
    return this.getAllStock().pipe(map((stocks) => groupAvailableStockByItemWarehouse(stocks)));
  }

  getMovements(params: ListParams = {}): Observable<PaginatedData<StockMovement>> {
    return this.http
      .get<ApiResponse<PaginatedData<StockMovement>>>(`${this.baseUrl}/movements/`, {
        params: buildHttpParams(params),
      })
      .pipe(unwrapApi());
  }

  getAdjustments(params: ListParams = {}): Observable<PaginatedData<StockAdjustment>> {
    return this.http
      .get<ApiResponse<PaginatedData<StockAdjustment>>>(`${this.baseUrl}/adjustments/`, {
        params: buildHttpParams(params),
      })
      .pipe(unwrapApi());
  }

  createAdjustment(data: AdjustmentFormData): Observable<StockAdjustment> {
    return this.http
      .post<ApiResponse<StockAdjustment>>(`${this.baseUrl}/adjustments/`, data)
      .pipe(unwrapApi());
  }

  approveAdjustment(id: number): Observable<StockAdjustment> {
    return this.http
      .post<ApiResponse<StockAdjustment>>(`${this.baseUrl}/adjustments/${id}/approve/`, {})
      .pipe(unwrapApi());
  }

  rejectAdjustment(id: number): Observable<StockAdjustment> {
    return this.http
      .post<ApiResponse<StockAdjustment>>(`${this.baseUrl}/adjustments/${id}/reject/`, {})
      .pipe(unwrapApi());
  }

  getDamageReports(params: ListParams = {}): Observable<PaginatedData<DamageReport>> {
    return this.http
      .get<ApiResponse<PaginatedData<DamageReport>>>(`${this.baseUrl}/damage-reports/`, {
        params: buildHttpParams(params),
      })
      .pipe(unwrapApi());
  }

  getDamageReport(id: number): Observable<DamageReport> {
    return this.http
      .get<ApiResponse<DamageReport>>(`${this.baseUrl}/damage-reports/${id}/`)
      .pipe(unwrapApi());
  }

  createDamageReport(data: DamageReportFormData): Observable<DamageReport> {
    const form = new FormData();
    form.append('item', String(data.item));
    form.append('warehouse', String(data.warehouse));
    form.append('quantity_affected', String(data.quantity_affected));
    form.append('damage_type', data.damage_type);
    form.append('description', data.description);
    if (data.serial_numbers?.length) {
      form.append('serial_numbers', JSON.stringify(data.serial_numbers));
    }
    if (data.batch_numbers?.length) {
      form.append('batch_numbers', JSON.stringify(data.batch_numbers));
    }
    for (const file of data.attachments ?? []) {
      form.append('attachments', file);
    }
    return this.http
      .post<ApiResponse<DamageReport>>(`${this.baseUrl}/damage-reports/`, form)
      .pipe(unwrapApi());
  }

  resolveDamageReport(
    id: number,
    resolution: 'REVIEWED' | 'WRITTEN_OFF' | 'RECOVERED',
    resolutionNotes = '',
  ): Observable<DamageReport> {
    return this.http
      .post<ApiResponse<DamageReport>>(`${this.baseUrl}/damage-reports/${id}/resolve/`, {
        resolution,
        resolution_notes: resolutionNotes,
      })
      .pipe(unwrapApi());
  }

  gmApproveDamageReport(id: number): Observable<DamageReport> {
    return this.http
      .post<ApiResponse<DamageReport>>(`${this.baseUrl}/damage-reports/${id}/gm-approve/`, {})
      .pipe(unwrapApi());
  }

  gmRejectDamageReport(id: number, reason = ''): Observable<DamageReport> {
    return this.http
      .post<ApiResponse<DamageReport>>(`${this.baseUrl}/damage-reports/${id}/gm-reject/`, {
        reason,
      })
      .pipe(unwrapApi());
  }

  getOrderTracking(params: ListParams = {}): Observable<PaginatedData<SupplierOrderTracking>> {
    return this.http
      .get<ApiResponse<PaginatedData<SupplierOrderTracking>>>(
        `${this.baseUrl}/order-tracking/`,
        { params: buildHttpParams(params) },
      )
      .pipe(unwrapApi());
  }

  updateOrderTracking(
    id: number,
    data: SupplierOrderTrackingUpdate,
  ): Observable<SupplierOrderTracking> {
    return this.http
      .patch<ApiResponse<SupplierOrderTracking>>(
        `${this.baseUrl}/order-tracking/${id}/`,
        data,
      )
      .pipe(unwrapApi());
  }

  regenerateOrderTrackingToken(
    id: number,
  ): Observable<{ portal_url: string } & SupplierOrderTracking> {
    return this.http
      .post<ApiResponse<{ portal_url: string } & SupplierOrderTracking>>(
        `${this.baseUrl}/order-tracking/${id}/regenerate-token/`,
        {},
      )
      .pipe(unwrapApi());
  }

  sendOrderTrackingStatusRequest(
    id: number,
  ): Observable<{ portal_url: string; email: string } & SupplierOrderTracking> {
    return this.http
      .post<ApiResponse<{ portal_url: string; email: string } & SupplierOrderTracking>>(
        `${this.baseUrl}/order-tracking/${id}/send-status-request/`,
        {},
      )
      .pipe(unwrapApi());
  }

  getSupplierTrackingByToken(token: string): Observable<SupplierPortalTracking> {
    return this.http
      .get<ApiResponse<SupplierPortalTracking>>(`${this.supplierBaseUrl}/track/${token}/`)
      .pipe(unwrapApi());
  }

  respondSupplierTracking(
    token: string,
    data: SupplierPortalRespondData,
  ): Observable<SupplierPortalTracking> {
    return this.http
      .post<ApiResponse<SupplierPortalTracking>>(
        `${this.supplierBaseUrl}/track/${token}/respond/`,
        data,
      )
      .pipe(unwrapApi());
  }

  getAlerts(params: ListParams = {}): Observable<StockAlert[]> {
    return this.http
      .get<ApiResponse<PaginatedData<StockAlert>>>(`${this.baseUrl}/alerts/`, {
        params: buildHttpParams({ page_size: 200, ...params }),
      })
      .pipe(
        unwrapApi(),
        map((data) => data.results),
      );
  }

  markAlertRead(id: number): Observable<StockAlert> {
    return this.http
      .post<ApiResponse<StockAlert>>(`${this.baseUrl}/alerts/${id}/mark_read/`, {})
      .pipe(unwrapApi());
  }

  getSerialNumbers(params: ListParams = {}): Observable<PaginatedData<ItemSerialNumber>> {
    return this.http
      .get<ApiResponse<PaginatedData<ItemSerialNumber>>>(`${this.baseUrl}/serial-numbers/`, {
        params: buildHttpParams(params),
      })
      .pipe(unwrapApi());
  }

  createSerialNumber(data: SerialNumberFormData): Observable<ItemSerialNumber> {
    return this.http
      .post<ApiResponse<ItemSerialNumber>>(`${this.baseUrl}/serial-numbers/`, data)
      .pipe(unwrapApi());
  }

  getBatches(params: ListParams = {}): Observable<PaginatedData<StockBatch>> {
    return this.http
      .get<ApiResponse<PaginatedData<StockBatch>>>(`${this.baseUrl}/batches/`, {
        params: buildHttpParams(params),
      })
      .pipe(unwrapApi());
  }

  createBatch(data: BatchFormData): Observable<StockBatch> {
    return this.http
      .post<ApiResponse<StockBatch>>(`${this.baseUrl}/batches/`, data)
      .pipe(unwrapApi());
  }

  getTransfers(params: ListParams = {}): Observable<PaginatedData<StockTransfer>> {
    return this.http
      .get<ApiResponse<PaginatedData<StockTransfer>>>(`${this.baseUrl}/transfers/`, {
        params: buildHttpParams(params),
      })
      .pipe(unwrapApi());
  }

  createTransfer(data: TransferFormData): Observable<StockTransfer> {
    return this.http
      .post<ApiResponse<StockTransfer>>(`${this.baseUrl}/transfers/`, data)
      .pipe(unwrapApi());
  }

  approveTransfer(id: number): Observable<StockTransfer> {
    return this.http
      .post<ApiResponse<StockTransfer>>(`${this.baseUrl}/transfers/${id}/approve/`, {})
      .pipe(unwrapApi());
  }

  completeTransfer(id: number): Observable<StockTransfer> {
    return this.http
      .post<ApiResponse<StockTransfer>>(`${this.baseUrl}/transfers/${id}/complete/`, {})
      .pipe(unwrapApi());
  }

  rejectTransfer(id: number): Observable<StockTransfer> {
    return this.http
      .post<ApiResponse<StockTransfer>>(`${this.baseUrl}/transfers/${id}/reject/`, {})
      .pipe(unwrapApi());
  }

  getDepartmentRequests(params: ListParams = {}): Observable<PaginatedData<DepartmentRequest>> {
    return this.http
      .get<ApiResponse<PaginatedData<DepartmentRequest>>>(
        `${this.baseUrl}/department-requests/`,
        { params: buildHttpParams(params) },
      )
      .pipe(unwrapApi());
  }

  createDepartmentRequest(data: DepartmentRequestFormData): Observable<DepartmentRequest> {
    return this.http
      .post<ApiResponse<DepartmentRequest>>(`${this.baseUrl}/department-requests/`, data)
      .pipe(unwrapApi());
  }

  approveDepartmentRequest(id: number, comment = ''): Observable<DepartmentRequest> {
    return this.http
      .post<ApiResponse<DepartmentRequest>>(
        `${this.baseUrl}/department-requests/${id}/approve/`,
        { comment },
      )
      .pipe(unwrapApi());
  }

  issueDepartmentRequest(
    id: number,
    lines?: { line_id: number; quantity: number }[],
  ): Observable<DepartmentRequest> {
    return this.http
      .post<ApiResponse<DepartmentRequest>>(
        `${this.baseUrl}/department-requests/${id}/issue/`,
        lines?.length ? { lines } : {},
      )
      .pipe(unwrapApi());
  }

  rejectDepartmentRequest(id: number, reason = ''): Observable<DepartmentRequest> {
    return this.http
      .post<ApiResponse<DepartmentRequest>>(
        `${this.baseUrl}/department-requests/${id}/reject/`,
        { reason },
      )
      .pipe(unwrapApi());
  }

  submitDepartmentRequest(id: number): Observable<DepartmentRequest> {
    return this.http
      .post<ApiResponse<DepartmentRequest>>(
        `${this.baseUrl}/department-requests/${id}/submit/`,
        {},
      )
      .pipe(unwrapApi());
  }

  cancelDepartmentRequest(id: number): Observable<void> {
    return this.http
      .post<ApiResponse<null>>(`${this.baseUrl}/department-requests/${id}/cancel/`, {})
      .pipe(map(() => undefined));
  }

  bulkApproveDepartmentRequests(ids: number[], comment = ''): Observable<DepartmentRequest[]> {
    return this.http
      .post<ApiResponse<DepartmentRequest[]>>(
        `${this.baseUrl}/department-requests/bulk_approve/`,
        { ids, comment },
      )
      .pipe(unwrapApi());
  }

  issueDepartmentRequestPartial(
    id: number,
    lines: { line_id: number; quantity: number }[],
  ): Observable<DepartmentRequest> {
    return this.http
      .post<ApiResponse<DepartmentRequest>>(
        `${this.baseUrl}/department-requests/${id}/partial-issue/`,
        { lines, partial: true },
      )
      .pipe(unwrapApi());
  }

  getInternalConsumptionReport(params: Record<string, string> = {}): Observable<InternalConsumptionReport> {
    return this.http
      .get<ApiResponse<InternalConsumptionReport>>(
        `${this.baseUrl}/reports/internal-consumption/`,
        { params: buildHttpParams(params) },
      )
      .pipe(unwrapApi());
  }

  getCostAllocationReport(month?: string): Observable<CostAllocationReport> {
    return this.http
      .get<ApiResponse<CostAllocationReport>>(`${this.baseUrl}/reports/cost-allocation/`, {
        params: buildHttpParams(month ? { month } : {}),
      })
      .pipe(unwrapApi());
  }

  createSuggestedPurchaseRequisition(priorities?: string[]): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.baseUrl}/reorder-suggestions/`, {
        priorities: priorities ?? ['CRITICAL', 'HIGH'],
      })
      .pipe(unwrapApi());
  }

  getInventoryAuditLogs(params: ListParams = {}): Observable<PaginatedData<InventoryAuditLog>> {
    return this.http
      .get<ApiResponse<PaginatedData<InventoryAuditLog>>>(`${environment.apiUrl}/core/audit-logs/`, {
        params: buildHttpParams({ module: 'inventory', ...params }),
      })
      .pipe(unwrapApi());
  }

  getProductionReceiptQueue(): Observable<ProductionReceiptQueueItem[]> {
    return this.http
      .get<ApiResponse<ProductionReceiptQueueItem[]>>(`${this.baseUrl}/production-receipts/`)
      .pipe(unwrapApi());
  }

  receiveProductionReceipt(
    workOrderId: number,
    data: { warehouse: number; quantity_received: number; batch_number?: string; notes?: string },
  ): Observable<ProductionReceiptQueueItem> {
    return this.http
      .post<ApiResponse<ProductionReceiptQueueItem>>(
        `${this.baseUrl}/production-receipts/${workOrderId}/receive/`,
        data,
      )
      .pipe(unwrapApi());
  }

  getGINs(params: ListParams = {}): Observable<PaginatedData<GoodsIssueNote>> {
    return this.http
      .get<ApiResponse<PaginatedData<GoodsIssueNote>>>(`${this.baseUrl}/gins/`, {
        params: buildHttpParams(params),
      })
      .pipe(unwrapApi());
  }

  createGIN(data: GinFormData): Observable<GoodsIssueNote> {
    return this.http
      .post<ApiResponse<GoodsIssueNote>>(`${this.baseUrl}/gins/`, data)
      .pipe(unwrapApi());
  }

  approveGIN(id: number): Observable<GoodsIssueNote> {
    return this.http
      .post<ApiResponse<GoodsIssueNote>>(`${this.baseUrl}/gins/${id}/approve/`, {})
      .pipe(unwrapApi());
  }

  rejectGIN(id: number): Observable<GoodsIssueNote> {
    return this.http
      .post<ApiResponse<GoodsIssueNote>>(`${this.baseUrl}/gins/${id}/reject/`, {})
      .pipe(unwrapApi());
  }

  getStockTakes(params: ListParams = {}): Observable<PaginatedData<StockTake>> {
    return this.http
      .get<ApiResponse<PaginatedData<StockTake>>>(`${this.baseUrl}/stock-takes/`, {
        params: buildHttpParams(params),
      })
      .pipe(unwrapApi());
  }

  createStockTake(data: StockTakeFormData): Observable<StockTake> {
    return this.http
      .post<ApiResponse<StockTake>>(`${this.baseUrl}/stock-takes/`, data)
      .pipe(unwrapApi());
  }

  approveStockTake(id: number): Observable<StockTake> {
    return this.http
      .post<ApiResponse<StockTake>>(`${this.baseUrl}/stock-takes/${id}/approve/`, {})
      .pipe(unwrapApi());
  }

  rejectStockTake(id: number): Observable<StockTake> {
    return this.http
      .post<ApiResponse<StockTake>>(`${this.baseUrl}/stock-takes/${id}/reject/`, {})
      .pipe(unwrapApi());
  }

  // ── Monthly stock take sessions ─────────────────────────────────────

  getStockTakeSessions(params: ListParams = {}): Observable<PaginatedData<StockTakeSession>> {
    return this.http
      .get<ApiResponse<PaginatedData<StockTakeSession>>>(
        `${this.baseUrl}/stock-take-sessions/`,
        { params: buildHttpParams(params) },
      )
      .pipe(unwrapApi());
  }

  getStockTakeSession(id: number): Observable<StockTakeSession> {
    return this.http
      .get<ApiResponse<StockTakeSession>>(`${this.baseUrl}/stock-take-sessions/${id}/`)
      .pipe(unwrapApi());
  }

  getStockTakeSessionWarehouses(): Observable<StockTakeWarehousePickerPayload> {
    return this.http
      .get<ApiResponse<StockTakeWarehousePickerPayload>>(
        `${this.baseUrl}/stock-take-sessions/warehouses/`,
      )
      .pipe(unwrapApi());
  }

  getStockTakeSettings(): Observable<StockTakeSettings> {
    return this.http
      .get<ApiResponse<StockTakeSettings>>(
        `${this.baseUrl}/stock-take-sessions/window-settings/`,
      )
      .pipe(unwrapApi());
  }

  updateStockTakeSettings(data: {
    allow_outside_window: boolean;
  }): Observable<StockTakeSettings> {
    return this.http
      .patch<ApiResponse<StockTakeSettings>>(
        `${this.baseUrl}/stock-take-sessions/window-settings/`,
        data,
      )
      .pipe(unwrapApi());
  }

  getStockTakeSessionPreview(warehouseId: number): Observable<StockTakeSessionPreview> {
    return this.http
      .get<ApiResponse<StockTakeSessionPreview>>(
        `${this.baseUrl}/stock-take-sessions/preview/`,
        { params: buildHttpParams({ warehouse: warehouseId }) },
      )
      .pipe(unwrapApi());
  }

  startStockTakeSession(data: {
    warehouse: number;
    notes?: string;
  }): Observable<StockTakeSession> {
    return this.http
      .post<ApiResponse<StockTakeSession>>(
        `${this.baseUrl}/stock-take-sessions/start/`,
        data,
      )
      .pipe(unwrapApi());
  }

  getStockTakeSessionLines(
    id: number,
    params: ListParams = {},
  ): Observable<PaginatedData<StockTakeSessionLine>> {
    return this.http
      .get<ApiResponse<PaginatedData<StockTakeSessionLine>>>(
        `${this.baseUrl}/stock-take-sessions/${id}/lines/`,
        { params: buildHttpParams(params) },
      )
      .pipe(unwrapApi());
  }

  exportStockTakeSessionCsv(id: number, params: ListParams = {}): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/stock-take-sessions/${id}/export-csv/`, {
      params: buildHttpParams(params),
      responseType: 'blob',
    });
  }

  uploadStockTakeSessionCsv(id: number, file: File): Observable<StockTakeCsvUploadResult> {
    const form = new FormData();
    form.append('file', file);
    return this.http
      .post<ApiResponse<StockTakeCsvUploadResult>>(
        `${this.baseUrl}/stock-take-sessions/${id}/upload-csv/`,
        form,
      )
      .pipe(unwrapApi());
  }

  getStockTakeVarianceReview(id: number): Observable<StockTakeVarianceReview> {
    return this.http
      .get<ApiResponse<StockTakeVarianceReview>>(
        `${this.baseUrl}/stock-take-sessions/${id}/variance-review/`,
      )
      .pipe(unwrapApi());
  }

  markStockTakeSessionReviewed(id: number): Observable<StockTakeSession> {
    return this.http
      .post<ApiResponse<StockTakeSession>>(
        `${this.baseUrl}/stock-take-sessions/${id}/mark-reviewed/`,
        {},
      )
      .pipe(unwrapApi());
  }

  submitStockTakeSessionForGm(id: number): Observable<StockTakeSession> {
    return this.http
      .post<ApiResponse<StockTakeSession>>(
        `${this.baseUrl}/stock-take-sessions/${id}/submit-for-gm/`,
        {},
      )
      .pipe(unwrapApi());
  }

  gmApproveStockTakeSession(id: number): Observable<StockTakeSession> {
    return this.http
      .post<ApiResponse<StockTakeSession>>(
        `${this.baseUrl}/stock-take-sessions/${id}/gm-approve/`,
        {},
      )
      .pipe(unwrapApi());
  }

  gmRejectStockTakeSession(id: number, notes = ''): Observable<StockTakeSession> {
    return this.http
      .post<ApiResponse<StockTakeSession>>(
        `${this.baseUrl}/stock-take-sessions/${id}/gm-reject/`,
        { notes },
      )
      .pipe(unwrapApi());
  }

  getValuation(method: ValuationMethod = 'WEIGHTED_AVERAGE'): Observable<ValuationReport> {
    return this.http
      .get<ApiResponse<ValuationReport>>(`${this.baseUrl}/valuation/`, {
        params: buildHttpParams({ method }),
      })
      .pipe(unwrapApi());
  }

  getReorderSuggestions(): Observable<ReorderSuggestion[]> {
    return this.http
      .get<ApiResponse<ReorderSuggestion[]>>(`${this.baseUrl}/reorder-suggestions/`)
      .pipe(unwrapApi());
  }

  getSalesOrdersForStockVerification(
    queue: InventorySalesStockQueue = 'pending',
    params: ListParams = {},
  ): Observable<PaginatedData<InventorySalesOrder>> {
    return this.http
      .get<ApiResponse<PaginatedData<InventorySalesOrder>>>(`${this.baseUrl}/sales-orders/`, {
        params: buildHttpParams({ page_size: 20, queue, ...params }),
      })
      .pipe(unwrapApi());
  }

  getSalesOrderForStockVerification(id: number): Observable<InventorySalesOrderDetail> {
    return this.http
      .get<ApiResponse<InventorySalesOrderDetail>>(`${this.baseUrl}/sales-orders/${id}/`)
      .pipe(unwrapApi());
  }

  getSalesOrderStockCheck(id: number): Observable<SOStockCheck> {
    return this.http
      .get<ApiResponse<SOStockCheck>>(`${this.baseUrl}/sales-orders/${id}/stock_check/`)
      .pipe(unwrapApi());
  }

  verifySalesOrderStock(
    id: number,
    partial = false,
  ): Observable<{ order: unknown; result: string; stock_check: SOStockCheck }> {
    return this.http
      .post<ApiResponse<{ order: unknown; result: string; stock_check: SOStockCheck }>>(
        `${this.baseUrl}/sales-orders/${id}/verify_stock/`,
        { partial },
      )
      .pipe(unwrapApi());
  }

  createSalesOrderProcurement(
    id: number,
  ): Observable<{ order: unknown; pr_number: string; pr_id: number }> {
    return this.http
      .post<ApiResponse<{ order: unknown; pr_number: string; pr_id: number }>>(
        `${this.baseUrl}/sales-orders/${id}/create_procurement/`,
        {},
      )
      .pipe(unwrapApi());
  }

  confirmSalesOrderHandover(
    id: number,
    notes = '',
  ): Observable<{ order: unknown }> {
    return this.http
      .post<ApiResponse<{ order: unknown }>>(
        `${this.baseUrl}/sales-orders/${id}/confirm_handover/`,
        { notes },
      )
      .pipe(unwrapApi());
  }

  prepareSalesOrderPickup(id: number, notes = ''): Observable<{ order: unknown }> {
    return this.http
      .post<ApiResponse<{ order: unknown }>>(
        `${this.baseUrl}/sales-orders/${id}/prepare_pickup/`,
        { notes },
      )
      .pipe(unwrapApi());
  }

  confirmCustomerPickup(
    id: number,
    data: {
      pickup_date: string;
      receiver_name: string;
      receiver_phone: string;
      signature_data?: string;
      notes?: string;
    },
  ): Observable<{ order: unknown }> {
    return this.http
      .post<ApiResponse<{ order: unknown }>>(
        `${this.baseUrl}/sales-orders/${id}/confirm_customer_pickup/`,
        data,
      )
      .pipe(unwrapApi());
  }

  getStockOutstandingOrders(
    params: ListParams = {},
  ): Observable<PaginatedData<import('../models/sales.model').StockOutstandingSalesOrder>> {
    return this.http
      .get<
        ApiResponse<
          PaginatedData<import('../models/sales.model').StockOutstandingSalesOrder>
        >
      >(`${this.baseUrl}/sales-orders/stock-outstanding/`, {
        params: buildHttpParams({ page_size: 20, ...params }),
      })
      .pipe(unwrapApi());
  }

  reserveAvailableSalesOrderStock(
    id: number,
  ): Observable<{ data: { order: unknown; stock_check: SOStockCheck }; message: string }> {
    return this.http
      .post<ApiResponse<{ order: unknown; stock_check: SOStockCheck }>>(
        `${this.baseUrl}/sales-orders/${id}/reserve-available/`,
        {},
      )
      .pipe(unwrapApiWithMessage());
  }
}
