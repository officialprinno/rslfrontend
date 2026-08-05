/**
 * Enterprise dashboard component library — standalone, tree-shakeable imports.
 *
 * @example
 * import { DashboardLayoutComponent, KpiCardComponent } from '@app/shared/dashboard';
 */

// Layout & shell
export { DashboardLayoutComponent } from './components/dashboard-layout/dashboard-layout.component';
export { DashboardHeaderComponent } from './components/dashboard-header/dashboard-header.component';
export { DashboardToolbarComponent } from './components/dashboard-toolbar/dashboard-toolbar.component';
export { DashboardSectionComponent } from './components/dashboard-section/dashboard-section.component';
export { DashboardWidgetComponent } from './components/dashboard-widget/dashboard-widget.component';

// KPIs & metrics
export { KpiCardComponent } from './components/kpi-card/kpi-card.component';
export { MetricTrendComponent } from './components/metric-trend/metric-trend.component';
export { InsightBannerComponent } from './components/insight-banner/insight-banner.component';

// Charts
export { ChartCardComponent } from './components/chart-card/chart-card.component';
export { ChartCardDeferredComponent } from './components/chart-card-deferred/chart-card-deferred.component';
export { ChartContainerComponent } from './components/chart-container/chart-container.component';

// Data displays
export { ActivityFeedComponent } from './components/activity-feed/activity-feed.component';
export { ApprovalQueueComponent } from './components/approval-queue/approval-queue.component';
export { DeptActionCenterComponent } from './components/dept-action-center/dept-action-center.component';
export { DashboardTableComponent } from './components/dashboard-table/dashboard-table.component';

// Filters
export { DateRangeFilterComponent } from './components/date-range-filter/date-range-filter.component';

// States
export { DashboardSkeletonComponent } from './components/dashboard-skeleton/dashboard-skeleton.component';
export { DashboardEmptyStateComponent } from './components/dashboard-empty-state/dashboard-empty-state.component';
export { DashboardErrorStateComponent } from './components/dashboard-error-state/dashboard-error-state.component';
export { WidgetLoaderComponent } from './components/widget-loader/widget-loader.component';

// Types & utilities
export * from './models/dashboard.types';
export { DEFAULT_DATE_PRESETS, formatDateRangeLabel, resolveDatePreset } from './utils/date-range.util';
export { kpiIconPath, toneClasses } from './utils/dashboard-icons.util';
export {
  dashboardHttpParams,
  flattenDashboard,
  isDashboardEnvelope,
} from './utils/dashboard-response.util';
export { setupDashboardCompanyReload } from './utils/dashboard-company-scope.util';
export { DashboardCacheService } from './services/dashboard-cache.service';
