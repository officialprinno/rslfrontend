import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../environments/environments';
import { ApiResponse } from '../models/auth.models';
import {
  ComposeEmailData,
  Email,
  EmailAccount,
  EmailAccountAccess,
  EmailFilters,
  Label,
  MailboxPermission,
  MailboxProvisionData,
  PollResult,
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

  getMyAccounts(): Observable<EmailAccount[]> {
    return this.http
      .get<ApiResponse<EmailAccount[]>>(`${this.baseUrl}/account/mine/`)
      .pipe(unwrapApi());
  }

  poll(accountId?: number, since?: string | null): Observable<PollResult> {
    const params: Record<string, string | number> = {};
    if (accountId) params['account_id'] = accountId;
    if (since) params['since'] = since;
    return this.http
      .get<ApiResponse<PollResult>>(`${this.baseUrl}/account/poll/`, {
        params: buildHttpParams(params),
      })
      .pipe(unwrapApi());
  }

  syncEmails(accountId?: number): Observable<SyncResult> {
    return this.http
      .post<ApiResponse<SyncResult>>(`${this.baseUrl}/account/sync/`, {
        account_id: accountId ?? null,
      })
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
    if (filters.account_id) params['account_id'] = filters.account_id;
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
    if (data.attachments?.length) {
      const form = new FormData();
      form.append('to', JSON.stringify(data.to));
      form.append('cc', JSON.stringify(data.cc ?? []));
      form.append('bcc', JSON.stringify(data.bcc ?? []));
      form.append('subject', data.subject);
      form.append('body_html', data.body_html);
      form.append('body_text', data.body_text ?? '');
      if (data.account_id) form.append('account_id', String(data.account_id));
      if (data.reply_to_id) form.append('reply_to_id', String(data.reply_to_id));
      for (const file of data.attachments) {
        form.append('attachments', file, file.name);
      }
      return this.http
        .post<ApiResponse<Email>>(`${this.baseUrl}/messages/send/`, form)
        .pipe(unwrapApi());
    }
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

  getLabels(accountId?: number): Observable<Label[]> {
    const params: Record<string, string | number> = {};
    if (accountId) params['account_id'] = accountId;
    return this.http
      .get<ApiResponse<{ results: Label[] } | Label[]>>(`${this.baseUrl}/labels/`, {
        params: buildHttpParams(params),
      })
      .pipe(
        unwrapApi(),
        map((data) => (Array.isArray(data) ? data : (data?.results ?? []))),
      );
  }

  createLabel(data: { name: string; color: string }, accountId?: number): Observable<Label> {
    return this.http
      .post<ApiResponse<Label>>(`${this.baseUrl}/labels/`, {
        ...data,
        account_id: accountId,
      })
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

  getUnreadCount(accountId?: number): Observable<{ inbox: number; total: number }> {
    const params: Record<string, string | number> = {};
    if (accountId) params['account_id'] = accountId;
    return this.http
      .get<ApiResponse<{ inbox: number; total: number }>>(`${this.baseUrl}/messages/unread-count/`, {
        params: buildHttpParams(params),
      })
      .pipe(unwrapApi());
  }

  // --- Super Admin mailbox management ---

  adminListMailboxes(params?: Record<string, string>): Observable<EmailAccount[]> {
    return this.http
      .get<ApiResponse<EmailAccount[]>>(`${this.baseUrl}/admin/mailboxes/`, {
        params: buildHttpParams(params ?? {}),
      })
      .pipe(unwrapApi());
  }

  adminGetMailbox(id: number): Observable<EmailAccount> {
    return this.http
      .get<ApiResponse<EmailAccount>>(`${this.baseUrl}/admin/mailboxes/${id}/`)
      .pipe(unwrapApi());
  }

  adminProvisionMailbox(data: MailboxProvisionData): Observable<EmailAccount> {
    return this.http
      .post<ApiResponse<EmailAccount>>(`${this.baseUrl}/admin/mailboxes/`, data)
      .pipe(unwrapApi());
  }

  adminSuggestAddress(userId: number): Observable<{ email_address: string }> {
    return this.http
      .get<ApiResponse<{ email_address: string }>>(
        `${this.baseUrl}/admin/mailboxes/suggest-address/`,
        { params: buildHttpParams({ user_id: userId }) },
      )
      .pipe(unwrapApi());
  }

  adminDisableMailbox(id: number): Observable<EmailAccount> {
    return this.http
      .post<ApiResponse<EmailAccount>>(`${this.baseUrl}/admin/mailboxes/${id}/disable/`, {})
      .pipe(unwrapApi());
  }

  adminEnableMailbox(id: number): Observable<EmailAccount> {
    return this.http
      .post<ApiResponse<EmailAccount>>(`${this.baseUrl}/admin/mailboxes/${id}/enable/`, {})
      .pipe(unwrapApi());
  }

  adminDeleteMailbox(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/admin/mailboxes/${id}/?confirm=1`)
      .pipe(unwrapApi());
  }

  adminGrantAccess(
    mailboxId: number,
    userId: number,
    permission: MailboxPermission = 'FULL',
  ): Observable<EmailAccountAccess> {
    return this.http
      .post<ApiResponse<EmailAccountAccess>>(
        `${this.baseUrl}/admin/mailboxes/${mailboxId}/access/`,
        { user_id: userId, permission },
      )
      .pipe(unwrapApi());
  }

  adminRevokeAccess(mailboxId: number, accessId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(
        `${this.baseUrl}/admin/mailboxes/${mailboxId}/access/${accessId}/`,
      )
      .pipe(unwrapApi());
  }
}
