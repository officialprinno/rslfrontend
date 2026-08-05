import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { EmailAccount, EmailAccountType } from '../../../core/models/email.model';
import { UserOption } from '../../../core/models/inventory.model';
import { EmailService } from '../../../core/services/email.service';
import { NotificationService } from '../../../core/services/notification.service';
import { UsersService } from '../../../core/services/users.service';
import { getApiErrorMessage } from '../../../core/utils/api.util';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-email-mailboxes-admin',
  imports: [FormsModule, RouterLink, PageHeaderComponent, DatePipe],
  template: `
    <div class="page-container">
      <app-page-header
        title="Email Mailboxes"
        subtitle="Provision @rocksolutions.co.tz mailboxes via Mailcow — users never see IMAP passwords"
      />

      <div class="flex flex-wrap gap-3 mb-4">
        <button type="button" class="btn-primary" (click)="openCreate()">Provision Mailbox</button>
        <a routerLink="/settings/admin" class="btn-secondary">Admin Home</a>
        <a routerLink="/email" class="btn-secondary">Open Inbox</a>
      </div>

      @if (loading()) {
        <p class="text-sm text-gray-500">Loading…</p>
      } @else if (!mailboxes().length) {
        <p class="text-sm text-gray-500">No mailboxes yet.</p>
      } @else {
        <div class="card overflow-x-auto">
          <table class="data-table w-full text-sm">
            <thead>
              <tr>
                <th>Address</th>
                <th>Type</th>
                <th>Status</th>
                <th>Quota</th>
                <th>Last sync</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (mb of mailboxes(); track mb.id) {
                <tr>
                  <td>
                    <div class="font-medium">{{ mb.display_name || mb.email_address }}</div>
                    <div class="text-gray-500">{{ mb.email_address }}</div>
                  </td>
                  <td>{{ mb.account_type }}</td>
                  <td>{{ mb.provisioning_status }}</td>
                  <td>{{ mb.quota_mb }} MB</td>
                  <td>{{ mb.last_synced ? (mb.last_synced | date: 'short') : '—' }}</td>
                  <td class="space-x-2 whitespace-nowrap">
                    @if (mb.provisioning_status === 'DISABLED') {
                      <button type="button" class="text-[#1B3A6B] hover:underline" (click)="enable(mb)">
                        Enable
                      </button>
                    } @else {
                      <button type="button" class="text-amber-700 hover:underline" (click)="disable(mb)">
                        Disable
                      </button>
                    }
                    <button type="button" class="text-red-700 hover:underline" (click)="remove(mb)">
                      Delete
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (showCreate()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div class="card max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 class="text-lg font-semibold">Provision Mailbox</h3>

            <div>
              <label class="form-label">Account type</label>
              <select class="input-field w-full" [(ngModel)]="form.account_type" (ngModelChange)="onTypeChange()">
                <option value="PERSONAL">Personal</option>
                <option value="SHARED">Shared (department)</option>
              </select>
            </div>

            @if (form.account_type === 'PERSONAL') {
              <div>
                <label class="form-label">Owner</label>
                <select class="input-field w-full" [(ngModel)]="form.owner_id" (ngModelChange)="onOwnerChange()">
                  <option [ngValue]="null">Select user…</option>
                  @for (u of users(); track u.id) {
                    <option [ngValue]="u.id">{{ u.full_name }} ({{ u.email }})</option>
                  }
                </select>
              </div>
            }

            <div>
              <label class="form-label">Email address</label>
              <input
                class="input-field w-full"
                [(ngModel)]="form.email_address"
                placeholder="firstname.lastname@rocksolutions.co.tz"
              />
            </div>

            <div>
              <label class="form-label">Display name</label>
              <input class="input-field w-full" [(ngModel)]="form.display_name" />
            </div>

            <div>
              <label class="form-label">Quota (MB)</label>
              <input type="number" class="input-field w-full" [(ngModel)]="form.quota_mb" />
            </div>

            @if (form.account_type === 'SHARED') {
              <div>
                <label class="form-label">Access users</label>
                <div class="max-h-40 overflow-y-auto border rounded p-2 space-y-1">
                  @for (u of users(); track u.id) {
                    <label class="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        [checked]="accessIds().includes(u.id)"
                        (change)="toggleAccess(u.id)"
                      />
                      {{ u.full_name }}
                    </label>
                  }
                </div>
              </div>
            }

            <div class="flex justify-end gap-2 pt-2">
              <button type="button" class="btn-secondary" (click)="showCreate.set(false)" [disabled]="saving()">
                Cancel
              </button>
              <button type="button" class="btn-primary" (click)="submit()" [disabled]="saving()">
                {{ saving() ? 'Provisioning…' : 'Provision' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailMailboxesAdminComponent implements OnInit {
  private readonly email = inject(EmailService);
  private readonly usersApi = inject(UsersService);
  private readonly notification = inject(NotificationService);

  readonly mailboxes = signal<EmailAccount[]>([]);
  readonly users = signal<UserOption[]>([]);
  readonly loading = signal(true);
  readonly showCreate = signal(false);
  readonly saving = signal(false);
  readonly accessIds = signal<number[]>([]);

  form: {
    account_type: EmailAccountType;
    owner_id: number | null;
    email_address: string;
    display_name: string;
    quota_mb: number;
  } = {
    account_type: 'PERSONAL',
    owner_id: null,
    email_address: '',
    display_name: '',
    quota_mb: 1024,
  };

  ngOnInit(): void {
    this.reload();
    this.usersApi.getUsers().subscribe((list) => this.users.set(list));
  }

  reload(): void {
    this.loading.set(true);
    this.email
      .adminListMailboxes()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (list) => this.mailboxes.set(list),
        error: (err) => this.notification.error(getApiErrorMessage(err, 'Failed to load mailboxes')),
      });
  }

  openCreate(): void {
    this.form = {
      account_type: 'PERSONAL',
      owner_id: null,
      email_address: '',
      display_name: '',
      quota_mb: 1024,
    };
    this.accessIds.set([]);
    this.showCreate.set(true);
  }

  onTypeChange(): void {
    this.form.email_address = '';
    this.form.owner_id = null;
    this.accessIds.set([]);
  }

  onOwnerChange(): void {
    const id = this.form.owner_id;
    if (!id) return;
    const u = this.users().find((x) => x.id === id);
    if (u) this.form.display_name = u.full_name;
    this.email.adminSuggestAddress(id).subscribe((r) => {
      this.form.email_address = r.email_address;
    });
  }

  toggleAccess(userId: number): void {
    this.accessIds.update((ids) =>
      ids.includes(userId) ? ids.filter((i) => i !== userId) : [...ids, userId],
    );
  }

  submit(): void {
    if (!this.form.email_address.trim()) {
      this.notification.error('Email address is required');
      return;
    }
    if (this.form.account_type === 'PERSONAL' && !this.form.owner_id) {
      this.notification.error('Select an owner for personal mailboxes');
      return;
    }
    const access =
      this.form.account_type === 'PERSONAL'
        ? this.form.owner_id
          ? [this.form.owner_id]
          : []
        : this.accessIds();
    if (!access.length) {
      this.notification.error('At least one access user is required');
      return;
    }
    this.saving.set(true);
    this.email
      .adminProvisionMailbox({
        account_type: this.form.account_type,
        owner_id: this.form.account_type === 'PERSONAL' ? this.form.owner_id : null,
        email_address: this.form.email_address.trim().toLowerCase(),
        display_name: this.form.display_name,
        quota_mb: this.form.quota_mb,
        access_user_ids: access,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Mailbox provisioned');
          this.showCreate.set(false);
          this.reload();
        },
        error: (err) => this.notification.error(getApiErrorMessage(err, 'Provisioning failed')),
      });
  }

  disable(mb: EmailAccount): void {
    this.email.adminDisableMailbox(mb.id).subscribe({
      next: () => {
        this.notification.success('Mailbox disabled');
        this.reload();
      },
      error: (err) => this.notification.error(getApiErrorMessage(err, 'Disable failed')),
    });
  }

  enable(mb: EmailAccount): void {
    this.email.adminEnableMailbox(mb.id).subscribe({
      next: () => {
        this.notification.success('Mailbox enabled');
        this.reload();
      },
      error: (err) => this.notification.error(getApiErrorMessage(err, 'Enable failed')),
    });
  }

  remove(mb: EmailAccount): void {
    if (!confirm(`Delete mailbox ${mb.email_address}? This cannot be undone easily.`)) return;
    this.email.adminDeleteMailbox(mb.id).subscribe({
      next: () => {
        this.notification.success('Mailbox deleted');
        this.reload();
      },
      error: (err) => this.notification.error(getApiErrorMessage(err, 'Delete failed')),
    });
  }
}
