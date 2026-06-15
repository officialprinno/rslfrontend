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
    { label: 'Chart of Accounts', route: '/finance/accounts' },
    { label: 'Journal Entries', route: '/finance/journal-entries' },
    { label: 'Receivables', route: '/finance/receivables' },
    { label: 'Payables', route: '/finance/payables' },
    { label: 'Payroll Approvals', route: '/finance/payroll-approvals' },
    { label: 'Bank Accounts', route: '/finance/bank-accounts' },
    { label: 'Reconciliation', route: '/finance/reconciliation' },
    { label: 'Budgets', route: '/finance/budgets' },
    { label: 'Tax', route: '/finance/tax' },
    { label: 'Reports', route: '/finance/reports' },
  ];
}
