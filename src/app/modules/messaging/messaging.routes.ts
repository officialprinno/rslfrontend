import { Routes } from '@angular/router';

import { roleGuard } from '../../core/guards/role.guard';

export const MESSAGING_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard],
    data: { module: 'messaging', action: 'read', title: 'Messages' },
    loadComponent: () =>
      import('./pages/messaging-layout.component').then((m) => m.MessagingLayoutComponent),
  },
  {
    path: 'broadcast',
    canActivate: [roleGuard],
    data: { module: 'messaging', action: 'create', title: 'Broadcast' },
    loadComponent: () =>
      import('./pages/broadcast.component').then((m) => m.BroadcastComponent),
  },
];
