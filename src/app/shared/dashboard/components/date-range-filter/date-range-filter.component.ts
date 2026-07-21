import { ChangeDetectionStrategy, Component, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DashboardDatePreset, DateRangeValue } from '../../models/dashboard.types';
import {
  DEFAULT_DATE_PRESETS,
  formatDateRangeLabel,
  resolveDatePreset,
} from '../../utils/date-range.util';

@Component({
  selector: 'app-date-range-filter',
  imports: [FormsModule],
  template: `
    <div class="dash-date-filter" role="group" aria-label="Date range filter">
      <div class="dash-date-filter__presets">
        @for (preset of presets(); track preset.id) {
          <button
            type="button"
            class="dash-date-filter__preset"
            [class.dash-date-filter__preset--active]="activePreset() === preset.id"
            (click)="selectPreset(preset.id)"
          >
            {{ preset.label }}
          </button>
        }
      </div>
      @if (showCustom()) {
        <div class="dash-date-filter__custom">
          <input
            type="date"
            class="input-field !py-1.5 !text-sm"
            [ngModel]="customStart()"
            (ngModelChange)="onCustomStart($event)"
            aria-label="Start date"
          />
          <span class="dash-date-filter__sep">to</span>
          <input
            type="date"
            class="input-field !py-1.5 !text-sm"
            [ngModel]="customEnd()"
            (ngModelChange)="onCustomEnd($event)"
            aria-label="End date"
          />
        </div>
      }
      <span class="dash-date-filter__summary">{{ summaryLabel() }}</span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateRangeFilterComponent implements OnInit {
  readonly presets = input<DashboardDatePreset[]>(DEFAULT_DATE_PRESETS);
  readonly defaultPreset = input('this_month');
  readonly showCustom = input(true);
  readonly value = input<DateRangeValue | null>(null);

  readonly rangeChange = output<DateRangeValue>();

  readonly activePreset = signal('this_month');
  readonly customStart = signal('');
  readonly customEnd = signal('');
  readonly summaryLabel = signal('');

  ngOnInit(): void {
    const initial = this.value() ?? resolveDatePreset(this.defaultPreset());
    this.applyRange(initial, false);
  }

  selectPreset(presetId: string): void {
    this.applyRange(resolveDatePreset(presetId));
  }

  onCustomStart(value: string): void {
    this.customStart.set(value);
    this.emitCustomIfReady();
  }

  onCustomEnd(value: string): void {
    this.customEnd.set(value);
    this.emitCustomIfReady();
  }

  private emitCustomIfReady(): void {
    const start = this.customStart();
    const end = this.customEnd();
    if (!start || !end || start > end) return;
    this.activePreset.set('custom');
    const range: DateRangeValue = { startDate: start, endDate: end, preset: 'custom' };
    this.summaryLabel.set(formatDateRangeLabel(range));
    this.rangeChange.emit(range);
  }

  private applyRange(range: DateRangeValue, emit = true): void {
    this.activePreset.set(range.preset ?? this.defaultPreset());
    this.customStart.set(range.startDate);
    this.customEnd.set(range.endDate);
    this.summaryLabel.set(formatDateRangeLabel(range));
    if (emit) {
      this.rangeChange.emit(range);
    }
  }
}
