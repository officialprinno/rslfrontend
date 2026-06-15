import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  template: `
    @if (fullPage()) {
      <div class="page-overlay">
        <div class="flex flex-col items-center gap-3">
          <div class="spinner" [class]="sizeClass()"></div>
          @if (message()) {
            <p class="text-sm text-gray-500">{{ message() }}</p>
          }
        </div>
      </div>
    } @else {
      <div class="flex flex-col items-center justify-center gap-3" [class.py-12]="!inline()">
        <div class="spinner" [class]="sizeClass()"></div>
        @if (message()) {
          <p class="text-sm text-gray-500">{{ message() }}</p>
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingSpinnerComponent {
  readonly message = input<string>('');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly inline = input(false);
  readonly fullPage = input(false);

  sizeClass(): string {
    const sizes = { sm: 'spinner-sm', md: 'spinner-md', lg: 'spinner-lg' };
    return sizes[this.size()];
  }
}
