export type BOMStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';
export type Shift = 'MORNING' | 'AFTERNOON' | 'NIGHT';
export type WOStatus =
  | 'DRAFT'
  | 'APPROVED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'COMPLETED_PENDING'
  | 'PROD_APPROVED'
  | 'WAITING_STORE'
  | 'INV_RECEIVED'
  | 'CLOSED'
  | 'COMPLETED'
  | 'CANCELLED';
export type WOPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type MachineRuntimeCondition = 'RUNNING' | 'IDLE' | 'MAINTENANCE_REQUIRED' | 'BREAKDOWN';
export type MachineStatus = 'ACTIVE' | 'MAINTENANCE' | 'BREAKDOWN';
export type QCResult = 'PASS' | 'FAIL';
export type MaterialStatusLevel = 'SUFFICIENT' | 'LOW' | 'INSUFFICIENT';

export interface ProductSpecifications {
  wire_gauge?: string;
  mesh_size?: string;
  roll_width?: string;
  roll_length?: string;
  roll_weight?: string;
  [key: string]: string | undefined;
}

export interface Product {
  id: number;
  item: number;
  item_id: number;
  item_code: string;
  item_name: string;
  name: string;
  specifications: ProductSpecifications;
  standard_output: number;
  unit_of_measure: string;
  active_bom_id: number | null;
  active_bom_version: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductFormData {
  item: number;
  name: string;
  specifications: ProductSpecifications;
  standard_output: number;
  unit_of_measure: string;
  is_active?: boolean;
}

export interface BOMItem {
  id?: number;
  item: number;
  item_id?: number;
  item_code?: string;
  item_name?: string;
  quantity_required: number;
  unit_of_measure?: string;
  wastage_percent: number;
  effective_quantity?: number;
  unit_cost?: number;
  total_cost?: number;
  current_stock?: number;
  notes?: string;
}

export interface BOM {
  id: number;
  product: number;
  product_id: number;
  product_name: string;
  version: string;
  status: BOMStatus;
  total_components: number;
  material_cost_per_unit: number;
  items: BOMItem[];
  notes: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface BOMFormData {
  product: number;
  version: string;
  notes?: string;
  items: BOMItem[];
}

export interface MaterialRequirement {
  item_id: number;
  item_code: string;
  item_name: string;
  required_quantity: string;
  available_stock: string;
  is_sufficient: boolean;
  shortage: string;
}

export interface MaterialIssue {
  id: number;
  item: number;
  item_code: string;
  item_name: string;
  quantity_issued: number;
  quantity_returned: number;
  wastage: number;
}

export interface PendingMaterial {
  id: number;
  item: number;
  item_code: string;
  item_name: string;
  quantity_consumed: number;
  waste_quantity: number;
  posted: boolean;
  created_at: string;
}

export interface ProgressEntry {
  id: number;
  quantity_produced: number;
  quantity_defective: number;
  progress_percent: number;
  machine_notes: string;
  recorded_by_name: string;
  created_at: string;
}

export interface ExecutionEvent {
  id: number;
  action: string;
  old_status: string;
  new_status: string;
  payload: Record<string, unknown>;
  user_name: string | null;
  created_at: string;
}

export interface FinishedGoodsReceipt {
  id: number;
  warehouse: number;
  warehouse_name: string;
  quantity_received: number;
  batch_number: string;
  notes: string;
  posted: boolean;
  received_by_name: string;
  created_at: string;
}

export interface WorkOrder {
  id: number;
  wo_number: string;
  product: number;
  product_id: number;
  product_name: string;
  product_specifications: ProductSpecifications;
  bom: number;
  bom_id: number;
  bom_version: string;
  sales_order: number | null;
  so_id: number | null;
  so_number: string | null;
  machine: number | null;
  quantity_planned: number;
  quantity_produced: number;
  quantity_rejected: number;
  planned_start: string;
  planned_end: string;
  actual_start: string | null;
  actual_end: string | null;
  shift: Shift;
  status: WOStatus;
  priority?: WOPriority;
  production_line?: string;
  execution_workflow?: boolean;
  assigned_at?: string | null;
  completion_notes?: string;
  machine_condition?: string;
  operator: number;
  operator_id: number;
  operator_name: string;
  material_requirements: MaterialRequirement[];
  material_issues?: MaterialIssue[];
  pending_materials?: PendingMaterial[];
  progress_entries?: ProgressEntry[];
  execution_events?: ExecutionEvent[];
  finished_goods_receipt?: FinishedGoodsReceipt | null;
  output_records?: OutputRecord[];
  machine_usage?: MachineUsage[];
  materials_issued: boolean;
  can_start: boolean;
  can_operator_start?: boolean;
  progress_percent: number;
  rejection_rate: number;
  approved_by_name: string | null;
  production_approved_by_name?: string | null;
  store_received_by_name?: string | null;
  created_by_name: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface WOFormData {
  product: number;
  bom?: number;
  sales_order?: number | null;
  machine?: number | null;
  quantity_planned: number;
  planned_start: string;
  planned_end: string;
  shift: Shift;
  operator: number;
  notes?: string;
}

export interface OutputRecord {
  id: number;
  work_order: number;
  wo_id: number;
  wo_number: string;
  batch_number: string;
  product_name: string;
  date: string;
  shift: Shift;
  quantity_produced: number;
  quantity_rejected: number;
  rejection_reason: string | null;
  operator: number;
  operator_id: number;
  operator_name: string;
  supervisor: number | null;
  supervisor_id: number | null;
  supervisor_name: string | null;
  quality_checked: boolean;
  quality_checked_by: number | null;
  quality_checked_by_name: string | null;
  qc_result: QCResult | null;
  qc_notes: string;
  notes: string;
  created_at: string;
}

export interface OutputFormData {
  work_order: number;
  date: string;
  shift: Shift;
  quantity_produced: number;
  quantity_rejected: number;
  rejection_reason?: string;
  operator: number;
  supervisor?: number | null;
  notes?: string;
}

export interface QCFormData {
  qc_result: QCResult;
  qc_notes?: string;
  rejection_reason?: string;
}

export interface Machine {
  id: number;
  machine_code: string;
  name: string;
  machine_type: string;
  purchase_date: string | null;
  status: MachineStatus;
  last_service_date: string | null;
  next_service_date: string | null;
  hours_this_month: number;
  utilization_rate: number;
  current_wo: { id: number; wo_number: string } | null;
  runtime_condition?: MachineRuntimeCondition;
  runtime_notes?: string;
  runtime_updated_at?: string | null;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MachineFormData {
  machine_code?: string;
  name: string;
  machine_type: string;
  purchase_date?: string;
  status: MachineStatus;
  last_service_date?: string;
  next_service_date?: string;
  notes?: string;
  is_active?: boolean;
}

export interface MachineUsage {
  id: number;
  machine: number;
  machine_id: number;
  machine_name: string;
  work_order: number;
  wo_id: number;
  wo_number: string;
  operator: number;
  operator_id: number;
  operator_name: string;
  start_time: string;
  end_time: string;
  hours_used: number;
  notes: string;
  created_at: string;
}

export interface MachineUsageFormData {
  machine: number;
  work_order: number;
  operator: number;
  start_time: string;
  end_time: string;
  hours_used: number;
  notes?: string;
}

export interface MaterialStatus {
  item_id: number;
  item_name: string;
  current_stock: string;
  required_for_active_wos: string;
  is_sufficient: boolean;
  status: MaterialStatusLevel;
}

export interface DailyOutput {
  date: string;
  planned: string;
  actual: string;
}

export interface OperatorDashboardOrder {
  id: number;
  wo_number: string;
  status: string;
  product_name: string;
  machine_id: number | null;
  machine_code: string;
  machine_name: string;
  quantity_planned: string;
  quantity_produced: string;
  progress_percent: number;
  planned_end: string | null;
  can_operator_start: boolean;
}

export interface OperatorDashboard {
  assigned_count: number;
  in_progress_count: number;
  paused_count: number;
  completed_count: number;
  efficiency_rate: number;
  units_today: string;
  machines_down: number;
  focus_order: OperatorDashboardOrder | null;
  assigned_orders: OperatorDashboardOrder[];
  machine_status: {
    id: number;
    machine_code: string;
    name: string;
    runtime_condition: string;
    status: string;
    is_breakdown: boolean;
  }[];
}

export interface ProductionDashboard {
  active_work_orders: number;
  units_today: string;
  units_this_month: string;
  efficiency_rate: number;
  active_wos: WorkOrder[];
  raw_material_status: MaterialStatus[];
  machine_status: Machine[];
  daily_output: DailyOutput[];
}

export interface MachineHistory {
  usage: MachineUsage[];
  services: { id: number; service_date: string; description: string; cost: number }[];
  breakdowns?: MachineBreakdownRecord[];
  hours_this_month: string;
}

export interface MachineBreakdownRecord {
  id: number;
  notes: string;
  photo_url: string | null;
  reported_by_name: string;
  work_order: string | null;
  created_at: string;
}

export interface ProductionOperatorPerformanceRow {
  operator_id: number;
  operator_name: string;
  work_orders_total: number;
  work_orders_completed: number;
  quantity_produced: string;
  quantity_rejected: string;
  quantity_planned: string;
  efficiency_pct: number;
  rejection_rate_pct: number;
}

export interface ProductionDowntimeReport {
  month: string;
  total_downtime_minutes: string;
  pause_event_count: number;
  by_machine: {
    machine_id: number;
    machine_code: string;
    machine_name: string;
    downtime_minutes: string;
    pause_count: number;
  }[];
  by_reason: { reason: string; downtime_minutes: string }[];
  events: {
    work_order: string;
    machine_code: string;
    operator_name: string;
    reason: string;
    paused_at: string;
    resumed_at: string | null;
    downtime_minutes: string;
  }[];
}

export interface ProductionUtilizationReport {
  month: string;
  machines: {
    machine_id: number;
    machine_code: string;
    machine_name: string;
    status: string;
    runtime_condition: string;
    hours_used: string;
    usage_sessions: number;
    utilization_pct: number;
    current_wo: string | null;
  }[];
}

export interface ProductionReportsBundle {
  month: string;
  operator_performance: { month: string; operators: ProductionOperatorPerformanceRow[] };
  downtime: ProductionDowntimeReport;
  machine_utilization: ProductionUtilizationReport;
  completed_work_orders: {
    month: string;
    work_orders: {
      wo_number: string;
      product_name: string;
      operator_name: string;
      quantity_planned: string;
      quantity_produced: string;
      quantity_rejected: string;
      efficiency_pct: number;
      actual_end: string | null;
      status: string;
    }[];
  };
  raw_material_status?: MaterialStatus[];
}
