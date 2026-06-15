import { Routes } from '@angular/router';

import { roleGuard } from '../../core/guards/role.guard';

export const EMAIL_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard],
    data: { module: 'email', action: 'read', title: 'Email' },
    loadComponent: () =>
      import('./pages/email-layout.component').then((m) => m.EmailLayoutComponent),
  },
  {
    path: 'settings/account',
    canActivate: [roleGuard],
    data: { module: 'email', action: 'update', title: 'Email Account' },
    loadComponent: () =>
      import('./pages/email-account-settings.component').then((m) => m.EmailAccountSettingsComponent),
  },
  {
    path: 'settings/labels',
    canActivate: [roleGuard],
    data: { module: 'email', action: 'update', title: 'Email Labels' },
    loadComponent: () =>
      import('./pages/email-labels-settings.component').then((m) => m.EmailLabelsSettingsComponent),
  },
];
