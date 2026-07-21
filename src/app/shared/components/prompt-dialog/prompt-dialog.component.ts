import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PromptDialogService } from '../../../core/services/prompt-dialog.service';

@Component({
  selector: 'app-prompt-dialog',
  imports: [FormsModule],
  template: `
    @if (dialog.state().visible) {
      <div class="modal-overlay" role="dialog" aria-modal="true" [attr.aria-labelledby]="'prompt-dialog-title'">
        <div class="modal-container modal-size-md">
          <form (ngSubmit)="submit()">
            <div class="modal-header">
              <h3 id="prompt-dialog-title" class="text-lg font-semibold text-gray-900">
                {{ dialog.state().title }}
              </h3>
              <button type="button" (click)="dialog.cancel()" class="btn-icon" aria-label="Close">
                &times;
              </button>
            </div>
            <div class="modal-body">
              <div class="modal-body-inner space-y-4">
                <p class="text-sm text-gray-600">{{ dialog.state().message }}</p>
                <div>
                  <label for="prompt-dialog-value" class="form-label">
                    {{ dialog.state().label }}
                    @if (dialog.state().required) {
                      <span aria-hidden="true">*</span>
                    }
                  </label>
                  @if (dialog.state().multiline) {
                    <textarea
                      id="prompt-dialog-value"
                      name="promptDialogValue"
                      class="input-field min-h-28 w-full"
                      [placeholder]="dialog.state().placeholder ?? ''"
                      [required]="dialog.state().required ?? false"
                      [(ngModel)]="value"
                      (ngModelChange)="error.set(null)"
                      autofocus
                    ></textarea>
                  } @else {
                    <input
                      id="prompt-dialog-value"
                      name="promptDialogValue"
                      class="input-field w-full"
                      [placeholder]="dialog.state().placeholder ?? ''"
                      [required]="dialog.state().required ?? false"
                      [(ngModel)]="value"
                      (ngModelChange)="error.set(null)"
                      autofocus
                    />
                  }
                  @if (error()) {
                    <p class="mt-1.5 text-sm text-red-600" role="alert">{{ error() }}</p>
                  }
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" (click)="dialog.cancel()" class="btn-secondary">
                {{ dialog.state().cancelLabel }}
              </button>
              <button type="submit" class="btn-primary">
                {{ dialog.state().confirmLabel }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromptDialogComponent {
  readonly dialog = inject(PromptDialogService);
  readonly error = signal<string | null>(null);
  value = '';

  constructor() {
    effect(() => {
      const state = this.dialog.state();
      if (state.visible) {
        this.value = state.initialValue ?? '';
        this.error.set(null);
      }
    });
  }

  submit(): void {
    const state = this.dialog.state();
    if (state.required && !this.value.trim()) {
      this.error.set(`${state.label} is required.`);
      return;
    }
    const validationError = state.validation?.(this.value) ?? null;
    if (validationError) {
      this.error.set(validationError);
      return;
    }
    this.dialog.submit(this.value);
  }
}
