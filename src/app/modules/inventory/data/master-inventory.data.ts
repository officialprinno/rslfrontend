/**
 * Rock Solutions Limited — master inventory catalogue reference.
 * Mirrors backend apps/inventory/data/master_inventory.py
 */

export interface MasterCategoryRef {
  code: string;
  name: string;
}

export interface MasterItemRef {
  code: string;
  name: string;
  categoryCode: string;
  itemType: string;
}

export const MASTER_INVENTORY_CATEGORIES: MasterCategoryRef[] = [
  { code: 'RM', name: 'RAW MATERIALS INVENTORY' },
  { code: 'WIP', name: 'WORK IN PROGRESS' },
  { code: 'FG', name: 'FINISHED GOODS INVENTORY' },
  { code: 'RDT', name: 'ROCK DRILLING TOOLS' },
  { code: 'USM', name: 'UNDERGROUND SUPPORT MATERIALS' },
  { code: 'GEO', name: 'GEOLOGICAL CONSUMABLES' },
  { code: 'UVE', name: 'UNDERGROUND VENTILATION EQUIPMENT' },
  { code: 'ELE', name: 'ELECTRICAL CONSUMABLES' },
  { code: 'PPE', name: 'SAFETY EQUIPMENT (PPE)' },
  { code: 'LOG', name: 'TRANSPORT & LOGISTICS ITEMS' },
  { code: 'MSP', name: 'MAINTENANCE SPARE PARTS' },
  { code: 'TLE', name: 'TOOLS & EQUIPMENT' },
  { code: 'OIT', name: 'OFFICE & IT INVENTORY' },
  { code: 'NSS', name: 'NON-STOCK SERVICES' },
];

/** Total items in the master catalogue (94). */
export const MASTER_INVENTORY_ITEM_COUNT = 94;
