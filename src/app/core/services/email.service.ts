import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../environments/environments';
import { ApiResponse } from '../models/auth.models';
import {
  ComposeEmailData,
  ConnectionTest,
  Email,
  EmailAccount,
  EmailFilters,
  Label,
  SyncResult,
} from '../models/email.model';
import { PaginatedData } from '../models/paginated.model';
import { buildHttpParams, unwrapApi } from '../utils/api.util';

@Injectable({ providedIn: 'root' })
export class EmailService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/email`;

  getEmailAccount(): Observable<EmailAccount | null> {
    return this.http
      .get<ApiResponse<EmailAccount | null>>(`${this.baseUrl}/account/account/`)
      .pipe(unwrapApi());
  }

  setupEmailAccount(data: Partial<EmailAccount> & { password?: string }): Observable<EmailAccount> {
    return this.http
      .post<ApiResponse<EmailAccount>>(`${this.baseUrl}/account/setup/`, data)
      .pipe(unwrapApi());
  }

  testConnection(data: Record<string, unknown>): Observable<ConnectionTest> {
    return this.http
      .post<ApiResponse<ConnectionTest>>(`${this.baseUrl}/account/test-connection/`, data)
      .pipe(unwrapApi());
  }

  syncEmails(): Observable<SyncResult> {
    return this.http
      .post<ApiResponse<SyncResult>>(`${this.baseUrl}/account/sync/`, {})
      .pipe(unwrapApi());
  }

  getEmails(filters: EmailFilters = {}): Observable<PaginatedData<Email>> {
    const params: Record<string, string | number> = { page_size: 50 };
    if (filters.folder) params['folder'] = filters.folder;
    if (filters.unread) params['unread'] = 'true';
    if (filters.starred) params['starred'] = 'true';
    if (filters.has_attachment) params['has_attachment'] = 'true';
    if (filters.search) params['search'] = filters.search;
    if (filters.label) params['label'] = filters.label;
    if (filters.sort) params['sort'] = filters.sort;
    if (filters.page) params['page'] = filters.page;
    return this.http
      .get<ApiResponse<PaginatedData<Email>>>(`${this.baseUrl}/messages/`, {
        params: buildHttpParams(params),
      })
      .pipe(unwrapApi());
  }

  getEmail(id: number): Observable<Email> {
    return this.http
      .get<ApiResponse<Email>>(`${this.baseUrl}/messages/${id}/`)
      .pipe(unwrapApi());
  }

  sendEmail(data: ComposeEmailData): Observable<Email> {
    return this.http
      .post<ApiResponse<Email>>(`${this.baseUrl}/messages/send/`, data)
      .pipe(unwrapApi());
  }

  saveDraft(data: ComposeEmailData): Observable<Email> {
    return this.sendEmail({ ...data, scheduled_at: new Date().toISOString() });
  }

  deleteEmail(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/messages/${id}/`).pipe(unwrapApi());
  }

  moveEmail(id: number, folder: string): Observable<Email> {
    return this.http
      .post<ApiResponse<Email>>(`${this.baseUrl}/messages/${id}/move/`, { folder })
      .pipe(unwrapApi());
  }

  markRead(id: number): Observable<Email> {
    return this.http
      .post<ApiResponse<Email>>(`${this.baseUrl}/messages/${id}/mark-read/`, {})
      .pipe(unwrapApi());
  }

  markUnread(id: number): Observable<Email> {
    return this.http
      .post<ApiResponse<Email>>(`${this.baseUrl}/messages/${id}/mark-unread/`, {})
      .pipe(unwrapApi());
  }

  starEmail(id: number): Observable<Email> {
    return this.http
      .post<ApiResponse<Email>>(`${this.baseUrl}/messages/${id}/star/`, {})
      .pipe(unwrapApi());
  }

  unstarEmail(id: number): Observable<Email> {
    return this.http
      .post<ApiResponse<Email>>(`${this.baseUrl}/messages/${id}/unstar/`, {})
      .pipe(unwrapApi());
  }

  applyLabel(id: number, labelId: number): Observable<Email> {
    return this.http
      .post<ApiResponse<Email>>(`${this.baseUrl}/messages/${id}/apply-label/`, { label_id: labelId })
      .pipe(unwrapApi());
  }

  bulkAction(
    ids: number[],
    action: string,
    extra?: Record<string, unknown>,
  ): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.baseUrl}/messages/bulk/`, { ids, action, ...extra })
      .pipe(unwrapApi());
  }

  getLabels(): Observable<Label[]> {
    return this.http
      .get<ApiResponse<{ results: Label[] } | Label[]>>(`${this.baseUrl}/labels/`)
      .pipe(
        unwrapApi(),
        map((data) => (Array.isArray(data) ? data : (data?.results ?? []))),
      );
  }

  createLabel(data: { name: string; color: string }): Observable<Label> {
    return this.http
      .post<ApiResponse<Label>>(`${this.baseUrl}/labels/`, data)
      .pipe(unwrapApi());
  }

  updateLabel(id: number, data: Partial<Label>): Observable<Label> {
    return this.http
      .patch<ApiResponse<Label>>(`${this.baseUrl}/labels/${id}/`, data)
      .pipe(unwrapApi());
  }

  deleteLabel(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/labels/${id}/`).pipe(unwrapApi());
  }

  getUnreadCount(): Observable<{ inbox: number; total: number }> {
    return this.http
      .get<ApiResponse<{ inbox: number; total: number }>>(`${this.baseUrl}/messages/unread-count/`)
      .pipe(unwrapApi());
  }
}
