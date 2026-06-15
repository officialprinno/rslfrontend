import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';

import { Permission, Role } from '../../../../core/models/auth.models';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  UsersService,
} from '../../../../core/services/users.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { SettingsAdminNavComponent } from '../../components/settings-admin-nav/settings-admin-nav.component';

@Component({
  selector: 'app-role-detail',
  imports: [FormsModule, RouterLink, PageHeaderComponent, SettingsAdminNavComponent],
  templateUrl: './role-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly users = inject(UsersService);
  private readonly notification = inject(NotificationService);

  readonly roleId = Number(this.route.snapshot.paramMap.get('id'));
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly role = signal<Role | null>(null);
  readonly matrix = signal<Record<string, Record<string, boolean>>>({});
  readonly existingByKey = signal<Record<string, Permission>>({});

  readonly permissionModules = PERMISSION_MODULES;
  readonly permissionActions = PERMISSION_ACTIONS;

  readonly permissionCount = computed(() => {
    let count = 0;
    const m = this.matrix();
    for (const mod of PERMISSION_MODULES) {
      for (const action of PERMISSION_ACTIONS) {
        if (m[mod]?.[action]) count++;
      }
    }
    return count;
  });

  ngOnInit(): void {
    this.load();
  }

  toggle(module: string, action: string): void {
    this.matrix.update((m) => ({
      ...m,
      [module]: { ...m[module], [action]: !m[module]?.[action] },
    }));
  }

  savePermissions(): void {
    const role = this.role();
    if (!role) return;

    this.saving.set(true);
    const desired: { module: string; action: string }[] = [];
    const m = this.matrix();
    for (const mod of PERMISSION_MODULES) {
      for (const action of PERMISSION_ACTIONS) {
        if (m[mod]?.[action]) {
          desired.push({ module: mod, action });
        }
      }
    }

    const existing = this.existingByKey();
    const desiredKeys = new Set(desired.map((p) => `${p.module}:${p.action}`));
    const toAdd = desired.filter((p) => !existing[`${p.module}:${p.action}`]);
    const toRemove = Object.values(existing).filter(
      (p) => p.id && !desiredKeys.has(`${p.module}:${p.action}`),
    );

    const creates$ = toAdd.length
      ? forkJoin(
          toAdd.map((p) =>
            this.users.createPermission({ role: role.id, module: p.module, action: p.action }),
          ),
        )
      : of([]);

    creates$
      .pipe(
        switchMap(() =>
          toRemove.length
            ? forkJoin(toRemove.map((p) => this.users.deactivatePermission(p.id!)))
            : of([]),
        ),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.notification.success('Role permissions updated');
          this.load();
        },
        error: (err) =>
          this.notification.error(getApiErrorMessage(err, 'Failed to update permissions')),
      });
  }

  private load(): void {
    this.loading.set(true);
    this.users
      .getRole(this.roleId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (role) => {
          this.role.set(role);
          const active = (role.permissions ?? []).filter((p) => p.is_active !== false);
          const byKey: Record<string, Permission> = {};
          const m = this.users.buildPermissionMatrix(active);
          for (const p of active) {
            if (p.id) {
              byKey[`${p.module}:${p.action}`] = p;
            }
          }
          this.existingByKey.set(byKey);
          this.matrix.set(m);
        },
        error: (err) => this.notification.error(getApiErrorMessage(err, 'Failed to load role')),
      });
  }
}
