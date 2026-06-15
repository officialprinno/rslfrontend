import { Routes } from '@angular/router';

import { roleGuard } from '../../core/guards/role.guard';

const procurementGuard = {
  canActivate: [roleGuard],
  data: { module: 'procurement', action: 'read' },
};

export const PROCUREMENT_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    ...procurementGuard,
    loadComponent: () =>
      import('./pages/dashboard/procurement-dashboard.component').then(
        (m) => m.ProcurementDashboardComponent,
      ),
  },
  {
    path: 'suppliers',
    ...procurementGuard,
    loadComponent: () =>
      import('./pages/suppliers/suppliers.component').then((m) => m.SuppliersComponent),
  },
  {
    path: 'requisitions',
    ...procurementGuard,
    loadComponent: () =>
      import('./pages/requisitions/requisitions-list.component').then(
        (m) => m.RequisitionsListComponent,
      ),
  },
  {
    path: 'requisitions/new',
    ...procurementGuard,
    loadComponent: () =>
      import('./pages/requisitions/requisition-form.component').then(
        (m) => m.RequisitionFormComponent,
      ),
  },
  {
    path: 'requisitions/:id/edit',
    ...procurementGuard,
    loadComponent: () =>
      import('./pages/requisitions/requisition-form.component').then(
        (m) => m.RequisitionFormComponent,
      ),
  },
  {
    path: 'rfq',
    ...procurementGuard,
    loadComponent: () =>
      import('./pages/rfq/rfq-list.component').then((m) => m.RfqListComponent),
  },
  {
    path: 'rfq/:id',
    ...procurementGuard,
    loadComponent: () =>
      import('./pages/rfq/rfq-detail.component').then((m) => m.RfqDetailComponent),
  },
  {
    path: 'quotations',
    ...procurementGuard,
    loadComponent: () =>
      import('./pages/quotations/quotations-list.component').then(
        (m) => m.QuotationsListComponent,
      ),
  },
  {
    path: 'purchase-orders',
    ...procurementGuard,
    loadComponent: () =>
      import('./pages/purchase-orders/po-list.component').then((m) => m.PoListComponent),
  },
  {
    path: 'purchase-orders/new',
    ...procurementGuard,
    loadComponent: () =>
      import('./pages/purchase-orders/po-form.component').then((m) => m.PoFormComponent),
  },
  {
    path: 'purchase-orders/:id/edit',
    ...procurementGuard,
    loadComponent: () =>
      import('./pages/purchase-orders/po-form.component').then((m) => m.PoFormComponent),
  },
  {
    path: 'purchase-orders/:id/view',
    ...procurementGuard,
    loadComponent: () =>
      import('./pages/purchase-orders/po-view.component').then((m) => m.PoViewComponent),
  },
  {
    path: 'grn',
    ...procurementGuard,
    loadComponent: () =>
      import('./pages/grn/grn-list.component').then((m) => m.GrnListComponent),
  },
  {
    path: 'grn/new',
    ...procurementGuard,
    loadComponent: () =>
      import('./pages/grn/grn-form.component').then((m) => m.GrnFormComponent),
  },
  {
    path: 'grn/:id/view',
    ...procurementGuard,
    loadComponent: () =>
      import('./pages/grn/grn-view.component').then((m) => m.GrnViewComponent),
  },
  {
    path: 'grn/:id/edit',
    ...procurementGuard,
    loadComponent: () =>
      import('./pages/grn/grn-form.component').then((m) => m.GrnFormComponent),
  },
  {
    path: 'grn/:id',
    redirectTo: 'grn/:id/view',
    pathMatch: 'full',
  },
  {
    path: 'supplier-invoices',
    ...procurementGuard,
    loadComponent: () =>
      import('./pages/supplier-invoices/supplier-invoices-list.component').then(
        (m) => m.SupplierInvoicesListComponent,
      ),
  },
];
