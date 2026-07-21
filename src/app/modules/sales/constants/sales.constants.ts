import { PaymentTerms } from '../../../core/models/sales.model';

export const COUNTRIES = ['Tanzania', 'Kenya', 'Uganda', 'Rwanda', 'Zambia', 'DRC', 'China', 'South Africa'];

export const PAYMENT_TERMS: { value: PaymentTerms; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'NET_15', label: 'Net 15' },
  { value: 'NET_30', label: 'Net 30' },
  { value: 'NET_45', label: 'Net 45' },
  { value: 'NET_60', label: 'Net 60' },
];

export function paymentTermsLabel(value?: PaymentTerms | string | null): string {
  if (!value) return 'Not set';
  if (value === 'CASH' || value === 'IMMEDIATE') return 'Cash';
  const match = /^NET_(\d+)$/.exec(value);
  return match ? `Net ${match[1]}` : value;
}

export function invoiceModeForCustomerTerms(
  value?: PaymentTerms | string | null,
): InvoicePaymentTerm | null {
  if (!value) return null;
  return /^NET_\d+$/.test(value) ? 'POSTPAID' : 'PREPAID';
}

export const MINE_TYPES = [
  { value: 'UNDERGROUND', label: 'Underground' },
  { value: 'OPEN_PIT', label: 'Open Pit' },
  { value: 'BOTH', label: 'Both' },
];

export const PAYMENT_METHODS = [
  {
    value: 'CASH',
    label: 'Cash',
    hint: 'Receipt method only — not a payment term. Use COD if payment is due on delivery.',
  },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'MOBILE', label: 'Mobile Money' },
];

export type InvoicePaymentTerm = 'PREPAID' | 'POSTPAID' | 'PARTIAL_PAYMENT' | 'COD';

export const INVOICE_PAYMENT_TERMS: { value: InvoicePaymentTerm; label: string; hint: string }[] = [
  { value: 'PREPAID', label: 'Prepaid', hint: 'Full payment required before delivery' },
  { value: 'POSTPAID', label: 'Postpaid', hint: 'Deliver on credit — payment due by due date' },
  { value: 'PARTIAL_PAYMENT', label: 'Partial Payment', hint: 'Deposit now, balance due later' },
  {
    value: 'COD',
    label: 'Cash on Delivery',
    hint: 'Deliver first, then invoice and record payment (Cash is only a receipt method)',
  },
];

export const INVOICE_OTHER_COST_CATEGORIES = [
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'PACKAGING', label: 'Packaging' },
  { value: 'LOADING', label: 'Loading' },
  { value: 'INSTALLATION', label: 'Installation' },
  { value: 'PERMIT', label: 'Permit Fees' },
  { value: 'DOCUMENTATION', label: 'Documentation' },
  { value: 'OTHER', label: 'Other' },
];

export const DEFAULT_QUOTATION_TERMS =
  'Payment terms as agreed. Goods remain property of Rock Solutions Limited until fully paid. ' +
  'Prices are valid for the period stated on this quotation.';

export const WORKFLOW_STEPS = {
  quotation: ['DRAFT', 'SENT', 'ACCEPTED'],
  order: [
    'NEW_ORDER',
    'STOCK_VERIFICATION',
    'QUOTATION_PREP',
    'QUOTATION_SENT',
    'INVOICE_GENERATED',
    'PAYMENT_CONFIRMED',
    'DISPATCHED',
    'DELIVERED',
    'COMPLETED',
  ],
  invoice: ['DRAFT', 'SENT', 'PARTIAL', 'PAID'],
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  NEW_ORDER: 'New Order',
  STOCK_VERIFICATION: 'Stock Verification',
  OUT_OF_STOCK: 'Out of Stock',
  PENDING_DELIVERY_COST: 'Pending Delivery Cost',
  DELIVERY_COST_CALC: 'Delivery Cost Calculation',
  QUOTATION_PREP: 'Quotation Preparation',
  WAITING_CUSTOMER: 'Waiting Customer',
  QUOTATION_ACCEPTED: 'Quotation Accepted',
  QUOTATION_REJECTED: 'Quotation Rejected',
  INVOICE_GENERATED: 'Invoice Generated',
  AWAITING_PAYMENT: 'Awaiting Payment',
  PAYMENT_CONFIRMED: 'Payment Confirmed',
  PAYMENT_FAILED: 'Payment Failed',
  READY_FOR_PICKUP: 'Ready for Pickup',
  READY_FOR_DELIVERY: 'Ready for Delivery',
  VEHICLE_ASSIGNED: 'Vehicle Assigned',
  THIRD_PARTY_ASSIGNED: 'Third Party Assigned',
  DISPATCHED: 'Dispatched',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  DELIVERY_CONFIRMED: 'Delivery Confirmed',
  COMPLETED_PICKUP: 'Completed (Pickup)',
  COMPLETED_COMPANY: 'Completed (Company)',
  COMPLETED_THIRD_PARTY: 'Completed (Third Party)',
  CANCELLED: 'Cancelled',
  DRAFT: 'Draft',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  PARTIAL: 'Partial',
};

export const TRANSPORT_METHODS = [
  { value: 'ROAD', label: 'Road' },
  { value: 'RAIL', label: 'Rail' },
  { value: 'AIR', label: 'Air' },
];

export const DELIVERY_METHODS = [
  { value: 'PICKUP', label: 'Customer Pickup' },
  { value: 'COMPANY', label: 'Company Delivery' },
  { value: 'THIRD_PARTY', label: 'Third Party Transport' },
];

export const COMPANY_DETAILS = {
  name: 'ROCK SOLUTIONS LIMITED',
  tin: '127-950-695',
  vat: '40022138R',
  address: 'Plot 252 Block L, Misungwi, Mwanza',
};

/** Only draft quotations may be edited. */
export const QUOTATION_DRAFT_STATUSES = ['DRAFT', 'QUOTATION_DRAFT'] as const;

export const QUOTATION_CONVERTIBLE_STATUSES = [
  'SENT',
  'QUOTATION_SENT',
  'WAITING_CUSTOMER',
  'ACCEPTED',
  'QUOTATION_ACCEPTED',
] as const;

export function quotationIsEditable(q: {
  status: string;
  is_editable?: boolean;
}): boolean {
  if (typeof q.is_editable === 'boolean') return q.is_editable;
  return quotationIsDraftStatus(q.status);
}

export function quotationIsDraftStatus(status: string): boolean {
  return (QUOTATION_DRAFT_STATUSES as readonly string[]).includes(status);
}

/** Sales orders in these statuses may be edited on the form. */
export const SALES_ORDER_EDITABLE_STATUSES = [
  'NEW_ORDER',
  'SO_CREATED',
  'DRAFT',
  'OUT_OF_STOCK',
  'QUOTATION_REJECTED',
] as const;

export function salesOrderIsEditable(status: string): boolean {
  return (SALES_ORDER_EDITABLE_STATUSES as readonly string[]).includes(status);
}

export function quotationIsConvertible(q: { status: string; has_sales_order?: boolean }): boolean {
  if (q.has_sales_order) return false;
  return (QUOTATION_CONVERTIBLE_STATUSES as readonly string[]).includes(q.status);
}
