export type Gender = 'MALE' | 'FEMALE';
export type EmploymentType = 'PERMANENT' | 'CONTRACT' | 'CASUAL';
export type EmployeeStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';
export type PaymentFrequency = 'MONTHLY' | 'WEEKLY';
export type AppraisalRating = 'EXCELLENT' | 'GOOD' | 'SATISFACTORY' | 'NEEDS_IMPROVEMENT';
export type DocumentType = 'CONTRACT' | 'NIN' | 'CERTIFICATE' | 'OTHER';

export interface AllowanceBreakdown {
  name: string;
  amount: string;
  is_taxable: boolean;
}

export interface EmployeeAllowance {
  id?: number;
  name: string;
  amount: string;
  is_taxable: boolean;
  effective_date?: string;
  is_active?: boolean;
}

export interface EmployeeDocument {
  id: number;
  doc_type: DocumentType;
  name: string;
  file_url: string;
  expiry_date: string | null;
  is_expired: boolean;
  is_active: boolean;
}

export interface EmployeeListItem {
  id: number;
  employee_number: string;
  full_name: string;
  first_name: string;
  last_name: string;
  department_id: number;
  department_name: string;
  job_title: string;
  employment_type: EmploymentType;
  contract_end: string | null;
  basic_salary: string;
  currency_code: string;
  status: EmployeeStatus;
  is_active: boolean;
  profile_photo: string;
  phone: string;
  national_id: string;
  reports_to_name: string | null;
}

export interface Employee {
  id: number;
  employee_number: string;
  user_id: number | null;
  first_name: string;
  last_name: string;
  full_name: string;
  gender: Gender;
  date_of_birth: string | null;
  national_id: string;
  tin_number: string;
  nssf_number: string;
  nhif_number: string;
  paye_applicable: boolean;
  phone: string;
  personal_email: string;
  work_email: string;
  address: string;
  city: string;
  profile_photo: string;
  department: number;
  department_name: string;
  job_title: string;
  employment_type: EmploymentType;
  contract_start: string | null;
  contract_end: string | null;
  probation_end: string | null;
  reports_to: number | null;
  reports_to_name: string | null;
  basic_salary: string;
  currency: number;
  currency_code: string;
  payment_frequency: PaymentFrequency;
  bank_name: string;
  bank_account: string;
  bank_account_name: string;
  bank_branch: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_phone: string;
  emergency_contact_address: string;
  status: EmployeeStatus;
  is_active: boolean;
  create_user_account: boolean;
  allowances: EmployeeAllowance[];
  documents: EmployeeDocument[];
  leave_balances: LeaveBalance[];
  created_at: string;
  updated_at: string;
}

export interface EmployeeFormData {
  first_name: string;
  last_name: string;
  gender?: Gender;
  date_of_birth?: string | null;
  national_id?: string;
  tin_number?: string;
  nssf_number?: string;
  nhif_number?: string;
  paye_applicable?: boolean;
  phone?: string;
  personal_email?: string;
  work_email?: string;
  address?: string;
  city?: string;
  profile_photo?: string;
  department: number;
  job_title: string;
  employment_type: EmploymentType;
  contract_start?: string | null;
  contract_end?: string | null;
  probation_end?: string | null;
  reports_to?: number | null;
  basic_salary: string | number;
  currency: number;
  payment_frequency?: PaymentFrequency;
  bank_name?: string;
  bank_account?: string;
  bank_account_name?: string;
  bank_branch?: string;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;
  emergency_contact_address?: string;
  status?: EmployeeStatus;
  create_user_account?: boolean;
  allowances?: { name: string; amount: string; is_taxable: boolean }[];
}

export interface LeaveType {
  id: number;
  name: string;
  code: string;
  days_entitled: number;
  is_paid: boolean;
  carry_forward: boolean;
  description: string;
  is_active: boolean;
}

export interface LeaveTypeFormData {
  name: string;
  code: string;
  days_entitled: number;
  is_paid: boolean;
  carry_forward: boolean;
  description: string;
}

export interface AllowanceConfig {
  id: number;
  name: string;
  amount: string;
  is_taxable: boolean;
  department: number | null;
  department_name: string | null;
  effective_date: string;
  end_date: string | null;
  is_active: boolean;
}

export interface AllowanceFormData {
  name: string;
  amount: string;
  is_taxable: boolean;
  department: number | null;
  effective_date: string;
  end_date: string | null;
}

export type AppraisalPeriod = 'QUARTER' | 'ANNUAL';
export type AppraisalStatus = 'SCHEDULED' | 'COMPLETED';

export interface Appraisal {
  id: number;
  employee: number;
  employee_name: string;
  department_name: string;
  period: AppraisalPeriod;
  period_label: string;
  score: number | null;
  rating: string;
  reviewer: number | null;
  reviewer_name: string | null;
  strengths: string;
  improvements: string;
  goals: string;
  comments: string;
  employee_acknowledged: boolean;
  status: AppraisalStatus;
  scheduled_date: string;
  completed_at: string | null;
}

export interface AppraisalScheduleData {
  employee: number;
  period: AppraisalPeriod;
  period_label: string;
  scheduled_date: string;
  reviewer: number | null;
}

export interface AppraisalCompleteData {
  score: number;
  strengths: string;
  improvements: string;
  goals: string;
  comments: string;
  employee_acknowledged: boolean;
}

export type DisciplinaryType =
  | 'VERBAL_WARNING'
  | 'WRITTEN_WARNING'
  | 'FINAL_WARNING'
  | 'SUSPENSION'
  | 'TERMINATION';

export interface DisciplinaryRecord {
  id: number;
  employee: number;
  employee_name: string;
  incident_date: string;
  record_type: DisciplinaryType;
  description: string;
  action_taken: string;
  issued_by: number | null;
  issued_by_name: string | null;
  witness: string;
  employee_acknowledged: boolean;
  is_confidential: boolean;
  created_at: string;
}

export interface DisciplinaryFormData {
  employee: number;
  incident_date: string;
  record_type: DisciplinaryType;
  description: string;
  action_taken: string;
  witness: string;
  employee_acknowledged: boolean;
}

export interface CompanyProfile {
  id: number;
  company_name: string;
  tin: string;
  vat_number: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo_url: string;
}

export interface WorkingHoursConfig {
  id: number;
  hours_per_day: string;
  working_days: string;
  is_active: boolean;
}

export interface PublicHoliday {
  id: number;
  name: string;
  date: string;
  is_variable: boolean;
  year: number;
  is_active: boolean;
}

export interface PublicHolidayFormData {
  name: string;
  date: string;
  is_variable: boolean;
  year: number;
}

export interface EmployeeOption {
  id: number;
  employee_number: string;
  full_name: string;
  department_name: string;
  job_title: string;
  status: string;
}

export interface HrDashboard {
  total_employees: number;
  present_today: number;
  on_leave_today: number;
  new_joiners_month: number;
  resignations_month: number;
  pending_leave_requests: number;
  employees_by_department: { department: string; count: number }[];
  employment_type_breakdown: { type: string; count: number }[];
  attendance_summary: {
    department: string;
    total: number;
    present: number;
    absent: number;
    on_leave: number;
    late: number;
  }[];
  alerts: {
    type: string;
    severity: string;
    employee_id: number;
    employee_name: string;
    message: string;
    date: string;
    days_remaining: number;
  }[];
  upcoming_events: { title: string; date: string; type: string }[];
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE';

export interface Attendance {
  id: number;
  employee: number;
  employee_name: string;
  department_name: string;
  date: string;
  time_in: string | null;
  time_out: string | null;
  hours_worked: string;
  status: AttendanceStatus;
  notes: string;
}

export interface AttendanceFormData {
  employee: number;
  date: string;
  time_in?: string | null;
  time_out?: string | null;
  hours_worked?: number | string;
  status?: AttendanceStatus;
  notes?: string;
}

export interface AttendanceBulkRecord {
  employee: number;
  date: string;
  status: AttendanceStatus;
  time_in?: string | null;
  time_out?: string | null;
  hours_worked?: number;
  notes?: string;
}

export interface MonthlyAttendanceSummary {
  employee_id: number;
  employee_name: string;
  working_days: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  attendance_percent: number;
}

export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface LeaveRequest {
  id: number;
  employee: number;
  employee_name: string;
  department_name: string;
  leave_type: number;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason: string;
  medical_certificate: string;
  status: LeaveRequestStatus;
  approved_by_name: string | null;
  approved_at: string | null;
  rejection_reason: string;
  created_at: string;
}

export interface LeaveRequestFormData {
  employee: number;
  leave_type: number;
  start_date: string;
  end_date: string;
  reason: string;
  medical_certificate?: string;
}

export interface LeaveBalance {
  leave_type_id: number;
  leave_type_name: string;
  days_entitled: number;
  days_used: number;
  days_remaining: number;
  is_paid: boolean;
}

export interface EmployeeLeaveBalances {
  employee_id: number;
  employee_name: string;
  department_name: string;
  balances: LeaveBalance[];
}

export interface LeaveCalendarEntry {
  employee_name: string;
  leave_type: string;
  leave_type_code: string;
  start_date: string;
  end_date: string;
}

export type PayrollStatus = 'DRAFT' | 'REVIEWED' | 'APPROVED' | 'PAID';

export interface PayrollItem {
  id: number;
  employee: number;
  employee_name: string;
  employee_number: string;
  department_name: string;
  basic_salary: string;
  allowances: AllowanceBreakdown[];
  total_allowances: string;
  gross_salary: string;
  nssf_employee: string;
  nssf_employer: string;
  paye: string;
  nhif: string;
  other_deductions: string;
  total_deductions: string;
  net_salary: string;
}

export interface PayrollItemUpdateData {
  item_id: number;
  basic_salary?: number | string;
  other_deductions?: number | string;
}

export interface Payroll {
  id: number;
  payroll_number: string;
  period_month: number;
  period_year: number;
  period_display: string;
  department: number | null;
  department_name: string | null;
  total_employees: number;
  total_gross: string;
  total_nssf_employee: string;
  total_nssf_employer: string;
  total_paye: string;
  total_nhif: string;
  total_deductions: string;
  total_net: string;
  status: PayrollStatus;
  items: PayrollItem[];
  processed_by_name: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface PayrollGenerateData {
  period_month: number;
  period_year: number;
  department?: number | null;
}

export interface AttendanceVerification {
  total: number;
  verified: number;
  complete: boolean;
}

export interface Payslip {
  id: number;
  employee: number;
  employee_name: string;
  employee_number: string;
  department_name: string;
  job_title: string;
  tin_number: string;
  nssf_number: string;
  bank_name: string;
  bank_account: string;
  period_display: string;
  basic_salary: string;
  allowances: AllowanceBreakdown[];
  total_allowances: string;
  gross_salary: string;
  nssf_employee: string;
  paye: string;
  nhif: string;
  other_deductions: string;
  total_deductions: string;
  net_salary: string;
  nssf_employer: string;
}
