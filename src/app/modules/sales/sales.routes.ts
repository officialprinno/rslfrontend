import { Routes } from '@angular/router';

import { roleGuard } from '../../core/guards/role.guard';

const salesGuard = {
  canActivate: [roleGuard],
  data: { module: 'sales', action: 'read' },
};

export const SALES_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    ...salesGuard,
    loadComponent: () =>
      import('./pages/dashboard/sales-dashboard.component').then((m) => m.SalesDashboardComponent),
  },
  {
    path: 'customers',
    ...salesGuard,
    loadComponent: () =>
      import('./pages/customers/customers.component').then((m) => m.CustomersComponent),
  },
  {
    path: 'customers/:id',
    ...salesGuard,
    loadComponent: () =>
      import('./pages/customers/customer-detail.component').then((m) => m.CustomerDetailComponent),
  },
  {
    path: 'quotations',
    ...salesGuard,
    loadComponent: () =>
      import('./pages/quotations/quotations-list.component').then((m) => m.QuotationsListComponent),
  },
  {
    path: 'quotations/new',
    ...salesGuard,
    loadComponent: () =>
      import('./pages/quotations/quotation-form.component').then((m) => m.QuotationFormComponent),
  },
  {
    path: 'quotations/:id/edit',
    ...salesGuard,
    loadComponent: () =>
      import('./pages/quotations/quotation-form.component').then((m) => m.QuotationFormComponent),
  },
  {
    path: 'quotations/:id/view',
    ...salesGuard,
    loadComponent: () =>
      import('./pages/quotations/quotation-view.component').then((m) => m.QuotationViewComponent),
  },
  {
    path: 'orders',
    ...salesGuard,
    loadComponent: () =>
      import('./pages/orders/so-list.component').then((m) => m.SoListComponent),
  },
  {
    path: 'orders/new',
    ...salesGuard,
    loadComponent: () =>
      import('./pages/orders/so-form.component').then((m) => m.SoFormComponent),
  },
  {
    path: 'orders/:id/edit',
    ...salesGuard,
    loadComponent: () =>
      import('./pages/orders/so-form.component').then((m) => m.SoFormComponent),
  },
  {
    path: 'orders/:id/view',
    ...salesGuard,
    loadComponent: () =>
      import('./pages/orders/so-view.component').then((m) => m.SoViewComponent),
  },
  {
    path: 'invoices',
    ...salesGuard,
    loadComponent: () =>
      import('./pages/invoices/invoices-list.component').then((m) => m.InvoicesListComponent),
  },
  {
    path: 'invoices/new',
    ...salesGuard,
    loadComponent: () =>
      import('./pages/invoices/invoice-form.component').then((m) => m.InvoiceFormComponent),
  },
  {
    path: 'invoices/:id/edit',
    ...salesGuard,
    loadComponent: () =>
      import('./pages/invoices/invoice-form.component').then((m) => m.InvoiceFormComponent),
  },
  {
    path: 'invoices/:id/view',
    ...salesGuard,
    loadComponent: () =>
      import('./pages/invoices/invoice-view.component').then((m) => m.InvoiceViewComponent),
  },
  {
    path: 'payments',
    ...salesGuard,
    loadComponent: () =>
      import('./pages/payments/payments-list.component').then((m) => m.PaymentsListComponent),
  },
  {
    path: 'credit-notes',
    ...salesGuard,
    loadComponent: () =>
      import('./pages/credit-notes/credit-notes-list.component').then(
        (m) => m.CreditNotesListComponent,
      ),
  },
];
