import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environments';
import { ApiResponse } from '../models/auth.models';
import { PaginatedData, ListParams } from '../models/paginated.model';
import {
  GoodsReceivedNote,
  GRNConfirmResult,
  GRNFormData,
  InvoiceFormData,
  PaymentFormData,
  POFormData,
  PRFormData,
  PurchaseOrder,
  PurchaseRequisition,
  QuotationFormData,
  RFQ,
  RFQFormData,
  Supplier,
  SupplierFormData,
  SupplierInvoice,
  SupplierQuotation,
  ProcurementDashboardData,
} from '../models/procurement.model';
import { buildHttpParams, unwrapApi } from '../utils/api.util';

@Injectable({ providedIn: 'root' })
export class ProcurementService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/procurement`;

  getSuppliers(params: ListParams = {}): Observable<PaginatedData<Supplier>> {
    return this.http
      .get<ApiResponse<PaginatedData<Supplier>>>(`${this.baseUrl}/suppliers/`, {
        params: buildHttpParams({ page_size: 20, ...params }),
      })
      .pipe(unwrapApi());
  }

  getSupplier(id: number): Observable<Supplier> {
    return this.http
      .get<ApiResponse<Supplier>>(`${this.baseUrl}/suppliers/${id}/`)
      .pipe(unwrapApi());
  }

  createSupplier(data: SupplierFormData): Observable<Supplier> {
    return this.http
      .post<ApiResponse<Supplier>>(`${this.baseUrl}/suppliers/`, data)
      .pipe(unwrapApi());
  }

  updateSupplier(id: number, data: SupplierFormData): Observable<Supplier> {
    return this.http
      .patch<ApiResponse<Supplier>>(`${this.baseUrl}/suppliers/${id}/`, data)
      .pipe(unwrapApi());
  }

  deleteSupplier(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<null>>(`${this.baseUrl}/suppliers/${id}/`)
      .pipe(map(() => undefined));
  }

  getRequisitions(params: ListParams = {}): Observable<PaginatedData<PurchaseRequisition>> {
    return this.http
      .get<ApiResponse<PaginatedData<PurchaseRequisition>>>(`${this.baseUrl}/requisitions/`, {
        params: buildHttpParams({ page_size: 20, ...params }),
      })
      .pipe(unwrapApi());
  }

  getRequisition(id: number): Observable<PurchaseRequisition> {
    return this.http
      .get<ApiResponse<PurchaseRequisition>>(`${this.baseUrl}/requisitions/${id}/`)
      .pipe(unwrapApi());
  }

  createRequisition(data: PRFormData): Observable<PurchaseRequisition> {
    return this.http
      .post<ApiResponse<PurchaseRequisition>>(`${this.baseUrl}/requisitions/`, data)
      .pipe(unwrapApi());
  }

  updateRequisition(id: number, data: PRFormData): Observable<PurchaseRequisition> {
    return this.http
      .patch<ApiResponse<PurchaseRequisition>>(`${this.baseUrl}/requisitions/${id}/`, data)
      .pipe(unwrapApi());
  }

  deleteRequisition(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<null>>(`${this.baseUrl}/requisitions/${id}/`)
      .pipe(map(() => undefined));
  }

  submitRequisition(id: number): Observable<PurchaseRequisition> {
    return this.http
      .post<ApiResponse<PurchaseRequisition>>(`${this.baseUrl}/requisitions/${id}/submit/`, {})
      .pipe(unwrapApi());
  }

  approveRequisition(id: number): Observable<PurchaseRequisition> {
    return this.http
      .post<ApiResponse<PurchaseRequisition>>(`${this.baseUrl}/requisitions/${id}/approve/`, {})
      .pipe(unwrapApi());
  }

  rejectRequisition(id: number, reason: string): Observable<PurchaseRequisition> {
    return this.http
      .post<ApiResponse<PurchaseRequisition>>(`${this.baseUrl}/requisitions/${id}/reject/`, {
        reason,
      })
      .pipe(unwrapApi());
  }

  getRFQs(params: ListParams = {}): Observable<PaginatedData<RFQ>> {
    return this.http
      .get<ApiResponse<PaginatedData<RFQ>>>(`${this.baseUrl}/rfq/`, {
        params: buildHttpParams({ page_size: 20, ...params }),
      })
      .pipe(unwrapApi());
  }

  getRFQ(id: number): Observable<RFQ> {
    return this.http
      .get<ApiResponse<RFQ>>(`${this.baseUrl}/rfq/${id}/`)
      .pipe(unwrapApi());
  }

  createRFQ(data: RFQFormData): Observable<RFQ> {
    return this.http
      .post<ApiResponse<RFQ>>(`${this.baseUrl}/rfq/`, data)
      .pipe(unwrapApi());
  }

  closeRFQ(id: number): Observable<RFQ> {
    return this.http
      .post<ApiResponse<RFQ>>(`${this.baseUrl}/rfq/${id}/close/`, {})
      .pipe(unwrapApi());
  }

  cancelRFQ(id: number): Observable<RFQ> {
    return this.http
      .post<ApiResponse<RFQ>>(`${this.baseUrl}/rfq/${id}/cancel/`, {})
      .pipe(unwrapApi());
  }

  getQuotations(params: ListParams = {}): Observable<PaginatedData<SupplierQuotation>> {
    return this.http
      .get<ApiResponse<PaginatedData<SupplierQuotation>>>(`${this.baseUrl}/quotations/`, {
        params: buildHttpParams({ page_size: 20, ...params }),
      })
      .pipe(unwrapApi());
  }

  getQuotation(id: number): Observable<SupplierQuotation> {
    return this.http
      .get<ApiResponse<SupplierQuotation>>(`${this.baseUrl}/quotations/${id}/`)
      .pipe(unwrapApi());
  }

  createQuotation(data: QuotationFormData): Observable<SupplierQuotation> {
    return this.http
      .post<ApiResponse<SupplierQuotation>>(`${this.baseUrl}/quotations/`, data)
      .pipe(unwrapApi());
  }

  selectQuotation(id: number): Observable<{ quotation: SupplierQuotation; purchase_order: PurchaseOrder }> {
    return this.http
      .post<ApiResponse<{ quotation: SupplierQuotation; purchase_order: PurchaseOrder }>>(
        `${this.baseUrl}/quotations/${id}/select/`,
        {},
      )
      .pipe(unwrapApi());
  }

  rejectQuotation(id: number): Observable<SupplierQuotation> {
    return this.http
      .post<ApiResponse<SupplierQuotation>>(`${this.baseUrl}/quotations/${id}/reject/`, {})
      .pipe(unwrapApi());
  }

  getPurchaseOrders(params: ListParams = {}): Observable<PaginatedData<PurchaseOrder>> {
    return this.http
      .get<ApiResponse<PaginatedData<PurchaseOrder>>>(`${this.baseUrl}/purchase-orders/`, {
        params: buildHttpParams({ page_size: 20, ...params }),
      })
      .pipe(unwrapApi());
  }

  getPurchaseOrder(id: number): Observable<PurchaseOrder> {
    return this.http
      .get<ApiResponse<PurchaseOrder>>(`${this.baseUrl}/purchase-orders/${id}/`)
      .pipe(unwrapApi());
  }

  createPurchaseOrder(data: POFormData): Observable<PurchaseOrder> {
    return this.http
      .post<ApiResponse<PurchaseOrder>>(`${this.baseUrl}/purchase-orders/`, data)
      .pipe(unwrapApi());
  }

  updatePurchaseOrder(id: number, data: POFormData): Observable<PurchaseOrder> {
    return this.http
      .patch<ApiResponse<PurchaseOrder>>(`${this.baseUrl}/purchase-orders/${id}/`, data)
      .pipe(unwrapApi());
  }

  submitPurchaseOrder(id: number): Observable<PurchaseOrder> {
    return this.http
      .post<ApiResponse<PurchaseOrder>>(`${this.baseUrl}/purchase-orders/${id}/submit/`, {})
      .pipe(unwrapApi());
  }

  approvePurchaseOrder(id: number): Observable<PurchaseOrder> {
    return this.http
      .post<ApiResponse<PurchaseOrder>>(`${this.baseUrl}/purchase-orders/${id}/approve/`, {})
      .pipe(unwrapApi());
  }

  rejectPurchaseOrder(id: number, reason: string): Observable<PurchaseOrder> {
    return this.http
      .post<ApiResponse<PurchaseOrder>>(`${this.baseUrl}/purchase-orders/${id}/reject/`, {
        reason,
      })
      .pipe(unwrapApi());
  }

  sendPurchaseOrder(id: number): Observable<PurchaseOrder> {
    return this.http
      .post<ApiResponse<PurchaseOrder>>(`${this.baseUrl}/purchase-orders/${id}/send/`, {})
      .pipe(unwrapApi());
  }

  getGRNs(params: ListParams = {}): Observable<PaginatedData<GoodsReceivedNote>> {
    return this.http
      .get<ApiResponse<PaginatedData<GoodsReceivedNote>>>(`${this.baseUrl}/grn/`, {
        params: buildHttpParams({ page_size: 20, ...params }),
      })
      .pipe(unwrapApi());
  }

  getGRN(id: number): Observable<GoodsReceivedNote> {
    return this.http
      .get<ApiResponse<GoodsReceivedNote>>(`${this.baseUrl}/grn/${id}/`)
      .pipe(unwrapApi());
  }

  createGRN(data: GRNFormData): Observable<GoodsReceivedNote> {
    return this.http
      .post<ApiResponse<GoodsReceivedNote>>(`${this.baseUrl}/grn/`, data)
      .pipe(unwrapApi());
  }

  updateGRN(id: number, data: GRNFormData): Observable<GoodsReceivedNote> {
    return this.http
      .patch<ApiResponse<GoodsReceivedNote>>(`${this.baseUrl}/grn/${id}/`, data)
      .pipe(unwrapApi());
  }

  confirmGRN(id: number): Observable<GRNConfirmResult> {
    return this.http
      .post<ApiResponse<GRNConfirmResult>>(`${this.baseUrl}/grn/${id}/confirm/`, {})
      .pipe(unwrapApi());
  }

  getSupplierInvoices(params: ListParams = {}): Observable<PaginatedData<SupplierInvoice>> {
    return this.http
      .get<ApiResponse<PaginatedData<SupplierInvoice>>>(`${this.baseUrl}/supplier-invoices/`, {
        params: buildHttpParams({ page_size: 20, ...params }),
      })
      .pipe(unwrapApi());
  }

  getSupplierInvoice(id: number): Observable<SupplierInvoice> {
    return this.http
      .get<ApiResponse<SupplierInvoice>>(`${this.baseUrl}/supplier-invoices/${id}/`)
      .pipe(unwrapApi());
  }

  createSupplierInvoice(data: InvoiceFormData): Observable<SupplierInvoice> {
    return this.http
      .post<ApiResponse<SupplierInvoice>>(`${this.baseUrl}/supplier-invoices/`, data)
      .pipe(unwrapApi());
  }

  matchInvoice(id: number): Observable<SupplierInvoice> {
    return this.http
      .post<ApiResponse<SupplierInvoice>>(`${this.baseUrl}/supplier-invoices/${id}/match/`, {})
      .pipe(unwrapApi());
  }

  payInvoice(id: number, paymentData: PaymentFormData): Observable<SupplierInvoice> {
    return this.http
      .post<ApiResponse<SupplierInvoice>>(`${this.baseUrl}/supplier-invoices/${id}/pay/`, paymentData)
      .pipe(unwrapApi());
  }

  getDashboard(): Observable<ProcurementDashboardData> {
    return this.http
      .get<ApiResponse<ProcurementDashboardData>>(`${this.baseUrl}/dashboard/`)
      .pipe(unwrapApi());
  }
}
