import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { DateRangeFilterComponent } from '../date-range-filter/date-range-filter.component';
import { DateRangeValue } from '../../models/dashboard.types';

@Component({
  selector: 'app-dashboard-header',
  imports: [DatePipe, DateRangeFilterComponent],
  template: `
    <header class="dash-header">
      <div class="dash-header__main">
        <div>
          <h1 class="dash-header__title">{{ title() }}</h1>
          @if (subtitle()) {
            <p class="dash-header__subtitle">{{ subtitle() }}</p>
          }
        </div>
        <div class="dash-header__meta">
          @if (lastUpdated()) {
            <span class="dash-header__updated">
              Updated {{ lastUpdated() | date: 'short' }}
            </span>
          }
          @if (showRefresh()) {
            <button
              type="button"
              class="btn-secondary !text-sm"
              [disabled]="refreshing()"
              (click)="refresh.emit()"
              aria-label="Refresh dashboard"
            >
              @if (refreshing()) {
                <span class="spinner spinner-sm"></span>
              } @else {
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              }
              Refresh
            </button>
          }
          @if (showExport()) {
            <button type="button" class="btn-secondary !text-sm" (click)="exportClick.emit()">
              Export
            </button>
          }
          <ng-content select="[headerActions]" />
        </div>
      </div>

      @if (showDateFilter()) {
        <app-date-range-filter
          [defaultPreset]="datePreset()"
          (rangeChange)="dateRangeChange.emit($event)"
        />
      }

      <ng-content select="[headerExtra]" />
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly lastUpdated = input<Date | string | null>(null);
  readonly refreshing = input(false);
  readonly showRefresh = input(true);
  readonly showExport = input(false);
  readonly showDateFilter = input(true);
  readonly datePreset = input('this_month');

  readonly refresh = output<void>();
  readonly exportClick = output<void>();
  readonly dateRangeChange = output<DateRangeValue>();
}
