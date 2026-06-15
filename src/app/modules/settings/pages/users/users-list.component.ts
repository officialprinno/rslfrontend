import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { User } from '../../../../core/models/auth.models';
import { NotificationService } from '../../../../core/services/notification.service';
import { UsersService } from '../../../../core/services/users.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { SettingsAdminNavComponent } from '../../components/settings-admin-nav/settings-admin-nav.component';

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
