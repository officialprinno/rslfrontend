export type PaymentTerms = 'IMMEDIATE' | 'NET_15' | 'NET_30' | 'NET_60';
export type MineType = 'UNDERGROUND' | 'OPEN_PIT' | 'BOTH';
export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
export type SOStatus =
  | 'NEW_ORDER'
  | 'STOCK_VERIFICATION'
  | 'OUT_OF_STOCK'
  | 'PENDING_DELIVERY_COST'
  | 'DELIVERY_COST_CALC'
  | 'QUOTATION_PREP'
  | 'QUOTATION_SENT'
  | 'WAITING_CUSTOMER'
  | 'QUOTATION_ACCEPTED'
  | 'QUOTATION_REJECTED'
  | 'INVOICE_GENERATED'
  | 'AWAITING_PAYMENT'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_FAILED'
  | 'READY_FOR_PICKUP'
  | 'READY_FOR_DELIVERY'
  | 'VEHICLE_ASSIGNED'
  | 'THIRD_PARTY_ASSIGNED'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'DELIVERY_CONFIRMED'
  | 'COMPLETED_PICKUP'
  | 'COMPLETED_COMPANY'
  | 'COMPLETED_THIRD_PARTY'
  | 'CANCELLED'
  | 'DRAFT'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'PARTIAL';

export type InventoryStatus = 'NONE' | 'RESERVED' | 'LOCKED' | 'RELEASED';
export type SODeliveryMethod = 'PICKUP' | 'COMPANY' | 'THIRD_PARTY';
export type DeliveryStatus = 'PENDING' | 'PROCESSING' | 'PARTIAL' | 'DELIVERED' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PARTIAL' | 'PAID' | 'OVERDUE';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'MOBILE';
export type CreditNoteStatus = 'DRAFT' | 'APPROVED' | 'APPLIED';

export interface Customer {
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
  mine_name: string;
  mine_location: string;
  mine_type: MineType;
  contact_person: string;
  contact_phone: string;
  currency: number;
  currency_id: number;
  currency_code: string;
  credit_limit: number;
  credit_balance: number;
  payment_terms: PaymentTerms;
  is_active: boolean;
  total_orders?: number;
  total_invoiced?: number;
  total_paid?: number;
  outstanding_balance?: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerFormData {
  name: string;
  registration_number?: string;
  tin_number: string;
  vat_number?: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  country: string;
  mine_name: string;
  mine_location?: string;
  mine_type: MineType;
  contact_person?: string;
  contact_phone?: string;
  currency: number;
  credit_limit: number;
  payment_terms: PaymentTerms;
  is_active?: boolean;
}

export interface QuotationItem {
  id?: number;
  item: number;
  item_id?: number;
  item_code?: string;
  item_name?: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  total_price?: number;
}

export interface Quotation {
  id: number;
  quotation_number: string;
  customer: number;
  customer_id: number;
  customer_name: string;
  mine_name: string;
  currency: number;
  currency_id: number;
  currency_code: string;
  exchange_rate: number;
  valid_until: string;
  status: QuotationStatus;
  apply_vat: boolean;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  delivery_cost: number;
  notes: string;
  terms_conditions: string;
  items: QuotationItem[];
  is_expired?: boolean;
  has_sales_order?: boolean;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface QuotationFormData {
  customer: number;
  currency: number;
  exchange_rate: number;
  valid_until: string;
  apply_vat: boolean;
  notes?: string;
  terms_conditions?: string;
  delivery_cost?: number;
  items: QuotationItem[];
}

export interface SOItem {
  id?: number;
  item: number;
  item_id?: number;
  item_code?: string;
  item_name?: string;
  quantity_ordered: number;
  quantity_delivered?: number;
  quantity_reserved?: number;
  stock_available_snapshot?: number | null;
  unit_price: number;
  discount_percent: number;
  total_price?: number;
  stock_available?: number;
}

export interface SOActivity {
  id: number;
  action: string;
  previous_status?: string;
  new_status?: string;
  details: string;
  remarks?: string;
  user_name: string | null;
  created_at: string;
}

export interface SODeliveryCost {
  delivery_distance_km: number;
  transport_method: string;
  vehicle_type: string;
  fuel_cost: number;
  loading_cost: number;
  offloading_cost: number;
  additional_charges: number;
  total_delivery_cost: number;
  notes: string;
}

export interface SODispatchAssignment {
  assignment_type: string;
  vehicle: number | null;
  vehicle_registration?: string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_type?: string | null;
  driver: number | null;
  driver_name?: string | null;
  driver_license?: string | null;
  driver_phone?: string;
  dispatch_date?: string | null;
  transport_company?: string;
  tracking_number?: string;
  contact_person?: string;
  contact_phone?: string;
}

export interface SOPaymentProof {
  id: number;
  amount: number;
  payment_method: PaymentMethod;
  reference_number: string;
  proof_notes: string;
  status: string;
  verified_at: string | null;
  failure_reason: string;
  created_at: string;
}

export interface SOStockCheckLine {
  item_id: number;
  item_code: string;
  item_name: string;
  quantity_ordered: string;
  quantity_on_hand: string;
  quantity_reserved: string;
  quantity_available: string;
  shortfall: string;
  sufficient: boolean;
}

export interface SOStockCheck {
  warehouse_id: number;
  warehouse_name: string;
  all_available: boolean;
  lines: SOStockCheckLine[];
}

export interface SalesOrder {
  id: number;
  so_number: string;
  customer: number;
  customer_id: number;
  customer_name: string;
  quotation: number | null;
  quotation_id: number | null;
  lpo_number: string;
  lpo_date: string | null;
  currency: number;
  currency_id: number;
  currency_code: string;
  exchange_rate: number;
  delivery_date: string;
  delivery_address: string;
  requested_delivery_location?: string;
  fulfillment_warehouse?: number | null;
  warehouse_id?: number | null;
  warehouse_name?: string | null;
  status: SOStatus;
  inventory_status?: InventoryStatus;
  delivery_method?: SODeliveryMethod | '';
  delivery_cost?: number;
  delivery_status: DeliveryStatus;
  payment_status: PaymentStatus;
  delivery_cost_detail?: SODeliveryCost | null;
  dispatch_assignment?: SODispatchAssignment | null;
  payment_proofs?: SOPaymentProof[];
  linked_pr?: number | null;
  linked_pr_number?: string | null;
  apply_vat: boolean;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  notes: string;
  items: SOItem[];
  activities?: SOActivity[];
  approved_by_name: string | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface SOFormData {
  customer: number;
  quotation?: number | null;
  lpo_number?: string;
  lpo_date?: string;
  currency: number;
  exchange_rate: number;
  delivery_date: string;
  delivery_address?: string;
  requested_delivery_location?: string;
  fulfillment_warehouse?: number | null;
  apply_vat: boolean;
  notes?: string;
  items: SOItem[];
}

export interface InvoiceItem {
  id?: number;
  item: number;
  item_id?: number;
  item_code?: string;
  item_name?: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_rate: number;
  total_price?: number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  sales_order: number | null;
  so_id: number | null;
  so_number: string | null;
  customer: number;
  customer_id: number;
  customer_name: string;
  customer_tin: string;
  currency: number;
  currency_id: number;
  currency_code: string;
  exchange_rate: number;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  delivery_cost: number;
  paid_amount: number;
  balance: number;
  status: InvoiceStatus;
  tra_receipt_number: string;
  items: InvoiceItem[];
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceFormData {
  customer: number;
  sales_order?: number | null;
  currency: number;
  exchange_rate: number;
  invoice_date: string;
  due_date: string;
  tra_receipt_number?: string;
  items: InvoiceItem[];
}

export interface CustomerPayment {
  id: number;
  payment_number: string;
  customer: number;
  customer_id: number;
  customer_name: string;
  invoice: number;
  invoice_id: number;
  invoice_number: string;
  currency: number;
  currency_id: number;
  currency_code: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  reference_number: string;
  bank_name: string;
  notes?: string;
  received_by_name: string;
  created_at: string;
}

export interface PaymentFormData {
  customer: number;
  invoice: number;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  reference_number?: string;
  bank_name?: string;
  notes?: string;
}

export interface CreditNote {
  id: number;
  cn_number: string;
  invoice: number;
  invoice_id: number;
  invoice_number: string;
  customer: number;
  customer_id: number;
  customer_name: string;
  reason: string;
  amount: number;
  notes?: string;
  status: CreditNoteStatus;
  created_by_name: string;
  approved_by_name: string | null;
  created_at: string;
}

export interface CreditNoteFormData {
  invoice: number;
  reason: string;
  amount: number;
  notes?: string;
}

export interface StatementLine {
  date: string;
  type: string;
  reference: string;
  description: string;
  debit: string;
  credit: string;
}

export interface CustomerStatement {
  customer: Customer;
  lines: StatementLine[];
  aging: Record<string, string>;
  outstanding_balance: string;
}

export interface SalesDashboardData {
  weekly_sales: { week: string; total: string }[];
  top_customers: { name: string; revenue: string }[];
  quotation_conversion_rate: number;
  overdue_invoices_count: number;
  pending_so_approvals: number;
  new_orders_count?: number;
  pending_quotations_count?: number;
  accepted_quotations_count?: number;
  awaiting_payment_count?: number;
  monthly_revenue?: string;
}
