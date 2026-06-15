import { Item, Stock, StockStatus, StockSummary } from '../../../core/models/inventory.model';

export function deriveStockStatus(
  quantityAvailable: number,
  reorderLevel: number,
): StockStatus {
  if (quantityAvailable <= 0) return 'OUT_OF_STOCK';
  if (quantityAvailable <= reorderLevel) return 'LOW_STOCK';
  return 'IN_STOCK';
}

export function enrichStockRow(stock: Stock, unitCost = 0): Stock {
  const status = deriveStockStatus(stock.quantity_available, stock.reorder_level);
  const cost = unitCost || stock.unit_cost || 0;
  return {
    ...stock,
    unit_cost: cost,
    total_value: stock.quantity_on_hand * cost,
    status,
  };
}

export function buildStockSummary(stocks: Stock[]): StockSummary {
  const itemIds = new Set<number>();
  let low = 0;
  let out = 0;
  let totalValue = 0;

  stocks.forEach((s) => {
    itemIds.add(s.item);
    const status = s.status ?? deriveStockStatus(s.quantity_available, s.reorder_level);
    if (status === 'LOW_STOCK') low += 1;
    if (status === 'OUT_OF_STOCK') out += 1;
    totalValue += s.total_value ?? 0;
  });

  return {
    total_items: itemIds.size,
    low_stock_count: low,
    out_of_stock_count: out,
    total_stock_value: totalValue,
  };
}

export function aggregateStockByItem(stocks: Stock[]): Map<number, number> {
  const map = new Map<number, number>();
  stocks.forEach((s) => {
    map.set(s.item, (map.get(s.item) ?? 0) + Number(s.quantity_on_hand));
  });
  return map;
}

export function buildItemCostMap(items: Item[]): Map<number, number> {
  const map = new Map<number, number>();
  items.forEach((i) => map.set(i.id, Number(i.unit_cost)));
  return map;
}
