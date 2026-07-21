import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Compact enterprise filter bar shell — project content for search, filters, and actions. */
@Component({
  selector: 'app-list-filter-bar',
  template: `
    <div class="list-filter-bar card !p-0 !shadow-none !mb-0 border-0 bg-transparent">
      <div class="list-filter-bar__inner">
        <ng-content select="[filterSearch]" />
        <div class="list-filter-bar__filters">
          <ng-content select="[filterFields]" />
        </div>
        <div class="list-filter-bar__actions">
          <ng-content select="[filterActions]" />
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListFilterBarComponent {}
