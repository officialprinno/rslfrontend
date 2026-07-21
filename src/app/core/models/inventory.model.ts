import type { PaginatedData } from './paginated.model';

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

export type StockTakeSessionStatus =
  | 'DRAFT'
  | 'COUNTING'
  | 'UPLOADED'
  | 'REVIEWED'
  | 'PENDING_GM_APPROVAL'
  | 'APPROVED'
  | 'ADJUSTED'
  | 'COMPLETED'
  | 'REJECTED';

export type StockTakeLineAdjustmentStatus = 'PENDING' | 'ADJUSTED' | 'IGNORED';
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
  approved_selling_price?: number | null;
  finance_price_approved?: boolean;
  finance_pricing_pending?: boolean;
  pending_finance_workflow_id?: number | null;
  pending_finance_workflow_status?: string | null;
  pending_finance_workflow_grn_number?: string | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  thickness?: number | null;
  diameter?: number | null;
  dimension_unit?: string;
  weight_per_unit?: number | null;
  weight_unit?: string;
  quantity_on_hand?: number;
  quantity_available?: number;
  incoming_qty?: number | string | null;
  sales_line_ready?: boolean;
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

export type StockLifecycleStatus = 'AVAILABLE' | 'FROZEN' | 'WIP' | 'ALLOCATED' | 'EMPTY';

export interface StockReservationLine {
  sales_order_id: number;
  so_number: string;
  customer_id: number;
  customer_name: string;
  item_code: string;
  item_name: string;
  quantity_ordered: number | string;
  quantity_reserved: number | string;
  order_status: string;
  inventory_status: string;
  delivery_date: string | null;
}

export interface StockReservationBreakdown {
  stock_id: number;
  item_code: string;
  item_name: string;
  warehouse_id: number;
  warehouse_name: string;
  quantity_reserved_stock: number | string;
  total_reserved: number | string;
  unallocated_reserved: number | string;
  reservations: StockReservationLine[];
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
  quantity_wip?: number;
  quantity_frozen?: number;
  quantity_total?: number;
  quantity_available: number;
  incoming_qty?: number;
  unit_of_measure: string;
  reorder_level: number;
  last_updated: string;
  unit_cost: number;
  total_value: number;
  status: StockStatus;
  lifecycle_status?: StockLifecycleStatus;
  location_path?: string;
  category_name?: string;
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

export type DamageType =
  | 'DAMAGED'
  | 'EXPIRED'
  | 'LOST'
  | 'QUALITY_REJECT'
  | 'OTHER';

export type DamageReportStatus =
  | 'PENDING_GM'
  | 'PENDING'
  | 'FROZEN'
  | 'REVIEWED'
  | 'WRITTEN_OFF'
  | 'RECOVERED'
  | 'REJECTED';

export interface DamageAttachment {
  id: number;
  file: string;
  file_url: string | null;
  caption: string;
  created_at: string;
}

export interface DamageReport {
  id: number;
  report_number: string;
  stock: number;
  item_code: string;
  item_name: string;
  warehouse_name: string;
  unit_of_measure: string;
  damage_type: DamageType;
  damage_type_display: string;
  quantity_affected: number;
  description: string;
  serial_numbers: string[];
  batch_numbers: string[];
  status: DamageReportStatus;
  status_display: string;
  report_date: string;
  reported_by_name: string;
  resolved_by_name: string | null;
  resolved_at: string | null;
  resolution_notes: string;
  gm_approved_by_name: string | null;
  gm_approved_at: string | null;
  gm_rejected_by_name: string | null;
  gm_rejected_at: string | null;
  gm_rejection_reason: string;
  can_gm_approve: boolean;
  journal_entry_number: string | null;
  estimated_value: number;
  stock_frozen_qty?: number;
  stock_impact?: string;
  attachments: DamageAttachment[];
  created_at: string;
}

export interface DamageReportFormData {
  item: number;
  warehouse: number;
  quantity_affected: number;
  damage_type: DamageType;
  description: string;
  serial_numbers?: string[];
  batch_numbers?: string[];
  attachments?: File[];
}

export type SupplierTrackingStatus =
  | 'AWAITING'
  | 'ACKNOWLEDGED'
  | 'MANUFACTURING'
  | 'PRODUCTION'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'DELAYED'
  | 'CUSTOM';

export interface SupplierOrderTracking {
  id: number;
  po_id: number;
  po_number: string;
  po_status: string;
  supplier_name: string;
  expected_delivery: string | null;
  status: SupplierTrackingStatus;
  manual_status_label?: string;
  display_status?: string;
  dispatch_date: string | null;
  eta_date: string | null;
  quantity_dispatched: number | null;
  carrier: string;
  tracking_number: string;
  supplier_notes: string;
  response_source: string;
  responded_at: string | null;
  token_expires_at: string;
  has_active_token: boolean;
  supplier_email?: string;
  can_receive_goods?: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierOrderTrackingUpdate {
  status?: SupplierTrackingStatus;
  manual_status_label?: string;
  dispatch_date?: string | null;
  eta_date?: string | null;
  quantity_dispatched?: number | null;
  carrier?: string;
  tracking_number?: string;
  supplier_notes?: string;
}

export interface SupplierPortalLineItem {
  po_item_id: number;
  code: string;
  name: string;
  quantity_ordered: string;
  quantity_received: string;
  quantity_dispatched: string | null;
  uom: string;
}

export interface SupplierPortalItemRespondData {
  po_item_id?: number;
  code?: string;
  quantity_dispatched?: number | null;
}

export interface SupplierPortalTracking {
  po_number: string;
  company_name: string;
  supplier_name: string;
  order_date: string | null;
  expected_delivery: string | null;
  currency_code: string;
  po_status: string;
  tracking_status: SupplierTrackingStatus;
  dispatch_date: string | null;
  eta_date: string | null;
  quantity_dispatched: string | null;
  carrier: string;
  tracking_number: string;
  supplier_notes: string;
  responded_at: string | null;
  token_expires_at: string;
  token_expired: boolean;
  items: SupplierPortalLineItem[];
}

export interface SupplierPortalRespondData {
  status?: SupplierTrackingStatus;
  dispatch_date?: string | null;
  eta_date?: string | null;
  quantity_dispatched?: number | null;
  items?: SupplierPortalItemRespondData[];
  carrier?: string;
  tracking_number?: string;
  supplier_notes?: string;
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

export interface StockOverviewSummary extends StockSummary {
  frozen_items_count: number;
  total_on_hand: number;
  total_reserved: number;
  total_wip: number;
  total_frozen: number;
  total_available: number;
  total_incoming: number;
  total_quantity: number;
}

export interface StockOverviewPage extends PaginatedData<Stock> {
  summary: StockOverviewSummary;
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
  unit_of_measure?: string;
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
  unit_of_measure?: string;
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

export interface StockTakeSessionLastCompleted {
  id: number;
  session_number: string;
  period_month: number;
  period_year: number;
  completed_at: string | null;
  line_count: number;
  variance_count: number;
  net_variance_value: string;
}

export interface StockTakeWarehouseOption {
  id: number;
  name: string;
  location: string;
  is_outbound_frozen: boolean;
  company_id: number | null;
  last_completed_session: StockTakeSessionLastCompleted | null;
  existing_session_id: number | null;
  existing_session_status: StockTakeSessionStatus | null;
  existing_session_number: string | null;
  within_window: boolean;
  allow_outside_window?: boolean;
  window_start: string;
  window_end: string;
  can_start_new: boolean;
  can_resume: boolean;
}

export interface StockTakeSettings {
  id: number;
  company: number | null;
  allow_outside_window: boolean;
  updated_by: number | null;
  updated_by_name: string | null;
  updated_at: string;
}

export interface StockTakeWarehousePickerPayload {
  warehouses: StockTakeWarehouseOption[];
  allow_outside_window: boolean;
  within_window: boolean;
  window_start: string;
  window_end: string;
  can_manage_settings: boolean;
}

export interface StockTakeSessionPreviewItem {
  item_id: number;
  item_code: string;
  item_name: string;
  unit_of_measure: string;
  system_quantity: string;
  unit_cost: string;
}

export interface StockTakeSessionPreview {
  warehouse_id: number;
  warehouse_name: string;
  period_month: number;
  period_year: number;
  window_start: string;
  window_end: string;
  within_window: boolean;
  allow_outside_window?: boolean;
  existing_session_id: number | null;
  existing_session_status: StockTakeSessionStatus | null;
  existing_session_number: string | null;
  can_start_new: boolean;
  item_count: number;
  items: StockTakeSessionPreviewItem[];
  last_completed_session: StockTakeSessionLastCompleted | null;
}

export interface StockTakeSessionLine {
  id: number;
  item: number;
  item_code: string;
  item_name: string;
  unit_of_measure: string;
  system_quantity: number | string;
  unit_cost: number | string;
  physical_quantity: number | string | null;
  variance_qty: number | string;
  variance_value: number | string;
  counted_by_name: string;
  notes: string;
  adjustment_status: StockTakeLineAdjustmentStatus;
  stock_adjustment: number | null;
}

export interface StockTakeSession {
  id: number;
  session_number: string;
  warehouse: number;
  warehouse_name: string;
  company: number | null;
  period_month: number;
  period_year: number;
  window_start: string;
  window_end: string;
  status: StockTakeSessionStatus;
  notes: string;
  rejection_notes: string;
  created_by: number;
  created_by_name: string;
  reviewed_by: number | null;
  reviewed_at: string | null;
  approved_by: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  adjusted_at: string | null;
  completed_at: string | null;
  journal_entry: number | null;
  journal_entry_number: string | null;
  version: number;
  line_count?: number;
  counted_line_count?: number;
  created_at: string;
  updated_at: string;
}

export interface StockTakeVarianceReview {
  session_id: number;
  session_number: string;
  status: StockTakeSessionStatus;
  warehouse_id: number;
  warehouse_name: string;
  period_month: number;
  period_year: number;
  totals: {
    total_lines: number;
    counted_lines: number;
    variance_count: number;
    positive_variance_value: string;
    negative_variance_value: string;
    net_variance_value: string;
  };
  variance_lines: Array<{
    id: number;
    item_id: number;
    item_code: string;
    item_name: string;
    unit_of_measure: string;
    system_quantity: string;
    physical_quantity: string | null;
    unit_cost: string;
    variance_qty: string;
    variance_value: string;
    direction: 'SURPLUS' | 'SHORTAGE' | 'NONE';
    counted_by_name: string;
    notes: string;
    adjustment_status: StockTakeLineAdjustmentStatus;
  }>;
}

export interface StockTakeCsvUploadResult {
  upload: {
    session_id: number;
    session_number: string;
    status: StockTakeSessionStatus;
    updated_count: number;
    affected_item_codes: string[];
    counted_lines: number;
    total_lines: number;
    all_counted: boolean;
  };
  session: StockTakeSession;
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
    id: number;
    type: string;
    reference_type: string;
    reference_id: string | null;
    entity_id: number | null;
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
  company_code?: string | null;
  company_id?: number | null;
  warehouse_manager_role?: string;
  business_unit_profiles?: Record<
    string,
    {
      label: string;
      warehouse_manager_role: string;
      sections: {
        key: string;
        label: string;
        sku_count?: number;
        total_value?: number;
        quantity?: number;
      }[];
    }
  >;
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
  rate_effective_at?: string | null;
  rate_expires_at?: string | null;
  rate_is_current?: boolean;
  rate_updated_by_name?: string | null;
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
  length?: number | null;
  width?: number | null;
  height?: number | null;
  thickness?: number | null;
  diameter?: number | null;
  dimension_unit?: string;
  weight_per_unit?: number | null;
  weight_unit?: string;
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

export type InventorySalesStockQueue = 'pending' | 'out_of_stock' | 'handover' | 'pickup' | 'all';

export interface InventorySalesOrder {
  id: number;
  so_number: string;
  status: string;
  inventory_status?: string;
  delivery_method?: string;
  handover_pending?: boolean;
  pickup_ready?: boolean;
  pickup_ready_at?: string | null;
  pickup_ready_by_name?: string | null;
  scheduled_pickup_date?: string | null;
  customer_name: string;
  warehouse_name?: string | null;
  currency_code: string;
  delivery_date?: string;
  subtotal?: number;
  tax_amount?: number;
  total_amount?: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface InventorySalesOrderDetail extends InventorySalesOrder {
  items: import('./sales.model').SOItem[];
  delivery_address?: string;
  requested_delivery_location?: string;
  notes?: string;
  dispatch_assignment?: import('./sales.model').SODispatchAssignment | null;
}
