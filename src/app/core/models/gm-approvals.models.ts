/** GM Action Center payload from GET /core/dashboard/gm-approvals/ */

export interface GmApprovalItem {
  id: string;
  kind: string;
  module: string;
  title: string;
  subtitle: string;
  action_label: string;
  route: string;
  query_params: Record<string, string>;
  amount?: string | null;
  priority?: 'low' | 'medium' | 'high';
  created_at?: string | null;
}

export interface GmApprovalCategory {
  id: string;
  module: string;
  label: string;
  count: number;
  route: string;
  query_params: Record<string, string>;
  description: string;
}

export interface GmApprovalsSummary {
  purchase_requisitions: number;
  purchase_orders: number;
  payment_releases: number;
  staff_payments: number;
  damage_reports: number;
  stock_take_sessions: number;
  credit_notes: number;
  hod_leave_requests: number;
}

export interface GmApprovalsData {
  allowed: boolean;
  total: number;
  summary: GmApprovalsSummary;
  categories: GmApprovalCategory[];
  items: GmApprovalItem[];
  meta?: {
    company_id?: number | null;
    item_limit_per_type?: number;
  };
}
