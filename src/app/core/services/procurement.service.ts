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
  GoodsReceivedNote,
  GovernanceDashboardData,
  GRNConfirmResult,
  GRNFormData,
  InvoiceFormData,
  PaymentFormData,
  PaymentRelease,
  PaymentReleaseFormData,
  POClosureChecklist,
  POFormData,
  PRFormData,
  PurchaseOrder,
  PurchaseRequisition,
  QuotationFormData,
  RFQ,
  RFQComparisonResult,
  RFQFormData,
  RFQItemAwardPayload,
  RFQItemAwardResult,
  RFQItemRecommendationPayload,
  RFQItemRecommendationResult,
  SupplierResponse,
  SupplierResponseFormData,
  Supplier,
  SupplierFormData,
  SupplierInvoice,
  SupplierQuotation,
  ProcurementDashboardData,
  ThreeWayMatchRecord,
} from '../models/procurement.model';
import { buildHttpParams, unwrapApi, unwrapApiWithMessage } from '../utils/api.util';
import { fetchCachedDashboard } from '../utils/dashboard-fetch.util';

export type RfqEmailDelivery = {
  sender_email: string;
  sent_count: number;
  failed_count: number;
  results: { supplier: string; email: string; status: string; error_message?: string }[];
};

@Injectable({ providedIn: 'root' })
export class ProcurementService {
  private readonly http = inject(HttpClient);
  private readonly dashCache = inject(DashboardCacheService);
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

  cancelRequisition(id: number): Observable<PurchaseRequisition> {
    return this.http
      .post<ApiResponse<PurchaseRequisition>>(`${this.baseUrl}/requisitions/${id}/cancel/`, {})
      .pipe(unwrapApi());
  }

  reviseRequisition(id: number): Observable<PurchaseRequisition> {
    return this.http
      .post<ApiResponse<PurchaseRequisition>>(`${this.baseUrl}/requisitions/${id}/revise/`, {})
      .pipe(unwrapApi());
  }

  approveRequisition(id: number, itemIds: number[]): Observable<PurchaseRequisition> {
    return this.http
      .post<ApiResponse<PurchaseRequisition>>(`${this.baseUrl}/requisitions/${id}/approve/`, {
        item_ids: itemIds,
      })
      .pipe(unwrapApi());
  }

  gmOverrideRequisition(id: number, itemIds: number[]): Observable<PurchaseRequisition> {
    return this.http
      .post<ApiResponse<PurchaseRequisition>>(`${this.baseUrl}/requisitions/${id}/gm-override/`, {
        item_ids: itemIds,
      })
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

  createRFQ(data: RFQFormData): Observable<{ data: RFQ; message: string }> {
    return this.http
      .post<ApiResponse<RFQ>>(`${this.baseUrl}/rfq/`, data)
      .pipe(unwrapApiWithMessage());
  }

  updateRFQ(id: number, data: Partial<RFQFormData>): Observable<RFQ> {
    return this.http
      .patch<ApiResponse<RFQ>>(`${this.baseUrl}/rfq/${id}/`, data)
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

  sendRfqEmails(id: number): Observable<{ data: RFQ; message: string }> {
    return this.http
      .post<ApiResponse<RFQ>>(`${this.baseUrl}/rfq/${id}/send-emails/`, {})
      .pipe(unwrapApiWithMessage());
  }

  getRFQResponses(rfqId: number): Observable<SupplierResponse[]> {
    return this.http
      .get<ApiResponse<SupplierResponse[]>>(`${this.baseUrl}/rfq/${rfqId}/responses/`)
      .pipe(unwrapApi());
  }

  getQuotationFile(
    rfqId: number,
    responseId: number,
    disposition: 'inline' | 'attachment' = 'inline',
  ): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/rfq/${rfqId}/responses/${responseId}/quotation-file/`,
      {
        params: buildHttpParams({ disposition }),
        responseType: 'blob',
      },
    );
  }

  createRFQResponse(rfqId: number, data: SupplierResponseFormData): Observable<SupplierResponse> {
    const form = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;
      if (key === 'quotation_file' && value instanceof File) {
        form.append(key, value);
      } else if (key === 'line_items' && Array.isArray(value)) {
        form.append(key, JSON.stringify(value));
      } else {
        form.append(key, String(value));
      }
    });
    return this.http
      .post<ApiResponse<SupplierResponse>>(`${this.baseUrl}/rfq/${rfqId}/responses/`, form)
      .pipe(unwrapApi());
  }

  updateRFQResponse(
    rfqId: number,
    responseId: number,
    data: Partial<SupplierResponseFormData>,
    gmOverride = false,
  ): Observable<SupplierResponse> {
    const form = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      if (key === 'quotation_file' && value instanceof File) {
        form.append(key, value);
      } else if (key === 'line_items' && Array.isArray(value)) {
        form.append(key, JSON.stringify(value));
      } else if (value !== '') {
        form.append(key, String(value));
      }
    });
    const params = gmOverride ? { gm_override: 'true' } : {};
    return this.http
      .patch<ApiResponse<SupplierResponse>>(
        `${this.baseUrl}/rfq/${rfqId}/responses/${responseId}/`,
        form,
        { params: buildHttpParams(params) },
      )
      .pipe(unwrapApi());
  }

  getRFQComparison(rfqId: number): Observable<RFQComparisonResult> {
    return this.http
      .get<ApiResponse<RFQComparisonResult>>(`${this.baseUrl}/rfq/${rfqId}/comparison/`)
      .pipe(unwrapApi());
  }

  getRFQItemAwards(rfqId: number): Observable<RFQItemAwardResult> {
    return this.http
      .get<ApiResponse<RFQItemAwardResult>>(`${this.baseUrl}/rfq/${rfqId}/item-awards/`)
      .pipe(unwrapApi());
  }

  saveRFQItemAwards(rfqId: number, payload: RFQItemAwardPayload): Observable<RFQItemAwardResult> {
    return this.http
      .post<ApiResponse<RFQItemAwardResult>>(`${this.baseUrl}/rfq/${rfqId}/item-awards/`, payload)
      .pipe(unwrapApi());
  }

  getRFQItemRecommendations(rfqId: number): Observable<RFQItemRecommendationResult> {
    return this.http
      .get<ApiResponse<RFQItemRecommendationResult>>(`${this.baseUrl}/rfq/${rfqId}/gm-recommendations/`)
      .pipe(unwrapApi());
  }

  saveRFQItemRecommendations(
    rfqId: number,
    payload: RFQItemRecommendationPayload,
  ): Observable<RFQItemRecommendationResult> {
    return this.http
      .post<ApiResponse<RFQItemRecommendationResult>>(
        `${this.baseUrl}/rfq/${rfqId}/gm-recommendations/`,
        payload,
      )
      .pipe(unwrapApi());
  }

  selectRFQResponse(rfqId: number, responseId: number): Observable<SupplierResponse> {
    return this.http
      .post<ApiResponse<SupplierResponse>>(
        `${this.baseUrl}/rfq/${rfqId}/responses/${responseId}/select/`,
        {},
      )
      .pipe(unwrapApi());
  }

  rejectRFQResponse(rfqId: number, responseId: number): Observable<SupplierResponse> {
    return this.http
      .post<ApiResponse<SupplierResponse>>(
        `${this.baseUrl}/rfq/${rfqId}/responses/${responseId}/reject/`,
        {},
      )
      .pipe(unwrapApi());
  }

  reviewRFQResponse(rfqId: number, responseId: number): Observable<SupplierResponse> {
    return this.http
      .post<ApiResponse<SupplierResponse>>(
        `${this.baseUrl}/rfq/${rfqId}/responses/${responseId}/review/`,
        {},
      )
      .pipe(unwrapApi());
  }

  generatePOFromResponse(
    rfqId: number,
    responseId: number,
  ): Observable<{ response_id: number; purchase_order: PurchaseOrder }> {
    return this.http
      .post<ApiResponse<{ response_id: number; purchase_order: PurchaseOrder }>>(
        `${this.baseUrl}/rfq/${rfqId}/responses/${responseId}/generate-po/`,
        {},
      )
      .pipe(unwrapApi());
  }

  gmOverrideRFQResponse(
    rfqId: number,
    responseId: number,
    reason: string,
  ): Observable<SupplierResponse> {
    return this.http
      .post<ApiResponse<SupplierResponse>>(
        `${this.baseUrl}/rfq/${rfqId}/responses/${responseId}/gm-override/`,
        { reason },
      )
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

  getQuotationArchiveFile(
    quotationId: number,
    disposition: 'inline' | 'attachment' = 'inline',
  ): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/quotations/${quotationId}/quotation-file/`,
      {
        params: buildHttpParams({ disposition }),
        responseType: 'blob',
      },
    );
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

  getReceivablePurchaseOrders(pageSize = 100): Observable<PurchaseOrder[]> {
    return this.getPurchaseOrders({ receivable: true, page_size: pageSize }).pipe(
      map((data) => data.results),
    );
  }

  /** POs open for new supplier invoices (excludes closed and fully paid). */
  getInvoiceLinkablePurchaseOrders(pageSize = 200): Observable<PurchaseOrder[]> {
    return this.getPurchaseOrders({ invoice_linkable: true, page_size: pageSize }).pipe(
      map((data) => data.results),
    );
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

  approvePurchaseOrder(id: number, approvalAs: 'HOD' | 'GM' = 'HOD'): Observable<PurchaseOrder> {
    return this.http
      .post<ApiResponse<PurchaseOrder>>(`${this.baseUrl}/purchase-orders/${id}/approve/`, {
        approval_as: approvalAs,
      })
      .pipe(unwrapApi());
  }

  rejectPurchaseOrder(id: number, reason: string): Observable<PurchaseOrder> {
    return this.http
      .post<ApiResponse<PurchaseOrder>>(`${this.baseUrl}/purchase-orders/${id}/reject/`, {
        reason,
      })
      .pipe(unwrapApi());
  }

  sendPurchaseOrder(id: number): Observable<{ data: PurchaseOrder; message: string }> {
    return this.http
      .post<ApiResponse<PurchaseOrder>>(`${this.baseUrl}/purchase-orders/${id}/send/`, {})
      .pipe(unwrapApiWithMessage());
  }

  getPOClosureChecklist(id: number): Observable<POClosureChecklist> {
    return this.http
      .get<ApiResponse<POClosureChecklist>>(`${this.baseUrl}/purchase-orders/${id}/closure-checklist/`)
      .pipe(unwrapApi());
  }

  closePurchaseOrder(id: number): Observable<PurchaseOrder> {
    return this.http
      .post<ApiResponse<PurchaseOrder>>(`${this.baseUrl}/purchase-orders/${id}/close/`, {})
      .pipe(unwrapApi());
  }

  markPurchaseOrderReceived(id: number): Observable<PurchaseOrder> {
    return this.http
      .post<ApiResponse<PurchaseOrder>>(`${this.baseUrl}/purchase-orders/${id}/mark-received/`, {})
      .pipe(unwrapApi());
  }

  downloadPurchaseOrderPdf(id: number) {
    return this.http.get(`${this.baseUrl}/purchase-orders/${id}/download-pdf/`, {
      responseType: 'blob',
    });
  }

  emergencyRetroactiveApproval(id: number, justification: string): Observable<PurchaseOrder> {
    return this.http
      .post<ApiResponse<PurchaseOrder>>(`${this.baseUrl}/purchase-orders/${id}/emergency-retroactive/`, {
        justification,
      })
      .pipe(unwrapApi());
  }

  getPaymentReleases(params: ListParams = {}): Observable<PaginatedData<PaymentRelease>> {
    return this.http
      .get<ApiResponse<PaginatedData<PaymentRelease>>>(`${this.baseUrl}/governance/payment-releases/`, {
        params: buildHttpParams({ page_size: 50, ...params }),
      })
      .pipe(unwrapApi());
  }

  getPaymentRelease(id: number): Observable<PaymentRelease> {
    return this.http
      .get<ApiResponse<PaymentRelease>>(`${this.baseUrl}/governance/payment-releases/${id}/`)
      .pipe(unwrapApi());
  }

  createPaymentRelease(data: PaymentReleaseFormData): Observable<PaymentRelease> {
    return this.http
      .post<ApiResponse<PaymentRelease>>(`${this.baseUrl}/governance/payment-releases/`, data)
      .pipe(unwrapApi());
  }

  financeVerifyPaymentRelease(id: number, notes = '', sendToGm = false): Observable<PaymentRelease> {
    return this.http
      .post<ApiResponse<PaymentRelease>>(`${this.baseUrl}/governance/payment-releases/${id}/finance-verify/`, {
        notes,
        send_to_gm: sendToGm,
      })
      .pipe(unwrapApi());
  }

  gmReviewPaymentRelease(id: number, approved: boolean, notes = ''): Observable<PaymentRelease> {
    return this.http
      .post<ApiResponse<PaymentRelease>>(`${this.baseUrl}/governance/payment-releases/${id}/gm-review/`, {
        approved,
        notes,
      })
      .pipe(unwrapApi());
  }

  executePaymentRelease(
    id: number,
    data: { payment_method: string; payment_reference: string; payment_date: string; payment_evidence?: File },
  ): Observable<PaymentRelease> {
    const form = new FormData();
    form.append('payment_method', data.payment_method);
    form.append('payment_reference', data.payment_reference);
    form.append('payment_date', data.payment_date);
    if (data.payment_evidence) {
      form.append('payment_evidence', data.payment_evidence);
    }
    return this.http
      .post<ApiResponse<PaymentRelease>>(`${this.baseUrl}/governance/payment-releases/${id}/execute-payment/`, form)
      .pipe(unwrapApi());
  }

  releasePayment(id: number): Observable<PaymentRelease> {
    return this.executePaymentRelease(id, {
      payment_method: 'Bank Transfer',
      payment_reference: `LEGACY-${id}`,
      payment_date: new Date().toISOString().slice(0, 10),
    });
  }

  getThreeWayMatches(params: ListParams = {}): Observable<PaginatedData<ThreeWayMatchRecord>> {
    return this.http
      .get<ApiResponse<PaginatedData<ThreeWayMatchRecord>>>(`${this.baseUrl}/governance/three-way-matches/`, {
        params: buildHttpParams({ page_size: 50, ...params }),
      })
      .pipe(unwrapApi());
  }

  createThreeWayMatch(data: {
    purchase_order: number;
    grn: number;
    invoice?: number | null;
    match_type?: 'FULL' | 'COD_QUICK';
    resolution_notes?: string;
  }): Observable<ThreeWayMatchRecord> {
    return this.http
      .post<ApiResponse<ThreeWayMatchRecord>>(`${this.baseUrl}/governance/three-way-matches/`, data)
      .pipe(unwrapApi());
  }

  getGovernanceDashboard(audience?: string): Observable<GovernanceDashboardData> {
    return this.http
      .get<ApiResponse<GovernanceDashboardData>>(`${this.baseUrl}/governance/dashboard/`, {
        params: buildHttpParams(audience ? { audience } : {}),
      })
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

  createSupplierInvoice(data: InvoiceFormData): Observable<{ data: SupplierInvoice; message: string }> {
    if (data.invoice_document) {
      const form = new FormData();
      form.append('invoice_number', data.invoice_number);
      form.append('supplier', String(data.supplier));
      form.append('purchase_order', String(data.purchase_order));
      if (data.grn != null) form.append('grn', String(data.grn));
      form.append('is_proforma', data.is_proforma ? 'true' : 'false');
      form.append('invoice_date', data.invoice_date);
      form.append('due_date', data.due_date);
      form.append('currency', String(data.currency));
      form.append('exchange_rate', String(data.exchange_rate));
      form.append('subtotal', String(data.subtotal));
      form.append('tax_amount', String(data.tax_amount));
      form.append('total_amount', String(data.total_amount));
      form.append('notes', data.notes ?? '');
      form.append('invoice_document', data.invoice_document);
      return this.http
        .post<ApiResponse<SupplierInvoice>>(`${this.baseUrl}/supplier-invoices/`, form)
        .pipe(unwrapApiWithMessage());
    }
    return this.http
      .post<ApiResponse<SupplierInvoice>>(`${this.baseUrl}/supplier-invoices/`, data)
      .pipe(unwrapApiWithMessage());
  }

  matchInvoice(id: number): Observable<{ data: SupplierInvoice; message: string }> {
    return this.http
      .post<ApiResponse<SupplierInvoice>>(`${this.baseUrl}/supplier-invoices/${id}/match/`, {})
      .pipe(unwrapApiWithMessage());
  }

  gmReviewInvoice(id: number, approved: boolean, notes = ''): Observable<SupplierInvoice> {
    return this.http
      .post<ApiResponse<SupplierInvoice>>(`${this.baseUrl}/supplier-invoices/${id}/gm-review/`, {
        approved,
        notes,
      })
      .pipe(unwrapApi());
  }

  payInvoice(id: number, paymentData: PaymentFormData): Observable<SupplierInvoice> {
    const form = new FormData();
    form.append('amount', String(paymentData.amount));
    form.append('payment_date', paymentData.payment_date);
    form.append('payment_method', paymentData.payment_method);
    form.append('reference', paymentData.reference);
    form.append('bank', paymentData.bank ?? '');
    if (paymentData.proof_document) {
      form.append('proof_document', paymentData.proof_document);
    }
    return this.http
      .post<ApiResponse<SupplierInvoice>>(`${this.baseUrl}/supplier-invoices/${id}/pay/`, form)
      .pipe(unwrapApi());
  }

  submitSupplierInvoiceForFinanceApproval(
    id: number,
  ): Observable<{ data: SupplierInvoice; message: string }> {
    return this.http
      .post<ApiResponse<SupplierInvoice>>(
        `${this.baseUrl}/supplier-invoices/${id}/submit-for-finance-approval/`,
        {},
      )
      .pipe(unwrapApiWithMessage());
  }

  getDashboard(
    range?: DateRangeValue | null,
    bypassCache = false,
  ): Observable<ProcurementDashboardData> {
    const url = `${this.baseUrl}/dashboard/`;
    const params = dashboardHttpParams(range);
    return fetchCachedDashboard<ProcurementDashboardData>(
      this.http,
      this.dashCache,
      url,
      params,
      bypassCache,
    );
  }
}
