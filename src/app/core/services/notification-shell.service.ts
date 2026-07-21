import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, finalize } from 'rxjs';

import { AppNotification } from '../models/messaging.model';
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

  private readonly subscriptions = new Subscription();
  private timers: number[] = [];
  private broadcastExpiryTimer: number | null = null;
  private started = false;
  private loadingBroadcasts = false;
  private loadingMessageReminder = false;

  readonly drawerOpen = signal(false);
  readonly refreshVersion = signal(0);
  readonly activeBroadcast = signal<AppNotification | null>(null);

  start(): void {
    if (this.started) return;
    this.started = true;

    this.ws.connect();
    this.subscriptions.add(
      this.ws.onNotification$.subscribe(() => this.refreshFromEvent()),
    );
    this.subscriptions.add(
      this.ws.onMessage$.subscribe(() => this.refreshFromEvent()),
    );

    this.refreshBadges();
    this.checkBroadcasts();
    this.checkMessages();
    this.timers = [
      window.setInterval(() => {
        this.refreshBadges();
        this.refreshVersion.update((version) => version + 1);
        // Detect scheduled broadcasts shortly after their visibility window opens.
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

  private refreshFromEvent(): void {
    this.refreshBadges();
    this.refreshVersion.update((version) => version + 1);
  }

  private refreshBadges(): void {
    this.counts.refresh();
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
        // Surface another unread broadcast from the user's targeted queue, if any.
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
