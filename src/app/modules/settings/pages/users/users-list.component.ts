import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { User, UserCredential } from '../../../../core/models/auth.models';
import { NotificationService } from '../../../../core/services/notification.service';
import { UsersService } from '../../../../core/services/users.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { SettingsAdminNavComponent } from '../../components/settings-admin-nav/settings-admin-nav.component';
import { UserCredentialsModalComponent } from './user-credentials-modal.component';

@Component({
  selector: 'app-users-list',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    SettingsAdminNavComponent,
    PaginationComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
    UserCredentialsModalComponent,
  ],
  templateUrl: './users-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersListComponent implements OnInit {
  private readonly users = inject(UsersService);
  private readonly notification = inject(NotificationService);

  readonly rows = signal<User[]>([]);
  readonly loading = signal(true);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly search = signal('');

  readonly credentialsOpen = signal(false);
  readonly credentialsLoading = signal(false);
  readonly credentials = signal<UserCredential[]>([]);
  readonly credentialsGeneratedAt = signal('');

  readonly canEdit = () => true;

  ngOnInit(): void {
    this.load();
  }

  onSearch(): void {
    this.page.set(1);
    this.load();
  }

  onPageChange(p: number): void {
    this.page.set(p);
    this.load();
  }

  departmentSummary(user: User): string {
    if (user.is_multi_department && user.departments?.length) {
      return user.departments.map((d) => d.department_name).join(', ');
    }
    return user.department_name ?? '—';
  }

  openCredentials(): void {
    this.credentialsOpen.set(true);
    this.credentialsLoading.set(true);
    this.credentials.set([]);
    this.users
      .listUserCredentials()
      .pipe(finalize(() => this.credentialsLoading.set(false)))
      .subscribe({
        next: (rows) => {
          this.credentials.set(rows);
          this.credentialsGeneratedAt.set(
            new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
          );
        },
        error: (err) => {
          this.credentialsOpen.set(false);
          this.notification.error(getApiErrorMessage(err, 'Failed to load credentials'));
        },
      });
  }

  closeCredentials(): void {
    this.credentialsOpen.set(false);
  }

  printCredentials(): void {
    const rows = this.credentials();
    if (!rows.length) {
      return;
    }
    const title = 'Rock Solutions FMS — User Login Credentials';
    const generated = this.credentialsGeneratedAt();
    const tableRows = rows
      .map(
        (r) =>
          `<tr>
            <td>${escapeHtml(r.full_name)}</td>
            <td>${escapeHtml(r.email)}</td>
            <td>${escapeHtml(r.role_name ?? '—')}</td>
            <td>${escapeHtml(r.password)}</td>
            <td>${r.is_active ? 'Active' : 'Inactive'}</td>
          </tr>`,
      )
      .join('');
    const html = `<!DOCTYPE html><html><head><title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        p { font-size: 12px; color: #555; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background: #f3f4f6; }
      </style></head><body>
      <h1>${title}</h1>
      <p>Generated ${escapeHtml(generated)} · ${rows.length} accounts · Confidential</p>
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Password</th><th>Status</th></tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
      </body></html>`;
    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) {
      this.notification.error('Allow pop-ups to print credentials.');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  downloadCredentials(): void {
    const rows = this.credentials();
    if (!rows.length) {
      return;
    }
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const lines = [
      'Name,Email,Role,Password,Status',
      ...rows.map((r) =>
        [
          escapeCsv(r.full_name),
          escapeCsv(r.email),
          escapeCsv(r.role_name ?? ''),
          escapeCsv(r.password),
          escapeCsv(r.is_active ? 'Active' : 'Inactive'),
        ].join(','),
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `rsl-fms-user-credentials-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private load(): void {
    this.loading.set(true);
    this.users
      .listUsers({ page: this.page(), search: this.search() })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => {
          this.rows.set(data.results);
          this.total.set(data.count);
        },
        error: (err) => this.notification.error(getApiErrorMessage(err, 'Failed to load users')),
      });
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
