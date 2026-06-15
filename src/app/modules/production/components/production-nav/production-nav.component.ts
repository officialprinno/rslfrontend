import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import {
  isMachineOperator,
  showManagerProductionNav,
  showOperatorDashboard,
  showProductionReports,
} from '../../utils/production-permissions.util';

@Component({
  selector: 'app-production-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="flex flex-wrap gap-1 p-1 bg-gray-100 rounded-xl mb-6 overflow-x-auto">
      @for (tab of visibleTabs(); track tab.route) {
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
export class ProductionNavComponent {
  private readonly auth = inject(AuthService);

  private readonly allTabs = [
    { label: 'Dashboard', route: '/production/dashboard', key: 'manager' },
    { label: 'Operator', route: '/production/operator', key: 'operator' },
    { label: 'Products', route: '/production/products', key: 'manager' },
    { label: 'Bill of Materials', route: '/production/bom', key: 'manager' },
    { label: 'Work Orders', route: '/production/work-orders', key: 'all' },
    { label: 'Output', route: '/production/output', key: 'manager' },
    { label: 'Machines', route: '/production/machines', key: 'all' },
    { label: 'Machine Usage', route: '/production/machine-usage', key: 'manager' },
    { label: 'Reports', route: '/production/reports', key: 'reports' },
  ];

  readonly visibleTabs = computed(() =>
    this.allTabs.filter((tab) => {
      if (tab.key === 'operator') {
        return showOperatorDashboard(this.auth);
      }
      if (tab.key === 'reports') {
        return showProductionReports(this.auth);
      }
      if (tab.key === 'manager') {
        return showManagerProductionNav(this.auth);
      }
      return true;
    }),
  );
}
