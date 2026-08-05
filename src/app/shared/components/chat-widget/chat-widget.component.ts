import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription, filter, finalize } from 'rxjs';

import { Conversation, Message, MessageStatus } from '../../../core/models/messaging.model';
import { AlertSoundService } from '../../../core/services/alert-sound.service';
import { AuthService } from '../../../core/services/auth.service';
import { ChatWidgetService } from '../../../core/services/chat-widget.service';
import { MessagingService } from '../../../core/services/messaging.service';
import { NotificationCountsService } from '../../../core/services/notification-counts.service';
import { WebsocketService } from '../../../core/services/websocket.service';
import { formatMessageTime } from '../../../core/utils/time.util';
import { canSendBroadcast } from '../../../modules/messaging/utils/messaging-permissions.util';

type WidgetTab = 'chats' | 'people' | 'broadcasts';
type WidgetView = 'home' | 'thread' | 'compose';

interface DirectoryUser {
  id: number;
  full_name: string;
  department_name: string;
  role_name: string;
  is_online?: boolean;
}

const PANEL_EXIT_MS = 260;

@Component({
  selector: 'app-chat-widget',
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: './chat-widget.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatWidgetComponent implements OnInit, OnDestroy {
  private readonly messaging = inject(MessagingService);
  private readonly auth = inject(AuthService);
  private readonly counts = inject(NotificationCountsService);
  private readonly ws = inject(WebsocketService);
  private readonly router = inject(Router);
  private readonly sounds = inject(AlertSoundService);
  readonly widget = inject(ChatWidgetService);

  private readonly subs = new Subscription();
  private closeTimer: ReturnType<typeof setTimeout> | null = null;
  private onlineIds = signal<Set<number>>(new Set());
  /** Prevents reloading the same thread in a loop. */
  private loadedThreadId: number | null = null;
  private wasOpen = false;
  private markReadInFlight = new Set<number>();
  private listRequestSeq = 0;
  private threadRequestSeq = 0;

  readonly messagesEl = viewChild<ElementRef<HTMLDivElement>>('messagesEl');

  /** Keeps panel in DOM while exit animation runs. */
  readonly panelMounted = signal(false);
  readonly panelVisible = signal(false);

  readonly hideOnFocusedComms = signal(false);
  readonly tab = signal<WidgetTab>('chats');
  readonly view = signal<WidgetView>('home');
  readonly conversations = signal<Conversation[]>([]);
  readonly messages = signal<Message[]>([]);
  readonly loadingList = signal(false);
  readonly loadingThread = signal(false);
  readonly loadingUsers = signal(false);
  readonly startingChat = signal(false);
  readonly startingUserId = signal<number | null>(null);
  readonly sending = signal(false);
  readonly draft = signal('');
  readonly selected = signal<Conversation | null>(null);
  readonly userSearch = signal('');
  readonly users = signal<DirectoryUser[]>([]);
  readonly chatSearch = signal('');
  /** Tab to restore when leaving a thread (e.g. People → chat → Back). */
  private returnTab: WidgetTab = 'chats';

  readonly formatMessageTime = formatMessageTime;
  readonly currentUserId = this.auth.getCurrentUser()?.id ?? 0;
  readonly canBroadcast = canSendBroadcast(this.auth);
  readonly userFirstName =
    this.auth.getCurrentUser()?.first_name ||
    this.auth.getCurrentUser()?.full_name?.split(' ')[0] ||
    'there';

  readonly directChats = computed(() =>
    this.filterChats(
      this.conversations().filter((c) => c.type === 'DIRECT' || c.type === 'GROUP'),
    ),
  );

  readonly broadcastChats = computed(() =>
    this.filterChats(this.conversations().filter((c) => c.type === 'BROADCAST')),
  );

  constructor() {
    // Only track open + activeConversationId. Side effects run untracked so
    // writes to selected/view/conversations cannot re-trigger this effect.
    effect(() => {
      const wantOpen = this.widget.open();
      const convId = this.widget.activeConversationId();
      untracked(() => this.syncFromWidgetState(wantOpen, convId));
    });
  }

  ngOnInit(): void {
    this.hideOnFocusedComms.set(this.isFocusedCommsRoute(this.router.url));
    this.subs.add(
      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe((e) => {
          const onFocused = this.isFocusedCommsRoute(e.urlAfterRedirects);
          this.hideOnFocusedComms.set(onFocused);
          if (onFocused) {
            this.widget.closePanel();
          }
        }),
    );
    this.subs.add(
      this.ws.onMessage$.subscribe((msg) => {
        if (!this.panelMounted()) return;
        const selected = this.selected();
        if (selected?.id === msg.conversation_id && this.view() === 'thread') {
          this.messages.update((list) => {
            if (list.some((m) => m.id === msg.id)) {
              return list.map((m) => (m.id === msg.id ? msg : m));
            }
            return [...list, msg];
          });
          if (msg.sender_id !== this.currentUserId) {
            this.messaging
              .markAsRead(selected.id, { silent: true })
              .subscribe({ next: () => this.counts.refresh(), error: () => undefined });
          }
          setTimeout(() => this.scrollBottom(), 40);
        } else if (msg.sender_id === this.currentUserId) {
          // Update read/delivery ticks if the open thread matches.
          this.messages.update((list) => list.map((m) => (m.id === msg.id ? msg : m)));
        }
        this.loadConversations();
      }),
    );
    this.subs.add(
      this.ws.onOnlineStatus$.subscribe((ev) => {
        this.onlineIds.update((set) => {
          const next = new Set(set);
          if (ev.online === false) {
            next.delete(ev.user_id);
          } else {
            next.add(ev.user_id);
          }
          return next;
        });
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    if (this.closeTimer) clearTimeout(this.closeTimer);
  }

  unreadTotal(): number {
    return this.counts.unreadMessages();
  }

  toggle(): void {
    this.sounds.unlock();
    if (this.widget.open()) {
      this.close();
      return;
    }
    this.widget.openPanel();
  }

  close(): void {
    this.widget.closePanel();
  }

  setTab(tab: WidgetTab): void {
    this.tab.set(tab);
    this.returnTab = tab;
    this.view.set('home');
    this.selected.set(null);
    this.loadedThreadId = null;
    this.widget.setConversation(null);
    if (tab === 'people') {
      this.searchUsers();
      // Need conversation cache so existing DMs open instantly without a Chats detour.
      this.loadConversations();
    } else {
      this.loadConversations();
    }
  }

  backToHome(): void {
    this.view.set('home');
    this.selected.set(null);
    this.messages.set([]);
    this.draft.set('');
    this.loadedThreadId = null;
    this.widget.setConversation(null);
    this.tab.set(this.returnTab);
    if (this.returnTab === 'people') {
      if (!this.users().length) this.searchUsers();
    } else {
      this.loadConversations();
    }
  }

  loadConversations(onDone?: () => void): void {
    const seq = ++this.listRequestSeq;
    this.loadingList.set(true);
    this.messaging
      .getConversations()
      .pipe(finalize(() => {
        if (seq === this.listRequestSeq) this.loadingList.set(false);
      }))
      .subscribe({
        next: (list) => {
          if (seq !== this.listRequestSeq) return;
          const selected = this.selected();
          let sorted = [...list].sort((a, b) => {
            const at = a.last_message?.created_at ?? a.created_at;
            const bt = b.last_message?.created_at ?? b.created_at;
            return new Date(bt).getTime() - new Date(at).getTime();
          });

          // Keep an actively open thread visible even if the list response lags.
          if (selected && !sorted.some((c) => c.id === selected.id)) {
            sorted = [selected, ...sorted];
          }

          this.conversations.set(sorted);

          const online = new Set(this.onlineIds());
          for (const c of sorted) {
            for (const p of c.participants ?? []) {
              if (p.is_online) online.add(p.user_id);
              else online.delete(p.user_id);
            }
          }
          this.onlineIds.set(online);

          if (selected) {
            const fresh = sorted.find((c) => c.id === selected.id);
            if (fresh) {
              this.selected.set(fresh);
            }
            // Do not clear an open thread because of a slow/partial list refresh.
          }
          onDone?.();
        },
        error: () => onDone?.(),
      });
  }

  selectConversation(c: Conversation, options?: { fromTab?: WidgetTab }): void {
    if (!c?.id || c.id <= 0) {
      return;
    }
    this.sounds.unlock();
    if (options?.fromTab) {
      this.returnTab = options.fromTab;
    } else if (this.view() === 'home') {
      this.returnTab = this.tab();
    }
    // Already showing this thread — do not reload / mark-read again.
    if (this.loadedThreadId === c.id && this.view() === 'thread') {
      this.selected.set(c);
      return;
    }
    this.selected.set(c);
    this.view.set('thread');
    this.loadedThreadId = c.id;
    if (this.widget.activeConversationId() !== c.id) {
      this.widget.setConversation(c.id);
    }
    this.loadMessages(c.id);
  }

  openConversationById(id: number): void {
    if (this.loadedThreadId === id && this.view() === 'thread') {
      return;
    }
    const existing = this.conversations().find((c) => c.id === id);
    if (existing) {
      this.selectConversation(existing);
      return;
    }
    // Stale link / missing from list — only drop that id, never a newer open thread.
    this.clearStaleConversation(id);
  }

  loadMessages(conversationId: number): void {
    const seq = ++this.threadRequestSeq;
    this.loadingThread.set(true);
    this.messaging
      .getMessages(conversationId, 1, { silent: true })
      .pipe(finalize(() => {
        if (seq === this.threadRequestSeq) this.loadingThread.set(false);
      }))
      .subscribe({
        next: (data) => {
          if (seq !== this.threadRequestSeq || this.loadedThreadId !== conversationId) return;
          this.messages.set(data.results ?? []);
          this.markConversationRead(conversationId);
          setTimeout(() => this.scrollBottom(), 50);
        },
        error: () => {
          if (seq !== this.threadRequestSeq || this.loadedThreadId !== conversationId) return;
          // Keep the thread open (empty) — do not bounce the user back to People.
          this.messages.set([]);
          this.loadingThread.set(false);
        },
      });
  }

  send(): void {
    const c = this.selected();
    const body = this.draft().trim();
    if (!c || !body || this.sending() || this.startingChat() || c.type === 'BROADCAST') return;
    if (!c.id || c.id <= 0 || this.loadedThreadId !== c.id) {
      return;
    }
    this.sending.set(true);
    this.messaging
      .sendMessage(c.id, { body })
      .pipe(finalize(() => this.sending.set(false)))
      .subscribe({
        next: (msg) => {
          this.messages.update((list) => [...list, msg]);
          this.draft.set('');
          this.upsertConversation({
            ...c,
            last_message: msg,
            unread_count: 0,
          });
          setTimeout(() => this.scrollBottom(), 40);
        },
      });
  }

  onComposerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  searchUsers(): void {
    this.loadingUsers.set(true);
    this.messaging
      .searchUsers(this.userSearch())
      .pipe(finalize(() => this.loadingUsers.set(false)))
      .subscribe({
        next: (list) => {
          const people = list.filter((u) => u.id !== this.currentUserId);
          this.users.set(people);
          // Seed presence from login/logout flags returned by the API.
          this.onlineIds.update((set) => {
            const next = new Set(set);
            for (const u of people) {
              if (u.is_online) next.add(u.id);
              else next.delete(u.id);
            }
            return next;
          });
        },
      });
  }

  onUserSearch(value: string): void {
    this.userSearch.set(value);
    this.searchUsers();
  }

  startDirectChat(user: DirectoryUser): void {
    if (this.startingChat()) return;

    this.returnTab = 'people';
    this.sounds.unlock();

    // Reuse an existing DM from Chats cache — open immediately.
    const existing = this.findDirectConversationWith(user.id);
    if (existing?.id && existing.id > 0) {
      this.selectConversation(existing, { fromTab: 'people' });
      return;
    }

    // Show thread shell while we create/resolve the DM on the server.
    const optimistic = this.buildOptimisticDirect(user);
    this.selected.set(optimistic);
    this.view.set('thread');
    this.messages.set([]);
    this.draft.set('');
    this.loadedThreadId = null;

    this.startingChat.set(true);
    this.startingUserId.set(user.id);
    this.messaging
      .createDirectMessage(user.id)
      .pipe(
        finalize(() => {
          this.startingChat.set(false);
          this.startingUserId.set(null);
        }),
      )
      .subscribe({
        next: (conv) => {
          if (!conv?.id || conv.id <= 0) {
            this.view.set('home');
            this.selected.set(null);
            this.tab.set('people');
            return;
          }
          const normalized = this.normalizeDirectConversation(conv, user);
          this.upsertConversation(normalized);
          this.selectConversation(normalized, { fromTab: 'people' });
        },
        error: () => {
          this.view.set('home');
          this.selected.set(null);
          this.tab.set('people');
        },
      });
  }

  isStartingUser(userId: number): boolean {
    return this.startingUserId() === userId;
  }

  private findDirectConversationWith(userId: number): Conversation | undefined {
    return this.conversations().find(
      (c) =>
        c.type === 'DIRECT' &&
        (c.participants ?? []).some((p) => p.user_id === userId),
    );
  }

  private upsertConversation(conv: Conversation): void {
    this.conversations.update((list) => {
      const without = list.filter((c) => c.id !== conv.id);
      return [conv, ...without];
    });
  }

  private buildOptimisticDirect(user: DirectoryUser): Conversation {
    return {
      id: -user.id,
      type: 'DIRECT',
      name: null,
      avatar: null,
      participants: [
        {
          user_id: user.id,
          full_name: user.full_name,
          role_name: user.role_name,
          department_name: user.department_name,
          is_admin: false,
          is_muted: false,
          is_online: this.isOnline(user.id),
        },
      ],
      last_message: null,
      unread_count: 0,
      is_muted: false,
      broadcast_starts_at: null,
      broadcast_expires_at: null,
      created_at: new Date().toISOString(),
    };
  }

  private normalizeDirectConversation(conv: Conversation, user: DirectoryUser): Conversation {
    const participants = [...(conv.participants ?? [])];
    if (!participants.some((p) => p.user_id === user.id)) {
      participants.push({
        user_id: user.id,
        full_name: user.full_name,
        role_name: user.role_name,
        department_name: user.department_name,
        is_admin: false,
        is_muted: false,
        is_online: this.isOnline(user.id),
      });
    }
    return {
      ...conv,
      type: conv.type || 'DIRECT',
      participants,
      last_message: conv.last_message ?? null,
      unread_count: conv.unread_count ?? 0,
    };
  }

  conversationTitle(c: Conversation): string {
    if (c.type === 'BROADCAST') {
      return c.name || c.last_message?.body?.slice(0, 40) || 'Broadcast';
    }
    if (c.name) return c.name;
    if (c.type === 'DIRECT') {
      const other = (c.participants ?? []).find((p) => p.user_id !== this.currentUserId);
      return other?.full_name ?? 'Direct Message';
    }
    return 'Conversation';
  }

  otherParticipant(c: Conversation) {
    return (c.participants ?? []).find((p) => p.user_id !== this.currentUserId);
  }

  isOnline(userId: number | undefined): boolean {
    if (userId == null) return false;
    return this.onlineIds().has(userId);
  }

  isPeerOnline(c: Conversation): boolean {
    const other = this.otherParticipant(c);
    if (!other) return false;
    return this.isOnline(other.user_id);
  }

  initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .map((p) => p.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  /** Full messaging workspace already covers chat — hide the floating FAB there only. */
  private isFocusedCommsRoute(url: string): boolean {
    return url.startsWith('/messaging');
  }

  messagePreview(c: Conversation): string {
    const msg = c.last_message;
    if (!msg) return '';
    if (msg.message_type === 'FILE' || msg.message_type === 'IMAGE' || msg.attachments?.length) {
      return '📎 Attachment';
    }
    return (msg.body || '').trim();
  }

  bubbleBody(msg: Message): string {
    if ((msg.body || '').trim()) return msg.body;
    if (msg.attachments?.length) return '📎 Attachment';
    if (msg.message_type === 'SYSTEM') return msg.body || 'System';
    return '—';
  }

  statusIcon(msg: Message): string {
    const status = this.resolvedStatus(msg);
    if (status === 'READ') return '✓✓';
    if (status === 'DELIVERED') return '✓✓';
    return '✓';
  }

  statusClass(msg: Message): string {
    return this.resolvedStatus(msg) === 'READ'
      ? 'chat-widget-ticks chat-widget-ticks--read'
      : 'chat-widget-ticks';
  }

  statusLabel(msg: Message): string {
    const status = this.resolvedStatus(msg);
    if (status === 'READ') return 'common.chat_widget.read';
    if (status === 'DELIVERED') return 'common.chat_widget.delivered';
    return 'common.chat_widget.sent';
  }

  canReply(c: Conversation | null): boolean {
    // Optimistic threads use a temporary negative id until createDirect resolves.
    return !!c && c.type !== 'BROADCAST' && c.id > 0 && !this.startingChat();
  }

  private resolvedStatus(msg: Message): MessageStatus {
    if (msg.status === 'READ') return 'READ';
    const othersRead = (msg.read_by ?? []).some((id) => id !== this.currentUserId && id !== msg.sender_id);
    if (othersRead) return 'READ';
    return msg.status || 'SENT';
  }

  private filterChats(list: Conversation[]): Conversation[] {
    const q = this.chatSearch().trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => {
      const title = this.conversationTitle(c).toLowerCase();
      const preview = this.messagePreview(c).toLowerCase();
      return title.includes(q) || preview.includes(q);
    });
  }

  private syncFromWidgetState(wantOpen: boolean, convId: number | null): void {
    if (!wantOpen) {
      if (this.wasOpen) {
        this.wasOpen = false;
        this.loadedThreadId = null;
        this.unmountPanelAnimated();
      }
      return;
    }

    const justOpened = !this.wasOpen;
    this.wasOpen = true;
    this.mountPanel();

    if (justOpened) {
      const requestedId = convId;
      this.loadConversations(() => {
        if (requestedId == null) return;
        // A newer People→chat navigation may have started while the list loaded.
        if (this.view() === 'thread' && this.loadedThreadId != null && this.loadedThreadId !== requestedId) {
          return;
        }
        if (this.conversations().some((c) => c.id === requestedId)) {
          this.openConversationById(requestedId);
        } else {
          this.clearStaleConversation(requestedId);
        }
      });
      return;
    }

    if (convId != null && this.loadedThreadId !== convId) {
      if (this.conversations().some((c) => c.id === convId)) {
        this.openConversationById(convId);
      } else {
        this.clearStaleConversation(convId);
      }
    }
  }

  /**
   * Drop a stale conversation target. If `onlyForId` is set, never clobber a
   * different thread the user already opened (fixes People → chat bounce).
   */
  private clearStaleConversation(onlyForId?: number | null): void {
    if (onlyForId != null) {
      const activeId = this.loadedThreadId ?? this.widget.activeConversationId();
      if (activeId != null && activeId !== onlyForId) {
        if (this.widget.activeConversationId() === onlyForId) {
          this.widget.setConversation(activeId);
        }
        return;
      }
      if (this.view() === 'thread' && this.loadedThreadId != null && this.loadedThreadId !== onlyForId) {
        return;
      }
    }

    this.loadedThreadId = null;
    this.selected.set(null);
    this.messages.set([]);
    this.view.set('home');
    if (onlyForId == null || this.widget.activeConversationId() === onlyForId) {
      this.widget.setConversation(null);
    }
  }

  private markConversationRead(conversationId: number): void {
    if (this.markReadInFlight.has(conversationId)) return;
    this.markReadInFlight.add(conversationId);
    this.messaging
      .markAsRead(conversationId, { silent: true })
      .pipe(finalize(() => this.markReadInFlight.delete(conversationId)))
      .subscribe({
        next: () => {
          this.counts.refresh();
          this.conversations.update((list) =>
            list.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c)),
          );
        },
        error: () => {
          /* ignore — conversation may have been removed */
        },
      });
  }

  private mountPanel(): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
    if (!this.panelMounted()) {
      this.panelMounted.set(true);
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.panelVisible.set(true));
    });
  }

  private unmountPanelAnimated(): void {
    this.panelVisible.set(false);
    if (this.closeTimer) clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => {
      this.panelMounted.set(false);
      this.view.set('home');
      this.selected.set(null);
      this.messages.set([]);
      this.draft.set('');
      this.loadedThreadId = null;
      this.closeTimer = null;
    }, PANEL_EXIT_MS);
  }

  private scrollBottom(): void {
    const el = this.messagesEl()?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
