import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environments';
import { ApiResponse } from '../models/auth.models';
import {
  AdjustmentFormData,
  BatchFormData,
  Category,
  CategoryFormData,
  CostAllocationReport,
  DepartmentRequest,
  DepartmentRequestFormData,
  GinFormData,
  GoodsIssueNote,
  InternalConsumptionReport,
  InventoryAuditLog,
  InventoryDashboard,
  MasterInventorySeedPreview,
  MasterInventorySeedResult,
  Item,
  ItemFormData,
  ItemSerialNumber,
  ProductionReceiptQueueItem,
  ReorderSuggestion,
  SerialNumberFormData,
  Stock,
  StockAdjustment,
  StockAlert,
  StockBatch,
  StockMovement,
  StockSummary,
  StockTake,
  StockTakeFormData,
  StockTransfer,
  TransferFormData,
  ValuationMethod,
  ValuationReport,
  Warehouse,
  WarehouseFormData,
} from '../models/inventory.model';
import { ListParams, PaginatedData } from '../models/paginated.model';
import { buildHttpParams, unwrapApi } from '../utils/api.util';
import { aggregateStockByItem } from '../../modules/inventory/utils/stock.util';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/inventory`;

  getDashboard(warehouseId?: number | null): Observable<InventoryDashboard> {
    const params = warehouseId ? { warehouse: warehouseId } : {};
    return this.http
      .get<ApiResponse<InventoryDashboard>>(`${this.baseUrl}/dashboard/`, {
        params: buildHttpParams(params),
      })
      .pipe(unwrapApi());
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
    return this.getStock({ page_size: 100, ...params }).pipe(
      map((page) => page.results),
    );
  }

  getStockSummary(params: ListParams = {}): Observable<StockSummary> {
    return this.http
      .get<ApiResponse<StockSummary>>(`${this.baseUrl}/stock/summary/`, {
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

  getStockQuantitiesByItem(): Observable<Map<number, number>> {
    return this.getAllStock().pipe(map((stocks) => aggregateStockByItem(stocks)));
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
}
