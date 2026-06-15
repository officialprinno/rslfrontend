import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-security-nav',
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
export class SecurityNavComponent {
  readonly tabs = [
    { label: 'Dashboard', route: '/safety/security/dashboard' },
    { label: 'Visitors', route: '/safety/security/visitors' },
    { label: 'Vehicles', route: '/safety/security/vehicles' },
    { label: 'Inter-Location', route: '/safety/security/inter-location' },
    { label: 'Personnel', route: '/safety/security/personnel' },
    { label: 'Shifts', route: '/safety/security/shifts' },
    { label: 'Access Control', route: '/safety/security/access' },
    { label: 'Incidents', route: '/safety/security/incidents' },
    { label: 'Reports', route: '/safety/security/reports' },
  ];
}
