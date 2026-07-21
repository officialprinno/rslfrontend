import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-dashboard-empty-state',
  template: `
    <div class="dash-empty" [class.dash-empty--compact]="compact()">
      <div class="dash-empty__icon" aria-hidden="true">
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h4 class="dash-empty__title">{{ title() }}</h4>
      <p class="dash-empty__message">{{ message() }}</p>
      <ng-content />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardEmptyStateComponent {
  readonly title = input('No data yet');
  readonly message = input('Data will appear here when records are available.');
  readonly compact = input(false);
}
