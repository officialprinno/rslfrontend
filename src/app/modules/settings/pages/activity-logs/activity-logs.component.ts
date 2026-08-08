import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { User } from '../../../../core/models/auth.models';
import { AuditLogEntry, AuditLogStatus } from '../../../../core/models/audit.model';
import { AuditService } from '../../../../core/services/audit.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { UsersService } from '../../../../core/services/users.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { SettingsAdminNavComponent } from '../../components/settings-admin-nav/settings-admin-nav.component';

@Component({
  selector: 'app-activity-logs',
  imports: [
    FormsModule,
    DatePipe,
    PageHeaderComponent,
    SettingsAdminNavComponent,
    PaginationComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './activity-logs.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityLogsComponent implements OnInit {
  private readonly audit = inject(AuditService);
  private readonly users = inject(UsersService);
  private readonly notification = inject(NotificationService);

  readonly rows = signal<AuditLogEntry[]>([]);
  readonly userOptions = signal<User[]>([]);
  readonly loading = signal(true);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = 25;

  readonly search = signal('');
  readonly module = signal('');
  readonly action = signal('');
  readonly status = signal<AuditLogStatus | ''>('');
  readonly userId = signal<number | ''>('');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');
  readonly selected = signal<AuditLogEntry | null>(null);

  readonly modules = [
    { value: '', label: 'All modules' },
    { value: 'auth', label: 'Auth (login / logout)' },
    { value: 'navigation', label: 'Page visits' },
    { value: 'users', label: 'Users' },
    { value: 'procurement', label: 'Procurement' },
    { value: 'inventory', label: 'Inventory' },
    { value: 'finance', label: 'Finance' },
    { value: 'sales', label: 'Sales' },
    { value: 'email', label: 'Email' },
    { value: 'hr', label: 'HR' },
    { value: 'production', label: 'Production' },
  ];

  ngOnInit(): void {
    this.users.listUsers({ page_size: 200, is_active: true }).subscribe({
      next: (data) => this.userOptions.set(data.results ?? []),
      error: () => undefined,
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.audit
      .list({
        page: this.page(),
        page_size: this.pageSize,
        search: this.search() || undefined,
        module: this.module() || undefined,
        action: this.action() || undefined,
        status: this.status() || undefined,
        user: this.userId() || undefined,
        date_from: this.dateFrom() || undefined,
        date_to: this.dateTo() || undefined,
        ordering: '-created_at',
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => {
          this.rows.set(data.results ?? []);
          this.total.set(data.count ?? 0);
        },
        error: (err) => {
          this.rows.set([]);
          this.total.set(0);
          this.notification.error(getApiErrorMessage(err, 'Failed to load activity logs'));
        },
      });
  }

  applyFilters(): void {
    this.page.set(1);
    this.load();
  }

  clearFilters(): void {
    this.search.set('');
    this.module.set('');
    this.action.set('');
    this.status.set('');
    this.userId.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.page.set(1);
    this.load();
  }

  onPageChange(p: number): void {
    this.page.set(p);
    this.load();
  }

  openDetail(row: AuditLogEntry): void {
    this.selected.set(row);
  }

  closeDetail(): void {
    this.selected.set(null);
  }

  statusTone(status: string): string {
    return status === 'FAILED'
      ? 'bg-rose-100 text-rose-800 border-rose-200'
      : 'bg-emerald-100 text-emerald-800 border-emerald-200';
  }

  prettyAction(row: AuditLogEntry): string {
    const action = (row.action || '').replaceAll('_', ' ');
    if (row.module === 'navigation' && row.action === 'page_view') {
      const path = (row.new_values?.['path'] as string) || row.record_id || '';
      return path ? `Visited ${path}` : 'Page visit';
    }
    if (row.module === 'auth' && row.action === 'login_failed') {
      return 'Login failed';
    }
    return action.charAt(0).toUpperCase() + action.slice(1);
  }

  detailJson(value: Record<string, unknown> | null): string {
    if (!value || !Object.keys(value).length) return '—';
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
}
