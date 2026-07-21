import { Stock } from '../../../core/models/inventory.model';

export interface ItemWarehouseAvailability {
  warehouseId: number;
  warehouseName: string;
  quantityAvailable: number;
}

/** Group stock rows by item with per-warehouse available quantities. */
export function groupAvailableStockByItemWarehouse(
  stocks: Stock[],
): Map<number, ItemWarehouseAvailability[]> {
  const map = new Map<number, ItemWarehouseAvailability[]>();
  stocks.forEach((s) => {
    const itemId = Number(s.item);
    const list = map.get(itemId) ?? [];
    list.push({
      warehouseId: Number(s.warehouse),
      warehouseName: s.warehouse_name,
      quantityAvailable: Number(s.quantity_available),
    });
    map.set(itemId, list);
  });
  map.forEach((list, itemId) => {
    list.sort((a, b) => b.quantityAvailable - a.quantityAvailable);
    map.set(itemId, list);
  });
  return map;
}

export function warehouseAvailabilityLabel(row: ItemWarehouseAvailability): string {
  return `${row.warehouseName} — ${row.quantityAvailable} available`;
}

export function normalizeEntityId(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
