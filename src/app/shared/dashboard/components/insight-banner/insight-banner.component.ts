import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DashboardInsight } from '../../models/dashboard.types';
import { toneClasses } from '../../utils/dashboard-icons.util';

@Component({
  selector: 'app-insight-banner',
  imports: [RouterLink],
  template: `
    @if (insights().length) {
      <div class="dash-insights" role="region" aria-label="Executive insights">
        @for (item of insights(); track item.id) {
          @if (item.route) {
            <a
              [routerLink]="item.route"
              [queryParams]="item.queryParams"
              class="dash-insight"
              [class]="insightClass(item.tone)"
            >
              {{ item.message }}
            </a>
          } @else {
            <div class="dash-insight" [class]="insightClass(item.tone)">
              {{ item.message }}
            </div>
          }
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsightBannerComponent {
  readonly insights = input<DashboardInsight[]>([]);

  insightClass(tone: DashboardInsight['tone'] = 'neutral'): string {
    const t = toneClasses(tone);
    return `dash-insight ${t.bg} ${t.text} ${t.border}`;
  }
}
