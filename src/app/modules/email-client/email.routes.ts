import { Routes } from '@angular/router';

import { roleGuard } from '../../core/guards/role.guard';
import { superAdminGuard } from '../../core/guards/super-admin.guard';

export const EMAIL_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard],
    data: { module: 'email', action: 'read', title: 'Email' },
    loadComponent: () =>
      import('./pages/email-layout.component').then((m) => m.EmailLayoutComponent),
  },
  {
    path: 'admin/mailboxes',
    canActivate: [superAdminGuard],
    data: { title: 'Email Mailboxes' },
    loadComponent: () =>
      import('./pages/email-mailboxes-admin.component').then(
        (m) => m.EmailMailboxesAdminComponent,
      ),
  },
  {
    path: 'settings/labels',
    canActivate: [roleGuard],
    data: { module: 'email', action: 'update', title: 'Email Labels' },
    loadComponent: () =>
      import('./pages/email-labels-settings.component').then((m) => m.EmailLabelsSettingsComponent),
  },
];
