export interface SecurityLocation {
  id: number;
  name: string;
  address: string;
  description: string;
  color: string;
  icon: string;
  is_active: boolean;
}

export interface VisitorItem {
  description: string;
  quantity: number;
  serial_number: string | null;
  returned: boolean;
}

export interface Visitor {
  id: number;
  visitor_number: string;
  full_name: string;
  id_type: 'NATIONAL_ID' | 'PASSPORT' | 'DRIVING_LICENCE';
  id_number: string;
  phone: string;
  company: string;
  photo_url: string | null;
  email: string;
  purpose: 'MEETING' | 'DELIVERY' | 'CONTRACTOR' | 'INSPECTION' | 'OTHER';
  host_employee: number;
  host_employee_name: string;
  department_name: string;
  location: number;
  location_name: string;
  expected_time_in: string;
  expected_time_out: string;
  actual_time_in: string | null;
  actual_time_out: string | null;
  badge_number: string | null;
  vehicle_registration: string | null;
  items_brought: VisitorItem[];
  status: 'PENDING' | 'SIGNED_IN' | 'SIGNED_OUT' | 'OVERSTAYING' | 'DENIED';
  denial_reason: string | null;
  notes: string;
  registered_by_name: string;
  created_at: string;
}

export interface VehicleLog {
  id: number;
  log_number: string;
  registration_number: string;
  vehicle_type: 'COMPANY' | 'EMPLOYEE' | 'VISITOR' | 'SUPPLIER' | 'CONTRACTOR' | 'UNKNOWN';
  make: string;
  color: string;
  driver_name: string;
  driver_id_number: string;
  company: string;
  purpose: string;
  occupants_count: number;
  cargo_description: string;
  location: number;
  location_name: string;
  time_in: string;
  time_out: string | null;
  expected_time_out: string | null;
  status: 'ON_PREMISES' | 'EXITED' | 'FLAGGED';
  flag_reason: string | null;
  security_officer_name: string;
  created_at: string;
}

export interface InterLocationMovement {
  id: number;
  movement_number: string;
  type: 'EMPLOYEE' | 'VEHICLE';
  movement_type?: 'EMPLOYEE' | 'VEHICLE';
  employee: number | null;
  employee_name: string | null;
  vehicle_log: number | null;
  vehicle_registration: string | null;
  from_location: number;
  from_location_name: string;
  to_location: number;
  to_location_name: string;
  departure_time: string;
  expected_arrival: string;
  actual_arrival: string | null;
  travel_time_minutes: number | null;
  status: 'IN_TRANSIT' | 'ARRIVED' | 'OVERDUE';
  purpose: string;
  passengers: string[];
  notes: string;
  logged_by_name: string;
  arrived_confirmed_by_name: string | null;
  created_at: string;
}

export interface SecurityOfficer {
  id: number;
  employee: number;
  employee_number: string;
  full_name: string;
  photo_url: string | null;
  rank: 'CHIEF' | 'SUPERVISOR' | 'OFFICER' | 'GUARD';
  primary_location: number | null;
  primary_location_name: string;
  assignment_scope: 'MAIN_OFFICE' | 'STEIN' | 'BOTH';
  post_station: string;
  certification_number: string;
  certification_expiry: string | null;
  is_on_duty: boolean;
}

export interface SecurityShift {
  id: number;
  date: string;
  shift_type: 'MORNING' | 'AFTERNOON' | 'NIGHT';
  location: number;
  location_name: string;
  officers: ShiftOfficer[];
  officers_count: number;
  minimum_required: number;
  is_understaffed: boolean;
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED';
  handover_submitted: boolean;
  special_instructions: string;
  created_at: string;
}

export interface ShiftOfficer {
  officer_id: number;
  officer_name: string;
  rank: string;
  post_station: string;
}

export interface AccessZone {
  id: number;
  location: number;
  location_name: string;
  name: string;
  access_level: 'PUBLIC' | 'STAFF_ONLY' | 'AUTHORIZED_ONLY' | 'RESTRICTED';
  description: string;
  events_today: number;
  current_occupants: number;
  is_active: boolean;
}

export interface AccessLog {
  id: number;
  zone: number | null;
  zone_name: string;
  location: number;
  location_name: string;
  person_name: string;
  person_type: 'EMPLOYEE' | 'VISITOR' | 'VEHICLE';
  employee_user: number | null;
  action: 'GRANTED' | 'DENIED' | 'FORCED';
  method: 'CARD' | 'MANUAL' | 'BIOMETRIC';
  security_officer_name: string;
  notes: string;
  created_at: string;
}

export interface SecurityIncident {
  id: number;
  incident_number: string;
  incident_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  date_occurred: string;
  location: number;
  location_name: string;
  specific_area: string;
  description: string;
  persons_involved: string;
  immediate_actions: string;
  police_report_number: string | null;
  evidence_photos: string[];
  investigation_notes: string | null;
  status: 'OPEN' | 'INVESTIGATING' | 'CLOSED';
  days_open: number;
  reported_by_name: string;
  closed_by_name: string | null;
  closed_at: string | null;
  created_at: string;
}

export interface ActivityEvent {
  id: number;
  time: string;
  location_id: number;
  location_name: string;
  location_color: string;
  type: string;
  person_name: string;
  description: string;
  severity: 'NORMAL' | 'WARNING' | 'CRITICAL';
}

export interface ShiftStatus {
  location_id: number;
  location_name: string;
  current_shift: string;
  officers_count: number;
  supervisor_name: string;
  next_shift_time: string;
  is_understaffed: boolean;
}

export interface SecurityAlert {
  type: string;
  severity: string;
  location_id: number;
  location_name: string;
  message: string;
  reference_id: number;
  created_at: string;
}

export interface SecurityDashboard {
  location_filter: number | null;
  visitors_on_site: number;
  visitors_main: number;
  visitors_stein: number;
  vehicles_on_premises: number;
  vehicles_main: number;
  vehicles_stein: number;
  officers_on_duty: number;
  officers_main: number;
  officers_stein: number;
  incidents_today: number;
  incidents_main: number;
  incidents_stein: number;
  in_transit_count: number;
  access_violations_month: number;
  live_activity: ActivityEvent[];
  in_transit: InterLocationMovement[];
  shift_status: ShiftStatus[];
  alerts: SecurityAlert[];
}

export interface VisitorFormData {
  full_name: string;
  id_type: string;
  id_number: string;
  phone: string;
  company?: string;
  email?: string;
  purpose: string;
  host_employee: number;
  location: number;
  expected_time_in: string;
  expected_time_out: string;
  vehicle_registration?: string;
  items_brought?: VisitorItem[];
  notes?: string;
  pre_approved?: boolean;
}
