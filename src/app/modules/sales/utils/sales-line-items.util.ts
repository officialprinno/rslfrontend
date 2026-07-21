import { Item } from '../../../core/models/inventory.model';
import { SelectOptionGroup } from '../../../shared/components/searchable-select/searchable-select.component';
import { formatCurrency } from '../../../core/utils/format.util';

export const SALES_LINE_READY_GROUP = 'Ready for Sale';
export const SALES_LINE_NOT_READY_GROUP = 'Not Ready for Sale';

export function notReadySalesLineSublabel(item: Item): string {
  const unit = item.unit_of_measure ? ` · unit: ${item.unit_of_measure}` : '';
  const onHand = Number(item.quantity_on_hand ?? 0);
  const incoming = Number(item.incoming_qty ?? 0);
  if (incoming > 0 && onHand > 0) {
    return `${onHand} on hand · on order ${incoming}${unit}`;
  }
  if (incoming > 0) {
    return `On order ${incoming} · awaiting stock${unit}`;
  }
  if (onHand > 0) {
    return `${onHand} on hand · awaiting Finance${unit}`;
  }
  return `Out of stock · awaiting stock / Finance${unit}`;
}

export function isSalesLineReadyItem(item: Item | undefined | null): boolean {
  if (!item) return false;
  if (typeof item.sales_line_ready === 'boolean') {
    return item.sales_line_ready;
  }
  const available = Number(item.quantity_available ?? 0);
  return available > 0 && !!item.finance_price_approved;
}

/** Union ready-for-sale items with broader on-hand stock list for line pickers. */
export function mergeSalesLineItemLists(readyItems: Item[], stockItems: Item[]): Item[] {
  const byId = new Map<number, Item>();

  for (const item of stockItems) {
    byId.set(item.id, {
      ...item,
      sales_line_ready: isSalesLineReadyItem(item),
    });
  }

  for (const item of readyItems) {
    const existing = byId.get(item.id);
    byId.set(item.id, {
      ...(existing ?? item),
      ...item,
      sales_line_ready: true,
    });
  }

  return Array.from(byId.values()).sort((a, b) => a.code.localeCompare(b.code));
}

export function buildSalesLineItemGroups(
  items: Item[],
  currencyCode = 'TZS',
): SelectOptionGroup[] {
  const ready: SelectOptionGroup['options'] = [];
  const notReady: SelectOptionGroup['options'] = [];

  for (const item of items) {
    const baseLabel = `${item.code} — ${item.name}`;
    if (isSalesLineReadyItem(item)) {
      const price = item.approved_selling_price ?? item.selling_price;
      const available = Number(item.quantity_available ?? 0);
      const priceLabel = price != null ? formatCurrency(Number(price), currencyCode) : '—';
      ready.push({
        value: item.id,
        label: baseLabel,
        sublabel: `${priceLabel} · ${available} available · unit: ${item.unit_of_measure || '—'}`,
      });
    } else {
      notReady.push({
        value: item.id,
        label: baseLabel,
        sublabel: notReadySalesLineSublabel(item),
      });
    }
  }

  ready.sort((a, b) => a.label.localeCompare(b.label));
  notReady.sort((a, b) => a.label.localeCompare(b.label));

  const groups: SelectOptionGroup[] = [];
  if (ready.length) {
    groups.push({
      id: 'ready',
      category: SALES_LINE_READY_GROUP,
      subcategory: 'Price, warehouse & available stock',
      tone: 'ready',
      options: ready,
    });
  }
  if (notReady.length) {
    groups.push({
      id: 'not-ready',
      category: SALES_LINE_NOT_READY_GROUP,
      subcategory: 'Out of stock, on order, or awaiting Finance',
      tone: 'pending',
      options: notReady,
    });
  }
  return groups;
}

export function findSalesLineItem(items: Item[], itemId: number | null): Item | undefined {
  if (!itemId) return undefined;
  return items.find((item) => item.id === itemId);
}
