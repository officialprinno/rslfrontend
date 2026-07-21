import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import {
  canManagePaymentCategories,
  showStaffPaymentAllRecords,
  showStaffPaymentFinanceQueues,
  showStaffPaymentGmQueue,
  showStaffPaymentHodQueue,
} from '../../utils/staff-payment-permissions.util';

@Component({
  selector: 'app-staff-payment-subnav',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl mb-4 overflow-x-auto">
      <a
        routerLink="/finance/staff-payment-requests"
        routerLinkActive="!bg-white !text-[#1B3A6B] !shadow-sm"
        [routerLinkActiveOptions]="{ exact: true }"
        class="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 whitespace-nowrap transition-all hover:text-gray-900"
      >
        My Requests
      </a>
      @if (showHod()) {
        <a
          routerLink="/finance/staff-payment-requests/hod"
          routerLinkActive="!bg-white !text-[#1B3A6B] !shadow-sm"
          class="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 whitespace-nowrap transition-all hover:text-gray-900"
        >
          HOD Queue
        </a>
      }
      @if (showGm()) {
        <a
          routerLink="/finance/staff-payment-requests/gm"
          routerLinkActive="!bg-white !text-[#1B3A6B] !shadow-sm"
          class="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 whitespace-nowrap transition-all hover:text-gray-900"
        >
          GM Queue
        </a>
      }
      @if (showFinance()) {
        <a
          routerLink="/finance/staff-payment-requests/finance"
          routerLinkActive="!bg-white !text-[#1B3A6B] !shadow-sm"
          class="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 whitespace-nowrap transition-all hover:text-gray-900"
        >
          Finance Queue
        </a>
        <a
          routerLink="/finance/staff-payment-requests/payment"
          routerLinkActive="!bg-white !text-[#1B3A6B] !shadow-sm"
          class="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 whitespace-nowrap transition-all hover:text-gray-900"
        >
          Payment Queue
        </a>
        <a
          routerLink="/finance/staff-payment-requests/liquidation"
          routerLinkActive="!bg-white !text-[#1B3A6B] !shadow-sm"
          class="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 whitespace-nowrap transition-all hover:text-gray-900"
        >
          Liquidation Queue
        </a>
      }
      <a
        routerLink="/finance/staff-payment-requests/history"
        routerLinkActive="!bg-white !text-[#1B3A6B] !shadow-sm"
        class="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 whitespace-nowrap transition-all hover:text-gray-900"
      >
        History
      </a>
      @if (showAllRecords()) {
        <a
          routerLink="/finance/staff-payment-requests/all"
          routerLinkActive="!bg-white !text-[#1B3A6B] !shadow-sm"
          class="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 whitespace-nowrap transition-all hover:text-gray-900"
        >
          All Records
        </a>
      }
      @if (showCategories()) {
        <a
          routerLink="/finance/staff-payment-requests/categories"
          routerLinkActive="!bg-white !text-[#1B3A6B] !shadow-sm"
          class="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 whitespace-nowrap transition-all hover:text-gray-900"
        >
          Categories
        </a>
      }
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffPaymentSubnavComponent {
  private readonly auth = inject(AuthService);

  readonly showHod = () => showStaffPaymentHodQueue(this.auth);
  readonly showGm = () => showStaffPaymentGmQueue(this.auth);
  readonly showFinance = () => showStaffPaymentFinanceQueues(this.auth);
  readonly showAllRecords = () => showStaffPaymentAllRecords(this.auth);
  readonly showCategories = () => canManagePaymentCategories(this.auth);
}
