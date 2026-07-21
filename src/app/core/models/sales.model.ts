export type PaymentTerms = '' | 'CASH' | 'IMMEDIATE' | `NET_${number}`;
export type InvoicePaymentTerm = 'PREPAID' | 'POSTPAID' | 'PARTIAL_PAYMENT' | 'COD';
export type MineType = 'UNDERGROUND' | 'OPEN_PIT' | 'BOTH';
export type QuotationStatus =
  | 'DRAFT'
  | 'SENT'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'WAITING_CUSTOMER'
  | 'QUOTATION_SENT'
  | 'QUOTATION_ACCEPTED'
  | 'QUOTATION_REJECTED'
  | 'QUOTATION_REVISION';

export type QuotationCustomerResponse = 'ACCEPTED' | 'REJECTED' | 'REVISION';
export type SOStatus =
  | 'NEW_ORDER'
  | 'SO_CREATED'
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
  | 'PARTIAL'
  | 'PARTIALLY_FULFILLED';

export type OutstandingPricingMode = 'LOCKED' | 'CURRENT';

export type InventoryStatus = 'NONE' | 'RESERVED' | 'LOCKED' | 'RELEASED';
export type SODeliveryMethod = 'PICKUP' | 'COMPANY' | 'THIRD_PARTY';
export type DeliveryStatus = 'PENDING' | 'PROCESSING' | 'PARTIAL' | 'DELIVERED' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PARTIAL' | 'PAID' | 'OVERDUE';
export type FinanceDocumentApprovalStatus =
  | 'NOT_SUBMITTED'
  | 'PENDING_FINANCE_APPROVAL'
  | 'APPROVED'
  | 'REJECTED';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'MOBILE';
export type CreditNoteStatus = 'DRAFT' | 'APPROVED' | 'APPLIED';
export type CreditNoteWorkflowStage =
  | 'DRAFT'
  | 'SALES_SUBMITTED'
  | 'INVENTORY_REVIEWED'
  | 'FINANCE_REVIEWED'
  | 'GM_APPROVED'
  | 'APPLIED'
  | 'REJECTED';
export type CreditNoteType =
  | 'SALES_RETURN'
  | 'PRICE_ADJUSTMENT'
  | 'DISCOUNT'
  | 'TAX_ADJUSTMENT'
  | 'FULL_CANCELLATION';
export type SalesReturnCondition = 'GOOD' | 'DAMAGED' | 'DEFECTIVE' | 'UNUSABLE' | 'OTHER';
export type SalesReturnDecision =
  | 'RETURN_TO_STOCK'
  | 'REPAIR'
  | 'QUARANTINE'
  | 'SCRAP'
  | 'REJECT';
export type SalesCreditAttachmentType =
  | 'SUPPORTING'
  | 'CUSTOMER_COMPLAINT'
  | 'INSPECTION'
  | 'TAX_DOCUMENT';

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
  tin_number?: string;
  vat_number?: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  country?: string;
  mine_name?: string;
  mine_location?: string;
  mine_type?: MineType;
  contact_person?: string;
  contact_phone?: string;
  currency: number;
  credit_limit?: number;
  payment_terms?: PaymentTerms;
  is_active?: boolean;
}

export interface CustomerItemPrice {
  id: number;
  customer: number;
  customer_name: string;
  currency_code: string;
  item: number;
  item_code: string;
  item_name: string;
  unit_of_measure: string;
  unit_price: number | string;
  approved_selling_price: number | string | null;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerItemPriceFormData {
  customer: number;
  item: number;
  unit_price: number;
  notes?: string;
}

export interface QuotationItem {
  id?: number;
  item: number;
  item_id?: number;
  item_code?: string;
  item_name?: string;
  unit_of_measure?: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_rate?: number;
  total_price?: number;
  fulfillment_warehouse?: number | null;
  warehouse_id?: number | null;
  warehouse_name?: string | null;
  stock_available?: number | string | null;
  stock_shortfall?: number | string | null;
}

export interface QuotationDocumentLine {
  item_code: string;
  description: string;
  brand?: string;
  model?: string;
  uom?: string;
  quantity: string | number;
  unit_price: string | number;
  discount_percent: string | number;
  discount_amount: string | number;
  tax_percent: string | number;
  tax_amount: string | number;
  line_total: string | number;
  length?: string | number | null;
  width?: string | number | null;
  height?: string | number | null;
  thickness?: string | number | null;
  diameter?: string | number | null;
  dimension_unit?: string;
  weight_per_unit?: string | number | null;
  weight_unit?: string;
  total_weight?: string | number | null;
  warehouse_name?: string;
}

export interface QuotationBankAccount {
  bank_name: string;
  branch?: string;
  account_name: string;
  account_number: string;
  swift_code?: string;
  iban?: string;
  currency?: string;
  payment_reference?: string;
}

export interface QuotationDocument {
  company: {
    name: string;
    registration_number?: string;
    tin?: string;
    vrn?: string;
    address?: string;
    postal_address?: string;
    phone?: string;
    email?: string;
    website?: string;
    tagline?: string;
    logo_url?: string | null;
    brand_color?: string;
  };
  customer: {
    name: string;
    number?: string;
    tin?: string;
    vrn?: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    address?: string;
    postal_address?: string;
    city?: string;
    country?: string;
    mine_name?: string;
    mine_location?: string;
  };
  delivery: {
    delivery_to?: string;
    mine_site?: string;
    project_name?: string;
    delivery_address?: string;
    warehouse?: string;
    requested_delivery_date?: string;
    incoterms?: string;
    delivery_method?: string;
  };
  meta: {
    quotation_number: string;
    quotation_date?: string;
    expiry_date?: string;
    currency?: string;
    status?: string;
    status_code?: string;
    prepared_by?: string;
    sales_representative?: string;
    department?: string;
    revision?: string;
    validity_period?: string;
    payment_terms?: string;
    delivery_terms?: string;
    deposit_percent?: string;
    exchange_rate?: string;
    tax_profile?: string;
  };
  lines: QuotationDocumentLine[];
  financials: {
    subtotal: string | number;
    line_discounts: string | number;
    header_discount?: string | number;
    taxable_amount: string | number;
    vat: string | number;
    other_taxes?: string | number;
    freight?: string | number;
    insurance?: string | number;
    handling?: string | number;
    other_charges?: string | number;
    grand_total: string | number;
    round_off?: string | number;
    amount_payable: string | number;
    total_weight?: string | number | null;
    total_weight_unit?: string;
  };
  bank_accounts: QuotationBankAccount[];
  terms: string;
  qr_url: string;
  verify_url: string;
  amount_in_words: string;
  generated_at: string;
  document_version: string;
}

export interface SalesOrderDocument {
  company: QuotationDocument['company'];
  customer: {
    name: string;
    number?: string;
    tin?: string;
    vrn?: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    country?: string;
    mine_name?: string;
    mine_location?: string;
  };
  delivery: {
    delivery_to?: string;
    mine_site?: string;
    delivery_address?: string;
    warehouse?: string;
    delivery_method?: string;
    delivery_date?: string;
  };
  meta: {
    so_number: string;
    order_date?: string;
    delivery_date?: string;
    lpo_number?: string;
    lpo_date?: string;
    currency?: string;
    status?: string;
    status_code?: string;
    prepared_by?: string;
    sales_representative?: string;
    quotation_number?: string;
    payment_terms?: string;
    payment_term_code?: string;
    delivery_terms?: string;
    deposit_percent?: string;
    exchange_rate?: string;
    tax_profile?: string;
  };
  lines: QuotationDocumentLine[];
  financials: {
    subtotal: string | number;
    line_discounts: string | number;
    taxable_amount: string | number;
    vat: string | number;
    freight?: string | number;
    grand_total: string | number;
    amount_payable: string | number;
    total_weight?: string | number | null;
    total_weight_unit?: string;
  };
  bank_accounts: QuotationBankAccount[];
  payment: {
    payment_status?: string;
    payment_status_code?: string;
    delivery_status?: string;
    delivery_status_code?: string;
    deposit_percent?: string;
  };
  terms: string;
  amount_in_words: string;
  generated_at: string;
  document_version: string;
}

export interface QuotationVerification {
  verified: boolean;
  quotation_number: string;
  customer_name: string;
  status: string;
  status_display: string;
  issue_date?: string | null;
  expiry_date?: string | null;
  currency_code: string;
  total_amount: string;
  approval_status?: string;
  customer_responded_at?: string | null;
  public_view_url: string;
  verify_url: string;
}

export interface Quotation {
  id: number;
  quotation_number: string;
  customer: number;
  customer_id: number;
  customer_name: string;
  mine_name: string;
  customer_tin?: string;
  customer_vrn?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_city?: string;
  customer_country?: string;
  customer_contact?: string;
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
  delivery_method?: SODeliveryMethod | '';
  delivery_method_display?: string;
  payment_term?: InvoicePaymentTerm | '';
  payment_term_display?: string;
  customer_payment_terms?: PaymentTerms;
  deposit_percent?: number;
  notes: string;
  terms_conditions: string;
  items: QuotationItem[];
  is_expired?: boolean;
  is_editable?: boolean;
  has_sales_order?: boolean;
  sales_order_id?: number | null;
  sales_order_number?: string | null;
  customer_response?: QuotationCustomerResponse | null;
  customer_responded_at?: string | null;
  customer_response_notes?: string | null;
  sales_reply?: string | null;
  sales_replied_at?: string | null;
  sales_replied_by_name?: string | null;
  email_sent_at?: string | null;
  pdf_file?: string | null;
  pdf_file_url?: string | null;
  public_view_url?: string | null;
  verify_url?: string | null;
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
  delivery_method: SODeliveryMethod;
  payment_term: InvoicePaymentTerm;
  customer_payment_terms?: PaymentTerms;
  deposit_percent?: number;
  items: QuotationItem[];
}

export interface SOItem {
  id?: number;
  item: number;
  item_id?: number;
  item_code?: string;
  item_name?: string;
  unit_of_measure?: string;
  quantity_ordered: number;
  quantity_delivered?: number;
  quantity_reserved?: number;
  invoiced_qty?: number;
  outstanding_qty?: number | string;
  dispatch_qty?: number | string;
  stock_outstanding_qty?: number | string;
  invoice_fulfillable_qty?: number | string;
  stock_available_snapshot?: number | null;
  unit_price: number;
  discount_percent: number;
  tax_rate?: number;
  total_price?: number;
  stock_available?: number;
  stock_shortfall?: number | string | null;
  fulfillment_warehouse?: number | null;
  warehouse_id?: number | null;
  warehouse_name?: string | null;
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
  handover_confirmed?: boolean;
  handover_confirmed_at?: string | null;
  handover_confirmed_by_name?: string | null;
  handover_notes?: string;
}

export interface SOPaymentProof {
  id: number;
  amount: number;
  payment_method: PaymentMethod;
  reference_number: string;
  proof_notes: string;
  proof_file_url?: string | null;
  customer_reply_message?: string;
  source?: string;
  source_display?: string;
  payment_method_display?: string;
  status: string;
  verified_at: string | null;
  failure_reason: string;
  created_at: string;
}

export interface SOStockCheckWarehouseBreakdown {
  warehouse_id: number;
  warehouse_name: string;
  stock_available: string;
  is_fulfillment_warehouse: boolean;
}

export interface SOStockCheckLine {
  item_id: number;
  item_code: string;
  item_name: string;
  quantity_ordered: string;
  quantity_on_hand: string;
  quantity_reserved: string;
  quantity_available: string;
  quantity_available_all_warehouses?: string;
  warehouse_breakdown?: SOStockCheckWarehouseBreakdown[];
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
  customer_payment_terms?: PaymentTerms;
  quotation: number | null;
  quotation_id: number | null;
  quotation_number?: string | null;
  quotation_status?: string | null;
  quotation_email_sent_at?: string | null;
  invoice_id?: number | null;
  invoice_number?: string | null;
  invoice_payment_term?: InvoicePaymentTerm | null;
  invoice_deposit_amount?: number | null;
  invoice_grand_total?: number | null;
  can_generate_invoice?: boolean;
  invoice_workflow_hint?: string;
  can_close_order?: boolean;
  close_order_blocker?: string;
  can_waive_outstanding_close?: boolean;
  has_outstanding_fulfillment?: boolean;
  outstanding_fulfillment_hint?: string;
  has_reserved_ready_to_invoice?: boolean;
  reserved_ready_to_invoice_hint?: string;
  can_record_payment_proof?: boolean;
  payment_collection_phase?: boolean;
  can_generate_balance_invoice?: boolean;
  can_generate_fulfillment_invoice?: boolean;
  outstanding_pricing_mode?: OutstandingPricingMode;
  outstanding_pricing_mode_display?: string;
  order_invoicing_summary?: OrderInvoicingSummary | null;
  linked_invoices?: LinkedInvoiceSummary[];
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
  payment_term?: InvoicePaymentTerm | '';
  payment_term_display?: string;
  deposit_percent?: number;
  delivery_cost?: number;
  delivery_status: DeliveryStatus;
  payment_status: PaymentStatus;
  delivery_cost_detail?: SODeliveryCost | null;
  dispatch_assignment?: SODispatchAssignment | null;
  payment_proofs?: SOPaymentProof[];
  pending_payment_proof?: SOPaymentProof | null;
  can_verify_payment?: boolean;
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
  delivery_method: SODeliveryMethod;
  payment_term: InvoicePaymentTerm;
  customer_payment_terms?: PaymentTerms;
  deposit_percent?: number;
  outstanding_pricing_mode?: OutstandingPricingMode;
  apply_vat: boolean;
  notes?: string;
  items: SOItem[];
}

export interface OrderInvoicingSummary {
  order_grand_total: string | number;
  total_billed_percent: string | number;
  total_billed_amount: string | number;
  total_paid_amount: string | number;
  remaining_to_invoice_percent: string | number;
  remaining_to_invoice_amount: string | number;
  post_delivery_balance_pending?: string | number;
  post_delivery_balance_pending_percent?: string | number;
  next_post_delivery_balance_pending?: string | number;
  next_post_delivery_balance_pending_percent?: string | number;
  next_post_delivery_balance_batch?: string | null;
  invoice_count: number;
  is_fully_invoiced: boolean;
}

export interface OutstandingOrderLine {
  id: number;
  item_code: string;
  item_name: string;
  unit_of_measure?: string;
  quantity_ordered: number | string;
  invoiced_qty: number | string;
  outstanding_qty: number | string;
  stock_outstanding_qty?: number | string;
  unit_price: number | string;
  outstanding_value: number | string;
}

export interface StockOutstandingWarehouseBreakdown {
  warehouse_id: number;
  warehouse_name: string;
  stock_available: number | string;
  is_fulfillment_warehouse: boolean;
}

export interface StockOutstandingOrderLine {
  id: number;
  item_code: string;
  item_name: string;
  unit_of_measure?: string;
  quantity_ordered: number | string;
  quantity_reserved: number | string;
  stock_outstanding_qty: number | string;
  stock_available?: number | string;
  fulfillment_warehouse_name?: string;
  fulfillment_warehouse_available?: number | string;
  warehouse_breakdown?: StockOutstandingWarehouseBreakdown[];
  reservable_qty?: number | string;
  is_ready_for_sale?: boolean;
}

export interface StockOutstandingSalesOrder {
  id: number;
  so_number: string;
  status: SOStatus;
  inventory_status?: InventoryStatus;
  customer_name: string;
  warehouse_name?: string | null;
  currency_code: string;
  delivery_date: string;
  created_at: string;
  linked_pr?: number | null;
  linked_pr_number?: string | null;
  can_request_procurement?: boolean;
  /** True only when warehouse has ready-for-sale stock that can cover part of outstanding qty. */
  can_reserve_available?: boolean;
  lines: StockOutstandingOrderLine[];
}

export interface OutstandingSalesOrder {
  id: number;
  so_number: string;
  customer_name: string;
  status: SOStatus;
  payment_term: InvoicePaymentTerm | '';
  outstanding_pricing_mode: OutstandingPricingMode;
  outstanding_pricing_mode_display: string;
  currency_code: string;
  created_at: string;
  delivery_date: string;
  invoice_count: number;
  total_outstanding_value: number | string;
  days_outstanding: number;
  can_generate_fulfillment_invoice: boolean;
  lines: OutstandingOrderLine[];
}

export interface LinkedInvoiceSummary {
  id: number;
  invoice_number: string;
  status: string;
  payment_status?: string;
  bill_percent: string | number;
  bill_amount: string | number;
  paid_amount: string | number;
  invoice_date: string | null;
  sequence: number;
  invoice_kind: string;
}

export interface InvoicePaymentBreakdown {
  currency_code: string;
  grand_total: string | number;
  bill_amount: string | number;
  bill_percent: string | number;
  deposit_percent: string | number;
  amount_due: string | number;
  amount_due_percent: string | number;
  paid_amount: string | number;
  remaining_on_order_amount: string | number;
  remaining_on_order_percent: string | number;
  balance_due_after_delivery?: string | number;
  balance_due_after_delivery_percent?: string | number;
  balance_due_after_delivery_display?: string;
  is_partial: boolean;
  show_breakdown: boolean;
  amount_due_display?: string;
  bill_amount_display?: string;
  remaining_amount_display?: string;
  grand_total_display?: string;
  sequence?: number;
  invoice_kind?: string;
  invoice_kind_display?: string;
}

export interface InvoiceBankAccount {
  bank_name: string;
  branch?: string;
  account_name?: string;
  account_number?: string;
  swift_code?: string;
}

export interface InvoiceOtherCost {
  id?: number;
  cost_name: string;
  category?: string;
  description?: string;
  amount: number;
  tax_percent?: number;
  tax_amount?: number;
  total?: number;
}

export interface GenerateInvoiceData {
  other_costs?: Array<{
    cost_name: string;
    description?: string;
    amount: number;
    category?: string;
  }>;
  line_prices?: Array<{
    line_id: number;
    unit_price: number;
  }>;
  send_email?: boolean;
}

export interface FulfillmentInvoicePreviewLine {
  line_id: number;
  item_id: number;
  item_code: string;
  item_name: string;
  quantity: string;
  original_unit_price: string;
  current_unit_price: string | null;
  current_price_available: boolean;
  price_changed: boolean;
  default_unit_price: string;
}

export interface FulfillmentInvoicePreview {
  pricing_mode: OutstandingPricingMode;
  pricing_mode_display: string;
  currency_code: string;
  lines: FulfillmentInvoicePreviewLine[];
}

export interface PublicInvoice {
  invoice_number: string;
  so_number?: string | null;
  customer_name: string;
  customer_tin?: string;
  currency_code: string;
  invoice_date: string;
  due_date: string;
  payment_term?: InvoicePaymentTerm;
  payment_term_display?: string;
  deposit_amount?: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  other_costs?: InvoiceOtherCost[];
  other_costs_total?: number;
  grand_total?: number;
  paid_amount: number;
  remaining_balance?: number;
  balance?: number;
  amount_due: number;
  status?: InvoiceStatus;
  status_display?: string;
  payment_status?: string;
  payment_status_display?: string;
  tra_receipt_number?: string;
  items: InvoiceItem[];
  notes?: string;
  can_submit_payment: boolean;
  pending_payment_proof?: {
    id: number;
    amount: number;
    reference_number: string;
    status: string;
    created_at: string;
  } | null;
  invoice_sent_at?: string | null;
  public_view_url?: string;
}

export interface CustomerPaymentProofData {
  amount?: number;
  payment_method: string;
  reference_number: string;
  proof_notes?: string;
  customer_reply_message?: string;
  customer_email?: string;
  proof_file?: File;
}

export interface InvoiceItem {
  id?: number;
  item: number;
  item_id?: number;
  item_code?: string;
  item_name?: string;
  unit_of_measure?: string;
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
  customer_email?: string;
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
  payment_term?: InvoicePaymentTerm;
  payment_term_display?: string;
  payment_status?: string;
  payment_status_display?: string;
  deposit_amount?: number;
  deposit_percent?: number;
  bill_percent?: number;
  bill_amount?: number;
  sequence?: number;
  invoice_kind?: string;
  invoice_kind_display?: string;
  payment_breakdown?: InvoicePaymentBreakdown;
  bank_accounts?: InvoiceBankAccount[];
  credit_days?: number;
  other_costs?: InvoiceOtherCost[];
  other_costs_total?: number;
  grand_total?: number;
  remaining_balance?: number;
  notes?: string;
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
  invoice_sent_at?: string | null;
  email_opened_at?: string | null;
  status: InvoiceStatus;
  tra_receipt_number: string;
  public_view_url?: string;
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
  credit_note_type: CreditNoteType | null;
  workflow_stage: CreditNoteWorkflowStage | null;
  sales_order: number | null;
  sales_order_id: number | null;
  warehouse: number | null;
  warehouse_name: string | null;
  reason: string;
  amount: number;
  net_amount: number;
  tax_amount: number;
  vat_output_amount: number;
  notes?: string;
  status: CreditNoteStatus;
  lines: CreditNoteLine[];
  attachments: SalesCreditAttachment[];
  submitted_by_name: string | null;
  submitted_at: string | null;
  inventory_reviewed_by_name: string | null;
  inventory_reviewed_at: string | null;
  finance_reviewed_by_name: string | null;
  finance_reviewed_at: string | null;
  gm_approved_by_name: string | null;
  gm_approved_at: string | null;
  created_by_name: string;
  approved_by_name: string | null;
  approved_at: string | null;
  rejected_by_name: string | null;
  rejected_at: string | null;
  rejection_reason: string;
  applied_by_name: string | null;
  applied_at: string | null;
  journal_entry: number | null;
  can_submit: boolean;
  can_inventory_review: boolean;
  can_finance_review: boolean;
  can_gm_approve: boolean;
  can_reject: boolean;
  can_apply: boolean;
  created_at: string;
}

export interface SalesReturnInspection {
  id: number;
  quantity_confirmed: number;
  condition: SalesReturnCondition;
  decision: SalesReturnDecision;
  inspection_status: string;
  inspected_by_name: string;
  inspected_at: string;
  notes: string;
  stock_applied_at: string | null;
}

export interface CreditNoteLine {
  id: number;
  invoice_item: number;
  sales_order_item: number | null;
  item: number;
  item_name: string;
  item_code: string;
  unit_of_measure: string;
  quantity: number;
  original_unit_price: number;
  adjusted_unit_price: number | null;
  discount_percent: number;
  tax_rate: number;
  net_amount: number;
  tax_amount: number;
  vat_output_amount: number;
  total_amount: number;
  reason: string;
  inspections: SalesReturnInspection[];
}

export interface SalesCreditAttachment {
  id: number;
  file: string;
  original_name: string;
  caption: string;
  attachment_type: SalesCreditAttachmentType;
  uploaded_by_name: string | null;
  created_at: string;
}

export interface LegacyCreditNoteFormData {
  invoice: number;
  reason: string;
  amount: number;
  notes?: string;
}

export interface CreditNoteLineFormData {
  invoice_item: number;
  quantity: number;
  reason?: string;
  adjusted_unit_price?: number | null;
  discount_percent?: number;
  tax_rate?: number;
}

export interface StagedCreditNoteFormData {
  invoice: number;
  credit_note_type: CreditNoteType;
  warehouse?: number | null;
  reason: string;
  notes?: string;
  lines: CreditNoteLineFormData[];
}

export type CreditNoteFormData = LegacyCreditNoteFormData | StagedCreditNoteFormData;

export interface CreditNoteReviewData {
  comments?: string;
}

export interface CreditNoteRejectData {
  reason: string;
}

export interface CreditNoteInventoryReviewData extends CreditNoteReviewData {
  inspections: {
    credit_note_line: number;
    quantity_confirmed: number;
    condition: SalesReturnCondition;
    decision: SalesReturnDecision;
    notes?: string;
  }[];
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

export interface SalesDashboardActivity {
  type: 'SALES_ORDER' | 'QUOTATION' | 'INVOICE';
  entity_id: number;
  reference: string;
  status: string;
  detail: string;
  amount: string | null;
  created_at: string;
  created_by_name: string | null;
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
  recent_activities?: SalesDashboardActivity[];
}
