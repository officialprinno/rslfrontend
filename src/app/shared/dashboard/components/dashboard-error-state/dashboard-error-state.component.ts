import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-dashboard-error-state',
  template: `
    <div class="dash-error" [class.dash-error--compact]="compact()" role="alert">
      <div class="dash-error__icon" aria-hidden="true">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h4 class="dash-error__title">{{ title() }}</h4>
      <p class="dash-error__message">{{ message() }}</p>
      @if (showRetry()) {
        <button type="button" class="btn-secondary !text-sm" (click)="retry.emit()">Try again</button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardErrorStateComponent {
  readonly title = input('Something went wrong');
  readonly message = input('Unable to load dashboard data.');
  readonly compact = input(false);
  readonly showRetry = input(true);

  readonly retry = output<void>();
}
