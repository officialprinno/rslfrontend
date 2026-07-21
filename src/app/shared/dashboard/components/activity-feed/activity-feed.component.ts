import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DashboardActivityItem } from '../../models/dashboard.types';

@Component({
  selector: 'app-activity-feed',
  imports: [RouterLink],
  template: `
    @if (items().length) {
      <ul class="dash-activity" role="list">
        @for (item of items(); track item.id) {
          <li>
            @if (item.route) {
              <a
                [routerLink]="item.route"
                [queryParams]="item.queryParams"
                class="dash-activity__item dash-activity__item--link"
              >
                <div class="dash-activity__dot dash-activity__dot--{{ item.tone || 'neutral' }}"></div>
                <div class="min-w-0 flex-1">
                  <p class="dash-activity__title">{{ item.title }}</p>
                  @if (item.subtitle) {
                    <p class="dash-activity__subtitle">{{ item.subtitle }}</p>
                  }
                </div>
                @if (item.timestamp) {
                  <time class="dash-activity__time">{{ item.timestamp }}</time>
                }
              </a>
            } @else {
              <div class="dash-activity__item">
                <div class="dash-activity__dot dash-activity__dot--{{ item.tone || 'neutral' }}"></div>
                <div class="min-w-0 flex-1">
                  <p class="dash-activity__title">{{ item.title }}</p>
                  @if (item.subtitle) {
                    <p class="dash-activity__subtitle">{{ item.subtitle }}</p>
                  }
                </div>
                @if (item.timestamp) {
                  <time class="dash-activity__time">{{ item.timestamp }}</time>
                }
              </div>
            }
          </li>
        }
      </ul>
    } @else {
      <p class="dash-activity__empty">{{ emptyMessage() }}</p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityFeedComponent {
  readonly items = input<DashboardActivityItem[]>([]);
  readonly emptyMessage = input('No recent activity.');
}
