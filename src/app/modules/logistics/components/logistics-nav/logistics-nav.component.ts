import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-logistics-nav',
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
export class LogisticsNavComponent {
  readonly tabs = [
    { label: 'Dashboard', route: '/logistics/dashboard' },
    { label: 'Vehicles', route: '/logistics/vehicles' },
    { label: 'Drivers', route: '/logistics/drivers' },
    { label: 'Deliveries', route: '/logistics/deliveries' },
    { label: 'Sales Queue', route: '/logistics/sales-queue' },
    { label: 'Delivery Notes', route: '/logistics/delivery-notes' },
    { label: 'Maintenance', route: '/logistics/maintenance' },
    { label: 'Fuel Records', route: '/logistics/fuel' },
  ];
}
