export type PaymentTerms = 'IMMEDIATE' | `NET_${number}`;
export type PRPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type PRStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type PRRequestType =
  | 'STOCK_REPLENISHMENT'
  | 'PRODUCTION'
  | 'CONSUMPTION'
  | 'EMERGENCY'
  | 'PROJECT';
export type GmReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type RFQStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'CANCELLED';
export type InvitationStatus = 'PENDING' | 'SENT' | 'ACKNOWLEDGED' | 'DECLINED';
export type RFQResponseStatus =
  | 'INVITED'
  | 'RESPONDED'
  | 'UNDER_REVIEW'
  | 'SELECTED'
  | 'REJECTED'
  | 'NO_RESPONSE'
  | 'PO_GENERATED';
export type ResponseCurrency = 'TZS' | 'USD' | 'CNY' | 'EUR' | 'AED' | 'INR';
export type Incoterm = 'EXW' | 'FOB' | 'CIF' | 'DDP';
export type QuotationStatus = 'PENDING' | 'SELECTED' | 'REJECTED';
export type PaymentMode = 'PREPAID' | 'POSTPAID' | 'PARTIAL' | 'COD';
export type PaymentReleaseStage = 'ADVANCE' | 'FINAL' | 'FULL';
export type PaymentReleaseStatus =
  | 'PENDING_FINANCE'
  | 'PENDING_GM'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'PAID'
  | 'RELEASED'
  | 'REJECTED';
export type ThreeWayMatchResult = 'PASSED' | 'FAILED' | 'PASSED_WITH_VARIANCE';
export type POStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'SENT'
  | 'PARTIAL'
  | 'RECEIVED'
  | 'AWAITING_DELIVERY'
  | 'CLOSED'
  | 'CANCELLED';
export type GRNStatus = 'DRAFT' | 'CONFIRMED' | 'POSTED';
export type GRNCondition = 'GOOD' | 'DAMAGED' | 'REJECTED';
export type InvoiceStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';

export interface Supplier {
  id: number;
  name: string;
  registration_number: string;
  tin_number: string;
  vat_number: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  is_international?: boolean;
  currency: number;
  currency_id: number;
  currency_code: string;
  payment_terms: PaymentTerms;
  rating: number;
  is_active: boolean;
  total_pos?: number;
  total_value?: number;
  last_order_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierFormData {
  name: string;
  registration_number: string;
  tin_number: string;
  vat_number: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  currency: number;
  payment_terms: PaymentTerms;
  rating: number;
}

export type PRLineType = 'INVENTORY' | 'MANUAL';

export interface PRItem {
  id?: number;
  line_type?: PRLineType;
  item: number | null;
  item_id?: number | null;
  item_name?: string;
  item_code?: string;
  line_label?: string;
  description?: string;
  unit_of_measure?: string;
  quantity_requested: number;
  unit_cost_estimate: number;
  total_estimate?: number;
  tax_rate?: number;
  approved_for_purchase?: boolean;
  notes: string;
}

export interface PurchaseRequisition {
  id: number;
  pr_number: string;
  company?: number | null;
  company_id?: number | null;
  company_code?: string | null;
  department: number;
  department_id: number;
  department_name: string;
  request_type: PRRequestType;
  warehouse?: number | null;
  warehouse_id?: number | null;
  warehouse_name?: string | null;
  required_date?: string | null;
  reason: string;
  initiated_by_role?: string;
  priority: PRPriority;
  status: PRStatus;
  payment_terms?: PaymentTerms;
  payment_mode?: PaymentMode;
  advance_percent?: number;
  notes: string;
  items: PRItem[];
  total_estimated: number;
  requested_by: number;
  requested_by_name: string;
  approved_by: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  hod_approved_by?: number | null;
  hod_approved_by_name?: string | null;
  hod_approved_at?: string | null;
  gm_override?: boolean;
  can_hod_approve?: boolean;
  can_gm_override?: boolean;
  can_edit?: boolean;
  rejection_reason: string;
  created_at: string;
  updated_at: string;
}

export interface PRFormData {
  department: number;
  request_type: PRRequestType;
  warehouse?: number | null;
  required_date?: string | null;
  reason: string;
  priority: PRPriority;
  payment_terms?: PaymentTerms;
  payment_mode?: PaymentMode;
  advance_percent?: number;
  notes: string;
  items: PRItem[];
}

export interface RFQSupplierInvite {
  id: number;
  supplier: number;
  supplier_name: string;
  supplier_email?: string;
  supplier_rating: number;
  supplier_country?: string;
  is_international?: boolean;
  invitation_status: InvitationStatus;
  invited_by?: number | null;
  invited_by_name?: string | null;
  invited_at?: string;
  response_status: RFQResponseStatus;
  has_response?: boolean;
  response_id?: number | null;
}

export interface SupplierResponse {
  id: number;
  rfq_id: number;
  invited_supplier_id: number;
  supplier_id: number;
  supplier_name: string;
  supplier_country: string;
  is_international: boolean;
  invitation_status: InvitationStatus;
  response_status: RFQResponseStatus;
  quoted_amount: number;
  currency: ResponseCurrency;
  exchange_rate_to_tzs: number | null;
  amount_in_tzs: number;
  delivery_days: number;
  incoterm: Incoterm | '';
  port_of_origin: string;
  quotation_date: string;
  payment_terms: PaymentTerms;
  payment_mode: PaymentMode;
  advance_percent: number;
  warranty: string;
  quotation_file: string | null;
  quotation_file_name: string | null;
  quotation_file_url: string | null;
  quotation_file_view_url: string | null;
  quotation_file_download_url: string | null;
  notes: string;
  submitted_by: number;
  submitted_by_name: string;
  submitted_at: string;
  updated_at: string;
  is_locked: boolean;
  can_edit: boolean;
  can_select: boolean;
  line_items?: SupplierResponseLineItem[];
}

export interface SupplierResponseLineItem {
  id?: number;
  pr_item_id: number;
  item_code?: string;
  item_name?: string;
  quantity_requested: number | string;
  unit_price: number | string;
  tax_rate?: number | string;
  line_total?: number | string;
}

export interface RFQComparisonRow {
  response_id: number;
  invited_supplier_id: number;
  supplier_id: number;
  supplier_name: string;
  supplier_country: string;
  is_international: boolean;
  quoted_amount: string;
  currency: ResponseCurrency;
  amount_in_tzs: string;
  delivery_days: number;
  warranty: string;
  payment_terms: PaymentTerms;
  payment_mode: PaymentMode;
  advance_percent: string;
  response_status: RFQResponseStatus;
  price_score: number;
  delivery_score: number;
  supplier_score: number;
  composite_score: number;
  rank: number;
  recommended: boolean;
}

export interface RFQComparisonResult {
  rfq_id: number;
  rows: RFQComparisonRow[];
}

export interface RFQItemAward {
  id: number;
  pr_item_id: number;
  item_code: string;
  item_name: string;
  quantity_requested: string;
  response_id: number;
  supplier_id: number;
  supplier_name: string;
  awarded_by_name: string;
  awarded_at: string;
}

export interface RFQItemAwardResult {
  rfq_id: number;
  is_multi_item: boolean;
  awards: RFQItemAward[];
}

export interface RFQItemAwardPayload {
  awards: { pr_item_id: number; response_id: number }[];
}

export interface RFQItemRecommendation {
  id: number;
  pr_item_id: number;
  item_code: string;
  item_name: string;
  quantity_requested: string;
  response_id: number;
  supplier_id: number;
  supplier_name: string;
  notes: string;
  recommended_by_name: string;
  recommended_at: string;
}

export interface RFQItemRecommendationResult {
  rfq_id: number;
  is_multi_item: boolean;
  recommendations: RFQItemRecommendation[];
}

export interface RFQItemRecommendationPayload {
  recommendations: { pr_item_id: number; response_id: number; notes?: string }[];
}

export interface SupplierResponseFormData {
  invited_supplier_id: number;
  quoted_amount: number;
  currency: ResponseCurrency;
  exchange_rate_to_tzs?: number | null;
  delivery_days: number;
  incoterm?: Incoterm | '';
  port_of_origin?: string;
  quotation_date: string;
  payment_terms: PaymentTerms;
  payment_mode: PaymentMode;
  advance_percent?: number;
  warranty?: string;
  notes?: string;
  quotation_file?: File | null;
  line_items?: { pr_item_id: number; unit_price: number; tax_rate?: number }[];
}

export interface RFQEmailDelivery {
  sender_email: string;
  sent_count: number;
  failed_count: number;
  results: {
    supplier: string;
    email: string;
    status: string;
    error_message?: string;
  }[];
}

export interface RFQ {
  id: number;
  rfq_number: string;
  requisition: number;
  requisition_id: number;
  pr_number: string;
  deadline: string;
  status: RFQStatus;
  notes: string;
  suppliers_count: number;
  invited_suppliers: RFQSupplierInvite[];
  items: PRItem[];
  created_by: number;
  created_by_name: string;
  email_delivery?: RFQEmailDelivery | null;
  created_at: string;
  updated_at: string;
}

export interface RFQFormData {
  requisition: number;
  deadline: string;
  supplier_ids: number[];
  notes: string;
}

export interface QuotationItem {
  id?: number;
  item: number;
  item_name?: string;
  item_code?: string;
  quantity: number;
  unit_price: number;
  total_price?: number;
}

export interface SupplierQuotation {
  id: number;
  quotation_number: string;
  rfq: number;
  rfq_number: string;
  supplier: number;
  supplier_name: string;
  quotation_date: string;
  valid_until: string;
  currency: number;
  currency_code: string;
  exchange_rate: number;
  delivery_days: number;
  total_amount: number;
  status: QuotationStatus;
  display_status?: string;
  display_status_label?: string;
  is_auto_generated?: boolean;
  can_select?: boolean;
  rfq_po_number?: string | null;
  rfq_po_id?: number | null;
  supplier_response_id?: number | null;
  has_quotation_file?: boolean;
  quotation_file_name?: string | null;
  quotation_file_view_url?: string | null;
  quotation_file_download_url?: string | null;
  incoterm?: string;
  payment_terms?: string;
  warranty?: string;
  quoted_amount?: number;
  amount_in_tzs?: number | null;
  notes: string;
  items: QuotationItem[];
  created_at: string;
  updated_at: string;
}

export interface QuotationFormData {
  quotation_number: string;
  rfq: number;
  supplier: number;
  quotation_date: string;
  valid_until: string;
  currency: number;
  exchange_rate: number;
  delivery_days: number;
  notes: string;
  items: QuotationItem[];
}

export interface POItem {
  id?: number;
  line_type?: PRLineType;
  item: number | null;
  item_id?: number | null;
  item_name?: string;
  item_code?: string;
  line_label?: string;
  description?: string;
  unit_of_measure?: string;
  quantity_ordered: number;
  quantity_received?: number;
  has_serial_number?: boolean;
  has_expiry_date?: boolean;
  unit_price: number;
  discount_percent: number;
  tax_rate?: number;
  total_price?: number;
}

export interface POGrnHistory {
  id: number;
  grn_number: string;
  received_date: string;
  status: GRNStatus;
  delivery_sequence?: number;
  is_final_delivery?: boolean;
}

export interface POClosureChecklistItem {
  key: string;
  label: string;
  met: boolean;
  required?: boolean;
}

export interface POClosureChecklist {
  po_id: number;
  po_number: string;
  payment_mode?: PaymentMode;
  can_close: boolean;
  items: POClosureChecklistItem[];
  line_receipts: {
    item_code: string;
    item_name: string;
    quantity_ordered: string;
    quantity_received: string;
    fulfilled: boolean;
  }[];
  fx_variance_tzs?: string | null;
}

export interface PaymentRelease {
  id: number;
  purchase_order: number;
  po_id?: number;
  po_number: string;
  po_total?: number;
  po_advance_percent?: number;
  supplier_name?: string;
  supplier_invoice: number | null;
  invoice_number?: string | null;
  payment_mode: PaymentMode;
  stage: PaymentReleaseStage;
  amount: number;
  currency: string;
  exchange_rate_to_tzs: number | null;
  amount_in_tzs: number;
  expected_stage_amount?: number;
  po_paid_amount?: number;
  po_remaining_amount?: number;
  requires_gm_review: boolean;
  finance_reviewed_by: number | null;
  finance_reviewed_by_name?: string | null;
  finance_reviewed_at: string | null;
  finance_review_notes?: string;
  po_verified?: boolean;
  gm_reviewed_by: number | null;
  gm_reviewed_by_name?: string | null;
  gm_reviewed_at: string | null;
  gm_review_notes: string;
  status: PaymentReleaseStatus;
  paid_by: number | null;
  paid_by_name?: string | null;
  paid_at: string | null;
  payment_method?: string;
  payment_reference?: string;
  payment_evidence?: string | null;
  payment_evidence_url?: string | null;
  released_by: number | null;
  released_at: string | null;
  rejection_reason: string;
  created_by: number;
  created_by_name: string;
  can_finance_verify?: boolean;
  can_gm_review?: boolean;
  can_execute_payment?: boolean;
  can_release?: boolean;
  gm_approval_required?: boolean;
  can_skip_gm?: boolean;
  payment_threshold_tzs?: number;
  created_at: string;
}

export interface PaymentReleaseFormData {
  purchase_order: number;
  stage: PaymentReleaseStage;
  amount: number;
  currency: string;
  exchange_rate_to_tzs?: number | null;
  supplier_invoice: number;
}

export interface ThreeWayMatchRecord {
  id: number;
  purchase_order: number;
  po_number: string;
  grn: number;
  grn_number: string;
  invoice: number | null;
  match_type: 'FULL' | 'COD_QUICK';
  quantity_match: string;
  price_match: string;
  result: ThreeWayMatchResult;
  po_amount_tzs: number;
  grn_amount_tzs: number;
  invoice_amount_tzs: number | null;
  tolerance_percent: number;
  checked_by: number;
  checked_by_name: string;
  checked_at: string;
  resolution_notes: string;
}

export interface GovernanceDashboardData {
  alerts: { id: number; audience: string; title: string; body: string; reference_type: string; reference_id: number | null; created_at: string }[];
  pending_gm_po_approvals: number;
  pending_gm_payment_reviews: number;
  pending_finance_payment_reviews: number;
  overdue_emergency_pos: number;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier: number;
  supplier_id: number;
  supplier_name: string;
  quotation: number | null;
  quotation_id: number | null;
  supplier_response_id?: number | null;
  requisition: number | null;
  pr_id: number | null;
  warehouse_id?: number | null;
  warehouse_name?: string | null;
  currency: number;
  currency_id: number;
  currency_code: string;
  exchange_rate: number;
  order_date: string;
  expected_delivery: string | null;
  payment_terms: PaymentTerms;
  payment_mode: PaymentMode;
  payment_mode_locked?: boolean;
  advance_percent?: number;
  expected_advance_amount?: number;
  expected_final_amount?: number;
  payment_paid_amount?: number;
  payment_committed_amount?: number;
  payment_remaining_amount?: number;
  payment_progress_percent?: number;
  payment_complete?: boolean;
  required_payment_stages?: PaymentReleaseStage[];
  amount_in_tzs?: number;
  requires_gm_approval?: boolean;
  hod_approved_at?: string | null;
  gm_approved_at?: string | null;
  is_emergency?: boolean;
  bypassed_rfq?: boolean;
  retroactive_justification?: string;
  retroactive_gm_approved_at?: string | null;
  cod_quick_match_passed?: boolean;
  can_hod_approve?: boolean;
  can_gm_approve?: boolean;
  has_active_token?: boolean;
  supplier_tracking_status?: string | null;
  can_receive_goods?: boolean;
  subtotal: number;
  tax_amount: number;
  apply_vat: boolean;
  total_amount: number;
  status: POStatus;
  notes: string;
  items: POItem[];
  approved_by: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  rejection_reason: string;
  created_by: number;
  created_by_name: string;
  grn_history: POGrnHistory[];
  created_at: string;
  updated_at: string;
}

export interface POFormData {
  supplier: number;
  quotation?: number | null;
  requisition?: number | null;
  currency: number;
  exchange_rate: number;
  order_date: string;
  expected_delivery?: string | null;
  payment_terms: PaymentTerms;
  payment_mode?: PaymentMode;
  advance_percent?: number;
  apply_vat: boolean;
  notes: string;
  items: POItem[];
}

export interface GRNItem {
  id?: number;
  po_item: number;
  item: number;
  item_id?: number;
  item_name?: string;
  item_code?: string;
  unit_of_measure?: string;
  has_serial_number?: boolean;
  has_expiry_date?: boolean;
  quantity_ordered?: number;
  quantity_previously_received?: number;
  quantity_received: number;
  quantity_damaged?: number;
  quantity_missing?: number;
  unit_cost: number;
  serial_number?: string | null;
  expiry_date?: string | null;
  condition: GRNCondition;
  notes: string;
}

export interface GoodsReceivedNote {
  id: number;
  grn_number: string;
  purchase_order: number;
  po_id: number;
  po_number: string;
  supplier_id: number;
  supplier_name: string;
  warehouse: number;
  warehouse_id: number;
  warehouse_name: string;
  received_date: string;
  received_by: number;
  received_by_name: string;
  status: GRNStatus;
  notes: string;
  delivery_sequence?: number;
  is_final_delivery?: boolean;
  discrepancy_notes?: string;
  items: GRNItem[];
  receipt_summary?: GRNReceiptSummary;
  created_at: string;
  updated_at: string;
}

export interface GRNReceiptSummary {
  line_count: number;
  total_good: string;
  total_damaged: string;
  total_missing: string;
  total_accounted: string;
  total_physical: string;
}

export interface GRNFormData {
  purchase_order: number;
  warehouse: number;
  received_date: string;
  notes: string;
  is_final_delivery?: boolean;
  discrepancy_notes?: string;
  items: GRNItem[];
}

export interface GRNConfirmResult {
  grn: GoodsReceivedNote;
  stock_updates: { item: string; quantity: string; warehouse: string; condition?: string }[];
  po_status: POStatus;
}

export interface InvoiceMatchDetails {
  matched: boolean;
  partial_delivery: boolean;
  amount_basis?: 'EX_VAT' | 'TOTAL';
  tolerance_percent: string;
  po_amount_tzs: string;
  grn_amount_tzs: string;
  invoice_amount_tzs: string;
  po_total: string;
  po_currency: string;
  grn_total: string;
  invoice_total: string;
  invoice_currency: string;
  checks: { label: string; passed: boolean; diff_percent: string }[];
  issues: string[];
}

export type FinanceDocumentApprovalStatus =
  | 'NOT_SUBMITTED'
  | 'PENDING_FINANCE_APPROVAL'
  | 'APPROVED'
  | 'REJECTED';

export interface SupplierInvoice {
  id: number;
  invoice_number: string;
  supplier: number;
  supplier_id: number;
  supplier_name: string;
  purchase_order: number;
  po_id: number;
  po_number: string;
  grn: number | null;
  grn_id: number | null;
  grn_number: string | null;
  is_proforma?: boolean;
  invoice_date: string;
  due_date: string;
  currency: number;
  currency_id: number;
  currency_code: string;
  exchange_rate: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  balance: number;
  total_amount_tzs?: number;
  balance_tzs?: number;
  three_way_matched: boolean;
  gm_review_status: GmReviewStatus;
  gm_reviewed_by?: number | null;
  gm_reviewed_by_name?: string | null;
  gm_reviewed_at?: string | null;
  gm_review_notes?: string;
  finance_approved_by?: number | null;
  finance_approved_by_name?: string | null;
  finance_approved_at?: string | null;
  can_gm_review?: boolean;
  can_pay?: boolean;
  approval_status?: FinanceDocumentApprovalStatus;
  approved_by?: number | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  submitted_by?: number | null;
  submitted_by_name?: string | null;
  submitted_at?: string | null;
  rejection_reason?: string;
  can_submit_for_finance_approval?: boolean;
  can_finance_approve?: boolean;
  status: InvoiceStatus;
  notes: string;
  invoice_document?: string | null;
  has_invoice_document?: boolean;
  invoice_document_name?: string | null;
  invoice_document_url?: string | null;
  po_amount: number;
  po_currency_code?: string;
  grn_amount: number | null;
  match_details?: InvoiceMatchDetails;
  created_at: string;
  updated_at: string;
}

export interface InvoiceFormData {
  invoice_number: string;
  supplier: number;
  purchase_order: number;
  grn?: number | null;
  is_proforma?: boolean;
  invoice_date: string;
  due_date: string;
  currency: number;
  exchange_rate: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes: string;
  invoice_document?: File | null;
}

export interface PaymentFormData {
  amount: number;
  payment_date: string;
  payment_method: string;
  reference: string;
  bank: string;
  proof_document?: File | null;
}

export interface Department {
  id: number;
  name: string;
}

export interface ProcurementDashboardActivity {
  type: 'REQUISITION' | 'PURCHASE_ORDER' | 'GRN';
  reference: string;
  status: string;
  detail: string;
  amount: string | null;
  created_at: string;
  created_by_name: string | null;
}

export interface ProcurementDashboardData {
  company_id?: number | null;
  total_suppliers: number;
  pending_requisitions: number;
  draft_requisitions?: number;
  approved_requisitions: number;
  open_rfqs: number;
  pending_quotations: number;
  pending_po_approvals: number;
  open_purchase_orders: number;
  pending_grn: number;
  grn_today: number;
  pending_invoices: number;
  overdue_invoices: number;
  pending_gm_review?: number;
  pending_payment?: number;
  monthly_spend: string;
  monthly_po_count: number;
  po_status_breakdown: { status: string; count: number }[];
  monthly_chart: { month: string; spend: string; po_count: number }[];
  top_suppliers: { name: string; total: string; order_count: number }[];
  recent_activities: ProcurementDashboardActivity[];
}
