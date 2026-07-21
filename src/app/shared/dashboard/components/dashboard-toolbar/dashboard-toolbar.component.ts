import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-dashboard-toolbar',
  template: `
    <div class="dash-toolbar">
      <div class="dash-toolbar__filters">
        <ng-content select="[toolbarFilters]" />
      </div>
      <div class="dash-toolbar__actions">
        <ng-content select="[toolbarActions]" />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardToolbarComponent {
  readonly ariaLabel = input('Dashboard filters');
}
