import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  signal,
} from '@angular/core';
import QRCode from 'qrcode';

@Component({
  selector: 'app-qr-code',
  template: `
    @if (dataUrl()) {
      <img
        [src]="dataUrl()"
        [width]="size()"
        [height]="size()"
        [alt]="alt()"
        class="inline-block"
      />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrCodeComponent {
  readonly data = input.required<string>();
  readonly size = input(96);
  readonly alt = input('QR Code');

  readonly dataUrl = signal('');

  constructor() {
    effect(() => {
      const value = this.data().trim();
      if (!value) {
        this.dataUrl.set('');
        return;
      }
      QRCode.toDataURL(value, {
        width: this.size(),
        margin: 1,
        errorCorrectionLevel: 'M',
      })
        .then((url) => this.dataUrl.set(url))
        .catch(() => this.dataUrl.set(''));
    });
  }
}
