import { PaymentTerms, PRPriority } from '../../../core/models/procurement.model';

export const PAYMENT_TERMS: { value: PaymentTerms; label: string }[] = [
  { value: 'IMMEDIATE', label: 'Immediate' },
  { value: 'NET_15', label: 'Net 15' },
  { value: 'NET_30', label: 'Net 30' },
  { value: 'NET_60', label: 'Net 60' },
];

export const PR_PRIORITIES: { value: PRPriority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
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
  rfq: ['Open', 'Suppliers Respond', 'Closed'],
  po: ['Draft', 'Pending', 'Approved', 'Sent', 'Partial/Received'],
  grn: ['Draft', 'Confirmed', 'Posted'],
  invoice: ['Pending', 'Matched', 'Paid'],
} as const;
