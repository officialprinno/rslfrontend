import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-error-state',
  template: `
    <div class="card text-center py-12">
      <div class="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-red-50 border border-red-100">
        <svg class="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 class="text-base font-semibold text-gray-900 mb-1">{{ title() }}</h3>
      <p class="text-sm text-gray-500 mb-6 max-w-sm mx-auto">{{ message() }}</p>
      <button type="button" (click)="retry.emit()" class="btn-primary">Try Again</button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorStateComponent {
  readonly title = input('Something went wrong');
  readonly message = input('Unable to load data. Please try again.');

  readonly retry = output<void>();
}
