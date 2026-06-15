export type ItemType =
  | 'TRADED'
  | 'RAW_MATERIAL'
  | 'WORK_IN_PROGRESS'
  | 'FINISHED_GOODS'
  | 'MANUFACTURED'
  | 'PPE'
  | 'SPARE_PART'
  | 'ASSET'
  | 'SERVICE';

export type MovementType =
  | 'IN'
  | 'OUT'
  | 'TRANSFER'
  | 'ADJUSTMENT'
  | 'PRODUCTION_CONSUMPTION'
  | 'PRODUCTION_OUTPUT';

export type AdjustmentType =
  | 'INCREASE'
  | 'DECREASE'
  | 'DAMAGE'
  | 'LOSS'
  | 'WRITE_OFF'
  | 'PHYSICAL_COUNT';

export type AdjustmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
export type AlertType =
  | 'LOW_STOCK'
  | 'OUT_OF_STOCK'
  | 'EXPIRY_SOON'
  | 'OVERSTOCK'
  | 'NEGATIVE_STOCK'
  | 'PENDING_APPROVAL';

export type WarehouseType =
  | 'RAW_MATERIAL'
  | 'FINISHED_GOODS'
  | 'MINING_CONSUMABLES'
  | 'PPE'
  | 'SPARE_PARTS'
  | 'TRANSIT';

export type TransferStatus = 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED';
export type ItemUsage = 'FOR_SALE' | 'INTERNAL_USE' | 'BOTH';
export type DeptRequestPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type DeptRequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING'
  | 'APPROVED'
  | 'PROCESSING'
  | 'ISSUED'
  | 'PARTIALLY_ISSUED'
  | 'REJECTED';
export type GinIssueType = 'SALES' | 'INTERNAL' | 'PRODUCTION' | 'TRANSFER';
export type GinStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type StockTakeStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ReorderPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ValuationMethod = 'FIFO' | 'WEIGHTED_AVERAGE' | 'STANDARD_COST';

export type DeptRequestDepartment =
  | 'PRODUCTION'
  | 'PROCUREMENT'
  | 'HSE'
  | 'LOGISTICS'
  | 'MAINTENANCE'
  | 'ADMINISTRATION';

export type GinDepartment =
  | 'PRODUCTION'
  | 'MAINTENANCE'
  | 'HSE'
  | 'LOGISTICS'
  | 'SALES'
  | 'PROCUREMENT'
  | 'ADMINISTRATION';

export interface Category {
  id: number;
  code: string;
  name: string;
  description: string;
  parent: number | null;
  parent_name: string | null;
  children_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: number;
  code: string;
  name: string;
  subcategory: string;
  description: string;
  category: number;
  category_name: string;
  item_type: ItemType;
  item_usage?: ItemUsage;
  unit_of_measure: string;
  has_serial_number: boolean;
  has_batch_tracking: boolean;
  has_expiry_date: boolean;
  reorder_level: number;
  minimum_stock: number;
  maximum_stock: number;
  safety_stock: number;
  lead_time_days: number;
  preferred_supplier: number | null;
  currency: number;
  currency_code: string;
  unit_cost: number;
  selling_price: number;
  is_active: boolean;
  tracks_stock?: boolean;
  created_at: string;
  updated_at: string;
  current_stock?: number;
}

export interface MasterInventorySeedPreview {
  categories_total: number;
  items_total: number;
  categories_existing: number;
  items_existing: number;
  categories_pending: number;
  items_pending: number;
}

export interface MasterInventorySeedResult extends MasterInventorySeedPreview {
  categories_created: number;
  categories_updated: number;
  items_created: number;
  items_updated: number;
  items_unchanged: number;
  preview: MasterInventorySeedPreview;
}

export interface Warehouse {
  id: number;
  name: string;
  location: string;
  warehouse_type: WarehouseType;
  capacity: number;
  manager: number | null;
  manager_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Stock {
  id: number;
  item: number;
  item_code: string;
  item_name: string;
  warehouse: number;
  warehouse_name: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  unit_of_measure: string;
  reorder_level: number;
  last_updated: string;
  unit_cost: number;
  total_value: number;
  status: StockStatus;
}

export interface StockMovement {
  id: number;
  item: number;
  item_code: string;
  item_name: string;
  warehouse: number;
  warehouse_name: string;
  movement_type: MovementType;
  reference_type: string;
  reference_id: string;
  quantity: number;
  unit_cost: number;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
}

export interface StockAdjustment {
  id: number;
  item: number;
  item_code: string;
  item_name: string;
  warehouse: number;
  warehouse_name: string;
  adjustment_type: AdjustmentType;
  quantity: number;
  reason: string;
  status: AdjustmentStatus;
  requested_by: number;
  requested_by_name: string;
  approved_by: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockAlert {
  id: number;
  item: number;
  item_code: string;
  item_name: string;
  warehouse: number;
  warehouse_name: string;
  alert_type: AlertType;
  message: string;
  is_read: boolean;
  created_at: string;
  current_qty?: number;
  reorder_level?: number;
}

export interface StockSummary {
  total_items: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_stock_value: number;
}

export interface StockBatch {
  id: number;
  item: number;
  item_code: string;
  item_name: string;
  warehouse: number;
  warehouse_name: string;
  batch_number: string;
  manufacture_date: string | null;
  expiry_date: string | null;
  supplier: number | null;
  supplier_name: string | null;
  quantity: number;
  unit_cost: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockTransferLine {
  id: number;
  item: number;
  item_code: string;
  item_name: string;
  quantity: number;
}

export interface StockTransfer {
  id: number;
  transfer_number: string;
  source_warehouse: number;
  source_warehouse_name: string;
  destination_warehouse: number;
  destination_warehouse_name: string;
  status: TransferStatus;
  notes: string;
  requested_by: number;
  requested_by_name: string;
  approved_by: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  lines: StockTransferLine[];
  created_at: string;
  updated_at: string;
}

export interface DepartmentRequestLine {
  id: number;
  item: number;
  item_code: string;
  item_name: string;
  item_usage?: ItemUsage;
  quantity: number;
  requested_qty?: number;
  issued_qty?: number;
  remaining_qty?: number;
  available_stock?: number;
  warehouse?: number | null;
  warehouse_name?: string | null;
  notes?: string;
}

export interface DepartmentRequest {
  id: number;
  request_number: string;
  department: DeptRequestDepartment;
  warehouse: number;
  warehouse_name: string;
  priority?: DeptRequestPriority;
  purpose?: string;
  needed_by_date?: string | null;
  status: DeptRequestStatus;
  notes: string;
  requested_by: number;
  requested_by_name: string;
  approved_by: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  issued_at: string | null;
  rejection_reason?: string;
  approval_comment?: string;
  total_estimated_cost?: number;
  lines: DepartmentRequestLine[];
  created_at: string;
  updated_at: string;
}

export interface GoodsIssueLine {
  id: number;
  item: number;
  item_code: string;
  item_name: string;
  quantity: number;
}

export interface GoodsIssueNote {
  id: number;
  gin_number: string;
  issue_type?: GinIssueType;
  department: GinDepartment;
  warehouse: number;
  warehouse_name: string;
  status: GinStatus;
  reason: string;
  requested_by: number;
  requested_by_name: string;
  approved_by: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  lines: GoodsIssueLine[];
  created_at: string;
  updated_at: string;
}

export interface StockTakeLine {
  id: number;
  item: number;
  item_code: string;
  item_name: string;
  system_quantity: number;
  physical_quantity: number;
  variance: number;
  reason: string;
}

export interface StockTake {
  id: number;
  take_number: string;
  warehouse: number;
  warehouse_name: string;
  status: StockTakeStatus;
  notes: string;
  conducted_by: number;
  conducted_by_name: string;
  approved_by: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  lines: StockTakeLine[];
  created_at: string;
  updated_at: string;
}

export interface ItemSerialNumber {
  id: number;
  item: number;
  item_code: string;
  warehouse: number;
  warehouse_name: string;
  serial_number: string;
  manufacturer_serial: string;
  purchase_date: string | null;
  warranty_date: string | null;
  status: string;
  sold_to: number | null;
  sold_to_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReorderSuggestion {
  item: number;
  item_code: string;
  item_name: string;
  warehouse: number;
  warehouse_name: string;
  current_stock: number;
  reorder_level: number;
  suggested_quantity: number;
  estimated_cost: number;
  priority: ReorderPriority;
  department: string;
}

export interface ValuationReport {
  method: ValuationMethod;
  total_value: number;
  by_category: { category: string; value: number }[];
  by_warehouse: { warehouse: string; value: number }[];
  items: {
    item_code: string;
    item_name: string;
    category: string;
    warehouse: string;
    quantity: number;
    unit_cost: number;
    total_value: number;
  }[];
}

export interface InventoryDashboard {
  total_inventory_value: number;
  total_skus: number;
  total_warehouses: number;
  low_stock_count: number;
  out_of_stock_count: number;
  pending_requisitions: number;
  pending_adjustments: number;
  pending_grn: number;
  pending_department_requests: number;
  pending_requests?: number;
  stock_in_today?: number;
  stock_out_today?: number;
  store_department?: string;
  warehouse_utilization?: {
    warehouse_id: number;
    warehouse_name: string;
    sku_count: number;
    total_value: number;
    quantity_on_hand: number;
    capacity: number;
    utilization_pct: number | null;
  }[];
  value_by_category: { category: string; value: number }[];
  monthly_chart: { month: string; stock_in: number; stock_out: number }[];
  fast_moving_items: { item_code: string; item_name: string; quantity: number }[];
  slow_moving_items: { item_code: string; item_name: string; quantity: number }[];
  top_selling_products: { item_code: string; item_name: string; quantity: number }[];
  top_consumed_materials: { item_code: string; item_name: string; quantity: number }[];
  recent_activities: {
    type: string;
    item_code: string;
    item_name: string;
    warehouse_name: string;
    quantity: number;
    created_at: string;
    created_by_name: string | null;
  }[];
  total_reserved?: number;
  unread_alerts?: number;
  inventory_health_score?: number;
  ownership_hierarchy?: string[];
}

export interface InventoryAuditLog {
  id: number;
  user: number | null;
  user_name: string | null;
  module: string;
  action: string;
  record_id: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}

export interface Currency {
  id: number;
  code: string;
  name: string;
  exchange_rate: number;
  is_default: boolean;
  is_active: boolean;
}

export interface UserOption {
  id: number;
  full_name: string;
  email: string;
}

export interface ItemFormData {
  code: string;
  name: string;
  subcategory?: string;
  description: string;
  category: number | null;
  item_type: ItemType;
  item_usage?: ItemUsage;
  unit_of_measure: string;
  has_serial_number: boolean;
  has_batch_tracking?: boolean;
  has_expiry_date: boolean;
  reorder_level: number;
  minimum_stock?: number;
  maximum_stock?: number;
  safety_stock?: number;
  lead_time_days?: number;
  preferred_supplier?: number | null;
  currency: number | null;
  unit_cost: number;
  selling_price: number;
  is_active: boolean;
}

export interface CategoryFormData {
  name: string;
  description: string;
  parent: number | null;
}

export interface WarehouseFormData {
  name: string;
  location: string;
  warehouse_type?: WarehouseType;
  capacity?: number;
  manager: number | null;
  is_active: boolean;
}

export interface AdjustmentFormData {
  item: number | null;
  warehouse: number | null;
  adjustment_type: AdjustmentType;
  quantity: number;
  reason: string;
}

export interface TransferFormData {
  source_warehouse: number;
  destination_warehouse: number;
  notes: string;
  lines: { item: number; quantity: number }[];
}

export interface DepartmentRequestFormData {
  department: DeptRequestDepartment;
  warehouse: number;
  priority?: DeptRequestPriority;
  purpose?: string;
  needed_by_date?: string | null;
  notes: string;
  submit?: boolean;
  lines: {
    item: number;
    quantity: number;
    requested_qty?: number;
    warehouse?: number | null;
    notes?: string;
  }[];
}

export interface InternalConsumptionReport {
  department: string | null;
  month: string;
  internal_items_count: number;
  pending_issue_count: number;
  movement_cost_mtd: string;
  department_usage: { department: string; request_count: number; total_cost: string }[];
  most_consumed_items: {
    item_code: string;
    item_name: string;
    quantity: string;
    total_cost: string;
    request_count: number;
  }[];
  most_requested_items: {
    item_code: string;
    item_name: string;
    total_requested: string;
    request_count: number;
  }[];
  monthly_trend: { month: string; issue_count: number; total_cost: string }[];
}

export interface CostAllocationReport {
  month: string;
  total_internal_expense: string;
  allocations: {
    department: string;
    consumption_cost: string;
    request_count: number;
    share_percent: number;
  }[];
  monthly_trend: { month: string; issue_count: number; total_cost: string }[];
}

export interface ProductionReceiptQueueItem {
  id: number;
  wo_number: string;
  product_name: string;
  product_code: string;
  quantity_planned: string;
  quantity_produced: string;
  quantity_rejected: string;
  operator_name: string;
  production_approved_at: string | null;
  production_approved_by_name: string | null;
  status: string;
  pending_receipt: {
    quantity: string;
    batch_number: string;
    posted: boolean;
  };
}

export interface GinFormData {
  department: GinDepartment;
  warehouse: number;
  reason: string;
  lines: { item: number; quantity: number }[];
}

export interface StockTakeFormData {
  warehouse: number;
  notes: string;
  lines: {
    item: number;
    system_quantity: number;
    physical_quantity: number;
    reason: string;
  }[];
}

export interface BatchFormData {
  item: number;
  warehouse: number;
  batch_number: string;
  manufacture_date: string | null;
  expiry_date: string | null;
  supplier: number | null;
  quantity: number;
  unit_cost: number;
}

export interface SerialNumberFormData {
  item: number;
  warehouse: number;
  serial_number: string;
  manufacturer_serial: string;
  purchase_date: string | null;
  warranty_date: string | null;
  status: string;
}
