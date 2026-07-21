import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ChartCardComponent } from '../chart-card/chart-card.component';

/**
 * Lazy-loads chart content when scrolled into view (Phase 7 performance).
 */
@Component({
  selector: 'app-chart-card-deferred',
  imports: [ChartCardComponent],
  template: `
    @defer (on viewport) {
      <app-chart-card
        [title]="title()"
        [subtitle]="subtitle()"
        [ariaLabel]="ariaLabel()"
        [minHeight]="minHeight()"
        [loading]="loading()"
        [error]="error()"
        [empty]="empty()"
        [errorTitle]="errorTitle()"
        [errorMessage]="errorMessage()"
        [emptyTitle]="emptyTitle()"
        [emptyMessage]="emptyMessage()"
        [legend]="legend()"
        [hasHeaderActions]="hasHeaderActions()"
        (retry)="retry.emit()"
      >
        @if (hasHeaderActions()) {
          <div chartActions>
            <ng-content select="[chartActions]" />
          </div>
        }
        <ng-content />
      </app-chart-card>
    } @placeholder (minimum 200ms) {
      <div
        class="dash-chart-deferred-placeholder card"
        [style.min-height.px]="minHeight()"
        aria-hidden="true"
      >
        <div class="dash-skeleton__pulse dash-chart-deferred-placeholder__bar"></div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartCardDeferredComponent {
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
