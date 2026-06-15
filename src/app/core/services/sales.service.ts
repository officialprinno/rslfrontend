import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environments';
import { ApiResponse } from '../models/auth.models';
import { PaginatedData, ListParams } from '../models/paginated.model';
import {
  CreditNote,
  CreditNoteFormData,
  Customer,
  CustomerFormData,
  CustomerPayment,
  CustomerStatement,
  Invoice,
  InvoiceFormData,
  PaymentFormData,
  Quotation,
  QuotationFormData,
  SalesDashboardData,
  SalesOrder,
  SOFormData,
  SODeliveryCost,
  SOStockCheck,
} from '../models/sales.model';
import { buildHttpParams, unwrapApi } from '../utils/api.util';

@Injectable({ providedIn: 'root' })
export class SalesService {
  private readonly http = inject(HttpClient);
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

  convertToSO(id: number): Observable<SalesOrder> {
    return this.http
      .post<ApiResponse<SalesOrder>>(`${this.baseUrl}/quotations/${id}/convert/`, {})
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

  sendOrderQuotation(id: number): Observable<SalesOrder> {
    return this.http
      .post<ApiResponse<SalesOrder>>(`${this.baseUrl}/orders/${id}/send_quotation/`, {})
      .pipe(unwrapApi());
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

  generateOrderInvoice(id: number): Observable<{ order: SalesOrder; invoice_id: number; invoice_number: string }> {
    return this.http
      .post<ApiResponse<{ order: SalesOrder; invoice_id: number; invoice_number: string }>>(
        `${this.baseUrl}/orders/${id}/generate_invoice/`,
        {},
      )
      .pipe(unwrapApi());
  }

  submitOrderPayment(id: number, data: { amount: number; payment_method: string; reference_number: string; proof_notes?: string }): Observable<{ order: SalesOrder; proof_id: number }> {
    return this.http
      .post<ApiResponse<{ order: SalesOrder; proof_id: number }>>(
        `${this.baseUrl}/orders/${id}/submit_payment/`,
        data,
      )
      .pipe(unwrapApi());
  }

  verifyOrderPayment(id: number, data: { proof_id?: number; approved: boolean; reason?: string }): Observable<SalesOrder> {
    return this.http
      .post<ApiResponse<SalesOrder>>(`${this.baseUrl}/orders/${id}/verify_payment/`, data)
      .pipe(unwrapApi());
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

  closeSalesOrder(id: number): Observable<SalesOrder> {
    return this.http
      .post<ApiResponse<SalesOrder>>(`${this.baseUrl}/orders/${id}/close/`, {})
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

  sendInvoice(id: number): Observable<Invoice> {
    return this.http
      .post<ApiResponse<Invoice>>(`${this.baseUrl}/invoices/${id}/send/`, {})
      .pipe(unwrapApi());
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

  // Dashboard
  getDashboard(): Observable<SalesDashboardData> {
    return this.http
      .get<ApiResponse<SalesDashboardData>>(`${this.baseUrl}/dashboard/`)
      .pipe(unwrapApi());
  }
}
