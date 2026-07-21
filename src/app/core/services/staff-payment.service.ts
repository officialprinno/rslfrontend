import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environments';
import { ApiResponse } from '../models/auth.models';
import { PaginatedData, ListParams } from '../models/paginated.model';
import {
  PaymentRequestCategory,
  PaymentRequestCategoryFormData,
  StaffPaymentRequest,
  StaffPaymentRequestFormData,
} from '../models/staff-payment.model';
import { buildHttpParams, unwrapApi, unwrapApiWithMessage } from '../utils/api.util';

@Injectable({ providedIn: 'root' })
export class StaffPaymentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/finance`;

  getRequests(params: ListParams = {}): Observable<PaginatedData<StaffPaymentRequest>> {
    return this.http
      .get<ApiResponse<PaginatedData<StaffPaymentRequest>>>(
        `${this.baseUrl}/staff-payment-requests/`,
        { params: buildHttpParams({ page_size: 20, ...params }) },
      )
      .pipe(unwrapApi());
  }

  getRequest(id: number): Observable<StaffPaymentRequest> {
    return this.http
      .get<ApiResponse<StaffPaymentRequest>>(`${this.baseUrl}/staff-payment-requests/${id}/`)
      .pipe(unwrapApi());
  }

  createRequest(data: StaffPaymentRequestFormData): Observable<StaffPaymentRequest> {
    const form = new FormData();
    form.append('request_type', data.request_type);
    form.append('category_id', String(data.category_id));
    form.append('amount', String(data.amount));
    form.append('purpose', data.purpose);
    form.append('activity_date', data.activity_date);
    form.append('payment_method', data.payment_method);
    if (data.bank_account_details) {
      form.append('bank_account_details', data.bank_account_details);
    }
    for (const file of data.attachments ?? []) {
      form.append('attachments', file);
    }
    return this.http
      .post<ApiResponse<StaffPaymentRequest>>(`${this.baseUrl}/staff-payment-requests/`, form)
      .pipe(unwrapApi());
  }

  hodApprove(id: number): Observable<StaffPaymentRequest> {
    return this.postAction(id, 'hod-approve');
  }

  hodReject(id: number, reason: string): Observable<StaffPaymentRequest> {
    return this.postAction(id, 'hod-reject', { reason });
  }

  gmApprove(id: number): Observable<StaffPaymentRequest> {
    return this.postAction(id, 'gm-approve');
  }

  gmReject(id: number, reason: string): Observable<StaffPaymentRequest> {
    return this.postAction(id, 'gm-reject', { reason });
  }

  financeApprove(id: number, glAccountId: number): Observable<StaffPaymentRequest> {
    return this.postAction(id, 'finance-approve', { gl_account_id: glAccountId });
  }

  financeReject(id: number, reason: string): Observable<StaffPaymentRequest> {
    return this.postAction(id, 'finance-reject', { reason });
  }

  markPaid(id: number, paymentReference = ''): Observable<StaffPaymentRequest> {
    return this.postAction(id, 'mark-paid', { payment_reference: paymentReference });
  }

  submitLiquidation(
    id: number,
    notes: string,
    attachments: File[] = [],
  ): Observable<StaffPaymentRequest> {
    const form = new FormData();
    form.append('notes', notes);
    for (const file of attachments) {
      form.append('attachments', file);
    }
    return this.http
      .post<ApiResponse<StaffPaymentRequest>>(
        `${this.baseUrl}/staff-payment-requests/${id}/submit-liquidation/`,
        form,
      )
      .pipe(unwrapApi());
  }

  approveLiquidation(id: number): Observable<StaffPaymentRequest> {
    return this.postAction(id, 'approve-liquidation');
  }

  rejectLiquidation(id: number, reason: string): Observable<StaffPaymentRequest> {
    return this.postAction(id, 'reject-liquidation', { reason });
  }

  loadCategories(): Observable<PaymentRequestCategory[]> {
    return this.http
      .get<ApiResponse<PaginatedData<PaymentRequestCategory> | PaymentRequestCategory[]>>(
        `${this.baseUrl}/payment-categories/`,
        { params: buildHttpParams({ page_size: 100 }) },
      )
      .pipe(
        unwrapApi(),
        map((data) =>
          Array.isArray(data) ? data : (data as PaginatedData<PaymentRequestCategory>).results ?? [],
        ),
      );
  }

  createCategory(data: PaymentRequestCategoryFormData): Observable<PaymentRequestCategory> {
    return this.http
      .post<ApiResponse<PaymentRequestCategory>>(`${this.baseUrl}/payment-categories/`, data)
      .pipe(unwrapApi());
  }

  updateCategory(
    id: number,
    data: Partial<PaymentRequestCategoryFormData>,
  ): Observable<PaymentRequestCategory> {
    return this.http
      .patch<ApiResponse<PaymentRequestCategory>>(`${this.baseUrl}/payment-categories/${id}/`, data)
      .pipe(unwrapApi());
  }

  private postAction(
    id: number,
    action: string,
    body: Record<string, unknown> = {},
  ): Observable<StaffPaymentRequest> {
    return this.http
      .post<ApiResponse<StaffPaymentRequest>>(
        `${this.baseUrl}/staff-payment-requests/${id}/${action}/`,
        body,
      )
      .pipe(unwrapApi());
  }
}
