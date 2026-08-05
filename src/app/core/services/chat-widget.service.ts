import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ChatWidgetService {
  private readonly openSignal = signal(false);
  private readonly conversationIdSignal = signal<number | null>(null);

  readonly open = this.openSignal.asReadonly();
  readonly activeConversationId = this.conversationIdSignal.asReadonly();

  toggle(): void {
    this.openSignal.update((v) => !v);
  }

  openPanel(conversationId?: number | null): void {
    this.openSignal.set(true);
    if (conversationId != null) {
      this.conversationIdSignal.set(conversationId);
    }
  }

  closePanel(): void {
    this.openSignal.set(false);
  }

  setConversation(id: number | null): void {
    this.conversationIdSignal.set(id);
  }

  isViewingConversation(id: number): boolean {
    return this.openSignal() && this.conversationIdSignal() === id;
  }
}
