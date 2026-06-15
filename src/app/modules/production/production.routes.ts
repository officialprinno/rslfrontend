import { Routes } from '@angular/router';

import { roleGuard } from '../../core/guards/role.guard';

const productionGuard = {
  canActivate: [roleGuard],
  data: { module: 'production', action: 'read' },
};

export const PRODUCTION_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    ...productionGuard,
    loadComponent: () =>
      import('./pages/dashboard/production-dashboard.component').then(
        (m) => m.ProductionDashboardComponent,
      ),
  },
  {
    path: 'operator',
    ...productionGuard,
    loadComponent: () =>
      import('./pages/operator-dashboard/operator-dashboard.component').then(
        (m) => m.OperatorDashboardComponent,
      ),
  },
  {
    path: 'products',
    ...productionGuard,
    loadComponent: () =>
      import('./pages/products/products.component').then((m) => m.ProductsComponent),
  },
  {
    path: 'bom',
    ...productionGuard,
    loadComponent: () =>
      import('./pages/bom/bom-list.component').then((m) => m.BomListComponent),
  },
  {
    path: 'bom/new',
    ...productionGuard,
    loadComponent: () =>
      import('./pages/bom/bom-form.component').then((m) => m.BomFormComponent),
  },
  {
    path: 'bom/:id/edit',
    ...productionGuard,
    loadComponent: () =>
      import('./pages/bom/bom-form.component').then((m) => m.BomFormComponent),
  },
  {
    path: 'work-orders',
    ...productionGuard,
    loadComponent: () =>
      import('./pages/work-orders/wo-list.component').then((m) => m.WoListComponent),
  },
  {
    path: 'work-orders/new',
    ...productionGuard,
    loadComponent: () =>
      import('./pages/work-orders/wo-form.component').then((m) => m.WoFormComponent),
  },
  {
    path: 'work-orders/:id/edit',
    ...productionGuard,
    loadComponent: () =>
      import('./pages/work-orders/wo-form.component').then((m) => m.WoFormComponent),
  },
  {
    path: 'work-orders/:id/view',
    ...productionGuard,
    loadComponent: () =>
      import('./pages/work-orders/wo-view.component').then((m) => m.WoViewComponent),
  },
  {
    path: 'output',
    ...productionGuard,
    loadComponent: () =>
      import('./pages/output/output-list.component').then((m) => m.OutputListComponent),
  },
  {
    path: 'machines',
    ...productionGuard,
    loadComponent: () =>
      import('./pages/machines/machines.component').then((m) => m.MachinesComponent),
  },
  {
    path: 'machines/:id',
    ...productionGuard,
    loadComponent: () =>
      import('./pages/machines/machine-detail.component').then((m) => m.MachineDetailComponent),
  },
  {
    path: 'machine-usage',
    ...productionGuard,
    loadComponent: () =>
      import('./pages/machine-usage/machine-usage-list.component').then(
        (m) => m.MachineUsageListComponent,
      ),
  },
  {
    path: 'reports',
    ...productionGuard,
    loadComponent: () =>
      import('./pages/reports/production-reports.component').then(
        (m) => m.ProductionReportsComponent,
      ),
  },
];
