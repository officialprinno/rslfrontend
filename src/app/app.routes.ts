import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { homeRedirectGuard, moduleAccessGuard } from './core/guards/module-access.guard';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { AuthLayoutComponent } from './modules/auth/layouts/auth-layout/auth-layout.component';
import { LoginComponent } from './modules/auth/pages/login/login.component';
import { UnauthorizedComponent } from './modules/auth/pages/unauthorized/unauthorized.component';

const guarded = (
  module: string,
  action: 'read' | 'create' | 'update' | 'delete' | 'approve' | 'query' = 'read',
) => ({
  canActivate: [moduleAccessGuard],
  data: { module, action },
});

export const routes: Routes = [
  {
    path: 'login',
    component: AuthLayoutComponent,
    children: [{ path: '', component: LoginComponent }],
  },
  {
    path: 'unauthorized',
    component: UnauthorizedComponent,
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        canActivate: [homeRedirectGuard],
        loadChildren: () =>
          import('./modules/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
      },
      {
        path: 'dashboard',
        canActivate: [moduleAccessGuard],
        data: { module: 'dashboard' },
        loadChildren: () =>
          import('./modules/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
      },
      {
        path: 'inventory',
        ...guarded('inventory'),
        loadChildren: () =>
          import('./modules/inventory/inventory.routes').then((m) => m.INVENTORY_ROUTES),
      },
      {
        path: 'procurement',
        ...guarded('procurement'),
        loadChildren: () =>
          import('./modules/procurement/procurement.routes').then((m) => m.PROCUREMENT_ROUTES),
      },
      {
        path: 'sales',
        ...guarded('sales'),
        loadChildren: () => import('./modules/sales/sales.routes').then((m) => m.SALES_ROUTES),
      },
      {
        path: 'logistics',
        ...guarded('logistics'),
        loadChildren: () =>
          import('./modules/logistics/logistics.routes').then((m) => m.LOGISTICS_ROUTES),
      },
      {
        path: 'driver-portal',
        ...guarded('driver_portal'),
        loadChildren: () =>
          import('./modules/driver-portal/driver-portal.routes').then((m) => m.DRIVER_PORTAL_ROUTES),
      },
      {
        path: 'production',
        ...guarded('production'),
        loadChildren: () =>
          import('./modules/production/production.routes').then((m) => m.PRODUCTION_ROUTES),
      },
      {
        path: 'finance',
        ...guarded('finance'),
        loadChildren: () =>
          import('./modules/finance/finance.routes').then((m) => m.FINANCE_ROUTES),
      },
      {
        path: 'hr',
        ...guarded('hr'),
        loadChildren: () => import('./modules/hr/hr.routes').then((m) => m.HR_ROUTES),
      },
      {
        path: 'safety',
        ...guarded('safety'),
        loadChildren: () => import('./modules/safety/safety.routes').then((m) => m.SAFETY_ROUTES),
      },
      {
        path: 'messaging',
        ...guarded('messaging'),
        loadChildren: () =>
          import('./modules/messaging/messaging.routes').then((m) => m.MESSAGING_ROUTES),
      },
      {
        path: 'email',
        ...guarded('email'),
        loadChildren: () =>
          import('./modules/email-client/email.routes').then((m) => m.EMAIL_ROUTES),
      },
      {
        path: 'settings',
        ...guarded('settings'),
        loadChildren: () =>
          import('./modules/settings/settings.routes').then((m) => m.SETTINGS_ROUTES),
      },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./shared/pages/page-not-found/page-not-found.component').then(
        (m) => m.PageNotFoundComponent,
      ),
  },
];
