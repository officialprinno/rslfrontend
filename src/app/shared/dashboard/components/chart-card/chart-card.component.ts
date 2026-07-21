import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ChartContainerComponent } from '../chart-container/chart-container.component';
import { DashboardWidgetComponent } from '../dashboard-widget/dashboard-widget.component';

@Component({
  selector: 'app-chart-card',
  imports: [DashboardWidgetComponent, ChartContainerComponent],
  template: `
    <app-dashboard-widget
      [title]="title()"
      [subtitle]="subtitle()"
      [hasHeaderActions]="hasHeaderActions()"
      [loading]="loading()"
      [error]="error()"
      [empty]="empty()"
      [errorTitle]="errorTitle()"
      [errorMessage]="errorMessage()"
      (retry)="retry.emit()"
    >
      @if (hasHeaderActions()) {
        <div widgetActions>
          <ng-content select="[chartActions]" />
        </div>
      }
      <app-chart-container
        [title]="title()"
        [ariaLabel]="ariaLabel()"
        [minHeight]="minHeight()"
        [loading]="false"
        [empty]="empty()"
        [emptyTitle]="emptyTitle()"
        [emptyMessage]="emptyMessage()"
        [legend]="legend()"
      >
        <ng-content />
      </app-chart-container>
    </app-dashboard-widget>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartCardComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly ariaLabel = input('');
  readonly minHeight = input(240);
  readonly loading = input(false);
  readonly error = input(false);
  readonly empty = input(false);
  readonly errorTitle = input('Chart unavailable');
  readonly errorMessage = input('Unable to load chart data.');
  readonly emptyTitle = input('No chart data');
  readonly emptyMessage = input('Try a different date range.');
  readonly legend = input<{ label: string; color: string }[]>([]);
  readonly hasHeaderActions = input(false);

  readonly retry = output<void>();
}
