import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  template: `
    @if (dialog.state().visible) {
      <div class="modal-overlay" role="alertdialog" aria-modal="true">
        <div class="modal-container">
          <div class="modal-header">
            <h3 class="text-lg font-semibold text-gray-900">{{ dialog.state().title }}</h3>
            <button type="button" (click)="dialog.cancel()" class="btn-icon" aria-label="Close">
              &times;
            </button>
          </div>
          <div class="modal-body">
            <p class="text-sm text-gray-600">{{ dialog.state().message }}</p>
          </div>
          <div class="modal-footer">
            <button type="button" (click)="dialog.cancel()" class="btn-secondary">
              {{ dialog.state().cancelLabel }}
            </button>
            <button
              type="button"
              (click)="dialog.confirm()"
              [class]="dialog.state().confirmDanger ? 'btn-danger' : 'btn-primary'"
            >
              {{ dialog.state().confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  readonly dialog = inject(ConfirmDialogService);
}
