import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';

import { CompanyContextService } from '../../../../core/services/company-context.service';
import { DateRangeValue } from '../../models/dashboard.types';
import { DashboardErrorStateComponent } from '../dashboard-error-state/dashboard-error-state.component';
import { DashboardHeaderComponent } from '../dashboard-header/dashboard-header.component';
import { DashboardSkeletonComponent } from '../dashboard-skeleton/dashboard-skeleton.component';

@Component({
  selector: 'app-dashboard-layout',
  imports: [DashboardHeaderComponent, DashboardSkeletonComponent, DashboardErrorStateComponent],
  template: `
    <div class="page-container dash-layout">
      <ng-content select="[dashNav]" />

      @if (companyContext.isConsolidated()) {
        <div class="dash-scope-banner dash-scope-banner--consolidated" role="status">
          Consolidated view — data from all companies combined
        </div>
      }

      @if (showHeader()) {
        <app-dashboard-header
          [title]="title()"
          [subtitle]="subtitle()"
          [lastUpdated]="lastUpdated()"
          [refreshing]="refreshing()"
          [showRefresh]="showRefresh()"
          [showExport]="showExport()"
          [showDateFilter]="showDateFilter()"
          [datePreset]="datePreset()"
          (refresh)="refresh.emit()"
          (exportClick)="exportClick.emit()"
          (dateRangeChange)="dateRangeChange.emit($event)"
        >
          <ng-content select="[headerActions]" headerActions />
          <ng-content select="[headerExtra]" headerExtra />
        </app-dashboard-header>
      }

      @if (loading()) {
        <app-dashboard-skeleton
          [kpiCount]="skeletonKpis()"
          [chartCount]="skeletonCharts()"
          [showTable]="skeletonTable()"
        />
      } @else if (error()) {
        <app-dashboard-error-state
          [title]="errorTitle()"
          [message]="errorMessage()"
          (retry)="retry.emit()"
        />
      } @else {
        <div class="dash-layout__insights">
          <ng-content select="[dashInsights]" />
        </div>
        <div class="dash-layout__kpis">
          <ng-content select="[dashKpis]" />
        </div>
        <div class="dash-layout__body">
          <ng-content />
        </div>
        <div class="dash-layout__activity">
          <ng-content select="[dashActivity]" />
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutComponent {
  readonly companyContext = inject(CompanyContextService);

  readonly title = input('');
  readonly subtitle = input('');
  readonly showHeader = input(true);
  readonly loading = input(false);
  readonly error = input(false);
  readonly errorTitle = input('Unable to load dashboard');
  readonly errorMessage = input('Please try again.');
  readonly lastUpdated = input<Date | string | null>(null);
  readonly refreshing = input(false);
  readonly showRefresh = input(true);
  readonly showExport = input(false);
  readonly showDateFilter = input(true);
  readonly datePreset = input('this_month');
  readonly skeletonKpis = input(4);
  readonly skeletonCharts = input(2);
  readonly skeletonTable = input(true);

  readonly refresh = output<void>();
  readonly exportClick = output<void>();
  readonly retry = output<void>();
  readonly dateRangeChange = output<DateRangeValue>();
}
