export type AuditLogStatus = 'SUCCESS' | 'FAILED';

export interface AuditLogEntry {
  id: number;
  user: number | null;
  user_name: string | null;
  user_email?: string | null;
  company: number | null;
  company_name: string | null;
  department: number | null;
  department_name: string | null;
  module: string;
  action: string;
  record_id: string;
  status: AuditLogStatus;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface AuditLogListParams {
  page?: number;
  page_size?: number;
  search?: string;
  module?: string;
  action?: string;
  status?: AuditLogStatus | '';
  user?: number | '';
  date_from?: string;
  date_to?: string;
  ordering?: string;
}
