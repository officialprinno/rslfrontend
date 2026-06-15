import { Injectable, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';

import { EmailService } from './email.service';
import { MessagingService } from './messaging.service';

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
    this.messaging
      .getUnreadCount()
      .pipe(catchError(() => of({ messages: 0, notifications: 0, total: 0 })))
      .subscribe((c) => {
        this.unreadMessages.set(c.messages);
        this.unreadNotifications.set(c.notifications);
      });

    this.email
      .getUnreadCount()
      .pipe(catchError(() => of({ inbox: 0, total: 0 })))
      .subscribe((c) => this.unreadEmails.set(c.inbox));
  }
}
