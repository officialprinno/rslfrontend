/** Shared types for enterprise dashboard widgets. */

export type DashboardTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

export type TrendDirection = 'up' | 'down' | 'flat';

export interface DashboardInsight {
  id: string;
  message: string;
  tone?: DashboardTone;
  route?: string | string[];
  queryParams?: Record<string, string>;
}

export interface DashboardKpi {
  id: string;
  label: string;
  value: string | number;
  icon?: DashboardKpiIcon;
  trend?: number | null;
  trendLabel?: string;
  comparison?: string;
  tone?: DashboardTone;
  route?: string | string[];
  queryParams?: Record<string, string>;
  tooltip?: string;
}

export type DashboardKpiIcon =
  | 'revenue'
  | 'expense'
  | 'pending'
  | 'completed'
  | 'overdue'
  | 'inventory'
  | 'people'
  | 'delivery'
  | 'alert'
  | 'chart'
  | 'document'
  | 'custom';

export interface DashboardActivityItem {
  id: string | number;
  title: string;
  subtitle?: string;
  timestamp?: string;
  tone?: DashboardTone;
  route?: string | string[];
  queryParams?: Record<string, string>;
}

export interface DashboardApprovalItem {
  id: string | number;
  title: string;
  subtitle?: string;
  amount?: string;
  priority?: 'low' | 'medium' | 'high';
  route?: string | string[];
  queryParams?: Record<string, string>;
}

export interface DateRangeValue {
  startDate: string;
  endDate: string;
  preset?: string;
}

export interface DashboardMeta {
  start_date: string;
  end_date: string;
  generated_at?: string;
  company_id?: number;
  company_code?: string;
  company_label?: string;
  company_scope?: 'single' | 'consolidated' | 'unknown';
  warehouse_id?: number;
  [key: string]: unknown;
}

export interface DashboardApiEnvelope<
  TSummary = Record<string, unknown>,
  TCharts = Record<string, unknown>,
  TActivity = Record<string, unknown>,
> {
  summary: TSummary;
  charts: TCharts;
  activity: TActivity;
  meta?: DashboardMeta;
}

export interface DashboardApiParams {
  start_date?: string;
  end_date?: string;
  company_id?: number;
  warehouse?: number;
  department?: string;
}

export interface DashboardDatePreset {
  id: string;
  label: string;
}

export interface DashboardTableColumn<T = Record<string, unknown>> {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  mono?: boolean;
}

export type DashboardLoadState = 'idle' | 'loading' | 'success' | 'error' | 'empty';
