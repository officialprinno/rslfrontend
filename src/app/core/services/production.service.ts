import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environments';
import { ApiResponse } from '../models/auth.models';
import { PaginatedData, ListParams } from '../models/paginated.model';
import {
  BOM,
  BOMFormData,
  Machine,
  MachineFormData,
  MachineHistory,
  MachineUsage,
  MachineUsageFormData,
  MaterialRequirement,
  OperatorDashboard,
  OutputFormData,
  OutputRecord,
  Product,
  ProductFormData,
  ProductionDashboard,
  ProductionReportsBundle,
  QCFormData,
  WOFormData,
  WorkOrder,
} from '../models/production.model';
import { buildHttpParams, unwrapApi } from '../utils/api.util';

@Injectable({ providedIn: 'root' })
export class ProductionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/production`;

  // Products
  getProducts(params: ListParams = {}): Observable<PaginatedData<Product>> {
    return this.http
      .get<ApiResponse<PaginatedData<Product>>>(`${this.baseUrl}/products/`, {
        params: buildHttpParams({ page_size: 20, ...params }),
      })
      .pipe(unwrapApi());
  }

  getProduct(id: number): Observable<Product> {
    return this.http.get<ApiResponse<Product>>(`${this.baseUrl}/products/${id}/`).pipe(unwrapApi());
  }

  createProduct(data: ProductFormData): Observable<Product> {
    return this.http.post<ApiResponse<Product>>(`${this.baseUrl}/products/`, data).pipe(unwrapApi());
  }

  updateProduct(id: number, data: ProductFormData): Observable<Product> {
    return this.http.patch<ApiResponse<Product>>(`${this.baseUrl}/products/${id}/`, data).pipe(unwrapApi());
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/products/${id}/`).pipe(unwrapApi());
  }

  // BOM
  getBOMs(params: ListParams = {}): Observable<PaginatedData<BOM>> {
    return this.http
      .get<ApiResponse<PaginatedData<BOM>>>(`${this.baseUrl}/bom/`, {
        params: buildHttpParams({ page_size: 20, ...params }),
      })
      .pipe(unwrapApi());
  }

  getBOM(id: number): Observable<BOM> {
    return this.http.get<ApiResponse<BOM>>(`${this.baseUrl}/bom/${id}/`).pipe(unwrapApi());
  }

  createBOM(data: BOMFormData): Observable<BOM> {
    return this.http.post<ApiResponse<BOM>>(`${this.baseUrl}/bom/`, data).pipe(unwrapApi());
  }

  updateBOM(id: number, data: BOMFormData): Observable<BOM> {
    return this.http.patch<ApiResponse<BOM>>(`${this.baseUrl}/bom/${id}/`, data).pipe(unwrapApi());
  }

  activateBOM(id: number): Observable<BOM> {
    return this.http.post<ApiResponse<BOM>>(`${this.baseUrl}/bom/${id}/activate/`, {}).pipe(unwrapApi());
  }

  duplicateBOM(id: number): Observable<BOM> {
    return this.http.post<ApiResponse<BOM>>(`${this.baseUrl}/bom/${id}/duplicate/`, {}).pipe(unwrapApi());
  }

  deleteBOM(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/bom/${id}/`).pipe(unwrapApi());
  }

  checkMaterialAvailability(bomId: number, quantity: number): Observable<MaterialRequirement[]> {
    return this.http
      .post<ApiResponse<MaterialRequirement[]>>(`${this.baseUrl}/bom/check-materials/`, {
        bom_id: bomId,
        quantity,
      })
      .pipe(unwrapApi());
  }

  // Work Orders
  getWorkOrders(params: ListParams = {}): Observable<PaginatedData<WorkOrder>> {
    return this.http
      .get<ApiResponse<PaginatedData<WorkOrder>>>(`${this.baseUrl}/work-orders/`, {
        params: buildHttpParams({ page_size: 20, ...params }),
      })
      .pipe(unwrapApi());
  }

  getWorkOrder(id: number): Observable<WorkOrder> {
    return this.http
      .get<ApiResponse<WorkOrder>>(`${this.baseUrl}/work-orders/${id}/`)
      .pipe(unwrapApi());
  }

  createWorkOrder(data: WOFormData): Observable<WorkOrder> {
    return this.http
      .post<ApiResponse<WorkOrder>>(`${this.baseUrl}/work-orders/`, data)
      .pipe(unwrapApi());
  }

  updateWorkOrder(id: number, data: WOFormData): Observable<WorkOrder> {
    return this.http
      .patch<ApiResponse<WorkOrder>>(`${this.baseUrl}/work-orders/${id}/`, data)
      .pipe(unwrapApi());
  }

  submitWorkOrder(id: number): Observable<WorkOrder> {
    return this.http
      .post<ApiResponse<WorkOrder>>(`${this.baseUrl}/work-orders/${id}/submit/`, {})
      .pipe(unwrapApi());
  }

  approveWorkOrder(id: number): Observable<WorkOrder> {
    return this.http
      .post<ApiResponse<WorkOrder>>(`${this.baseUrl}/work-orders/${id}/approve/`, {})
      .pipe(unwrapApi());
  }

  startProduction(id: number): Observable<WorkOrder> {
    return this.http
      .post<ApiResponse<WorkOrder>>(`${this.baseUrl}/work-orders/${id}/start/`, {})
      .pipe(unwrapApi());
  }

  completeWorkOrder(id: number): Observable<WorkOrder> {
    return this.http
      .post<ApiResponse<WorkOrder>>(`${this.baseUrl}/work-orders/${id}/complete/`, {})
      .pipe(unwrapApi());
  }

  cancelWorkOrder(id: number): Observable<WorkOrder> {
    return this.http
      .post<ApiResponse<WorkOrder>>(`${this.baseUrl}/work-orders/${id}/cancel/`, {})
      .pipe(unwrapApi());
  }

  assignOperator(id: number, operatorId: number): Observable<WorkOrder> {
    return this.http
      .post<ApiResponse<WorkOrder>>(`${this.baseUrl}/work-orders/${id}/assign-operator/`, {
        operator: operatorId,
      })
      .pipe(unwrapApi());
  }

  operatorStart(id: number, machineId?: number): Observable<WorkOrder> {
    return this.http
      .post<ApiResponse<WorkOrder>>(`${this.baseUrl}/work-orders/${id}/operator-start/`, {
        machine: machineId,
      })
      .pipe(unwrapApi());
  }

  pauseWorkOrder(id: number, reason: string): Observable<WorkOrder> {
    return this.http
      .post<ApiResponse<WorkOrder>>(`${this.baseUrl}/work-orders/${id}/pause/`, { reason })
      .pipe(unwrapApi());
  }

  resumeWorkOrder(id: number): Observable<WorkOrder> {
    return this.http
      .post<ApiResponse<WorkOrder>>(`${this.baseUrl}/work-orders/${id}/resume/`, {})
      .pipe(unwrapApi());
  }

  recordProgress(
    id: number,
    data: { quantity_produced: number; quantity_defective?: number; machine_notes?: string },
  ): Observable<WorkOrder> {
    return this.http
      .post<ApiResponse<WorkOrder>>(`${this.baseUrl}/work-orders/${id}/record-progress/`, data)
      .pipe(unwrapApi());
  }

  recordConsumption(
    id: number,
    lines: { item_id: number; quantity_consumed: number; waste_quantity?: number }[],
  ): Observable<WorkOrder> {
    return this.http
      .post<ApiResponse<WorkOrder>>(`${this.baseUrl}/work-orders/${id}/record-consumption/`, {
        lines,
      })
      .pipe(unwrapApi());
  }

  submitCompletion(
    id: number,
    data: {
      quantity_produced: number;
      quantity_defective?: number;
      machine_condition?: string;
      completion_notes?: string;
    },
  ): Observable<WorkOrder> {
    return this.http
      .post<ApiResponse<WorkOrder>>(`${this.baseUrl}/work-orders/${id}/submit-completion/`, data)
      .pipe(unwrapApi());
  }

  approveProduction(id: number): Observable<WorkOrder> {
    return this.http
      .post<ApiResponse<WorkOrder>>(`${this.baseUrl}/work-orders/${id}/approve-production/`, {})
      .pipe(unwrapApi());
  }

  storeReceipt(
    id: number,
    data: { warehouse: number; quantity_received: number; batch_number?: string; notes?: string },
  ): Observable<WorkOrder> {
    return this.http
      .post<ApiResponse<WorkOrder>>(`${this.baseUrl}/work-orders/${id}/store-receipt/`, data)
      .pipe(unwrapApi());
  }

  updateMachineRuntime(
    id: number,
    data: { condition: string; notes?: string; work_order?: number },
  ): Observable<Machine> {
    return this.http
      .post<ApiResponse<Machine>>(`${this.baseUrl}/machines/${id}/runtime-status/`, data)
      .pipe(unwrapApi());
  }

  deleteWorkOrder(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/work-orders/${id}/`)
      .pipe(unwrapApi());
  }

  // Output
  getOutputRecords(params: ListParams = {}): Observable<PaginatedData<OutputRecord>> {
    return this.http
      .get<ApiResponse<PaginatedData<OutputRecord>>>(`${this.baseUrl}/output/`, {
        params: buildHttpParams({ page_size: 20, ...params }),
      })
      .pipe(unwrapApi());
  }

  recordOutput(data: OutputFormData): Observable<OutputRecord> {
    return this.http
      .post<ApiResponse<OutputRecord>>(`${this.baseUrl}/output/`, data)
      .pipe(unwrapApi());
  }

  updateOutput(id: number, data: Partial<OutputFormData>): Observable<OutputRecord> {
    return this.http
      .patch<ApiResponse<OutputRecord>>(`${this.baseUrl}/output/${id}/`, data)
      .pipe(unwrapApi());
  }

  performQCCheck(id: number, data: QCFormData): Observable<OutputRecord> {
    return this.http
      .post<ApiResponse<OutputRecord>>(`${this.baseUrl}/output/${id}/qc/`, data)
      .pipe(unwrapApi());
  }

  // Machines
  getMachines(params: ListParams = {}): Observable<PaginatedData<Machine>> {
    return this.http
      .get<ApiResponse<PaginatedData<Machine>>>(`${this.baseUrl}/machines/`, {
        params: buildHttpParams({ page_size: 20, ...params }),
      })
      .pipe(unwrapApi());
  }

  getMachine(id: number): Observable<Machine> {
    return this.http.get<ApiResponse<Machine>>(`${this.baseUrl}/machines/${id}/`).pipe(unwrapApi());
  }

  createMachine(data: MachineFormData): Observable<Machine> {
    return this.http.post<ApiResponse<Machine>>(`${this.baseUrl}/machines/`, data).pipe(unwrapApi());
  }

  updateMachine(id: number, data: MachineFormData): Observable<Machine> {
    return this.http.patch<ApiResponse<Machine>>(`${this.baseUrl}/machines/${id}/`, data).pipe(unwrapApi());
  }

  reportBreakdown(id: number, notes: string, photo?: File | null): Observable<Machine> {
    const form = new FormData();
    form.append('notes', notes);
    if (photo) {
      form.append('photo', photo);
    }
    return this.http
      .post<ApiResponse<Machine>>(`${this.baseUrl}/machines/${id}/breakdown/`, form)
      .pipe(unwrapApi());
  }

  getProductionReports(params: { month?: string; type?: string } = {}): Observable<ProductionReportsBundle> {
    return this.http
      .get<ApiResponse<ProductionReportsBundle>>(`${this.baseUrl}/reports/`, {
        params: buildHttpParams(params),
      })
      .pipe(unwrapApi());
  }

  getMachineHistory(id: number): Observable<MachineHistory> {
    return this.http
      .get<ApiResponse<MachineHistory>>(`${this.baseUrl}/machines/${id}/history/`)
      .pipe(unwrapApi());
  }

  // Machine Usage
  getMachineUsage(params: ListParams = {}): Observable<PaginatedData<MachineUsage>> {
    return this.http
      .get<ApiResponse<PaginatedData<MachineUsage>>>(`${this.baseUrl}/machine-usage/`, {
        params: buildHttpParams({ page_size: 20, ...params }),
      })
      .pipe(unwrapApi());
  }

  logMachineUsage(data: MachineUsageFormData): Observable<MachineUsage> {
    return this.http
      .post<ApiResponse<MachineUsage>>(`${this.baseUrl}/machine-usage/`, data)
      .pipe(unwrapApi());
  }

  // Dashboard
  getProductionDashboard(): Observable<ProductionDashboard> {
    return this.http
      .get<ApiResponse<ProductionDashboard>>(`${this.baseUrl}/dashboard/`)
      .pipe(unwrapApi());
  }

  getOperatorDashboard(): Observable<OperatorDashboard> {
    return this.http
      .get<ApiResponse<OperatorDashboard>>(`${this.baseUrl}/dashboard/`, {
        params: buildHttpParams({ view: 'operator' }),
      })
      .pipe(unwrapApi());
  }
}
