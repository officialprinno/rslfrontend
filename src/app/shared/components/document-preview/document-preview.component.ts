import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { DocumentPreviewService } from '../../../core/services/document-preview.service';
import { ModalComponent } from '../modal/modal.component';

@Component({
  selector: 'app-document-preview',
  imports: [ModalComponent],
  template: `
    <app-modal
      [open]="preview.open()"
      [title]="preview.title()"
      size="preview"
      [showFooter]="preview.kind() === 'unsupported' && !preview.loading()"
      (close)="preview.close()"
    >
      @if (preview.loading()) {
        <div class="flex items-center justify-center py-20 text-gray-500">Loading document…</div>
      } @else if (preview.kind() === 'pdf' && preview.safeUrl(); as src) {
        <iframe
          [src]="src"
          [title]="preview.title()"
          class="w-full h-[min(70vh,720px)] rounded-lg border border-gray-200 bg-gray-50"
        ></iframe>
      } @else if (preview.kind() === 'image' && preview.safeUrl(); as src) {
        <div class="flex justify-center bg-gray-50 rounded-lg border border-gray-200 p-4">
          <img
            [src]="src"
            [alt]="preview.title()"
            class="max-h-[min(70vh,720px)] max-w-full object-contain rounded"
          />
        </div>
      } @else if (!preview.loading()) {
        <div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-900">
          <p class="font-medium">In-app preview is not available for this file type.</p>
          <p class="mt-2 text-amber-800">Use Download to save the file to your device.</p>
        </div>
      }

      @if (preview.kind() === 'unsupported' && !preview.loading()) {
        <div modalFooter class="flex justify-end">
          <button type="button" class="btn-primary" (click)="preview.download()">Download</button>
        </div>
      }
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentPreviewComponent {
  readonly preview = inject(DocumentPreviewService);
}
