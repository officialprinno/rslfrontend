import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { EmailService } from '../../../core/services/email.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-email-account-settings',
  imports: [FormsModule, RouterLink, PageHeaderComponent],
  template: `
    <app-page-header title="Email Account" subtitle="Configure IMAP and SMTP for @rocksolutions.co.tz" />

    <div class="card max-w-2xl space-y-6">
      <section>
        <h3 class="section-title mb-3">Account Details</h3>
        <div class="grid gap-3">
          <div>
            <label class="form-label">Email Address</label>
            <input class="input-field w-full" [(ngModel)]="form.email_address" />
          </div>
          <div>
            <label class="form-label">Display Name</label>
            <input class="input-field w-full" [(ngModel)]="form.display_name" />
          </div>
        </div>
      </section>

      <section>
        <h3 class="section-title mb-3">Incoming Mail (IMAP)</h3>
        <div class="grid sm:grid-cols-2 gap-3">
          <div class="sm:col-span-2">
            <label class="form-label">IMAP Host</label>
            <input class="input-field w-full" [(ngModel)]="form.imap_host" />
          </div>
          <div>
            <label class="form-label">Port</label>
            <input type="number" class="input-field w-full" [(ngModel)]="form.imap_port" />
          </div>
          <div class="flex items-end">
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" [(ngModel)]="form.imap_use_ssl" /> SSL/TLS
            </label>
          </div>
          <div>
            <label class="form-label">Username</label>
            <input class="input-field w-full" [(ngModel)]="form.username" />
          </div>
          <div>
            <label class="form-label">Password</label>
            <input type="password" class="input-field w-full" [(ngModel)]="form.password" />
          </div>
        </div>
      </section>

      <section>
        <h3 class="section-title mb-3">Outgoing Mail (SMTP)</h3>
        <div class="grid sm:grid-cols-2 gap-3">
          <div class="sm:col-span-2">
            <label class="form-label">SMTP Host</label>
            <input class="input-field w-full" [(ngModel)]="form.smtp_host" />
          </div>
          <div>
            <label class="form-label">Port</label>
            <input type="number" class="input-field w-full" [(ngModel)]="form.smtp_port" />
          </div>
          <div class="flex items-end">
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" [(ngModel)]="form.smtp_use_tls" /> STARTTLS
            </label>
          </div>
        </div>
      </section>

      <section>
        <h3 class="section-title mb-3">Sync Settings</h3>
        <div class="grid sm:grid-cols-2 gap-3">
          <div>
            <label class="form-label">Auto-sync (minutes)</label>
            <select class="input-field w-full" [(ngModel)]="form.sync_frequency">
              <option [ngValue]="5">Every 5</option>
              <option [ngValue]="10">Every 10</option>
              <option [ngValue]="15">Every 15</option>
              <option [ngValue]="30">Every 30</option>
            </select>
          </div>
          <div>
            <label class="form-label">Sync emails from (days)</label>
            <select class="input-field w-full" [(ngModel)]="form.sync_days">
              <option [ngValue]="30">30</option>
              <option [ngValue]="60">60</option>
              <option [ngValue]="90">90</option>
            </select>
          </div>
        </div>
      </section>

      @if (testResult()) {
        <div class="text-sm p-3 rounded-lg" [class.bg-green-50]="testResult()?.success" [class.bg-red-50]="!testResult()?.success">
          @if (testResult()?.success) {
            ✓ Connection successful
          } @else {
            ✗ IMAP: {{ testResult()?.imap_error || 'failed' }} · SMTP: {{ testResult()?.smtp_error || 'failed' }}
          }
        </div>
      }

      <div class="flex gap-2 flex-wrap">
        <button type="button" class="btn-secondary" [disabled]="testing()" (click)="test()">
          {{ testing() ? 'Testing...' : 'Test Connection' }}
        </button>
        <button type="button" class="btn-primary" [disabled]="saving()" (click)="save()">
          {{ saving() ? 'Saving...' : 'Save Account' }}
        </button>
        <a routerLink="/email" class="btn-secondary">Back to Email</a>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailAccountSettingsComponent implements OnInit {
  private readonly email = inject(EmailService);

  form = {
    email_address: '',
    display_name: '',
    imap_host: 'mail.rocksolutions.co.tz',
    imap_port: 993,
    imap_use_ssl: true,
    smtp_host: 'mail.rocksolutions.co.tz',
    smtp_port: 587,
    smtp_use_tls: true,
    username: '',
    password: '',
    sync_frequency: 5,
    sync_days: 30,
    max_per_sync: 50,
  };

  readonly testing = signal(false);
  readonly saving = signal(false);
  readonly testResult = signal<{ success: boolean; imap_error?: string | null; smtp_error?: string | null } | null>(null);

  ngOnInit(): void {
    this.email.getEmailAccount().subscribe((acc) => {
      if (acc) {
        this.form = {
          ...this.form,
          email_address: acc.email_address,
          display_name: acc.display_name,
          imap_host: acc.imap_host,
          imap_port: acc.imap_port,
          imap_use_ssl: acc.imap_use_ssl,
          smtp_host: acc.smtp_host,
          smtp_port: acc.smtp_port,
          smtp_use_tls: acc.smtp_use_tls,
          username: acc.username,
          password: '',
          sync_frequency: acc.sync_frequency,
          sync_days: acc.sync_days,
          max_per_sync: acc.max_per_sync,
        };
      }
    });
  }

  test(): void {
    this.testing.set(true);
    this.email
      .testConnection(this.form)
      .pipe(finalize(() => this.testing.set(false)))
      .subscribe((r) => this.testResult.set(r));
  }

  save(): void {
    this.saving.set(true);
    this.email
      .setupEmailAccount(this.form)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe();
  }
}
