import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { DashboardEmptyStateComponent } from '../dashboard-empty-state/dashboard-empty-state.component';
import { WidgetLoaderComponent } from '../widget-loader/widget-loader.component';

@Component({
  selector: 'app-chart-container',
  imports: [WidgetLoaderComponent, DashboardEmptyStateComponent],
  template: `
    <div
      class="dash-chart-container"
      [style.min-height.px]="minHeight()"
      role="img"
      [attr.aria-label]="ariaLabel() || title()"
    >
      @if (loading()) {
        <app-widget-loader [label]="loadingLabel()" />
      } @else if (empty()) {
        <app-dashboard-empty-state
          [title]="emptyTitle()"
          [message]="emptyMessage()"
          [compact]="true"
        />
      } @else {
        <ng-content />
      }
    </div>
    @if (legend().length && !loading() && !empty()) {
      <ul class="dash-chart-legend" aria-hidden="true">
        @for (item of legend(); track item.label) {
          <li class="dash-chart-legend__item">
            <span class="dash-chart-legend__swatch" [style.background]="item.color"></span>
            <span>{{ item.label }}</span>
          </li>
        }
      </ul>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartContainerComponent {
  readonly title = input('');
  readonly ariaLabel = input('');
  readonly minHeight = input(240);
  readonly loading = input(false);
  readonly loadingLabel = input('Loading chart…');
  readonly empty = input(false);
  readonly emptyTitle = input('No chart data');
  readonly emptyMessage = input('Try a different date range.');
  readonly legend = input<{ label: string; color: string }[]>([]);
}
