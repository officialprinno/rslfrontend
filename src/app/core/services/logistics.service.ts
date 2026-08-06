import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environments';
import { dashboardHttpParams } from '../../shared/dashboard';
import { DashboardCacheService } from '../../shared/dashboard/services/dashboard-cache.service';
import { DateRangeValue } from '../../shared/dashboard/models/dashboard.types';
import { ApiResponse } from '../models/auth.models';
import { PaginatedData, ListParams } from '../models/paginated.model';
import {
  CompleteMaintenanceData,
  DeliveredFormData,
  DeliveryNote,
  DeliveryOrder,
  DOFormData,
  Driver,
  DriverEligibleEmployee,
  DriverFormData,
  FuelFormData,
  FuelRecord,
  FuelSummary,
  LogisticsDeliveryReportResponse,
  LogisticsDashboard,
  LogisticsSalesOrder,
  LogisticsSalesOrderDetail,
  LogisticsSalesQueue,
  MaintenanceFormData,
  Vehicle,
  VehicleFormData,
  VehicleHistory,
  VehicleMaintenance,
} from '../models/logistics.model';
import { buildHttpParams, unwrapApi, unwrapApiWithMeta } from '../utils/api.util';
import {
  GrnDestinationHint,
  InternalRoute,
  InternalRouteCreateData,
  InternalRouteMutationResult,
  InternalRouteUpdateData,
} from '../models/internal-route.model';
import { fetchCachedDashboard } from '../utils/dashboard-fetch.util';

@Injectable({ providedIn: 'root' })
export class LogisticsService {
  private readonly http = inject(HttpClient);
  private readonly dashCache = inject(DashboardCacheService);
  private readonly baseUrl = `${environment.apiUrl}/logistics`;

  // Vehicles
  getVehicles(params: ListParams = {}): Observable<PaginatedData<Vehicle>> {
    return this.http
      .get<ApiResponse<PaginatedData<Vehicle>>>(`${this.baseUrl}/vehicles/`, {
        params: buildHttpParams({ page_size: 20, ...params }),
      })
      .pipe(unwrapApi());
  }

  getVehicle(id: number): Observable<Vehicle> {
    return this.http.get<ApiResponse<Vehicle>>(`${this.baseUrl}/vehicles/${id}/`).pipe(unwrapApi());
  }

  createVehicle(data: VehicleFormData): Observable<Vehicle> {
    return this.http.post<ApiResponse<Vehicle>>(`${this.baseUrl}/vehicles/`, data).pipe(unwrapApi());
  }

  updateVehicle(id: number, data: VehicleFormData): Observable<Vehicle> {
    return this.http.patch<ApiResponse<Vehicle>>(`${this.baseUrl}/vehicles/${id}/`, data).pipe(unwrapApi());
  }

  deleteVehicle(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/vehicles/${id}/`).pipe(unwrapApi());
  }

  getVehicleHistory(id: number): Observable<VehicleHistory> {
    return this.http
      .get<ApiResponse<VehicleHistory>>(`${this.baseUrl}/vehicles/${id}/history/`)
      .pipe(unwrapApi());
  }

  // Drivers
  getDrivers(params: ListParams = {}): Observable<PaginatedData<Driver>> {
    return this.http
      .get<ApiResponse<PaginatedData<Driver>>>(`${this.baseUrl}/drivers/`, {
        params: buildHttpParams({ page_size: 20, ...params }),
      })
      .pipe(unwrapApi());
  }

  getDriver(id: number): Observable<Driver> {
    return this.http.get<ApiResponse<Driver>>(`${this.baseUrl}/drivers/${id}/`).pipe(unwrapApi());
  }

  getEligibleDriverEmployees(): Observable<DriverEligibleEmployee[]> {
    return this.http
      .get<ApiResponse<DriverEligibleEmployee[]>>(`${this.baseUrl}/drivers/eligible-employees/`)
      .pipe(unwrapApi());
  }

  createDriver(data: DriverFormData): Observable<Driver> {
    return this.http.post<ApiResponse<Driver>>(`${this.baseUrl}/drivers/`, data).pipe(unwrapApi());
  }

  updateDriver(id: number, data: DriverFormData): Observable<Driver> {
    return this.http.patch<ApiResponse<Driver>>(`${this.baseUrl}/drivers/${id}/`, data).pipe(unwrapApi());
  }

  deleteDriver(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/drivers/${id}/`).pipe(unwrapApi());
  }

  // Delivery Orders
  getDeliveryOrders(params: ListParams = {}): Observable<PaginatedData<DeliveryOrder>> {
    return this.http
      .get<ApiResponse<PaginatedData<DeliveryOrder>>>(`${this.baseUrl}/deliveries/`, {
        params: buildHttpParams({ page_size: 20, ...params }),
      })
      .pipe(unwrapApi());
  }

  getDeliveryOrder(id: number): Observable<DeliveryOrder> {
    return this.http
      .get<ApiResponse<DeliveryOrder>>(`${this.baseUrl}/deliveries/${id}/`)
      .pipe(unwrapApi());
  }

  recordInternalDeliveryCost(
    id: number,
    data: {
      delivery_distance_km?: number;
      transport_method?: string;
      fuel_cost?: number;
      loading_cost?: number;
      offloading_cost?: number;
      additional_charges?: number;
      notes?: string;
    },
  ): Observable<DeliveryOrder> {
    return this.http
      .post<ApiResponse<DeliveryOrder>>(`${this.baseUrl}/deliveries/${id}/record-internal-cost/`, data)
      .pipe(unwrapApi());
  }

  createDeliveryOrder(data: DOFormData): Observable<DeliveryOrder> {
    return this.http
      .post<ApiResponse<DeliveryOrder>>(`${this.baseUrl}/deliveries/`, data)
      .pipe(unwrapApi());
  }

  updateDeliveryOrder(id: number, data: DOFormData): Observable<DeliveryOrder> {
    return this.http
      .patch<ApiResponse<DeliveryOrder>>(`${this.baseUrl}/deliveries/${id}/`, data)
      .pipe(unwrapApi());
  }

  startTrip(id: number): Observable<DeliveryOrder> {
    return this.http
      .post<ApiResponse<DeliveryOrder>>(`${this.baseUrl}/deliveries/${id}/start/`, {})
      .pipe(unwrapApi());
  }

  markDelivered(id: number, data: DeliveredFormData): Observable<{ order: DeliveryOrder; delivery_note: DeliveryNote }> {
    return this.http
      .post<ApiResponse<{ order: DeliveryOrder; delivery_note: DeliveryNote }>>(
        `${this.baseUrl}/deliveries/${id}/deliver/`,
        data,
      )
      .pipe(unwrapApi());
  }

  markFailed(id: number, reason: string): Observable<DeliveryOrder> {
    return this.http
      .post<ApiResponse<DeliveryOrder>>(`${this.baseUrl}/deliveries/${id}/fail/`, { reason })
      .pipe(unwrapApi());
  }

  reviewDelivery(id: number, approved: boolean, reason = ''): Observable<DeliveryOrder> {
    return this.http
      .post<ApiResponse<DeliveryOrder>>(`${this.baseUrl}/deliveries/${id}/review/`, {
        approved,
        reason,
      })
      .pipe(unwrapApi());
  }

  cancelDeliveryOrder(id: number): Observable<DeliveryOrder> {
    return this.http
      .post<ApiResponse<DeliveryOrder>>(`${this.baseUrl}/deliveries/${id}/cancel/`, {})
      .pipe(unwrapApi());
  }

  deleteDeliveryOrder(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/deliveries/${id}/`).pipe(unwrapApi());
  }

  // Delivery Notes
  getDeliveryNotes(params: ListParams = {}): Observable<PaginatedData<DeliveryNote>> {
    return this.http
      .get<ApiResponse<PaginatedData<DeliveryNote>>>(`${this.baseUrl}/delivery-notes/`, {
        params: buildHttpParams({ page_size: 20, ...params }),
      })
      .pipe(unwrapApi());
  }

  getDeliveryNote(id: number): Observable<DeliveryNote> {
    return this.http
      .get<ApiResponse<DeliveryNote>>(`${this.baseUrl}/delivery-notes/${id}/`)
      .pipe(unwrapApi());
  }

  signDeliveryNote(id: number, data: DeliveredFormData): Observable<DeliveryNote> {
    return this.http
      .post<ApiResponse<DeliveryNote>>(`${this.baseUrl}/delivery-notes/${id}/sign/`, data)
      .pipe(unwrapApi());
  }

  downloadDeliveryNotePdf(id: number) {
    return this.http.get(`${this.baseUrl}/delivery-notes/${id}/download-pdf/`, {
      responseType: 'blob',
    });
  }

  // Maintenance
  getMaintenance(params: ListParams = {}): Observable<PaginatedData<VehicleMaintenance>> {
    return this.http
      .get<ApiResponse<PaginatedData<VehicleMaintenance>>>(`${this.baseUrl}/maintenance/`, {
        params: buildHttpParams({ page_size: 20, ...params }),
      })
      .pipe(unwrapApi());
  }

  scheduleMaintenance(data: MaintenanceFormData): Observable<VehicleMaintenance> {
    return this.http
      .post<ApiResponse<VehicleMaintenance>>(`${this.baseUrl}/maintenance/`, data)
      .pipe(unwrapApi());
  }

  updateMaintenance(id: number, data: Partial<MaintenanceFormData>): Observable<VehicleMaintenance> {
    return this.http
      .patch<ApiResponse<VehicleMaintenance>>(`${this.baseUrl}/maintenance/${id}/`, data)
      .pipe(unwrapApi());
  }

  completeMaintenance(id: number, data: CompleteMaintenanceData): Observable<VehicleMaintenance> {
    return this.http
      .post<ApiResponse<VehicleMaintenance>>(`${this.baseUrl}/maintenance/${id}/complete/`, data)
      .pipe(unwrapApi());
  }

  // Fuel
  getFuelRecords(params: ListParams = {}): Observable<PaginatedData<FuelRecord>> {
    return this.http
      .get<ApiResponse<PaginatedData<FuelRecord>>>(`${this.baseUrl}/fuel/`, {
        params: buildHttpParams({ page_size: 20, ...params }),
      })
      .pipe(unwrapApi());
  }

  recordFueling(data: FuelFormData): Observable<FuelRecord> {
    return this.http.post<ApiResponse<FuelRecord>>(`${this.baseUrl}/fuel/`, data).pipe(unwrapApi());
  }

  updateFuelRecord(id: number, data: Partial<FuelFormData>): Observable<FuelRecord> {
    return this.http.patch<ApiResponse<FuelRecord>>(`${this.baseUrl}/fuel/${id}/`, data).pipe(unwrapApi());
  }

  deleteFuelRecord(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/fuel/${id}/`).pipe(unwrapApi());
  }

  getFuelSummary(): Observable<FuelSummary> {
    return this.http
      .get<ApiResponse<FuelSummary>>(`${this.baseUrl}/fuel/summary/`)
      .pipe(unwrapApi());
  }

  // Dashboard
  getLogisticsDashboard(
    range?: DateRangeValue | null,
    bypassCache = false,
  ): Observable<LogisticsDashboard> {
    const url = `${this.baseUrl}/dashboard/`;
    const params = dashboardHttpParams(range);
    return fetchCachedDashboard<LogisticsDashboard>(
      this.http,
      this.dashCache,
      url,
      params,
      bypassCache,
    );
  }

  // Sales order logistics queue
  getSalesOrderQueue(
    queue: LogisticsSalesQueue = 'all',
    params: ListParams = {},
  ): Observable<PaginatedData<LogisticsSalesOrder>> {
    return this.http
      .get<ApiResponse<PaginatedData<LogisticsSalesOrder>>>(`${this.baseUrl}/sales-orders/`, {
        params: buildHttpParams({ page_size: 20, queue, ...params }),
      })
      .pipe(unwrapApi());
  }

  getSalesOrderForLogistics(id: number): Observable<LogisticsSalesOrderDetail> {
    return this.http
      .get<ApiResponse<LogisticsSalesOrderDetail>>(`${this.baseUrl}/sales-orders/${id}/`)
      .pipe(unwrapApi());
  }

  calculateSalesOrderDeliveryCost(
    id: number,
    data: Record<string, unknown>,
  ): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.baseUrl}/sales-orders/${id}/delivery_cost/`, data)
      .pipe(unwrapApi());
  }

  setSalesOrderDeliveryMethod(id: number, delivery_method: string): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.baseUrl}/sales-orders/${id}/set_delivery_method/`, {
        delivery_method,
      })
      .pipe(unwrapApi());
  }

  assignSalesOrderVehicle(id: number, data: Record<string, unknown>): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.baseUrl}/sales-orders/${id}/assign_vehicle/`, data)
      .pipe(unwrapApi());
  }

  assignSalesOrderThirdParty(id: number, data: Record<string, unknown>): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.baseUrl}/sales-orders/${id}/assign_third_party/`, data)
      .pipe(unwrapApi());
  }

  dispatchSalesOrder(id: number): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.baseUrl}/sales-orders/${id}/dispatch-order/`, {})
      .pipe(unwrapApi());
  }

  scheduleSalesOrderPickup(id: number, data: Record<string, unknown>): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.baseUrl}/sales-orders/${id}/confirm_pickup/`, data)
      .pipe(unwrapApi());
  }

  /** @deprecated Use scheduleSalesOrderPickup — logistics only schedules; inventory confirms collection */
  confirmSalesOrderPickup(id: number, data: Record<string, unknown>): Observable<unknown> {
    return this.scheduleSalesOrderPickup(id, data);
  }

  confirmSalesOrderDelivery(id: number, data: Record<string, unknown>): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.baseUrl}/sales-orders/${id}/confirm_delivery/`, data)
      .pipe(unwrapApi());
  }

  logisticsConfirmSalesOrder(id: number, remarks = ''): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.baseUrl}/sales-orders/${id}/logistics_confirm/`, {
        remarks,
      })
      .pipe(unwrapApi());
  }

  // Internal routes (staff planner)
  getInternalRoutes(params: ListParams = {}): Observable<PaginatedData<InternalRoute>> {
    return this.http
      .get<ApiResponse<PaginatedData<InternalRoute>>>(`${this.baseUrl}/internal-routes/`, {
        params: buildHttpParams({ page_size: 20, ordering: '-scheduled_date', ...params }),
      })
      .pipe(unwrapApi());
  }

  getInternalRoute(id: number): Observable<InternalRoute> {
    return this.http
      .get<ApiResponse<InternalRoute>>(`${this.baseUrl}/internal-routes/${id}/`)
      .pipe(unwrapApi());
  }

  createInternalRoute(data: InternalRouteCreateData): Observable<InternalRouteMutationResult> {
    return this.http
      .post<ApiResponse<InternalRoute>>(`${this.baseUrl}/internal-routes/`, data)
      .pipe(
        unwrapApiWithMeta(),
        map((res) => ({
          ...res,
          warnings: (res.warnings ?? undefined) as InternalRouteMutationResult['warnings'],
        })),
      );
  }

  updateInternalRoute(
    id: number,
    data: InternalRouteUpdateData,
  ): Observable<InternalRouteMutationResult> {
    return this.http
      .patch<ApiResponse<InternalRoute>>(`${this.baseUrl}/internal-routes/${id}/`, data)
      .pipe(
        unwrapApiWithMeta(),
        map((res) => ({
          ...res,
          warnings: (res.warnings ?? undefined) as InternalRouteMutationResult['warnings'],
        })),
      );
  }

  cancelInternalRoute(id: number, cancellation_reason = ''): Observable<InternalRoute> {
    return this.http
      .post<ApiResponse<InternalRoute>>(`${this.baseUrl}/internal-routes/${id}/cancel/`, {
        cancellation_reason,
      })
      .pipe(unwrapApi());
  }

  addPoToInternalRoute(id: number, purchase_order_id: number): Observable<InternalRoute> {
    return this.http
      .post<ApiResponse<InternalRoute>>(`${this.baseUrl}/internal-routes/${id}/add-po/`, {
        purchase_order_id,
      })
      .pipe(unwrapApi());
  }

  removePoFromInternalRoute(id: number, purchase_order_id: number): Observable<InternalRoute> {
    return this.http
      .post<ApiResponse<InternalRoute>>(`${this.baseUrl}/internal-routes/${id}/remove-po/`, {
        purchase_order_id,
      })
      .pipe(unwrapApi());
  }

  getGrnDestinations(poIds: number[]): Observable<GrnDestinationHint[]> {
    return this.http
      .get<ApiResponse<GrnDestinationHint[]>>(`${this.baseUrl}/internal-routes/grn-destination/`, {
        params: buildHttpParams({ po_ids: poIds.join(',') }),
      })
      .pipe(unwrapApi());
  }

  getDeliveryReport(params: {
    date_from?: string;
    date_to?: string;
    status?: string;
  } = {}): Observable<LogisticsDeliveryReportResponse> {
    return this.http
      .get<ApiResponse<LogisticsDeliveryReportResponse>>(`${this.baseUrl}/reports/deliveries/`, {
        params: buildHttpParams(params),
      })
      .pipe(unwrapApi());
  }
}
