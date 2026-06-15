import {
  DeptRequestDepartment,
  GinDepartment,
  ItemType,
  ValuationMethod,
  WarehouseType,
} from '../../../core/models/inventory.model';

export const ITEM_TYPES: ItemType[] = [
  'TRADED',
  'RAW_MATERIAL',
  'WORK_IN_PROGRESS',
  'FINISHED_GOODS',
  'MANUFACTURED',
  'PPE',
  'SPARE_PART',
  'ASSET',
  'SERVICE',
];

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  TRADED: 'Traded',
  RAW_MATERIAL: 'Raw Material',
  WORK_IN_PROGRESS: 'Work in Progress',
  FINISHED_GOODS: 'Finished Goods',
  MANUFACTURED: 'Manufactured',
  PPE: 'PPE & Safety',
  SPARE_PART: 'Spare Part',
  ASSET: 'Asset',
  SERVICE: 'Service (Non-Stock)',
};

export const WAREHOUSE_TYPES: { value: WarehouseType; label: string }[] = [
  { value: 'RAW_MATERIAL', label: 'Raw Material Warehouse' },
  { value: 'FINISHED_GOODS', label: 'Finished Goods Warehouse' },
  { value: 'MINING_CONSUMABLES', label: 'Mining Consumables Warehouse' },
  { value: 'PPE', label: 'PPE Warehouse' },
  { value: 'SPARE_PARTS', label: 'Spare Parts Warehouse' },
  { value: 'TRANSIT', label: 'Transit Warehouse' },
];

export const DEPT_REQUEST_DEPARTMENTS: { value: DeptRequestDepartment; label: string }[] = [
  { value: 'PRODUCTION', label: 'Production' },
  { value: 'PROCUREMENT', label: 'Procurement' },
  { value: 'HSE', label: 'HSE' },
  { value: 'LOGISTICS', label: 'Logistics' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'ADMINISTRATION', label: 'Administration' },
];

export const ITEM_USAGE_OPTIONS: { value: import('../../../core/models/inventory.model').ItemUsage; label: string }[] = [
  { value: 'FOR_SALE', label: 'For Sale (Commercial)' },
  { value: 'INTERNAL_USE', label: 'Internal Use Only' },
  { value: 'BOTH', label: 'Both Sales & Internal' },
];

export const DEPT_REQUEST_PRIORITIES: { value: import('../../../core/models/inventory.model').DeptRequestPriority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

export const GIN_ISSUE_TYPES: { value: import('../../../core/models/inventory.model').GinIssueType; label: string }[] = [
  { value: 'INTERNAL', label: 'Internal Consumption' },
  { value: 'SALES', label: 'Sales' },
  { value: 'PRODUCTION', label: 'Production' },
  { value: 'TRANSFER', label: 'Transfer' },
];

export const GIN_DEPARTMENTS: { value: GinDepartment; label: string }[] = [
  { value: 'PRODUCTION', label: 'Production' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'HSE', label: 'HSE' },
  { value: 'LOGISTICS', label: 'Logistics' },
  { value: 'SALES', label: 'Sales' },
  { value: 'PROCUREMENT', label: 'Procurement' },
  { value: 'ADMINISTRATION', label: 'Administration' },
];

export const VALUATION_METHODS: { value: ValuationMethod; label: string }[] = [
  { value: 'WEIGHTED_AVERAGE', label: 'Weighted Average' },
  { value: 'FIFO', label: 'FIFO' },
  { value: 'STANDARD_COST', label: 'Standard Cost' },
];

export const INVENTORY_CATEGORIES = [
  'RAW MATERIALS',
  'WORK IN PROGRESS (WIP)',
  'FINISHED GOODS',
  'ROCK DRILLING TOOLS',
  'UNDERGROUND SUPPORT MATERIALS',
  'GEOLOGICAL CONSUMABLES',
  'UNDERGROUND VENTILATION EQUIPMENT',
  'ELECTRICAL CONSUMABLES',
  'PPE & SAFETY EQUIPMENT',
  'TRANSPORT & LOGISTICS ITEMS',
  'SPARE PARTS',
  'TOOLS & EQUIPMENT',
  'OFFICE & IT ASSETS',
] as const;

export const UNITS_OF_MEASURE = [
  'pieces',
  'kg',
  'meters',
  'rolls',
  'liters',
  'coils',
  'panels',
  'boxes',
  'sets',
] as const;

export function generateItemCode(): string {
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ITM-${suffix}`;
}
