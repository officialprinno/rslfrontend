import { DecimalPipe, SlicePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { ComposeEmailData, Email, EmailFolder, Label } from '../../../core/models/email.model';
import { EmailService } from '../../../core/services/email.service';
import { NotificationCountsService } from '../../../core/services/notification-counts.service';
import { formatMessageTime } from '../../../core/utils/time.util';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';

@Component({
  selector: 'app-email-layout',
  imports: [FormsModule, RouterLink, SlicePipe, DecimalPipe, ErrorStateComponent],
  templateUrl: './email-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailLayoutComponent implements OnInit {
  private readonly email = inject(EmailService);
  private readonly counts = inject(NotificationCountsService);

  readonly account = signal<{ email_address: string; last_synced: string | null } | null>(null);
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

  readonly composeTo = signal('');
  readonly composeSubject = signal('');
  readonly composeBody = signal('');

  readonly formatTime = formatMessageTime;

  readonly folders: { key: EmailFolder; label: string; icon: string }[] = [
    { key: 'INBOX', label: 'Inbox', icon: '📥' },
    { key: 'SENT', label: 'Sent', icon: '📤' },
    { key: 'DRAFT', label: 'Drafts', icon: '📝' },
    { key: 'TRASH', label: 'Trash', icon: '🗑️' },
    { key: 'SPAM', label: 'Spam', icon: '⚠️' },
  ];

  ngOnInit(): void {
    this.loadAccount();
    this.loadLabels();
    this.loadEmails();
    this.email.getUnreadCount().subscribe((c) => this.unreadInbox.set(c.inbox));
  }

  @HostListener('document:keydown', ['$event'])
  shortcuts(ev: KeyboardEvent): void {
    if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement) return;
    if (ev.key === 'c' || ev.key === 'C') this.openCompose();
    if (ev.key === 'r' || ev.key === 'R') this.reply();
    if (ev.key === 's' || ev.key === 'S') this.toggleStarSelected();
    if (ev.key === 'u' || ev.key === 'U') this.markUnreadSelected();
  }

  loadAccount(): void {
    this.email.getEmailAccount().subscribe((acc) => {
      if (acc) this.account.set({ email_address: acc.email_address, last_synced: acc.last_synced });
    });
  }

  loadLabels(): void {
    this.email.getLabels().subscribe((list) => this.labels.set(list));
  }

  loadEmails(): void {
    this.loading.set(true);
    const f = this.folder();
    this.email
      .getEmails({
        folder: f,
        search: this.search() || undefined,
        unread: this.filter() === 'unread',
        starred: this.filter() === 'starred',
        has_attachment: this.filter() === 'attachment',
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => {
          this.emails.set(data.results);
          this.error.set(false);
        },
        error: () => this.error.set(true),
      });
  }

  selectFolder(f: EmailFolder): void {
    this.folder.set(f);
    this.selectedId.set(null);
    this.selectedEmail.set(null);
    this.loadEmails();
  }

  selectEmail(id: number): void {
    this.selectedId.set(id);
    this.showImages.set(false);
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
    this.email
      .syncEmails()
      .pipe(finalize(() => this.syncing.set(false)))
      .subscribe(() => {
        this.loadEmails();
        this.loadAccount();
        this.counts.refresh();
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

  openCompose(): void {
    this.showCompose.set(true);
    this.composeTo.set('');
    this.composeSubject.set('');
    this.composeBody.set('');
  }

  sendCompose(): void {
    const toRaw = this.composeTo().split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    const data: ComposeEmailData = {
      to: toRaw.map((email) => ({ name: email, email })),
      cc: [],
      bcc: [],
      subject: this.composeSubject(),
      body_html: `<p>${this.composeBody().replace(/\n/g, '<br>')}</p>`,
    };
    this.email.sendEmail(data).subscribe(() => {
      this.showCompose.set(false);
      this.loadEmails();
    });
  }

  reply(): void {
    const e = this.selectedEmail();
    if (!e) return;
    this.showCompose.set(true);
    this.composeTo.set(e.from_address);
    this.composeSubject.set(e.subject.startsWith('Re:') ? e.subject : `Re: ${e.subject}`);
    this.composeBody.set(`\n\n---\n${e.body_text}`);
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
}
