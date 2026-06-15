import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { MessagePriority } from '../../../core/models/messaging.model';
import { MessagingService } from '../../../core/services/messaging.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-broadcast',
  imports: [FormsModule, RouterLink, PageHeaderComponent],
  template: `
    <app-page-header title="Send Broadcast" subtitle="Send announcement to all staff or a department" />

    <div class="card max-w-2xl">
      <form class="space-y-4" (ngSubmit)="send()">
        <div>
          <label class="form-label">Subject *</label>
          <input class="input-field w-full" [(ngModel)]="subject" name="subject" required />
        </div>
        <div>
          <label class="form-label">Recipients</label>
          <select class="input-field w-full" [(ngModel)]="recipientsType" name="recipients">
            <option value="ALL">All Staff</option>
            <option value="DEPARTMENT">By Department</option>
          </select>
        </div>
        <div>
          <label class="form-label">Priority</label>
          <select class="input-field w-full" [(ngModel)]="priority" name="priority">
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
        <div>
          <label class="form-label">Message *</label>
          <textarea class="input-field w-full min-h-[160px]" [(ngModel)]="body" name="body" required></textarea>
        </div>
        <div class="flex gap-2 justify-end">
          <a routerLink="/messaging" class="btn-secondary">Cancel</a>
          <button type="submit" class="btn-primary" [disabled]="sending() || !subject.trim() || !body.trim()">
            {{ sending() ? 'Sending...' : 'Send Broadcast' }}
          </button>
        </div>
      </form>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BroadcastComponent {
  private readonly messaging = inject(MessagingService);
  private readonly router = inject(Router);

  subject = '';
  body = '';
  recipientsType: 'ALL' | 'DEPARTMENT' = 'ALL';
  priority: MessagePriority = 'NORMAL';
  readonly sending = signal(false);

  send(): void {
    if (!confirm(`Send broadcast to ${this.recipientsType === 'ALL' ? 'all staff' : 'selected department'}?`)) {
      return;
    }
    this.sending.set(true);
    this.messaging
      .sendBroadcast({
        subject: this.subject,
        body: this.body,
        recipients_type: this.recipientsType,
        priority: this.priority,
      })
      .pipe(finalize(() => this.sending.set(false)))
      .subscribe({
        next: (res) => void this.router.navigate(['/messaging'], { queryParams: { c: res.conversation.id } }),
        error: (e) => alert(e.message || 'Failed to send broadcast'),
      });
  }
}
