import { SOItem, SalesOrder } from '../../../core/models/sales.model';

/**
 * Commercial qty still to invoice (ordered − invoiced).
 * Before any invoicing this equals ordered — do NOT present it as an
 * "outstanding order" / stock-shortfall signal.
 */
export function toInvoiceQty(line: Pick<SOItem, 'outstanding_qty' | 'quantity_ordered' | 'invoiced_qty'>): number {
  if (line.outstanding_qty != null && line.outstanding_qty !== '') {
    return Number(line.outstanding_qty);
  }
  return Math.max(Number(line.quantity_ordered ?? 0) - Number(line.invoiced_qty ?? 0), 0);
}

/** True once the line has entered the invoicing cycle. */
export function hasStartedInvoicing(line: Pick<SOItem, 'invoiced_qty'>): boolean {
  return Number(line.invoiced_qty ?? 0) > 0;
}

/**
 * Estimated warehouse shortfall before Inventory verifies:
 * max(0, ordered − stock_available). Prefer API stock_shortfall when present.
 */
export function estimatedStockShortfall(
  line: Pick<SOItem, 'quantity_ordered' | 'stock_available' | 'stock_shortfall'>,
): number {
  if (line.stock_shortfall != null && line.stock_shortfall !== '') {
    return Math.max(Number(line.stock_shortfall), 0);
  }
  const ordered = Number(line.quantity_ordered ?? 0);
  const available = Number(line.stock_available ?? 0);
  return Math.max(ordered - available, 0);
}

export type StockOutstandingDisplay =
  | { kind: 'pending_shortfall'; qty: number }
  | { kind: 'pending_ok' }
  | { kind: 'verified_shortfall'; qty: number }
  | { kind: 'verified_ok' };

/**
 * What to show in the Stock Outstanding column.
 * Pre-verification uses warehouse estimate (SO-055 → 50, SO-056 → ok).
 * Post-verification uses confirmed stock_outstanding_qty.
 */
export function stockOutstandingDisplay(
  order: Pick<SalesOrder, 'status' | 'inventory_status'>,
  line: Pick<
    SOItem,
    'stock_outstanding_qty' | 'quantity_ordered' | 'stock_available' | 'stock_shortfall'
  >,
  stockVerificationCompleted: boolean,
): StockOutstandingDisplay {
  if (!stockVerificationCompleted) {
    const est = estimatedStockShortfall(line);
    return est > 0 ? { kind: 'pending_shortfall', qty: est } : { kind: 'pending_ok' };
  }
  const confirmed = Number(line.stock_outstanding_qty ?? 0);
  return confirmed > 0
    ? { kind: 'verified_shortfall', qty: confirmed }
    : { kind: 'verified_ok' };
}
