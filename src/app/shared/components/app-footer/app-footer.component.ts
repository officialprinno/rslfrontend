import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import {
  FOOTER_CONTENT_MANAGER,
  FOOTER_DEVELOPER_NAME,
  FOOTER_DEVELOPER_URL,
  FOOTER_PRODUCT_NAME,
} from '../../../core/constants/footer.constants';

export type AppFooterVariant = 'app' | 'auth' | 'inverse';

@Component({
  selector: 'app-app-footer',
  imports: [TranslatePipe],
  template: `
    <footer class="app-footer" [class.app-footer--auth]="variant() === 'auth'" [class.app-footer--inverse]="variant() === 'inverse'">
      <div class="app-footer__inner">
        <p class="app-footer__copyright">
          © {{ currentYear }} {{ productName }}. {{ 'footer.rights_reserved' | translate }}
        </p>
        <p class="app-footer__credits">
          {{ 'footer.designed_developed' | translate }}
          <a
            class="app-footer__link"
            [href]="developerUrl"
            target="_blank"
            rel="noopener noreferrer"
          >{{ developerName }}</a>
          {{ 'footer.and_content_managed' | translate }}
          <span class="app-footer__company">{{ contentManager }}</span>
        </p>
      </div>
    </footer>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppFooterComponent {
  readonly variant = input<AppFooterVariant>('app');

  readonly currentYear = new Date().getFullYear();
  readonly productName = FOOTER_PRODUCT_NAME;
  readonly developerName = FOOTER_DEVELOPER_NAME;
  readonly developerUrl = FOOTER_DEVELOPER_URL;
  readonly contentManager = FOOTER_CONTENT_MANAGER;
}
