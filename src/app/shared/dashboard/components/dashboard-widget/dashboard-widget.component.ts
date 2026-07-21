import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-dashboard-widget',
  templateUrl: './dashboard-widget.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardWidgetComponent {
  readonly title = input('');
  readonly subtitle = input('');
  readonly hasHeaderActions = input(false);
  readonly flush = input(false);
  readonly loading = input(false);
  readonly loadingLabel = input('Loading…');
  readonly error = input(false);
  readonly errorTitle = input('Unable to load widget');
  readonly errorMessage = input('Unable to load this widget.');
  readonly empty = input(false);
  readonly emptyTitle = input('No data');
  readonly emptyMessage = input('Nothing to show for this period.');

  readonly retry = output<void>();
}
