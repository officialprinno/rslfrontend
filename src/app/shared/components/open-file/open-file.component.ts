import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { DocumentPreviewService } from '../../../core/services/document-preview.service';

@Component({
  selector: 'app-open-file',
  template: `
    <button
      type="button"
      [class]="buttonClass()"
      [disabled]="disabled() || !canOpen()"
      (click)="open()"
    >
      <ng-content />
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenFileComponent {
  private readonly preview = inject(DocumentPreviewService);

  readonly fileUrl = input<string | null | undefined>(null);
  readonly file = input<File | null>(null);
  readonly fileName = input('Document');
  readonly buttonClass = input(
    'text-left text-[#1B3A6B] hover:underline truncate disabled:opacity-50 disabled:cursor-not-allowed',
  );
  readonly disabled = input(false);

  canOpen(): boolean {
    return !!(this.file() || this.fileUrl());
  }

  open(): void {
    const local = this.file();
    if (local) {
      this.preview.previewFile(local);
      return;
    }
    const url = this.fileUrl();
    if (url) {
      this.preview.previewUrl(url, this.fileName());
    }
  }
}
