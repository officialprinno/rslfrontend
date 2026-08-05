import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { ChatWidgetService } from '../../../core/services/chat-widget.service';
import { NotificationService, ToastMessage, ToastType } from '../../../core/services/notification.service';

@Component({
  selector: 'app-toast',
  imports: [TranslatePipe],
  template: `
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none max-w-[calc(100vw-2rem)]">
      @for (toast of notification.toasts(); track toast.id) {
        <div
          class="toast pointer-events-auto"
          [class]="toastClass(toast)"
          role="alert"
          (click)="onToastClick(toast)"
        >
          <div class="toast-icon-wrap" [class]="iconWrapClass(toast)">
            <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="iconPath(toast)" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold truncate">{{ toastTitle(toast) | translate }}</p>
            <p class="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2">{{ toast.message }}</p>
            @if (toast.actionLabel) {
              <button type="button" class="toast-action" (click)="onAction(toast, $event)">
                {{ toast.actionLabel | translate }}
              </button>
            }
          </div>
          <button
            type="button"
            (click)="dismiss(toast.id, $event)"
            class="btn-icon !w-7 !h-7 shrink-0"
            [attr.aria-label]="'common.dismiss' | translate"
          >
            &times;
          </button>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  readonly notification = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly chatWidget = inject(ChatWidgetService);

  toastClass(toast: ToastMessage): string {
    const kind = toast.kind && toast.kind !== 'default' ? ` toast--${toast.kind}` : '';
    return `toast--${toast.type}${kind}`;
  }

  iconWrapClass(toast: ToastMessage): string {
    if (toast.kind === 'message') return 'toast-icon-wrap--message';
    if (toast.kind === 'email') return 'toast-icon-wrap--email';
    return `toast-icon-wrap--${toast.type}`;
  }

  toastTitle(toast: ToastMessage): string {
    if (toast.title) return toast.title;
    if (toast.kind === 'message') return 'common.toast.new_message';
    if (toast.kind === 'email') return 'common.toast.new_email';
    const map: Record<ToastType, string> = {
      success: 'common.toast.success',
      error: 'common.toast.error',
      warning: 'common.toast.warning',
      info: 'common.toast.info',
    };
    return map[toast.type];
  }

  iconPath(toast: ToastMessage): string {
    if (toast.kind === 'message') {
      return 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z';
    }
    if (toast.kind === 'email') {
      return 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z';
    }
    if (toast.type === 'success') {
      return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
    }
    if (toast.type === 'error') {
      return 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z';
    }
    if (toast.type === 'warning') {
      return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z';
    }
    return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
  }

  onToastClick(toast: ToastMessage): void {
    if (toast.kind === 'message' || toast.conversationId != null) {
      this.onAction(toast);
    }
  }

  onAction(toast: ToastMessage, event?: Event): void {
    event?.stopPropagation();
    this.notification.dismiss(toast.id);
    if (toast.conversationId != null) {
      this.chatWidget.openPanel(toast.conversationId);
      return;
    }
    if (toast.actionUrl) {
      void this.router.navigateByUrl(toast.actionUrl);
    }
  }

  dismiss(id: number, event: Event): void {
    event.stopPropagation();
    this.notification.dismiss(id);
  }
}
