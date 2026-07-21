import { Routes } from '@angular/router';

import { exchangeRateGuard } from '../../core/guards/exchange-rate.guard';
import { roleGuard } from '../../core/guards/role.guard';

const financeGuard = {
  canActivate: [roleGuard, exchangeRateGuard],
  data: { module: 'finance', action: 'read' },
};

const financeWriteGuard = (action: 'create' | 'update') => ({
  canActivate: [roleGuard, exchangeRateGuard],
  data: { module: 'finance', action },
});

export const FINANCE_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    ...financeGuard,
    loadComponent: () =>
      import('./pages/dashboard/finance-dashboard.component').then(
        (m) => m.FinanceDashboardComponent,
      ),
  },
  {
    path: 'exchange-rates',
    canActivate: [roleGuard],
    data: { module: 'finance', action: 'update' },
    loadComponent: () =>
      import('./pages/exchange-rates/exchange-rates.component').then(
        (m) => m.ExchangeRatesComponent,
      ),
  },
  {
    path: 'inventory-workflows',
    ...financeGuard,
    loadComponent: () =>
      import('./pages/inventory-workflows/inventory-workflows.component').then(
        (m) => m.InventoryWorkflowsComponent,
      ),
  },
  {
    path: 'inventory-workflows/:id',
    ...financeGuard,
    loadComponent: () =>
      import('./pages/inventory-workflows/inventory-workflow-detail.component').then(
        (m) => m.InventoryWorkflowDetailComponent,
      ),
  },
  {
    path: 'inventory-valuations',
    ...financeGuard,
    loadComponent: () =>
      import('./pages/inventory-workflows/inventory-finance-valuations.component').then(
        (m) => m.InventoryFinanceValuationsComponent,
      ),
  },
  {
    path: 'accounts',
    ...financeGuard,
    loadComponent: () =>
      import('./pages/accounts/accounts.component').then((m) => m.AccountsComponent),
  },
  {
    path: 'journal-entries',
    ...financeGuard,
    loadComponent: () =>
      import('./pages/journal-entries/journal-entries-list.component').then(
        (m) => m.JournalEntriesListComponent,
      ),
  },
  {
    path: 'journal-entries/new',
    ...financeGuard,
    loadComponent: () =>
      import('./pages/journal-entries/journal-entry-form.component').then(
        (m) => m.JournalEntryFormComponent,
      ),
  },
  {
    path: 'journal-entries/:id/edit',
    ...financeGuard,
    loadComponent: () =>
      import('./pages/journal-entries/journal-entry-form.component').then(
        (m) => m.JournalEntryFormComponent,
      ),
  },
  {
    path: 'receivables',
    ...financeGuard,
    loadComponent: () =>
      import('./pages/receivables/receivables.component').then((m) => m.ReceivablesComponent),
  },
  {
    path: 'payables',
    ...financeGuard,
    loadComponent: () =>
      import('./pages/payables/payables.component').then((m) => m.PayablesComponent),
  },
  {
    path: 'purchase-orders',
    ...financeGuard,
    loadComponent: () =>
      import('./pages/purchase-orders/finance-purchase-orders.component').then(
        (m) => m.FinancePurchaseOrdersComponent,
      ),
  },
  {
    path: 'purchase-orders/:id',
    canActivate: [roleGuard, exchangeRateGuard],
    data: { module: 'finance', action: 'read', financeContext: true },
    loadComponent: () =>
      import('../procurement/pages/purchase-orders/po-view.component').then(
        (m) => m.PoViewComponent,
      ),
  },
  {
    path: 'payment-requests',
    ...financeGuard,
    loadComponent: () =>
      import('./pages/payment-requests/finance-payment-requests.component').then(
        (m) => m.FinancePaymentRequestsComponent,
      ),
  },
  {
    path: 'payment-requests/:id',
    ...financeGuard,
    loadComponent: () =>
      import('./pages/payment-requests/finance-payment-request-detail.component').then(
        (m) => m.FinancePaymentRequestDetailComponent,
      ),
  },
  {
    path: 'approval-queue',
    ...financeGuard,
    loadComponent: () =>
      import('./pages/approval-queue/finance-approval-queue.component').then(
        (m) => m.FinanceApprovalQueueComponent,
      ),
  },
  {
    path: 'bills',
    ...financeGuard,
    loadComponent: () =>
      import('./pages/bills/bills-hub.component').then((m) => m.BillsHubComponent),
  },
  {
    path: 'bills/new',
    ...financeWriteGuard('create'),
    loadComponent: () =>
      import('./pages/bills/bill-form.component').then((m) => m.BillFormComponent),
  },
  {
    path: 'bills/:id/edit',
    ...financeWriteGuard('update'),
    loadComponent: () =>
      import('./pages/bills/bill-form.component').then((m) => m.BillFormComponent),
  },
  {
    path: 'bills/:id/view',
    ...financeGuard,
    loadComponent: () =>
      import('./pages/bills/bill-view.component').then((m) => m.BillViewComponent),
  },
  {
    path: 'recurring-bills',
    ...financeGuard,
    loadComponent: () =>
      import('./pages/recurring-bills/recurring-bills-hub.component').then(
        (m) => m.RecurringBillsHubComponent,
      ),
  },
  {
    path: 'recurring-bills/new',
    ...financeWriteGuard('create'),
    loadComponent: () =>
      import('./pages/recurring-bills/recurring-bill-form.component').then(
        (m) => m.RecurringBillFormComponent,
      ),
  },
  {
    path: 'recurring-bills/:id/edit',
    ...financeWriteGuard('update'),
    loadComponent: () =>
      import('./pages/recurring-bills/recurring-bill-form.component').then(
        (m) => m.RecurringBillFormComponent,
      ),
  },
  {
    path: 'recurring-bills/:id/view',
    ...financeGuard,
    loadComponent: () =>
      import('./pages/recurring-bills/recurring-bill-view.component').then(
        (m) => m.RecurringBillViewComponent,
      ),
  },
  {
    path: 'sales-orders',
    ...financeGuard,
    loadComponent: () =>
      import('./pages/sales-orders/finance-sales-orders.component').then(
        (m) => m.FinanceSalesOrdersComponent,
      ),
  },
  {
    path: 'sales-orders/:id/view',
    ...financeGuard,
    loadComponent: () =>
      import('./pages/sales-orders/finance-sales-order-detail.component').then(
        (m) => m.FinanceSalesOrderDetailComponent,
      ),
  },
  {
    path: 'sales-invoices/:id/view',
    canActivate: [roleGuard, exchangeRateGuard],
    data: { module: 'finance', action: 'read', financeContext: true },
    loadComponent: () =>
      import('../sales/pages/invoices/invoice-view.component').then(
        (m) => m.InvoiceViewComponent,
      ),
  },
  {
    path: 'bank-accounts',
    ...financeGuard,
    loadComponent: () =>
      import('./pages/bank-accounts/bank-accounts.component').then((m) => m.BankAccountsComponent),
  },
  {
    path: 'reconciliation',
    ...financeGuard,
    loadComponent: () =>
      import('./pages/reconciliation/reconciliation-list.component').then(
        (m) => m.ReconciliationListComponent,
      ),
  },
  {
    path: 'reconciliation/:id',
    ...financeGuard,
    loadComponent: () =>
      import('./pages/reconciliation/reconciliation-detail.component').then(
        (m) => m.ReconciliationDetailComponent,
      ),
  },
  {
    path: 'budgets',
    ...financeGuard,
    loadComponent: () =>
      import('./pages/budgets/budgets.component').then((m) => m.BudgetsComponent),
  },
  {
    path: 'tax',
    ...financeGuard,
    loadComponent: () =>
      import('./pages/tax/tax.component').then((m) => m.TaxComponent),
  },
  {
    path: 'reports',
    ...financeGuard,
    loadComponent: () =>
      import('./pages/reports/reports.component').then((m) => m.ReportsComponent),
  },
  {
    path: 'payroll-approvals',
    ...financeGuard,
    loadComponent: () =>
      import('./pages/payroll-approvals/payroll-approvals.component').then(
        (m) => m.FinancePayrollApprovalsComponent,
      ),
  },
  {
    path: 'payroll-approvals/:id',
    ...financeGuard,
    loadComponent: () =>
      import('./pages/payroll-approvals/payroll-approval-detail.component').then(
        (m) => m.FinancePayrollApprovalDetailComponent,
      ),
  },
  {
    path: 'staff-payment-requests',
    ...financeGuard,
    loadComponent: () =>
      import('./pages/staff-payment-requests/staff-payment-list.component').then(
        (m) => m.StaffPaymentListComponent,
      ),
  },
  {
    path: 'staff-payment-requests/hod',
    canActivate: [roleGuard, exchangeRateGuard],
    data: { module: 'finance', action: 'read', queue: 'hod' },
    loadComponent: () =>
      import('./pages/staff-payment-requests/staff-payment-list.component').then(
        (m) => m.StaffPaymentListComponent,
      ),
  },
  {
    path: 'staff-payment-requests/gm',
    canActivate: [roleGuard, exchangeRateGuard],
    data: { module: 'finance', action: 'read', queue: 'gm' },
    loadComponent: () =>
      import('./pages/staff-payment-requests/staff-payment-list.component').then(
        (m) => m.StaffPaymentListComponent,
      ),
  },
  {
    path: 'staff-payment-requests/finance',
    canActivate: [roleGuard, exchangeRateGuard],
    data: { module: 'finance', action: 'read', queue: 'finance' },
    loadComponent: () =>
      import('./pages/staff-payment-requests/staff-payment-list.component').then(
        (m) => m.StaffPaymentListComponent,
      ),
  },
  {
    path: 'staff-payment-requests/payment',
    canActivate: [roleGuard, exchangeRateGuard],
    data: { module: 'finance', action: 'read', queue: 'payment' },
    loadComponent: () =>
      import('./pages/staff-payment-requests/staff-payment-list.component').then(
        (m) => m.StaffPaymentListComponent,
      ),
  },
  {
    path: 'staff-payment-requests/liquidation',
    canActivate: [roleGuard, exchangeRateGuard],
    data: { module: 'finance', action: 'read', queue: 'liquidation' },
    loadComponent: () =>
      import('./pages/staff-payment-requests/staff-payment-list.component').then(
        (m) => m.StaffPaymentListComponent,
      ),
  },
  {
    path: 'staff-payment-requests/history',
    canActivate: [roleGuard, exchangeRateGuard],
    data: { module: 'finance', action: 'read', queue: 'history' },
    loadComponent: () =>
      import('./pages/staff-payment-requests/staff-payment-list.component').then(
        (m) => m.StaffPaymentListComponent,
      ),
  },
  {
    path: 'staff-payment-requests/all',
    canActivate: [roleGuard, exchangeRateGuard],
    data: { module: 'finance', action: 'read', queue: 'all' },
    loadComponent: () =>
      import('./pages/staff-payment-requests/staff-payment-list.component').then(
        (m) => m.StaffPaymentListComponent,
      ),
  },
  {
    path: 'staff-payment-requests/categories',
    ...financeGuard,
    loadComponent: () =>
      import('./pages/staff-payment-requests/staff-payment-categories.component').then(
        (m) => m.StaffPaymentCategoriesComponent,
      ),
  },
  {
    path: 'staff-payment-requests/:id',
    ...financeGuard,
    loadComponent: () =>
      import('./pages/staff-payment-requests/staff-payment-detail.component').then(
        (m) => m.StaffPaymentDetailComponent,
      ),
  },
];
