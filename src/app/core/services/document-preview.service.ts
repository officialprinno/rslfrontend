import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { finalize } from 'rxjs/operators';

import { NotificationService } from './notification.service';
import { getApiErrorMessage } from '../utils/api.util';
import { FilePreviewKind, filePreviewKind } from '../../shared/utils/file-preview.util';

@Injectable({ providedIn: 'root' })
export class DocumentPreviewService {
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly notification = inject(NotificationService);

  readonly open = signal(false);
  readonly loading = signal(false);
  readonly title = signal('Document');
  readonly kind = signal<FilePreviewKind>('unsupported');
  readonly safeUrl = signal<SafeResourceUrl | null>(null);

  private blobUrl: string | null = null;
  private downloadBlob: Blob | null = null;
  private downloadName = 'document';

  previewUrl(url: string, filename = 'Document'): void {
    if (!url) return;
    this.loading.set(true);
    this.open.set(true);
    this.title.set(filename);
    this.kind.set('unsupported');
    this.safeUrl.set(null);

    this.http
      .get(url, { responseType: 'blob' })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (blob) => this.showBlob(blob, filename),
        error: (e) => {
          this.close();
          this.notification.error(getApiErrorMessage(e, 'Could not open file'));
        },
      });
  }

  previewFile(file: File): void {
    this.open.set(true);
    this.loading.set(false);
    this.showBlob(file, file.name);
  }

  download(): void {
    if (!this.downloadBlob) return;
    const url = URL.createObjectURL(this.downloadBlob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = this.downloadName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  close(): void {
    this.open.set(false);
    this.loading.set(false);
    this.safeUrl.set(null);
    this.revokeBlobUrl();
    this.downloadBlob = null;
    this.downloadName = 'document';
  }

  private showBlob(blob: Blob, filename: string): void {
    this.revokeBlobUrl();
    this.blobUrl = URL.createObjectURL(blob);
    this.downloadBlob = blob;
    this.downloadName = filename;
    this.kind.set(filePreviewKind(filename, blob.type));
    this.safeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.blobUrl));
    this.title.set(filename);
  }

  private revokeBlobUrl(): void {
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }
  }
}
