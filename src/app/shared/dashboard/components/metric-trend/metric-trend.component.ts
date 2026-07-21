import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { TrendDirection } from '../../models/dashboard.types';

@Component({
  selector: 'app-metric-trend',
  template: `
    @if (show()) {
      <span
        class="dash-metric-trend"
        [class.dash-metric-trend--up]="resolvedDirection() === 'up'"
        [class.dash-metric-trend--down]="resolvedDirection() === 'down'"
        [class.dash-metric-trend--flat]="resolvedDirection() === 'flat'"
        [attr.aria-label]="ariaLabel()"
      >
        @if (resolvedDirection() === 'up') {
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
          </svg>
        } @else if (resolvedDirection() === 'down') {
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        }
        <span>{{ displayValue() }}</span>
        @if (label()) {
          <span class="dash-metric-trend__label">{{ label() }}</span>
        }
      </span>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricTrendComponent {
  readonly value = input<number | null | undefined>(undefined);
  readonly label = input('');
  readonly trendDirection = input<TrendDirection | 'auto'>('auto');
  readonly suffix = input('%');

  readonly show = computed(() => this.value() !== null && this.value() !== undefined);

  readonly resolvedDirection = computed<TrendDirection>(() => {
    const forced = this.trendDirection();
    if (forced !== 'auto') return forced;
    const v = this.value();
    if (v === null || v === undefined || v === 0) return 'flat';
    return v > 0 ? 'up' : 'down';
  });

  readonly displayValue = computed(() => {
    const v = this.value();
    if (v === null || v === undefined) return '';
    const abs = Math.abs(v);
    const formatted = Number.isInteger(abs) ? String(abs) : abs.toFixed(1);
    return `${formatted}${this.suffix()}`;
  });

  ariaLabel(): string {
    return [this.displayValue(), this.label()].filter(Boolean).join(' ');
  }
}
