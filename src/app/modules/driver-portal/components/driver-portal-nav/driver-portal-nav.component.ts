import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-driver-portal-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="flex flex-wrap gap-1 p-1 bg-gray-100 rounded-xl mb-4 overflow-x-auto">
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
export class DriverPortalNavComponent {
  readonly tabs = [
    { label: 'Dashboard', route: '/driver-portal/dashboard' },
    { label: 'My Trips', route: '/driver-portal/trips' },
    { label: 'History', route: '/driver-portal/history' },
    { label: 'Vehicle', route: '/driver-portal/vehicle' },
    { label: 'Profile', route: '/driver-portal/profile' },
  ];
}
