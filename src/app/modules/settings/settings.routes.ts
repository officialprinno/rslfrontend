import { Routes } from '@angular/router';

import { superAdminGuard } from '../../core/guards/super-admin.guard';
import { roleGuard } from '../../core/guards/role.guard';

const settingsGuard = {
  canActivate: [roleGuard],
  data: { module: 'settings', action: 'read' },
};

const superAdminRoute = {
  canActivate: [superAdminGuard],
};

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    ...settingsGuard,
    loadComponent: () =>
      import('./pages/settings-home/settings-home.component').then((m) => m.SettingsHomeComponent),
  },
  {
    path: 'preferences',
    ...settingsGuard,
    loadComponent: () =>
      import('./pages/preferences/user-preferences.component').then((m) => m.UserPreferencesComponent),
  },
  {
    path: 'admin',
    ...superAdminRoute,
    loadComponent: () =>
      import('./pages/admin/admin-home.component').then((m) => m.AdminHomeComponent),
  },
  {
    path: 'users',
    ...superAdminRoute,
    loadComponent: () =>
      import('./pages/users/users-list.component').then((m) => m.UsersListComponent),
  },
  {
    path: 'users/new',
    ...superAdminRoute,
    loadComponent: () =>
      import('./pages/users/user-create.component').then((m) => m.UserCreateComponent),
  },
  {
    path: 'users/:id/edit',
    ...superAdminRoute,
    loadComponent: () =>
      import('./pages/users/user-form.component').then((m) => m.UserFormComponent),
  },
  {
    path: 'roles',
    ...superAdminRoute,
    loadComponent: () =>
      import('./pages/roles/roles-list.component').then((m) => m.RolesListComponent),
  },
  {
    path: 'roles/:id',
    ...superAdminRoute,
    loadComponent: () =>
      import('./pages/roles/role-detail.component').then((m) => m.RoleDetailComponent),
  },
  {
    path: 'permissions',
    ...superAdminRoute,
    loadComponent: () =>
      import('./pages/permissions/permissions-list.component').then((m) => m.PermissionsListComponent),
  },
];
