export type VehicleType = 'TRUCK' | 'PICKUP' | 'VAN' | 'TANKER' | 'OTHER';
export type VehicleStatus = 'AVAILABLE' | 'ON_TRIP' | 'IN_USE' | 'RETURNING' | 'MAINTENANCE' | 'BREAKDOWN' | 'OUT_OF_SERVICE';
export type LicenseClass = 'B' | 'C' | 'CE' | 'D';
export type DOStatus = 'SCHEDULED' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED' | 'CANCELLED';
export type DNStatus = 'PENDING' | 'SIGNED' | 'DISPUTED';
export type MaintenanceType = 'SERVICE' | 'REPAIR' | 'INSPECTION';
export type MaintenanceStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
export type ComplianceType = 'INSURANCE' | 'LICENCE' | 'SERVICE' | 'DRIVER_LICENCE' | 'MEDICAL';
export type ComplianceSeverity = 'EXPIRED' | 'EXPIRING_SOON';

export interface Vehicle {
  id: number;
  registration_number: string;
  make: string;
  model: string;
  year: number;
  vehicle_type: VehicleType;
  capacity_kg: number;
  color: string;
  status: VehicleStatus;
  insurance_expiry: string | null;
  road_licence_expiry: string | null;
  last_service_date: string | null;
  next_service_date: string | null;
  odometer_reading: number;
  current_location: string;
  is_active: boolean;
  total_trips?: number;
  total_km?: number;
  fuel_this_month?: number;
  created_at: string;
  updated_at: string;
}

export interface VehicleFormData {
  registration_number: string;
  make: string;
  model: string;
  year: number;
  vehicle_type: VehicleType;
  capacity_kg: number;
  color?: string;
  status: VehicleStatus;
  insurance_expiry?: string;
  road_licence_expiry?: string;
  last_service_date?: string;
  next_service_date?: string;
  odometer_reading: number;
  current_location?: string;
  is_active?: boolean;
}

export interface Driver {
  id: number;
  user: number;
  user_id: number;
  employee_id: number;
  full_name: string;
  phone: string;
  license_number: string;
  license_class: LicenseClass;
  license_expiry: string;
  medical_expiry: string;
  is_available: boolean;
  total_trips?: number;
  on_time_percent?: number;
  incidents_count?: number;
  current_assignment?: { do_number: string; destination: string } | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DriverFormData {
  user?: number;
  employee?: number;
  license_number: string;
  license_class: LicenseClass;
  license_expiry: string;
  medical_expiry: string;
  is_available: boolean;
}

export interface DriverEligibleEmployee {
  id: number;
  employee_number: string;
  full_name: string;
  department_name: string;
  work_email: string;
  phone: string;
  user_id: number | null;
  has_login: boolean;
}

export interface DeliveryItem {
  id?: number;
  so_item: number;
  so_item_id?: number;
  item: number;
  item_id?: number;
  item_code?: string;
  item_name?: string;
  quantity_ordered?: number;
  quantity_delivered?: number;
  quantity: number;
  serial_number?: string;
  condition_out?: string;
  condition_in?: string;
  notes?: string;
}

export interface DeliveryOrder {
  id: number;
  do_number: string;
  sales_order: number;
  so_id: number;
  so_number: string;
  vehicle: number | null;
  vehicle_id: number | null;
  vehicle_registration: string | null;
  driver: number | null;
  driver_id: number | null;
  driver_name: string;
  driver_phone: string;
  origin_warehouse: number;
  origin_warehouse_id: number;
  origin_warehouse_name: string;
  destination: string;
  customer: number;
  customer_id: number;
  customer_name: string;
  scheduled_date: string;
  actual_departure: string | null;
  actual_arrival: string | null;
  distance_km: number;
  status: DOStatus;
  trip_status?: string;
  logistics_review_status?: string;
  odometer_start?: number | null;
  odometer_end?: number | null;
  fuel_remaining?: number | null;
  trip_started_at?: string | null;
  arrived_at?: string | null;
  delivered_at?: string | null;
  return_confirmed_at?: string | null;
  failure_reason?: string;
  notes: string;
  items: DeliveryItem[];
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface DOFormData {
  sales_order: number;
  vehicle?: number | null;
  driver?: number | null;
  origin_warehouse: number;
  destination?: string;
  scheduled_date: string;
  distance_km: number;
  notes?: string;
  items: DeliveryItem[];
}

export interface DeliveryNote {
  id: number;
  dn_number: string;
  delivery_order: number;
  do_id: number;
  do_number: string;
  customer_name: string;
  delivery_date: string | null;
  signed_by: string;
  signed_at: string | null;
  customer_feedback: string;
  condition_notes: string;
  status: DNStatus;
  created_at: string;
}

export interface DeliveredFormData {
  signed_by: string;
  customer_feedback?: string;
  condition_notes?: string;
}

export interface VehicleMaintenance {
  id: number;
  vehicle: number;
  vehicle_id: number;
  vehicle_registration: string;
  vehicle_make_model: string;
  maintenance_type: MaintenanceType;
  description: string;
  cost: number;
  service_date: string;
  next_service_date: string | null;
  performed_by: string;
  status: MaintenanceStatus;
  work_done?: string;
  parts_replaced?: string;
  odometer_reading?: number | null;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceFormData {
  vehicle: number;
  maintenance_type: MaintenanceType;
  description: string;
  service_date: string;
  cost?: number;
  next_service_date?: string;
  performed_by?: string;
  notes?: string;
}

export interface CompleteMaintenanceData {
  service_date: string;
  cost: number;
  next_service_date?: string;
  work_done?: string;
  parts_replaced?: string;
  odometer_reading?: number;
}

export interface FuelRecord {
  id: number;
  vehicle: number;
  vehicle_id: number;
  vehicle_registration: string;
  driver: number | null;
  driver_id: number | null;
  driver_name: string;
  date: string;
  liters: number;
  cost_per_liter: number;
  total_cost: number;
  odometer_reading: number;
  station_name: string;
  notes?: string;
  created_by_name: string;
  created_at: string;
}

export interface FuelFormData {
  vehicle: number;
  driver?: number | null;
  date: string;
  liters: number;
  cost_per_liter: number;
  odometer_reading: number;
  station_name?: string;
  notes?: string;
}

export interface FuelSummary {
  total_cost_month: string;
  total_liters_month: string;
  avg_cost_per_km: string;
}

export interface ComplianceAlert {
  type: ComplianceType;
  severity: ComplianceSeverity;
  vehicle_id?: number;
  driver_id?: number;
  name: string;
  expiry_date: string;
  days_remaining: number;
}

export interface LogisticsDashboard {
  active_deliveries: number;
  deliveries_today: number;
  vehicles_available: number;
  pending_orders: number;
  live_deliveries: DeliveryOrder[];
  compliance_alerts: ComplianceAlert[];
  weekly_deliveries: { week: string; count: number }[];
  weekly_fuel_costs: { week: string; total: string }[];
}

export interface VehicleHistory {
  trips: DeliveryOrder[];
  maintenance: VehicleMaintenance[];
  fuel: FuelRecord[];
  stats: { total_trips: number; total_km: number; fuel_this_month: number };
}

export type LogisticsSalesQueue = 'delivery_cost' | 'dispatch' | 'in_transit' | 'all';

export interface LogisticsSalesOrder {
  id: number;
  so_number: string;
  status: string;
  customer_name: string;
  delivery_address?: string;
  requested_delivery_location?: string;
  delivery_method?: string;
  delivery_cost?: number;
  subtotal?: number;
  total_amount?: number;
  delivery_date?: string | null;
  delivery_order_id?: number | null;
  delivery_cost_detail?: {
    delivery_distance_km: string;
    transport_method: string;
    vehicle_type: string;
    fuel_cost: string;
    loading_cost: string;
    offloading_cost: string;
    additional_charges: string;
    total_delivery_cost: string;
    notes: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface LogisticsDeliveryOrderSummary {
  id: number;
  do_number: string;
  status: string;
  destination: string;
  origin_warehouse_name: string;
  scheduled_date: string;
  actual_departure: string | null;
  actual_arrival: string | null;
  distance_km: string;
  notes: string;
  vehicle_registration: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_type: string | null;
  vehicle_status: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  driver_license: string | null;
}

export interface LogisticsSalesOrderDetail extends LogisticsSalesOrder {
  items: import('./sales.model').SOItem[];
  dispatch_assignment?: import('./sales.model').SODispatchAssignment | null;
  delivery_order?: LogisticsDeliveryOrderSummary | null;
  customer_address?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_contact?: string;
  warehouse_name?: string | null;
  currency_code?: string;
  inventory_status?: string;
  delivery_status?: string;
  payment_status?: string;
  lpo_number?: string;
  tax_amount?: number;
  discount_amount?: number;
  notes?: string;
  created_by_name?: string;
}
