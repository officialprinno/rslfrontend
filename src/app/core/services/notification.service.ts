import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';
export type ToastKind = 'default' | 'message' | 'email';

export interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
  title?: string;
  kind?: ToastKind;
  actionLabel?: string;
  actionUrl?: string;
  conversationId?: number;
}

export interface ToastOptions {
  type?: ToastType;
  title?: string;
  kind?: ToastKind;
  actionLabel?: string;
  actionUrl?: string;
  conversationId?: number;
  durationMs?: number;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly toastsSignal = signal<ToastMessage[]>([]);
  private nextId = 0;

  readonly toasts = this.toastsSignal.asReadonly();

  show(message: string, typeOrOptions: ToastType | ToastOptions = 'info', durationMs?: number): void {
    const options: ToastOptions =
      typeof typeOrOptions === 'string' ? { type: typeOrOptions, durationMs } : typeOrOptions;
    const type = options.type ?? 'info';
    const id = ++this.nextId;
    const toast: ToastMessage = {
      id,
      type,
      message,
      title: options.title,
      kind: options.kind ?? 'default',
      actionLabel: options.actionLabel,
      actionUrl: options.actionUrl,
      conversationId: options.conversationId,
    };
    this.toastsSignal.update((list) => [...list.slice(-4), toast]);

    const duration = options.durationMs ?? (type === 'error' ? 0 : 6000);
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

  info(message: string, options?: Omit<ToastOptions, 'type'>): void {
    this.show(message, { type: 'info', ...options });
  }

  warning(message: string): void {
    this.show(message, 'warning');
  }

  dismiss(id: number): void {
    this.toastsSignal.update((list) => list.filter((t) => t.id !== id));
  }
}
