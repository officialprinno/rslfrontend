export type StaffPaymentRequestType = 'ADVANCE' | 'REIMBURSEMENT';
export type StaffPaymentMethod = 'CASH' | 'BANK_TRANSFER';

export type StaffPaymentOverallStatus =
  | 'DRAFT'
  | 'PENDING_HOD_APPROVAL'
  | 'PENDING_GM_APPROVAL'
  | 'PENDING_FINANCE_APPROVAL'
  | 'APPROVED'
  | 'PAID'
  | 'LIQUIDATION_PENDING'
  | 'LIQUIDATION_SUBMITTED'
  | 'CLOSED'
  | 'REJECTED';

export type StaffPaymentQueue =
  | 'my'
  | 'hod'
  | 'gm'
  | 'finance'
  | 'payment'
  | 'liquidation'
  | 'history'
  | 'all';

export interface PaymentRequestCategory {
  id: number;
  name: string;
  description: string;
  company: number | null;
  company_code: string | null;
  spending_limit: string | null;
  requires_receipt: boolean;
  gl_account: number | null;
  gl_account_code: string | null;
  gl_account_name: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentRequestCategoryFormData {
  name: string;
  description?: string;
  company?: number | null;
  spending_limit?: string | null;
  requires_receipt?: boolean;
  gl_account?: number | null;
  sort_order?: number;
  is_active?: boolean;
}

export interface StaffPaymentAttachment {
  id: number;
  file: string;
  file_url: string | null;
  file_type: string;
  attachment_stage: 'SUBMISSION' | 'LIQUIDATION';
  description: string;
  uploaded_by: number | null;
  uploaded_by_name: string | null;
  uploaded_at: string;
}

export interface StaffPaymentRequest {
  id: number;
  request_number: string;
  request_type: StaffPaymentRequestType;
  request_type_display: string;
  requested_by: number;
  requested_by_name: string;
  department: number;
  department_name: string;
  category: number | null;
  category_detail: {
    id: number;
    name: string;
    spending_limit: string | null;
    requires_receipt: boolean;
    gl_account_id: number | null;
  } | null;
  amount: string;
  currency: number;
  currency_code: string;
  purpose: string;
  activity_date: string;
  payment_method: StaffPaymentMethod;
  payment_method_display: string;
  bank_account_details: string;
  requires_escalation: boolean;
  escalation_reason: string;
  routing_notes: string;
  hod_approval_status: string;
  finance_approval_status: string;
  gm_approval_status: string;
  hod_rejection_reason: string;
  finance_rejection_reason: string;
  gm_rejection_reason: string;
  gl_account_selected: number | null;
  gl_account_code: string | null;
  gl_account_name: string | null;
  overall_status: StaffPaymentOverallStatus;
  overall_status_display: string;
  paid_at: string | null;
  payment_reference: string;
  journal_entry_number: string | null;
  liquidation_deadline: string | null;
  liquidation_submitted_at: string | null;
  liquidation_notes: string;
  liquidation_journal_entry_number: string | null;
  attachments: StaffPaymentAttachment[];
  company: number;
  created_at: string;
  updated_at: string;
}

export interface StaffPaymentRequestFormData {
  request_type: StaffPaymentRequestType;
  category_id: number;
  amount: number;
  purpose: string;
  activity_date: string;
  payment_method: StaffPaymentMethod;
  bank_account_details?: string;
  attachments?: File[];
}
