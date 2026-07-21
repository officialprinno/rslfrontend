import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-dashboard-skeleton',
  template: `
    <div class="dash-skeleton" aria-busy="true" aria-label="Loading dashboard">
      <div class="dash-skeleton__insights">
        <div class="dash-skeleton__bar dash-skeleton__pulse"></div>
      </div>
      <div class="dash-skeleton__kpis" [style.--dash-kpi-cols]="kpiColumns()">
        @for (k of kpiSlots(); track k) {
          <div class="dash-skeleton__kpi dash-skeleton__pulse"></div>
        }
      </div>
      <div class="dash-skeleton__charts">
        @for (c of chartSlots(); track c) {
          <div class="dash-skeleton__chart dash-skeleton__pulse"></div>
        }
      </div>
      @if (showTable()) {
        <div class="dash-skeleton__table dash-skeleton__pulse"></div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardSkeletonComponent {
  readonly kpiCount = input(4);
  readonly chartCount = input(2);
  readonly kpiColumns = input(4);
  readonly showTable = input(true);

  kpiSlots(): number[] {
    return Array.from({ length: this.kpiCount() }, (_, i) => i);
  }

  chartSlots(): number[] {
    return Array.from({ length: this.chartCount() }, (_, i) => i);
  }
}
