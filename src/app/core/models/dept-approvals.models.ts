/** Department Action Center payload from GET /core/dashboard/dept-approvals/ */

export type DeptActionDepartment = 'sales' | 'finance' | 'inventory' | 'logistics';

export interface DeptApprovalItem {
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

export interface DeptApprovalCategory {
  id: string;
  module: string;
  label: string;
  count: number;
  route: string;
  query_params: Record<string, string>;
  description: string;
}

export interface DeptApprovalsData {
  allowed: boolean;
  department: DeptActionDepartment | string;
  total: number;
  summary: Record<string, number>;
  categories: DeptApprovalCategory[];
  items: DeptApprovalItem[];
}
