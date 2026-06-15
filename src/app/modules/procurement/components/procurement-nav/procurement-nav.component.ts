import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-procurement-nav',
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
export class ProcurementNavComponent {
  readonly tabs = [
    { label: 'Dashboard', route: '/procurement/dashboard' },
    { label: 'Suppliers', route: '/procurement/suppliers' },
    { label: 'Requisitions', route: '/procurement/requisitions' },
    { label: 'RFQ', route: '/procurement/rfq' },
    { label: 'Quotations', route: '/procurement/quotations' },
    { label: 'Purchase Orders', route: '/procurement/purchase-orders' },
    { label: 'GRN', route: '/procurement/grn' },
    { label: 'Invoices', route: '/procurement/supplier-invoices' },
  ];
}
