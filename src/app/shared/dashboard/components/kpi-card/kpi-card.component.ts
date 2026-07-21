import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DashboardKpiIcon, DashboardTone } from '../../models/dashboard.types';
import { kpiIconPath } from '../../utils/dashboard-icons.util';
import { MetricTrendComponent } from '../metric-trend/metric-trend.component';

@Component({
  selector: 'app-kpi-card',
  imports: [NgTemplateOutlet, RouterLink, MetricTrendComponent],
  template: `
    @if (route(); as r) {
      <a
        [routerLink]="r"
        [queryParams]="queryParams()"
        class="dash-kpi-card group"
        [attr.aria-label]="label() + ': ' + value()"
        [title]="tooltip() || null"
      >
        <ng-container *ngTemplateOutlet="body" />
      </a>
    } @else {
      <div
        class="dash-kpi-card"
        [class.dash-kpi-card--static]="!clickable()"
        role="group"
        [attr.aria-label]="label()"
        [title]="tooltip() || null"
        (click)="onCardClick()"
        (keydown.enter)="onCardClick()"
        [attr.tabindex]="clickable() ? 0 : null"
      >
        <ng-container *ngTemplateOutlet="body" />
      </div>
    }

    <ng-template #body>
      <div class="dash-kpi-card__accent" [style.background]="accentColor()"></div>
      @if (hasIcon()) {
        <div class="dash-kpi-card__icon" [class]="toneClass()">
          @if (iconPath(); as path) {
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" [attr.d]="path" />
            </svg>
          } @else {
            <ng-content select="[kpiIcon]" />
          }
        </div>
      }
      <p class="dash-kpi-card__label">{{ label() }}</p>
      <p class="dash-kpi-card__value">{{ value() }}</p>
      @if (comparison()) {
        <p class="dash-kpi-card__comparison">{{ comparison() }}</p>
      }
      <app-metric-trend [value]="trend()" [label]="trendLabel()" />
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpiCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly icon = input<DashboardKpiIcon>();
  readonly trend = input<number | null | undefined>(undefined);
  readonly trendLabel = input('');
  readonly comparison = input('');
  readonly tone = input<DashboardTone>('neutral');
  readonly route = input<string | string[] | undefined>(undefined);
  readonly queryParams = input<Record<string, string> | undefined>(undefined);
  readonly tooltip = input('');
  readonly clickable = input(true);

  readonly cardClick = output<void>();

  readonly iconPath = computed(() => kpiIconPath(this.icon()));
  readonly hasIcon = computed(() => Boolean(this.iconPath() || this.icon() === 'custom'));

  toneClass(): string {
    return `dash-kpi-card__icon--${this.tone()}`;
  }

  accentColor(): string {
    const tones: Record<DashboardTone, string> = {
      neutral: 'var(--color-primary-500)',
      success: 'var(--color-success)',
      warning: 'var(--color-warning)',
      danger: 'var(--color-danger)',
      info: 'var(--color-info)',
      accent: 'var(--color-accent-400)',
    };
    return tones[this.tone()];
  }

  onCardClick(): void {
    if (this.clickable()) {
      this.cardClick.emit();
    }
  }
}
