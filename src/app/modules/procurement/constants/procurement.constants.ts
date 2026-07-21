import { PaymentTerms, PRPriority, PRRequestType } from '../../../core/models/procurement.model';

import { PaymentMode } from '../../../core/models/procurement.model';

export const PAYMENT_MODES: { value: PaymentMode; label: string; description: string }[] = [
  { value: 'PREPAID', label: 'Prepaid', description: 'Pay before shipment' },
  { value: 'POSTPAID', label: 'Postpaid', description: 'Pay after goods received & matched' },
  { value: 'PARTIAL', label: 'Partial', description: 'Advance then final payment' },
  { value: 'COD', label: 'Cash on Delivery', description: 'Pay on receipt after quick match' },
];

export const PAYMENT_TERMS: { value: PaymentTerms; label: string }[] = [
  { value: 'IMMEDIATE', label: 'Immediate' },
  { value: 'NET_15', label: 'Net 15' },
  { value: 'NET_30', label: 'Net 30' },
  { value: 'NET_45', label: 'Net 45' },
  { value: 'NET_60', label: 'Net 60' },
];

export const PR_PRIORITIES: { value: PRPriority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

export const PR_REQUEST_TYPES: { value: PRRequestType; label: string }[] = [
  { value: 'STOCK_REPLENISHMENT', label: 'Stock Replenishment' },
  { value: 'PRODUCTION', label: 'Production' },
  { value: 'CONSUMPTION', label: 'Consumption' },
  { value: 'EMERGENCY', label: 'Emergency' },
  { value: 'PROJECT', label: 'Project Purchase' },
];

export const COUNTRIES = [
  'Tanzania',
  'Kenya',
  'Uganda',
  'Rwanda',
  'South Africa',
  'China',
  'India',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
];

export const PAYMENT_METHODS = ['Bank Transfer', 'Cheque', 'Mobile Money', 'Cash'];

export const WORKFLOW_STEPS = {
  pr: ['Draft', 'Pending', 'Approved', 'Create RFQ'],
  rfq: ['Draft', 'Open', 'Suppliers Respond', 'Closed'],
  po: ['Draft', 'Pending', 'Approved', 'Sent/Delivery', 'Received', 'Closed'],
  grn: ['Draft', 'Confirmed', 'Posted'],
  invoice: ['Pending', 'Matched', 'Paid'],
} as const;
