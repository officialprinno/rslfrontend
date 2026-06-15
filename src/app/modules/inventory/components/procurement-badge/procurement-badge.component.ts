import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-procurement-badge',
  template: `
    <span
      class="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-100"
    >
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-16 0H3m2 0v-4m10 4v-4m-8 0h8"
        />
      </svg>
      Procurement · Store Operations
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProcurementBadgeComponent {}
