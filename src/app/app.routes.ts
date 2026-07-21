import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { companyGuard } from './core/guards/company.guard';
import { homeRedirectGuard, moduleAccessGuard } from './core/guards/module-access.guard';
import { superAdminGuard } from './core/guards/super-admin.guard';
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
    path: 'quotations/respond/:token',
    loadComponent: () =>
      import('./modules/sales/pages/quotations/quotation-respond.component').then(
        (m) => m.QuotationRespondComponent,
      ),
  },
  {
    path: 'quotations/verify/:token',
    loadComponent: () =>
      import('./modules/sales/pages/quotations/quotation-verify.component').then(
        (m) => m.QuotationVerifyComponent,
      ),
  },
  {
    path: 'invoices/pay/:token',
    loadComponent: () =>
      import('./modules/sales/pages/invoices/invoice-pay.component').then(
        (m) => m.InvoicePayComponent,
      ),
  },
  {
    path: 'invoices/view/:token',
    loadComponent: () =>
      import('./modules/sales/pages/invoices/invoice-pay.component').then(
        (m) => m.InvoicePayComponent,
      ),
  },
  {
    path: 'supplier/track/:token',
    loadComponent: () =>
      import('./modules/procurement/pages/supplier-track/supplier-track.component').then(
        (m) => m.SupplierTrackComponent,
      ),
  },
  {
    path: 'sales/quotations/respond/:token',
    redirectTo: 'quotations/respond/:token',
    pathMatch: 'full',
  },
  {
    path: 'sales/quotations/verify/:token',
    redirectTo: 'quotations/verify/:token',
    pathMatch: 'full',
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard, companyGuard],
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
        path: 'my-leave',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./modules/hr/pages/my-leave/my-leave.component').then(
            (m) => m.MyLeaveComponent,
          ),
      },
      {
        path: 'my-payment-requests',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./modules/finance/pages/staff-payment-requests/staff-payment-list.component').then(
            (m) => m.StaffPaymentListComponent,
          ),
        data: { queue: 'my', employeePortal: true },
      },
      {
        path: 'my-payment-requests/:id',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./modules/finance/pages/staff-payment-requests/staff-payment-detail.component').then(
            (m) => m.StaffPaymentDetailComponent,
          ),
        data: { employeePortal: true },
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
      {
        path: 'admin/users/create',
        canActivate: [authGuard, superAdminGuard],
        loadComponent: () =>
          import('./modules/settings/pages/users/user-create.component').then(
            (m) => m.UserCreateComponent,
          ),
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
