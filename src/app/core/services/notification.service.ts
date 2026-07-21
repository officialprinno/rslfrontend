import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly toastsSignal = signal<ToastMessage[]>([]);
  private nextId = 0;

  readonly toasts = this.toastsSignal.asReadonly();

  show(message: string, type: ToastType = 'info', durationMs?: number): void {
    const id = ++this.nextId;
    const toast: ToastMessage = { id, type, message };
    this.toastsSignal.update((list) => [...list, toast]);

    const duration = durationMs ?? (type === 'error' ? 0 : 5000);
    if (duration > 0) {
      window.setTimeout(() => this.dismiss(id), duration);
    }
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    if (this.toastsSignal().some((t) => t.type === 'error' && t.message === message)) {
      return;
    }
    this.show(message, 'error', 0);
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  warning(message: string): void {
    this.show(message, 'warning');
  }

  dismiss(id: number): void {
    this.toastsSignal.update((list) => list.filter((t) => t.id !== id));
  }
}
