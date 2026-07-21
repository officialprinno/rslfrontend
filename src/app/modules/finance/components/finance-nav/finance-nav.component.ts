import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-finance-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="flex flex-wrap gap-1 p-1 bg-gray-100 rounded-xl mb-6 overflow-x-auto">
      @for (tab of tabs; track tab.route) {
        <a
          [routerLink]="tab.route"
          routerLinkActive="!bg-white !text-[#1B3A6B] !shadow-sm"
          class="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 whitespace-nowrap transition-all hover:text-gray-900"
        >
          {{ tab.label }}
        </a>
      }
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceNavComponent {
  readonly tabs = [
    { label: 'Dashboard', route: '/finance/dashboard' },
    { label: 'Exchange Rates', route: '/finance/exchange-rates' },
    { label: 'Inventory Workflows', route: '/finance/inventory-workflows' },
    { label: 'Inventory Valuation', route: '/finance/inventory-valuations' },
    { label: 'Chart of Accounts', route: '/finance/accounts' },
    { label: 'Journal Entries', route: '/finance/journal-entries' },
    { label: 'Bills', route: '/finance/bills' },
    { label: 'Recurring Bills', route: '/finance/recurring-bills' },
    { label: 'Receivables', route: '/finance/receivables' },
    { label: 'Sales Orders', route: '/finance/sales-orders' },
    { label: 'Payables', route: '/finance/payables' },
    { label: 'Payment Requests', route: '/finance/payment-requests' },
    { label: 'Staff Payments', route: '/finance/staff-payment-requests' },
    { label: 'Invoice Approvals', route: '/finance/approval-queue' },
    { label: 'Purchase Orders', route: '/finance/purchase-orders' },
    { label: 'Payroll Approvals', route: '/finance/payroll-approvals' },
    { label: 'Bank Accounts', route: '/finance/bank-accounts' },
    { label: 'Reconciliation', route: '/finance/reconciliation' },
    { label: 'Budgets', route: '/finance/budgets' },
    { label: 'Tax', route: '/finance/tax' },
    { label: 'Reports', route: '/finance/reports' },
  ];
}
