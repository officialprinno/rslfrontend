import { Shift, MachineStatus } from '../../../core/models/production.model';

export const SHIFTS: { value: Shift; label: string; color: string }[] = [
  { value: 'MORNING', label: 'Morning', color: 'bg-amber-100 text-amber-800' },
  { value: 'AFTERNOON', label: 'Afternoon', color: 'bg-blue-100 text-blue-800' },
  { value: 'NIGHT', label: 'Night', color: 'bg-purple-100 text-purple-800' },
];

export const MACHINE_TYPES = [
  { value: 'WIRE_DRAWING', label: 'Wire Drawing Machine' },
  { value: 'MESH_WEAVING', label: 'Mesh Weaving Machine' },
  { value: 'CUTTING', label: 'Cutting Machine' },
  { value: 'OTHER', label: 'Other' },
];

export const MACHINE_STATUSES: { value: MachineStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'BREAKDOWN', label: 'Breakdown' },
];

export const DEFAULT_SPECS = [
  { key: 'wire_gauge', label: 'Wire Gauge (mm)' },
  { key: 'mesh_size', label: 'Mesh Size (mm x mm)' },
  { key: 'roll_width', label: 'Roll Width (m)' },
  { key: 'roll_length', label: 'Roll Length (m)' },
  { key: 'roll_weight', label: 'Roll Weight (kg)' },
];

export const WORKFLOW_STEPS = {
  workOrder: ['DRAFT', 'APPROVED', 'IN_PROGRESS', 'COMPLETED'],
  execution: [
    'DRAFT',
    'ASSIGNED',
    'IN_PROGRESS',
    'COMPLETED_PENDING',
    'WAITING_STORE',
    'CLOSED',
  ],
};

export const EXECUTION_ACTION_LABELS: Record<string, string> = {
  START: 'Started',
  PAUSE: 'Paused',
  RESUME: 'Resumed',
  PROGRESS: 'Progress Update',
  CONSUMPTION: 'Material Consumption',
  SUBMIT_COMPLETION: 'Completion Submitted',
  MACHINE_STATUS: 'Machine Status',
  ASSIGN: 'Operator Assigned',
  PROD_APPROVE: 'Production Approved',
  STORE_RECEIPT: 'Store Receipt',
};

export const MACHINE_RUNTIME_OPTIONS = [
  { value: 'RUNNING', label: 'Running' },
  { value: 'IDLE', label: 'Idle' },
  { value: 'MAINTENANCE_REQUIRED', label: 'Maintenance Required' },
  { value: 'BREAKDOWN', label: 'Breakdown' },
];

export const MACHINE_STATUS_BORDER: Record<MachineStatus, string> = {
  ACTIVE: 'border-l-emerald-500',
  MAINTENANCE: 'border-l-amber-500',
  BREAKDOWN: 'border-l-red-500',
};

export const MATERIAL_STATUS_COLOR: Record<string, string> = {
  SUFFICIENT: 'text-emerald-600',
  LOW: 'text-amber-600',
  INSUFFICIENT: 'text-red-600',
};
