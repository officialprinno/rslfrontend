import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import {
  isStoreOperationsRole,
  showInventoryTab,
  canApproveDeptRequest,
  canIssueInternalStock,
  canReceiveProductionReceipt,
  canViewValuation,
} from '../../utils/inventory-permissions.util';

interface NavTab {
  label: string;
  route: string;
  key?: string;
}

@Component({
  selector: 'app-inventory-nav',
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
export class InventoryNavComponent {
  private readonly auth = inject(AuthService);

  private readonly allTabs: NavTab[] = [
    { label: 'Dashboard', route: '/inventory/dashboard' },
    { label: 'Items', route: '/inventory/items' },
    { label: 'Categories', route: '/inventory/categories', key: 'categories' },
    { label: 'Warehouses', route: '/inventory/warehouses' },
    { label: 'Stock', route: '/inventory/stock' },
    { label: 'GRN', route: '/inventory/grn' },
    { label: 'Production Receipts', route: '/inventory/production-receipts', key: 'production_receipts' },
    { label: 'GIN', route: '/inventory/gin' },
    { label: 'Transfers', route: '/inventory/transfers' },
    { label: 'Reservations', route: '/inventory/reservations' },
    { label: 'Movements', route: '/inventory/movements' },
    { label: 'Adjustments', route: '/inventory/adjustments' },
    { label: 'My Requests', route: '/inventory/my-requests' },
    { label: 'Dept Approvals', route: '/inventory/department-approvals', key: 'approvals' },
    { label: 'Internal Issue', route: '/inventory/internal-issue', key: 'internal_issue' },
    { label: 'Dept Requests', route: '/inventory/department-requests', key: 'dept_requests' },
    { label: 'Stock Take', route: '/inventory/stock-take' },
    { label: 'Batches', route: '/inventory/batches' },
    { label: 'Serial #', route: '/inventory/serial-numbers' },
    { label: 'Requisitions', route: '/inventory/purchase-requisitions' },
    { label: 'Manufacturing', route: '/inventory/manufacturing', key: 'manufacturing' },
    { label: 'BOM', route: '/inventory/bom', key: 'bom' },
    { label: 'Production', route: '/inventory/production-orders', key: 'production' },
    { label: 'Valuation', route: '/inventory/valuation', key: 'valuation' },
    { label: 'Alerts', route: '/inventory/alerts' },
    { label: 'Reports', route: '/inventory/reports', key: 'reports' },
  ];

  readonly visibleTabs = computed(() =>
    this.allTabs.filter((tab) => {
      if (tab.key === 'approvals') {
        return canApproveDeptRequest(this.auth);
      }
      if (tab.key === 'internal_issue') {
        return canIssueInternalStock(this.auth);
      }
      if (tab.key === 'production_receipts') {
        return canReceiveProductionReceipt(this.auth);
      }
      if (tab.key === 'dept_requests') {
        return canApproveDeptRequest(this.auth) || isStoreOperationsRole(this.auth);
      }
      if (tab.key === 'valuation') {
        return canViewValuation(this.auth);
      }
      if (!tab.key) {
        return true;
      }
      return showInventoryTab(
        this.auth,
        tab.key as 'valuation' | 'categories' | 'reports' | 'manufacturing' | 'bom' | 'production',
      );
    }),
  );

  readonly isStoreRole = computed(() => isStoreOperationsRole(this.auth));
}
