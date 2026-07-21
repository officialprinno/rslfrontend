import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'app-modal',
  template: `
    @if (open()) {
      <div class="modal-overlay" (click)="onBackdropClick()" role="dialog" aria-modal="true">
        <div
          class="modal-container"
          [class]="sizeClass()"
          (click)="$event.stopPropagation()"
        >
          <div class="modal-header">
            <h3 class="text-lg font-semibold text-gray-900">{{ title() }}</h3>
            <button type="button" (click)="close.emit()" class="btn-icon" aria-label="Close">
              &times;
            </button>
          </div>
          <div class="modal-body">
            <div class="modal-body-inner">
              <ng-content />
            </div>
          </div>
          @if (showFooter()) {
            <div class="modal-footer">
              <ng-content select="[modalFooter]" />
            </div>
          }
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent {
  readonly open = input(false);
  readonly title = input('');
  readonly size = input<'md' | 'lg' | 'xl' | 'wide' | 'preview'>('lg');
  readonly showFooter = input(true);
  readonly closeOnBackdrop = input(true);

  readonly close = output<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) {
      this.close.emit();
    }
  }

  sizeClass(): string {
    const sizes: Record<'md' | 'lg' | 'xl' | 'wide' | 'preview', string> = {
      md: 'modal-size-md',
      lg: 'modal-size-lg',
      xl: 'modal-size-xl',
      wide: 'modal-size-wide',
      preview: 'modal-size-preview',
    };
    return sizes[this.size()];
  }

  onBackdropClick(): void {
    if (this.closeOnBackdrop()) {
      this.close.emit();
    }
  }
}
