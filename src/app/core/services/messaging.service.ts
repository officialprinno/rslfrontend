import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../environments/environments';
import { ApiResponse } from '../models/auth.models';
import {
  AppNotification,
  BroadcastData,
  Conversation,
  Message,
  SendMessageData,
} from '../models/messaging.model';
import { PaginatedData } from '../models/paginated.model';
import { buildHttpParams, unwrapApi } from '../utils/api.util';

@Injectable({ providedIn: 'root' })
export class MessagingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/messaging`;

  getConversations(): Observable<Conversation[]> {
    return this.http
      .get<ApiResponse<{ results: Conversation[] } | Conversation[]>>(`${this.baseUrl}/conversations/`)
      .pipe(
        unwrapApi(),
        map((data) => (Array.isArray(data) ? data : (data?.results ?? []))),
      );
  }

  getConversation(id: number): Observable<Conversation> {
    return this.http
      .get<ApiResponse<Conversation>>(`${this.baseUrl}/conversations/${id}/`)
      .pipe(unwrapApi());
  }

  createDirectMessage(userId: number): Observable<Conversation> {
    return this.http
      .post<ApiResponse<Conversation>>(`${this.baseUrl}/conversations/direct/`, { user_id: userId })
      .pipe(unwrapApi());
  }

  createGroup(name: string, memberIds: number[]): Observable<Conversation> {
    return this.http
      .post<ApiResponse<Conversation>>(`${this.baseUrl}/conversations/group/`, {
        name,
        member_ids: memberIds,
      })
      .pipe(unwrapApi());
  }

  getMessages(conversationId: number, page = 1): Observable<PaginatedData<Message>> {
    return this.http
      .get<ApiResponse<PaginatedData<Message>>>(
        `${this.baseUrl}/conversations/${conversationId}/messages/`,
        { params: buildHttpParams({ page, page_size: 50 }) },
      )
      .pipe(unwrapApi());
  }

  sendMessage(conversationId: number, data: SendMessageData): Observable<Message> {
    return this.http
      .post<ApiResponse<Message>>(`${this.baseUrl}/conversations/${conversationId}/send/`, data)
      .pipe(unwrapApi());
  }

  uploadAttachment(conversationId: number, file: File): Observable<Message> {
    const form = new FormData();
    form.append('file', file);
    return this.http
      .post<ApiResponse<Message>>(`${this.baseUrl}/conversations/${conversationId}/upload/`, form)
      .pipe(unwrapApi());
  }

  deleteMessage(conversationId: number, messageId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/conversations/${conversationId}/messages/${messageId}/`)
      .pipe(unwrapApi());
  }

  markAsRead(conversationId: number): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.baseUrl}/conversations/${conversationId}/mark-read/`, {})
      .pipe(unwrapApi());
  }

  sendBroadcast(data: BroadcastData): Observable<{ conversation: Conversation; message: Message }> {
    return this.http
      .post<ApiResponse<{ conversation: Conversation; message: Message }>>(
        `${this.baseUrl}/broadcasts/`,
        data,
      )
      .pipe(unwrapApi());
  }

  getNotifications(unreadOnly = false): Observable<AppNotification[]> {
    return this.http
      .get<ApiResponse<{ results: AppNotification[] } | AppNotification[]>>(
        `${this.baseUrl}/notifications/`,
        { params: buildHttpParams({ unread_only: unreadOnly ? 'true' : '' }) },
      )
      .pipe(
        unwrapApi(),
        map((data) => (Array.isArray(data) ? data : (data?.results ?? []))),
      );
  }

  markNotificationRead(id: number): Observable<AppNotification> {
    return this.http
      .post<ApiResponse<AppNotification>>(`${this.baseUrl}/notifications/${id}/mark-read/`, {})
      .pipe(unwrapApi());
  }

  markAllRead(): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.baseUrl}/notifications/mark-all-read/`, {})
      .pipe(unwrapApi());
  }

  searchUsers(query = ''): Observable<{ id: number; full_name: string; department_name: string; role_name: string }[]> {
    return this.http
      .get<ApiResponse<{ results: { id: number; full_name: string; department_name: string; role_name: string }[] }>>(
        `${environment.apiUrl}/auth/users/`,
        { params: buildHttpParams({ search: query, page_size: 50 }) },
      )
      .pipe(
        unwrapApi(),
        map((data) => (Array.isArray(data) ? data : (data?.results ?? []))),
      );
  }

  getUnreadCount(): Observable<{ messages: number; notifications: number; total: number }> {
    return this.http
      .get<ApiResponse<{ messages: number; notifications: number; total: number }>>(
        `${this.baseUrl}/notifications/unread-count/`,
      )
      .pipe(unwrapApi());
  }
}
