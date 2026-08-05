/** API response envelope from Django backend. */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  errors: Record<string, string[]> | string[] | null;
  warning?: string | null;
  warnings?: unknown[] | null;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginResponseData {
  tokens: AuthTokens;
  user: User;
}

export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'query';

export interface Permission {
  id?: number;
  module: string;
  action: PermissionAction;
  role?: number;
  is_active?: boolean;
  created_at?: string;
}

export interface Role {
  id: number;
  name: string;
  department: number | null;
  department_name?: string;
  permissions?: Permission[];
  is_active: boolean;
}

export interface UserDepartmentAssignment {
  department_id: number;
  department_name: string;
  role_id: number;
  role: string;
  role_name: string;
  is_primary: boolean;
}

export interface UserCompanyAssignment {
  company_id: number;
  company_code: string;
  company_name: string;
  company_type: 'MANUFACTURING' | 'TRADING';
  brand_color: string;
  logo: string | null;
  default_company: boolean;
  is_active: boolean;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  profile_photo: string | null;
  department: number | null;
  department_name: string | null;
  role: number | null;
  role_name: string | null;
  is_multi_department?: boolean;
  primary_department?: string | null;
  departments?: UserDepartmentAssignment[];
  companies?: UserCompanyAssignment[];
  primary_company_id?: number | null;
  is_multi_company?: boolean;
  permissions?: Permission[];
  modules?: string[];
  is_active: boolean;
  is_staff: boolean;
  employee_id?: number | null;
  employee_name?: string | null;
  language?: 'en' | 'sw';
  theme?: 'dark' | 'light';
  password_change_required?: boolean;
  password_change_deadline?: string | null;
  password_change_overdue?: boolean;
  password_change_days_left?: number | null;
  created_at: string;
  updated_at: string;
}

/** Super-admin credential export row. */
export interface UserCredential {
  id: number;
  full_name: string;
  email: string;
  role_name: string | null;
  password: string;
  is_active: boolean;
}

export interface UserDepartmentWrite {
  department: number;
  role: number;
  is_primary: boolean;
}

export interface UserCompanyWrite {
  company: number;
  default_company: boolean;
}

export interface UserWritePayload {
  email?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  department?: number | null;
  role?: number | null;
  is_active?: boolean;
  is_multi_department?: boolean;
  department_assignments?: UserDepartmentWrite[];
  company_assignments?: UserCompanyWrite[];
}

export interface CreateUserFromEmployeePayload {
  employee: number;
  email?: string;
  password: string;
  role: number;
  is_active?: boolean;
  department_assignments?: UserDepartmentWrite[];
  company_assignments?: UserCompanyWrite[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RouteAccessData {
  roles?: string[];
  module?: string;
  action?: PermissionAction;
}

export type DepartmentFilter = 'all' | 'procurement' | 'sales' | 'logistics' | 'inventory';

export interface MultiDeptDashboardData {
  is_multi_department: boolean;
  department_filter: string;
  procurement: {
    pending_pos: number;
    suppliers: number;
    grns_today: number;
  } | null;
  sales: {
    open_orders: number;
    quotations: number;
    invoices: number;
  } | null;
  logistics: {
    active_dos: number;
    in_transit: number;
    vehicles: number;
  } | null;
  inventory: {
    low_stock: number;
    total_items: number;
    alerts: number;
    health_score?: number;
    pending_approvals?: number;
    store_under?: string;
    low_stock_queue?: number;
  } | null;
}
