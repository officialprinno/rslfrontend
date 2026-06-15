import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { AppNotification } from '../../../core/models/messaging.model';
import { MessagingService } from '../../../core/services/messaging.service';
import { NotificationCountsService } from '../../../core/services/notification-counts.service';
import { timeAgo } from '../../../core/utils/time.util';

@Component({
  selector: 'app-notifications-panel',
  imports: [],
  template: `
    @if (open()) {
      <div class="notif-backdrop" (click)="close.emit()"></div>
      <aside class="notif-panel" role="dialog" aria-label="Notifications">
        <header class="notif-panel-header">
          <h2 class="font-semibold text-gray-900">Notifications</h2>
          <button type="button" class="btn-icon" (click)="close.emit()" aria-label="Close">×</button>
        </header>
        <div class="notif-tabs">
          <button type="button" [class.active]="tab() === 'all'" (click)="tab.set('all'); load()">All</button>
          <button type="button" [class.active]="tab() === 'unread'" (click)="tab.set('unread'); load()">Unread</button>
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
                  <p class="text-sm font-medium truncate">{{ n.title }}</p>
                  <p class="text-xs text-gray-500 truncate">{{ n.body }}</p>
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
  private readonly router = inject(Router);

  readonly open = input(false);
  readonly close = output<void>();

  readonly tab = signal<'all' | 'unread'>('all');
  readonly items = signal<AppNotification[]>([]);
  readonly loading = signal(false);
  readonly timeAgo = timeAgo;

  constructor() {
    effect(() => {
      if (this.open()) this.load();
    });
  }

  load(): void {
    this.loading.set(true);
    this.messaging
      .getNotifications(this.tab() === 'unread')
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((list) => this.items.set(list));
  }

  markAll(): void {
    this.messaging.markAllRead().subscribe(() => {
      this.load();
      this.counts.refresh();
    });
  }

  openNotification(n: AppNotification): void {
    if (!n.is_read) {
      this.messaging.markNotificationRead(n.id).subscribe(() => this.counts.refresh());
    }
    this.close.emit();
    if (n.navigate_to) void this.router.navigateByUrl(n.navigate_to);
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
}
