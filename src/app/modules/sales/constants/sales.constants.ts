import { PaymentTerms } from '../../../core/models/sales.model';

export const COUNTRIES = ['Tanzania', 'Kenya', 'Uganda', 'Rwanda', 'Zambia', 'DRC', 'China', 'South Africa'];

export const PAYMENT_TERMS: { value: PaymentTerms; label: string }[] = [
  { value: 'IMMEDIATE', label: 'Immediate' },
  { value: 'NET_15', label: 'Net 15' },
  { value: 'NET_30', label: 'Net 30' },
  { value: 'NET_60', label: 'Net 60' },
];

export const MINE_TYPES = [
  { value: 'UNDERGROUND', label: 'Underground' },
  { value: 'OPEN_PIT', label: 'Open Pit' },
  { value: 'BOTH', label: 'Both' },
];

export const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'MOBILE', label: 'Mobile Money' },
];

export const DEFAULT_QUOTATION_TERMS =
  'Payment terms as agreed. Goods remain property of Rock Solutions Limited until fully paid. ' +
  'Prices are valid for the period stated on this quotation.';

export const WORKFLOW_STEPS = {
  quotation: ['DRAFT', 'SENT', 'ACCEPTED'],
  order: [
    'NEW_ORDER',
    'STOCK_VERIFICATION',
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
  QUOTATION_SENT: 'Quotation Sent',
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
