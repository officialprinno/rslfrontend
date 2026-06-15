export type DriverAvailability = 'AVAILABLE' | 'ON_DELIVERY' | 'RETURNING' | 'OFF_DUTY';
export type TripStatus =
  | 'ASSIGNED'
  | 'STARTED'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'DELIVERED'
  | 'RETURNING'
  | 'RETURN_CONFIRMED';
export type VehicleCondition = 'GOOD' | 'MINOR_ISSUE' | 'MAINTENANCE_REQUIRED' | 'BREAKDOWN';
export type LogisticsReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface DriverProfile {
  id: number;
  user_id: number;
  employee_number: string;
  full_name: string;
  phone: string;
  email: string;
  license_number: string;
  license_class: string;
  license_expiry: string;
  medical_expiry: string;
  department: string;
  assigned_vehicle_id: number | null;
  assigned_vehicle_registration: string | null;
  availability_status: DriverAvailability;
  is_available: boolean;
  is_active: boolean;
  performance: DriverPerformance;
  created_at: string;
}

export interface DriverPerformance {
  total_trips: number;
  on_time_percent: number;
  incidents_count: number;
  completed_returns: number;
  avg_trip_hours: number;
}

export interface DriverDashboard {
  assigned_count: number;
  in_progress_count: number;
  completed_count: number;
  availability_status: DriverAvailability;
  active_trip_id: number | null;
  current_vehicle: {
    id: number;
    registration_number: string;
    make: string;
    model: string;
    status: string;
    odometer_reading: number;
  } | null;
}

export interface DriverTripItem {
  id: number;
  item_id: number;
  item_code: string;
  item_name: string;
  quantity: number;
  serial_number?: string;
  condition_out?: string;
}

export interface DeliveryConfirmation {
  receiver_name: string;
  receiver_position: string;
  receiver_phone: string;
  receiver_company: string;
  quantity_delivered: number;
  delivery_notes: string;
  signature_data?: string;
  proof_photo_url?: string;
  proof_document_url?: string;
  confirmed_at: string;
}

export interface TripEvent {
  id: number;
  action: string;
  from_status: string;
  to_status: string;
  details: string;
  user_name: string;
  created_at: string;
}

export interface DriverTrip {
  id: number;
  do_number: string;
  so_number: string;
  customer_name: string;
  destination: string;
  origin_warehouse_name: string;
  vehicle_registration: string | null;
  scheduled_date: string;
  status: string;
  trip_status: TripStatus;
  logistics_review_status: LogisticsReviewStatus;
  distance_km: number;
  odometer_start: number | null;
  odometer_end: number | null;
  fuel_remaining: number | null;
  vehicle_condition_start: string;
  vehicle_condition_end: string;
  trip_started_at: string | null;
  arrived_at: string | null;
  delivered_at: string | null;
  return_started_at: string | null;
  return_confirmed_at: string | null;
  notes: string;
  items: DriverTripItem[];
  confirmation: DeliveryConfirmation | null;
  trip_events: TripEvent[];
  created_at: string;
}

export interface StartDeliveryData {
  odometer_start: number;
  vehicle_condition?: string;
}

export interface ConfirmDeliveryData {
  receiver_name: string;
  receiver_position?: string;
  receiver_phone?: string;
  receiver_company?: string;
  quantity_delivered: number;
  delivery_notes?: string;
  signature_data?: string;
  proof_photo_url?: string;
  proof_document_url?: string;
}

export interface ConfirmReturnData {
  odometer_end: number;
  fuel_remaining?: number;
  vehicle_condition?: string;
}

export interface VehicleConditionData {
  vehicle: number;
  delivery_order?: number | null;
  condition: VehicleCondition;
  notes?: string;
  odometer_reading?: number;
  fuel_remaining?: number;
  photo_url?: string;
}
