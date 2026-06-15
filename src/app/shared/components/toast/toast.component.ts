import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { NotificationService, ToastType } from '../../../core/services/notification.service';

@Component({
  selector: 'app-toast',
  imports: [TranslatePipe],
  template: `
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
      @for (toast of notification.toasts(); track toast.id) {
        <div class="toast" [class]="toastClass(toast.type)" role="alert">
          <svg class="w-5 h-5 shrink-0" [class]="iconClass(toast.type)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="iconPath(toast.type)" />
          </svg>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold">{{ toastTitleKey(toast.type) | translate }}</p>
            <p class="text-xs text-[var(--text-secondary)] mt-0.5">{{ toast.message }}</p>
          </div>
          <button
            type="button"
            (click)="notification.dismiss(toast.id)"
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

  toastClass(type: ToastType): string {
    return `toast--${type}`;
  }

  iconClass(type: ToastType): string {
    const map: Record<ToastType, string> = {
      success: 'text-green-500',
      error: 'text-red-500',
      warning: 'text-yellow-500',
      info: 'text-blue-500',
    };
    return map[type];
  }

  toastTitleKey(type: ToastType): string {
    const map: Record<ToastType, string> = {
      success: 'common.toast.success',
      error: 'common.toast.error',
      warning: 'common.toast.warning',
      info: 'common.toast.info',
    };
    return map[type];
  }

  iconPath(type: ToastType): string {
    if (type === 'success') {
      return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
    }
    if (type === 'error') {
      return 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z';
    }
    if (type === 'warning') {
      return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z';
    }
    return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
  }
}
