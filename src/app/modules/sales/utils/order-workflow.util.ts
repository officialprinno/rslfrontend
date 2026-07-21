import { InvoicePaymentTerm, SOStatus } from '../../../core/models/sales.model';

/** Prepaid / partial — invoice & payment before delivery. */
export const ORDER_WORKFLOW_UPFRONT: string[] = [
  'NEW_ORDER',
  'STOCK_VERIFICATION',
  'QUOTATION_PREP',
  'QUOTATION_SENT',
  'INVOICE',
  'PAYMENT',
  'DISPATCHED',
  'DELIVERED',
  'COMPLETED',
];

/** Postpaid / COD — delivery before invoice & payment. */
export const ORDER_WORKFLOW_DEFERRED: string[] = [
  'NEW_ORDER',
  'STOCK_VERIFICATION',
  'QUOTATION_PREP',
  'QUOTATION_SENT',
  'DISPATCHED',
  'DELIVERED',
  'INVOICE',
  'PAYMENT',
  'COMPLETED',
];

/** Partial / advance — deposit, delivery, then balance payments. */
export const ORDER_WORKFLOW_PARTIAL: string[] = [
  'NEW_ORDER',
  'STOCK_VERIFICATION',
  'QUOTATION_PREP',
  'QUOTATION_SENT',
  'INVOICE',
  'DEPOSIT',
  'DISPATCHED',
  'DELIVERED',
  'BALANCE',
  'COMPLETED',
];

export function isDeferredPaymentTerm(term?: InvoicePaymentTerm | string | null): boolean {
  return term === 'POSTPAID' || term === 'COD';
}

export function isPartialPaymentTerm(term?: InvoicePaymentTerm | string | null): boolean {
  return term === 'PARTIAL_PAYMENT';
}

export function orderWorkflowSteps(term?: InvoicePaymentTerm | string | null): string[] {
  if (isDeferredPaymentTerm(term)) return ORDER_WORKFLOW_DEFERRED;
  if (isPartialPaymentTerm(term)) return ORDER_WORKFLOW_PARTIAL;
  return ORDER_WORKFLOW_UPFRONT;
}

const UPFRONT_STATUS_INDEX: Record<string, number> = {
  NEW_ORDER: 0,
  SO_CREATED: 0,
  DRAFT: 0,
  STOCK_VERIFICATION: 1,
  OUT_OF_STOCK: 1,
  PENDING_DELIVERY_COST: 1,
  DELIVERY_COST_CALC: 1,
  QUOTATION_PREP: 2,
  QUOTATION_SENT: 3,
  WAITING_CUSTOMER: 3,
  QUOTATION_ACCEPTED: 3,
  INVOICE_GENERATED: 4,
  AWAITING_PAYMENT: 5,
  PAYMENT_CONFIRMED: 5,
  READY_FOR_PICKUP: 5,
  READY_FOR_DELIVERY: 5,
  VEHICLE_ASSIGNED: 5,
  THIRD_PARTY_ASSIGNED: 5,
  DISPATCHED: 6,
  IN_TRANSIT: 6,
  DELIVERED: 7,
  DELIVERY_CONFIRMED: 7,
  COMPLETED_PICKUP: 8,
  COMPLETED_COMPANY: 8,
  COMPLETED_THIRD_PARTY: 8,
  CONFIRMED: 5,
  PROCESSING: 6,
  PARTIAL: 6,
};

const DEFERRED_STATUS_INDEX: Record<string, number> = {
  NEW_ORDER: 0,
  SO_CREATED: 0,
  DRAFT: 0,
  STOCK_VERIFICATION: 1,
  OUT_OF_STOCK: 1,
  PENDING_DELIVERY_COST: 1,
  DELIVERY_COST_CALC: 1,
  QUOTATION_PREP: 2,
  QUOTATION_SENT: 3,
  WAITING_CUSTOMER: 3,
  QUOTATION_ACCEPTED: 3,
  PAYMENT_CONFIRMED: 4,
  READY_FOR_PICKUP: 4,
  READY_FOR_DELIVERY: 4,
  VEHICLE_ASSIGNED: 4,
  THIRD_PARTY_ASSIGNED: 4,
  DISPATCHED: 4,
  IN_TRANSIT: 4,
  DELIVERED: 5,
  DELIVERY_CONFIRMED: 5,
  INVOICE_GENERATED: 6,
  AWAITING_PAYMENT: 7,
  COMPLETED_PICKUP: 8,
  COMPLETED_COMPANY: 8,
  COMPLETED_THIRD_PARTY: 8,
};

export function orderPaidPercent(order: {
  total_amount?: number | string;
  payment_status?: string;
  order_invoicing_summary?: {
    order_grand_total?: string | number;
    total_paid_amount?: string | number;
  } | null;
  payment_proofs?: { status: string; amount: number }[];
}): number {
  const summary = order.order_invoicing_summary;
  const total = summary
    ? Number(summary.order_grand_total)
    : Number(order.total_amount) || 0;
  if (!total) return 0;
  const proofTotal = (order.payment_proofs ?? [])
    .filter((p) => p.status === 'VERIFIED')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  let paid = proofTotal;
  if (!paid && summary) {
    paid = Number(summary.total_paid_amount);
  }
  paid = Math.min(paid, total);
  return Math.round((paid / total) * 10000) / 100;
}

export function partialOrderWorkflowIndex(order: {
  status: string;
  payment_status?: string;
  delivery_status?: string;
}): number {
  const status = order.status;
  const paid = order.payment_status === 'PAID';
  const delivered =
    order.delivery_status === 'DELIVERED' ||
    status === 'DELIVERED' ||
    status === 'DELIVERY_CONFIRMED';

  if (status.startsWith('COMPLETED')) return 9;
  if (status === 'DELIVERY_CONFIRMED') return paid ? 9 : 8;
  if (status === 'DELIVERED') return paid ? 9 : 7;
  if (status === 'AWAITING_PAYMENT') return delivered ? 8 : 5;
  if (
    status === 'PAYMENT_CONFIRMED' &&
    delivered &&
    paid
  ) {
    return 9;
  }
  if (status === 'PAYMENT_CONFIRMED') return delivered ? 7 : 5;
  if (
    [
      'DISPATCHED',
      'IN_TRANSIT',
      'VEHICLE_ASSIGNED',
      'THIRD_PARTY_ASSIGNED',
      'READY_FOR_DELIVERY',
      'READY_FOR_PICKUP',
      'PROCESSING',
      'PARTIAL',
    ].includes(status)
  ) {
    return 6;
  }
  if (status === 'INVOICE_GENERATED') return 4;
  return PARTIAL_STATUS_INDEX[status] ?? 0;
}

const PARTIAL_STATUS_INDEX: Record<string, number> = {
  NEW_ORDER: 0,
  SO_CREATED: 0,
  DRAFT: 0,
  STOCK_VERIFICATION: 1,
  OUT_OF_STOCK: 1,
  PENDING_DELIVERY_COST: 1,
  DELIVERY_COST_CALC: 1,
  QUOTATION_PREP: 2,
  QUOTATION_SENT: 3,
  WAITING_CUSTOMER: 3,
  QUOTATION_ACCEPTED: 3,
  INVOICE_GENERATED: 4,
  AWAITING_PAYMENT: 5,
  PAYMENT_CONFIRMED: 5,
  PAYMENT_FAILED: 5,
  CONFIRMED: 5,
};

export function orderWorkflowIndex(
  status: SOStatus | string,
  paymentTerm?: InvoicePaymentTerm | string | null,
  order?: {
    status: string;
    payment_status?: string;
    delivery_status?: string;
  } | null,
): number {
  if (isPartialPaymentTerm(paymentTerm) && order) {
    return partialOrderWorkflowIndex(order);
  }
  const map = isDeferredPaymentTerm(paymentTerm)
    ? DEFERRED_STATUS_INDEX
    : UPFRONT_STATUS_INDEX;
  return map[status] ?? 0;
}
