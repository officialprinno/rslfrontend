import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { AppNotification } from '../../../core/models/messaging.model';
import { MessagingService } from '../../../core/services/messaging.service';
import { NotificationCountsService } from '../../../core/services/notification-counts.service';
import { NotificationService } from '../../../core/services/notification.service';
import { timeAgo } from '../../../core/utils/time.util';

@Component({
  selector: 'app-notifications-panel',
  imports: [],
  template: `
    @if (open()) {
      <div class="notif-backdrop" (click)="close.emit()"></div>
      <aside class="notif-panel" role="dialog" aria-modal="true" aria-label="Notifications">
        <header class="notif-panel-header">
          <div>
            <h2 class="font-semibold text-(--text-primary)">Notifications</h2>
            <p class="mt-0.5 text-xs text-(--text-muted)">Updates and activity requiring your attention</p>
          </div>
          <button type="button" class="btn-icon" (click)="close.emit()" aria-label="Close">×</button>
        </header>
        <div class="notif-tabs">
          <button type="button" [class.active]="tab() === 'all'" (click)="tab.set('all')">All</button>
          <button type="button" [class.active]="tab() === 'unread'" (click)="tab.set('unread')">Unread</button>
        </div>
        <button type="button" class="text-xs text-[#1B3A6B] px-4 py-2 hover:underline" (click)="markAll()">
          Mark all as read
        </button>
        <div class="notif-list">
          @if (loading()) {
            <p class="text-sm text-gray-400 p-4">Loading...</p>
          } @else if (!items().length) {
            <p class="text-sm text-gray-400 p-4">No notifications</p>
          } @else {
            @for (n of items(); track n.id) {
              <button
                type="button"
                class="notif-item"
                [class.unread]="!n.is_read"
                (click)="openNotification(n)"
              >
                <span class="notif-icon" [attr.data-color]="n.color">{{ iconFor(n) }}</span>
                <div class="text-left min-w-0">
                  <p class="text-sm font-medium text-(--text-primary)">{{ n.title }}</p>
                  <p class="text-xs text-gray-500 line-clamp-2">{{ n.body }}</p>
                  <p class="text-[10px] text-gray-400 mt-1">{{ timeAgo(n.created_at) }}</p>
                </div>
              </button>
            }
          }
        </div>
      </aside>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPanelComponent {
  private readonly messaging = inject(MessagingService);
  private readonly counts = inject(NotificationCountsService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  readonly open = input(false);
  readonly refreshVersion = input(0);
  readonly close = output<void>();
  readonly changed = output<void>();

  readonly tab = signal<'all' | 'unread'>('all');
  readonly items = signal<AppNotification[]>([]);
  readonly loading = signal(false);
  readonly timeAgo = timeAgo;

  constructor() {
    effect(() => {
      this.refreshVersion();
      this.tab();
      if (this.open()) this.load();
    });
  }

  load(): void {
    this.loading.set(true);
    this.messaging
      .getNotifications(this.tab() === 'unread')
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (list) => this.items.set(list),
        error: () => this.notifications.error('Unable to load notifications. Please try again.'),
      });
  }

  markAll(): void {
    const previous = this.items();
    this.items.update((items) => items.map((item) => ({ ...item, is_read: true })));
    this.messaging.markAllRead().subscribe({
      next: () => this.afterChange(),
      error: () => {
        this.items.set(previous);
        this.notifications.error('Unable to mark notifications as read. Please try again.');
        this.afterChange();
      },
    });
  }

  openNotification(n: AppNotification): void {
    const target = n.navigate_to ?? this.fallbackRoute(n);
    if (!n.is_read) {
      this.items.update((items) =>
        items.map((item) => (item.id === n.id ? { ...item, is_read: true } : item)),
      );
      this.counts.unreadNotifications.update((count) => Math.max(0, count - 1));
      this.messaging.markNotificationRead(n.id).subscribe({
        next: () => this.afterChange(),
        error: () => {
          this.items.update((items) =>
            items.map((item) => (item.id === n.id ? { ...item, is_read: false } : item)),
          );
          this.notifications.error('Unable to mark this notification as read.');
          this.afterChange();
        },
      });
    }
    this.close.emit();
    if (!target) {
      this.notifications.warning('This notification does not include a destination.');
      return;
    }
    void this.router
      .navigateByUrl(target)
      .then((navigated) => {
        if (!navigated) this.notifications.error('Unable to open this notification.');
      })
      .catch(() => this.notifications.error('Unable to open this notification.'));
  }

  iconFor(n: AppNotification): string {
    const map: Record<string, string> = {
      MESSAGE: '💬',
      BROADCAST: '📢',
      APPROVAL: '✅',
      ALERT: '⚠️',
      SYSTEM: '🔔',
    };
    return map[n.type] ?? '🔔';
  }

  private afterChange(): void {
    this.changed.emit();
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
