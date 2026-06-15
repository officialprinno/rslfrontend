import {
  IncidentSeverity,
  IncidentType,
  InspectionType,
  PermitType,
  TrainingType,
} from '../../../core/models/safety.model';

export const INCIDENT_TYPES: { value: IncidentType; label: string }[] = [
  { value: 'ACCIDENT', label: 'Accident' },
  { value: 'NEAR_MISS', label: 'Near Miss' },
  { value: 'DANGEROUS_OCCURRENCE', label: 'Dangerous Occurrence' },
  { value: 'PROPERTY_DAMAGE', label: 'Property Damage' },
  { value: 'ENVIRONMENTAL', label: 'Environmental' },
];

export const INCIDENT_SEVERITIES: { value: IncidentSeverity; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

export const INCIDENT_STATUSES: { value: string; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'OPEN', label: 'Open' },
  { value: 'INVESTIGATING', label: 'Investigating' },
  { value: 'CLOSED', label: 'Closed' },
];

export const INCIDENT_WORKFLOW_STEPS = ['Draft', 'Open', 'Investigating', 'Closed'] as const;

export const INCIDENT_TYPE_COLORS: Record<string, string> = {
  ACCIDENT: 'badge-red',
  NEAR_MISS: 'badge-orange',
  DANGEROUS_OCCURRENCE: 'badge-red',
  PROPERTY_DAMAGE: 'badge-purple',
  ENVIRONMENTAL: 'badge-blue',
};

export const SEVERITY_COLORS: Record<IncidentSeverity, string> = {
  LOW: 'badge-gray',
  MEDIUM: 'badge-yellow',
  HIGH: 'badge-orange',
  CRITICAL: 'badge-red badge-pulse',
};

export const INCIDENT_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'badge-gray',
  OPEN: 'badge-red',
  INVESTIGATING: 'badge-orange',
  CLOSED: 'badge-green',
};

export const INSPECTION_TYPE_COLORS: Record<InspectionType, string> = {
  DAILY: 'badge-gray',
  WEEKLY: 'badge-blue',
  MONTHLY: 'badge-purple',
  SPECIAL: 'badge-orange',
  REGULATORY: 'badge-red',
};

export const RESULT_COLORS: Record<string, string> = {
  PASS: 'badge-green',
  FAIL: 'badge-red',
  CONDITIONAL: 'badge-orange',
  PENDING: 'badge-gray',
};

export const INSPECTION_STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'badge-blue',
  IN_PROGRESS: 'badge-orange',
  COMPLETED: 'badge-green',
};

export const PERMIT_TYPE_COLORS: Record<PermitType, string> = {
  HOT_WORK: 'badge-red',
  CONFINED_SPACE: 'badge-orange',
  ELECTRICAL: 'badge-yellow',
  HEIGHT_WORK: 'badge-blue',
  EXCAVATION: 'badge-brown',
  CHEMICAL: 'badge-purple',
  GENERAL: 'badge-gray',
};

export const PERMIT_STATUS_COLORS: Record<string, string> = {
  PENDING: 'badge-yellow',
  APPROVED: 'badge-green',
  ACTIVE: 'badge-blue badge-pulse',
  EXPIRED: 'badge-gray',
  CANCELLED: 'badge-red',
};

export const PPE_TYPES: { value: string; label: string }[] = [
  { value: 'HELMET', label: 'Helmet' },
  { value: 'GLOVES', label: 'Gloves' },
  { value: 'SAFETY_BOOTS', label: 'Safety Boots' },
  { value: 'VEST', label: 'High-Vis Vest' },
  { value: 'GOGGLES', label: 'Safety Goggles' },
  { value: 'EAR_PROTECTION', label: 'Ear Protection' },
  { value: 'HARNESS', label: 'Fall Harness' },
  { value: 'RESPIRATOR', label: 'Respirator' },
  { value: 'UNIFORM', label: 'Uniform / Workwear' },
  { value: 'OTHER', label: 'Other' },
];

export const PPE_TYPE_COLORS: Record<string, string> = {
  HELMET: 'badge-blue',
  GLOVES: 'badge-green',
  SAFETY_BOOTS: 'badge-brown',
  VEST: 'badge-orange',
  GOGGLES: 'badge-purple',
  EAR_PROTECTION: 'badge-gray',
  HARNESS: 'badge-red',
  RESPIRATOR: 'badge-teal',
  UNIFORM: 'badge-purple',
  OTHER: 'badge-gray',
};

export const TRAINING_TYPE_COLORS: Record<TrainingType, string> = {
  INDUCTION: 'badge-green',
  REFRESHER: 'badge-blue',
  SPECIFIC: 'badge-purple',
  EMERGENCY: 'badge-red',
  REGULATORY: 'badge-orange',
};

export const ALERT_COLORS: Record<string, string> = {
  CRITICAL: 'border-red-500 bg-red-50',
  HIGH: 'border-red-400 bg-red-50',
  MEDIUM: 'border-orange-400 bg-orange-50',
  LOW: 'border-blue-400 bg-blue-50',
};

export const LOCATIONS = [
  'Factory Floor',
  'Warehouse',
  'Office',
  'Vehicle',
  'Client Site',
  'Other',
];

export const INSPECTION_AREAS = [
  'Factory Floor',
  'Warehouse',
  'Vehicles',
  'Office',
  'All Areas',
];

export const INSPECTION_TYPES: { value: InspectionType; label: string }[] = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'SPECIAL', label: 'Special' },
  { value: 'REGULATORY', label: 'Regulatory' },
];

export const PERMIT_STATUSES: { value: string; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export const TRAINING_STATUSES: { value: string; label: string }[] = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export const PERMIT_CHECKLISTS: Record<PermitType, string[]> = {
  HOT_WORK: [
    'Fire extinguisher on standby',
    'Fire watch assigned',
    'Combustibles removed (10m radius)',
    'Hot work area barricaded',
    'Welding screens in place',
  ],
  CONFINED_SPACE: [
    'Atmospheric test completed',
    'Rescue equipment on standby',
    'Attendant assigned outside',
    'Communication established',
    'Ventilation provided',
  ],
  ELECTRICAL: [
    'Lockout/Tagout applied',
    'Area barricaded',
    'Insulated tools available',
    'First aider on standby',
  ],
  HEIGHT_WORK: [
    'Harness inspected',
    'Anchor points verified',
    'Area below barricaded',
    'Weather conditions checked',
    'Rescue plan in place',
  ],
  EXCAVATION: [
    'Underground services located',
    'Shoring/benching in place',
    'Access/egress provided',
    'Spoil pile at safe distance',
  ],
  CHEMICAL: [
    'SDS reviewed',
    'PPE specified and available',
    'Spill kit on standby',
    'Ventilation adequate',
  ],
  GENERAL: [
    'Work area inspected',
    'Required PPE available',
    'Emergency contacts notified',
    'Tools and equipment checked',
  ],
};

export const RISK_LIKELIHOOD_LABELS = [
  'Rare',
  'Unlikely',
  'Possible',
  'Likely',
  'Almost Certain',
];

export const RISK_CONSEQUENCE_LABELS = [
  'Insignificant',
  'Minor',
  'Moderate',
  'Major',
  'Catastrophic',
];

export function riskScoreToLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (score <= 4) return 'LOW';
  if (score <= 12) return 'MEDIUM';
  return 'HIGH';
}

export function riskMatrixCellClass(score: number): string {
  if (score <= 4) return 'bg-green-200 hover:bg-green-300';
  if (score <= 12) return 'bg-yellow-200 hover:bg-yellow-300';
  return 'bg-red-200 hover:bg-red-300';
}

export const PERMIT_TYPES: { value: PermitType; label: string }[] = [
  { value: 'HOT_WORK', label: 'Hot Work' },
  { value: 'CONFINED_SPACE', label: 'Confined Space' },
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'HEIGHT_WORK', label: 'Height Work' },
  { value: 'EXCAVATION', label: 'Excavation' },
  { value: 'CHEMICAL', label: 'Chemical' },
  { value: 'GENERAL', label: 'General' },
];

export const TRAINING_TYPES: { value: TrainingType; label: string }[] = [
  { value: 'INDUCTION', label: 'Induction' },
  { value: 'REFRESHER', label: 'Refresher' },
  { value: 'SPECIFIC', label: 'Task-Specific' },
  { value: 'EMERGENCY', label: 'Emergency' },
  { value: 'REGULATORY', label: 'Regulatory' },
];

export const BODY_PARTS = [
  'Head', 'Neck', 'Back', 'Arms', 'Legs', 'Hands', 'Feet', 'Eyes', 'Other',
];

export const CONTRIBUTING_FACTORS = [
  'Human Error',
  'Equipment Failure',
  'Procedure Not Followed',
  'Inadequate Training',
  'Environmental Conditions',
  'Other',
];

export const ROOT_CAUSE_CATEGORIES = [
  'People', 'Process', 'Equipment', 'Environment', 'Management',
];

export const HAZARDS = [
  'Fire', 'Explosion', 'Electrocution', 'Falls', 'Chemical Exposure', 'Entrapment', 'Other',
];

export const LTIFR_FORMULA =
  '(Number of LTIs × 1,000,000) / Total Hours Worked';

export function incidentTypeLabel(type: string): string {
  return INCIDENT_TYPES.find((t) => t.value === type)?.label ?? type.replace(/_/g, ' ');
}

export function inspectionTypeLabel(type: string): string {
  return INSPECTION_TYPES.find((t) => t.value === type)?.label ?? type.replace(/_/g, ' ');
}

export function ppeTypeLabel(type: string): string {
  return PPE_TYPES.find((t) => t.value === type)?.label ?? type.replace(/_/g, ' ');
}

export const PPE_REQUEST_STATUSES: { value: string; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_STORE', label: 'Pending Store Review' },
  { value: 'AVAILABLE', label: 'Stock Available' },
  { value: 'IN_PROCUREMENT', label: 'In Procurement' },
  { value: 'STOCK_RECEIVED', label: 'Stock Received' },
  { value: 'READY_FOR_ISSUE', label: 'Ready for Issue' },
  { value: 'ISSUED', label: 'Issued' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export const PPE_REQUEST_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'badge-gray',
  PENDING_STORE: 'badge-yellow',
  AVAILABLE: 'badge-blue',
  IN_PROCUREMENT: 'badge-orange',
  STOCK_RECEIVED: 'badge-purple',
  READY_FOR_ISSUE: 'badge-green',
  ISSUED: 'badge-green',
  CANCELLED: 'badge-red',
};

export const PPE_WORKFLOW_STEPS = [
  'Safety Officer — Anaomba PPE',
  'Store Keeper — Je, PPE zipo?',
  'Ndiyo → PPE zinatolewa / Hapana → Procurement',
  'Procurement',
  'Supplier',
  'Store',
  'Safety Officer — PPE zinatolewa',
] as const;

export function ppeRequestStatusLabel(status: string): string {
  return PPE_REQUEST_STATUSES.find((s) => s.value === status)?.label ?? status.replace(/_/g, ' ');
}

export function ppeRequestWorkflowIndex(status: string): number {
  const map: Record<string, number> = {
    DRAFT: 0,
    PENDING_STORE: 1,
    AVAILABLE: 2,
    IN_PROCUREMENT: 3,
    STOCK_RECEIVED: 5,
    READY_FOR_ISSUE: 6,
    ISSUED: 6,
    CANCELLED: 0,
  };
  return map[status] ?? 0;
}

export function ppeStockStatus(item: { stock_on_hand: number; reorder_level: number }): {
  label: string;
  colorClass: string;
} {
  if (item.stock_on_hand <= 0) {
    return { label: 'Out of Stock', colorClass: 'text-red-600 font-semibold' };
  }
  if (item.stock_on_hand <= item.reorder_level) {
    return { label: 'Low Stock', colorClass: 'text-orange-600 font-semibold' };
  }
  return { label: 'In Stock', colorClass: 'text-green-600 font-semibold' };
}

export function permitTypeLabel(type: string): string {
  return PERMIT_TYPES.find((t) => t.value === type)?.label ?? type.replace(/_/g, ' ');
}

export function trainingTypeLabel(type: string): string {
  return TRAINING_TYPES.find((t) => t.value === type)?.label ?? type.replace(/_/g, ' ');
}
