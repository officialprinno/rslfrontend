import { Injectable, inject, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { environment } from '../../environments/environments';
import { Message, OnlineStatusEvent, TypingEvent } from '../models/messaging.model';
import { StorageService } from './storage.service';

type WsEvent =
  | { type: 'message.new'; payload: Message }
  | { type: 'typing.start'; payload: TypingEvent }
  | { type: 'typing.stop'; payload: TypingEvent }
  | { type: 'user.online'; payload: OnlineStatusEvent }
  | { type: 'notification.new'; payload: unknown }
  | { type: 'pong' };

@Injectable({ providedIn: 'root' })
export class WebsocketService implements OnDestroy {
  private readonly storage = inject(StorageService);

  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly queue: string[] = [];

  private readonly messageSubject = new Subject<Message>();
  private readonly typingSubject = new Subject<TypingEvent & { active: boolean }>();
  private readonly onlineSubject = new Subject<OnlineStatusEvent>();
  private readonly notificationSubject = new Subject<unknown>();

  readonly onMessage$ = this.messageSubject.asObservable();
  readonly onTyping$ = this.typingSubject.asObservable();
  readonly onOnlineStatus$ = this.onlineSubject.asObservable();
  readonly onNotification$ = this.notificationSubject.asObservable();

  connect(): void {
    const token = this.storage.getToken();
    if (!token || this.socket?.readyState === WebSocket.OPEN) {
      return;
    }
    const url = `${environment.wsUrl}/messaging/?token=${encodeURIComponent(token)}`;
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.flushQueue();
      this.startHeartbeat();
    };

    this.socket.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data as string) as WsEvent;
        this.handleEvent(data);
      } catch {
        /* ignore malformed */
      }
    };

    this.socket.onclose = () => {
      this.stopHeartbeat();
      this.scheduleReconnect();
    };

    this.socket.onerror = () => {
      this.socket?.close();
    };
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
  }

  send(type: string, payload: Record<string, unknown> = {}): void {
    const raw = JSON.stringify({ type, payload });
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(raw);
    } else {
      this.queue.push(raw);
    }
  }

  emitTyping(conversationId: number, active: boolean): void {
    this.send(active ? 'typing.start' : 'typing.stop', { conversation_id: conversationId });
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  private handleEvent(data: WsEvent): void {
    switch (data.type) {
      case 'message.new':
        this.messageSubject.next(data.payload);
        break;
      case 'typing.start':
        this.typingSubject.next({ ...data.payload, active: true });
        break;
      case 'typing.stop':
        this.typingSubject.next({ ...data.payload, active: false });
        break;
      case 'user.online':
        this.onlineSubject.next(data.payload);
        break;
      case 'notification.new':
        this.notificationSubject.next(data.payload);
        break;
    }
  }

  private flushQueue(): void {
    while (this.queue.length && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(this.queue.shift()!);
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => this.send('ping'), 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const delay = Math.min(30000, 1000 * 2 ** this.reconnectAttempts);
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}
