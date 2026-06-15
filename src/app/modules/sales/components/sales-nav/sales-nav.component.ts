import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sales-nav',
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
export class SalesNavComponent {
  readonly tabs = [
    { label: 'Dashboard', route: '/sales/dashboard' },
    { label: 'Customers', route: '/sales/customers' },
    { label: 'Quotations', route: '/sales/quotations' },
    { label: 'Sales Orders', route: '/sales/orders' },
    { label: 'Invoices', route: '/sales/invoices' },
    { label: 'Payments', route: '/sales/payments' },
    { label: 'Credit Notes', route: '/sales/credit-notes' },
  ];
}
