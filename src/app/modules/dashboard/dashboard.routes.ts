import { Routes } from '@angular/router';

import { moduleAccessGuard } from '../../core/guards/module-access.guard';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    canActivate: [moduleAccessGuard],
    data: { module: 'dashboard' },
    loadComponent: () =>
      import('./pages/dashboard-home/dashboard-home.component').then(
        (m) => m.DashboardHomeComponent,
      ),
  },
];
