export type IncidentType =
  | 'ACCIDENT'
  | 'NEAR_MISS'
  | 'DANGEROUS_OCCURRENCE'
  | 'PROPERTY_DAMAGE'
  | 'ENVIRONMENTAL';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'DRAFT' | 'OPEN' | 'INVESTIGATING' | 'CLOSED';

export interface Witness {
  id?: number;
  name: string;
  is_employee: boolean;
  employee?: number | null;
  contact: string;
  statement: string;
}

export interface CorrectiveAction {
  id: number;
  incident_id: number;
  action: string;
  assigned_to_id: number | null;
  assigned_to_name: string | null;
  due_date: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE';
  completed_at: string | null;
}

export interface SafetyIncident {
  id: number;
  incident_number: string;
  incident_type: IncidentType;
  severity: IncidentSeverity;
  date_occurred: string;
  location: string;
  department_id?: number;
  department?: number;
  department_name: string;
  description: string;
  immediate_actions: string;
  anyone_injured: boolean;
  injured_person_id?: number | null;
  injured_person?: number | null;
  injured_person_name: string | null;
  injury_description: string | null;
  body_parts: string[];
  medical_treatment_required: boolean;
  hospitalized: boolean;
  first_aid_given: boolean;
  first_aid_provider: string;
  photos: string[];
  documents: string[];
  cctv_reference: string;
  immediate_cause: string;
  contributing_factors: string[];
  root_cause: string | null;
  root_cause_categories: string[];
  why_analysis: string[];
  investigation_findings: string | null;
  investigator?: number | null;
  investigator_name: string | null;
  investigated_at: string | null;
  lessons_learned: string | null;
  prevention_measures: string | null;
  witnesses: Witness[];
  corrective_actions: CorrectiveAction[];
  status: IncidentStatus;
  days_open: number;
  reported_by?: number;
  reported_by_name: string;
  closed_by_name: string | null;
  closed_at: string | null;
  created_at: string;
}

export type InspectionType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'SPECIAL' | 'REGULATORY';
export type InspectionResult = 'PASS' | 'FAIL' | 'CONDITIONAL' | null;
export type InspectionStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';

export interface ChecklistItem {
  id: number;
  inspection_id: number;
  section: string;
  checklist_item: string;
  result: 'PASS' | 'FAIL' | 'NA' | null;
  remarks: string;
  photo_url: string | null;
}

export interface SafetyInspection {
  id: number;
  inspection_number: string;
  inspection_type: InspectionType;
  area: string;
  scheduled_date: string;
  inspector_id?: number;
  inspector?: number;
  inspector_name: string;
  overall_result: InspectionResult;
  total_items: number;
  passed_items: number;
  failed_items: number;
  checklist_items: ChecklistItem[];
  next_inspection: string | null;
  status: InspectionStatus;
  notes: string;
  created_at: string;
}

export type PermitType =
  | 'HOT_WORK'
  | 'CONFINED_SPACE'
  | 'ELECTRICAL'
  | 'HEIGHT_WORK'
  | 'EXCAVATION'
  | 'CHEMICAL'
  | 'GENERAL';

export type PermitStatus = 'PENDING' | 'APPROVED' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface PermitWorker {
  name: string;
  id: string;
}

export interface PermitChecklistItem {
  item: string;
  checked: boolean;
}

export interface WorkPermit {
  id: number;
  permit_number: string;
  permit_type: PermitType;
  work_description: string;
  location: string;
  department?: number | null;
  department_name?: string | null;
  workers: PermitWorker[];
  equipment_tools?: string;
  valid_from: string;
  valid_until: string;
  hazards: string[];
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  control_measures: string;
  safety_checklist: PermitChecklistItem[];
  extension_count: number;
  issued_by_id?: number;
  issued_by_name: string;
  approved_by_name: string | null;
  approved_at: string | null;
  status: PermitStatus;
  rejection_reason?: string;
  created_at: string;
}

export interface PPEItem {
  id: number;
  ppe_type: string;
  name: string;
  safety_standard: string;
  total_issued: number;
  stock_on_hand: number;
  reorder_level: number;
  is_active: boolean;
}

export interface PPEIssuance {
  id: number;
  employee_id?: number;
  employee: number;
  employee_name: string;
  department_name: string;
  ppe_item_id?: number;
  ppe_item: number;
  ppe_type: string;
  ppe_name: string;
  quantity: number;
  issue_date: string;
  expected_return: string | null;
  actual_return: string | null;
  condition_issued: 'NEW' | 'GOOD' | 'FAIR';
  condition_returned: 'GOOD' | 'FAIR' | 'DAMAGED' | 'LOST' | null;
  issued_by_name: string;
  notes: string;
}

export interface PPERoleRequirement {
  id: number;
  job_title: string;
  required_ppe_types: string[];
}

export type TrainingType =
  | 'INDUCTION'
  | 'REFRESHER'
  | 'SPECIFIC'
  | 'EMERGENCY'
  | 'REGULATORY';

export interface TrainingAttendee {
  id: number;
  training_id: number;
  employee: number;
  employee_name: string;
  department_name: string;
  attended: boolean;
  certificate_issued: boolean;
  certificate_expiry: string | null;
  notes: string;
}

export interface SafetyTraining {
  id: number;
  training_name: string;
  training_type: TrainingType;
  description: string;
  trainer: string;
  scheduled_date: string;
  duration_hours: number;
  location: string;
  max_attendees: number;
  attendees_count: number;
  completion_rate: number;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  attendees: TrainingAttendee[];
  materials_notes?: string;
  created_at: string;
}

export interface MonthlyIncident {
  month: string;
  accidents: number;
  near_miss: number;
}

export interface SafetyAlert {
  type:
    | 'EXPIRED_PERMIT'
    | 'OVERDUE_INSPECTION'
    | 'OPEN_CRITICAL'
    | 'PPE_LOW'
    | 'TRAINING_DUE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  reference_id: number;
  created_at: string;
}

export interface SafetyDashboard {
  days_without_incident: number;
  open_incidents: number;
  pending_inspections: number;
  active_permits: number;
  ppe_low_stock: number;
  overdue_corrective_actions: number;
  safety_score: number;
  incidents_chart: MonthlyIncident[];
  recent_incidents: SafetyIncident[];
  upcoming_inspections: SafetyInspection[];
  alerts: SafetyAlert[];
}

export interface IncidentReport {
  period_from: string;
  period_to: string;
  total: number;
  by_type: { incident_type: string; count: number }[];
  by_severity: { severity: string; count: number }[];
  by_department: { department__name: string; count: number }[];
  ltifr: number;
}

export interface HSEReport {
  month: number;
  year: number;
  safety_score: number;
  days_without_incident: number;
  open_incidents: number;
  pending_inspections: number;
  active_permits: number;
}

export interface IncidentFormData {
  incident_type: IncidentType;
  severity: IncidentSeverity;
  date_occurred: string;
  location: string;
  department?: number | null;
  description: string;
  immediate_actions?: string;
  anyone_injured?: boolean;
  injured_person?: number | null;
  injury_description?: string;
  body_parts?: string[];
  medical_treatment_required?: boolean;
  hospitalized?: boolean;
  first_aid_given?: boolean;
  first_aid_provider?: string;
  photos?: string[];
  documents?: string[];
  cctv_reference?: string;
  immediate_cause?: string;
  contributing_factors?: string[];
  witnesses?: Witness[];
  status?: IncidentStatus;
}

export interface InspectionScheduleData {
  inspection_type: InspectionType;
  area: string;
  scheduled_date: string;
  inspector: number;
  notes?: string;
}

export interface WorkPermitFormData {
  permit_type: PermitType;
  work_description: string;
  location: string;
  department?: number | null;
  workers: PermitWorker[];
  equipment_tools?: string;
  valid_from: string;
  valid_until: string;
  hazards: string[];
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  control_measures: string;
  safety_checklist?: PermitChecklistItem[];
}

export type PPERequestStatus =
  | 'DRAFT'
  | 'PENDING_STORE'
  | 'AVAILABLE'
  | 'IN_PROCUREMENT'
  | 'STOCK_RECEIVED'
  | 'READY_FOR_ISSUE'
  | 'ISSUED'
  | 'CANCELLED';

export interface PPERequest {
  id: number;
  request_number: string;
  employee: number;
  employee_name: string;
  department_name: string;
  ppe_item: number;
  ppe_type: string;
  ppe_name: string;
  stock_on_hand: number;
  quantity: number;
  priority: 'NORMAL' | 'URGENT';
  reason: string;
  status: PPERequestStatus;
  requested_by_name: string;
  submitted_at: string | null;
  store_reviewed_by_name: string | null;
  store_reviewed_at: string | null;
  store_notes: string;
  stock_available: boolean | null;
  purchase_requisition: number | null;
  pr_number: string | null;
  procurement_notes: string;
  stock_received_at: string | null;
  ready_at: string | null;
  issuance: number | null;
  issued_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string;
  requested_new_item: boolean;
  workflow_step: number;
  created_at: string;
}

export interface NewPPEItemData {
  ppe_type: string;
  name: string;
  safety_standard?: string;
}

export interface PPERequestFormData {
  employee: number;
  ppe_item?: number;
  new_ppe_item?: NewPPEItemData;
  quantity: number;
  priority?: 'NORMAL' | 'URGENT';
  reason?: string;
}

export interface PPEWorkflowStep {
  key: string;
  label: string;
}

export interface PPEIssueData {
  employee: number;
  ppe_item: number;
  quantity: number;
  issue_date: string;
  expected_return?: string | null;
  condition_issued: 'NEW' | 'GOOD' | 'FAIR';
  notes?: string;
}

export interface TrainingScheduleData {
  training_name: string;
  training_type: TrainingType;
  description?: string;
  trainer: string;
  scheduled_date: string;
  duration_hours: number;
  location?: string;
  max_attendees?: number;
  materials_notes?: string;
}
