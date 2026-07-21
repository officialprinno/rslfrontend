import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-dashboard-section',
  template: `
    <section class="dash-section" [attr.aria-labelledby]="title() ? sectionId() : null">
      <div class="dash-section__header">
        <div>
          @if (title()) {
            <h2 class="dash-section__title" [id]="sectionId()">{{ title() }}</h2>
          }
          @if (subtitle()) {
            <p class="dash-section__subtitle">{{ subtitle() }}</p>
          }
        </div>
        @if (hasActions()) {
          <div class="dash-section__actions">
            <ng-content select="[sectionActions]" />
          </div>
        }
      </div>
      <div class="dash-section__body">
        <ng-content />
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardSectionComponent {
  readonly title = input('');
  readonly subtitle = input('');
  readonly hasActions = input(false);
  readonly sectionId = input(`dash-section-${Math.random().toString(36).slice(2, 9)}`);
}
