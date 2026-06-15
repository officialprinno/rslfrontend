export type PaymentTerms = 'IMMEDIATE' | 'NET_15' | 'NET_30' | 'NET_60';
export type PRPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type PRStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type RFQStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';
export type QuotationStatus = 'PENDING' | 'SELECTED' | 'REJECTED';
export type POStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'SENT'
  | 'PARTIAL'
  | 'RECEIVED'
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

export interface PRItem {
  id?: number;
  item: number;
  item_id?: number;
  item_name?: string;
  item_code?: string;
  quantity_requested: number;
  unit_cost_estimate: number;
  total_estimate?: number;
  notes: string;
}

export interface PurchaseRequisition {
  id: number;
  pr_number: string;
  department: number;
  department_id: number;
  department_name: string;
  priority: PRPriority;
  status: PRStatus;
  notes: string;
  items: PRItem[];
  total_estimated: number;
  requested_by: number;
  requested_by_name: string;
  approved_by: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  rejection_reason: string;
  created_at: string;
  updated_at: string;
}

export interface PRFormData {
  department: number;
  priority: PRPriority;
  notes: string;
  items: PRItem[];
}

export interface RFQSupplierInvite {
  id: number;
  supplier: number;
  supplier_name: string;
  supplier_rating: number;
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
  item: number;
  item_id?: number;
  item_name?: string;
  item_code?: string;
  quantity_ordered: number;
  quantity_received?: number;
  has_serial_number?: boolean;
  has_expiry_date?: boolean;
  unit_price: number;
  discount_percent: number;
  total_price?: number;
}

export interface POGrnHistory {
  id: number;
  grn_number: string;
  received_date: string;
  status: GRNStatus;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier: number;
  supplier_id: number;
  supplier_name: string;
  quotation: number | null;
  quotation_id: number | null;
  requisition: number | null;
  pr_id: number | null;
  currency: number;
  currency_id: number;
  currency_code: string;
  exchange_rate: number;
  order_date: string;
  expected_delivery: string | null;
  payment_terms: PaymentTerms;
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
  has_serial_number?: boolean;
  has_expiry_date?: boolean;
  quantity_ordered?: number;
  quantity_previously_received?: number;
  quantity_received: number;
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
  items: GRNItem[];
  created_at: string;
  updated_at: string;
}

export interface GRNFormData {
  purchase_order: number;
  warehouse: number;
  received_date: string;
  notes: string;
  items: GRNItem[];
}

export interface GRNConfirmResult {
  grn: GoodsReceivedNote;
  stock_updates: { item: string; quantity: string; warehouse: string }[];
  po_status: POStatus;
}

export interface SupplierInvoice {
  id: number;
  invoice_number: string;
  supplier: number;
  supplier_id: number;
  supplier_name: string;
  purchase_order: number;
  po_id: number;
  po_number: string;
  grn: number;
  grn_id: number;
  grn_number: string;
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
  three_way_matched: boolean;
  status: InvoiceStatus;
  notes: string;
  po_amount: number;
  grn_amount: number;
  created_at: string;
  updated_at: string;
}

export interface InvoiceFormData {
  invoice_number: string;
  supplier: number;
  purchase_order: number;
  grn: number;
  invoice_date: string;
  due_date: string;
  currency: number;
  exchange_rate: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes: string;
}

export interface PaymentFormData {
  amount: number;
  payment_date: string;
  payment_method: string;
  reference: string;
  bank: string;
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
  total_suppliers: number;
  pending_requisitions: number;
  approved_requisitions: number;
  open_rfqs: number;
  pending_quotations: number;
  pending_po_approvals: number;
  open_purchase_orders: number;
  pending_grn: number;
  grn_today: number;
  pending_invoices: number;
  overdue_invoices: number;
  monthly_spend: string;
  monthly_po_count: number;
  po_status_breakdown: { status: string; count: number }[];
  monthly_chart: { month: string; spend: string; po_count: number }[];
  top_suppliers: { name: string; total: string; order_count: number }[];
  recent_activities: ProcurementDashboardActivity[];
}
