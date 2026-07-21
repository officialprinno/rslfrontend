import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { MessagePriority } from '../../../core/models/messaging.model';
import { Department } from '../../../core/models/procurement.model';
import { DepartmentsService } from '../../../core/services/departments.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { MessagingService } from '../../../core/services/messaging.service';
import { NotificationService } from '../../../core/services/notification.service';
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
            <option value="CUSTOM">Selected Users</option>
          </select>
        </div>
        @if (recipientsType === 'DEPARTMENT') {
          <div>
            <label class="form-label">Department *</label>
            <select class="input-field w-full" [(ngModel)]="departmentId" name="departmentId" required>
              <option [ngValue]="null">Select a department</option>
              @for (department of departments(); track department.id) {
                <option [ngValue]="department.id">{{ department.name }}</option>
              }
            </select>
          </div>
        }
        @if (recipientsType === 'CUSTOM') {
          <div>
            <label class="form-label">Users *</label>
            <input
              type="search"
              class="search-field w-full mb-2"
              placeholder="Search employees"
              [(ngModel)]="userSearch"
              name="userSearch"
              (ngModelChange)="searchUsers()"
            />
            <div class="max-h-56 overflow-y-auto rounded-lg border border-[var(--border-color)]">
              @for (user of userResults(); track user.id) {
                <button
                  type="button"
                  class="flex w-full items-center justify-between gap-3 border-b border-[var(--border-color)] px-3 py-2.5 text-left last:border-b-0 hover:bg-[var(--hover-bg)]"
                  [class.bg-blue-50]="selectedUserIds().includes(user.id)"
                  (click)="toggleUser(user.id)"
                >
                  <span class="min-w-0">
                    <span class="block truncate text-sm font-medium">{{ user.full_name }}</span>
                    <span class="block truncate text-xs text-[var(--text-muted)]">
                      {{ user.department_name }} · {{ user.role_name }}
                    </span>
                  </span>
                  <span class="text-xs font-semibold text-[#1B3A6B]">
                    {{ selectedUserIds().includes(user.id) ? 'Selected' : 'Select' }}
                  </span>
                </button>
              } @empty {
                <p class="p-3 text-sm text-[var(--text-muted)]">No users found.</p>
              }
            </div>
            <p class="mt-1.5 text-xs text-[var(--text-muted)]">
              {{ selectedUserIds().length }} user(s) selected
            </p>
          </div>
        }
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
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="form-label" for="broadcastStartsAt">Visible from *</label>
            <input
              id="broadcastStartsAt"
              type="datetime-local"
              class="input-field w-full"
              [(ngModel)]="broadcastStartsAt"
              name="broadcastStartsAt"
              required
            />
          </div>
          <div>
            <label class="form-label" for="broadcastExpiresAt">Expires at *</label>
            <input
              id="broadcastExpiresAt"
              type="datetime-local"
              class="input-field w-full"
              [(ngModel)]="broadcastExpiresAt"
              name="broadcastExpiresAt"
              required
            />
          </div>
        </div>
        <p class="text-xs text-(--text-muted)">
          Times use your local timezone. Only selected recipients can see the broadcast from the
          visible time until, but not including, the expiry time.
        </p>
        @if (!scheduleIsValid()) {
          <p class="text-sm text-red-600">
            Expiry must be later than the visible-from time and must be in the future.
          </p>
        }
        <div class="flex gap-2 justify-end">
          <a routerLink="/messaging" class="btn-secondary">Cancel</a>
          <button type="submit" class="btn-primary" [disabled]="!canSubmit()">
            {{ sending() ? 'Scheduling...' : 'Schedule Broadcast' }}
          </button>
        </div>
      </form>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BroadcastComponent implements OnInit {
  private readonly messaging = inject(MessagingService);
  private readonly departmentsService = inject(DepartmentsService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  subject = '';
  body = '';
  recipientsType: 'ALL' | 'DEPARTMENT' | 'CUSTOM' = 'ALL';
  departmentId: number | null = null;
  userSearch = '';
  priority: MessagePriority = 'NORMAL';
  broadcastStartsAt = this.toLocalDateTime(new Date());
  broadcastExpiresAt = this.toLocalDateTime(new Date(Date.now() + 24 * 60 * 60 * 1000));
  readonly sending = signal(false);
  readonly departments = signal<Department[]>([]);
  readonly userResults = signal<
    { id: number; full_name: string; department_name: string; role_name: string }[]
  >([]);
  readonly selectedUserIds = signal<number[]>([]);

  ngOnInit(): void {
    this.departmentsService.getDepartments().subscribe({
      next: (departments) => this.departments.set(departments),
      error: () => this.notifications.error('Unable to load departments.'),
    });
    this.searchUsers();
  }

  searchUsers(): void {
    this.messaging.searchUsers(this.userSearch).subscribe({
      next: (users) => this.userResults.set(users),
      error: () => this.notifications.error('Unable to load users.'),
    });
  }

  toggleUser(userId: number): void {
    this.selectedUserIds.update((ids) =>
      ids.includes(userId) ? ids.filter((id) => id !== userId) : [...ids, userId],
    );
  }

  canSubmit(): boolean {
    if (
      this.sending() ||
      !this.subject.trim() ||
      !this.body.trim() ||
      !this.scheduleIsValid()
    ) {
      return false;
    }
    if (this.recipientsType === 'DEPARTMENT') return this.departmentId !== null;
    if (this.recipientsType === 'CUSTOM') return this.selectedUserIds().length > 0;
    return true;
  }

  scheduleIsValid(): boolean {
    const startsAt = new Date(this.broadcastStartsAt).getTime();
    const expiresAt = new Date(this.broadcastExpiresAt).getTime();
    return (
      Number.isFinite(startsAt) &&
      Number.isFinite(expiresAt) &&
      expiresAt > startsAt &&
      expiresAt > Date.now()
    );
  }

  send(): void {
    if (!this.canSubmit()) return;
    const audience =
      this.recipientsType === 'ALL'
        ? 'all staff'
        : this.recipientsType === 'DEPARTMENT'
          ? 'the selected department'
          : `${this.selectedUserIds().length} selected user(s)`;
    this.confirmDialog.open({
      title: 'Send Broadcast',
      message: `Schedule this broadcast for ${audience}?`,
      confirmLabel: 'Schedule Broadcast',
    }).subscribe((confirmed) => {
      if (!confirmed || !this.canSubmit()) return;
      this.sendConfirmed();
    });
  }

  private sendConfirmed(): void {
    this.sending.set(true);
    this.messaging
      .sendBroadcast({
        subject: this.subject,
        body: this.body,
        recipients_type: this.recipientsType,
        department_id: this.recipientsType === 'DEPARTMENT' ? this.departmentId : undefined,
        user_ids: this.recipientsType === 'CUSTOM' ? this.selectedUserIds() : undefined,
        priority: this.priority,
        broadcast_starts_at: new Date(this.broadcastStartsAt).toISOString(),
        broadcast_expires_at: new Date(this.broadcastExpiresAt).toISOString(),
      })
      .pipe(finalize(() => this.sending.set(false)))
      .subscribe({
        next: () => {
          this.notifications.success('Broadcast scheduled successfully.');
          void this.router.navigate(['/messaging']);
        },
        error: (e) => this.notifications.error(e.message || 'Failed to schedule broadcast'),
      });
  }

  private toLocalDateTime(date: Date): string {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return localDate.toISOString().slice(0, 16);
  }
}
