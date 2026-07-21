import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-widget-loader',
  template: `
    <div class="dash-widget-loader" role="status" [attr.aria-label]="label()">
      <span class="spinner spinner-sm" aria-hidden="true"></span>
      <span class="dash-widget-loader__label">{{ label() }}</span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WidgetLoaderComponent {
  readonly label = input('Loading…');
}
