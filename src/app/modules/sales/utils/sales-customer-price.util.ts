import { Item } from '../../../core/models/inventory.model';
import { CustomerItemPrice } from '../../../core/models/sales.model';

export type LinePriceSource = 'selling' | 'customer';

export function sellingUnitPrice(item: Item | null | undefined): number {
  return Number(item?.approved_selling_price ?? item?.selling_price ?? item?.unit_cost ?? 0);
}

export function customerPricesMap(rows: CustomerItemPrice[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const row of rows) {
    map.set(row.item, Number(row.unit_price));
  }
  return map;
}

export function customerUnitPrice(
  itemId: number | null | undefined,
  prices: Map<number, number>,
): number | null {
  if (!itemId) return null;
  return prices.has(itemId) ? Number(prices.get(itemId)) : null;
}

export function resolveLineUnitPrice(
  source: LinePriceSource,
  item: Item | null | undefined,
  customerPrice: number | null | undefined,
): number {
  if (source === 'customer' && customerPrice != null) {
    return Number(customerPrice);
  }
  return sellingUnitPrice(item);
}

export function detectLinePriceSource(
  unitPrice: number | string | null | undefined,
  item: Item | null | undefined,
  customerPrice: number | null | undefined,
): LinePriceSource {
  if (customerPrice == null) return 'selling';
  const price = Number(unitPrice);
  if (Number.isFinite(price) && Math.abs(price - Number(customerPrice)) < 0.005) {
    return 'customer';
  }
  return 'selling';
}
