import { SlicePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, finalize } from 'rxjs/operators';

import { Conversation, Message, MessagePriority } from '../../../core/models/messaging.model';
import { AuthService } from '../../../core/services/auth.service';
import { MessagingService } from '../../../core/services/messaging.service';
import { NotificationCountsService } from '../../../core/services/notification-counts.service';
import { WebsocketService } from '../../../core/services/websocket.service';
import { formatDateSeparator, formatMessageTime } from '../../../core/utils/time.util';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { canSendBroadcast } from '../utils/messaging-permissions.util';

@Component({
  selector: 'app-messaging-layout',
  imports: [FormsModule, RouterLink, SlicePipe, ErrorStateComponent],
  templateUrl: './messaging-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessagingLayoutComponent implements OnInit, OnDestroy {
  private readonly messaging = inject(MessagingService);
  private readonly ws = inject(WebsocketService);
  private readonly auth = inject(AuthService);
  private readonly counts = inject(NotificationCountsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private subs = new Subscription();
  private typingTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly typingSubject = new Subject<number>();

  readonly messagesEl = viewChild<ElementRef<HTMLDivElement>>('messagesEl');

  readonly conversations = signal<Conversation[]>([]);
  readonly selectedId = signal<number | null>(null);
  readonly messages = signal<Message[]>([]);
  readonly loading = signal(true);
  readonly loadingMessages = signal(false);
  readonly error = signal(false);
  readonly search = signal('');
  readonly draft = signal('');
  readonly priority = signal<MessagePriority>('NORMAL');
  readonly replyTo = signal<Message | null>(null);
  readonly typingUser = signal<string | null>(null);
  readonly showNewModal = signal(false);
  readonly showPriorityMenu = signal(false);
  readonly userSearch = signal('');
  readonly userResults = signal<{ id: number; full_name: string; department_name: string }[]>([]);
  readonly selectedUsers = signal<number[]>([]);
  readonly groupName = signal('');
  readonly messagePage = signal(1);
  readonly hasMore = signal(false);

  readonly formatMessageTime = formatMessageTime;
  readonly formatDateSeparator = formatDateSeparator;
  readonly canBroadcast = canSendBroadcast(this.auth);

  readonly currentUserId = this.auth.getCurrentUser()?.id ?? 0;

  ngOnInit(): void {
    this.ws.connect();
    this.loadConversations();
    this.subs.add(
      this.ws.onMessage$.subscribe((msg) => {
        const sel = this.selectedId();
        if (sel === msg.conversation_id) {
          this.messages.update((list) => [...list, msg]);
          this.messaging.markAsRead(sel).subscribe();
          setTimeout(() => this.scrollBottom(), 50);
        }
        this.loadConversations();
        this.counts.refresh();
      }),
    );
    this.subs.add(
      this.ws.onTyping$.subscribe((ev) => {
        if (ev.conversation_id === this.selectedId() && ev.user_id !== this.currentUserId) {
          this.typingUser.set(ev.active ? 'Someone' : null);
        }
      }),
    );
    this.subs.add(
      this.route.queryParamMap.subscribe((params) => {
        const c = params.get('c');
        if (c) this.selectConversation(+c);
      }),
    );
    this.subs.add(
      this.typingSubject.pipe(debounceTime(300)).subscribe((conversationId) => {
        this.ws.emitTyping(conversationId, true);
        if (this.typingTimer) clearTimeout(this.typingTimer);
        this.typingTimer = setTimeout(() => this.ws.emitTyping(conversationId, false), 2000);
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    if (this.typingTimer) clearTimeout(this.typingTimer);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Enter' && !ev.shiftKey && this.selectedId() && document.activeElement?.tagName === 'TEXTAREA') {
      ev.preventDefault();
      this.send();
    }
  }

  loadConversations(): void {
    this.loading.set(true);
    this.messaging
      .getConversations()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (list) => {
          this.conversations.set(list);
          this.error.set(false);
        },
        error: () => this.error.set(true),
      });
  }

  filteredConversations(type: 'DIRECT' | 'GROUP' | 'BROADCAST'): Conversation[] {
    const q = this.search().toLowerCase();
    return this.conversations().filter((c) => {
      if (c.type !== type) return false;
      if (!q) return true;
      const name = this.conversationTitle(c).toLowerCase();
      return name.includes(q) || (c.last_message?.body ?? '').toLowerCase().includes(q);
    });
  }

  conversationTitle(c: Conversation): string {
    if (c.name) return c.name;
    if (c.type === 'DIRECT') {
      const other = c.participants.find((p) => p.user_id !== this.currentUserId);
      return other?.full_name ?? 'Direct Message';
    }
    return 'Conversation';
  }

  otherParticipant(c: Conversation) {
    return c.participants.find((p) => p.user_id !== this.currentUserId);
  }

  selectConversation(id: number): void {
    this.selectedId.set(id);
    void this.router.navigate([], { queryParams: { c: id }, queryParamsHandling: 'merge' });
    this.messagePage.set(1);
    this.loadMessages(id, 1, true);
    this.messaging.markAsRead(id).subscribe(() => this.counts.refresh());
  }

  loadMessages(conversationId: number, page: number, replace = false): void {
    this.loadingMessages.set(true);
    this.messaging
      .getMessages(conversationId, page)
      .pipe(finalize(() => this.loadingMessages.set(false)))
      .subscribe({
        next: (data) => {
          const merged = replace ? data.results : [...data.results, ...this.messages()];
          this.messages.set(merged);
          this.hasMore.set(data.results.length >= 50 && merged.length < data.count);
          if (replace) setTimeout(() => this.scrollBottom(), 50);
        },
      });
  }

  loadOlder(): void {
    const id = this.selectedId();
    if (!id || !this.hasMore()) return;
    const next = this.messagePage() + 1;
    this.messagePage.set(next);
    this.loadMessages(id, next, false);
  }

  onDraftInput(): void {
    const id = this.selectedId();
    if (id) this.typingSubject.next(id);
  }

  send(): void {
    const id = this.selectedId();
    const body = this.draft().trim();
    if (!id || !body) return;
    const reply = this.replyTo();
    this.messaging
      .sendMessage(id, {
        body,
        priority: this.priority(),
        reply_to_id: reply?.id ?? null,
      })
      .subscribe({
        next: (msg) => {
          this.messages.update((list) => [...list, msg]);
          this.draft.set('');
          this.replyTo.set(null);
          this.scrollBottom();
          this.loadConversations();
        },
      });
  }

  onFileSelected(ev: Event): void {
    const id = this.selectedId();
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!id || !file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Max file size is 10MB');
      return;
    }
    this.messaging.uploadAttachment(id, file).subscribe({
      next: (msg) => {
        this.messages.update((list) => [...list, msg]);
        this.scrollBottom();
      },
    });
    input.value = '';
  }

  setPriority(p: MessagePriority): void {
    this.priority.set(p);
    this.showPriorityMenu.set(false);
  }

  openNewModal(): void {
    this.showNewModal.set(true);
    this.searchUsers();
  }

  searchUsers(): void {
    this.messaging.searchUsers(this.userSearch()).subscribe((users) => {
      const me = this.currentUserId;
      this.userResults.set(users.filter((u) => u.id !== me));
    });
  }

  toggleUserSelect(userId: number): void {
    this.selectedUsers.update((ids) =>
      ids.includes(userId) ? ids.filter((i) => i !== userId) : [...ids, userId],
    );
  }

  startConversation(): void {
    const ids = this.selectedUsers();
    if (!ids.length) return;
    if (ids.length === 1) {
      this.messaging.createDirectMessage(ids[0]).subscribe((conv) => {
        this.showNewModal.set(false);
        this.selectedUsers.set([]);
        this.loadConversations();
        this.selectConversation(conv.id);
      });
      return;
    }
    const name = this.groupName().trim() || 'New Group';
    this.messaging.createGroup(name, ids).subscribe((conv) => {
      this.showNewModal.set(false);
      this.selectedUsers.set([]);
      this.groupName.set('');
      this.loadConversations();
      this.selectConversation(conv.id);
    });
  }

  deleteMessage(msg: Message): void {
    const id = this.selectedId();
    if (!id || msg.sender_id !== this.currentUserId) return;
    this.messaging.deleteMessage(id, msg.id).subscribe(() => {
      this.messages.update((list) => list.filter((m) => m.id !== msg.id));
    });
  }

  copyText(text: string): void {
    void navigator.clipboard.writeText(text);
  }

  scrollBottom(): void {
    const el = this.messagesEl()?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  statusIcon(msg: Message): string {
    if (msg.status === 'READ') return '✓✓';
    if (msg.status === 'DELIVERED') return '✓✓';
    return '✓';
  }

  statusClass(msg: Message): string {
    return msg.status === 'READ' ? 'msg-status read' : 'msg-status';
  }

  priorityClass(p: MessagePriority): string {
    if (p === 'URGENT') return 'msg-bubble urgent';
    if (p === 'HIGH') return 'msg-bubble high';
    return 'msg-bubble';
  }

  showDateSeparator(index: number): string | null {
    const list = this.messages();
    const curr = list[index];
    const prev = list[index - 1];
    if (!curr) return null;
    if (!prev) return formatDateSeparator(curr.created_at);
    const d1 = new Date(prev.created_at).toDateString();
    const d2 = new Date(curr.created_at).toDateString();
    return d1 !== d2 ? formatDateSeparator(curr.created_at) : null;
  }

  initials(name: string): string {
    return name
      .split(' ')
      .map((p) => p.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
}
