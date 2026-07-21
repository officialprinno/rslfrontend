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
  CreditNote,
  CreditNoteFormData,
  CreditNoteInventoryReviewData,
  CreditNoteRejectData,
  CreditNoteReviewData,
  Customer,
  CustomerFormData,
  CustomerItemPrice,
  CustomerItemPriceFormData,
  CustomerPayment,
  CustomerStatement,
  Invoice,
  InvoiceFormData,
  InvoiceOtherCost,
  GenerateInvoiceData,
  FulfillmentInvoicePreview,
  CustomerPaymentProofData,
  PublicInvoice,
  PaymentFormData,
  Quotation,
  QuotationCustomerResponse,
  QuotationDocument,
  QuotationFormData,
  QuotationVerification,
  SalesDashboardData,
  SalesOrder,
  SalesOrderDocument,
  SalesCreditAttachment,
  SalesCreditAttachmentType,
  OutstandingSalesOrder,
  SOFormData,
  SODeliveryCost,
  SOStockCheck,
} from '../models/sales.model';
import { buildHttpParams, unwrapApi, unwrapApiWithMessage } from '../utils/api.util';
import { fetchCachedDashboard } from '../utils/dashboard-fetch.util';

@Injectable({ providedIn: 'root' })
export class SalesService {
  private readonly http = inject(HttpClient);
  private readonly dashCache = inject(DashboardCacheService);
  private readonly baseUrl = `${environment.apiUrl}/sales`;

  // Customers
  getCustomers(params: ListParams = {}): Observable<PaginatedData<Customer>> {
    return this.http
      .get<ApiResponse<PaginatedData<Customer>>>(`${this.baseUrl}/customers/`, {
        params: buildHttpParams({ page_size: 20, ...params }),
      })
      .pipe(unwrapApi());
  }

  getCustomer(id: number): Observable<Customer> {
    return this.http
      .get<ApiResponse<Customer>>(`${this.baseUrl}/customers/${id}/`)
      .pipe(unwrapApi());
  }

  createCustomer(data: CustomerFormData): Observable<Customer> {
    return this.http
      .post<ApiResponse<Customer>>(`${this.baseUrl}/customers/`, data)
      .pipe(unwrapApi());
  }

  updateCustomer(id: number, data: CustomerFormData): Observable<Customer> {
    return this.http
      .patch<ApiResponse<Customer>>(`${this.baseUrl}/customers/${id}/`, data)
      .pipe(unwrapApi());
  }

  deleteCustomer(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/customers/${id}/`)
      .pipe(unwrapApi());
  }

  getCustomerStatement(
    id: number,
    dateFrom?: string,
    dateTo?: string,
  ): Observable<CustomerStatement> {
    const params = buildHttpParams({
      ...(dateFrom ? { date_from: dateFrom } : {}),
      ...(dateTo ? { date_to: dateTo } : {}),
    });
    return this.http
      .get<ApiResponse<CustomerStatement>>(`${this.baseUrl}/customers/${id}/statement/`, {
        params,
      })
      .pipe(unwrapApi());
  }

  // Customer Prices
  getCustomerPrices(params: ListParams = {}): Observable<PaginatedData<CustomerItemPrice>> {
    return this.http
      .get<ApiResponse<PaginatedData<CustomerItemPrice>>>(`${this.baseUrl}/customer-prices/`, {
        params: buildHttpParams({ page_size: 20, ...params }),
      })
      .pipe(unwrapApi());
  }

  createCustomerPrice(data: CustomerItemPriceFormData): Observable<CustomerItemPrice> {
    return this.http
      .post<ApiResponse<CustomerItemPrice>>(`${this.baseUrl}/customer-prices/`, data)
      .pipe(unwrapApi());
  }

  updateCustomerPrice(
    id: number,
    data: Partial<CustomerItemPriceFormData>,
  ): Observable<CustomerItemPrice> {
    return this.http
      .patch<ApiResponse<CustomerItemPrice>>(`${this.baseUrl}/customer-prices/${id}/`, data)
      .pipe(unwrapApi());
  }

  deleteCustomerPrice(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/customer-prices/${id}/`)
      .pipe(unwrapApi());
  }

  downloadCustomerPricesCsv(customerId?: number | null): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/customer-prices/export-csv/`, {
      params: buildHttpParams(customerId ? { customer: customerId } : {}),
      responseType: 'blob',
    });
  }

  importCustomerPricesCsv(file: File): Observable<{
    data: {
      created: number;
      updated: number;
      skipped: number;
      errors: string[];
      error_count: number;
    };
    message: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post<
        ApiResponse<{
          created: number;
          updated: number;
          skipped: number;
          errors: string[];
          error_count: number;
        }>
      >(`${this.baseUrl}/customer-prices/import-csv/`, formData)
      .pipe(unwrapApiWithMessage());
  }

  // Quotations
  getQuotations(params: ListParams = {}): Observable<PaginatedData<Quotation>> {
    return this.http
      .get<ApiResponse<PaginatedData<Quotation>>>(`${this.baseUrl}/quotations/`, {
        params: buildHttpParams({ page_size: 20, ...params }),
      })
      .pipe(unwrapApi());
  }

  getQuotation(id: number): Observable<Quotation> {
    return this.http
      .get<ApiResponse<Quotation>>(`${this.baseUrl}/quotations/${id}/`)
      .pipe(unwrapApi());
  }

  getQuotationDocument(id: number): Observable<QuotationDocument> {
    return this.http
      .get<ApiResponse<QuotationDocument>>(`${this.baseUrl}/quotations/${id}/document/`)
      .pipe(unwrapApi());
  }

  downloadQuotationPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/quotations/${id}/pdf/`, { responseType: 'blob' });
  }

  getQuotationDocumentByToken(token: string): Observable<QuotationDocument> {
    return this.http
      .get<ApiResponse<QuotationDocument>>(`${this.baseUrl}/quotations/token/${token}/document/`)
      .pipe(unwrapApi());
  }

  verifyQuotationByToken(token: string): Observable<QuotationVerification> {
    return this.http
      .get<ApiResponse<QuotationVerification>>(`${this.baseUrl}/quotations/token/${token}/verify/`)
      .pipe(unwrapApi());
  }

  downloadQuotationPdfByToken(token: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/quotations/token/${token}/pdf/`, { responseType: 'blob' });
  }

  createQuotation(data: QuotationFormData): Observable<Quotation> {
    return this.http
      .post<ApiResponse<Quotation>>(`${this.baseUrl}/quotations/`, data)
      .pipe(unwrapApi());
  }

  updateQuotation(id: number, data: QuotationFormData): Observable<Quotation> {
    return this.http
      .patch<ApiResponse<Quotation>>(`${this.baseUrl}/quotations/${id}/`, data)
      .pipe(unwrapApi());
  }

  sendQuotation(id: number): Observable<Quotation> {
    return this.http
      .post<ApiResponse<Quotation>>(`${this.baseUrl}/quotations/${id}/send/`, {})
      .pipe(unwrapApi());
  }

  getQuotationByToken(token: string): Observable<Quotation> {
    return this.http
      .get<ApiResponse<Quotation>>(`${this.baseUrl}/quotations/token/${token}/`)
      .pipe(unwrapApi());
  }

  respondToQuotation(
    token: string,
    response: QuotationCustomerResponse,
    notes?: string,
  ): Observable<Quotation> {
    return this.http
      .post<ApiResponse<Quotation>>(`${this.baseUrl}/quotations/token/${token}/respond/`, {
        response,
        notes: notes ?? '',
      })
      .pipe(unwrapApi());
  }

  replyToQuotationCustomer(id: number, message: string): Observable<Quotation> {
    return this.http
      .post<ApiResponse<Quotation>>(`${this.baseUrl}/quotations/${id}/reply-to-customer/`, {
        message,
      })
      .pipe(unwrapApi());
  }

  getInvoiceByToken(token: string): Observable<PublicInvoice> {
    return this.http
      .get<ApiResponse<PublicInvoice>>(`${this.baseUrl}/invoices/token/${token}/`)
      .pipe(unwrapApi());
  }

  submitInvoicePaymentProof(
    token: string,
    data: CustomerPaymentProofData,
  ): Observable<{
    data: { proof_id: number; invoice: PublicInvoice };
    message: string;
  }> {
    const form = new FormData();
    if (data.amount != null) form.append('amount', String(data.amount));
    form.append('payment_method', data.payment_method);
    form.append('reference_number', data.reference_number);
    if (data.proof_notes) form.append('proof_notes', data.proof_notes);
    if (data.customer_reply_message) form.append('customer_reply_message', data.customer_reply_message);
    if (data.customer_email) form.append('customer_email', data.customer_email);
    if (data.proof_file) form.append('proof_file', data.proof_file);
    return this.http
      .post<ApiResponse<{ proof_id: number; invoice: PublicInvoice }>>(
        `${this.baseUrl}/invoices/token/${token}/payment-proof/`,
        form,
      )
      .pipe(unwrapApiWithMessage());
  }

  acceptQuotation(id: number): Observable<Quotation> {
    return this.http
      .post<ApiResponse<Quotation>>(`${this.baseUrl}/quotations/${id}/accept/`, {})
      .pipe(unwrapApi());
  }

  rejectQuotation(id: number): Observable<Quotation> {
    return this.http
      .post<ApiResponse<Quotation>>(`${this.baseUrl}/quotations/${id}/reject/`, {})
      .pipe(unwrapApi());
  }

  convertToSO(id: number, payload: { delivery_method?: string } = {}): Observable<SalesOrder> {
    return this.http
      .post<ApiResponse<SalesOrder>>(`${this.baseUrl}/quotations/${id}/convert/`, payload)
      .pipe(unwrapApi());
  }

  duplicateQuotation(id: number): Observable<Quotation> {
    return this.http
      .post<ApiResponse<Quotation>>(`${this.baseUrl}/quotations/${id}/duplicate/`, {})
      .pipe(unwrapApi());
  }

  deleteQuotation(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/quotations/${id}/`)
      .pipe(unwrapApi());
  }

  // Sales Orders
  getSalesOrders(params: ListParams = {}): Observable<PaginatedData<SalesOrder>> {
    return this.http
      .get<ApiResponse<PaginatedData<SalesOrder>>>(`${this.baseUrl}/orders/`, {
        params: buildHttpParams({ page_size: 20, ...params }),
      })
      .pipe(unwrapApi());
  }

  getSalesOrder(id: number): Observable<SalesOrder> {
    return this.http
      .get<ApiResponse<SalesOrder>>(`${this.baseUrl}/orders/${id}/`)
      .pipe(unwrapApi());
  }

  createSalesOrder(data: SOFormData): Observable<SalesOrder> {
    return this.http
      .post<ApiResponse<SalesOrder>>(`${this.baseUrl}/orders/`, data)
      .pipe(unwrapApi());
  }

  updateSalesOrder(id: number, data: SOFormData): Observable<SalesOrder> {
    return this.http
      .patch<ApiResponse<SalesOrder>>(`${this.baseUrl}/orders/${id}/`, data)
      .pipe(unwrapApi());
  }

  confirmSalesOrder(id: number): Observable<SalesOrder> {
    return this.submitSalesOrder(id);
  }

  submitSalesOrder(id: number): Observable<SalesOrder> {
    return this.http
      .post<ApiResponse<SalesOrder>>(`${this.baseUrl}/orders/${id}/submit/`, {})
      .pipe(unwrapApi());
  }

  getOrderStockCheck(id: number): Observable<SOStockCheck> {
    return this.http
      .get<ApiResponse<SOStockCheck>>(`${this.baseUrl}/orders/${id}/stock_check/`)
      .pipe(unwrapApi());
  }

  verifyOrderStock(id: number, partial = false): Observable<{ order: SalesOrder; result: string; stock_check: SOStockCheck }> {
    return this.http
      .post<ApiResponse<{ order: SalesOrder; result: string; stock_check: SOStockCheck }>>(
        `${this.baseUrl}/orders/${id}/verify_stock/`,
        { partial },
      )
      .pipe(unwrapApi());
  }

  createOrderProcurement(id: number): Observable<{ order: SalesOrder; pr_number: string }> {
    return this.http
      .post<ApiResponse<{ order: SalesOrder; pr_number: string }>>(
        `${this.baseUrl}/orders/${id}/create_procurement/`,
        {},
      )
      .pipe(unwrapApi());
  }

  sendToLogistics(id: number): Observable<SalesOrder> {
    return this.http
      .post<ApiResponse<SalesOrder>>(`${this.baseUrl}/orders/${id}/send_to_logistics/`, {})
      .pipe(unwrapApi());
  }

  setOrderDeliveryCost(id: number, data: Partial<SODeliveryCost>): Observable<SalesOrder> {
    return this.http
      .post<ApiResponse<SalesOrder>>(`${this.baseUrl}/orders/${id}/delivery_cost/`, data)
      .pipe(unwrapApi());
  }

  sendOrderQuotation(
    id: number,
    body: { lpo_number?: string; message?: string; subject?: string } = {},
  ): Observable<{ data: SalesOrder; message: string }> {
    return this.http
      .post<ApiResponse<SalesOrder>>(`${this.baseUrl}/orders/${id}/send_quotation/`, body)
      .pipe(unwrapApiWithMessage());
  }

  proceedOrderToInvoice(id: number): Observable<{ data: SalesOrder; message: string }> {
    return this.http
      .post<ApiResponse<SalesOrder>>(`${this.baseUrl}/orders/${id}/proceed_to_invoice/`, {})
      .pipe(unwrapApiWithMessage());
  }

  acceptOrderQuotation(id: number): Observable<SalesOrder> {
    return this.http
      .post<ApiResponse<SalesOrder>>(`${this.baseUrl}/orders/${id}/accept_quotation/`, {})
      .pipe(unwrapApi());
  }

  rejectOrderQuotation(id: number, reason = ''): Observable<SalesOrder> {
    return this.http
      .post<ApiResponse<SalesOrder>>(`${this.baseUrl}/orders/${id}/reject_quotation/`, { reason })
      .pipe(unwrapApi());
  }

  generateOrderInvoice(
    id: number,
    data: GenerateInvoiceData,
  ): Observable<{
    data: {
      order: SalesOrder;
      invoice_id: number;
      invoice_number: string;
      payment_term_display?: string;
    };
    message: string;
  }> {
    return this.http
      .post<
        ApiResponse<{
          order: SalesOrder;
          invoice_id: number;
          invoice_number: string;
          payment_term_display?: string;
        }>
      >(`${this.baseUrl}/orders/${id}/generate_invoice/`, data)
      .pipe(unwrapApiWithMessage());
  }

  generateBalanceInvoice(
    orderId: number,
    data: { remaining_percent: number; send_email?: boolean } = { remaining_percent: 100 },
  ): Observable<{
    data: {
      order: SalesOrder;
      invoice_id: number;
      invoice_number: string;
      bill_percent: string;
      bill_amount: string;
    };
    message: string;
  }> {
    return this.http
      .post<
        ApiResponse<{
          order: SalesOrder;
          invoice_id: number;
          invoice_number: string;
          bill_percent: string;
          bill_amount: string;
        }>
      >(`${this.baseUrl}/orders/${orderId}/generate-balance-invoice/`, data)
      .pipe(unwrapApiWithMessage());
  }

  sendOrderToFinance(orderId: number): Observable<{ data: { order: SalesOrder }; message: string }> {
    return this.http
      .post<ApiResponse<{ order: SalesOrder }>>(
        `${this.baseUrl}/orders/${orderId}/send-to-finance/`,
        {},
      )
      .pipe(unwrapApiWithMessage());
  }

  getFulfillmentInvoicePreview(orderId: number): Observable<FulfillmentInvoicePreview> {
    return this.http
      .get<ApiResponse<FulfillmentInvoicePreview>>(
        `${this.baseUrl}/orders/${orderId}/fulfillment-invoice-preview/`,
      )
      .pipe(unwrapApi());
  }

  generateFulfillmentInvoice(
    orderId: number,
    data: GenerateInvoiceData = {},
  ): Observable<{
    data: {
      order: SalesOrder;
      invoice_id: number;
      invoice_number: string;
      invoice_kind: string;
    };
    message: string;
  }> {
    return this.http
      .post<
        ApiResponse<{
          order: SalesOrder;
          invoice_id: number;
          invoice_number: string;
          invoice_kind: string;
        }>
      >(`${this.baseUrl}/orders/${orderId}/generate-fulfillment-invoice/`, data)
      .pipe(unwrapApiWithMessage());
  }

  getOutstandingOrders(params: ListParams = {}): Observable<PaginatedData<OutstandingSalesOrder>> {
    return this.http
      .get<ApiResponse<PaginatedData<OutstandingSalesOrder>>>(
        `${this.baseUrl}/orders/outstanding/`,
        { params: buildHttpParams(params) },
      )
      .pipe(unwrapApi());
  }

  downloadInvoicePdf(id: number) {
    return this.http.get(`${this.baseUrl}/invoices/${id}/download-pdf/`, {
      responseType: 'blob',
    });
  }

  downloadSalesOrderPdf(id: number) {
    return this.http.get(`${this.baseUrl}/orders/${id}/download-pdf/`, {
      responseType: 'blob',
    });
  }

  getSalesOrderDocument(id: number): Observable<SalesOrderDocument> {
    return this.http
      .get<ApiResponse<SalesOrderDocument>>(`${this.baseUrl}/orders/${id}/document/`)
      .pipe(unwrapApi());
  }

  addInvoiceOtherCost(
    invoiceId: number,
    data: { cost_name: string; description?: string; amount: number; category?: string },
  ): Observable<InvoiceOtherCost> {
    return this.http
      .post<ApiResponse<InvoiceOtherCost>>(`${this.baseUrl}/invoices/${invoiceId}/other-costs/`, data)
      .pipe(unwrapApi());
  }

  removeInvoiceOtherCost(invoiceId: number, costId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/invoices/${invoiceId}/other-costs/${costId}/`)
      .pipe(unwrapApi());
  }

  submitOrderPayment(
    id: number,
    data: {
      amount: number;
      payment_method: string;
      reference_number: string;
      proof_notes?: string;
      customer_reply_message?: string;
      source?: string;
      proof_file?: File;
    },
  ): Observable<{ order: SalesOrder; proof_id: number }> {
    const hasFile = !!data.proof_file;
    const body: FormData | Record<string, unknown> = hasFile ? new FormData() : { ...data };
    if (hasFile && body instanceof FormData) {
      body.append('amount', String(data.amount));
      body.append('payment_method', data.payment_method);
      body.append('reference_number', data.reference_number);
      if (data.proof_notes) body.append('proof_notes', data.proof_notes);
      if (data.customer_reply_message) body.append('customer_reply_message', data.customer_reply_message);
      if (data.source) body.append('source', data.source);
      body.append('proof_file', data.proof_file!);
    } else if (!(body instanceof FormData)) {
      if (data.source) body['source'] = data.source;
      if (data.customer_reply_message) body['customer_reply_message'] = data.customer_reply_message;
    }
    return this.http
      .post<ApiResponse<{ order: SalesOrder; proof_id: number }>>(
        `${this.baseUrl}/orders/${id}/submit_payment/`,
        body,
      )
      .pipe(unwrapApi());
  }

  verifyOrderPayment(
    id: number,
    data: { proof_id?: number; approved: boolean; reason?: string },
  ): Observable<{ data: SalesOrder; message: string }> {
    return this.http
      .post<ApiResponse<SalesOrder>>(`${this.baseUrl}/orders/${id}/verify_payment/`, data)
      .pipe(unwrapApiWithMessage());
  }

  setOrderDeliveryMethod(id: number, delivery_method: string): Observable<SalesOrder> {
    return this.http
      .post<ApiResponse<SalesOrder>>(`${this.baseUrl}/orders/${id}/set_delivery_method/`, { delivery_method })
      .pipe(unwrapApi());
  }

  assignOrderVehicle(id: number, data: { vehicle_id: number; driver_id: number; driver_phone?: string; dispatch_date?: string }): Observable<SalesOrder> {
    return this.http
      .post<ApiResponse<SalesOrder>>(`${this.baseUrl}/orders/${id}/assign_vehicle/`, data)
      .pipe(unwrapApi());
  }

  assignOrderThirdParty(id: number, data: { transport_company: string; tracking_number?: string; contact_person?: string; contact_phone?: string }): Observable<SalesOrder> {
    return this.http
      .post<ApiResponse<SalesOrder>>(`${this.baseUrl}/orders/${id}/assign_third_party/`, data)
      .pipe(unwrapApi());
  }

  dispatchOrder(id: number): Observable<SalesOrder> {
    return this.http
      .post<ApiResponse<SalesOrder>>(`${this.baseUrl}/orders/${id}/dispatch-order/`, {})
      .pipe(unwrapApi());
  }

  confirmOrderPickup(id: number, data: { pickup_date: string; receiver_name: string; receiver_phone: string; notes?: string }): Observable<SalesOrder> {
    return this.http
      .post<ApiResponse<SalesOrder>>(`${this.baseUrl}/orders/${id}/confirm_pickup/`, data)
      .pipe(unwrapApi());
  }

  confirmOrderDelivery(id: number, data: { receiver_name: string; receiver_phone: string; notes?: string }): Observable<SalesOrder> {
    return this.http
      .post<ApiResponse<SalesOrder>>(`${this.baseUrl}/orders/${id}/confirm_delivery/`, data)
      .pipe(unwrapApi());
  }

  logisticsConfirmOrder(id: number, remarks = ''): Observable<SalesOrder> {
    return this.http
      .post<ApiResponse<SalesOrder>>(`${this.baseUrl}/orders/${id}/logistics_confirm/`, { remarks })
      .pipe(unwrapApi());
  }

  closeSalesOrder(
    id: number,
    data: { waive_outstanding?: boolean; reason?: string } = {},
  ): Observable<SalesOrder> {
    return this.http
      .post<ApiResponse<SalesOrder>>(`${this.baseUrl}/orders/${id}/close/`, data)
      .pipe(unwrapApi());
  }

  cancelSalesOrder(id: number, reason: string): Observable<SalesOrder> {
    return this.http
      .post<ApiResponse<SalesOrder>>(`${this.baseUrl}/orders/${id}/cancel/`, { reason })
      .pipe(unwrapApi());
  }

  deleteSalesOrder(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/orders/${id}/`)
      .pipe(unwrapApi());
  }

  // Invoices
  getInvoices(params: ListParams = {}): Observable<PaginatedData<Invoice>> {
    return this.http
      .get<ApiResponse<PaginatedData<Invoice>>>(`${this.baseUrl}/invoices/`, {
        params: buildHttpParams({ page_size: 20, ...params }),
      })
      .pipe(unwrapApi());
  }

  getInvoice(id: number): Observable<Invoice> {
    return this.http
      .get<ApiResponse<Invoice>>(`${this.baseUrl}/invoices/${id}/`)
      .pipe(unwrapApi());
  }

  createInvoice(data: InvoiceFormData): Observable<Invoice> {
    return this.http
      .post<ApiResponse<Invoice>>(`${this.baseUrl}/invoices/`, data)
      .pipe(unwrapApi());
  }

  updateInvoice(id: number, data: InvoiceFormData): Observable<Invoice> {
    return this.http
      .patch<ApiResponse<Invoice>>(`${this.baseUrl}/invoices/${id}/`, data)
      .pipe(unwrapApi());
  }

  issueInvoice(id: number): Observable<Invoice> {
    return this.http
      .post<ApiResponse<Invoice>>(`${this.baseUrl}/invoices/${id}/issue/`, {})
      .pipe(unwrapApi());
  }

  submitInvoiceForFinanceApproval(id: number): Observable<{ data: Invoice; message: string }> {
    return this.http
      .post<ApiResponse<Invoice>>(
        `${this.baseUrl}/invoices/${id}/submit-for-finance-approval/`,
        {},
      )
      .pipe(unwrapApiWithMessage());
  }

  sendInvoice(id: number): Observable<{ data: Invoice; message: string }> {
    return this.http
      .post<ApiResponse<Invoice>>(`${this.baseUrl}/invoices/${id}/send/`, {})
      .pipe(unwrapApiWithMessage());
  }

  deleteInvoice(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/invoices/${id}/`)
      .pipe(unwrapApi());
  }

  // Payments
  getPayments(params: ListParams = {}): Observable<PaginatedData<CustomerPayment>> {
    return this.http
      .get<ApiResponse<PaginatedData<CustomerPayment>>>(`${this.baseUrl}/payments/`, {
        params: buildHttpParams({ page_size: 20, ...params }),
      })
      .pipe(unwrapApi());
  }

  recordPayment(data: PaymentFormData): Observable<CustomerPayment> {
    return this.http
      .post<ApiResponse<CustomerPayment>>(`${this.baseUrl}/payments/`, data)
      .pipe(unwrapApi());
  }

  // Credit Notes
  getCreditNotes(params: ListParams = {}): Observable<PaginatedData<CreditNote>> {
    return this.http
      .get<ApiResponse<PaginatedData<CreditNote>>>(`${this.baseUrl}/credit-notes/`, {
        params: buildHttpParams({ page_size: 20, ...params }),
      })
      .pipe(unwrapApi());
  }

  getCreditNote(id: number): Observable<CreditNote> {
    return this.http
      .get<ApiResponse<CreditNote>>(`${this.baseUrl}/credit-notes/${id}/`)
      .pipe(unwrapApi());
  }

  createCreditNote(data: CreditNoteFormData): Observable<CreditNote> {
    return this.http
      .post<ApiResponse<CreditNote>>(`${this.baseUrl}/credit-notes/`, data)
      .pipe(unwrapApi());
  }

  approveCreditNote(id: number): Observable<CreditNote> {
    return this.http
      .post<ApiResponse<CreditNote>>(`${this.baseUrl}/credit-notes/${id}/approve/`, {})
      .pipe(unwrapApi());
  }

  applyCreditNote(id: number): Observable<CreditNote> {
    return this.http
      .post<ApiResponse<CreditNote>>(`${this.baseUrl}/credit-notes/${id}/apply/`, {})
      .pipe(unwrapApi());
  }

  submitCreditNote(id: number): Observable<CreditNote> {
    return this.http
      .post<ApiResponse<CreditNote>>(`${this.baseUrl}/credit-notes/${id}/submit/`, {})
      .pipe(unwrapApi());
  }

  inventoryReviewCreditNote(
    id: number,
    data: CreditNoteInventoryReviewData,
  ): Observable<CreditNote> {
    return this.http
      .post<ApiResponse<CreditNote>>(
        `${this.baseUrl}/credit-notes/${id}/inventory-review/`,
        data,
      )
      .pipe(unwrapApi());
  }

  financeReviewCreditNote(id: number, data: CreditNoteReviewData): Observable<CreditNote> {
    return this.http
      .post<ApiResponse<CreditNote>>(`${this.baseUrl}/credit-notes/${id}/finance-review/`, data)
      .pipe(unwrapApi());
  }

  gmApproveCreditNote(id: number, data: CreditNoteReviewData): Observable<CreditNote> {
    return this.http
      .post<ApiResponse<CreditNote>>(`${this.baseUrl}/credit-notes/${id}/gm-approve/`, data)
      .pipe(unwrapApi());
  }

  rejectCreditNote(id: number, data: CreditNoteRejectData): Observable<CreditNote> {
    return this.http
      .post<ApiResponse<CreditNote>>(`${this.baseUrl}/credit-notes/${id}/reject/`, data)
      .pipe(unwrapApi());
  }

  uploadCreditNoteAttachment(
    id: number,
    file: File,
    caption = '',
    attachmentType: SalesCreditAttachmentType = 'SUPPORTING',
  ): Observable<SalesCreditAttachment> {
    const form = new FormData();
    form.append('file', file);
    form.append('caption', caption);
    form.append('attachment_type', attachmentType);
    return this.http
      .post<ApiResponse<SalesCreditAttachment>>(
        `${this.baseUrl}/credit-notes/${id}/attachments/`,
        form,
      )
      .pipe(unwrapApi());
  }

  // Dashboard
  getDashboard(range?: DateRangeValue | null, bypassCache = false): Observable<SalesDashboardData> {
    const url = `${this.baseUrl}/dashboard/`;
    const params = dashboardHttpParams(range);
    return fetchCachedDashboard<SalesDashboardData>(
      this.http,
      this.dashCache,
      url,
      params,
      bypassCache,
    );
  }
}
