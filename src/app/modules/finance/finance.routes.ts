import { Routes } from '@angular/router';

import { roleGuard } from '../../core/guards/role.guard';

const financeGuard = {
  canActivate: [roleGuard],
  data: { module: 'finance', action: 'read' },
};

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
];
