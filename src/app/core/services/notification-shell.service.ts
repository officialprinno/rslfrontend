import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Subscription, finalize } from 'rxjs';

import { AppNotification, Message } from '../models/messaging.model';
import { AlertSoundService } from './alert-sound.service';
import { AuthService } from './auth.service';
import { ChatWidgetService } from './chat-widget.service';
import { MessagingService } from './messaging.service';
import { NotificationCountsService } from './notification-counts.service';
import { NotificationService } from './notification.service';
import { WebsocketService } from './websocket.service';

const BADGE_REFRESH_MS = 60_000;
const MESSAGE_REMINDER_MS = 30 * 60_000;
const BROADCAST_REMINDER_MS = 60 * 60_000;

/**
 * Owns notification UI and reminders for one authenticated application shell.
 * MainLayout provides this service, so timers and subscriptions cannot outlive the session shell.
 */
@Injectable()
export class NotificationShellService {
  private readonly messaging = inject(MessagingService);
  private readonly counts = inject(NotificationCountsService);
  private readonly notifications = inject(NotificationService);
  private readonly ws = inject(WebsocketService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly sounds = inject(AlertSoundService);
  private readonly chatWidget = inject(ChatWidgetService);
  private readonly translate = inject(TranslateService);

  private readonly subscriptions = new Subscription();
  private timers: number[] = [];
  private broadcastExpiryTimer: number | null = null;
  private started = false;
  private loadingBroadcasts = false;
  private loadingMessageReminder = false;
  private countsPrimed = false;
  private lastEmailUnread = 0;
  private seenMessageIds = new Set<number>();

  readonly drawerOpen = signal(false);
  readonly refreshVersion = signal(0);
  readonly activeBroadcast = signal<AppNotification | null>(null);

  start(): void {
    if (this.started) return;
    this.started = true;

    this.ws.connect();
    this.subscriptions.add(
      this.ws.onNotification$.subscribe((payload) => {
        this.refreshFromEvent();
        this.handleNotificationEvent(payload);
      }),
    );
    this.subscriptions.add(
      this.ws.onMessage$.subscribe((msg) => {
        this.refreshFromEvent();
        this.handleIncomingMessage(msg);
      }),
    );

    this.refreshBadges();
    this.checkBroadcasts();
    this.checkMessages();
    this.timers = [
      window.setInterval(() => {
        this.refreshBadges();
        this.refreshVersion.update((version) => version + 1);
        if (!this.activeBroadcast()) this.checkBroadcasts();
      }, BADGE_REFRESH_MS),
      window.setInterval(() => this.checkMessages(), MESSAGE_REMINDER_MS),
      window.setInterval(() => this.checkBroadcasts(), BROADCAST_REMINDER_MS),
    ];
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    this.subscriptions.unsubscribe();
    this.timers.forEach((timer) => window.clearInterval(timer));
    this.timers = [];
    this.drawerOpen.set(false);
    this.clearActiveBroadcast();
    this.ws.disconnect();
    this.countsPrimed = false;
    this.seenMessageIds.clear();
  }

  openDrawer(): void {
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  notifyListChanged(): void {
    this.refreshBadges();
    this.refreshVersion.update((version) => version + 1);
  }

  openBroadcast(notification: AppNotification): void {
    this.clearActiveBroadcast();
    this.markRead(notification);
    const target = notification.navigate_to ?? this.fallbackRoute(notification);
    if (target) {
      void this.router.navigateByUrl(target).then((navigated) => {
        if (!navigated) this.notifications.error('Unable to open this broadcast.');
      }).catch(() => this.notifications.error('Unable to open this broadcast.'));
    } else {
      this.openDrawer();
    }
  }

  markBroadcastRead(notification: AppNotification): void {
    this.clearActiveBroadcast();
    this.markRead(notification);
  }

  private handleIncomingMessage(msg: Message): void {
    const me = this.auth.getCurrentUser()?.id;
    if (!me || msg.sender_id === me) return;
    if (this.seenMessageIds.has(msg.id)) return;
    this.seenMessageIds.add(msg.id);
    if (this.seenMessageIds.size > 200) {
      const first = this.seenMessageIds.values().next().value;
      if (first != null) this.seenMessageIds.delete(first);
    }

    // Already reading this thread in the floating widget — badge refresh is enough.
    if (this.chatWidget.isViewingConversation(msg.conversation_id)) return;

    const preview =
      (msg.body || '').trim() || this.translate.instant('common.chat_widget.attachment_fallback');
    this.sounds.playMessage();
    this.notifications.info(preview, {
      kind: 'message',
      title: msg.sender_name || this.translate.instant('common.toast.new_message'),
      actionLabel: 'common.toast.open_chat',
      conversationId: msg.conversation_id,
      durationMs: 8000,
    });
  }

  private handleNotificationEvent(payload: unknown): void {
    const data = payload as Partial<AppNotification> | null;
    if (!data) return;
    if (data.type === 'BROADCAST') {
      this.checkBroadcasts();
      return;
    }
    // Generic in-app notifications (approvals, alerts) still get a soft ping.
    if (data.title || data.body) {
      this.sounds.playMessage();
      this.notifications.info(data.body || '', {
        title: data.title || undefined,
        actionUrl: data.navigate_to ?? undefined,
        actionLabel: data.navigate_to ? 'common.view' : undefined,
        durationMs: 7000,
      });
    }
  }

  private refreshFromEvent(): void {
    this.refreshBadges();
    this.refreshVersion.update((version) => version + 1);
  }

  private refreshBadges(): void {
    this.counts.refresh$().subscribe({
      next: (snapshot) => {
        if (!this.countsPrimed) {
          this.lastEmailUnread = snapshot.emails;
          this.countsPrimed = true;
          return;
        }
        if (snapshot.emails > this.lastEmailUnread) {
          const added = snapshot.emails - this.lastEmailUnread;
          this.announceNewEmail(added);
        }
        this.lastEmailUnread = snapshot.emails;
      },
    });
  }

  private announceNewEmail(count: number): void {
    if (this.router.url.startsWith('/email')) {
      // User is already in the mailbox — sound only.
      this.sounds.playEmail();
      return;
    }
    this.sounds.playEmail();
    const message = this.translate.instant(
      count === 1 ? 'common.toast.email_one' : 'common.toast.email_many',
      { count },
    );
    this.notifications.info(message, {
      kind: 'email',
      title: 'common.toast.new_email',
      actionLabel: 'common.toast.open_email',
      actionUrl: '/email',
      durationMs: 8000,
    });
  }

  private checkBroadcasts(): void {
    if (this.loadingBroadcasts) return;
    this.loadingBroadcasts = true;
    this.messaging
      .getNotifications(true)
      .pipe(finalize(() => (this.loadingBroadcasts = false)))
      .subscribe({
        next: (items) => {
          const broadcast = items.find((item) => item.type === 'BROADCAST');
          if (broadcast) {
            this.showBroadcast(broadcast);
          } else {
            this.clearActiveBroadcast();
          }
        },
        error: () => {
          // Badge polling remains active; avoid a disruptive toast for background checks.
        },
      });
  }

  private showBroadcast(notification: AppNotification): void {
    this.clearBroadcastExpiryTimer();
    this.activeBroadcast.set(notification);
    if (!notification.broadcast_expires_at) return;

    const expiresAt = new Date(notification.broadcast_expires_at).getTime();
    const remaining = expiresAt - Date.now();
    if (!Number.isFinite(expiresAt) || remaining <= 0) {
      this.clearActiveBroadcast();
      return;
    }

    this.broadcastExpiryTimer = window.setTimeout(
      () => {
        const active = this.activeBroadcast();
        if (active?.id !== notification.id) return;
        if (Date.now() >= expiresAt) {
          this.clearActiveBroadcast();
        } else {
          this.showBroadcast(notification);
        }
      },
      Math.min(remaining, 2_147_483_647),
    );
  }

  private clearActiveBroadcast(): void {
    this.clearBroadcastExpiryTimer();
    this.activeBroadcast.set(null);
  }

  private clearBroadcastExpiryTimer(): void {
    if (this.broadcastExpiryTimer === null) return;
    window.clearTimeout(this.broadcastExpiryTimer);
    this.broadcastExpiryTimer = null;
  }

  private checkMessages(): void {
    if (this.loadingMessageReminder) return;
    this.loadingMessageReminder = true;
    this.messaging
      .getUnreadCount()
      .pipe(finalize(() => (this.loadingMessageReminder = false)))
      .subscribe({
        next: (count) => {
          if (count.messages > 0) {
            const suffix = count.messages === 1 ? 'message' : 'messages';
            this.notifications.info(`You have ${count.messages} unread ${suffix}.`);
          }
        },
      });
  }

  private markRead(notification: AppNotification): void {
    this.messaging.markNotificationRead(notification.id).subscribe({
      next: () => {
        this.notifyListChanged();
        this.checkBroadcasts();
      },
      error: () => {
        this.notifications.error('Could not mark the broadcast as read. Please try again.');
        this.notifyListChanged();
      },
    });
  }

  private fallbackRoute(notification: AppNotification): string | null {
    const id = notification.reference_id;
    if (!id) return null;
    const routes: Record<string, string> = {
      conversation: `/messaging?c=${id}`,
      sales_order: `/sales/orders/${id}/view`,
      sales_credit_note: `/sales/credit-notes/${id}/view`,
      purchase_order: `/procurement/purchase-orders/${id}/view`,
      payroll: `/hr/payroll/${id}`,
    };
    return notification.reference_type ? (routes[notification.reference_type] ?? null) : null;
  }
}
