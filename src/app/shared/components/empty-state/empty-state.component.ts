import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <div class="py-16 px-6 text-center">
      <div class="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-[#EEF4FB] border border-[#D6E4F5]">
        <svg
          class="w-8 h-8 text-[#1B3A6B]/40"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" [attr.d]="iconPath()" />
        </svg>
      </div>
      <h3 class="text-base font-semibold text-gray-900 mb-1">{{ title() }}</h3>
      <p class="text-sm text-gray-500 max-w-sm mx-auto mb-6 leading-relaxed">{{ message() }}</p>
      @if (actionLabel()) {
        <button type="button" (click)="actionClick.emit()" class="btn-primary">
          {{ actionLabel() }}
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly message = input('No data available.');
  readonly actionLabel = input<string>('');
  readonly icon = input<'inbox' | 'document' | 'folder'>('inbox');

  readonly actionClick = output<void>();

  iconPath(): string {
    const paths = {
      inbox:
        'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4',
      document:
        'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      folder: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
    };
    return paths[this.icon()];
  }
}
