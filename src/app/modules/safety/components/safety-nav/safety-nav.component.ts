import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-safety-nav',
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
export class SafetyNavComponent {
  readonly tabs = [
    { label: 'Dashboard', route: '/safety/dashboard' },
    { label: 'Incidents', route: '/safety/incidents' },
    { label: 'Inspections', route: '/safety/inspections' },
    { label: 'PPE Management', route: '/safety/ppe' },
    { label: 'Work Permits', route: '/safety/permits' },
    { label: 'Training', route: '/safety/training' },
    { label: 'Reports', route: '/safety/reports' },
    { label: '🔐 Security', route: '/safety/security/dashboard' },
  ];
}
