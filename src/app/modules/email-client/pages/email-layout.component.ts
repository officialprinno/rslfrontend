import { DecimalPipe, NgTemplateOutlet, SlicePipe } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Injector,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, finalize, of, Subscription, switchMap, timer } from 'rxjs';

import { ComposeEmailData, Email, EmailAccount, EmailFolder, Label } from '../../../core/models/email.model';
import { AlertSoundService } from '../../../core/services/alert-sound.service';
import { EmailService } from '../../../core/services/email.service';
import { NotificationCountsService } from '../../../core/services/notification-counts.service';
import { formatMessageTime } from '../../../core/utils/time.util';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { OpenFileComponent } from '../../../shared/components/open-file/open-file.component';

/** Aligned with backend EMAIL_POLL_INTERVAL_SECONDS (poll schedules background IMAP). */
const POLL_INTERVAL_MS = 30_000;

@Component({
  selector: 'app-email-layout',
  host: {
    class: 'email-layout-host',
  },
  imports: [
    FormsModule,
    RouterLink,
    SlicePipe,
    DecimalPipe,
    NgTemplateOutlet,
    ErrorStateComponent,
    OpenFileComponent,
  ],
  templateUrl: './email-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailLayoutComponent implements OnInit, OnDestroy {
  private readonly email = inject(EmailService);
  private readonly counts = inject(NotificationCountsService);
  private readonly sounds = inject(AlertSoundService);
  private readonly injector = inject(Injector);
  private pollSub: Subscription | null = null;
  private pollSince: string | null = null;
  private lastUnreadInbox = 0;

  readonly mailboxes = signal<EmailAccount[]>([]);
  readonly account = signal<EmailAccount | null>(null);
  readonly emails = signal<Email[]>([]);
  readonly labels = signal<Label[]>([]);
  readonly selectedId = signal<number | null>(null);
  readonly selectedEmail = signal<Email | null>(null);
  readonly folder = signal<EmailFolder>('INBOX');
  readonly loading = signal(true);
  readonly syncing = signal(false);
  readonly error = signal(false);
  readonly search = signal('');
  readonly filter = signal('all');
  readonly selectedIds = signal<number[]>([]);
  readonly showCompose = signal(false);
  readonly showImages = signal(false);
  readonly unreadInbox = signal(0);

  readonly composeToList = signal<string[]>([]);
  readonly composeCcList = signal<string[]>([]);
  readonly composeBccList = signal<string[]>([]);
  readonly composeToDraft = signal('');
  readonly composeCcDraft = signal('');
  readonly composeBccDraft = signal('');
  readonly showComposeCc = signal(false);
  readonly showComposeBcc = signal(false);
  readonly composeSubject = signal('');
  readonly composeBodyHtml = signal('');
  readonly composeFiles = signal<File[]>([]);
  readonly composeSending = signal(false);
  readonly composeError = signal('');
  readonly composeReplyToId = signal<number | null>(null);
  readonly composeTitle = signal('New Message');
  readonly composeFromId = signal<number | null>(null);

  /** Phone: list vs thread. Tablet/desktop ignore for split layout. */
  readonly mobilePane = signal<'list' | 'thread'>('list');
  /** Folder drawer on phone/tablet. */
  readonly navOpen = signal(false);

  @ViewChild('composeEditor') private composeEditor?: ElementRef<HTMLDivElement>;

  readonly formatTime = formatMessageTime;

  readonly folders: { key: EmailFolder; label: string; icon: string }[] = [
    { key: 'INBOX', label: 'Inbox', icon: 'inbox' },
    { key: 'SENT', label: 'Sent', icon: 'sent' },
    { key: 'DRAFT', label: 'Drafts', icon: 'draft' },
    { key: 'TRASH', label: 'Trash', icon: 'trash' },
    { key: 'SPAM', label: 'Spam', icon: 'spam' },
  ];

  currentFolderLabel(): string {
    return this.folders.find((f) => f.key === this.folder())?.label ?? 'Mail';
  }

  openNav(): void {
    this.navOpen.set(true);
  }

  closeNav(): void {
    this.navOpen.set(false);
  }

  backToList(): void {
    this.discardCompose();
    this.selectedId.set(null);
    this.selectedEmail.set(null);
    this.mobilePane.set('list');
  }

  ngOnInit(): void {
    this.loadAccounts();
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  private startPolling(): void {
    // Poll is DB-fast; backend schedules IMAP after the response.
    // A follow-up refresh picks up mail once the background IMAP finishes.
    this.pollSub = timer(3_000, POLL_INTERVAL_MS)
      .pipe(
        switchMap(() => {
          const acc = this.account();
          if (!acc?.id) return of(null);
          return this.email.poll(acc.id, this.pollSince).pipe(catchError(() => of(null)));
        }),
      )
      .subscribe((poll) => {
        if (!poll) return;
        this.applyPollResult(poll);
        // Background IMAP often needs 5–20s on local Mailcow — refresh again.
        timer(12_000)
          .pipe(
            switchMap(() => {
              const acc = this.account();
              if (!acc?.id) return of(null);
              return this.email.poll(acc.id, this.pollSince).pipe(catchError(() => of(null)));
            }),
          )
          .subscribe((followUp) => {
            if (followUp) this.applyPollResult(followUp);
          });
      });
  }

  private applyPollResult(poll: {
    account_id: number | null;
    last_synced: string | null;
    unread_inbox: number;
    latest_received_at: string | null;
    has_changes: boolean;
    sync_error?: string | null;
  }): void {
    if (poll.unread_inbox > this.lastUnreadInbox && this.lastUnreadInbox >= 0 && this.pollSince) {
      this.sounds.playEmail();
    }
    this.lastUnreadInbox = poll.unread_inbox;
    this.unreadInbox.set(poll.unread_inbox);
    if (poll.last_synced || poll.sync_error !== undefined) {
      this.account.update((a) =>
        a
          ? {
              ...a,
              last_synced: poll.last_synced ?? a.last_synced,
              last_sync_error: poll.sync_error ?? a.last_sync_error ?? null,
            }
          : a,
      );
      this.mailboxes.update((list) =>
        list.map((a) =>
          a.id === poll.account_id
            ? {
                ...a,
                last_synced: poll.last_synced ?? a.last_synced,
                last_sync_error: poll.sync_error ?? a.last_sync_error ?? null,
              }
            : a,
        ),
      );
    }
    if (poll.has_changes) {
      this.loadEmails(false);
      this.counts.refresh();
    }
    this.pollSince = poll.latest_received_at ?? poll.last_synced ?? this.pollSince;
  }

  @HostListener('document:keydown', ['$event'])
  shortcuts(ev: KeyboardEvent): void {
    // Never steal keys while typing (inputs, textareas, or contenteditable compose body).
    if (this.isTypingTarget(ev.target)) return;
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (this.showCompose()) return;

    const key = ev.key.toLowerCase();
    if (key === 'c') this.openCompose();
    if (key === 'r') this.reply();
    if (key === 's') this.toggleStarSelected();
    if (key === 'u') this.markUnreadSelected();
  }

  private isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return true;
    if (target.isContentEditable || target.closest('[contenteditable="true"]')) return true;
    const tag = target.tagName;
    return tag === 'SELECT' || tag === 'OPTION';
  }

  /** Prefer healthy ACTIVE mailboxes; avoid defaulting to ERROR/auth-failed boxes. */
  private pickDefaultAccount(list: EmailAccount[]): EmailAccount | null {
    if (!list.length) return null;
    const usable = list.filter((a) => a.is_active);
    const active = usable.filter((a) => a.provisioning_status === 'ACTIVE');
    if (active.length) {
      return [...active].sort((a, b) => {
        const ta = a.last_synced ? Date.parse(a.last_synced) : 0;
        const tb = b.last_synced ? Date.parse(b.last_synced) : 0;
        return tb - ta;
      })[0];
    }
    return usable[0] || list[0];
  }

  loadAccounts(): void {
    this.email.getMyAccounts().subscribe({
      next: (list) => {
        this.mailboxes.set(list);
        const currentId = this.account()?.id;
        const stillThere = currentId ? list.find((a) => a.id === currentId) : null;
        if (stillThere) {
          // Same mailbox — refresh metadata only (do NOT re-select → avoids sync loop).
          this.account.set(stillThere);
          return;
        }
        const selected = this.pickDefaultAccount(list);
        if (selected) {
          this.selectAccount(selected);
        } else {
          this.account.set(null);
        }
      },
      error: () => this.error.set(true),
    });
  }

  selectAccount(acc: EmailAccount): void {
    if (this.account()?.id === acc.id) {
      this.account.set(acc);
      return;
    }
    this.account.set(acc);
    this.composeFromId.set(acc.id);
    this.pollSince = acc.last_synced;
    this.selectedId.set(null);
    this.selectedEmail.set(null);
    this.mobilePane.set('list');
    this.navOpen.set(false);
    this.loadLabels();
    this.loadEmails(true);
    this.email.getUnreadCount(acc.id).subscribe((c) => this.unreadInbox.set(c.inbox));
    // IMAP pull is handled by /poll (stale sync) and the Sync button — not here.
  }

  onMailboxChange(accountId: number): void {
    const acc = this.mailboxes().find((a) => a.id === Number(accountId));
    if (acc) this.selectAccount(acc);
  }

  loadLabels(): void {
    const accountId = this.account()?.id;
    this.email.getLabels(accountId).subscribe((list) => this.labels.set(list));
  }

  /** @param showLoading false = quiet background refresh (no list flicker). */
  loadEmails(showLoading = true): void {
    if (showLoading) this.loading.set(true);
    const f = this.folder();
    this.email
      .getEmails({
        folder: f,
        search: this.search() || undefined,
        unread: this.filter() === 'unread',
        starred: this.filter() === 'starred',
        has_attachment: this.filter() === 'attachment',
        account_id: this.account()?.id,
      })
      .pipe(
        catchError(() => {
          this.error.set(true);
          return of({ results: this.emails(), count: this.emails().length, next: null, previous: null });
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((data) => {
        this.emails.set(data?.results ?? []);
        if (data?.results) this.error.set(false);
      });
  }

  selectFolder(f: EmailFolder): void {
    this.discardCompose();
    this.folder.set(f);
    this.selectedId.set(null);
    this.selectedEmail.set(null);
    this.mobilePane.set('list');
    this.navOpen.set(false);
    this.loadEmails();
  }

  selectEmail(id: number): void {
    this.discardCompose();
    this.selectedId.set(id);
    this.showImages.set(false);
    this.mobilePane.set('thread');
    this.navOpen.set(false);
    this.email.getEmail(id).subscribe((e) => {
      this.selectedEmail.set(e);
      if (!e.is_read) {
        this.email.markRead(id).subscribe(() => {
          this.counts.refresh();
          this.loadEmails();
        });
      }
    });
  }

  sync(): void {
    this.syncing.set(true);
    const accountId = this.account()?.id;
    this.loadEmails(false);
    this.email
      .syncEmails(accountId)
      .pipe(
        catchError(() => of(null)),
        finalize(() => this.syncing.set(false)),
      )
      .subscribe(() => {
        this.counts.refresh();
        // Local Mailcow can take 10–25s — refresh a few times.
        for (const delayMs of [5_000, 12_000, 22_000]) {
          timer(delayMs)
            .pipe(
              switchMap(() =>
                this.email.poll(accountId, this.pollSince).pipe(catchError(() => of(null))),
              ),
            )
            .subscribe((poll) => {
              if (poll) this.applyPollResult(poll);
              else this.loadEmails(false);
            });
        }
      });
  }

  toggleSelect(id: number, ev: Event): void {
    ev.stopPropagation();
    this.selectedIds.update((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));
  }

  toggleStar(email: Email, ev: Event): void {
    ev.stopPropagation();
    const req = email.is_starred ? this.email.unstarEmail(email.id) : this.email.starEmail(email.id);
    req.subscribe(() => this.loadEmails());
  }

  toggleStarSelected(): void {
    const id = this.selectedId();
    if (!id) return;
    const e = this.selectedEmail();
    if (!e) return;
    const req = e.is_starred ? this.email.unstarEmail(id) : this.email.starEmail(id);
    req.subscribe((updated) => {
      this.selectedEmail.set(updated);
      this.loadEmails();
    });
  }

  markUnreadSelected(): void {
    const id = this.selectedId();
    if (!id) return;
    this.email.markUnread(id).subscribe(() => this.loadEmails());
  }

  bulkDelete(): void {
    const ids = this.selectedIds();
    if (!ids.length) return;
    this.email.bulkAction(ids, 'delete').subscribe(() => {
      this.selectedIds.set([]);
      this.loadEmails();
    });
  }

  /** True when composing a reply/reply-all under an open message. */
  isReplyCompose(): boolean {
    return this.showCompose() && this.composeReplyToId() != null;
  }

  /** True when composing a brand-new message in the reading pane. */
  isNewCompose(): boolean {
    return this.showCompose() && this.composeReplyToId() == null;
  }

  discardCompose(): void {
    this.showCompose.set(false);
    this.composeFiles.set([]);
    this.composeError.set('');
    this.composeReplyToId.set(null);
    if (!this.selectedId()) {
      this.mobilePane.set('list');
    }
  }

  openCompose(): void {
    this.showCompose.set(true);
    this.composeTitle.set('New Message');
    this.resetComposeRecipients();
    this.composeSubject.set('');
    this.composeBodyHtml.set('');
    this.composeFiles.set([]);
    this.composeError.set('');
    this.composeReplyToId.set(null);
    this.composeFromId.set(this.account()?.id ?? this.pickDefaultAccount(this.mailboxes())?.id ?? null);
    this.mobilePane.set('thread');
    this.navOpen.set(false);
    this.hydrateComposeEditor('<p><br></p>', true);
  }

  private resetComposeRecipients(): void {
    this.composeToList.set([]);
    this.composeCcList.set([]);
    this.composeBccList.set([]);
    this.composeToDraft.set('');
    this.composeCcDraft.set('');
    this.composeBccDraft.set('');
    this.showComposeCc.set(false);
    this.showComposeBcc.set(false);
  }

  private normalizeEmailChip(raw: string): string | null {
    const value = raw.trim().replace(/^[<"]+|[>"]+$/g, '');
    if (!value || !value.includes('@')) return null;
    return value;
  }

  addComposeRecipient(field: 'to' | 'cc' | 'bcc', raw?: string): void {
    const draft =
      raw ??
      (field === 'to' ? this.composeToDraft() : field === 'cc' ? this.composeCcDraft() : this.composeBccDraft());
    const parts = draft.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    const listSignal =
      field === 'to' ? this.composeToList : field === 'cc' ? this.composeCcList : this.composeBccList;
    const draftSignal =
      field === 'to' ? this.composeToDraft : field === 'cc' ? this.composeCcDraft : this.composeBccDraft;
    const next = [...listSignal()];
    for (const part of parts) {
      const email = this.normalizeEmailChip(part);
      if (!email) continue;
      if (!next.some((x) => x.toLowerCase() === email.toLowerCase())) next.push(email);
    }
    listSignal.set(next);
    draftSignal.set('');
  }

  removeComposeRecipient(field: 'to' | 'cc' | 'bcc', index: number): void {
    const listSignal =
      field === 'to' ? this.composeToList : field === 'cc' ? this.composeCcList : this.composeBccList;
    listSignal.update((list) => list.filter((_, i) => i !== index));
  }

  onRecipientKeydown(field: 'to' | 'cc' | 'bcc', ev: KeyboardEvent): void {
    const draftSignal =
      field === 'to' ? this.composeToDraft : field === 'cc' ? this.composeCcDraft : this.composeBccDraft;
    const listSignal =
      field === 'to' ? this.composeToList : field === 'cc' ? this.composeCcList : this.composeBccList;
    if (ev.key === 'Enter' || ev.key === ',' || ev.key === ';') {
      ev.preventDefault();
      this.addComposeRecipient(field);
      return;
    }
    if (ev.key === 'Backspace' && !draftSignal() && listSignal().length) {
      listSignal.update((list) => list.slice(0, -1));
    }
  }

  setComposeEditorHtml(html: string): void {
    const el = this.getComposeEditorEl();
    if (el) el.innerHTML = html || '<p><br></p>';
    this.composeBodyHtml.set(html || '');
  }

  private getComposeEditorEl(): HTMLDivElement | null {
    return (
      this.composeEditor?.nativeElement ??
      (document.querySelector('app-email-layout .compose-editor') as HTMLDivElement | null)
    );
  }

  /** Wait for ng-template outlet + CD before touching the contenteditable. */
  private hydrateComposeEditor(html: string, focus = true): void {
    this.composeBodyHtml.set(html || '');
    const apply = (): boolean => {
      const el = this.getComposeEditorEl();
      if (!el) return false;
      el.innerHTML = html || '<p><br></p>';
      this.composeBodyHtml.set(el.innerHTML);
      if (focus) {
        el.focus();
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(el);
        range.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      return true;
    };
    afterNextRender(
      () => {
        if (apply()) return;
        requestAnimationFrame(() => {
          if (apply()) return;
          setTimeout(apply, 40);
        });
      },
      { injector: this.injector },
    );
  }

  focusComposeEditor(): void {
    this.getComposeEditorEl()?.focus();
  }

  composeEditorIsEmpty(): boolean {
    const html = (this.composeBodyHtml() || '')
      .replace(/<br\s*\/?>/gi, '')
      .replace(/&nbsp;/gi, '')
      .replace(/<p>\s*<\/p>/gi, '')
      .replace(/<div>\s*<\/div>/gi, '')
      .replace(/\s+/g, '');
    return !html;
  }

  onComposeEditorInput(): void {
    const html = this.getComposeEditorEl()?.innerHTML ?? '';
    this.composeBodyHtml.set(html);
  }

  formatCompose(command: string, value?: string): void {
    this.getComposeEditorEl()?.focus();
    try {
      document.execCommand(command, false, value);
    } catch {
      /* ignore unsupported command */
    }
    this.onComposeEditorInput();
  }

  insertComposeLink(): void {
    const url = window.prompt('Link URL', 'https://');
    if (!url) return;
    this.formatCompose('createLink', url);
  }

  onComposeFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;
    const maxBytes = 25 * 1024 * 1024;
    const accepted: File[] = [];
    for (const file of files) {
      if (file.size > maxBytes) {
        this.composeError.set(`"${file.name}" exceeds 25MB limit`);
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length) {
      this.composeFiles.update((existing) => [...existing, ...accepted]);
      this.composeError.set('');
    }
    input.value = '';
  }

  removeComposeFile(index: number): void {
    this.composeFiles.update((files) => files.filter((_, i) => i !== index));
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  sendCompose(): void {
    this.addComposeRecipient('to');
    this.addComposeRecipient('cc');
    this.addComposeRecipient('bcc');
    const toRaw = this.composeToList();
    if (!toRaw.length) {
      this.composeError.set('Add at least one recipient');
      return;
    }
    const html = (this.getComposeEditorEl()?.innerHTML || this.composeBodyHtml() || '').trim();
    const text = (this.getComposeEditorEl()?.innerText || '')
      .replace(/\u00a0/g, ' ')
      .trim();
    const fromId = this.composeFromId() ?? this.account()?.id ?? null;
    const data: ComposeEmailData = {
      account_id: fromId,
      to: toRaw.map((email) => ({ name: '', email })),
      cc: this.composeCcList().map((email) => ({ name: '', email })),
      bcc: this.composeBccList().map((email) => ({ name: '', email })),
      subject: this.composeSubject(),
      body_html: html || `<p>${text.replace(/\n/g, '<br>')}</p>`,
      body_text: text,
      attachments: this.composeFiles().length ? this.composeFiles() : undefined,
      reply_to_id: this.composeReplyToId(),
    };
    this.composeSending.set(true);
    this.composeError.set('');
    this.email
      .sendEmail(data)
      .pipe(finalize(() => this.composeSending.set(false)))
      .subscribe({
        next: () => {
          this.discardCompose();
          this.folder.set('SENT');
          this.loadEmails(false);
          this.sync();
        },
        error: (err) => {
          const msg =
            err?.error?.message ||
            err?.error?.errors?.[0] ||
            'Failed to send email';
          this.composeError.set(typeof msg === 'string' ? msg : 'Failed to send email');
        },
      });
  }

  reply(replyAll = false): void {
    const e = this.selectedEmail();
    if (!e) return;

    const myAddress = (this.account()?.email_address || '').toLowerCase();
    const isOutbound =
      e.direction === 'OUTBOUND' || e.folder === 'SENT' || e.folder === 'DRAFT';

    const extractEmails = (
      addresses: { name?: string; email?: string }[] | string[] | null | undefined,
    ): string[] => {
      if (!addresses?.length) return [];
      return addresses
        .map((a) => (typeof a === 'string' ? a : a.email || ''))
        .map((s) => s.trim())
        .filter((s) => s && s.toLowerCase() !== myAddress);
    };

    let toList: string[];
    if (isOutbound) {
      // Sent: "reply" goes back to original recipients (not yourself).
      toList = extractEmails(e.to_addresses);
      if (replyAll) {
        toList = [...toList, ...extractEmails(e.cc_addresses)];
      }
    } else {
      toList = e.from_address ? [e.from_address] : [];
      if (replyAll) {
        toList = [
          ...toList,
          ...extractEmails(e.to_addresses),
          ...extractEmails(e.cc_addresses),
        ];
      }
    }
    // de-dupe preserving order
    toList = [...new Set(toList.map((x) => x.toLowerCase()))].map(
      (lower) => toList.find((x) => x.toLowerCase() === lower) || lower,
    );

    const quoted =
      e.body_text?.trim() ||
      (e.body_html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ||
      '';

    this.showCompose.set(true);
    this.composeTitle.set(replyAll ? 'Reply all' : 'Reply');
    this.resetComposeRecipients();
    this.composeToList.set(toList);
    if (replyAll && !isOutbound) {
      const cc = extractEmails(e.cc_addresses);
      if (cc.length) {
        this.showComposeCc.set(true);
        this.composeCcList.set(cc);
      }
    }
    this.composeSubject.set(e.subject.startsWith('Re:') ? e.subject : `Re: ${e.subject}`);
    const quoteHtml =
      `<p><br></p><p><br></p><p>---</p><p>On ${this.formatTime(e.received_at)}, ${e.from_name || e.from_address} wrote:</p>` +
      `<blockquote>${quoted.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</blockquote>`;
    this.composeFiles.set([]);
    this.composeError.set('');
    this.composeReplyToId.set(e.id);
    this.composeFromId.set(e.email_account_id || this.account()?.id || null);
    this.hydrateComposeEditor(quoteHtml, true);
  }

  /** Accounts that can appear in the Compose From dropdown. */
  sendableAccounts(): EmailAccount[] {
    return this.mailboxes().filter(
      (a) => a.is_active && (a.provisioning_status === 'ACTIVE' || a.provisioning_status === 'ERROR'),
    );
  }

  labelColor(color: string): string {
    const map: Record<string, string> = {
      blue: '#3B82F6',
      green: '#10B981',
      yellow: '#F59E0B',
      red: '#EF4444',
    };
    return map[color] ?? map['blue'];
  }

  initials(name: string): string {
    return (name || '?').charAt(0).toUpperCase();
  }

  formatAddressList(
    addresses: { name?: string; email?: string }[] | string[] | null | undefined,
  ): string {
    if (!addresses?.length) return '—';
    return addresses
      .map((a) => {
        if (typeof a === 'string') return a;
        if (a.name && a.email) return `${a.name} <${a.email}>`;
        return a.email || a.name || '';
      })
      .filter(Boolean)
      .join(', ');
  }
}
