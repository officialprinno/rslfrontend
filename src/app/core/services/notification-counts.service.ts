import { Injectable, inject, signal } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, tap } from 'rxjs';

import { EmailService } from './email.service';
import { MessagingService } from './messaging.service';

export interface UnreadSnapshot {
  messages: number;
  notifications: number;
  emails: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationCountsService {
  private readonly messaging = inject(MessagingService);
  private readonly email = inject(EmailService);

  readonly unreadNotifications = signal(0);
  readonly unreadMessages = signal(0);
  readonly unreadEmails = signal(0);

  constructor() {
    this.refresh();
  }

  badgeFor(key: 'messages' | 'email'): number {
    return key === 'messages' ? this.unreadMessages() : this.unreadEmails();
  }

  refresh(): void {
    this.refresh$().subscribe();
  }

  refresh$(): Observable<UnreadSnapshot> {
    return forkJoin({
      messaging: this.messaging
        .getUnreadCount()
        .pipe(catchError(() => of({ messages: 0, notifications: 0, total: 0 }))),
      email: this.email.getUnreadCount().pipe(catchError(() => of({ inbox: 0, total: 0 }))),
    }).pipe(
      map(({ messaging, email }) => ({
        messages: messaging.messages,
        notifications: messaging.notifications,
        emails: email.inbox,
      })),
      tap((snapshot) => {
        this.unreadMessages.set(snapshot.messages);
        this.unreadNotifications.set(snapshot.notifications);
        this.unreadEmails.set(snapshot.emails);
      }),
    );
  }

  reset(): void {
    this.unreadNotifications.set(0);
    this.unreadMessages.set(0);
    this.unreadEmails.set(0);
    this.refresh();
  }
}
