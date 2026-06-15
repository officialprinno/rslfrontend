import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { Permission, Role } from '../../../../core/models/auth.models';
import { NotificationService } from '../../../../core/services/notification.service';
import { PERMISSION_ACTIONS, PERMISSION_MODULES, UsersService } from '../../../../core/services/users.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { SettingsAdminNavComponent } from '../../components/settings-admin-nav/settings-admin-nav.component';

@Component({
  selector: 'app-permissions-list',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    SettingsAdminNavComponent,
    PaginationComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    ModalComponent,
  ],
  templateUrl: './permissions-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionsListComponent implements OnInit {
  private readonly users = inject(UsersService);
  private readonly notification = inject(NotificationService);

  readonly rows = signal<Permission[]>([]);
  readonly roles = signal<Role[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly roleFilter = signal<number | ''>('');
  readonly moduleFilter = signal('');
  readonly showAdd = signal(false);

  readonly modules = PERMISSION_MODULES;
  readonly actions = PERMISSION_ACTIONS;

  readonly newPermission = signal({ role: '' as number | '', module: 'inventory', action: 'read' });

  ngOnInit(): void {
    this.users.getRoles().subscribe((roles) => this.roles.set(roles));
    this.load();
  }

  onFilterChange(): void {
    this.page.set(1);
    this.load();
  }

  onPageChange(p: number): void {
    this.page.set(p);
    this.load();
  }

  roleName(roleId?: number): string {
    if (!roleId) return '—';
    return this.roles().find((r) => r.id === roleId)?.name ?? `#${roleId}`;
  }

  openAdd(): void {
    this.newPermission.set({
      role: this.roleFilter() || '',
      module: 'inventory',
      action: 'read',
    });
    this.showAdd.set(true);
  }

  submitAdd(): void {
    const p = this.newPermission();
    if (!p.role) {
      this.notification.error('Select a role.');
      return;
    }
    this.saving.set(true);
    this.users
      .createPermission({ role: Number(p.role), module: p.module, action: p.action })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Permission added');
          this.showAdd.set(false);
          this.load();
        },
        error: (err) => this.notification.error(getApiErrorMessage(err, 'Failed to add permission')),
      });
  }

  remove(permission: Permission): void {
    if (!permission.id) return;
    this.users.deactivatePermission(permission.id).subscribe({
      next: () => {
        this.notification.success('Permission removed');
        this.load();
      },
      error: (err) => this.notification.error(getApiErrorMessage(err, 'Failed to remove permission')),
    });
  }

  private load(): void {
    this.loading.set(true);
    const params: Record<string, string | number | boolean> = {
      page: this.page(),
      is_active: true,
    };
    if (this.roleFilter()) params['role'] = Number(this.roleFilter());
    if (this.moduleFilter()) params['module'] = this.moduleFilter();

    this.users
      .listPermissions(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => {
          this.rows.set(data.results);
          this.total.set(data.count);
        },
        error: (err) => this.notification.error(getApiErrorMessage(err, 'Failed to load permissions')),
      });
  }
}
